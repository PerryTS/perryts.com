---
title: "Six plateformes, parité complète des fonctionnalités"
excerpt: "Plus de 20 widgets UI natifs, un widget Canvas, des vues tableau, des notifications système, l'accès au trousseau, le support multi-fenêtres et une parité complète des fonctionnalités sur macOS, iOS, iPadOS, Android, Linux et Windows — le tout depuis un seul code TypeScript."
date: 2026-02-28
tags: ["UI", "cross-platform", "release", "milestone"]
---
Lorsque nous avons livré la première version du système d'interface native de Perry, "multiplateforme" signifiait que macOS fonctionnait bien et que les cinq autres plateformes étaient des stubs. Aujourd'hui, avec la v0.2.162, ce n'est plus le cas. Les six plateformes — macOS, iOS, iPadOS, Android, Linux et Windows — partagent désormais une parité complète des fonctionnalités. Le même code TypeScript compile en widgets natifs sur chaque cible.

Cet article passe en revue ce que nous avons livré entre v0.2.152 et v0.2.164 : un widget Canvas, une implémentation complète de NSTableView, plus de 20 widgets d'interface au total, le module `perry/system`, le support multi-fenêtres, les notifications système, l'accès au trousseau, la réduction automatique de la taille du binaire et un système de plugins à la compilation. Il s'est passé beaucoup de choses.

## Le sprint des widgets : Plus de 20 composants d'interface natifs

Le plus grand bond est venu avec v0.2.155, qui a apporté plus de 20 widgets d'interface sur toutes les plateformes. L'API d'interface TypeScript de Perry couvre désormais les composants dont vous avez réellement besoin pour livrer une vraie application :

-   **Disposition** — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView
-   **Saisie** — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker
-   **Affichage** — Text, Label, Image, ProgressView, Divider, Spacer
-   **Données** — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)
-   **Superposition** — Alert, Sheet, Popover, Toolbar, NavigationBar
-   **Dessin** — Canvas (API de dessin 2D, accéléré matériellement par plateforme)

Ce ne sont pas des wrappers autour d'un moteur de rendu personnalisé. Chaque widget compile vers le composant natif propre à la plateforme : `NSButton` sur macOS, `UIButton` sur iOS, `GtkButton` sur Linux, `android.widget.Button` sur Android via JNI, et `CreateWindowEx` sur Windows. Le système d'exploitation les dessine, leur applique un thème et gère l'accessibilité — Perry ne fait que câbler l'API TypeScript.

## Canvas : Dessin 2D depuis TypeScript

L'une des ajouts les plus intéressants techniquement est le widget Canvas (v0.2.152). Il expose une API de dessin 2D familière directement depuis TypeScript — courbes de Bézier, remplissages, traits, transfert d'images — et compile vers le backend 2D accéléré de la plateforme : Core Graphics sur macOS/iOS, Cairo sur Linux, Direct2D sur Windows et Skia sur Android.

canvas.ts

import { Canvas, Color } from 'perry/ui';

// Compile vers Core Graphics sur macOS, Cairo sur Linux, etc.

const canvas = new Canvas({ width: 400, height: 300 });

canvas.onDraw((ctx) => {

ctx.fillStyle = Color.amber;

ctx.fillRect(10, 10, 100, 60);

ctx.strokeStyle = Color.blue;

ctx.lineWidth = 2;

ctx.beginPath();

ctx.arc(200, 150, 80, 0, Math.PI \* 2);

ctx.stroke();

});

## Widget Table : NSTableView arrive en TypeScript

v0.2.163 a apporté le widget Table — le composant le plus complexe de la bibliothèque. Sur macOS, il correspond à `NSTableView` avec tout le câblage delegate/data source. Sur Linux, il utilise `GtkTreeView` de GTK4. Sur Windows, le contrôle `ListView` de Win32. Sur Android, il se lie à `RecyclerView` via JNI.

L'API TypeScript est déclarative : vous définissez les colonnes, fournissez une source de données, et Perry gère le câblage spécifique à la plateforme à la compilation. Le tri des colonnes, la gestion de la sélection et la personnalisation de la hauteur des lignes fonctionnent directement.

table.ts

import { Table, Column } from 'perry/ui';

const table = new Table({

columns: \[

new Column({ title: "Name", key: "name", width: 200 }),

new Column({ title: "Size", key: "size", width: 80 }),

\],

rows: files, // Tableau d'objets TypeScript

onSelect: (row) => console.log(row.name),

});

## Le module perry/system

v0.2.155 a également introduit `perry/system` — un module TypeScript qui expose les APIs système de la plateforme sans aucun runtime : dialogues de fichiers, dialogues de sauvegarde, alertes, feuilles, accès au trousseau, notifications système et gestion multi-fenêtres.

-   `system.showOpenDialog()` — sélecteur de fichiers natif (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)
-   `system.showSaveDialog()` — dialogue de sauvegarde natif
-   `system.showAlert()` — panneau d'alerte natif
-   `system.notify()` — notification du système (UserNotifications / libnotify / WinRT)
-   `system.keychain.get/set()` — Keychain Services / Secret Service / Windows Credential Store
-   `system.openWindow()` — gestion multi-fenêtres

