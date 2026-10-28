---
title: "Distribution npm, perry dev, et gagner chaque benchmark"
excerpt: "Perry v0.5.80 → v0.5.174 en six jours. @perryts/perry est livré sur npm pour les sept plateformes supportées. perry dev ajoute la recompilation automatique en mode watch au-dessus d'un cache d'AST en mémoire et d'un cache d'objets sur disque par module. json_roundtrip ferme son dernier écart — Perry gagne maintenant chaque benchmark contre Node.js et Bun."
date: 2026-04-23
tags: ["npm", "developer-experience", "performance", "watch-mode", "milestone"]
---
Le dernier billet s'est terminé avec Perry en v0.5.80 et une défaite tenace au tableau des benchmarks : le roundtrip `JSON.parse`/`stringify` était encore 1,6x plus lent que Node. Six jours plus tard, Perry est en **v0.5.174** — soit **94 releases de correctifs** — et trois choses ont changé qui valent la peine d'être signalées avant toute autre :

-   `@perryts/perry` est livré sur **npm**. Une seule commande installe Perry sur chaque plateforme supportée.
-   **`perry dev`** ajoute la recompilation automatique en mode watch, au-dessus d'un nouveau cache d'AST en mémoire et d'un cache d'objets sur disque par module.
-   La défaite sur `json_roundtrip` s'est refermée. Perry **bat maintenant Node et Bun sur chaque benchmark** de la suite principale (15/15 contre les deux).

Le reste du billet est le casting secondaire : corrections WebAssembly, watchOS qui compile enfin de bout en bout, les primitives `perry/thread` câblées jusqu'au bout, et un lot de gains de rigueur à la compilation qui transforment des abandons silencieux en vraies erreurs.

## 1\. `@perryts/perry` sur npm

Perry s'est toujours installé via Homebrew sur macOS et APT sur Debian/Ubuntu. Bonne couverture pour les développeurs sur ces plateformes, rien du tout pour les utilisateurs Windows sauf s'ils compilaient depuis les sources, et rien d'uniforme dans une équipe qui mélange Mac, Linux et Windows. La v0.5.107 a fait disparaître ce problème.

```
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp
```

Le package est un lanceur léger qui dépend de sept packages optionnels spécifiques à chaque plateforme — macOS arm64/x64, Linux x64/arm64 à la fois sur glibc et musl, Windows x64 — et npm installe uniquement celui correspondant à votre machine. La taille du binaire par plateforme tient dans quelques méga-octets à un chiffre. L'installation elle-même prend quelques secondes. Il existe aussi un chemin d'installation globale (`npm install -g @perryts/perry`) si vous préférez, mais l'installation locale au projet épingle la version du compilateur à côté de vos dépendances, ce qui est le bon défaut.

La publication est passée par OIDC Trusted Publisher donc chaque release a une provenance et est liée au job CI qui l'a construite. Cela a constitué une journée de travail CI à part entière — plusieurs commits CI `v0.5.107` à la poursuite de la bonne combinaison `--provenance` / version npm / chemin de workflow — mais c'est en place, et chaque release depuis est propre. Les utilisateurs Windows sont maintenant des citoyens de première classe, et la friction inter-équipes du « installe-le comme ton OS le veut » a disparu.

## 2\. `perry dev` — mode watch

La v0.5.143 a ajouté une nouvelle sous-commande CLI :

```
perry dev
```

C'est tout. Elle surveille votre projet, recompile à la sauvegarde, et relance votre binaire. L'inspiration vient de Vite et `nodemon` ; l'idée est d'arrêter de prétendre qu'un workflow compilateur-vers-binaire doit forcément paraître plus lent qu'un runtime. Pour la plupart des projets, `perry dev` recompile en moins d'une seconde sur un cache chaud.

Le détail « cache chaud » compte. Deux nouveaux caches sont arrivés aux côtés de `perry dev` :

