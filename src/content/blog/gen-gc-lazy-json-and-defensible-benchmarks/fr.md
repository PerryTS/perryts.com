---
title: "GC générationnel, JSON paresseux et benchmarks qui résistent à l'examen"
excerpt: "Perry v0.5.174 → v0.5.306 en trois jours, plus le travail GC et JSON livré en parallèle. Le GC générationnel devient le défaut. La Small String Optimization devient le défaut. La pipeline JSON gagne une tape paresseuse qui atterrit à 75 ms de médiane sur validate-and-roundtrip — meilleure du peloton à typage dynamique. La page benchmarks est réécrite avec médiane RUNS=11 + p95 + σ, simdjson et AssemblyScript+json-as ajoutés comme pairs, et chaque faiblesse de Perry exposée honnêtement."
date: 2026-04-26
tags: ["GC", "JSON", "performance", "benchmarks", "milestone"]
---
Le dernier billet s'est terminé en **v0.5.174** avec un seul gros titre : Perry remportait enfin chaque benchmark de la suite intégrée face à Node comme à Bun. Trois jours de travail et un arriéré de commits GC + JSON plus tard, Perry est en **v0.5.306** — soit **132 releases de correctifs** — et l'histoire est différente. Le gros titre n'est pas une accélération de 547x ni une nouvelle colonne de victoires. C'est le travail qui rend ces victoires défendables.

-   Le **GC générationnel** est livré par défaut. Les phases A à D ont atterri entre v0.5.217 et v0.5.237.
-   La **Small String Optimization** est livrée par défaut. Les étapes 1.5 → 2 ont atterri en v0.5.213–v0.5.216.
-   Le **pipeline JSON** a reçu un parser à base de tape, un parse paresseux, un stringify paresseux, et une matérialisation creuse par élément. Le validate-and-roundtrip par défaut est désormais à **75 ms en médiane** — le meilleur du peloton à typage dynamique.
-   La **page benchmarks** est réécrite de bout en bout avec **RUNS=11 médiane + p95 + σ + min + max**, simdjson et AssemblyScript+json-as ajoutés en pairs, sondes d'optimisation séparées des comparaisons réelles, et chaque faiblesse de Perry exposée honnêtement.

Le casting secondaire est un flux régulier de corrections de justesse : FIFO des microtâches Promise, égalité NaN et formatage des nombres ECMAScript, complément à deux pour BigInt, AsyncLocalStorage de bout en bout, runtimes decimal.js + ioredis + commander, et un segfault de JSON.stringify sur f64 brut qui se cachait sous les chemins tape. Et la toolchain Windows passe enfin en mode léger : LLVM + xwin, plus besoin d'installer Visual Studio.

## 1\. GC générationnel, activé par défaut

Le GC générationnel a fait l'objet d'un déploiement par étapes pendant deux mois. Le résumé des phases qui se sont conclues dans cette fenêtre :

-   **v0.5.217–v0.5.221** — Phase A : échafaudage runtime de la shadow stack, émission push/pop, threading de la slot map, miroir shadow de `Let`/`LocalSet`, et le scanner de racines.
-   **v0.5.222** — Phase B : séparation arène nursery + old-gen.
-   **v0.5.223–v0.5.225** — Phase C1–C2 : infrastructure runtime de write-barrier, le codegen émet la barrière, chaque store sur le tas y passe.
-   **v0.5.226–v0.5.228** — Phase C3a–C4 : les racines du remembered-set entrent dans mark + clear ; le minor GC trace saute l'old-gen ; tenuring non-déplaçant.
-   **v0.5.229–v0.5.236** — Phase C4b α/β/γ/δ : infrastructure de pointeurs de forwarding, passe de pinning + évacuation, scanner + pinning transitif, réécriture des références, blocs de nursery inactifs rendus à l'OS, déclencheur GC plafonné au seuil initial.
-   **v0.5.237** — Phase D partie 1 : `PERRY_GEN_GC=1` par défaut.
-   **v0.5.238** — Phase D partie 2 : `PERRY_SHADOW_STACK=1` par défaut.
-   **v0.5.239–v0.5.240** — clôture documentaire : roadmap finalisée, annexe sur la lignée académique + industrielle (Bartlett 1988, Ungar 1984, Cheney 1970).

