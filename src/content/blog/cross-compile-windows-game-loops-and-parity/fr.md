---
title: "Compilation croisée vers Windows, boucles de jeu iOS et 100 % de parité de tests"
excerpt: "103 commits en une semaine : compilation croisée vers Windows depuis Linux via lld-link, support des boucles de jeu iOS, rapport de plantages, un pipeline de build Hub en deux étapes et le compilateur auto-hébergé atteint 68/68 de parité de tests déterministes."
date: 2026-03-20
tags: ["compiler", "cross-compilation", "infrastructure", "milestone"]
---
103 commits sur le compilateur Perry cette semaine. Les fonctionnalités phares : vous pouvez désormais compiler des exécutables Windows depuis Linux, les apps iOS peuvent exécuter des boucles de jeu bloquantes, le compilateur signale les crashes pour la télémétrie, et le compilateur auto-hébergé passe chaque test déterministe que nous lui soumettons. Plus une mise à niveau majeure de l'infrastructure Hub et plus de 50 corrections de bugs.

## Compilation croisée vers Windows depuis Linux

Perry peut désormais produire des binaires Windows `.exe` depuis un hôte Linux. C'est la pièce manquante pour les pipelines CI/CD qui doivent cibler Windows sans faire tourner une machine de compilation Windows pour toute la compilation.

L'implémentation remplace les vérifications `#[cfg]` à la compilation par une détection de cible à l'exécution. Quand le compilateur détecte une cible Windows sur un hôte non-Windows, il localise `lld-link`, `llvm-nm` et `llvm-ar` depuis la toolchain Rust ou le PATH via un nouveau helper `find_llvm_tool()`. Les bibliothèques système Windows proviennent d'un sysroot de type [xwin](https://github.com/Jake-Shadle/xwin) pointé par `PERRY_WINDOWS_SYSROOT`.

L'éditeur de liens utilise automatiquement `/FORCE:UNRESOLVED` et génère des stubs pour les symboles UI manquants, permettant aux apps CLI de se compiler proprement. La sortie est par défaut en `.exe` pour le ciblage Windows. Les détails complets sont dans la [documentation de compilation croisée](https://docs.perryts.com).

terminal — Linux host

$ perry compile main.ts --target windows

Compiling main.ts for windows-x86\_64...

Using lld-link from Rust toolchain

✓ Compiled executable: main.exe (2.8 MB)

## Support des boucles de jeu iOS

iOS exige que UIKit possède le thread principal. C'est acceptable pour les apps événementielles, mais c'est un problème pour les jeux qui ont besoin d'une boucle `while (!shouldClose)` bloquante. Perry résout maintenant cela avec le flag `--features ios-game-loop`.

Lorsqu'il est activé, le compilateur émet `_perry_user_main` au lieu de `main`. Le runtime fournit un `main()` qui appelle `UIApplicationMain` sur le thread principal et lance votre code sur un thread d'arrière-plan. Le scene delegate et l'app delegate gèrent le cycle de vie UIKit complet pendant que votre boucle de jeu s'exécute sans blocage.

main.ts

// Votre boucle de jeu s'exécute sur un thread d'arrière-plan

while (!shouldClose) {

update();

render();

awaitNextFrame();

}

terminal

$ perry run ios --features ios-game-loop

Cela ouvre toute une catégorie d'applications — jeux, simulations, visualisations en temps réel — qui n'étaient pas pratiques sur iOS auparavant. Les chemins de pompe et de callback iOS sont désormais également enveloppés dans la gestion des panics, de sorte que les crashes dans la boucle de jeu ou le cycle de vie UIKit sont capturés proprement.

## Rapport de crashes

Les apps compilées par Perry installent désormais un hook de panic et des gestionnaires de signaux pour `SIGSEGV`, `SIGBUS` et `SIGABRT` au démarrage. Lors d'un crash fatal, les détails sont écrits dans `~/.hone/crash.log` pour le système de télémétrie Chirp. Les panics capturés (dans `catch_callback_panic`) effacent le log, de sorte que seuls les crashes véritablement irrécupérables sont signalés.

C'est une fonctionnalité de préparation à la production. Quand quelque chose ne va pas sur le terrain, nous le saurons — et le log de crash contient suffisamment de contexte pour diagnostiquer le problème sans que les utilisateurs aient à signaler quoi que ce soit manuellement.

## Hub : Pipeline de compilation Windows en deux étapes

L'infrastructure de compilation du Perry Hub a reçu une mise à niveau architecturale significative. Auparavant, compiler pour Windows nécessitait un worker Windows pour toute la compilation. Désormais le pipeline se divise en deux étapes :

1.  Un worker Linux effectue la compilation croisée de l'artefact Windows avec le nouveau support lld-link
2.  Le Hub conserve l'artefact précompilé et remet la tâche en file d'attente pour un worker Windows
3.  Le worker Windows ne gère que la signature et l'empaquetage — une tâche beaucoup plus légère

Quand un worker envoie `complete` avec `needs_finishing: "windows"`, le Hub remet la tâche en file de manière transparente. La CLI voit une expérience de compilation unique et fluide.

Le Hub démarre désormais automatiquement les VMs Windows Azure quand aucun worker Windows n'est connecté, et les workers de compilation se mettent à jour automatiquement vers la dernière version de Perry lors de nouvelles releases. Moins de gestion manuelle d'infrastructure, des compilations plus rapides.

## Refonte de la documentation

