---
title: "tvOS, Cross-Compile für iOS von Linux und Perry Login"
excerpt: "Perry v0.4.24: tvOS als 10. Kompilierungsziel, Cross-Compile für iOS und macOS von Linux via ld64.lld, perry login mit nutzungsbasierter Abrechnung, Windows-UI-Überarbeitung, macOS-Notarisierung und 120 Commits in 5 Tagen."
date: 2026-03-28
tags: ["tvOS", "cross-compilation", "billing", "Windows", "milestone"]
---
Fünf Tage, 120 Commits, und Perry springt von v0.4.0 auf v0.4.24. Die Highlights: tvOS wird das 10. Kompilierungsziel, iOS- und macOS-Apps können jetzt vollständig unter Linux gebaut werden, perry login bringt nutzungsbasierte Abrechnung, und die Windows-UI erhält eine komplette Überarbeitung. Hier ist alles, was ausgeliefert wurde.

## tvOS: Das 10. Kompilierungsziel

Perry kompiliert jetzt für Apple TV. Das tvOS-Ziel verwendet denselben SwiftUI-Renderer wie watchOS und teilt die datengesteuerte Architektur, bei der Perry einen UI-Baum erstellt und eine mitgelieferte Swift-Host-App diesen nativ rendert. Kombiniert mit der bestehenden `@perry/threads` WASM-Integration können tvOS-Apps rechenintensive Arbeitslasten im Hintergrund ausführen, während die Benutzeroberfläche reaktionsfähig bleibt.

```
# Für Apple TV kompilieren
perry compile main.ts --target tvos

# Auf tvOS-Simulator ausführen
perry run tvos
```

Damit steigt die Gesamtzahl der Ziele auf **10**: macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly und Web/JavaScript. Eine TypeScript-Codebasis, zehn native Ausgaben.

## Cross-Kompilierung von iOS und macOS unter Linux

Perry kann jetzt iOS- und macOS-Binärdateien vollständig auf einem Linux-Rechner mit `ld64.lld` als Mach-O-Linker erstellen. Dies ist das fehlende Puzzlestück für vollautomatisiertes CI/CD — TypeScript auf einen Linux-Server pushen und signierte native Binärdateien für jede Apple-Plattform erhalten, ohne eine macOS-Build-Maschine.

Um hierhin zu gelangen, musste eine Kaskade von Linker-Problemen gelöst werden:

-   **Mach-O-Codegen-Triple** — `aarch64-apple-macos` und `aarch64-apple-ios` Ziel-Triples für Cranelift hinzugefügt
-   **Framework-Verlinkung** — CoreGraphics, Metal, IOKit, DiskArbitration Framework-Suchpfade für Cross-Kompilierung
-   **`-lobjc`** — ObjC-Runtime-Symbole werden für alle Apple-Ziele benötigt
-   **SDK-Version** — `sdk_version 26.0` in ld64.lld (Apple erfordert iOS 18+)
-   **Dead Stripping** — `-dead_strip` statt `-Wl,-dead_strip` für den Mach-O-Linker
-   **Runtime-Deduplizierung** — doppelte `perry_runtime` aus UI-Static-Libs entfernen, um Link-Fehler zu vermeiden

Kombiniert mit der bestehenden Linux → Windows Cross-Kompilierung (v0.2.195+) kann Perry jetzt **von Linux aus zu jeder Plattform cross-kompilieren** — iOS, macOS, Windows, Android, WASM und Web.

## iOS App Store-Bereitschaft

Ein Hauptfokus dieses Zyklus lag darauf, Perry-kompilierte iOS-Apps vollständig App Store-konform zu machen:

-   **Vollständige Info.plist** — alle von Apple geforderten Schlüssel: `CFBundleIdentifier`, `CFBundleName`, `CFBundleShortVersionString`, `CFBundleVersion`, `UIDeviceFamily`, `UIRequiredDeviceCapabilities`
-   **CFBundleIcons** — Standard-iOS-Icon-Benennung (`AppIcon60x60@2x`, etc.) mit Fallback-Auflösung
-   **Version aus perry.toml** — `version`\- und `build_number`\-Felder fließen direkt in die Info.plist
-   **UILaunchScreen** — verwendet den modernen Schlüssel statt `UILaunchStoryboardName` (keine Storyboard-Datei nötig)
-   **Provisioning-Profile** — macOS-Provisioning-Profile-Unterstützung für App Store und TestFlight-Distribution

