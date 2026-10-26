---
title: "Construire Pry : un visualiseur JSON natif en TypeScript"
excerpt: "A walkthrough of building Pry, a native JSON viewer compiled from TypeScript to machine code with the Perry runtime and GC linked in and no webview."
date: 2025-02-20
tags: ["tutorial", "showcase", "Pry"]
---
Pry est un visualiseur JSON natif construit entièrement en TypeScript et compilé avec Perry. Ce n'est pas une démo technique — c'est un vrai outil que nous utilisons quotidiennement pour inspecter les réponses d'API, les fichiers de configuration et les dumps de données. Cet article explique comment il a été construit, comment il compile et à quoi ressemble l'expérience de développement quand votre TypeScript compile en une app native.

## Ce que fait Pry

Pry lit un fichier JSON (ou accepte du JSON depuis stdin) et le rend sous forme d'arbre interactif et navigable dans une fenêtre native. Si vous avez utilisé le Quick Look intégré de macOS pour le JSON, imaginez cela — mais plus rapide, avec recherche et navigation au clavier.

Les fonctionnalités :

-   **Vue arborescente** — nœuds pliables pour les objets et tableaux, avec indicateurs de profondeur et tout développer/réduire
-   **Recherche** — recherche plein texte sur les clés et valeurs avec surlignage en temps réel et navigation des correspondances
-   **Raccourcis clavier** — flèches pour naviguer, entrée pour développer/réduire, barre oblique pour chercher, `⌘C` pour copier
-   **Presse-papiers** — copier n'importe quel nœud ou sous-arbre en JSON formaté
-   **Coloration syntaxique** — chaînes en vert, nombres en orange, booléens en violet, null en rouge
-   **Barre d'état** — affiche le nombre total de nœuds, la profondeur actuelle, la taille du fichier et le temps d'analyse

## Le code source

Pry est écrit en TypeScript standard. Pas de syntaxe spéciale, pas de macros, pas de génération de code à la compilation. Il utilise l'API d'interface de Perry, qui fournit des widgets natifs qui compilent en code spécifique à la plateforme.

Voici le point d'entrée (simplifié pour la clarté) :

pry.ts

import { App, VStack, TreeView, SearchBar, StatusBar, State }

from "perry/ui";

import { readFile, readStdin } from "perry/fs";

// Lire l'entrée depuis un argument de fichier ou stdin

const input = process.argv\[2\]

? readFile(process.argv\[2\])

: readStdin();

const startTime = Date.now();

const data = JSON.parse(input);

const parseMs = Date.now() - startTime;

// État réactif

const searchQuery = new State("");

const matchCount = new State(0);

// Construire l'app

const app = new App("Pry", {

width: 800,

height: 600,

minWidth: 400,

minHeight: 300,

});

