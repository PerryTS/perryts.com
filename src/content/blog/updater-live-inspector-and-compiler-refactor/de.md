---
title: "Auto-Update, ein Live-Inspector und der Compiler, der sich selbst halbiert hat"
excerpt: "Perry v0.5.306 → v0.5.359 in vier Tagen — 53 Patch-Releases, ~30 Issues geschlossen, und drei große Sachen landeten: perry/updater für Desktop-Auto-Update, ein Live-Inspector unter localhost:7676 und ein Compiler-Refactoring, das die vier größten Dateien um 33–91 % schrumpfen ließ."
date: 2026-04-28
tags: ["updater", "devtools", "refactor", "community", "milestone"]
---
Der letzte Beitrag endete bei **v0.5.306** mit der Gen-GC + JSON + Benchmarks-Story. Vier Tage später ist Perry bei **v0.5.359** — das sind **53 Patch-Releases** — und die Geschichte ist wieder eine andere. Keines dieser Releases ist eine Schlagzeile mit Benchmark-Zahlen. Fast alle sind **Issues aus dem Tracker, die geschlossen werden**.

-   **`perry/updater`** ist da — Auto-Update für Desktop-Apps in Sparkle/Tauri-Manier (Ed25519 über einen SHA-256-Digest, Sentinel-Rollback, Detached Relaunch). Community-PR von **TheHypnoo** ([#224](https://github.com/PerryTS/perry/pull/224)).
-   **Geisterhand Phase D** — ein Live-Inspector unter `http://localhost:7676` mit Widget-Baum, Per-Widget-Detail, Click-Dispatch und Live-Style-Edit über `POST /style/:h`.
-   **Das Compiler-Refactoring.** Über v0.5.329 → v0.5.343 wurden die vier am häufigsten genannten Dateien zerlegt: `lower::lower_expr` 6.687 → 624 LOC (−91 %), `compile.rs` 9.391 → 3.783 LOC (−60 %), `lower.rs` 13.591 → 7.554 LOC (−44 %), `lower_call.rs` 7.000+ → 4.681 LOC (−33 %). Neuer `walker.rs` verwandelt die `_ =>` \-Catch-all-Bug-Klasse in einen Compile-Error.
-   **UI-Styling Phase C abgeschlossen** — Inline-`style: { ... }`\-Props auf jedem Widget über Apple, Android, GTK4, Windows und Web. Windows bekommt 4 von 5 Stubs verdrahtet (Decoration / Opacity / Borders); nur `widget.shadow` bleibt offen (DirectComposition-Follow-up).
-   **Ein Scoop-Bucket** für Windows: `scoop install perry-ts/perry`. SHA-256-Sidecars im Release-Workflow.
-   **Welle von Community-Issue-Fixes** — etwa 30 Issues geschlossen über Runtime, Codegen, fetch, GTK4, Windows-Linker, Async und Stdlib.

## 1\. perry/updater — Auto-Update für Desktop-Apps

Vor dem Fix hatte Perry keinen Update-Pfad. Apps wurden ausgeliefert, und das war's. **TheHypnoo** öffnete [#224](https://github.com/PerryTS/perry/pull/224) mit der ganzen Story:

```
import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // Sentinel-Rollback, falls der vorherige Start gecrasht ist

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(`${pct}%`));
  await update.installAndRelaunch();
}

markHealthy(); // aufrufen, nachdem der neue Build erfolgreich gestartet ist
```

Trust-Modell: **Ed25519 über den SHA-256-Digest der Datei** (nicht über die Datei-Bytes — das hält die Verifikation bei großen Binärdateien günstig). Das Manifest ist JSON, schema-versioniert, ein Eintrag pro `<os>-<arch>`\-Tripel. Atomare Installation mit `<exe>.prev`\-Backup, Detached Relaunch (`setsid` auf Unix, `DETACHED_PROCESS` auf Windows). Mobile ist bewusst ausgeschlossen — App Store / Play Store kontrollieren die Installation auf OS-Ebene.

Beim Schreiben des Smoke-Tests tauchten zwei Perry-Runtime-Eigenheiten auf, die direkt mitgefixt wurden:

-   **`response.arrayBuffer()` lieferte einen Metadaten-Stub.** Gefixt in [#232](https://github.com/PerryTS/perry/pull/232) (auch TheHypnoo) — `js_response_array_buffer` alloziert jetzt einen echten `BufferHeader` und `memcpy`t `resp.body` hinein.
-   **`fs.appendFileSync` schrieb 0 Bytes.** Gefixt in [#226](https://github.com/PerryTS/perry/issues/226) — der Namespace-Import-Lowering-Pfad (`import * as fs from "fs"`) hatte keinen Arm für `appendFileSync`, und der LLVM-Codegen hatte ebenfalls keinen Arm für die HIR-Variante. Beide jetzt verdrahtet.

Die Dokumentation lebt unter `docs/src/updater/overview.md`.

## 2\. Geisterhand: Live-Inspector unter localhost:7676

Geisterhand ist Perrys In-Process-UI-Test-Harness — eine HTTP-API auf Port 7676 zum Snapshotten von Widget-State und Dispatchen von Klicks. Phase D macht daraus einen Devtools-artigen Inspector, den du in jedem Browser öffnen kannst.

-   **Schritt 1 (v0.5.349)** — `GET /` liefert eine Single-Page-Vanilla-JS-UI mit Widget-Baum, Per-Widget-Detail (Frame, Value, Raw JSON), 1,5 s Auto-Refresh mit Pause/Resume und einem „fire onClick“-Action-Button. Der Codegen pinnt `INSPECTOR_HTML` gegen das macOS-Lazy-Load-`-dead_strip`, damit es Release-Builds übersteht.
-   **Schritt 2 (v0.5.350)** — `POST /style/:h` nimmt einen JSON-Prop-Bag und wendet ihn live an. 9 Props (`backgroundColor`, `color`, `borderColor`, `borderWidth`, `borderRadius`, `opacity`, `padding`, `hidden`, `enabled`) fließen vom HTTP-Thread → Main-Thread über die existierende Pump-Queue. Schlechtes JSON → 400; schlechter Handle → 400; unbekannte Props werden serverseitig gefiltert und die Response listet, welche durchgekommen sind.

```
perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \
  -H 'content-type: application/json' \
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}
```

Der macOS-Dispatcher ist verdrahtet; Linux / Windows / iOS / tvOS / visionOS / Android folgen dem gleichen Muster und sind als Nächstes dran.

## 3\. Das Compiler-Refactoring — die vier größten Dateien zerlegen

Fünf Issues im Tracker ([#167](https://github.com/PerryTS/perry/issues/167), [#169](https://github.com/PerryTS/perry/issues/169), [#212](https://github.com/PerryTS/perry/issues/212), [#214](https://github.com/PerryTS/perry/issues/214), plus ein langer Schwanz) hatten dieselbe Form: Eine neue `Expr`\-Variante wurde zu `ir.rs` hinzugefügt, aber einer von vier Ad-hoc-Walkern in `lower.rs` hatte einen `_ =>` \-Catch-all und kompilierte die neue Variante stillschweigend falsch. Sowas zur Laufzeit zu fangen ist teuer — manchmal unsichtbar, manchmal ein SIGSEGV unter SSO.

**v0.5.329** brachte `crates/perry-hir/src/walker.rs` mit `walk_expr_children` / `walk_expr_children_mut` — exhaustive Matches über alle 178 `Expr`\-Varianten, **kein Catch-all**. Eine neue Variante hinzuzufügen, ohne sie hier zu listen, ist jetzt ein Compile-Error. Die vier Konsumenten (`substitute_locals`, `find_max_local_id::check_expr`, `collect_local_refs_expr`, `remap_local_ids_in_expr`) kollabierten:

| Funktion | Vorher | Nachher | Δ |
| --- | --- | --- | --- |
| `find_max_local_id::check_expr` | 225 | 57 | −75 % |
| `substitute_locals` | 553 | 80 | −86 % |
| `collect_local_refs_expr` | 720 | 70 | −90 % |
| `remap_local_ids_in_expr` | 542 | 85 | −84 % |

Summe: **−1.830 Zeilen duplizierter Descent**, ersetzt durch **+1.840 Zeilen eines zentralisierten Walkers** — netto flach, aber die Bug-Klasse ist weg.

Das schaltete den Rest frei. **v0.5.331 → v0.5.343** zerlegten die vier Monolithen über 14 Commits. Die Headline-Zahlen:

| Datei | Vorher | Nachher | Δ |
| --- | --- | --- | --- |
| `lower::lower_expr` | 6.687 | 624 | −91 % |
| `compile.rs` | 9.391 | 3.783 | −60 % |
| `lower.rs` | 13.591 | 7.554 | −44 % |
| `lower_call.rs` | 7.000+ | 4.681 | −33 % |

Der Split landete als 19 neue, fokussierte Sub-Module: `compile/{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}.rs`, `lower/{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}.rs`, `lower_call/{ui_styling, builtin, native}.rs`, plus eine neue `crates/perry-dispatch`\-Crate, die zur Single Source of Truth für UI- / System- / i18n-Method-Tables wurde (das `_ => "perry_ui_unknown"`\-Fan-out, das die „kompiliert auf macOS, kaputt im Web“-Überraschungen aus Issue [#191](https://github.com/PerryTS/perry/issues/191) getrieben hatte, ist jetzt ein einziges Lookup).

**Tier-4-Perf-Wins** kamen mit (v0.5.335–v0.5.336):

-   Zwei Passes in `inline_functions` und drei rayon-Passes in `compile.rs` fusioniert — spart 5 Modul-Scans + 3 Scheduler-Round-Trips pro Compile.
-   Den `perry dev`\-Parse-Cache bei 500 Einträgen begrenzt, FIFO-Eviction. Vor dem Fix konnte eine Session, die `node_modules` durchläuft, 100+ MB SWC-AST halten.
-   Die Post-Codegen-`.ll`\-Write-Schleife parallelisiert — 2–4× schnellere Wall-Time auf SSDs mit 50+ Modulen.
-   `Arc<I18nTable>` statt die Locale-Tabelle pro Worker zu klonen.

Workspace-Tests blieben bei **434 passed / 0 failed / 5 ignored** über jeden Commit; Gap-Tests bei 25/28 Baseline; Doc-Tests bei 80/82 Baseline.

## 4\. UI-Styling Phase C, abgeschlossen

Phase C war der Inline-`style: { ... }`\-Rollout. Schritte 1–7 schlossen in diesem Fenster:

-   **v0.5.305 → v0.5.306** — `StyleProps`\-Type-Surface + Inline-`style:` auf Button.
-   **v0.5.307 → v0.5.309** — Color/Padding/Shadow-Inline-Destructure auf jedem Tabellen-Widget, dann VStack / HStack.
-   **v0.5.310 → v0.5.311** — Hex-Strings + Gradient + Runtime-`parseColor` für dynamische Werte.
-   **v0.5.312** — Styling-Docs + Windows-Tracking-Issue.

Dann der Cross-Platform-Sweep:

-   **GTK4** ([#202](https://github.com/PerryTS/perry/issues/202), [#206](https://github.com/PerryTS/perry/issues/206)) — 4 Styling-FFIs verdrahtet, plus 7 fehlende FFIs, die das Linux-Doc-Tests-Gate blockierten (v0.5.322).
-   **macOS** (v0.5.324) — `CALayer`\-Shadow-Plumbing für `widget.shadow` + visual\_test-Infrastruktur; `set_color`\-Class-Probe für Nicht-`NSTextField`\-Widgets.
-   **iOS / tvOS / visionOS** (v0.5.346) — Button-`color: ...` traf `setTextColor:` auf `UIButton`, der diesen Selektor nicht implementiert; `objc2`\-Panic überquerte eine `extern "C"`\-Grenze und der Prozess brach ab. Über das gleiche Class-Probe-Muster wie macOS gefixt — UIButton routet jetzt durch `setTitleColor:forState:UIControlStateNormal`.
-   **Windows** (v0.5.347) — 4 von 5 Styling-Stubs verdrahtet (`text.decoration` via `LOGFONT`\-Round-Trip, `widget.opacity` via `WS_EX_LAYERED` + `SetLayeredWindowAttributes`, Borders via `SetWindowSubclass` + `WM_PAINT`). Nur `widget.shadow` bleibt offen (braucht DirectComposition).

Die Styling-Matrix in `docs/src/ui/styling-matrix.md` beendet das Fenster mit **Web bei 43/43 Wired**, **Windows bei 42/43 Wired**, der Rest bei voller Abdeckung.

## 5\. Der Runtime-Korrektheits-Pass — Issue für Issue

Ein Thema des Zeitraums: Jeder Miscompile, der über den Tracker reinkam, wurde entweder zu einem Fix oder zu einem Compile-Time-Error. Highlights:

-   **[#212](https://github.com/PerryTS/perry/issues/212) (v0.5.323)** — Klassen-Methoden innerhalb von `fn` konnten umschließende Fn-Locals nicht capturen. Multi-Module-Repros matchen jetzt Node Byte-für-Byte.
-   **[#214](https://github.com/PerryTS/perry/issues/214) (v0.5.321 + v0.5.330)** — SSO-sicheres String-Handle-Unboxing über 7 String-Operand-Sites: `arr.join`, `arr.toString`, `obj[stringKey]` get/set/delete, `string.match(re)`, `process.env[dynKey]`, Crypto-Digest-Input. Vor dem Fix lieferte jede dieser Stellen entweder stumm Müll oder SIGSEGV bei Inline-String-Operanden.
-   **[#221](https://github.com/PerryTS/perry/issues/221) (v0.5.351)** — Modul-Level leere `const`\-Arrays verloren `arr[i]=`\-Writes aus Funktionen heraus. Aufgetaucht, als Bloom-Engine/jumps `discoverLevels()` `LEVEL_FILES` auf Modul-Level via Index-Assign befüllte und der Level-Select-Screen leer rauskam.
-   **[#233](https://github.com/PerryTS/perry/issues/233) (v0.5.357)** — `Array.push` aus einer Async-Funktion war stumm bei 16 Elementen gedeckelt, wenn das Array als Parameter übergeben wurde. Async-Funktionen werden nicht inlined; Reallocation gab einen neuen Pointer zurück, den der Caller nie sah. Fix: bei jedem Wachstum einen Forwarding-Pointer an der alten Position installieren, wiederverwendet wird der GC-eigene `GC_FLAG_FORWARDED`\-Mechanismus.
-   **[#235](https://github.com/PerryTS/perry/issues/235) (v0.5.358)** — Method-Default-Param-Dispatch lieferte Müll, wenn Caller nachgestellte Args wegließen. Zwei Anteile: Cross-Module-Method-Declares hardcodierten 6 Doubles statt `arity + 1`, und `lower_class_method` hatte überhaupt keinen `build_default_param_stmts`\-Aufruf. Aufgetaucht in mongodbs `findOne(filter, options = {})`, das stumm hing; Fix ist einheitlich über lokalen + Cross-Module-Dispatch.
-   **[#236](https://github.com/PerryTS/perry/issues/236) (v0.5.355)** — drei unabhängige fetch- + Promise-Bugs aus einem Repro: api.github.com 403'te anonym (Default-User-Agent jetzt gesetzt), `.then(console.log)` hing ewig (Null-Callbacks pushten keine TASK\_QUEUE-Einträge), jede fetch-Rejection druckte `Uncaught exception: [object Object]` (NaN-geboxter blanker `*StringHeader` statt eines echten `ErrorHeader`).
-   **[#234](https://github.com/PerryTS/perry/issues/234) (v0.5.359)** — echte `Blob` mit `arrayBuffer` / `text` / `bytes` / `slice`\-Instance-Methoden. Vor dem Fix gab `await response.blob()` einen Metadaten-Stub `{size, type}` zurück. Dreiteiliger Fix landete über Runtime + HIR + Codegen.

Plus die kleinen Catch-ups:

-   **[#181](https://github.com/PerryTS/perry/issues/181)** — Strip-Dedup über-prunte generische Monomorphisierungen unter Linux + GTK4-Link-Silent-Fallback. Fix: Name-Pattern-Filter durch **Symbol-Set**\-Vergleich via `llvm-nm` ersetzen. Members mit auch nur einem unique Symbol bleiben drin. `libperry_ui_macos.a` getrimmt 196 → 35 Objekte ohne Link-Errors.
-   **[#220](https://github.com/PerryTS/perry/issues/220)** — `secur32.lib` zur Windows-Link-Line hinzugefügt.
-   **[#198](https://github.com/PerryTS/perry/issues/198)** — i18n-`FormatNumber`\-FP-Round-Trip via Ryū.
-   **[#188](https://github.com/PerryTS/perry/issues/188)** — Codegen-Dispatch für `perry/i18n`\-Format-Wrapper verdrahtet.
-   **[#189](https://github.com/PerryTS/perry/issues/189) / [#203](https://github.com/PerryTS/perry/issues/203)** — `perry/plugin`\-Codegen-Dispatch.
-   **[#190](https://github.com/PerryTS/perry/issues/190)** — Canvas-Widget durch LLVM-Codegen.
-   **[#191](https://github.com/PerryTS/perry/issues/191)** — CameraView durch Codegen.
-   **[#192](https://github.com/PerryTS/perry/issues/192)** — Table-Widget durch Codegen.
-   **[#193](https://github.com/PerryTS/perry/issues/193)** (teilweise) — 11 Stdlib-Helper-Dispatch-Arms.
-   **[#98](https://github.com/PerryTS/perry/issues/98)** — Background-Receive-Notifications auf iOS + Android (Warm-Path).
-   **[#106](https://github.com/PerryTS/perry/issues/106)** — watchOS-Weak-Fallbacks für Game-Loop-FFI-Hooks.
-   **[#154](https://github.com/PerryTS/perry/issues/154)** — `using` / `await using`\-Dispose-Hooks.
-   **[#167](https://github.com/PerryTS/perry/issues/167)** — `js_native_call_method`\-Args-Alloca in den Entry-Block gehoist.
-   **[#169](https://github.com/PerryTS/perry/issues/169)** — `substitute_locals`\-Uint8Array-Arms.
-   **[#226](https://github.com/PerryTS/perry/issues/226)** — `fs.appendFileSync` Ende-zu-Ende verdrahtet (Community-PR).

## 6. Windows + Scoop

Die Windows-Toolchain-Story vereinfacht sich weiter. **v0.5.353** pinnte `clang -target` bei Host-Builds — Nicht-MSVC-clang im PATH (MinGW / MSYS2 / Anaconda / Rust-GNU-Bundles) schrieb Perrys `x86_64-pc-windows-msvc`\-IR stillschweigend zu `windows-gnu` um, und lld-link konnte die `__main`\-Referenz, die LLVMs mingw32-Emitter eingefügt hatte, nicht auflösen. Neuer `probe_clang_default_triple` ruft einmal pro Prozess `clang --version` auf und druckt einen einzigen Info-Hinweis, wenn der Host-Default GNU ist, wir aber MSVC targeten. Mit `PERRY_NO_CLANG_PROBE=1` unterdrücken.

**v0.5.345** brachte das Win64-`perry-ui`\-ABI mit `perry-dispatch` in Einklang — drei Runtime-Extern-Signaturen waren auseinandergedriftet (`perry_ui_navstack_create`, `perry_ui_menu_add_item_with_shortcut`, `perry_ui_app_set_timer`). Auf Win64-ABI teilen sich Integer- und Float-Positions-Args dieselben Slot-Indices, also liest ein Mismatch Müll aus uninitialisierten Registern. SysV (macOS / Linux) nutzt separate Int/Float-Register-Pools und landete zufällig valide Bits — Windows-only-Crash, gefixt über alle 8 perry-ui-\*-Plattform-Crates.

Dann: **`scoop install perry-ts/perry`**. Manifest gepinnt auf v0.5.345 (mit `depends: main/llvm`, um offizielles MSVC-Default-LLVM automatisch zu ziehen). Der Release-Workflow emittiert jetzt `<artifact>.sha256`\-Sidecars neben jedem Archiv, im `sha256sum`\-kompatiblen Format für jeden Downstream-Package-Manager-Bumper.

```
# Windows-Host
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\main.ts --target windows -o myapp.exe
```

## 7\. Abschluss

Das Muster dieser Phase ist Community-Engagement plus interne Hygiene. **TheHypnoo** lieferte drei substanzielle PRs ([#224](https://github.com/PerryTS/perry/pull/224) perry/updater, [#231](https://github.com/PerryTS/perry/pull/231) `fs.appendFileSync`\-Wiring, [#232](https://github.com/PerryTS/perry/pull/232) `response.arrayBuffer`\-Body-Bytes). Der Tracker leerte sich um etwa 30 Issues. Der Compiler wurde auf seiner größten Datei 60 % kleiner und bekam einen exhaustive Walker, der „hab vergessen, einen von vier Ad-hoc-Walkern zu updaten“ von einem Runtime-Miscompile in einen `cargo build`\-Error verwandelt. UI-Styling erreichte Parität über jede Desktop-Plattform außer Shadows auf Windows. Geisterhand bekam eine Browser-basierte Devtools-Oberfläche. Der Windows-Install-Pfad wurde einen Befehl kürzer.

Probier's aus:

```
# npm (jede Plattform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Auto-Update für Desktop-Apps
npm install @perry/updater

# Live-Inspector
perry compile main.ts -o app --enable-geisterhand
./app &  # dann http://localhost:7676 öffnen
```

Quelle: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) – Probleme: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues) – Änderungsprotokoll: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
