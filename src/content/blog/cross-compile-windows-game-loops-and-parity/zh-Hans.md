---
title: "交叉编译到 Windows、iOS 游戏循环和 100% 测试对等"
excerpt: "一周 103 次提交：通过 lld-link 从 Linux 交叉编译到 Windows、iOS 游戏循环支持、崩溃报告、两阶段 Hub 构建流水线，以及自托管编译器达到 68/68 确定性测试对等。"
date: 2026-03-20
tags: ["compiler", "cross-compilation", "infrastructure", "milestone"]
---
本周 Perry 编译器 103 次提交。主要特性：现在可以从 Linux 交叉编译 Windows 可执行文件，iOS 应用可以运行阻塞式游戏循环，编译器报告 崩溃用于遥测，自托管编译器通过了所有确定性测试。 加上重大 Hub 基础设施升级和 50+ 个错误修复。

## 从 Linux 交叉编译到 Windows

Perry 现在可以从 Linux 主机生成 Windows `.exe` 二进制文件。这是 CI/CD 管道所缺少的部分，需要以 Windows 为目标，而无需运行 Windows 构建机器来进行整个编译。

该实现将编译时的 `#[cfg]` 检查替换为运行时的目标检测。当编译器在非 Windows 主机上遇到 Windows 目标时，会通过新增的 `find_llvm_tool()` 辅助函数，从 Rust 工具链或 PATH 中查找 `lld-link`、`llvm-nm` 和 `llvm-ar`。Windows 系统库来自 `PERRY_WINDOWS_SYSROOT` 指向的 [xwin](https://github.com/Jake-Shadle/xwin) 风格 sysroot。

链接器自动使用 `/FORCE:UNRESOLVED` 并为缺失的 UI 符号生成存根，因此 CLI 应用可以干净地交叉编译。当面向 Windows 时，输出默认为 `.exe`。完整的详细信息位于[交叉编译文档](https://docs.perryts.com)中。

**终端 — Linux 主机**

```
$ perry compile main.ts --target windows
Compiling main.ts for windows-x86_64...
Using lld-link from Rust toolchain
✓ Compiled executable: main.exe (2.8 MB)
```

## iOS 游戏循环支持

iOS 需要 UIKit 拥有主线程。对于事件驱动的应用程序来说这很好，但对于需要阻塞 `while (!shouldClose)` 循环的游戏来说，这是一个问题。 Perry 现在使用 `--features ios-game-loop` 标志解决了这个问题。

启用后，编译器会发出 `_perry_user_main` 而不是 `main`。运行时提供了一个 `main()` ，它在主线程上调用 `UIApplicationMain` 并在后台线程上生成代码。场景委托和应用委托处理完整的 UIKit 生命周期，同时您的游戏循环运行畅通无阻。

**main.ts**

```typescript
// Your game loop runs on a background thread
while (!shouldClose) {
update();
render();
awaitNextFrame();
}
```

```text
$ perry run ios --features ios-game-loop
```

这使得整个类别的应用程序（游戏、模拟、实时可视化）成为可能，而这些应用程序以前在 iOS 上是不实用的。 iOS 泵和回调路径现在也包含在紧急处理中，因此可以清楚地捕获游戏循环或 UIKit 生命周期中的崩溃。

## 崩溃报告

Perry 编译的应用现在会在启动时安装 `SIGSEGV`、`SIGBUS` 和 `SIGABRT` 的紧急挂钩和信号处理程序。当发生致命崩溃时，详细信息将写入 Chirp 遥测系统的 `~/.hone/crash.log`。捕获恐慌（在 `catch_callback_panic` 中）会清除日志，因此仅报告真正的不可恢复的崩溃。

这是一项生产就绪功能。当现场出现问题时，我们会知道，并且崩溃日志包含足够的上下文来诊断问题，而无需用户手动报告任何内容。

## Hub：两阶段 Windows 构建管道

Perry Hub 构建基础架构进行了重大架构升级。以前，针对 Windows 进行构建需要 Windows 工作人员来完成整个编译过程。现在管道分为两个阶段：

1.  Linux 工作人员使用新的 lld-link 支持交叉编译 Windows 工件
2.  集线器保存预编译的工件并为 Windows 工作线程重新排队作业
3.  Windows 工作线程仅处理签名和打包 — 一项轻松得多的任务

当工作人员发送带有 `needs_finishing: "windows"` 的 `complete` 时，Hub 会透明地重新排队作业。 CLI 提供无缝的单一构建体验。

现在，当没有连接 Windows 工作线程时，Hub 也会自动启动 Azure Windows VM，并在新版本上构建工作线程自动更新到最新的 Perry 版本。更少的手动基础设施管理，更快的构建。

## 文档大改

本周在 [docs.perryts.com](https://docs.perryts.com) 上发布了两个主要文档重写：

-   **perry.toml 参考** — 完整的部分文档，涵盖每个配置选项、捆绑包 ID 解析、入口文件解析、内部版本号自动递增和 CI/CD 示例
-   **Geisterhand 参考** — 完整的 API 文档、平台设置、测试自动化模式以及跨平台 UI 测试框架的架构概述

这些不是增量更新。两者都是彻底重写，涵盖了每个功能和配置选项。如果您正在设置新项目或编写测试，请从这里开始。

## 跨平台菜单 API

`menuClear` 和 `menuAddStandardAction` 之前仅限 macOS。它们现在可在所有 6 个本机平台上运行。这还包括修复 Windows 上 `dispatch_menu_item` 中的 `RefCell` 重入恐慌。

### Android：16 KB 页面对齐

Google Play 现在要求本机库采用 16 KB 页面对齐。 Perry 自动设置适当的 `CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS`，并将配套的 `.so` 文件复制到输出旁边以包含 APK/AAB。

## Perry React：看板

React 兼容性层进行了实际测试：完整的 5 列看板，具有移动、添加、删除和查看操作。在 JSX 中构建未覆盖的嵌套数组子级渲染 - 递归 `_appendChildren` 处理程序现在可以正确展平从 `.map()` 调用返回的数组。还有一个新的 14 部分厨房水槽工作台演示，涵盖各种 UI 模式。

## Anvil：100% 确定性测试对等

`perrysdad` — 使用 TypeScript 编写并由 Perry 编译的自托管 LLVM 编译器 — 现已通过 **68 次确定性测试中的 68 次，与主编译器的输出完全匹配。唯一的区别是固有的（时间戳、`Math.random()`），并且跳过了 11 个测试，因为它们需要尚未实现的 UI、计时器、加密或特定于平台的功能。**

实现这一目标的关键工作：

-   **接口方法调度** - 接口类型变量现在通过 ObjectHeader 中基于 class_id 的调度返回正确的方法
-   **动态属性访问** - 计算属性名称的运行时调度
-   **闭包和 this 绑定** — 对象方法的正确捕获语义
-   **第 6 阶段正在进行中** - 异步/等待、生成器和条件修复

确定性测试 100% 均等是一个重要的里程碑。这意味着自编译的 `anvil` 二进制文件对于每个可测试的场景都会产生与主编译器完全相同的输出。完全自托管的差距正在缩小。

## 50+ 个错误修复

本周重大正确性推动。亮点：

-   **JSON.parse** — 数组不再被截断为 16 个元素，正确处理无效输入
-   **Uint8Array** — 数组变量的构造函数，`.set(source, offset)` 实现（无操作）
-   **BigInt** — 使用 `BIGINT_TAG` 进行跨模块调用的 NaN 装箱，keccak256 32 位截断修复
-   **可选链接** — 嵌套条件表达式、toString 检测、返回值 NaN 装箱
-   **IndexSet** — 字符串 NaN 装箱更正为使用 `STRING_TAG` 而不是 `POINTER_TAG`
-   **MySQL** — DATETIME 和 BLOB 类型，`Date(string)` 构造函数
-   **Math.min/max** — 扩展参数处理
-   **本机方法调度** — `POINTER_TAG` 对象的字段扫描和调用

这些并不是极端情况。 JSON.parse 截断 16 个元素的数组会破坏任何实际应用程序。 Uint8Array.set 作为无操作会默默地损坏数据。这些修复使编译器达到生产级，一次一个正确性错误。

## 数据一览

-   **103 次提交**到主 Perry 编译器
-   **3 个版本**：v0.2.195、v0.2.196、v0.2.197
-   **1个主要功能**：从Linux交叉编译Windows
-   **1 个新应用类别**：iOS 游戏循环
-   **68/68** perrysdad 中的确定性测试奇偶校验
-   **50 多个错误修复**，涉及 NaN-boxing、stdlib 和本机 FFI
-   **2 个文档重写**：perry.toml 和 Geisterhand
-   **5 项 Hub 改进**：两阶段管道、Azure 自动启动、工作线程自动更新

## 下一步

Windows 交叉编译打开了全自动多平台 CI/CD 的大门 - 推送 TypeScript，为每个目标获取本机二进制文件，无需为每个操作系统配备专用构建机器。游戏循环支持解锁了全新的 iOS 应用类别。 perrysdad 中 100% 确定性测试奇偶性意味着自托管正在变得非常真实。剩下的：

-   **完整的正则表达式支持** - 最后一个主要语言差距
-   **perry/ui 扩展** — 拖放、辅助功能标签、DatePicker
-   **perrysdad 第 6 阶段** — 异步/等待、生成器，向完全 Perry 平价扩展
-   **Hub 公开测试版** — 向外部用户开放分布式构建

关注 [GitHub](https://github.com/PerryTS/perry) 上的进度，阅读 [docs.perryts.com](https://docs.perryts.com) 上的文档，或查看[路线图](/zh-Hans/roadmap/)了解完整情况。
