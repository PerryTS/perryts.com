---
title: "Auto-update, un inspector live et le compilateur qui s'est réduit de moitié"
excerpt: "Perry v0.5.306 → v0.5.359 en quatre jours — 53 patch releases, ~30 issues fermées, et trois grosses choses ont atterri : perry/updater pour l'auto-update desktop, un inspector live à localhost:7676 et un refactor du compilateur qui a réduit les quatre plus gros fichiers de 33 à 91 %."
date: 2026-04-28
tags: ["updater", "devtools", "refactor", "community", "milestone"]
---
Le précédent billet s'est arrêté à **v0.5.306** sur l'histoire gen-GC + JSON + benchmarks. Quatre jours plus tard, Perry est en **v0.5.359** — soit **53 patch releases** — et l'histoire est encore différente. Aucune de ces releases n'est un titre à coups de chiffres de benchmark. Presque toutes sont des **issues du tracker qui se ferment**.

-   **`perry/updater`** arrive — auto-update façon Sparkle/Tauri pour les apps desktop (Ed25519 sur un digest SHA-256, sentinel-rollback, relancement détaché). PR communautaire de **TheHypnoo** ([#224](https://github.com/PerryTS/perry/pull/224)).
-   **Geisterhand Phase D** — un inspector live à `http://localhost:7676` avec arbre des widgets, détail par widget, dispatch de clic et édition de style en direct via `POST /style/:h`.
-   **Le refactor du compilateur.** Sur v0.5.329 → v0.5.343, les quatre fichiers les plus cités ont été découpés : `lower::lower_expr` 6 687 → 624 LOC (−91 %), `compile.rs` 9 391 → 3 783 LOC (−60 %), `lower.rs` 13 591 → 7 554 LOC (−44 %), `lower_call.rs` 7 000+ → 4 681 LOC (−33 %). Le nouveau `walker.rs` transforme la classe de bug du catch-all `_ =>` en erreur de compilation.
-   **Le styling UI Phase C boucle** — props inline `style: { ... }` sur chaque widget, sur Apple, Android, GTK4, Windows et Web. Windows obtient 4 stubs sur 5 câblés (decoration / opacity / borders) ; il ne reste que `widget.shadow` (suite à venir avec DirectComposition).
-   **Un bucket Scoop** pour Windows : `scoop install perry-ts/perry`. Sidecars SHA-256 dans le workflow de release.
-   **Vague de fixes d'issues communautaires** — environ 30 issues fermées sur runtime, codegen, fetch, GTK4, linker Windows, async et stdlib.

## 1\. perry/updater — auto-update pour apps desktop

Avant ce fix, Perry n'avait aucune voie de mise à jour. Les apps étaient publiées, et puis voilà. **TheHypnoo** a ouvert [#224](https://github.com/PerryTS/perry/pull/224) avec toute l'histoire :

```
import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // sentinel-rollback si le précédent lancement a crashé

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(`${pct}%`));
  await update.installAndRelaunch();
}

markHealthy(); // à appeler après que le nouveau build a démarré correctement
```

Modèle de confiance : **Ed25519 sur le digest SHA-256 du fichier** (pas sur les octets du fichier — la vérification reste bon marché sur les gros binaires). Le manifest est en JSON, versionné par schéma, une entrée par triplet `<os>-<arch>`. Installation atomique avec backup `<exe>.prev`, relancement détaché (`setsid` sur Unix, `DETACHED_PROCESS` sur Windows). Le mobile est exclu par design — App Store / Play Store contrôlent l'installation au niveau OS.

Deux particularités du runtime Perry sont apparues en écrivant le smoke test, et ont été fixées dans la foulée :

-   **`response.arrayBuffer()` renvoyait un stub de métadonnées seules.** Fixé dans [#232](https://github.com/PerryTS/perry/pull/232) (encore TheHypnoo) — `js_response_array_buffer` alloue désormais un vrai `BufferHeader` et `memcpy` `resp.body` dedans.
-   **`fs.appendFileSync` écrivait 0 octet.** Fixé dans [#226](https://github.com/PerryTS/perry/issues/226) — le chemin de lowering namespace-import (`import * as fs from "fs"`) n'avait pas de bras pour `appendFileSync`, et le codegen LLVM n'avait pas non plus de bras pour la variante HIR. Les deux désormais câblés.

La documentation vit dans `docs/src/updater/overview.md`.

## 2\. Geisterhand : inspector live à localhost:7676

Geisterhand a été le harnais de tests UI in-process de Perry — une API HTTP sur le port 7676 pour snapshotter l'état des widgets et dispatcher des clics. La Phase D le transforme en inspector style devtools que l'on peut ouvrir depuis n'importe quel navigateur.

-   **Étape 1 (v0.5.349)** — `GET /` sert une UI vanilla-JS mono-page avec arbre des widgets, détail par widget (frame, value, raw JSON), auto-refresh de 1,5 s avec pause/reprise, et un bouton « tirer onClick ». Le codegen épingle `INSPECTOR_HTML` contre le lazy-load `-dead_strip` de macOS pour qu'il survive aux release builds.
-   **Étape 2 (v0.5.350)** — `POST /style/:h` prend un sac de props JSON et l'applique en direct. 9 props (`backgroundColor`, `color`, `borderColor`, `borderWidth`, `borderRadius`, `opacity`, `padding`, `hidden`, `enabled`) traversent du thread HTTP → thread principal via la pump-queue existante. JSON invalide → 400 ; handle invalide → 400 ; les props inconnues sont filtrées côté serveur et la réponse liste celles qui sont passées.

```
perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \
  -H 'content-type: application/json' \
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}
```

Le dispatcher macOS est câblé ; Linux / Windows / iOS / tvOS / visionOS / Android suivent le même schéma et sont les prochains.

## 3\. Le refactor du compilateur — découper les quatre plus gros fichiers

Cinq issues du tracker ([#167](https://github.com/PerryTS/perry/issues/167), [#169](https://github.com/PerryTS/perry/issues/169), [#212](https://github.com/PerryTS/perry/issues/212), [#214](https://github.com/PerryTS/perry/issues/214), plus une longue queue) avaient la même forme : une nouvelle variante d'`Expr` ajoutée à `ir.rs`, mais l'un des quatre walkers ad-hoc dans `lower.rs` avait un catch-all `_ =>` et compilait silencieusement la nouvelle variante de travers. Attraper ça à l'exécution coûte cher — parfois invisible, parfois un SIGSEGV sous SSO.

**v0.5.329** a introduit `crates/perry-hir/src/walker.rs` avec `walk_expr_children` / `walk_expr_children_mut` — matches exhaustifs sur les 178 variantes d'`Expr`, **pas de catch-all**. Ajouter une nouvelle variante sans la lister ici devient une erreur de compilation. Les quatre consommateurs (`substitute_locals`, `find_max_local_id::check_expr`, `collect_local_refs_expr`, `remap_local_ids_in_expr`) ont fondu :

| Fonction | Avant | Après | Δ |
| --- | --- | --- | --- |
| `find_max_local_id::check_expr` | 225 | 57 | −75 % |
| `substitute_locals` | 553 | 80 | −86 % |
| `collect_local_refs_expr` | 720 | 70 | −90 % |
| `remap_local_ids_in_expr` | 542 | 85 | −84 % |

Total : **−1 830 lignes de descente dupliquée**, remplacées par **+1 840 lignes d'un walker centralisé** — net plat, mais la classe de bug disparaît.

Cela a débloqué le reste. **v0.5.331 → v0.5.343** ont taillé les quatre monolithes sur 14 commits. Les chiffres de couverture :

| Fichier | Avant | Après | Δ |
| --- | --- | --- | --- |
| `lower::lower_expr` | 6 687 | 624 | −91 % |
| `compile.rs` | 9 391 | 3 783 | −60 % |
| `lower.rs` | 13 591 | 7 554 | −44 % |
| `lower_call.rs` | 7 000+ | 4 681 | −33 % |

Le découpage a atterri sous forme de 19 nouveaux sous-modules ciblés : `compile/{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}.rs`, `lower/{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}.rs`, `lower_call/{ui_styling, builtin, native}.rs`, plus une nouvelle crate `crates/perry-dispatch` devenue la source unique de vérité pour les tables de méthodes UI / system / i18n (le fan-out `_ => "perry_ui_unknown"` qui causait les surprises « compile sur macOS, casse sur web » de l'issue [#191](https://github.com/PerryTS/perry/issues/191) est désormais un seul lookup).

**Les wins perf de Tier 4** ont accompagné (v0.5.335–v0.5.336) :

-   Fusion de deux passes dans `inline_functions` et de trois passes rayon dans `compile.rs` — économise 5 scans de module + 3 allers-retours du scheduler par compilation.
-   Borné le parse cache de `perry dev` à 500 entrées, eviction FIFO. Avant le fix, une session traversant `node_modules` pouvait retenir plus de 100 Mo d'AST SWC.
-   Parallélisation de la boucle d'écriture `.ll` post-codegen — wall-time 2–4× plus rapide sur SSD avec 50+ modules.
-   `Arc<I18nTable>` au lieu de cloner la table de locales par worker.

Les tests workspace sont restés à **434 passed / 0 failed / 5 ignored** à chaque commit ; gap tests à la baseline 25/28 ; doc-tests à la baseline 80/82.

## 4\. UI styling Phase C, terminée

La Phase C était le rollout de `style: { ... }` inline. Les étapes 1–7 ont fermé dans cette fenêtre :

-   **v0.5.305 → v0.5.306** — surface de type `StyleProps` + `style:` inline sur Button.
-   **v0.5.307 → v0.5.309** — destructure inline color/padding/shadow sur chaque widget de table, puis VStack / HStack.
-   **v0.5.310 → v0.5.311** — chaînes hex + dégradé + `parseColor` runtime pour les valeurs dynamiques.
-   **v0.5.312** — docs de styling + issue de tracking Windows.

Puis la passe cross-platform :

-   **GTK4** ([#202](https://github.com/PerryTS/perry/issues/202), [#206](https://github.com/PerryTS/perry/issues/206)) — 4 FFIs de styling câblés, plus 7 FFIs manquants qui bloquaient la porte des doc-tests Linux (v0.5.322).
-   **macOS** (v0.5.324) — plomberie d'ombre `CALayer` pour `widget.shadow` + infrastructure visual\_test ; sondage de classe `set_color` pour les widgets non-`NSTextField`.
-   **iOS / tvOS / visionOS** (v0.5.346) — Button `color: ...` tapait `setTextColor:` sur `UIButton`, qui n'implémente pas ce sélecteur ; le panic `objc2` traversait une frontière `extern "C"` et le processus s'abortait. Fixé via le même pattern de sondage de classe que macOS — UIButton route maintenant via `setTitleColor:forState:UIControlStateNormal`.
-   **Windows** (v0.5.347) — 4 stubs de styling sur 5 câblés (`text.decoration` via round-trip `LOGFONT`, `widget.opacity` via `WS_EX_LAYERED` + `SetLayeredWindowAttributes`, borders via `SetWindowSubclass` + `WM_PAINT`). Il ne reste que `widget.shadow` (nécessite DirectComposition).

La matrice de styling dans `docs/src/ui/styling-matrix.md` termine la fenêtre avec **Web à 43/43 Wired**, **Windows à 42/43 Wired**, le reste en couverture complète.

## 5\. La passe de correction du runtime — issue par issue

Un thème de la période : chaque miscompile entré par le tracker s'est terminé en fix ou en erreur de compilation. Les points saillants :

-   **[#212](https://github.com/PerryTS/perry/issues/212) (v0.5.323)** — les méthodes de classe à l'intérieur de `fn` ne pouvaient pas capturer les locals de la fn englobante. Les repros multi-modules correspondent maintenant à Node octet par octet.
-   **[#214](https://github.com/PerryTS/perry/issues/214) (v0.5.321 + v0.5.330)** — unboxing de string-handle SSO-safe sur 7 sites à opérande string : `arr.join`, `arr.toString`, `obj[stringKey]` get/set/delete, `string.match(re)`, `process.env[dynKey]`, input de digest crypto. Avant le fix, chacun rendait silencieusement du garbage ou faisait SIGSEGV sur des opérandes string inline.
-   **[#221](https://github.com/PerryTS/perry/issues/221) (v0.5.351)** — les arrays vides `const` au niveau module perdaient les écritures `arr[i]=` depuis l'intérieur des fonctions. Apparu quand `discoverLevels()` de Bloom-Engine/jump remplissait `LEVEL_FILES` au niveau module via index-assign et l'écran de sélection de niveau s'affichait vide.
-   **[#233](https://github.com/PerryTS/perry/issues/233) (v0.5.357)** — `Array.push` depuis l'intérieur d'une fonction async était silencieusement plafonné à 16 éléments quand l'array entrait en paramètre. Les fonctions async ne sont pas inlinées ; la réallocation rendait un nouveau pointeur que l'appelant ne voyait jamais. Fix : installer un pointeur de forwarding à l'ancienne position à chaque croissance, en réutilisant le mécanisme `GC_FLAG_FORWARDED` existant du GC.
-   **[#235](https://github.com/PerryTS/perry/issues/235) (v0.5.358)** — le dispatch des paramètres par défaut de méthode passait du garbage quand les appelants omettaient des args en queue. Deux contributeurs : les declares de méthode cross-module hardcodaient 6 doubles au lieu d'`arity + 1`, et `lower_class_method` n'appelait pas du tout `build_default_param_stmts`. Apparu dans `findOne(filter, options = {})` de mongodb se bloquant en silence ; le fix est uniforme entre dispatch local et cross-module.
-   **[#236](https://github.com/PerryTS/perry/issues/236) (v0.5.355)** — trois bugs indépendants fetch + promise depuis un seul repro : api.github.com renvoyait 403 en anonyme (User-Agent par défaut désormais positionné), `.then(console.log)` se bloquait pour toujours (les callbacks null ne poussaient pas d'entrées dans la TASK\_QUEUE), chaque rejet de fetch imprimait `Uncaught exception: [object Object]` (`*StringHeader` nu NaN-boxé au lieu d'un vrai `ErrorHeader`).
-   **[#234](https://github.com/PerryTS/perry/issues/234) (v0.5.359)** — vrai `Blob` avec méthodes d'instance `arrayBuffer` / `text` / `bytes` / `slice`. Avant le fix, `await response.blob()` rendait un stub de métadonnées seules `{size, type}`. Fix en trois parties atterrissant sur runtime + HIR + codegen.

Plus les petits rattrapages :

-   **[#181](https://github.com/PerryTS/perry/issues/181)** — strip-dedup sur-élaguait les monomorphisations génériques sous Linux + silent-fallback du link GTK4. Fix : remplacer le filtrage par pattern de nom par une comparaison d'**ensemble de symboles** via `llvm-nm`. Les membres avec ne serait-ce qu'un symbole unique sont conservés. `libperry_ui_macos.a` élagué de 196 → 35 objets sans erreurs de link.
-   **[#220](https://github.com/PerryTS/perry/issues/220)** — `secur32.lib` ajouté à la ligne de link Windows.
-   **[#198](https://github.com/PerryTS/perry/issues/198)** — i18n `FormatNumber` round-trip FP via Ryū.
-   **[#188](https://github.com/PerryTS/perry/issues/188)** — codegen dispatch câblé pour les wrappers de format `perry/i18n`.
-   **[#189](https://github.com/PerryTS/perry/issues/189) / [#203](https://github.com/PerryTS/perry/issues/203)** — codegen dispatch `perry/plugin`.
-   **[#190](https://github.com/PerryTS/perry/issues/190)** — widget Canvas via le codegen LLVM.
-   **[#191](https://github.com/PerryTS/perry/issues/191)** — CameraView via le codegen.
-   **[#192](https://github.com/PerryTS/perry/issues/192)** — widget Table via le codegen.
-   **[#193](https://github.com/PerryTS/perry/issues/193)** (partiel) — 11 bras de dispatch d'helpers stdlib.
-   **[#98](https://github.com/PerryTS/perry/issues/98)** — réception en arrière-plan des notifications sur iOS + Android (warm-path).
-   **[#106](https://github.com/PerryTS/perry/issues/106)** — fallbacks faibles pour les hooks FFI de game-loop watchOS.
-   **[#154](https://github.com/PerryTS/perry/issues/154)** — hooks de dispose `using` / `await using`.
-   **[#167](https://github.com/PerryTS/perry/issues/167)** — alloca des args de `js_native_call_method` remontée au bloc d'entrée.
-   **[#169](https://github.com/PerryTS/perry/issues/169)** — bras Uint8Array de `substitute_locals`.
-   **[#226](https://github.com/PerryTS/perry/issues/226)** — `fs.appendFileSync` câblé de bout en bout (PR communautaire).

## 6. Windows + Scoop

L'histoire de la toolchain Windows continue de se simplifier. **v0.5.353** a épinglé `clang -target` sur les builds host — clang non-MSVC dans le PATH (MinGW / MSYS2 / Anaconda / bundles GNU de Rust) réécrivait silencieusement l'IR `x86_64-pc-windows-msvc` de Perry vers `windows-gnu`, et lld-link ne pouvait pas résoudre la référence `__main` que l'émetteur mingw32 de LLVM insérait. Le nouveau `probe_clang_default_triple` exécute `clang --version` une fois par processus et imprime une seule note informative quand le default du host est GNU mais qu'on cible MSVC. Supprimer avec `PERRY_NO_CLANG_PROBE=1`.

**v0.5.345** a aligné l'ABI `perry-ui` Win64 avec `perry-dispatch` — trois signatures extern runtime avaient dérivé (`perry_ui_navstack_create`, `perry_ui_menu_add_item_with_shortcut`, `perry_ui_app_set_timer`). Sur ABI Win64, les args positionnels entiers et flottants partagent les indices de slot, donc un mismatch lit du garbage depuis des registres non-initialisés. SysV (macOS / Linux) utilise des pools de registres int/float séparés et faisait par hasard atterrir des bits valides — crash uniquement Windows, fixé sur les 8 crates de plateforme perry-ui-\*.

Puis : **`scoop install perry-ts/perry`**. Manifest épinglé à v0.5.345 (avec `depends: main/llvm` pour tirer automatiquement le LLVM officiel default-MSVC). Le workflow de release émet désormais des sidecars `<artifact>.sha256` à côté de chaque archive, au format compatible `sha256sum` pour tout bumper de package manager downstream.

```
# Host Windows
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\main.ts --target windows -o myapp.exe
```

## 7\. Pour conclure

Le motif de cette période est l'engagement communautaire plus l'hygiène interne. **TheHypnoo** a livré trois PRs significatifs ([#224](https://github.com/PerryTS/perry/pull/224) perry/updater, [#231](https://github.com/PerryTS/perry/pull/231) câblage de `fs.appendFileSync`, [#232](https://github.com/PerryTS/perry/pull/232) octets de body de `response.arrayBuffer`). Le tracker s'est vidé d'environ 30 issues. Le compilateur a perdu 60 % sur son plus gros fichier et a poussé un walker exhaustif qui transforme « j'ai oublié de mettre à jour l'un des quatre walkers ad-hoc » d'un miscompile runtime en erreur `cargo build`. Le styling UI a atteint la parité sur chaque plateforme desktop sauf les ombres sous Windows. Geisterhand a obtenu une surface devtools navigateur. Le chemin d'installation Windows s'est raccourci d'une commande.

Essayez :

```
# npm (toute plateforme)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Auto-update pour apps desktop
npm install @perry/updater

# Inspector live
perry compile main.ts -o app --enable-geisterhand
./app &  # puis ouvrez http://localhost:7676
```

Source : [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues : [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues) — Changelog : [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
