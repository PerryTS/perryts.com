---
title: "Real npm Packages Now Compile: axios, zod, express — and a Conformance Sweep"
excerpt: "The ~270 releases from v0.5.875 to v0.5.1146 weren't about one benchmark — they were about making real npm packages compile and run. axios, zod v4, express, fastify, and hono now work; test262 parity jumped (String 60→79%, Array 61→72%); Windows went Fluent with Mica; and DatePicker + drag & drop landed on every platform."
date: 2026-06-09
tags: ["npm", "test262", "Windows", "widgets", "milestone"]
---
The last post ended at **v0.5.875** with the GC story — closing the gap aya\_koto's benchmark exposed. That post was about winning one benchmark. This one is about a different kind of work: the roughly **270 releases between v0.5.875 and v0.5.1146**, landed over about four weeks, almost none of which are benchmark headlines. The theme shifted from “go fast on a microbenchmark” to **“make real-world TypeScript and real npm packages actually compile and run.”** Plus a full Windows visual overhaul and a pile of new widgets along the way.

Here's what shipped, grouped by what it was actually for.

## Real npm packages compile now

The biggest single thread through this window is a sweep to make popular npm packages compile to native binaries and pass behavioral tests — not just “link without errors,” but run and produce the right output. The list that now works through `perry.compilePackages` includes **axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2, and Colyseus**.

Each one failed for its own reason, and each fix is its own small story:

