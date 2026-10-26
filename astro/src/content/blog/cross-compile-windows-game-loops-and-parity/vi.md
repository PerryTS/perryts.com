---
title: "Biên dịch chéo sang Windows, game loop trên iOS và 100% đồng bộ kiểm thử"
excerpt: "103 commit trong một tuần: biên dịch chéo sang Windows từ Linux qua lld-link, hỗ trợ game loop trên iOS, báo cáo lỗi, pipeline build Hub hai giai đoạn và trình biên dịch tự lưu trữ đạt đồng bộ kiểm thử deterministic 68/68."
date: 2026-03-20
tags: ["compiler", "cross-compilation", "infrastructure", "milestone"]
---
103 commit cho trình biên dịch Perry tuần này. Các tính năng nổi bật: bạn giờ có thể biên dịch chéo các tệp thực thi Windows từ Linux, ứng dụng iOS có thể chạy game loop blocking, trình biên dịch báo cáo crash cho telemetry, và trình biên dịch tự host vượt qua mọi bài kiểm tra xác định mà chúng tôi đưa ra. Cộng thêm nâng cấp hạ tầng Hub lớn và hơn 50 bản sửa lỗi.

## Biên dịch chéo sang Windows từ Linux

Perry can now produce Windows `.exe` binaries from a Linux host. This is the missing piece for CI/CD pipelines that need to target Windows without running a Windows build machine for the entire compilation.

