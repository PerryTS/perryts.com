---
title: "Generationen-GC, Lazy JSON und Benchmarks, die Prüfung aushalten"
excerpt: "Perry v0.5.174 → v0.5.306 in drei Tagen, plus die GC- und JSON-Arbeit, die parallel gelandet ist. Der Generationen-GC läuft als Default. Die Small String Optimization läuft als Default. Die JSON-Pipeline bekommt ein Lazy-Tape, das bei Validate-and-Roundtrip 75 ms Median liefert — Spitze im Pack der dynamisch typisierten Runtimes. Die Benchmarks-Seite ist neu geschrieben mit RUNS=11 Median + p95 + σ, simdjson und AssemblyScript+json-as als Peers ergänzt, und jede Schwäche, die Perry hat, ehrlich aufgezeigt."
date: 2026-04-26
tags: ["GC", "JSON", "performance", "benchmarks", "milestone"]
---
Der letzte Beitrag endete bei **v0.5.174** mit einer Schlagzeile: Perry gewann endlich jeden Benchmark in der In-Tree-Suite gegen Node und Bun. Drei Tage Arbeit und ein Backlog an GC- und JSON-Commits später ist Perry bei **v0.5.306** — das sind **132 Patch-Releases** — und die Geschichte ist eine andere. Die Schlagzeile ist kein 547-faches Speedup oder eine frische Win-Spalte. Es ist die Arbeit, die diese Wins verteidigbar macht.

-   Der **Generationen-GC** ist jetzt Default. Phase A bis D landeten in v0.5.217–v0.5.237.
-   Die **Small String Optimization** ist jetzt Default. Schritte 1.5 → 2 landeten in v0.5.213–v0.5.216.
-   Die **JSON-Pipeline** bekam einen Tape-basierten Parser, Lazy Parse, Lazy Stringify und Per-Element-Sparse-Materialisierung. Default-Validate-and-Roundtrip liegt jetzt bei **75 ms Median** — Bestwert im Dynamic-Typing-Feld.
-   Die **Benchmarks-Seite** ist Ende-zu-Ende neu geschrieben mit **RUNS=11 Median + p95 + σ + min + max**, simdjson und AssemblyScript+json-as als Peers hinzugefügt, Optimization-Probes von echten Vergleichen getrennt, und jede Schwäche, die Perry hat, ehrlich offengelegt.

Das Begleitprogramm ist eine stetige Reihe von Korrektheits-Fixes: Promise-Microtask-FIFO, NaN-Equality und ECMAScript-Number-Formatierung, BigInt-Zweierkomplement, AsyncLocalStorage Ende-zu-Ende, decimal.js + ioredis + commander Runtimes, und ein JSON.stringify-Segfault auf reinem f64, der sich unter Tape-Pfaden versteckt hatte. Plus die Windows-Toolchain wird endlich leichtgewichtig: LLVM + xwin, keine Visual-Studio-Installation nötig.

## 1\. Generationen-GC, standardmäßig an

Der Generationen-GC ist seit zwei Monaten ein gestaffelter Roll-out. Die Zusammenfassung der Phasen, die in diesem Fenster geschlossen wurden:

-   **v0.5.217–v0.5.221** — Phase A: Shadow-Stack-Runtime-Scaffolding, Push/Pop-Emission, Slot-Map-Threading, `Let`/`LocalSet`\-Shadow-Mirroring und der Root-Scanner.
-   **v0.5.222** — Phase B: Nursery- + Old-Gen-Arena-Split.
-   **v0.5.223–v0.5.225** — Phase C1–C2: Write-Barrier-Runtime-Infrastruktur, Codegen emittiert die Barrier, jeder Heap-Store geht durch sie hindurch.
-   **v0.5.226–v0.5.228** — Phase C3a–C4: Remembered-Set-Roots fließen in Mark + Clear; Minor-GC-Trace überspringt Old-Gen; non-moving Tenuring.
-   **v0.5.229–v0.5.236** — Phase C4b α/β/γ/δ: Forwarding-Pointer-Infrastruktur, Pinning- + Evacuation-Pass, Scanner + transitives Pinning, Reference-Rewriting, idle Nursery-Blocks ans OS zurückgegeben, GC-Trigger auf den initialen Threshold gedeckelt.
-   **v0.5.237** — Phase D Teil 1: `PERRY_GEN_GC=1` standardmäßig.
-   **v0.5.238** — Phase D Teil 2: `PERRY_SHADOW_STACK=1` standardmäßig.
-   **v0.5.239–v0.5.240** — Abschluss-Docs: Roadmap finalisiert, akademischer + industrieller Lineage-Anhang (Bartlett 1988, Ungar 1984, Cheney 1970).

