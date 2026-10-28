---
title: "Auto-Update, um Inspector ao Vivo e o Compilador que se Cortou pela Metade"
excerpt: "Perry v0.5.306 → v0.5.359 em quatro dias — 53 patch releases, ~30 issues fechadas e três coisas grandes aterrissaram: perry/updater para auto-update desktop, um inspector ao vivo em localhost:7676 e um refactor do compilador que encolheu os quatro maiores arquivos em 33–91%."
date: 2026-04-28
tags: ["updater", "devtools", "refactor", "community", "milestone"]
---
O último post fechou em **v0.5.306** com a história gen-GC + JSON + benchmarks. Quatro dias depois, Perry está em **v0.5.359** — são **53 patch releases** — e a história é outra de novo. Nenhuma dessas releases é uma manchete de números de benchmark. Quase todas são **issues do tracker sendo fechadas**.

-   **`perry/updater`** chega — auto-update no estilo Sparkle/Tauri para apps desktop (Ed25519 sobre um digest SHA-256, sentinel-rollback, relançamento desacoplado). PR da comunidade por **TheHypnoo** ([#224](https://github.com/PerryTS/perry/pull/224)).
-   **Geisterhand Fase D** — um inspector ao vivo em `http://localhost:7676` com árvore de widgets, detalhe por widget, dispatch de cliques e edição de estilo ao vivo via `POST /style/:h`.
-   **O refactor do compilador.** Entre v0.5.329 → v0.5.343 os quatro arquivos mais citados foram fatiados: `lower::lower_expr` 6.687 → 624 LOC (−91%), `compile.rs` 9.391 → 3.783 LOC (−60%), `lower.rs` 13.591 → 7.554 LOC (−44%), `lower_call.rs` 7.000+ → 4.681 LOC (−33%). O novo `walker.rs` transforma a classe de bug do catch-all `_ =>` em erro de compilação.
-   **O styling UI Fase C fecha** — props inline `style: { ... }` em todo widget no Apple, Android, GTK4, Windows e Web. Windows ganha 4 de 5 stubs ligados (decoration / opacity / borders); só falta `widget.shadow` (follow-up com DirectComposition).
-   **Um bucket Scoop** para Windows: `scoop install perry-ts/perry`. Sidecars SHA-256 no workflow de release.
-   **Onda de fixes de issues da comunidade** — cerca de 30 issues fechadas em runtime, codegen, fetch, GTK4, linker do Windows, async e stdlib.

## 1\. perry/updater — auto-update para apps desktop

Antes do fix, Perry não tinha caminho de update. Apps eram lançadas, e pronto. **TheHypnoo** abriu [#224](https://github.com/PerryTS/perry/pull/224) com a história completa:

```
import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // sentinel-rollback se o lançamento anterior crashou

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(`${pct}%`));
  await update.installAndRelaunch();
}

markHealthy(); // chamar depois de a nova build subir corretamente
```

Modelo de confiança: **Ed25519 sobre o digest SHA-256 do arquivo** (não sobre os bytes do arquivo — mantém a verificação barata em binários grandes). O manifest é JSON, versionado por esquema, uma entrada por tripla `<os>-<arch>`. Instalação atômica com backup `<exe>.prev`, relançamento desacoplado (`setsid` em Unix, `DETACHED_PROCESS` no Windows). Mobile fica de fora por design — App Store / Play Store controlam o pipeline de instalação no nível do SO.

Duas peculiaridades do runtime de Perry apareceram ao escrever o smoke test, e foram corrigidas no caminho:

-   **`response.arrayBuffer()` retornava um stub só com metadata.** Corrigido em [#232](https://github.com/PerryTS/perry/pull/232) (também TheHypnoo) — `js_response_array_buffer` agora aloca um `BufferHeader` real e faz `memcpy` de `resp.body` dentro.
-   **`fs.appendFileSync` escrevia 0 bytes.** Corrigido em [#226](https://github.com/PerryTS/perry/issues/226) — o caminho de lowering do namespace-import (`import * as fs from "fs"`) não tinha braço para `appendFileSync`, e o codegen LLVM também não tinha braço para a variante HIR. Ambos ligados.

A documentação vive em `docs/src/updater/overview.md`.

## 2\. Geisterhand: inspector ao vivo em localhost:7676

Geisterhand era o harness de testes de UI in-process do Perry — uma API HTTP na porta 7676 para snapshotear estado de widget e dispatchar cliques. A Fase D o transforma em um inspector estilo devtools que dá para abrir em qualquer navegador.

-   **Passo 1 (v0.5.349)** — `GET /` serve uma UI vanilla-JS de página única com árvore de widgets, detalhe por widget (frame, value, raw JSON), auto-refresh de 1,5 s com pause/resume, e um botão «disparar onClick». O codegen prende `INSPECTOR_HTML` contra o lazy-load `-dead_strip` do macOS para sobreviver às release builds.
-   **Passo 2 (v0.5.350)** — `POST /style/:h` recebe um saco de props JSON e aplica ao vivo. 9 props (`backgroundColor`, `color`, `borderColor`, `borderWidth`, `borderRadius`, `opacity`, `padding`, `hidden`, `enabled`) fluem da thread HTTP → thread principal via a pump-queue existente. JSON ruim → 400; handle ruim → 400; props desconhecidas são filtradas no servidor e a response lista quais passaram.

```
perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \
  -H 'content-type: application/json' \
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}
```

O dispatcher do macOS está ligado; Linux / Windows / iOS / tvOS / visionOS / Android seguem o mesmo formato e são os próximos.

## 3\. O refactor do compilador — fatiando os quatro maiores arquivos

Cinco issues no tracker ([#167](https://github.com/PerryTS/perry/issues/167), [#169](https://github.com/PerryTS/perry/issues/169), [#212](https://github.com/PerryTS/perry/issues/212), [#214](https://github.com/PerryTS/perry/issues/214), mais uma cauda longa) tinham a mesma forma: uma nova variante de `Expr` adicionada a `ir.rs`, mas um dos quatro walkers ad-hoc em `lower.rs` tinha um catch-all `_ =>` e mis-compilava silenciosamente a nova variante. Pegar isso em runtime é caro — às vezes invisível, às vezes um SIGSEGV sob SSO.

**v0.5.329** introduziu `crates/perry-hir/src/walker.rs` com `walk_expr_children` / `walk_expr_children_mut` — matches exaustivos sobre todas as 178 variantes de `Expr`, **sem catch-all**. Adicionar uma nova variante sem listá-la aqui é agora um erro de compilação. Os quatro consumidores (`substitute_locals`, `find_max_local_id::check_expr`, `collect_local_refs_expr`, `remap_local_ids_in_expr`) colapsaram:

| Função | Antes | Depois | Δ |
| --- | --- | --- | --- |
| `find_max_local_id::check_expr` | 225 | 57 | −75% |
| `substitute_locals` | 553 | 80 | −86% |
| `collect_local_refs_expr` | 720 | 70 | −90% |
| `remap_local_ids_in_expr` | 542 | 85 | −84% |

Total: **−1.830 linhas de descent duplicado**, substituídas por **+1.840 linhas de um walker centralizado** — saldo zero, mas a classe de bug se foi.

Isso destravou o resto. **v0.5.331 → v0.5.343** partiram os quatro monólitos em 14 commits. Os números de capa:

| Arquivo | Antes | Depois | Δ |
| --- | --- | --- | --- |
| `lower::lower_expr` | 6.687 | 624 | −91% |
| `compile.rs` | 9.391 | 3.783 | −60% |
| `lower.rs` | 13.591 | 7.554 | −44% |
| `lower_call.rs` | 7.000+ | 4.681 | −33% |

O split aterrissou como 19 novos sub-módulos focados: `compile/{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}.rs`, `lower/{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}.rs`, `lower_call/{ui_styling, builtin, native}.rs`, mais um novo crate `crates/perry-dispatch` que virou a única fonte de verdade para tabelas de método UI / system / i18n (o fan-out `_ => "perry_ui_unknown"` que levava às surpresas «compila no macOS, quebra na web» do issue [#191](https://github.com/PerryTS/perry/issues/191) agora é um único lookup).

**Ganhos de perf de Tier 4** vieram juntos (v0.5.335–v0.5.336):

-   Fundidos dois passes em `inline_functions` e três passes rayon em `compile.rs` — economiza 5 scans de módulo + 3 round-trips do scheduler por compilação.
-   Limitado o parse cache do `perry dev` a 500 entradas, eviction FIFO. Antes do fix, uma sessão andando por `node_modules` podia segurar mais de 100 MB de AST do SWC.
-   Paralelizado o loop de escrita `.ll` pós-codegen — wall-time 2–4× mais rápido em SSDs com 50+ módulos.
-   `Arc<I18nTable>` em vez de clonar a tabela de locales por worker.

Os testes do workspace ficaram em **434 passed / 0 failed / 5 ignored** em todo commit; gap tests na baseline 25/28; doc-tests na baseline 80/82.

## 4\. UI styling Fase C, encerrada

A Fase C era o rollout de `style: { ... }` inline. Os passos 1–7 fecharam nesta janela:

-   **v0.5.305 → v0.5.306** — superfície de tipo `StyleProps` + `style:` inline em Button.
-   **v0.5.307 → v0.5.309** — destructure inline color/padding/shadow em todo widget de tabela, depois VStack / HStack.
-   **v0.5.310 → v0.5.311** — strings hex + gradient + `parseColor` em runtime para valores dinâmicos.
-   **v0.5.312** — docs de styling + issue de tracking do Windows.

Depois a varredura cross-platform:

-   **GTK4** ([#202](https://github.com/PerryTS/perry/issues/202), [#206](https://github.com/PerryTS/perry/issues/206)) — 4 FFIs de styling ligados, mais 7 FFIs faltantes que travavam o gate dos doc-tests do Linux (v0.5.322).
-   **macOS** (v0.5.324) — encanamento de sombra `CALayer` para `widget.shadow` + infraestrutura de visual\_test; class-probe de `set_color` para widgets que não são `NSTextField`.
-   **iOS / tvOS / visionOS** (v0.5.346) — Button com `color: ...` batia em `setTextColor:` em `UIButton`, que não implementa esse seletor; o panic do `objc2` cruzava uma fronteira `extern "C"` e o processo abortava. Corrigido com o mesmo padrão de class-probe do macOS — UIButton agora vai por `setTitleColor:forState:UIControlStateNormal`.
-   **Windows** (v0.5.347) — 4 de 5 stubs de styling ligados (`text.decoration` via round-trip `LOGFONT`, `widget.opacity` via `WS_EX_LAYERED` + `SetLayeredWindowAttributes`, borders via `SetWindowSubclass` + `WM_PAINT`). Só falta `widget.shadow` (precisa de DirectComposition).

A matriz de styling em `docs/src/ui/styling-matrix.md` termina a janela com **Web em 43/43 Wired**, **Windows em 42/43 Wired**, o resto em cobertura completa.

## 5\. A passada de correção do runtime — issue por issue

Um tema do período: cada miscompile que entrou pelo tracker virou ou um fix ou um erro de compilação. Destaques:

-   **[#212](https://github.com/PerryTS/perry/issues/212) (v0.5.323)** — métodos de classe dentro de `fn` não conseguiam capturar locais da fn que envolvia. Repros multi-módulo agora batem com Node byte por byte.
-   **[#214](https://github.com/PerryTS/perry/issues/214) (v0.5.321 + v0.5.330)** — unboxing de string-handle SSO-safe em 7 sites com operandos string: `arr.join`, `arr.toString`, `obj[stringKey]` get/set/delete, `string.match(re)`, `process.env[dynKey]`, input de digest crypto. Antes do fix, cada um ou retornava lixo silenciosamente ou dava SIGSEGV em operandos string inline.
-   **[#221](https://github.com/PerryTS/perry/issues/221) (v0.5.351)** — arrays vazios `const` em nível de módulo perdiam as escritas `arr[i]=` de dentro de funções. Apareceu quando `discoverLevels()` de Bloom-Engine/jump populava `LEVEL_FILES` em nível de módulo via index-assign e a tela de seleção de fase saía vazia.
-   **[#233](https://github.com/PerryTS/perry/issues/233) (v0.5.357)** — `Array.push` de dentro de função async era silenciosamente limitado a 16 elementos quando o array entrava como parâmetro. Funções async não são inlined; a realocação retornava um novo ponteiro que o chamador nunca via. Fix: instalar um ponteiro de forwarding na posição antiga a cada crescimento, reusando o mecanismo `GC_FLAG_FORWARDED` existente do GC.
-   **[#235](https://github.com/PerryTS/perry/issues/235) (v0.5.358)** — o dispatch de parâmetros default de método passava lixo quando os chamadores omitiam args do final. Duas partes contribuintes: declares de método cross-module hardcodavam 6 doubles em vez de `arity + 1`, e `lower_class_method` não chamava `build_default_param_stmts`. Apareceu em `findOne(filter, options = {})` de mongodb travando em silêncio; o fix é uniforme entre dispatch local e cross-module.
-   **[#236](https://github.com/PerryTS/perry/issues/236) (v0.5.355)** — três bugs independentes de fetch + promise vindos de um único repro: api.github.com retornava 403 anônimo (User-Agent default agora setado), `.then(console.log)` travava para sempre (callbacks null não empurravam entradas para a TASK\_QUEUE), todo rejeito de fetch imprimia `Uncaught exception: [object Object]` (`*StringHeader` nu NaN-boxado em vez de um `ErrorHeader` real).
-   **[#234](https://github.com/PerryTS/perry/issues/234) (v0.5.359)** — `Blob` real com métodos de instância `arrayBuffer` / `text` / `bytes` / `slice`. Antes do fix, `await response.blob()` retornava um stub só com metadata `{size, type}`. Fix em três partes aterrissou em runtime + HIR + codegen.

Mais os pequenos atrasos:

-   **[#181](https://github.com/PerryTS/perry/issues/181)** — strip-dedup podava em excesso monomorfizações genéricas no Linux + silent-fallback do link do GTK4. Fix: substituir filtragem por padrão de nome por comparação de **conjunto de símbolos** via `llvm-nm`. Membros com mesmo um único símbolo único são mantidos. `libperry_ui_macos.a` reduzido de 196 → 35 objetos sem erros de link.
-   **[#220](https://github.com/PerryTS/perry/issues/220)** — `secur32.lib` adicionado à linha de link do Windows.
-   **[#198](https://github.com/PerryTS/perry/issues/198)** — i18n `FormatNumber` round-trip de FP via Ryū.
-   **[#188](https://github.com/PerryTS/perry/issues/188)** — codegen dispatch ligado para os wrappers de format de `perry/i18n`.
-   **[#189](https://github.com/PerryTS/perry/issues/189) / [#203](https://github.com/PerryTS/perry/issues/203)** — codegen dispatch de `perry/plugin`.
-   **[#190](https://github.com/PerryTS/perry/issues/190)** — widget Canvas pelo codegen LLVM.
-   **[#191](https://github.com/PerryTS/perry/issues/191)** — CameraView pelo codegen.
-   **[#192](https://github.com/PerryTS/perry/issues/192)** — widget Table pelo codegen.
-   **[#193](https://github.com/PerryTS/perry/issues/193)** (parcial) — 11 braços de dispatch de helpers da stdlib.
-   **[#98](https://github.com/PerryTS/perry/issues/98)** — recebimento em background de notificações no iOS + Android (warm-path).
-   **[#106](https://github.com/PerryTS/perry/issues/106)** — fallbacks fracos para hooks de FFI de game-loop no watchOS.
-   **[#154](https://github.com/PerryTS/perry/issues/154)** — hooks de dispose de `using` / `await using`.
-   **[#167](https://github.com/PerryTS/perry/issues/167)** — alloca de args de `js_native_call_method` içada para o bloco de entry.
-   **[#169](https://github.com/PerryTS/perry/issues/169)** — braços Uint8Array de `substitute_locals`.
-   **[#226](https://github.com/PerryTS/perry/issues/226)** — `fs.appendFileSync` ligado de ponta a ponta (PR da comunidade).

## 6. Windows + Scoop

A história da toolchain do Windows continua a se simplificar. **v0.5.353** prendeu `clang -target` em builds de host — clang não-MSVC no PATH (MinGW / MSYS2 / Anaconda / bundles GNU do Rust) reescrevia silenciosamente a IR `x86_64-pc-windows-msvc` de Perry para `windows-gnu`, e lld-link não conseguia resolver a referência `__main` que o emissor mingw32 do LLVM inseria. O novo `probe_clang_default_triple` roda `clang --version` uma vez por processo e imprime uma única nota informativa quando o default do host é GNU mas estamos targetando MSVC. Suprimir com `PERRY_NO_CLANG_PROBE=1`.

**v0.5.345** alinhou a ABI `perry-ui` Win64 com `perry-dispatch` — três assinaturas extern de runtime tinham deslizado (`perry_ui_navstack_create`, `perry_ui_menu_add_item_with_shortcut`, `perry_ui_app_set_timer`). Na ABI Win64, args posicionais inteiros e float compartilham os índices de slot, então um mismatch lê lixo de registradores não inicializados. SysV (macOS / Linux) usa pools de registradores int/float separados e por sorte caía bits válidos — crash apenas no Windows, corrigido em todas as 8 crates de plataforma perry-ui-\*.

Depois: **`scoop install perry-ts/perry`**. Manifest fixado em v0.5.345 (com `depends: main/llvm` para puxar automaticamente o LLVM oficial default-MSVC). O workflow de release agora emite sidecars `<artifact>.sha256` ao lado de cada arquivo, em formato compatível com `sha256sum` para qualquer bumper de package manager downstream.

```
# Host Windows
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\main.ts --target windows -o myapp.exe
```

## 7\. Encerrando

O padrão deste trecho é engajamento da comunidade mais higiene interna. **TheHypnoo** entregou três PRs significativos ([#224](https://github.com/PerryTS/perry/pull/224) perry/updater, [#231](https://github.com/PerryTS/perry/pull/231) ligação de `fs.appendFileSync`, [#232](https://github.com/PerryTS/perry/pull/232) bytes do body em `response.arrayBuffer`). O tracker esvaziou cerca de 30 issues. O compilador ficou 60% menor no maior arquivo e ganhou um walker exaustivo que transforma «esqueci de atualizar um dos quatro walkers ad-hoc» de um miscompile em runtime para um erro `cargo build`. O styling UI alcançou paridade em toda plataforma desktop exceto sombras no Windows. Geisterhand ganhou uma superfície devtools em navegador. O caminho de instalação no Windows ficou um comando mais curto.

Experimente:

```
# npm (qualquer plataforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Auto-update para apps desktop
npm install @perry/updater

# Inspector ao vivo
perry compile main.ts -o app --enable-geisterhand
./app &  # então abra http://localhost:7676
```

Fonte: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Problemas: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues) — Registro de alterações: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