-   **Cache d'AST en mémoire** (v0.5.156). À travers les recompilations dans une même session `perry dev`, Perry garde l'AST parsé pour chaque module qui n'a pas changé sur disque. Éditer un fichier reparse un fichier, pas tout le graphe de modules.
-   **Cache d'objets sur disque par module (V2.2)**. Chaque module compile vers son propre fichier `.o` et est haché ; les modules inchangés sautent entièrement le codegen et le linker récupère l'objet en cache. La sortie verbose du cache correspond à la spec dans [#131](https://github.com/PerryTS/perry/issues/131), et une phase de durcissement d'audit en v0.5.160 a fermé les cas limites où des entrées de cache obsolètes pouvaient survivre à un changement d'en-tête.

Les deux caches s'empilent. La première édition de la session est une compilation complète ; tout ce qui suit ne fait que le travail proportionnel à ce que vous avez réellement changé. C'est le plus grand changement de DX de la semaine à lui seul.

## 3\. Battre Bun sur chaque benchmark

À la v0.5.166, le README contenait une mise en garde honnête : Perry était 1,6x plus lent que Node sur `json_roundtrip` (50× `JSON.parse` + `JSON.stringify` sur un blob de 1 Mo et 10 000 éléments), et 2,4x plus lent que Bun. L'issue [#149](https://github.com/PerryTS/perry/issues/149) suivait la relance. En v0.5.173 — sept jours plus tard — cet écart s'est refermé.

| Charge de travail | Perry v0.5.173 | Node v25 | Bun 1.3 |
| --- | --- | --- | --- |
| `json_roundtrip` | 314ms | 377ms | 250ms |
| `closure` | 10ms | 309ms | 51ms |
| `factorial` | 31ms | 596ms | 98ms |
| `fibonacci(40)` | 320ms | 1033ms | 521ms |
| `mandelbrot` | 23ms | 25ms | 30ms |

Perry gagne désormais chaque charge de travail de la suite principale de benchmarks — **15/15 contre Node, 15/15 contre Bun**, meilleure sur 5 exécutions sur macOS ARM64. Bun 1.3 reste en tête sur la RSS de pointe (84 Mo contre les 310 Mo de Perry sur `json_roundtrip`), donc la pression sur l'allocateur est la prochaine chose à fermer, mais la latence brute appartient à Perry.

La fermeture de l'écart JSON n'est pas le fait d'un seul changement — c'est l'accumulation du travail de parité sur la disposition des objets qui a traversé cette semaine : inférence de shape des littéraux d'objet phase 1 (v0.5.167), inférence de type de retour basée sur le corps phase 4 pour les fonctions libres, méthodes de classe, getters et flèches (v0.5.169), et inférence de type de retour sur appel de méthode phase 4.1 (v0.5.170). Le thème est le même que dans le billet précédent : donnez à LLVM assez de structure statique pour voir à travers, et l'optimiseur fait le reste.

La v0.5.164 a aussi restauré l'autovectorisation à accumulateur parallèle `<2 x double>` sur les boucles de réduction fadd pures, qui avait silencieusement régressé à un moment dans la plage v0.5.9x→v0.5.16x. C'est ce qui ramène `math_intensive` et `accumulate` à leur ancienne avance de 3 à 4x sur Rust/C++/Go/Swift — même LLVM, un seul drapeau `reassoc contract`, un seul corps de boucle vectorisé.

## 4\. `perry/ui` et doc-tests

Quatre écarts restants de perry/ui se sont fermés en v0.5.151. À côté de cela, la v0.5.119 a basculé le mauvais usage silencieux de l'API perry/ui de « compile et ne fait rien » à une erreur de compilation dure — même logique qu'en v0.5.165 appliquée aux décorateurs (voir plus bas). Un mauvais usage qui remonte à la compilation est toujours meilleur qu'à l'exécution.

La v0.5.123 a livré un **harness de tests pour les exemples de la documentation** et une galerie de widgets. Chaque exemple TypeScript dans la documentation est désormais compilé à chaque exécution CI, et la galerie de widgets compare les captures d'écran contre des baselines bénies. La v0.5.125 a étendu cela à une matrice de cross-compilation : chaque exemple de doc est compilé pour iOS, tvOS, Android, WASM, et Web, ainsi que pour la plateforme hôte, afin que la dérive d'API entre cibles soit attrapée sur la PR qui l'a introduite plutôt que sur le cycle de release qui l'a livrée.

Une petite victoire de qualité de vie : `perry check` émet maintenant `file:line:column` pour les erreurs de lowering HIR ([#129](https://github.com/PerryTS/perry/issues/129)), ce qui signifie que le saut-à-l'erreur de l'éditeur fonctionne au lieu d'afficher un message générique sans localisation.

## 5\. watchOS compile de bout en bout

watchOS a été livré comme cible de compilation le mois dernier, mais une build propre de bout en bout avait quelques bords rugueux. Le travail watchOS de cette semaine :

-   **v0.5.113** : `--target watchos` et `--target watchos-simulator` compilent maintenant de bout en bout sans les contournements qui s'étaient accumulés.
-   **v0.5.114** : `--features watchos-game-loop` pour les applications à surface Metal.
-   **v0.5.122** : `--features watchos-swift-app` pour le rendu hébergé par SwiftUI — quand vous voulez que SwiftUI possède le cycle de vie de l'app et que Perry compose l'UI à l'intérieur.
-   **v0.5.135** : `PERRY_UI_TEST_MODE` câblé dans perry-ui-ios et perry-ui-tvos, afin que le test d'UI Geisterhand s'exécute de la même manière sur ces deux cibles que sur macOS et Linux.

## 6\. Primitives `perry/thread` entièrement câblées

La v0.5.174 (aujourd'hui) a fermé [#146](https://github.com/PerryTS/perry/issues/146) : `parallelMap`, `parallelFilter`, et `spawn` sont entièrement câblés à travers le chemin de codegen avec application de la sûreté à la compilation. Les captures mutables sont rejetées à la compilation — la même posture de correction-à-la-compilation que perry/ui et les décorateurs ont maintenant. Les primitives de thread qui étaient partiellement câblées depuis l'annonce de la v0.4.0 sont maintenant complètes de bout en bout.

## 7\. WebAssembly et la cible web

Deux corrections WASM qui valent la peine d'être signalées :

-   **v0.5.158** : cinq bugs qui se composaient dans `--target web` (le chemin de sortie WASM) et qui se masquaient les uns les autres. Corrigés en lot, donc la cible web tient maintenant sous la surface complète de `perry/ui` ([#133](https://github.com/PerryTS/perry/issues/133)).
-   **v0.5.161** : `break`/`continue` à l'intérieur d'un `if` à l'intérieur d'une boucle se bloquait sur WASM — un bug de codegen qui ne se reproduisait pas sur les cibles natives. Corrigé ([#135](https://github.com/PerryTS/perry/issues/135)).

Aussi côté correction : la v0.5.157 a corrigé `obj.field` qui retournait `NaN` sur Android ([#128](https://github.com/PerryTS/perry/issues/128)), et la v0.5.162 a corrigé un bug maudit dans ws où `sendToClient` et `closeClient` compilaient vers des no-ops silencieux ([#136](https://github.com/PerryTS/perry/issues/136)).

## 8\. Victoires de rigueur à la compilation

Un thème de cette semaine : tout ce qui était auparavant un échec silencieux est désormais une erreur de compilation.

-   **v0.5.165** : les décorateurs TypeScript étaient parsés en HIR puis silencieusement abandonnés. Ils émettent maintenant une erreur au point de décoration avec un message clair ([#144](https://github.com/PerryTS/perry/issues/144)). Même raisonnement warn→bail qu'en v0.5.119 appliqué à perry/ui.
-   **v0.5.119** : mauvais usage de l'API perry/ui rejeté à la compilation au lieu de produire un binaire no-op.
-   **v0.5.172** : `console.trace()` émet maintenant une vraie backtrace native sur stderr au lieu de seulement répéter le message ([#20](https://github.com/PerryTS/perry/issues/20)). Les frames symbolisées nécessitent `PERRY_DEBUG_SYMBOLS=1` ; sans cela vous obtenez des adresses, ce qui reste plus que le comportement de répétition de message qu'il remplace.

## 9\. Pour conclure

Le motif de la semaine : **distribution** (npm), **expérience développeur** (`perry dev`, caches incrémentaux), et **la dernière défaite restante sur les benchmarks fermée**. Plus un lot de rigueur à la compilation qui transforme des abandons silencieux en vraies erreurs. Six jours, 94 releases de correctifs, un changement de DX majeur.

Essayez-le :

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

Source : [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs : [docs.perryts.com](https://docs.perryts.com) — Changelog : [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