Der gemessene Win, der am wichtigsten war: `test_memory_json_churn` fiel von **115 MB → 91 MB** Peak-RSS in dem Moment, als der Gen-GC-Default umgelegt wurde. Die Compute-Regressionen waren klein und werden ungeschönt aufgelistet — `nested_loops` 8 → 18 ms, `accumulate` 24 → 34 ms, `object_create` 0 → 1 ms, `array_read` / `array_write` jeweils +1 ms. Der Notausgang (`PERRY_GEN_GC=0`) holt die alten Zahlen zurück; der Trade-off war bewusst, und die Benchmarks-Seite listet jetzt beide Zeilen nebeneinander, sodass eine Leserin wählen kann.

## 2\. Small String Optimization, standardmäßig an

SSO ist eine 22-Byte-Inline-String-Repräsentation, die für kurze Strings die Heap-Allokation vermeidet — typische JSON-Keys (2–8 Bytes) und kurze Werte landen in der Inline-Form. Der Roll-out war an der Oberfläche winzig und unter der Haube groß:

-   **v0.5.213**: SSO-Infrastruktur (Repräsentation + Accessors).
-   **v0.5.214**: Schritt 1 Consumer-Arms + `PERRY_SSO_FORCE`\-Gate fürs Testen.
-   **v0.5.215**: Schritt 1.5 Codegen `PropertyGet`\-Drei-Wege-Branch — Fast-Path für Inline-Strings, Fast-Path für Heap-Strings, Slow-Path für den Rest.
-   **v0.5.216**: Schritt 2 Flip — SSO standardmäßig emittieren.

Die Follow-ups in v0.5.279 schlossen den letzten Property-Read-NaN-Bug, der auftauchte, als SSO heiß lief, und der Fix für Chained-Cross-Module-Getter-Dispatch in v0.5.272 schloss noch einen. Beide standen vor dem Default-Flip auf der Punch-List; beide gingen ohne Perf-Regression live.

## 3\. JSON: Tape-basiertes Parsen, standardmäßig lazy

Die JSON-Pipeline bekam das invasivste Rewrite des Zeitraums. Altes Verhalten: `JSON.parse` baute einen voll materialisierten Baum aus NaN-geboxten Werten. Neues Verhalten: `JSON.parse` baut ein 12-Byte-pro-Wert-Tape und materialisiert lazy — nur die Werte, die du tatsächlich liest, zahlen die Materialisierungs-Kosten. Stringify auf einem unveränderten Parse ist jetzt ein memcpy des Original-Inputs, derselbe Fast-Path-Trick, den simdjson mit `raw_json()` verwendet.

-   **v0.5.200**: `JSON.parse<T>(blob)` Schema-gerichteter Parse (Schritt 1). Compile-Time-bekannte Shape lässt den Compiler vorab aufgelösten Key-Zugriff emittieren.
-   **v0.5.203**: Tape-basiertes Parse-Fundament — Schritt 2 Phase 1.
-   **v0.5.204**: Lazy Parse + Lazy Stringify — Schritt 2 Phasen 2+4.
-   **v0.5.206**: Lazy-sicherer indizierter Zugriff + Edge Cases — Schritt 2 Phase 3.
-   **v0.5.208**: Per-Element-Sparse-Materialisierung — Schritt 2 Phase 5b.
-   **v0.5.209**: Walk-Cursor + adaptiver Materialize-Threshold.
-   **v0.5.210**: Lazy Parse zum Default für Blobs ≥1 KB umgelegt.

Das Ergebnis auf der Workload, für die das Lazy-Tape entworfen wurde (10k Records, ~1 MB Blob, Parse → Stringify ohne Zwischen-Iteration):

| Implementierung | Median (ms)| p95 (ms) | σ | Peak RSS |
| --- | --- | --- | --- | --- |
| c++ `-O3 -flto` (simdjson)| 24 | 28 | 1.2 | 8 MB |
| perry (gen-gc + lazy tape)| 75 | 91 | 6.9 | 85 MB |
| rust serde_json (LTO)| 185 | 190 | 1.7 | 11 MB |
| bun | 259 | 342 | 26.1 | 82 MB |
| node | 394 | 602 | 60.1 | 127 MB |
| kotlin (kotlinx.serialization)| 473 | 533 | 21.4 | 606 MB |
| Assemblyscript+json-as (wasmtime)| 598 | 621 | 10.5 | 58 MB |

