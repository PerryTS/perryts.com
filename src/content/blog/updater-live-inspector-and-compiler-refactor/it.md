---
title: "Auto-Update, un Inspector Live e il Compilatore che si è Ridotto a Metà"
excerpt: "Perry v0.5.306 → v0.5.359 in quattro giorni — 53 patch release, ~30 issue chiuse e tre cose grosse atterrate: perry/updater per l'auto-update desktop, un inspector live a localhost:7676 e un refactor del compilatore che ha ridotto i quattro file più grandi del 33–91%."
date: 2026-04-28
tags: ["updater", "devtools", "refactor", "community", "milestone"]
---
Il post precedente si è chiuso a **v0.5.306** sulla storia gen-GC + JSON + benchmark. Quattro giorni dopo, Perry è a **v0.5.359** — sono **53 patch release** — e la storia è ancora un'altra. Nessuna di quelle release è un titolo a colpi di numeri di benchmark. Quasi tutte sono **issue del tracker che vengono chiuse**.

-   **`perry/updater`** arriva — auto-update stile Sparkle/Tauri per app desktop (Ed25519 su un digest SHA-256, sentinel-rollback, riavvio detached). PR community di **TheHypnoo** ([#224](https://github.com/PerryTS/perry/pull/224)).
-   **Geisterhand Fase D** — un inspector live a `http://localhost:7676` con albero dei widget, dettaglio per widget, dispatch dei click ed editing di stile live via `POST /style/:h`.
-   **Il refactor del compilatore.** Tra v0.5.329 → v0.5.343 i quattro file più citati sono stati spezzati: `lower::lower_expr` 6.687 → 624 LOC (−91%), `compile.rs` 9.391 → 3.783 LOC (−60%), `lower.rs` 13.591 → 7.554 LOC (−44%), `lower_call.rs` 7.000+ → 4.681 LOC (−33%). Il nuovo `walker.rs` trasforma la classe di bug del catch-all `_ =>` in errore di compilazione.
-   **Lo styling UI Fase C chiude** — props inline `style: { ... }` su ogni widget tra Apple, Android, GTK4, Windows e Web. Windows ottiene 4 stub su 5 cablati (decoration / opacity / borders); resta solo `widget.shadow` (follow-up con DirectComposition).
-   **Un bucket Scoop** per Windows: `scoop install perry-ts/perry`. Sidecar SHA-256 nel workflow di release.
-   **Ondata di fix di issue dalla community** — circa 30 issue chiuse tra runtime, codegen, fetch, GTK4, linker Windows, async e stdlib.

## 1\. perry/updater — auto-update per app desktop

Prima del fix, Perry non aveva un percorso di aggiornamento. Le app uscivano, e basta. **TheHypnoo** ha aperto [#224](https://github.com/PerryTS/perry/pull/224) con tutta la storia:

```
import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // sentinel-rollback se il lancio precedente è crashato

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(`${pct}%`));
  await update.installAndRelaunch();
}

markHealthy(); // chiamare dopo che la nuova build è partita correttamente
```

Modello di trust: **Ed25519 sul digest SHA-256 del file** (non sui byte del file — mantiene la verifica economica sui binari grandi). Il manifest è JSON, versionato per schema, una entry per tripla `<os>-<arch>`. Installazione atomica con backup `<exe>.prev`, riavvio detached (`setsid` su Unix, `DETACHED_PROCESS` su Windows). Il mobile è escluso per design — App Store / Play Store controllano la pipeline di installazione a livello OS.

Due quirk del runtime di Perry sono emersi scrivendo lo smoke test, e sono stati fixati al volo:

-   **`response.arrayBuffer()` tornava uno stub di soli metadati.** Fixato in [#232](https://github.com/PerryTS/perry/pull/232) (sempre TheHypnoo) — `js_response_array_buffer` ora alloca un vero `BufferHeader` e fa `memcpy` di `resp.body` dentro.
-   **`fs.appendFileSync` scriveva 0 byte.** Fixato in [#226](https://github.com/PerryTS/perry/issues/226) — il path di lowering del namespace-import (`import * as fs from "fs"`) non aveva un arm per `appendFileSync`, e nemmeno il codegen LLVM aveva un arm per la variante HIR. Entrambi cablati.

La documentazione vive in `docs/src/updater/overview.md`.

## 2\. Geisterhand: inspector live a localhost:7676

Geisterhand è stato l'harness di test UI in-process di Perry — una API HTTP sulla porta 7676 per snapshottare lo stato dei widget e dispatchare click. La Fase D lo trasforma in un inspector stile devtools che si può aprire da qualsiasi browser.

-   **Step 1 (v0.5.349)** — `GET /` serve una UI vanilla-JS single-page con albero dei widget, dettaglio per widget (frame, value, raw JSON), auto-refresh da 1,5 s con pause/resume e un bottone «fire onClick». Il codegen pinna `INSPECTOR_HTML` contro il lazy-load `-dead_strip` di macOS perché sopravviva ai release build.
-   **Step 2 (v0.5.350)** — `POST /style/:h` prende un sacchetto di props JSON e lo applica live. 9 props (`backgroundColor`, `color`, `borderColor`, `borderWidth`, `borderRadius`, `opacity`, `padding`, `hidden`, `enabled`) fluiscono dal thread HTTP → thread principale via la pump-queue esistente. JSON sbagliato → 400; handle sbagliato → 400; le props sconosciute sono filtrate lato server e la response elenca quali sono passate.

```
perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \
  -H 'content-type: application/json' \
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}
```

Il dispatcher macOS è cablato; Linux / Windows / iOS / tvOS / visionOS / Android seguono la stessa forma e sono i prossimi.

## 3\. Il refactor del compilatore — spezzare i quattro file più grossi

Cinque issue nel tracker ([#167](https://github.com/PerryTS/perry/issues/167), [#169](https://github.com/PerryTS/perry/issues/169), [#212](https://github.com/PerryTS/perry/issues/212), [#214](https://github.com/PerryTS/perry/issues/214), più una coda lunga) avevano la stessa forma: una nuova variante di `Expr` aggiunta a `ir.rs`, ma uno dei quattro walker ad-hoc in `lower.rs` aveva un catch-all `_ =>` e mis-compilava silenziosamente la nuova variante. Beccarlo a runtime è caro — a volte invisibile, a volte un SIGSEGV sotto SSO.

**v0.5.329** ha introdotto `crates/perry-hir/src/walker.rs` con `walk_expr_children` / `walk_expr_children_mut` — match esaustivi su tutte le 178 varianti di `Expr`, **nessun catch-all**. Aggiungere una nuova variante senza elencarla qui ora è un errore di compilazione. I quattro consumer (`substitute_locals`, `find_max_local_id::check_expr`, `collect_local_refs_expr`, `remap_local_ids_in_expr`) sono collassati:

| Funzione | Prima | Dopo | Δ |
| --- | --- | --- | --- |
| `find_max_local_id::check_expr` | 225 | 57 | −75% |
| `substitute_locals` | 553 | 80 | −86% |
| `collect_local_refs_expr` | 720 | 70 | −90% |
| `remap_local_ids_in_expr` | 542 | 85 | −84% |

Totale: **−1.830 righe di descent duplicato**, sostituite da **+1.840 righe di un walker centralizzato** — netto piatto, ma la classe di bug è andata.

Quello ha sbloccato il resto. **v0.5.331 → v0.5.343** hanno tagliato i quattro monoliti in 14 commit. I numeri di copertina:

| File | Prima | Dopo | Δ |
| --- | --- | --- | --- |
| `lower::lower_expr` | 6.687 | 624 | −91% |
| `compile.rs` | 9.391 | 3.783 | −60% |
| `lower.rs` | 13.591 | 7.554 | −44% |
| `lower_call.rs` | 7.000+ | 4.681 | −33% |

Lo split è atterrato come 19 nuovi sotto-moduli focalizzati: `compile/{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}.rs`, `lower/{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}.rs`, `lower_call/{ui_styling, builtin, native}.rs`, più una nuova crate `crates/perry-dispatch` diventata l'unica fonte di verità per le tabelle di metodi UI / system / i18n (il fan-out `_ => "perry_ui_unknown"` che provocava le sorprese «compila su macOS, si rompe sul web» dell'issue [#191](https://github.com/PerryTS/perry/issues/191) ora è un solo lookup).

**I win di perf di Tier 4** hanno accompagnato (v0.5.335–v0.5.336):

-   Fusi due passi in `inline_functions` e tre passi rayon in `compile.rs` — risparmia 5 scan di modulo + 3 round-trip dello scheduler per compilazione.
-   Limitato il parse cache di `perry dev` a 500 entry, eviction FIFO. Prima del fix, una sessione che girava su `node_modules` poteva trattenere 100+ MB di AST SWC.
-   Parallelizzato il loop di scrittura `.ll` post-codegen — wall-time 2–4× più veloce su SSD con 50+ moduli.
-   `Arc<I18nTable>` invece di clonare la tabella locale per worker.

I test del workspace sono rimasti a **434 passed / 0 failed / 5 ignored** in ogni commit; gap test alla baseline 25/28; doc-test alla baseline 80/82.

## 4\. UI styling Fase C, finita

La Fase C era il rollout di `style: { ... }` inline. Gli step 1–7 hanno chiuso in questa finestra:

-   **v0.5.305 → v0.5.306** — superficie di tipo `StyleProps` + `style:` inline su Button.
-   **v0.5.307 → v0.5.309** — destructure inline color/padding/shadow su ogni widget tabella, poi VStack / HStack.
-   **v0.5.310 → v0.5.311** — stringhe hex + gradient + `parseColor` a runtime per valori dinamici.
-   **v0.5.312** — docs di styling + issue di tracking Windows.

Poi la passata cross-platform:

-   **GTK4** ([#202](https://github.com/PerryTS/perry/issues/202), [#206](https://github.com/PerryTS/perry/issues/206)) — 4 FFI di styling cablati, più 7 FFI mancanti che bloccavano il gate dei doc-test Linux (v0.5.322).
-   **macOS** (v0.5.324) — plumbing dell'ombra `CALayer` per `widget.shadow` + infrastruttura visual\_test; class-probe `set_color` per i widget non-`NSTextField`.
-   **iOS / tvOS / visionOS** (v0.5.346) — Button `color: ...` colpiva `setTextColor:` su `UIButton`, che non implementa quel selettore; il panic di `objc2` attraversava una frontiera `extern "C"` e il processo si abortiva. Fixato con lo stesso pattern di class-probe di macOS — UIButton ora viene istradato attraverso `setTitleColor:forState:UIControlStateNormal`.
-   **Windows** (v0.5.347) — 4 stub di styling su 5 cablati (`text.decoration` via round-trip `LOGFONT`, `widget.opacity` via `WS_EX_LAYERED` + `SetLayeredWindowAttributes`, borders via `SetWindowSubclass` + `WM_PAINT`). Resta solo `widget.shadow` (serve DirectComposition).

La matrice di styling in `docs/src/ui/styling-matrix.md` chiude la finestra con **Web a 43/43 Wired**, **Windows a 42/43 Wired**, il resto a copertura piena.

## 5\. La passata di correttezza del runtime — issue per issue

Un tema del periodo: ogni miscompile arrivato dal tracker si è trasformato o in un fix o in un errore di compilazione. Highlight:

-   **[#212](https://github.com/PerryTS/perry/issues/212) (v0.5.323)** — i metodi di classe dentro `fn` non potevano catturare local della fn racchiudente. Repro multi-modulo ora combaciano con Node byte per byte.
-   **[#214](https://github.com/PerryTS/perry/issues/214) (v0.5.321 + v0.5.330)** — unboxing di string-handle SSO-safe su 7 site con operandi string: `arr.join`, `arr.toString`, `obj[stringKey]` get/set/delete, `string.match(re)`, `process.env[dynKey]`, input di digest crypto. Prima del fix, ognuno o tornava silenziosamente garbage o faceva SIGSEGV su operandi inline-string.
-   **[#221](https://github.com/PerryTS/perry/issues/221) (v0.5.351)** — gli array vuoti `const` a livello modulo perdevano le scritture `arr[i]=` dall'interno delle funzioni. Emerso quando `discoverLevels()` di Bloom-Engine/jump popolava `LEVEL_FILES` a livello modulo via index-assign e la schermata di selezione livello veniva vuota.
-   **[#233](https://github.com/PerryTS/perry/issues/233) (v0.5.357)** — `Array.push` dall'interno di una funzione async era silenziosamente cappato a 16 elementi quando l'array entrava come parametro. Le funzioni async non vengono inlinate; la realloc tornava un nuovo puntatore che il chiamante non vedeva mai. Fix: installare un puntatore di forwarding alla vecchia posizione a ogni crescita, riusando il meccanismo `GC_FLAG_FORWARDED` esistente del GC.
-   **[#235](https://github.com/PerryTS/perry/issues/235) (v0.5.358)** — il dispatch di parametri di default dei metodi passava garbage quando i chiamanti omettevano arg in coda. Due contributori: i declare di metodo cross-module hardcodavano 6 double invece di `arity + 1`, e `lower_class_method` non chiamava affatto `build_default_param_stmts`. Emerso in `findOne(filter, options = {})` di mongodb che si bloccava in silenzio; il fix è uniforme tra dispatch locale e cross-module.
-   **[#236](https://github.com/PerryTS/perry/issues/236) (v0.5.355)** — tre bug indipendenti fetch + promise da un solo repro: api.github.com restituiva 403 anonimo (User-Agent di default ora impostato), `.then(console.log)` si bloccava per sempre (i callback null non spingevano entry su TASK\_QUEUE), ogni rifiuto fetch stampava `Uncaught exception: [object Object]` (`*StringHeader` nudo NaN-boxato invece di un vero `ErrorHeader`).
-   **[#234](https://github.com/PerryTS/perry/issues/234) (v0.5.359)** — `Blob` reale con metodi di istanza `arrayBuffer` / `text` / `bytes` / `slice`. Prima del fix, `await response.blob()` tornava uno stub di soli metadati `{size, type}`. Fix in tre parti atterrato su runtime + HIR + codegen.

Più i piccoli recuperi:

-   **[#181](https://github.com/PerryTS/perry/issues/181)** — strip-dedup potava in eccesso le monomorfizzazioni generiche su Linux + silent-fallback del link GTK4. Fix: sostituire il filtraggio per pattern di nome con confronto di **insieme di simboli** via `llvm-nm`. I membri con anche un solo simbolo unique vengono tenuti. `libperry_ui_macos.a` tagliato 196 → 35 oggetti senza errori di link.
-   **[#220](https://github.com/PerryTS/perry/issues/220)** — `secur32.lib` aggiunto alla riga di link Windows.
-   **[#198](https://github.com/PerryTS/perry/issues/198)** — i18n `FormatNumber` round-trip FP via Ryū.
-   **[#188](https://github.com/PerryTS/perry/issues/188)** — codegen dispatch cablato per i wrapper di formato `perry/i18n`.
-   **[#189](https://github.com/PerryTS/perry/issues/189) / [#203](https://github.com/PerryTS/perry/issues/203)** — codegen dispatch `perry/plugin`.
-   **[#190](https://github.com/PerryTS/perry/issues/190)** — widget Canvas attraverso il codegen LLVM.
-   **[#191](https://github.com/PerryTS/perry/issues/191)** — CameraView attraverso il codegen.
-   **[#192](https://github.com/PerryTS/perry/issues/192)** — widget Table attraverso il codegen.
-   **[#193](https://github.com/PerryTS/perry/issues/193)** (parziale) — 11 arm di dispatch di helper stdlib.
-   **[#98](https://github.com/PerryTS/perry/issues/98)** — ricezione in background delle notifiche su iOS + Android (warm-path).
-   **[#106](https://github.com/PerryTS/perry/issues/106)** — fallback deboli per gli hook FFI di game-loop su watchOS.
-   **[#154](https://github.com/PerryTS/perry/issues/154)** — hook di dispose `using` / `await using`.
-   **[#167](https://github.com/PerryTS/perry/issues/167)** — alloca degli arg di `js_native_call_method` issata al blocco di entry.
-   **[#169](https://github.com/PerryTS/perry/issues/169)** — arm Uint8Array di `substitute_locals`.
-   **[#226](https://github.com/PerryTS/perry/issues/226)** — `fs.appendFileSync` cablato end-to-end (PR community).

## 6. Finestre + Scoop

La storia della toolchain Windows continua a semplificarsi. **v0.5.353** ha pinnato `clang -target` sui build host — clang non-MSVC nel PATH (MinGW / MSYS2 / Anaconda / bundle GNU di Rust) riscriveva silenziosamente l'IR `x86_64-pc-windows-msvc` di Perry in `windows-gnu`, e lld-link non riusciva a risolvere il riferimento `__main` che l'emettitore mingw32 di LLVM inseriva. Il nuovo `probe_clang_default_triple` esegue `clang --version` una volta per processo e stampa una sola nota informativa quando il default dell'host è GNU ma stiamo targetando MSVC. Sopprimere con `PERRY_NO_CLANG_PROBE=1`.

**v0.5.345** ha allineato l'ABI `perry-ui` Win64 con `perry-dispatch` — tre firme extern di runtime erano andate alla deriva (`perry_ui_navstack_create`, `perry_ui_menu_add_item_with_shortcut`, `perry_ui_app_set_timer`). Sull'ABI Win64 gli arg posizionali interi e float condividono gli indici di slot, quindi un mismatch legge garbage da registri non inizializzati. SysV (macOS / Linux) usa pool di registri int/float separati e per caso atterravano bit validi — crash solo Windows, fixato sulle 8 crate di piattaforma perry-ui-\*.

Poi: **`scoop install perry-ts/perry`**. Manifest pinnato a v0.5.345 (con `depends: main/llvm` per tirare automaticamente il LLVM ufficiale default-MSVC). Il workflow di release ora emette sidecar `<artifact>.sha256` accanto a ogni archivio, in formato compatibile `sha256sum` per ogni bumper di package manager downstream.

```
# Host Windows
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\main.ts --target windows -o myapp.exe
```

## 7\. Tirando le somme

Il pattern di questo tratto è engagement della community più igiene interna. **TheHypnoo** ha consegnato tre PR significativi ([#224](https://github.com/PerryTS/perry/pull/224) perry/updater, [#231](https://github.com/PerryTS/perry/pull/231) cablaggio di `fs.appendFileSync`, [#232](https://github.com/PerryTS/perry/pull/232) byte di body in `response.arrayBuffer`). Il tracker si è svuotato di circa 30 issue. Il compilatore è diventato 60% più piccolo sul suo file più grosso e ha messo su un walker esaustivo che trasforma «ho dimenticato di aggiornare uno dei quattro walker ad-hoc» da miscompile runtime a errore `cargo build`. Lo styling UI ha raggiunto la parità su ogni piattaforma desktop tranne le ombre su Windows. Geisterhand ha fatto crescere una superficie devtools da browser. Il path di installazione su Windows si è accorciato di un comando.

Provalo:

```
# npm (qualunque piattaforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Auto-update per app desktop
npm install @perry/updater

# Inspector live
perry compile main.ts -o app --enable-geisterhand
./app &  # poi apri http://localhost:7676
```

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issue: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
