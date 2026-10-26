---
title: "Optimizing Everything: One Week, 68 Releases, and a 547x JSON Speedup"
excerpt: "Perry v0.5.13 → v0.5.80 in seven days. JSON.parse closes a 547x gap to Node. mimalloc lands as the global allocator. Inline caches, shape transitions, typed buffer slots, i32-native bitwise ops, scalar replacement, and a native event loop that keeps Fastify and WebSocket servers alive."
date: 2026-04-17
tags: ["performance", "llvm", "JSON", "GC", "server", "milestone"]
---
The last blog post shipped with Perry at v0.5.12. Today we're on v0.5.80. That's **68 patch releases in seven days**, almost entirely focused on one thing: turning every remaining slow path into a fast path.

The LLVM cutover in v0.5.0 recovered to parity with Cranelift by v0.5.12. That was the end of one story and the beginning of another. LLVM sees everything now. The question stopped being “why is this slow?” and started being “why isn't this already fast?” — which is a much more tractable question.

This post is a tour of the week. JSON got a 547x speedup. mimalloc became the global allocator. Property access grew a monomorphic inline cache. Buffers grew typed pointer slots with `noalias` metadata. Fastify and WebSocket servers stopped crashing after a minute. And the benchmarks moved again.

## 1\. JSON: closing a 547x gap

At v0.5.29, Perry's JSON.parse on a 20-record array was **547x slower than Node**. By v0.5.46 it was 1.3x. That number is the single biggest delta of the week, and it's worth walking through because every other optimization in this post is a variation on the same theme: don't do work you don't have to.

The original parser allocated one Vec per property, one Vec of keys per object, and one RefCell-guarded thread-local for the key cache. It copied every string. It re-hashed every field name. It built a brand-new object shape for every record, even when all 20 records had the exact same fields in the exact same order. Node's parser handles this by noticing the pattern and sharing a single shape across all records. Perry's did not.

The fix landed in four steps:

