---
title: "Compiling JavaScript AOT is complicated, here is why"
excerpt: "An ahead-of-time compiler has to know, before the program runs, whether item.price is one load or a full lookup. How Perry proves whole-program facts about your JavaScript, the design that hit a wall, the per-unit design that replaced it, what failed, and where it stands."
date: 2026-10-30
tags: ["compiler", "analysis", "performance", "architecture"]
image: "/blog/compiling-javascript-aot/perry-process.webp"
socialImage: "/blog/compiling-javascript-aot/perry-process.jpg"
imageAlt: "How Perry compiles JavaScript and TypeScript: source, SWC parser, AST, Perry HIR, IR transforms, LLVM codegen, object file, system linker, native executable. Below, the sound AOT optimization loop: per-unit facts, contracts between units, a whole-program layout census and re-solving until stable, then either a direct fixed-slot load when the layout is proven or the general runtime property lookup."
---
Perry compiles TypeScript and JavaScript ahead of time into a native binary, with no JIT behind your code. The hard part isn't generating code; it's knowing what to generate. This post is about that: perry's whole-program facts, the design that hit a wall, the one that replaced it, what failed, and where it stands. Every verdict quoted for an example comes from compiling that exact code with today's perry.

## The question at every dot

Take one line:

```js
total += item.price * item.qty;
```

An AOT compiler has to emit machine code for `item.price` before the program runs. It has two very different options.

- **One load.** If the compiler knows that `item` is always an object of a certain layout, and that `price` lives at slot 2 of that layout, then `item.price` is a single memory read at a fixed offset. A C compiler does this for a struct field.
- **A lookup.** If it knows nothing, it emits the general property access: check that `item` is an object, find its layout, search it for `price`, check for extra properties beyond the layout, walk the prototype chain, call a getter if there is one. Perry's object-model design budgets that path at about 12–15 instructions for an own property and 25–30 for an inherited method, before the work you actually wanted.

A JIT watches the program run, emits the fast load behind a check, and throws the code away if the check fails. An AOT compiler can't watch. It has to *know*.

### Why not use the types?

The obvious answer is to read `item: CartItem` and emit the load. Perry deliberately doesn't, for three reasons.

1. Types can be wrong. `as`, `any`, `// @ts-ignore`, a stale `.d.ts`, a JSON payload typed by hope: all of these compile under TypeScript and break the type at runtime. If perry trusted the annotation and emitted a fixed-offset load, a wrong type wouldn't throw a `TypeError`. It would read the wrong slot.
2. Types describe what a value is allowed to be, not where its fields are. `interface CartItem { price: number; qty: number }` is satisfied by a class instance, an object literal, a parsed JSON object and a Proxy. These all have different layouts in memory.
3. Much of what runs is plain JavaScript with no types at all: every npm package's compiled output, CommonJS bundles, generated code.

The rule perry follows is short: **types pick the lowering; shapes prove the semantics.** A type may suggest which fast path to try. Whether the fast path is *correct* has to be proven from the program itself.

## What a fact is

A **fact** is a statement about the program that holds on every possible run. Perry proves two kinds.

**Facts about objects.** Every place in the program that creates an object (a class, a constructor function called with `new`, one object-literal expression, one `Object.create(P)` call) is a *family*. Each family has a layout: an ordered list of keys and the slot each key lives in. A fact about objects looks like "every `Point` has `x` at slot 0 and `y` at slot 1, both always present, and nothing ever adds, deletes or redefines a key on it."

**Facts about functions.** For each function: what it reads from its arguments, what it *keeps* (stores somewhere that outlives the call), what it calls, what it changes, and what it returns. A fact about a function looks like "`norm2` reads `x` and `y` from its argument and keeps nothing."

For every property access and call, the compiler asks: which families can reach this receiver, and which functions can this call reach? The simplest case:

```js
class Point {
  constructor(x, y) { this.x = x; this.y = y; }
}

function norm2(p) {
  return p.x * p.x + p.y * p.y;   // site S1: p.x, p.y
}

console.log(norm2(new Point(3, 4)));
```

*What perry proves* (from its facts dump for this exact file, lightly trimmed):

