---
title: "Le pipeline complet : documentation, distribution et WidgetKit"
excerpt: "82 commits en une semaine : un site de documentation de 49 pages, la publication automatisée sur l'App Store et le Play Store, des paquets Homebrew et APT, des extensions WidgetKit natives depuis TypeScript, de nouveaux widgets, des modules http/https et un compilateur LLVM auto-hébergé."
date: 2026-03-13
tags: ["distribution", "documentation", "WidgetKit", "milestone"]
---
82 commits en sept jours. Un site de documentation de 49 pages. Publication automatisée sur l'App Store et le Play Store. Paquets Homebrew et APT. Extensions natives WidgetKit compilées depuis TypeScript. Un compilateur LLVM auto-hébergé. Et des dizaines de corrections de bugs sur chaque plateforme.

Cet article couvre tout ce qui a été livré dans Perry entre le 6 et le 13 mars 2026. Le thème est la complétion — combler les lacunes entre "j'ai écrit du TypeScript" et "mon app est sur l'App Store."

## docs.perryts.com

Perry dispose désormais d'un vrai site de documentation. 49 pages construites avec mdBook, couvrant tout, du démarrage à la référence CLI. La documentation est organisée en sections :

-   **Démarrage** — installation, premier projet, structure du projet
-   **Fonctionnalités du langage** — tout ce que Perry supporte de TypeScript
-   **Interface native** — 12 pages couvrant tous les types de widgets, la disposition, la gestion d'état et le comportement spécifique à la plateforme
-   **Plateformes** — pages dédiées pour chacune des 6 plateformes cibles
-   **Bibliothèque standard** — plus de 50 implémentations de paquets natifs documentées
-   **APIs système** — dialogues de fichiers, trousseau, notifications, multi-fenêtres
-   **WidgetKit** — le nouveau module d'extensions de widgets
-   **Plugins** — architecture de plugins à la compilation
-   **Référence CLI** — chaque commande et flag

Le site inclut également un fichier `llms.txt` pour la découvrabilité par l'IA, et est déployé via GitHub Pages avec un domaine personnalisé sur [docs.perryts.com](https://docs.perryts.com).

## Installer Perry en une commande

Perry est désormais distribué via Homebrew et APT, en plus de la compilation depuis les sources. Un nouveau pipeline de release GitHub Actions compile des binaires pour macOS (arm64 et x86\_64) et Linux (x86\_64 et arm64), puis met automatiquement à jour le tap Homebrew et le dépôt APT.

```text
# macOS
brew tap PerryTS/perry
brew install perry
# Debian/Ubuntu
sudo apt update && sudo apt install perry
```

Fini de cloner le dépôt et de compiler avec Cargo. Installez Perry comme n'importe quel autre outil.

## Publication automatisée sur l'App Store

C'est le changement qui élimine le plus d'étapes manuelles. Exécuter `perry publish ios` gère désormais automatiquement tout le pipeline de distribution iOS :

1.  Génère une clé RSA et un CSR via l'API App Store Connect
2.  Crée un certificat de distribution et l'empaquette dans un `.p12`
3.  Enregistre le bundle ID
4.  Crée et télécharge un profil de provisionnement
5.  Crée l'enregistrement de l'app sur App Store Connect
6.  Compile, signe et téléverse vers TestFlight ou l'App Store

Pas de Xcode. Pas de visites manuelles du portail. Pas de téléchargement de certificats depuis un navigateur. L'assistant de configuration s'exécute automatiquement la première fois que vous publiez, guidant la configuration de la clé API et stockant les identifiants dans `perry.toml`.

La distribution macOS est tout aussi automatisée. Perry supporte trois modes : TestFlight, DMG notarisé et un nouveau mode **"both"** qui publie sur l'App Store et crée un DMG notarisé simultanément. Trois types de certificats sont auto-générés : `MAC_APP_DISTRIBUTION`, `MAC_INSTALLER_DISTRIBUTION` et `DEVELOPER_ID_APPLICATION`.

La publication Android a également gagné un assistant de configuration à déclenchement automatique. Les trois plateformes suivent désormais le même schéma : la première exécution déclenche la configuration, les identifiants sont sauvegardés dans le projet, les exécutions suivantes sont sans configuration.