Perry bei **75 ms Median** ist die schnellste Dynamic-Typing-Runtime im Vergleich — schlägt Bun (259 ms), schlägt Node (394 ms), schlägt Kotlins Server-JIT (453 ms). simdjson bei 24 ms ist die SIMD-beschleunigte C++-Decke und steht absichtlich auf der Seite, nicht hinter einem Cherry-Pick versteckt. Perry schlägt das nicht. Der Punkt ist, die Lücke zu zeigen, sodass es ein Ziel gibt, sie zu schließen — getrackt in `docs/json-typed-parse-plan.md`.

Der ehrliche Begleit-Bench ist **parse-and-iterate**: gleicher Blob, aber jede Iteration summiert `nested.x` jedes Records, was das Lazy-Tape zur Materialisierung zwingt. Da landet Perry bei **466 ms** — langsamer als die 375 ms des Mark-Sweep-Notausgangs, weil das Tape Overhead zahlt, den es nicht amortisieren kann. Diese Zeile ist in TL;DR §B. Wenn man der Arbeit nicht ausweichen kann, tut das Lazy-Tape nicht so, als ob.

## 4\. Die Benchmarks-Seite, neu geschrieben

Drei Dinge haben sich daran verändert, wie Perry Performance-Zahlen präsentiert.

**RUNS=11 Median + p95 + σ + min + max, nicht Best-of-N.** Best-of-N lässt Tail-Latenz still unter den Tisch fallen; auf dieser Hardware versteckte es 9,4-Sekunden-Python-`accumulate`\-Outlier und Swift-JSONs 5,3-Sekunden-p95-Spikes. Median bringt die Tails zurück auf die Seite. Die Methodik-Änderung landete in v0.5.248; jede Zelle in TL;DR §A und §B ist RUNS=11 frisch zum **2026-04-25**.

**Optimization-Probes sind von echter Runtime-Perf getrennt.** Die fünf Zellen, die Perry bei 12–34 ms vs. Rust/C++ bei 98 ms zeigen — `loop_overhead`, `math_intensive`, `accumulate`, `array_read`, `array_write` — messen Compiler-Flag-Posture, nicht Silizium. Sie stehen jetzt in ihrem eigenen Unterabschnitt, mit einem Absatz darüber, der erklärt, dass `clang++ -O3 -ffast-math` sie auf eine Millisekunde heranbringt. Der Headline-Real-Runtime-Kernel ist `loop_data_dependent`: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — Perry sitzt mittendrin im No-FMA-Contract-Feld auf einem Kernel, wo der Compiler die Arbeit echt nicht wegfalten kann. Das ist der ehrliche Vergleich.

**Peers hinzugefügt.** simdjson (4.3.0) ist jetzt in beiden JSON-Tabellen — die C++-Parse-Throughput-Decke, auf der Seite, sodass eine Leserin die Lücke sehen kann. AssemblyScript mit json-as (1.3.2) ist der nächstliegende installierbare TS-zu-Native-Peer; porffor segfaultete bei der Workload in dieser Größe, Static Hermes ließ sich auf macOS arm64 nicht installieren. Kotlin mit kotlinx.serialization ist in v0.5.241–v0.5.242 zum JSON-Polyglot dazugekommen. Jede Zeile ist echt, jeder Disclaimer steht auf der Seite.

## 5\. Die Polyglot-Compute-Tabelle

Die echt-nicht-faltbaren Headline-Kernels, RUNS=11 Median, aktualisiert am 2026-04-25 bei v0.5.249:

| Benchmark| Perry | Rust | C++ | Java | Node | Bun |
| --- | --- | --- | --- | --- | --- | --- |
| Fibonacci| 318 | 330 | 315 | 282 | 1022 | 589 |
| loop_data_dependent| 235 | 229 | 129 | 229 | 322 | 232 |
| object_create| 1 | 0 | 0 | 5 | 11 | 6 |
| verschachtelte_Schleifen| 18 | 8 | 8 | 11 | 18 | 21 |

