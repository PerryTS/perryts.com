---
title: "UI native multiplateforme depuis TypeScript"
excerpt: "Comment Perry mappe une base de code TypeScript aux widgets de plate-forme sur ses cibles documentées, y compris les limitations et conditions préalables spécifiques à la plate-forme."
date: 2025-02-01
tags: ["architecture", "UI", "cross-platform"]
---
L'un des objectifs les plus ambitieux de Perry est de livrer des applications GUI véritablement natives à partir d'une seule base de code TypeScript. Pas de vues web enveloppées dans un shell natif. Pas de moteur de rendu personnalisé dessinant ses propres pixels. De vrais widgets natifs, rendus par le framework d'interface propre à chaque plateforme, compilés depuis TypeScript au moment de la construction.

Cet article explique comment ça fonctionne — l'architecture, le mapping de plateforme, les compromis et où nous en sommes aujourd'hui.

## Le problème avec les approches actuelles

Le développement d'interfaces graphiques multiplateformes est un problème difficile depuis des décennies. Chaque framework majeur a fait un ensemble différent de compromis :

### Electron / Tauri (Basé sur le web)

Electron embarque Chromium et Node.js, vous donnant un navigateur web comme shell d'application. Vous avez un accès complet à la plateforme web, mais votre application "native" est un téléchargement de plus de 150 Mo qui utilise des centaines de mégaoctets de RAM juste pour afficher une fenêtre. Tauri remplace Chromium par la vue web du système, réduisant considérablement la taille, mais votre interface reste du HTML/CSS rendu dans une vue web — pas des widgets natifs.

### React Native (Basé sur un bridge)

React Native exécute votre JavaScript dans un moteur JS (Hermes ou V8) et fait le pont vers des widgets natifs via une file de messages sérialisée. Vous obtenez de vrais widgets natifs, mais le bridge ajoute de la latence, surtout pour les gestes et les animations. Les interactions complexes nécessitent de descendre au code natif (Swift/Kotlin), ce qui défait la promesse d'une base de code unique.

### Flutter (Rendu personnalisé)

