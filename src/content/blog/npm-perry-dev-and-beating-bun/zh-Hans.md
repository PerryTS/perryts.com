---
title: "npm 分发、perry dev，以及在每一项基准上取胜"
excerpt: "Perry 在六天内从 v0.5.80 升级到 v0.5.174。@perryts/perry 在 npm 上为全部七个受支持的平台发布。perry dev 在内存 AST 缓存和磁盘上每模块 object 缓存之上加入了 watch 模式的自动重编译。json_roundtrip 关闭了最后一道缺口——Perry 现在在每一项基准上同时击败 Node.js 和 Bun。"
date: 2026-04-23
tags: ["npm", "developer-experience", "performance", "watch-mode", "milestone"]
---
上一篇博客发布时，Perry 版本是 v0.5.80，基准测试表上还有一项倔强的失利：`JSON.parse`/`stringify` 往返仍比 Node 慢 1.6 倍。六天后，Perry 已经来到 **v0.5.174**——也就是**发布了 94 个补丁版本**——而在谈其他一切之前，有三件事值得先说：

-   `@perryts/perry` 登陆 **npm**。一条命令即可在所有支持的平台上安装 Perry。
-   **`perry dev`** 在新的内存 AST 缓存和磁盘上每模块 object 缓存之上，加入了 watch 模式的自动重编译。
-   `json_roundtrip` 的失利已经追平。Perry 现在在主基准套件里**每一项都击败 Node 和 Bun**（各 15/15）。

文章的其余部分是配角：WebAssembly 修复，watchOS 终于端到端编译成功，`perry/thread` 基元被完整接通，以及一批编译期严格性方面的胜利——把悄无声息的丢弃变成真正的错误。

## 1\. `@perryts/perry` 上 npm

Perry 一直通过 macOS 上的 Homebrew 和 Debian/Ubuntu 上的 APT 安装。对那些平台上的开发者覆盖得不错，但对 Windows 用户来说，除非自己从源码编译，就完全没有办法；对一个同时混用 Mac、Linux 和 Windows 的团队来说，也没有统一的方式。v0.5.107 让这个问题消失了。

```
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp
```

这个包是一个很薄的启动器，依赖七个按平台划分的可选包——macOS arm64/x64、Linux x64/arm64（分别有 glibc 和 musl 两种）、Windows x64——npm 只会安装与当前机器匹配的那一个。每个平台的二进制体积在一位数 MB 的低端。安装本身只需几秒。也有全局安装的路径（`npm install -g @perryts/perry`）如果你更偏爱那样，但项目本地安装会把编译器版本固定在依赖旁边，这才是正确的默认选择。

发布走了 OIDC 受信发布者（Trusted Publisher），所以每个版本都带有出处（provenance），并能追溯回构建它的 CI 任务。这本身就耗掉了一整天的 CI 工作——几次 `v0.5.107` 的 CI 提交在追正确的 `--provenance` / npm 版本 / workflow 路径组合——但它落地了，此后每次发布都干净利落。Windows 用户现在是头等公民，跨团队的“按你操作系统喜欢的方式装”式摩擦也消失了。

## 2\. `perry dev`——watch 模式

v0.5.143 新增了一个 CLI 子命令：

```
perry dev
```

就这样。它监视你的项目，在保存时重编译，并重新启动你的二进制。灵感来自 Vite 和 `nodemon`；目的是不再假装“编译到二进制”的工作流必须比 runtime 慢。对大多数项目，`perry dev` 在缓存热身后能在不到一秒内完成重建。

这里“缓存热身”很关键。两个新缓存和 `perry dev` 同时落地：

