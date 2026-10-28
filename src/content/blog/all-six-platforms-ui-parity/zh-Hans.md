---
title: "全部六个平台，功能完全对等"
excerpt: "20 多个原生 UI 组件、Canvas 组件、Table 视图、系统通知、钥匙串访问、多窗口支持，以及 macOS、iOS、iPadOS、Android、Linux 和 Windows 的完全功能对等——全部来自一套 TypeScript 代码。"
date: 2026-02-28
tags: ["UI", "cross-platform", "release", "milestone"]
---
当我们发布 Perry 原生 UI 系统的第一个版本时，"跨平台" 意味着 macOS 运行良好，而其他五个平台还只是存根。如今，在 v0.2.162 版本中，情况 不再如此。所有六个平台 —— macOS、iOS、iPadOS、Android、Linux 和 Windows —— 现在 共享完整的功能对等。相同的 TypeScript 代码在每个目标上编译为原生组件。

这篇文章介绍了我们在 v0.2.152 和 v0.2.164 之间发布的内容：一个 Canvas 小部件、一个完整的 NSTableView 实现、总共 20 多个 UI 小部件、`perry/system` 模块、多窗口支持、系统通知、钥匙串访问、自动二进制大小减小、和编译时插件系统。发生了很多事情。

## 组件冲刺：20+ 个原生 UI 组件

最大的一次跳跃出现在 v0.2.155 中，它在所有平台上引入了 20 多个 UI 小部件。 Perry 的 TypeScript UI API 现在涵盖了发布真实应用程序实际需要的组件：

-   **Layout** — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView
-   **Input** — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker
-   **显示** — Text、Label、图像、ProgressView、Divider、Spacer
-   **数据** — List、Table（NSTableView / GTK4 TreeView / Win32 ListView）
-   **Overlay** — Alert, Sheet, Popover, Toolbar, NavigationBar
-   **绘图** — Canvas（2D 绘图API，每个平台硬件加速）

这些不是自定义渲染器的包装器。每个小部件都会编译为平台自己的本机组件：macOS 上的 `NSButton`、iOS 上的 `UIButton`、`GtkButton`、Android 上的 `android.widget.Button` 通过 JNI 以及 Windows 上的 `CreateWindowEx`。操作系统绘制它们、主题化并处理可访问性 - Perry 只需连接 TypeScript API。

## Canvas：从 TypeScript 进行 2D 绘图

技术上更有趣的新增功能之一是 Canvas 小部件 (v0.2.152)。它直接从 TypeScript 公开熟悉的 2D 绘图 API — 贝塞尔曲线、填充、描边、图像位图传送 — 并编译到平台的加速 2D 后端：macOS/iOS、Linux 上的 Cairo、Windows 上的 Direct2D 和 Android 上的 Skia。

**canvas.ts**

```typescript
import { Canvas, Color } from 'perry/ui';
// Compiles to Core Graphics on macOS, Cairo on Linux, etc.
const canvas = new Canvas({ width: 400, height: 300 });
canvas.onDraw((ctx) => {
  ctx.fillStyle = Color.amber;
  ctx.fillRect(10, 10, 100, 60);
  ctx.strokeStyle = Color.blue;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(200, 150, 80, 0, Math.PI * 2);
  ctx.stroke();
});
```

## Table 组件：NSTableView 来到 TypeScript

v0.2.163 引入了 Table 小部件 - 库中最复杂的组件。在 macOS 上，它映射到具有完整委托/数据源连接的 `NSTableView`。在 Linux 上，它使用 GTK4 的 `GtkTreeView`。在 Windows 上，Win32 的 `ListView` 控件。在 Android 上，它通过 JNI 绑定到 `RecyclerView`。

TypeScript API 是声明性的：您定义列，提供数据源，Perry 在编译时处理特定于平台的连接。列排序、选择处理和行高自定义都是开箱即用的。

**table.ts**

```typescript
import { Table, Column } from 'perry/ui';
const table = new Table({
  columns: [
    new Column({ title: "Name", key: "name", width: 200 }),
    new Column({ title: "Size", key: "size", width: 80 }),
  ],
  rows: files,  // TypeScript array of objects
  onSelect: (row) => console.log(row.name),
});
```

## perry/system 模块

v0.2.155 还引入了 `perry/system` — 一个 TypeScript 模块，无需任何运行时即可公开平台系统 API：文件对话框、保存对话框、警报、工作表、钥匙串访问、系统通知和多窗口管理。

