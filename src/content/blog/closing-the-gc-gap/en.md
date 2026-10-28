---
title: "What aya_koto's Benchmark Taught Us About Perry's GC"
excerpt: "A reader benchmarked Perry on AtCoder ABC451D and measured it 3.85× slower than Bun. A silent regression had widened the gap to 6.59× since. The fix wasn't where we expected, the deliberate GC trade-off it exposed was real, and Perry v0.5.875 now ties Bun on the same bench: 425 ms vs 431 ms."
date: 2026-05-12
tags: ["GC", "performance", "benchmarks", "community"]
---
A few weeks ago, [Ayasaka-Koto](https://zenn.dev/aya_koto) (@axt\_ayakoto on X) published [a benchmark of Perry against Deno and Bun](https://zenn.dev/aya_koto/articles/553ce04b1d5ac4) on AtCoder problem ABC451D, “Concat Power of 2.” His measurement: Perry ran **3.85× slower than Bun**. His conclusion was polite but firm — Perry wasn't ready to be a competitive-programming runtime, and might not be even when it matured.

We owe him a follow-up. Here's where we landed on the same benchmark, with the same `hyperfine` command, on the same machine class:

```
Command                                Mean         Min      Max
Perry v0.5.875                         425.0 ± 78 ms  367 ms  745 ms
Bun 1.3.12                             430.7 ± 74 ms  376 ms  787 ms
Deno 2.7.14                            544.8 ± 140 ms 426 ms  984 ms

Perry vs Bun:   1.01× faster (statistical tie, within error)
Perry vs Deno:  1.28× faster
Perry vs aya_koto's published Perry number: 2.87× faster
```

The closing of that gap took an investigation that started with a wrong hypothesis, found a real but deliberate GC architecture trade-off, and produced a result we think is worth writing about — not because we caught up, but because the way the trade-off looked under profiling is interesting in itself.

## The benchmark

aya\_koto's `abc451d-perry.ts` does a recursive depth-first search over concatenations of power-of-2 strings, deduplicated through a `Set<number>` and sorted. The hot function is short:

```
function search(before: string, powersOfTwoStr: string[]): string[] {
    const answers: string[] = [];
    if (before.length > 0) answers.push(before);
    const remainDigits = 9 - before.length;
    for (let i = 0; i < powersOfTwoStr.length; i++) {
        const after = powersOfTwoStr[i];
        if (after.length > remainDigits) break;
        const child = search(before + after, powersOfTwoStr);
        for (let j = 0; j < child.length; j++) answers.push(child[j]);
    }
    return answers;
}
```

The shape is the story. Every call allocates a fresh `string[]`. The recursion is deep — branching factor up to roughly 30 at the top — and every parent frame keeps its `answers` array live while it's iterating the child's array and pushing onto its own. Short-lived allocations, deep recursion, live references scattered across every active arena block. This turned out to be exactly the workload Perry's GC was *not* tuned against.

## The wrong hypothesis

A reader had left a footnote on aya\_koto's article pointing out that Perry's BigInt was internally a fixed-length 1024-bit integer, and that BigInt-heavy programs ran roughly 4× slower than Bun. ABC451D involves powers of 2 — large numbers seemed plausible — and so the first instinct was: BigInt is the culprit, fix the BigInt path, the gap closes.

It wasn't. `grep -i bigint abc451d-perry.ts` returned nothing. The benchmark uses `number` throughout; every value fits comfortably under 2^53. The BigInt footnote was correct, real, and a problem worth fixing — and we did fix it, separately, in v0.5.736. But it had nothing to do with ABC451D.

The cost of chasing the wrong hypothesis first was about a day. The lesson — which I'd like to claim we already knew — was: profile before you commit to a theory, even when the theory comes from a credible source and matches your priors. Especially then.

## Reproducing the bench

The first thing we did once we stopped chasing BigInt was reproduce aya\_koto's numbers cleanly. We expected to land near his 1.219 s on Perry. We landed at **2.998 s** on Perry v0.5.729.

That's a 2.5× regression between the version he tested and our then-current main. Deno and Bun reproduced within 50% of his numbers (different hardware, version drift). The Perry gap had grown from 3.85× to 6.59× while no one was watching.

We did not bisect which commit caused the regression — it scoped out beyond this investigation. But the absence of a CI guardrail that would have caught the drift is itself a finding, and we'll come back to that at the end.

## Profile-driven diagnosis

Compiled with `PERRY_DEBUG_SYMBOLS=1` and recorded with `samply`, the self-time picture was unambiguous:

```
% Self    Function
41.2%     perry_runtime::gc::try_mark_value
12.7%     perry_runtime::gc::drain_trace_worklist_inner
 9.0%     perry_runtime::gc::build_valid_pointer_set
 8.5%     perry_runtime::arena::arena_walk_objects_with_block_index
 5.6%     perry_runtime::gc::try_mark_value_or_raw
 4.2%     js_number_coerce
 3.1%     js_array_sort_with_comparator
```

**76% of self time was GC machinery.** Inclusive time agreed: `gc_collect_minor` at 80%, `Arena::alloc` at 76%, `js_array_alloc` at 45%, `js_array_push_f64` at 22%. The recursive `search()` was hot, but it was hot underneath the GC mark phase. Each call was triggering enough allocation to trip a collection.

A negative-control microbenchmark confirmed the slowdown wasn't general. Tight integer `fib(80) × 100_000`, no allocation: Perry **6.1 ms** vs Bun **24.7 ms** — Perry 4× faster. Codegen for non-allocating hot loops was already ahead of Bun. ABC451D's gap was concentrated in one specific code path: allocation throughput plus GC mark-sweep on this particular allocation shape.

## The smoking gun

We had a flag — `PERRY_GC_DIAG=1` — that printed per-cycle GC statistics. The output was the load-bearing observation of the entire investigation:

```
[gc-step] pre_in_use=67 MB  post_in_use=67 MB  sweep_freed=38 MB  block_reclaim=0  pct=57%
[gc-step] pre_in_use=100 MB post_in_use=100 MB sweep_freed=55 MB  block_reclaim=0  pct=55%
[gc-step] pre_in_use=119 MB post_in_use=119 MB sweep_freed=65 MB  block_reclaim=0  pct=55%
…
arena blocks: 61 → 84 → 100 → 116 → 131 → 145 → 157 → … → 270+
```

Every cycle, the same pattern. The sweep correctly identified that **55–60% of allocated objects were dead**. And the arena reclaimed **zero blocks**. The heap grew monotonically through the run, while the GC kept paying mark-sweep cost over an ever-larger working set.

Why `block_reclaim=0` in spite of more than half the objects being dead? Because Perry's arena GC reclaims at block granularity. A 1 MB block is reset only when every object inside it is dead. In ABC451D, the recursive `search()` keeps live references — the parent frame's `answers` array — scattered across every active block. No block is ever entirely dead. The mark-sweep correctly identifies the dead objects, has no per-object reclaim path, and so does nothing with them. The heap grows, the GC triggers fire on a treadmill, and the cost of each cycle climbs as the working set climbs.

## The deliberate trade-off

The most informative thing we found wasn't in the profile. It was in the sweep itself, at `crates/perry-runtime/src/gc.rs:2733`, as a comment explaining the design:

> We deliberately do NOT push dead objects onto the global ARENA\_FREE\_LIST. The inline bump allocator never reads the free list — it uses the per-block reset instead. Pushing dead objects to the free list would cost ~50ns per object × ~700k objects per GC × ~12 GC cycles per benchmark = 420ms of pure waste in `object_create`.

This is exactly correct for the workload it was tuned against. `object_create` is a benchmark we care about, where allocations die in a tight loop and entire blocks do go empty between cycles. Adding a per-object free-list pass would burn 420 ms of pointless bookkeeping for that workload, and the block-reset path captures the same memory cheaper.

It's a poor fit for ABC451D's shape, where the live references stay scattered and block-reset never fires. The architecture had a deliberate trade-off encoded in it, and we'd never benchmarked the case where the trade-off goes the wrong way.

That's the actual lesson. The GC wasn't broken. It was tuned for a different distribution of allocation patterns than aya\_koto's bench represents, and we hadn't noticed that the distribution it was tuned for excluded a class of real workloads — recursive search, tree walks, anything that holds live state at every level of the stack while doing short-lived allocation underneath.

## Things that didn't work

Before we got to a real fix, several plausible-looking levers turned out to be wrong levers. Reporting these with numbers because they were the more interesting half of the investigation:

-   **`PERRY_GEN_GC_EVACUATE=1`** — Perry already had an opt-in copying-evacuation pass. Turning it on for ABC451D: **11.4 seconds**, four times slower than baseline. The pass runs every cycle whether useful or not, and its per-object copy plus reference-rewrite cost is catastrophic when the live set is small short-lived objects. Worth keeping for the workloads that benefit, but not the answer here.
-   **`PERRY_GEN_GC=0`** (full mark-sweep instead of generational) — 3.06 s, essentially identical to baseline. The choice of strategy isn't what's binding; the absence of per-object reclaim is.
-   **`ValidPointerSet` structural cleanup (commit 0fa42e0b).** Merged the two separate sorted vectors (arena pointers and malloc'd pointers) into one, added a min/max range prefilter, inlined `try_mark_value`'s tag rejection. Halved the per-call cost of `contains()` — which was the hot inner loop the profile flagged. The ABC451D bench moved from 3.07 s to 3.21 s. A wash, within noise. The change still ships value for workloads where `contains()` actually is the binding constraint (ECS-shape benchmarks, hono compose chains), but it wasn't the binding constraint here. The absolute call volume — driven by allocation pressure feeding the mark phase — dominated even at zero per-call cost.

The pattern across all three: the GC strategy and the per-call inner-loop costs were second-order. The binding constraint was the lack of a reclaim path for dead objects in blocks that don't go fully empty. Until that was addressed, nothing else moved the needle.

## Where we landed

Between v0.5.737 and v0.5.875, across roughly 137 patch versions, the gap closed. We're being deliberate in writing this: we did not bisect to a single hero commit. The fix landed across a series of changes in the GC subsystem that made the deliberate “no per-object free list” trade-off conditional rather than permanent — when `block_reclaim` stays at zero across consecutive cycles, the sweep starts populating a size-bucketed free list and the bump allocator gains a fallback path. The exact sequencing and which patch contributed how much would require a careful bisect we owe but haven't done yet.

The result, on aya\_koto's exact bench and command, on Apple M-series, macOS 26.4:

```
Perry v0.5.875: 425.0 ± 78 ms  (367 – 745)
Bun 1.3.12:     430.7 ± 74 ms  (376 – 787)
Deno 2.7.14:    544.8 ± 140 ms (426 – 984)
```

Two honesty notes on this table. First, Perry's 1.01× margin over Bun is within error bars — the correct word is “tied,” not “faster.” Second, the variance on all three runtimes is meaningful (Perry's max is 745 ms against a mean of 425 ms), and any single run can land in either tail. We've shown min and max alongside the mean for that reason; we'd rather you see the spread.

## What's still imperfect

A few things we're not papering over:

The regression from 1.2 s to 3.0 s that happened between aya\_koto's measurement and the start of this investigation tells us we didn't have a CI guardrail catching this class of slowdown. We're adding `abc451d-perry.ts` and a small surrounding suite to Perry's CI as a perf regression gate before this post goes live. If this bench silently degrades in a future release, it should fail a build, not a benchmark from a critic three months from now.

The fix relaxes a deliberate trade-off in a specific direction. We're watching the `object_create` benchmark and friends — workloads the original “no free list” choice was protecting — to make sure the conditional free-list path doesn't regress them. Early numbers are within noise, but this is the kind of thing where confidence comes from time, not from a single benchmark run.

We didn't bisect the 137-version range. We will. It matters for documentation, and it matters for understanding which of the conditional-free-list mechanisms are doing the work.

## Credit

aya\_koto's article was exactly the kind of writeup an open-source project needs and rarely gets. He measured carefully, published his test repo, called out specific friction in the install path, and reached the honest conclusion that Perry wasn't ready for the use case he was evaluating. That conclusion was correct when he made it. It would have stayed correct longer if he hadn't written about it.

His test repo is at [github.com/AXT-AyaKoto/perry-ts-test-2026-0421](https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421). His article is at [zenn.dev/aya\_koto/articles/553ce04b1d5ac4](https://zenn.dev/aya_koto/articles/553ce04b1d5ac4). Both are worth reading even after this follow-up — the article especially, because it documents an honest evaluation of an early-stage compiler from someone with no incentive to be polite.

Two specific things in his article we should note. The install-path friction he flagged — that the top of perryts.com pointed at one method while the docs recommended another — has been fixed; the npm path is now the prominent option on the landing page, matching the docs. The “things outside the limitations doc that don't compile” frustration he flagged — we walked through every `.ts` file in his test repo against current Perry; the genuine gaps got issues filed, and the documented limitations got expanded.

The BigInt footnote on his article was, as discussed above, unrelated to ABC451D but real on its own — Perry's BigInt implementation was indeed a fixed-width 1024-bit integer under the hood, and BigInt-heavy programs paid for it. That's fixed in v0.5.736, with a small-value inline path and `num-bigint` as the arbitrary-precision fallback. Credit there belongs to the reader who left the footnote on aya\_koto's article; we don't know who they are, but if you're reading this: thank you.

## Reproduction

If you want to reproduce these numbers yourself:

```
git clone https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421.git /tmp/aya-koto-bench
cd /tmp/aya-koto-bench

npm install -g @perryts/perry@0.5.875
perry abc451d-perry.ts -o abc451d-perry

# Sanity (should print 328 for input 69):
./abc451d-perry < abc451d-input.txt

# The article's exact command:
hyperfine --warmup 10 --runs 100 --export-markdown abc451d-bench.md \
  './abc451d-perry < abc451d-input.txt' \
  'deno run --quiet --allow-all abc451d-deno.ts < abc451d-input.txt' \
  'bun run abc451d-bun.ts < abc451d-input.txt'
```

Your numbers will vary with hardware and runtime versions. If they vary in ways that look wrong, [open an issue](https://github.com/PerryTS/perry/issues) — we'd rather hear about it.

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues)

— Ralph
