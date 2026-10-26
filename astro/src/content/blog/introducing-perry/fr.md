---
title: "Présentation de Perry"
excerpt: "Perry compiles supported TypeScript to standalone native executables with its runtime and GC linked in, without requiring an external Node.js installation or JavaScript engine."
date: 2025-01-15
tags: ["announcement", "compiler", "TypeScript"]
---
Nous sommes ravis de présenter Perry — un compilateur TypeScript natif écrit en Rust qui compile votre TypeScript directement en exécutables autonomes. Pas de runtime Node.js, pas de wrapper Electron, pas de compromis. Juste votre code, compilé en un binaire natif qui démarre instantanément et s'exécute partout.

Perry représente une refonte fondamentale de ce que TypeScript peut être. Au lieu de le traiter comme un sur-ensemble de JavaScript qui doit passer par un moteur JS, Perry traite TypeScript comme un langage système — un langage qui se trouve avoir une syntaxe que des millions de développeurs connaissent et aiment déjà.

## Pourquoi nous avons construit Perry

TypeScript est devenu la lingua franca du développement logiciel moderne. C'est le langage derrière la plupart des frontends web, une part croissante des backends, et de plus en plus le choix pour l'outillage, le scripting et l'automatisation. Mais il a toujours porté une limitation fondamentale : il compile en JavaScript, et JavaScript nécessite un runtime.

Ce runtime — qu'il s'agisse de Node.js, Deno ou Bun — vient avec des compromis. Des temps de démarrage à froid mesurés en dizaines ou centaines de millisecondes. De la surcharge mémoire due au compilateur JIT et au ramasse-miettes. Des distributions binaires qui soit embarquent tout le runtime, soit exigent que l'utilisateur en installe un. Et pour les applications GUI, la seule option a été Electron, qui embarque un navigateur Chromium complet avec votre application.

Nous nous sommes demandé : et si TypeScript n'avait pas besoin de passer par JavaScript du tout ? Et si vous pouviez le compiler directement en code machine natif, de la même façon que vous compilez Rust, Go ou C++ ?

## Comment Perry fonctionne

Le pipeline de compilation de Perry a trois étapes :

1.  **Analyse syntaxique** — Perry utilise SWC (le parser TypeScript/JavaScript basé sur Rust) pour analyser votre code source TypeScript en un AST. SWC est le même parser utilisé par Next.js, et il est extrêmement rapide.
2.  **Compilation dirigée par les types** — Perry parcourt l'AST avec des informations de type complètes. Contrairement à un moteur JS qui doit gérer les types dynamiques à l'exécution, Perry connaît chaque type à la compilation. Cela permet la monomorphisation des génériques, le dispatch statique des appels de méthodes et l'optimisation directe de la disposition mémoire.
3.  **Génération de code** — Perry génère du code machine natif avec Cranelift, le même générateur de code utilisé par Wasmtime et des parties du JIT de Firefox. Cranelift produit du code natif efficace pour x86\_64 et ARM64.

Le résultat est un exécutable autonome — typiquement 2–5 Mo pour un outil CLI — qui démarre instantanément sans temps de chauffe.

terminal

$ perry build app.ts

Parsing app.ts...

Compiling (cranelift, arm64)...

Linking...

✓ Built executable: app (2.3 MB)

$ ./app

Hello from native TypeScript!

$ file app

app: Mach-O 64-bit executable arm64

## Quelles fonctionnalités TypeScript sont supportées

Perry supporte un sous-ensemble large et croissant de TypeScript. L'objectif est la compatibilité complète avec le langage tel que les développeurs l'utilisent réellement. Aujourd'hui, cela inclut :

-   **Tous les types primitifs** — string, number, boolean, null, undefined, bigint, symbol
-   **Interfaces et alias de type** — y compris les types union, les types intersection et les mapped types
-   **Génériques** — compilés via monomorphisation, donc `Array<number>` et `Array<string>` génèrent des chemins de code optimisés distincts
-   **Classes** — avec héritage, champs privés (`#field`), membres statiques, getters/setters et décorateurs
-   **Async/await et Promises** — compilés en machine à états, similaire à la façon dont Rust gère l'async
-   **Générateurs et itérateurs** — `function*` et boucles `for...of`
-   **Closures** — avec une sémantique de capture correcte
-   **Déstructuration** — tableaux, objets, patterns imbriqués et éléments rest
-   **Template literals** — y compris les tagged templates
-   **Modules** — imports/exports ESM résolus à la compilation

## Interface native multiplateforme

Perry ne se limite pas aux outils CLI et aux applications côté serveur. Il est livré avec des frameworks d'interface natifs pour six plateformes :

-   **macOS** — AppKit (NSWindow, NSView, NSButton, NSTextField et plus)
-   **iOS** — UIKit (UIViewController, UIView, UIButton, UITableView)
-   **iPadOS** — UIKit (même API qu'iOS, avec des adaptations spécifiques iPad)
-   **Android** — JNI + Android Views (Activity, View, Button, RecyclerView)
-   **Linux** — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)
-   **Windows** — Win32 (CreateWindowEx, contrôles communs, GDI)

