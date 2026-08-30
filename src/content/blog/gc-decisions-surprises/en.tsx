import { BlogMarkdownContent } from "@/components/BlogMarkdownContent";

const markdown = `
**TL;DR.** Perry compiles TypeScript to native binaries and uses a moving, generational, precise-roots tracing collector — not refcounting. After a month in which nearly all of the GC work was *finding out what the collector was actually doing*, Perry now beats Node on 9 of 19 GC-shaped benchmarks (up from 3), beats the refcounting AOT competitor on 14 of 19, and is within 1.3× of Node on 15 of 19. Along the way: a bug class that leaves no forensic evidence, env knobs that gated nothing, CI gates that structurally could not fail, a doc comment that silently shipped a different collector, and a closing measurement showing the remaining gap is object *layout*, not collection. The nine rules we extracted are at the end, and most of them have nothing to do with garbage collection.

Perry compiles TypeScript straight to a native executable: SWC parses it, we lower to
HIR, LLVM emits machine code, \`cc\` links it. There is no interpreter and no bytecode.
And yet the language we compile has closures that escape, objects that outlive their
scopes, and reference cycles — so somewhere behind that native binary there has to be a
real garbage collector.

This is a writeup of the decisions we made building one, the things that surprised us
(most of them unpleasantly), and where the numbers stand today. The collector has been
the single most active area of the codebase for months: **201 commits touched
\`crates/perry-runtime/src/{gc,arena}\` since 2026-07-01, 110 of them in the last twelve
days**, across 127 files and ~75k lines. 135 of the 572 unreleased changelog fragments are
named for GC work.

Almost none of that was "implement a collector." It was finding out what our collector
was actually doing.

---

## Part 1 — What we chose

### No refcounting

The first question anyone asks is whether an AOT compiler should just use reference
counting. It is the obvious fit: no root discovery problem, no safepoints, no
cooperation with the optimizer required. The competing AOT TypeScript compiler we
benchmark against takes exactly that route.

We went with a tracing collector anyway, because refcounting makes the common case pay
for the rare one — every pointer store is a counter update, cycles need a backup tracer
regardless, and JS allocates enormous quantities of objects that die immediately, which
is precisely the case a nursery handles for free. Today that call looks right on 14 of
our 19 GC benchmarks and wrong on 5 (more on those at the end).

### Values are NaN-boxed — and we are in the middle of undoing that

Every JS value is one 64-bit word. We use the ~2⁵² spare NaN patterns of IEEE 754 to tag
pointers, small integers and singletons, and let everything else be a plain \`f64\`:

\`\`\`
TAG_UNDEFINED = 0x7FFC_0000_0000_0001   BIGINT_TAG  = 0x7FFA (low 48 = ptr)
TAG_NULL      = 0x7FFC_0000_0000_0002   POINTER_TAG = 0x7FFD (low 48 = ptr)
TAG_FALSE/TRUE= 0x7FFC…0003 / …0004     INT32_TAG   = 0x7FFE (low 32 = int)
                                        STRING_TAG  = 0x7FFF (low 48 = ptr)
\`\`\`

For the collector this is a genuinely good deal: "is this word a pointer?" is a mask and
a compare, with no per-value type lookup during tracing, and a number at rest is already
its own IEEE bits, so a numeric field costs no box and no header.

For the *mutator* it is the single biggest thing standing between us and V8, and we are
actively removing it. The problem is that NaN-boxed \`double\` is not merely *a*
representation, it is the **canonical** one — native machine types exist only as
region-local overlays, with a whole \`materialize_*_to_js_value\` family re-boxing at every
JS-visible boundary. In emitted IR that means a provably-i32 loop accumulator lives in an
\`alloca double\`, survives \`-O3\` as a \`phi double\` across the back-edge, and pays an
\`fptosi\` + \`sitofp\` round trip **every iteration**; function parameters are uniformly
\`double %argN\`, so a hot function re-unboxes its arguments on every one of millions of
calls; and numeric locals used to be registered as GC roots despite a number never being
able to be a pointer.

The measurement that settled it: a faithful unrolled bcryptjs \`_encipher\` runs 834 ms
against Node's 184 ms — and *adding type annotations made it worse*, 834 → 2732 ms,
because ~80 per-read guards plus boundary re-materialisation dominated. Expression-level
fast paths cannot fix a representation problem; each one is another overlay on a boxed
canonical, and on unrolled code they invert.

So the direction (\`docs/representation-selection-rfc.md\`, the unbox-by-default campaign)
is to make the unboxed native form canonical for every statically-proven value —
scalars, strings, objects, typed arrays, closures — end to end through locals, params,
returns and typed heap slots, and confine NaN-boxing to values that are provably
polymorphic. It stays the *default* representation; it stops being the *only* one.
Phases 1, 2, 3a, 3b, 4a and 4b are merged. Static Hermes is the existence proof, and the
AOT argument is that we have to *prove* types where a JIT gets to speculate — which is
also our advantage, since a proven kernel needs no warmup and can't deopt.

This matters to the GC directly, in both directions. Unboxing removes roots the collector
would otherwise have to scan (a proven scalar is not a root at all), and it *adds* an
obligation: once a heap slot holds something other than a NaN-boxed word, the collector
can no longer read pointer-ness out of the value, and has to consult a per-shape layout
mask instead. That machinery — \`pointer_mask\`, \`raw_f64_mask\`, the layout notes — is
where several of the bugs later in this post came from.

### One heap per thread, no sharing

Perry is single-threaded by default; \`perry/thread\` gives you \`spawn\` and
\`parallelMap\`, and values cross thread boundaries by deep copy (\`SerializedValue\`),
not by sharing. That is a real ergonomic cost, and it buys the collector something
large: **it never synchronises with another thread.** No global safepoint protocol, no
handshakes, no read barriers for cross-thread invariants. Every arena, every root
scanner, every remembered set is thread-local.

### Generational, because the allocation distribution says so

Two regions per thread: a nursery (\`ARENA\`, 1 MB blocks) and an old generation
(\`OLD_ARENA\`), 8-byte \`GcHeader\` per allocation, two aging bits (\`HAS_SURVIVED\`,
\`TENURED\`) instead of a counter field, \`PROMOTION_AGE = 2\`. The original plan (written
2026-04-24, before any code) put the reasoning plainly: >90% of JS allocations die in
the scope that created them, so a flat arena spends its whole life re-marking objects
that were trivially dead.

The plan also identified the prerequisite correctly, and this is the decision everything
else in this post hangs off:

> **Generational GC requires precise roots.**

A conservative scanner is fine for a non-moving collector — a false positive just
retains a dead object for a cycle. A *moving* collector cannot work that way: if you
cannot enumerate the roots precisely, you cannot rewrite them, and if you cannot rewrite
them you cannot move anything.

### Roots: one analysis, two lowerings, and LLVM statepoints by default

LLVM is free to keep values in registers, rematerialise them, and spill them wherever it
likes, none of which the collector can introspect. Perry's answer has two layers, and
keeping them separate took us an embarrassingly long time.

The **analysis** — which locals hold GC pointers, and where each must stay live — is
backend-independent. The **lowering** of that answer into emitted code is a choice:

- *Shadow stack.* \`js_shadow_frame_push(n)\` at entry, a \`js_shadow_slot_bind\` per
  JS-level local, \`js_shadow_frame_pop\` at exit. A heap-backed frame the collector walks.
- *Native stack maps via RS4GC.* Root allocas become \`ptr addrspace(1)\`, functions are
  tagged \`gc "statepoint-example"\`, and each module goes through
  \`opt -passes='function(mem2reg),rewrite-statepoints-for-gc'\`. LLVM inserts every
  statepoint, every relocation and every downstream-use rewrite itself, and we read the
  roots back out of a compact \`__perry_gcmap\` section at collection time.

**Since #7370 the statepoint lowering is the default** — \`PERRY_RS4GC=1\` is no longer
something you type; \`PERRY_RS4GC=0\` reverts to the shadow stack for bisection. It is
target-aware rather than blanket, because \`gc_map\` *refuses* to emit a map for a target
whose frame bases the runtime cannot resolve (a map nothing reads loses roots silently).
So the rule is native roots where the runtime can walk, shadow stack where it cannot:
aarch64/arm64 and x86-64 get statepoints; watchOS \`arm64_32\` and ARM64 Windows keep the
shadow frame. Falling back is not "no roots" — it is the other lowering of the same
analysis.

The evidence for the flip, with no env set: the full 479-test gap suite at **0
regressions and 0 compile failures**, all **128 try-carrying tests** compiled (the class
the old hand-written statepoint bridge could never handle), all 10 GC ratchet probes
byte-identical to Node, runtime −1–2% (i.e. slightly faster), binary size +1.86% on
zod's 81 modules.

The reason this is a better position than "we emit a shadow stack" is not the 1–2%. It is
that a statepoint carries **relocation semantics the optimizer must respect**, whereas a
shadow stack is only correct as long as the optimizer never does anything clever with a
value we forgot to spill. We have the receipts on that distinction — see Part 3.

Alongside that: **79 registered runtime root scanners** for state that lives in the
runtime rather than in user code — pending promises, timer callbacks, exception state,
async-context stacks, shape caches, the string intern table, the JSON scratch tables.

There is also a conservative native-stack scanner. Our own architecture doc describes it
as one of three co-equal mechanisms; that prose is out of date, and finding that out
while writing this was itself instructive. In the shipped production configuration
\`conservative_stack_scan_decision()\` resolves to \`SkipDisabled\` — liveness rests entirely
on the precise root map (statepoints, or the shadow frame on fallback targets) plus
\`RuntimeHandleScope\` in runtime helpers. The conservative path survives for specific
modes, notably the allocation-point collection, not as a safety net under the precise one.

### Write barriers, armed lazily

The generational hazard is old→young pointers: a minor GC that only traces the nursery
must be told about them. Codegen emits \`js_write_barrier\` calls on pointer stores and
the runtime maintains a remembered set.

The invariant we shipped for arming it (#7250) is one of the more reusable pieces of
design in the collector:

> While unarmed, the barrier records nothing. In exchange, the first *read* of the
> remembered set on a thread does not trust the log at all — it reconstructs the
> complete old→young edge set from the heap, and arms the barrier on the way past.

That is enforced structurally rather than by convention: \`remembered_dirty_snapshot()\`
is \`pub(super)\` with seven call sites, all inside \`gc/\`.

*(Aside for anyone reading the source: Perry has two unrelated things called "the
barrier" — the GC write barrier, and a compile-time \`Ptr<Shape>\` promotion barrier in
the representation-selection pass. Three separate issues have burned time conflating
them. Always name the file.)*

---

## Part 2 — The surprises

### 1. The bug class that leaves no evidence

The rooting invariant is one sentence:

> Any GC-managed value live across a collection point must be reachable from a root
> before that point. A value read out of a root and held in an SSA register across a
> call **is not rooted** — it is a copy, and the collector cannot see copies.

Violating it produces the worst debugging experience in the project. At the moment of
the collection there is *nothing for the collector to find*: no dangling reference, no
unforwarded slot, no anomaly of any kind. The nursery then recycles the address, the
stale pointer reads a valid unrelated object, and the program dies one or more cycles
later, in a different function, as \`TypeError: value is not a function\`.

Every runtime GC probe we own is blind to it. From-space scans come back clean. Verify
passes come back clean. \`PERRY_GC_VERIFY_EVACUATION\` checks that reachable slots were
forwarded — it cannot check a register it does not know exists.

We have now catalogued five distinct shapes, all of which shipped:

| # | Shape | Why it survived review |
|---|---|---|
| #7184 | Root store emitted at a slot index outside the pushed frame | \`js_shadow_slot_bind\` bounds-checks and silently no-ops; the IR *says* it was rooted |
| #7192 | Root store emitted *after* a call that allocates | The slot ends up rooted **and** dangling — it passes every "is it rooted?" check |
| #7206 | Method receiver loaded, then argument expressions lowered (each can allocate), then used | The load looks obviously correct in isolation |
| #7206 | \`base[key]\` — base materialised, then the key expression lowered, then the stale base used | Two operands, one evaluated first and used last |
| #7226/#7239 | A thread-local or static cell caching a heap pointer that no scanner rewrites | Not visible in the IR at all |

Four of them shipped **in a single day**. The fix in each case was a few lines. The cost
was always the detection lag. Note that only the first shape is specific to the shadow
stack — the rest are lowering-independent, and they survived the move to statepoints
unchanged, because the mistake is in *when the lowering emits the root*, not in what a
root is.

The one genuinely useful heuristic we found: **a perfectly reproducible GC bug means a
table, not a register.** An unrooted register only goes bad when a collection lands in
its window, so it is intermittent; an unrooted cache goes bad at collection #0 and stays
bad. That rule has exactly one known exception, and it is a sixth shape that no amount
of rooting can fix — a \`&str\` or \`&[u8]\` borrowed out of a heap \`StringHeader\` and held
across an allocating call. Rooting rewrites the *slot*; a borrow is not a slot. The only
sound fix is to copy the bytes off-heap before the first allocation.

### 2. So we stopped inspecting and started building instruments

The turning point on #7154 was not a fix; it was giving up on inspection after ten
investigation rounds and building tools that convert the bug into an immediate fault.

**From-space quarantine.** After an evacuating minor, don't recycle from-space. Detach
the retired blocks into a bounded ring, fill them with a poison word whose first byte
reads as an invalid \`obj_type\` (\`0xDE\`), and \`mprotect(PROT_NONE)\` the page-aligned
interior. A stale dereference now SIGSEGVs *at the faulting instruction*, with the
holder still on the stack. The installed reporter names the faulting address, which
minor retired that page, and what object used to live there, then restores \`SIG_DFL\` and
re-faults so a debugger still sees the real site.

**GC zeal.** Force an evacuating minor at every safepoint, so an unrooted value moves on
its first exposure rather than whenever an unrelated allocation burst happens to line
up. Modelled on V8's \`--stress-scavenge\` and SpiderMonkey's \`gcZeal\`.

**A depth knob nobody expected to need.** The quarantine is a ring of *N* retired
page-sets, default 4. #7154's \`new C(…)\` reproducer does not fault at depth 4 — or 8, or
100. Its constructor body crosses ~600 back-edge polls, so by the time the return-override
publishes the caller's stale register, the page it names is 600 retirements old. At
\`PERRY_GC_PROTECT_FROMSPACE_DEPTH=800\` it faults on the first use. "Raise the depth" is
now the first thing we tell anyone whose suspected bug refuses to reproduce.

And the instruments themselves are **sabotage-tested**, not merely exercised:
\`quarantine_catches_a_planted_stale_from_space_deref\` plants the #7184/#7192 shape and
asserts the instrument reports poison where the uninstrumented control reads a perfectly
valid recycled object. That control is the point — it demonstrates the bug is genuinely
invisible without the tool.

There is a static instrument too — \`scripts/gc_root_dominance_check.py\`, which reads
emitted LLVM IR and checks that root stores dominate every subsequent site that can
collect. It has a CI gate whose allowlist of known-remaining hits is currently **empty**,
so any new hit is a red build. It is also structurally blind to three classes (runtime
tables, unrooted locals in runtime Rust, and anything its symbol sets fail to name), and
we write that on the tin, because a clean report was twice taken as evidence for
something it could not possibly have checked.

### 3. Half our knobs were gating nothing

This is the surprise that changed our engineering policy rather than our code.

\`PERRY_GEN_GC_EVACUATE\` was, for months, the knob you set to prove a change was safe
under evacuation. When we finally measured it properly — identical binaries, same host,
a cell-by-cell diff over 12 ratchet probes × 8 counters — it moved **0 of 96 cells**.
Bit-identical medians. The same procedure with \`PERRY_GEN_GC=0\` moved 79 cells, so the
harness was sensitive; that knob specifically was not. It gated a fallback path that the
counters never came from.

Its one live effect was a footgun: it vetoed forced evacuation, so an ambient
\`PERRY_GEN_GC_EVACUATE=0\` silently disarmed \`PERRY_GC_ZEAL\` — the instrument from the
previous section — and a zeal run could report "clean" having moved nothing.

It was not alone:

- \`PERRY_GC_FORCE_EVACUATE\` was read **only on the minor path**, while every test that
  used it drove collection through \`gc()\`, which ran a full mark-sweep behind a forced
  conservative scan. Months of "passes under forced evacuation" meant nothing.
- The stress matrix's \`--pressure\` knob disabled the very path it was measuring — the
  defer hard cap and the arena trigger ceiling shared a formula and collapsed together,
  so the \`default\` arm ran zero copying minors on all 22 rows.
- \`PERRY_GC_FROMSPACE_SCAN_ABORT=1\` was completely inert on its own: the scan never ran,
  so nothing aborted, and the run reported success. An investigator reaching for the
  abort switch mid-hunt got a green run and no scan.
- \`gc_incremental_enabled\`'s doc comment said "EXPERIMENTAL — default OFF" eight lines
  above a body comment saying "DEFAULT ON". A merge decision was made on the wrong one.

The policy that came out of this is now binding in \`CLAUDE.md\`:

> **Every GC env knob either has a required CI arm exercising its OFF state, or it is
> deleted after one release of soak.** At most one diagnostic-only knob may exist at a
> time, and it must be labelled untested.
>
> **A mode that still exists is a decision that hasn't been made.**

\`PERRY_GEN_GC_EVACUATE\` was deleted, not fixed. What survives at each deletion site is a
tombstone comment explaining what used to be there and why it isn't — five of them, at
the exact lines where someone would otherwise reintroduce the conjunct. A CI audit now
derives the accepted knob names from uncommented production parsers and fails on any
live claim about a deleted one; its self-test plants a deleted knob behind a
commented-out parser and proves neither can pass.

### 4. Gates that cannot fail

\`CLAUDE.md\` carries a list of four ways a CI gate can be structurally unable to turn a
merge red. All four have bitten this repo, three within one week:

1. \`continue-on-error: true\` — \`gc-stress\` carried it for months while being the only
   job covering GC correctness.
2. Not in branch protection's required contexts — a job that reports failure without
   blocking is documentation, not a gate.
3. \`concurrency\` with unconditional \`cancel-in-progress\` — on a slow runner queue every
   new merge cancels the previous run before it reaches a runner. \`gc-ratchet\` had three
   consecutive \`main\` runs cancelled and zero executed.
4. **The gate runs, but its subject never did** — the most dangerous, because the job is
   genuinely green.

Then we found two more. \`gc-stress\` had *never run on \`main\` at all*: the workflow's
\`push:\` trigger is tags-only, and the job's \`if:\` condition omitted \`schedule\`, so
12 of 12 nightly runs reported it \`skipped\`. And \`lint\` — a *required* context — had
been red for three-plus nightlies over 16 files that had drifted past the 2000-line cap,
which meant every merge in the repo was landing via admin bypass. Branch protection was
theatre, and a correctly-built new gate wired into \`lint\` would have been inert on
arrival.

The corollary we keep re-learning: **a gate must assert its subject was live**, not
merely that nothing threw. Our zeal runs now print
\`forced_collections=… copying_minors=… moved_objects=… loop_polls=…\` at exit and **exit
70 if any of them is zero**, so a run that exercised nothing is a red run rather than a
green one.

### 5. The collector kept scheduling collections that couldn't help it

A recurring structural bug, three independent instances, one shape: *a predicate that
schedules a collection which cannot change the quantity the predicate reads.*

**The survivor-promotion handoff (#7592).** A predicate replaced a minor with a full
mark-sweep to make room in old-gen for survivors about to be promoted. But a full
mark-sweep is non-moving — it promotes nothing — so it could not relieve the pressure
that scheduled it, and was true again at the very next minor. Measured on a JSON
pipeline at 200k records: **19 of 22 collections were these fulls, each freeing 0.0 MB
at ~400 ms.** 7.6 s of an 8.6 s phase. The copying minor that would have done the actual
promotion never ran once.

**The nursery cap (#7690).** A cap keyed on from-space occupancy, applied to a
*non-moving* minor which sweeps in place and leaves from-space occupied. So a capped
trigger firing a non-moving minor is due again on the very next block: one whole-arena
collection per 1 MB allocated, quadratic in the live set.

**The live-proportional cap that was a fixed point.** An attempt to make the nursery cap
scale with the live set used \`max(base, arena_in_use)\`. But the dueness test compares
*from-space occupancy* to the cap, and on that workload from-space ≈ live — so
from-space could never cross its own cap and scavenging stopped entirely. It measured a
5.9× win, from doing no work.

Two rules came out of this, and they are the load-bearing ones in our pacing code:

> **Never pace a collection on a quantity that collection does not move.**
>
> **No constant band may pace a collector whose per-cycle cost is O(live)** — total work
> goes quadratic in the live set, and a bigger constant only moves the cliff.

Fixing that family took one JSON workload from **60.4 s to 3.86 s**, with the per-record
cost flat within ~30% across a 20× size range where it had previously grown 70×.

### 6. And one time, the collector documented a change it never made

The most expensive single line in this whole story is a doc comment.

#7690 wrote the complete argument for turning moving-loop back-edge polls on by default
into two doc comments — one in the runtime, one in codegen — and **changed neither
body.** Both still matched \`1|on|true\`, i.e. default OFF, and no test pinned the default
in either direction. The runtime's comment even asserted "codegen's mirror of this MUST
agree"; they did agree, at the value the doc said they no longer held.

That is not a slower configuration. It is a different collector. Nursery pressure has
exactly two precise collection points — the loop back-edge poll and the outermost
microtask-pump boundary — and with no poll emitted a compute-only program reaches
neither. Every nursery collection therefore landed at the allocation point, where a
prior fix had correctly made collections non-moving. **The shipped collector had no
nursery evacuation at all**, and fell back to whole-arena full collections.

| bench | shipped \`main\` | polls actually on |
|---|--:|--:|
| tree | 5.10 s | **1.63 s** |
| tree_wide | 7.26 s | **2.12 s** |
| retain | 2.33 s | **1.32 s** |
| churn | 1.00 s | **0.46 s** |
| cycles | 0.29 s | **0.19 s** |

One benchmark ran **13 whole-arena full collections (0.477 s of pause)** where the same
program a few weeks earlier ran **105 copying minors (0.016 s)**. \`tree\`'s total GC
pause fell 4.107 s → 0.550 s; its max pause 266 ms → 16 ms.

The diagnostic that found it was not wall time — it was the *kinds* of cycles in
\`PERRY_GC_TRACE=1\`: \`{'full': 13}\` where there should have been \`{'minor': 105}\`.

Three tests now pin the default, including the unrecognised-value arm, and a third pins
that the two crates agree — because the disagreement is silent in both directions
(polls nothing consumes, or a deferral nothing drains), so it needs an assertion rather
than two doc comments claiming they match.

That class is not closed. A profiling round this week turned up a live instance of the
same shape in the write barrier: **codegen emits a \`seq_cst\` load of the barrier-active
counter — an \`ldar\` on aarch64, and \`evalNode\` has 42 such sites — while the runtime reads
the same global \`Relaxed\` for the same decision**, and codegen's own doc comment for the
site says "one relaxed load of a \`static\`". Two readers of one global, disagreeing about
the required ordering, with the documentation siding against the code. At most one of them
is right, and if it is the runtime that is wrong then the bug is far more serious than the
\`ldar\`. It is filed rather than fixed, deliberately: the failure mode of guessing is a
missed insertion barrier, which is silent at collection time and surfaces cycles later as
\`TypeError: value is not a function\`.

### 7. The fastest GC work is the work you delete

Once the pacing bugs were out, the remaining cost turned out — repeatedly — to be work
that should not have existed.

**A heap where nothing dies was being marked over and over.** \`retain.ts\` builds a
3M-element array of records and drops none of them. Perry spent **1.26 s of a 1.31 s run
inside the collector** — 96%. Node does it in 0.13 s. Two full mark-sweeps reclaimed
4 MB *between them*, one of them moving arena occupancy by exactly zero, because the
escalation predicate keyed on growth and a growing live set crosses a growth threshold
every time it doubles. Fix: price a full by what it reclaims, and shift the threshold
right when a full proves unproductive.

**Every evacuated object took a process-global mutex to hash an empty map.** A move hook
ran a SipHash \`remove\` against the residual \`Object.setPrototypeOf\` registry, which is
empty in any program that never re-prototypes. A latch already existed saying so; the
move hook was the one reader that skipped it. A 3M-record promotion paid 2.5M
uncontended-but-real mutex acquisitions for nothing.

**Then we stopped moving the objects at all.** When a copying minor's nursery is
essentially entirely live, evacuating object-by-object is pure overhead — you pay a
fresh old-gen allocation, a \`memcpy\`, a layout transfer, accounting, move hooks, a
forwarding stub and a rewrite of every referring slot, to put an object somewhere it had
no reason to be. Whole-block in-place promotion (V8 calls it page promotion) relabels
the block's generation instead. Nothing moves, so nothing needs rewriting:

| workload | before | after |
|---|--:|--:|
| retain | 0.81 s | **0.53 s** |
| retain_wide | 1.33 s | **1.07 s** |
| deeplist | 0.30 s | **0.24 s** |
| promotion cost/object | 243 ns | **105 ns** |

**And then we stopped tracing them too.** Even after that, three separate passes still
walked every survivor — the remembered-set dirty scan marked them, the drain re-touched
them, \`clear_marks\` touched them a third time. On a cycle where nothing moves and
nothing can be freed, the trace cost ~55–67 ns per object while the walk that does the
actual promotion cost ~9 ns. A promoting cycle now skips the trace entirely when the
last measured survival ratio is in the fully-live regime — and refuses to, explicitly,
whenever any of its assumptions costs something: a registered weak-target holder, a
non-empty malloc registry, an in-progress incremental mark, or any of the three verify
instruments armed (each takes the trace as its subject, and a cycle producing no marks
would let all three report success having examined nothing). \`retain\` −33.6%,
\`deeplist\` −43%, and the promoting cycles that used to cost 243 ns per object now cost
**8.9 ns**.

The policy behind all of this is a *measurement*, not a guess. Block liveness isn't
knowable before the trace, so the decision is per-cycle from the previous cycle's
measured young-survival ratio — and the population turned out to be bimodal by three
orders of magnitude:

| workload family | copying minors | young-survival ratio |
|---|--:|--:|
| retain, retain1, retain_wide, deeplist | 3–7 | 0.999 – 1.000 |
| churn, churn_alloc, push_cls | 105 | 0.000 – 0.004 |
| push_num, cycles | 16–18 | 0.000 |
| tree, tree_wide, churn_read | 0 | *no copying minor runs at all* |

A mispredicted cycle retains at most a few percent of one nursery, a promoting cycle
still traces often enough to measure itself, and a running cap on promoted dead bytes
bounds the steady state.

Also worth stating plainly: **the "one mechanism" story is usually wrong, and your own
profile moves under you.** Today's pause fractions, measured at the same commit as the
standings below:

| program | wall | GC pause | pause fraction | cycles |
|---|--:|--:|--:|--:|
| retain | 159.5 ms | 52.0 ms | 33% | 5 |
| retain1 | 71.4 ms | 38.7 ms | 54% | 3 |
| retain_wide | 206.2 ms | 75.4 ms | 37% | 8 |
| shapes | 64.8 ms | 4.6 ms | **7%** | 1 |
| asyncpipe | 127 ms | 0 ms | **0%** | 0 |

Two of those numbers were 93% and 62% a week ago; the work in this section is what
killed them. \`shapes\` at 7% is not a GC benchmark at all any more — it was 94 ms of GC
in a 139 ms program until the bug in §8, and we had it filed under "high-survival GC" on
the strength of that ratio. GC levers will not move it now.
A uniform-looking ratio across benchmarks was a coincidence of arithmetic, not evidence
of a shared cause.

### 7b. "Zero cycles" is not "no GC cost" — a counter we misread as a conclusion

The \`asyncpipe\` row above says 0 ms of pause across 0 cycles, and we wrote that up
internally as "a pure mutator program; every GC lever is irrelevant to it." A profiling
round briefed on exactly that premise came back having refuted it.

\`asyncpipe\` never prints a \`[gc]\` line, and **~33% of its leaf profile is collector
machinery anyway** — write barriers, per-object layout side tables, \`RuntimeHandleScope\`
rooting. Turning off moving-loop back-edge polls measures **−14.1% while the program
still runs zero GC cycles**: an incremental old-generation mark/sweep is being driven at
those polls, never completing a cycle, and therefore never reporting one. That was the
single largest lever in the round, and the premise we handed the profiler pointed away
from it. (\`PERRY_WRITE_BARRIERS=0\` is +0.9% here, so the codegen barriers really are
exonerated — it is the incremental drive that is not.)

> **A cycle counter measures collections, not the collector's cost.**

Barriers, side-table maintenance, rooting and incremental slices are all mutator-side and
structurally invisible to a per-cycle trace. \`0 cycles\` reads like a conclusion and is
only an observation about one mechanism.

The related trap, from the same round: \`asyncpipe_big.ts\` is **not** a valid scaled
version of \`asyncpipe\`. At 120 batches it runs zero cycles, at 240 it runs two copying
minors, at 1200 it is GC-dominated. Scaling a workload to clear a timing noise floor
silently produced a different benchmark — the same shape as the vacuous "realistic"
variants in §9, caught only because someone checked that the property under study
survived the scaling.

### 8. Sixteen bytes over a line

The best single bug of the campaign. A benchmark called \`shapes\` was spending 94 ms of a
139 ms run in two minor collections, reporting a young-survival ratio of 739‰ and 925‰
while its actual live set was about 3,200 objects.

\`arena_alloc_gc\` births anything over \`LARGE_OBJECT_THRESHOLD_BYTES\` (16 KB) directly
into the old generation and stamps it \`TENURED\`. A \`Node2D[]\` of 2000 elements has a
16,400-byte backing store. **Sixteen bytes over the line.**

So every round's array was permanently live (a minor never sweeps old-gen), the write
barrier had faithfully recorded an old→young edge for each of its 2000 stores, and every
subsequent minor's remembered-set scan marked all 2000 of them live again — 94,000 and
then 118,006 re-marked slots.

The fix is the interesting part, because "raise the threshold" would have been wrong.
Crossing that line trades *copy cost* against *retention cost*. For a pointer-free
object those are the same quantity — bounded by the object's own size — so 16 KB stays.
For a pointer-bearing object the retention is transitive and unbounded, so arrays,
objects and closures get 128 KB (V8's \`kMaxRegularHeapObjectSize\`, which draws the line
in the same place for the same reason). The selection reads the existing \`pointer_free\`
flag rather than a hardcoded type list, and an unknown type keeps the conservative value.

\`shapes\` went from 0.139 s to 0.061 s on the round that landed the fix — 0.058 s and
1.39× *faster* than Node by the closing sweep in Part 4 — with peak RSS 71.4 MB →
32.3 MB. Every other program in the 19-program corpus moved within ±1.3%.

### 9. Measuring turned out to be harder than fixing

A partial list of things that produced a confidently wrong conclusion:

- **We benchmarked against a \`main\` that was itself broken.** For several days
  allocation-heavy programs on \`main\` were ~20× slow (that's surprise #6), so every A/B
  based on it was meaningless. The signature was load-independent and decisive —
  collection count 105 → 1304 — and nobody looked at it, because the wall-clock numbers
  were merely *bad*, not absurd.
- **The auto-optimize relink rebuilds the runtime \`--no-default-features\`,** which
  silently drops the \`diagnostics\` feature, so \`PERRY_GC_TRACE\` prints nothing and cycle
  counts read **0**. One investigation concluded "zero collections" for three separate
  arms before noticing.
- **A pinned ratchet baseline from another host and 30 versions ago** reported 29
  "regressions" that were pure drift. A/B both arms back to back on one machine, always.
- **A pretenuring win of 108 MB → 0 was a confound**: the base arm predated a change
  that had landed in between. The mechanism was correct; the target was wrong (the moved
  cohort was a runtime-allocated parse tree, not the codegen-visible literals we could
  reach), and the ceiling was ~1 MB.
- **We timed a crashing program for weeks.** One competitor's binary prints the right
  answer on \`deeplist\` and then exits −11 (SIGSEGV) on a recursive refcount drop. We
  recorded that column as a loss. Every timing harness now records exit codes per cell.
- **\`grep -c\` exits 1 on zero matches**, quietly truncating \`&&\`-chains in benchmark
  scripts. So does a \`PERRY_GC_TRACE\` pipe that SIGPIPEs at exit 141.

The rules that survived: cite the census counter, not the clock (counters are
load-independent); compare the *binaries* before comparing timings; assert that the
comparison actually compared something; and check that the arm you claim to be testing
was live.

---

## Part 3 — The two long roads

### Statepoints: taken, over four months and three enablers

LLVM's \`gc.statepoint\` was, from the first prototype, obviously the
correctness-superior mechanism. It gives you **relocation semantics the optimizer must
respect**, where a shadow stack is only correct as long as the optimizer never does
anything clever with a value you forgot to spill. The interesting part is everything
between "obviously better" and "shipped by default", because none of the delay was about
performance.

**It was blocked on things that were not the GC.** Exceptions lowered to
\`setjmp\`/\`longjmp\`, and a \`longjmp\` can jump *past* a \`gc.relocate\`, so the relocated
pointer is never written back — under RS4GC it is worse, because \`mem2reg\` will not
promote the volatile allocas that setjmp correctness requires, so try-region roots never
enter SSA and are never relocated. \`gc.statepoint\` has an invoke form precisely for this.
So the road to statepoints ran through deleting Perry's entire setjmp exception lowering
and replacing it with invoke/landingpad (#7302/#7305), and through moving LLVM in-process
(#7301) so the pass pipeline was ours to control. Neither was a GC ticket.

**The tempting compromise was the trap.** "Keep the shadow stack for \`try\` functions" was
on the table and would have cemented two root mechanisms forever. So was
"delete the shadow stack, keep statepoints" — which turned out not to be *expressible*,
because statepoints are an alternative lowering of the shadow stack's root-set analysis,
not an independent mechanism. Splitting the predicate (#7340) is what made both the
per-target default and any future deletion possible; before it,
\`PERRY_SHADOW_STACK=0\` plus statepoints produced a binary with **no precise roots at
all**, no \`__perry_gcmap\` section, correct output, and nothing to distinguish it from a
good build until a collection freed something live.

**One of the two backends had to die.** We carried an explicit hand-written statepoint
bridge alongside RS4GC for a while. They were never peers — the bridge could not root an
\`invoke\` and so refused try-carrying functions outright — and it was also RS4GC's silent
fallback, which is the untested-configuration shape the knob kill-policy exists to
prevent. Before deleting it we measured: **1,574 functions across a real Drizzle app and
the ratchet probes all lowered as RS4GC, none fell back.** The bridge, its CFG-based
liveness analysis, its call parser, its emitter, the \`PreciseRootBackend\` enum and the
\`PERRY_STATEPOINTS\` knob all went with it, and a bail is now a hard failure naming the
function rather than a downgrade.

**And then the default shipped with no coverage.** Native roots were the default on every
walkable target for months while **nine root-lowering mechanics had zero assertions
against the lowering Perry actually emits** — and three tests that read as coverage were
measuring nothing at all: they asserted \`js_shadow_slot_bind\` was *absent*, which under
the native default is true of every program, rooted or not. Hazard 4 again, in the part
of the system whose whole job is not silently losing roots. Fixed in #7653, with three
vantages (pre-\`opt\` IR, post-RS4GC \`"gc-live"\` bundles, and the decoded \`__perry_gcmap\`
blob) because each is blind to what the next one catches. The static root-dominance
checker had the same problem from the other side: it anchored on \`@js_shadow_slot_bind\`,
so its corpus was compiled with \`PERRY_RS4GC=0\` — it was checking a lowering we no longer
ship, until #7663 taught it statepoints.

One design law came out of the experiment, paid for with a measured negative result: **root
metadata without relocation semantics is unsound under an optimizing compiler.** A compact
per-function metadata scheme delivered 10–13× smaller maps and deterministically corrupted a
10-line churn loop — not because the map machinery was wrong, but because the mutator reads
from-space through stale heap-derived SSA values that only a relocation can fix. Barriers
constrain memory ordering; they do not constrain dataflow.

### Unboxing: in progress, and it is now the main event

The other long road is the one from Part 1: making the unboxed native representation
canonical and demoting NaN-boxing to the polymorphic fallback. Phases 1 (scalar locals),
2 (specialised ABI), 3a/3b (strings and \`Ptr<Shape>\` pointer locals), and 4a/4b (typed
heap: numeric arrays, then the bookkeeping the boxed layout was paying needlessly) are
merged.

Two things are worth reporting honestly about it.

**One sub-phase was assessed and rejected, and the reason is a NaN-boxing compliment.**
Unboxed *object fields* — Phase 4b's original headline — was scoped out after recon
rather than built. A \`number\` field slot already holds raw IEEE bits, because NaN-boxing
only reserves \`0x7FF9..=0x7FFF\`, so the layout's \`raw_f64_mask\` is a *proof bit*, not a
storage change, and the read-side guard was already gone; raw string handles at rest
would break small-string optimisation by heap-materialising short strings for nothing;
and raw \`i1\`/\`i32\` slots would need a third mask plus a layout probe at ~25 direct
slot-read sites, including \`JSON.stringify\`, \`util.inspect\` and \`v8\` serde — hot paths,
not the rare ones the argument assumed. What shipped instead was elision: a field store on
a proven receiver retires its layout note when the value is a non-pointer by construction,
and its string addref when the value cannot be a heap string.

**And the GC handed the campaign its next target.** The closing measurement in Part 4 says
the collector is no longer the binding constraint on our hardest cluster — the mutator is,
and specifically that **a two-field object literal occupies 72 bytes**. That is a
representation problem in the exact sense of the RFC, and it is where "actual objects"
goes next.

### Roads not taken

**Concurrency.** The owner's directive, asked directly:

> "I don't want to chase parallelism/concurrency for the sake of it. It should be a
> later resort for work that must happen, but not at the expense of the hot path."

That constraint *decides* the design rather than deferring it. The three families differ
exactly in where they charge the mutator: parallel stop-the-world charges it nothing
(GC threads live only inside the pause); concurrent marking charges a store barrier on
every pointer write while marking; concurrent compaction charges a **load** barrier on
every pointer read. Loads dwarf stores, so the last is the hardest no. Parallel STW is
the only admissible design, and it is third in line behind (1) deleting per-object work
that shouldn't exist and (2) pretenuring the immortal cohort. Parallelising 2.1M object
visits that shouldn't happen is spending four cores doing the wrong thing faster.

The measurement then agreed independently, and more strongly than the directive did.
After the work in §7, the per-object visits on our worst promotion case split roughly
half into work we deleted outright and half into **9.6 ms of a 159 ms program**. There is
no longer enough collector time on the table to be worth parallelising — a 2× on GC work
would be a 3% program. Parallel GC is not a deferred plan; on this workload set it is a
measured non-lever.

There is also a correctness argument that we take more seriously than the perf one:
today, "a perfectly reproducible GC bug means a table, not a register" is a real
diagnostic. A parallel collector destroys it, and turns 79 root scanners and every
\`thread_local!\` cache into a potential data race.

**Old-page defragmentation — shipped on by default, and reverted the same day.** This one
is the freshest, and it is a cleaner example of rule 1 than anything else we have.

Compacting partially-live old pages had been off since a 2026-07 bug reproduced a stale
non-heap reference to a moved old object (6/6 corruption with it enabled). Turning it back
on was tracked as a *rewrite-contract project*, not an env flip, and the tracking issue
wrote its own acceptance bar: enumerate every metadata/IC/cache path that can retain an old
movable address, and **"re-enable defrag only after the reproducer and a dependency-scale
stress corpus are clean."**

The contract work landed and audits well — the static root-dominance allowlist is still
empty, so the ~40 previously-exempted hits were genuinely fixed rather than re-suppressed;
the runtime holder policy was *tightened* so \`open_gap\` and \`unverified\` verdicts now fail
outright; and the two caches whose safety rested explicitly on *"only old-gen defrag can
move them"* were fixed rather than exempted. It even honoured a tripwire: the exemption it
deleted carried a \`becomes_real_when\` clause naming this exact trigger.

The **default flip** rode along with it, and that part had no evidence — because it
structurally cannot get any from our suite. Selection requires \`dead_bytes >= live_bytes\`
on an old page, i.e. promote-then-die at scale. The \`retain\` family survives at 999–1000‰
and the \`churn\` family promotes almost nothing, so **no benchmark we own can produce a
candidate page.** The suite yields neither a benefit signal nor a regression signal, while
still inheriting the full old-address rewrite surface. Every GC gate was also still queued
and unexecuted when it merged.

So we kept all of the correctness work and reverted the default to opt-in, until a
fragmentation workload exists that can actually exercise it — at which point the losing arm
gets deleted rather than left standing. The new rule:

> **A feature your benchmark suite cannot trigger is a feature your benchmark suite cannot
> defend.** Ship it off by default until a workload exists that can, or accept that both
> its arms are untested.

**Pretenuring.** Built twice, measured, refuted, parked with a written re-open condition.
The architecturally correct thing (place long-lived objects in old-gen at birth) lost to
the emergently sufficient thing (a promote-on-first-copy seed that bounds any cohort to
one hop). At every constructible load the two arms were indistinguishable. The
meta-lesson went straight into our practice: **test the discriminating shape before
building the invariant.**

---

## Part 4 — How it's going

Closing sweep, 2026-08-12, quiet pinned M1 mini, best-of-5, exit-checked, output
byte-verified against \`node --experimental-strip-types\` before timing. 19 GC-shaped
benchmarks against Node 26.5.1 and a refcounting AOT competitor.

**Perry beats Node on 9 of 19** (it was 3 of 19 at the start of the round), **beats the
refcounting compiler on 14 of 19**, and is **within 1.3× of Node on 15 of 19.**

| bench | perry | node | P/node | Δ this round |
|---|--:|--:|--:|--:|
| churn_read | 0.023 | 0.089 | **0.25** | −0.9% |
| fib40 | 0.393 | 1.036 | **0.38** | −0.2% |
| deeplist | 0.057 | 0.096 | **0.59** | −44.1% |
| push_num | 0.070 | 0.117 | **0.60** | −0.6% |
| shapes | 0.058 | 0.081 | **0.72** | **−58.0%** |
| retain1 | 0.069 | 0.086 | **0.80** | −36.9% |
| retain_wide1 | 0.071 | 0.091 | **0.78** | −46.5% |
| push_cls | 0.117 | 0.141 | **0.83** | −50.0% |
| churn_alloc | 0.118 | 0.141 | **0.84** | −50.8% |
| tree | 0.453 | 0.452 | 1.00 | +0.1% |
| churn | 0.171 | 0.167 | 1.02 | −40.7% |
| tree_wide | 0.951 | 0.916 | 1.04 | +0.0% |
| cycles | 0.084 | 0.076 | 1.11 | −2.4% |
| retain | 0.156 | 0.137 | 1.15 | −42.1% |
| retain_wide | 0.202 | 0.157 | 1.28 | −45.7% |
| asyncpipe | 0.127 | 0.078 | 1.63 | −3.8% |
| pipeline | 0.175 | 0.097 | 1.80 | −33.7% |
| interp | 0.674 | 0.323 | 2.09 | −20.1% |
| iso_miss | 0.966 | 0.334 | 2.89 | −21.5% |

What remains is two **disjoint** clusters, and treating them as one mechanism is a
mistake we have already made once:

1. **Versus Node — dispatch and mutator, mostly not GC.** \`iso_miss\`, \`interp\`,
   \`pipeline\`, \`asyncpipe\`. Largely polymorphic property dispatch, inline caches and
   representation selection — a different campaign. But see the correction below before
   reading \`asyncpipe\`'s 0% as "no GC here".
2. **Versus the refcounting compiler — the \`retain\` family.** \`retain1\` 1.80×,
   \`retain_wide1\` 1.67×, \`retain_wide\` 1.65×. All of them already beat Node. These are
   the rows where nothing dies, which is exactly where we expected a tracing collector
   to be at its worst — and that expectation turns out to be wrong in an interesting
   way.

And here is the finding that reframes the whole campaign, from the closing sweep: **on
that second cluster, the collector is no longer the binding constraint — the mutator
is.** Subtract *all* GC pause and \`retain_wide\` (130.8 ms of pure mutator) and \`shapes\`
(60.2 ms) still lose. \`retain\` would need exactly zero GC to reach parity. What is
actually costing us is that **a two-field object literal occupies 72 bytes**, so
\`retain\` writes **216 MB of memory to store 48 MB of numbers** — 4.5× write
amplification. The competitor's edge on those rows was never refcounting; it is
compactness. That is now a representation problem (#7916), not a collector problem — the
unbox-by-default campaign from Part 1, aimed at object layout rather than at scalars.

There is a matching defect on the other cluster: \`asyncpipe\` collects at
1,200–1,650 ns per object, including a **122 ms minor collection that handled zero
objects** — longer than the whole program. A per-cycle cost independent of object count
is fixed overhead, and it is the last piece of the collector still visibly on the
critical path (#7915).

One thing we tried and are recording as a negative result, because it is the obvious
next move and it is wrong: **do not shrink the first nursery.** Cycle 0 is 58–81% of GC
pause on the retain family, so capping it looks free — at 2 MB, \`retain\`'s GC pause
drops 52 → 31 ms. But \`asyncpipe\` goes from 0 collections to 4, costing 385 ms on a
127 ms program, and the earlier promotion re-times the old-gen trigger into extra full
mark-sweeps (\`retain_wide1\` +182%).

For scale on where this started: the JSON pipeline that opened this campaign went from
60.4 s to 3.86 s. The \`retain\` family moved 36–46% in a single round of the work
described above. And the whole collector still has a kill switch to full mark-sweep
(\`PERRY_GEN_GC=0\`) that we keep exercised, because the day we can't bisect against it is
the day we stop being able to trust any of the numbers here.

---

## The rules we now work by

Most of what we learned generalises past garbage collection:

1. **A mode that still exists is a decision that hasn't been made.** Delete the losing
   branch, or keep an arm that exercises it. Leave a tombstone comment where you deleted it.
2. **A gate must assert its subject was live**, not merely that nothing threw. "Green
   because it ran nothing" is worse than red.
3. **Never pace a feedback loop on a quantity it cannot move.** Three separate livelocks,
   one shape.
4. **No constant band may pace an O(live) process.** A bigger constant only moves the cliff.
5. **When a bug class leaves no evidence, stop investigating and build the instrument.**
   Then sabotage-test the instrument, including the uninstrumented control that proves the
   bug was invisible.
6. **A doc comment is not a change.** Pin defaults with tests, including the
   unrecognised-value case, and pin agreement between any two components that must match.
7. **Measure both arms on one host, from the same tree, and check the exit code.**
8. **Test the discriminating shape before building the invariant.**
9. **Refuse the permanent hybrid.** "Keep the old mechanism for the hard cases" is how a
   migration becomes two mechanisms forever. Make the hard case work, or don't migrate.

The collector is not finished. It is, for the first time, *legible* — every knob gates
something, every gate can fail, every default is pinned by a test, and every published
number was measured on a quiet machine with the output verified first. That legibility
took more work than the collector did, and it is the only reason the last month of
numbers moved.
`;

export default function Content() {
  return <BlogMarkdownContent markdown={markdown} />;
}
