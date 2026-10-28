---
title: "Auto-actualización, un inspector en vivo y el compilador que se redujo a la mitad"
excerpt: "Perry v0.5.306 → v0.5.359 en cuatro días — 53 patch releases, ~30 issues cerradas y aterrizaron tres cosas grandes: perry/updater para auto-actualización en desktop, un inspector en vivo en localhost:7676 y un refactor del compilador que recortó los cuatro archivos más grandes entre un 33 y un 91 %."
date: 2026-04-28
tags: ["updater", "devtools", "refactor", "community", "milestone"]
---
El último post cerró en **v0.5.306** con la historia de gen-GC + JSON + benchmarks. Cuatro días después, Perry está en **v0.5.359** — son **53 patch releases** — y la historia es otra vez distinta. Ninguna de esas releases es un titular de números de benchmark. Casi todas son **issues del tracker que se cierran**.

-   **`perry/updater`** ya está aquí — auto-actualización tipo Sparkle/Tauri para apps de escritorio (Ed25519 sobre un digest SHA-256, sentinel-rollback, relanzamiento desacoplado). PR de la comunidad por **TheHypnoo** ([#224](https://github.com/PerryTS/perry/pull/224)).
-   **Geisterhand Fase D** — un inspector en vivo en `http://localhost:7676` con árbol de widgets, detalle por widget, dispatch de clicks y edición de estilo en vivo vía `POST /style/:h`.
-   **El refactor del compilador.** A lo largo de v0.5.329 → v0.5.343, los cuatro archivos más mencionados se trocearon: `lower::lower_expr` 6.687 → 624 LOC (−91 %), `compile.rs` 9.391 → 3.783 LOC (−60 %), `lower.rs` 13.591 → 7.554 LOC (−44 %), `lower_call.rs` 7.000+ → 4.681 LOC (−33 %). El nuevo `walker.rs` convierte la clase de bug del catch-all `_ =>` en un error de compilación.
-   **El styling UI Fase C cierra** — props inline `style: { ... }` en cada widget de Apple, Android, GTK4, Windows y Web. Windows recibe 4 de 5 stubs cableados (decoration / opacity / borders); solo queda `widget.shadow` (follow-up con DirectComposition).
-   **Un bucket de Scoop** para Windows: `scoop install perry-ts/perry`. Sidecars SHA-256 en el workflow de release.
-   **Ola de fixes de issues de la comunidad** — unas 30 issues cerradas en runtime, codegen, fetch, GTK4, linker de Windows, async y stdlib.

## 1\. perry/updater — auto-actualización para apps de escritorio

Antes del fix, Perry no tenía ruta de actualización. Las apps se publicaban, y se publicaban, y eso era todo. **TheHypnoo** abrió [#224](https://github.com/PerryTS/perry/pull/224) con la historia completa:

```
import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // sentinel-rollback si el lanzamiento anterior crasheó

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(`${pct}%`));
  await update.installAndRelaunch();
}

markHealthy(); // llamar después de que el nuevo build arranque correctamente
```

Modelo de confianza: **Ed25519 sobre el digest SHA-256 del archivo** (no sobre los bytes del archivo — mantiene la verificación barata en binarios grandes). El manifest es JSON, versionado por esquema, una entrada por triple `<os>-<arch>`. Instalación atómica con backup `<exe>.prev`, relanzamiento desacoplado (`setsid` en Unix, `DETACHED_PROCESS` en Windows). El móvil queda excluido por diseño — App Store / Play Store son los dueños del pipeline de instalación a nivel del SO.

Dos peculiaridades del runtime de Perry afloraron al escribir el smoke test, y se arreglaron de paso:

-   **`response.arrayBuffer()` devolvía un stub solo de metadatos.** Arreglado en [#232](https://github.com/PerryTS/perry/pull/232) (también TheHypnoo) — `js_response_array_buffer` ahora aloca un `BufferHeader` real y hace `memcpy` de `resp.body` dentro.
-   **`fs.appendFileSync` escribía 0 bytes.** Arreglado en [#226](https://github.com/PerryTS/perry/issues/226) — el camino de lowering del namespace-import (`import * as fs from "fs"`) no tenía rama para `appendFileSync`, y el codegen LLVM tampoco tenía rama para la variante HIR. Ambos cableados.

La documentación vive en `docs/src/updater/overview.md`.

## 2\. Geisterhand: inspector en vivo en localhost:7676

Geisterhand ha sido el harness de pruebas de UI in-process de Perry — una API HTTP en el puerto 7676 para snapshotear el estado de los widgets y disparar clicks. La Fase D lo convierte en un inspector estilo devtools que puedes abrir desde cualquier navegador.

-   **Paso 1 (v0.5.349)** — `GET /` sirve una UI vanilla-JS de una sola página con árbol de widgets, detalle por widget (frame, value, raw JSON), auto-refresh de 1,5 s con pausa/reanudar y un botón “disparar onClick”. El codegen ancla `INSPECTOR_HTML` contra el lazy-load `-dead_strip` de macOS para que sobreviva a los release builds.
-   **Paso 2 (v0.5.350)** — `POST /style/:h` toma una bolsa de props JSON y la aplica en vivo. 9 props (`backgroundColor`, `color`, `borderColor`, `borderWidth`, `borderRadius`, `opacity`, `padding`, `hidden`, `enabled`) fluyen del hilo HTTP → hilo principal vía la pump-queue existente. JSON inválido → 400; handle inválido → 400; props desconocidas se filtran en el servidor y la respuesta lista cuáles pasaron.

```
perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \
  -H 'content-type: application/json' \
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}
```

El dispatcher de macOS está cableado; Linux / Windows / iOS / tvOS / visionOS / Android siguen el mismo patrón y son los siguientes.

## 3\. El refactor del compilador — partir los cuatro archivos más grandes

Cinco issues del tracker ([#167](https://github.com/PerryTS/perry/issues/167), [#169](https://github.com/PerryTS/perry/issues/169), [#212](https://github.com/PerryTS/perry/issues/212), [#214](https://github.com/PerryTS/perry/issues/214), más una cola larga) tenían la misma forma: se añadió una nueva variante de `Expr` a `ir.rs`, pero uno de los cuatro walkers ad-hoc en `lower.rs` tenía un catch-all `_ =>` y compilaba mal la nueva variante en silencio. Atrapar esto en runtime es caro — a veces invisible, a veces un SIGSEGV bajo SSO.

**v0.5.329** introdujo `crates/perry-hir/src/walker.rs` con `walk_expr_children` / `walk_expr_children_mut` — matches exhaustivos sobre las 178 variantes de `Expr`, **sin catch-all**. Añadir una nueva variante sin listarla aquí es ahora un error de compilación. Los cuatro consumidores (`substitute_locals`, `find_max_local_id::check_expr`, `collect_local_refs_expr`, `remap_local_ids_in_expr`) colapsaron:

| Función | Antes | Después | Δ |
| --- | --- | --- | --- |
| `find_max_local_id::check_expr` | 225 | 57 | −75 % |
| `substitute_locals` | 553 | 80 | −86 % |
| `collect_local_refs_expr` | 720 | 70 | −90 % |
| `remap_local_ids_in_expr` | 542 | 85 | −84 % |

Total: **−1.830 líneas de descenso duplicado**, reemplazadas por **+1.840 líneas de un walker centralizado** — neto plano, pero la clase de bug desaparece.

Eso desbloqueó el resto. **v0.5.331 → v0.5.343** cortaron los cuatro monolitos en 14 commits. Las cifras de portada:

| Archivo | Antes | Después | Δ |
| --- | --- | --- | --- |
| `lower::lower_expr` | 6.687 | 624 | −91 % |
| `compile.rs` | 9.391 | 3.783 | −60 % |
| `lower.rs` | 13.591 | 7.554 | −44 % |
| `lower_call.rs` | 7.000+ | 4.681 | −33 % |

El split aterrizó como 19 nuevos sub-módulos enfocados: `compile/{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}.rs`, `lower/{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}.rs`, `lower_call/{ui_styling, builtin, native}.rs`, más una nueva crate `crates/perry-dispatch` que se convirtió en la única fuente de verdad para las tablas de métodos UI / system / i18n (el fan-out `_ => "perry_ui_unknown"` que provocaba las sorpresas “compila en macOS, rompe en web” del issue [#191](https://github.com/PerryTS/perry/issues/191) es ahora un solo lookup).

**Wins de perf de Tier 4** vinieron acompañando (v0.5.335–v0.5.336):

-   Fusionados dos passes en `inline_functions` y tres rayon passes en `compile.rs` — ahorra 5 escaneos de módulo + 3 idas y vueltas del scheduler por compilación.
-   Acotada la parse cache de `perry dev` a 500 entradas, eviction FIFO. Antes del fix, una sesión recorriendo `node_modules` podía retener más de 100 MB de AST de SWC.
-   Paralelizado el bucle de escritura `.ll` post-codegen — 2–4× más rápido en wall-time en SSDs con más de 50 módulos.
-   `Arc<I18nTable>` en lugar de clonar la tabla de locales por worker.

Los tests del workspace se mantuvieron en **434 passed / 0 failed / 5 ignored** en cada commit; gap tests en baseline 25/28; doc-tests en baseline 80/82.

## 4\. UI styling Fase C, terminada

La Fase C era el rollout de `style: { ... }` inline. Los pasos 1–7 cerraron en esta ventana:

-   **v0.5.305 → v0.5.306** — superficie de tipo `StyleProps` + `style:` inline en Button.
-   **v0.5.307 → v0.5.309** — destructure inline de color/padding/shadow en cada widget de tabla, luego VStack / HStack.
-   **v0.5.310 → v0.5.311** — strings hex + gradient + `parseColor` en runtime para valores dinámicos.
-   **v0.5.312** — docs de styling + issue de tracking de Windows.

Luego el barrido cross-platform:

-   **GTK4** ([#202](https://github.com/PerryTS/perry/issues/202), [#206](https://github.com/PerryTS/perry/issues/206)) — 4 FFIs de styling cableados, más 7 FFIs faltantes que bloqueaban la puerta de doc-tests de Linux (v0.5.322).
-   **macOS** (v0.5.324) — plumbing de sombra `CALayer` para `widget.shadow` + infraestructura de visual\_test; sondeo de clase `set_color` para widgets que no son `NSTextField`.
-   **iOS / tvOS / visionOS** (v0.5.346) — Button con `color: ...` golpeaba `setTextColor:` en `UIButton`, que no implementa ese selector; el panic de `objc2` cruzaba un límite `extern "C"` y el proceso abortaba. Arreglado con el mismo patrón de sondeo de clase que macOS — UIButton ahora rutea por `setTitleColor:forState:UIControlStateNormal`.
-   **Windows** (v0.5.347) — 4 de 5 stubs de styling cableados (`text.decoration` vía round-trip `LOGFONT`, `widget.opacity` vía `WS_EX_LAYERED` + `SetLayeredWindowAttributes`, borders vía `SetWindowSubclass` + `WM_PAINT`). Solo queda `widget.shadow` (necesita DirectComposition).

La matriz de styling en `docs/src/ui/styling-matrix.md` termina la ventana con **Web en 43/43 Wired**, **Windows en 42/43 Wired**, el resto en cobertura completa.

## 5\. La pasada de corrección del runtime — issue por issue

Un tema del periodo: cada miscompile que entró por el tracker terminó como un fix o como un error en tiempo de compilación. Lo destacado:

-   **[#212](https://github.com/PerryTS/perry/issues/212) (v0.5.323)** — los métodos de clase dentro de `fn` no podían capturar locales de la fn envolvente. Los repros multi-módulo coinciden ahora con Node byte por byte.
-   **[#214](https://github.com/PerryTS/perry/issues/214) (v0.5.321 + v0.5.330)** — unboxing de string-handle SSO-safe en 7 sitios con operandos string: `arr.join`, `arr.toString`, `obj[stringKey]` get/set/delete, `string.match(re)`, `process.env[dynKey]`, input de digest crypto. Antes del fix, cada uno o devolvía basura en silencio o hacía SIGSEGV con operandos de string inline.
-   **[#221](https://github.com/PerryTS/perry/issues/221) (v0.5.351)** — los arrays vacíos `const` a nivel de módulo perdían las escrituras `arr[i]=` desde dentro de funciones. Apareció cuando `discoverLevels()` de Bloom-Engine/jump rellenaba `LEVEL_FILES` a nivel de módulo vía index-assign y la pantalla de selección de nivel salía vacía.
-   **[#233](https://github.com/PerryTS/perry/issues/233) (v0.5.357)** — `Array.push` desde dentro de una función async se topaba con un cap silencioso de 16 elementos cuando el array entraba como parámetro. Las funciones async no se inlinean; la realocación devolvía un nuevo puntero que el llamador nunca veía. Fix: instalar un puntero de forwarding en la posición vieja en cada crecimiento, reutilizando el mecanismo `GC_FLAG_FORWARDED` existente del GC.
-   **[#235](https://github.com/PerryTS/perry/issues/235) (v0.5.358)** — el dispatch con default params de método pasaba basura cuando los llamadores omitían args al final. Dos partes contribuyentes: los declares de método cross-module hardcodeaban 6 doubles en lugar de `arity + 1`, y `lower_class_method` no llamaba a `build_default_param_stmts` en absoluto. Apareció en `findOne(filter, options = {})` de mongodb colgando en silencio; el fix es uniforme entre dispatch local y cross-module.
-   **[#236](https://github.com/PerryTS/perry/issues/236) (v0.5.355)** — tres bugs independientes de fetch + promise desde un solo repro: api.github.com daba 403 anónimo (User-Agent por defecto ahora establecido), `.then(console.log)` colgaba para siempre (los callbacks null no empujaban entradas a la TASK\_QUEUE), cada rechazo de fetch imprimía `Uncaught exception: [object Object]` (`*StringHeader` NaN-boxeado pelado en lugar de un `ErrorHeader` real).
-   **[#234](https://github.com/PerryTS/perry/issues/234) (v0.5.359)** — `Blob` real con métodos de instancia `arrayBuffer` / `text` / `bytes` / `slice`. Antes del fix, `await response.blob()` devolvía un stub solo de metadatos `{size, type}`. Fix de tres partes que aterrizó en runtime + HIR + codegen.

Más los retrasos pequeños:

-   **[#181](https://github.com/PerryTS/perry/issues/181)** — strip-dedup poda excesiva de monomorfizaciones genéricas en Linux + silent-fallback de link de GTK4. Fix: reemplazar el filtrado por patrón de nombre con comparación de **conjunto de símbolos** vía `llvm-nm`. Los miembros con incluso un solo símbolo único se quedan. `libperry_ui_macos.a` recortado de 196 → 35 objetos sin errores de link.
-   **[#220](https://github.com/PerryTS/perry/issues/220)** — `secur32.lib` añadido a la línea de link de Windows.
-   **[#198](https://github.com/PerryTS/perry/issues/198)** — i18n `FormatNumber` round-trip de FP vía Ryū.
-   **[#188](https://github.com/PerryTS/perry/issues/188)** — codegen dispatch cableado para los wrappers de formato de `perry/i18n`.
-   **[#189](https://github.com/PerryTS/perry/issues/189) / [#203](https://github.com/PerryTS/perry/issues/203)** — codegen dispatch de `perry/plugin`.
-   **[#190](https://github.com/PerryTS/perry/issues/190)** — widget Canvas a través del codegen LLVM.
-   **[#191](https://github.com/PerryTS/perry/issues/191)** — CameraView a través del codegen.
-   **[#192](https://github.com/PerryTS/perry/issues/192)** — widget Table a través del codegen.
-   **[#193](https://github.com/PerryTS/perry/issues/193)** (parcial) — 11 ramas de dispatch de helpers de stdlib.
-   **[#98](https://github.com/PerryTS/perry/issues/98)** — recepción en background de notificaciones en iOS + Android (warm-path).
-   **[#106](https://github.com/PerryTS/perry/issues/106)** — fallbacks débiles para hooks de FFI de game-loop en watchOS.
-   **[#154](https://github.com/PerryTS/perry/issues/154)** — hooks de dispose de `using` / `await using`.
-   **[#167](https://github.com/PerryTS/perry/issues/167)** — alloca de args de `js_native_call_method` elevada al bloque de entrada.
-   **[#169](https://github.com/PerryTS/perry/issues/169)** — ramas de Uint8Array de `substitute_locals`.
-   **[#226](https://github.com/PerryTS/perry/issues/226)** — `fs.appendFileSync` cableado de extremo a extremo (PR de la comunidad).

## 6. Windows + Primicia

La historia de la toolchain de Windows sigue simplificándose. **v0.5.353** ancló `clang -target` en builds de host — clang no-MSVC en el PATH (MinGW / MSYS2 / Anaconda / bundles GNU de Rust) reescribía silenciosamente la IR `x86_64-pc-windows-msvc` de Perry a `windows-gnu`, y lld-link no podía resolver la referencia `__main` que el emisor mingw32 de LLVM insertaba. El nuevo `probe_clang_default_triple` ejecuta `clang --version` una vez por proceso e imprime una sola nota informativa cuando el default del host es GNU pero estamos targeteando MSVC. Suprimir con `PERRY_NO_CLANG_PROBE=1`.

**v0.5.345** alineó la ABI de `perry-ui` en Win64 con `perry-dispatch` — tres firmas extern de runtime habían divergido (`perry_ui_navstack_create`, `perry_ui_menu_add_item_with_shortcut`, `perry_ui_app_set_timer`). En la ABI de Win64, los args posicionales de entero y float comparten índices de slot, así que un mismatch lee basura de registros no inicializados. SysV (macOS / Linux) usa pools separados de registros int/float y por casualidad caían bits válidos — crash solo en Windows, arreglado en las 8 crates de plataforma perry-ui-\*.

Luego: **`scoop install perry-ts/perry`**. Manifest fijado a v0.5.345 (con `depends: main/llvm` para auto-tirar el LLVM oficial con default MSVC). El workflow de release ahora emite sidecars `<artifact>.sha256` al lado de cada archivo, en formato compatible con `sha256sum` para cualquier bumper de package manager downstream.

```
# Host Windows
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\main.ts --target windows -o myapp.exe
```

## 7\. Cierre

El patrón de este tramo es engagement de la comunidad más higiene interna. **TheHypnoo** entregó tres PRs significativos ([#224](https://github.com/PerryTS/perry/pull/224) perry/updater, [#231](https://github.com/PerryTS/perry/pull/231) cableado de `fs.appendFileSync`, [#232](https://github.com/PerryTS/perry/pull/232) bytes de body en `response.arrayBuffer`). El tracker se vació de unas 30 issues. El compilador se quedó 60 % más pequeño en su archivo más grande y le creció un walker exhaustivo que convierte “olvidé actualizar uno de los cuatro walkers ad-hoc” de un miscompile en runtime a un error de `cargo build`. El UI styling alcanzó paridad en cada plataforma de escritorio salvo sombras en Windows. Geisterhand creció una superficie devtools en navegador. La ruta de instalación de Windows se acortó un comando.

Pruébalo:

```
# npm (cualquier plataforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Auto-actualización para apps de escritorio
npm install @perry/updater

# Inspector en vivo
perry compile main.ts -o app --enable-geisterhand
./app &  # luego abre http://localhost:7676
```

Fuente: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Problemas: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues) — Registro de cambios: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