Bei `fibonacci` hält Perry mit dem kompilierten Feld auf 3–15 ms mit. Javas HotSpot-JIT ist ~11% schneller, weil er den rekursiven Call inlined. Bei `loop_data_dependent` spaltet sich der Kernel in zwei FP-Contract-Cluster: das FMA-Contract-Feld bei ~128 ms (Go-Default, `g++ -O3` auf Apple Clang — beide fusionieren `sum * a + b` in ein einzelnes FMADDD) und das No-Contract-Feld bei 229–235 ms (Perry, Rust-Default, Swift, Java ohne `-XX:+UseFMA`, Bun), das skalares FMUL + FADD ausführt. LLVM matcht das FMA-Feld mit `-ffp-contract=fast`; Perry aktiviert das nicht standardmäßig. `nested_loops` ist Cache-bound, nicht Compute-bound; alle landen bei 8–21 ms.

## 6\. Windows-Toolchain, leichtgewichtig

Windows-Nutzer brauchen keine Visual-Studio-Installation mehr. **v0.5.199** schloss [#176](https://github.com/PerryTS/perry/issues/176): `perry setup windows` + winget LLVM + xwin ersetzt den ganzen VS-BuildTools-Baum. `v0.5.201` entfernte das cfg-Gate auf `find_lld_link` / `find_perry_windows_sdk`, sodass die Path-Discovery auf jeder Plattform funktioniert, die Windows targetiert, nicht nur auf macOS-Hosts.

```
# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe
```

## 7\. Runtime-Korrektheits-Pass

Ein Thema des Zeitraums: stille Runtime-Divergenzen von V8/JSC wurden zu Fixes oder Compile-Fehlern. Die nicht-trivialen:

-   **v0.5.255**: `BigInt.fromTwos`/`toTwos` Zweierkomplement.
-   **v0.5.263**: `Promise.all`/`race`/`any` Non-Promise-Type-Diskriminierung.
-   **v0.5.281**: `NaN==NaN` + ECMAScript-Number-Formatierung (`3 → „3“`, nicht `„3.0“`; `-0 → „0“`; usw.).
-   **v0.5.280**: `NaN`/`Infinity` ToInt32-Coercion in `(x) | 0`.
-   **v0.5.284**: Promise-Microtask-FIFO + Thrown-Handler-Propagation.
-   **v0.5.286**: `JSON.stringify` auf einem reinen f64 segfaultete unter Tape-Pfaden.
-   **v0.5.277**: `fs.readFileSync` gibt Buffer zurück, wenn keine Encoding übergeben wird (matcht Node).
-   **v0.5.272**: Chained-Cross-Module-Getter-Dispatch gab `undefined` zurück.

Stdlib-Follow-ups für Issue [#187](https://github.com/PerryTS/perry/issues/187) wurden aufgefüllt: AsyncLocalStorage Ende-zu-Ende (v0.5.261), commander-Runtime + Codegen, der `.action()` tatsächlich aufruft (v0.5.250), decimal.js-Code (v0.5.259), Redis ioredis Ende-zu-Ende (v0.5.270), pg + mongo Async-Factory-Pattern (v0.5.275), und derselbe Async-Factory-Bug auf EE/LRU/WSS (v0.5.252).

Auf der `perry/ui`\-Seite: Notification-Tap-Callback (#97) verdrahtet über Apple (v0.5.254) und Android (v0.5.258); Schedule + Cancel lokaler Notifications (#96, v0.5.244); FCM Register + Receive auf Android (v0.5.262).

## 8\. Zusammenfassung

Das Muster dieser Strecke sind keine Headline-Zahlen. Es ist die Arbeit, die existierende Wins gegen Prüfung bestehen lässt: ein Generationen-GC, der Sustained-Allocation-Workloads abfängt, eine SSO, die die Short-String-Cost-Lücke schließt, eine JSON-Pipeline, die die „keine Modifikation“-Struktur der häufigsten Workload ausnutzt, und eine Benchmarks-Seite, die Mediane statt Best-of-N misst und simdjsons 24-ms-Parse-Decke in derselben Zeile zeigt wie Perrys 75 ms. Die Leserin sieht die Lücke — und wo Perry relativ zum Boden sitzt.

Probier's aus:

```
# npm (jede Plattform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — keine VS-Installation nötig)
winget install PerryTS.Perry

# Default Benchmark-Suite
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh
```

Quelle: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) – Benchmarks: [benchmarks/README.md](https://github.com/PerryTS/perry/blob/main/benchmarks/README.md) – Änderungsprotokoll: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
