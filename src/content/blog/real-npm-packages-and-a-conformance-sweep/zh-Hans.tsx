export default function Content() {
  return (
    <>
      <p>
        上一篇文章在 <strong>v0.5.875</strong> 收尾，主线是 GC 的故事 — 填平 aya_koto 基准所暴露出的差距。那篇文章讲的是赢下一个基准。这一篇讲的是另一种工作：从 v0.5.875 到 v0.5.1146 之间大约 <strong>270 个版本</strong>，在约四周里发布，几乎没有一个是以基准数字作为头条。主题从&ldquo;在微基准上跑得快&rdquo;转向了 <strong>&ldquo;让真实世界的 TypeScript 和真实的 npm 包真正能编译并运行&rdquo;</strong>。外加一次完整的 Windows 视觉翻新，以及一路上一堆新 widget。
      </p>
      <p>
        下面是这一窗口里发布的内容，按它们实际服务的目的分组。
      </p>

      <h2>真实的 npm 包现在能编译了</h2>
      <p>
        贯穿这一窗口最大的一条主线，是一次让流行 npm 包编译成原生二进制并通过行为测试的扫尾 — 不只是&ldquo;链接时不报错&rdquo;，而是运行并产生正确输出。如今通过 <code>perry.compilePackages</code> 能工作的清单包括 <strong>axios、jose、zod v4、vitest、express、fastify、@hono/node-server、dayjs、chalk、ms、debug、lodash、ethers、argon2 和 Colyseus</strong>。
      </p>
      <p>
        每一个都因各自的原因失败，每一处修复也都是它自己的小故事：
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>zod v4</strong> 以 <code>Cannot read properties of undefined (reading &apos;onattach&apos;)</code> 崩溃。根因（v0.5.1144，<a href="https://github.com/PerryTS/perry/issues/4698" className="text-amber-400 hover:text-amber-300">#4698</a>）：当 <code>F</code> 是从另一个模块导入的函数时，<code>new F()</code> 静默产生一个空对象 — 构造函数体从未运行，于是每个 <code>$ZodCheckMinLength</code> 风格的 check 回来时都被剥掉了它的 <code>_zod</code> 属性。</li>
        <li><strong>axios + jose</strong> 需要 Perry 当时还没有的加密与压缩能力：<code>zlib.createBrotliDecompress</code>、<code>crypto.subtle.wrapKey</code>/<code>unwrapKey</code>、用于 AES-GCM 的 <code>subtle.generateKey</code> / <code>encrypt</code> / <code>decrypt</code>，以及 <code>randomFillSync</code>（v0.5.972–976）。</li>
        <li><strong>fastify</strong> 在 <code>wait_for_promise</code> 里一个一秒的轮询超时上死锁；我们用一个 condvar 等待替换了它，并让被拒绝的 promise 浮现为 <code>HTTP 500</code> 而不是挂起（v0.5.912）。</li>
        <li><strong>@hono/node-server</strong> 读不了 POST body — 在父级注册修复（v0.5.1142）之前，<code>c.req.text()</code> / <code>.json()</code> / <code>.formData()</code> 在 POST/PUT 上返回空。</li>
        <li><strong>chalk、ms、debug、express</strong> 撞上了同一种形态：一个<em>带附加属性的可调用值</em>（<code>chalk.red</code>、<code>express()</code> 加上 <code>express.Router</code>）。这一模式的三种变体在 v0.5.935 及其周边的 npm 扫尾中得到修复，外加 <code>util.inherits</code> + 一个 stream 原型脚手架来为 express 解阻（v0.5.990）。</li>
        <li><strong>dayjs</strong> 以压缩后的 bundle 形式发布，触及了 Perry 降级错误的 JS-classic 原型方法派发（<code>Class.prototype.m = fn</code>）（v0.5.924/932）。</li>
      </ul>
      <p>
        在这一切之下，还有让 Perry <em>无法</em>原生编译的包仍能运行的那一部分：<strong>V8-fallback 运行时</strong>在这一窗口里变成了真东西。它的 ModuleLoader 现在从一个内嵌的模块映射中读取，因此一个 fallback 二进制仍然是<strong>自包含的</strong> — 运行时没有散落的 <code>node_modules</code>（v0.5.994）。<code>createServer</code> 桥接到一个真正的 hyper server（v0.5.999），并且 <code>Response</code> / <code>Request</code> / <code>Headers</code> 这些 Web Fetch 全局对象在 fallback 路径里存在（v0.5.1006）。还有<strong>编译期动态 <code>import()</code></strong> — 字符串字面量 <code>await import(&apos;./foo.ts&apos;)</code> 在构建时解析 — 终于落地（v0.5.905，<a href="https://github.com/PerryTS/perry/issues/100" className="text-amber-400 hover:text-amber-300">#100</a>）。
      </p>

      <h2>一次 test262 一致性扫尾</h2>
      <p>
        另一条主导主线是一致性。我们针对 test262 子集雷达做了聚焦的几遍，把真实代码最倚重的那些内置项的指针拨动了：
      </p>
      <pre><code>{`built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)`}</code></pre>
      <p>
        String 的跃升来自给每个 <code>String.prototype</code> 方法以泛型 <code>this</code> 派发，并修复 <code>slice</code>/<code>substring</code> 的索引强制转换。Array 的跃升是密集数组回调（<code>forEach</code>/<code>map</code>/<code>filter</code>/…）上的 <code>thisArg</code>、array-like 的 <code>ToLength</code>、规范操作顺序，以及零参数验证。解构吸纳了在普通、generator、async-generator、static 和 private 类方法上的参数解构。
      </p>
      <p>
        在这些头条数字之外，还落地了一条长尾的正确性修复：<code>JSON.parse</code> 现在抛出真正的 <code>SyntaxError</code>（而非 <code>TypeError</code>）并拒绝尾随 token；它的 reviver 通过规范的 <code>InternalizeJSONProperty</code> 算法遍历；<code>Object.prototype.toString</code> 为 typed array、Symbol、BigInt、Map/Set/WeakMap/WeakSet/Promise/RegExp 正确打标；<code>RegExp.prototype.toString</code> 返回 <code>/source/flags</code>；async generator 拿到了它们 <code>yield</code>-awaits-operand 的语义。这些是子集雷达，不是完整套件 — Perry 仍在攀登 — 但这个月的攀登很陡。
      </p>

      <h2>Windows 走向 Fluent</h2>
      <p>
        Windows 得到了一次视觉翻新（<a href="https://github.com/PerryTS/perry/issues/4681" className="text-amber-400 hover:text-amber-300">#4681</a> 系列）。Perry 的窗口现在默认接入现代 DWM 外观 — <strong>Mica backdrop</strong>、圆角，以及一个感知主题的标题栏 — 而公共控件通过 <strong>comctl32 v6</strong> 渲染，而不是 Windows 95 时代的默认。窗口过程现在处理 <code>WM_DPICHANGED</code>，因此当你把窗口在不同缩放的显示器之间拖动时，它保持清晰，而不是被位图拉伸。
      </p>
      <p>
        关键在于，这一切都没有重新引入旧的 <a href="https://github.com/PerryTS/perry/issues/1542" className="text-amber-400 hover:text-amber-300">#1542</a> &ldquo;resize 后的黑色区域&rdquo;回归：客户区仍以不透明绘制，而全帧的 Mica/Acrylic 透视模糊保持为一个显式的 <code>app.setVibrancy(...)</code> 选项。还有一个新的 <code>--target windows-winui</code> 后端脚手架（WinUI 3），给想要完全现代栈的应用使用，以及一个小但真实的修复，让 <code>perry compile main.ts -o main</code> 在 Windows 上产出 <code>main.exe</code>，这样 PowerShell 才会真正启动它（v0.5.1146）。
      </p>

      <h2>新 widget，每个平台</h2>
      <p>
        就在最后一天里落地了两个 widget，两个都覆盖 Perry 所瞄准的每个 UI 平台：
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>DatePicker</strong>（<a href="https://github.com/PerryTS/perry/issues/4772" className="text-amber-400 hover:text-amber-300">#4772</a>）— 一个紧凑的、字段式的日期控件：macOS 上是 <code>NSDatePicker</code>，iOS/visionOS 上是 <code>UIDatePicker</code>（.compact），Windows 上是 <code>SysDateTimePick32</code>，Android 上是 <code>android.widget.DatePicker</code>，Linux 上是 GTK4。所有平台共用一套 TS 表面。</li>
        <li><strong>拖放</strong>（<a href="https://github.com/PerryTS/perry/issues/4773" className="text-amber-400 hover:text-amber-300">#4773</a>）— 任何 widget 都可以作为文本/文件/URL 的放置目标和拖动源，映射到 <code>NSDraggingDestination</code>（AppKit）、<code>UIDropInteraction</code>（UIKit）和 <code>View.setOnDragListener</code>（Android）。</li>
      </ul>
      <pre><code>{`import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});`}</code></pre>
      <p>
        在这一窗口的更早些时候，widget 货架在桌面和移动端也填满了 — Combobox、TreeView、Calendar、Chart、CommandPalette、RichTextEditor、MapView、PdfView、BottomNavigation，以及一个可滑动的 ImageGallery — 每一个都由每个平台上真正的原生控件支撑。HarmonyOS（ArkTS）拿到了 Chart 和 TreeView（v0.5.893），这是它达到与其他平台等同所需的最后两个 widget。
      </p>

      <h2>GC、内部实现与稳定性</h2>
      <p>
        那 270 个版本里大多数不是头条 — 它们是 bug 修复和内部实现，而这正是本阶段的要点。有几个值得点名：
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>GC 继续推进。</strong> GC 那篇文章里的有条件空闲列表工作继续稳定下来，并且关掉了一类尖锐的 bug：原生桥接的 Promise 现在<strong>在 tokio worker 上飞行期间被钉住</strong>，这样 GC 在 resolution 落地之前无法把它们 sweep 掉（v0.5.923）。如果你在负载下跑过一个 async fetch 并见到过一次幽灵回收，那就是这个。</li>
        <li><strong>内存模型有了文档。</strong> 现在有一篇 <code>internals/memory-model.md</code> 深度剖析 — NaN-boxing、分代 GC、shadow stack 和 write barrier — 已接入文档站（v0.5.933）。</li>
        <li><strong>一波由 npm 扫尾浮现的 codegen 稳定性修复</strong>：一个在恢复的 async step 内部被调用的模块级 <code>const</code> 箭头函数不再 SIGSEGV（v0.5.953），<code>{`try { await rejected } catch { return X }`}</code> 不再永久挂起（v0.5.870），还有真实 bundle 触发的少数 <code>js_is_truthy</code> / 裸指针范围崩溃。</li>
      </ul>

      <h2>Apple 杂务</h2>
      <p>
        较小但真实：<code>perry setup ios --development</code> 现在为开发构建做配置（v0.5.1023），而 Apple 的跨库 build/link 路径被去重并做成指针宽度可移植（v0.5.1121/1125）— 这正是为之前卡住的 npm / Homebrew / APT / winget 发布矩阵解阻的关键。
      </p>

      <h2>这把我们带到了哪里</h2>
      <p>
        Perry 背后的赌注一直是：&ldquo;原生 TypeScript&rdquo;只有在<em>真实</em>的 TypeScript 能跑时才有意义 — 不是一个玩具子集，而是人们真正 <code>npm install</code> 的那些包。这个月大多是这种工作：与其说是一个可以吹嘘的单一数字，不如说是一次漫长、不光鲜的推进，去填平&ldquo;能编译&rdquo;和&ldquo;能工作&rdquo;之间的差距。一致性雷达和 npm 等同性测试是我们现在盯着的记分牌，我们会继续发布这些数字 — 好的和仍不完美的。
      </p>
      <p>
        源码：<a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues：<a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
