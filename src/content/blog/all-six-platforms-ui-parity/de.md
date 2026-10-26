---
title: "Alle sechs Plattformen, vollständige Feature-Parität"
excerpt: "Über 20 native UI-Widgets, ein Canvas-Widget, Table-Views, Systembenachrichtigungen, Keychain-Zugriff, Multi-Window-Support und vollständige Feature-Parität auf macOS, iOS, iPadOS, Android, Linux und Windows — alles aus einer einzigen TypeScript-Codebasis."
date: 2026-02-28
tags: ["UI", "cross-platform", "release", "milestone"]
---
Als wir die erste Version von Perrys nativem UI-System ausgeliefert haben, bedeutete "plattformübergreifend", dass macOS gut funktionierte und die anderen fünf Plattformen Stubs waren. Heute, mit v0.2.162, ist das nicht mehr der Fall. Alle sechs Plattformen — macOS, iOS, iPadOS, Android, Linux und Windows — haben jetzt vollständige Feature-Parität. Derselbe TypeScript-Code kompiliert auf jedem Ziel zu nativen Widgets.

Dieser Beitrag geht durch, was wir zwischen v0.2.152 und v0.2.164 ausgeliefert haben: ein Canvas-Widget, eine vollständige NSTableView-Implementierung, über 20 UI-Widgets insgesamt, das `perry/system`\-Modul, Multi-Window-Unterstützung, System-Benachrichtigungen, Keychain-Zugriff, automatische Binärgrößenreduzierung und ein Compile-Time-Plugin-System. Es ist viel passiert.

## Der Widget-Sprint: Über 20 native UI-Komponenten

Der größte einzelne Sprung kam mit v0.2.155, das über 20 UI-Widgets auf allen Plattformen einführte. Perrys TypeScript-UI-API deckt jetzt die Komponenten ab, die man tatsächlich braucht, um eine echte App auszuliefern:

-   **Layout** — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView
-   **Eingabe** — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker
-   **Anzeige** — Text, Label, Image, ProgressView, Divider, Spacer
-   **Daten** — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)
-   **Overlay** — Alert, Sheet, Popover, Toolbar, NavigationBar
-   **Zeichnung** — Canvas (2D-Zeichen-API, hardwarebeschleunigt pro Plattform)

Das sind keine Wrapper um einen benutzerdefinierten Renderer. Jedes Widget kompiliert zur plattformeigenen nativen Komponente: `NSButton` auf macOS, `UIButton` auf iOS, `GtkButton` auf Linux, `android.widget.Button` auf Android über JNI, und `CreateWindowEx` auf Windows. Das Betriebssystem zeichnet sie, gibt ihnen ein Theme und kümmert sich um Barrierefreiheit — Perry verdrahtet nur die TypeScript-API.

## Canvas: 2D-Zeichnung aus TypeScript

Eine der technisch interessanteren Ergänzungen ist das Canvas-Widget (v0.2.152). Es bietet eine vertraute 2D-Zeichen-API direkt aus TypeScript — Bezier-Kurven, Füllungen, Striche, Bild-Blitting — und kompiliert zum beschleunigten 2D-Backend der Plattform: Core Graphics auf macOS/iOS, Cairo auf Linux, Direct2D auf Windows und Skia auf Android.

canvas.ts

import { Canvas, Color } from 'perry/ui';

// Kompiliert zu Core Graphics auf macOS, Cairo auf Linux, etc.

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

## Table-Widget: NSTableView kommt zu TypeScript

v0.2.163 brachte das Table-Widget — die komplexeste Komponente der Bibliothek. Auf macOS bildet es auf `NSTableView` mit vollständiger Delegate/Data-Source-Verdrahtung ab. Auf Linux verwendet es GTK4s `GtkTreeView`. Auf Windows Win32s `ListView`\-Steuerelement. Auf Android bindet es an `RecyclerView` über JNI.

Die TypeScript-API ist deklarativ: Du definierst Spalten, stellst eine Datenquelle bereit, und Perry kümmert sich zur Kompilierzeit um die plattformspezifische Verdrahtung. Spaltensortierung, Auswahlbehandlung und Zeilenhöhenanpassung funktionieren direkt out of the box.

table.ts

import { Table, Column } from 'perry/ui';

const table = new Table({

columns: \[

new Column({ title: "Name", key: "name", width: 200 }),

new Column({ title: "Size", key: "size", width: 80 }),

\],

rows: files, // TypeScript-Array von Objekten

onSelect: (row) => console.log(row.name),

});

## Das perry/system-Modul

v0.2.155 führte auch `perry/system` ein — ein TypeScript-Modul, das plattformseitige System-APIs ohne jegliche Runtime bereitstellt: Dateidialoge, Speicherdialoge, Warnungen, Sheets, Keychain-Zugriff, System-Benachrichtigungen und Multi-Window-Verwaltung.

-   `system.showOpenDialog()` — nativer Dateiauswahldialog (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)
-   `system.showSaveDialog()` — nativer Speicherdialog
-   `system.showAlert()` — natives Warnungspanel
-   `system.notify()` — OS-Benachrichtigung (UserNotifications / libnotify / WinRT)
-   `system.keychain.get/set()` — Keychain Services / Secret Service / Windows Credential Store
-   `system.openWindow()` — Multi-Window-Verwaltung

