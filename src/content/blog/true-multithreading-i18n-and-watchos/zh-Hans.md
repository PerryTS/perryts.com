---
title: "真正的多线程、编译时 i18n 和 watchOS"
excerpt: "Perry v0.4.0：具有编译时安全性的真正操作系统线程、支持 30 多种语言环境的零仪式国际化系统、watchOS 作为第 9 个编译目标、音频和摄像头 API，以及并行编译器流水线。"
date: 2026-03-23
tags: ["threading", "i18n", "watchOS", "compiler", "milestone"]
---
Perry v0.4.0 是项目启动以来最大的版本。一个周期内三次版本跳跃 —— v0.3.0（i18n）、v0.3.2（watchOS）、v0.4.0（多线程）—— 编译器本身也实现了并行。以下是所有发布内容。

## 真正的多线程

Perry 现在拥有真正的操作系统线程并行性。不是具有序列化开销的 Web Worker。不是 `SharedArrayBuffer` 和 `Atomics`。真实线程 - 轻量级 8MB 堆栈操作系统线程，空闲时不共享任何内容且不产生任何费用。

新的 `perry/thread` 模块公开了三个原语：

```
import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Split work across all CPU cores, results in order
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filter in parallel
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Spawn a background thread, get a Promise
const result = await spawn(() => {
  // runs on a separate OS thread
  return computeExpensiveResult();
});
```

`parallelMap` 和 `parallelFilter` 自动检测 CPU 核心数量并在它们之间拆分输入数组。对于小型数组，它们完全跳过线程并同步运行 - 对于微不足道的工作负载没有任何开销。

`spawn` 启动后台操作系统线程并返回 Promise。结果通过待处理结果队列流回，该队列在微任务处理期间耗尽，因此您可以像任何其他异步操作一样`await`它。

### 编译时安全

最重要的部分不是 API，而是编译器*阻止的*。 Perry 静态地拒绝捕获可变变量的闭包：

```
let counter = 0;

// ✗ Compile error: closure captures mutable variable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejected at compile time
  return item * 2;
});
```

没有共享的可变状态意味着没有数据竞争。没有锁，没有互斥锁，没有`Atomics`。编译器在发出一行机器代码之前强制执行线程安全。

### 底层实现

每个工作线程都有自己的内存空间，并进行 `Drop` 清理 — 线程间无需进行 GC 协调。值通过 `SerializedValue` 深度复制传输：数字零成本，字符串、数组和对象 O(n)。该实现位于单个 1,120 行 Rust 文件 (`perry-runtime/src/thread.rs`) 中，不需要对垃圾收集器进行任何更改。

将此与 V8 隔离进行比较，后者要求每个工作线程有单独的堆，每个堆的开销约为 2MB。 Perry 的线程只是带有 arenas 的 pthreads。

### 并行编译器管道

编译器本身现在也是并行的。模块代码生成、转换通道（JS 导入、本机实例、单态化）和 `nm` 符号扫描均通过 rayon 在所有 CPU 内核上运行。结合 Cranelift 0.121 升级（从 0.113 - 寄存器分配的八个小版本和 x64 改进），编译速度显着加快。

## 编译时 i18n（v0.3.0）

Perry 的国际化系统零仪式。 UI 小部件中的字符串文字会自动视为可本地化的键。翻译文件是 `locales/` 目录中的平面 JSON。所有验证都在编译时发生。

```
// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Your code — just use strings normally
Button({ title: "greeting", action: () => {} })
```

编译器会验证所有内容：缺少翻译、参数不匹配、复数形式错误。翻译作为嵌入式 2D 字符串表烘焙到二进制文件中，运行时查找接近于零 - 启动时无需解析 JSON。

### 包含的内容

-   **CLDR 复数规则**，适用于 30 多种语言环境，包含 `.one`/`.other`/`.few`/`.many`/`.zero`/`.two` 后缀
-   **格式包装**：`Currency`、`Percent`、`ShortDate`、`LongDate`、`FormatNumber`、`FormatTime`、`Raw`
-   所有平台上的 **本机区域设置检测**：`CFLocaleCopyCurrent` (macOS/iOS)、`GetUserDefaultLocaleName` (Windows)、`system_property_get` (Android)、`LANG`/`LC_ALL` (Linux)
-   **`perry i18n extract`** CLI：扫描 TS/TSX 文件，生成和更新语言环境 JSON 脚手架
-   **平台原生资源生成**：iOS `.lproj` 和 Android `values-xx/` 目录
-   **`import { t } from "perry/i18n"`** 以本地化非 UI 字符串

