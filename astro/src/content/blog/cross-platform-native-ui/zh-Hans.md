---
title: "从 TypeScript 到跨平台原生 UI"
excerpt: "How Perry maps one TypeScript codebase to platform widgets across its documented targets, including the platform-specific limitations and prerequisites."
date: 2025-02-01
tags: ["architecture", "UI", "cross-platform"]
---
Perry 最雄心勃勃的目标之一是从单一 TypeScript 代码库交付真正原生的 GUI 应用程序。 不是包裹在原生外壳中的 web view。不是绘制自己像素的自定义渲染引擎。而是真正的原生组件， 由每个平台自己的 UI 框架渲染，在构建时从 TypeScript 编译。

本文解释其工作原理 —— 架构、平台映射、权衡取舍，以及我们目前的进展。

## 当前方案的问题

跨平台 GUI 开发几十年来一直是个难题。每个主要框架都做出了不同的妥协：

### Electron / Tauri（基于 Web）

Electron 捆绑了 Chromium 和 Node.js，给你一个 web 浏览器作为应用外壳。 你可以完全访问 web 平台，但你的"原生"应用是一个 150+ MB 的下载包， 仅显示一个窗口就要消耗数百兆内存。Tauri 用操作系统的 web view 替换了 Chromium， 大幅减小了体积，但你的 UI 仍然是在 web view 中渲染的 HTML/CSS —— 不是原生组件。

### React Native（基于 Bridge）

React Native 在 JS 引擎（Hermes 或 V8）中运行你的 JavaScript，并通过序列化消息队列 桥接到原生组件。你得到了真正的原生组件，但桥接增加了延迟，尤其是手势和动画。 复杂的交互需要编写原生代码（Swift/Kotlin），违背了单一代码库的承诺。

### Flutter（自定义渲染器）

Flutter 将 Dart 编译为原生代码，使用基于 Skia 的渲染引擎绘制所有内容。 性能出色，但你的组件不是原生的 —— 它们是像素级的复制品。这意味着平台约定 （滚动物理、文本选择、无障碍行为）必须重新实现而非继承。在桌面端，差异更加明显。

### KMP + Compose Multiplatform（部分原生）

Kotlin Multiplatform 在 Android 上编译为 JVM，在 iOS 上编译为原生代码， 但通过 Compose Multiplatform 共享的 UI 使用自定义的基于 Skia 的渲染器 —— 与 Flutter 相同的权衡。要获得真正的原生 UI，你又得回到编写平台特定代码。

## Perry 的方式：编译为原生工具包

Perry 采用了一种根本不同的方式。不是在运行时中运行代码并桥接到原生组件， 也不是绘制自定义像素，Perry 在构建时将你的 TypeScript UI 代码直接编译为 对每个平台原生工具包的调用。

关键区别：**你的代码和平台 SDK 之间没有运行时层。** 编译后的二进制文件直接调用 AppKit、UIKit、Android Views、GTK4 或 Win32， 就像用 Swift、Kotlin 或 C++ 编写的应用一样。

## 统一 UI API

Perry 提供了一套通用的 TypeScript API 来构建用户界面。这个 API 有意设计为高层级 —— 你描述 UI 应该包含什么以及如何行为，Perry 将其映射到适当的原生结构。

counter.ts

import { App, Text, Button, VStack, State } from "perry/ui";

const count = new State(0);

const app = new App("Counter", { width: 400, height: 300 });