The implementation replaces compile-time `#[cfg]` checks with runtime target detection. When the compiler sees a Windows target on a non-Windows host, it locates `lld-link`, `llvm-nm`, and `llvm-ar` from the Rust toolchain or PATH via a new `find_llvm_tool()` helper. The Windows system libraries come from an [xwin](https://github.com/Jake-Shadle/xwin)\-style sysroot pointed to by `PERRY_WINDOWS_SYSROOT`.

The linker automatically uses `/FORCE:UNRESOLVED` and generates stubs for missing UI symbols, so CLI apps cross-compile cleanly. Output defaults to `.exe` when targeting Windows. The full details are in the [cross-compilation docs](https://docs.perryts.com).

terminal — Linux host

$ perry compile main.ts --target windows

Compiling main.ts for windows-x86\_64...

Using lld-link from Rust toolchain

✓ Compiled executable: main.exe (2.8 MB)

## Hỗ trợ Game Loop iOS

iOS requires UIKit to own the main thread. That's fine for event-driven apps, but it's a problem for games that need a blocking `while (!shouldClose)` loop. Perry now solves this with the `--features ios-game-loop` flag.

When enabled, the compiler emits `_perry_user_main` instead of `main`. The runtime provides a `main()` that calls `UIApplicationMain` on the main thread and spawns your code on a background thread. Scene delegate and app delegate handle the full UIKit lifecycle while your game loop runs unblocked.

main.ts

// Your game loop runs on a background thread

while (!shouldClose) {

update();

render();

awaitNextFrame();

}

terminal

$ perry run ios --features ios-game-loop

This enables an entire category of apps — games, simulations, real-time visualizations — that weren't practical on iOS before. The iOS pump and callback paths are also now wrapped in panic handling, so crashes in either the game loop or the UIKit lifecycle are caught cleanly.

## Báo cáo sự cố

Perry-compiled apps now install a panic hook and signal handlers for `SIGSEGV`, `SIGBUS`, and `SIGABRT` at startup. When a fatal crash occurs, the details are written to `~/.hone/crash.log` for the Chirp telemetry system. Caught panics (in `catch_callback_panic`) clear the log, so only genuine unrecoverable crashes are reported.

This is a production-readiness feature. When something goes wrong in the field, we'll know about it — and the crash log includes enough context to diagnose the issue without requiring users to manually report anything.

## Hub: Pipeline Build Windows hai giai đoạn

The Perry Hub build infrastructure got a significant architectural upgrade. Previously, building for Windows required a Windows worker for the entire compilation. Now the pipeline splits into two stages:

1.  A Linux worker cross-compiles the Windows artifact using the new lld-link support
2.  The Hub holds the pre-compiled artifact and re-queues the job for a Windows worker
3.  The Windows worker only handles signing and packaging — a much lighter task

When a worker sends `complete` with `needs_finishing: "windows"`, the Hub transparently re-queues the job. The CLI sees a seamless single-build experience.

The Hub also now auto-starts Azure Windows VMs when no Windows worker is connected, and build workers auto-update to the latest Perry version on new releases. Less manual infrastructure management, faster builds.

## Đại tu tài liệu

Two major documentation rewrites landed this week on [docs.perryts.com](https://docs.perryts.com):

-   **perry.toml reference** — complete section documentation covering every configuration option, bundle ID resolution, entry file resolution, build number auto-increment, and CI/CD examples
-   **Geisterhand reference** — full API docs, platform setup, test automation patterns, and architecture overview for the cross-platform UI testing framework

These aren't incremental updates. Both are ground-up rewrites that cover every feature and configuration option. If you're setting up a new project or writing tests, start here.

## API Menu đa nền tảng

`menuClear` and `menuAddStandardAction` were previously macOS-only. They now work on all 6 native platforms. This also includes a fix for a `RefCell` re-entrancy panic in `dispatch_menu_item` on Windows.

### Android: 16 KB Page Alignment

Google Play now requires 16 KB page alignment for native libraries. Perry sets the appropriate `CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS` automatically, and companion `.so` files are copied next to the output for APK/AAB inclusion.

## Perry React: Bảng Kanban

The React compatibility layer got a real-world test: a full 5-column Kanban board with move, add, delete, and view operations. Building it uncovered and fixed nested array children rendering in JSX — the recursive `_appendChildren` handler now properly flattens arrays returned from `.map()` calls. There's also a new 14-section Kitchen Sink WorkBench demo covering various UI patterns.

## Anvil: 100% Tương đương bài kiểm tra xác định

`perrysdad` — the self-hosting LLVM compiler written in TypeScript and compiled by Perry — now passes **68 out of 68** deterministic tests, matching the main compiler's output exactly. The only differences are inherent (timestamps, `Math.random()`), and 11 tests are skipped because they require UI, timers, crypto, or platform-specific features not yet implemented.

Key work that got it there:

-   **Interface method dispatch** — interface-typed variables now return correct methods via class\_id-based dispatch in ObjectHeader
-   **Dynamic property access** — runtime dispatch for computed property names
-   **Closures and this-binding** — correct capture semantics for object methods
-   **Phase 6 in progress** — async/await, generators, and condition fixes

100% parity on deterministic tests is a significant milestone. It means the self-compiled `anvil` binary produces the exact same output as the main compiler for every testable scenario. The gap is narrowing toward full self-hosting.

## Hơn 50 bản sửa lỗi

A major correctness push this week. Highlights:

-   **JSON.parse** — arrays no longer truncated at 16 elements, invalid input handled correctly
-   **Uint8Array** — constructor from array variable, `.set(source, offset)` implementation (was a no-op)
-   **BigInt** — NaN-boxing with `BIGINT_TAG` for cross-module calls, keccak256 32-bit truncation fixes
-   **Optional chaining** — nested conditional expressions, toString detection, return value NaN-boxing
-   **IndexSet** — string NaN-boxing corrected to use `STRING_TAG` instead of `POINTER_TAG`
-   **MySQL** — DATETIME and BLOB types, `Date(string)` constructor
-   **Math.min/max** — spread argument handling
-   **Native method dispatch** — field-scan-and-call for `POINTER_TAG` objects

These aren't edge cases. JSON.parse truncating arrays at 16 elements would break any real application. Uint8Array.set being a no-op would silently corrupt data. These are the fixes that make the compiler production-grade, one correctness bug at a time.

## Bằng số liệu

-   **103 commits** to the main Perry compiler
-   **3 versions**: v0.2.195, v0.2.196, v0.2.197
-   **1 major feature**: cross-compile Windows from Linux
-   **1 new app category**: iOS game loops
-   **68/68** deterministic test parity in perrysdad
-   **50+ bug fixes** across NaN-boxing, stdlib, and native FFI
-   **2 documentation rewrites**: perry.toml and Geisterhand
-   **5 Hub improvements**: two-stage pipeline, Azure auto-startup, worker auto-update

## Tiếp theo là gì

Windows cross-compilation opens the door to fully automated multi-platform CI/CD — push TypeScript, get native binaries for every target without dedicated build machines for each OS. The game loop support unlocks a whole new category of iOS apps. And 100% deterministic test parity in perrysdad means self-hosting is getting very real. What remains:

-   **Full regex support** — the last major language gap
-   **perry/ui expansion** — drag and drop, accessibility labels, DatePicker
-   **perrysdad Phase 6** — async/await, generators, expanding toward full Perry parity
-   **Hub public beta** — opening distributed builds to external users

Follow the progress on [GitHub](https://github.com/PerryTS/perry), read the docs at [docs.perryts.com](https://docs.perryts.com), or check the [roadmap](/vi/roadmap/) for the full picture.