La validation pré-vol détecte les problèmes avant le début de la compilation — décalage de bundle ID du profil de provisionnement, expiration de certificat, icône d'app manquante, format de version invalide, mauvais ID d'équipe. Et `encryption_exempt` dans `perry.toml [ios]` définit automatiquement la clé `ITSAppUsesNonExemptEncryption` de l'Info.plist, sautant l'invite manuelle de conformité d'exportation dans App Store Connect.

## perry/widget : WidgetKit depuis TypeScript

Perry peut désormais compiler du TypeScript en extensions natives SwiftUI WidgetKit. Ce n'est pas un wrapper ni un bridge — le compilateur parcourt l'arbre de rendu au niveau HIR et émet du code source SwiftUI directement. Le résultat est un bundle d'extension WidgetKit complet que Xcode (ou le pipeline de compilation de Perry) peut intégrer dans votre app.

```text
perry widget.ts --target ios-widget --app-bundle-id com.example.app -o out/
```

L'approche est fondamentalement différente du reste de la compilation Perry. Le code Perry normal passe par Cranelift vers du code machine natif. Le code de widget passe par la HIR vers du texte SwiftUI, car WidgetKit exige SwiftUI — il n'y a pas moyen de construire une extension widget avec du code impératif UIKit ou AppKit. Perry résout cela en traitant l'arbre de rendu du widget comme un template à la compilation, pas du code à l'exécution.

## Nouveaux widgets et améliorations de plateforme

Quatre nouveaux types de widgets ont atterri cette semaine :

-   **TextArea** — édition de texte multiligne sur macOS, iOS et Android
-   **SecureField** — saisie de mot de passe sur iOS et macOS
-   **QR Code** — génération native de codes QR sur iOS, macOS et Android
-   **Splash Screen** — storyboards LaunchScreen auto-générés (iOS) et thèmes splash (Android)

### L'iPad devient natif

Perry génère désormais des apps entièrement natives iPad : `UIDeviceFamily [1,2]`, support d'orientation, `UIRequiresFullScreen` et un storyboard LaunchScreen compilé via ibtool. Une nouvelle fonction `getDeviceIdiom()` détecte téléphone vs. iPad à l'exécution, et `PerryFrameSplit` fournit des conteneurs de division horizontale basés sur les frames pour les dispositions iPad.

### Windows

Windows a reçu le support des minuteries (tick de 50ms `WM_TIMER`), des boutons owner-drawn avec des fonds de thème sombre et des corrections pour un bug use-after-free dans `to_wide().as_ptr()` sur 18 fichiers de widgets. Le runtime V8 fonctionne désormais sur Windows avec les bibliothèques système requises liées.

### GTK4 (Linux)

Le backend GTK4 a reçu un polissage visuel pour correspondre à macOS : CSS padding pour les edge insets, style de boutons Adwaita, corrections de marges VStack et politique horizontale de ScrollView.

## http/https et better-sqlite3

Deux ajouts significatifs à la stdlib :

Les nouveaux modules natifs `http` et `https` fournissent du HTTP côté client utilisant reqwest en interne. L'API correspond à Node.js : `request()`, `get()`, `ClientRequest` avec write/end/on et `IncomingMessage` avec statusCode et gestionnaires d'événements.

`better-sqlite3` est désormais entièrement supporté : `new Database()`, `prepare`, `exec`, `run`, `get`, `all` — avec un NaN-boxing correct et des objets de ligne avec accès aux propriétés nommées.

Autres améliorations de la stdlib : `crypto.randomBytes()` retourne désormais un Buffer (correspondant à Node.js), MongoDB a gagné `listDatabases` et `listCollections` avec des corrections de thread-safety, et mysql2 INSERT/UPDATE/DELETE retourne désormais `ResultSetHeader` avec `insertId`.

## Corrections du GC et de correction

Plusieurs corrections critiques du ramasse-miettes et de correction du runtime ont été livrées cette semaine :

