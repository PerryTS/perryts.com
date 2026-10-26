---
title: "tvOS, Cross-Compile iOS from Linux, and Perry Login"
excerpt: "Perry v0.4.24: tvOS as the 10th compilation target, cross-compile iOS and macOS from Linux via ld64.lld, perry login with usage-based billing, Windows UI overhaul, macOS notarization, and 120 commits in 5 days."
date: 2026-03-28
tags: ["tvOS", "cross-compilation", "billing", "Windows", "milestone"]
---
Five days, 120 commits, and Perry jumps from v0.4.0 to v0.4.24. The highlights: tvOS becomes the 10th compilation target, iOS and macOS apps can now be built entirely from Linux, perry login brings usage-based billing, and the Windows UI gets a complete overhaul. Here's everything that shipped.

## tvOS: The 10th Compilation Target

Perry now compiles to Apple TV. The tvOS target uses the same SwiftUI renderer as watchOS, sharing the data-driven architecture where Perry builds a UI tree and a shipped Swift host app renders it natively. Combined with the existing `@perry/threads` WASM integration, tvOS apps can run compute-heavy workloads in the background while keeping the UI responsive.

```
# Compile for Apple TV
perry compile main.ts --target tvos

# Run on tvOS simulator
perry run tvos
```

This brings the total target count to **10**: macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly, and Web/JavaScript. One TypeScript codebase, ten native outputs.

## Cross-Compile iOS and macOS from Linux

Perry can now build iOS and macOS binaries entirely from a Linux machine using `ld64.lld` as the Mach-O linker. This is the missing piece for fully automated CI/CD — push TypeScript to a Linux server, get signed native binaries for every Apple platform without a macOS build machine.

Getting here required solving a cascade of linker issues:

-   **Mach-O codegen triple** — added `aarch64-apple-macos` and `aarch64-apple-ios` target triples for Cranelift
-   **Framework linking** — CoreGraphics, Metal, IOKit, DiskArbitration framework search paths for cross-compile
-   **`-lobjc`** — ObjC runtime symbols needed for all Apple targets
-   **SDK version** — `sdk_version 26.0` in ld64.lld (Apple requires iOS 18+)
-   **Dead stripping** — `-dead_strip` instead of `-Wl,-dead_strip` for the Mach-O linker
-   **Runtime dedup** — strip duplicate `perry_runtime` from UI static libs to avoid link errors

Combined with the existing Linux → Windows cross-compilation (v0.2.195+), Perry can now cross-compile to **every platform from Linux** — iOS, macOS, Windows, Android, WASM, and Web.

## iOS App Store Readiness

A major focus this cycle was making Perry-compiled iOS apps fully App Store compliant:

-   **Full Info.plist** — all Apple-required keys: `CFBundleIdentifier`, `CFBundleName`, `CFBundleShortVersionString`, `CFBundleVersion`, `UIDeviceFamily`, `UIRequiredDeviceCapabilities`
-   **CFBundleIcons** — standard iOS icon naming (`AppIcon60x60@2x`, etc.) with fallback resolution
-   **Version from perry.toml** — `version` and `build_number` fields flow directly into the Info.plist
-   **UILaunchScreen** — uses the modern key instead of `UILaunchStoryboardName` (no storyboard file needed)
-   **Provisioning profiles** — macOS provisioning profile support for App Store and TestFlight distribution

## Perry Login and Billing