Tous ces appels utilisent directement les APIs natives de la plateforme — pas d'IPC Electron, pas de pont de vue web. Perry compile le site d'appel TypeScript en un appel de fonction native direct vers le SDK de la plateforme.

## Parité des fonctionnalités sur six plateformes : v0.2.162

Le jalon v0.2.162 visait à combler les lacunes. Avant cette version, macOS avait l'ensemble de fonctionnalités le plus complet, iOS était presque au point, et Linux/Windows/Android étaient en retard. v0.2.162 a amené les six plateformes au même niveau :

-   **macOS** — AppKit, ensemble complet de widgets, Trousseau, notifications, multi-fenêtres, barre d'outils
-   **iOS / iPadOS** — UIKit, parité complète de widgets avec macOS, cycle de vie de scène
-   **Android** — pont JNI, tous les widgets via Android Views, compilation croisée NDK
-   **Linux** — GTK4, ensemble complet de widgets y compris Table, dialogues de fichiers, trousseau libsecret
-   **Windows** — Win32, tous les widgets, Windows Credential Store, notifications WinRT

C'est le jalon qui rend "une base de code, six plateformes" réel plutôt qu'aspirationnel. Le même fichier TypeScript compile en applications natives sur les six cibles sans chemins de code spécifiques à la plateforme pour les cas d'utilisation courants.

## Réduction automatique de la taille du binaire

v0.2.153 a livré la réduction automatique de la taille du binaire — le compilateur élimine désormais agressivement les chemins de code inutilisés, supprime les fonctions stdlib inaccessibles et déduplique les définitions de symboles lors de l'édition de liens. Un outil CLI typique qui compilait auparavant à ~4 Mo se retrouve désormais sous les 2 Mo sans aucun changement dans votre code source.

Cela compte pour les déploiements réels. Quand votre binaire est l'unité de déploiement — copié sur un serveur, distribué en fichier unique, intégré dans un conteneur — la taille affecte directement le temps de transfert et le coût de stockage. Réduire de moitié la taille du binaire gratuitement est une amélioration significative.

## Le système de plugins à la compilation

v0.2.152 a introduit le système de plugins de Perry — et il est architecturalement différent de tout autre système de plugins dans l'écosystème TypeScript. Il n'y a pas de chargement de plugins à l'exécution, pas d'IPC, pas de `require()` dynamique. Les plugins sont des modules TypeScript que Perry résout et compile au moment de la construction.

Le résultat : les plugins ont exactement zéro surcharge à l'exécution. Ils sont compilés dans le même binaire que le code de votre application, avec des appels de fonction directs entre le code du plugin et le code hôte. Si vous n'utilisez pas un plugin, il n'apparaît pas dans votre binaire. Si vous l'utilisez, il est inliné comme n'importe quel autre module.

Nous avons écrit sur la philosophie derrière cela dans [Les systèmes de plugins sont un impôt sur la performance](/fr/blog/plugin-systems-are-a-performance-tax/). La version courte : les architectures de plugins à l'exécution échangent la performance contre l'extensibilité. La composition à la compilation vous donne les deux.

## Améliorations du langage

Le sprint d'interface ne s'est pas produit de manière isolée — le compilateur lui-même est devenu de plus en plus capable. À travers ces versions :

-   **Expressions de classe** — `const Foo = class extends Bar {}` compile désormais correctement
-   **Transformations de générateurs** — `function*` et `yield` compilent en machines à états natives
-   **Map/Set comme champs de classe** — `private items = new Map()` fonctionne en codegen
-   **Coercition des types de paramètres FFI** — les appels aux bibliothèques natives gèrent automatiquement la coercition de type
-   **Références de méthodes liées** — les références `this.method` fonctionnent pour les modules natifs (fs, os, path)
-   `string.match()` — désormais entièrement supporté
-   `path.isAbsolute()`, `path.join()` multi-arguments, `path.resolve()`
-   **Cible web** — Perry peut désormais compiler vers une sortie compatible web pour les déploiements hybrides

## Et ensuite

Avec la parité d'interface sur six plateformes livrée, la prochaine phase est la profondeur plutôt que l'étendue. Nous travaillons sur :

-   Support complet des RegExp (`regex.test()`, `string.matchAll()`)
-   Glisser-déposer, menus contextuels personnalisés et labels d'accessibilité dans le système de widgets
-   Une extension VS Code pour les diagnostics Perry et la compilation à la sauvegarde
-   Intégration du gestionnaire de paquets — installer et compiler des paquets natifs Perry en une seule commande
-   Cible de compilation WASM pour le déploiement navigateur
-   Multi-threading via les threads `Worker`

Si vous voulez suivre le développement, le [dépôt Perry](https://github.com/PerryTS/perry) est ouvert. Consultez le [showcase](/fr/showcase/) pour voir ce qui est déjà construit, ou parcourez la [feuille de route](/fr/roadmap/) pour le tableau complet.
