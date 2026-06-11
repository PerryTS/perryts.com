export default function Content() {
  return (
    <>
      <p>
        A few weeks ago, <a href="https://zenn.dev/aya_koto" className="text-amber-400 hover:text-amber-300">Ayasaka-Koto</a> (@axt_ayakoto on X) published <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">a benchmark of Perry against Deno and Bun</a> on AtCoder problem ABC451D, &ldquo;Concat Power of 2.&rdquo; His measurement: Perry ran <strong>3.85× slower than Bun</strong>. His conclusion was polite but firm — Perry wasn&apos;t ready to be a competitive-programming runtime, and might not be even when it matured.
      </p>
      <p>
        We owe him a follow-up. Here&apos;s where we landed on the same benchmark, with the same <code>hyperfine</code> command, on the same machine class:
      </p>
      <pre><code>{`Command                                Mean         Min      Max
Perry v0.5.875                         425.0 ± 78 ms  367 ms  745 ms
Bun 1.3.12                             430.7 ± 74 ms  376 ms  787 ms
Deno 2.7.14                            544.8 ± 140 ms 426 ms  984 ms

Perry vs Bun:   1.01× faster (statistical tie, within error)
Perry vs Deno:  1.28× faster
Perry vs aya_koto's published Perry number: 2.87× faster`}</code></pre>
      <p>
        The closing of that gap took an investigation that started with a wrong hypothesis, found a real but deliberate GC architecture trade-off, and produced a result we think is worth writing about — not because we caught up, but because the way the trade-off looked under profiling is interesting in itself.
      </p>

      <h2>The benchmark</h2>
      <p>
        aya_koto&apos;s <code>abc451d-perry.ts</code> does a recursive depth-first search over concatenations of power-of-2 strings, deduplicated through a <code>Set&lt;number&gt;</code> and sorted. The hot function is short:
      </p>
      <pre><code>{`function search(before: string, powersOfTwoStr: string[]): string[] {
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
}`}</code></pre>
      <p>
        The shape is the story. Every call allocates a fresh <code>string[]</code>. The recursion is deep — branching factor up to roughly 30 at the top — and every parent frame keeps its <code>answers</code> array live while it&apos;s iterating the child&apos;s array and pushing onto its own. Short-lived allocations, deep recursion, live references scattered across every active arena block. This turned out to be exactly the workload Perry&apos;s GC was <em>not</em> tuned against.
      </p>

      <h2>The wrong hypothesis</h2>
      <p>
        A reader had left a footnote on aya_koto&apos;s article pointing out that Perry&apos;s BigInt was internally a fixed-length 1024-bit integer, and that BigInt-heavy programs ran roughly 4× slower than Bun. ABC451D involves powers of 2 — large numbers seemed plausible — and so the first instinct was: BigInt is the culprit, fix the BigInt path, the gap closes.
      </p>
      <p>
        It wasn&apos;t. <code>grep -i bigint abc451d-perry.ts</code> returned nothing. The benchmark uses <code>number</code> throughout; every value fits comfortably under 2^53. The BigInt footnote was correct, real, and a problem worth fixing — and we did fix it, separately, in v0.5.736. But it had nothing to do with ABC451D.
      </p>
      <p>
        The cost of chasing the wrong hypothesis first was about a day. The lesson — which I&apos;d like to claim we already knew — was: profile before you commit to a theory, even when the theory comes from a credible source and matches your priors. Especially then.
      </p>

      <h2>Reproducing the bench</h2>
      <p>
        The first thing we did once we stopped chasing BigInt was reproduce aya_koto&apos;s numbers cleanly. We expected to land near his 1.219 s on Perry. We landed at <strong>2.998 s</strong> on Perry v0.5.729.
      </p>
      <p>
        That&apos;s a 2.5× regression between the version he tested and our then-current main. Deno and Bun reproduced within 50% of his numbers (different hardware, version drift). The Perry gap had grown from 3.85× to 6.59× while no one was watching.
      </p>
      <p>
        We did not bisect which commit caused the regression — it scoped out beyond this investigation. But the absence of a CI guardrail that would have caught the drift is itself a finding, and we&apos;ll come back to that at the end.
      </p>

      <h2>Profile-driven diagnosis</h2>
      <p>
        Compiled with <code>PERRY_DEBUG_SYMBOLS=1</code> and recorded with <code>samply</code>, the self-time picture was unambiguous:
      </p>
      <pre><code>{`% Self    Function
41.2%     perry_runtime::gc::try_mark_value
12.7%     perry_runtime::gc::drain_trace_worklist_inner
 9.0%     perry_runtime::gc::build_valid_pointer_set
 8.5%     perry_runtime::arena::arena_walk_objects_with_block_index
 5.6%     perry_runtime::gc::try_mark_value_or_raw
 4.2%     js_number_coerce
 3.1%     js_array_sort_with_comparator`}</code></pre>
      <p>
        <strong>76% of self time was GC machinery.</strong> Inclusive time agreed: <code>gc_collect_minor</code> at 80%, <code>Arena::alloc</code> at 76%, <code>js_array_alloc</code> at 45%, <code>js_array_push_f64</code> at 22%. The recursive <code>search()</code> was hot, but it was hot underneath the GC mark phase. Each call was triggering enough allocation to trip a collection.
      </p>
      <p>
        A negative-control microbenchmark confirmed the slowdown wasn&apos;t general. Tight integer <code>fib(80) × 100_000</code>, no allocation: Perry <strong>6.1 ms</strong> vs Bun <strong>24.7 ms</strong> — Perry 4× faster. Codegen for non-allocating hot loops was already ahead of Bun. ABC451D&apos;s gap was concentrated in one specific code path: allocation throughput plus GC mark-sweep on this particular allocation shape.
      </p>

      <h2>The smoking gun</h2>
      <p>
        We had a flag — <code>PERRY_GC_DIAG=1</code> — that printed per-cycle GC statistics. The output was the load-bearing observation of the entire investigation:
      </p>
      <pre><code>{`[gc-step] pre_in_use=67 MB  post_in_use=67 MB  sweep_freed=38 MB  block_reclaim=0  pct=57%
[gc-step] pre_in_use=100 MB post_in_use=100 MB sweep_freed=55 MB  block_reclaim=0  pct=55%
[gc-step] pre_in_use=119 MB post_in_use=119 MB sweep_freed=65 MB  block_reclaim=0  pct=55%
…
arena blocks: 61 → 84 → 100 → 116 → 131 → 145 → 157 → … → 270+`}</code></pre>
      <p>
        Every cycle, the same pattern. The sweep correctly identified that <strong>55–60% of allocated objects were dead</strong>. And the arena reclaimed <strong>zero blocks</strong>. The heap grew monotonically through the run, while the GC kept paying mark-sweep cost over an ever-larger working set.
      </p>
      <p>
        Why <code>block_reclaim=0</code> in spite of more than half the objects being dead? Because Perry&apos;s arena GC reclaims at block granularity. A 1 MB block is reset only when every object inside it is dead. In ABC451D, the recursive <code>search()</code> keeps live references — the parent frame&apos;s <code>answers</code> array — scattered across every active block. No block is ever entirely dead. The mark-sweep correctly identifies the dead objects, has no per-object reclaim path, and so does nothing with them. The heap grows, the GC triggers fire on a treadmill, and the cost of each cycle climbs as the working set climbs.
      </p>

      <h2>The deliberate trade-off</h2>
      <p>
        The most informative thing we found wasn&apos;t in the profile. It was in the sweep itself, at <code>crates/perry-runtime/src/gc.rs:2733</code>, as a comment explaining the design:
      </p>
      <blockquote className="border-l-4 border-amber-500/40 pl-4 my-6 text-slate-400 italic">
        We deliberately do NOT push dead objects onto the global ARENA_FREE_LIST. The inline bump allocator never reads the free list — it uses the per-block reset instead. Pushing dead objects to the free list would cost ~50ns per object × ~700k objects per GC × ~12 GC cycles per benchmark = 420ms of pure waste in <code>object_create</code>.
      </blockquote>
      <p>
        This is exactly correct for the workload it was tuned against. <code>object_create</code> is a benchmark we care about, where allocations die in a tight loop and entire blocks do go empty between cycles. Adding a per-object free-list pass would burn 420 ms of pointless bookkeeping for that workload, and the block-reset path captures the same memory cheaper.
      </p>
      <p>
        It&apos;s a poor fit for ABC451D&apos;s shape, where the live references stay scattered and block-reset never fires. The architecture had a deliberate trade-off encoded in it, and we&apos;d never benchmarked the case where the trade-off goes the wrong way.
      </p>
      <p>
        That&apos;s the actual lesson. The GC wasn&apos;t broken. It was tuned for a different distribution of allocation patterns than aya_koto&apos;s bench represents, and we hadn&apos;t noticed that the distribution it was tuned for excluded a class of real workloads — recursive search, tree walks, anything that holds live state at every level of the stack while doing short-lived allocation underneath.
      </p>

      <h2>Things that didn&apos;t work</h2>
      <p>
        Before we got to a real fix, several plausible-looking levers turned out to be wrong levers. Reporting these with numbers because they were the more interesting half of the investigation:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong><code>PERRY_GEN_GC_EVACUATE=1</code></strong> — Perry already had an opt-in copying-evacuation pass. Turning it on for ABC451D: <strong>11.4 seconds</strong>, four times slower than baseline. The pass runs every cycle whether useful or not, and its per-object copy plus reference-rewrite cost is catastrophic when the live set is small short-lived objects. Worth keeping for the workloads that benefit, but not the answer here.</li>
        <li><strong><code>PERRY_GEN_GC=0</code></strong> (full mark-sweep instead of generational) — 3.06 s, essentially identical to baseline. The choice of strategy isn&apos;t what&apos;s binding; the absence of per-object reclaim is.</li>
        <li><strong><code>ValidPointerSet</code> structural cleanup (commit 0fa42e0b).</strong> Merged the two separate sorted vectors (arena pointers and malloc&apos;d pointers) into one, added a min/max range prefilter, inlined <code>try_mark_value</code>&apos;s tag rejection. Halved the per-call cost of <code>contains()</code> — which was the hot inner loop the profile flagged. The ABC451D bench moved from 3.07 s to 3.21 s. A wash, within noise. The change still ships value for workloads where <code>contains()</code> actually is the binding constraint (ECS-shape benchmarks, hono compose chains), but it wasn&apos;t the binding constraint here. The absolute call volume — driven by allocation pressure feeding the mark phase — dominated even at zero per-call cost.</li>
      </ul>
      <p>
        The pattern across all three: the GC strategy and the per-call inner-loop costs were second-order. The binding constraint was the lack of a reclaim path for dead objects in blocks that don&apos;t go fully empty. Until that was addressed, nothing else moved the needle.
      </p>

      <h2>Where we landed</h2>
      <p>
        Between v0.5.737 and v0.5.875, across roughly 137 patch versions, the gap closed. We&apos;re being deliberate in writing this: we did not bisect to a single hero commit. The fix landed across a series of changes in the GC subsystem that made the deliberate &ldquo;no per-object free list&rdquo; trade-off conditional rather than permanent — when <code>block_reclaim</code> stays at zero across consecutive cycles, the sweep starts populating a size-bucketed free list and the bump allocator gains a fallback path. The exact sequencing and which patch contributed how much would require a careful bisect we owe but haven&apos;t done yet.
      </p>
      <p>
        The result, on aya_koto&apos;s exact bench and command, on Apple M-series, macOS 26.4:
      </p>
      <pre><code>{`Perry v0.5.875: 425.0 ± 78 ms  (367 – 745)
Bun 1.3.12:     430.7 ± 74 ms  (376 – 787)
Deno 2.7.14:    544.8 ± 140 ms (426 – 984)`}</code></pre>
      <p>
        Two honesty notes on this table. First, Perry&apos;s 1.01× margin over Bun is within error bars — the correct word is &ldquo;tied,&rdquo; not &ldquo;faster.&rdquo; Second, the variance on all three runtimes is meaningful (Perry&apos;s max is 745 ms against a mean of 425 ms), and any single run can land in either tail. We&apos;ve shown min and max alongside the mean for that reason; we&apos;d rather you see the spread.
      </p>

      <h2>What&apos;s still imperfect</h2>
      <p>
        A few things we&apos;re not papering over:
      </p>
      <p>
        The regression from 1.2 s to 3.0 s that happened between aya_koto&apos;s measurement and the start of this investigation tells us we didn&apos;t have a CI guardrail catching this class of slowdown. We&apos;re adding <code>abc451d-perry.ts</code> and a small surrounding suite to Perry&apos;s CI as a perf regression gate before this post goes live. If this bench silently degrades in a future release, it should fail a build, not a benchmark from a critic three months from now.
      </p>
      <p>
        The fix relaxes a deliberate trade-off in a specific direction. We&apos;re watching the <code>object_create</code> benchmark and friends — workloads the original &ldquo;no free list&rdquo; choice was protecting — to make sure the conditional free-list path doesn&apos;t regress them. Early numbers are within noise, but this is the kind of thing where confidence comes from time, not from a single benchmark run.
      </p>
      <p>
        We didn&apos;t bisect the 137-version range. We will. It matters for documentation, and it matters for understanding which of the conditional-free-list mechanisms are doing the work.
      </p>

      <h2>Credit</h2>
      <p>
        aya_koto&apos;s article was exactly the kind of writeup an open-source project needs and rarely gets. He measured carefully, published his test repo, called out specific friction in the install path, and reached the honest conclusion that Perry wasn&apos;t ready for the use case he was evaluating. That conclusion was correct when he made it. It would have stayed correct longer if he hadn&apos;t written about it.
      </p>
      <p>
        His test repo is at <a href="https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421" className="text-amber-400 hover:text-amber-300">github.com/AXT-AyaKoto/perry-ts-test-2026-0421</a>. His article is at <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">zenn.dev/aya_koto/articles/553ce04b1d5ac4</a>. Both are worth reading even after this follow-up — the article especially, because it documents an honest evaluation of an early-stage compiler from someone with no incentive to be polite.
      </p>
      <p>
        Two specific things in his article we should note. The install-path friction he flagged — that the top of perryts.com pointed at one method while the docs recommended another — has been fixed; the npm path is now the prominent option on the landing page, matching the docs. The &ldquo;things outside the limitations doc that don&apos;t compile&rdquo; frustration he flagged — we walked through every <code>.ts</code> file in his test repo against current Perry; the genuine gaps got issues filed, and the documented limitations got expanded.
      </p>
      <p>
        The BigInt footnote on his article was, as discussed above, unrelated to ABC451D but real on its own — Perry&apos;s BigInt implementation was indeed a fixed-width 1024-bit integer under the hood, and BigInt-heavy programs paid for it. That&apos;s fixed in v0.5.736, with a small-value inline path and <code>num-bigint</code> as the arbitrary-precision fallback. Credit there belongs to the reader who left the footnote on aya_koto&apos;s article; we don&apos;t know who they are, but if you&apos;re reading this: thank you.
      </p>

      <h2>Reproduction</h2>
      <p>
        If you want to reproduce these numbers yourself:
      </p>
      <pre><code>{`git clone https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421.git /tmp/aya-koto-bench
cd /tmp/aya-koto-bench

npm install -g @perryts/perry@0.5.875
perry abc451d-perry.ts -o abc451d-perry

# Sanity (should print 328 for input 69):
./abc451d-perry < abc451d-input.txt

# The article's exact command:
hyperfine --warmup 10 --runs 100 --export-markdown abc451d-bench.md \\
  './abc451d-perry < abc451d-input.txt' \\
  'deno run --quiet --allow-all abc451d-deno.ts < abc451d-input.txt' \\
  'bun run abc451d-bun.ts < abc451d-input.txt'`}</code></pre>
      <p>
        Your numbers will vary with hardware and runtime versions. If they vary in ways that look wrong, <a href="https://github.com/PerryTS/perry/issues" className="text-amber-400 hover:text-amber-300">open an issue</a> — we&apos;d rather hear about it.
      </p>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