-   **Garde de réentrance du GC** — empêche la collecte pendant l'allocation, corrigeant les panics de double-emprunt RefCell
-   **Traçage de Map du GC** — les Maps sont désormais correctement tracées pendant la phase de marquage, empêchant la collecte des clés string
-   **Correction d'aliasing de chaînes** — l'append de chaîne alloue désormais toujours des chaînes fraîches, corrigeant la corruption par aliasing de copie de pointeur
-   **Arithmétique BigInt** — le décalage à droite utilise un décalage arithmétique pour les nombres négatifs, les opérations bit à bit utilisent la sémantique de wrapping ToInt32
-   **Map.get() undefined** — retourne le bon `TAG_UNDEFINED` pour les clés manquantes au lieu d'un mauvais tag NaN
-   **Racines GC de champs statiques** — les valeurs BigInt dans les champs statiques de classes enregistrées comme racines GC

Ce ne sont pas des détails mineurs. La correction de réentrance du GC à elle seule a résolu toute une classe de crashes intermittents. La correction d'aliasing de chaînes affectait tout programme qui assignait une variable string à une autre puis mutait l'une des deux. Ce sont le type de bugs qui ne se manifestent que sous des charges de travail réelles, et les corriger est ce qui rend le compilateur apte à la production.

## perry-verify : Endurci

`perry-verify`, le service de vérification automatisée d'apps, a reçu un durcissement de sécurité : exécution en bac à sable via `bwrap` sur Linux et `sandbox-exec` sur macOS, jetons d'auth sur le handshake WebSocket et le téléchargement de binaires, limitation de débit par IP, IDs de tâche UUID complets pour empêcher l'énumération et limites de corps réduites.

## perrysdad : Le compilateur auto-hébergé

En parallèle, `perrysdad` — un compilateur LLVM IR auto-hébergé écrit en TypeScript — est passé de zéro à l'auto-compilation en cinq phases pendant la semaine :

1.  **Phase 0-1** — squelette de bout en bout : HIR vers texte LLVM IR vers clang, lié contre `libperry_runtime.a` de Perry
2.  **Phase 2** — parser à descente récursive fait main avec parsing d'expressions Pratt pour de vrais fichiers `.ts`
3.  **Phase 3** — tableaux, objets et maps avec FFI runtime, plus correction d'un décalage ABI critique (JSValue déclaré comme double en LLVM IR au lieu de i64)
4.  **Phase 4** — classes, enums, closures, compilation multi-fichiers avec découverte de modules et tri topologique

Le jalon : le binaire `anvil` auto-compilé peut désormais compiler des programmes de test et produire une sortie correcte correspondant à la version compilée par node. Un compilateur TypeScript, compilé par Perry en code natif, compilant plus de TypeScript en code natif. Des tortues tout en bas.

## En chiffres

-   **82 commits** sur le compilateur principal Perry
-   **1 release** : v0.2.173 (8 mars)
-   **49 pages de documentation** sur docs.perryts.com
-   **4 nouveaux widgets** : TextArea, SecureField, QR Code, Splash Screen
-   **3 canaux de distribution** : Homebrew, APT, source
-   **3 pipelines de store automatisés** : App Store, TestFlight, Google Play
-   **Les 6 plateformes** ont reçu des améliorations cette semaine

## Et ensuite

Le pipeline se remplit. Vous pouvez écrire du TypeScript, compiler vers six plateformes, distribuer via Homebrew ou APT, publier sur l'App Store et le Play Store, ajouter des widgets d'écran d'accueil et lire une documentation complète — le tout sans quitter la toolchain de Perry. Ce qui reste :

-   **Support complet des regex** — la dernière grande lacune du langage
-   **Extension de perry/ui** — glisser-déposer, labels d'accessibilité, DatePicker
-   **Maturation de perrysdad** — étendre le compilateur auto-hébergé vers la parité complète avec Perry
-   **Bêta publique du Hub** — ouvrir les compilations distribuées aux utilisateurs externes

Suivez la progression sur [GitHub](https://github.com/PerryTS/perry), lisez la nouvelle documentation sur [docs.perryts.com](https://docs.perryts.com), ou consultez la [feuille de route](/fr/roadmap/) pour le tableau complet.
