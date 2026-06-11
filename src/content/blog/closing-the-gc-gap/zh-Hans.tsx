export default function Content() {
  return (
    <>
      <p>
        几周前，<a href="https://zenn.dev/aya_koto" className="text-amber-400 hover:text-amber-300">Ayasaka-Koto</a>（X 上的 @axt_ayakoto）发布了<a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">一篇在 AtCoder 题目 ABC451D &ldquo;Concat Power of 2&rdquo; 上对 Perry、Deno 和 Bun 的基准测试</a>。他的测量结果是：Perry 比 Bun <strong>慢 3.85 倍</strong>。他的结论礼貌但坚定 — Perry 还没准备好成为一个竞技编程运行时，甚至在成熟之后也未必能胜任。
      </p>
      <p>
        我们欠他一篇后续。下面是我们在同一基准、同样的 <code>hyperfine</code> 命令、同一档次机器上落到的结果：
      </p>
      <pre><code>{`Command                                Mean         Min      Max
Perry v0.5.875                         425.0 ± 78 ms  367 ms  745 ms
Bun 1.3.12                             430.7 ± 74 ms  376 ms  787 ms
Deno 2.7.14                            544.8 ± 140 ms 426 ms  984 ms

Perry vs Bun:   1.01× faster (statistical tie, within error)
Perry vs Deno:  1.28× faster
Perry vs aya_koto's published Perry number: 2.87× faster`}</code></pre>
      <p>
        填平这道差距的过程，始于一个错误的假设，找到了一个真实但有意为之的 GC 架构取舍，并产出了一个我们觉得值得写下来的结果 — 不是因为我们追上了，而是因为这个取舍在 profiling 下呈现出来的样子本身就很有意思。
      </p>

      <h2>基准</h2>
      <p>
        aya_koto 的 <code>abc451d-perry.ts</code> 对若干 2 的幂字符串的拼接做递归深度优先搜索，通过一个 <code>Set&lt;number&gt;</code> 去重并排序。热点函数很短：
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
        形态本身就是故事所在。每次调用都分配一个全新的 <code>string[]</code>。递归很深 — 顶部分支因子大约高达 30 — 而每个父帧在遍历子数组并往自己数组里 push 的同时，都让自己的 <code>answers</code> 数组保持存活。短命分配、深度递归、散落在每个活跃 arena 块上的存活引用。这恰好是 Perry 的 GC <em>没有</em>针对调优过的工作负载。
      </p>

      <h2>错误的假设</h2>
      <p>
        有位读者在 aya_koto 的文章下留了条脚注，指出 Perry 的 BigInt 内部是一个定长的 1024 位整数，而 BigInt 密集的程序运行起来大约比 Bun 慢 4 倍。ABC451D 涉及 2 的幂 — 大数字看起来合理 — 于是第一直觉是：BigInt 是元凶，修好 BigInt 路径，差距就会收窄。
      </p>
      <p>
        并非如此。<code>grep -i bigint abc451d-perry.ts</code> 什么都没返回。这个基准自始至终用的是 <code>number</code>；每个值都稳稳落在 2^53 以下。BigInt 脚注是正确的、真实的、也确实值得一修 — 我们也确实修了它，单独地，在 v0.5.736。但它和 ABC451D 毫无关系。
      </p>
      <p>
        先追逐错误假设的代价大约是一天。教训 — 我倒想声称我们早就懂 — 是：在你押注一个理论之前先做 profile，哪怕这个理论来自可信的来源并且契合你的先验。尤其是在这种时候。
      </p>

      <h2>复现基准</h2>
      <p>
        一旦我们不再追逐 BigInt，做的第一件事就是干净地复现 aya_koto 的数字。我们本以为会落在他 Perry 的 1.219 s 附近。结果在 Perry v0.5.729 上落到了 <strong>2.998 s</strong>。
      </p>
      <p>
        那是他测试的版本与我们当时主线之间 2.5 倍的回归。Deno 和 Bun 复现在他数字的 50% 误差内（不同硬件、版本漂移）。在没人盯着的时候，Perry 的差距已经从 3.85 倍涨到了 6.59 倍。
      </p>
      <p>
        我们没有去二分定位是哪个 commit 造成了回归 — 它超出了本次调查的范围。但缺少一个本能抓住这次漂移的 CI 护栏，这件事本身就是一个发现，我们会在结尾再回到这一点。
      </p>

      <h2>由 profile 驱动的诊断</h2>
      <p>
        用 <code>PERRY_DEBUG_SYMBOLS=1</code> 编译、用 <code>samply</code> 记录后，self-time 图景毫不含糊：
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
        <strong>76% 的 self time 是 GC 机制。</strong> inclusive time 也一致：<code>gc_collect_minor</code> 占 80%，<code>Arena::alloc</code> 占 76%，<code>js_array_alloc</code> 占 45%，<code>js_array_push_f64</code> 占 22%。递归的 <code>search()</code> 是热点，但它热在 GC mark 阶段之下。每次调用都触发了足够的分配来触发一次回收。
      </p>
      <p>
        一个反向对照微基准确认了这次变慢并非普遍现象。紧凑的整数 <code>fib(80) × 100_000</code>，无分配：Perry <strong>6.1 ms</strong> vs Bun <strong>24.7 ms</strong> — Perry 快 4 倍。对于不分配的热循环，codegen 已经领先 Bun。ABC451D 的差距集中在一条特定代码路径：在这种特定分配形态上的分配吞吐量加上 GC mark-sweep。
      </p>

      <h2>确凿的证据</h2>
      <p>
        我们有一个标志 — <code>PERRY_GC_DIAG=1</code> — 它会打印每轮 GC 统计。这份输出是整场调查里承重的观察：
      </p>
      <pre><code>{`[gc-step] pre_in_use=67 MB  post_in_use=67 MB  sweep_freed=38 MB  block_reclaim=0  pct=57%
[gc-step] pre_in_use=100 MB post_in_use=100 MB sweep_freed=55 MB  block_reclaim=0  pct=55%
[gc-step] pre_in_use=119 MB post_in_use=119 MB sweep_freed=65 MB  block_reclaim=0  pct=55%
…
arena blocks: 61 → 84 → 100 → 116 → 131 → 145 → 157 → … → 270+`}</code></pre>
      <p>
        每一轮都是同样的模式。sweep 正确地识别出 <strong>55–60% 的已分配对象是死的</strong>。而 arena 回收了 <strong>零个块</strong>。整个运行期间堆单调增长，而 GC 在一个越来越大的工作集上持续支付 mark-sweep 的代价。
      </p>
      <p>
        为什么在超过一半对象都已死的情况下 <code>block_reclaim=0</code>？因为 Perry 的 arena GC 以块为粒度回收。一个 1 MB 的块只有在其内部每个对象都死了才会被重置。在 ABC451D 中，递归的 <code>search()</code> 让存活引用 — 父帧的 <code>answers</code> 数组 — 散落在每个活跃块上。没有一个块会完全死掉。mark-sweep 正确识别了死对象，却没有逐对象回收的路径，于是对它们什么也不做。堆增长，GC 触发器在跑步机上空转，每轮的代价随着工作集攀升而攀升。
      </p>

      <h2>有意为之的取舍</h2>
      <p>
        我们找到的最具信息量的东西不在 profile 里。它在 sweep 自身，在 <code>crates/perry-runtime/src/gc.rs:2733</code>，作为一条解释设计的注释：
      </p>
      <blockquote className="border-l-4 border-amber-500/40 pl-4 my-6 text-slate-400 italic">
        我们有意不把死对象推到全局 ARENA_FREE_LIST 上。内联 bump 分配器从不读取空闲列表 — 它用的是逐块重置。把死对象推到空闲列表会在 <code>object_create</code> 中花费 ~50ns/对象 × ~700k 对象/GC × ~12 GC 轮/基准 = 420ms 的纯粹浪费。
      </blockquote>
      <p>
        对于它所调优的工作负载，这完全正确。<code>object_create</code> 是我们在意的一个基准，那里的分配在紧凑循环中死亡，整个块在两轮之间确实会变空。为那种工作负载加一遍逐对象的空闲列表处理，会烧掉 420 ms 毫无意义的簿记，而逐块重置路径以更便宜的方式捕获了同样的内存。
      </p>
      <p>
        它不适合 ABC451D 的形态，那里存活引用一直散落、逐块重置永不触发。架构里编码了一个有意为之的取舍，而我们从未对取舍走向错误一侧的情形做过基准。
      </p>
      <p>
        这才是真正的教训。GC 没有坏。它是针对一个不同于 aya_koto 基准所代表的分配模式分布做调优的，而我们没有注意到它调优所针对的那个分布把一类真实工作负载排除在外了 — 递归搜索、树遍历，任何在栈的每一层都持有存活状态、同时在其下做短命分配的东西。
      </p>

      <h2>没奏效的尝试</h2>
      <p>
        在我们做出真正的修复之前，几个看起来合理的杠杆结果都是错的杠杆。把它们连同数字一起报告，因为它们是这场调查里更有意思的那一半：
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong><code>PERRY_GEN_GC_EVACUATE=1</code></strong> — Perry 早已有一个可选的复制-疏散 pass。在 ABC451D 上把它打开：<strong>11.4 秒</strong>，比基线慢四倍。无论有没有用，这个 pass 每轮都跑，而当存活集是短命的小对象时，它逐对象拷贝加引用重写的代价是灾难性的。对于受益的工作负载值得保留，但不是这里的答案。</li>
        <li><strong><code>PERRY_GEN_GC=0</code></strong>（用完整 mark-sweep 代替分代）— 3.06 s，本质上和基线一样。起约束作用的不是策略的选择；而是缺少逐对象回收。</li>
        <li><strong><code>ValidPointerSet</code> 的结构清理（commit 0fa42e0b）。</strong> 把两个分离的有序向量（arena 指针和 malloc 的指针）合并成一个，加了一个 min/max 范围预过滤，内联了 <code>try_mark_value</code> 的 tag 拒绝。把 <code>contains()</code> 的每次调用代价砍半 — 它正是 profile 标记的热点内循环。ABC451D 基准从 3.07 s 动到 3.21 s。在噪声内，等于没变。这项改动对于 <code>contains()</code> 确实是约束瓶颈的工作负载（ECS 形态的基准、hono compose 链）仍然有价值，但它不是这里的约束瓶颈。绝对调用量 — 由喂给 mark 阶段的分配压力驱动 — 即便在每次调用零代价时也占主导。</li>
      </ul>
      <p>
        三者的共同模式：GC 策略和每次调用的内循环代价都是二阶的。约束瓶颈在于：对于那些不会完全变空的块中的死对象，缺少一条回收路径。在解决它之前，别的什么都拨不动指针。
      </p>

      <h2>我们落到的位置</h2>
      <p>
        在 v0.5.737 到 v0.5.875 之间，跨越大约 137 个补丁版本，差距被填平了。我们在写这段时刻意求实：我们没有二分定位到单个英雄 commit。这个修复落在 GC 子系统的一系列改动里，把有意为之的&ldquo;无逐对象空闲列表&rdquo;取舍从永久变为有条件 — 当 <code>block_reclaim</code> 在连续若干轮里一直为零时，sweep 开始填充一个按大小分桶的空闲列表，bump 分配器获得一条 fallback 路径。确切的先后顺序、以及哪个补丁贡献了多少，需要一次我们欠下但还没做的仔细二分。
      </p>
      <p>
        在 aya_koto 完全相同的基准和命令上、在 Apple M 系列、macOS 26.4 上的结果：
      </p>
      <pre><code>{`Perry v0.5.875: 425.0 ± 78 ms  (367 – 745)
Bun 1.3.12:     430.7 ± 74 ms  (376 – 787)
Deno 2.7.14:    544.8 ± 140 ms (426 – 984)`}</code></pre>
      <p>
        关于这张表的两条诚实说明。第一，Perry 相对 Bun 的 1.01 倍优势在误差棒之内 — 正确的措辞是&ldquo;打平&rdquo;，而非&ldquo;更快&rdquo;。第二，三个运行时的方差都有意义（Perry 的最大值 745 ms 相对 425 ms 的均值），任何单次运行都可能落进任一尾部。出于这个原因我们在均值旁列出了最小值和最大值；我们宁愿让你看到这个离散度。
      </p>

      <h2>仍然不完美的地方</h2>
      <p>
        有几件事我们不打算粉饰：
      </p>
      <p>
        从 aya_koto 测量到这次调查开始之间发生的 1.2 s 到 3.0 s 的回归告诉我们，我们没有一个能抓住这类变慢的 CI 护栏。在本文上线之前，我们正把 <code>abc451d-perry.ts</code> 和一个小型外围套件加入 Perry 的 CI 作为性能回归门禁。如果这个基准在未来某个版本里悄悄退化，它应当让一次构建失败，而不是让三个月后来自批评者的一次基准失败。
      </p>
      <p>
        这个修复在一个特定方向上放松了一个有意为之的取舍。我们在盯着 <code>object_create</code> 基准及其同类 — 也就是原本&ldquo;无空闲列表&rdquo;选择所保护的工作负载 — 以确保有条件的空闲列表路径不会让它们回归。早期数字在噪声之内，但这种事的信心来自时间，而不是单次基准运行。
      </p>
      <p>
        我们没有二分那 137 个版本的区间。我们会做的。它对文档很重要，也对理解哪些有条件空闲列表机制在起作用很重要。
      </p>

      <h2>致谢</h2>
      <p>
        aya_koto 的文章正是一个开源项目所需要、却鲜少得到的那种记录。他仔细测量、公开了测试仓库、点名指出了安装路径上的具体摩擦，并得出了诚实的结论 — Perry 还没准备好胜任他所评估的用例。在他写下时，那个结论是正确的。如果他不曾写出来，它本会正确得更久。
      </p>
      <p>
        他的测试仓库在 <a href="https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421" className="text-amber-400 hover:text-amber-300">github.com/AXT-AyaKoto/perry-ts-test-2026-0421</a>。他的文章在 <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">zenn.dev/aya_koto/articles/553ce04b1d5ac4</a>。即便在这篇后续之后两者都值得一读 — 尤其是文章，因为它记录了一个没有任何动机去客气的人对一个早期阶段编译器的诚实评估。
      </p>
      <p>
        他文章里有两件具体的事我们应当指出。他点出的安装路径摩擦 — perryts.com 顶部指向一种方法，而文档推荐另一种 — 已经修好；npm 路径现在是 landing 页上最显眼的选项，与文档一致。他点出的&ldquo;限制文档之外那些编译不了的东西&rdquo;的挫败感 — 我们用当前的 Perry 走了一遍他测试仓库里的每个 <code>.ts</code> 文件；真正的空缺都立了 issue，已记录的限制也做了扩充。
      </p>
      <p>
        正如上文所讨论，他文章上的 BigInt 脚注与 ABC451D 无关，但本身是真实的 — Perry 的 BigInt 实现底层确实是一个定宽 1024 位整数，而 BigInt 密集的程序为此付出了代价。这在 v0.5.736 修好了，带有一条小值内联路径，并以 <code>num-bigint</code> 作为任意精度的 fallback。那里的功劳属于在 aya_koto 文章下留脚注的那位读者；我们不知道他们是谁，但如果你正在读这篇：谢谢你。
      </p>

      <h2>复现</h2>
      <p>
        如果你想自己复现这些数字：
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
        你的数字会随硬件和运行时版本而变化。如果它们以看起来不对的方式变化，<a href="https://github.com/PerryTS/perry/issues" className="text-amber-400 hover:text-amber-300">提个 issue</a> — 我们宁愿听到这种反馈。
      </p>
      <p>
        源码：<a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues：<a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
