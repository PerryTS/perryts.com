---
title: "From Cranelift to LLVM: What Broke and How We Fixed It"
excerpt: "Perry's backend migration from Cranelift to LLVM is finished. The initial cutover made benchmarks 70x slower — this is what broke, and the six targeted optimizations that fixed it."
date: 2026-04-12
tags: ["compilers", "llvm", "cranelift", "performance", "milestone"]
---
> **Correction (September 2026):** The benchmark below called “factorial” was misnamed: it sums `i % 1000` in a loop and computes no factorial. Its 24.6x figure came from an old Node.js run that does not reproduce; on our current published harness it is a tie with Node.js (93 ms vs 95 ms). It is a microbenchmark of an integer-modulo fast path, not a measure of typical TypeScript performance. The results below are kept as a historical record. Current numbers, including the benchmarks Perry loses, are in the [Perry README](https://github.com/PerryTS/perry#performance).

Perry's backend migration from Cranelift to LLVM is finished. As of v0.5.12, LLVM is the sole code generation backend, and Perry now beats Node.js on every benchmark — by margins ranging from 1.7x to 24.6x (with two ties).

Getting here was not a straight line. The initial cutover in v0.5.0 made several benchmarks **70x slower** than the Cranelift version it replaced. This post is the long version of what happened, why we made the switch anyway, what broke, what fixed it, and what the numbers look like on the other side.

If you're building a compiler, evaluating codegen backends, or just curious why “switch to LLVM” is rarely as simple as it sounds, this is for you.

## Part 1: Why Switch at All?

Perry compiles TypeScript directly to native machine code. No Node, no V8, no Electron, no WebView. The pitch is “write TypeScript, ship a native binary,” and the entire value proposition collapses if that binary isn't actually fast.

For Perry's first several minor versions, the codegen backend was [Cranelift](https://cranelift.dev/). Cranelift is excellent — it's the codegen behind wasmtime, it's used by SpiderMonkey's baseline JIT, and it's the tool of choice when you need fast, predictable compilation with a clean embedding story. For a project bootstrapping a new language, it was the right starting point.

But two things eventually pushed us off it.

### 1\. The optimizer ceiling

Cranelift is intentionally a fast, single-tier optimizing compiler. Its mandate is “produce decent code quickly,” not “produce the best possible code given unlimited time.” That's the right tradeoff for a JIT. It's the wrong tradeoff for an AOT compiler whose entire selling point is native performance.

LLVM has had over two decades of work poured into its middle-end. Loop vectorization, LICM, GVN, SCCP, instruction combining, inlining heuristics, fast-math reassociation, alias analysis — there is no realistic universe in which a smaller project catches up. If Perry is going to claim “faster than Node,” we need that machinery.

### 2\. The arm64\_32 problem

The immediate forcing function was Apple Watch. `arm64_32` is an ABI Apple introduced for the Series 4 onward — 64-bit instructions, 32-bit pointers. Cranelift doesn't support it, and there was no realistic path to it landing. For Perry to credibly claim “9 platforms from one codebase,” watchOS could not be missing. LLVM supports `arm64_32` out of the box.

Once we accepted that *some* targets would require LLVM, maintaining two backends became untenable. Two backends means two sets of bugs, two sets of optimization passes, two test matrices, two performance baselines. The honest answer was: pick one.

We picked LLVM.

## Part 2: A Word on Cranelift

Before going further: this post is not a Cranelift teardown. Cranelift is a brilliant piece of engineering, and if you're building a JIT, a sandboxed runtime, or anything where compile latency matters more than peak throughput, it should be near the top of your list. wasmtime ships it for good reason. The Bytecode Alliance has been doing exemplary work.

Perry's needs are just different. We compile ahead of time, we ship the binary once, and the user runs it millions of times. That asymmetry — compile rarely, execute always — is exactly the regime where LLVM's heavier optimizer pays for itself. Different tool for a different job.

## Part 3: The Cutover Disaster

v0.5.0 was the first release with LLVM as the sole backend. We expected a small regression in compile time and a meaningful improvement in runtime performance. We got the opposite of the second one.

Here's the table I did not want to post at the time:

| Benchmark | Cranelift | LLVM v0.5.0 | Delta |
| --- | --- | --- | --- |
| method\_calls | 16ms | 1,084ms | 68x slower |
| object\_create | 5ms | 318ms | 64x slower |
| matrix\_multiply | 61ms | 184ms | 3x slower |
| math\_intensive | 370ms | 131ms | 2.8x faster |
| nested\_loops | 32ms | 57ms | 1.8x slower |
| fibonacci(40) | 505ms | 1,156ms | 2.3x slower |

Some workloads got faster. Most got dramatically worse. `method_calls` — one of the most important benchmarks because it represents idiomatic TypeScript class usage — was nearly 70x worse than what we shipped two releases prior.

### What actually went wrong

Perry uses **NaN-boxing** for value representation. Every TypeScript value is a 64-bit word. f64 numbers are stored directly; everything else (objects, strings, booleans, undefined, null) is encoded into the unused bits of an IEEE 754 quiet NaN.

The advantage: numbers are zero-cost. No boxing, no tagging, no allocation for arithmetic.

The disadvantage: every operation on a non-number value requires bit manipulation to unpack, operate, and repack. If those sequences live as inline IR in your codegen, the optimizer can fuse and simplify them. If they live as **calls into runtime helper functions**, the optimizer sees an opaque call and gives up.

Our Cranelift backend had grown a large number of inline lowerings for hot operations — property loads, method dispatch, object allocation, integer arithmetic on f64-tagged values. The LLVM cutover, in the interest of getting *correct* code out the door first, routed almost all of those through runtime helpers in `perry-runtime`. Each helper was a `call` instruction in LLVM IR.

LLVM is excellent, but it cannot inline a function whose body it has never seen. `perry-runtime` is compiled separately, linked in at the end, and from the optimizer's perspective every helper call is a black box. The result was that hot loops which the Cranelift backend had been compiling to ~5 instructions of inline arithmetic were now compiling to function calls — register saves, stack frame setup, the works — repeated millions of times.

That's where the 70x came from. Not bad codegen. Bad **inlining boundaries**.

## Part 4: The Fix

The work to recover and surpass the Cranelift numbers fell into roughly six categories. None of them are exotic. Most are textbook compiler optimizations that just had to be applied in the right places.

### 1\. Inline bump allocator for object allocation

`object_create` was the worst regression after `method_calls`. The old path called `js_object_alloc_class_with_keys` for every `new Point()` — a function call, a thread-local arena access, a shape-cache lookup, and a write of the GC header + object header.

The fix: emit the bump allocation **inline** in LLVM IR. Each function that allocates objects gets a cached pointer to a thread-local `InlineArenaState` struct. Allocation becomes:

```
; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr           ; current bump offset
%new_off = add i64 %offset, 96              ; GcHeader(8) + ObjectHeader(24) + 8 fields(64)
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr            ; current block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow
fast:
  store i64 %new_off, ptr %off_ptr          ; bump the offset
  %data = load ptr, ptr %state              ; data pointer at offset 0
  %raw  = getelementptr i8, ptr %data, i64 %offset
  store i64 <packed_gc_header>, ptr %raw    ; GcHeader as one i64
slow:
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)
```

The fast path is ~13 instructions of inline IR that LLVM can see, schedule around, and hoist out of loops. `object_create` went from 318ms to 9ms.

### 2\. i32 loop counters

NaN-boxing means every TypeScript number is f64. That includes loop counters. A `for (let i = 0; i < 100_000_000; i++)` loop with f64 induction variables is a disaster: f64 increment, f64 compare, f64-to-i64 conversion every time you index an array.

The codegen detects for-loops where the induction variable is provably integer-valued and allocates a **parallel i32 stack slot**. The loop condition switches from `fcmp` to `icmp slt i32`, eliminating the f64 counter entirely.

This moved `array_write` from 11ms to 3ms, `nested_loops` from 18ms to 9ms, and `array_read` from 11ms to 4ms.

### 3\. Fast-math flags

We attach `reassoc contract` flags to every f64 arithmetic instruction. `reassoc` lets LLVM break serial accumulator chains into parallel ones, and `contract` allows fused multiply-add. We keep `nnan` and `ninf` off because Perry uses NaN bits as value tags.

With those flags, LLVM's loop vectorizer kicks in on `math_intensive`, which dropped from 131ms to 14ms — beating Node by 3.5x.

### 4\. Integer-modulo fast path

`%` on f64 in JavaScript is `fmod`, which is a libm call on ARM. But for integer-valued f64 operands, we can do `fptosi → srem → sitofp` and skip the libm round-trip entirely. The codegen uses static analysis to detect integer-valued operands — no runtime check needed.

This is the entire reason `factorial` went from 1,553ms to 24ms — and from Node's 591ms to 24ms. **24.6x faster than Node.**

### 5\. LICM for nested loops

LLVM does loop-invariant code motion out of the box, but NaN-boxing hides the structure. `arr.length` lowers to a load through a NaN-boxed pointer with a tag check — not obviously invariant.

The codegen detects the `for (...; i < arr.length; ...)` pattern and pre-loads the length into a stack slot before the loop, with a static walker verifying the loop body can't change the array's length. When the counter is bounded by this hoisted length, IndexGet/IndexSet skip bounds checks entirely.

### 6\. Shape-cached objects

When the codegen knows the class of an object, it resolves field offsets at compile time and emits **direct indexed loads** — no runtime dispatch. For method dispatch, `obj.method(args)` becomes a direct `call @perry_method_Class_name(this, args)` — no vtable, no inline cache, no hash lookup.

The LLVM cutover had regressed this to the universal slow path. Restoring static dispatch gave us the `method_calls` recovery — from 1,084ms back down to 1ms. **11x faster than Node.**

## Part 5: The Numbers Today

Median of three runs, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:

| Benchmark | Perry | Node.js | vs Node |
| --- | --- | --- | --- |
| factorial | 24ms | 591ms | 24.6x |
| method\_calls | 1ms | 11ms | 11x |
| loop\_overhead | 12ms | 53ms | 4.4x |
| math\_intensive | 14ms | 49ms | 3.5x |
| array\_read | 4ms | 13ms | 3.2x |
| closure | 97ms | 303ms | 3.1x |
| array\_write | 3ms | 8ms | 2.6x |
| string\_concat | 1ms | 2ms | 2x |
| nested\_loops | 9ms | 16ms | 1.7x |
| prime\_sieve | 4ms | 7ms | 1.7x |
| matrix\_multiply | 21ms | 34ms | 1.6x |
| fibonacci(40) | 401ms | 991ms | 2.5x |
| binary\_trees | 9ms | 9ms | tied |
| mandelbrot | 24ms | 24ms | tied |
| object\_create | 9ms | 8ms | 0.9x |

Every benchmark is a win or a tie. The closest is `object_create` (9ms vs 8ms), where V8's allocator is genuinely excellent.

## Part 6: The Compile-Time Question

The number-one reason people pick Cranelift over LLVM is compile speed. So let's talk about it.

LLVM increased Perry's per-file compile time by **20-50ms**, or roughly **8-19%**. Not 5x. Not 2x. Single-digit-to-low-double-digit percent.

The reason is that codegen is not the bottleneck in Perry's pipeline. The breakdown for a typical file:

-   SWC parsing: ~30%
-   HIR lowering (AST → IR, type inference): ~25%
-   IR transform passes (closure conversion, async lowering, inlining): ~15%
-   **Codegen (LLVM IR text emission + `clang -c -O3`): ~20%**
-   Linking (`cc` + runtime library): ~10%

Codegen is one slice of five. Even doubling that slice only moves the total by 5-10%. If you're building an AOT compiler where the user types `perry compile` once and then runs the binary forever, the calculus is: spend 25ms more at compile time, save up to 24x at every single execution.

## Part 7: What I'd Do Differently

If I were starting Perry today and could skip straight to LLVM, I would not. The Cranelift phase was genuinely valuable. It let us iterate on the frontend without LLVM's complexity tax, it gave us a working baseline to compare against, and it forced us to keep our HIR clean enough to be portable across backends.

What I would do differently is the cutover itself. We shipped v0.5.0 with most operations going through runtime helper calls, intending to inline them later. That was wrong. The right order would have been: identify the hot paths first, lower them inline before the cutover, and only release once the LLVM backend was at least at parity.

The lesson is the boring one: optimization boundaries matter more than optimizer quality. LLVM is a remarkable piece of software, but it cannot help you with code it cannot see. If your codegen routes everything through opaque runtime calls, you have built a wall between your source program and every optimization pass that exists.

## Wrapping Up

Perry is now LLVM-only, faster than Node on every benchmark, and shipping. The migration took longer than I planned, hurt more than I expected in the middle, and is unambiguously the right call in retrospect. Cranelift got us to v0.5; LLVM is taking us the rest of the way.

If you want to try Perry:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Run the benchmarks yourself: `cd benchmarks/suite && ./run_benchmarks.sh`

If you have questions, find bugs, or want to argue about codegen backends, the GitHub issues are open. I read them all.

— Ralph
