---
title: "Cross-Compile für Windows, iOS-Game-Loops und 100 % Test-Parität"
excerpt: "103 Commits in einer Woche: Cross-Compile für Windows von Linux via lld-link, iOS-Game-Loop-Support, Crash-Reporting, eine zweistufige Hub-Build-Pipeline und der sich selbst hostende Compiler erreicht 68/68 deterministische Test-Parität."
date: 2026-03-20
tags: ["compiler", "cross-compilation", "infrastructure", "milestone"]
---
103 Commits zum Perry-Compiler diese Woche. Die Headline-Features: Du kannst jetzt Windows-Executables von Linux aus cross-kompilieren, iOS-Apps können blockierende Game Loops ausführen, der Compiler meldet Abstürze für Telemetrie, und der Self-Hosting-Compiler besteht jeden deterministischen Test, den wir ihm vorwerfen. Dazu ein großes Hub-Infrastruktur-Upgrade und über 50 Bugfixes.

## Cross-Kompilierung zu Windows von Linux

Perry kann jetzt Windows `.exe`\-Binärdateien von einem Linux-Host produzieren. Das ist das fehlende Stück für CI/CD-Pipelines, die Windows als Ziel brauchen, ohne eine Windows-Build-Maschine für die gesamte Kompilierung laufen zu lassen.

