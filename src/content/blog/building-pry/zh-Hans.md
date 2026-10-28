---
title: "构建 Pry：用 TypeScript 编写的原生 JSON 查看器"
excerpt: "构建 Pry 的演练，这是一个原生 JSON 查看器，从 TypeScript 编译为机器代码，并链接了 Perry 运行时和 GC，并且没有网页视图。"
date: 2025-02-20
tags: ["tutorial", "showcase", "Pry"]
---
Pry 是一个完全用 TypeScript 编写并用 Perry 编译的原生 JSON 查看器。它不是一个技术演示 —— 它是我们每天用来检查 API 响应、配置文件和数据转储的真实工具。本文介绍了它是如何 构建的、如何编译的，以及当你的 TypeScript 编译为原生应用时开发体验是怎样的。

## Pry 的功能

Pry 读取一个 JSON 文件（或从 stdin 接收 JSON）并在原生窗口中将其渲染为可交互、可导航的树。 如果你用过 macOS 内置的 Quick Look 查看 JSON，想象一下 —— 但更快、可搜索、并且支持键盘导航。

功能集：

-   **树形视图** —— 对象和数组的可折叠节点，带深度指示器和全部展开/折叠功能
-   **搜索** —— 跨键和值的全文搜索，带实时高亮和匹配导航
-   **键盘快捷键** —— 方向键导航，回车展开/折叠，斜杠搜索，`⌘C` 复制
-   **剪贴板** —— 将任何节点或子树复制为格式化的 JSON
-   **语法着色** —— 字符串绿色，数字橙色，布尔值紫色，null 红色
-   **状态栏** —— 显示总节点数、当前深度、文件大小和解析时间

## 源代码

Pry 用标准 TypeScript 编写。没有特殊语法，没有宏，没有构建时代码生成。它使用 Perry 的 UI API，提供编译为平台特定代码的原生组件。

以下是入口点（为清晰起见已简化）：

**pry.ts**

```typescript
import { App, VStack, TreeView, SearchBar, StatusBar, State }
from "perry/ui";
import { readFile, readStdin } from "perry/fs";
// Read input from file arg or stdin
const input = process.argv[2]
? readFile(process.argv[2])
: readStdin();
const startTime = Date.now();
const data = JSON.parse(input);
const parseMs = Date.now() - startTime;
// Reactive state
const searchQuery = new State("");
const matchCount = new State(0);
// Build the app
const app = new App("Pry", {
width: 800,
height: 600,
minWidth: 400,
minHeight: 300,
});
app.body(() => {
return VStack({ spacing: 0 }, [
SearchBar({
placeholder: "Search keys and values...",
onSearch: (q) => searchQuery.value = q,
}),
TreeView(data, {
collapsible: true,
syntaxHighlight: true,
searchQuery: searchQuery,
onMatchCount: (n) => matchCount.value = n,
copyOnClick: true,
}),
StatusBar([
`${countNodes(data)} nodes`,
`Parsed in ${parseMs}ms`,
`${matchCount.value} matches`,
]),
]);
});
app.registerShortcut("/", () => app.focusSearchBar());
app.registerShortcut("Escape", () => {
searchQuery.value = "";
app.focusTree();
});
app.run();
```

这就是一个原生应用的核心。没有框架样板代码，没有构建配置，没有平台特定文件。一个 TypeScript 文件。

### 辅助函数

Pry 还包含一个 `countNodes` 工具函数，递归计算 JSON 树中的所有节点， 以及一个 `formatBytes` 辅助函数用于显示文件大小。这些都是标准的 TypeScript 函数 —— 没有 Perry 特有的内容。它们和其他代码一样被编译为原生代码。

**utils.ts**

```typescript
export function countNodes(data: unknown): number {
if (data === null || typeof data !== "object") {
return 1;
}
if (Array.isArray(data)) {
return 1 + data.reduce((sum, item) => sum + countNodes(item), 0);
}
const values = Object.values(data as Record<string, unknown>);
return 1 + values.reduce((sum, val) => sum + countNodes(val), 0);
}
```

## 编译 Pry

用 Perry 编译 Pry 只需一条命令。不需要 Xcode 项目，不需要 Gradle 配置，不需要 webpack 配置。 只需将 Perry 指向入口文件并指定目标。

### macOS (ARM64)

```
$ perry build pry.ts --target macos-arm64
Parsing pry.ts...
Resolving imports: perry/ui, perry/fs
Compiling (cranelift, arm64)...
Linking with AppKit.framework...
✓ Built executable: pry (48 MB)
$ file pry
pry: Mach-O 64-bit executable arm64
$ otool -L pry | head -5
pry:
/System/Library/Frameworks/AppKit.framework/AppKit
/System/Library/Frameworks/Foundation.framework/Foundation
/usr/lib/libSystem.B.dylib
```

二进制文件为 48 MB，因为它包含完整的 AppKit UI 栈 —— 树形视图渲染、搜索高亮、语法着色和键盘处理。 相比之下，同样的应用在 Electron 中将超过 200 MB。纯 CLI 的 Perry 应用编译后只有 2-5 MB。

### iOS

```
$ perry build pry.ts --target ios-arm64
✓ Built executable: pry (52 MB)
```

iOS 构建链接 UIKit 而非 AppKit。Perry 将相同的 `TreeView` API 映射到带可展开 section 的 `UITableView`，`SearchBar` 映射到 `UISearchBar`， 触摸事件替代鼠标事件。iOS 构建可以部署到真实设备和模拟器。

### Android

