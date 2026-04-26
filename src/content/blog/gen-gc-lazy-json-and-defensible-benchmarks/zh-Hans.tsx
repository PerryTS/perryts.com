export default function Content() {
  return (
    <>
      <p>
        上一篇博客发布时停在 <strong>v0.5.174</strong>，标题只有一个：Perry 终于在树内基准套件中击败了 Node 和 Bun，所有项目全胜。三天工作和一批积压的 GC + JSON 提交之后，Perry 来到了 <strong>v0.5.306</strong>——也就是<strong>发布了 132 个补丁版本</strong>——而这次的故事不一样了。标题不是 547 倍的加速，也不是又添了一栏胜利。它是让那些胜利经得起推敲的那些工作。
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>分代 GC</strong> 作为默认行为发布。Phase A 到 D 落地于 v0.5.217–v0.5.237。</li>
        <li><strong>小字符串优化（SSO）</strong> 作为默认行为发布。Steps 1.5 → 2 落地于 v0.5.213–v0.5.216。</li>
        <li><strong>JSON 流水线</strong>获得了基于 tape 的解析器、惰性 parse、惰性 stringify，以及按元素的稀疏物化。默认的 validate-and-roundtrip 现在是<strong> 75 ms 中位数</strong>——动态类型组里最快的。</li>
        <li><strong>基准测试页面</strong>从头到尾被重写：<strong>RUNS=11 中位数 + p95 + σ + min + max</strong>，加入 simdjson 和 AssemblyScript+json-as 作为对比对象，把优化探针与真正的对比分开，并诚实地暴露 Perry 的每一个弱点。</li>
      </ul>
      <p>
        配角是一连串稳定的正确性修复：Promise 微任务 FIFO、NaN 相等以及 ECMAScript 数字格式化、BigInt 二补码、AsyncLocalStorage 端到端、decimal.js + ioredis + commander runtime，以及一个一直藏在 tape 路径下、对纯 f64 做 JSON.stringify 时的段错误。再加上 Windows 工具链终于走向轻量：LLVM + xwin，无需安装 Visual Studio。
      </p>

      <h2>1. 分代 GC，默认开启</h2>
      <p>
        分代 GC 已经分阶段推进了两个月。本周期内关闭的阶段总结如下：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.217–v0.5.221</strong>——Phase A：shadow-stack runtime 脚手架、push/pop 发射、slot-map 串联、<code>Let</code>/<code>LocalSet</code> 影子镜像，以及根扫描器。</li>
        <li><strong>v0.5.222</strong>——Phase B：nursery + 老年代 arena 分割。</li>
        <li><strong>v0.5.223–v0.5.225</strong>——Phase C1–C2：写屏障 runtime 基础设施、codegen 发射屏障，每一次堆 store 都要走它。</li>
        <li><strong>v0.5.226–v0.5.228</strong>——Phase C3a–C4：remembered-set 根流入 mark + clear；minor GC 跟踪跳过老年代；非移动的 tenuring。</li>
        <li><strong>v0.5.229–v0.5.236</strong>——Phase C4b α/β/γ/δ：转发指针基础设施、pinning + evacuation pass、扫描器 + 传递性 pinning、引用重写、空闲 nursery 块归还给 OS、GC 触发上限锁定为初始阈值。</li>
        <li><strong>v0.5.237</strong>——Phase D part 1：<code>PERRY_GEN_GC=1</code> 默认开启。</li>
        <li><strong>v0.5.238</strong>——Phase D part 2：<code>PERRY_SHADOW_STACK=1</code> 默认开启。</li>
        <li><strong>v0.5.239–v0.5.240</strong>——收尾文档：路线图定稿，学术 + 工业血缘附录（Bartlett 1988、Ungar 1984、Cheney 1970）。</li>
      </ul>
      <p>
        最重要的实测胜利：分代 GC 默认翻转的瞬间，<code>test_memory_json_churn</code> 的峰值 RSS 从 <strong>115 MB → 91 MB</strong>。计算端的回退很小，并且毫不掩饰地列了出来——<code>nested_loops</code> 8 → 18 ms、<code>accumulate</code> 24 → 34 ms、<code>object_create</code> 0 → 1 ms、<code>array_read</code> / <code>array_write</code> 各 +1 ms。逃生舱（<code>PERRY_GEN_GC=0</code>）能恢复到旧的数字；这个权衡是有意为之的，基准测试页面现在把两行并排列出来，读者可以自己挑选。
      </p>

      <h2>2. 小字符串优化，默认开启</h2>
      <p>
        SSO 是一个 22 字节的内联字符串表示，能让短字符串避免堆分配——典型的 JSON key（2–8 字节）和短 value 都落入内联形式。表面上的发布很小，背后的工作量很大：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.213</strong>：SSO 基础设施（表示 + 访问器）。</li>
        <li><strong>v0.5.214</strong>：Step 1 消费方武装 + <code>PERRY_SSO_FORCE</code> 测试开关。</li>
        <li><strong>v0.5.215</strong>：Step 1.5 codegen <code>PropertyGet</code> 三路分支——内联字符串快路径、堆字符串快路径、剩余情况慢路径。</li>
        <li><strong>v0.5.216</strong>：Step 2 翻转——默认发射 SSO。</li>
      </ul>
      <p>
        v0.5.279 的后续修复关闭了 SSO 进入热路径后才暴露出来的最后一个属性读取 NaN bug；v0.5.272 中跨模块链式 getter 派发的修复又关闭了一个。两个 bug 在默认翻转之前就在待办列表上；两个修复都没有带来性能回退。
      </p>

      <h2>3. JSON：基于 tape 的 parse，默认惰性</h2>
      <p>
        JSON 流水线是这一时期改动最深入的重写。旧行为：<code>JSON.parse</code> 构建一棵完整物化的、由 NaN-boxed 值组成的树。新行为：<code>JSON.parse</code> 构建一条每值 12 字节的 tape 并按需物化——只有你真正读到的值才会付出物化成本。对未修改的 parse 结果做 stringify 现在是对原始输入的一次 memcpy，正是 simdjson 在 <code>raw_json()</code> 上用的同一招快速路径。
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.200</strong>：<code>JSON.parse&lt;T&gt;(blob)</code> 由 schema 驱动的 parse（Step 1）。编译期已知的形状让编译器能发射预解析过的 key 访问。</li>
        <li><strong>v0.5.203</strong>：基于 tape 的 parse 基础——Step 2 Phase 1。</li>
        <li><strong>v0.5.204</strong>：惰性 parse + 惰性 stringify——Step 2 Phases 2+4。</li>
        <li><strong>v0.5.206</strong>：lazy-safe 的索引访问 + 边界情况——Step 2 Phase 3。</li>
        <li><strong>v0.5.208</strong>：按元素的稀疏物化——Step 2 Phase 5b。</li>
        <li><strong>v0.5.209</strong>：游走游标 + 自适应物化阈值。</li>
        <li><strong>v0.5.210</strong>：对 ≥1 KB 的 blob 默认翻转为惰性 parse。</li>
      </ul>
      <p>
        在惰性 tape 真正为之设计的负载（10k 条记录、约 1 MB blob、parse → stringify 中间不做迭代）上的结果：
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">实现</th>
              <th className="text-right py-2 px-3">中位数 (ms)</th>
              <th className="text-right py-2 px-3">p95 (ms)</th>
              <th className="text-right py-2 px-3">σ</th>
              <th className="text-right py-2 px-3">峰值 RSS</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">c++ <code>-O3 -flto</code> (simdjson)</td><td className="text-right py-2 px-3">24</td><td className="text-right py-2 px-3">28</td><td className="text-right py-2 px-3">1.2</td><td className="text-right py-2 px-3">8 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3 text-amber-400 font-semibold">perry (gen-gc + lazy tape)</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">75</td><td className="text-right py-2 px-3">91</td><td className="text-right py-2 px-3">6.9</td><td className="text-right py-2 px-3">85 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">rust serde_json (LTO)</td><td className="text-right py-2 px-3">185</td><td className="text-right py-2 px-3">190</td><td className="text-right py-2 px-3">1.7</td><td className="text-right py-2 px-3">11 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">bun</td><td className="text-right py-2 px-3">259</td><td className="text-right py-2 px-3">342</td><td className="text-right py-2 px-3">26.1</td><td className="text-right py-2 px-3">82 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">node</td><td className="text-right py-2 px-3">394</td><td className="text-right py-2 px-3">602</td><td className="text-right py-2 px-3">60.1</td><td className="text-right py-2 px-3">127 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">kotlin (kotlinx.serialization)</td><td className="text-right py-2 px-3">473</td><td className="text-right py-2 px-3">533</td><td className="text-right py-2 px-3">21.4</td><td className="text-right py-2 px-3">606 MB</td></tr>
            <tr><td className="py-2 px-3">assemblyscript+json-as (wasmtime)</td><td className="text-right py-2 px-3">598</td><td className="text-right py-2 px-3">621</td><td className="text-right py-2 px-3">10.5</td><td className="text-right py-2 px-3">58 MB</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Perry 在 <strong>75 ms 中位数</strong>下，是这次对比中最快的动态类型 runtime——击败 Bun（259 ms）、击败 Node（394 ms）、击败 Kotlin 服务端 JIT（453 ms）。simdjson 在 24 ms 是 SIMD 加速的 C++ 天花板，故意留在页面上而不是被精挑细选地藏起来。Perry 没有击败它。重点是把这个差距摆出来，这样要去缩小它就有目标——已在 <code>docs/json-typed-parse-plan.md</code> 中跟踪。
      </p>
      <p>
        诚实的搭档基准是 <strong>parse-and-iterate</strong>：同样的 blob，但每次迭代都对每条记录的 <code>nested.x</code> 求和，强制惰性 tape 物化。在这里 Perry 落到 <strong>466 ms</strong>——比 mark-sweep 逃生舱的 375 ms 还慢，因为 tape 付出的开销摊销不掉。这一行就在 TL;DR §B 里。当工作量躲不掉的时候，惰性 tape 也不会假装能躲。
      </p>

      <h2>4. 基准测试页面，已重写</h2>
      <p>
        关于 Perry 如何呈现性能数字，有三件事变了。
      </p>
      <p>
        <strong>RUNS=11 中位数 + p95 + σ + min + max，不是 best-of-N。</strong>best-of-N 会悄无声息地丢掉尾延迟；在这台硬件上，它一直藏着 Python <code>accumulate</code> 9.4 秒级的离群点和 Swift JSON 5.3 秒级的 p95 尖峰。中位数把尾巴重新摆回了页面上。方法学的变更落在 v0.5.248；TL;DR §A 和 §B 中的每一个单元格都是 RUNS=11 重新跑出来的，截至 <strong>2026-04-25</strong>。
      </p>
      <p>
        <strong>优化探针和真实的 runtime 性能被分开了。</strong>那五个 Perry 12–34 ms 对 Rust/C++ 98 ms 的单元——<code>loop_overhead</code>、<code>math_intensive</code>、<code>accumulate</code>、<code>array_read</code>、<code>array_write</code>——衡量的是编译器标志姿态，不是硅片本身。它们现在被放进自己的小节，上方有一段说明指出 <code>clang++ -O3 -ffast-math</code> 能把差距收到一毫秒以内。真正的 runtime 头牌内核是 <code>loop_data_dependent</code>：Perry 235 ms、Rust 229、Swift 233、Java 229、Bun 232——在这个编译器确实没法把工作折叠掉的内核上，Perry 稳稳地坐在 no-FMA-contract 那一组里。这才是诚实的对比。
      </p>
      <p>
        <strong>新增对手。</strong>simdjson（4.3.0）现在出现在两张 JSON 表里——C++ parse 吞吐天花板，摆在页面上让读者看到差距。带 json-as 的 AssemblyScript（1.3.2）是最接近的、可安装的 TS-to-native 对手；porffor 在这个尺寸的负载上段错误，Static Hermes 在 macOS arm64 上装不上。带 kotlinx.serialization 的 Kotlin 在 v0.5.241–v0.5.242 加入了 JSON 多语言对比。每一行都是真实的，每一条免责声明都在页面上。
      </p>

      <h2>5. 多语言计算表</h2>
      <p>
        真正不可折叠的头牌内核，RUNS=11 中位数，2026-04-25 在 v0.5.249 刷新：
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Rust</th>
              <th className="text-right py-2 px-3">C++</th>
              <th className="text-right py-2 px-3">Java</th>
              <th className="text-right py-2 px-3">Node</th>
              <th className="text-right py-2 px-3">Bun</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">318</td><td className="text-right py-2 px-3">330</td><td className="text-right py-2 px-3">315</td><td className="text-right py-2 px-3">282</td><td className="text-right py-2 px-3">1022</td><td className="text-right py-2 px-3">589</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_data_dependent</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">235</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">129</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">322</td><td className="text-right py-2 px-3">232</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">1</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">5</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">6</td></tr>
            <tr><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">18</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">18</td><td className="text-right py-2 px-3">21</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        在 <code>fibonacci</code> 上，Perry 与编译型那组只差 3–15 ms。Java 的 HotSpot JIT 因为内联了递归调用，要快约 11%。在 <code>loop_data_dependent</code> 上，这个内核分裂为两个 FP-contract 簇：约 128 ms 的 FMA-contract 组（Go 默认、Apple Clang 上的 <code>g++ -O3</code>——两者都把 <code>sum * a + b</code> 融合成一条 FMADDD），以及 229–235 ms 的 no-contract 组（Perry、Rust 默认、Swift、未带 <code>-XX:+UseFMA</code> 的 Java、Bun）跑标量的 FMUL + FADD。LLVM 在 <code>-ffp-contract=fast</code> 下能匹平 FMA 组；Perry 默认不开这个。<code>nested_loops</code> 是 cache-bound 而不是 compute-bound；所有人都落在 8–21 ms。
      </p>

      <h2>6. Windows 工具链，轻量化</h2>
      <p>
        Windows 用户不再需要安装 Visual Studio。<strong>v0.5.199</strong> 关闭了 <a href="https://github.com/PerryTS/perry/issues/176" className="text-amber-400 hover:text-amber-300">#176</a>：<code>perry setup windows</code> + winget LLVM + xwin 替代了整棵 VS BuildTools 树。<code>v0.5.201</code> 去掉了 <code>find_lld_link</code> / <code>find_perry_windows_sdk</code> 上的 cfg 门控，这样路径发现在每一个面向 Windows 的平台上都能工作，而不只是 macOS 主机。
      </p>
      <pre><code>{`# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Runtime 正确性扫荡</h2>
      <p>
        本周期的一个主题：从 V8/JSC 中悄悄分叉出来的 runtime 行为，要么变成修复，要么变成编译错误。值得一提的：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.255</strong>：<code>BigInt.fromTwos</code>/<code>toTwos</code> 二补码。</li>
        <li><strong>v0.5.263</strong>：<code>Promise.all</code>/<code>race</code>/<code>any</code> 对非 promise 类型的判别。</li>
        <li><strong>v0.5.281</strong>：<code>NaN==NaN</code> + ECMAScript 数字格式化（<code>3 → &quot;3&quot;</code>，不是 <code>&quot;3.0&quot;</code>；<code>-0 → &quot;0&quot;</code>；等等）。</li>
        <li><strong>v0.5.280</strong>：<code>(x) | 0</code> 中 <code>NaN</code>/<code>Infinity</code> 的 ToInt32 强制转换。</li>
        <li><strong>v0.5.284</strong>：Promise 微任务 FIFO + 抛出处理器的传播。</li>
        <li><strong>v0.5.286</strong>：对纯 f64 调用 <code>JSON.stringify</code> 在 tape 路径下会段错误。</li>
        <li><strong>v0.5.277</strong>：未传 encoding 时 <code>fs.readFileSync</code> 返回 Buffer（与 Node 一致）。</li>
        <li><strong>v0.5.272</strong>：跨模块的链式 getter 派发返回 <code>undefined</code>。</li>
      </ul>
      <p>
        围绕 issue <a href="https://github.com/PerryTS/perry/issues/187" className="text-amber-400 hover:text-amber-300">#187</a> 的标准库后续也补齐了：AsyncLocalStorage 端到端（v0.5.261）、commander runtime + codegen 真正调用 <code>.action()</code>（v0.5.250）、decimal.js 代码（v0.5.259）、Redis ioredis 端到端（v0.5.270）、pg + mongo 异步工厂模式（v0.5.275），以及 EE/LRU/WSS 上同样的异步工厂 bug（v0.5.252）。
      </p>
      <p>
        在 <code>perry/ui</code> 一侧：通知点击回调（#97）在 Apple（v0.5.254）和 Android（v0.5.258）两端都接通；本地通知的 schedule + cancel（#96，v0.5.244）；Android 上的 FCM 注册 + 接收（v0.5.262）。
      </p>

      <h2>8. 收尾</h2>
      <p>
        这段时间的模式不是头条数字。它是让现有的胜利经得起推敲的工作：一个能接住持续分配负载的分代 GC、一个能合上短字符串成本差距的 SSO、一个利用最常见负载&ldquo;不修改&rdquo;结构的 JSON 流水线，以及一个测中位数而不是 best-of-N、并把 simdjson 的 24 ms parse 天花板与 Perry 的 75 ms 摆在同一行的基准测试页面。读者得以看到差距——以及 Perry 相对于地板的位置。
      </p>
      <p>
        来试试：
      </p>
      <pre><code>{`# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — no VS install needed)
winget install PerryTS.Perry

# Default benchmark suite
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh`}</code></pre>
      <p>
        源码：<a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}—— 基准测试：<a href="https://github.com/PerryTS/perry/blob/main/benchmarks/README.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">benchmarks/README.md</a>
        {" "}—— 更新日志：<a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
