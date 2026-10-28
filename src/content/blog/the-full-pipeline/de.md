---
title: "Die komplette Pipeline: Dokumentation, Distribution und WidgetKit"
excerpt: "82 Commits in einer Woche: eine 49-seitige Dokumentationsseite, automatisierte App-Store- und Play-Store-Veröffentlichung, Homebrew- und APT-Pakete, native WidgetKit-Erweiterungen aus TypeScript, neue Widgets, http/https-Module und ein sich selbst hostender LLVM-Compiler."
date: 2026-03-13
tags: ["distribution", "documentation", "WidgetKit", "milestone"]
---
82 Commits in sieben Tagen. Eine Dokumentationsseite mit 49 Seiten. Automatisierte App Store und Play Store-Veröffentlichung. Homebrew- und APT-Pakete. Native WidgetKit-Erweiterungen, kompiliert aus TypeScript. Ein Self-Hosting-LLVM-Compiler. Und Dutzende von Bugfixes auf jeder Plattform.

Dieser Beitrag deckt alles ab, was bei Perry zwischen dem 6. und 13. März 2026 ausgeliefert wurde. Das Thema ist Vervollständigung — die Lücken zwischen "Ich habe etwas TypeScript geschrieben" und "Meine App ist im App Store" füllen.

## docs.perryts.com

Perry hat jetzt eine richtige Dokumentationsseite. 49 Seiten, gebaut mit mdBook, die alles von den ersten Schritten bis zur CLI-Referenz abdecken. Die Docs sind in Abschnitte gegliedert:

-   **Erste Schritte** — Installation, erstes Projekt, Projektstruktur
-   **Sprachfeatures** — alles, was Perry von TypeScript unterstützt
-   **Native UI** — 12 Seiten über alle Widget-Typen, Layout, State Management und plattformspezifisches Verhalten
-   **Plattformen** — dedizierte Seiten für jede der 6 Zielplattformen
-   **Standardbibliothek** — über 50 native Paketimplementierungen dokumentiert
-   **System-APIs** — Dateidialoge, Keychain, Benachrichtigungen, Multi-Window
-   **WidgetKit** — das neue Widget-Erweiterungsmodul
-   **Plugins** — Compile-Time-Plugin-Architektur
-   **CLI-Referenz** — jeder Befehl und jedes Flag