```
$ perry build pry.ts --target android-arm64
✓ Built: pry.apk
```

Android 构建生成通过 JNI 加载的原生库，打包为 APK。`TreeView` 映射到带可展开 view holder 的`RecyclerView`，`SearchBar` 映射到带`TextWatcher` 的 `EditText`， 状态栏映射到布局底部的 `TextView`。

## 底层原理

当 Perry 编译 Pry 时，它经历几个阶段：

1.  **解析** —— SWC 将 TypeScript 源代码解析为 AST。来自 `perry/ui` 和 `perry/fs` 的导入被解析到 Perry 的内置模块实现。
2.  **类型分析** —— Perry 解析所有类型，包括泛型 `State<string>` 和 `State<number>`，将它们单态化为具体类型。
3.  **平台解析** —— 根据目标标志，Perry 选择适当的 UI 后端。每个 `TreeView`、`SearchBar` 和 `Button` 调用被解析到平台特定的实现。
4.  **IR 生成** —— Perry 生成包含原生 API 调用的中间表示 —— macOS/iOS 的 Objective-C 消息发送、Android 的 JNI 调用、GTK4/Win32 的 C 函数调用。
5.  **代码生成** —— Cranelift 将 IR 编译为目标架构的原生机器码。
6.  **链接** —— 原生代码与平台框架（AppKit、UIKit、Android NDK、GTK4 或 Win32）链接以产生最终可执行文件。

## 无运行时，无 Web View

这一点值得强调，因为它是 Perry 与所有其他 TypeScript 转原生方案的核心区别。编译后的 Pry 二进制文件：

-   **没有 JavaScript 引擎** —— 没有 V8、没有 Hermes、没有 JavaScriptCore
-   **没有 web view** —— 没有 Chromium、没有 WebKit、没有 WKWebView
-   **没有桥接层** —— JS 和原生之间没有序列化消息
-   **没有框架运行时** —— 没有 React、没有 Flutter 引擎、没有 Dart VM

二进制文件直接调用平台 API。在 macOS 上，它调用 `objc_msgSend`与 AppKit 对象交互。在 Android 上，它调用 JNI 函数创建和操作 View。这与原生 Swift 或 Kotlin 应用完全相同。

实际结果：Pry 即时启动。没有 VM 启动、没有 JIT 预热、没有脚本解析。进程启动，窗口出现，JSON 被渲染。 内存使用量只是等效 Electron 应用的零头。

## 开发体验

构建 Pry 的感觉与构建任何 TypeScript 应用惊人地相似。工作流程是：

1.  在编辑器中编写 TypeScript（VS Code、Zed、Neovim，随你选择）
2.  运行 `perry compile pry.ts`
3.  执行 `./pry test.json`
4.  迭代

不需要配置 Xcode 项目。不需要安装 Android Studio。不需要花 45 秒的 Gradle 构建。 Perry 编译器本身很快 —— 解析和编译 Pry 只需几秒钟，我们正在积极优化速度。

你编写的是标准 TypeScript。编辑器的类型检查、自动补全和重构工具都能正常工作。 你可以提取函数、创建模块、使用泛型 —— 你已经熟知的所有 TypeScript 模式。

## 我们的收获

构建 Pry 教会了我们很多关于 Perry UI API 需要支持什么。一些经验教训：

-   **树形视图很复杂。** 展开、折叠、搜索高亮、键盘导航和剪贴板集成都需要协调。Perry 的 `TreeView` 组件在内部处理这些，但我们必须确保原生实现在所有三个平台上保持一致。
-   **键盘快捷键需要遵循平台约定。** 在 macOS 上是 `⌘C` 复制。在 Linux 和 Android 上是 `Ctrl+C`。Perry 的快捷键系统对此进行了抽象，但需要仔细实现。
-   **状态栏出乎意料地不简单。** 每个平台对状态信息的显示位置和方式都有不同的约定。AppKit 使用窗口底部栏，UIKit 使用工具栏，Android 使用布局底部的视图。Perry 的 `StatusBar` 正确映射到每个平台。
-   **stdin 支持需要平台感知。** 在 macOS 和 Linux 上，从 stdin 读取很简单。在 iOS 和 Android 上，"stdin" 并不以同样的方式存在，所以 Pry 在移动平台上使用文件选择。Perry 的 `readStdin` 透明地处理这一点。

## 性能

Pry 轻松处理大型 JSON 文件。在我们的测试中：

-   1 MB JSON 文件（10,000+ 节点）在 50 ms 内解析和渲染
-   10 MB JSON 文件在 200 ms 内渲染
-   搜索 10,000 个节点时即输即显结果，没有可见延迟
-   即使对于大文件，内存使用量也保持在 50 MB 以下

这就是原生编译的优势。Perry 中的 JSON 解析被编译为紧凑的原生循环，没有 GC 暂停。 树形渲染使用平台自己的虚拟化列表视图（NSOutlineView、UITableView、RecyclerView），性能久经考验。

## 源代码和下载

Pry 是开源的。你可以浏览完整源代码、自己构建，或只是查看代码来了解 Perry 原生 UI 应用的结构。

-   [GitHub 仓库](https://github.com/perryts/pry) —— 完整源代码和构建说明
-   [展示页面](/zh-Hans/showcase/pry/) —— 截图、功能列表和平台详情

如果你正在用 Perry 构建什么，我们很想听听。在 [Perry 仓库](https://github.com/PerryTS/perry) 上开一个 issue 或发起讨论。我们正在公开构建 Perry，来自构建真实应用的真实用户的反馈是无价的。