app.body(() => {

return VStack({ spacing: 0 }, \[

SearchBar({

placeholder: "Search keys and values...",

onSearch: (q) => searchQuery.value = q,

}),

TreeView(data, {

collapsible: true,

syntaxHighlight: true,

searchQuery: searchQuery,

onMatchCount: (n) => matchCount.value = n,

copyOnClick: true,

}),

StatusBar(\[

\`${countNodes(data)} nodes\`,

\`Parsed in ${parseMs}ms\`,

\`${matchCount.value} matches\`,

\]),

\]);

});

app.registerShortcut("/", () => app.focusSearchBar());

app.registerShortcut("Escape", () => {

searchQuery.value = "";

app.focusTree();

});

app.run();

C'est le cœur d'une application native. Pas de boilerplate de framework, pas de configuration de build, pas de fichiers spécifiques à la plateforme. Un fichier TypeScript.

### Les fonctions utilitaires

Pry inclut également un utilitaire `countNodes` qui compte récursivement tous les nœuds de l'arbre JSON, et un helper `formatBytes` pour afficher les tailles de fichiers. Ce sont des fonctions TypeScript standard — rien de spécifique à Perry. Elles compilent en code natif comme tout le reste.

utils.ts

export function countNodes(data: unknown): number {

if (data === null || typeof data !== "object") {

return 1;

}

if (Array.isArray(data)) {

return 1 + data.reduce((sum, item) => sum + countNodes(item), 0);

}

const values = Object.values(data as Record<string, unknown\>);

return 1 + values.reduce((sum, val) => sum + countNodes(val), 0);

}

## Compiler Pry

Compiler Pry avec Perry est une seule commande. Pas de projet Xcode, pas de configuration Gradle, pas de config webpack. Il suffit de pointer Perry vers le fichier d'entrée et de spécifier votre cible.

### macOS (ARM64)

$ perry build pry.ts --target macos-arm64

Parsing pry.ts...

Resolving imports: perry/ui, perry/fs

Compiling (cranelift, arm64)...

Linking with AppKit.framework...

✓ Built executable: pry (48 MB)

$ file pry

pry: Mach-O 64-bit executable arm64

$ otool -L pry | head -5

pry:

/System/Library/Frameworks/AppKit.framework/AppKit

/System/Library/Frameworks/Foundation.framework/Foundation

/usr/lib/libSystem.B.dylib

Le binaire fait 48 Mo car il inclut la pile complète d'interface AppKit — rendu de vue arborescente, surlignage de recherche, coloration syntaxique et gestion du clavier. Pour comparaison, la même app en Electron ferait plus de 200 Mo. Une app Perry en CLI seul compile à 2-5 Mo.

### iOS

$ perry build pry.ts --target ios-arm64

✓ Built executable: pry (52 MB)

La compilation iOS lie contre UIKit au lieu d'AppKit. Perry mappe la même API `TreeView` vers `UITableView` avec des sections extensibles, `SearchBar` vers `UISearchBar`, et les événements tactiles remplacent les événements souris. La compilation iOS peut être déployée sur des appareils physiques et des simulateurs.

### Android

$ perry build pry.ts --target android-arm64

✓ Built: pry.apk

La compilation Android génère une bibliothèque native chargée via JNI, empaquetée dans un APK. `TreeView` correspond à un `RecyclerView` avec des view holders extensibles, `SearchBar` à un `EditText` avec un `TextWatcher`, et la barre d'état à un `TextView` en bas de la disposition.

## Ce qui se passe sous le capot

Quand Perry compile Pry, il passe par plusieurs phases :

1.  **Analyse** — SWC analyse le code source TypeScript en AST. Les imports de `perry/ui` et `perry/fs` sont résolus vers les implémentations de modules intégrés de Perry.
2.  **Analyse de types** — Perry résout tous les types, y compris les génériques `State<string>` et `State<number>`, en les monomorphisant en types concrets.
3.  **Résolution de plateforme** — En fonction du flag de cible, Perry sélectionne le backend d'interface approprié. Chaque appel à `TreeView`, `SearchBar` et `Button` est résolu vers l'implémentation spécifique à la plateforme.
4.  **Génération IR** — Perry génère une représentation intermédiaire qui inclut des appels d'API natifs — envois de messages Objective-C pour macOS/iOS, appels JNI pour Android, appels de fonctions C pour GTK4/Win32.
5.  **Génération de code** — Cranelift compile l'IR en code machine natif pour l'architecture cible.
6.  **Liaison** — Le code natif est lié contre les frameworks de la plateforme (AppKit, UIKit, Android NDK, GTK4 ou Win32) pour produire l'exécutable final.

## Pas de runtime, pas de vues web

Cela vaut la peine d'être souligné car c'est la différence centrale entre Perry et toute autre approche TypeScript-vers-natif. Le binaire compilé de Pry a :

-   **Pas de moteur JavaScript** — pas de V8, pas de Hermes, pas de JavaScriptCore
-   **Pas de vues web** — pas de Chromium, pas de WebKit, pas de WKWebView
-   **Pas de couche bridge** — pas de messages sérialisés entre JS et natif
-   **Pas de runtime de framework** — pas de React, pas de moteur Flutter, pas de VM Dart

Le binaire appelle les APIs de la plateforme directement. Sur macOS, il appelle `objc_msgSend` pour interagir avec les objets AppKit. Sur Android, il appelle des fonctions JNI pour créer et manipuler des Views. C'est la même chose qu'une app native Swift ou Kotlin ferait.

La conséquence pratique : Pry se lance instantanément. Pas de démarrage de VM, pas de chauffe JIT, pas d'analyse de scripts. Le processus démarre, la fenêtre apparaît, le JSON est rendu. L'utilisation mémoire est une fraction de ce qu'un équivalent Electron consommerait.

## Expérience de développement

Construire Pry a été remarquablement similaire à construire n'importe quelle application TypeScript. Le workflow est :

1.  Écrire du TypeScript dans votre éditeur (VS Code, Zed, Neovim, ce que vous préférez)
2.  Exécuter `perry compile pry.ts`
3.  Exécuter `./pry test.json`
4.  Itérer

Pas de projet Xcode à configurer. Pas d'Android Studio à installer. Pas de build Gradle de 45 secondes. Le compilateur Perry lui-même est rapide — analyser et compiler Pry prend quelques secondes, et nous travaillons activement à le rendre plus rapide.

Le TypeScript que vous écrivez est du TypeScript standard. La vérification de types, l'autocomplétion et les outils de refactorisation de votre éditeur fonctionnent tous. Vous pouvez extraire des fonctions, créer des modules, utiliser des génériques — tous les patterns TypeScript que vous connaissez déjà.

## Ce que nous avons appris

Construire Pry nous a beaucoup appris sur ce que l'API d'interface de Perry doit supporter. Quelques leçons :

-   **Les vues arborescentes sont complexes.** Développer, réduire, surlignage de recherche, navigation au clavier et intégration du presse-papiers doivent être coordonnés. Le widget `TreeView` de Perry gère cela en interne, mais nous avons dû nous assurer que l'implémentation native était cohérente sur les trois plateformes.
-   **Les raccourcis clavier ont besoin des conventions de plateforme.** Sur macOS, c'est `⌘C` pour copier. Sur Linux et Android, c'est `Ctrl+C`. Le système de raccourcis de Perry abstrait cela, mais une implémentation soigneuse était nécessaire pour bien faire les choses.
-   **Les barres d'état sont étonnamment non triviales.** Chaque plateforme a une convention différente pour où et comment afficher les informations d'état. AppKit utilise la barre inférieure de la fenêtre, UIKit utilise une barre d'outils, Android utilise une vue inférieure dans la disposition. La `StatusBar` de Perry correspond correctement à chacune.
-   **Le support de stdin a nécessité une conscience de plateforme.** Sur macOS et Linux, lire depuis stdin est direct. Sur iOS et Android, stdin n'"existe" pas vraiment de la même manière, donc Pry utilise la sélection de fichiers sur les plateformes mobiles. Le `readStdin` de Perry gère cela de manière transparente.

## Performance

Pry gère confortablement les gros fichiers JSON. Dans nos tests :

-   Un fichier JSON de 1 Mo (plus de 10 000 nœuds) est analysé et rendu en moins de 50 ms
-   Un fichier JSON de 10 Mo est rendu en moins de 200 ms
-   La recherche parmi 10 000 nœuds retourne des résultats en tapant, sans délai visible
-   L'utilisation mémoire reste sous 50 Mo même pour les gros fichiers

C'est l'avantage de la compilation native. L'analyse JSON dans Perry est compilée en boucles natives serrées sans pauses du GC. Le rendu de l'arbre utilise les vues de liste virtualisées propres à la plateforme (NSOutlineView, UITableView, RecyclerView), qui sont éprouvées pour la performance.

## Code source et téléchargements

Pry est open source. Vous pouvez parcourir le code source complet, le compiler vous-même, ou simplement regarder le code pour comprendre comment une app d'interface native Perry est structurée.

-   [Dépôt GitHub](https://github.com/perryts/pry) — code source complet et instructions de compilation
-   [Page du showcase](/fr/showcase/pry/) — captures d'écran, liste des fonctionnalités et détails de plateforme

Si vous construisez quelque chose avec Perry, nous aimerions en entendre parler. Ouvrez un issue sur le [dépôt Perry](https://github.com/PerryTS/perry) ou lancez une discussion. Nous construisons Perry de manière ouverte et les retours d'utilisateurs réels construisant de vraies apps sont inestimables.
