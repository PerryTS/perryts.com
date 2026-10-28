---
title: "自动更新、实时 Inspector，以及把自己砍掉一半的编译器"
excerpt: "Perry v0.5.306 → v0.5.359 用了四天 — 53 个补丁版本、约 30 个 issue 关闭，以及三件大事落地：面向桌面的 perry/updater 自动更新、localhost:7676 上的实时 inspector，以及把四个最大文件削减 33–91% 的编译器重构。"
date: 2026-04-28
tags: ["updater", "devtools", "refactor", "community", "milestone"]
---
上一篇文章在 **v0.5.306** 收尾，主线是 gen-GC + JSON + 基准。四天后，Perry 已经到了 **v0.5.359** — 也就是 **53 个补丁版本** — 故事又变了。这些版本里没有一个是以基准数字作为头条。几乎全部都是 **跟踪器中的 issue 被关闭**。

-   **`perry/updater`** 上线 — 桌面应用的 Sparkle / Tauri 风格自动更新（对 SHA-256 摘要做 Ed25519 签名、哨兵回滚、分离重启）。社区 PR，由 **TheHypnoo** 贡献（[#224](https://github.com/PerryTS/perry/pull/224)）。
-   **Geisterhand 阶段 D** — `http://localhost:7676` 上的实时 inspector，包含 widget 树、按 widget 详情、点击分发、以及通过 `POST /style/:h` 实时编辑样式。
-   **编译器重构。** 在 v0.5.329 → v0.5.343 期间，最常被提到的 4 个文件被切分：`lower::lower_expr` 6,687 → 624 LOC（−91%）、`compile.rs` 9,391 → 3,783 LOC（−60%）、`lower.rs` 13,591 → 7,554 LOC（−44%）、`lower_call.rs` 7,000+ → 4,681 LOC（−33%）。新的 `walker.rs` 把 `_ =>` 通配 catch-all 这一类 bug 转成编译期错误。
-   **UI 样式阶段 C 收官** — 在 Apple、Android、GTK4、Windows 和 Web 的每个 widget 上都支持内联 `style: { ... }` 属性。Windows 接通了 5 个桩中的 4 个（decoration / opacity / borders）；只剩 `widget.shadow`（DirectComposition 后续跟进）。
-   **面向 Windows 的 Scoop bucket**：`scoop install perry-ts/perry`。release 工作流加入 SHA-256 sidecar。
-   **一波社区 issue 修复** — 在 runtime、codegen、fetch、GTK4、Windows linker、async、stdlib 等维度共关闭约 30 个 issue。

## 1\. perry/updater — 桌面应用自动更新

修复前 Perry 没有任何更新路径。应用打包发布、再发布，仅此而已。**TheHypnoo** 在 [#224](https://github.com/PerryTS/perry/pull/224) 提供了完整方案：

```
import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // 上次启动崩溃时执行哨兵回滚

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(`${pct}%`));
  await update.installAndRelaunch();
}

markHealthy(); // 在新构建成功启动后调用
```

信任模型：**对文件的 SHA-256 摘要做 Ed25519 签名**（不是对文件字节签名 — 大二进制下验证仍然便宜）。manifest 是 JSON，带 schema 版本，每个 `<os>-<arch>` 三元组一条记录。原子安装并保留 `<exe>.prev` 备份，分离重启（Unix 上 `setsid`，Windows 上 `DETACHED_PROCESS`）。移动端按设计排除 — App Store / Play Store 在 OS 层面拥有安装管线。

编写冒烟测试时浮现出 Perry 运行时的两个怪癖，并被一并修掉：

-   **`response.arrayBuffer()` 之前只返回元数据 stub。** 在 [#232](https://github.com/PerryTS/perry/pull/232) 修复（同样是 TheHypnoo） — `js_response_array_buffer` 现在分配真正的 `BufferHeader`，并把 `resp.body` 通过 `memcpy` 拷贝进去。
-   **`fs.appendFileSync` 写入了 0 字节。** 在 [#226](https://github.com/PerryTS/perry/issues/226) 修复 — 命名空间导入的 lowering 路径（`import * as fs from "fs"`）没有 `appendFileSync` 的分支，LLVM codegen 也没有对应 HIR 变体的分支。两边都已接通。

文档位于 `docs/src/updater/overview.md`。

## 2\. Geisterhand：localhost:7676 上的实时 inspector

Geisterhand 一直是 Perry 的进程内 UI 测试工具 — 端口 7676 上的 HTTP API，用来快照 widget 状态、分发点击。阶段 D 把它变成可以从任何浏览器打开的 devtools 风格 inspector。

-   **步骤 1（v0.5.349）** — `GET /` 提供一个单页 vanilla-JS UI，包含 widget 树、按 widget 的详情（frame、value、原始 JSON）、1.5 秒自动刷新（可暂停/恢复），以及一个“触发 onClick”按钮。codegen 针对 macOS 的延迟加载 `-dead_strip` 把 `INSPECTOR_HTML` 钉死，确保它在 release 构建中存活下来。
-   **步骤 2（v0.5.350）** — `POST /style/:h` 接收一袋 JSON 属性并实时应用。9 个属性（`backgroundColor`、`color`、`borderColor`、`borderWidth`、`borderRadius`、`opacity`、`padding`、`hidden`、`enabled`）通过现有 pump-queue 从 HTTP 线程 → 主线程流转。坏 JSON → 400；坏 handle → 400；未知属性在服务端被过滤，响应里列出哪些通过了。

```
perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \
  -H 'content-type: application/json' \
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}
```

macOS 派发器已接通；Linux / Windows / iOS / tvOS / visionOS / Android 走相同形态，是接下来要做的。

## 3\. 编译器重构 — 切开四个最大的文件

跟踪器中的 5 个 issue（[#167](https://github.com/PerryTS/perry/issues/167)、[#169](https://github.com/PerryTS/perry/issues/169)、[#212](https://github.com/PerryTS/perry/issues/212)、[#214](https://github.com/PerryTS/perry/issues/214)，加上长尾）形态相同：往 `ir.rs` 加了一个新的 `Expr` 变体，但 `lower.rs` 中四个临时 walker 之一带有 `_ =>` 通配，悄悄把新变体编译错了。在运行时抓这种问题代价昂贵 — 有时是无形的，有时是 SSO 下的 SIGSEGV。

**v0.5.329** 引入 `crates/perry-hir/src/walker.rs`，提供 `walk_expr_children` / `walk_expr_children_mut` — 对全部 178 个 `Expr` 变体的穷尽 match，**不带 catch-all**。增加新变体而不在这里登记，现在直接是编译错误。四个消费者（`substitute_locals`、`find_max_local_id::check_expr`、`collect_local_refs_expr`、`remap_local_ids_in_expr`）随之收缩：

| 函数 | 前 | 后 | Δ |
| --- | --- | --- | --- |
| `find_max_local_id::check_expr` | 225 | 57 | −75% |
| `substitute_locals` | 553 | 80 | −86% |
| `collect_local_refs_expr` | 720 | 70 | −90% |
| `remap_local_ids_in_expr` | 542 | 85 | −84% |

合计：**消除 1,830 行重复 descent**，被 **新增 1,840 行集中式 walker** 取代 — 净增减为零，但这一类 bug 没了。

随后其他工作得以推进。**v0.5.331 → v0.5.343** 在 14 次提交里切开了四个巨石。头条数字：

| 文件 | 前 | 后 | Δ |
| --- | --- | --- | --- |
| `lower::lower_expr` | 6,687 | 624 | −91% |
| `compile.rs` | 9,391 | 3,783 | −60% |
| `lower.rs` | 13,591 | 7,554 | −44% |
| `lower_call.rs` | 7,000+ | 4,681 | −33% |

切分落地为 19 个聚焦的子模块：`compile/{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}.rs`、`lower/{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}.rs`、`lower_call/{ui_styling, builtin, native}.rs`，外加新的 `crates/perry-dispatch` crate，成为 UI / system / i18n 方法表的单一事实源（曾导致 issue [#191](https://github.com/PerryTS/perry/issues/191)“在 macOS 上能编译，在 web 上崩”那种意外的 `_ => "perry_ui_unknown"` 扇出，现在就一次查表）。

**Tier 4 性能优化** 同行（v0.5.335–v0.5.336）：

-   把 `inline_functions` 中两个 pass 与 `compile.rs` 中三个 rayon pass 合并 — 每次编译节省 5 次模块扫描和 3 次调度往返。
-   把 `perry dev` 的解析缓存限制为 500 条、FIFO 淘汰。修复前一个遍历 `node_modules` 的会话能持有 100+ MB 的 SWC AST。
-   把 codegen 后的 `.ll` 写入循环并行化 — 在含 50+ 模块的 SSD 上 wall-time 快 2–4 倍。
-   用 `Arc<I18nTable>` 取代每个 worker 都克隆 locale 表。

Workspace 测试每次提交都保持 **434 passed / 0 failed / 5 ignored**；gap 测试维持基线 25/28；doc-tests 维持基线 80/82。

## 4\. UI 样式阶段 C，收尾

阶段 C 是内联 `style: { ... }` 的铺开。本时间窗内步骤 1–7 收口：

-   **v0.5.305 → v0.5.306** — `StyleProps` 类型表面 + Button 上的内联 `style:`。
-   **v0.5.307 → v0.5.309** — 每个表格类 widget 上的 color/padding/shadow 内联解构，随后是 VStack / HStack。
-   **v0.5.310 → v0.5.311** — 十六进制字符串 + 渐变 + 用于动态值的运行时 `parseColor`。
-   **v0.5.312** — 样式文档 + Windows 跟踪 issue。

之后是跨平台扫尾：

-   **GTK4**（[#202](https://github.com/PerryTS/perry/issues/202)、[#206](https://github.com/PerryTS/perry/issues/206)） — 接通 4 个样式 FFI，外加阻塞 Linux doc-tests gate 的 7 个缺失 FFI（v0.5.322）。
-   **macOS**（v0.5.324） — 为 `widget.shadow` 接通 `CALayer` 阴影管道 + visual\_test 基础设施；为非 `NSTextField` widget 加上 `set_color` 类探测。
-   **iOS / tvOS / visionOS**（v0.5.346） — Button 的 `color: ...` 之前在 `UIButton` 上调用 `setTextColor:`，但它没有实现这个 selector；`objc2` 的 panic 跨过 `extern "C"` 边界，进程被中止。沿用 macOS 同款类探测模式修复 — UIButton 现在走 `setTitleColor:forState:UIControlStateNormal`。
-   **Windows**（v0.5.347） — 接通了 5 个样式桩中的 4 个（`text.decoration` 走 `LOGFONT` round-trip，`widget.opacity` 走 `WS_EX_LAYERED` + `SetLayeredWindowAttributes`，borders 走 `SetWindowSubclass` + `WM_PAINT`）。只剩 `widget.shadow`（需要 DirectComposition）。

`docs/src/ui/styling-matrix.md` 中的样式矩阵在窗口结束时为：**Web 43/43 已接通**、**Windows 42/43 已接通**，其余覆盖完整。

## 5\. 运行时正确性 pass — 一个 issue 一个 issue 地

本时段的主题：每个通过跟踪器进来的错误编译，要么变成修复，要么变成编译期错误。亮点：

-   **[#212](https://github.com/PerryTS/perry/issues/212)（v0.5.323）** — `fn` 内的类方法无法捕获包裹 fn 的 local。多模块复现现在与 Node 字节级一致。
-   **[#214](https://github.com/PerryTS/perry/issues/214)（v0.5.321 + v0.5.330）** — 7 处字符串操作数点位的 SSO 安全 string-handle 拆箱：`arr.join`、`arr.toString`、`obj[stringKey]` 的 get/set/delete、`string.match(re)`、`process.env[dynKey]`、crypto digest 输入。修复前每一处对内联字符串操作数都要么悄悄返回垃圾，要么直接 SIGSEGV。
-   **[#221](https://github.com/PerryTS/perry/issues/221)（v0.5.351）** — 模块级别为空的 `const` 数组从函数内部接收的 `arr[i]=` 写入会丢失。Bloom-Engine/jump 的 `discoverLevels()` 在模块级别用 index-assign 填 `LEVEL_FILES`，关卡选择界面渲染为空时浮现。
-   **[#233](https://github.com/PerryTS/perry/issues/233)（v0.5.357）** — 当数组以参数形式传入 async 函数时，`Array.push` 会被悄悄限制在 16 个元素。async 函数不会被内联；重新分配返回的新指针调用方看不到。修复：每次扩容都在旧位置安装一个 forwarding 指针，复用 GC 现有的 `GC_FLAG_FORWARDED` 机制。
-   **[#235](https://github.com/PerryTS/perry/issues/235)（v0.5.358）** — 调用方省略尾部参数时，方法默认参数派发会传垃圾。两处共谋：跨模块方法声明硬编码 6 个 double，而不是 `arity + 1`；同时 `lower_class_method` 根本没调用 `build_default_param_stmts`。在 mongodb 的 `findOne(filter, options = {})` 静默挂起时浮现；修复在本地与跨模块派发上是统一的。
-   **[#236](https://github.com/PerryTS/perry/issues/236)（v0.5.355）** — 来自一个复现的三个独立 fetch + promise bug：api.github.com 对匿名请求返回 403（现在设置默认 User-Agent），`.then(console.log)` 永久挂起（null 回调没有把 TASK\_QUEUE 条目入队），每个 fetch 拒绝都打印 `Uncaught exception: [object Object]`（NaN-box 的裸 `*StringHeader` 而不是真正的 `ErrorHeader`）。
-   **[#234](https://github.com/PerryTS/perry/issues/234)（v0.5.359）** — 拥有 `arrayBuffer` / `text` / `bytes` / `slice` 实例方法的真实 `Blob`。修复前 `await response.blob()` 只返回元数据 stub `{size, type}`。三部分修复落地于 runtime + HIR + codegen。

外加一些小补：

-   **[#181](https://github.com/PerryTS/perry/issues/181)** — strip-dedup 在 Linux 上过度修剪泛型单态化 + GTK4 链接静默 fallback。修复：用通过 `llvm-nm` 的**符号集合**比较替代名称模式过滤。哪怕只有一个独有符号的成员都保留。在没有链接错误的情况下把 `libperry_ui_macos.a` 从 196 → 35 个对象。
-   **[#220](https://github.com/PerryTS/perry/issues/220)** — 给 Windows 链接行加上 `secur32.lib`。
-   **[#198](https://github.com/PerryTS/perry/issues/198)** — i18n `FormatNumber` 通过 Ryū 进行 FP round-trip。
-   **[#188](https://github.com/PerryTS/perry/issues/188)** — 为 `perry/i18n` 的格式包装器接通 codegen 派发。
-   **[#189](https://github.com/PerryTS/perry/issues/189) / [#203](https://github.com/PerryTS/perry/issues/203)** — `perry/plugin` codegen 派发。
-   **[#190](https://github.com/PerryTS/perry/issues/190)** — Canvas widget 通过 LLVM codegen。
-   **[#191](https://github.com/PerryTS/perry/issues/191)** — CameraView 通过 codegen。
-   **[#192](https://github.com/PerryTS/perry/issues/192)** — Table widget 通过 codegen。
-   **[#193](https://github.com/PerryTS/perry/issues/193)**（部分） — 11 个 stdlib helper 派发分支。
-   **[#98](https://github.com/PerryTS/perry/issues/98)** — iOS + Android 的后台接收通知（warm-path）。
-   **[#106](https://github.com/PerryTS/perry/issues/106)** — watchOS 游戏循环 FFI 钩子的弱回退。
-   **[#154](https://github.com/PerryTS/perry/issues/154)** — `using` / `await using` 的 dispose 钩子。
-   **[#167](https://github.com/PerryTS/perry/issues/167)** — `js_native_call_method` 的参数 alloca 提升到 entry 块。
-   **[#169](https://github.com/PerryTS/perry/issues/169)** — `substitute_locals` 的 Uint8Array 分支。
-   **[#226](https://github.com/PerryTS/perry/issues/226)** — `fs.appendFileSync` 端到端接通（社区 PR）。

## 6. Windows + 勺子

Windows 工具链故事在持续简化。**v0.5.353** 在 host 构建中对 `clang -target` 进行钉死 — PATH 上的非 MSVC clang（MinGW / MSYS2 / Anaconda / Rust GNU bundle）会悄悄把 Perry 的 `x86_64-pc-windows-msvc` IR 改写成 `windows-gnu`，lld-link 无法解析 LLVM 的 mingw32 emitter 插入的 `__main` 引用。新增的 `probe_clang_default_triple` 每个进程跑一次 `clang --version`，当 host 默认是 GNU 但我们目标是 MSVC 时打印一行信息提示。可用 `PERRY_NO_CLANG_PROBE=1` 抑制。

**v0.5.345** 把 Win64 上的 `perry-ui` ABI 与 `perry-dispatch` 对齐 — 三个运行时 extern 签名漂移了（`perry_ui_navstack_create`、`perry_ui_menu_add_item_with_shortcut`、`perry_ui_app_set_timer`）。Win64 ABI 中整型与浮点位置参数共享槽位索引，因此不匹配时会从未初始化寄存器读到垃圾。SysV（macOS / Linux）使用分离的 int/float 寄存器池，恰好落上有效位 — 仅 Windows 崩溃，已在 8 个 perry-ui-\* 平台 crate 中全部修复。

然后：**`scoop install perry-ts/perry`**。manifest 钉在 v0.5.345（用 `depends: main/llvm` 自动拉取官方 MSVC 默认 LLVM）。release 工作流现在会在每个归档旁产出 `<artifact>.sha256` sidecar，格式与 `sha256sum` 兼容，便于任何下游包管理器 bumper 使用。

```
# Windows host
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\main.ts --target windows -o myapp.exe
```

## 7\. 收尾

本阶段的主线是社区参与加上内部清扫。**TheHypnoo** 提交了三个重要 PR（[#224](https://github.com/PerryTS/perry/pull/224) perry/updater、[#231](https://github.com/PerryTS/perry/pull/231) `fs.appendFileSync` 接通、[#232](https://github.com/PerryTS/perry/pull/232) `response.arrayBuffer` 的 body 字节）。跟踪器清掉了大约 30 个 issue。编译器最大文件缩了 60%，并长出了一个穷尽 walker，让“忘了更新四个临时 walker 中的一个”从运行时错编译变成 `cargo build` 错误。UI 样式在所有桌面平台上达到等同水准，Windows 上仅剩阴影。Geisterhand 长出了浏览器端的 devtools 表面。Windows 上的安装路径少了一条命令。

试一试：

```
# npm（任意平台）
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew（macOS）
brew install PerryTS/perry/perry

# Scoop（Windows）
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# 桌面应用自动更新
npm install @perry/updater

# 实时 inspector
perry compile main.ts -o app --enable-geisterhand
./app &  # 然后打开 http://localhost:7676
```

源码：[github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues：[github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues) — Changelog：[CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
