---
title: "Echtes Multi-Threading, Compile-Time-i18n und watchOS"
excerpt: "Perry v0.4.0: echte OS-Threads mit Compile-Time-Sicherheit, ein zeremonienloses Internationalisierungssystem für über 30 Sprachen, watchOS als 9. Kompilierungsziel, Audio- und Kamera-APIs sowie eine parallele Compiler-Pipeline."
date: 2026-03-23
tags: ["threading", "i18n", "watchOS", "compiler", "milestone"]
---
Perry v0.4.0 ist das größte Release seit Projektbeginn. Drei Versionssprünge in einem Zyklus — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (Multi-Threading) — und der Compiler selbst ist jetzt parallel. Hier ist alles, was ausgeliefert wurde.

## Echtes Multi-Threading

Perry hat jetzt echte OS-Thread-basierte Parallelität. Keine Web Worker mit Serialisierungs-Overhead. Kein `SharedArrayBuffer` mit `Atomics`. Echte Threads — leichtgewichtige 8MB-Stack-OS-Threads, die nichts teilen und nichts kosten, wenn sie idle sind.

Das neue `perry/thread`\-Modul bietet drei Primitive:

```
import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Arbeit auf alle CPU-Kerne verteilen, Ergebnisse in Reihenfolge
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Parallel filtern
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Hintergrund-Thread starten, Promise erhalten
const result = await spawn(() => {
  // läuft auf einem separaten OS-Thread
  return computeExpensiveResult();
});
```

`parallelMap` und `parallelFilter` erkennen automatisch die Anzahl der CPU-Kerne und verteilen das Eingabe-Array darauf. Bei kleinen Arrays wird Threading komplett übersprungen und synchron ausgeführt — kein Overhead für triviale Arbeitslasten.

`spawn` startet einen Hintergrund-OS-Thread und gibt ein Promise zurück. Das Ergebnis fließt über eine ausstehende Ergebnis-Warteschlange zurück, die während der Microtask-Verarbeitung geleert wird, sodass man es wie jede andere asynchrone Operation mit `await` behandeln kann.

### Compile-Time-Sicherheit

Der wichtigste Teil ist nicht die API — es ist das, was der Compiler *verhindert*. Perry lehnt statisch Closures ab, die veränderbare Variablen erfassen:

```
let counter = 0;

// ✗ Kompilierfehler: Closure erfasst veränderbare Variable 'counter'
parallelMap(items, (item) => {
  counter++;  // zur Kompilierzeit abgelehnt
  return item * 2;
});
```

Kein geteilter veränderbarer Zustand bedeutet keine Data Races. Keine Locks, keine Mutexes, keine `Atomics`. Der Compiler erzwingt Thread-Sicherheit, bevor eine einzige Zeile Maschinencode erzeugt wird.

### Unter der Haube

Jeder Worker-Thread bekommt seine eigene Speicher-Arena mit `Drop`\-Bereinigung — keine GC-Koordination zwischen Threads. Werte werden über `SerializedValue`\-Tiefkopie übertragen: kostenfrei für Zahlen, O(n) für Strings, Arrays und Objekte. Die Implementierung lebt in einer einzigen 1.120-Zeilen Rust-Datei (`perry-runtime/src/thread.rs`) und erforderte keine Änderungen am Garbage Collector.

Vergleich zu V8-Isolates, die separate Heaps pro Worker mit ~2MB Overhead benötigen. Perrys Threads sind einfach pthreads mit Arenas.

### Parallele Compiler-Pipeline

Auch der Compiler selbst ist jetzt parallel. Modul-Codegen, Transform-Passes (JS-Imports, native Instanzen, Monomorphisierung) und `nm`\-Symbolscannen laufen alle über alle CPU-Kerne via rayon. Kombiniert mit dem Cranelift 0.121 Upgrade (von 0.113 — acht Minor-Versionen mit Register-Allokation- und x64-Verbesserungen) ist die Kompilierung deutlich schneller.

## Compile-Time i18n (v0.3.0)

Perrys Internationalisierungssystem hat null Zeremonie. String-Literale in UI-Widgets werden automatisch als lokalisierbare Schlüssel behandelt. Übersetzungsdateien sind flache JSON-Dateien in einem `locales/`\-Verzeichnis. Alle Validierung erfolgt zur Kompilierzeit.

```
// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Dein Code — verwende Strings einfach normal
Button({ title: "greeting", action: () => {} })
```

Der Compiler validiert alles: fehlende Übersetzungen, Parameter-Unstimmigkeiten, Plural-Fehler. Übersetzungen werden als eingebettete 2D-String-Tabelle in die Binärdatei eingebettet, mit nahezu null Runtime-Lookup — kein JSON-Parsing beim Start.

### Was enthalten ist

-   **CLDR-Pluralregeln** für 30+ Locales mit `.one`/`.other`/`.few`/`.many`/`.zero`/`.two`\-Suffixen
-   **Format-Wrapper**: `Currency`, `Percent`, `ShortDate`, `LongDate`, `FormatNumber`, `FormatTime`, `Raw`
-   **Native Locale-Erkennung** auf allen Plattformen: `CFLocaleCopyCurrent` (macOS/iOS), `GetUserDefaultLocaleName` (Windows), `system_property_get` (Android), `LANG`/`LC_ALL` (Linux)
-   **`perry i18n extract`** CLI: scannt TS/TSX-Dateien, generiert und aktualisiert Locale-JSON-Gerüste
-   **Plattform-native Ressourcengenerierung**: iOS `.lproj` und Android `values-xx/` Verzeichnisse
-   **`import { t } from "perry/i18n"`** für die Lokalisierung von Nicht-UI-Strings

