---
title: "tvOS、从 Linux 交叉编译 iOS 和 Perry Login"
excerpt: "Perry v0.4.24：tvOS 作为第 10 个编译目标，通过 ld64.lld 从 Linux 交叉编译 iOS 和 macOS，perry login 支持按量计费，Windows UI 改版，macOS 公证，5 天内 120 次提交。"
date: 2026-03-28
tags: ["tvOS", "cross-compilation", "billing", "Windows", "milestone"]
---
五天，120 次提交，Perry 从 v0.4.0 跃升至 v0.4.24。亮点：tvOS 成为第 10 个编译目标，iOS 和 macOS 应用现在可以完全从 Linux 构建，perry login 带来基于使用量的计费，Windows UI 进行了全面改造。以下是所有发布内容。

## tvOS：第 10 个编译目标

Perry 现在可以编译到 Apple TV。 tvOS 目标使用与 watchOS 相同的 SwiftUI 渲染器，共享数据驱动架构，其中 Perry 构建 UI 树，并由附带的 Swift 主机应用程序本地渲染它。与现有的 `@perry/threads` WASM 集成相结合，tvOS 应用可以在后台运行计算量大的工作负载，同时保持 UI 响应能力。

```
# Compile for Apple TV
perry compile main.ts --target tvos

# Run on tvOS simulator
perry run tvos
```

这使得目标总数达到 **10**：macOS、iOS、iPadOS、Android、Linux、Windows、watchOS、tvOS、WebAssembly 和Web/JavaScript。一个 TypeScript 代码库，十个本机输出。

## 从 Linux 交叉编译 iOS 和 macOS

Perry 现在可以使用 `ld64.lld` 作为 Mach-O 链接器，完全从 Linux 计算机构建 iOS 和 macOS 二进制文件。这是全自动 CI/CD 所缺少的部分 - 将 TypeScript 推送到 Linux 服务器，为每个 Apple 平台获取签名的本机二进制文件，而无需 macOS 构建机器。

到达这里需要解决一系列链接器问题：

-   **Mach-O codegen 三元组** — 为 Cranelift 添加了 `aarch64-apple-macos` 和 `aarch64-apple-ios` 目标三元组
-   **框架链接** — 用于交叉编译的 CoreGraphics、Metal、IOKit、DiskArbitration 框架搜索路径
-   **`-lobjc`** — 所有 Apple 目标所需的 ObjC 运行时符号
-   **SDK 版本** — ld64.lld 中的 `sdk_version 26.0`（Apple 要求 iOS 18+）
-   **死区剥离** — `-dead_strip` 而不是 Mach-O 链接器的 `-Wl,-dead_strip`
-   **运行时重复数据删除** — 从 UI 静态库中删除重复的 `perry_runtime` 以避免链接错误

结合现有的 Linux → Windows 交叉编译 (v0.2.195+)，Perry 现在可以交叉编译到 **Linux 的每个平台** - iOS、macOS、Windows、Android、WASM 和 Web。

## iOS App Store 就绪

此周期的一个主要重点是使 Perry 编译的 iOS 应用完全符合 App Store 标准：

-   **完整 Info.plist** — 所有 Apple 所需的密钥：`CFBundleIdentifier`、`CFBundleName`、`CFBundleShortVersionString`、`CFBundleVersion`、`UIDeviceFamily`、`UIRequiredDeviceCapabilities`
-   **CFBundleIcons** — 标准 iOS 图标命名（`AppIcon60x60@2x` 等），具有后备分辨率
-   **来自 perry.toml 的版本** — `version` 和 `build_number` 字段直接流入 Info.plist
-   **UILaunchScreen** — 使用现代键而不是 `UILaunchStoryboardName`（不需要故事板文件）
-   **配置文件** — macOS 配置文件支持 App Store 和 TestFlight 分发

## Perry 登录和计费