-   **内存 AST 缓存**（v0.5.156）。在同一个 `perry dev` 会话的多次重建之间，Perry 会为每个磁盘上未改变的模块保留已解析的 AST。编辑一个文件只会重新解析一个文件，而不是整个模块图。
-   **磁盘上每模块 object 缓存（V2.2）**。每个模块编译到自己的 `.o` 文件并做哈希；未变化的模块完全跳过代码生成，链接器会拾取已缓存的目标文件。缓存的详细输出与 [#131](https://github.com/PerryTS/perry/issues/131) 里的规格吻合，v0.5.160 中一轮审计加固关闭了头部变化后陈旧缓存项仍可能存活的边界情况。

两层缓存是叠加的。会话的第一次编辑是完整编译；之后的每一次只做与你实际改动成比例的工作。这是本周最大的一次 DX 飞跃。

## 3\. 在每一项基准上击败 Bun

在 v0.5.166 时，README 里还有一个坦白的说明：Perry 在 `json_roundtrip` 上比 Node 慢 1.6 倍（对一个 1MB、10K 条目的 blob 做 50 次 `JSON.parse` + `JSON.stringify`），比 Bun 慢 2.4 倍。Issue [#149](https://github.com/PerryTS/perry/issues/149) 跟踪了后续工作。到 v0.5.173——七天之后——这个差距已经被追平。

|工作量| Perry v0.5.173 | Node v25 | Bun 1.3 |
| --- | --- | --- | --- |
| `json_roundtrip` | 314ms | 377ms | 250ms |
| `closure` | 10ms | 309ms | 51ms |
| `factorial` | 31ms | 596ms | 98ms |
| `fibonacci(40)` | 320ms | 1033ms | 521ms |
| `mandelbrot` | 23ms | 25ms | 30ms |

Perry 现在在主基准套件的每个工作负载上都胜出——**对 Node 15/15，对 Bun 15/15**，在 macOS ARM64 上取 5 次运行的最佳值。Bun 1.3 在峰值 RSS 上仍然领先（在 `json_roundtrip` 上是 84MB，而 Perry 是 310MB），所以分配器压力是下一个要弥合的差距，但原始延迟已经是 Perry 的了。

JSON 差距的弥合不是单一一次改动——而是贯穿本周的对象布局对等工作的累积：Phase 1 对象字面量 shape 推断（v0.5.167）、Phase 4 基于函数体的自由函数、类方法、getter 和箭头函数返回类型推断（v0.5.169）、以及 Phase 4.1 方法调用返回类型推断（v0.5.170）。主题和上一篇一样：给 LLVM 足够的静态结构让它能看穿，优化器会搞定剩下的。

v0.5.164 还恢复了纯 fadd 归约循环上的 `<2 x double>` 并行累加器自动向量化——它在 v0.5.9x→v0.5.16x 之间的某个点悄然回退了。正是这个让 `math_intensive` 和 `accumulate` 回到了过去对 Rust/C++/Go/Swift 领先 3-4 倍的水平——同样的 LLVM，只需一个 `reassoc contract` 标志，一个向量化的循环体。

## 4\. `perry/ui` 与文档测试

剩下的四个 perry/ui 缺口在 v0.5.151 中关闭。同时，v0.5.119 把悄无声息的 perry/ui API 误用从“能编译但什么都不做”翻转为硬编译错误——与 v0.5.165 对装饰器应用的同样逻辑（见下文）。误用在编译期暴露出来总比在运行时才出现要好。

v0.5.123 交付了一个 **文档示例测试 harness** 和一个 widget 画廊。文档中的每一个 TypeScript 示例现在都会在每次 CI 运行时编译，widget 画廊会把截图与既定基线进行比较。v0.5.125 把这个扩展到了一个交叉编译矩阵：每个文档示例除了主机平台外，还会为 iOS、tvOS、Android、WASM 和 Web 构建，这样跨目标的 API 漂移会在引入它的 PR 上就被捕获，而不是等到发布版本才发现。

一个小小的体验提升：`perry check` 现在对 HIR 降级错误会输出 `file:line:column`（[#129](https://github.com/PerryTS/perry/issues/129)），这意味着编辑器跳转到错误位置能正常工作，而不是只显示一条没有位置信息的通用消息。

## 5\. watchOS 端到端编译

watchOS 上个月就作为一个编译目标发布了，但干净的端到端构建还有一些毛刺。本周的 watchOS 工作：

-   **v0.5.113**：`--target watchos` 和 `--target watchos-simulator` 现在端到端编译，不再需要积攒下来的那些 workaround。
-   **v0.5.114**：为 Metal-surface 应用提供 `--features watchos-game-loop`。
-   **v0.5.122**：`--features watchos-swift-app`——用于 SwiftUI 宿主渲染，当你希望 SwiftUI 拥有应用生命周期，而 Perry 在其中组合 UI 时使用。
-   **v0.5.135**：`PERRY_UI_TEST_MODE` 接入 perry-ui-ios 和 perry-ui-tvos，这样 Geisterhand UI 测试在这两个目标上运行起来与在 macOS 和 Linux 上完全一致。

## 6\. `perry/thread` 基元完整接通

v0.5.174（今天）关闭了 [#146](https://github.com/PerryTS/perry/issues/146)：`parallelMap`、`parallelFilter` 和 `spawn` 已经在代码生成路径上完整接通，并带有编译期安全强制检查。可变捕获会在编译期被拒绝——与 perry/ui 和装饰器现在具备的编译期正确性姿态一致。自 v0.4.0 发布以来只是部分接通的线程基元，如今已端到端完成。

## 7\. WebAssembly 与 Web 目标

两个值得一提的 WASM 修复：

-   **v0.5.158**：`--target web`（即 WASM 输出路径）里五个彼此掩盖的复合 bug。作为一批修复，Web 目标现在能在完整的 `perry/ui` 面上稳住（[#133](https://github.com/PerryTS/perry/issues/133)）。
-   **v0.5.161**：在循环内的 `if` 里使用 `break`/`continue` 在 WASM 上会挂起——一个在原生目标上没法复现的代码生成 bug。已修复（[#135](https://github.com/PerryTS/perry/issues/135)）。

正确性一侧还有：v0.5.157 修复了 Android 上 `obj.field` 返回 `NaN` 的问题（[#128](https://github.com/PerryTS/perry/issues/128)），v0.5.162 修复了一个诡异的 ws bug，其中 `sendToClient` 和 `closeClient` 之前被编译成了悄无声息的 no-op（[#136](https://github.com/PerryTS/perry/issues/136)）。

## 8\. 编译期严格性的胜利

本周的一个主题：任何曾经是静默失败的事情，现在都变成了编译错误。

-   **v0.5.165**：TypeScript 装饰器之前被解析进 HIR 然后被悄悄丢弃。现在它们在装饰点上以清晰的信息报错（[#144](https://github.com/PerryTS/perry/issues/144)）。和 v0.5.119 对 perry/ui 应用的相同“警告→报错”推理。
-   **v0.5.119**：perry/ui API 误用在编译期被拒绝，而不是产生一个 no-op 的二进制。
-   **v0.5.172**：`console.trace()` 现在会向 stderr 输出真正的原生回溯，而不是仅仅回显消息（[#20](https://github.com/PerryTS/perry/issues/20)）。符号化的栈帧需要 `PERRY_DEBUG_SYMBOLS=1`；没有它你只能得到地址，但这也已经比它替换掉的“回显消息”行为多得多了。

## 9\. 收尾

本周的模式：**分发**（npm）、**开发者体验**（`perry dev`，增量缓存），以及**最后一项基准失利的关闭**。再加上一批编译期严格性，把静默丢弃变成真正的错误。六天，94 个补丁版本，一次大的 DX 飞跃。

来试试：

```
# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Watch mode for iterative dev
perry dev
```

源码：[github.com/PerryTS/perry](https://github.com/PerryTS/perry) —— 文档：[docs.perryts.com](https://docs.perryts.com) —— 更新日志：[CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