## Perry Login und Abrechnung

Perry hat jetzt Benutzerkonten und nutzungsbasierte Abrechnung, angetrieben durch einen neuen `perry login` CLI-Befehl und ein Dashboard unter [app.perryts.com](https://app.perryts.com).

### So funktioniert es

-   **`perry login`** — GitHub OAuth Device Flow, öffnet den Browser, fragt den Abschluss ab
-   **Kostenlose Stufe** — 15 Builds/Monat, unbegrenzte Projekte mit einem GitHub-Konto
-   **Pro-Stufe** — unbegrenzte Builds über Polar.sh-Abonnement
-   **API-Tokens** — Tokens im Dashboard für CI/CD generieren und verwalten
-   **Nutzungsverfolgung** — monatliche Publish- und Verify-Zähler mit Echtzeit-Nutzungsbalken

Das Dashboard selbst ist ein Perry-kompilierter Fastify-Server mit Next.js-Static-Export — gebaut mit Perry, für Perry-Nutzer.

## macOS-Notarisierung und Code-Signierung

Zwei neue Signierungsfähigkeiten:

-   **`perry publish macos --notarize`** — wechselt automatisch zum Developer ID-Zertifikat (statt App Store-Zertifikat), reicht bei Apples Notarisierungsdienst ein und heftet das Ergebnis an
-   **GCloud KMS Code-Signierung** — Windows-Builds können jetzt mit Google Cloud KMS-Schlüsseln signiert werden, was automatisierte Signierung im CI ermöglicht, ohne private Schlüssel preiszugeben

## Windows-UI-Überarbeitung

Das Windows-UI-Backend erhielt sein bisher umfassendstes Update:

-   **DPI-bewusste Skalierung** — Fenstergröße, Schriften und Widget-Dimensionen skalieren korrekt auf High-DPI-Displays
-   **Launcher-Fenster-APIs** — rahmenlose Fenster mit benutzerdefinierter Positionierung für Launcher-/Spotlight-artige UIs
-   **Globale Hotkeys** — systemweite Tastenkombinationen, die auch funktionieren, wenn die App nicht fokussiert ist
-   **App-Icons** — `getAppIcon`\-API zum Anzeigen von Anwendungssymbolen in Launcher-UIs
-   **Reentrancy-sicheres Layout** — `RefCell`\-basiertes Painting wurde durch `SetPropW` HWND-Speicher ersetzt, um Panics bei verschachtelten WM\_PAINT-Nachrichten zu verhindern
-   **Geisterhand-Integration** — alle Widget-Typen beim UI-Testing-Framework registriert, `/type` verwendet `SendMessageW` über HWND-Map
-   **Android-Kamera-Unterstützung** — Kamera-Capture-API auf Android über JNI erweitert

## Performance

v0.4.14 lieferte ein umfassendes Performance-Audit:

-   **Native `fcmp`** — Gleitkommavergleiche verwenden native CPU-Instruktionen statt Runtime-Funktionsaufrufe. Mandelbrot-Benchmark **30 % schneller**.
-   **In-Place String-Append** — `str += "text"` modifiziert den Puffer direkt, statt einen neuen String zu allokieren. **125x schneller** für wiederholte Verkettung.
-   **Kurzschluss-AND/OR** — `&&` und `||` überspringen die Auswertung des rechten Operanden, wenn das Ergebnis bereits feststeht.
-   **Negatives Literal-Folding** — `-1`, `-0.5` usw. werden auf HIR-Ebene zu Konstanten gefaltet, anstatt eine Negationsinstruktion auszugeben.

## Hub Parallele Builds

Der Build-Orchestrierungsserver unterstützt jetzt parallele Builds pro Worker:

-   **Slot-basierte Verteilung** — Worker melden `max_concurrent`\-Kapazität, Hub verfolgt aktive Jobs pro Worker
-   **Keine 429er mehr** — Jobs werden in eine Warteschlange gestellt, anstatt abgelehnt zu werden, wenn alle Worker beschäftigt sind
-   **Base64-Artefakt-Downloads** — binäre Artefakte werden als Base64 bereitgestellt, wenn die Perry-Runtime keine rohen binären HTTP-Antworten verarbeiten kann
-   **Auto-Reconnect WebSocket** — Build-Monitoring-Verbindungen verbinden sich automatisch bei Unterbrechung wieder

## Neues Paket: perry/appstorereview

Ein neues First-Party-Paket zum Anfordern von App Store-Bewertungen:

```
import { requestReview } from "perry/appstorereview";

// Öffnet den nativen Bewertungsdialog
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();
```

Eine Funktion, zwei Plattformen, native Bewertungs-UI. Timing und Anzeigelogik bleiben vollständig dem Entwickler überlassen.

## Codegen-Fixes

120 Commits bedeuten viele Bugfixes. Die wichtigsten:

-   **Strikte Gleichheit (===)** — drei separate Bugs in v0.4.2 behoben: Type-Tag-Vergleich, NaN-Behandlung und null/undefined-Unterscheidung
-   **String-Vergleich für verkettete Strings** — `===` schlug fehl beim Vergleich von durch Verkettung erstellten Strings aufgrund von Pointer-Vergleich statt Inhaltsvergleich
-   **Konstruktor-Auflösung** — `new X(args)` löst jetzt korrekt modulübergreifend importierte Konstruktoren und Closure-basierte Konstruktorfunktionen auf
-   **Modul-Level Array-Push** — Werte, die in verschachtelten Funktionsaufrufen in Schleifen an Modul-Level-Arrays gepusht wurden, gingen aufgrund veralteter Pointer nach Reallokierung verloren
-   **Null-Arithmetik-Koercion** — `null + 1` ergibt jetzt korrekt `1` über `js_number_coerce`
-   **Bitweises NOT-Wrapping** — `~x` wird jetzt gemäß ECMAScript-Semantik auf i32 gewrappt
-   **fetch().then()** — Callbacks wurden in nativen UI-Apps nie ausgelöst, weil die Event-Loop-Abarbeitung fehlte (v0.4.3)
-   **WASM Modulo und Exponent** — `%` und `**` Operatoren verursachten WASM-Validierungsfehler (v0.4.5)

## In Zahlen

-   **~120 Commits** zum Haupt-Perry-Compiler in 5 Tagen
-   **24 Patch-Releases**: v0.4.1 → v0.4.24
-   **Kompilierungsziele**: 9 → 10 (tvOS hinzugefügt)
-   **Cross-Compile-Ziele von Linux**: Windows → Windows, iOS, macOS (alle Apple + Windows)
-   **Neue Pakete**: perry/appstorereview
-   **Neue Infrastruktur**: app.perryts.com Dashboard, perry login CLI, Polar.sh-Abrechnung
-   **Performance-Gewinne**: 30 % schnellerer Mandelbrot (natives fcmp), 125x schnellere String-Verkettung

## Was kommt als Nächstes

Cross-Kompilierung von iOS und macOS unter Linux bedeutet, dass der Hub jetzt für jede Plattform von einem einzigen Linux-Server aus bauen kann — keine dedizierten macOS-Build-Maschinen mehr für die Kompilierung (nur noch für die Signierung). Die Abrechnungsinfrastruktur ebnet den Weg zur öffentlichen Hub-Beta. Und mit tvOS deckt Perry jede Apple-Plattform ab: macOS, iOS, iPadOS, watchOS und tvOS.

-   **Öffentliche Hub-Beta** — externe Nutzer können TypeScript pushen und native Binärdateien erhalten
-   **Vollständige Regex-Unterstützung** — die letzte große Sprachlücke
-   **perry/ui-Erweiterung** — Drag and Drop, Barrierefreiheit, DatePicker
-   **Source Maps & Debug-Info** — DWARF Debug-Informationen für natives Debugging

Verfolge den Fortschritt auf [GitHub](https://github.com/PerryTS/perry), lies die Dokumentation auf [docs.perryts.com](https://docs.perryts.com), oder sieh dir die [Roadmap](/de/roadmap/) für das vollständige Bild an.
