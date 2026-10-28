---
title: "完整流水线：文档、分发和 WidgetKit"
excerpt: "一周 82 次提交：49 页的文档站点、自动化 App Store 和 Play Store 发布、Homebrew 和 APT 软件包、从 TypeScript 创建的原生 WidgetKit 扩展、新组件、http/https 模块，以及自托管 LLVM 编译器。"
date: 2026-03-13
tags: ["distribution", "documentation", "WidgetKit", "milestone"]
---
七天 82 次提交。49 页的文档站点。自动化 App Store 和 Play Store 发布。 Homebrew 和 APT 包。从 TypeScript 编译的原生 WidgetKit 扩展。 自托管 LLVM 编译器。以及所有平台上的数十个错误修复。

这篇文章涵盖了 2026 年 3 月 6 日至 3 月 13 日期间在 Perry 中发布的所有内容。主题是完成 - 填补“我编写了一些 TypeScript”和“我的应用程序位于 App Store。”

## docs.perryts.com

Perry 现在有了一个真正的文档网站。使用 mdBook 构建的 49 页，涵盖从入门到 CLI 参考的所有内容。这些文档分为几个部分：

-   **入门** — 安装、第一个项目、项目结构
-   **语言功能** - Perry 支持 TypeScript 的所有内容
-   **原生 UI** — 12 个页面，涵盖所有小部件类型、布局、状态管理和特定于平台的行为
-   **平台** — 6 个目标平台各自的专用页面
-   **标准库** - 记录了 50 多个本机包实现
-   **系统 API** — 文件对话框、钥匙串、通知、多窗口
-   **WidgetKit** — 新的小部件扩展模块
-   **插件** — 编译时插件架构
-   **CLI 参考** — 每个命令和标志

