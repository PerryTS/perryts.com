---
title: "Plattformübergreifende native UI aus TypeScript"
excerpt: "How Perry maps one TypeScript codebase to platform widgets across its documented targets, including the platform-specific limitations and prerequisites."
date: 2025-02-01
tags: ["architecture", "UI", "cross-platform"]
---
Eines der ambitioniertesten Ziele von Perry ist die Bereitstellung wirklich nativer GUI-Anwendungen aus einer einzigen TypeScript-Codebasis. Keine Web-Views in einer nativen Hülle. Keine benutzerdefinierte Rendering-Engine, die eigene Pixel zeichnet. Echte native Widgets, gerendert vom UI-Framework der jeweiligen Plattform, zur Build-Zeit aus TypeScript kompiliert.

Dieser Beitrag erklärt, wie es funktioniert — die Architektur, das Plattform-Mapping, die Kompromisse und wo wir heute stehen.

## Das Problem mit aktuellen Ansätzen

Plattformübergreifende GUI-Entwicklung ist seit Jahrzehnten ein schwieriges Problem. Jedes große Framework hat unterschiedliche Kompromisse eingegangen:

### Electron / Tauri (Web-basiert)

Electron bündelt Chromium und Node.js und gibt dir einen Webbrowser als App-Shell. Du hast vollen Zugriff auf die Web-Plattform, aber deine "native" App ist ein 150+ MB Download, der Hunderte von Megabytes RAM verbraucht, nur um ein Fenster anzuzeigen. Tauri ersetzt Chromium durch die OS-Web-View und reduziert die Größe dramatisch, aber deine UI ist immer noch HTML/CSS, gerendert in einer Web-View — keine nativen Widgets.

### React Native (Bridge-basiert)

React Native führt dein JavaScript in einer JS-Engine (Hermes oder V8) aus und überbrückt zu nativen Widgets über eine serialisierte Nachrichtenwarteschlange. Du bekommst echte native Widgets, aber die Bridge fügt Latenz hinzu, besonders bei Gesten und Animationen. Komplexe Interaktionen erfordern den Wechsel zu nativem Code (Swift/Kotlin), was das Single-Codebase-Versprechen unterminiert.

### Flutter (Benutzerdefinierter Renderer)

Flutter kompiliert Dart zu nativem Code und zeichnet alles mit seiner eigenen Skia-basierten Rendering-Engine. Die Performance ist ausgezeichnet, aber deine Widgets sind nicht nativ — sie sind pixelperfekte Repliken. Das bedeutet, Plattformkonventionen (Scroll-Physik, Textauswahl, Barrierefreiheitsverhalten) müssen neu implementiert statt vererbt werden. Und auf dem Desktop werden die Unterschiede deutlicher.

### KMP + Compose Multiplatform (Teilweise nativ)

Kotlin Multiplatform kompiliert zur JVM auf Android und nativ auf iOS, aber geteilte UI über Compose Multiplatform verwendet einen benutzerdefinierten Skia-basierten Renderer — derselbe Kompromiss wie Flutter. Für wirklich native UI schreibst du wieder plattformspezifischen Code.

## Perrys Ansatz: Kompilieren zu nativen Toolkits

Perry verfolgt einen grundlegend anderen Ansatz. Statt deinen Code in einer Runtime auszuführen und zu nativen Widgets zu überbrücken, oder benutzerdefinierte Pixel zu zeichnen, kompiliert Perry deinen TypeScript-UI-Code direkt in Aufrufe des nativen Toolkits der jeweiligen Plattform zur Build-Zeit.

Der entscheidende Unterschied: **Es gibt keine Runtime-Schicht zwischen deinem Code und dem Plattform-SDK.** Die kompilierte Binärdatei ruft AppKit, UIKit, Android Views, GTK4 oder Win32 direkt auf, genau wie eine in Swift, Kotlin oder C++ geschriebene App.

## Die einheitliche UI-API

Perry bietet eine gemeinsame TypeScript-API zum Erstellen von Benutzeroberflächen. Diese API ist bewusst auf hohem Niveau — du beschreibst, was deine UI enthalten soll und wie sie sich verhalten soll, und Perry bildet es auf die entsprechenden nativen Konstrukte ab.

counter.ts

import { App, Text, Button, VStack, State } from "perry/ui";

const count = new State(0);

const app = new App("Counter", { width: 400, height: 300 });

