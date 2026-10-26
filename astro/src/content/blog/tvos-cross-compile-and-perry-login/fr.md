---
title: "tvOS, compilation croisée iOS depuis Linux et Perry Login"
excerpt: "Perry v0.4.24 : tvOS comme 10e cible de compilation, compilation croisée iOS et macOS depuis Linux via ld64.lld, perry login avec facturation à l'usage, refonte de l'UI Windows, notarisation macOS et 120 commits en 5 jours."
date: 2026-03-28
tags: ["tvOS", "cross-compilation", "billing", "Windows", "milestone"]
---
Cinq jours, 120 commits, et Perry passe de v0.4.0 à v0.4.24. Les points forts : tvOS devient la 10e cible de compilation, les apps iOS et macOS peuvent désormais être construites entièrement depuis Linux, perry login apporte la facturation à l'usage, et l'interface Windows reçoit une refonte complète. Voici tout ce qui a été livré.

## tvOS : La 10e cible de compilation

Perry compile désormais pour Apple TV. La cible tvOS utilise le même moteur de rendu SwiftUI que watchOS, partageant l'architecture pilotée par les données où Perry construit un arbre d'interface et une app hôte Swift livrée le rend nativement. Combiné avec l'intégration WASM existante de `@perry/threads`, les apps tvOS peuvent exécuter des charges de travail lourdes en arrière-plan tout en gardant l'interface réactive.

```
# Compiler pour Apple TV
perry compile main.ts --target tvos

# Exécuter sur le simulateur tvOS
perry run tvos
```

Cela porte le nombre total de cibles à **10** : macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly et Web/JavaScript. Une base de code TypeScript, dix sorties natives.

## Compilation croisée iOS et macOS depuis Linux

Perry peut désormais construire des binaires iOS et macOS entièrement depuis une machine Linux en utilisant `ld64.lld` comme éditeur de liens Mach-O. C'est la pièce manquante pour un CI/CD entièrement automatisé — envoyer du TypeScript sur un serveur Linux et obtenir des binaires natifs signés pour chaque plateforme Apple sans machine de compilation macOS.

Y parvenir a nécessité la résolution d'une cascade de problèmes d'édition de liens :

-   **Triple de codegen Mach-O** — ajout des triples cibles `aarch64-apple-macos` et `aarch64-apple-ios` pour Cranelift
-   **Liaison de frameworks** — chemins de recherche des frameworks CoreGraphics, Metal, IOKit, DiskArbitration pour la compilation croisée
-   **`-lobjc`** — symboles du runtime ObjC nécessaires pour toutes les cibles Apple
-   **Version du SDK** — `sdk_version 26.0` dans ld64.lld (Apple exige iOS 18+)
-   **Dead stripping** — `-dead_strip` au lieu de `-Wl,-dead_strip` pour l'éditeur de liens Mach-O
-   **Déduplication du runtime** — suppression des doublons de `perry_runtime` dans les bibliothèques statiques UI pour éviter les erreurs de liaison

Combiné avec la compilation croisée existante Linux → Windows (v0.2.195+), Perry peut désormais effectuer une compilation croisée vers **toutes les plateformes depuis Linux** — iOS, macOS, Windows, Android, WASM et Web.

## Conformité App Store iOS

Un axe majeur de ce cycle était de rendre les apps iOS compilées par Perry entièrement conformes à l'App Store :

-   **Info.plist complet** — toutes les clés requises par Apple : `CFBundleIdentifier`, `CFBundleName`, `CFBundleShortVersionString`, `CFBundleVersion`, `UIDeviceFamily`, `UIRequiredDeviceCapabilities`
-   **CFBundleIcons** — nommage standard des icônes iOS (`AppIcon60x60@2x`, etc.) avec résolution de secours
-   **Version depuis perry.toml** — les champs `version` et `build_number` alimentent directement l'Info.plist
-   **UILaunchScreen** — utilise la clé moderne au lieu de `UILaunchStoryboardName` (pas de fichier storyboard nécessaire)
-   **Profils de provisionnement** — prise en charge des profils de provisionnement macOS pour la distribution App Store et TestFlight

## Perry Login et facturation