All diese rufen native Plattform-APIs direkt auf — kein Electron IPC, keine Web-View-Bridge. Perry kompiliert die TypeScript-Aufrufstelle zu einem direkten nativen Funktionsaufruf in das Plattform-SDK.

## Sechs-Plattform-Feature-Parität: v0.2.162

Der Meilenstein v0.2.162 ging darum, Lücken zu schließen. Vor diesem Release hatte macOS den vollständigsten Funktionsumfang, iOS war größtenteils da, und Linux/Windows/Android hinkten hinterher. v0.2.162 brachte alle sechs Plattformen auf dasselbe Niveau:

-   **macOS** — AppKit, vollständiger Widget-Satz, Keychain, Benachrichtigungen, Multi-Window, Toolbar
-   **iOS / iPadOS** — UIKit, volle Widget-Parität mit macOS, Scene-Lifecycle
-   **Android** — JNI-Bridge, alle Widgets über Android Views, NDK-Cross-Kompilierung
-   **Linux** — GTK4, vollständiger Widget-Satz inklusive Table, Dateidialoge, libsecret Keychain
-   **Windows** — Win32, alle Widgets, Windows Credential Store, WinRT-Benachrichtigungen

Dies ist der Meilenstein, der "eine Codebasis, sechs Plattformen" real statt angestrebt macht. Dieselbe TypeScript-Datei kompiliert auf allen sechs Zielen zu nativen Apps, ohne dass für gängige Anwendungsfälle plattformspezifische Codepfade erforderlich sind.

## Automatische Binärgrößenreduzierung

v0.2.153 lieferte automatische Binärgrößenreduzierung — der Compiler entfernt jetzt aggressiv ungenutzte Codepfade, eliminiert unerreichbare stdlib-Funktionen und dedupliziert Symboldefinitionen beim Linken. Ein typisches CLI-Tool, das zuvor ~4 MB kompilierte, kommt jetzt auf unter 2 MB, ohne Änderungen am Quellcode.

Das ist wichtig für reale Deployments. Wenn deine Binärdatei die Deploymenteinheit ist — auf einen Server kopiert, als einzelne Datei verteilt, in einen Container eingebettet — beeinflusst die Größe direkt Übertragungszeit und Speicherkosten. Die Halbierung der Binärgröße ohne Mehraufwand ist eine bedeutende Verbesserung.

## Das Compile-Time-Plugin-System

v0.2.152 führte Perrys Plugin-System ein — und es ist architektonisch anders als jedes andere Plugin-System im TypeScript-Ökosystem. Es gibt kein Runtime-Plugin-Laden, kein IPC, kein dynamisches `require()`. Plugins sind TypeScript-Module, die Perry zur Build-Zeit auflöst und kompiliert.

Das Ergebnis: Plugins haben exakt null Runtime-Overhead. Sie werden in dieselbe Binärdatei wie dein Anwendungscode kompiliert, mit direkten Funktionsaufrufen zwischen Plugin-Code und Host-Code. Wenn du ein Plugin nicht verwendest, erscheint es nicht in deiner Binärdatei. Wenn du es verwendest, wird es wie jedes andere Modul inlined.

Wir haben über die Philosophie dahinter in [Plugin-Systeme sind eine Performance-Steuer](/de/blog/plugin-systems-are-a-performance-tax/) geschrieben. Die Kurzversion: Runtime-Plugin-Architekturen tauschen Performance gegen Erweiterbarkeit. Build-Time-Komposition gibt dir beides.

## Sprachverbesserungen

Der UI-Sprint fand nicht isoliert statt — der Compiler selbst wurde immer leistungsfähiger. Über diese Releases hinweg:

-   **Klassen-Ausdrücke** — `const Foo = class extends Bar {}` kompiliert jetzt korrekt
-   **Generator-Transformationen** — `function*` und `yield` kompilieren zu nativen Zustandsmaschinen
-   **Map/Set als Klassenfelder** — `private items = new Map()` funktioniert in der Codegen
-   **FFI-Parameter-Typ-Koercion** — native Bibliotheksaufrufe behandeln Typkonvertierung automatisch
-   **Gebundene Methodenreferenzen** — `this.method`\-Referenzen funktionieren für native Module (fs, os, path)
-   `string.match()` — jetzt vollständig unterstützt
-   `path.isAbsolute()`, Multi-Arg `path.join()`, `path.resolve()`
-   **Web-Ziel** — Perry kann jetzt in eine webkompatible Ausgabe für Hybrid-Deployments kompilieren

## Was kommt als Nächstes

Mit der Sechs-Plattform-UI-Parität ausgeliefert, ist die nächste Phase Tiefe statt Breite. Wir arbeiten an:

-   Vollständige RegExp-Unterstützung (`regex.test()`, `string.matchAll()`)
-   Drag and Drop, benutzerdefinierte Kontextmenüs und Barrierefreiheitslabels im Widget-System
-   Eine VS Code-Erweiterung für Perry-Diagnosen und Compile-on-Save
-   Paketmanager-Integration — Perry-native Pakete mit einem Befehl installieren und kompilieren
-   WASM-Kompilierungsziel für Browser-Deployment
-   Multi-Threading über `Worker`\-Threads

Wer mitmachen möchte, das [Perry-Repo](https://github.com/PerryTS/perry) ist offen. Schau dir die [Showcase](/de/showcase/) an, um zu sehen, was bereits gebaut wird, oder durchstöbere die [Roadmap](/de/roadmap/) für das vollständige Bild.
