---
title: "Pipeline hoàn chỉnh: Tài liệu, phân phối và WidgetKit"
excerpt: "82 commit trong một tuần: trang tài liệu 49 trang, xuất bản tự động trên App Store và Play Store, gói Homebrew và APT, phần mở rộng WidgetKit gốc từ TypeScript, widget mới, module http/https và trình biên dịch LLVM tự lưu trữ."
date: 2026-03-13
tags: ["distribution", "documentation", "WidgetKit", "milestone"]
---
82 commit trong bảy ngày. Trang tài liệu với 49 trang. Xuất bản App Store và Play Store tự động. Gói Homebrew và APT. Extension WidgetKit native biên dịch từ TypeScript. Trình biên dịch LLVM tự host. Và hàng chục bản sửa lỗi trên mọi nền tảng.

This post covers everything that shipped in Perry between March 6 and March 13, 2026. The theme is completion — filling in the gaps between "I wrote some TypeScript" and "my app is in the App Store."

## docs.perryts.com

Perry now has a real documentation site. 49 pages built with mdBook, covering everything from getting started to the CLI reference. The docs are organized into sections:

-   **Getting Started** — installation, first project, project structure
-   **Language Features** — everything Perry supports from TypeScript
-   **Native UI** — 12 pages covering all widget types, layout, state management, and platform-specific behavior
-   **Platforms** — dedicated pages for each of the 6 target platforms
-   **Standard Library** — 50+ native package implementations documented
-   **System APIs** — file dialogs, keychain, notifications, multi-window
-   **WidgetKit** — the new widget extension module
-   **Plugins** — compile-time plugin architecture
-   **CLI Reference** — every command and flag

