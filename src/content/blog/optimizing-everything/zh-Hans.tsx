export default function Content() {
  return (
    <>
      <p>
        上一篇博客发布时，Perry 版本是 v0.5.12。今天我们已经到了 v0.5.80。也就是说<strong>七天内发布了 68 个补丁版本</strong>，几乎全部聚焦于一件事：把剩下的每一条慢路径都变成快路径。
      </p>
      <p>
        v0.5.0 切换到 LLVM 后，到 v0.5.12 已经追平了 Cranelift。那是一个故事的结束，也是另一个故事的开始。LLVM 现在能看到一切。问题不再是&ldquo;这为什么慢？&rdquo;，而变成了&ldquo;这为什么还没变快？&rdquo;——后者是一个好处理得多的问题。
      </p>
      <p>
        这篇文章带你回顾这一周。JSON 获得了 547 倍的加速。mimalloc 成为全局分配器。属性访问加上了单态内联缓存。Buffer 拥有了带 <code>noalias</code> 元数据的类型化指针槽。Fastify 和 WebSocket 服务器不再一分钟后就崩溃。基准数据又一次前进了。
      </p>

      <h2>1. JSON：弥合 547 倍的差距</h2>
      <p>
        在 v0.5.29 时，Perry 对 20 条记录数组的 JSON.parse <strong>比 Node 慢 547 倍</strong>。到 v0.5.46 时只剩 1.3 倍。这是本周最大的单项差距变化，值得好好讲讲，因为这篇文章里其他每个优化都是同一主题的变奏：不要做不必要的工作。
      </p>
      <p>
        原来的解析器为每个属性分配一个 Vec、为每个对象分配一个 key 的 Vec，还有一个 RefCell 保护的 thread-local 作为 key 缓存。它会复制每一个字符串。它会为每个字段名重新计算哈希。它会为每条记录都构建一个全新的对象 shape，哪怕这 20 条记录拥有完全相同的字段和完全相同的顺序。Node 的解析器能识别出这种模式，在所有记录之间共享一个 shape。Perry 的则不能。
      </p>
      <p>修复分四步完成：</p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>通过 thread-local 的 <code>PARSE_KEY_CACHE</code> 实现 key 驻留</strong>（v0.5.45）。第一条记录分配 N 个 key 字符串；第 2 到第 20 条记录分配数为零。重复的 key 解析到同一个指针，这样它们就可以作为 shape 缓存的查找键使用，而无需 strcmp。</li>
        <li><strong>通过转移缓存实现 shape 共享</strong>（v0.5.45）。由 <code>js_object_set_field_by_name</code> 构建的对象会走同一张转移图。当 schema 重复时，<code>keys_array</code> 指针被共享，而这正是多态内联缓存命中所需要的。</li>
        <li><strong>零拷贝字符串解析 + 增量对象构建</strong>（v0.5.46）。<code>parse_string_bytes</code> 现在在没有反斜杠转义时返回 <code>ParsedStr::Borrowed(&amp;[u8])</code>——对每个 key 和大多数 value 来说这都是常见情况。<code>parse_object</code> 直接写入字段，而不是先收集到 Vec 中。</li>
        <li><strong>解析期间抑制 GC</strong>（v0.5.60，关闭 #59）。解析大数组会在紧凑循环里分配数千个小对象。每一个都会触发 GC 阈值检查。设置一个&ldquo;正在解析&rdquo;的标志，把回收推迟到解析返回后——实际堆大小相同，但记账分支大幅减少。</li>
      </ol>
      <p>
        然后是 stringify。对于同质数组——形状相同、百万次重复——JSON.stringify 会对每个对象做完整的属性迭代，而这对 shape 稳定的数组来说完全是浪费。五步修复也弥合了大部分差距：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>v0.5.62：数字的 itoa / ryu 快速路径，用基于深度的循环引用检查替代 HashSet。</li>
        <li>v0.5.63：<code>toJSON</code> 守卫 + 持久化 key 缓存 + 内联分派（这三项每次调用的开销累加起来不小）。</li>
        <li>v0.5.65：同质 shape 的 stringify 模板 + ASCII 转义快速路径。当每个元素拥有相同 shape 时，key/冒号/逗号这些脚手架被预计算一次。</li>
        <li>v0.5.70、v0.5.72、v0.5.75：每次调用的 shape 模板缓存，弥合 parse 遗留的 GC 缝隙，消除剩余的固定每次调用开销。</li>
        <li>v0.5.79：小值路径。数字、布尔值和短字符串走一条不设置任何对象机制的直接路径。</li>
      </ul>
      <p>
        累积结果：本周开始时<strong>比 Node 慢 547 倍</strong>的 JSON 流水线，现在在现实工作负载上 <strong>parse 大约比 Node 慢 1.3 倍，stringify 基本持平</strong>。
      </p>

      <h2>2. 分配器的故事</h2>
      <p>
        Perry 会分配很多内存。每个对象字面量、每个数组字面量、每次字符串拼接、每个闭包。分配器是热点，而在 v0.5 的大部分时间里，它都是 Rust 默认的系统分配器加上用于短命值的 thread-local arena。
      </p>
      <p>
        v0.5.67 把全局分配器换成了 <strong>mimalloc</strong>。这是 Cargo.toml 里的一行改动，对任何做大量小分配的工作负载都立竿见影——也就是每一个 TypeScript 程序。v0.5.66 为此做了铺垫：把所有 <code>gc_malloc</code> 的 thread-local 状态合并为每次调用单次 TLS 访问，让进入 mimalloc 的路径尽可能廉价。
      </p>
      <p>
        v0.5.68 在此基础上更进一步，引入了 <strong>arena 分配的字符串</strong>。短命字符串（中间拼接结果、<code>split()</code> 的片段、解析器暂存）完全绕过全局分配器，落在一个会在自然边界重置的每线程 bump arena 中。仅此一项，在 JSON 解析上就带来了两位数百分比的收益。
      </p>
      <p>
        还有两个根本不做分配的优化：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>非逃逸对象的标量替换</strong>（v0.5.17，对象字面量在 v0.5.76）。如果一个对象从不离开其封闭函数，它就根本不必存在。它的字段变成普通的局部变量。一旦你不再把对象藏在不透明的分配器调用后面，LLVM 开箱即用地处理这个。</li>
        <li><strong>非逃逸数组的标量替换</strong>（v0.5.73）。同样的思路——如果数组不逃逸，它的元素就变成 SSA 值，整个分配消失。</li>
      </ul>
      <p>
        具体到数组字面量路径，v0.5.69 添加了一条<strong>尺寸确定的快速路径</strong>（编译期已知大小时跳过容量增长机制），v0.5.74 为小数组字面量内联了 bump 分配器 IR，这样 LLVM 就能看到分配、折叠它、提升它或消除它。大量使用数组的基准测试又前进了一步。
      </p>
      <p>
        收尾上，v0.5.25 修复了一个更安静的 bug：<code>gc_malloc</code> 在自己的路径上并没有触发回收，所以大量使用 malloc 的工作负载可能在任何检查之前无节制地增长堆。v0.5.61 为阈值加入了自适应步长——这才是你真正想要的：堆小时廉价地检查，堆大时检查得更少。
      </p>

      <h2>3. 属性访问拥有了真正的内联缓存</h2>
      <p>
        所有现代 JavaScript 引擎在属性访问上都有多态内联缓存（PIC）。在 Perry v0.5 的大部分时间里，PropertyGet 都要经过一个用 thread-local 哈希的 shape 表查找。对冷代码来说没问题。但当一个调用点 95% 的属性读取都看到同一个 shape（这几乎总是如此）时，就不太好了。
      </p>
      <p>
        v0.5.44 为 <code>PropertyGet</code> 落地了<strong>单态内联缓存</strong>。每个 PropertyGet 点都获得一个每调用点缓存项：一个期望 shape 指针和一个字段偏移。命中路径是一次比较加一次索引加载。未命中路径退回到慢速辅助函数，由它更新缓存。
      </p>
      <pre><code>{`; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont`}</code></pre>
      <p>
        v0.5.51 为动态属性写入加入了<strong>内容哈希的 shape 转移缓存</strong>。两个以相同顺序增长相同字段的对象会哈希到同一个转移，最终共享同一个 shape——这意味着 PIC 的读取侧真的能命中。
      </p>
      <p>
        v0.5.55 从转移缓存中消除了最后一次 TLS 访问。v0.5.46 修复了一个 PIC miss 处理器的 bug：字段超过 8 个的对象会读到内联槽之外的未初始化内存（关闭 #55）。v0.5.78 加了一个守卫，防止 PropertyGet 的 PIC 把像裸数字这样的非指针接收者当作索引对象——过于乐观的类型细化可能导致这种情况，这是 IC 最后一批稳定性问题之一。
      </p>
      <p>
        净效果：属性密集的代码——实际上就是大多数 TypeScript——仅仅靠 IC 就比一周前快了大约 2–3 倍。
      </p>

      <h2>4. 整数、位运算与 <code>| 0</code> 模式</h2>
      <p>
        NaN-boxing 让每个数字都是 f64。TypeScript 程序员用 <code>x | 0</code> 来强制整数语义。V8 花了十五年让它变得廉价。Perry 这一周都在追赶。
      </p>
      <p>按顺序列出的改动栈：</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.48</strong>：为 <code>(int / const) | 0</code> 生成 <code>sdiv</code>。LLVM 会折叠为 <code>smulh + asr</code>，约 2 个周期，而 <code>fdiv</code> 要约 10 个。</li>
        <li><strong>v0.5.48</strong>：在 Uint8ArrayGet 边界上使用 <code>@llvm.assume</code>。用一个向量化器能推理的基本块替代边界检查的分支 + phi 菱形。</li>
        <li><strong>v0.5.49</strong>：修复位运算在 NaN/Infinity 上按 ToInt32 规范产生 0。正确性优先。</li>
        <li><strong>v0.5.50</strong>：在已知有限值时跳过 5 条 NaN/Inf 守卫指令的 <code>toint32_fast</code>。再加上对小辅助函数的 <code>alwaysinline</code> 和 clamp 检测。</li>
        <li><strong>v0.5.52</strong>：用 <code>smin</code>/<code>smax</code> intrinsic 直接处理 clamp 函数。clamp 是继自增之后最常见的整数模式。</li>
        <li><strong>v0.5.53</strong>：在已知有限的值上，<code>x | 0</code> 和 <code>x &gt;&gt;&gt; 0</code> 成为 noop——只剩 <code>fptosi + sitofp</code>，完全不需要守卫。</li>
        <li><strong>v0.5.56</strong>：i32 原生位运算；Uint8ArrayGet/Set 使用 i32 索引和值。</li>
        <li><strong>v0.5.58、v0.5.60</strong>：<code>Math.imul</code> 降级为原生 i32 乘法，而不是 polyfill 路径。polyfill 检测识别出用户手写的 <code>Math.imul</code> 垫片并替换它。</li>
        <li><strong>v0.5.59</strong>：纯函数 init 内联 + 整数局部变量播种。当被调用函数小且纯时，函数内整数分析可以跨越调用边界看清。</li>
        <li><strong>v0.5.37–v0.5.40</strong>：累加器模式整数算术快速路径。经典的 <code>for (...) acc += f(i)</code> 循环在类型允许时，从头到尾都保持在 i32 上。</li>
      </ul>
      <p>
        v0.5.41 是一个微妙的改动。当 codegen 看到一个模块级的 <code>const K: number[][] = [[...], ...]</code> 时，它把整个结构降级为 <code>.rodata</code> 中的扁平 <code>[N x i32]</code> 常量。<code>K[y][x]</code> 变成一次 <code>getelementptr + load i32</code>。结合 v0.5.43 中整数分析的桥接，这使得 <code>image_conv</code>（对 4K RGB 帧做 5×5 高斯模糊）<strong>在一个版本里就获得了 3 倍加速</strong>。
      </p>

      <h2>5. Buffer 和 Uint8Array</h2>
      <p>
        二进制工作负载——加密、图像处理、解析、网络——都依赖 Buffer 和 Uint8Array。v0.5.64 给了它们<strong>类型化指针槽加 <code>noalias</code> 元数据</strong>。以前 Buffer 是存在 <code>alloca double</code> 中的 NaN-boxed double，现在它是存在 <code>alloca i64</code> 中的裸 <code>i64</code> 指针，并带有 LLVM 注释告诉优化器&ldquo;这个指针不会和作用域内其他指针产生别名&rdquo;。这解锁了优化器本来不敢做的 load/store 重排、向量化和寄存器分配。
      </p>
      <p>
        v0.5.80 关闭了最后一个正确性问题：buffer 的 <code>alias-scope</code> 计数器原本是模块级的，却被按函数重置，在极少数情况下可能让 LLVM 跨越不应共享 scope ID 的作用域进行推理。现在计数器是模块级的，<code>noalias</code> 的故事无懈可击。
      </p>
      <p>
        v0.5.53 让 <code>Uint8ArraySet</code> 变为无分支——用掩码存储替代在越界时写 0 的 if/else。v0.5.54 为较长的模式加入了 <strong>Two-Way indexOf</strong>，还有 arena 分配的 <code>split</code>，两者一起弥合了字符串密集的 Buffer 解析上的大部分差距。
      </p>

      <h2>6. 字符串：ASCII 是快速路径</h2>
      <p>
        JavaScript 字符串是 UTF-16，但大多数现实世界的字符串（key、标识符、HTTP 头、JSON 脚手架）都是 ASCII。v0.5.71 为 ASCII 字符串加入了 <strong>O(1) 的 <code>charCodeAt</code> 和 <code>codePointAt</code></strong>——没有 UTF-16 扫描，只是一次字节加载。v0.5.20 已经让 <code>indexOf</code>、<code>slice</code> 和 <code>charAt</code> 在 ASCII 上绕过 UTF-16 扫描。
      </p>
      <p>
        同一版本中还有一个正确性说明：<code>String.length</code> 现在返回 UTF-16 代码单元（ECMAScript 规范），而不是字节数。这修复了一个潜伏的 bug：<code>&quot;caf&eacute;&quot;.length</code> 之前返回 5 而不是 4。
      </p>

      <h2>7. 服务器现在真的不宕机了</h2>
      <p>
        本周最不光彩却最能被用户感知的工作，是让长期运行的 Node 风格服务器——Fastify、ws、http、net——不再在几分钟后崩溃。
      </p>
      <p>
        这些崩溃都有一个共同的根因：GC 不知道监听器闭包的存在。当你写 <code>wss.on(&apos;message&apos;, handler)</code> 时，闭包会捕获变量，这些变量作为字段存在于一个 GC 分配的 cell 中。如果 GC 根扫描器不知道去访问这些 cell，它们的捕获就会被回收，下一次 message 事件就会解引用已释放的内存。
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.26</strong>：对 <code>net.Socket</code> 事件监听器闭包做根扫描（关闭 #35）。</li>
        <li><strong>v0.5.27</strong>：扩展到 <code>ws</code>、<code>http</code>、<code>events</code>、<code>fastify</code>。</li>
        <li><strong>v0.5.28</strong>：将模块级全局变量注册为 GC 根（关闭 #36）。上一层的生命周期 bug。</li>
        <li><strong>v0.5.21</strong>：Fastify/WebSocket 请求处理器内 <code>gc()</code> 的安全性——显式 GC 调用在请求处理器持有 arena 指针时运行（关闭 #31）。</li>
      </ul>
      <p>
        和 GC 工作并行的是，v0.5.20 交付了一个<strong>主事件循环</strong>——真正的循环，不是占位符——让 WebSocket 和基于定时器的服务器持续存活，而不是在最后一次同步调用返回后就退出（参考 #28）。这是对任何试图把 Perry 作为生产 HTTP 服务器运行的用户来说影响最大的一个修复。Fastify 现在能持续运行。WebSocket 服务器现在能持续运行。
      </p>
      <p>
        v0.5.19 修复了 JSValue FFI 参数/返回值的 SysV AMD64 ABI 不匹配——在 Linux 上这个问题会让原生 FFI 调用悄悄损坏参数。v0.5.18 为 <code>axios</code>（get/post/put/delete/patch）加入了原生分派，包括 <code>response.status</code> 和 <code>response.data</code>。v0.5.30 修复了 <code>fastify request.header()</code> 和 <code>request.headers[]</code> 的分派，之前它们对大小写不敏感的查找返回 undefined。
      </p>

      <h2>8. <code>@perry/postgres</code>：让这一切成为必要的驱动</h2>
      <p>
        本周的很多工作都由一个工作负载驱动：让一个完整的、与 Node 兼容的 <a href="https://github.com/PerryTS/postgres" className="text-amber-400 hover:text-amber-300">Postgres 驱动</a>在 Perry 原生上运行。这个驱动支持 TLS，拥有跨模块的 codec 注册表，支持 cancel/close/notify，现在可以与 <code>pg</code>、<code>postgres.js</code> 和 <code>tokio-postgres</code> 对标。
      </p>
      <p>驱动侧的性能工作与编译器侧并行进行：</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>提升每列 codec</strong>，并去掉每单元 Buffer 拷贝。对 int8 使用 BigInt(string)，避免中间分配。</li>
        <li><strong>对象形式行的动态每 shape Row 构造器</strong>。如果你的查询总是返回相同的列，驱动会在第一次时构建一个 shape 专用的行构造器并复用——这与编译器的 PIC 结合起来，使得行的字段访问和任何其他对象的字段访问一样快。</li>
        <li><strong><code>parseTypes: &apos;minimal&apos;</code> 选项</strong>，供希望对 int8/numeric/date 获取原始字符串的调用方使用。</li>
      </ul>
      <p>
        这正是编译器一直想要催生的正反馈循环。真实的驱动暴露真实的瓶颈。瓶颈变成一个可以作为 GitHub issue 提交的单行复现用例。一周的编译器修复之后，驱动更快了，编译器对所有人也更快了。这就是整个计划，被压缩到了七天里。
      </p>

      <h2>9. 值得一提的正确性修复</h2>
      <p>
        性能工作暴露正确性问题，就像清理河道会捞出购物车。列出部分：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Promise.race</strong> 在 rejection 时读取了 <code>.value</code> 而不是 <code>.reason</code>，导致 rejection 被静默吞掉（v0.5.13–v0.5.14）。</li>
        <li><strong>Promise.any</strong> 现在在所有输入 promise 都 reject 时正确抛出 <code>AggregateError</code>。增加了 <code>Promise.withResolvers</code>，修复了 <code>queueMicrotask</code> 的顺序问题。</li>
        <li><strong><code>[...&quot;hello&quot;]</code></strong> 现在生成字符数组，而不是损坏的对象（关闭 #16）。</li>
        <li><strong>BigInt 算术和 <code>BigInt()</code> 强制转换</strong>（关闭 #33）。i64 bigint 快速路径（v0.5.29）让常见情况变得廉价。</li>
        <li><strong>Buffer.indexOf / Buffer.includes</strong> 在传入数字字节参数时，原本比较的是 buffer 指针而不是字节值（关闭 #56）。</li>
        <li><strong>NaN/Infinity 的位运算</strong>按 ToInt32 规范产生 0（关闭 #57）。</li>
        <li><strong>Windows x86_64</strong>：五项平台特定修复——<code>localtime</code>、<code>clang</code> 发现、以及一批 codegen 调整——让 Windows x86_64 重新回到绿色（v0.5.72）。</li>
      </ul>

      <h2>10. 数字</h2>
      <p>
        上一篇文章的头条基准是 <code>factorial</code> 比 Node 快 24.6 倍。那个数字没变。本周变化的是围绕它的一切：
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Workload</th>
              <th className="text-right py-2 px-3">v0.5.12</th>
              <th className="text-right py-2 px-3">v0.5.80</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">JSON.parse（20 条记录的 schema）</td><td className="text-right py-2 px-3">比 Node 慢 547 倍</td><td className="text-right py-2 px-3">比 Node 慢 1.3 倍</td><td className="text-right py-2 px-3 text-green-400 font-semibold">~420x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">image_conv（4K 5×5 模糊）</td><td className="text-right py-2 px-3">1,980ms</td><td className="text-right py-2 px-3">457ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">4.3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">属性密集型代码（PIC 命中）</td><td className="text-right py-2 px-3">基线</td><td className="text-right py-2 px-3">2–3x</td><td className="text-right py-2 px-3 text-green-400">2–3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3 text-green-400">1.3x</td></tr>
            <tr><td className="py-2 px-3">负载下 Fastify 的持续运行</td><td className="text-right py-2 px-3">约 60 秒后崩溃</td><td className="text-right py-2 px-3">无限期</td><td className="text-right py-2 px-3 text-green-400">∞</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        对 Node 的完整 15 项基准套件仍然是 14 胜 1 平——和上一篇文章同样的表格，每一项的数字都略有改善。本周真正的进展出现在那套基准之外的工作负载上：JSON、图像处理、长时间运行的服务器。差距曾经就在那里，如今被弥合的正是那里。
      </p>

      <h2>11. 接下来</h2>
      <p>
        我们仍在追赶的一项基准是 <code>image_conv</code> 对比 Zig。Perry 是 457ms；Zig 是 246ms。这个差距是架构层面的，不是单个优化 pass 级别的，它分布在三个地方：
      </p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>类型化 buffer 局部变量</strong>。本周大多数 Buffer 工作已经落地，但 buffer 类型的函数参数和局部变量在每次访问时仍然要解箱。我们用于循环计数器的 <code>i64</code> 槽方法需要扩展到 buffer。</li>
        <li><strong>内部/边界循环拆分</strong>。模糊循环对每个像素都做 clamp，包括 99.9% 不需要 clamp 的像素。把循环拆分为边界区域（需 clamp）和内部区域（无需 clamp），就能让 LLVM 用 NEON <code>ld3</code>/<code>st3</code> 向量化内部。</li>
        <li><strong>双 ABI 的 FNV-1a 哈希</strong>。哈希辅助函数是通过 NaN-box ABI 调用的。把它特化为热路径上的裸 i64 输入/输出是几个小时的工作，能在每个哈希密集的工作负载上得到回报。</li>
      </ol>
      <p>
        这些都记录在 <code>PERF_ROADMAP.md</code> 里。期待在下一周期看到它们。
      </p>

      <h2>收尾</h2>
      <p>
        这一周的模式——68 个补丁版本，几乎全是性能，一个 JSON 差距从 547 倍降到 1.3 倍——正是你越过 LLVM 切换那座山进入好的一侧时会发生的事。优化器现在是盟友，而不是墙；剩下的大部分工作都是小而具体、可测量的：找一条慢路径，弄清优化器为什么穿不透它，暴露出结构，再次测量。这些 commit 没有哪个是奇技淫巧。它们只是被应用到了需要它们的地方。
      </p>
      <p>
        如果你想试用其中任何一项：
      </p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        源码：<a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}—— 文档：<a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}—— 更新日志：<a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>
        issues、复现用例，以及跑得不够快的基准：请继续发来。这种节奏之所以可行，是因为 bug 报告足够具体，可以变成一行复现代码。这篇文章里的每个 commit 都带着一个 <code>#N</code>，是有原因的。
      </p>
      <p>—— Ralph</p>
    </>
  );
}
