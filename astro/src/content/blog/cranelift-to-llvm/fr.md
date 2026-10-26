---
title: "De Cranelift à LLVM : ce qui a cassé et comment nous l’avons réparé"
excerpt: "La migration du backend de Perry de Cranelift vers LLVM est terminée. La bascule initiale a rendu les benchmarks 70x plus lents — voici ce qui a cassé, et les six optimisations ciblées qui l'ont réparé."
date: 2026-04-12
tags: ["compilers", "llvm", "cranelift", "performance", "milestone"]
---
> **Correction (septembre 2026) :** Le benchmark ci-dessous appelé « factorial » était mal nommé : il additionne `i % 1000` dans une boucle et ne calcule aucune factorielle. Le chiffre de 24,6x provenait d’une ancienne exécution de Node.js qui ne se reproduit pas ; avec notre harness publié actuel, c’est une égalité avec Node.js (93 ms contre 95 ms). C’est un microbenchmark d’un chemin rapide de modulo entier, pas une mesure des performances TypeScript typiques. Les résultats ci-dessous sont conservés comme archive historique. Les chiffres actuels, y compris les benchmarks que Perry perd, sont dans le [README de Perry](https://github.com/PerryTS/perry#performance).

La migration du backend de Perry de Cranelift vers LLVM est terminée. À partir de v0.5.12, LLVM est le seul backend de génération de code, et Perry bat désormais Node.js sur chaque benchmark — avec des marges allant de 1,7x à 24,6x (avec deux égalités).

Le chemin n'a pas été une ligne droite. La bascule initiale en v0.5.0 a rendu plusieurs benchmarks **70x plus lents** que la version Cranelift qu'elle remplaçait. Ce billet est la version longue de ce qui s'est passé, pourquoi nous avons quand même fait le changement, ce qui a cassé, ce qui a réparé, et à quoi ressemblent les chiffres de l'autre côté.

Si vous construisez un compilateur, évaluez des backends de codegen, ou êtes simplement curieux de savoir pourquoi “passer à LLVM” est rarement aussi simple que ça en a l'air, cet article est pour vous.

## Partie 1 : Pourquoi changer ?

Perry compile TypeScript directement en code machine natif. Pas de Node, pas de V8, pas d'Electron, pas de WebView. La promesse est “écrivez du TypeScript, livrez un binaire natif”, et toute la proposition de valeur s'effondre si ce binaire n'est pas réellement rapide.

Pendant les premières versions mineures de Perry, le backend de codegen était [Cranelift](https://cranelift.dev/). Cranelift est excellent — c'est le codegen derrière wasmtime, il est utilisé par le JIT baseline de SpiderMonkey, et c'est l'outil de choix quand on a besoin d'une compilation rapide et prévisible avec une intégration propre. Pour un projet qui amorce un nouveau langage, c'était le bon point de départ.

Mais deux choses nous en ont finalement éloignés.

### 1\. Le plafond de l'optimiseur

Cranelift est intentionnellement un compilateur optimisant rapide à un seul niveau. Son mandat est “produire du code correct rapidement”, pas “produire le meilleur code possible sans limite de temps”. C'est le bon compromis pour un JIT. C'est le mauvais compromis pour un compilateur AOT dont l'argument de vente est la performance native.

LLVM a bénéficié de plus de deux décennies de travail sur son middle-end. Vectorisation de boucles, LICM, GVN, SCCP, combinaison d'instructions, heuristiques d'inlining, réassociation fast-math, analyse d'alias — il n'existe aucun univers réaliste dans lequel un projet plus petit rattrape ce niveau. Si Perry veut affirmer “plus rapide que Node”, nous avons besoin de cette machinerie.

### 2\. Le problème arm64\_32

Le déclencheur immédiat a été l'Apple Watch. `arm64_32` est un ABI qu'Apple a introduit pour la Series 4 et ultérieures — instructions 64 bits, pointeurs 32 bits. Cranelift ne le supporte pas, et il n'y avait pas de perspective réaliste que cela arrive. Pour que Perry puisse crédiblement affirmer “9 plateformes depuis une seule base de code”, watchOS ne pouvait pas manquer. LLVM supporte `arm64_32` nativement.

Une fois que nous avons accepté que *certaines* cibles nécessiteraient LLVM, maintenir deux backends est devenu intenable. Deux backends signifient deux ensembles de bugs, deux ensembles de passes d'optimisation, deux matrices de tests, deux lignes de base de performance. La réponse honnête était : en choisir un.

Nous avons choisi LLVM.

## Partie 2 : Un mot sur Cranelift

Avant d'aller plus loin : cet article n'est pas un réquisitoire contre Cranelift. Cranelift est une pièce d'ingénierie brillante, et si vous construisez un JIT, un runtime sandboxé, ou quoi que ce soit où la latence de compilation compte plus que le débit maximal, il devrait être en haut de votre liste. wasmtime l'utilise pour de bonnes raisons. La Bytecode Alliance fait un travail exemplaire.

Les besoins de Perry sont simplement différents. Nous compilons à l'avance, nous livrons le binaire une fois, et l'utilisateur l'exécute des millions de fois. Cette asymétrie — compiler rarement, exécuter toujours — est exactement le régime où l'optimiseur plus lourd de LLVM se rentabilise. Outil différent pour un travail différent.

## Partie 3 : Le désastre de la bascule

v0.5.0 a été le premier release avec LLVM comme seul backend. Nous nous attendions à une légère régression du temps de compilation et à une amélioration significative des performances à l'exécution. Nous avons obtenu le contraire du second point.

Voici le tableau que je ne voulais pas publier à l'époque :

| Benchmark | Cranelift | LLVM v0.5.0 | Delta |
| --- | --- | --- | --- |
| method\_calls | 16ms | 1,084ms | 68x slower |
| object\_create | 5ms | 318ms | 64x slower |
| matrix\_multiply | 61ms | 184ms | 3x slower |
| math\_intensive | 370ms | 131ms | 2.8x faster |
| nested\_loops | 32ms | 57ms | 1.8x slower |
| fibonacci(40) | 505ms | 1,156ms | 2.3x slower |

Certaines charges de travail se sont accélérées. La plupart se sont considérablement dégradées. `method_calls` — l'un des benchmarks les plus importants car il représente l'utilisation idiomatique des classes TypeScript — était près de 70x pire que ce que nous avions livré deux releases plus tôt.

### Ce qui a réellement mal tourné

Perry utilise le **NaN-boxing** pour la représentation des valeurs. Chaque valeur TypeScript est un mot de 64 bits. Les nombres f64 sont stockés directement ; tout le reste (objets, chaînes, booléens, undefined, null) est encodé dans les bits inutilisés d'un IEEE 754 quiet NaN.

L'avantage : les nombres sont à coût nul. Pas de boxing, pas de tagging, pas d'allocation pour l'arithmétique.

L'inconvénient : chaque opération sur une valeur non numérique nécessite une manipulation de bits pour déballer, opérer et remballer. Si ces séquences sont du IR inline dans votre codegen, l'optimiseur peut les fusionner et les simplifier. Si elles sont des **appels à des fonctions helpers du runtime**, l'optimiseur voit un appel opaque et abandonne.

Notre backend Cranelift avait accumulé un grand nombre de lowerings inline pour les opérations chaudes — chargements de propriétés, dispatch de méthodes, allocation d'objets, arithmétique entière sur des valeurs taggées f64. La bascule vers LLVM, dans l'intérêt de produire d'abord du code *correct*, a routé presque toutes ces opérations vers des helpers du runtime dans `perry-runtime`. Chaque helper était une instruction `call` en LLVM IR.

LLVM est excellent, mais il ne peut pas inliner une fonction dont il n'a jamais vu le corps. `perry-runtime` est compilé séparément, lié à la fin, et du point de vue de l'optimiseur, chaque appel de helper est une boîte noire. Le résultat était que des boucles chaudes que le backend Cranelift compilait en ~5 instructions d'arithmétique inline étaient désormais compilées en appels de fonction — sauvegarde de registres, mise en place du stack frame, tout le tralala — répétés des millions de fois.

C'est de là que venaient les 70x. Pas du mauvais codegen. De mauvaises **frontières d'inlining**.

## Partie 4 : La correction

Le travail pour rattraper et dépasser les chiffres de Cranelift s'est réparti en environ six catégories. Aucune n'est exotique. La plupart sont des optimisations de compilateur classiques qui devaient simplement être appliquées aux bons endroits.

### 1\. Bump allocator inline pour l'allocation d'objets

`object_create` était la pire régression après `method_calls`. L'ancien chemin appelait `js_object_alloc_class_with_keys` pour chaque `new Point()` — un appel de fonction, un accès à une arena thread-local, une recherche dans le cache de shapes, et une écriture du GC header + object header.

La correction : émettre l'allocation bump **inline** en LLVM IR. Chaque fonction qui alloue des objets obtient un pointeur caché vers une structure `InlineArenaState` thread-locale. L'allocation devient :

```
; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr           ; current bump offset
%new_off = add i64 %offset, 96              ; GcHeader(8) + ObjectHeader(24) + 8 fields(64)
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr            ; current block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow
fast:
  store i64 %new_off, ptr %off_ptr          ; bump the offset
  %data = load ptr, ptr %state              ; data pointer at offset 0
  %raw  = getelementptr i8, ptr %data, i64 %offset
  store i64 <packed_gc_header>, ptr %raw    ; GcHeader as one i64
slow:
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)
```

Le chemin rapide fait ~13 instructions de IR inline que LLVM peut voir, ordonnancer et hisser hors des boucles. `object_create` est passé de 318ms à 9ms.

### 2\. Compteurs de boucle i32

Le NaN-boxing signifie que chaque nombre TypeScript est f64. Cela inclut les compteurs de boucle. Une boucle `for (let i = 0; i < 100_000_000; i++)` avec des variables d'induction f64 est un désastre : incrémentation f64, comparaison f64, conversion f64 vers i64 à chaque accès indexé dans un tableau.

Le codegen détecte les boucles for où la variable d'induction est prouvablement entière et alloue un **slot de pile i32 parallèle**. La condition de boucle passe de `fcmp` à `icmp slt i32`, éliminant entièrement le compteur f64.

Cela a fait passer `array_write` de 11ms à 3ms, `nested_loops` de 18ms à 9ms, et `array_read` de 11ms à 4ms.

### 3\. Drapeaux fast-math

Nous attachons les drapeaux `reassoc contract` à chaque instruction arithmétique f64. `reassoc` permet à LLVM de casser les chaînes d'accumulateur sérielles en parallèles, et `contract` autorise le multiply-add fusionné. Nous gardons `nnan` et `ninf` désactivés parce que Perry utilise les bits NaN comme tags de valeur.

Avec ces drapeaux, le vectoriseur de boucles de LLVM s'active sur `math_intensive`, qui est passé de 131ms à 14ms — battant Node de 3,5x.

### 4\. Chemin rapide pour le modulo entier

`%` sur f64 en JavaScript est `fmod`, qui est un appel libm sur ARM. Mais pour des opérandes f64 à valeur entière, on peut faire `fptosi → srem → sitofp` et sauter entièrement l'aller-retour par libm. Le codegen utilise l'analyse statique pour détecter les opérandes à valeur entière — aucune vérification à l'exécution nécessaire.

C'est la raison pour laquelle `factorial` est passé de 1 553ms à 24ms — et des 591ms de Node à 24ms. **24,6x plus rapide que Node.**

### 5\. LICM pour les boucles imbriquées

LLVM fait du loop-invariant code motion nativement, mais le NaN-boxing masque la structure. `arr.length` se traduit par un load à travers un pointeur NaN-boxé avec une vérification de tag — pas évidemment invariant.

Le codegen détecte le motif `for (...; i < arr.length; ...)` et pré-charge la longueur dans un slot de pile avant la boucle, avec un walker statique qui vérifie que le corps de la boucle ne peut pas modifier la longueur du tableau. Quand le compteur est borné par cette longueur hissée, IndexGet/IndexSet sautent entièrement les vérifications de bornes.

### 6\. Objets avec cache de shapes

Quand le codegen connaît la classe d'un objet, il résout les offsets de champs au moment de la compilation et émet des **loads indexés directs** — pas de dispatch à l'exécution. Pour le dispatch de méthodes, `obj.method(args)` devient un `call @perry_method_Class_name(this, args)` direct — pas de vtable, pas d'inline cache, pas de recherche hash.

La bascule LLVM avait régressé vers le chemin lent universel. Restaurer le dispatch statique nous a donné la récupération de `method_calls` — de 1 084ms à 1ms. **11x plus rapide que Node.**

## Partie 5 : Les chiffres aujourd'hui

Médiane de trois exécutions, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25 :

| Benchmark | Perry | Node.js | vs Node |
| --- | --- | --- | --- |
| factorial | 24ms | 591ms | 24.6x |
| method\_calls | 1ms | 11ms | 11x |
| loop\_overhead | 12ms | 53ms | 4.4x |
| math\_intensive | 14ms | 49ms | 3.5x |
| array\_read | 4ms | 13ms | 3.2x |
| closure | 97ms | 303ms | 3.1x |
| array\_write | 3ms | 8ms | 2.6x |
| string\_concat | 1ms | 2ms | 2x |
| nested\_loops | 9ms | 16ms | 1.7x |
| prime\_sieve | 4ms | 7ms | 1.7x |
| matrix\_multiply | 21ms | 34ms | 1.6x |
| fibonacci(40) | 401ms | 991ms | 2.5x |
| binary\_trees | 9ms | 9ms | tied |
| mandelbrot | 24ms | 24ms | tied |
| object\_create | 9ms | 8ms | 0.9x |

Chaque benchmark est une victoire ou une égalité. Le plus serré est `object_create` (9ms vs 8ms), où l'allocateur de V8 est véritablement excellent.

## Partie 6 : La question du temps de compilation

La raison numéro un pour laquelle les gens choisissent Cranelift plutôt que LLVM est la vitesse de compilation. Parlons-en.

LLVM a augmenté le temps de compilation par fichier de Perry de **20 à 50ms**, soit environ **8 à 19%**. Pas 5x. Pas 2x. Un pourcentage à un chiffre ou à deux chiffres faible.

La raison est que le codegen n'est pas le goulot d'étranglement dans le pipeline de Perry. La répartition pour un fichier typique :

-   SWC parsing : ~30%
-   HIR lowering (AST → IR, inférence de types) : ~25%
-   Passes de transformation IR (conversion de closures, async lowering, inlining) : ~15%
-   **Codegen (émission de texte LLVM IR + `clang -c -O3`) : ~20%**
-   Linking (`cc` + bibliothèque runtime) : ~10%

Le codegen est une tranche sur cinq. Même en doublant cette tranche, le total ne bouge que de 5 à 10%. Si vous construisez un compilateur AOT où l'utilisateur tape `perry compile` une fois puis exécute le binaire indéfiniment, le calcul est : dépenser 25ms de plus à la compilation, économiser jusqu'à 24x à chaque exécution.

## Partie 7 : Ce que je ferais différemment

Si je démarrais Perry aujourd'hui et pouvais passer directement à LLVM, je ne le ferais pas. La phase Cranelift a été véritablement précieuse. Elle nous a permis d'itérer sur le frontend sans la taxe de complexité de LLVM, elle nous a donné une ligne de base fonctionnelle pour comparer, et elle nous a forcés à garder notre HIR assez propre pour être portable entre les backends.

Ce que je ferais différemment, c'est la bascule elle-même. Nous avons livré v0.5.0 avec la plupart des opérations passant par des appels à des helpers du runtime, avec l'intention de les inliner plus tard. C'était une erreur. Le bon ordre aurait été : identifier d'abord les chemins chauds, les descendre en inline avant la bascule, et ne publier qu'une fois le backend LLVM au moins à parité.

La leçon est celle qui est ennuyeuse : les frontières d'optimisation comptent plus que la qualité de l'optimiseur. LLVM est un logiciel remarquable, mais il ne peut pas vous aider avec du code qu'il ne peut pas voir. Si votre codegen route tout à travers des appels opaques au runtime, vous avez construit un mur entre votre programme source et chaque passe d'optimisation qui existe.

## Pour conclure

Perry est désormais uniquement LLVM, plus rapide que Node sur chaque benchmark, et en production. La migration a pris plus de temps que prévu, a fait plus mal que je ne l'attendais en cours de route, et est sans ambiguïté la bonne décision avec le recul. Cranelift nous a amenés jusqu'à v0.5 ; LLVM nous emmène pour le reste du chemin.

Si vous voulez essayer Perry :

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Source : [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs : [docs.perryts.com](https://docs.perryts.com) — Lancez les benchmarks vous-même : `cd benchmarks/suite && ./run_benchmarks.sh`

Si vous avez des questions, trouvez des bugs, ou voulez débattre des backends de codegen, les issues GitHub sont ouvertes. Je les lis toutes.

— Ralph
