---
title: "npm-Distribution, perry dev und jeden Benchmark gewinnen"
excerpt: "Perry v0.5.80 → v0.5.174 in sechs Tagen. @perryts/perry erscheint auf npm für alle sieben unterstützten Plattformen. perry dev bringt Watch-Mode-Auto-Recompile obendrauf auf einen In-Memory-AST-Cache und einen On-Disk-Pro-Modul-Object-Cache. json_roundtrip schließt seine letzte Lücke — Perry gewinnt jetzt jeden Benchmark gegen Node.js und Bun."
date: 2026-04-23
tags: ["npm", "developer-experience", "performance", "watch-mode", "milestone"]
---
Der letzte Beitrag endete mit Perry bei v0.5.80 und einer hartnäckigen Niederlage in der Benchmark-Tabelle: `JSON.parse`/`stringify`\-Roundtrip war immer noch 1,6x langsamer als Node. Sechs Tage später ist Perry bei **v0.5.174** — das sind **94 Patch-Releases** — und drei Dinge haben sich verändert, die es wert sind, vor allem anderen herausgestellt zu werden:

-   `@perryts/perry` ist auf **npm** verfügbar. Ein einziger Befehl installiert Perry auf jeder unterstützten Plattform.
-   **`perry dev`** bringt Watch-Mode-Auto-Recompile mit, obendrauf auf einen neuen In-Memory-AST-Cache und einen On-Disk-Pro-Modul-Object-Cache.
-   Die `json_roundtrip`\-Lücke ist geschlossen. Perry **schlägt Node und Bun jetzt bei jedem Benchmark** in der Haupt-Suite (15/15 gegen beide).

Der Rest des Beitrags ist das Ensemble im Hintergrund: WebAssembly-Fixes, watchOS kompiliert endlich Ende-zu-Ende, `perry/thread`\-Primitive sind den Rest des Weges verdrahtet, und eine Reihe von Compile-Time-Strictness-Gewinnen, die stille Drops in echte Fehler verwandeln.

## 1\. `@perryts/perry` auf npm

Perry ließ sich schon immer via Homebrew auf macOS und APT auf Debian/Ubuntu installieren. Gute Abdeckung für Entwickler auf diesen Plattformen, gar nichts für Windows-Nutzer, es sei denn, sie bauten aus dem Quellcode, und nichts Einheitliches für ein Team, das Mac, Linux und Windows mischt. v0.5.107 hat dieses Problem aus dem Weg geräumt.

```
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp
```

Das Paket ist ein schlanker Launcher, der von sieben plattformspezifischen Optional-Packages abhängt — macOS arm64/x64, Linux x64/arm64 auf glibc und musl, Windows x64 — und npm installiert nur das eine, das zu deiner Maschine passt. Die Binary-Größe pro Plattform liegt im niedrigen einstelligen Megabyte-Bereich. Die Installation selbst dauert Sekunden. Es gibt auch einen globalen Installationspfad (`npm install -g @perryts/perry`), falls du das bevorzugst, aber die projektlokale Installation pinnt die Compiler-Version neben deine Dependencies, was der richtige Default ist.

Die Veröffentlichung lief über OIDC Trusted Publisher, sodass jeder Release provenanced ist und auf den CI-Job zurückverfolgt werden kann, der ihn gebaut hat. Das war ein eigener Tag CI-Arbeit — mehrere `v0.5.107`\-CI-Commits, die die richtige Kombination aus `--provenance` / npm-Version / Workflow-Pfad jagten — aber es hat geklappt, und jeder Release seitdem war sauber. Windows-Nutzer sind jetzt First-Class-Citizens, und die teamübergreifende Reibung von “installier es halt, wie dein OS es mag” ist weg.

## 2\. `perry dev` — Watch-Mode

v0.5.143 fügte einen neuen CLI-Subcommand hinzu:

```
perry dev
```

Das ist alles. Es beobachtet dein Projekt, rekompiliert beim Speichern und startet deine Binary neu. Die Inspiration sind Vite und `nodemon`; der Punkt ist, aufzuhören so zu tun, als müsse sich ein Compiler-zu-Binary-Workflow langsamer anfühlen als eine Runtime. Für die meisten Projekte baut `perry dev` bei warmem Cache in unter einer Sekunde neu.

Der “warme Cache”-Teil ist wichtig. Zwei neue Caches landeten zusammen mit `perry dev`:

-   **In-Memory-AST-Cache** (v0.5.156). Über Rebuilds hinweg innerhalb einer einzelnen `perry dev`\-Session hält Perry den geparsten AST für jedes Modul, das sich nicht auf der Disk verändert hat. Eine Datei zu bearbeiten parst eine Datei neu, nicht den gesamten Modul-Graphen.
-   **On-Disk-Pro-Modul-Object-Cache (V2.2)**. Jedes Modul kompiliert zu seiner eigenen `.o`\-Datei und wird gehasht; unveränderte Module überspringen den Codegen komplett und der Linker greift auf das gecachte Object zurück. Die Verbose-Ausgabe des Caches entspricht der Spezifikation in [#131](https://github.com/PerryTS/perry/issues/131), und eine Runde Audit-Härtung in v0.5.160 schloss die Edge Cases, in denen veraltete Cache-Einträge eine Header-Änderung überleben konnten.

Die zwei Caches stapeln sich. Die erste Bearbeitung der Session ist eine Voll-Kompilierung; alles danach macht nur Arbeit proportional zu dem, was du tatsächlich verändert hast. Das ist der einzelne größte DX-Shift der Woche.

## 3\. Bun bei jedem Benchmark schlagen

Bei v0.5.166 hatte die README eine ehrliche Einschränkung: Perry war 1,6x langsamer als Node bei `json_roundtrip` (50× `JSON.parse` + `JSON.stringify` auf einem 1MB, 10K-Item-Blob) und 2,4x langsamer als Bun. Issue [#149](https://github.com/PerryTS/perry/issues/149) trackte das Follow-up. Bis v0.5.173 — sieben Tage später — hat sich diese Lücke geschlossen.

| Arbeitsbelastung| Perry v0.5.173 | Node v25 | Bun 1.3 |
| --- | --- | --- | --- |
| `json_roundtrip` | 314ms | 377ms | 250ms |
| `closure` | 10ms | 309ms | 51ms |
| `factorial` | 31ms | 596ms | 98ms |
| `fibonacci(40)` | 320ms | 1033ms | 521ms |
| `mandelbrot` | 23ms | 25ms | 30ms |

Perry gewinnt jetzt jeden Workload in der Haupt-Benchmark-Suite — **15/15 gegen Node, 15/15 gegen Bun**, best of 5 Runs auf macOS ARM64. Bun 1.3 liegt noch vorn beim Peak-RSS (84MB vs. Perrys 310MB bei `json_roundtrip`), also ist Allocator-Druck das Nächste, was zu schließen ist, aber die reine Latenz gehört Perry.

Das Schließen der JSON-Lücke war nicht eine einzelne Änderung — es war die Akkumulation der Object-Layout-Paritäts-Arbeit, die diese Woche durchlief: Phase-1-Object-Literal-Shape-Inferenz (v0.5.167), Phase-4-Body-basierte Return-Type-Inferenz für freie Funktionen, Klassen-Methoden, Getter und Arrows (v0.5.169) und Phase-4.1-Method-Call-Return-Type-Inferenz (v0.5.170). Das Thema ist dasselbe wie im letzten Beitrag: gib LLVM genug statische Struktur, durch die es hindurchschauen kann, und der Optimizer erledigt den Rest.

v0.5.164 stellte außerdem `<2 x double>`\-Parallel-Akkumulator-Autovectorization auf Pure-Fadd-Reduktionsschleifen wieder her, die irgendwann im v0.5.9x→v0.5.16x-Bereich stillschweigend regressiert war. Das bringt `math_intensive` und `accumulate` zurück zu ihrem alten 3-4x-Vorsprung gegenüber Rust/C++/Go/Swift — gleiches LLVM, ein `reassoc contract`\-Flag, ein vektorisierter Schleifenkörper.

## 4\. `perry/ui` und Doc-Tests

Vier verbleibende perry/ui-Lücken wurden in v0.5.151 geschlossen. Daneben wandelte v0.5.119 stillen perry/ui-API-Missbrauch von “kompiliert und tut nichts” in einen harten Compile-Fehler um — gleiche Logik wie v0.5.165 angewandt auf Dekoratoren (siehe unten). Missbrauch, der zur Compile-Zeit auftaucht, ist immer besser als zur Laufzeit.

v0.5.123 lieferte ein **Doc-Examples-Test-Harness** und eine Widget-Galerie aus. Jedes TypeScript-Beispiel in der Dokumentation wird jetzt bei jedem CI-Run kompiliert, und die Widget-Galerie vergleicht Screenshots gegen abgesegnete Baselines. v0.5.125 erweiterte das auf eine Cross-Compile-Matrix: Jedes Doc-Beispiel wird für iOS, tvOS, Android, WASM und Web sowie die Host-Plattform gebaut, sodass API-Drift über Targets hinweg im PR gefangen wird, der ihn eingeführt hat, statt im Release-Zyklus, der ihn ausgeliefert hat.

Ein kleiner Quality-of-Life-Gewinn: `perry check` gibt jetzt `file:line:column` für HIR-Lowering-Fehler aus ([#129](https://github.com/PerryTS/perry/issues/129)), was bedeutet, dass Editor-Jump-to-Error funktioniert, statt eine generische Meldung ohne Location anzuzeigen.

## 5\. watchOS kompiliert Ende-zu-Ende

watchOS wurde letzten Monat als Kompilierungsziel ausgeliefert, aber ein sauberer Ende-zu-Ende-Build hatte einige raue Kanten. Die watchOS-Arbeit dieser Woche:

-   **v0.5.113**: `--target watchos` und `--target watchos-simulator` kompilieren jetzt Ende-zu-Ende, ohne die angesammelten Workarounds.
-   **v0.5.114**: `--features watchos-game-loop` für Metal-Surface-Apps.
-   **v0.5.122**: `--features watchos-swift-app` für SwiftUI-gehostetes Rendering — wenn du willst, dass SwiftUI den App-Lifecycle besitzt und Perry die UI darin komponiert.
-   **v0.5.135**: `PERRY_UI_TEST_MODE` in perry-ui-ios und perry-ui-tvos verdrahtet, sodass Geisterhand-UI-Tests auf diesen zwei Targets genauso laufen wie auf macOS und Linux.

## 6\. `perry/thread`\-Primitive vollständig verdrahtet

v0.5.174 (heute) schloss [#146](https://github.com/PerryTS/perry/issues/146): `parallelMap`, `parallelFilter` und `spawn` sind vollständig durch den Codegen-Pfad verdrahtet, mit Compile-Time-Safety-Enforcement. Mutable Captures werden zur Compile-Zeit abgelehnt — dieselbe Compile-Time-Correctness-Haltung, die perry/ui und Dekoratoren jetzt haben. Thread-Primitive, die seit dem v0.4.0-Announcement teilweise verdrahtet waren, sind jetzt Ende-zu-Ende vollständig.

## 7\. WebAssembly und das Web-Target

Zwei WASM-Fixes, die es wert sind, herausgestellt zu werden:

-   **v0.5.158**: fünf sich akkumulierende Bugs in `--target web` (dem WASM-Output-Pfad), die sich gegenseitig maskierten. Als Paket gefixt, sodass das Web-Target jetzt unter der vollen `perry/ui`\-Oberfläche standhält ([#133](https://github.com/PerryTS/perry/issues/133)).
-   **v0.5.161**: `break`/`continue` innerhalb eines `if` innerhalb einer Schleife hing auf WASM — ein Codegen-Bug, der sich auf den nativen Targets nicht reproduzieren ließ. Gefixt ([#135](https://github.com/PerryTS/perry/issues/135)).

Auch auf der Korrektheits-Seite: v0.5.157 behob `obj.field`, das `NaN` auf Android zurückgab ([#128](https://github.com/PerryTS/perry/issues/128)), und v0.5.162 behob einen verwünschten ws-Bug, bei dem `sendToClient` und `closeClient` zu stillen No-Ops kompiliert worden waren ([#136](https://github.com/PerryTS/perry/issues/136)).

## 8\. Compile-Time-Strictness-Gewinne

Ein Thema dieser Woche: Alles, was früher ein stiller Fehlschlag war, ist jetzt ein Compile-Fehler.

-   **v0.5.165**: TypeScript-Dekoratoren wurden in HIR geparst und dann stillschweigend fallengelassen. Jetzt werfen sie am Dekorationspunkt einen Fehler mit einer klaren Meldung ([#144](https://github.com/PerryTS/perry/issues/144)). Gleiche Warn-zu-Bail-Argumentation wie v0.5.119 angewandt auf perry/ui.
-   **v0.5.119**: perry/ui-API-Missbrauch wird zur Compile-Zeit abgelehnt, statt eine No-Op-Binary zu produzieren.
-   **v0.5.172**: `console.trace()` emittiert jetzt einen echten nativen Backtrace auf stderr, statt nur die Meldung zu echoen ([#20](https://github.com/PerryTS/perry/issues/20)). Symbolisierte Frames erfordern `PERRY_DEBUG_SYMBOLS=1`; ohne das bekommst du Adressen, was immer noch mehr ist als das Message-Echo-Verhalten, das es ersetzt.

## 9\. Zusammenfassung

Das Muster der Woche: **Distribution** (npm), **Developer Experience** (`perry dev`, inkrementelle Caches) und **die letzte verbleibende Benchmark-Niederlage geschlossen**. Plus ein Paket an Compile-Time-Strictness, das stille Drops in echte Fehler verwandelt. Sechs Tage, 94 Patch-Releases, ein großer DX-Shift.

Probier's aus:

```
# npm (jede Plattform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Watch-Mode für iterative Entwicklung
perry dev
```

Quelle: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Dokumente: [docs.perryts.com](https://docs.perryts.com) — Änderungsprotokoll: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