app.body(() => {

return VStack({ spacing: 16, alignment: "center" }, \[

Text(\`Count: ${count.value}\`, { fontSize: 32 }),

Button("Increment", () => count.value++),

Button("Reset", () => count.value = 0),

\]);

});

app.run();

同样的代码在所有六个平台上编译为原生 UI。不需要 `#ifdef`， 不需要平台检查，不需要条件导入。

## 平台映射详情

以下是 Perry 如何将统一 API 映射到每个平台的原生框架：

### macOS — AppKit

在 macOS 上，Perry 生成直接创建和管理 AppKit 对象的代码。`App` 变为带有 `NSWindow` 的`NSApplication`。 `Text` 变为 `NSTextField`（禁用编辑）。 `Button` 变为 `NSButton`， 使用 target-action 模式连接到你的回调。 `VStack` 变为垂直方向的 `NSStackView`。 布局使用 Auto Layout 约束。

编译后的二进制文件链接 AppKit 框架并直接调用 Objective-C 运行时函数。 这与 Xcode 编译的 Swift 所做的完全相同。

### iOS 和 iPadOS — UIKit

在 iOS 上，映射类似但目标是 UIKit。 `App` 变为带有 `UIWindow`和根 `UIViewController` 的 `UIApplication`。 `Text` 映射为 `UILabel`。 `Button` 映射为 `UIButton`。 布局使用 `UIStackView` 和 Auto Layout。 触摸事件通过 UIKit 的响应者链处理。

### Android — JNI + Views

在 Android 上，Perry 生成通过 JNI（Java 原生接口）加载的原生库。 `App` 映射为 `Activity`。 `Text` 变为 `TextView`。 `Button` 变为带有`OnClickListener` 的 `android.widget.Button`。 `VStack` 映射为垂直方向的 `LinearLayout`。 原生代码通过 JNI 回调 Android 框架，创建和操作真正的 Android 视图。

### Linux — GTK4

在 Linux 上，Perry 的目标是 GTK4。 `App` 变为带有`GtkApplicationWindow` 的 `GtkApplication`。 `Text` 映射为 `GtkLabel`。 `Button` 映射为带有信号处理器的 `GtkButton`。 `VStack` 映射为垂直方向的 `GtkBox`。 GTK 的 CSS 主题意味着你的应用会自动遵循用户的桌面主题。

### Windows — Win32

在 Windows 上，Perry 生成 Win32 API 调用。 `App` 创建一个窗口类，注册它，并运行消息循环。 `Button` 变为用`CreateWindowEx` 创建的 `BUTTON` 控件。 `Text` 映射为 `STATIC` 控件。 事件通过 Win32 消息泵处理（`WM_COMMAND`、 `WM_NOTIFY` 等）。

## 状态管理

Perry 的 `State<T>` 原语提供响应式状态管理， 编译为平台原生的更新机制。当状态值改变时，Perry 通过平台自己的失效系统触发 UI 更新 —— macOS/iOS 上的 `setNeedsDisplay`、 Android 上的 `invalidate()`、 Linux 上的 `gtk_widget_queue_draw`。

没有虚拟 DOM 比对，没有协调过程，没有序列化。状态变化直接传播到显示该值的原生组件。

## 为什么不用 SwiftUI / Jetpack Compose 语法？

你可能会问为什么 Perry 不使用类似 SwiftUI 或 Jetpack Compose 的声明式语法。 答案是务实的：Perry 编译的是 TypeScript，而 TypeScript 有自己的惯用方式。 与其发明一种对 TypeScript 开发者来说陌生的 DSL，Perry 使用在 TypeScript 中 感觉自然的构建器风格 API —— 构造函数、方法调用、回调和闭包。这与你使用 Express、React hooks 或任何其他 TypeScript 库时相同的模式。

## 今天可用的功能

所有六个平台后端已经实现并且稳定。当前的组件集包括：

-   **布局** — VStack、HStack、Spacer、ScrollView、Divider
-   **显示** — Text、Image
-   **输入** — Button、TextField、Toggle、Slider
-   **导航** — NavigationView、TabView、List
-   **容器** — TreeView、SearchBar、StatusBar
-   **状态** — State<T> 用于响应式更新

## 即将推出

我们正在积极扩展组件库。接下来：

-   `SecureField` —— 使用平台原生安全文本输入的密码输入
-   `ProgressView` —— 确定和不确定进度指示器
-   `Alert` —— 带按钮和文本框的原生警告对话框
-   `DatePicker` —— 平台原生日期/时间选择
-   `Menu` —— 原生菜单栏和上下文菜单

目标是所有平台完整的 GUI 框架对等 —— 每个组件、布局、手势和动画在任何地方都可用。查看 [路线图](/zh-Hans/roadmap/)了解完整情况。

## 试试看

了解 Perry 原生 UI 的最好方式是看它的实际效果。 [Pry](/zh-Hans/showcase/pry/) 是一个 完全用 TypeScript 和 Perry 构建的原生 JSON 查看器 —— 一个具有树形导航、搜索和键盘快捷键的 真实应用，编译为 macOS、iOS 和 Android 上的原生二进制文件。阅读关于其构建过程的 [完整教程](/zh-Hans/blog/building-pry/)。
