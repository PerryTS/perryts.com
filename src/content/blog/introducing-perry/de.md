---
title: "Perry im Überblick"
excerpt: "Perry kompiliert unterstützten TypeScript-Code zu eigenständigen nativen Programmen. Seine Laufzeit und der Garbage Collector werden eingebunden; eine externe Node.js-Installation oder JavaScript-Engine ist nicht erforderlich."
date: 2025-01-15
tags: ["announcement", "compiler", "TypeScript"]
---
Wir freuen uns, Perry vorzustellen — einen nativen TypeScript-Compiler, geschrieben in Rust, der dein TypeScript direkt zu eigenständigen ausführbaren Dateien kompiliert. Kein Node.js-Runtime, kein Electron-Wrapper, keine Kompromisse. Nur dein Code, kompiliert zu einer nativen Binärdatei, die sofort startet und überall läuft.

Perry stellt ein grundlegendes Umdenken dessen dar, was TypeScript sein kann. Statt es als Obermenge von JavaScript zu behandeln, die durch eine JS-Engine laufen muss, behandelt Perry TypeScript als Systemsprache — eine, die zufällig eine Syntax hat, die Millionen von Entwicklern bereits kennen und lieben.

## Warum wir Perry gebaut haben

TypeScript ist zur Lingua Franca der modernen Softwareentwicklung geworden. Es ist die Sprache hinter den meisten Web-Frontends, einem wachsenden Anteil an Backends und zunehmend die Wahl für Tooling, Scripting und Automatisierung. Aber es hat immer eine fundamentale Einschränkung mit sich getragen: Es kompiliert zu JavaScript, und JavaScript benötigt eine Runtime.

Diese Runtime — ob Node.js, Deno oder Bun — kommt mit Kompromissen. Kaltstartzeiten, gemessen in Zehnteln oder Hundertsten von Millisekunden. Speicher-Overhead durch JIT-Compiler und Garbage Collector. Binärdistributionen, die entweder die gesamte Runtime mitbündeln oder vom Benutzer verlangen, eine zu installieren. Und für GUI-Anwendungen war die einzige Option Electron, das einen kompletten Chromium-Browser mit deiner App ausliefert.

Wir fragten: Was, wenn TypeScript gar nicht über JavaScript gehen müsste? Was, wenn man es direkt zu nativem Maschinencode kompilieren könnte, auf die gleiche Weise wie Rust, Go oder C++?

## Wie Perry funktioniert

Perrys Kompilierungs-Pipeline hat drei Stufen:

1.  **Parsing** — Perry verwendet SWC (den Rust-basierten TypeScript/JavaScript-Parser), um deinen TypeScript-Quellcode in einen AST zu parsen. SWC ist derselbe Parser, der von Next.js verwendet wird, und er ist extrem schnell.
2.  **Typgesteuerte Kompilierung** — Perry durchläuft den AST mit vollständiger Typinformation. Anders als eine JS-Engine, die dynamische Typen zur Laufzeit handhaben muss, kennt Perry jeden Typ zur Kompilierzeit. Das ermöglicht Monomorphisierung von Generics, statischen Dispatch von Methodenaufrufen und direkte Speicherlayout-Optimierung.
3.  **Code-Generierung** — Perry generiert nativen Maschinencode mit Cranelift, demselben Code-Generator, der von Wasmtime und Teilen des Firefox-JIT verwendet wird. Cranelift erzeugt effizienten nativen Code für x86\_64 und ARM64.

Das Ergebnis ist eine eigenständige ausführbare Datei — typischerweise 2–5 MB für ein CLI-Tool — die sofort ohne Aufwärmzeit startet.

```text
$ perry build app.ts
Parsing app.ts...
Compiling (cranelift, arm64)...
Linking...
✓ Built executable: app (2.3 MB)
$ ./app
Hello from native TypeScript!
$ file app
app: Mach-O 64-bit executable arm64
```

## Welche TypeScript-Features unterstützt werden

Perry unterstützt eine breite und wachsende Teilmenge von TypeScript. Das Ziel ist vollständige Kompatibilität mit der Sprache, wie Entwickler sie tatsächlich nutzen. Heute umfasst das:

-   **Alle primitiven Typen** — string, number, boolean, null, undefined, bigint, symbol
-   **Interfaces und Type-Aliases** — einschließlich Union-Typen, Intersection-Typen und Mapped Types
-   **Generics** — kompiliert via Monomorphisierung, sodass `Array<number>` und `Array<string>` unterschiedliche optimierte Codepfade generieren
-   **Klassen** — mit Vererbung, privaten Feldern (`#field`), statischen Mitgliedern, Gettern/Settern und Decorators
-   **Async/await und Promises** — kompiliert zu einer Zustandsmaschine, ähnlich wie Rust Async handhabt
-   **Generatoren und Iteratoren** — `function*` und `for...of`\-Schleifen
-   **Closures** — mit korrekter Capture-Semantik
-   **Destructuring** — Arrays, Objekte, verschachtelte Muster und Rest-Elemente
-   **Template Literals** — einschließlich Tagged Templates
-   **Module** — ESM-Imports/Exports zur Kompilierzeit aufgelöst

## Plattformübergreifende native UI

Perry ist nicht auf CLI-Tools und serverseitige Anwendungen beschränkt. Es liefert native UI-Frameworks für sechs Plattformen mit:

-   **macOS** — AppKit (NSWindow, NSView, NSButton, NSTextField und mehr)
-   **iOS** – UIKit (UIViewController, UIView, UIButton, UITableView)
-   **iPadOS** — UIKit (dieselbe API wie iOS, mit iPad-spezifischen Anpassungen)
-   **Android** – JNI + Android-Ansichten (Aktivität, Ansicht, Button, RecyclerView)
-   **Linux** – GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)
-   **Windows** — Win32 (CreateWindowEx, Common Controls, GDI)

