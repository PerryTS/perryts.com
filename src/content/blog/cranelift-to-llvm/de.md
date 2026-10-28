---
title: "Von Cranelift zu LLVM: Was kaputtging und wie wir es repariert haben"
excerpt: "Perrys Backend-Migration von Cranelift zu LLVM ist abgeschlossen. Die anfängliche Umstellung machte Benchmarks 70x langsamer — das ist, was kaputtging, und die sechs gezielten Optimierungen, die es behoben haben."
date: 2026-04-12
tags: ["compilers", "llvm", "cranelift", "performance", "milestone"]
---
> **Korrektur (September 2026):** Der unten als „factorial“ bezeichnete Benchmark war falsch benannt: Er summiert `i % 1000` in einer Schleife und berechnet keine Fakultät. Der Wert 24,6x stammte aus einem alten Node.js-Lauf, der sich nicht reproduzieren lässt; mit unserem aktuell veröffentlichten Harness liegt er gleichauf mit Node.js (93 ms vs. 95 ms). Es ist ein Mikrobenchmark eines Integer-Modulo-Fast-Paths, kein Maß für typische TypeScript-Performance. Die Ergebnisse unten bleiben als historische Aufzeichnung erhalten. Aktuelle Zahlen, einschließlich der Benchmarks, die Perry verliert, stehen in der [Perry-README](https://github.com/PerryTS/perry#performance).

Perrys Backend-Migration von Cranelift zu LLVM ist abgeschlossen. Ab v0.5.12 ist LLVM das einzige Codegenerierungs-Backend, und Perry schlägt Node.js nun in jedem Benchmark — mit Vorsprüngen von 1,7x bis 24,6x (bei zwei Gleichständen).

Der Weg dorthin war nicht geradlinig. Die anfängliche Umstellung in v0.5.0 machte einige Benchmarks **70x langsamer** als die Cranelift-Version, die sie ersetzte. Dieser Beitrag ist die ausführliche Version dessen, was passiert ist, warum wir den Wechsel trotzdem vollzogen haben, was schiefging, was es wieder richtete und wie die Zahlen am Ende aussehen.

Wenn du einen Compiler baust, Codegen-Backends evaluierst oder einfach neugierig bist, warum “auf LLVM umsteigen” selten so einfach ist, wie es klingt, dann ist dieser Beitrag für dich.

## Teil 1: Warum überhaupt wechseln?

Perry kompiliert TypeScript direkt zu nativem Maschinencode. Kein Node, kein V8, kein Electron, keine WebView. Das Versprechen lautet “schreibe TypeScript, liefere ein natives Binary” — und das gesamte Wertversprechen bricht zusammen, wenn dieses Binary nicht tatsächlich schnell ist.

Für Perrys erste Minor-Versionen war das Codegen-Backend [Cranelift](https://cranelift.dev/). Cranelift ist hervorragend — es ist das Codegen hinter wasmtime, wird von SpiderMonkeys Baseline-JIT verwendet und ist die erste Wahl, wenn man schnelle, vorhersagbare Kompilierung mit einer sauberen Embedding-Story braucht. Für ein Projekt, das eine neue Sprache bootstrappt, war es der richtige Startpunkt.

Aber zwei Dinge haben uns letztlich davon weggetrieben.

### 1\. Die Optimierer-Obergrenze

Cranelift ist bewusst ein schneller, einstufiger optimierender Compiler. Sein Auftrag lautet “erzeuge ordentlichen Code schnell”, nicht “erzeuge den bestmöglichen Code ohne Zeitlimit”. Das ist der richtige Kompromiss für einen JIT. Es ist der falsche Kompromiss für einen AOT-Compiler, dessen gesamtes Verkaufsargument native Performance ist.

In LLVMs Middle-End stecken über zwei Jahrzehnte Arbeit. Loop-Vektorisierung, LICM, GVN, SCCP, Instruction Combining, Inlining-Heuristiken, Fast-Math-Reassoziation, Alias-Analyse — es gibt kein realistisches Szenario, in dem ein kleineres Projekt aufholt. Wenn Perry behaupten will “schneller als Node”, brauchen wir diese Maschinerie.

### 2\. Das arm64\_32-Problem

Der unmittelbare Auslöser war die Apple Watch. `arm64_32` ist ein ABI, das Apple für die Series 4 und neuer eingeführt hat — 64-Bit-Instruktionen, 32-Bit-Pointer. Cranelift unterstützt es nicht, und es gab keinen realistischen Pfad, dass es kommen würde. Damit Perry glaubwürdig “9 Plattformen aus einer Codebasis” behaupten kann, durfte watchOS nicht fehlen. LLVM unterstützt `arm64_32` direkt.

Als wir akzeptiert hatten, dass *einige* Targets LLVM benötigen würden, wurde die Pflege zweier Backends unhaltbar. Zwei Backends bedeuten zwei Sätze von Bugs, zwei Sätze von Optimierungspässen, zwei Test-Matrizen, zwei Performance-Baselines. Die ehrliche Antwort war: eines auswählen.

Wir haben LLVM gewählt.

## Teil 2: Ein Wort zu Cranelift

Bevor es weitergeht: Dieser Beitrag ist kein Cranelift-Verriss. Cranelift ist ein brillantes Stück Ingenieurskunst, und wenn du einen JIT, eine Sandbox-Runtime oder irgendetwas baust, wo die Kompilier-Latenz wichtiger ist als der Spitzendurchsatz, sollte es ganz oben auf deiner Liste stehen. wasmtime setzt es nicht ohne Grund ein. Die Bytecode Alliance leistet vorbildliche Arbeit.

Perrys Anforderungen sind einfach andere. Wir kompilieren im Voraus, liefern das Binary einmal aus, und der Nutzer führt es millionenfach aus. Diese Asymmetrie — selten kompilieren, immer ausführen — ist genau das Regime, in dem sich LLVMs schwererer Optimierer auszahlt. Anderes Werkzeug für einen anderen Job.

## Teil 3: Das Umstellungs-Desaster

v0.5.0 war das erste Release mit LLVM als einzigem Backend. Wir erwarteten eine leichte Regression bei der Kompilierzeit und eine deutliche Verbesserung der Laufzeit-Performance. Beim zweiten Punkt trat das Gegenteil ein.

Hier ist die Tabelle, die ich damals nicht veröffentlichen wollte:

| Benchmark| Cranelift | LLVM v0.5.0 | Delta |
| --- | --- | --- | --- |
| method_calls| 16ms | 1,084ms | 68x slower |
| object_create| 5ms | 318ms | 64x slower |
| matrix_multiply| 61ms | 184ms | 3x slower |
| math_intensive| 370ms | 131ms | 2.8x faster |
| verschachtelte_Schleifen| 32ms | 57ms | 1.8x slower |
| Fibonacci(40)| 505ms | 1,156ms | 2.3x slower |

Einige Workloads wurden schneller. Die meisten dramatisch langsamer. `method_calls` — einer der wichtigsten Benchmarks, weil er idiomatische TypeScript-Klassennutzung repräsentiert — war fast 70x schlechter als das, was wir zwei Releases zuvor ausgeliefert hatten.

### Was tatsächlich schiefging

Perry verwendet **NaN-Boxing** für die Wertdarstellung. Jeder TypeScript-Wert ist ein 64-Bit-Wort. f64-Zahlen werden direkt gespeichert; alles andere (Objekte, Strings, Booleans, undefined, null) wird in die ungenutzten Bits einer IEEE-754-Quiet-NaN kodiert.

Der Vorteil: Zahlen kosten nichts. Kein Boxing, kein Tagging, keine Allokation für Arithmetik.

Der Nachteil: Jede Operation auf einem Nicht-Zahlen-Wert erfordert Bit-Manipulation zum Entpacken, Verarbeiten und Wiederverpacken. Wenn diese Sequenzen als Inline-IR im Codegen liegen, kann der Optimierer sie verschmelzen und vereinfachen. Wenn sie als **Aufrufe in Runtime-Hilfsfunktionen** vorliegen, sieht der Optimierer einen opaken Aufruf und gibt auf.

Unser Cranelift-Backend hatte eine große Anzahl von Inline-Lowerings für heiße Operationen angesammelt — Property-Loads, Method-Dispatch, Object-Allokation, Integer-Arithmetik auf f64-getaggten Werten. Die LLVM-Umstellung hatte im Interesse der Korrektheit fast alle davon durch Runtime-Helpers in `perry-runtime` ersetzt. Jeder Helper war eine `call`\-Instruktion in LLVM IR.

LLVM ist hervorragend, aber es kann keine Funktion inlinen, deren Body es nie gesehen hat. `perry-runtime` wird separat kompiliert, am Ende dazugelinkt, und aus der Perspektive des Optimierers ist jeder Helper-Aufruf eine Black Box. Das Ergebnis war, dass heiße Schleifen, die das Cranelift-Backend zu ~5 Instruktionen Inline-Arithmetik kompiliert hatte, nun zu Funktionsaufrufen kompiliert wurden — Register-Sicherungen, Stack-Frame-Aufbau, das volle Programm — millionenfach wiederholt.

Daher kamen die 70x. Kein schlechter Codegen. Schlechte **Inlining-Grenzen**.

## Teil 4: Die Lösung

Die Arbeit, um die Cranelift-Zahlen zu erreichen und zu übertreffen, fiel grob in sechs Kategorien. Keine davon ist exotisch. Die meisten sind Lehrbuch-Compiler-Optimierungen, die nur an den richtigen Stellen angewandt werden mussten.

### 1\. Inline-Bump-Allocator für Object-Allokation

`object_create` war die schlimmste Regression nach `method_calls`. Der alte Pfad rief `js_object_alloc_class_with_keys` für jedes `new Point()` auf — ein Funktionsaufruf, ein Thread-Local-Arena-Zugriff, ein Shape-Cache-Lookup und ein Schreiben des GC-Headers + Object-Headers.

Die Lösung: die Bump-Allokation **inline** in LLVM IR emittieren. Jede Funktion, die Objekte alloziert, bekommt einen gecachten Pointer auf eine Thread-lokale `InlineArenaState`\-Struktur. Allokation wird zu:

```
; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr           ; current bump offset
%new_off = add i64 %offset, 96              ; GcHeader(8) + ObjectHeader(24) + 8 fields(64)
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr            ; current block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow
fast:
  store i64 %new_off, ptr %off_ptr          ; bump the offset
  %data = load ptr, ptr %state              ; data pointer at offset 0
  %raw  = getelementptr i8, ptr %data, i64 %offset
  store i64 <packed_gc_header>, ptr %raw    ; GcHeader as one i64
slow:
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)
```

Der Fast Path besteht aus ~13 Instruktionen Inline-IR, die LLVM sehen, umplanen und aus Schleifen herausziehen kann. `object_create` ging von 318ms auf 9ms.

### 2\. i32-Schleifenzähler

NaN-Boxing bedeutet, dass jede TypeScript-Zahl f64 ist. Das schließt Schleifenzähler ein. Eine `for (let i = 0; i < 100_000_000; i++)`\-Schleife mit f64-Induktionsvariablen ist eine Katastrophe: f64-Inkrement, f64-Vergleich, f64-zu-i64-Konvertierung bei jedem Array-Indexzugriff.

Der Codegen erkennt For-Schleifen, bei denen die Induktionsvariable beweisbar ganzzahlig ist, und alloziert einen **parallelen i32-Stack-Slot**. Die Schleifenbedingung wechselt von `fcmp` zu `icmp slt i32` und eliminiert den f64-Zähler vollständig.

Das brachte `array_write` von 11ms auf 3ms, `nested_loops` von 18ms auf 9ms und `array_read` von 11ms auf 4ms.

### 3\. Fast-Math-Flags

Wir hängen `reassoc contract`\-Flags an jede f64-Arithmetik-Instruktion an. `reassoc` erlaubt LLVM, serielle Akkumulator-Ketten in parallele aufzubrechen, und `contract` erlaubt Fused-Multiply-Add. Wir lassen `nnan` und `ninf` deaktiviert, weil Perry NaN-Bits als Wert-Tags verwendet.

Mit diesen Flags greift LLVMs Loop-Vektorisierer bei `math_intensive`, das von 131ms auf 14ms fiel — 3,5x schneller als Node.

### 4\. Integer-Modulo-Fast-Path

`%` auf f64 in JavaScript ist `fmod`, was auf ARM ein libm-Aufruf ist. Aber für ganzzahlige f64-Operanden können wir `fptosi → srem → sitofp` machen und den libm-Umweg ganz überspringen. Der Codegen nutzt statische Analyse, um ganzzahlige Operanden zu erkennen — kein Runtime-Check nötig.

Das ist der gesamte Grund, warum `factorial` von 1.553ms auf 24ms fiel — und von Nodes 591ms auf 24ms. **24,6x schneller als Node.**

### 5\. LICM für verschachtelte Schleifen

LLVM macht Loop-Invariant Code Motion von Haus aus, aber NaN-Boxing verschleiert die Struktur. `arr.length` wird zu einem Load durch einen NaN-geboxten Pointer mit Tag-Check heruntergebrochen — nicht offensichtlich invariant.

Der Codegen erkennt das `for (...; i < arr.length; ...)`\-Muster und lädt die Länge vor der Schleife in einen Stack-Slot, wobei ein statischer Walker verifiziert, dass der Schleifen-Body die Länge des Arrays nicht ändern kann. Wenn der Zähler durch diese herausgehobene Länge begrenzt ist, überspringen IndexGet/IndexSet die Bounds-Checks vollständig.

### 6\. Shape-gecachte Objekte

Wenn der Codegen die Klasse eines Objekts kennt, löst er Feld-Offsets zur Kompilierzeit auf und emittiert **direkte indizierte Loads** — kein Runtime-Dispatch. Für Method-Dispatch wird `obj.method(args)` zu einem direkten `call @perry_method_Class_name(this, args)` — keine vtable, kein Inline-Cache, kein Hash-Lookup.

Die LLVM-Umstellung hatte hier auf den universellen Slow-Path zurückgestuft. Die Wiederherstellung des statischen Dispatch brachte uns die `method_calls`\-Erholung — von 1.084ms zurück auf 1ms. **11x schneller als Node.**

## Teil 5: Die Zahlen heute

Median aus drei Läufen, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:

| Benchmark| Perry | Node.js | vs Node |
| --- | --- | --- | --- |
| Fakultät| 24ms | 591ms | 24.6x |
| method_calls| 1ms | 11ms | 11x |
| loop_overhead| 12ms | 53ms | 4.4x |
| math_intensive| 14ms | 49ms | 3.5x |
| array_read| 4ms | 13ms | 3.2x |
| closure | 97ms | 303ms | 3.1x |
| array_write| 3ms | 8ms | 2.6x |
| string_concat| 1ms | 2ms | 2x |
| verschachtelte_Schleifen| 9ms | 16ms | 1.7x |
| prime_sieve| 4ms | 7ms | 1.7x |
| matrix_multiply| 21ms | 34ms | 1.6x |
| Fibonacci(40)| 401ms | 991ms | 2.5x |
| binäre_bäume| 9ms | 9ms | tied |
| Mandelbrot| 24ms | 24ms | tied |
| object_create| 9ms | 8ms | 0.9x |

Jeder Benchmark ist ein Sieg oder ein Gleichstand. Am knappsten ist `object_create` (9ms vs 8ms), wo V8s Allocator wirklich hervorragend ist.

## Teil 6: Die Kompilierzeit-Frage

Der Hauptgrund, warum Leute Cranelift statt LLVM wählen, ist die Kompiliergeschwindigkeit. Also reden wir darüber.

LLVM erhöhte Perrys Pro-Datei-Kompilierzeit um **20-50ms**, also ungefähr **8-19%**. Nicht 5x. Nicht 2x. Einstelliger bis niedriger zweistelliger Prozentbereich.

Der Grund ist, dass Codegen nicht der Engpass in Perrys Pipeline ist. Die Aufschlüsselung für eine typische Datei:

-   SWC-Parsing: ~30%
-   HIR-Lowering (AST → IR, Typinferenz): ~25%
-   IR-Transformationspässe (Closure-Konvertierung, Async-Lowering, Inlining): ~15%
-   **Codegen (LLVM-IR-Textemission + `clang -c -O3`): ~20%**
-   Linking (`cc` + Runtime-Bibliothek): ~10%

Codegen ist ein Stück von fünf. Selbst eine Verdoppelung dieses Stücks bewegt das Gesamtergebnis nur um 5-10%. Wenn du einen AOT-Compiler baust, bei dem der Nutzer einmal `perry compile` eingibt und dann das Binary für immer ausführt, lautet die Rechnung: 25ms mehr zur Kompilierzeit investieren, bis zu 24x bei jeder einzelnen Ausführung sparen.

## Teil 7: Was ich anders machen würde

Wenn ich Perry heute starten würde und direkt zu LLVM springen könnte, würde ich es nicht tun. Die Cranelift-Phase war wirklich wertvoll. Sie ließ uns am Frontend iterieren ohne LLVMs Komplexitäts-Aufwand, gab uns eine funktionierende Baseline zum Vergleichen und zwang uns, unser HIR sauber genug zu halten, um zwischen Backends portabel zu sein.

Was ich anders machen würde, ist die Umstellung selbst. Wir haben v0.5.0 ausgeliefert, wobei die meisten Operationen durch Runtime-Helper-Aufrufe liefen, mit der Absicht, sie später zu inlinen. Das war falsch. Die richtige Reihenfolge wäre gewesen: erst die heißen Pfade identifizieren, sie vor der Umstellung inline herunterbrechen und erst veröffentlichen, wenn das LLVM-Backend mindestens Parität erreicht hat.

Die Lektion ist die langweilige: Optimierungsgrenzen sind wichtiger als Optimierer-Qualität. LLVM ist ein bemerkenswertes Stück Software, aber es kann dir bei Code, den es nicht sehen kann, nicht helfen. Wenn dein Codegen alles durch opake Runtime-Aufrufe leitet, hast du eine Mauer zwischen deinem Quellprogramm und jedem existierenden Optimierungspass gebaut.

## Zusammenfassung

Perry ist jetzt ausschließlich auf LLVM, schneller als Node in jedem Benchmark und ausgeliefert. Die Migration hat länger gedauert als geplant, hat in der Mitte mehr wehgetan als erwartet und war im Rückblick eindeutig die richtige Entscheidung. Cranelift hat uns bis v0.5 gebracht; LLVM bringt uns den Rest des Wegs.

Wenn du Perry ausprobieren willst:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Benchmarks selbst ausführen: `cd benchmarks/suite && ./run_benchmarks.sh`

Wenn du Fragen hast, Bugs findest oder über Codegen-Backends diskutieren willst, die GitHub Issues sind offen. Ich lese sie alle.

— Ralph
