---
title: "真正的多线程、编译时 i18n 和 watchOS"
excerpt: "Perry v0.4.0：具有编译时安全性的真正操作系统线程、支持 30 多种语言环境的零仪式国际化系统、watchOS 作为第 9 个编译目标、音频和摄像头 API，以及并行编译器流水线。"
date: 2026-03-23
tags: ["threading", "i18n", "watchOS", "compiler", "milestone"]
---
Perry v0.4.0 是项目启动以来最大的版本。一个周期内三次版本跳跃 —— v0.3.0（i18n）、v0.3.2（watchOS）、v0.4.0（多线程）—— 编译器本身也实现了并行。以下是所有发布内容。

## 真正的多线程

Perry now has real OS-threaded parallelism. Not web workers with serialization overhead. Not `SharedArrayBuffer` with `Atomics`. Real threads — lightweight 8MB-stack OS threads that share nothing and cost nothing when idle.

The new `perry/thread` module exposes three primitives:

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

`parallelMap` and `parallelFilter` auto-detect the number of CPU cores and split the input array across them. For small arrays, they skip threading entirely and run synchronously — no overhead for trivial workloads.

`spawn` launches a background OS thread and returns a Promise. The result flows back via a pending results queue that's drained during microtask processing, so you `await` it like any other async operation.

### 编译时安全

The most important part isn't the API — it's what the compiler *prevents*. Perry statically rejects closures that capture mutable variables:

```
let counter = 0;

// ✗ Compile error: closure captures mutable variable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejected at compile time
  return item * 2;
});
```

No shared mutable state means no data races. No locks, no mutexes, no `Atomics`. The compiler enforces thread safety before a single line of machine code is emitted.

### 底层实现

Each worker thread gets its own memory arena with `Drop` cleanup — no GC coordination across threads. Values are transferred via `SerializedValue` deep-copy: zero-cost for numbers, O(n) for strings, arrays, and objects. The implementation lives in a single 1,120-line Rust file (`perry-runtime/src/thread.rs`) and required no changes to the garbage collector.

Compare this to V8 isolates, which require separate heaps per worker with ~2MB overhead each. Perry's threads are just pthreads with arenas.

### 并行编译器管道

The compiler itself is now parallel too. Module codegen, transform passes (JS imports, native instances, monomorphization), and `nm` symbol scanning all run across all CPU cores via rayon. Combined with the Cranelift 0.121 upgrade (from 0.113 — eight minor versions of register allocation and x64 improvements), compilation is significantly faster.

## 编译时 i18n（v0.3.0）

Perry's internationalization system has zero ceremony. String literals in UI widgets are automatically treated as localizable keys. Translation files are flat JSON in a `locales/` directory. All validation happens at compile time.

```
// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Your code — just use strings normally
Button({ title: "greeting", action: () => {} })
```

The compiler validates everything: missing translations, parameter mismatches, plural form errors. Translations are baked into the binary as an embedded 2D string table with near-zero runtime lookup — no parsing JSON at startup.

### 包含的内容

-   **CLDR plural rules** for 30+ locales with `.one`/`.other`/`.few`/`.many`/`.zero`/`.two` suffixes
-   **Format wrappers**: `Currency`, `Percent`, `ShortDate`, `LongDate`, `FormatNumber`, `FormatTime`, `Raw`
-   **Native locale detection** on all platforms: `CFLocaleCopyCurrent` (macOS/iOS), `GetUserDefaultLocaleName` (Windows), `system_property_get` (Android), `LANG`/`LC_ALL` (Linux)
-   **`perry i18n extract`** CLI: scans TS/TSX files, generates and updates locale JSON scaffolds
-   **Platform-native resource generation**: iOS `.lproj` and Android `values-xx/` directories
-   **`import { t } from "perry/i18n"`** for localizing non-UI strings

Configure it in `perry.toml`:

```
[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }
```

## watchOS 原生应用（v0.3.2）

Perry now compiles to watchOS — the 9th compilation target. This isn't a wrapper or a companion app. It's a standalone watchOS binary with a native SwiftUI interface.

The watchOS renderer uses a **data-driven approach**: Perry builds a UI tree via `perry_ui_*` FFI calls, and a shipped `PerryWatchApp.swift` queries the tree and renders SwiftUI views reactively. 15 widget types are supported with stubs for unsupported ones.

```
# Compile for watchOS
perry compile main.ts --target watchos

# Run on Apple Watch simulator
perry run watchos

# Setup signing for watchOS
perry setup watchos
```

The full flow works: `perry setup watchos` shares App Store Connect credentials with iOS, `perry run watchos` auto-detects Apple Watch simulators, and `perry publish watchos` submits to the App Store.

This also brings the total **widget target count to four**: iOS (WidgetKit), Android (Glance), watchOS (WidgetKit), and Wear OS (Tiles). Each has its own compile target and codegen backend.

## 音频和相机 API

Two new hardware APIs ship in this release:

### Audio Capture (`perry/system`)

Cross-platform audio capture with A-weighted dB(A) measurement:

```
import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) with EMA smoothing
const waveform = audioGetWaveformSamples();  // 256-sample ring buffer
audioStop();
```

Platform backends: AVAudioEngine (macOS/iOS), AudioRecord via JNI (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web).

### Camera Capture (`perry/ui`)

Native camera preview with pixel-level color sampling (iOS):

```
import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 averaging
```

## 生态系统包

Two first-party native packages launched:

-   **perry/push** — Push notification bindings for iOS/macOS: permission requests, APNs token retrieval, badge count. Android stub with FCM planned.
-   **perry/storekit** — StoreKit 2 in-app purchase bindings: product loading, purchases with JWS receipts, subscription checking, restore, and transaction listeners.

Both follow the same architecture: TypeScript declarations → Rust FFI crate → Swift bridge. Install as a dependency, import the functions, `await` the results. The compiler handles all native bridging.

## 基础设施

-   **Cranelift 0.113 → 0.121** — eight minor versions of register allocation, x64 fixes, and stack slot alignment improvements
-   **Windows function splitting** — auto-splits functions with 50+ statements into continuations to work around Cranelift codegen issues on Windows
-   **Selective module-var loading** — only loads referenced module-level variables at function entry, reducing Windows binary size by 26%
-   **Array.sort() upgrade** — from O(n²) insertion sort to O(n log n) TimSort-style hybrid
-   **perry run android** — full APK build pipeline: compile, Gradle project generation, assembleDebug, install, launch
-   **Custom Info.plist entries** — `[ios.info_plist]` in perry.toml for privacy descriptions, URL schemes, background modes

## 数据一览

-   **Version**: 0.2.197 → 0.4.0 (three major milestones)
-   **Compilation targets**: 8 → 9 (added watchOS)
-   **Widget targets**: 1 → 4 (iOS, Android, watchOS, Wear OS)
-   **New crates**: perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles
-   **New docs**: threading (4 pages), i18n (4 pages), watchOS, expanded widget docs (3 → 8 pages)
-   **perry/thread implementation**: 1,120 lines of Rust, zero changes to the GC

## 下一步

The threading foundation opens up a lot: parallel HTTP request processing, concurrent file operations, and compute-heavy workloads that were previously blocked by single-threaded execution. On the language side, full regex support remains the biggest gap, and the `perry/ui` expansion (drag and drop, accessibility, DatePicker) continues.

Follow the progress on [GitHub](https://github.com/PerryTS/perry), read the docs at [docs.perryts.com](https://docs.perryts.com), or check the [roadmap](/zh-Hans/roadmap/) for the full picture.