该网站还包含一个用于 AI 可发现性的 `llms.txt` 文件，并通过带有自定义域的 GitHub 页面进行部署，位于 [docs.perryts.com](https://docs.perryts.com)。

## 一条命令安装 Perry

Perry 除了从源代码构建之外，现在还通过 Homebrew 和 APT 进行分发。新的 GitHub Actions 发布管道为 macOS（arm64 和 x86_64）和 Linux（x86_64 和 arm64）构建二进制文件，然后自动更新 Homebrew Tap 和 APT 存储库。

```text
# macOS
brew tap PerryTS/perry
brew install perry
# Debian/Ubuntu
sudo apt update && sudo apt install perry
```

不再需要克隆存储库并使用 Cargo 进行构建。像安装任何其他工具一样安装 Perry。

## 自动化 App Store 发布

这是折叠大多数手动步骤的更改。运行 `perry publish ios` 现在可以自动处理整个 iOS 分发管道：

1.  通过 App Store Connect 生成 RSA 密钥和 CSR API
2.  创建分发证书并将其捆绑到 `.p12`
3.  注册捆绑 ID
4.  创建并下载配置文件
5.  创建 App Store Connect 应用记录
6.  构建、签名并上传到 TestFlight 或 App Store

没有 Xcode。无需手动访问门户。无需从浏览器下载证书。设置向导会在您第一次发布时自动运行，逐步完成 API 密钥配置并将凭据存储在 `perry.toml` 中。

macOS 分发同样实现了自动化。Perry 支持三种模式：TestFlight、经过公证的 DMG，以及新增的 **“两者兼有”** 模式，后者会同时发布到 App Store 并生成经过公证的 DMG。三种证书也会自动生成：`MAC_APP_DISTRIBUTION`、`MAC_INSTALLER_DISTRIBUTION` 和 `DEVELOPER_ID_APPLICATION`。

Android 发布还获得了自动触发的设置向导。所有三个平台现在都遵循相同的模式：首次运行触发设置，凭据保存到项目中，后续运行是零配置。

预检验证可在构建开始之前发现问题 - 配置文件捆绑包 ID 不匹配、证书过期、应用程序图标丢失、版本格式无效、团队 ID 错误。并且 `perry.toml [ios]` 中的 `encryption_exempt` 会自动设置 `ITSAppUsesNonExemptEncryption` Info.plist 密钥，跳过 App Store Connect。

## perry/widget：WidgetKit 来自 TypeScript

Perry 现在可以将 TypeScript 编译为本机 SwiftUI WidgetKit 扩展。这不是包装器或桥梁 - 编译器在 HIR 级别遍历渲染树并直接发出 SwiftUI 源代码。输出是一个完整的 WidgetKit 扩展包，Xcode（或 Perry 的构建管道）可以嵌入到您的应用中。

```text
perry widget.ts --target ios-widget --app-bundle-id com.example.app -o out/
```

该方法与 Perry 的其他汇编完全不同。正常的 Perry 代码通过 Cranelift 生成本机机器代码。小部件代码通过 HIR 到 SwiftUI 文本输出，因为 WidgetKit 需要 SwiftUI — 无法使用命令式 UIKit 或 AppKit 代码构建小部件扩展。 Perry 通过将小部件渲染树视为编译时模板而不是运行时代码来解决此问题。

## 新组件和平台改进

本周推出了四种新的小部件类型：

-   **TextArea** — 在 macOS、iOS 和 Android 上进行多行文本编辑
-   **SecureField** — 在 iOS 和 macOS 上输入密码
-   **QR 码** — 在 iOS、macOS 和 Android 上生成原生 QR 码
-   **启动画面** — 自动生成的 LaunchScreen 故事板 (iOS) 和启动画面 (Android)

### iPad 原生化

Perry 现在可生成完整的 iPad 原生应用：`UIDeviceFamily [1,2]`、方向支持、`UIRequiresFullScreen` 以及通过 ibtool 编译的 LaunchScreen 故事板。新的 `getDeviceIdiom()` 函数可在运行时检测手机与 iPad，而 `PerryFrameSplit` 为 iPad 布局提供基于框架的水平分割容器。

### Windows

Windows 获得了计时器支持（50 毫秒 `WM_TIMER` 刻度）、具有深色主题背景的自绘按钮，并修复了 18 个小部件文件中的 `to_wide().as_ptr()` 中的释放后使用错误。 V8 运行时现在可以在 Windows 上运行，并链接所需的系统库。

### GTK4（Linux）

GTK4 后端进行了视觉美化，以匹配 macOS：边缘插入的 CSS 填充、Adwaita 按钮样式、VStack 边距修复以及 ScrollView 水平策略。

## http/https 和 better-sqlite3

两个重要的 stdlib 添加：

新的 `http` 和 `https` 本机模块在后台使用 reqwest 提供客户端 HTTP。 API 与 Node.js 匹配：`request()`、`get()`、带有 write/end/on 的 `ClientRequest` 和 `IncomingMessage` 以及 statusCode 和事件处理程序。

现已完全支持 `better-sqlite3`：`new Database()`、`prepare`、`exec`、`run`、 `get`、`all` — 具有正确的 NaN 装箱和具有命名属性访问权限的行对象。

其他 stdlib 改进：`crypto.randomBytes()` 现在返回一个缓冲区（匹配 Node.js），MongoDB 获得了 `listDatabases` 和 `listCollections` 进行了线程安全修复，mysql2 INSERT/UPDATE/DELETE 现在返回带有 `insertId` 的 `ResultSetHeader`。

## GC 和正确性修复

本周发布了几个关键的垃圾收集器和运行时正确性修复程序：

-   **GC 重入防护** — 防止分配期间的收集，修复 RefCell 双借用恐慌
-   **GC 地图跟踪** - 现在可以在标记阶段正确跟踪地图，防止字符串密钥收集
-   **字符串别名修复** - 字符串附加现在始终分配新字符串，修复指针复制别名造成的损坏
-   **BigInt 算术** — 右移对负数使用算术移位，按位运算使用 ToInt32 包装语义
-   **Map.get() undefined** — 对于缺失的键返回正确的 `TAG_UNDEFINED` 而不是错误的 NaN 标记
-   **静态字段 GC 根** - 注册为 GC 根的静态类字段中的 BigInt 值

这些都不是小事。仅 GC 重入修复就解决了整个类别的间歇性崩溃。字符串别名修复会影响将一个字符串变量分配给另一个字符串变量然后对其中任一变量进行变异的任何程序。这些错误仅在实际工作负载下才会出现，修复这些错误才能使编译器达到生产级。

## perry-verify：强化

`perry-verify`（自动化应用验证服务）获得了安全强化通过：在 Linux 上通过 `bwrap` 和在 macOS 上通过 `sandbox-exec` 进行沙盒执行， WebSocket 握手和二进制下载上的身份验证令牌、每个 IP 的速率限制、用于防止枚举的完整 UUID 作业 ID 以及减少的正文限制。

## perrysdad：自托管编译器

在并行的努力中，`perrysdad` — 一个用 TypeScript 编写的自托管 LLVM IR 编译器 — 从零到自编译一周的五个阶段：

1.  **阶段 0-1** — 端到端框架：HIR 到 LLVM IR 文本到 clang，与 Perry 的 `libperry_runtime.a`
2.  **第 2 阶段** — 手动递归下降解析器，对真实 `.ts` 文件进行 Pratt 表达式解析
3.  **第 3 阶段** — 运行时 FFI 的数组、对象和映射，并修复了关键的 ABI 不匹配问题（JSValue 在 LLVM 中声明为 double IR 而不是i64）
4.  **阶段 4** — 类、枚举、闭包、具有模块发现和拓扑排序的多文件编译

里程碑：自编译的 `anvil` 二进制文件现在可以编译测试程序并生成与节点编译版本匹配的正确输出。一个 TypeScript 编译器，由 Perry 编译为本机代码，将更多的 TypeScript 编译为本机代码。海龟一路下来。

## 数据一览

-   **82 次提交**到主 Perry 编译器
-   **1 个版本**：v0.2.173（3 月 8 日）
-   **49 个文档页面**，位于 docs.perryts.com
-   **4 个新小部件**：TextArea、SecureField、QR 码、启动画面
-   **3 个分发渠道**：Homebrew、APT、来源
-   **3 个自动化商店管道**：App Store、TestFlight、Google Play
-   **所有 6 个平台**本周都得到了改进

## 下一步

管道正在填充中。您可以编写 TypeScript、编译到六个平台、通过 Homebrew 或 APT 分发、发布到 App Store 和 Play 商店、添加主屏幕小部件以及阅读全面的文档 — 所有这一切都无需离开 Perry 的工具链。剩下的：

-   **完整的正则表达式支持** - 最后一个主要语言差距
-   **perry/ui 扩展** — 拖放、辅助功能标签、DatePicker
-   **perrysdad 成熟** — 将自托管编译器扩展到完全的 Perry 奇偶校验
-   **Hub 公开测试版** — 向外部用户开放分布式构建

关注 [GitHub](https://github.com/PerryTS/perry) 上的进展，阅读 [docs.perryts.com](https://docs.perryts.com) 上的新文档，或查看[路线图](/zh-Hans/roadmap/)了解完整情况。