-   **zod v4** crashed with `Cannot read properties of undefined (reading 'onattach')`. Root cause (v0.5.1144, [#4698](https://github.com/PerryTS/perry/issues/4698)): `new F()` where `F` is a function imported from another module silently produced an empty object — the constructor body never ran, so every `$ZodCheckMinLength`\-style check came back stripped of its `_zod` property.
-   **axios + jose** needed crypto and compression Perry didn't have yet: `zlib.createBrotliDecompress`, `crypto.subtle.wrapKey`/`unwrapKey`, `subtle.generateKey` / `encrypt` / `decrypt` for AES-GCM, and `randomFillSync` (v0.5.972–976).
-   **fastify** was deadlocking on a one-second polling timeout in `wait_for_promise`; we replaced it with a condvar wait and made rejected promises surface as `HTTP 500` instead of hanging (v0.5.912).
-   **@hono/node-server** couldn't read a POST body — `c.req.text()` / `.json()` / `.formData()` returned empty on POST/PUT until a parent-registration fix in v0.5.1142.
-   **chalk, ms, debug, express** all hit the same shape: a *callable value with properties attached* (`chalk.red`, `express()` plus `express.Router`). Three flavors of that pattern got fixed across v0.5.935 and the surrounding npm sweep, plus `util.inherits` + a stream prototype scaffold to unblock express (v0.5.990).
-   **dayjs**, shipped as a minified bundle, exercised JS-classic prototype-method dispatch (`Class.prototype.m = fn`) that Perry lowered wrong (v0.5.924/932).

Underneath all of that sits the part that makes packages Perry *can't* compile natively still run: the **V8-fallback runtime** got real this window. Its ModuleLoader now reads from an embedded module map, so a fallback binary is still **self-contained** — no loose `node_modules` at runtime (v0.5.994). `createServer` bridges to a real hyper server (v0.5.999), and `Response` / `Request` / `Headers` Web Fetch globals exist in the fallback path (v0.5.1006). And **compile-time dynamic `import()`** — string-literal `await import('./foo.ts')` resolved at build time — finally landed (v0.5.905, [#100](https://github.com/PerryTS/perry/issues/100)).

## A test262 conformance sweep

The other dominant thread is conformance. We ran focused passes against the test262 subset radars and moved the needle on the built-ins that real code leans on hardest:

```
built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)
```

The String jump came from giving every `String.prototype` method generic-`this` dispatch and fixing `slice`/`substring` index coercion. The Array jump was `thisArg` on the dense-array callbacks (`forEach`/`map`/`filter`/…), array-like `ToLength`, spec operation ordering, and zero-argument validation. Destructuring picked up parameter-destructuring across plain, generator, async-generator, static, and private class methods.

Alongside the headline numbers, a long tail of correctness landed: `JSON.parse` now throws a real `SyntaxError` (not a `TypeError`) and rejects trailing tokens; its reviver walks via the spec `InternalizeJSONProperty` algorithm; `Object.prototype.toString` brands correctly for typed arrays, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp; `RegExp.prototype.toString` returns `/source/flags`; async generators got their `yield`\-awaits-operand semantics right. These are subset radars, not the full suite — Perry is still climbing — but the climb this month was steep.

## Windows goes Fluent

Windows got a visual overhaul (the [#4681](https://github.com/PerryTS/perry/issues/4681) series). Perry windows now opt into the modern DWM chrome by default — **Mica backdrop**, rounded corners, and a theme-aware title bar — and the common controls render through **comctl32 v6** instead of the Windows 95-era defaults. The window proc now handles `WM_DPICHANGED`, so a window stays crisp when you drag it between monitors with mixed scaling instead of getting bitmap-stretched.

Crucially, none of this reintroduced the old [#1542](https://github.com/PerryTS/perry/issues/1542) “black area after resize” regression: the client area is still painted opaque, and full-frame Mica/Acrylic blur-through stays an explicit `app.setVibrancy(...)` opt-in. There's also a new `--target windows-winui` backend scaffold (WinUI 3) for apps that want the fully modern stack, and a small but real fix that makes `perry compile main.ts -o main` produce `main.exe` on Windows so PowerShell will actually launch it (v0.5.1146).

## New widgets, every platform

Two widgets landed in just the last day, and both span every UI platform Perry targets:

-   **DatePicker** ([#4772](https://github.com/PerryTS/perry/issues/4772)) — a compact, field-style date control: `NSDatePicker` on macOS, `UIDatePicker` (.compact) on iOS/visionOS, `SysDateTimePick32` on Windows, `android.widget.DatePicker` on Android, GTK4 on Linux. One TS surface across all of them.
-   **Drag & drop** ([#4773](https://github.com/PerryTS/perry/issues/4773)) — any widget can be a drop destination and a drag source for text/files/URLs, mapped to `NSDraggingDestination` (AppKit), `UIDropInteraction` (UIKit), and `View.setOnDragListener` (Android).

```
import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});
```

Earlier in the window the widget shelf filled out across desktop and mobile too — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation, and a swipeable ImageGallery — each backed by the real native control on every platform. HarmonyOS (ArkTS) got Chart and TreeView (v0.5.893), the last two widgets it needed to reach parity with the others.

## GC, internals, and stability

Most of those 270 releases are not headlines — they're bug fixes and internals, and that's the point of this phase. A few worth calling out:

-   **GC continued.** The conditional free-list work from the GC post kept settling in, and a sharp class of bug got closed: native-bridged Promises are now **pinned while in flight on a tokio worker** so the GC can't sweep them before resolution lands (v0.5.923). If you ran an async fetch under load and saw a phantom collection, that was this.
-   **The memory model is documented.** There's now an `internals/memory-model.md` deep-dive — NaN-boxing, the generational GC, the shadow stack, and write barriers — wired into the docs site (v0.5.933).
-   **A wave of codegen stability fixes** surfaced by the npm sweep: a module-level `const` arrow called inside a resumed async step no longer SIGSEGVs (v0.5.953), `try { await rejected } catch { return X }` no longer hangs forever (v0.5.870), and a handful of `js_is_truthy` / raw-pointer-range crashes that real bundles tripped.

## Apple housekeeping

Smaller but real: `perry setup ios --development` now provisions for development builds (v0.5.1023), and the Apple cross-library build/link path was deduplicated and made pointer-width-portable (v0.5.1121/1125) — which is what unblocked the npm / Homebrew / APT / winget publish matrix that had been wedged.

## Where this leaves things

The bet behind Perry has always been that “native TypeScript” only matters if *real* TypeScript runs — not a toy subset, the actual packages people `npm install`. This month was mostly that work: less a single number to brag about, more a long, unglamorous push to close the gap between “compiles” and “works.” The conformance radars and the npm parity tests are the scoreboard we're watching now, and we'll keep posting the numbers — the good and the still-imperfect.

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues)

— Ralph