-   `system.showOpenDialog()` — 原生文件选择器 (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)
-   `system.showSaveDialog()` — 本机保存对话框
-   `system.showAlert()` — 原生警报面板
-   `system.notify()` — 操作系统通知 (UserNotifications / libnotify / WinRT)
-   `system.keychain.get/set()` — 钥匙串服务/秘密服务/Windows 凭据存储
-   `system.openWindow()` — 多窗口管理

所有这些都直接调用本机平台 API — 没有 Electron IPC，没有 Web 视图桥。 Perry 将 TypeScript 调用站点编译为平台 SDK 中的直接本机函数调用。

## 六平台功能对等：v0.2.162

v0.2.162 里程碑是为了缩小差距。在此版本之前，macOS 拥有最完整的功能集，iOS 基本具备，Linux/Windows/Android 则落后。 v0.2.162 将所有六个平台提升到同一水平：

-   **macOS** — AppKit、完整的小组件集、钥匙串、通知、多窗口、工具栏
-   **iOS / iPadOS** — UIKit，与 macOS 的完整小部件奇偶校验，场景生命周期
-   **Android** — JNI 桥接器，所有小部件均通过 Android 视图、NDK 交叉编译
-   **Linux** — GTK4，完整的小部件集，包括Table、文件对话框、libsecret 钥匙串
-   **Windows** - Win32、所有小部件、Windows 凭据存储、WinRT 通知

这是一个里程碑，它使“一个代码库，六个平台”成为现实而不是理想。相同的 TypeScript 文件可在所有六个目标上编译为本机应用，而常见用例不需要特定于平台的代码路径。

## 自动减小二进制大小

v0.2.153 提供了自动二进制大小减小 - 编译器现在积极地删除未使用的代码路径，消除无法访问的 stdlib 函数，并在链接期间删除重复的符号定义。以前编译为约 4 MB 的典型 CLI 工具现在可以减少到 2 MB 以下，并且对源代码的更改为零。

这对于实际部署很重要。当您的二进制文件是部署单元时（复制到服务器、作为单个文件分发、嵌入到容器中），大小直接影响传输时间和存储成本。免费将二进制大小减半是一项有意义的改进。

## 编译时插件系统

v0.2.152 引入了 Perry 的插件系统 - 它在架构上与 TypeScript 生态系统中的所有其他插件系统不同。没有运行时插件加载，没有 IPC，没有动态 `require()`。插件是 TypeScript 模块，Perry 在构建时解析和编译。

结果：插件的运行时开销恰好为零。它们编译成与应用程序代码相同的二进制文件，并在插件代码和主机代码之间进行直接函数调用。如果您不使用插件，它根本不会出现在您的二进制文件中。如果您确实使用它，它会像任何其他模块一样内联。

我们在[插件系统是一种性能税](/zh-Hans/blog/plugin-systems-are-a-performance-tax/)中介绍了其背后的理念。简而言之：运行时插件架构以性能换取可扩展性。构建时组合为您提供了两者。

## 语言改进

UI 冲刺并不是孤立发生的 - 编译器本身的能力不断增强。在这些版本中：

-   **类表达式** — `const Foo = class extends Bar {}` 现在可以正确编译
-   **生成器转换** — `function*` 和 `yield` 编译为本机状态机
-   **映射/设置为类字段** — `private items = new Map()` 在 codegen 中工作
-   **FFI 参数类型强制** - 本机库调用自动处理类型强制
-   **绑定方法引用** — `this.method` 引用适用于本机模块（fs、os、path）
-   `string.match()` — 现已完全支持
-   `path.isAbsolute()`，多参数 `path.join()`，`path.resolve()`
-   **Web 目标** — Perry 现在可以编译为与 Web 兼容的输出以进行混合部署

## 下一步

随着六平台 UI 奇偶校验的推出，下一阶段是深度而非广度。我们正在努力：

-   完整的 RegExp 支持（`regex.test()`、`string.matchAll()`）
-   小部件系统中的拖放、自定义上下文菜单和辅助功能标签
-   用于 Perry 诊断和保存时编译的 VS Code 扩展
-   软件包管理器集成 - 使用一个命令安装和编译 Perry-native 软件包
-   用于浏览器部署的 WASM 编译目标
-   通过 `Worker` 线程实现多线程

如果你想跟进， [Perry repo](https://github.com/PerryTS/perry) 已开放。查看 [showcase](/zh-Hans/showcase/) 看看已经在构建的项目，或浏览 [roadmap](/zh-Hans/roadmap/) 了解完整情况。
