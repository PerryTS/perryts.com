---
title: "Pry entwickeln: Ein nativer JSON-Viewer in TypeScript"
excerpt: "A walkthrough of building Pry, a native JSON viewer compiled from TypeScript to machine code with the Perry runtime and GC linked in and no webview."
date: 2025-02-20
tags: ["tutorial", "showcase", "Pry"]
---
Pry ist ein nativer JSON-Viewer, komplett in TypeScript geschrieben und mit Perry kompiliert. Es ist keine Tech-Demo — es ist ein echtes Tool, das wir täglich verwenden, um API-Antworten, Konfigurationsdateien und Daten-Dumps zu inspizieren. Dieser Beitrag geht durch, wie es gebaut wurde, wie es kompiliert und wie die Entwicklererfahrung aussieht, wenn dein TypeScript zu einer nativen App kompiliert.

## Was Pry macht

Pry liest eine JSON-Datei (oder akzeptiert JSON von stdin) und rendert sie als interaktiven, navigierbaren Baum in einem nativen Fenster. Wenn du macOS's eingebautes Quick Look für JSON kennst, stell dir das vor — aber schneller, durchsuchbar und mit tastaturgesteuerter Navigation.

Der Funktionsumfang:

-   **Baumansicht** — klappbare Knoten für Objekte und Arrays, mit Tiefeindikatoren und Alles-auf-/zuklappen
-   **Suche** — Volltextsuche über Schlüssel und Werte mit Echtzeit-Hervorhebung und Treffer-Navigation
-   **Tastenkombinationen** — Pfeiltasten zur Navigation, Enter zum Auf-/Zuklappen, Schrägstrich zum Suchen, `⌘C` zum Kopieren
-   **Zwischenablage** — jeden Knoten oder Teilbaum als formatierten JSON kopieren
-   **Syntaxfärbung** — Strings in Grün, Zahlen in Orange, Booleans in Lila, null in Rot
-   **Statusleiste** — zeigt Gesamtknoten-Anzahl, aktuelle Tiefe, Dateigröße und Parse-Zeit

## Der Quellcode

Pry ist in Standard-TypeScript geschrieben. Es gibt keine spezielle Syntax, keine Makros, keine Build-Time-Code-Generierung. Es verwendet Perrys UI-API, die native Widgets bereitstellt, die zu plattformspezifischem Code kompilieren.

Hier ist der Einstiegspunkt (vereinfacht für Klarheit):

pry.ts

import { App, VStack, TreeView, SearchBar, StatusBar, State }

from "perry/ui";

import { readFile, readStdin } from "perry/fs";

// Eingabe von Dateiargument oder stdin lesen

const input = process.argv\[2\]

? readFile(process.argv\[2\])

: readStdin();

const startTime = Date.now();

const data = JSON.parse(input);

const parseMs = Date.now() - startTime;

// Reaktiver State

const searchQuery = new State("");

const matchCount = new State(0);

// App erstellen

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

Das ist der Kern einer nativen Anwendung. Kein Framework-Boilerplate, keine Build-Konfiguration, keine plattformspezifischen Dateien. Eine TypeScript-Datei.

### Die Hilfsfunktionen

Pry enthält auch eine `countNodes`\-Utility, die rekursiv alle Knoten im JSON-Baum zählt, und einen `formatBytes`\-Helper zum Anzeigen von Dateigrößen. Das sind Standard-TypeScript-Funktionen — nichts Perry-spezifisches daran. Sie kompilieren genauso zu nativem Code wie alles andere.

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

## Pry kompilieren

Pry mit Perry zu kompilieren ist ein einziger Befehl. Kein Xcode-Projekt, keine Gradle-Konfiguration, kein webpack-Config. Einfach Perry auf die Einstiegsdatei richten und das Ziel angeben.

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