Deux réécritures majeures de documentation ont atterri cette semaine sur [docs.perryts.com](https://docs.perryts.com) :

-   **Référence perry.toml** — documentation complète par section couvrant chaque option de configuration, résolution de bundle ID, résolution du fichier d'entrée, auto-incrémentation du numéro de build et exemples CI/CD
-   **Référence Geisterhand** — documentation complète de l'API, configuration de plateforme, patterns d'automatisation de tests et aperçu de l'architecture du framework de test d'interface multiplateforme

Ce ne sont pas des mises à jour incrémentales. Ce sont des réécritures complètes qui couvrent chaque fonctionnalité et option de configuration. Si vous configurez un nouveau projet ou écrivez des tests, commencez ici.

## APIs de menu multiplateformes

`menuClear` et `menuAddStandardAction` étaient auparavant réservés à macOS. Ils fonctionnent désormais sur les 6 plateformes natives. Cela inclut aussi une correction d'un panic de réentrance `RefCell` dans `dispatch_menu_item` sur Windows.

### Android : Alignement de page 16 Ko

Google Play exige désormais un alignement de page de 16 Ko pour les bibliothèques natives. Perry configure automatiquement les `CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS` appropriés, et les fichiers `.so` compagnons sont copiés à côté de la sortie pour inclusion dans APK/AAB.

## Perry React : Tableau Kanban

La couche de compatibilité React a eu un test grandeur nature : un tableau Kanban complet à 5 colonnes avec des opérations de déplacement, ajout, suppression et visualisation. Sa construction a révélé et corrigé le rendu d'enfants de tableaux imbriqués en JSX — le gestionnaire récursif `_appendChildren` aplatit désormais correctement les tableaux retournés par les appels `.map()`. Il y a aussi une nouvelle démo Kitchen Sink WorkBench de 14 sections couvrant divers patterns d'interface.

## Anvil : 100% de parité de tests déterministes

`perrysdad` — le compilateur LLVM auto-hébergé écrit en TypeScript et compilé par Perry — passe désormais **68 sur 68** tests déterministes, correspondant exactement à la sortie du compilateur principal. Les seules différences sont inhérentes (horodatages, `Math.random()`), et 11 tests sont ignorés car ils nécessitent l'interface, des minuteries, de la cryptographie ou des fonctionnalités spécifiques à une plateforme non encore implémentées.

Travaux clés qui ont permis d'y arriver :

-   **Dispatch de méthodes d'interface** — les variables typées interface retournent désormais les bonnes méthodes via un dispatch basé sur class\_id dans ObjectHeader
-   **Accès dynamique aux propriétés** — dispatch à l'exécution pour les noms de propriétés calculés
-   **Closures et liaison de this** — sémantique de capture correcte pour les méthodes d'objets
-   **Phase 6 en cours** — async/await, générateurs et corrections de conditions

100% de parité sur les tests déterministes est un jalon significatif. Cela signifie que le binaire `anvil` auto-compilé produit exactement la même sortie que le compilateur principal pour chaque scénario testable. L'écart vers l'auto-hébergement complet se réduit.

## Plus de 50 corrections de bugs

Un effort majeur de correction cette semaine. Points saillants :

-   **JSON.parse** — les tableaux ne sont plus tronqués à 16 éléments, les entrées invalides sont gérées correctement
-   **Uint8Array** — constructeur depuis une variable tableau, implémentation de `.set(source, offset)` (était un no-op)
-   **BigInt** — NaN-boxing avec `BIGINT_TAG` pour les appels inter-modules, corrections de troncation keccak256 32 bits
-   **Optional chaining** — expressions conditionnelles imbriquées, détection toString, NaN-boxing de valeur de retour
-   **IndexSet** — NaN-boxing de chaîne corrigé pour utiliser `STRING_TAG` au lieu de `POINTER_TAG`
-   **MySQL** — types DATETIME et BLOB, constructeur `Date(string)`
-   **Math.min/max** — gestion des arguments spread
-   **Dispatch de méthodes natives** — field-scan-and-call pour les objets `POINTER_TAG`

Ce ne sont pas des cas limites. JSON.parse tronquant les tableaux à 16 éléments casserait n'importe quelle application réelle. Uint8Array.set étant un no-op corromprait silencieusement les données. Ce sont les corrections qui rendent le compilateur apte à la production, un bug de correction à la fois.

## En chiffres

-   **103 commits** sur le compilateur principal Perry
-   **3 versions** : v0.2.195, v0.2.196, v0.2.197
-   **1 fonctionnalité majeure** : compilation croisée Windows depuis Linux
-   **1 nouvelle catégorie d'apps** : boucles de jeu iOS
-   **68/68** parité de tests déterministes dans perrysdad
-   **Plus de 50 corrections de bugs** en NaN-boxing, stdlib et FFI natif
-   **2 réécritures de documentation** : perry.toml et Geisterhand
-   **5 améliorations du Hub** : pipeline à deux étapes, auto-démarrage Azure, auto-mise à jour des workers

## Et ensuite

La compilation croisée Windows ouvre la porte au CI/CD multiplateforme entièrement automatisé — envoyer du TypeScript, obtenir des binaires natifs pour chaque cible sans machines de compilation dédiées pour chaque OS. Le support des boucles de jeu débloque toute une nouvelle catégorie d'apps iOS. Et 100% de parité de tests déterministes dans perrysdad signifie que l'auto-hébergement devient très réel. Ce qui reste :

-   **Support complet des regex** — la dernière grande lacune du langage
-   **Extension de perry/ui** — glisser-déposer, labels d'accessibilité, DatePicker
-   **perrysdad Phase 6** — async/await, générateurs, progression vers la parité complète avec Perry
-   **Bêta publique du Hub** — ouvrir les compilations distribuées aux utilisateurs externes

Suivez la progression sur [GitHub](https://github.com/PerryTS/perry), lisez la documentation sur [docs.perryts.com](https://docs.perryts.com), ou consultez la [feuille de route](/fr/roadmap/) pour le tableau complet.