La victoire mesurée la plus marquante : `test_memory_json_churn` est passé de **115 Mo → 91 Mo** de RSS de pointe au moment où le défaut gen-GC a basculé. Les régressions compute étaient petites et listées sans excuse — `nested_loops` 8 → 18 ms, `accumulate` 24 → 34 ms, `object_create` 0 → 1 ms, `array_read` / `array_write` +1 ms chacun. La sortie de secours (`PERRY_GEN_GC=0`) récupère les anciens chiffres ; le compromis était délibéré, et la page benchmarks liste maintenant les deux lignes côte à côte pour que le lecteur puisse choisir.

## 2\. Small String Optimization, activée par défaut

SSO est une représentation de chaîne inline de 22 octets qui évite l'allocation sur le tas pour les chaînes courtes — les clés JSON typiques (2–8 octets) et les valeurs courtes atterrissent dans la forme inline. Le déploiement était minuscule en surface et énorme sous le capot :

-   **v0.5.213** : infrastructure SSO (représentation + accesseurs).
-   **v0.5.214** : armement des consommateurs étape 1 + porte `PERRY_SSO_FORCE` pour les tests.
-   **v0.5.215** : codegen étape 1.5, branche à trois voies `PropertyGet` — fast path pour les chaînes inline, fast path pour les chaînes sur le tas, slow path pour le résiduel.
-   **v0.5.216** : bascule étape 2 — émettre SSO par défaut.

Les suites en v0.5.279 ont fermé le dernier bug NaN de lecture de propriété qui est apparu une fois SSO actif, et la correction du dispatch de getter chaîné cross-module en v0.5.272 en a fermé un autre. Les deux étaient sur la liste à régler avant la bascule du défaut ; les deux ont été livrés sans régression de perf.

## 3\. JSON : parse à base de tape, paresseux par défaut

Le pipeline JSON a reçu la réécriture la plus invasive de la période. Ancien comportement : `JSON.parse` construisait un arbre entièrement matérialisé de valeurs NaN-boxed. Nouveau comportement : `JSON.parse` construit une tape de 12 octets par valeur et matérialise paresseusement — seules les valeurs que vous lisez réellement paient le coût de matérialisation. Le stringify sur un parse non muté est maintenant un memcpy de l'entrée d'origine, le même tour de fast-path qu'utilise simdjson avec `raw_json()`.

-   **v0.5.200** : `JSON.parse<T>(blob)` parse dirigé par schéma (étape 1). La forme connue à la compilation permet au compilateur d'émettre un accès aux clés pré-résolu.
-   **v0.5.203** : fondation du parse à base de tape — étape 2 phase 1.
-   **v0.5.204** : parse paresseux + stringify paresseux — étape 2 phases 2+4.
-   **v0.5.206** : accès indexé safe en mode paresseux + cas limites — étape 2 phase 3.
-   **v0.5.208** : matérialisation creuse par élément — étape 2 phase 5b.
-   **v0.5.209** : curseur de parcours + seuil adaptatif de matérialisation.
-   **v0.5.210** : bascule du parse paresseux par défaut pour les blobs ≥1 Ko.

Le résultat sur la charge de travail pour laquelle la lazy tape a été conçue (10k enregistrements, blob ~1 Mo, parse → stringify sans itération intermédiaire) :

| Implementation | Médiane (ms) | p95 (ms) | σ | RSS de pointe |
| --- | --- | --- | --- | --- |
| c++ `-O3 -flto` (simdjson) | 24 | 28 | 1.2 | 8 MB |
| perry (gen-gc + lazy tape) | 75 | 91 | 6.9 | 85 MB |
| rust serde\_json (LTO) | 185 | 190 | 1.7 | 11 MB |
| bun | 259 | 342 | 26.1 | 82 MB |
| node | 394 | 602 | 60.1 | 127 MB |
| kotlin (kotlinx.serialization) | 473 | 533 | 21.4 | 606 MB |
| assemblyscript+json-as (wasmtime) | 598 | 621 | 10.5 | 58 MB |