Die Binärdatei ist 48 MB groß, weil sie den vollständigen AppKit-UI-Stack enthält — Baumansicht-Rendering, Such-Hervorhebung, Syntaxfärbung und Tastatur-Handling. Zum Vergleich: dieselbe App in Electron wäre über 200 MB. Eine CLI-only Perry-App kompiliert zu 2–5 MB.

### iOS

$ perry build pry.ts --target ios-arm64

✓ Built executable: pry (52 MB)

Der iOS-Build linkt gegen UIKit statt AppKit. Perry bildet dieselbe `TreeView`\-API auf `UITableView` mit erweiterbaren Sektionen ab, `SearchBar` auf `UISearchBar`, und Touch-Events ersetzen Maus-Events. Der iOS-Build kann auf physischen Geräten und Simulatoren deployed werden.

### Android

$ perry build pry.ts --target android-arm64

✓ Built: pry.apk

Der Android-Build generiert eine native Bibliothek, die über JNI geladen wird, verpackt in ein APK. `TreeView` bildet auf ein `RecyclerView` mit erweiterbaren View-Holdern ab, `SearchBar` auf ein `EditText` mit `TextWatcher`, und die Statusleiste auf ein `TextView` am unteren Rand des Layouts.

## Was unter der Haube passiert

Wenn Perry Pry kompiliert, durchläuft es mehrere Phasen:

1.  **Parsen** — SWC parst den TypeScript-Quellcode in einen AST. Imports von `perry/ui` und `perry/fs` werden zu Perrys eingebauten Modulimplementierungen aufgelöst.
2.  **Typanalyse** — Perry löst alle Typen auf, einschließlich der generischen `State<string>` und `State<number>`, und monomorphisiert sie zu konkreten Typen.
3.  **Plattformauflösung** — Basierend auf dem Target-Flag wählt Perry das entsprechende UI-Backend. Jeder `TreeView`\-, `SearchBar`\- und `Button`\-Aufruf wird zur plattformspezifischen Implementierung aufgelöst.
4.  **IR-Generierung** — Perry generiert eine Zwischendarstellung, die native API-Aufrufe enthält — Objective-C Message-Sends für macOS/iOS, JNI-Aufrufe für Android, C-Funktionsaufrufe für GTK4/Win32.
5.  **Code-Generierung** — Cranelift kompiliert die IR zu nativem Maschinencode für die Zielarchitektur.
6.  **Linken** — Der native Code wird gegen die Plattform-Frameworks (AppKit, UIKit, Android NDK, GTK4 oder Win32) gelinkt, um die finale ausführbare Datei zu produzieren.

## Keine Runtime, keine Web Views

Das ist es wert, betont zu werden, weil es der Kernunterschied zwischen Perry und jedem anderen TypeScript-zu-nativ-Ansatz ist. Die kompilierte Pry-Binärdatei hat:

-   **Keine JavaScript-Engine** — kein V8, kein Hermes, kein JavaScriptCore
-   **Keine Web Views** — kein Chromium, kein WebKit, kein WKWebView
-   **Keine Bridge-Schicht** — keine serialisierten Nachrichten zwischen JS und nativem Code
-   **Keine Framework-Runtime** — kein React, keine Flutter-Engine, keine Dart-VM

Die Binärdatei ruft Plattform-APIs direkt auf. Auf macOS ruft sie `objc_msgSend` auf, um mit AppKit-Objekten zu interagieren. Auf Android ruft sie JNI-Funktionen auf, um Views zu erstellen und zu manipulieren. Es ist dasselbe, was eine native Swift- oder Kotlin-App tun würde.

Die praktische Konsequenz: Pry startet sofort. Es gibt keinen VM-Start, kein JIT-Aufwärmen, kein Script-Parsing. Der Prozess startet, das Fenster erscheint, das JSON wird gerendert. Der Speicherverbrauch ist ein Bruchteil dessen, was ein Electron-Äquivalent verbrauchen würde.

## Entwicklererfahrung

Pry zu bauen fühlte sich bemerkenswert ähnlich an wie jede TypeScript-Anwendung zu bauen. Der Workflow ist:

1.  TypeScript in deinem Editor schreiben (VS Code, Zed, Neovim, was du bevorzugst)
2.  `perry compile pry.ts` ausführen
3.  `./pry test.json` ausführen
4.  Iterieren

Kein Xcode-Projekt zum Konfigurieren. Kein Android Studio zum Installieren. Kein 45-Sekunden Gradle-Build. Der Perry-Compiler selbst ist schnell — das Parsen und Kompilieren von Pry dauert wenige Sekunden, und wir arbeiten aktiv daran, es schneller zu machen.

Das TypeScript, das du schreibst, ist Standard-TypeScript. Die Typprüfung, Autovervollständigung und Refactoring-Tools deines Editors funktionieren alle. Du kannst Funktionen extrahieren, Module erstellen, Generics verwenden — alle TypeScript-Muster, die du bereits kennst.

## Was wir gelernt haben

Pry zu bauen hat uns viel darüber gelehrt, was die Perry UI-API unterstützen muss. Einige Lektionen:

-   **Baumansichten sind komplex.** Auf-/Zuklappen, Such-Hervorhebung, Tastatur-Navigation und Zwischenablage-Integration müssen alle koordiniert werden. Perrys `TreeView`\-Widget handhabt das intern, aber wir mussten sicherstellen, dass die native Implementierung auf allen drei Plattformen konsistent war.
-   **Tastenkombinationen brauchen Plattformkonventionen.** Auf macOS ist es `⌘C` zum Kopieren. Auf Linux und Android ist es `Ctrl+C`. Perrys Shortcut-System abstrahiert das, aber es brauchte sorgfältige Implementierung, um es richtig hinzubekommen.
-   **Statusleisten sind überraschend nicht-trivial.** Jede Plattform hat eine andere Konvention, wo und wie Statusinformationen angezeigt werden. AppKit verwendet die untere Leiste des Fensters, UIKit verwendet eine Toolbar, Android verwendet eine untere View im Layout. Perrys `StatusBar` bildet auf jede korrekt ab.
-   **Stdin-Unterstützung erforderte Plattform-Bewusstsein.** Auf macOS und Linux ist das Lesen von stdin unkompliziert. Auf iOS und Android "existiert" stdin nicht wirklich auf dieselbe Weise, also verwendet Pry auf mobilen Plattformen stattdessen Dateiauswahl. Perrys `readStdin` handhabt das transparent.

## Performance

Pry handhabt große JSON-Dateien komfortabel. In unseren Tests:

-   Eine 1 MB JSON-Datei (10.000+ Knoten) parst und rendert in unter 50 ms
-   Eine 10 MB JSON-Datei rendert in unter 200 ms
-   Suche über 10.000 Knoten liefert Ergebnisse beim Tippen, ohne sichtbare Verzögerung
-   Speicherverbrauch bleibt auch bei großen Dateien unter 50 MB

Das ist der Vorteil nativer Kompilierung. JSON-Parsing in Perry wird zu engen nativen Schleifen ohne GC-Pausen kompiliert. Baum-Rendering verwendet die plattformeigenen virtualisierten Listenansichten (NSOutlineView, UITableView, RecyclerView), die für Performance kampferprobt sind.

## Quellcode und Downloads

Pry ist Open Source. Du kannst den vollständigen Quellcode durchstöbern, es selbst bauen oder einfach den Code anschauen, um zu verstehen, wie eine native Perry-UI-App strukturiert ist.

-   [GitHub Repo](https://github.com/perryts/pry) — vollständiger Quellcode und Build-Anleitungen
-   [Showcase-Seite](/de/showcase/pry/) — Screenshots, Feature-Liste und Plattform-Details

Wenn du etwas mit Perry baust, würden wir gerne davon hören. Eröffne ein Issue im [Perry Repo](https://github.com/PerryTS/perry) oder starte eine Diskussion. Wir bauen Perry offen und Feedback von echten Nutzern, die echte Apps bauen, ist von unschätzbarem Wert.