Die Implementierung ersetzt Compile-Time `#[cfg]`\-Checks durch Runtime-Zielerkennung. Wenn der Compiler ein Windows-Ziel auf einem Nicht-Windows-Host erkennt, lokalisiert er `lld-link`, `llvm-nm` und `llvm-ar` aus der Rust-Toolchain oder dem PATH über einen neuen `find_llvm_tool()`\-Helper. Die Windows-Systembibliotheken kommen von einem [xwin](https://github.com/Jake-Shadle/xwin)\-artigen Sysroot, auf das `PERRY_WINDOWS_SYSROOT` zeigt.

Der Linker verwendet automatisch `/FORCE:UNRESOLVED` und generiert Stubs für fehlende UI-Symbole, sodass CLI-Apps sauber cross-kompilieren. Die Ausgabe hat standardmäßig die Endung `.exe` beim Windows-Targeting. Die vollständigen Details stehen in der [Cross-Kompilierungs-Dokumentation](https://docs.perryts.com).

terminal — Linux host

$ perry compile main.ts --target windows

Compiling main.ts for windows-x86\_64...

Using lld-link from Rust toolchain

✓ Compiled executable: main.exe (2.8 MB)

## iOS Game Loop-Unterstützung

iOS verlangt, dass UIKit den Main-Thread besitzt. Das ist für event-gesteuerte Apps in Ordnung, aber es ist ein Problem für Spiele, die eine blockierende `while (!shouldClose)`\-Schleife brauchen. Perry löst dies jetzt mit dem `--features ios-game-loop`\-Flag.

Wenn aktiviert, emittiert der Compiler `_perry_user_main` statt `main`. Die Runtime stellt ein `main()` bereit, das `UIApplicationMain` auf dem Main-Thread aufruft und deinen Code auf einem Hintergrund-Thread startet. Scene Delegate und App Delegate handhaben den vollständigen UIKit-Lifecycle, während deine Game Loop unblockiert läuft.

main.ts

// Deine Game Loop läuft auf einem Hintergrund-Thread

while (!shouldClose) {

update();

render();

awaitNextFrame();

}

terminal

$ perry run ios --features ios-game-loop

Dies ermöglicht eine ganze Kategorie von Apps — Spiele, Simulationen, Echtzeit-Visualisierungen — die auf iOS vorher nicht praktikabel waren. Die iOS-Pump- und Callback-Pfade sind jetzt auch in Panic-Handling gewrappt, sodass Abstürze sowohl in der Game Loop als auch im UIKit-Lifecycle sauber abgefangen werden.

## Crash-Reporting

Perry-kompilierte Apps installieren jetzt beim Start einen Panic Hook und Signal-Handler für `SIGSEGV`, `SIGBUS` und `SIGABRT`. Bei einem fatalen Absturz werden die Details in `~/.hone/crash.log` für das Chirp-Telemetriesystem geschrieben. Gefangene Panics (in `catch_callback_panic`) löschen das Log, sodass nur echte nicht-behebbare Abstürze gemeldet werden.

Das ist ein Feature für Produktionsreife. Wenn etwas im Feld schiefgeht, werden wir davon erfahren — und das Crash-Log enthält genug Kontext, um das Problem zu diagnostizieren, ohne dass Benutzer manuell etwas melden müssen.

## Hub: Zweistufige Windows-Build-Pipeline

Die Perry Hub Build-Infrastruktur erhielt ein bedeutendes Architektur-Upgrade. Zuvor erforderte das Bauen für Windows einen Windows-Worker für die gesamte Kompilierung. Jetzt wird die Pipeline in zwei Stufen aufgeteilt:

1.  Ein Linux-Worker cross-kompiliert das Windows-Artefakt mit der neuen lld-link-Unterstützung
2.  Der Hub hält das vorkompilierte Artefakt und reiht den Job für einen Windows-Worker neu ein
3.  Der Windows-Worker übernimmt nur die Signierung und Paketierung — eine viel leichtere Aufgabe

Wenn ein Worker `complete` mit `needs_finishing: "windows"` sendet, reiht der Hub den Job transparent neu ein. Die CLI sieht ein nahtloses Single-Build-Erlebnis.

Der Hub startet jetzt auch automatisch Azure Windows VMs, wenn kein Windows-Worker verbunden ist, und Build-Worker aktualisieren sich automatisch auf die neueste Perry-Version bei neuen Releases. Weniger manuelle Infrastrukturverwaltung, schnellere Builds.

## Dokumentations-Überarbeitung

Zwei große Dokumentations-Neuschreibungen landeten diese Woche auf [docs.perryts.com](https://docs.perryts.com):

-   **perry.toml-Referenz** — vollständige Abschnittsdokumentation zu jeder Konfigurationsoption, Bundle-ID-Auflösung, Entry-File-Auflösung, Build-Number-Auto-Inkrement und CI/CD-Beispielen
-   **Geisterhand-Referenz** — vollständige API-Dokumentation, Plattform-Setup, Test-Automatisierungsmuster und Architekturübersicht für das plattformübergreifende UI-Testframework

Das sind keine inkrementellen Updates. Beides sind Neuschreibungen von Grund auf, die jedes Feature und jede Konfigurationsoption abdecken. Wenn du ein neues Projekt aufsetzt oder Tests schreibst, starte hier.

## Plattformübergreifende Menü-APIs

`menuClear` und `menuAddStandardAction` waren zuvor nur macOS. Sie funktionieren jetzt auf allen 6 nativen Plattformen. Das beinhaltet auch einen Fix für einen `RefCell`\-Reentrance-Panic in `dispatch_menu_item` unter Windows.

### Android: 16 KB Page Alignment

Google Play erfordert jetzt 16 KB Page Alignment für native Bibliotheken. Perry setzt die entsprechenden `CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS` automatisch, und begleitende `.so`\-Dateien werden neben der Ausgabe für APK/AAB-Einbindung kopiert.

## Perry React: Kanban Board

Die React-Kompatibilitätsschicht bekam einen realen Test: ein vollständiges 5-Spalten Kanban Board mit Verschiebe-, Hinzufüge-, Lösch- und Ansichts-Operationen. Beim Bau wurden verschachtelte Array-Children beim JSX-Rendering aufgedeckt und behoben — der rekursive `_appendChildren`\-Handler flacht jetzt Arrays korrekt ab, die von `.map()`\-Aufrufen zurückgegeben werden. Es gibt auch eine neue 14-Sektionen Kitchen Sink WorkBench-Demo, die verschiedene UI-Muster abdeckt.

## Anvil: 100% deterministische Test-Parität

`perrysdad` — der Self-Hosting LLVM-Compiler, geschrieben in TypeScript und kompiliert von Perry — besteht jetzt **68 von 68** deterministischen Tests und stimmt mit der Ausgabe des Haupt-Compilers exakt überein. Die einzigen Unterschiede sind inhärent (Zeitstempel, `Math.random()`), und 11 Tests werden übersprungen, weil sie UI, Timer, Kryptografie oder plattformspezifische Features erfordern, die noch nicht implementiert sind.

Wichtige Arbeiten, die das ermöglicht haben:

-   **Interface-Methoden-Dispatch** — Interface-getypte Variablen geben jetzt korrekte Methoden über class\_id-basierten Dispatch im ObjectHeader zurück
-   **Dynamischer Property-Zugriff** — Runtime-Dispatch für berechnete Property-Namen
-   **Closures und this-Binding** — korrekte Capture-Semantik für Objektmethoden
-   **Phase 6 in Arbeit** — async/await, Generatoren und Bedingungsfixes

100% Parität bei deterministischen Tests ist ein bedeutender Meilenstein. Es bedeutet, dass die selbst-kompilierte `anvil`\-Binärdatei für jedes testbare Szenario exakt dieselbe Ausgabe wie der Haupt-Compiler produziert. Die Lücke zum vollständigen Self-Hosting wird kleiner.

## Über 50 Bugfixes

Ein großer Korrektheitsvorstoß diese Woche. Highlights:

-   **JSON.parse** — Arrays werden nicht mehr bei 16 Elementen abgeschnitten, ungültige Eingaben werden korrekt behandelt
-   **Uint8Array** — Konstruktor aus Array-Variable, `.set(source, offset)`\-Implementierung (war ein No-Op)
-   **BigInt** — NaN-Boxing mit `BIGINT_TAG` für Cross-Modul-Aufrufe, keccak256 32-Bit-Truncation-Fixes
-   **Optional Chaining** — verschachtelte bedingte Ausdrücke, toString-Erkennung, Rückgabewert NaN-Boxing
-   **IndexSet** — String NaN-Boxing korrigiert, verwendet `STRING_TAG` statt `POINTER_TAG`
-   **MySQL** — DATETIME- und BLOB-Typen, `Date(string)`\-Konstruktor
-   **Math.min/max** — Spread-Argument-Handling
-   **Nativer Methoden-Dispatch** — Field-Scan-and-Call für `POINTER_TAG`\-Objekte

Das sind keine Randfälle. JSON.parse, das Arrays bei 16 Elementen abschneidet, würde jede reale Anwendung brechen. Uint8Array.set als No-Op würde Daten stillschweigend korrumpieren. Das sind die Fixes, die den Compiler produktionsreif machen, ein Korrektheitsbug nach dem anderen.

## In Zahlen

-   **103 Commits** zum Haupt-Perry-Compiler
-   **3 Versionen**: v0.2.195, v0.2.196, v0.2.197
-   **1 Haupt-Feature**: Cross-Kompilierung Windows von Linux
-   **1 neue App-Kategorie**: iOS Game Loops
-   **68/68** deterministische Test-Parität in perrysdad
-   **Über 50 Bugfixes** in NaN-Boxing, stdlib und nativem FFI
-   **2 Dokumentationsneuschreibungen**: perry.toml und Geisterhand
-   **5 Hub-Verbesserungen**: Zweistufige Pipeline, Azure-Auto-Startup, Worker-Auto-Update

## Was kommt als Nächstes

Windows-Cross-Kompilierung öffnet die Tür zu vollautomatisiertem Multi-Plattform-CI/CD — TypeScript pushen, native Binärdateien für jedes Ziel erhalten, ohne dedizierte Build-Maschinen für jedes OS. Die Game-Loop-Unterstützung erschließt eine ganz neue Kategorie von iOS-Apps. Und 100% deterministische Test-Parität in perrysdad bedeutet, dass Self-Hosting sehr real wird. Was bleibt:

-   **Vollständige Regex-Unterstützung** — die letzte große Sprachlücke
-   **perry/ui-Erweiterung** — Drag and Drop, Barrierefreiheitslabels, DatePicker
-   **perrysdad Phase 6** — async/await, Generatoren, Erweiterung Richtung voller Perry-Parität
-   **Hub öffentliche Beta** — verteilte Builds für externe Nutzer öffnen

Verfolge den Fortschritt auf [GitHub](https://github.com/PerryTS/perry), lies die Dokumentation auf [docs.perryts.com](https://docs.perryts.com), oder sieh dir die [Roadmap](/de/roadmap/) für das vollständige Bild an.