```
T Point kind=class fixed_layout=1 adds_keys=0 birth=[x,y] escape=""
FACT F1  readonly  Point.x = 1        FACT F1' definite Point.x = 1
FACT F2  kind      Point.x = num
contract-input  norm2:arg0  layouts=["Point"]
E get fn=norm2 .x classes=["Point"] slot=0 proof=unchecked
E get fn=norm2 .y classes=["Point"] slot=1 proof=unchecked
```

`norm2`'s argument can only be a `Point`; `Point`'s layout is fixed (no key is ever added after the constructor); `x` is always present, never rewritten and always a number. So `p.x` is slot 0 and `p.y` slot 1, with an *unchecked* proof. In the generated LLVM IR, each `p.x` is a pointer untag and one `load double` at a fixed offset: no layout check, no fallback branch.

Now add one call:

```js
console.log(norm2({ y: 1, x: 2 }));
```

That literal is a second family, with its keys in the other order. The dump now says `classes=["Point", <the literal>] slot=[0, 1]`: two known layouts, and `x` sits in slot 0 in one and slot 1 in the other. The IR reads the object's layout id, picks the slot offset with one compare and a select, then does one load. Still no lookup, although perry's own counts don't call this site proven (its verdict is `slots differ across the receiver set`); only exact single-slot sites count.

If `norm2` received a value perry can't account for, the receiver set would be **⊤** ("top"), meaning "could be anything", and the access would go back to the general lookup. That's still correct, just slower.

That is the core of the design: **soundness never depends on precision.** A proof narrows a site from the general lookup to a few known layouts, and from there to one load. Without a proof the site keeps the general lookup, which is always right: an unsure analysis loses speed, never correctness.

### "Keeps" is the expensive word

```js
const seen = [];

function remember(entry) {
  seen.push(entry);     // entry is kept: it outlives the call
  return entry.id;
}

remember({ id: 1, name: "a" });
remember({ id: 2, name: "b" });
console.log(seen.length);
```

*What perry proves:* the two literals have the same keys in the same order, so they share one layout, and `entry.id` is slot 0 with an unchecked proof: one load. Now let `seen` reach code perry can't see:

```js
const plugin = new Function("s", "s[0].extra = 1; delete s[1].id");
plugin(seen);
```

Generated code may add keys, delete keys or redefine them on anything it receives, and it receives `seen` and everything in it. The verdict at `entry.id` becomes `receiver from unmodeled code (TOP)`, and the read goes back to the general lookup. Both programs print the same as node; one of them is just faster.

This is why a function's facts must say what it keeps, not only what it reads: one `push` into an escaping array decides whether objects created elsewhere get fast field access.

### Three words, once

Three terms come up again below:

- A **lattice** is the ordered set of answers the analysis can give for one question, from "nothing reaches here yet" up to ⊤. For a receiver: `{}` → `{Point}` → `{Point, Point3D}` → ⊤. The analysis only ever moves an answer up.
- A **fixpoint** is what you get by repeating the analysis until a full round changes nothing. If answers only move up and the lattice has no infinite upward chain, the repetition has to stop.
- A **contract** is what one part of the program promises the rest, for example "`Circle` instances have exactly the key `r`, in slot 0, and no code adds keys to them."

## The first design: solve the whole program at once

The obvious way to compute facts is a whole-program points-to analysis: every object creation is a token, every variable and field holds a set of tokens, and you iterate until nothing changes. Perry had one. Its sets were widened: past 64 members a set was cut off, which kept the cost bounded and gave up on every site behind it.

In October we removed that widening to make the analysis exact (the "closed world" solver). The result on 2026-10-19 was instructive.

- On the Richards benchmark from AWFY (the "Are We Fast Yet" suite), the capped solver did 1.39M units of work and proved 10 sites. The exact solver ran into the 200M work bound and proved **0**. qs, zod and commander showed the same pattern, and peak memory reached 3–7 GB on programs that had needed 130–200 MB.
- The cause was one array. AWFY's `Vector` class allocates its storage in one place, so every `Vector` in every benchmark shared one storage token. About 690 kinds of values (functions, class instances, closures, ⊤) flowed into that one token, and every method call over it resolved to about 237 possible targets. One imprecise spot, and the imprecision reaches everywhere.