Perry 现在拥有帐户和基于使用情况的计费，由新的 `perry login` CLI 命令和位于 [app.perryts.com](https://app.perryts.com)。

### 工作原理

-   **`perry login`** — GitHub OAuth 设备流程，打开浏览器，轮询是否完成
-   **免费套餐** — 每月 15 次构建，使用 GitHub 帐户进行无限项目
-   **专业级** — 通过 Polar.sh 订阅无限构建
-   **API 令牌** — 从 CI/CD 仪表板生成和管理令牌
-   **使用情况跟踪** — 每月发布并验证带有实时使用情况栏的计数器

仪表板本身是一个 Perry 编译的 Fastify 服务器，具有 Next.js 静态导出 — 使用 Perry 构建，为 Perry 用户提供服务。

## macOS 公证和代码签名

两个新的签名功能：

-   **`perry publish macos --notarize`** — 自动切换到开发者 ID 证书（而不是 App Store 证书），提交到 Apple 的公证服务，并装订结果
-   **GCloud KMS 代码签名** - 现在可以使用 Google Cloud KMS 密钥对 Windows 版本进行签名，从而在 CI 中实现自动签名，而无需暴露私钥

## Windows UI 全面改造

Windows UI 后端收到了迄今为止最全面的更新：

-   **DPI 感知缩放** - 窗口大小、字体和小部件尺寸在高 DPI 显示器上正确缩放
-   **启动器样式窗口 API** — 无边框窗口，可为启动器/聚光灯样式 UI 提供自定义定位
-   **全局热键** — 系统范围的键盘快捷键，即使应用程序未聚焦也能正常工作
-   **应用程序图标** — `getAppIcon` API，用于在启动器 UI 中显示应用程序图标
-   **重入安全布局** — 基于 `RefCell` 的绘制替换为 `SetPropW` HWND 存储，以防止嵌套 WM_PAINT 消息期间出现恐慌
-   **Geisterhand 集成** — 所有在 UI 测试框架中注册的小部件类型，`/type` 通过 HWND 映射使用 `SendMessageW`
-   **Android 相机支持** — 相机捕捉 API 通过 JNI 扩展到 Android

## 性能

v0.4.14 提供了全面的性能审核：

-   **本机 `fcmp`** — 浮点比较使用本机 CPU 指令而不是运行时函数调用。 Mandelbrot 基准**快了 30%**。
-   **就地字符串追加** — `str += "text"` 就地修改缓冲区，而不是分配新字符串。重复串联**速度提高 125 倍**。
-   **短路 AND/OR** — `&&` 和 `||` 当结果已确定时，跳过正确操作数的计算。
-   **负字面折叠** - `-1`、`-0.5` 等在 HIR 级别折叠为常量，而不是发出否定指令。

## Hub 并行构建

构建编排服务器现在支持每个工作线程并发构建：

-   **基于槽位的调度** — 工作人员报告 `max_concurrent` 容量，Hub 跟踪每个工作人员的活动作业
-   **不再有 429** - 当所有工作人员都很忙时，作业会排队而不是被拒绝
-   **Base64 工件下载** - 当 Perry 运行时无法处理原始二进制 HTTP 响应时，二进制工件充当 Base64
-   **自动重新连接 WebSocket** — 建立监控连接，在断开连接时自动重新连接

## 新包：perry/appstorereview

用于提示应用商店评论的新第一方包：

```
import { requestReview } from "perry/appstorereview";

// Opens the native review prompt
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();
```

一个功能，两个平台，原生审核UI。计时和显示逻辑完全留给开发人员。

## 代码生成修复

120 次提交意味着大量错误修复。最有影响力：

-   **严格相等 (===)** - v0.4.2 中修复了三个单独的错误：类型标记比较、NaN 处理和 null/未定义区别
-   **连接字符串的字符串比较** - `===` 在比较通过连接构建的字符串时由于指针比较而不是内容比较而失败
-   **构造函数解析** - `new X(args)` 现在可以正确解析跨模块导入的构造函数和基于闭包的构造函数
-   **模块级数组推送** - 推送到循环中嵌套函数调用内的模块级数组的值由于重新分配后指针过时而丢失
-   **空算术强制转换** - `null + 1` 现在可以通过 `js_number_coerce` 正确生成 `1`
-   **按位不换行** — `~x` 现在根据 ECMAScript 语义换行到 i32
-   **fetch().then()** — 由于缺少事件循环耗尽 (v0.4.3)，回调从未在本机 UI 应用中触发
-   **WASM 模数和指数** - `%` 和 `**` 运算符导致 WASM 验证错误 (v0.4.5)

## 数据一览

-   **5 天内向主 Perry 编译器提交了约 120 次**
-   **24 个补丁版本**：v0.4.1 → v0.4.24
-   **编译目标**：9 → 10（添加了 tvOS）
-   **从 Linux 交叉编译目标**：Windows → Windows、iOS、macOS（所有 Apple + Windows）
-   **新软件包**：perry/appstorereview
-   **新基础设施**：app.perryts.com 仪表板、perry 登录 CLI、Polar.sh 计费
-   **性能提升**：mandelbrot（原生 fcmp）速度提高 30%，字符串连接速度提高 125 倍

## 下一步

从 Linux 交叉编译 iOS 和 macOS 意味着 Hub 现在可以从单个 Linux 服务器为每个平台进行构建 — 不再需要专用的 macOS 构建机器进行编译（仅用于签名）。计费基础设施为 Hub 公开测试版开辟了道路。添加 tvOS 后，Perry 涵盖了所有 Apple 平台：macOS、iOS、iPadOS、watchOS 和 tvOS。

-   **Hub 公共测试版** — 外部用户可以推送 TypeScript 并获取本机二进制文件
-   **完整的正则表达式支持** - 最后一个主要语言差距
-   **perry/ui 扩展** — 拖放、辅助功能、DatePicker
-   **源映射和调试信息** — 用于本机调试的 DWARF 调试信息

关注 [GitHub](https://github.com/PerryTS/perry) 上的进度，阅读 [docs.perryts.com](https://docs.perryts.com) 上的文档，或查看[路线图](/zh-Hans/roadmap/)了解完整情况。
