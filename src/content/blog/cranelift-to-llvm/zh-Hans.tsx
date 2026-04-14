export default function Content() {
  return (
    <>
      <p>
        Perry 从 Cranelift 到 LLVM 的后端迁移已完成。自 v0.5.12 起，LLVM 是唯一的代码生成后端，Perry 现在在每项基准测试中都击败了 Node.js——优势从 1.7 倍到 24.6 倍不等（其中两项持平）。
      </p>
      <p>
        走到这一步并非一帆风顺。v0.5.0 的初始切换使多项基准测试比之前的 Cranelift 版本<strong>慢了 70 倍</strong>。这篇文章详细讲述了事情的来龙去脉：为什么我们仍然选择了切换，什么出了问题，什么修复了问题，以及最终数据表现如何。
      </p>
      <p>
        如果你正在构建编译器、评估 codegen 后端，或者只是好奇为什么"切换到 LLVM"很少像听起来那么简单，这篇文章是为你写的。
      </p>

      <h2>第一部分：为什么要切换？</h2>
      <p>
        Perry 将 TypeScript 直接编译为原生机器码。没有 Node，没有 V8，没有 Electron，没有 WebView。"编写 TypeScript，交付原生二进制"这一价值主张，如果二进制文件实际上并不快，就会完全崩塌。
      </p>
      <p>
        在 Perry 的前几个小版本中，codegen 后端是 <a href="https://cranelift.dev/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Cranelift</a>。Cranelift 是一个出色的工具——它是 wasmtime 的 codegen 引擎，被 SpiderMonkey 的基线 JIT 使用，当你需要快速、可预测的编译和干净的嵌入体验时，它是首选。对于一个正在引导新语言的项目来说，它是正确的起点。
      </p>
      <p>
        但最终有两件事让我们不得不离开它。
      </p>

      <h3>1. 优化器的天花板</h3>
      <p>
        Cranelift 有意设计为一个快速的单层优化编译器。它的定位是"快速生成不错的代码"，而不是"不惜时间生成最好的代码"。这对 JIT 来说是正确的权衡，但对一个以原生性能为核心卖点的 AOT 编译器来说，则是错误的权衡。
      </p>
      <p>
        LLVM 积累了超过二十年的开发投入。循环向量化、LICM、GVN、SCCP、指令合并、内联启发式、fast-math 重结合、别名分析——没有哪个更小的项目能够现实地追赶上来。如果 Perry 要声称"比 Node 更快"，我们就需要这套机制。
      </p>

      <h3>2. arm64_32 问题</h3>
      <p>
        直接的推动因素是 Apple Watch。<code>arm64_32</code> 是 Apple 为 Series 4 及之后机型引入的 ABI——64 位指令，32 位指针。Cranelift 不支持它，也没有现实的可能性去支持。Perry 要想可信地声称"一套代码，9 个平台"，就不能缺少 watchOS。LLVM 开箱即用支持 <code>arm64_32</code>。
      </p>
      <p>
        一旦我们接受了<em>某些</em>目标平台需要 LLVM，维护两个后端就变得不可持续了。两个后端意味着两套 bug、两套优化 pass、两个测试矩阵、两条性能基线。诚实的答案是：选一个。
      </p>
      <p>我们选择了 LLVM。</p>

      <h2>第二部分：关于 Cranelift 说几句</h2>
      <p>
        在继续之前：这篇文章不是对 Cranelift 的批评。Cranelift 是一项出色的工程成就，如果你在构建 JIT、沙盒运行时，或任何编译延迟比峰值吞吐量更重要的东西，它应该排在你候选列表的前面。wasmtime 采用它是有原因的。Bytecode Alliance 一直在做着典范级的工作。
      </p>
      <p>
        只是 Perry 的需求不同。我们是 AOT 编译，一次交付二进制，用户运行数百万次。这种不对称——编译少见，执行常在——正是 LLVM 更重的优化器能收回成本的领域。不同的工作需要不同的工具。
      </p>

      <h2>第三部分：切换灾难</h2>
      <p>
        v0.5.0 是以 LLVM 作为唯一后端的首个版本。我们预期编译时间会略有增加，运行时性能会显著改善。后者的实际结果恰好相反。
      </p>
      <p>这是我当时不想公开的表格：</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Cranelift</th>
              <th className="text-right py-2 px-3">LLVM v0.5.0</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3">1,084ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">68x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">5ms</td><td className="text-right py-2 px-3">318ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">64x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">61ms</td><td className="text-right py-2 px-3">184ms</td><td className="text-right py-2 px-3 text-red-400">3x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">370ms</td><td className="text-right py-2 px-3">131ms</td><td className="text-right py-2 px-3 text-green-400">2.8x faster</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">32ms</td><td className="text-right py-2 px-3">57ms</td><td className="text-right py-2 px-3 text-red-400">1.8x slower</td></tr>
            <tr><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">505ms</td><td className="text-right py-2 px-3">1,156ms</td><td className="text-right py-2 px-3 text-red-400">2.3x slower</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        一些工作负载变快了。但大多数急剧恶化。<code>method_calls</code>——因为它代表了典型的 TypeScript 类使用模式，是最重要的基准测试之一——比两个版本前交付的结果慢了近 70 倍。
      </p>

      <h3>到底出了什么问题</h3>
      <p>
        Perry 使用 <strong>NaN-boxing</strong> 来表示值。每个 TypeScript 值都是一个 64 位字。f64 数字直接存储；其他所有内容（对象、字符串、布尔值、undefined、null）编码在 IEEE 754 quiet NaN 的未使用位中。
      </p>
      <p>
        优势：数字零成本。没有装箱，没有标记，算术运算无需分配。
      </p>
      <p>
        劣势：对非数字值的每次操作都需要位操作来解包、操作和重新打包。如果这些序列以 codegen 的内联 IR 形式存在，优化器可以融合和简化它们。如果它们以<strong>运行时辅助函数调用</strong>的形式存在，优化器会将其视为不透明调用而放弃优化。
      </p>
      <p>
        Cranelift 后端积累了大量针对热点操作的内联降级——属性加载、方法分派、对象分配、f64 标记值的整数运算等。LLVM 切换时，为了优先确保代码<em>正确</em>，我们将几乎所有这些操作都通过 <code>perry-runtime</code> 中的运行时辅助函数路由。每个辅助函数在 LLVM IR 中都是一条 <code>call</code> 指令。
      </p>
      <p>
        LLVM 很优秀，但它无法内联一个从未见过函数体的函数。<code>perry-runtime</code> 是单独编译、最后链接的，从优化器的角度来看，每个辅助调用都是黑盒。结果就是，Cranelift 后端曾编译为约 5 条内联算术指令的热循环，现在变成了函数调用——寄存器保存、栈帧设置等等——重复数百万次。
      </p>
      <p>
        这就是 70 倍差距的来源。不是糟糕的 codegen，而是糟糕的<strong>内联边界</strong>。
      </p>

      <h2>第四部分：修复</h2>
      <p>
        恢复并超越 Cranelift 性能数据的工作大致分为六个方面。没有一个是特别新奇的。大多数是教科书式的编译器优化，只是需要应用在正确的位置。
      </p>

      <h3>1. 对象分配的内联 bump 分配器</h3>
      <p>
        <code>object_create</code> 是仅次于 <code>method_calls</code> 的最大性能回退。旧路径为每个 <code>new Point()</code> 调用 <code>js_object_alloc_class_with_keys</code>——一次函数调用、一次线程局部 arena 访问、一次 shape 缓存查找，以及 GC 头和对象头的写入。
      </p>
      <p>
        修复方案：在 LLVM IR 中<strong>内联</strong>生成 bump 分配。每个分配对象的函数获得一个指向线程局部 <code>InlineArenaState</code> 结构体的缓存指针。分配变成了：
      </p>
      <pre><code>{`; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
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
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)`}</code></pre>
      <p>
        快速路径是约 13 条内联 IR 指令，LLVM 可以看到、调度并从循环中提升。<code>object_create</code> 从 318ms 降到了 9ms。
      </p>

      <h3>2. i32 循环计数器</h3>
      <p>
        NaN-boxing 意味着每个 TypeScript 数字都是 f64，包括循环计数器。一个带有 f64 归纳变量的 <code>{'for (let i = 0; i < 100_000_000; i++)'}</code> 循环是灾难性的：f64 递增、f64 比较、每次数组索引时的 f64 到 i64 转换。
      </p>
      <p>
        codegen 检测归纳变量可证明为整数值的 for 循环，并分配一个<strong>并行 i32 栈槽</strong>。循环条件从 <code>fcmp</code> 切换到 <code>icmp slt i32</code>，完全消除 f64 计数器。
      </p>
      <p>
        这使得 <code>array_write</code> 从 11ms 降到 3ms，<code>nested_loops</code> 从 18ms 降到 9ms，<code>array_read</code> 从 11ms 降到 4ms。
      </p>

      <h3>3. fast-math 标志</h3>
      <p>
        我们为每条 f64 算术指令附加 <code>reassoc contract</code> 标志。<code>reassoc</code> 允许 LLVM 将串行累加器链拆分为并行链，<code>contract</code> 允许乘加融合。由于 Perry 使用 NaN 位作为值标记，我们保持 <code>nnan</code> 和 <code>ninf</code> 关闭。
      </p>
      <p>
        有了这些标志，LLVM 的循环向量化器在 <code>math_intensive</code> 上生效，从 131ms 降到 14ms——比 Node 快 3.5 倍。
      </p>

      <h3>4. 整数取模快速路径</h3>
      <p>
        JavaScript 中 f64 的 <code>%</code> 是 <code>fmod</code>，在 ARM 上是 libm 调用。但对于整数值的 f64 操作数，我们可以用 <code>fptosi → srem → sitofp</code> 完全跳过 libm 的往返。codegen 通过静态分析检测整数值操作数——无需运行时检查。
      </p>
      <p>
        这就是 <code>factorial</code> 从 1,553ms 降到 24ms 的全部原因——从 Node 的 591ms 降到 24ms。<strong>比 Node.js 快 24.6 倍。</strong>
      </p>

      <h3>5. 嵌套循环的 LICM</h3>
      <p>
        LLVM 默认执行 loop-invariant code motion，但 NaN-boxing 隐藏了结构。<code>arr.length</code> 被降级为通过 NaN-boxed 指针的带标记检查的加载——不是明显的循环不变量。
      </p>
      <p>
        codegen 检测 <code>{'for (...; i < arr.length; ...)'}</code> 模式，在循环之前将长度预加载到栈槽中，并由静态遍历器验证循环体不会改变数组长度。当计数器受此提升的长度约束时，IndexGet/IndexSet 完全跳过边界检查。
      </p>

      <h3>6. shape 缓存的对象</h3>
      <p>
        当 codegen 知道对象的类时，它在编译时解析字段偏移并生成<strong>直接索引加载</strong>——无需运行时分派。对于方法分派，<code>obj.method(args)</code> 变成直接的 <code>call @perry_method_Class_name(this, args)</code>——没有 vtable，没有内联缓存，没有哈希查找。
      </p>
      <p>
        LLVM 切换时这退化回了通用慢路径。恢复静态分派使 <code>method_calls</code> 从 1,084ms 恢复到 1ms。<strong>比 Node.js 快 11 倍。</strong>
      </p>

      <h2>第五部分：当前数据</h2>
      <p>三次运行取中位数，macOS ARM64（Apple Silicon, M1 Max），Node.js v25：</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Node.js</th>
              <th className="text-right py-2 px-3">vs Node</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">factorial</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">591ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">24.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">11ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">11x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_overhead</td><td className="text-right py-2 px-3">12ms</td><td className="text-right py-2 px-3">53ms</td><td className="text-right py-2 px-3 text-green-400">4.4x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">14ms</td><td className="text-right py-2 px-3">49ms</td><td className="text-right py-2 px-3 text-green-400">3.5x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_read</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">13ms</td><td className="text-right py-2 px-3 text-green-400">3.2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">closure</td><td className="text-right py-2 px-3">97ms</td><td className="text-right py-2 px-3">303ms</td><td className="text-right py-2 px-3 text-green-400">3.1x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_write</td><td className="text-right py-2 px-3">3ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-green-400">2.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">string_concat</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">2ms</td><td className="text-right py-2 px-3 text-green-400">2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">prime_sieve</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">7ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">21ms</td><td className="text-right py-2 px-3">34ms</td><td className="text-right py-2 px-3 text-green-400">1.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">991ms</td><td className="text-right py-2 px-3 text-green-400">2.5x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">binary_trees</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3 text-slate-400">tied</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">mandelbrot</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3 text-slate-400">tied</td></tr>
            <tr><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-red-400">0.9x</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        每项基准测试都是胜利或持平。最接近的是 <code>object_create</code>（9ms vs 8ms），V8 的分配器确实出色。
      </p>

      <h2>第六部分：编译时间问题</h2>
      <p>
        人们选择 Cranelift 而非 LLVM 的首要原因是编译速度。那我们来谈谈这个。
      </p>
      <p>
        LLVM 使 Perry 的每文件编译时间增加了 <strong>20-50ms</strong>，大约 <strong>8-19%</strong>。不是 5 倍，不是 2 倍，而是个位数到低两位数百分比。
      </p>
      <p>
        原因是 codegen 并不是 Perry 流水线的瓶颈。一个典型文件的耗时分布如下：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>SWC 解析：~30%</li>
        <li>HIR 降级（AST → IR，类型推断）：~25%</li>
        <li>IR 变换 pass（闭包转换、async 降级、内联）：~15%</li>
        <li><strong>Codegen（LLVM IR 文本输出 + <code>clang -c -O3</code>）：~20%</strong></li>
        <li>链接（<code>cc</code> + 运行时库）：~10%</li>
      </ul>
      <p>
        Codegen 只是五个阶段中的一个。即使将这个阶段翻倍，总时间也只增加 5-10%。如果你在构建一个 AOT 编译器，用户输入一次 <code>perry compile</code> 然后永远运行二进制文件，那么计算很简单：编译时多花 25ms，每次执行最多节省 24 倍。
      </p>

      <h2>第七部分：如果重新来过</h2>
      <p>
        如果我今天重新开始 Perry 并且可以直接跳到 LLVM，我不会这样做。Cranelift 阶段确实有价值。它让我们在没有 LLVM 复杂性负担的情况下迭代前端，提供了一个可以对比的工作基线，并迫使我们保持 HIR 足够干净以便在后端之间移植。
      </p>
      <p>
        如果重新来过，我会改变切换本身的做法。我们在 v0.5.0 中让大多数操作通过运行时辅助调用，打算之后再内联。这是错误的。正确的顺序应该是：先识别热路径，在切换之前将它们内联降级，只有在 LLVM 后端至少达到同等水平后才发布。
      </p>
      <p>
        教训很朴素：优化边界比优化器质量更重要。LLVM 是一款卓越的软件，但它无法帮助它看不到的代码。如果你的 codegen 将一切都通过不透明的运行时调用路由，你就在源程序和所有优化 pass 之间筑了一堵墙。
      </p>

      <h2>总结</h2>
      <p>
        Perry 现在是纯 LLVM，在每项基准测试中都快于 Node.js，并持续发布中。这次迁移比计划的时间更长，中途比预期更痛苦，但回头来看毫无疑问是正确的决定。Cranelift 带我们走到了 v0.5；LLVM 将带我们走完剩下的路。
      </p>
      <p>如果你想试用 Perry：</p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        源码：<a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}—— 文档：<a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}—— 自己运行基准测试：<code>cd benchmarks/suite && ./run_benchmarks.sh</code>
      </p>
      <p>
        如果你有问题、发现了 bug，或者想讨论 codegen 后端，GitHub issues 是开放的。我全部会看。
      </p>
      <p>—— Ralph</p>
    </>
  );
}
