---
title: "All Six Platforms, Full Feature Parity"
excerpt: "20+ native UI widgets, a Canvas widget, Table views, system notifications, keychain access, multi-window support, and full feature parity across macOS, iOS, iPadOS, Android, Linux, and Windows — all from a single TypeScript codebase."
date: 2026-02-28
tags: ["UI", "cross-platform", "release", "milestone"]
---
When we shipped the first version of Perry's native UI system, "cross-platform" meant macOS worked well and the other five platforms were stubs. Today, with v0.2.162, that's no longer true. All six platforms — macOS, iOS, iPadOS, Android, Linux, and Windows — now share full feature parity. The same TypeScript code compiles to native widgets on every target.

This post walks through what we shipped between v0.2.152 and v0.2.164: a Canvas widget, a full NSTableView implementation, 20+ total UI widgets, the `perry/system` module, multi-window support, system notifications, keychain access, automatic binary size reduction, and a compile-time plugin system. A lot happened.

## The Widget Sprint: 20+ Native UI Components

The biggest single jump came in v0.2.155, which landed 20+ UI widgets across all platforms. Perry's TypeScript UI API now covers the components you actually need to ship a real app:

-   **Layout** — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView
-   **Input** — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker
-   **Display** — Text, Label, Image, ProgressView, Divider, Spacer
-   **Data** — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)
-   **Overlay** — Alert, Sheet, Popover, Toolbar, NavigationBar
-   **Drawing** — Canvas (2D drawing API, hardware-accelerated per platform)

These aren't wrappers around a custom renderer. Each widget compiles to the platform's own native component: `NSButton` on macOS, `UIButton` on iOS, `GtkButton` on Linux, `android.widget.Button` on Android via JNI, and `CreateWindowEx` on Windows. The OS draws them, themes them, and handles accessibility — Perry just wires up the TypeScript API.

## Canvas: 2D Drawing from TypeScript

One of the more technically interesting additions is the Canvas widget (v0.2.152). It exposes a familiar 2D drawing API directly from TypeScript — bezier curves, fills, strokes, image blitting — and compiles to the platform's accelerated 2D backend: Core Graphics on macOS/iOS, Cairo on Linux, Direct2D on Windows, and Skia on Android.

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

## Table Widget: NSTableView Comes to TypeScript

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

## The perry/system Module

v0.2.155 also introduced `perry/system` — a TypeScript module that exposes platform system APIs without any runtime: file dialogs, save dialogs, alerts, sheets, keychain access, system notifications, and multi-window management.

-   `system.showOpenDialog()` — native file picker (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)
-   `system.showSaveDialog()` — native save dialog
-   `system.showAlert()` — native alert panel
-   `system.notify()` — OS notification (UserNotifications / libnotify / WinRT)
-   `system.keychain.get/set()` — Keychain Services / Secret Service / Windows Credential Store
-   `system.openWindow()` — multi-window management

All of these call native platform APIs directly — no Electron IPC, no web view bridge. Perry compiles the TypeScript call site to a direct native function call into the platform SDK.

## Six-Platform Feature Parity: v0.2.162

The v0.2.162 milestone was about closing gaps. Before this release, macOS had the fullest feature set, iOS was mostly there, and Linux/Windows/Android lagged. v0.2.162 brought all six platforms to the same level:

-   **macOS** — AppKit, complete widget set, Keychain, notifications, multi-window, toolbar
-   **iOS / iPadOS** — UIKit, full widget parity with macOS, scene lifecycle
-   **Android** — JNI bridge, all widgets via Android Views, NDK cross-compilation
-   **Linux** — GTK4, full widget set including Table, file dialogs, libsecret keychain
-   **Windows** — Win32, all widgets, Windows Credential Store, WinRT notifications

This is the milestone that makes "one codebase, six platforms" real rather than aspirational. The same TypeScript file compiles to native apps on all six targets with no platform-specific code paths required for common use cases.

## Automatic Binary Size Reduction

v0.2.153 shipped automatic binary size reduction — the compiler now aggressively dead-strips unused code paths, eliminates unreachable stdlib functions, and deduplicates symbol definitions during linking. A typical CLI tool that previously compiled to ~4 MB now comes in under 2 MB with zero changes to your source.

This matters for real deployments. When your binary is the unit of deployment — copied to a server, distributed as a single file, embedded in a container — size directly affects transfer time and storage cost. Halving the binary size for free is a meaningful improvement.

## The Compile-Time Plugin System

v0.2.152 introduced Perry's plugin system — and it's architecturally unlike every other plugin system in the TypeScript ecosystem. There's no runtime plugin loading, no IPC, no dynamic `require()`. Plugins are TypeScript modules that Perry resolves and compiles at build time.

The result: plugins have exactly zero runtime overhead. They compile into the same binary as your application code, with direct function calls between plugin code and host code. If you don't use a plugin, it doesn't appear in your binary at all. If you do use it, it's inlined like any other module.

We wrote about the philosophy behind this in [Plugin Systems Are a Performance Tax](/en/blog/plugin-systems-are-a-performance-tax/). The short version: runtime plugin architectures trade performance for extensibility. Build-time composition gives you both.

## Language Improvements

The UI sprint didn't happen in isolation — the compiler itself kept getting more capable. Across these releases:

-   **Class expressions** — `const Foo = class extends Bar {}` now compiles correctly
-   **Generator transforms** — `function*` and `yield` compile to native state machines
-   **Map/Set as class fields** — `private items = new Map()` works in codegen
-   **FFI param type coercion** — native library calls handle type coercion automatically
-   **Bound method references** — `this.method` references work for native modules (fs, os, path)
-   `string.match()` — now fully supported
-   `path.isAbsolute()`, multi-arg `path.join()`, `path.resolve()`
-   **Web target** — Perry can now compile to a web-compatible output for hybrid deployments

## What's Next

With six-platform UI parity shipped, the next phase is depth over breadth. We're working on:

-   Full RegExp support (`regex.test()`, `string.matchAll()`)
-   Drag and drop, custom context menus, and accessibility labels in the widget system
-   A VS Code extension for Perry diagnostics and compile-on-save
-   Package manager integration — install and compile Perry-native packages with one command
-   WASM compilation target for browser deployment
-   Multi-threading via `Worker` threads

If you want to follow along, the [Perry repo](https://github.com/PerryTS/perry) is open. Check out the [showcase](/en/showcase/) to see what's already being built, or browse the [roadmap](/en/roadmap/) for the full picture.
