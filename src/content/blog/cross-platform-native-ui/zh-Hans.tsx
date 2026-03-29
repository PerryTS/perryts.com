import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Perry 最雄心勃勃的目标之一是从单一 TypeScript 代码库交付真正原生的 GUI 应用程序。
        不是包裹在原生外壳中的 web view。不是绘制自己像素的自定义渲染引擎。而是真正的原生组件，
        由每个平台自己的 UI 框架渲染，在构建时从 TypeScript 编译。
      </p>
      <p>
        本文解释其工作原理 —— 架构、平台映射、权衡取舍，以及我们目前的进展。
      </p>

      <h2>当前方案的问题</h2>
      <p>
        跨平台 GUI 开发几十年来一直是个难题。每个主要框架都做出了不同的妥协：
      </p>

      <h3>Electron / Tauri（基于 Web）</h3>
      <p>
        Electron 捆绑了 Chromium 和 Node.js，给你一个 web 浏览器作为应用外壳。
        你可以完全访问 web 平台，但你的&quot;原生&quot;应用是一个 150+ MB 的下载包，
        仅显示一个窗口就要消耗数百兆内存。Tauri 用操作系统的 web view 替换了 Chromium，
        大幅减小了体积，但你的 UI 仍然是在 web view 中渲染的 HTML/CSS —— 不是原生组件。
      </p>

      <h3>React Native（基于 Bridge）</h3>
      <p>
        React Native 在 JS 引擎（Hermes 或 V8）中运行你的 JavaScript，并通过序列化消息队列
        桥接到原生组件。你得到了真正的原生组件，但桥接增加了延迟，尤其是手势和动画。
        复杂的交互需要编写原生代码（Swift/Kotlin），违背了单一代码库的承诺。
      </p>

      <h3>Flutter（自定义渲染器）</h3>
      <p>
        Flutter 将 Dart 编译为原生代码，使用基于 Skia 的渲染引擎绘制所有内容。
        性能出色，但你的组件不是原生的 —— 它们是像素级的复制品。这意味着平台约定
        （滚动物理、文本选择、无障碍行为）必须重新实现而非继承。在桌面端，差异更加明显。
      </p>

      <h3>KMP + Compose Multiplatform（部分原生）</h3>
      <p>
        Kotlin Multiplatform 在 Android 上编译为 JVM，在 iOS 上编译为原生代码，
        但通过 Compose Multiplatform 共享的 UI 使用自定义的基于 Skia 的渲染器
        —— 与 Flutter 相同的权衡。要获得真正的原生 UI，你又得回到编写平台特定代码。
      </p>

      <h2>Perry 的方式：编译为原生工具包</h2>
      <p>
        Perry 采用了一种根本不同的方式。不是在运行时中运行代码并桥接到原生组件，
        也不是绘制自定义像素，Perry 在构建时将你的 TypeScript UI 代码直接编译为
        对每个平台原生工具包的调用。
      </p>
      <p>
        关键区别：<strong>你的代码和平台 SDK 之间没有运行时层。</strong>{" "}
        编译后的二进制文件直接调用 AppKit、UIKit、Android Views、GTK4 或 Win32，
        就像用 Swift、Kotlin 或 C++ 编写的应用一样。
      </p>

      <h2>统一 UI API</h2>
      <p>
        Perry 提供了一套通用的 TypeScript API 来构建用户界面。这个 API 有意设计为高层级
        —— 你描述 UI 应该包含什么以及如何行为，Perry 将其映射到适当的原生结构。
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">Text</span>, <span className="text-cyan-400">Button</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">State</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">count</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Counter&quot;</span>, {"{"} width: <span className="text-orange-400">400</span>, height: <span className="text-orange-400">300</span> {"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">16</span>, alignment: <span className="text-green-400">&quot;center&quot;</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">Text</span>(<span className="text-green-400">`Count: ${"{"}<span className="text-cyan-400">count</span>.value{"}"}`</span>, {"{"} fontSize: <span className="text-orange-400">32</span> {"}"}),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Increment&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value++),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Reset&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value = <span className="text-orange-400">0</span>),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        同样的代码在所有六个平台上编译为原生 UI。不需要 <code className="text-perry-400">#ifdef</code>，
        不需要平台检查，不需要条件导入。
      </p>

      <h2>平台映射详情</h2>
      <p>
        以下是 Perry 如何将统一 API 映射到每个平台的原生框架：
      </p>

      <h3>macOS — AppKit</h3>
      <p>
        在 macOS 上，Perry 生成直接创建和管理 AppKit 对象的代码。
        <code className="text-perry-400">App</code> 变为带有 <code className="text-perry-400">NSWindow</code> 的
        <code className="text-perry-400">NSApplication</code>。{" "}
        <code className="text-perry-400">Text</code> 变为 <code className="text-perry-400">NSTextField</code>（禁用编辑）。{" "}
        <code className="text-perry-400">Button</code> 变为 <code className="text-perry-400">NSButton</code>，
        使用 target-action 模式连接到你的回调。{" "}
        <code className="text-perry-400">VStack</code> 变为垂直方向的 <code className="text-perry-400">NSStackView</code>。
        布局使用 Auto Layout 约束。
      </p>
      <p>
        编译后的二进制文件链接 AppKit 框架并直接调用 Objective-C 运行时函数。
        这与 Xcode 编译的 Swift 所做的完全相同。
      </p>

      <h3>iOS 和 iPadOS — UIKit</h3>
      <p>
        在 iOS 上，映射类似但目标是 UIKit。{" "}
        <code className="text-perry-400">App</code> 变为带有 <code className="text-perry-400">UIWindow</code>
        和根 <code className="text-perry-400">UIViewController</code> 的 <code className="text-perry-400">UIApplication</code>。{" "}
        <code className="text-perry-400">Text</code> 映射为 <code className="text-perry-400">UILabel</code>。{" "}
        <code className="text-perry-400">Button</code> 映射为 <code className="text-perry-400">UIButton</code>。{" "}
        布局使用 <code className="text-perry-400">UIStackView</code> 和 Auto Layout。
        触摸事件通过 UIKit 的响应者链处理。
      </p>

      <h3>Android — JNI + Views</h3>
      <p>
        在 Android 上，Perry 生成通过 JNI（Java 原生接口）加载的原生库。{" "}
        <code className="text-perry-400">App</code> 映射为 <code className="text-perry-400">Activity</code>。{" "}
        <code className="text-perry-400">Text</code> 变为 <code className="text-perry-400">TextView</code>。{" "}
        <code className="text-perry-400">Button</code> 变为带有
        <code className="text-perry-400">OnClickListener</code> 的 <code className="text-perry-400">android.widget.Button</code>。{" "}
        <code className="text-perry-400">VStack</code> 映射为垂直方向的 <code className="text-perry-400">LinearLayout</code>。
        原生代码通过 JNI 回调 Android 框架，创建和操作真正的 Android 视图。
      </p>

      <h3>Linux — GTK4</h3>
      <p>
        在 Linux 上，Perry 的目标是 GTK4。{" "}
        <code className="text-perry-400">App</code> 变为带有
        <code className="text-perry-400">GtkApplicationWindow</code> 的 <code className="text-perry-400">GtkApplication</code>。{" "}
        <code className="text-perry-400">Text</code> 映射为 <code className="text-perry-400">GtkLabel</code>。{" "}
        <code className="text-perry-400">Button</code> 映射为带有信号处理器的 <code className="text-perry-400">GtkButton</code>。{" "}
        <code className="text-perry-400">VStack</code> 映射为垂直方向的 <code className="text-perry-400">GtkBox</code>。
        GTK 的 CSS 主题意味着你的应用会自动遵循用户的桌面主题。
      </p>

      <h3>Windows — Win32</h3>
      <p>
        在 Windows 上，Perry 生成 Win32 API 调用。{" "}
        <code className="text-perry-400">App</code> 创建一个窗口类，注册它，并运行消息循环。{" "}
        <code className="text-perry-400">Button</code> 变为用
        <code className="text-perry-400">CreateWindowEx</code> 创建的 <code className="text-perry-400">BUTTON</code> 控件。{" "}
        <code className="text-perry-400">Text</code> 映射为 <code className="text-perry-400">STATIC</code> 控件。
        事件通过 Win32 消息泵处理（<code className="text-perry-400">WM_COMMAND</code>、{" "}
        <code className="text-perry-400">WM_NOTIFY</code> 等）。
      </p>

      <h2>状态管理</h2>
      <p>
        Perry 的 <code className="text-perry-400">State&lt;T&gt;</code> 原语提供响应式状态管理，
        编译为平台原生的更新机制。当状态值改变时，Perry 通过平台自己的失效系统触发 UI 更新
        —— macOS/iOS 上的 <code className="text-perry-400">setNeedsDisplay</code>、{" "}
        Android 上的 <code className="text-perry-400">invalidate()</code>、{" "}
        Linux 上的 <code className="text-perry-400">gtk_widget_queue_draw</code>。
      </p>
      <p>
        没有虚拟 DOM 比对，没有协调过程，没有序列化。状态变化直接传播到显示该值的原生组件。
      </p>

      <h2>为什么不用 SwiftUI / Jetpack Compose 语法？</h2>
      <p>
        你可能会问为什么 Perry 不使用类似 SwiftUI 或 Jetpack Compose 的声明式语法。
        答案是务实的：Perry 编译的是 TypeScript，而 TypeScript 有自己的惯用方式。
        与其发明一种对 TypeScript 开发者来说陌生的 DSL，Perry 使用在 TypeScript 中
        感觉自然的构建器风格 API —— 构造函数、方法调用、回调和闭包。这与你使用
        Express、React hooks 或任何其他 TypeScript 库时相同的模式。
      </p>

      <h2>今天可用的功能</h2>
      <p>
        所有六个平台后端已经实现并且稳定。当前的组件集包括：
      </p>
      <ul className="list-disc list-inside">
        <li><strong>布局</strong> — VStack、HStack、Spacer、ScrollView、Divider</li>
        <li><strong>显示</strong> — Text、Image</li>
        <li><strong>输入</strong> — Button、TextField、Toggle、Slider</li>
        <li><strong>导航</strong> — NavigationView、TabView、List</li>
        <li><strong>容器</strong> — TreeView、SearchBar、StatusBar</li>
        <li><strong>状态</strong> — State&lt;T&gt; 用于响应式更新</li>
      </ul>

      <h2>即将推出</h2>
      <p>
        我们正在积极扩展组件库。接下来：
      </p>
      <ul className="list-disc list-inside">
        <li><code className="text-perry-400">SecureField</code> —— 使用平台原生安全文本输入的密码输入</li>
        <li><code className="text-perry-400">ProgressView</code> —— 确定和不确定进度指示器</li>
        <li><code className="text-perry-400">Alert</code> —— 带按钮和文本框的原生警告对话框</li>
        <li><code className="text-perry-400">DatePicker</code> —— 平台原生日期/时间选择</li>
        <li><code className="text-perry-400">Menu</code> —— 原生菜单栏和上下文菜单</li>
      </ul>
      <p>
        目标是所有平台完整的 GUI 框架对等 —— 每个组件、布局、手势和动画在任何地方都可用。查看{" "}
        <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">路线图</Link>了解完整情况。
      </p>

      <h2>试试看</h2>
      <p>
        了解 Perry 原生 UI 的最好方式是看它的实际效果。{" "}
        <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">Pry</Link> 是一个
        完全用 TypeScript 和 Perry 构建的原生 JSON 查看器 —— 一个具有树形导航、搜索和键盘快捷键的
        真实应用，编译为 macOS、iOS 和 Android 上的原生二进制文件。阅读关于其构建过程的{" "}
        <Link href="/blog/building-pry" className="text-perry-400 hover:text-perry-300">完整教程</Link>。
      </p>
    </>
  );
}
