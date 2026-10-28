---
title: "npm Distribution, perry dev, and Winning Every Benchmark"
excerpt: "Perry v0.5.80 → v0.5.174 in six days. @perryts/perry ships on npm for all seven supported platforms. perry dev adds watch-mode auto-recompile on top of an in-memory AST cache and on-disk per-module object cache. json_roundtrip closes its last gap — Perry now wins every benchmark against both Node.js and Bun."
date: 2026-04-23
tags: ["npm", "developer-experience", "performance", "watch-mode", "milestone"]
---
The last post closed with Perry at v0.5.80 and one stubborn loss on the benchmark table: `JSON.parse`/`stringify` roundtrip was still 1.6x slower than Node. Six days later Perry is on **v0.5.174** — that's **94 patch releases** — and three things changed that are worth calling out before anything else:

-   `@perryts/perry` ships on **npm**. One command installs Perry on every supported platform.
-   **`perry dev`** adds watch-mode auto-recompile, on top of a new in-memory AST cache and on-disk per-module object cache.
-   The `json_roundtrip` loss closed. Perry now **beats Node and Bun on every benchmark** in the main suite (15/15 vs both).

The rest of the post is the supporting cast: WebAssembly fixes, watchOS finally compiling end-to-end, `perry/thread` primitives wired up the rest of the way, and a batch of compile-time strictness wins that turn silent drops into real errors.

## 1\. `@perryts/perry` on npm

Perry has always installed via Homebrew on macOS and APT on Debian/Ubuntu. Good coverage for developers on those platforms, nothing at all for Windows users unless they built from source, and nothing uniform across a team that mixes Mac and Linux and Windows. v0.5.107 made that problem go away.

```
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp
```

The package is a thin launcher that depends on seven per-platform optional packages — macOS arm64/x64, Linux x64/arm64 on both glibc and musl, Windows x64 — and npm installs only the one matching your machine. Binary size per platform is in the low single-digit megabytes. The install itself is seconds. There's a global install path too (`npm install -g @perryts/perry`) if you prefer that, but the project-local install pins the compiler version next to your dependencies, which is the right default.

Publishing went through OIDC Trusted Publisher so every release is provenanced and tied back to the CI job that built it. That was its own day of CI work — several `v0.5.107` CI commits chasing the right `--provenance` / npm version / workflow path combination — but it landed, and every release since has been clean. Windows users are first-class citizens now, and the cross-team friction of “install it however your OS likes” is gone.

## 2\. `perry dev` — watch mode

v0.5.143 added a new CLI subcommand:

```
perry dev
```

That's it. It watches your project, recompiles on save, and relaunches your binary. The inspiration is Vite and `nodemon`; the point is to stop pretending a compiler-to-binary workflow has to feel slower than a runtime. For most projects `perry dev` rebuilds in under a second on a warm cache.

The “warm cache” bit matters. Two new caches landed alongside `perry dev`:

