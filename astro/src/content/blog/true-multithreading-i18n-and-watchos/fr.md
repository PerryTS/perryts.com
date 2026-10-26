---
title: "Vrai multi-threading, i18n au moment de la compilation et watchOS"
excerpt: "Perry v0.4.0 : de vrais threads OS avec sûreté au moment de la compilation, un système d'internationalisation sans cérémonie pour plus de 30 langues, watchOS comme 9e cible de compilation, des APIs audio et caméra, et un pipeline de compilation parallèle."
date: 2026-03-23
tags: ["threading", "i18n", "watchOS", "compiler", "milestone"]
---
Perry v0.4.0 est la plus grande version depuis le début du projet. Trois sauts de version en un seul cycle — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (multi-threading) — et le compilateur lui-même est désormais parallèle. Voici tout ce qui a été livré.

## Vrai multi-threading

Perry dispose désormais d'un vrai parallélisme basé sur les threads du système d'exploitation. Pas de web workers avec surcharge de sérialisation. Pas de `SharedArrayBuffer` avec `Atomics`. De vrais threads — des threads OS légers avec une pile de 8 Mo qui ne partagent rien et ne coûtent rien au repos.

Le nouveau module `perry/thread` expose trois primitives :

```
import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Répartir le travail sur tous les cœurs CPU, résultats dans l'ordre
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filtrer en parallèle
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Lancer un thread en arrière-plan, obtenir une Promise
const result = await spawn(() => {
  // s'exécute sur un thread OS séparé
  return computeExpensiveResult();
});
```

`parallelMap` et `parallelFilter` détectent automatiquement le nombre de cœurs CPU et répartissent le tableau d'entrée entre eux. Pour les petits tableaux, le threading est complètement ignoré et l'exécution est synchrone — aucune surcharge pour les charges de travail triviales.

`spawn` lance un thread OS en arrière-plan et retourne une Promise. Le résultat revient via une file de résultats en attente qui est vidée pendant le traitement des microtâches, ce qui permet de l'utiliser avec `await` comme toute autre opération asynchrone.

### Sécurité à la compilation

La partie la plus importante n'est pas l'API — c'est ce que le compilateur *empêche*. Perry rejette statiquement les closures qui capturent des variables mutables :

```
let counter = 0;

// ✗ Erreur de compilation : closure capture la variable mutable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejeté à la compilation
  return item * 2;
});
```

Pas d'état mutable partagé signifie pas de courses de données. Pas de verrous, pas de mutex, pas d'`Atomics`. Le compilateur impose la sécurité des threads avant qu'une seule ligne de code machine ne soit émise.

### Sous le capot

Chaque thread worker obtient sa propre arène mémoire avec nettoyage `Drop` — pas de coordination GC entre les threads. Les valeurs sont transférées via une copie profonde `SerializedValue` : coût nul pour les nombres, O(n) pour les chaînes, tableaux et objets. L'implémentation tient dans un seul fichier Rust de 1 120 lignes (`perry-runtime/src/thread.rs`) et n'a nécessité aucune modification du ramasse-miettes.

À comparer avec les isolats V8, qui nécessitent des heaps séparés par worker avec ~2 Mo de surcharge chacun. Les threads de Perry sont simplement des pthreads avec des arènes.

### Pipeline de compilation parallèle

Le compilateur lui-même est désormais parallèle aussi. La génération de code des modules, les passes de transformation (imports JS, instances natives, monomorphisation) et le scan de symboles `nm` s'exécutent sur tous les cœurs CPU via rayon. Combiné avec la mise à niveau vers Cranelift 0.121 (depuis 0.113 — huit versions mineures d'allocation de registres et d'améliorations x64), la compilation est nettement plus rapide.

## i18n à la compilation (v0.3.0)

Le système d'internationalisation de Perry est sans cérémonie. Les littéraux de chaîne dans les widgets d'interface sont automatiquement traités comme des clés localisables. Les fichiers de traduction sont du JSON plat dans un répertoire `locales/`. Toute la validation se fait à la compilation.

```
// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Votre code — utilisez les chaînes normalement
Button({ title: "greeting", action: () => {} })
```

Le compilateur valide tout : traductions manquantes, décalages de paramètres, erreurs de formes plurielles. Les traductions sont intégrées dans le binaire sous forme de table de chaînes 2D embarquée avec une recherche quasi nulle à l'exécution — pas d'analyse JSON au démarrage.

### Ce qui est inclus

-   **Règles de pluriel CLDR** pour plus de 30 locales avec les suffixes `.one`/`.other`/`.few`/`.many`/`.zero`/`.two`
-   **Wrappers de format** : `Currency`, `Percent`, `ShortDate`, `LongDate`, `FormatNumber`, `FormatTime`, `Raw`
-   **Détection native de la locale** sur toutes les plateformes : `CFLocaleCopyCurrent` (macOS/iOS), `GetUserDefaultLocaleName` (Windows), `system_property_get` (Android), `LANG`/`LC_ALL` (Linux)
-   **`perry i18n extract`** CLI : scanne les fichiers TS/TSX, génère et met à jour les fichiers JSON de locale
-   **Génération de ressources natives par plateforme** : répertoires iOS `.lproj` et Android `values-xx/`
-   **`import { t } from "perry/i18n"`** pour localiser les chaînes hors interface

