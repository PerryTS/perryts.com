---
title: "Auto-Update, a Live Inspector, and the Compiler That Halved Itself"
excerpt: "Perry v0.5.306 → v0.5.359 in four days — 53 patch releases, ~30 issues closed, and three big things landed: perry/updater for desktop auto-update, a live inspector at localhost:7676, and a compiler refactor that shrank the four biggest files by 33–91%."
date: 2026-04-28
tags: ["updater", "devtools", "refactor", "community", "milestone"]
---
The last post closed at **v0.5.306** on the gen-GC + JSON + benchmarks story. Four days later, Perry is on **v0.5.359** — that's **53 patch releases** — and the story is different again. None of those releases are headline benchmark numbers. Almost all of them are **issues from the tracker getting closed**.

-   **`perry/updater`** ships — Sparkle/Tauri-shape auto-update for desktop apps (Ed25519 over a SHA-256 digest, sentinel-rollback, detached relaunch). Community PR from **TheHypnoo** ([#224](https://github.com/PerryTS/perry/pull/224)).
-   **Geisterhand Phase D** — a live inspector at `http://localhost:7676` with widget tree, per-widget detail, click dispatch, and live style edit via `POST /style/:h`.
-   **The compiler refactor.** Across v0.5.329 → v0.5.343 the four most-cited files got carved up: `lower::lower_expr` 6,687 → 624 LOC (−91%), `compile.rs` 9,391 → 3,783 LOC (−60%), `lower.rs` 13,591 → 7,554 LOC (−44%), `lower_call.rs` 7,000+ → 4,681 LOC (−33%). New `walker.rs` turns the `_ =>` catch-all bug class into a compile error.
-   **UI styling Phase C closes out** — inline `style: { ... }` props on every widget across Apple, Android, GTK4, Windows, and Web. Windows gets 4 of 5 stubs wired (decoration / opacity / borders); only `widget.shadow` remains (DirectComposition follow-up).
-   **A Scoop bucket** for Windows: `scoop install perry-ts/perry`. SHA-256 sidecars in the release workflow.
-   **Wave of community issue fixes** — about 30 issues closed across runtime, codegen, fetch, GTK4, Windows linker, async, and stdlib.

## 1\. perry/updater — auto-update for desktop apps

Pre-fix Perry had no update path. Apps shipped, and shipped, and that was it. **TheHypnoo** opened [#224](https://github.com/PerryTS/perry/pull/224) with the full story:

```
import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // sentinel-rollback if the previous launch crashed

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(`${pct}%`));
  await update.installAndRelaunch();
}

markHealthy(); // call after the new build successfully boots
```

Trust model: **Ed25519 over the SHA-256 digest of the file** (not the file bytes — keeps the verify cheap on big binaries). Manifest is JSON, schema-versioned, one entry per `<os>-<arch>` triple. Atomic install with `<exe>.prev` backup, detached relaunch (`setsid` on Unix, `DETACHED_PROCESS` on Windows). Mobile is excluded by design — App Store / Play Store own the install pipeline at the OS level.

Two Perry runtime quirks surfaced from writing the smoke test, and got fixed inline:

-   **`response.arrayBuffer()` was returning a metadata-only stub.** Fixed in [#232](https://github.com/PerryTS/perry/pull/232) (also TheHypnoo) — `js_response_array_buffer` now allocates a real `BufferHeader` and `memcpy`s `resp.body` into it.
-   **`fs.appendFileSync` wrote 0 bytes.** Fixed in [#226](https://github.com/PerryTS/perry/issues/226) — the namespace-import lowering path (`import * as fs from "fs"`) had no arm for `appendFileSync`, and the LLVM codegen had no arm for the HIR variant either. Both wired.

Documentation lives at `docs/src/updater/overview.md`.

## 2\. Geisterhand: a live inspector at localhost:7676

Geisterhand has been Perry's in-process UI test harness — HTTP API on port 7676 for snapshotting widget state and dispatching clicks. Phase D turns it into a devtools-style inspector you can browse from any browser.

-   **Step 1 (v0.5.349)** — `GET /` serves a single-page vanilla-JS UI with a widget tree, per-widget detail (frame, value, raw JSON), 1.5s auto-refresh with pause/resume, and a “fire onClick” action button. Codegen pins `INSPECTOR_HTML` against macOS lazy-load `-dead_strip` so it survives release builds.
-   **Step 2 (v0.5.350)** — `POST /style/:h` takes a JSON prop bag and applies it live. 9 props (`backgroundColor`, `color`, `borderColor`, `borderWidth`, `borderRadius`, `opacity`, `padding`, `hidden`, `enabled`) flow HTTP-thread → main-thread via the existing pump-queue. Bad JSON → 400; bad handle → 400; unknown props are filtered server-side and the response lists which ones made it through.

```
perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \
  -H 'content-type: application/json' \
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}
```

macOS dispatcher is wired; Linux / Windows / iOS / tvOS / visionOS / Android follow the same shape and are next.

## 3\. The compiler refactor — splitting the four biggest files

Five issues in the tracker ([#167](https://github.com/PerryTS/perry/issues/167), [#169](https://github.com/PerryTS/perry/issues/169), [#212](https://github.com/PerryTS/perry/issues/212), [#214](https://github.com/PerryTS/perry/issues/214), plus a long tail) had the same shape: a new `Expr` variant got added to `ir.rs`, but one of four ad-hoc walkers in `lower.rs` had a `_ =>` catch-all and silently miscompiled the new variant. Catching this at runtime is expensive — sometimes invisible, sometimes a SIGSEGV under SSO.

**v0.5.329** introduced `crates/perry-hir/src/walker.rs` with `walk_expr_children` / `walk_expr_children_mut` — exhaustive matches over all 178 `Expr` variants, **no catch-all**. Adding a new variant without listing it here is now a compile error. The four consumers (`substitute_locals`, `find_max_local_id::check_expr`, `collect_local_refs_expr`, `remap_local_ids_in_expr`) collapsed:

| Function | Before | After | Δ |
| --- | --- | --- | --- |
| `find_max_local_id::check_expr` | 225 | 57 | −75% |
| `substitute_locals` | 553 | 80 | −86% |
| `collect_local_refs_expr` | 720 | 70 | −90% |
| `remap_local_ids_in_expr` | 542 | 85 | −84% |

Total: **−1,830 lines of duplicated descent**, replaced by **+1,840 lines of one centralized walker** — net flat, but the bug class is gone.

That unblocked the rest. **v0.5.331 → v0.5.343** carved up the four monoliths over 14 commits. The headline numbers:

| File | Before | After | Δ |
| --- | --- | --- | --- |
| `lower::lower_expr` | 6,687 | 624 | −91% |
| `compile.rs` | 9,391 | 3,783 | −60% |
| `lower.rs` | 13,591 | 7,554 | −44% |
| `lower_call.rs` | 7,000+ | 4,681 | −33% |

The split landed as 19 new focused sub-modules: `compile/{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}.rs`, `lower/{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}.rs`, `lower_call/{ui_styling, builtin, native}.rs`, plus a new `crates/perry-dispatch` crate that became the single source of truth for UI / system / i18n method tables (the `_ => "perry_ui_unknown"` fan-out that drove issue [#191](https://github.com/PerryTS/perry/issues/191)'s “compiles on macOS, breaks on web” surprises is now one lookup).

**Tier 4 perf wins** rode along (v0.5.335–v0.5.336):

-   Fused two passes in `inline_functions` and three rayon passes in `compile.rs` — saves 5 module scans + 3 scheduler round-trips per compile.
-   Bounded the `perry dev` parse cache at 500 entries, FIFO eviction. Pre-fix a session walking `node_modules` could hold 100+ MB of SWC AST.
-   Parallelized the post-codegen `.ll` write loop — 2–4× faster wall-time on SSDs with 50+ modules.
-   `Arc<I18nTable>` instead of cloning the locale table per worker.

Workspace tests stayed at **434 passed / 0 failed / 5 ignored** through every commit; gap tests at 25/28 baseline; doc-tests at 80/82 baseline.

## 4\. UI styling Phase C, finished

Phase C was the inline `style: { ... }` rollout. Steps 1–7 closed in this window:

-   **v0.5.305 → v0.5.306** — `StyleProps` type surface + inline `style:` on Button.
-   **v0.5.307 → v0.5.309** — color/padding/shadow inline destructure on every table widget, then VStack / HStack.
-   **v0.5.310 → v0.5.311** — hex strings + gradient + runtime `parseColor` for dynamic values.
-   **v0.5.312** — styling docs + Windows tracking issue.

Then the cross-platform sweep:

-   **GTK4** ([#202](https://github.com/PerryTS/perry/issues/202), [#206](https://github.com/PerryTS/perry/issues/206)) — 4 styling FFIs wired, plus 7 missing FFIs blocking the Linux doc-tests gate (v0.5.322).
-   **macOS** (v0.5.324) — `CALayer` shadow plumbing for `widget.shadow` + visual\_test infrastructure; `set_color` class-probe for non-`NSTextField` widgets.
-   **iOS / tvOS / visionOS** (v0.5.346) — Button `color: ...` was hitting `setTextColor:` on `UIButton`, which doesn't implement that selector; `objc2` panic crossed an `extern "C"` boundary and the process aborted. Fixed via the same class-probe pattern as macOS — UIButton now routes through `setTitleColor:forState:UIControlStateNormal`.
-   **Windows** (v0.5.347) — 4 of 5 styling stubs wired (`text.decoration` via `LOGFONT` round-trip, `widget.opacity` via `WS_EX_LAYERED` + `SetLayeredWindowAttributes`, borders via `SetWindowSubclass` + `WM_PAINT`). Only `widget.shadow` remains (needs DirectComposition).

The styling matrix in `docs/src/ui/styling-matrix.md` ends the window with **Web at 43/43 Wired**, **Windows at 42/43 Wired**, the rest at full coverage.

## 5\. The runtime correctness pass — issue by issue

A theme of the period: every miscompile that came in over the tracker either turned into a fix or a compile-time error. Highlights:

-   **[#212](https://github.com/PerryTS/perry/issues/212) (v0.5.323)** — class methods inside `fn` couldn't capture enclosing-fn locals. Multi-module repros now match Node byte-for-byte.
-   **[#214](https://github.com/PerryTS/perry/issues/214) (v0.5.321 + v0.5.330)** — SSO-safe string-handle unboxing across 7 string-operand sites: `arr.join`, `arr.toString`, `obj[stringKey]` get/set/delete, `string.match(re)`, `process.env[dynKey]`, crypto digest input. Pre-fix every one of them either silently returned garbage or SIGSEGV'd on inline-string operands.
-   **[#221](https://github.com/PerryTS/perry/issues/221) (v0.5.351)** — module-level empty `const` arrays dropped `arr[i]=` writes from inside functions. Surfaced when Bloom-Engine/jump's `discoverLevels()` populated `LEVEL_FILES` at module level via index-assign and the level-select screen rendered empty.
-   **[#233](https://github.com/PerryTS/perry/issues/233) (v0.5.357)** — `Array.push` from inside an async function silently capped at 16 elements when the array was passed in as a parameter. Async functions don't inline; reallocation returned a new pointer the caller never saw. Fix: install a forwarding pointer at the old location on every grow, reusing the GC's existing `GC_FLAG_FORWARDED` mechanism.
-   **[#235](https://github.com/PerryTS/perry/issues/235) (v0.5.358)** — method-default-param dispatch was passing garbage when callers skipped trailing args. Two contributing parts: cross-module method declares hardcoded 6 doubles instead of `arity + 1`, and `lower_class_method` had no `build_default_param_stmts` call at all. Surfaced in mongodb's `findOne(filter, options = {})` hanging silently; fix is uniform across local + cross-module dispatch.
-   **[#236](https://github.com/PerryTS/perry/issues/236) (v0.5.355)** — three independent fetch + promise bugs from one repro: api.github.com 403'd anonymous (default User-Agent now set), `.then(console.log)` hung forever (null callbacks weren't pushing TASK\_QUEUE entries), every fetch rejection printed `Uncaught exception: [object Object]` (NaN-boxed bare `*StringHeader` instead of a real `ErrorHeader`).
-   **[#234](https://github.com/PerryTS/perry/issues/234) (v0.5.359)** — real `Blob` with `arrayBuffer` / `text` / `bytes` / `slice` instance methods. Pre-fix `await response.blob()` returned a metadata-only `{size, type}` stub. Three-part fix landed across runtime + HIR + codegen.

Plus the small catch-ups:

-   **[#181](https://github.com/PerryTS/perry/issues/181)** — strip-dedup over-pruned generic monomorphizations on Linux + GTK4 link silent-fallback. Fix: replace name-pattern filtering with **symbol-set** comparison via `llvm-nm`. Members with even one unique symbol are kept. Trimmed `libperry_ui_macos.a` 196 → 35 objects with no link errors.
-   **[#220](https://github.com/PerryTS/perry/issues/220)** — `secur32.lib` added to the Windows link line.
-   **[#198](https://github.com/PerryTS/perry/issues/198)** — i18n `FormatNumber` FP round-trip via Ryū.
-   **[#188](https://github.com/PerryTS/perry/issues/188)** — codegen dispatch wired for `perry/i18n` format wrappers.
-   **[#189](https://github.com/PerryTS/perry/issues/189) / [#203](https://github.com/PerryTS/perry/issues/203)** — `perry/plugin` codegen dispatch.
-   **[#190](https://github.com/PerryTS/perry/issues/190)** — Canvas widget through LLVM codegen.
-   **[#191](https://github.com/PerryTS/perry/issues/191)** — CameraView through codegen.
-   **[#192](https://github.com/PerryTS/perry/issues/192)** — Table widget through codegen.
-   **[#193](https://github.com/PerryTS/perry/issues/193)** (partial) — 11 stdlib helper dispatch arms.
-   **[#98](https://github.com/PerryTS/perry/issues/98)** — background-receive notifications on iOS + Android (warm-path).
-   **[#106](https://github.com/PerryTS/perry/issues/106)** — watchOS weak fallbacks for game-loop FFI hooks.
-   **[#154](https://github.com/PerryTS/perry/issues/154)** — `using` / `await using` dispose hooks.
-   **[#167](https://github.com/PerryTS/perry/issues/167)** — `js_native_call_method` args alloca hoisted to entry block.
-   **[#169](https://github.com/PerryTS/perry/issues/169)** — `substitute_locals` Uint8Array arms.
-   **[#226](https://github.com/PerryTS/perry/issues/226)** — `fs.appendFileSync` wired end-to-end (community PR).

## 6\. Windows + Scoop

The Windows toolchain story keeps simplifying. **v0.5.353** pinned `clang -target` on host builds — non-MSVC clang on PATH (MinGW / MSYS2 / Anaconda / Rust GNU bundles) was silently rewriting Perry's `x86_64-pc-windows-msvc` IR to `windows-gnu`, and lld-link couldn't resolve the `__main` reference LLVM's mingw32 emitter inserted. New `probe_clang_default_triple` runs `clang --version` once per process and prints a single informational note when the host default is GNU but we're targeting MSVC. Suppress with `PERRY_NO_CLANG_PROBE=1`.

**v0.5.345** aligned the Win64 `perry-ui` ABI with `perry-dispatch` — three runtime extern signatures had drifted (`perry_ui_navstack_create`, `perry_ui_menu_add_item_with_shortcut`, `perry_ui_app_set_timer`). On Win64 ABI integer and float positional args share slot indices, so a mismatch read garbage from uninitialized registers. SysV (macOS / Linux) uses separate int/float register pools and happened to land valid bits — Windows-only crash, fixed across all 8 perry-ui-\* platform crates.

Then: **`scoop install perry-ts/perry`**. Manifest pinned to v0.5.345 (with `depends: main/llvm` to auto-pull official MSVC-default LLVM). Release workflow now emits `<artifact>.sha256` sidecars next to every archive, in `sha256sum`\-compatible format for every downstream package-manager bumper.

```
# Windows host
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\main.ts --target windows -o myapp.exe
```

## 7\. Wrapping up

The pattern of this stretch is community engagement plus internal hygiene. **TheHypnoo** shipped three significant PRs ([#224](https://github.com/PerryTS/perry/pull/224) perry/updater, [#231](https://github.com/PerryTS/perry/pull/231) `fs.appendFileSync` wiring, [#232](https://github.com/PerryTS/perry/pull/232) `response.arrayBuffer` body bytes). The tracker emptied of about 30 issues. The compiler got 60% smaller on its biggest file and grew an exhaustive walker that turns “forgot to update one of four ad-hoc walkers” from a runtime miscompile into a `cargo build` error. UI styling reached parity across every desktop platform except shadows on Windows. Geisterhand grew a browser-based devtools surface. The Windows install path got one command shorter.

Try it:

```
# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Auto-update for desktop apps
npm install @perry/updater

# Live inspector
perry compile main.ts -o app --enable-geisterhand
./app &  # then open http://localhost:7676
```

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
