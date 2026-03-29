import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Pry 是一个完全用 TypeScript 编写并用 Perry 编译的原生 JSON 查看器。它不是一个技术演示
        —— 它是我们每天用来检查 API 响应、配置文件和数据转储的真实工具。本文介绍了它是如何
        构建的、如何编译的，以及当你的 TypeScript 编译为原生应用时开发体验是怎样的。
      </p>

      <h2>Pry 的功能</h2>
      <p>
        Pry 读取一个 JSON 文件（或从 stdin 接收 JSON）并在原生窗口中将其渲染为可交互、可导航的树。
        如果你用过 macOS 内置的 Quick Look 查看 JSON，想象一下 —— 但更快、可搜索、并且支持键盘导航。
      </p>
      <p>功能集：</p>
      <ul className="list-disc list-inside">
        <li><strong>树形视图</strong> —— 对象和数组的可折叠节点，带深度指示器和全部展开/折叠功能</li>
        <li><strong>搜索</strong> —— 跨键和值的全文搜索，带实时高亮和匹配导航</li>
        <li><strong>键盘快捷键</strong> —— 方向键导航，回车展开/折叠，斜杠搜索，<code className="text-perry-400">⌘C</code> 复制</li>
        <li><strong>剪贴板</strong> —— 将任何节点或子树复制为格式化的 JSON</li>
        <li><strong>语法着色</strong> —— 字符串绿色，数字橙色，布尔值紫色，null 红色</li>
        <li><strong>状态栏</strong> —— 显示总节点数、当前深度、文件大小和解析时间</li>
      </ul>

      <h2>源代码</h2>
      <p>
        Pry 用标准 TypeScript 编写。没有特殊语法，没有宏，没有构建时代码生成。它使用 Perry 的
        UI API，提供编译为平台特定代码的原生组件。
      </p>
      <p>以下是入口点（为清晰起见已简化）：</p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">pry.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">TreeView</span>, <span className="text-cyan-400">SearchBar</span>, <span className="text-cyan-400">StatusBar</span>, <span className="text-cyan-400">State</span> {"}"}</p>
          <p>  <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">readFile</span>, <span className="text-cyan-400">readStdin</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/fs&quot;</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Read input from file arg or stdin</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">input</span> = process.argv[<span className="text-orange-400">2</span>]</p>
          <p>  ? <span className="text-yellow-400">readFile</span>(process.argv[<span className="text-orange-400">2</span>])</p>
          <p>  : <span className="text-yellow-400">readStdin</span>();</p>
          <p className="mt-3"><span className="text-purple-400">const</span> <span className="text-cyan-400">startTime</span> = Date.<span className="text-yellow-400">now</span>();</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">data</span> = JSON.<span className="text-yellow-400">parse</span>(<span className="text-cyan-400">input</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">parseMs</span> = Date.<span className="text-yellow-400">now</span>() - <span className="text-cyan-400">startTime</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Reactive state</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">searchQuery</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-green-400">&quot;&quot;</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">matchCount</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-3"><span className="text-slate-500">// Build the app</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Pry&quot;</span>, {"{"}</p>
          <p>  width: <span className="text-orange-400">800</span>,</p>
          <p>  height: <span className="text-orange-400">600</span>,</p>
          <p>  minWidth: <span className="text-orange-400">400</span>,</p>
          <p>  minHeight: <span className="text-orange-400">300</span>,</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">0</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">SearchBar</span>({"{"}</p>
          <p>      placeholder: <span className="text-green-400">&quot;Search keys and values...&quot;</span>,</p>
          <p>      onSearch: (<span className="text-cyan-400">q</span>) =&gt; <span className="text-cyan-400">searchQuery</span>.value = <span className="text-cyan-400">q</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">TreeView</span>(<span className="text-cyan-400">data</span>, {"{"}</p>
          <p>      collapsible: <span className="text-orange-400">true</span>,</p>
          <p>      syntaxHighlight: <span className="text-orange-400">true</span>,</p>
          <p>      searchQuery: <span className="text-cyan-400">searchQuery</span>,</p>
          <p>      onMatchCount: (<span className="text-cyan-400">n</span>) =&gt; <span className="text-cyan-400">matchCount</span>.value = <span className="text-cyan-400">n</span>,</p>
          <p>      copyOnClick: <span className="text-orange-400">true</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">StatusBar</span>([</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>){"}"} nodes`</span>,</p>
          <p>      <span className="text-green-400">`Parsed in ${"{"}<span className="text-cyan-400">parseMs</span>{"}"}ms`</span>,</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-cyan-400">matchCount</span>.value{"}"} matches`</span>,</p>
          <p>    ]),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;/&quot;</span>, () =&gt; <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusSearchBar</span>());</p>
          <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;Escape&quot;</span>, () =&gt; {"{"}</p>
          <p>  <span className="text-cyan-400">searchQuery</span>.value = <span className="text-green-400">&quot;&quot;</span>;</p>
          <p>  <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusTree</span>();</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>这就是一个原生应用的核心。没有框架样板代码，没有构建配置，没有平台特定文件。一个 TypeScript 文件。</p>

      <h3>辅助函数</h3>
      <p>
        Pry 还包含一个 <code className="text-perry-400">countNodes</code> 工具函数，递归计算 JSON 树中的所有节点，
        以及一个 <code className="text-perry-400">formatBytes</code> 辅助函数用于显示文件大小。这些都是标准的 TypeScript
        函数 —— 没有 Perry 特有的内容。它们和其他代码一样被编译为原生代码。
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">utils.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">export function</span> <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>: <span className="text-cyan-400">unknown</span>): <span className="text-cyan-400">number</span> {"{"}</p>
          <p>  <span className="text-purple-400">if</span> (<span className="text-cyan-400">data</span> === <span className="text-orange-400">null</span> || <span className="text-purple-400">typeof</span> <span className="text-cyan-400">data</span> !== <span className="text-green-400">&quot;object&quot;</span>) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span>;</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">if</span> (Array.<span className="text-yellow-400">isArray</span>(<span className="text-cyan-400">data</span>)) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">data</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">item</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">item</span>), <span className="text-orange-400">0</span>);</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">const</span> <span className="text-cyan-400">values</span> = Object.<span className="text-yellow-400">values</span>(<span className="text-cyan-400">data</span> <span className="text-purple-400">as</span> Record&lt;<span className="text-cyan-400">string</span>, <span className="text-cyan-400">unknown</span>&gt;);</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">values</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">val</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">val</span>), <span className="text-orange-400">0</span>);</p>
          <p>{"}"}</p>
        </div>
      </div>

      <h2>编译 Pry</h2>
      <p>
        用 Perry 编译 Pry 只需一条命令。不需要 Xcode 项目，不需要 Gradle 配置，不需要 webpack 配置。
        只需将 Perry 指向入口文件并指定目标。
      </p>

      <h3>macOS (ARM64)</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target macos-arm64</p>
          <p className="text-slate-500">Parsing pry.ts...</p>
          <p className="text-slate-500">Resolving imports: perry/ui, perry/fs</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking with AppKit.framework...</p>
          <p className="text-green-400">✓ Built executable: pry (48 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file pry</p>
          <p className="text-slate-300">pry: Mach-O 64-bit executable arm64</p>
          <p className="mt-3"><span className="text-slate-500">$</span> otool -L pry | head -5</p>
          <p className="text-slate-400">pry:</p>
          <p className="text-slate-400">  /System/Library/Frameworks/AppKit.framework/AppKit</p>
          <p className="text-slate-400">  /System/Library/Frameworks/Foundation.framework/Foundation</p>
          <p className="text-slate-400">  /usr/lib/libSystem.B.dylib</p>
        </div>
      </div>
      <p>
        二进制文件为 48 MB，因为它包含完整的 AppKit UI 栈 —— 树形视图渲染、搜索高亮、语法着色和键盘处理。
        相比之下，同样的应用在 Electron 中将超过 200 MB。纯 CLI 的 Perry 应用编译后只有 2-5 MB。
      </p>

      <h3>iOS</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: pry (52 MB)</p>
        </div>
      </div>
      <p>
        iOS 构建链接 UIKit 而非 AppKit。Perry 将相同的 <code className="text-perry-400">TreeView</code> API
        映射到带可展开 section 的 <code className="text-perry-400">UITableView</code>，
        <code className="text-perry-400">SearchBar</code> 映射到 <code className="text-perry-400">UISearchBar</code>，
        触摸事件替代鼠标事件。iOS 构建可以部署到真实设备和模拟器。
      </p>

      <h3>Android</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target android-arm64</p>
          <p className="text-green-400">✓ Built: pry.apk</p>
        </div>
      </div>
      <p>
        Android 构建生成通过 JNI 加载的原生库，打包为 APK。
        <code className="text-perry-400">TreeView</code> 映射到带可展开 view holder 的
        <code className="text-perry-400">RecyclerView</code>，
        <code className="text-perry-400">SearchBar</code> 映射到带
        <code className="text-perry-400">TextWatcher</code> 的 <code className="text-perry-400">EditText</code>，
        状态栏映射到布局底部的 <code className="text-perry-400">TextView</code>。
      </p>

      <h2>底层原理</h2>
      <p>当 Perry 编译 Pry 时，它经历几个阶段：</p>
      <ol className="list-decimal list-inside">
        <li><strong>解析</strong> —— SWC 将 TypeScript 源代码解析为 AST。来自 <code className="text-perry-400">perry/ui</code> 和 <code className="text-perry-400">perry/fs</code> 的导入被解析到 Perry 的内置模块实现。</li>
        <li><strong>类型分析</strong> —— Perry 解析所有类型，包括泛型 <code className="text-perry-400">State&lt;string&gt;</code> 和 <code className="text-perry-400">State&lt;number&gt;</code>，将它们单态化为具体类型。</li>
        <li><strong>平台解析</strong> —— 根据目标标志，Perry 选择适当的 UI 后端。每个 <code className="text-perry-400">TreeView</code>、<code className="text-perry-400">SearchBar</code> 和 <code className="text-perry-400">Button</code> 调用被解析到平台特定的实现。</li>
        <li><strong>IR 生成</strong> —— Perry 生成包含原生 API 调用的中间表示 —— macOS/iOS 的 Objective-C 消息发送、Android 的 JNI 调用、GTK4/Win32 的 C 函数调用。</li>
        <li><strong>代码生成</strong> —— Cranelift 将 IR 编译为目标架构的原生机器码。</li>
        <li><strong>链接</strong> —— 原生代码与平台框架（AppKit、UIKit、Android NDK、GTK4 或 Win32）链接以产生最终可执行文件。</li>
      </ol>

      <h2>无运行时，无 Web View</h2>
      <p>这一点值得强调，因为它是 Perry 与所有其他 TypeScript 转原生方案的核心区别。编译后的 Pry 二进制文件：</p>
      <ul className="list-disc list-inside">
        <li><strong>没有 JavaScript 引擎</strong> —— 没有 V8、没有 Hermes、没有 JavaScriptCore</li>
        <li><strong>没有 web view</strong> —— 没有 Chromium、没有 WebKit、没有 WKWebView</li>
        <li><strong>没有桥接层</strong> —— JS 和原生之间没有序列化消息</li>
        <li><strong>没有框架运行时</strong> —— 没有 React、没有 Flutter 引擎、没有 Dart VM</li>
      </ul>
      <p>
        二进制文件直接调用平台 API。在 macOS 上，它调用 <code className="text-perry-400">objc_msgSend</code>
        与 AppKit 对象交互。在 Android 上，它调用 JNI 函数创建和操作 View。这与原生 Swift 或 Kotlin 应用完全相同。
      </p>
      <p>
        实际结果：Pry 即时启动。没有 VM 启动、没有 JIT 预热、没有脚本解析。进程启动，窗口出现，JSON 被渲染。
        内存使用量只是等效 Electron 应用的零头。
      </p>

      <h2>开发体验</h2>
      <p>构建 Pry 的感觉与构建任何 TypeScript 应用惊人地相似。工作流程是：</p>
      <ol className="list-decimal list-inside">
        <li>在编辑器中编写 TypeScript（VS Code、Zed、Neovim，随你选择）</li>
        <li>运行 <code className="text-perry-400">perry compile pry.ts</code></li>
        <li>执行 <code className="text-perry-400">./pry test.json</code></li>
        <li>迭代</li>
      </ol>
      <p>
        不需要配置 Xcode 项目。不需要安装 Android Studio。不需要花 45 秒的 Gradle 构建。
        Perry 编译器本身很快 —— 解析和编译 Pry 只需几秒钟，我们正在积极优化速度。
      </p>
      <p>
        你编写的是标准 TypeScript。编辑器的类型检查、自动补全和重构工具都能正常工作。
        你可以提取函数、创建模块、使用泛型 —— 你已经熟知的所有 TypeScript 模式。
      </p>

      <h2>我们的收获</h2>
      <p>构建 Pry 教会了我们很多关于 Perry UI API 需要支持什么。一些经验教训：</p>
      <ul className="list-disc list-inside">
        <li><strong>树形视图很复杂。</strong> 展开、折叠、搜索高亮、键盘导航和剪贴板集成都需要协调。Perry 的 <code className="text-perry-400">TreeView</code> 组件在内部处理这些，但我们必须确保原生实现在所有三个平台上保持一致。</li>
        <li><strong>键盘快捷键需要遵循平台约定。</strong> 在 macOS 上是 <code className="text-perry-400">⌘C</code> 复制。在 Linux 和 Android 上是 <code className="text-perry-400">Ctrl+C</code>。Perry 的快捷键系统对此进行了抽象，但需要仔细实现。</li>
        <li><strong>状态栏出乎意料地不简单。</strong> 每个平台对状态信息的显示位置和方式都有不同的约定。AppKit 使用窗口底部栏，UIKit 使用工具栏，Android 使用布局底部的视图。Perry 的 <code className="text-perry-400">StatusBar</code> 正确映射到每个平台。</li>
        <li><strong>stdin 支持需要平台感知。</strong> 在 macOS 和 Linux 上，从 stdin 读取很简单。在 iOS 和 Android 上，&quot;stdin&quot; 并不以同样的方式存在，所以 Pry 在移动平台上使用文件选择。Perry 的 <code className="text-perry-400">readStdin</code> 透明地处理这一点。</li>
      </ul>

      <h2>性能</h2>
      <p>Pry 轻松处理大型 JSON 文件。在我们的测试中：</p>
      <ul className="list-disc list-inside">
        <li>1 MB JSON 文件（10,000+ 节点）在 50 ms 内解析和渲染</li>
        <li>10 MB JSON 文件在 200 ms 内渲染</li>
        <li>搜索 10,000 个节点时即输即显结果，没有可见延迟</li>
        <li>即使对于大文件，内存使用量也保持在 50 MB 以下</li>
      </ul>
      <p>
        这就是原生编译的优势。Perry 中的 JSON 解析被编译为紧凑的原生循环，没有 GC 暂停。
        树形渲染使用平台自己的虚拟化列表视图（NSOutlineView、UITableView、RecyclerView），性能久经考验。
      </p>

      <h2>源代码和下载</h2>
      <p>Pry 是开源的。你可以浏览完整源代码、自己构建，或只是查看代码来了解 Perry 原生 UI 应用的结构。</p>
      <ul className="list-disc list-inside">
        <li>
          <a href="https://github.com/nicktrebes/perry-pry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
            GitHub 仓库
          </a>{" "}
          —— 完整源代码和构建说明
        </li>
        <li>
          <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">
            展示页面
          </Link>{" "}
          —— 截图、功能列表和平台详情
        </li>
      </ul>
      <p>
        如果你正在用 Perry 构建什么，我们很想听听。在{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          Perry 仓库
        </a>
        {" "}上开一个 issue 或发起讨论。我们正在公开构建 Perry，来自构建真实应用的真实用户的反馈是无价的。
      </p>
    </>
  );
}