Perry à **75 ms en médiane** est le runtime à typage dynamique le plus rapide de la comparaison — bat Bun (259 ms), bat Node (394 ms), bat le JIT serveur de Kotlin (453 ms). simdjson à 24 ms est le plafond C++ accéléré par SIMD et figure sur la page à dessein, pas planqué derrière un cherry-pick. Perry ne le bat pas. L'intérêt est de montrer l'écart pour que sa fermeture ait une cible — suivi dans `docs/json-typed-parse-plan.md`.

Le bench compagnon honnête est **parse-and-iterate** : même blob, mais chaque itération additionne le `nested.x` de chaque enregistrement, ce qui force la lazy tape à matérialiser. Là Perry atterrit à **466 ms** — plus lent que les 375 ms de la sortie de secours mark-sweep parce que la tape paie un overhead qu'elle ne peut pas amortir. Cette ligne est dans TL;DR §B. Quand on ne peut pas éviter le travail, la lazy tape ne fait pas semblant.

## 4\. La page benchmarks, réécrite

Trois choses ont changé dans la façon dont Perry présente les chiffres de performance.

**RUNS=11 médiane + p95 + σ + min + max, pas best-of-N.** Best-of-N élimine silencieusement la latence en queue ; sur ce matériel, il dissimulait des outliers Python `accumulate` à 9,4 secondes et des pics p95 Swift JSON à 5,3 secondes. La médiane remet les queues sur la page. Le changement de méthodologie a atterri en v0.5.248 ; chaque cellule de TL;DR §A et §B est en RUNS=11 fraîche au **2026-04-25**.

**Les sondes d'optimisation sont séparées des perfs runtime réelles.** Les cinq cellules qui montrent Perry à 12–34 ms contre Rust/C++ à 98 ms — `loop_overhead`, `math_intensive`, `accumulate`, `array_read`, `array_write` — mesurent la posture des flags du compilateur, pas le silicium. Elles sont dans leur propre sous-section maintenant, avec un paragraphe au-dessus expliquant que `clang++ -O3 -ffast-math` les rapproche à une milliseconde près. Le kernel runtime réel en gros titre est `loop_data_dependent` : Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — Perry est pile dans le peloton sans contrat FMA sur un kernel où le compilateur ne peut véritablement pas faire disparaître le travail. C'est la comparaison honnête.

**Pairs ajoutés.** simdjson (4.3.0) est désormais dans les deux tables JSON — le plafond C++ de débit de parse, sur la page pour que le lecteur voie l'écart. AssemblyScript avec json-as (1.3.2) est le pair TS-vers-natif installable le plus proche ; porffor a fait un segfault sur la charge à cette taille, Static Hermes refusait de s'installer sur macOS arm64. Kotlin avec kotlinx.serialization a rejoint le polyglot JSON en v0.5.241–v0.5.242. Chaque ligne est réelle, chaque avertissement est sur la page.

## 5\. La table compute polyglot

Les kernels en gros titre véritablement non-foldables, médiane RUNS=11, rafraîchis le 2026-04-25 en v0.5.249 :

| Benchmark | Perry | Rust | C++ | Java | Node | Bun |
| --- | --- | --- | --- | --- | --- | --- |
| fibonacci | 318 | 330 | 315 | 282 | 1022 | 589 |
| loop\_data\_dependent | 235 | 229 | 129 | 229 | 322 | 232 |
| object\_create | 1 | 0 | 0 | 5 | 11 | 6 |
| nested\_loops | 18 | 8 | 8 | 11 | 18 | 21 |