Flutter compile Dart en code natif et dessine tout avec son propre moteur de rendu basé sur Skia. Les performances sont excellentes, mais vos widgets ne sont pas natifs — ce sont des répliques parfaites au pixel près. Cela signifie que les conventions de plateforme (physique du défilement, sélection de texte, comportements d'accessibilité) doivent être réimplémentées plutôt qu'héritées. Et sur bureau, les différences deviennent plus visibles.

### KMP + Compose Multiplatform (Partiellement natif)

Kotlin Multiplatform compile vers la JVM sur Android et en natif sur iOS, mais l'interface partagée via Compose Multiplatform utilise un rendu personnalisé basé sur Skia — le même compromis que Flutter. Pour une interface véritablement native, vous revenez à écrire du code spécifique à la plateforme.

## L'approche de Perry : Compiler vers les toolkits natifs

Perry adopte une approche fondamentalement différente. Au lieu d'exécuter votre code dans un runtime et de faire le pont vers des widgets natifs, ou de dessiner des pixels personnalisés, Perry compile votre code d'interface TypeScript directement en appels au toolkit natif de chaque plateforme au moment de la construction.

La différence clé : **il n'y a pas de couche runtime entre votre code et le SDK de la plateforme.** Le binaire compilé appelle AppKit, UIKit, Android Views, GTK4 ou Win32 directement, exactement comme le ferait une application écrite en Swift, Kotlin ou C++.

## L'API d'interface unifiée

Perry fournit une API TypeScript commune pour construire des interfaces utilisateur. Cette API est délibérément de haut niveau — vous décrivez ce que votre interface doit contenir et comment elle doit se comporter, et Perry la mappe aux constructions natives appropriées.

**counter.ts**

```typescript
import { App, Text, Button, VStack, State } from "perry/ui";
const count = new State(0);
const app = new App("Counter", { width: 400, height: 300 });
app.body(() => {
return VStack({ spacing: 16, alignment: "center" }, [
Text(`Count: ${count.value}`, { fontSize: 32 }),
Button("Increment", () => count.value++),
Button("Reset", () => count.value = 0),
]);
});
app.run();
```

Ce même code compile en interface native sur les six plateformes. Pas de `#ifdef`, pas de vérifications de plateforme, pas d'imports conditionnels.

## Mapping de plateforme en détail

Voici comment Perry mappe l'API unifiée au framework natif de chaque plateforme :

### macOS — AppKit

Sur macOS, Perry génère du code qui crée et gère des objets AppKit directement. Un `App` devient une `NSApplication` avec une `NSWindow`. `Text` devient `NSTextField` (avec l'édition désactivée). `Button` devient `NSButton` avec un pattern target-action relié à votre callback. `VStack` devient un `NSStackView` avec une orientation verticale. La disposition utilise les contraintes Auto Layout.

Le binaire compilé lie contre le framework AppKit et appelle directement les fonctions du runtime Objective-C. C'est exactement ce que ferait du Swift compilé par Xcode.

### iOS & iPadOS — UIKit

Sur iOS, le mapping est similaire mais cible UIKit. `App` devient une `UIApplication` avec une `UIWindow` et un `UIViewController` racine. `Text` correspond à `UILabel`. `Button` correspond à `UIButton`. La disposition utilise `UIStackView` et Auto Layout. Les événements tactiles sont gérés par la chaîne de répondeurs d'UIKit.

### Android — JNI + Vues

Sur Android, Perry génère une bibliothèque native chargée via JNI (Java Native Interface). `App` correspond à une `Activity`. `Text` devient un `TextView`. `Button` devient un `android.widget.Button` avec un `OnClickListener`. `VStack` correspond à un `LinearLayout` vertical. Le code natif rappelle le framework Android via JNI, créant et manipulant de vraies vues Android.

### Linux — GTK4

Sur Linux, Perry cible GTK4. `App` devient une `GtkApplication` avec une `GtkApplicationWindow`. `Text` correspond à `GtkLabel`. `Button` correspond à `GtkButton` avec un gestionnaire de signal. `VStack` correspond à une `GtkBox` avec une orientation verticale. Le theming CSS de GTK4 signifie que votre application suit automatiquement le thème du bureau de l'utilisateur.

### Windows — Win32

Sur Windows, Perry génère des appels à l'API Win32. `App` crée une classe de fenêtre, l'enregistre et exécute une boucle de messages. `Button` devient un contrôle `BUTTON` créé avec `CreateWindowEx`. `Text` correspond à un contrôle `STATIC`. Les événements sont gérés par la pompe de messages Win32 (`WM_COMMAND`, `WM_NOTIFY`, etc.).

## Gestion de l'état

La primitive `State<T>` de Perry fournit une gestion d'état réactive qui compile vers les mécanismes de mise à jour natifs de la plateforme. Lorsqu'une valeur d'état change, Perry déclenche une mise à jour de l'interface via le système d'invalidation propre à la plateforme — `setNeedsDisplay` sur macOS/iOS, `invalidate()` sur Android, `gtk_widget_queue_draw` sur Linux.

Il n'y a pas de diffing de DOM virtuel, pas de passe de réconciliation, pas de sérialisation. Les changements d'état se propagent directement au widget natif qui affiche la valeur.

## Pourquoi pas la syntaxe SwiftUI / Jetpack Compose ?

Vous pourriez vous demander pourquoi Perry n'utilise pas une syntaxe déclarative similaire à SwiftUI ou Jetpack Compose. La réponse est pragmatique : Perry compile du TypeScript, et TypeScript a ses propres idiomes. Plutôt que d'inventer un DSL qui semble étranger aux développeurs TypeScript, Perry utilise une API de style builder qui se sent naturelle en TypeScript — constructeurs, appels de méthodes, callbacks et closures. Ce sont les mêmes patterns que vous utilisez déjà en travaillant avec Express, les hooks React ou toute autre bibliothèque TypeScript.

## Ce qui est disponible aujourd'hui

Les six backends de plateforme sont implémentés et stables. L'ensemble actuel de widgets comprend :

-   **Disposition** — VStack, HStack, Spacer, ScrollView, Divider
-   **Affichage** — Text, Image
-   **Saisie** — Button, TextField, Toggle, Slider
-   **Navigation** – NavigationView, TabView, List
-   **Conteneurs** — TreeView, SearchBar, StatusBar
-   **État** — State<T> pour les mises à jour réactives

## Ce qui arrive

Nous étendons activement la bibliothèque de widgets. Prochainement :

-   `SecureField` — saisie de mot de passe avec entrée de texte sécurisée native de la plateforme
-   `ProgressView` — indicateurs de progression déterminés et indéterminés
-   `Alert` — dialogues d'alerte natifs avec boutons et champs de texte
-   `DatePicker` — sélection native de date/heure de la plateforme
-   `Menu` — barres de menu et menus contextuels natifs

L'objectif est la parité complète du framework GUI sur toutes les plateformes — chaque widget, disposition, geste et animation disponible partout. Consultez la [feuille de route](/fr/roadmap/) pour le tableau complet.

## Essayez

La meilleure façon de comprendre l'interface native de Perry est de la voir en action. [Pry](/fr/showcase/pry/) est un visualiseur JSON natif construit entièrement en TypeScript avec Perry — une vraie application avec navigation arborescente, recherche et raccourcis clavier, compilée en binaires natifs sur macOS, iOS et Android. Lisez le [guide complet](/fr/blog/building-pry/) de sa construction.