1.  **Key interning via a thread-local `PARSE_KEY_CACHE`** (v0.5.45). The first record allocates N key strings; records 2 through 20 allocate zero. Repeated keys resolve to the same pointer, which makes them usable as shape-cache lookup keys without a strcmp.
2.  **Shape sharing through the transition cache** (v0.5.45). Objects built by `js_object_set_field_by_name` walk the same transition graph. When the schema repeats, the `keys_array` pointer is shared, and that's what a polymorphic inline cache needs to hit.
3.  **Zero-copy string parsing + incremental object build** (v0.5.46). `parse_string_bytes` now returns `ParsedStr::Borrowed(&[u8])` when there are no backslash escapes — which is the common case for every key and most values. `parse_object` writes fields directly instead of collecting into a Vec first.
4.  **GC suppression during parse** (v0.5.60, closes #59). Parsing a large array allocates thousands of small objects in a tight loop. Each one was tickling the GC threshold check. Setting a “parsing in progress” flag defers collection until the parse returns — same effective heap size, vastly fewer bookkeeping branches.

Then stringify. JSON.stringify on homogeneous arrays — the same shape, millions of times — was doing full property iteration per object, which for a shape-stable array is pure waste. A five-step fix closed most of that gap too:

-   v0.5.62: itoa / ryu fast paths for numbers, depth-based circular-reference check instead of a HashSet.
-   v0.5.63: `toJSON` guard + persistent key cache + inline dispatch (the three per-call costs that added up).
-   v0.5.65: homogeneous-shape stringify template + ASCII escape fast path. When every element has the same shape, the key/colon/comma scaffolding is precomputed once.
-   v0.5.70, v0.5.72, v0.5.75: per-call shape-template cache, close the parse-leftover GC gap, kill the remaining fixed per-call overhead.
-   v0.5.79: the small-value path. Numbers, booleans, and short strings go through a direct path that doesn't set up any of the object machinery.

The cumulative result: a JSON pipeline that was **547x off Node** at the start of the week is now roughly **1.3x off on parse and competitive on stringify**, on realistic workloads.

## 2\. The allocator story

Perry allocates a lot. Every object literal, every array literal, every string concatenation, every closure. The allocator is hot, and for most of v0.5 it was Rust's default system allocator plus a thread-local arena for short-lived values.

v0.5.67 replaced the global allocator with **mimalloc**. This is a one-line change in Cargo.toml that pays back immediately on any workload that does a lot of small allocations — which is every TypeScript program. v0.5.66 preceded it by consolidating all the `gc_malloc` thread-local state into a single TLS access per call, so the path into mimalloc was as cheap as possible.

v0.5.68 took this further with **arena-allocated strings**. Short-lived strings (intermediate concat results, `split()` pieces, parser scratch) skip the global allocator entirely and land in a per-thread bump arena that resets at natural boundaries. For JSON parsing this was a double-digit percent win on its own.

And the two optimizations that don't allocate at all:

-   **Scalar replacement of non-escaping objects** (v0.5.17, then object literals in v0.5.76). If an object never leaves its enclosing function, it doesn't need to exist. Its fields become plain locals. LLVM handles this out of the box once you stop hiding the object behind an opaque allocator call.
-   **Scalar replacement of non-escaping arrays** (v0.5.73). Same idea — if the array doesn't escape, its elements become SSA values and the whole allocation disappears.

For the array literal path specifically, v0.5.69 added an **exact-sized fast path** (skip the capacity-growth machinery when the size is known at compile time), and v0.5.74 inlined the bump-allocator IR for small array literals so LLVM can see the allocation, fold it, hoist it, or eliminate it. Array-heavy benchmarks moved another step.

Rounding it out, v0.5.25 fixed a quieter bug: `gc_malloc` wasn't triggering collection on its own path, so malloc-heavy workloads could grow the heap unbounded before anything checked. v0.5.61 added adaptive step sizing to the threshold, which is what you actually want: check cheaply when the heap is small, less often when it's large.

## 3\. Property access grew a real inline cache

Every modern JavaScript engine has a polymorphic inline cache (PIC) on property access. For most of Perry's v0.5 series, PropertyGet went through a shape-table lookup with a thread-local hash. That's fine for cold code. It's not fine when 95% of your property reads in a given call site see the same shape, which is almost always.

v0.5.44 landed a **monomorphic inline cache** for `PropertyGet`. Each PropertyGet site gets a per-callsite cache entry: an expected shape pointer and a field offset. Hit path is a single compare plus an indexed load. Miss path falls through to a slow helper that updates the cache.

```
; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont
```

v0.5.51 added a **content-hash shape-transition cache** for dynamic property writes. Two objects that grow the same fields in the same order hash to the same transition, so they end up sharing the same shape — and that means the read side of the PIC actually hits.

v0.5.55 peeled off the last TLS access from the transition cache. v0.5.46 fixed a PIC miss-handler bug where objects with >8 fields were reading past the inline slots into uninitialized memory (closes #55). v0.5.78 added a guard to stop PropertyGet's PIC from indexing into non-pointer receivers like raw numbers — which could happen on overly optimistic type refinement and was one of the last stability issues in the IC.

Net effect: property-heavy code — which in practice means most TypeScript — is roughly 2–3x faster than it was a week ago, just from the IC alone.

## 4\. Integers, bitwise, and the `| 0` pattern

NaN-boxing makes every number an f64. TypeScript programmers write `x | 0` to force integer semantics. V8 has spent fifteen years making that cheap. Perry spent this week catching up.

The stack of changes, in order:

-   **v0.5.48**: `sdiv` for `(int / const) | 0`. LLVM folds to `smulh + asr`, which is ~2 cycles vs ~10 for `fdiv`.
-   **v0.5.48**: `@llvm.assume` on Uint8ArrayGet bounds. Replaces the bounds-check branch+phi diamond with a single basic block the vectorizer can reason about.
-   **v0.5.49**: fix bitwise ops with NaN/Infinity to produce 0 per the ToInt32 spec. Correctness first.
-   **v0.5.50**: `toint32_fast` that skips the 5-instruction NaN/Inf guard when the value is known-finite. Plus `alwaysinline` on tiny helpers and clamp detection.
-   **v0.5.52**: target clamp functions directly with `smin`/`smax` intrinsics. Clamp is the single most common integer pattern after increment.
-   **v0.5.53**: `x | 0` and `x >>> 0` on a known-finite value become a noop — just `fptosi + sitofp`, no guard at all.
-   **v0.5.56**: i32-native bitwise ops; i32 index and value in Uint8ArrayGet/Set.
-   **v0.5.58, v0.5.60**: `Math.imul` lowers to the native i32 multiply instead of the polyfill path. Polyfill detection recognizes user-written `Math.imul` shims and replaces them.
-   **v0.5.59**: pure-function init inlining + integer-local seeding. The function-local integer analysis gets to see past call boundaries when the callee is small and pure.
-   **v0.5.37–v0.5.40**: accumulator-pattern int-arithmetic fast path. The classic `for (...) acc += f(i)` loop stays in i32 end-to-end when the types allow.

v0.5.41 is the subtle one. When the codegen sees a module-level `const K: number[][] = [[...], ...]`, it lowers the whole thing to a flat `[N x i32]` constant in `.rodata`. `K[y][x]` becomes a single `getelementptr + load i32`. Combined with the int-analysis bridge in v0.5.43, this is what gave `image_conv` (a 5×5 Gaussian blur over a 4K RGB frame) a **3x speedup in a single release**.

## 5\. Buffers and Uint8Array

Binary workloads — crypto, image processing, parsing, networking — live in Buffer and Uint8Array. v0.5.64 gave them **typed pointer slots plus `noalias` metadata**. Where a Buffer used to be a NaN-boxed double in an `alloca double`, it's now a raw `i64` pointer in an `alloca i64`, with LLVM annotations telling the optimizer “this pointer doesn't alias other pointers in scope.” That unlocks load/store reordering, vectorization, and register allocation that the optimizer would otherwise refuse to do.

v0.5.80 closed the final correctness issue here: a module-wide buffer `alias-scope` counter that was being reset per-function, which could in rare cases let LLVM reason across scopes that shouldn't share a scope ID. Now the counter is module-wide and the `noalias` story is airtight.

v0.5.53 made `Uint8ArraySet` branchless — a masked store instead of an if/else that wrote 0 on out-of-bounds. v0.5.54 added a **Two-Way indexOf** for longer patterns and an arena-allocated `split`, which together closed most of the gap on string-heavy Buffer parsing.

## 6\. Strings: ASCII is the fast path

JavaScript strings are UTF-16, but most real-world strings (keys, identifiers, HTTP headers, JSON scaffolding) are ASCII. v0.5.71 added an **O(1) `charCodeAt` and `codePointAt` for ASCII strings** — no UTF-16 scan, just a byte load. v0.5.20 already made `indexOf`, `slice`, and `charAt` bypass the UTF-16 scan on ASCII.

One correctness note inside that same release: `String.length` now returns UTF-16 code units (ECMAScript spec) instead of byte count. That was a lurking bug where `"café".length` returned 5 instead of 4.

## 7\. The servers actually stay up now

The week's least glamorous work was also the most user-visible: making long-running Node-style servers — Fastify, ws, http, net — not crash after a few minutes.

The crashes all shared a root cause: the GC didn't know about listener closures. When you write `wss.on('message', handler)`, the closure captures variables, which live as fields inside a GC-allocated cell. If the GC root scanner doesn't know to visit those cells, their captures get reclaimed and the next message event dereferences freed memory.

-   **v0.5.26**: root-scan `net.Socket` event listener closures (closes #35).
-   **v0.5.27**: extend to `ws`, `http`, `events`, `fastify`.
-   **v0.5.28**: register module-level globals as GC roots (closes #36). Lifetime bug one layer up.
-   **v0.5.21**: `gc()` safety inside Fastify/WebSocket request handlers — the explicit GC call was running while request handlers held pointers into the arena (closes #31).

Alongside the GC work, v0.5.20 shipped a **main event loop** — a real one, not a placeholder — that keeps WebSocket and timer-based servers alive instead of exiting after the last sync call returns (refs #28). This was the single most impactful fix for anyone trying to run Perry as a production HTTP server. Fastify now stays up. WebSocket servers now stay up.

v0.5.19 fixed the SysV AMD64 ABI mismatch for JSValue FFI args/returns — an issue on Linux where native FFI calls could silently corrupt arguments. v0.5.18 added native dispatch for `axios` (get/post/put/delete/patch), including `response.status` and `response.data`. v0.5.30 fixed `fastify request.header()` and `request.headers[]` dispatch, which had been returning undefined for case-insensitive lookups.

## 8\. `@perry/postgres`: the driver that made all of this necessary

A lot of this week's work was driven by one workload: getting a full Node-compatible [Postgres driver](https://github.com/PerryTS/postgres) working on Perry-native. The driver is TLS-capable, has a cross-module codec registry, supports cancel/close/notify, and now benchmarks against `pg`, `postgres.js`, and `tokio-postgres`.

The driver-side perf work paralleled the compiler-side:

-   **Hoist per-column codec** and drop per-cell Buffer copies. BigInt(string) for int8 to avoid intermediate allocations.
-   **Dynamic per-shape Row constructor** for object-form rows. If your query always returns the same columns, the driver builds a shape-specialized row constructor the first time and reuses it — which, in combination with the compiler's PIC, makes field access on rows as fast as field access on any other object.
-   **`parseTypes: 'minimal'` opt-out** for callers that want raw strings for int8/numeric/date.

This is the positive feedback loop the compiler was always meant to enable. A real driver surfaces real bottlenecks. The bottleneck gets a one-line reproducer filed as a GitHub issue. A week of compiler fixes later, the driver is faster and the compiler is faster for everyone else too. That's the whole plan, compressed into seven days.

## 9\. Correctness fixes worth naming

Performance work surfaces correctness issues the way dredging a river surfaces grocery carts. A partial list:

-   **Promise.race** was reading `.value` on rejection instead of `.reason`, so rejections were swallowed silently (v0.5.13–v0.5.14).
-   **Promise.any** now throws a proper `AggregateError` when all input promises reject. Added `Promise.withResolvers` and fixed `queueMicrotask` ordering.
-   **`[..."hello"]`** now produces a character array instead of a broken object (closes #16).
-   **BigInt arithmetic and `BigInt()` coercion** (closes #33). The i64 bigint fast path (v0.5.29) makes the common case cheap.
-   **Buffer.indexOf / Buffer.includes** with a numeric byte argument were comparing against buffer pointers instead of byte values (closes #56).
-   **Bitwise ops with NaN/Infinity** produce 0 per ToInt32 spec (closes #57).
-   **Windows x86\_64**: five platform-specific fixes — `localtime`, `clang` discovery, and a handful of codegen adjustments — got Windows x86\_64 back to green (v0.5.72).

## 10\. The numbers

The headline benchmark from the last post was `factorial` at 24.6x faster than Node. That number is unchanged. What moved this week is everything around it:

| Workload | v0.5.12 | v0.5.80 | Delta |
| --- | --- | --- | --- |
| JSON.parse (20-record schema) | 547x slower than Node | 1.3x slower than Node | ~420x |
| image\_conv (4K 5×5 blur) | 1,980ms | 457ms | 4.3x |
| Property-heavy code (PIC hit) | baseline | 2–3x | 2–3x |
| Fibonacci(40) | 401ms | 309ms | 1.3x |
| Fastify uptime under load | ~60s before crash | indefinite | ∞ |

The full 15-benchmark suite against Node is still 14 wins and 1 tie — the same table as last post, with slightly better numbers across the board. The real movement this week is on workloads that weren't in that suite: JSON, image processing, long-running servers. Those were where the gaps lived, and those are what closed.

## 11\. What's next

The one benchmark we're still chasing is `image_conv` vs Zig. Perry is at 457ms; Zig is at 246ms. That gap is architectural, not optimization-pass-level, and it lives in three places:

1.  **Typed buffer locals**. Most of the Buffer work landed this week, but buffer-typed function params and locals still unbox on every access. The `i64` slot approach we use for loop counters needs to extend to buffers.
2.  **Interior/border loop splitting**. The blur loop clamps every pixel, including the 99.9% of pixels that don't need it. Splitting into border regions (clamped) and interior (no clamp) lets LLVM vectorize the interior with NEON `ld3`/`st3`.
3.  **Double-ABI FNV-1a hash**. The hash helper is called through the NaN-box ABI. Specializing it to raw i64 in/out for hot paths is a few hours of work that will pay off across every hash-heavy workload.

Those are tracked in `PERF_ROADMAP.md`. Expect to see them in the next cycle.

## Wrapping up

The pattern of this week — 68 patch releases, almost all performance, one JSON gap going from 547x to 1.3x — is what happens when you cross over onto the good side of the LLVM-cutover hill. The optimizer is now an ally instead of a wall, and most of what's left is small, specific, measurable work: find a slow path, figure out why the optimizer can't see through it, expose the structure, measure again. None of these commits are exotic. They're just applied where they're needed.

If you want to try any of this:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

Issues, reproducers, and benchmarks that aren't fast enough: keep them coming. This pace only works because the bug reports are specific enough to turn into one-line reproducers. Every commit in this post has a `#N` attached to it for a reason.

— Ralph
