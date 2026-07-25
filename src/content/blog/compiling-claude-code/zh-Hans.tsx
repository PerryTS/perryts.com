export default function Content() {
  return (
    <>
      <p>
        6 月 16 日，指令只有一句话：<em>&ldquo;去把 Claude Code 的文件夹翻出来，把里面（编译、压缩过的）JavaScript 弄出来……看看我们能不能把它编译了 :D&rdquo;</em> 当那个显而易见的反对意见冒出来——这会很残酷——得到的回答才是真正的论点：<em>&ldquo;是很残酷，但这也是一次真正的直觉检验和极限检验，这正是我想做这件事的原因。在发现极限这件事上，没有什么能替代真实世界的应用。&rdquo;</em>
      </p>
      <p>
        一个月后，一个由 Perry 编译出的 Anthropic Claude Code CLI 二进制文件启动了：它能跑通 <code>/login</code> 的 OAuth 流程，从 API 流式接收真实响应，并把你键入的字符绘制出来。走到这一步，靠的是<strong>6 月 20 日到 7 月 17 日之间合并进 Perry 的 160 个 pull request</strong>——一个形同虚设的 <code>MessageChannel</code>、RegExp 头部缺失的 GC 写屏障、一条只在真实 API 上才会空转、在我们的 mock 上从不空转的 <code>continue</code> 语句，以及大约一百五十个其他问题。
      </p>
      <p>
        本文就是这趟旅程的记录。写这篇不是因为编译别人的 CLI 是一个产品——我们不会发布这个二进制文件，也永远不会——而是因为，这是我们迄今为止用来对准 Perry 的所有工具里，效率最高的一件找 bug 利器。
      </p>

      <figure className="my-8">
        <img
          src="/blog/compiling-claude-code/claude-code-session.png"
          alt="一个 macOS 终端窗口，正在从 /tmp/verify 运行一个 Perry 编译出的 Claude Code 二进制文件：v2.1.112 的启动横幅、一次成功的 /login、提示语“awesome, who are you?”、一段流式返回的回复，以及干净地退回到 shell。"
          width={1708}
          height={926}
          className="w-full rounded-lg border border-slate-800"
        />
        <figcaption className="text-sm text-slate-400 mt-3">
          那条命令行里没有 <code>node</code>。<code>/tmp/verify/cc_fptest_dbg25</code> 是一个单一的原生可执行文件，由 <code>perry compile</code> 从官方发布的 <code>cli.js</code> 直接产出——登录、流式返回一个真实答案，并在 Ctrl-C 时干净退出。既然文件名本身就在邀人发问：<code>dbg25</code> 是本文写作时仍在进行的那次 GC 调查里，一个诊断系列构建中的第 25 个版本——带调试符号，并且关闭了写屏障消除，使得<em>每一次</em>数组写入都会发出一个屏障。它比普通构建的开销更大，而不是更小。再往下的性能表格，是在不同的、未插桩的二进制文件上测得的。
        </figcaption>
      </figure>

      <h2>&ldquo;编译 Claude Code&rdquo; 到底意味着什么</h2>
      <p>
        目标是 npm 发布的那份成品。<code>npm pack @anthropic-ai/claude-code@2.1.112</code> 会给你一个 <code>cli.js</code>：<strong>13 MB 压缩过、可自执行的 JavaScript</strong>，带一个 <code>#!/usr/bin/env node</code> shebang。没有源码，没有 sourcemap，也没有我们自己的构建步骤。我们把 <code>perry compile</code> 直接指向那份文件，不做任何修改，要求它产出一个原生可执行文件。
      </p>
      <p>
        Perry 咀嚼它大约 37 分钟，产出跨越 <strong>16,023 个函数</strong>、总计约 207 MB 的 IR，链接成一个约 180 MB 的二进制文件。这些函数无一例外用的都是单字母命名，也没有类型注解，而整套东西必须提前完成——没有 JIT，没有 <code>eval</code>，编译器猜错了也没有惰性回退到解释器这条退路。如果 Perry 把这 16,023 个函数里的哪一个降级（lower）错了，没有任何东西能兜住它。
      </p>
      <p>
        这套评分阶梯来自我们内部的压力测试套件，而且它是故意设计得不留情面：
      </p>
      <pre><code>{`parse    → perry couldn't even parse it
compile  → parsed, but HIR/codegen errored
link     → codegen ok, but cc/ld failed
run      → linked, but the binary crashed / hung / exited non-zero
ran-ok   → binary exited 0
correct  → output byte-matches node --experimental-strip-types`}</code></pre>
      <p>
        <code>correct</code> 是唯一算数的档位。Node v26 是标准答案；任何和 Node 打印结果不是逐字节相同的输出，在证明并非如此之前，都算 Perry 的 bug。
      </p>

      <h2>为什么偏偏是这个应用</h2>
      <p>
        一个编码 agent 的 CLI，对提前编译来说是异常棘手的一堆 JavaScript。在一个二进制文件里，你会遇到：通过 Ink 把 React 的 reconcile 结果渲染进终端、一个 raw-mode 的 stdin 读取器、一个每一帧都要跑正则的、饱和着 ANSI 和 emoji 的渲染器、一个流式的 SSE HTTP 客户端、启动时构建的 zod schema、一段 OAuth 流程、<code>worker_threads</code>、被当作宏任务调度器使用的 <code>MessageChannel</code>、持有 fiber 状态的 WeakMap、动态的 <code>require</code>，以及一个按文件描述符往 stdout 写数据的文件系统层。
      </p>
      <p>
        这些每一项都对应 Perry 的一个不同子系统，而这个应用会<em>同时</em>、大规模地、在 GC 压力下，一连几分钟地把它们全都用上。我们自己的测试套件——3,000 个 Rust 单元测试、数千个 TypeScript 回归测试程序、Node API 一致性矩阵、test262——全都是面向&ldquo;钉住已知行为&rdquo;设计的。而这个 bundle 面向的是&ldquo;找到没人想过要去钉住的行为&rdquo;。
      </p>

      <h2>一堵墙接一堵墙</h2>
      <p>
        这项工作只朝一个方向推进：清掉眼前这堵墙，找到下一堵。压缩版时间线：
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">日期</th>
              <th className="text-left py-2 px-3">里程碑</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">6 月 21 日</td><td className="py-2 px-3"><code>--help</code> 能原生运行，退出码为 0</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">6 月 22 日</td><td className="py-2 px-3">真正的子命令不再在启动时挂起</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">6 月 23 日</td><td className="py-2 px-3"><code>-p</code> 打开了一个到 api.anthropic.com 的 ESTABLISHED TCP 套接字</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">6 月 24 日</td><td className="py-2 px-3">zod schema 能正确构建；到达了鉴权路径</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">6 月 27 日</td><td className="py-2 px-3">TUI 渲染出来了——logo、欢迎框、输入框</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">7 月 9 日</td><td className="py-2 px-3">第一次完整的往返：<code>-p</code> 对真实 API 发起请求，打印出回复，退出码 0</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">7 月 10 日</td><td className="py-2 px-3">Node 对比 Perry 的差分测试框架：12/12 完全一致</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">7 月 13 日</td><td className="py-2 px-3">在 <code>-p</code> 文本 + JSON、TUI 渲染、文件系统上与 Node 逐字节一致</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">7 月 16 日</td><td className="py-2 px-3">键入的字符终于出现在输入行里了</td></tr>
            <tr><td className="py-2 px-3">7 月 17 日</td><td className="py-2 px-3">手工验证了完整闭环：启动 → <code>/login</code> → API 响应 → 打字输入</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        每一个修复都作为一个独立的 pull request 上游提交，附带一个最小化、通用的复现用例。没有一个会提到它是从哪个应用里发现的——这是从第一天起就定下的规矩。一个读 changelog 的 Perry 用户看到的是&ldquo;for-await 驱动器中的 <code>continue</code> 跳过了迭代器推进&rdquo;，而不是&ldquo;我们当时正在尝试编译某个人的 CLI&rdquo;。这些 bug 本身是真实存在的，与暴露它们的那辆&ldquo;车&rdquo;无关。
      </p>

      <h2>五个值得这趟旅程的 bug</h2>

      <h3>1. MessageChannel 曾是个&ldquo;礼貌的&rdquo;空操作</h3>
      <p>
        <code>--help</code> 在 6 月 21 日跑通了。而每一个<em>真正的</em>子命令——<code>doctor</code>、<code>agents</code>、<code>mcp list</code>——都永远挂起。不是在忙：<code>sample</code> 显示进程处于停滞状态，<code>lsof</code> 显示没有子进程、没有套接字，只有两个管道。
      </p>
      <p>
        Perry 的 <code>MessageChannel</code> 把 <code>postMessage</code> 装成了一个空操作，把 <code>onmessage</code> 装成 <code>null</code>。这本来无伤大雅，直到你遇上 React 调度器的那种模式——它把一个消息通道当作自己的宏任务调度器来用：
      </p>
      <pre><code>{`const ch = new MessageChannel();
ch.port1.onmessage = flushWork;
ch.port2.postMessage(null);   // schedule the next tick`}</code></pre>
      <p>
        消息被丢弃，回调从未运行，事件循环就在自己的唤醒管道上永远空转。<a href="https://github.com/PerryTS/perry/pull/5530" className="text-amber-400 hover:text-amber-300">#5530</a> 给端口配上了真正的同线程投递——纠缠对、一个 FIFO 队列、通过 <code>setImmediate</code> 宏任务完成投递，以及一个 GC 根扫描器，让排队中的消息能在一次垃圾回收后存活下来。
      </p>

      <h3>2. Object.prototype 上的一个访问器，代价是 42 秒</h3>
      <p>
        在挂起之前，同样的这些子命令会有几十秒的时间处于 CPU 满载状态。Profiling 把矛头指向了通用的 <code>[[Set]]</code> 路径，而根因是一个进程全局的标志位。
      </p>
      <p>
        Perry 为动态属性写入准备了一条快速路径，它的开关条件是&ldquo;<code>Object.prototype</code> 当前是否带有任何描述符？&rdquo;这个 bundle 在启动时恰好在 <code>Object.prototype</code> 上装了一个访问器。这把这个标志位在整个进程范围内翻转了，从那之后，程序里<em>每一次</em>动态写入都要走那条缓慢的拦截遍历路径，其复杂度是 O(自有键数量)。构建一个宽对象因此变成了平方级：
      </p>
      <pre><code>{`20,000-property build, clean process:                 16 ms
20,000-property build, after one Object.prototype accessor:  42,394 ms`}</code></pre>
      <p>
        <a href="https://github.com/PerryTS/perry/pull/5524" className="text-amber-400 hover:text-amber-300">#5524</a> 把这个全局标志位换成了一个逐键的问题——<em><code>Object.prototype</code> 对<strong>这个</strong>键是否有一个自有属性？</em>一个不存在的键不可能被拦截，所以这次写入可以安全地走快速路径。42 秒 → 23 毫秒，拦截行为依然正确。
      </p>
      <p>
        接着，同样的形态在 class 实例上重新出现，而快速路径原本把这类实例彻底排除在外：在一个普通对象上构建 20,000 个键要 25 毫秒，在一个 <code>class</code> 实例上则要 44 秒。这次要小心地修——一个天真的原型链检查会跳过继承来的 setter，并悄无声息地破坏数据——所以 <a href="https://github.com/PerryTS/perry/pull/5528" className="text-amber-400 hover:text-amber-300">#5528</a> 改为通过 class 注册表来解析实例的原型，并加了一个 O(1) 的宽键索引。回到 30 毫秒，重新变回线性。
      </p>

      <h3>3. 只有真实 API 才能触发的那个 bug</h3>
      <p>
        这是我们最爱讲给别人听的那个。到 7 月初，编译出的二进制文件针对我们本地的 mock 服务器能完整走完一轮 <code>-p</code>：连接、POST、读取 SSE 流、打印回复、退出码 0。而对真正的 Anthropic API，它每次都永远挂起。
      </p>
      <p>
        调试的链条是这样的：一个正向代理 mock 证明了完整的 200 响应完好无损地到达了 → 一个喂进真实抓包字节流的回放 mock，在本地复现出了这次挂起 → 对 SSE 事件列表做二分定位，找到了元凶事件 → 一个十行的复现用例。
      </p>
      <p>
        真实的 API 会发送 <code>event: ping</code> 帧。我们的 mock 从来不发。而 <code>ping</code> 恰恰是 SDK 的流循环用一个裸的 <code>continue</code> 跳过的那个事件。Perry 把 <code>for await</code> 降级成了一个驱动器，其迭代器的推进语句位于循环体的<em>末尾</em>：
      </p>
      <pre><code>{`// what perry emitted
while (!done) {
  ...body...                   // a "continue" here skips the advance…
  result = await it.next();    // …so this never runs. Spin forever.
}

// what it emits now
while (true) {
  result = await it.next();
  if (result.done) break;
  ...body...
}`}</code></pre>
      <p>
        有六个独立的降级位置都是同样的形态。<a href="https://github.com/PerryTS/perry/pull/6196" className="text-amber-400 hover:text-amber-300">#6196</a> 把所有这些位置的推进语句都挪到了顶部。我们一再重新学到的教训是：一个能通过的 mock，只能证明这个 mock 本身。
      </p>

      <h3>4. 一个比自己的 pattern 字符串还长寿的正则</h3>
      <p>
        TUI 会渲染出来，然后在几秒钟内死于 <code>SIGBUS</code>——在一个窗口缩放压力测试框架下，12 次运行崩溃了 12 次，每次都在不同函数里的不同地址上。几周的调查时间都投在了一些后来被 A/B 测试推翻的 GC 理论上，其中包括我们自己的一个&ldquo;修复&rdquo;，后来证明它并不健全，不得不撤回。
      </p>
      <p>
        真正的根因是四行 Rust 代码。<code>js_regexp_new</code> 分配一个 RegExp 头部，并用裸写入的方式存储它的 <code>pattern</code> 和 <code>flags</code> 字符串指针——<strong>没有写屏障</strong>。一个老年代对象指向一个刚生成的年轻代字符串，而收集器从未被告知这条边的存在。一次 minor GC 把这些字符串从一个存活的 RegExp 底下扫走了，下一次读取那个已释放的槽位时就出了错。
      </p>
      <p>
        为什么这个问题只在这里冒出来？因为一个终端 UI 是被正则填满的——ANSI 解析和 emoji 宽度测量在每一帧都要跑一遍模式匹配——所以分配和收集之间的那个窗口，一分钟内会被跨越成千上万次。我们的最小复现用例，6,000 个正则加上刻意制造的分配抖动，<em>从未</em>触发过它。而这个 bundle 每次都能触发。<a href="https://github.com/PerryTS/perry/pull/6288" className="text-amber-400 hover:text-amber-300">#6288</a> 给这两个字段都补上了它们一直就需要的写屏障。
      </p>

      <h3>5. 你打出的字符确实存在过。是这一帧把它们扔掉了。</h3>
      <p>
        最顽固的一堵墙：整个 UI 绘制得完美无缺——欢迎框、输入框、光标块、状态行。键入 <code>/</code> 能打开命令菜单，说明按键确实到达了 React。但字母就是从来不出现在输入行里。
      </p>
      <p>
        插桩过的构建显示，Perry 在每个阶段都正确地绘制了键入的字符，然后 <code>onRender</code> 在绘制<em>之后</em>抛出了异常——落进一个 Ink 的 <code>try/catch</code>，被吞掉了。这一帧在提交前就被放弃了，于是后续每一次渲染都是建立在一个空帧之上。这个应用看起来完全健康，同时又对你的输入视而不见。
      </p>
      <p>
        这一个症状背后，藏着两个相互独立的 bug：
      </p>
      <ul>
        <li>
          <p>
            <a href="https://github.com/PerryTS/perry/pull/6453" className="text-amber-400 hover:text-amber-300">#6453</a> — Perry 对 <code>charAt</code>/<code>codePointAt</code>/<code>split</code> 的内联降级，在一个非字符串的接收者上调用了 ToString，却没带上必需的可强制转换性检查。于是 <code>undefined.codePointAt(0)</code> 悄无声息地返回了 <code>117</code>——来自字符串 <code>&quot;undefined&quot;</code> 中 <code>&quot;u&quot;</code> 的码点——而不是抛出异常。一个凭空<em>捏造</em>出看似合理数据的 bug，远比一个会崩溃的 bug 更糟糕。
          </p>
        </li>
        <li>
          <p>
            <a href="https://github.com/PerryTS/perry/pull/6471" className="text-amber-400 hover:text-amber-300">#6471</a> — 真正的拦路虎。当一个数组增长时，Perry 会在旧地址上留下一个永久的转发桩。minor sweep 会去回收这些桩，而与此同时，一个老年代的父对象仍然指着其中一个：渲染器的字符缓存持有一个增长之前的指针，指向一个未被标脏的页面。透过这个过期的桩读取，产出的是一个垃圾长度，于是每一帧都中止了。现在 minor 回收会保留所有的桩；完整的 trace 才会按标记来回收它们。
          </p>
        </li>
      </ul>
      <p>
        修好这两个之后，又暴露出了第三层——在增量标记期间&ldquo;生而为黑&rdquo;的对象从未被 trace 过，于是任何只能通过它们到达的东西，都会在还存活的时候被扫掉（<a href="https://github.com/PerryTS/perry/pull/6494" className="text-amber-400 hover:text-amber-300">#6494</a>），以及布局掩码低报了溢出槽位的数量，导致收集器跳过了它们（<a href="https://github.com/PerryTS/perry/pull/6506" className="text-amber-400 hover:text-amber-300">#6506</a>）。这两个都是那种会在<em>任何</em>编译出的程序里，制造出五十分之一概率的神秘崩溃的健全性漏洞。靠测试套件，我们是不会发现它们的。
      </p>

      <h2>如何调试一个 13 MB 的压缩二进制文件</h2>
      <p>
        以上这些没有一个是靠读代码能找出来的。让这一切变得可控的，是这些工具：
      </p>
      <ul>
        <li>
          <p>
            <strong>一个以 Node 为标准答案的差分测试框架。</strong>每一个假设都会变成一个小的 TypeScript 程序，同时在 <code>node --experimental-strip-types</code> 和一个 Perry 二进制文件下运行，逐字节比对。它自己就发现了一些 bug——一个只被用作 <code>instanceof</code> 右操作数的 class 表达式，被当成死代码消除掉了，因为十一个分析 pass 都看不透那种节点类型（<a href="https://github.com/PerryTS/perry/pull/6245" className="text-amber-400 hover:text-amber-300">#6245</a>）。
          </p>
        </li>
        <li>
          <p>
            <strong>三个 mock API 服务器。</strong>一个记录日志的 mock、一个抓取真实响应字节的正向代理，以及一个把那些精确字节确定性地回放出来的回放服务器。正是这个回放服务器，把&ldquo;针对生产环境会挂起&rdquo;变成了一次本地可复现的问题。
          </p>
        </li>
        <li>
          <p>
            <strong>一个会应答终端查询的 PTY 测试框架。</strong>一个笨拙的伪终端只会给你 50 个字节，然后卡住。这个应用会探测光标位置（<code>ESC[6n</code>）、设备属性（<code>ESC[c</code>）和背景色（<code>OSC 11</code>），并在绘制之前等待这些查询的应答。回答了它们，你就能得到完整的 3,331 字节欢迎画面——以及一次 Node 和 Perry 之间可逐字节比对的渲染结果。
          </p>
        </li>
        <li>
          <p>
            <strong>用于符号化的 link map。</strong>被 strip 过的 180 MB 二进制文件会产出满是原始偏移量的崩溃报告；<code>ld64 -map</code> 的输出加上一个二分脚本，能把这些偏移量重新变回函数名。
          </p>
        </li>
        <li>
          <p>
            <strong>什么都做 A/B。</strong>由此浮现出的规矩，被大写字母写在交接笔记的最上面：<em>永远不要直接继承一个理论——去测试它。</em>针对同一个 bug 的四个连续的根因假设，每一个都被 A/B 运行推翻了。有一个我们追了好几天的校验器信号（&ldquo;445 条缺失的 old→young 边&rdquo;），最后被证明只是一个测量上的假象——那项检查是在清空和恢复 remembered set 之间运行的。代码自己的注释里其实警告过这一点。
          </p>
        </li>
      </ul>

      <h2>它现在到底走到了哪一步</h2>
      <p>
        老实说：它能跑，而且很慢。
      </p>
      <p>
        如今能跑通的部分，在输出可比对的地方与 Node 逐字节一致：启动、<code>--help</code>、<code>--version</code>、针对真实 API 的一次性 <code>-p</code> 模式（包括错误分类和 JSON 信封）、完整的 TUI 渲染、OAuth 的 <code>/login</code> 流程、流式响应，以及打字输入。下面是一镜到底的完整闭环——启动、<code>/login</code>、提问、流式返回答案、退出：
      </p>

      <figure className="my-8">
        <video
          controls
          playsInline
          preload="none"
          poster="/blog/compiling-claude-code/claude-code-demo-poster.png"
          className="w-full rounded-lg border border-slate-800"
        >
          <source src="/blog/compiling-claude-code/claude-code-demo.mp4" type="video/mp4" />
          Your browser doesn&apos;t support embedded video.
        </video>
        <figcaption className="text-sm text-slate-400 mt-3">
          63 秒，没有声音，在两处做了剪辑：OAuth 握手中浏览器那一半，以及一个突兀弹出的 macOS 钥匙串提示。终端里的一切都是实时、未经剪辑的——包括启动延迟，也就是本文里最慢的那一部分。
        </figcaption>
      </figure>

      <p>
        还有两件事悬而未决，而且它们很可能其实是同一件事。持续交互使用大约一分钟后，输入就不再被响应了——不崩溃，不报错，它就是停了。而且 <code>ESC</code> 不能打断一个正在进行中的响应，尽管 <code>Ctrl-C</code> 现在能干净地退出了，这在一周前还做不到（这正是你在录屏结尾看到的那次退出）。一条能用的退出路径和一条不能用的中断路径，指向的是和&ldquo;输入死掉&rdquo;同一个嫌疑对象：按键事件不再到达应用，而不是应用自己的处理器出了什么问题。
      </p>
      <p>
        性能方面的情况，是相对于运行同一份 bundle 的 Node 测得的，分别取自&ldquo;正确性落地&rdquo;当天开始的第一轮性能攻坚之前和之后。这些数字来自 7 月 17 日的 <code>cc_final</code> 和 <code>cc_perf2</code>——都是没有编译进任何诊断代码的普通构建，而不是上面截图里那个插桩过的二进制文件：
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">指标</th>
              <th className="text-right py-2 px-3">Node</th>
              <th className="text-right py-2 px-3">Perry（7 月 17 日）</th>
              <th className="text-right py-2 px-3">Perry（之后）</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>--version</code></td><td className="text-right py-2 px-3">328 ms</td><td className="text-right py-2 px-3">1,168 ms</td><td className="text-right py-2 px-3"><strong>227 ms</strong></td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>--help</code></td><td className="text-right py-2 px-3">715 ms</td><td className="text-right py-2 px-3">5,071 ms</td><td className="text-right py-2 px-3">4,099 ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">TUI 首次绘制</td><td className="text-right py-2 px-3">0.76 s</td><td className="text-right py-2 px-3">10.9 s</td><td className="text-right py-2 px-3">8.4 s</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">按键 → 绘制（p50）</td><td className="text-right py-2 px-3">2.2 ms</td><td className="text-right py-2 px-3">111–143 ms</td><td className="text-right py-2 px-3">119–138 ms</td></tr>
            <tr><td className="py-2 px-3">内存占用，空闲状态</td><td className="text-right py-2 px-3">290 MB flat</td><td className="text-right py-2 px-3">~420 MB climbing</td><td className="text-right py-2 px-3">~420 MB climbing</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        <code>--version</code> 现在<strong>反超了 Node</strong>，而这次胜利的来源说出来有点尴尬：编译出的可执行文件导出了 300,281 个符号，所以那次启动大约 80% 的时间都花在 dyld 做弱定义合并上。一个链接器标志把导出符号数砍到 3 个，二进制体积也从 228 MB 降到 197 MB（<a href="https://github.com/PerryTS/perry/pull/6533" className="text-amber-400 hover:text-amber-300">#6533</a>）。把每个独特的正则只构建一次而不是两次（<a href="https://github.com/PerryTS/perry/pull/6534" className="text-amber-400 hover:text-amber-300">#6534</a>），以及缓存逐次写入的拦截检查（<a href="https://github.com/PerryTS/perry/pull/6532" className="text-amber-400 hover:text-amber-300">#6532</a>、<a href="https://github.com/PerryTS/perry/pull/6541" className="text-amber-400 hover:text-amber-300">#6541</a>），补齐了剩下的部分。
      </p>
      <p>
        关于那 197 MB，在有人拿它说事之前先讲清楚：Perry 静态链接自己的运行时，并提前为全部 16,023 个函数生成机器码，没有什么可以死代码剥离——一个自执行的 bundle 基本上让所有东西都可达，所以没有跨 bundle 的 DCE 可以依靠——这意味着这 197 MB 是一整个程序<em>加上</em>它的运行时装在一个文件里，对照的是 <strong>Node v26 二进制文件在读你的 JavaScript 的第一行之前，自身就重达 138 MB</strong>。
      </p>
      <p>
        按键那一行要仔细读，因为&ldquo;之后&rdquo;那个数字看起来更差了。其实不是：那些是多次重复运行的区间，它们互相重叠，所以中位数并没有朝任何一个方向移动——这是运行间的方差，不是回归。而且这也正是我们预期中的结果。这三处改动都触及的是链接步骤、正则构建和<em>写入</em>路径；而按键中位数主要受属性<em>读取</em>路径、每次调用的 rooting 开销，以及落在按键窗口内的 40–80 毫秒 GC 步骤支配。下一轮给出了证明：get/set 快速通道让一个字段访问的微基准测试快了 3 倍，却对这个数字完全没有任何影响（<a href="https://github.com/PerryTS/perry/pull/6539" className="text-amber-400 hover:text-amber-300">#6539</a>）。一个不能在应用里体现出来的微基准测试胜利，就是一次错误的诊断，而我们确实犯过这个错误。
      </p>
      <p>
        内存那一行是当前正在进行的攻坚。Perry 的复制式收集器<em>能</em>做压缩——问题在于，它大约每空闲 45 秒才有资格触发一次，所以在两次触发之间，nursery 会重新长回约 300 MB，而 Node 靠持续不断地压缩保持内存平坦。这是一个触发频率的问题，不是一个算法的问题，比起我们 6 月份所处的位置，这已经是好得多的处境。
      </p>
      <p>
        这些都没有被搁置。就在本文发布的这一刻，内存和性能的攻坚仍在<em>进行中</em>——GC 触发相关的工作今天就在这个二进制文件上跑着——所以上面那张性能表格，正是本文里我们最希望尽快被推翻的部分，而且越快越好。正确性花了一个月、一堵墙接一堵墙地啃了下来。剩下的是一个触发频率问题和一个读取路径问题，两者都已经搞清楚，也都已经在推进中。我们期待这东西感觉起来是顺滑的，而不只是正确的，而且我们期待这一天不会太远。
      </p>

      <h2>我们为什么要做这件事</h2>
      <p>
        这 160 个修复没有一个是关于 Claude Code 本身的。RegExp 头部缺失的写屏障，会在<em>任何</em>一个在负载下构建正则的程序里破坏内存。带 <code>continue</code> 的 <code>for await</code> 会在任何流消费者里空转。<code>MessageChannel</code> 丢消息，会破坏所有 React 调度器形态的应用。<code>Object.prototype</code> 描述符标志位，会让<em>每一个</em>触碰 <code>Object.prototype</code> 的程序，在它最宽的那个对象上变成平方级。
      </p>
      <p>
        这些 bug 一直都躺在 Perry 里——CI 是绿的，test262 的数字在往上涨，Node 一致性矩阵显示 97%。而要把它们都摇出来，靠的是十三兆字节的、别人的压缩 JavaScript，在一个真实的终端里，针对一个真实的 API，做着真实的工作。
      </p>
      <p>
        还有一件事，也是我们觉得最好笑的部分。Perry 不是纯靠手写出来的——它有很大一部分，包括<em>这次</em>攻坚的很大一部分，都是用 Claude Code 写出来的。那些 mock 服务器、PTY 测试框架、差分测试运行器，以及凌晨四点还在二分定位一个 GC bug 的漫漫长夜：都是 agent 会话，由人来审查、合并。不是 Perry 的全部，中间也少不了大量的争论。但足够多，多到这句话反过来说也一样成立。
      </p>
      <p>
        这个吞下了 Claude Code 的编译器，在很大程度上，正是由 Claude Code 造出来的。
      </p>
      <p>
        我们会继续做下去。下一批目标已经排好队了。
      </p>

      <hr className="border-slate-800 my-8" />
      <p className="text-sm text-slate-500">
        Perry 与 Anthropic 没有从属关系，也未获得其认可或背书。Claude Code 是 Anthropic PBC 的商标。本文所述二进制文件，是纯粹作为编译器测试目标，从公开发布的 npm 包构建而来，并不对外分发。
      </p>
    </>
  );
}