The site also includes an `llms.txt` file for AI discoverability, and is deployed via GitHub Pages with a custom domain at [docs.perryts.com](https://docs.perryts.com).

## Cài đặt Perry bằng một lệnh

Perry is now distributed through Homebrew and APT, in addition to building from source. A new GitHub Actions release pipeline builds binaries for macOS (arm64 and x86\_64) and Linux (x86\_64 and arm64), then automatically updates the Homebrew tap and APT repository.

terminal

\# macOS

brew tap PerryTS/perry

brew install perry

\# Debian/Ubuntu

sudo apt update && sudo apt install perry

No more cloning the repo and building with Cargo. Install Perry the same way you install any other tool.

## Xuất bản App Store tự động

This is the change that collapses the most manual steps. Running `perry publish ios` now handles the entire iOS distribution pipeline automatically:

1.  Generates an RSA key and CSR via the App Store Connect API
2.  Creates a distribution certificate and bundles it into a `.p12`
3.  Registers the bundle ID
4.  Creates and downloads a provisioning profile
5.  Creates the App Store Connect app record
6.  Builds, signs, and uploads to TestFlight or the App Store

No Xcode. No manual portal visits. No downloading certificates from a browser. The setup wizard runs automatically the first time you publish, walking through API key configuration and storing credentials in `perry.toml`.

macOS distribution is equally automated. Perry supports three modes: TestFlight, notarized DMG, and a new **"both"** mode that publishes to the App Store and creates a notarized DMG simultaneously. Three certificate types are auto-generated: `MAC_APP_DISTRIBUTION`, `MAC_INSTALLER_DISTRIBUTION`, and `DEVELOPER_ID_APPLICATION`.

Android publishing also gained an auto-triggered setup wizard. All three platforms now follow the same pattern: first run triggers setup, credentials are saved to the project, subsequent runs are zero-configuration.

Pre-flight validation catches problems before the build starts — provisioning profile bundle ID mismatch, certificate expiration, missing app icon, invalid version format, wrong team ID. And `encryption_exempt` in `perry.toml [ios]` auto-sets the `ITSAppUsesNonExemptEncryption` Info.plist key, skipping the manual export compliance prompt in App Store Connect.

## perry/widget: WidgetKit from TypeScript

Perry can now compile TypeScript to native SwiftUI WidgetKit extensions. This is not a wrapper or a bridge — the compiler walks the render tree at the HIR level and emits SwiftUI source code directly. The output is a complete WidgetKit extension bundle that Xcode (or Perry's build pipeline) can embed in your app.

terminal

perry widget.ts --target ios-widget --app-bundle-id com.example.app -o out/

The approach is fundamentally different from the rest of Perry's compilation. Normal Perry code goes through Cranelift to native machine code. Widget code goes through the HIR to SwiftUI text output, because WidgetKit requires SwiftUI — there's no way to build a widget extension with imperative UIKit or AppKit code. Perry solves this by treating the widget render tree as a compile-time template, not runtime code.

## Widget mới và cải tiến nền tảng

Four new widget types landed this week:

-   **TextArea** — multi-line text editing on macOS, iOS, and Android
-   **SecureField** — password input on iOS and macOS
-   **QR Code** — native QR code generation on iOS, macOS, and Android
-   **Splash Screen** — auto-generated LaunchScreen storyboards (iOS) and splash themes (Android)

### iPad trở thành native

Perry now generates full iPad-native apps: `UIDeviceFamily [1,2]`, orientation support, `UIRequiresFullScreen`, and a compiled LaunchScreen storyboard via ibtool. A new `getDeviceIdiom()` function detects phone vs. iPad at runtime, and `PerryFrameSplit` provides frame-based horizontal split containers for iPad layouts.

### Windows

Windows got timer support (50ms `WM_TIMER` tick), owner-drawn buttons with dark theme backgrounds, and fixes for a use-after-free bug in `to_wide().as_ptr()` across 18 widget files. V8 runtime now works on Windows with the required system libraries linked.

### GTK4 (Linux)

The GTK4 backend received visual polish to match macOS: CSS padding for edge insets, Adwaita button styling, VStack margin fixes, and ScrollView horizontal policy.

## http/https and better-sqlite3

Two significant stdlib additions:

The new `http` and `https` native modules provide client-side HTTP using reqwest under the hood. The API matches Node.js: `request()`, `get()`, `ClientRequest` with write/end/on, and `IncomingMessage` with statusCode and event handlers.

`better-sqlite3` is now fully supported: `new Database()`, `prepare`, `exec`, `run`, `get`, `all` — with proper NaN-boxing and row objects with named property access.

Other stdlib improvements: `crypto.randomBytes()` now returns a Buffer (matching Node.js), MongoDB gained `listDatabases` and `listCollections` with thread-safety fixes, and mysql2 INSERT/UPDATE/DELETE now returns `ResultSetHeader` with `insertId`.

## Sửa lỗi GC và tính đúng đắn

Several critical garbage collector and runtime correctness fixes shipped this week:

-   **GC reentrancy guard** — prevents collection during allocation, fixing RefCell double-borrow panics
-   **GC Map tracing** — Maps now properly traced during mark phase, preventing string key collection
-   **String aliasing fix** — string append now always allocates fresh strings, fixing corruption from pointer copy aliasing
-   **BigInt arithmetic** — right-shift uses arithmetic shift for negative numbers, bitwise ops use ToInt32 wrapping semantics
-   **Map.get() undefined** — returns correct `TAG_UNDEFINED` for missing keys instead of wrong NaN tag
-   **Static field GC roots** — BigInt values in static class fields registered as GC roots

These aren't minor. The GC reentrancy fix alone resolved an entire class of intermittent crashes. The string aliasing fix affected any program that assigned one string variable to another and then mutated either. These are the kind of bugs that only surface under real workloads, and fixing them is what makes the compiler production-grade.

## perry-verify: Hardened

`perry-verify`, the automated app verification service, got a security hardening pass: sandboxed execution via `bwrap` on Linux and `sandbox-exec` on macOS, auth tokens on WebSocket handshake and binary download, per-IP rate limiting, full UUID job IDs to prevent enumeration, and reduced body limits.

## perrysdad: The Self-Hosting Compiler

In a parallel effort, `perrysdad` — a self-hosting LLVM IR compiler written in TypeScript — went from zero to self-compilation in five phases over the week:

1.  **Phase 0-1** — end-to-end skeleton: HIR to LLVM IR text to clang, linked against Perry's `libperry_runtime.a`
2.  **Phase 2** — hand-rolled recursive descent parser with Pratt expression parsing for real `.ts` files
3.  **Phase 3** — arrays, objects, and maps with runtime FFI, plus fixing a critical ABI mismatch (JSValue declared as double in LLVM IR instead of i64)
4.  **Phase 4** — classes, enums, closures, multi-file compilation with module discovery and topological sort

The milestone: the self-compiled `anvil` binary can now compile test programs and produce correct output matching the node-compiled version. A TypeScript compiler, compiled by Perry to native code, compiling more TypeScript to native code. Turtles all the way down.

## Bằng số liệu

-   **82 commits** to the main Perry compiler
-   **1 release**: v0.2.173 (March 8)
-   **49 documentation pages** at docs.perryts.com
-   **4 new widgets**: TextArea, SecureField, QR Code, Splash Screen
-   **3 distribution channels**: Homebrew, APT, source
-   **3 automated store pipelines**: App Store, TestFlight, Google Play
-   **All 6 platforms** received improvements this week

## Tiếp theo là gì

The pipeline is filling in. You can write TypeScript, compile to six platforms, distribute via Homebrew or APT, publish to the App Store and Play Store, add home screen widgets, and read comprehensive documentation — all without leaving Perry's toolchain. What remains:

-   **Full regex support** — the last major language gap
-   **perry/ui expansion** — drag and drop, accessibility labels, DatePicker
-   **perrysdad maturation** — expanding the self-hosting compiler toward full Perry parity
-   **Hub public beta** — opening distributed builds to external users

Follow the progress on [GitHub](https://github.com/PerryTS/perry), read the new docs at [docs.perryts.com](https://docs.perryts.com), or check the [roadmap](/vi/roadmap/) for the full picture.