That blob could be removed; the structural problem could not. Even a perfectly precise analysis finds real polymorphism: hundreds of layouts genuinely reach some sites in the TypeScript compiler. Exactness over a 10 MB bundle is expensive, and it re-runs on every edit. The direction I gave on 2026-10-20 was blunt: whole-program exact points-to isn't what a big program needs.

That was confirmed three days later on fastify: the whole-program solve hit the 200M work bound and gave up with no facts at all. The design described next finished the same program in 12.8M work and proved 69 sites. That was the day per-unit facts became the default (PR #13132).

## The pivot: per-unit facts with contracts

The second design, landed in PR #13024, changes the *scope* of a proof.

**Units.** A program is cut into units along its own structure, never at a size threshold. Each module is cut into groups of declarations that reference each other in a cycle (the strongly connected components of the module's reference graph); even the small `Point` program above is three units. That split matters for programs shipped as one giant file, such as the TypeScript compiler's own bundle or zod's `index.mjs`.

**Contracts.** Each unit is solved on its own and publishes, as a contract, whatever another unit can name: a class's layout and which fields are always present, a function's argument and result descriptions, a value's shape. Importers read the contract instead of re-analysing the code.

**The census.** Some operations break a layout for everyone: a store with a computed key, a `delete`, a `defineProperty`, a prototype write, a store through a ⊤ receiver. Each unit reports which layouts it may *open* in this way. A layout stays fixed only if its own unit proved it and no unit opens it. This is the only step that looks at the whole program, and it's linear: it takes a union, not a flow.

**Rounds.** When a contract breaks, only its unit and the units that read it are solved again. Rounds continue until nothing changes. Units with no dependency between them solve in parallel, by level. Each level reads one frozen input and the results merge in a fixed order, so the facts don't depend on how many threads you have.

```text
 ┌───────────────┐  contract   ┌───────────────┐  contract   ┌───────────────┐
 │ unit: Circle  │ ──────────▶ │ unit: sum of  │ ──────────▶ │   main unit   │
 │               │             │     areas     │             │               │
 └───────┬───────┘             └───────┬───────┘             └───────┬───────┘
   contract: "Circle: [r] slot 0, fixed layout"
         │  ▲                          │  ▲                          │  ▲
         ▼  ┊ round 2                  ▼  ┊ round 2                  ▼  ┊ round 2
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                 census: which layouts does anyone open?                      │
 └──────────────────────────────────────────────────────────────────────────────┘
   round 2 re-solves only units whose input changed; repeat until a round changes nothing
```

Here is what a contract buys:

```ts
// shapes.ts
export class Circle {
  constructor(public r: number) {}
  area() { return Math.PI * this.r * this.r; }
}

// main.ts
import { Circle } from "./shapes";

const cs = [new Circle(1), new Circle(2)];
let total = 0;
for (const c of cs) total += c.area();   // site S2: c.area
```

*What perry proves:* the dump records `Circle` as `fixed_layout=1 adds_keys=0 birth=[r] escape=""`. The unit in `main.ts` reads that contract, and at S2 the receiver set is `{Circle}` and the call target set is `{Circle::area}` (verdict `T0`, proven). Inside `area`, both reads of `this.r` are unchecked slot-0 loads. In the IR, `c.area()` is a direct call to `area`'s compiled body behind one guard: a tag test and a compare of the object's class word against `Circle`'s, with the generic method call as the fallback.

The `public r: number` annotation took no part in that proof.

**Optimism only behind a guard.** When a contract a unit would like isn't proven (say, a typed parameter whose callers perry can't all see), the function is compiled against it with an O(1) entry check: one layout or class-id compare per argument. Pass, and the body runs on the proven path; fail, and the call takes the generic path. Nothing is trusted that isn't proven or checked.

| verdict for `o.k` | code emitted |
|---|---|
| receiver set proven, one slot | one load |
| receiver set known, slots differ | read the layout id, pick the slot, one load |
| unknown | the general lookup (designed at about 12–15 instructions for an own key) |

A checked contract enters at the first row after a single compare at function entry.

**The yardstick.** The whole-program solver stays in perry as a reference mode, with a hard rule: per-unit facts may never be *stronger* than whole-program facts. A tool compares the two fact by fact on 22 programs; every per-unit-only fact is a bug or a comparison artifact and gets named before landing (#13297).

## What didn't work

These taught us the most.

### A fixpoint that never arrived

"Repeat until nothing changes" only terminates if the answers only move up. The first per-unit driver rebuilt two of its inputs each round from the latest solves alone, and an input that's rebuilt can also *shrink*. On express, inside the small `ee-first` package, it did:

1. `callback` reads `arguments`, so its argument contract is ⊤.
2. Because of that ⊤, no call is seen to reach `callback`.
3. So `callback` looks closed, and its function contract gets published.
4. The published contract now flows to an escaped function that calls it, so the contract is ⊤ again. Back to step 1.

The cycle had period 3. The facts-only compile ran for 4 hours and was at round 1,893 when we stopped it. The fix (PR #13174) made each round's input the *join* of the previous input and what the latest solves produced, so the inputs ascend. The sets involved are finite, so the loop has to stop. There is no round limit, because a round limit would be a knob that hides the bug.

### Per-object heap contexts

The `Vector` blob suggested an obvious move: key every object created inside a constructor or method by the object it was created for, so each `Vector` owns its storage. That is a form of object-sensitive heap, the textbook answer, and on AWFY it worked: DeltaBlue went from 20 to 378 of 578 sites proven. On zod it multiplied the facts work by 88.7 (3.6M to 320M, memory from 182 MB to 7.9 GB), and on schema-record and effect by 2.3, with no gain on any of them. The cause: classes whose methods construct instances of the same class holding `this` (zod's fluent `new ZodEffects({ schema: this })`), so tokens multiply by birth sites times receivers. Restricting it to class instances didn't help, because those are classes too. Neither variant landed.

### Argument identity in the TypeScript compiler's checker

`createTypeChecker` is one very large function with many nested helpers. Its unit wouldn't solve under the work bound: it gave up at 71.5M flow entries. A census found the cause. Each helper's argument "markers" (placeholders for "whatever the caller passed") had their own identity and were copied everywhere: about 707,000 marker tokens against roughly 624 real tokens at the checker's 5,785 sites.

The first idea, tracking the objects each run creates, was a dead end: those accounted for 383 of the 71.5M entries. The fix that worked is a rule: *a marker is a token only inside its own run*. Wherever a value crosses out of the run (a result, a field, another run), the markers collapse into one holder marker. With that rule the checker unit solves at 3.9M flow entries, under the unchanged bound (PR #13266). We did not raise the bound, and the rule is never to tune it.

### A solve cache we chose not to build

A unit's result depends only on its code and the contracts it reads, so caching solves looked free. We didn't build it: perry's rule is as few caches as possible, and an architecture that needs one to be fast is wrong.

It would also have been useless: when we measured it (2026-10-21), adding one object literal re-solved 25 to 1,174 of the TypeScript compiler's 9,730 units, because internal identities (class ids, literal names) came from counters in compilation order, and one new literal renumbered everything after it. The real fix is stable identities, derived from an item's content and its position in its declaration tree. That is designed, not yet built.

### Cutting the ⊤ loop

The largest block of unproven sites in the TypeScript compiler is held by a loop of three channels that feed each other. A call to an unknown callee lets its arguments escape. Escaped functions have ⊤ parameters. And a store through a ⊤ receiver is, soundly, a store into every built-in prototype, because the receiver could be `Object.prototype`. We tried two ways to cut it.

- Materialising the escape set (every value unknown code could touch) as an explicit set: every whole-program run aborted at the unchanged work bound, and every per-unit run hit the 24 GiB memory cap.
- Narrowing which keys a ⊤ store can write: no sound rule recovered any of the 5,992 sites that switching computed ⊤ stores off entirely would win on the TypeScript sources. One variant argued that a numeric key (`p[0] = x`) can't overwrite `push` or `map`. It was withdrawn: if `p` comes from unknown code, `'0'` can be a setter, or `p` a Proxy, whose code replaces `Array.prototype.push` anyway.

Neither landed. The ⊤-store rule on main stays the conservative one (PR #13338).

### 100 GB of diagnostics

The solver's explain mode prints why each verdict came out as it did. On one experiment whose rounds never converged, it printed for every endless re-solve, and the log reached about 100 GB. Measurements now run with explain off, and diagnostic runs have a file-size cap.

## Using TypeScript's checker as an oracle, not an input

Perry doesn't read TypeScript types to prove anything, but they are very useful as a *check*. The test bed is the TypeScript compiler itself, in two forms: its source as ES modules ("tssrc", 278 modules), and the published CommonJS bundle `typescript.js` ("tscwork"). For tssrc we ran tsc 5.8.2 over the same sources and recorded, for every property read, element read, call and `new`, what type the checker assigns: 174,714 expressions in all. Then we matched those rows against perry's facts, site by site. Perry's compile never sees that data; it's compared after the fact.

That gives three counts (whole-program mode, main of 2026-10-27):

- **Ceiling:** sites where TypeScript's type pins down the receiver, callee or result: 42,313.
- **Proven:** sites perry's facts already prove: 19,908. Of those, 19,448 are also type-pinned.
- **GAP:** type-pinned but unproven by perry: 22,865. That's the worklist. It isn't a certified count of missed proofs: 20,863 of these sites are pinned by a primitive result type (the targets overlap), and "this call returns a number" answers a different question than "which layouts reach this receiver".

The checker isn't treated as the truth either. At 1,101 sites, perry's facts allow a value kind that the TypeScript type rules out. 898 of those look like imprecision on perry's side. 134 sit behind an `as`, an `any` or a non-null assertion, where the TypeScript type may be the one that's wrong. Each one is a lead, not a verdict. A "proven" number alone invites a story; an independent ceiling says how far there is to go, and the GAP list says *where*.

"Proven", throughout this post, means that perry's facts give the site an exact verdict: a known set of receiver layouts with the key's slot in each, or a known set of call targets. Code generation turns that into a fixed-slot access or a direct call. Some of those keep a cheap guard, as `c.area()` above does.

### The tsc arc in numbers

Proven read/call sites on the TypeScript compiler:

| date | change | tssrc | tscwork |
|---|---|---:|---:|
| 2026-10-25, before | per-unit main | 390 of 51,130 | 219 of 26,188 |
| 2026-10-25 | marker runs, namespace stores, function values, maker contexts, CommonJS module objects (#13266) | 19,438 of 87,017 | 28,890 of 122,966 |
| 2026-10-26 | per-unit parity phase (#13297) | 20,773 | 29,449 |
| 2026-10-26 | a broken function is still called by name (#13332) | 20,763 | 51,851 |
| 2026-10-29 | callable identity and argument joins (#13448) | 20,028 | 51,608 |
| 2026-10-30 | per-unit, re-measured on main 6a941f88a | 20,028 of 87,017 | 51,609 of 122,969 |
| 2026-10-30 | whole-program reference, same main (only code that can run, since #13462) | 21,868 of 66,764 | 51,665 of 122,971 |

Each PR row is that PR's own measurement on its own base, so small moves between rows (20,773 to 20,763) come from other merges in between. The site totals grew when value-call sites started being counted (#13266), and the whole-program row drops sites in code the program never runs (#13462). Dropping them mattered: the never-invoked tsserver plugin path handed the whole `ts` namespace to a plugin factory, and that escape had made the node factory and the transformers ⊤.

Two jumps show the kind of work: neither is tuning; each fixes a too-pessimistic statement about JavaScript semantics.

- **About 19,000 sites from one landing** (#13266) whose key piece was the marker rule above: the checker's unit started solving at all. The same landing carried four other changes, so the split between them isn't measured here.
- **22,115 sites from a rule about broken functions** (#13332). The bundle's `__export` helper installs getters that break the contracts of 3,380 helper functions. A reader of a broken contract held only ⊤, so every call by name lost its target. Now a call by name goes through the post-break contract, while the function *as an object* still escapes. tscwork per unit went from 29,438 to 51,851 sites, against 52,047 for the whole-program reference.

## Dynamic code

Real programs use `eval` and `new Function`; perry links an interpreter for them. In an earlier version, one reachable `new Function` anywhere turned facts off for the whole program. Now dynamic code is one participant in the analysis: a single node that receives every value escaping to it, may call any function it receives with ⊤ arguments, may write ⊤ into any object it receives, and returns ⊤. Values that never reach it keep their facts.

```js
const handlers = { onData(buf) { return buf.length; }, tag: "t" };
const install = new Function("h", process.env.SRC || "delete h.onData; h.extra = 1");
install(handlers);

const local = { n: 0 };
local.n++;          // site S3
console.log(local.n, handlers.tag, handlers.onData, handlers.extra);
```

*What perry does* (dump of this file): it records the `new Function` site as dynamic code that "names globals". `handlers` went into generated code, so every read of `handlers.tag`, `.onData` and `.extra` gets the verdict `receiver from unmodeled code (TOP)` and uses the general lookup. `local` never went near it, and `local.n` is still proven slot 0, with a guard (`proof=guarded`): one check, then the fixed slot. The output matches node. The design aims for a checked fast path even on values that reach dynamic code; today, here, they get the general lookup. Dynamic code is assumed only where the `Function` constructor is actually reachable (PR #13352).

## Where we are (2026-10-30)

**What works.**
- Per-unit facts have been the default since 2026-10-23.
- The TypeScript compiler's checker unit solves under the original work bound.
- The analysis is checked three ways: per unit against whole-program, fact by fact; perry's facts against TypeScript's checker, site by site; and each change against "sabotage" arms, deliberately broken copies that must make its tests fail. A test that can't fail proves nothing.
- The wpfacts test suite is at 586 passing tests (#13462).

**What runs.** The witness programs are the 14 AWFY benchmarks, the TypeScript compiler in both forms, schema-record, effect, commander, fastify (through `inject`), qs parse and stringify, yargs and marked. On the combined head of #13266 (2026-10-25), all of them compile and produce output identical to node, and `commander --help` matches too. The 22 programs of the public js-compiled benchmark suite compile and print node's result line, most recently re-checked in #13448 (2026-10-29).

**What it costs.** Compile time is reported, not gated: correctness first, then speed. On #13297 (2026-10-26), compiling tssrc took 307 s and 7.3 GB, and schema-record and effect peaked at 17.6 GB against 3.5 GB before. Today's facts-only runs on a shared, loaded build machine: tssrc per unit 201 s and 3.1 GB, whole-program 28 s and 2.0 GB; tscwork per unit 163 s and 6.0 GB, whole-program 59 s and 5.3 GB. Per unit is the slower mode on the biggest programs. That's on the list; it's not a reason to ship weaker facts.

**What's open.** This is the honest list, in rough order of size.

1. **The unit boundary.** On the Richards benchmark, per-unit facts prove 37 of 1,822 sites; the whole-program reference proves 1,673 of 1,832 (re-measured today). In today's per-unit dump, 1,684 of the unproven sites have the verdict `receiver from unmodeled code (TOP)`. An analysis on 2026-10-25 traced the per-unit loss on Richards to unit edges: parameters and `this` published to other units are ⊤ unless every caller's arguments are known. Contracts for parameters built from all of a function's callers are the lever. Pieces have landed, not enough yet.
2. **The ⊤ loop and stores into built-in prototypes.** This is the biggest group in the GAP worklist (16,485 of the 22,865 GAP sites go through it whole-program; groups overlap). Both direct attacks failed (above). The next attempt starts from the worklist, site by site.
3. **Escaped parameters, unknown-call effects and opaque built-in results.** These are the next GAP groups.
4. **Stable identities**, so that an edit re-solves only what it changes.
5. **Compile cost** of the large units.

No dates. The work moves when a mechanism is understood, not on a schedule.

## Why bother

A proven site costs a fixed-slot access or a direct call, at most behind one cheap guard, with no cache and no deoptimization; an unproven one still runs correctly. Today perry proves about a quarter of the TypeScript compiler's sites per unit, and about a third of the live sites in the whole-program reference. The worklist is for the rest.

*Perry is at github.com/PerryTS/perry. The PRs cited here are public and contain the full measurements.*