Konfiguration in `perry.toml`:

```
[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }
```

## Native watchOS-Apps (v0.3.2)

Perry kompiliert jetzt für watchOS — das 9. Kompilierungsziel. Das ist kein Wrapper oder eine Companion-App. Es ist eine eigenständige watchOS-Binärdatei mit einer nativen SwiftUI-Oberfläche.

Der watchOS-Renderer verwendet einen **datengesteuerten Ansatz**: Perry erstellt einen UI-Baum über `perry_ui_*` FFI-Aufrufe, und eine mitgelieferte `PerryWatchApp.swift` fragt den Baum ab und rendert SwiftUI-Views reaktiv. 15 Widget-Typen werden unterstützt, mit Stubs für nicht unterstützte.

```
# Für watchOS kompilieren
perry compile main.ts --target watchos

# Auf Apple Watch Simulator ausführen
perry run watchos

# Signierung für watchOS einrichten
perry setup watchos
```

Der vollständige Ablauf funktioniert: `perry setup watchos` teilt App Store Connect-Anmeldedaten mit iOS, `perry run watchos` erkennt automatisch Apple Watch-Simulatoren, und `perry publish watchos` reicht beim App Store ein.

Damit steigt die Gesamtzahl der **Widget-Ziele auf vier**: iOS (WidgetKit), Android (Glance), watchOS (WidgetKit) und Wear OS (Tiles). Jedes hat sein eigenes Compile-Target und Codegen-Backend.

## Audio- & Kamera-APIs

Zwei neue Hardware-APIs werden in diesem Release ausgeliefert:

### Audio-Aufnahme (`perry/system`)

Plattformübergreifende Audio-Aufnahme mit A-bewerteter dB(A)-Messung:

```
import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) mit EMA-Glättung
const waveform = audioGetWaveformSamples();  // 256-Sample Ringpuffer
audioStop();
```

Plattform-Backends: AVAudioEngine (macOS/iOS), AudioRecord über JNI (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web).

### Kamera-Aufnahme (`perry/ui`)

Native Kamera-Vorschau mit pixelgenauer Farbentnahme (iOS):

```
import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 Mittelwertbildung
```

## Ökosystem-Pakete

Zwei neue First-Party-Pakete:

-   **perry/push** — Push-Notification-Bindings für iOS/macOS: Berechtigungsanfragen, APNs-Token-Abruf, Badge-Zähler. Android-Stub mit FCM geplant.
-   **perry/storekit** — StoreKit 2 In-App-Kauf-Bindings: Produktladen, Käufe mit JWS-Quittungen, Abonnement-Prüfung, Wiederherstellung und Transaktions-Listener.

Beide folgen derselben Architektur: TypeScript-Deklarationen → Rust FFI-Crate → Swift-Bridge. Als Abhängigkeit installieren, Funktionen importieren, Ergebnisse mit `await` abwarten. Der Compiler kümmert sich um alle nativen Bridges.

## Infrastruktur

-   **Cranelift 0.113 → 0.121** — acht Minor-Versionen mit Register-Allokation, x64-Fixes und Stack-Slot-Alignment-Verbesserungen
-   **Windows-Funktionsaufteilung** — teilt automatisch Funktionen mit 50+ Anweisungen in Fortsetzungen auf, um Cranelift-Codegen-Probleme unter Windows zu umgehen
-   **Selektives Modul-Variablen-Laden** — lädt nur referenzierte Modul-Level-Variablen beim Funktionseintritt, reduziert die Windows-Binärgröße um 26 %
-   **Array.sort() Upgrade** — von O(n²) Insertion Sort zu O(n log n) TimSort-Hybrid
-   **perry run android** — vollständige APK-Build-Pipeline: Kompilieren, Gradle-Projektgenerierung, assembleDebug, Installieren, Starten
-   **Benutzerdefinierte Info.plist-Einträge** — `[ios.info_plist]` in perry.toml für Datenschutzbeschreibungen, URL-Schemata, Hintergrundmodi

## In Zahlen

-   **Version**: 0.2.197 → 0.4.0 (drei große Meilensteine)
-   **Kompilierungsziele**: 8 → 9 (watchOS hinzugefügt)
-   **Widget-Ziele**: 1 → 4 (iOS, Android, watchOS, Wear OS)
-   **Neue Crates**: perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles
-   **Neue Dokumentation**: Threading (4 Seiten), i18n (4 Seiten), watchOS, erweiterte Widget-Docs (3 → 8 Seiten)
-   **perry/thread Implementierung**: 1.120 Zeilen Rust, null Änderungen am GC

## Was kommt als Nächstes

Die Threading-Grundlage eröffnet vieles: parallele HTTP-Anfrageverarbeitung, gleichzeitige Dateioperationen und rechenintensive Arbeitslasten, die zuvor durch Single-Threaded-Ausführung blockiert waren. Auf der Sprachseite bleibt volle Regex-Unterstützung die größte Lücke, und die `perry/ui`\-Erweiterung (Drag and Drop, Barrierefreiheit, DatePicker) geht weiter.

Verfolge den Fortschritt auf [GitHub](https://github.com/PerryTS/perry), lies die Dokumentation auf [docs.perryts.com](https://docs.perryts.com), oder sieh dir die [Roadmap](/de/roadmap/) für das vollständige Bild an.
