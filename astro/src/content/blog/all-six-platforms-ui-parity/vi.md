---
title: "Cả sáu nền tảng, đồng bộ tính năng hoàn toàn"
excerpt: "Hơn 20 widget UI gốc, widget Canvas, Table view, thông báo hệ thống, truy cập keychain, hỗ trợ nhiều cửa sổ và đồng bộ tính năng hoàn toàn trên macOS, iOS, iPadOS, Android, Linux và Windows — tất cả từ một mã nguồn TypeScript duy nhất."
date: 2026-02-28
tags: ["UI", "cross-platform", "release", "milestone"]
---
Khi chúng tôi ra mắt phiên bản đầu tiên của hệ thống UI native Perry, "đa nền tảng" có nghĩa là macOS hoạt động tốt và năm nền tảng còn lại chỉ là stub. Hôm nay, với v0.2.162, điều đó không còn đúng nữa. Tất cả sáu nền tảng — macOS, iOS, iPadOS, Android, Linux, và Windows — giờ chia sẻ đầy đủ tính năng tương đương. Cùng một mã TypeScript biên dịch thành widget native trên mọi target.

Bài viết này trình bày những gì chúng tôi ra mắt giữa v0.2.152 và v0.2.164: widget Canvas, triển khai NSTableView đầy đủ, hơn 20 widget UI, module `perry/system` module, hỗ trợ đa cửa sổ, thông báo hệ thống, truy cập keychain, tự động giảm kích thước binary, và hệ thống plugin thời gian biên dịch. Rất nhiều thứ đã xảy ra.

## Sprint Widget: Hơn 20 Component UI Native

Bước nhảy lớn nhất đến trong v0.2.155, ra mắt hơn 20 widget UI trên tất cả nền tảng. API UI TypeScript của Perry giờ bao gồm các component bạn thực sự cần để ra mắt ứng dụng thực:

-   **Layout** — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView
-   **Input** — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker
-   **Display** — Text, Label, Image, ProgressView, Divider, Spacer
-   **Data** — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)
-   **Overlay** — Alert, Sheet, Popover, Toolbar, NavigationBar
-   **Drawing** — Canvas (2D drawing API, hardware-accelerated per platform)

Đây không phải là wrapper xung quanh renderer tùy chỉnh. Mỗi widget biên dịch thành component native riêng của nền tảng: `NSButton` on macOS, `UIButton` on iOS, `GtkButton` on Linux, `android.widget.Button` on Android via JNI, and `CreateWindowEx` trên Windows. Hệ điều hành vẽ chúng, áp dụng theme, và xử lý trợ năng — Perry chỉ nối API TypeScript.

## Canvas: Vẽ 2D từ TypeScript

Một trong những bổ sung thú vị về mặt kỹ thuật là widget Canvas (v0.2.152). Nó cung cấp API vẽ 2D quen thuộc trực tiếp từ TypeScript — đường cong bezier, fill, stroke, blitting hình ảnh — và biên dịch thành backend 2D tăng tốc của nền tảng: Core Graphics trên macOS/iOS, Cairo trên Linux, Direct2D trên Windows, và Skia trên Android.

canvas.ts

import { Canvas, Color } from 'perry/ui';

// Compiles to Core Graphics on macOS, Cairo on Linux, etc.

const canvas = new Canvas({ width: 400, height: 300 });

canvas.onDraw((ctx) => {

ctx.fillStyle = Color.amber;

ctx.fillRect(10, 10, 100, 60);

ctx.strokeStyle = Color.blue;

ctx.lineWidth = 2;

ctx.beginPath();

ctx.arc(200, 150, 80, 0, Math.PI \* 2);

ctx.stroke();

});

## Widget Table: NSTableView đến với TypeScript

v0.2.163 landed the Table widget — the most complex component in the library. On macOS it maps to `NSTableView` with full delegate/data source wiring. On Linux it uses GTK4's `GtkTreeView`. On Windows, Win32's `ListView` control. On Android it binds to `RecyclerView` through JNI.

The TypeScript API is declarative: you define columns, provide a data source, and Perry handles the platform-specific wiring at compile time. Column sorting, selection handling, and row height customization all work out of the box.

table.ts

import { Table, Column } from 'perry/ui';

const table = new Table({

columns: \[

new Column({ title: "Name", key: "name", width: 200 }),

new Column({ title: "Size", key: "size", width: 80 }),

\],

rows: files, // TypeScript array of objects

onSelect: (row) => console.log(row.name),

});