Perry dispose désormais de comptes et d'une facturation à l'usage, alimentés par une nouvelle commande CLI `perry login` et un tableau de bord sur [app.perryts.com](https://app.perryts.com).

### Comment ça fonctionne

-   **`perry login`** — flux d'authentification GitHub OAuth par appareil, ouvre le navigateur, interroge l'état de complétion
-   **Offre gratuite** — 15 compilations/mois, projets illimités avec un compte GitHub
-   **Offre Pro** — compilations illimitées via abonnement Polar.sh
-   **Jetons d'API** — générer et gérer des jetons depuis le tableau de bord pour le CI/CD
-   **Suivi d'utilisation** — compteurs mensuels de publication et vérification avec barres d'utilisation en temps réel

Le tableau de bord lui-même est un serveur Fastify compilé par Perry avec une exportation statique Next.js — construit avec Perry, au service des utilisateurs Perry.

## Notarisation macOS et signature de code

Deux nouvelles capacités de signature :

-   **`perry publish macos --notarize`** — bascule automatiquement vers le certificat Developer ID (au lieu du certificat App Store), soumet au service de notarisation d'Apple et agrafe le résultat
-   **Signature de code GCloud KMS** — les compilations Windows peuvent désormais être signées avec des clés Google Cloud KMS, permettant une signature automatisée en CI sans exposer les clés privées

## Refonte de l'interface Windows

Le backend de l'interface Windows a reçu sa mise à jour la plus complète à ce jour :

-   **Mise à l'échelle sensible au DPI** — la taille des fenêtres, les polices et les dimensions des widgets s'adaptent correctement sur les écrans haute résolution
-   **APIs de fenêtre de type lanceur** — fenêtres sans bordure avec positionnement personnalisé pour les interfaces de type lanceur/spotlight
-   **Raccourcis clavier globaux** — raccourcis clavier système qui fonctionnent même lorsque l'application n'est pas au premier plan
-   **Icônes d'application** — API `getAppIcon` pour afficher les icônes d'application dans les interfaces de type lanceur
-   **Disposition sûre en cas de réentrance** — le rendu basé sur `RefCell` a été remplacé par le stockage HWND `SetPropW` pour éviter les panics lors de messages WM\_PAINT imbriqués
-   **Intégration Geisterhand** — tous les types de widgets enregistrés auprès du framework de test d'interface, `/type` utilise `SendMessageW` via la carte HWND
-   **Support caméra Android** — API de capture caméra étendue à Android via JNI

## Performance

v0.4.14 a livré un audit de performance complet :

-   **`fcmp` natif** — les comparaisons en virgule flottante utilisent les instructions CPU natives au lieu d'appels de fonctions du runtime. Benchmark Mandelbrot **30 % plus rapide**.
-   **Append de chaîne in-place** — `str += "text"` modifie le tampon directement au lieu d'allouer une nouvelle chaîne. **125x plus rapide** pour la concaténation répétée.
-   **Court-circuit AND/OR** — `&&` et `||` sautent l'évaluation de l'opérande droit lorsque le résultat est déjà déterminé.
-   **Repliement des littéraux négatifs** — `-1`, `-0.5` etc. sont repliés en constantes au niveau HIR au lieu d'émettre une instruction de négation.

## Compilations parallèles du Hub

Le serveur d'orchestration de compilation prend désormais en charge les compilations concurrentes par worker :

-   **Dispatch basé sur les slots** — les workers signalent leur capacité `max_concurrent`, le Hub suit les tâches actives par worker
-   **Plus de 429** — les tâches sont mises en file d'attente au lieu d'être rejetées quand tous les workers sont occupés
-   **Téléchargements d'artefacts en Base64** — les artefacts binaires sont servis en Base64 lorsque le runtime Perry ne peut pas gérer les réponses HTTP binaires brutes
-   **WebSocket avec reconnexion automatique** — les connexions de surveillance de compilation se reconnectent automatiquement en cas de déconnexion

## Nouveau paquet : perry/appstorereview

Un nouveau paquet de première partie pour demander des avis sur les magasins d'applications :

```
import { requestReview } from "perry/appstorereview";

// Ouvre la boîte de dialogue native d'avis
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();
```

Une fonction, deux plateformes, interface d'avis native. Le timing et la logique d'affichage sont entièrement laissés au développeur.

## Corrections de codegen

120 commits signifient beaucoup de corrections de bugs. Les plus impactantes :

-   **Égalité stricte (===)** — trois bugs distincts corrigés dans v0.4.2 : comparaison d'étiquettes de type, gestion de NaN et distinction null/undefined
-   **Comparaison de chaînes concaténées** — `===` échouait en comparant des chaînes construites par concaténation en raison d'une comparaison de pointeurs au lieu du contenu
-   **Résolution des constructeurs** — `new X(args)` résout désormais correctement les constructeurs importés entre modules et les fonctions constructrices basées sur des closures
-   **Push d'array au niveau module** — les valeurs ajoutées aux arrays de niveau module dans des appels de fonctions imbriqués dans des boucles étaient perdues à cause de pointeurs obsolètes après réallocation
-   **Coercition arithmétique de null** — `null + 1` produit désormais correctement `1` via `js_number_coerce`
-   **Wrapping du NOT bit à bit** — `~x` est désormais ramené à i32 conformément à la sémantique ECMAScript
-   **fetch().then()** — les callbacks ne se déclenchaient jamais dans les apps UI natives en raison d'un manque de vidange de la boucle d'événements (v0.4.3)
-   **Modulo et exponentiation WASM** — les opérateurs `%` et `**` causaient des erreurs de validation WASM (v0.4.5)

## En chiffres

-   **~120 commits** sur le compilateur principal Perry en 5 jours
-   **24 versions correctives** : v0.4.1 → v0.4.24
-   **Cibles de compilation** : 9 → 10 (ajout de tvOS)
-   **Cibles de compilation croisée depuis Linux** : Windows → Windows, iOS, macOS (tout Apple + Windows)
-   **Nouveaux paquets** : perry/appstorereview
-   **Nouvelle infrastructure** : tableau de bord app.perryts.com, CLI perry login, facturation Polar.sh
-   **Gains de performance** : Mandelbrot 30 % plus rapide (fcmp natif), concaténation de chaînes 125x plus rapide

## Et ensuite

La compilation croisée d'iOS et macOS depuis Linux signifie que le Hub peut désormais compiler pour chaque plateforme depuis un seul serveur Linux — plus besoin de machines de compilation macOS dédiées pour la compilation (uniquement pour la signature). L'infrastructure de facturation ouvre la voie à la bêta publique du Hub. Et avec l'ajout de tvOS, Perry couvre chaque plateforme Apple : macOS, iOS, iPadOS, watchOS et tvOS.

-   **Bêta publique du Hub** — les utilisateurs externes peuvent envoyer du TypeScript et obtenir des binaires natifs
-   **Support complet des regex** — la dernière grande lacune du langage
-   **Extension de perry/ui** — glisser-déposer, accessibilité, DatePicker
-   **Source maps & informations de débogage** — informations de débogage DWARF pour le débogage natif

Suivez la progression sur [GitHub](https://github.com/PerryTS/perry), lisez la documentation sur [docs.perryts.com](https://docs.perryts.com), ou consultez la [feuille de route](/fr/roadmap/) pour le tableau complet.