Sur `fibonacci`, Perry s'aligne avec le peloton compilé à 3–15 ms près. Le JIT HotSpot de Java est ~11% plus rapide grâce à l'inlining de l'appel récursif. Sur `loop_data_dependent`, le kernel se scinde en deux clusters de contrat FP : le peloton à contrat FMA à ~128 ms (Go par défaut, `g++ -O3` sur Apple Clang — les deux fusionnent `sum * a + b` en un seul FMADDD) et le peloton sans contrat à 229–235 ms (Perry, Rust par défaut, Swift, Java sans `-XX:+UseFMA`, Bun) qui exécutent FMUL + FADD scalaires. LLVM s'aligne avec le peloton FMA via `-ffp-contract=fast` ; Perry ne l'active pas par défaut. `nested_loops` est borné par le cache, pas par le compute ; tout le monde atterrit à 8–21 ms.

## 6\. Toolchain Windows, légère

Les utilisateurs Windows n'ont plus besoin d'une installation Visual Studio. La **v0.5.199** a fermé [#176](https://github.com/PerryTS/perry/issues/176) : `perry setup windows` + winget LLVM + xwin remplace l'arbre BuildTools VS au complet. La `v0.5.201` a supprimé la cfg gate sur `find_lld_link` / `find_perry_windows_sdk` pour que la découverte de chemin fonctionne sur chaque plateforme qui cible Windows, pas seulement les hôtes macOS.

```
# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe
```

## 7\. Passe de justesse runtime

Un thème de la période : les divergences runtime silencieuses avec V8/JSC sont devenues soit des corrections, soit des erreurs de compilation. Les non-triviales :

-   **v0.5.255** : `BigInt.fromTwos`/`toTwos` complément à deux.
-   **v0.5.263** : `Promise.all`/`race`/`any` discrimination de type non-promise.
-   **v0.5.281** : `NaN==NaN` + formatage de nombres ECMAScript (`3 → "3"`, pas `"3.0"` ; `-0 → "0"` ; etc.).
-   **v0.5.280** : coercition ToInt32 de `NaN`/`Infinity` dans `(x) | 0`.
-   **v0.5.284** : FIFO des microtâches Promise + propagation des handlers qui throw.
-   **v0.5.286** : `JSON.stringify` d'un f64 brut faisait un segfault sous les chemins tape.
-   **v0.5.277** : `fs.readFileSync` retourne Buffer quand aucun encodage n'est passé (correspond à Node).
-   **v0.5.272** : le dispatch de getter chaîné cross-module retournait `undefined`.

Suites stdlib pour l'issue [#187](https://github.com/PerryTS/perry/issues/187) remplies : AsyncLocalStorage de bout en bout (v0.5.261), runtime commander + codegen invoquant réellement `.action()` (v0.5.250), code decimal.js (v0.5.259), Redis ioredis de bout en bout (v0.5.270), pattern async-factory pg + mongo (v0.5.275), et le même bug d'async-factory sur EE/LRU/WSS (v0.5.252).

Côté `perry/ui` : callback de tap sur notification (#97) câblé sur Apple (v0.5.254) et Android (v0.5.258) ; planification + annulation des notifications locales (#96, v0.5.244) ; enregistrement + réception FCM sur Android (v0.5.262).

## 8\. Pour conclure

Le motif de cette période n'est pas dans des chiffres en gros titre. C'est le travail qui fait que les victoires existantes survivent à l'examen : un GC générationnel qui rattrape les charges à allocation soutenue, une SSO qui ferme l'écart de coût des chaînes courtes, un pipeline JSON qui exploite la structure « sans modification » de la charge la plus courante, et une page benchmarks qui mesure des médianes au lieu de best-of-N et qui montre le plafond de parse simdjson à 24 ms sur la même ligne que les 75 ms de Perry. Le lecteur voit l'écart — et où Perry se situe par rapport au plancher.

Essayez-le :

```
# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — no VS install needed)
winget install PerryTS.Perry

# Default benchmark suite
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh
```

Source : [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Benchmarks : [benchmarks/README.md](https://github.com/PerryTS/perry/blob/main/benchmarks/README.md) — Changelog : [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