L'idée clé est que Perry mappe une API TypeScript commune au toolkit de widgets natif de chaque plateforme à la compilation. Il n'y a pas de couche bridge, pas de vue web et pas de moteur de rendu personnalisé. Votre application utilise de vrais widgets de plateforme, rendus par le système d'exploitation lui-même. Lisez-en plus dans notre analyse approfondie : [Interface native multiplateforme depuis TypeScript](/fr/blog/cross-platform-native-ui/).

## Plus de 27 implémentations natives de paquets npm

L'un des plus grands défis pratiques d'un nouveau compilateur est la compatibilité avec l'écosystème. Les développeurs n'écrivent pas seulement du code from scratch — ils utilisent des paquets. Perry y répond avec des implémentations natives de plus de 27 paquets npm populaires :

-   **Bases de données** — mysql2, pg, mongodb, better-sqlite3, ioredis
-   **HTTP** — axios, express, ws (WebSockets)
-   **Sécurité** — bcrypt, jsonwebtoken, crypto
-   **Utilitaires** — uuid, chalk, dotenv, lodash (partiel), moment
-   **Système** — fs-extra, glob, chokidar, commander

Ce ne sont pas de minces wrappers autour de modules Node.js. Ils sont compilés directement dans votre binaire en utilisant les bibliothèques système natives — libpq pour PostgreSQL, OpenSSL pour la cryptographie, libcurl pour HTTP. La surface d'API correspond à ce que vous attendez du paquet npm, donc la migration est directe.

## Couche de compatibilité V8 optionnelle

Pour les paquets npm qui n'ont pas encore d'implémentations natives Perry, Perry offre un mode d'embarquement V8 optionnel. Lorsqu'il est activé, Perry embarque un runtime V8 et peut exécuter des paquets npm JavaScript standard aux côtés de votre TypeScript compilé. C'est une soupape de sécurité pragmatique qui vous permet d'adopter Perry progressivement — compilez les chemins critiques en code natif tout en gardant accès à l'écosystème npm complet pour tout le reste.

## Compilation croisée

Perry supporte la compilation croisée nativement. Depuis votre machine de développement macOS, vous pouvez compiler pour Linux (x86\_64 et ARM64) et iOS. Cela signifie que vous pouvez construire votre pipeline CI/CD sur macOS et produire des binaires pour toutes vos cibles de déploiement sans avoir besoin de machines de compilation dédiées pour chaque plateforme.

\# Compiler pour Linux depuis macOS

$ perry build app.ts --target linux-x86\_64

✓ Built executable: app (3.1 MB)

\# Compiler pour iOS depuis macOS

$ perry build app.ts --target ios-arm64

✓ Built executable: app (4.8 MB)

## Performance

Les binaires compilés par Perry sont rapides. Comme il n'y a pas de chauffe JIT, pas de surcharge d'interpréteur et pas de pauses du ramasse-miettes, les performances sont prévisibles et constantes dès la première invocation.

Dans nos benchmarks :

-   **Temps de démarrage** — effectivement 0 ms (lancement de processus natif)
-   **Taille du binaire** — 2–5 Mo pour les outils CLI typiques (vs 50+ Mo pour Node.js embarqué)
-   **Utilisation mémoire** — 5–10x inférieure aux applications Node.js équivalentes
-   **Débit** — compétitif avec du C écrit à la main pour les charges de travail de calcul intensif

Vous pouvez voir les benchmarks en direct sur [demo.perryts.com](https://demo.perryts.com), qui compare les exécutables compilés par Perry à Node.js et Bun en temps réel.

## État actuel

Perry est en développement actif. Le compilateur est stable avec 62 tests sur 62 réussis dans la suite de tests. Les six backends d'interface de plateforme sont fonctionnels. Les fonctionnalités principales du langage sont solides et en expansion.

Nous travaillons activement à l'expansion de la bibliothèque de widgets d'interface, à l'amélioration des performances des chaînes et des objets, à l'achèvement du support complet des regex et à la construction du module Stream. À plus long terme, nous planifions des cibles de compilation WASM, le multi-threading, une extension VS Code et l'intégration de gestionnaire de paquets.

Consultez la [feuille de route](/fr/roadmap/) complète pour les détails sur ce qui a été livré, ce qui est en cours et ce qui arrive ensuite.

## Démarrer

Perry est open source. Vous pouvez cloner le dépôt, compiler depuis les sources et commencer à compiler du TypeScript dès aujourd'hui :

$ git clone https://github.com/PerryTS/perry.git

$ cd perry

$ cargo build --release

\# Compilez votre premier fichier TypeScript

$ ./target/release/perry build hello.ts

✓ Built executable: hello (2.1 MB)

$ ./hello

Hello, world!

Parcourez le code source sur [GitHub](https://github.com/PerryTS/perry), consultez le [showcase](/fr/showcase/) pour voir ce qui se construit avec Perry, ou plongez directement dans le code. Nous avons hâte de voir ce que vous construirez.