Die Seite enthält auch eine `llms.txt`\-Datei für KI-Auffindbarkeit und wird über GitHub Pages mit einer Custom Domain unter [docs.perryts.com](https://docs.perryts.com) bereitgestellt.

## Perry in einem Befehl installieren

Perry wird jetzt über Homebrew und APT verteilt, zusätzlich zum Bauen aus dem Quellcode. Eine neue GitHub Actions Release-Pipeline baut Binärdateien für macOS (arm64 und x86\_64) und Linux (x86\_64 und arm64) und aktualisiert dann automatisch den Homebrew-Tap und das APT-Repository.

```text
# macOS
brew tap PerryTS/perry
brew install perry
# Debian/Ubuntu
sudo apt update && sudo apt install perry
```

Kein Klonen des Repos und Bauen mit Cargo mehr. Installiere Perry genauso wie jedes andere Tool.

## Automatisierte App Store-Veröffentlichung

Das ist die Änderung, die die meisten manuellen Schritte zusammenfasst. Das Ausführen von `perry publish ios` übernimmt jetzt automatisch die gesamte iOS-Verteilungspipeline:

1.  Generiert einen RSA-Schlüssel und CSR über die App Store Connect API
2.  Erstellt ein Verteilungszertifikat und bündelt es in eine `.p12`
3.  Registriert die Bundle-ID
4.  Erstellt und lädt ein Provisioning-Profil herunter
5.  Erstellt den App Store Connect App-Eintrag
6.  Baut, signiert und lädt zu TestFlight oder dem App Store hoch

Kein Xcode. Keine manuellen Portal-Besuche. Kein Herunterladen von Zertifikaten aus einem Browser. Der Setup-Assistent läuft automatisch beim ersten Veröffentlichen, führt durch die API-Schlüssel-Konfiguration und speichert Anmeldedaten in `perry.toml`.

Die macOS-Distribution ist genauso automatisiert. Perry unterstützt drei Modi: TestFlight, notarisiertes DMG und einen neuen **"both"**\-Modus, der im App Store veröffentlicht und gleichzeitig ein notarisiertes DMG erstellt. Drei Zertifikatstypen werden automatisch generiert: `MAC_APP_DISTRIBUTION`, `MAC_INSTALLER_DISTRIBUTION` und `DEVELOPER_ID_APPLICATION`.

Die Android-Veröffentlichung erhielt ebenfalls einen automatisch ausgelösten Setup-Assistenten. Alle drei Plattformen folgen jetzt demselben Muster: Erster Lauf löst Setup aus, Anmeldedaten werden im Projekt gespeichert, nachfolgende Läufe sind ohne Konfiguration.

Die Pre-Flight-Validierung fängt Probleme vor dem Build ab — Provisioning-Profil Bundle-ID-Mismatch, Zertifikatsablauf, fehlendes App-Icon, ungültiges Versionsformat, falsche Team-ID. Und `encryption_exempt` in `perry.toml [ios]` setzt automatisch den `ITSAppUsesNonExemptEncryption` Info.plist-Schlüssel und überspringt die manuelle Export-Compliance-Abfrage in App Store Connect.

## perry/widget: WidgetKit aus TypeScript

Perry kann jetzt TypeScript zu nativen SwiftUI WidgetKit-Erweiterungen kompilieren. Das ist kein Wrapper oder Bridge — der Compiler durchläuft den Render-Baum auf HIR-Ebene und gibt SwiftUI-Quellcode direkt aus. Das Ergebnis ist ein vollständiges WidgetKit-Extension-Bundle, das Xcode (oder Perrys Build-Pipeline) in deine App einbetten kann.

```text
perry widget.ts --target ios-widget --app-bundle-id com.example.app -o out/
```

Der Ansatz unterscheidet sich grundlegend vom Rest der Perry-Kompilierung. Normaler Perry-Code geht durch Cranelift zu nativem Maschinencode. Widget-Code geht durch die HIR zu SwiftUI-Textausgabe, weil WidgetKit SwiftUI erfordert — es gibt keine Möglichkeit, eine Widget-Erweiterung mit imperativem UIKit- oder AppKit-Code zu bauen. Perry löst dies, indem es den Widget-Render-Baum als Compile-Time-Template behandelt, nicht als Runtime-Code.

## Neue Widgets und Plattform-Verbesserungen

Vier neue Widget-Typen landeten diese Woche:

-   **TextArea** — mehrzeilige Textbearbeitung auf macOS, iOS und Android
-   **SecureField** — Passworteingabe auf iOS und macOS
-   **QR Code** — native QR-Code-Generierung auf iOS, macOS und Android
-   **Splash Screen** — automatisch generierte LaunchScreen-Storyboards (iOS) und Splash-Themes (Android)

### iPad wird nativ

Perry generiert jetzt vollständig iPad-native Apps: `UIDeviceFamily [1,2]`, Orientierungsunterstützung, `UIRequiresFullScreen` und ein kompiliertes LaunchScreen-Storyboard über ibtool. Eine neue `getDeviceIdiom()`\-Funktion erkennt zur Laufzeit Phone vs. iPad, und `PerryFrameSplit` bietet frame-basierte horizontale Split-Container für iPad-Layouts.

### Windows

Windows bekam Timer-Unterstützung (50ms `WM_TIMER`\-Tick), owner-drawn Buttons mit Dark-Theme-Hintergründen und Fixes für einen Use-After-Free-Bug in `to_wide().as_ptr()` über 18 Widget-Dateien. Die V8-Runtime funktioniert jetzt unter Windows mit den erforderlichen verlinkten Systembibliotheken.

### GTK4 (Linux)

Das GTK4-Backend erhielt visuelles Polishing passend zu macOS: CSS-Padding für Edge-Insets, Adwaita-Button-Styling, VStack-Margin-Fixes und ScrollView-Horizontal-Policy.

## http/https und better-sqlite3

Zwei bedeutende stdlib-Ergänzungen:

Die neuen nativen Module `http` und `https` bieten clientseitiges HTTP mit reqwest unter der Haube. Die API entspricht Node.js: `request()`, `get()`, `ClientRequest` mit write/end/on und `IncomingMessage` mit statusCode und Event-Handlern.

`better-sqlite3` wird jetzt vollständig unterstützt: `new Database()`, `prepare`, `exec`, `run`, `get`, `all` — mit korrektem NaN-Boxing und Zeilenobjekten mit benanntem Property-Zugriff.

Weitere stdlib-Verbesserungen: `crypto.randomBytes()` gibt jetzt einen Buffer zurück (entspricht Node.js), MongoDB erhielt `listDatabases` und `listCollections` mit Thread-Safety-Fixes, und mysql2 INSERT/UPDATE/DELETE gibt jetzt `ResultSetHeader` mit `insertId` zurück.

## GC- und Korrektheitsfixes

Mehrere kritische Garbage-Collector- und Runtime-Korrektheitsfixes wurden diese Woche ausgeliefert:

-   **GC-Reentrancy-Guard** — verhindert Collection während der Allokation, behebt RefCell Double-Borrow Panics
-   **GC Map-Tracing** — Maps werden jetzt während der Mark-Phase korrekt getrasst, verhindert String-Key-Collection
-   **String-Aliasing-Fix** — String-Append allokiert jetzt immer frische Strings, behebt Korruption durch Pointer-Copy-Aliasing
-   **BigInt-Arithmetik** — Right-Shift verwendet arithmetischen Shift für negative Zahlen, Bitwise-Ops verwenden ToInt32-Wrapping-Semantik
-   **Map.get() undefined** — gibt korrektes `TAG_UNDEFINED` für fehlende Schlüssel zurück statt falschem NaN-Tag
-   **Statische Feld-GC-Roots** — BigInt-Werte in statischen Klassenfeldern als GC-Roots registriert

Das sind keine Kleinigkeiten. Der GC-Reentrancy-Fix allein löste eine ganze Klasse von intermittierenden Abstürzen. Der String-Aliasing-Fix betraf jedes Programm, das eine String-Variable einer anderen zuwies und dann eine davon mutierte. Das sind die Art von Bugs, die erst unter realen Arbeitslasten auftreten, und sie zu beheben macht den Compiler produktionsreif.

## perry-verify: Gehärtet

`perry-verify`, der automatisierte App-Verifizierungsservice, erhielt eine Sicherheitshärtung: sandboxed Ausführung über `bwrap` auf Linux und `sandbox-exec` auf macOS, Auth-Tokens bei WebSocket-Handshake und Binary-Download, Per-IP Rate-Limiting, vollständige UUID-Job-IDs zur Verhinderung von Enumeration und reduzierte Body-Limits.

## perrysdad: Der Self-Hosting-Compiler

In einer parallelen Anstrengung ging `perrysdad` — ein Self-Hosting LLVM IR-Compiler, geschrieben in TypeScript — in fünf Phasen über die Woche von null zur Self-Compilation:

1.  **Phase 0-1** — End-to-End-Skelett: HIR zu LLVM IR-Text zu clang, gelinkt gegen Perrys `libperry_runtime.a`
2.  **Phase 2** — handgeschriebener rekursiver Abstiegsparser mit Pratt-Expression-Parsing für echte `.ts`\-Dateien
3.  **Phase 3** — Arrays, Objekte und Maps mit Runtime-FFI, plus Behebung eines kritischen ABI-Mismatches (JSValue als double in LLVM IR deklariert statt i64)
4.  **Phase 4** — Klassen, Enums, Closures, Multi-File-Compilation mit Modul-Discovery und topologischer Sortierung

Der Meilenstein: die selbst-kompilierte `anvil`\-Binärdatei kann jetzt Testprogramme kompilieren und korrekte Ausgaben produzieren, die mit der node-kompilierten Version übereinstimmen. Ein TypeScript-Compiler, kompiliert von Perry zu nativem Code, der weiteres TypeScript zu nativem Code kompiliert. Schildkröten bis ganz nach unten.

## In Zahlen

-   **82 Commits** zum Haupt-Perry-Compiler
-   **1 Release**: v0.2.173 (8. März)
-   **49 Dokumentationsseiten** auf docs.perryts.com
-   **4 neue Widgets**: TextArea, SecureField, QR Code, Splash Screen
-   **3 Vertriebskanäle**: Homebrew, APT, Quellcode
-   **3 automatisierte Store-Pipelines**: App Store, TestFlight, Google Play
-   **Alle 6 Plattformen** erhielten diese Woche Verbesserungen

## Was kommt als Nächstes

Die Pipeline füllt sich. Du kannst TypeScript schreiben, auf sechs Plattformen kompilieren, über Homebrew oder APT verteilen, im App Store und Play Store veröffentlichen, Homescreen-Widgets hinzufügen und umfassende Dokumentation lesen — alles ohne Perrys Toolchain zu verlassen. Was bleibt:

-   **Vollständige Regex-Unterstützung** — die letzte große Sprachlücke
-   **perry/ui-Erweiterung** — Drag and Drop, Barrierefreiheitslabels, DatePicker
-   **perrysdad-Reifung** — den Self-Hosting-Compiler in Richtung voller Perry-Parität erweitern
-   **Hub öffentliche Beta** — verteilte Builds für externe Nutzer öffnen

Verfolge den Fortschritt auf [GitHub](https://github.com/PerryTS/perry), lies die neue Dokumentation auf [docs.perryts.com](https://docs.perryts.com), oder sieh dir die [Roadmap](/de/roadmap/) für das vollständige Bild an.