## Module perry/system

v0.2.155 also introduced `perry/system` — a TypeScript module that exposes platform system APIs without any runtime: file dialogs, save dialogs, alerts, sheets, keychain access, system notifications, and multi-window management.

-   `system.showOpenDialog()` — native file picker (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)
-   `system.showSaveDialog()` — native save dialog
-   `system.showAlert()` — native alert panel
-   `system.notify()` — OS notification (UserNotifications / libnotify / WinRT)
-   `system.keychain.get/set()` — Keychain Services / Secret Service / Windows Credential Store
-   `system.openWindow()` — multi-window management

All of these call native platform APIs directly — no Electron IPC, no web view bridge. Perry compiles the TypeScript call site to a direct native function call into the platform SDK.

## Tương đương tính năng sáu nền tảng: v0.2.162

The v0.2.162 milestone was about closing gaps. Before this release, macOS had the fullest feature set, iOS was mostly there, and Linux/Windows/Android lagged. v0.2.162 brought all six platforms to the same level:

-   **macOS** — AppKit, complete widget set, Keychain, notifications, multi-window, toolbar
-   **iOS / iPadOS** — UIKit, full widget parity with macOS, scene lifecycle
-   **Android** — JNI bridge, all widgets via Android Views, NDK cross-compilation
-   **Linux** — GTK4, full widget set including Table, file dialogs, libsecret keychain
-   **Windows** — Win32, all widgets, Windows Credential Store, WinRT notifications

This is the milestone that makes "one codebase, six platforms" real rather than aspirational. The same TypeScript file compiles to native apps on all six targets with no platform-specific code paths required for common use cases.

## Tự động giảm kích thước Binary

v0.2.153 shipped automatic binary size reduction — the compiler now aggressively dead-strips unused code paths, eliminates unreachable stdlib functions, and deduplicates symbol definitions during linking. A typical CLI tool that previously compiled to ~4 MB now comes in under 2 MB with zero changes to your source.

This matters for real deployments. When your binary is the unit of deployment — copied to a server, distributed as a single file, embedded in a container — size directly affects transfer time and storage cost. Halving the binary size for free is a meaningful improvement.

## Hệ thống Plugin thời gian biên dịch

v0.2.152 introduced Perry's plugin system — and it's architecturally unlike every other plugin system in the TypeScript ecosystem. There's no runtime plugin loading, no IPC, no dynamic `require()`. Plugins are TypeScript modules that Perry resolves and compiles at build time.

The result: plugins have exactly zero runtime overhead. They compile into the same binary as your application code, with direct function calls between plugin code and host code. If you don't use a plugin, it doesn't appear in your binary at all. If you do use it, it's inlined like any other module.

We wrote about the philosophy behind this in [Plugin Systems Are a Performance Tax](/vi/blog/plugin-systems-are-a-performance-tax/). The short version: runtime plugin architectures trade performance for extensibility. Build-time composition gives you both.

## Cải tiến ngôn ngữ

The UI sprint didn't happen in isolation — the compiler itself kept getting more capable. Across these releases:

-   **Class expressions** — `const Foo = class extends Bar {}` now compiles correctly
-   **Generator transforms** — `function*` and `yield` compile to native state machines
-   **Map/Set as class fields** — `private items = new Map()` works in codegen
-   **FFI param type coercion** — native library calls handle type coercion automatically
-   **Bound method references** — `this.method` references work for native modules (fs, os, path)
-   `string.match()` — now fully supported
-   `path.isAbsolute()`, multi-arg `path.join()`, `path.resolve()`
-   **Web target** — Perry can now compile to a web-compatible output for hybrid deployments

## Tiếp theo là gì

With six-platform UI parity shipped, the next phase is depth over breadth. We're working on:

-   Full RegExp support (`regex.test()`, `string.matchAll()`)
-   Drag and drop, custom context menus, and accessibility labels in the widget system
-   A VS Code extension for Perry diagnostics and compile-on-save
-   Package manager integration — install and compile Perry-native packages with one command
-   WASM compilation target for browser deployment
-   Multi-threading via `Worker` threads

Nếu bạn muốn theo dõi, [Perry repo](https://github.com/PerryTS/perry) đã mở. Xem [showcase](/vi/showcase/) để thấy những gì đang được xây dựng, hoặc duyệt [roadmap](/vi/roadmap/) để có bức tranh toàn cảnh.
