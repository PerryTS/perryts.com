import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        我们很高兴地介绍 Perry —— 一个用 Rust 编写的原生 TypeScript 编译器，
        可以将您的 TypeScript 直接编译为独立可执行文件。不需要 Node.js 运行时，
        不需要 Electron 包装器，没有任何妥协。只有您的代码，被编译成原生二进制文件，
        即时启动，随处运行。
      </p>
      <p>
        Perry 代表了对 TypeScript 能力的根本性重新思考。它不再将 TypeScript 视为
        必须通过 JS 引擎运行的 JavaScript 超集，而是将 TypeScript 视为一种系统语言
        —— 恰好拥有数百万开发者已经熟知和喜爱的语法。
      </p>

      <h2>为什么我们构建了 Perry</h2>
      <p>
        TypeScript 已经成为现代软件开发的通用语言。它是大多数 Web 前端背后的语言，
        在后端中占据越来越大的份额，并且越来越多地被用于工具、脚本和自动化。但它一直
        存在一个根本性的限制：它编译为 JavaScript，而 JavaScript 需要运行时。
      </p>
      <p>
        这个运行时 —— 无论是 Node.js、Deno 还是 Bun —— 都带有代价。
        冷启动时间以数十或数百毫秒计。JIT 编译器和垃圾收集器带来的内存开销。
        二进制分发要么捆绑整个运行时，要么要求用户安装一个。而对于 GUI 应用程序，
        唯一的选择是 Electron，它会将整个 Chromium 浏览器与您的应用一起发布。
      </p>
      <p>
        我们问自己：如果 TypeScript 根本不需要经过 JavaScript 呢？如果您可以直接将它
        编译为原生机器码，就像编译 Rust、Go 或 C++ 一样呢？
      </p>

      <h2>Perry 的工作原理</h2>
      <p>
        Perry 的编译管道有三个阶段：
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>解析</strong> —— Perry 使用 SWC（基于 Rust 的 TypeScript/JavaScript 解析器）
          将您的 TypeScript 源代码解析为 AST。SWC 是 Next.js 使用的同一个解析器，速度极快。
        </li>
        <li>
          <strong>类型导向编译</strong> —— Perry 带着完整的类型信息遍历 AST。与 JS 引擎在运行时
          处理动态类型不同，Perry 在编译时就知道每个类型。这使得泛型的单态化、方法调用的静态分派
          和直接的内存布局优化成为可能。
        </li>
        <li>
          <strong>代码生成</strong> —— Perry 使用 Cranelift 生成原生机器码，Cranelift 是 Wasmtime
          和部分 Firefox JIT 使用的同一个代码生成器。Cranelift 为 x86_64 和 ARM64 生成高效的原生代码。
        </li>
      </ol>
      <p>
        结果是一个独立的可执行文件 —— 对于 CLI 工具通常为 2-5 MB —— 零预热时间即时启动。
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts</p>
          <p className="text-slate-500">Parsing app.ts...</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking...</p>
          <p className="text-green-400">✓ Built executable: app (2.3 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./app</p>
          <p className="text-slate-300">Hello from native TypeScript!</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file app</p>
          <p className="text-slate-300">app: Mach-O 64-bit executable arm64</p>
        </div>
      </div>

      <h2>支持哪些 TypeScript 特性</h2>
      <p>
        Perry 支持广泛且不断增长的 TypeScript 子集。目标是与开发者实际使用的语言完全兼容。
        目前支持的特性包括：
      </p>
      <ul className="list-disc list-inside">
        <li><strong>所有原始类型</strong> —— string、number、boolean、null、undefined、bigint、symbol</li>
        <li><strong>接口和类型别名</strong> —— 包括联合类型、交叉类型和映射类型</li>
        <li><strong>泛型</strong> —— 通过单态化编译，因此 <code className="text-perry-400">Array&lt;number&gt;</code> 和 <code className="text-perry-400">Array&lt;string&gt;</code> 会生成不同的优化代码路径</li>
        <li><strong>类</strong> —— 支持继承、私有字段（<code className="text-perry-400">#field</code>）、静态成员、getter/setter 和装饰器</li>
        <li><strong>Async/await 和 Promise</strong> —— 编译为状态机，类似于 Rust 处理 async 的方式</li>
        <li><strong>生成器和迭代器</strong> —— <code className="text-perry-400">function*</code> 和 <code className="text-perry-400">for...of</code> 循环</li>
        <li><strong>闭包</strong> —— 具有正确的捕获语义</li>
        <li><strong>解构</strong> —— 数组、对象、嵌套模式和剩余元素</li>
        <li><strong>模板字面量</strong> —— 包括标签模板</li>
        <li><strong>模块</strong> —— ESM import/export 在编译时解析</li>
      </ul>

      <h2>跨平台原生 UI</h2>
      <p>
        Perry 不仅限于 CLI 工具和服务端应用。它附带了六个平台的原生 UI 框架：
      </p>
      <ul className="list-disc list-inside">
        <li><strong>macOS</strong> —— AppKit（NSWindow、NSView、NSButton、NSTextField 等）</li>
        <li><strong>iOS</strong> —— UIKit（UIViewController、UIView、UIButton、UITableView）</li>
        <li><strong>iPadOS</strong> —— UIKit（与 iOS 相同的 API，针对 iPad 进行了适配）</li>
        <li><strong>Android</strong> —— JNI + Android Views（Activity、View、Button、RecyclerView）</li>
        <li><strong>Linux</strong> —— GTK4（GtkWindow、GtkBox、GtkButton、GtkEntry）</li>
        <li><strong>Windows</strong> —— Win32（CreateWindowEx、通用控件、GDI）</li>
      </ul>
      <p>
        关键洞察是 Perry 在编译时将通用的 TypeScript API 映射到每个平台的原生组件工具包。
        没有桥接层，没有 web view，没有自定义渲染引擎。您的应用使用真正的平台组件，
        由操作系统本身渲染。在我们的深入分析中了解更多：{" "}
        <Link href="/blog/cross-platform-native-ui" className="text-perry-400 hover:text-perry-300">
          从 TypeScript 到跨平台原生 UI
        </Link>。
      </p>

      <h2>27+ 个 npm 包的原生实现</h2>
      <p>
        新编译器面临的最大实际挑战之一是生态系统兼容性。开发者不仅从零开始编写代码 ——
        他们使用包。Perry 通过提供 27+ 个流行 npm 包的原生实现来解决这个问题：
      </p>
      <ul className="list-disc list-inside">
        <li><strong>数据库</strong> —— mysql2、pg、mongodb、better-sqlite3、ioredis</li>
        <li><strong>HTTP</strong> —— axios、express、ws（WebSockets）</li>
        <li><strong>安全</strong> —— bcrypt、jsonwebtoken、crypto</li>
        <li><strong>工具</strong> —— uuid、chalk、dotenv、lodash（部分）、moment</li>
        <li><strong>系统</strong> —— fs-extra、glob、chokidar、commander</li>
      </ul>
      <p>
        这些不是 Node.js 模块的薄包装器。它们使用原生系统库直接编译到您的二进制文件中
        —— libpq 用于 PostgreSQL，OpenSSL 用于 crypto，libcurl 用于 HTTP。API 接口
        与您期望的 npm 包一致，因此迁移非常简单。
      </p>

      <h2>可选的 V8 兼容层</h2>
      <p>
        对于尚未有 Perry 原生实现的 npm 包，Perry 提供了可选的 V8 嵌入模式。
        启用后，Perry 会捆绑 V8 运行时，可以在编译的 TypeScript 旁边执行标准
        JavaScript npm 包。这是一个务实的应急方案，让您可以渐进式地采用 Perry
        —— 将热路径编译为原生代码，同时仍然可以访问完整的 npm 生态系统。
      </p>

      <h2>交叉编译</h2>
      <p>
        Perry 开箱即用地支持交叉编译。从您的 macOS 开发机器上，您可以为 Linux（x86_64 和
        ARM64）和 iOS 编译。这意味着您可以在 macOS 上构建 CI/CD 管道，并为所有部署
        目标生成二进制文件，无需为每个平台配备专用构建机器。
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p className="text-slate-500"># Build for Linux from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target linux-x86_64</p>
          <p className="text-green-400">✓ Built executable: app (3.1 MB)</p>
          <p className="mt-3 text-slate-500"># Build for iOS from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: app (4.8 MB)</p>
        </div>
      </div>

      <h2>性能</h2>
      <p>
        Perry 编译的二进制文件非常快。因为没有 JIT 预热、没有解释器开销、没有垃圾收集器
        暂停，性能从第一次调用开始就是可预测和一致的。
      </p>
      <p>
        在我们的基准测试中：
      </p>
      <ul className="list-disc list-inside">
        <li><strong>启动时间</strong> —— 实际为 0 ms（原生进程启动）</li>
        <li><strong>二进制大小</strong> —— 典型 CLI 工具 2-5 MB（对比捆绑 Node.js 的 50+ MB）</li>
        <li><strong>内存使用</strong> —— 比等效的 Node.js 应用低 5-10 倍</li>
        <li><strong>吞吐量</strong> —— 对于计算密集型工作负载，与手写 C 代码相当</li>
      </ul>
      <p>
        您可以在{" "}
        <a href="https://demo.perryts.com" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          demo.perryts.com
        </a> 查看实时基准测试，实时比较 Perry 编译的可执行文件与 Node.js 和 Bun。
      </p>

      <h2>当前状态</h2>
      <p>
        Perry 正在积极开发中。编译器稳定，测试套件中 62 个测试全部通过。所有六个平台
        UI 后端均已可用。核心语言特性扎实且在不断扩展。
      </p>
      <p>
        我们正在积极扩展 UI 组件库、改进字符串和对象性能、完善完整的正则表达式支持，
        以及构建 Stream 模块。长期来看，我们计划支持 WASM 编译目标、多线程、VS Code
        扩展和包管理器集成。
      </p>
      <p>
        查看完整的<Link href="/roadmap" className="text-perry-400 hover:text-perry-300">路线图</Link>，
        了解已发布、进行中和即将推出的功能详情。
      </p>

      <h2>开始使用</h2>
      <p>
        Perry 是开源的。您可以克隆仓库、从源码构建，今天就开始编译 TypeScript：
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> git clone https://github.com/PerryTS/perry.git</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">cd</span> perry</p>
          <p><span className="text-slate-500">$</span> cargo build --release</p>
          <p className="mt-3 text-slate-500"># Compile your first TypeScript file</p>
          <p><span className="text-slate-500">$</span> ./target/release/<span className="text-cyan-400">perry</span> build hello.ts</p>
          <p className="text-green-400">✓ Built executable: hello (2.1 MB)</p>
          <p><span className="text-slate-500">$</span> ./hello</p>
          <p className="text-slate-300">Hello, world!</p>
        </div>
      </div>
      <p>
        在{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          GitHub
        </a>
        {" "}上浏览源代码，查看{" "}
        <Link href="/showcase" className="text-perry-400 hover:text-perry-300">展示页</Link>
        {" "}看看大家正在用 Perry 构建什么，或者直接开始编码。
        我们迫不及待想看到您的作品。
      </p>
    </>
  );
}