在 `perry.toml` 中配置：

```
[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }
```

## watchOS 原生应用（v0.3.2）

Perry 现在编译为 watchOS — 第 9 个编译目标。这不是包装器或配套应用程序。它是一个独立的 watchOS 二进制文件，具有本机 SwiftUI 界面。

watchOS 渲染器使用**数据驱动方法**：Perry 通过 `perry_ui_*` FFI 调用，以及附带的 `PerryWatchApp.swift` 查询树并响应式渲染 SwiftUI 视图。支持 15 种小部件类型，并为不支持的小部件类型提供存根。

```
# Compile for watchOS
perry compile main.ts --target watchos

# Run on Apple Watch simulator
perry run watchos

# Setup signing for watchOS
perry setup watchos
```

整个流程有效：`perry setup watchos` 与 iOS 共享 App Store Connect 凭据，`perry run watchos` 自动检测 Apple Watch 模拟器，并且 `perry publish watchos` 提交到 App Store。

这也使**小部件目标总数达到四个**：iOS (WidgetKit)、Android (Glance)、watchOS (WidgetKit）和 Wear OS（Tiles）。每个都有自己的编译目标和代码生成后端。

## 音频和相机 API

此版本中发布了两个新的硬件 API：

### 音频捕获 (`perry/system`)

使用 A 加权 dB(A) 测量进行跨平台音频捕获：

```
import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) with EMA smoothing
const waveform = audioGetWaveformSamples();  // 256-sample ring buffer
audioStop();
```

平台后端：AVAudioEngine (macOS/iOS)、通过 JNI 的 AudioRecord (Android)、PulseAudio (Linux)、WASAPI (Windows)、getUserMedia + AnalyserNode（Web）。

### 相机捕获 (`perry/ui`)

具有像素级颜色采样的本机相机预览 (iOS)：

```
import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 averaging
```

## 生态系统包

推出了两个第一方原生软件包：

-   **perry/push** — 适用于 iOS/macOS 的推送通知绑定：权限请求、APNs 令牌检索、徽章计数。计划使用 FCM 的 Android 存根。
-   **perry/storekit** — StoreKit 2 应用内购买绑定：产品加载、使用 JWS 收据购买、订阅检查、恢复和交易侦听器。

两者都遵循相同的架构：TypeScript 声明 → Rust FFI 箱 → Swift 桥。作为依赖项安装，导入函数，`await`结果。编译器处理所有本机桥接。

## 基础设施

-   **Cranelift 0.113 → 0.121** — 八个次要版本的寄存器分配、x64 修复和堆栈槽对齐改进
-   **Windows 函数拆分** — 自动将包含 50 多个语句的函数拆分为延续，以解决 Windows 上的 Cranelift 代码生成问题
-   **选择性模块变量加载** - 仅在函数入口加载引用的模块级变量，将 Windows 二进制文件大小减少 26%
-   **Array.sort() 升级** — 从 O(n²) 插入排序到 O(n log n) TimSort 式混合排序
-   **perry run android** — 完整的 APK 构建管道：编译、Gradle 项目生成、assembleDebug、安装、启动
-   **自定义 Info.plist 条目** — perry.toml 中的 `[ios.info_plist]`，用于隐私说明、URL 方案、后台模式

## 数据一览

-   **版本**：0.2.197 → 0.4.0（三个主要里程碑）
-   **编译目标**：8 → 9（添加了watchOS）
-   **小组件目标**：1 → 4（iOS、Android、watchOS、Wear OS）
-   **新包**：perry-ui-watchos、perry-codegen-glance、perry-codegen-wear-tiles
-   **新文档**：线程（4 页）、i18n（4 页）、watchOS、扩展小部件文档（3 → 8 页）
-   **perry/thread 实现**：1,120 行 Rust，对 GC 进行零更改

## 下一步

线程基础开放了很多：并行 HTTP 请求处理、并发文件操作以及以前被单线程执行阻止的计算密集型工作负载。在语言方面，完整的正则表达式支持仍然是最大的差距，并且 `perry/ui` 扩展（拖放、辅助功能、DatePicker）仍在继续。

关注 [GitHub](https://github.com/PerryTS/perry) 上的进度，阅读 [docs.perryts.com](https://docs.perryts.com) 上的文档，或查看[路线图](/zh-Hans/roadmap/)了解完整情况。
