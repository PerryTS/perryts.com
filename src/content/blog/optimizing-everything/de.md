---
title: "Alles optimieren: Eine Woche, 68 Releases und ein 547x JSON-Speedup"
excerpt: "Perry v0.5.13 → v0.5.80 in sieben Tagen. JSON.parse schließt eine 547x-Lücke zu Node. mimalloc wird zum globalen Allocator. Inline-Caches, Shape-Transitions, typisierte Buffer-Slots, i32-native Bitwise-Ops, Scalar Replacement und eine native Event-Loop, die Fastify- und WebSocket-Server am Leben hält."
date: 2026-04-17
tags: ["performance", "llvm", "JSON", "GC", "server", "milestone"]
---
Der letzte Blog-Beitrag erschien mit Perry v0.5.12. Heute sind wir bei v0.5.80. Das sind **68 Patch-Releases in sieben Tagen**, fast vollständig auf eine Sache fokussiert: jeden verbliebenen Slow Path in einen Fast Path zu verwandeln.

Die LLVM-Umstellung in v0.5.0 hatte bis v0.5.12 wieder Parität mit Cranelift erreicht. Das war das Ende einer Geschichte und der Anfang einer anderen. LLVM sieht jetzt alles. Die Frage lautete nicht mehr “warum ist das langsam?”, sondern “warum ist das nicht schon schnell?” — und das ist eine sehr viel handhabbarere Frage.

Dieser Beitrag ist eine Tour durch die Woche. JSON bekam einen 547x-Speedup. mimalloc wurde zum globalen Allocator. Property-Zugriff bekam einen monomorphen Inline Cache. Buffer bekamen typisierte Pointer-Slots mit `noalias`\-Metadaten. Fastify- und WebSocket-Server hörten auf, nach einer Minute abzustürzen. Und die Benchmarks bewegten sich erneut.

## 1\. JSON: 547x Rückstand aufholen

Bei v0.5.29 war Perrys JSON.parse auf einem 20-Record-Array **547x langsamer als Node**. Bei v0.5.46 waren es 1,3x. Diese Zahl ist das größte Einzel-Delta der Woche, und es lohnt sich, sie durchzugehen, weil jede andere Optimierung in diesem Beitrag eine Variation desselben Themas ist: mache keine Arbeit, die du nicht machen musst.

Der ursprüngliche Parser allozierte einen Vec pro Property, einen Vec von Keys pro Objekt und ein RefCell-geschütztes Thread-Local für den Key-Cache. Er kopierte jeden String. Er hashte jeden Feldnamen erneut. Er baute für jeden Record eine brandneue Object-Shape, selbst wenn alle 20 Records exakt dieselben Felder in exakt derselben Reihenfolge hatten. Nodes Parser handhabt das, indem er das Muster erkennt und eine einzige Shape über alle Records hinweg teilt. Perrys tat das nicht.

Der Fix kam in vier Schritten:

1.  **Key-Interning via einem Thread-Local `PARSE_KEY_CACHE`** (v0.5.45). Der erste Record alloziert N Key-Strings; Records 2 bis 20 allozieren null. Wiederholte Keys lösen sich zum selben Pointer auf, was sie ohne strcmp als Shape-Cache-Lookup-Keys nutzbar macht.
2.  **Shape-Sharing über den Transition-Cache** (v0.5.45). Objekte, die von `js_object_set_field_by_name` gebaut werden, laufen denselben Transition-Graph entlang. Wenn das Schema sich wiederholt, wird der `keys_array`\-Pointer geteilt, und genau das braucht ein polymorpher Inline Cache, um zu treffen.
3.  **Zero-Copy-String-Parsing + inkrementeller Object-Aufbau** (v0.5.46). `parse_string_bytes` liefert nun `ParsedStr::Borrowed(&[u8])` zurück, wenn es keine Backslash-Escapes gibt — der Normalfall für jeden Key und die meisten Values. `parse_object` schreibt Felder direkt, anstatt sie zuerst in einem Vec zu sammeln.
4.  **GC-Unterdrückung während des Parsens** (v0.5.60, schließt #59). Das Parsen eines großen Arrays alloziert Tausende kleiner Objekte in einer engen Schleife. Jedes davon stieß den GC-Threshold-Check an. Ein “parsing in progress”-Flag zu setzen, schiebt die Collection auf, bis das Parsen zurückkehrt — gleiche effektive Heap-Größe, drastisch weniger Buchhaltungs-Branches.

Dann stringify. JSON.stringify auf homogenen Arrays — dieselbe Shape, millionenfach — machte pro Objekt volle Property-Iteration, was für ein Shape-stabiles Array pure Verschwendung ist. Ein Fünf-Schritte-Fix schloss den Großteil dieser Lücke ebenfalls:

-   v0.5.62: itoa-/ryu-Fast-Paths für Zahlen, tiefenbasierter Circular-Reference-Check statt eines HashSet.
-   v0.5.63: `toJSON`\-Guard + persistenter Key-Cache + Inline-Dispatch (die drei Pro-Call-Kosten, die sich summierten).
-   v0.5.65: homogeneous-shape Stringify-Template + ASCII-Escape-Fast-Path. Wenn jedes Element dieselbe Shape hat, wird das Key/Colon/Comma-Gerüst einmal vorberechnet.
-   v0.5.70, v0.5.72, v0.5.75: Pro-Call-Shape-Template-Cache, Schließen der Parse-Leftover-GC-Lücke, Eliminieren des verbleibenden fixen Pro-Call-Overheads.
-   v0.5.79: der Small-Value-Path. Zahlen, Booleans und kurze Strings laufen über einen direkten Pfad, der keine Object-Machinerie aufsetzt.

Das kumulative Ergebnis: Eine JSON-Pipeline, die zu Beginn der Woche **547x hinter Node** lag, liegt jetzt auf realistischen Workloads bei etwa **1,3x beim Parse und konkurrenzfähig beim Stringify**.

## 2\. Die Allocator-Geschichte

Perry alloziert viel. Jedes Object-Literal, jedes Array-Literal, jede String-Konkatenation, jede Closure. Der Allocator ist heiß, und für den größten Teil von v0.5 war er Rusts Standard-System-Allocator plus ein Thread-Local-Arena für kurzlebige Werte.

v0.5.67 ersetzte den globalen Allocator durch **mimalloc**. Das ist eine Einzeilen-Änderung in Cargo.toml, die sich sofort bei jedem Workload auszahlt, der viele kleine Allokationen macht — also bei jedem TypeScript-Programm. v0.5.66 ging voraus, indem es den gesamten `gc_malloc`\-Thread-Local-State zu einem einzigen TLS-Zugriff pro Aufruf konsolidierte, sodass der Pfad nach mimalloc so billig wie möglich war.

v0.5.68 trieb das weiter mit **arena-allozierten Strings**. Kurzlebige Strings (Zwischenergebnisse von Konkatenationen, `split()`\-Stücke, Parser-Scratch) umgehen den globalen Allocator komplett und landen in einer Pro-Thread-Bump-Arena, die an natürlichen Grenzen zurückgesetzt wird. Für JSON-Parsing war das allein ein zweistelliger Prozent-Gewinn.

Und die zwei Optimierungen, die überhaupt nicht allozieren:

-   **Scalar Replacement von nicht-entkommenden Objekten** (v0.5.17, dann Object-Literale in v0.5.76). Wenn ein Objekt nie seine umschließende Funktion verlässt, muss es nicht existieren. Seine Felder werden zu einfachen Locals. LLVM handhabt das von Haus aus, sobald man aufhört, das Objekt hinter einem opaken Allocator-Aufruf zu verstecken.
-   **Scalar Replacement von nicht-entkommenden Arrays** (v0.5.73). Gleiche Idee — wenn das Array nicht entkommt, werden seine Elemente zu SSA-Values und die ganze Allokation verschwindet.

Speziell für den Array-Literal-Pfad fügte v0.5.69 einen **exact-sized Fast Path** hinzu (die Capacity-Growth-Machinerie überspringen, wenn die Größe zur Kompilierzeit bekannt ist), und v0.5.74 inlinte die Bump-Allocator-IR für kleine Array-Literale, damit LLVM die Allokation sehen, falten, heben oder eliminieren kann. Array-lastige Benchmarks bewegten sich einen weiteren Schritt.

Abrundend behob v0.5.25 einen leiseren Bug: `gc_malloc` triggerte auf seinem eigenen Pfad keine Collection, sodass malloc-lastige Workloads den Heap unbegrenzt wachsen lassen konnten, bevor irgendetwas prüfte. v0.5.61 fügte dem Threshold adaptive Schrittgrößen hinzu, was man eigentlich will: günstig prüfen, wenn der Heap klein ist, seltener, wenn er groß ist.

## 3\. Property-Zugriff bekam einen echten Inline Cache

Jede moderne JavaScript-Engine hat einen polymorphen Inline Cache (PIC) auf Property-Zugriff. Für den größten Teil von Perrys v0.5-Serie lief PropertyGet durch einen Shape-Table-Lookup mit einem Thread-Local-Hash. Das ist okay für kalten Code. Es ist nicht okay, wenn 95% der Property-Reads an einer gegebenen Callsite dieselbe Shape sehen, was fast immer der Fall ist.

v0.5.44 brachte einen **monomorphen Inline Cache** für `PropertyGet`. Jede PropertyGet-Site bekommt einen Pro-Callsite-Cache-Eintrag: einen erwarteten Shape-Pointer und einen Feld-Offset. Hit-Path ist ein einzelner Vergleich plus ein indizierter Load. Miss-Path fällt durch zu einem langsamen Helper, der den Cache aktualisiert.

```
; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont
```

v0.5.51 fügte einen **Content-Hash-Shape-Transition-Cache** für dynamische Property-Writes hinzu. Zwei Objekte, die dieselben Felder in derselben Reihenfolge wachsen lassen, hashen zur selben Transition, sodass sie am Ende dieselbe Shape teilen — und das bedeutet, dass die Read-Seite des PIC tatsächlich trifft.

v0.5.55 entfernte den letzten TLS-Zugriff aus dem Transition-Cache. v0.5.46 behob einen PIC-Miss-Handler-Bug, bei dem Objekte mit >8 Feldern über die Inline-Slots hinaus in uninitialisierten Speicher lasen (schließt #55). v0.5.78 fügte einen Guard hinzu, der verhindert, dass PropertyGets PIC in Nicht-Pointer-Receiver wie rohe Zahlen indiziert — was bei allzu optimistischer Type-Refinement passieren konnte und eines der letzten Stabilitätsprobleme im IC war.

Netto-Effekt: Property-lastiger Code — was in der Praxis meistens TypeScript bedeutet — ist alleine durch den IC etwa 2–3x schneller als noch vor einer Woche.

## 4\. Integer, bitweise Operationen und das `| 0`\-Muster

NaN-Boxing macht jede Zahl zu einem f64. TypeScript-Programmierer schreiben `x | 0`, um Integer-Semantik zu erzwingen. V8 hat fünfzehn Jahre darauf verwendet, das billig zu machen. Perry holte diese Woche auf.

Der Stapel der Änderungen, der Reihe nach:

-   **v0.5.48**: `sdiv` für `(int / const) | 0`. LLVM faltet zu `smulh + asr`, was ~2 Zyklen sind vs. ~10 für `fdiv`.
-   **v0.5.48**: `@llvm.assume` auf Uint8ArrayGet-Grenzen. Ersetzt das Bounds-Check-Branch+Phi-Diamant durch einen einzigen Basic Block, über den der Vectorizer räsonieren kann.
-   **v0.5.49**: Fix für bitweise Operationen mit NaN/Infinity, damit sie gemäß ToInt32-Spec 0 produzieren. Korrektheit zuerst.
-   **v0.5.50**: `toint32_fast`, das den 5-Instruktionen-NaN/Inf-Guard überspringt, wenn der Wert bekanntermaßen endlich ist. Plus `alwaysinline` auf winzigen Helpern und Clamp-Erkennung.
-   **v0.5.52**: Clamp-Funktionen direkt mit `smin`/`smax`\-Intrinsics ansprechen. Clamp ist das häufigste Integer-Muster nach Inkrement.
-   **v0.5.53**: `x | 0` und `x >>> 0` auf einem bekannt-endlichen Wert werden zu einem Noop — nur `fptosi + sitofp`, ganz ohne Guard.
-   **v0.5.56**: i32-native bitweise Operationen; i32-Index und -Value in Uint8ArrayGet/Set.
-   **v0.5.58, v0.5.60**: `Math.imul` wird zum nativen i32-Multiply heruntergebrochen statt über den Polyfill-Pfad. Die Polyfill-Erkennung erkennt vom Nutzer geschriebene `Math.imul`\-Shims und ersetzt sie.
-   **v0.5.59**: Pure-Function-Init-Inlining + Integer-Local-Seeding. Die Function-Local-Integer-Analyse darf über Call-Grenzen hinwegschauen, wenn der Callee klein und pur ist.
-   **v0.5.37–v0.5.40**: Fast Path für Akkumulator-Muster-Int-Arithmetik. Die klassische `for (...) acc += f(i)`\-Schleife bleibt Ende-zu-Ende in i32, wenn die Typen es erlauben.

v0.5.41 ist der subtile Fall. Wenn der Codegen ein modulweites `const K: number[][] = [[...], ...]` sieht, bricht er das Ganze zu einer flachen `[N x i32]`\-Konstante in `.rodata` herunter. `K[y][x]` wird zu einem einzelnen `getelementptr + load i32`. Kombiniert mit der Int-Analyse-Bridge in v0.5.43 verschaffte das `image_conv` (einem 5×5-Gaußschen Blur über einem 4K-RGB-Frame) einen **3x-Speedup in einem einzigen Release**.

## 5\. Buffer und Uint8Array

Binäre Workloads — Crypto, Bildverarbeitung, Parsing, Netzwerk — leben in Buffer und Uint8Array. v0.5.64 gab ihnen **typisierte Pointer-Slots plus `noalias`\-Metadaten**. Wo ein Buffer früher ein NaN-geboxter Double in einem `alloca double` war, ist er jetzt ein roher `i64`\-Pointer in einem `alloca i64`, mit LLVM-Annotationen, die dem Optimierer sagen: “dieser Pointer aliased keine anderen Pointer im Scope.” Das schaltet Load/Store-Reordering, Vektorisierung und Register-Allokation frei, die der Optimierer sonst ablehnen würde.

v0.5.80 schloss das letzte Korrektheits-Problem hier: einen modulweiten Buffer-`alias-scope`\-Zähler, der pro Funktion zurückgesetzt wurde, was in seltenen Fällen LLVM erlauben konnte, über Scopes hinweg zu räsonieren, die keine Scope-ID teilen sollten. Jetzt ist der Zähler modulweit und die `noalias`\-Geschichte ist wasserdicht.

v0.5.53 machte `Uint8ArraySet` branchless — ein Masked Store statt eines if/else, das bei Out-of-Bounds 0 schrieb. v0.5.54 fügte ein **Two-Way indexOf** für längere Muster und ein arena-alloziertes `split` hinzu, was zusammen den größten Teil der Lücke beim String-lastigen Buffer-Parsing schloss.

## 6\. Strings: ASCII ist der Fast Path

JavaScript-Strings sind UTF-16, aber die meisten realen Strings (Keys, Identifier, HTTP-Header, JSON-Gerüst) sind ASCII. v0.5.71 fügte ein **O(1) `charCodeAt` und `codePointAt` für ASCII-Strings** hinzu — kein UTF-16-Scan, nur ein Byte-Load. v0.5.20 hatte bereits `indexOf`, `slice` und `charAt` den UTF-16-Scan bei ASCII umgehen lassen.

Eine Korrektheits-Notiz innerhalb desselben Releases: `String.length` liefert jetzt UTF-16-Code-Units (ECMAScript-Spec) statt Byte-Count zurück. Das war ein lauernder Bug, bei dem `"café".length` 5 statt 4 zurückgab.

## 7\. Die Server bleiben jetzt tatsächlich oben

Die unglamouröseste Arbeit der Woche war auch die sichtbarste für Nutzer: langlaufende Node-Style-Server — Fastify, ws, http, net — daran zu hindern, nach ein paar Minuten abzustürzen.

Die Abstürze teilten alle dieselbe Grundursache: Der GC wusste nichts über Listener-Closures. Wenn man `wss.on('message', handler)` schreibt, fängt die Closure Variablen ein, die als Felder innerhalb einer GC-allozierten Zelle leben. Wenn der GC-Root-Scanner nicht weiß, dass er diese Zellen besuchen muss, werden ihre Captures eingesammelt, und das nächste Message-Event dereferenziert freigegebenen Speicher.

-   **v0.5.26**: Root-Scan für `net.Socket`\-Event-Listener-Closures (schließt #35).
-   **v0.5.27**: auf `ws`, `http`, `events`, `fastify` erweitert.
-   **v0.5.28**: Modulweite Globals als GC-Roots registrieren (schließt #36). Lifetime-Bug eine Ebene höher.
-   **v0.5.21**: `gc()`\-Sicherheit innerhalb von Fastify/WebSocket-Request-Handlern — der explizite GC-Aufruf lief, während Request-Handler Pointer in die Arena hielten (schließt #31).

Neben der GC-Arbeit lieferte v0.5.20 eine **Main-Event-Loop** aus — eine echte, kein Platzhalter —, die WebSocket- und Timer-basierte Server am Leben hält, anstatt zu beenden, nachdem der letzte synchrone Aufruf zurückkehrt (refs #28). Das war der einzelne wirkungsvollste Fix für jeden, der versucht, Perry als produktiven HTTP-Server zu betreiben. Fastify bleibt jetzt oben. WebSocket-Server bleiben jetzt oben.

v0.5.19 behob den SysV-AMD64-ABI-Mismatch für JSValue-FFI-Argumente/-Returns — ein Problem unter Linux, bei dem native FFI-Aufrufe Argumente stillschweigend korrumpieren konnten. v0.5.18 fügte nativen Dispatch für `axios` hinzu (get/post/put/delete/patch), einschließlich `response.status` und `response.data`. v0.5.30 behob den `fastify request.header()`\- und `request.headers[]`\-Dispatch, der bei case-insensitiven Lookups undefined zurückgegeben hatte.

## 8\. `@perry/postgres`: der Treiber, der all das nötig gemacht hat

Viel von der Arbeit dieser Woche wurde von einem Workload getrieben: einen vollständigen Node-kompatiblen [Postgres-Treiber](https://github.com/PerryTS/postgres) auf Perry-nativ zum Laufen zu bringen. Der Treiber ist TLS-fähig, hat eine modulübergreifende Codec-Registry, unterstützt cancel/close/notify und benchmarkt jetzt gegen `pg`, `postgres.js` und `tokio-postgres`.

Die treiberseitige Perf-Arbeit verlief parallel zur compilerseitigen:

-   **Pro-Spalten-Codec hoisten** und Pro-Zellen-Buffer-Kopien weglassen. BigInt(string) für int8, um Zwischen-Allokationen zu vermeiden.
-   **Dynamischer Pro-Shape-Row-Konstruktor** für Object-Form-Rows. Wenn deine Query immer dieselben Spalten zurückgibt, baut der Treiber beim ersten Mal einen Shape-spezialisierten Row-Konstruktor und verwendet ihn wieder — was in Kombination mit dem PIC des Compilers Feld-Zugriff auf Rows so schnell macht wie Feld-Zugriff auf jedes andere Objekt.
-   **`parseTypes: 'minimal'`\-Opt-out** für Caller, die rohe Strings für int8/numeric/date wollen.

Das ist die positive Feedback-Schleife, die der Compiler immer ermöglichen sollte. Ein echter Treiber bringt echte Engpässe an die Oberfläche. Der Engpass bekommt einen Einzeiler-Reproducer als GitHub-Issue eingereicht. Eine Woche Compiler-Fixes später ist der Treiber schneller und der Compiler ist auch für alle anderen schneller. Das ist der ganze Plan, komprimiert in sieben Tage.

## 9\. Korrektheits-Fixes, die erwähnt werden sollten

Performance-Arbeit bringt Korrektheits-Probleme an die Oberfläche, so wie das Ausbaggern eines Flusses Einkaufswagen zutage fördert. Eine Teilliste:

-   **Promise.race** las bei Rejection `.value` statt `.reason`, sodass Rejections stillschweigend geschluckt wurden (v0.5.13–v0.5.14).
-   **Promise.any** wirft jetzt einen ordentlichen `AggregateError`, wenn alle Input-Promises rejecten. `Promise.withResolvers` hinzugefügt und die `queueMicrotask`\-Reihenfolge behoben.
-   **`[..."hello"]`** produziert jetzt ein Character-Array statt eines kaputten Objekts (schließt #16).
-   **BigInt-Arithmetik und `BigInt()`\-Coercion** (schließt #33). Der i64-bigint-Fast-Path (v0.5.29) macht den Normalfall billig.
-   **Buffer.indexOf / Buffer.includes** mit einem numerischen Byte-Argument verglichen gegen Buffer-Pointer statt gegen Byte-Values (schließt #56).
-   **Bitweise Operationen mit NaN/Infinity** produzieren gemäß ToInt32-Spec 0 (schließt #57).
-   **Windows x86\_64**: fünf plattformspezifische Fixes — `localtime`, `clang`\-Discovery und eine Handvoll Codegen-Anpassungen — brachten Windows x86\_64 zurück in den grünen Bereich (v0.5.72).

## 10\. Die Zahlen

Der Headline-Benchmark aus dem letzten Beitrag war `factorial` mit 24,6x schneller als Node. Diese Zahl ist unverändert. Was sich diese Woche bewegt hat, ist alles drumherum:

| Workload | v0.5.12 | v0.5.80 | Delta |
| --- | --- | --- | --- |
| JSON.parse (20-Record-Schema) | 547x langsamer als Node | 1,3x langsamer als Node | ~420x |
| image\_conv (4K 5×5 Blur) | 1.980ms | 457ms | 4,3x |
| Property-lastiger Code (PIC-Hit) | Baseline | 2–3x | 2–3x |
| Fibonacci(40) | 401ms | 309ms | 1,3x |
| Fastify-Uptime unter Last | ~60s bis zum Absturz | unbegrenzt | ∞ |

Die volle 15-Benchmark-Suite gegen Node steht weiterhin bei 14 Siegen und 1 Gleichstand — dieselbe Tabelle wie im letzten Beitrag, mit durchweg leicht besseren Zahlen. Die echte Bewegung diese Woche liegt bei Workloads, die nicht in dieser Suite waren: JSON, Bildverarbeitung, langlaufende Server. Dort lagen die Lücken, und genau diese sind geschlossen.

## 11\. Was als Nächstes kommt

Der eine Benchmark, dem wir noch hinterherjagen, ist `image_conv` vs. Zig. Perry liegt bei 457ms; Zig bei 246ms. Diese Lücke ist architektonisch, nicht auf Optimierungspass-Ebene, und sie lebt an drei Stellen:

1.  **Typisierte Buffer-Locals**. Der Großteil der Buffer-Arbeit landete diese Woche, aber buffer-typisierte Funktionsparameter und -Locals unboxen weiterhin bei jedem Zugriff. Der `i64`\-Slot-Ansatz, den wir für Schleifenzähler verwenden, muss auf Buffer erweitert werden.
2.  **Interior/Border-Loop-Splitting**. Die Blur-Schleife clamped jeden Pixel, einschließlich der 99,9% der Pixel, die das nicht brauchen. Das Aufteilen in Border-Regionen (clamped) und Interior (kein Clamp) lässt LLVM das Interior mit NEON `ld3`/`st3` vektorisieren.
3.  **Double-ABI-FNV-1a-Hash**. Der Hash-Helper wird über die NaN-Box-ABI aufgerufen. Ihn für heiße Pfade auf rohes i64 in/out zu spezialisieren, ist ein paar Stunden Arbeit, die sich über jeden Hash-lastigen Workload hinweg auszahlen wird.

Diese werden in `PERF_ROADMAP.md` getrackt. Erwarte sie im nächsten Zyklus.

## Zusammenfassung

Das Muster dieser Woche — 68 Patch-Releases, fast alles Performance, eine JSON-Lücke von 547x auf 1,3x — ist das, was passiert, wenn man auf die gute Seite des LLVM-Umstellungs-Hügels kommt. Der Optimierer ist jetzt ein Verbündeter statt einer Mauer, und der Großteil dessen, was bleibt, ist kleine, spezifische, messbare Arbeit: einen langsamen Pfad finden, herausfinden, warum der Optimierer nicht hindurchsehen kann, die Struktur freilegen, erneut messen. Keiner dieser Commits ist exotisch. Sie werden nur dort angewandt, wo sie gebraucht werden.

Wenn du irgendetwas davon ausprobieren willst:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

Issues, Reproducer und Benchmarks, die nicht schnell genug sind: immer her damit. Dieses Tempo funktioniert nur, weil die Bug-Reports spezifisch genug sind, um in Einzeiler-Reproducer umgewandelt zu werden. Jeder Commit in diesem Beitrag hat aus gutem Grund ein `#N` angehängt.

— Ralph