Configuration dans `perry.toml` :

```
[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }
```

## Apps watchOS natives (v0.3.2)

Perry compile désormais pour watchOS — la 9e cible de compilation. Ce n'est pas un wrapper ni une app companion. C'est un binaire watchOS autonome avec une interface SwiftUI native.

Le moteur de rendu watchOS utilise une **approche pilotée par les données** : Perry construit un arbre d'interface via les appels FFI `perry_ui_*`, et un fichier `PerryWatchApp.swift` fourni interroge l'arbre et rend les vues SwiftUI de manière réactive. 15 types de widgets sont supportés avec des stubs pour ceux non supportés.

```
# Compiler pour watchOS
perry compile main.ts --target watchos

# Exécuter sur le simulateur Apple Watch
perry run watchos

# Configurer la signature pour watchOS
perry setup watchos
```

Le flux complet fonctionne : `perry setup watchos` partage les identifiants App Store Connect avec iOS, `perry run watchos` détecte automatiquement les simulateurs Apple Watch, et `perry publish watchos` soumet à l'App Store.

Cela porte également le nombre total de **cibles de widgets à quatre** : iOS (WidgetKit), Android (Glance), watchOS (WidgetKit) et Wear OS (Tiles). Chacun a sa propre cible de compilation et son backend de génération de code.

## APIs audio et caméra

Deux nouvelles APIs matérielles sont livrées dans cette version :

### Capture audio (`perry/system`)

Capture audio multiplateforme avec mesure dB(A) pondérée A :

```
import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) avec lissage EMA
const waveform = audioGetWaveformSamples();  // buffer circulaire de 256 échantillons
audioStop();
```

Backends par plateforme : AVAudioEngine (macOS/iOS), AudioRecord via JNI (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web).

### Capture caméra (`perry/ui`)

Aperçu caméra natif avec échantillonnage de couleur au niveau du pixel (iOS) :

```
import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // moyenne 5x5
```

## Paquets de l'écosystème

Deux paquets natifs de première partie ont été lancés :

-   **perry/push** — Bindings de notifications push pour iOS/macOS : demandes de permission, récupération de token APNs, compteur de badges. Stub Android avec FCM prévu.
-   **perry/storekit** — Bindings d'achats in-app StoreKit 2 : chargement de produits, achats avec reçus JWS, vérification d'abonnements, restauration et écouteurs de transactions.

Les deux suivent la même architecture : déclarations TypeScript → crate FFI Rust → pont Swift. Installer comme dépendance, importer les fonctions, `await` les résultats. Le compilateur gère tout le pontage natif.

## Infrastructure

-   **Cranelift 0.113 → 0.121** — huit versions mineures d'allocation de registres, corrections x64 et améliorations d'alignement des slots de pile
-   **Découpage de fonctions Windows** — découpe automatiquement les fonctions de plus de 50 instructions en continuations pour contourner les problèmes de codegen Cranelift sur Windows
-   **Chargement sélectif des variables de module** — ne charge que les variables de niveau module référencées à l'entrée de fonction, réduisant la taille du binaire Windows de 26 %
-   **Amélioration d'Array.sort()** — du tri par insertion O(n²) au tri hybride TimSort O(n log n)
-   **perry run android** — pipeline complet de compilation APK : compilation, génération de projet Gradle, assembleDebug, installation, lancement
-   **Entrées Info.plist personnalisées** — `[ios.info_plist]` dans perry.toml pour les descriptions de confidentialité, schémas d'URL, modes d'arrière-plan

## En chiffres

-   **Version** : 0.2.197 → 0.4.0 (trois jalons majeurs)
-   **Cibles de compilation** : 8 → 9 (ajout de watchOS)
-   **Cibles de widgets** : 1 → 4 (iOS, Android, watchOS, Wear OS)
-   **Nouveaux crates** : perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles
-   **Nouvelle documentation** : threading (4 pages), i18n (4 pages), watchOS, docs widgets étendus (3 → 8 pages)
-   **Implémentation de perry/thread** : 1 120 lignes de Rust, zéro modification du GC

## Et ensuite

La fondation du threading ouvre de nombreuses possibilités : traitement parallèle des requêtes HTTP, opérations de fichiers concurrentes et charges de travail lourdes en calcul qui étaient auparavant bloquées par l'exécution mono-thread. Côté langage, le support complet des regex reste la plus grande lacune, et l'expansion de `perry/ui` (glisser-déposer, accessibilité, DatePicker) continue.

Suivez la progression sur [GitHub](https://github.com/PerryTS/perry), lisez la documentation sur [docs.perryts.com](https://docs.perryts.com), ou consultez la [feuille de route](/fr/roadmap/) pour le tableau complet.