app.body(() => {

return VStack({ spacing: 16, alignment: "center" }, \[

Text(\`Count: ${count.value}\`, { fontSize: 32 }),

Button("Increment", () => count.value++),

Button("Reset", () => count.value = 0),

\]);

});

app.run();

Derselbe Code kompiliert auf allen sechs Plattformen zu nativer UI. Kein `#ifdef`, keine Plattformprüfungen, keine bedingten Imports.

## Plattform-Mapping im Detail

So bildet Perry die einheitliche API auf das native Framework jeder Plattform ab:

### macOS — AppKit

Auf macOS generiert Perry Code, der AppKit-Objekte direkt erstellt und verwaltet. Ein `App` wird zu einer `NSApplication` mit einem `NSWindow`. `Text` wird zu `NSTextField` (mit deaktivierter Bearbeitung). `Button` wird zu `NSButton` mit einem Target-Action-Pattern, verdrahtet mit deinem Callback. `VStack` wird zu einem `NSStackView` mit vertikaler Orientierung. Layout verwendet Auto Layout Constraints.

Die kompilierte Binärdatei linkt gegen das AppKit-Framework und ruft Objective-C-Runtime-Funktionen direkt auf. Es ist dasselbe, was Xcode-kompiliertes Swift tun würde.

### iOS & iPadOS — UIKit

Auf iOS ist das Mapping ähnlich, zielt aber auf UIKit. `App` wird zu einer `UIApplication` mit einem `UIWindow` und Root-`UIViewController`. `Text` bildet auf `UILabel` ab. `Button` bildet auf `UIButton` ab. Layout verwendet `UIStackView` und Auto Layout. Touch-Events werden über UIKits Responder Chain behandelt.

### Android — JNI + Views

Auf Android generiert Perry eine native Bibliothek, die über JNI (Java Native Interface) geladen wird. `App` bildet auf eine `Activity` ab. `Text` wird zu einem `TextView`. `Button` wird zu einem `android.widget.Button` mit einem `OnClickListener`. `VStack` bildet auf ein vertikales `LinearLayout` ab. Der native Code ruft über JNI zurück in das Android-Framework und erstellt und manipuliert echte Android Views.

### Linux — GTK4

Auf Linux zielt Perry auf GTK4. `App` wird zu einer `GtkApplication` mit einem `GtkApplicationWindow`. `Text` bildet auf `GtkLabel` ab. `Button` bildet auf `GtkButton` mit einem Signal-Handler ab. `VStack` bildet auf eine `GtkBox` mit vertikaler Orientierung ab. GTK4s CSS-Theming bedeutet, dass deine App automatisch dem Desktop-Theme des Benutzers folgt.

### Windows — Win32

Auf Windows generiert Perry Win32-API-Aufrufe. `App` erstellt eine Fensterklasse, registriert sie und führt eine Nachrichtenschleife aus. `Button` wird zu einem `BUTTON`\-Steuerelement, erstellt mit `CreateWindowEx`. `Text` bildet auf ein `STATIC`\-Steuerelement ab. Events werden über die Win32-Nachrichtenpumpe behandelt (`WM_COMMAND`, `WM_NOTIFY`, etc.).

## State Management

Perrys `State<T>`\-Primitive bietet reaktives State Management, das zu plattform-nativen Update-Mechanismen kompiliert. Wenn sich ein State-Wert ändert, löst Perry ein UI-Update über das Invalidierungssystem der Plattform aus — `setNeedsDisplay` auf macOS/iOS, `invalidate()` auf Android, `gtk_widget_queue_draw` auf Linux.

Es gibt kein Virtual-DOM-Diffing, keinen Reconciliation-Pass, keine Serialisierung. Zustandsänderungen propagieren direkt zum nativen Widget, das den Wert anzeigt.

## Warum nicht SwiftUI / Jetpack Compose Syntax?

Man könnte sich fragen, warum Perry keine deklarative Syntax ähnlich zu SwiftUI oder Jetpack Compose verwendet. Die Antwort ist pragmatisch: Perry kompiliert TypeScript, und TypeScript hat seine eigenen Idiome. Statt eine DSL zu erfinden, die TypeScript-Entwicklern fremd erscheint, verwendet Perry eine Builder-Style-API, die sich in TypeScript natürlich anfühlt — Konstruktoren, Methodenaufrufe, Callbacks und Closures. Es sind dieselben Muster, die du bereits bei der Arbeit mit Express, React Hooks oder jeder anderen TypeScript-Bibliothek verwendest.

## Was heute verfügbar ist

Alle sechs Plattform-Backends sind implementiert und stabil. Der aktuelle Widget-Satz umfasst:

-   **Layout** — VStack, HStack, Spacer, ScrollView, Divider
-   **Anzeige** — Text, Image
-   **Eingabe** — Button, TextField, Toggle, Slider
-   **Navigation** — NavigationView, TabView, List
-   **Container** — TreeView, SearchBar, StatusBar
-   **State** — State<T> für reaktive Updates

## Was kommt

Wir erweitern aktiv die Widget-Bibliothek. Als Nächstes:

-   `SecureField` — Passworteingabe mit plattform-nativer sicherer Texteingabe
-   `ProgressView` — bestimmte und unbestimmte Fortschrittsanzeigen
-   `Alert` — native Warndialoge mit Buttons und Textfeldern
-   `DatePicker` — plattform-native Datums-/Zeitauswahl
-   `Menu` — native Menüleisten und Kontextmenüs

Das Ziel ist vollständige GUI-Framework-Parität über alle Plattformen — jedes Widget, Layout, jede Geste und Animation überall verfügbar. Siehe die [Roadmap](/de/roadmap/) für das vollständige Bild.

## Ausprobieren

Der beste Weg, Perrys native UI zu verstehen, ist sie in Aktion zu sehen. [Pry](/de/showcase/pry/) ist ein nativer JSON-Viewer, vollständig in TypeScript mit Perry gebaut — eine echte App mit Baumnavigation, Suche und Tastenkombinationen, kompiliert zu nativen Binärdateien auf macOS, iOS und Android. Lies den [vollständigen Walkthrough](/de/blog/building-pry/) darüber, wie es gebaut wurde.