Perry now has accounts and usage-based billing, powered by a new `perry login` CLI command and a dashboard at [app.perryts.com](https://app.perryts.com).

### How It Works

-   **`perry login`** — GitHub OAuth device flow, opens browser, polls for completion
-   **Free tier** — 15 builds/month, unlimited projects with a GitHub account
-   **Pro tier** — unlimited builds via Polar.sh subscription
-   **API tokens** — generate and manage tokens from the dashboard for CI/CD
-   **Usage tracking** — monthly publish and verify counters with real-time usage bars

The dashboard itself is a Perry-compiled Fastify server with a Next.js static export — built with Perry, serving Perry users.

## macOS Notarization and Code Signing

Two new signing capabilities:

-   **`perry publish macos --notarize`** — automatically switches to Developer ID certificate (instead of App Store cert), submits to Apple's notarization service, and staples the result
-   **GCloud KMS code signing** — Windows builds can now be signed using Google Cloud KMS keys, enabling automated signing in CI without exposing private keys

## Windows UI Overhaul

The Windows UI backend received its most comprehensive update yet:

-   **DPI-aware scaling** — window size, fonts, and widget dimensions scale correctly on high-DPI displays
-   **Launcher-style window APIs** — borderless windows with custom positioning for launcher/spotlight-style UIs
-   **Global hotkeys** — system-wide keyboard shortcuts that work even when the app isn't focused
-   **App icons** — `getAppIcon` API for displaying application icons in launcher UIs
-   **Reentrancy-safe layout** — `RefCell`\-based painting replaced with `SetPropW` HWND storage to prevent panics during nested WM\_PAINT messages
-   **Geisterhand integration** — all widget types registered with the UI testing framework, `/type` uses `SendMessageW` via HWND map
-   **Android camera support** — camera capture API extended to Android via JNI

## Performance

v0.4.14 shipped a comprehensive performance audit:

-   **Native `fcmp`** — floating-point comparisons use native CPU instructions instead of runtime function calls. Mandelbrot benchmark **30% faster**.
-   **In-place string append** — `str += "text"` modifies the buffer in place instead of allocating a new string. **125x faster** for repeated concatenation.
-   **Short-circuit AND/OR** — `&&` and `||` skip evaluation of the right operand when the result is already determined.
-   **Negative literal folding** — `-1`, `-0.5` etc. are folded to constants at HIR level instead of emitting a negation instruction.

## Hub Parallel Builds

The build orchestration server now supports concurrent builds per worker:

-   **Slot-based dispatch** — workers report `max_concurrent` capacity, Hub tracks active jobs per worker
-   **No more 429s** — jobs queue instead of being rejected when all workers are busy
-   **Base64 artifact downloads** — binary artifacts served as base64 when the Perry runtime can't handle raw binary HTTP responses
-   **Auto-reconnect WebSocket** — build monitoring connections automatically reconnect on disconnect

## New Package: perry/appstorereview

A new first-party package for prompting app store reviews:

```
import { requestReview } from "perry/appstorereview";

// Opens the native review prompt
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();
```

One function, two platforms, native review UI. Timing and display logic is left entirely to the developer.

## Codegen Fixes

120 commits means a lot of bug fixes. The most impactful:

-   **Strict equality (===)** — three separate bugs fixed in v0.4.2: type tag comparison, NaN handling, and null/undefined distinction
-   **String comparison for concatenated strings** — `===` failed when comparing strings built via concatenation due to pointer comparison instead of content comparison
-   **Constructor resolution** — `new X(args)` now correctly resolves cross-module imported constructors and closure-based constructor functions
-   **Module-level array push** — values pushed to module-level arrays inside nested function calls in loops were lost due to stale pointers after reallocation
-   **Null arithmetic coercion** — `null + 1` now correctly produces `1` via `js_number_coerce`
-   **Bitwise NOT wrapping** — `~x` now wraps to i32 as per ECMAScript semantics
-   **fetch().then()** — callbacks never fired in native UI apps due to missing event loop drain (v0.4.3)
-   **WASM modulo and exponent** — `%` and `**` operators caused WASM validation errors (v0.4.5)

## By the Numbers

-   **~120 commits** to the main Perry compiler in 5 days
-   **24 patch releases**: v0.4.1 → v0.4.24
-   **Compilation targets**: 9 → 10 (added tvOS)
-   **Cross-compile targets from Linux**: Windows → Windows, iOS, macOS (all Apple + Windows)
-   **New packages**: perry/appstorereview
-   **New infrastructure**: app.perryts.com dashboard, perry login CLI, Polar.sh billing
-   **Performance gains**: 30% faster mandelbrot (native fcmp), 125x faster string concatenation

## What's Next

Cross-compiling iOS and macOS from Linux means the Hub can now build for every platform from a single Linux server — no more dedicated macOS build machines for compilation (only for signing). The billing infrastructure opens the path to Hub public beta. And with tvOS added, Perry covers every Apple platform: macOS, iOS, iPadOS, watchOS, and tvOS.

-   **Hub public beta** — external users can push TypeScript and get native binaries
-   **Full regex support** — the last major language gap
-   **perry/ui expansion** — drag and drop, accessibility, DatePicker
-   **Source maps & debug info** — DWARF debug info for native debugging

Follow the progress on [GitHub](https://github.com/PerryTS/perry), read the docs at [docs.perryts.com](https://docs.perryts.com), or check the [roadmap](/en/roadmap/) for the full picture.