Die zentrale Erkenntnis ist, dass Perry eine gemeinsame TypeScript-API auf das native Widget-Toolkit jeder Plattform zur Kompilierzeit abbildet. Es gibt keine Bridge-Schicht, keine Web-View und keine benutzerdefinierte Rendering-Engine. Deine App verwendet echte Plattform-Widgets, gerendert vom Betriebssystem selbst. Mehr dazu in unserem Deep Dive: [Plattformübergreifende native UI aus TypeScript](/de/blog/cross-platform-native-ui/).

## Über 27 native npm-Paket-Implementierungen

Eine der größten praktischen Herausforderungen eines neuen Compilers ist die Ökosystem-Kompatibilität. Entwickler schreiben nicht nur Code von Grund auf — sie verwenden Pakete. Perry adressiert dies mit nativen Implementierungen von über 27 beliebten npm-Paketen:

-   **Datenbanken** — mysql2, pg, mongodb, better-sqlite3, ioredis
-   **HTTP** – axios, express, ws (WebSockets)
-   **Sicherheit** — bcrypt, jsonwebtoken, crypto
-   **Utilities** — uuid, chalk, dotenv, lodash (teilweise), moment
-   **System** – fs-extra, glob, chokidar, commander

Das sind keine dünnen Wrapper um Node.js-Module. Sie werden direkt in deine Binärdatei kompiliert unter Verwendung nativer Systembibliotheken — libpq für PostgreSQL, OpenSSL für Kryptografie, libcurl für HTTP. Die API-Oberfläche entspricht dem, was du vom npm-Paket erwarten würdest, sodass die Migration unkompliziert ist.

## Optionale V8-Kompatibilitätsschicht

Für npm-Pakete, die noch keine nativen Perry-Implementierungen haben, bietet Perry einen optionalen V8-Einbettungsmodus. Wenn aktiviert, bündelt Perry eine V8-Runtime und kann Standard-JavaScript-npm-Pakete neben deinem kompilierten TypeScript ausführen. Dies ist ein pragmatisches Notventil, das dir ermöglicht, Perry schrittweise zu übernehmen — kompiliere die heißen Pfade zu nativem Code und behalte dabei Zugriff auf das vollständige npm-Ökosystem für alles andere.

## Cross-Kompilierung

Perry unterstützt Cross-Kompilierung direkt von Haus aus. Von deiner macOS-Entwicklungsmaschine aus kannst du für Linux (x86\_64 und ARM64) und iOS kompilieren. Das bedeutet, du kannst deine CI/CD-Pipeline auf macOS aufbauen und Binärdateien für alle deine Deployment-Ziele produzieren, ohne dedizierte Build-Maschinen für jede Plattform zu brauchen.

```
# Für Linux von macOS aus bauen
$ perry build app.ts --target linux-x86_64
✓ Built executable: app (3.1 MB)
# Für iOS von macOS aus bauen
$ perry build app.ts --target ios-arm64
✓ Built executable: app (4.8 MB)
```

## Leistung

Perry-kompilierte Binärdateien sind schnell. Da es kein JIT-Aufwärmen, keinen Interpreter-Overhead und keine Garbage-Collector-Pausen gibt, ist die Performance vorhersagbar und konsistent ab dem ersten Aufruf.

In unseren Benchmarks:

-   **Startzeit** — effektiv 0 ms (nativer Prozessstart)
-   **Binärgröße** — 2–5 MB für typische CLI-Tools (vs. 50+ MB für gebündeltes Node.js)
-   **Speicherverbrauch** — 5–10x niedriger als gleichwertige Node.js-Anwendungen
-   **Durchsatz** — konkurrenzfähig mit handgeschriebenem C für rechenintensive Arbeitslasten

Live-Benchmarks findest du auf [demo.perryts.com](https://demo.perryts.com), wo Perry-kompilierte ausführbare Dateien in Echtzeit mit Node.js und Bun verglichen werden.

## Aktueller Stand

Perry befindet sich in aktiver Entwicklung. Der Compiler ist stabil mit 62 von 62 bestandenen Tests in der Testsuite. Alle sechs Plattform-UI-Backends sind funktionsfähig. Die Kernsprachfeatures sind solide und werden erweitert.

Wir arbeiten aktiv an der Erweiterung der UI-Widget-Bibliothek, der Verbesserung der String- und Objekt-Performance, der Vervollständigung der vollen Regex-Unterstützung und dem Bau des Stream-Moduls. Längerfristig planen wir WASM-Kompilierungsziele, Multi-Threading, eine VS Code-Erweiterung und Paketmanager-Integration.

Schau dir die vollständige [Roadmap](/de/roadmap/) für Details an, was ausgeliefert wurde, was in Arbeit ist und was als Nächstes kommt.

## Loslegen

Perry ist Open Source. Du kannst das Repo klonen, aus dem Quellcode bauen und heute anfangen, TypeScript zu kompilieren:

```
$ git clone https://github.com/PerryTS/perry.git
$ cd perry
$ cargo build --release
# Kompiliere deine erste TypeScript-Datei
$ ./target/release/perry build hello.ts
✓ Built executable: hello (2.1 MB)
$ ./hello
Hello, world!
```

Durchstöbere den Quellcode auf [GitHub](https://github.com/PerryTS/perry), schau dir die [Showcase](/de/showcase/) an, um zu sehen, was mit Perry gebaut wird, oder tauche direkt in den Code ein. Wir können es kaum erwarten zu sehen, was du baust.