-   **In-memory AST cache** (v0.5.156). Across rebuilds in a single `perry dev` session, Perry keeps the parsed AST for every module that hasn't changed on disk. Editing one file re-parses one file, not the whole module graph.
-   **On-disk per-module object cache (V2.2)**. Each module compiles to its own `.o` file and gets hashed; unchanged modules skip codegen entirely and the linker picks up the cached object. The cache verbose output matches the spec in [#131](https://github.com/PerryTS/perry/issues/131), and a round of audit hardening in v0.5.160 closed the edge cases where stale cache entries could survive a header change.

The two caches stack. First edit of the session is full compilation; everything after that only does work proportional to what you actually changed. This is the single biggest DX shift of the week.

## 3\. Beating Bun on every benchmark

At v0.5.166 the README had one honest caveat: Perry was 1.6x slower than Node on `json_roundtrip` (50× `JSON.parse` + `JSON.stringify` on a 1MB, 10K-item blob), and 2.4x slower than Bun. Issue [#149](https://github.com/PerryTS/perry/issues/149) tracked the follow-up. By v0.5.173 — seven days later — that gap closed.

| Workload | Perry v0.5.173 | Node v25 | Bun 1.3 |
| --- | --- | --- | --- |
| `json_roundtrip` | 314ms | 377ms | 250ms |
| `closure` | 10ms | 309ms | 51ms |
| `factorial` | 31ms | 596ms | 98ms |
| `fibonacci(40)` | 320ms | 1033ms | 521ms |
| `mandelbrot` | 23ms | 25ms | 30ms |

Perry now wins every workload in the main benchmark suite — **15/15 vs Node, 15/15 vs Bun**, best of 5 runs on macOS ARM64. Bun 1.3 is still ahead on peak RSS (84MB vs Perry's 310MB on `json_roundtrip`), so allocator pressure is the next thing to close, but raw latency is Perry's.

The closing of the JSON gap wasn't one change — it was the accumulation of the object-layout parity work that ran through this week: Phase 1 object-literal shape inference (v0.5.167), Phase 4 body-based return-type inference for free functions, class methods, getters, and arrows (v0.5.169), and Phase 4.1 method-call return-type inference (v0.5.170). The theme is the same as the last post: give LLVM enough static structure to see through, and the optimizer does the rest.

v0.5.164 also restored `<2 x double>` parallel-accumulator autovectorization on pure-fadd reduction loops, which had silently regressed at some point in the v0.5.9x→v0.5.16x range. That's what brings `math_intensive` and `accumulate` back to their old 3-4x lead over Rust/C++/Go/Swift — same LLVM, one `reassoc contract` flag, one vectorized loop body.

## 4\. `perry/ui` and doc-tests

Four remaining perry/ui gaps closed in v0.5.151. Alongside that, v0.5.119 flipped silent perry/ui API misuse from “compiles and does nothing” to a hard compile error — same logic as v0.5.165 applied to decorators (see below). Misuse surfacing at compile time is always better than at runtime.

v0.5.123 shipped a **doc-examples test harness** and a widget gallery. Every TypeScript example in the documentation is now compiled on every CI run, and the widget gallery compares screenshots against blessed baselines. v0.5.125 extended that to a cross-compile matrix: every doc example is built for iOS, tvOS, Android, WASM, and Web as well as the host platform, so API drift across targets gets caught on the PR that introduced it rather than the release cycle that shipped it.

A small quality-of-life win: `perry check` now emits `file:line:column` for HIR lowering errors ([#129](https://github.com/PerryTS/perry/issues/129)), which means editor jump-to-error works instead of showing a generic message without a location.

## 5\. watchOS compiles end-to-end

watchOS shipped as a compilation target last month, but a clean end-to-end build had some rough edges. This week's watchOS work:

-   **v0.5.113**: `--target watchos` and `--target watchos-simulator` now compile end-to-end without the workarounds that had accumulated.
-   **v0.5.114**: `--features watchos-game-loop` for Metal-surface apps.
-   **v0.5.122**: `--features watchos-swift-app` for SwiftUI-hosted rendering — when you want SwiftUI to own the app lifecycle and Perry to compose the UI inside it.
-   **v0.5.135**: `PERRY_UI_TEST_MODE` wired into perry-ui-ios and perry-ui-tvos, so Geisterhand UI testing runs the same way on those two targets as it does on macOS and Linux.

## 6\. `perry/thread` primitives fully wired

v0.5.174 (today) closed [#146](https://github.com/PerryTS/perry/issues/146): `parallelMap`, `parallelFilter`, and `spawn` are fully wired through the codegen path with compile-time safety enforcement. Mutable captures get rejected at compile time — the same compile-time-correctness posture perry/ui and decorators now have. Thread primitives that were partially wired since the v0.4.0 announcement are now complete end-to-end.

## 7\. WebAssembly and the web target

Two WASM fixes worth calling out:

-   **v0.5.158**: five compounding bugs in `--target web` (the WASM output path) that masked each other. Fixed as a batch so the web target now holds up under the full `perry/ui` surface ([#133](https://github.com/PerryTS/perry/issues/133)).
-   **v0.5.161**: `break`/`continue` inside `if` inside a loop was hanging on WASM — a codegen bug that didn't reproduce on the native targets. Fixed ([#135](https://github.com/PerryTS/perry/issues/135)).

Also on the correctness side: v0.5.157 fixed `obj.field` returning `NaN` on Android ([#128](https://github.com/PerryTS/perry/issues/128)), and v0.5.162 fixed a cursed ws bug where `sendToClient` and `closeClient` had been compiling to silent no-ops ([#136](https://github.com/PerryTS/perry/issues/136)).

## 8\. Compile-time strictness wins

A theme of this week: anything that used to be a silent failure is now a compile error.

-   **v0.5.165**: TypeScript decorators were parsed into HIR and then silently dropped. Now they error at the decoration point with a clear message ([#144](https://github.com/PerryTS/perry/issues/144)). Same warn→bail reasoning as v0.5.119 applied to perry/ui.
-   **v0.5.119**: perry/ui API misuse rejected at compile time instead of producing a no-op binary.
-   **v0.5.172**: `console.trace()` now emits a real native backtrace to stderr instead of only echoing the message ([#20](https://github.com/PerryTS/perry/issues/20)). Symbolicated frames require `PERRY_DEBUG_SYMBOLS=1`; without it you get addresses, which is still more than the message-echo behavior it replaces.

## 9\. Wrapping up

The pattern of the week: **distribution** (npm), **developer experience** (`perry dev`, incremental caches), and **the last remaining benchmark loss closed**. Plus a batch of compile-time strictness that turns silent drops into real errors. Six days, 94 patch releases, one major DX shift.

Try it:

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

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
