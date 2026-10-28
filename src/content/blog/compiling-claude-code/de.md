---
title: "Claude Code kompilieren: ein minifiziertes Bundle, 160 Compilerkorrekturen"
excerpt: "Wir haben versucht, die 13 MB große minifizierte cli.js von Claude Code mit Perry in ein natives Programm zu kompilieren. Einen Monat später startet es, meldet sich an, empfängt echte API-Antworten als Stream und zeigt Eingaben an. Dafür wurden 160 Pull Requests in Perry integriert – vom funktionslosen MessageChannel bis zur fehlenden GC-Schreibbarriere in RegExp-Headern."
date: 2026-07-25
tags: ["compiler", "GC", "debugging", "Node.js parity", "milestone"]
---
Am 16. Juni lautete der Auftrag: *„Such den Claude-Code-Ordner und hol die (kompilierte, minifizierte) JavaScript-Datei daraus … schauen wir mal, ob wir sie kompilieren können :D“* Auf den naheliegenden Einwand, dass das brutal werden würde, kam die eigentliche Begründung: *„Es wird brutal, aber es ist auch ein echter Test unserer Fähigkeiten und Grenzen. Genau deshalb will ich es machen. Nichts ersetzt reale Anwendungen, wenn man Grenzen finden will.“*

Einen Monat später startet eine mit Perry kompilierte Version von Anthropics Claude Code CLI, führt `/login` über den OAuth-Ablauf aus, empfängt eine echte API-Antwort als Stream und zeigt die eingegebenen Zeichen an. Dafür wurden **zwischen dem 20. Juni und dem 17. Juli 160 Pull Requests in Perry integriert**: ein funktionsloser `MessageChannel`, eine fehlende GC-Schreibbarriere in RegExp-Headern, eine `continue`-Anweisung, die nur mit der echten API endlos lief und nie mit unserem Mock, und rund 150 weitere Fehler.

Dieser Beitrag führt durch diese Arbeit. Das Kompilieren einer fremden CLI ist für uns kein Produkt — wir verteilen dieses Programm nicht und werden das auch künftig nicht tun. Es war aber das ergiebigste Werkzeug zur Fehlersuche, das wir je auf Perry angewendet haben.

<figure><img src="/blog/compiling-claude-code/claude-code-session.png" alt="Ein macOS-Terminal, auf dem eine Perry-kompilierte Claude Code-Binärdatei aus /tmp/verify ausgeführt wird: das v2.1.112-Banner, ein erfolgreiches /login, die Eingabeaufforderung „Super, wer bist du?“, a gestreamte Antwort und ein sauberer Ausgang zurück zur Shell." width="1708" height="926"><figcaption>Kein <code>node</code> in dieser Befehlszeile. <code>/tmp/verify/cc_fptest_dbg25</code> ist eine einzelne native ausführbare Datei, die von <code>perry compile</code> aus dem mitgelieferten <code>cli.js</code> erstellt wurde – nach dem Anmelden, Streamen einer echten Antwort und sauberes Beenden bei Ctrl-C. Da der Dateiname die Frage aufwirft: <code>dbg25</code> ist der 25. Build einer Diagnoseserie aus der GC-Untersuchung, die noch läuft, als dies geschrieben wurde – Debug-Symbole und Schreibbarrieren-Elision ausgeschaltet, sodass <em>jeder</em> Array-Speicher eine Barriere ausgibt. Es verursacht mehr Aufwand als ein gewöhnlicher Build, nicht weniger. Die Leistungstabelle weiter unten wurde an verschiedenen, nicht instrumentierten Binärdateien gemessen.</figcaption></figure>

## Was „Kompilieren von Claude Code“ eigentlich bedeutet

Das Kompilierungsziel ist die im npm-Paket verteilte Datei. `npm pack @anthropic-ai/claude-code@2.1.112` gibt Ihnen eine `cli.js`: **13 MB minimiertes, selbstausführendes JavaScript** mit einem `#!/usr/bin/env node` Shebang. Keine Quelle, keine Sourcemap, kein Build-Schritt von uns. Wir zeigen mit `perry compile` auf diese unveränderte Datei und fragen nach einer nativen ausführbaren Datei.

Perry kaut etwa 37 Minuten lang daran herum und produziert ungefähr 207 MB IR über **16.023 Funktionen**, die zu einer ~180 MB-Binärdatei verknüpft sind. Jede dieser Funktionen hat einen aus einem Buchstaben bestehenden Namen und keine Typanmerkungen, und das Ganze muss im Voraus funktionieren – kein JIT, keine `eval`, kein verzögertes Ausweichen auf einen Interpreter, wenn der Compiler falsch rät. Wenn Perry eine dieser 16.023 Funktionen falsch herunterfährt, gibt es nichts, was ihn abfangen könnte.

Die Bewertungsleiter stammt aus unserer internen Stress-Suite und ist bewusst gnadenlos:

```
parse    → perry couldn't even parse it
compile  → parsed, but HIR/codegen errored
link     → codegen ok, but cc/ld failed
run      → linked, but the binary crashed / hung / exited non-zero
ran-ok   → binary exited 0
correct  → output byte-matches node --experimental-strip-types
```

`correct` ist die einzige Stufe, die zählt. Node v26 ist das Orakel; Alles, was nicht byteidentisch mit dem ist, was Node ausgibt, ist ein Perry-Fehler, bis das Gegenteil bewiesen ist.

## Warum gerade diese App

Ein Coding-Agent CLI ist ein ungewöhnlich feindseliger Stapel von JavaScript, der im Voraus kompiliert werden muss. In einer Binärdatei erhalten Sie: React, das sich über Ink mit einem Terminal abgleicht, einen stdin-Reader im Raw-Modus, einen ANSI/emoji-gesättigten Renderer, der in jedem Frame reguläre Ausdrücke ausführt, einen Streaming-SSE HTTP-Client, zod-Schemas, die beim Start erstellt werden, ein OAuth-Fluss, `worker_threads`, `MessageChannel`, der als verwendet wird Makrotask-Scheduler, WeakMaps mit Fiber-Status, dynamisches `require` und eine Dateisystemschicht, die per Dateideskriptor auf stdout schreibt.

Jedes davon ist ein anderes Subsystem von Perry, und die App trainiert sie *zusammen* in großem Maßstab unter GC-Druck, jeweils für Minuten. Unsere eigenen Testsuiten – 3.000 Rust-Einheitentests, Tausende von TypeScript-Regressionsprogrammen, die Node API-Paritätsmatrix, test262 – sind alle darauf ausgerichtet, bekanntes Verhalten zu fixieren. Dieses Paket zielt darauf ab, Verhaltensweisen aufzuspüren, an die niemand gedacht hat.

## Die Reihenfolge der Hindernisse

Die Arbeit ging nur in eine Richtung: die aktuelle Wand räumen, die nächste finden. Komprimiert:

| Datum| Meilenstein |
| --- | --- |
| 21. Juni| `--help` wird nativ ausgeführt, Exit-Code 0 |
| 22. Juni| Echte Unterbefehle hängen beim Start nicht mehr |
| 23. Juni| `-p` öffnet einen ETABLIERTEN TCP-Socket zu api.anthropic.com |
| 24. Juni| zod-Schemata werden korrekt erstellt; Authentifizierungspfad erreicht |
| 27. Juni| Die TUI rendert – Logo, Willkommensfeld, Eingaberahmen |
| 9. Juli| Erster vollständiger Roundtrip: `-p` gegen die echte API druckt die Antwort, Exit 0 |
| 10. Juli| Node-vs-Perry Vergleichstest: 12/12 identisch |
| 13. Juli| Byteidentisch mit Node auf `-p` Text + JSON, TUI-Rendering, Dateisystem |
| 16. Juli| Eingegebene Zeichen erscheinen schließlich in der Eingabezeile |
| 17. Juli| Vollständige Schleife, manuell validiert: Starten → `/login` → API Antwort → Eingabe |

Jeder Fix wurde als eigenständige Pull-Anfrage mit einer minimalen, generischen Reproduktion vorgelagert. Keiner von ihnen erwähnt die App, von der sie kamen – das war vom ersten Tag an eine Regel. Ein Perry-Benutzer, der das Änderungsprotokoll liest, sieht „`continue` in for-await drivers hat den Iterator-Fortschritt übersprungen“, nicht „wir haben versucht, die CLI von jemandem zu kompilieren.“ Die Softwarefehler sind real, unabhängig von dem Fahrzeug, das sie aufgetaucht hat.

## Fünf Softwarefehler, die es wert sind, diskutiert zu werden

### 1. MessageChannel war ein höfliches No-Op

`--help` funktionierte am 21. Juni. Jeder *echte* Unterbefehl – `doctor`, `agents`, `mcp list` – hängt für immer. Nicht beschäftigt: `sample` zeigte den geparkten Prozess, `lsof` zeigte keine untergeordneten Prozesse, keine Sockets, nur zwei Pipes.

Perrys `MessageChannel` installierte `postMessage` als No-Op und `onmessage` als `null`. Das ist harmlos, bis Sie auf das React-Scheduler-Muster stoßen, das einen Nachrichtenkanal als Makrotask-Scheduler verwendet:

```
const ch = new MessageChannel();
ch.port1.onmessage = flushWork;
ch.port2.postMessage(null);   // schedule the next tick
```

Die Nachricht wurde gelöscht, der Rückruf wurde nie ausgeführt und die Ereignisschleife blieb für immer in ihrer eigenen Wakeup-Pipe im Leerlauf. [#5530](https://github.com/PerryTS/perry/pull/5530) gab Ports echte Same-Thread-Zustellung – verschränkte Paare, eine FIFO-Warteschlange, Zustellung über die `setImmediate`-Makrotask und eine GC Root-Scanner, damit Nachrichten in der Warteschlange eine Sammlung überleben.

### 2. Ein Zugriff auf Object.prototype kostete 42 Sekunden

Vor dem Aufhängen waren dieselben Unterbefehle mehrere zehn Sekunden lang CPU-gebunden. Die Profilerstellung zeigte auf den generischen `[[Set]]`-Pfad, und die Grundursache war ein prozessglobales Flag.

Perry verfügt über einen schnellen Pfad für dynamische Eigenschaftsschreibvorgänge, der auf „trägt `Object.prototype` derzeit irgendwelche Deskriptoren zurückzuführen?“ Das Bundle installiert beim Start genau einen Accessor auf `Object.prototype`. Dadurch wurde das Flag prozessweit umgedreht, und von da an durchlief *jeder* dynamische Schreibvorgang im Programm den langsamen Abfangschritt, der O(own-key-count) ist. Der Aufbau eines breiten Objekts wurde quadratisch:

```
20,000-property build, clean process:                 16 ms
20,000-property build, after one Object.prototype accessor:  42,394 ms
```

[#5524](https://github.com/PerryTS/perry/pull/5524) hat das globale Flag durch eine Schlüsselfrage ersetzt – *hat `Object.prototype` eine eigene Eigenschaft für **diesen** Schlüssel?* Ein fehlender Schlüssel kann nicht abgefangen werden, daher ist der Schreibvorgang sicher im Fast-Path-Verfahren. 42 s → 23 ms, wobei das Abfangen immer noch korrekt ist.

Dann erschien die gleiche Form wieder für Klasseninstanzen, die der Schnellpfad völlig ausschloss: Ein Build mit 20.000 Schlüsseln auf einem einfachen Objekt dauerte 25 ms, auf einer `class` 44 Sekunden. Es war wichtig, dieses Problem sorgfältig zu beheben – eine naive Überprüfung der Prototypenkette hätte geerbte Setter übersprungen und Daten stillschweigend beschädigt – daher löst [#5528](https://github.com/PerryTS/perry/pull/5528) den Prototyp der Instanz über die Klassenregistrierung auf und fügt einen O(1)-Wide-Key-Index hinzu. Zurück zu 30 ms und wieder linear.

### 3. Der Fehler, den nur die echte API auslösen konnte

Das ist es, von dem wir den Leuten erzählen. Bis Anfang Juli würde die kompilierte Binärdatei eine vollständige `-p`-Runde gegen unseren lokalen Scheinserver durchführen: Verbinden, POST, den SSE-Stream lesen, die Antwort drucken, Exit 0. Gegen den tatsächlichen Anthropic API hing jedes Mal für immer.

Die Debugging-Kette war: ein Forward-Proxy-Mock bewies, dass die vollständige 200-Antwort unversehrt ankam → ein Replay-Mock, fütterte den erfassten echten Byte-Stream, reproduzierte den Hang lokal → Halbierung der SSE-Ereignisliste fand das schuldige Ereignis → eine zehnzeilige Reproduktion.

Die echte API sendet `event: ping`-Frames. Unser Mock hat es nie getan. Und `ping` ist das einzige Ereignis, das die Stream-Schleife des SDK mit einem bloßen `continue` überspringt. Perry hat `for await` in einen Treiber abgesenkt, dessen Iteratorfortschritt sich am *unteren* des Schleifenkörpers befand:

```
// what perry emitted
while (!done) {
  ...body...                   // a "continue" here skips the advance…
  result = await it.next();    // …so this never runs. Spin forever.
}

// what it emits now
while (true) {
  result = await it.next();
  if (result.done) break;
  ...body...
}
```

Sechs separate Absenkstellen hatten die gleiche Form. [#6196](https://github.com/PerryTS/perry/pull/6196) hat den Vorsprung in allen an die Spitze verschoben. Die Lektion, die wir immer wieder neu lernen: Ein Schein, der Bestand hat, ist ein Beweis für den Schein.

### 4. Ein regulärer Ausdruck, der seine eigene Musterzeichenfolge überlebt hat

Die TUI würde innerhalb von Sekunden gerendert werden und dann an `SIGBUS` sterben – 12 Abstürze in 12 Durchläufen unter einer Fenstergrößenänderungsbelastung, jedes Mal an unterschiedlichen Adressen in unterschiedlichen Funktionen. Die wochenlange Untersuchung befasste sich mit GC-Theorien, die dann durch A/B-Tests widerlegt wurden, einschließlich einer unserer eigenen „Korrekturen“, die sich als unhaltbar herausstellte und zurückgezogen werden musste.

Die eigentliche Ursache waren vier Zeilen Rust. `js_regexp_new` weist einen RegExp-Header zu und speichert dessen `pattern` und `flags`-Stringzeiger mit Rohschreibvorgängen – **kein Schreibvorgang Barriere**. Ein Objekt der alten Generation, das auf eine frische, junge Saite zeigt, wobei der Sammler nie etwas über die Kante erfahren hat. Der untergeordnete GC hat diese Zeichenfolgen unter einem Live-RegExp entfernt, und beim nächsten Lesen des freigegebenen Steckplatzes war ein Fehler aufgetreten.

Warum wurde das nur hier angezeigt? Da eine Terminal-Benutzeroberfläche mit Regex gesättigt ist – ANSI-Parsing und Emoji-Breitenmessung führen Muster in jedem einzelnen Frame aus – wird das Fenster zwischen Zuweisung und Sammlung tausende Male pro Minute überschritten. Unsere minimale Reproduktion, 6.000 reguläre Ausdrücke plus absichtliche Zuordnungsänderung, hat *nie* dazu geführt. Das Bundle hat es jedes Mal ausgelöst. [#6288](https://github.com/PerryTS/perry/pull/6288) fügte die Barriere hinzu, die beide Felder immer benötigt hatten.

### 5. Die von Ihnen eingegebenen Zeichen waren vorhanden. Der Rahmen warf sie weg.

Die hartnäckigste Wand: Die gesamte Benutzeroberfläche ist perfekt bemalt – Willkommensfeld, Eingaberahmen, Cursorblock, Statuszeile. Durch die Eingabe von `/` wurde das Befehlsmenü geöffnet, sodass der Tastendruck React erreichte. Aber die Buchstaben erschienen nie in der Eingabezeile.

Instrumentierte Builds zeigten, dass Perry das eingegebene Zeichen in jeder Phase korrekt malte und dann `onRender` *nach* die Farbe warf – in eine Ink `try/catch`, der es verschluckt hat. Der Frame wurde vor dem Commit aufgegeben, sodass jedes nachfolgende Rendering auf einem leeren Frame aufbaute. Die App sah vollkommen fehlerfrei aus, als sie Sie ignorierte.

Zwei unabhängige Fehler versteckten sich hinter diesem einen Symptom:

-   [#6453](https://github.com/PerryTS/perry/pull/6453) – Perrys Inline-Reduzierung von `charAt`/`codePointAt`/`split` namens ToString auf einem Nicht-String-Empfänger ohne den erforderlichen Koerzibilitätsschutz. Also gab `undefined.codePointAt(0)` stillschweigend `117` zurück – den Codepunkt von `"u"` aus der Zeichenfolge `"undefined"` – anstatt zu werfen. Ein Fehler, der plausible Daten *erfindet*, ist weitaus schlimmer als einer, der abstürzt.

-   [#6471](https://github.com/PerryTS/perry/pull/6471) – der wahre Blocker. Wenn ein Array wächst, hinterlässt Perry einen permanenten Weiterleitungs-Stub an der alten Adresse. Der kleinere Sweep forderte diese Stubs zurück, während ein übergeordnetes Element der alten Generation noch auf einen zeigte: Der Zeichencache des Renderers enthielt einen Zeiger vor dem Wachstum auf einer Seite, die nicht schmutzig war. Das Durchlesen des veralteten Stubs ergab eine Mülllänge und jeder Frame wurde abgebrochen. Minderjährige behalten jetzt alle Stubs; Vollständige Spuren fordern sie von Mark zurück.


Behebung derjenigen, die eine dritte Ebene freigelegt haben – Objekte, die während der inkrementellen Markierung schwarz geboren wurden, wurden nie verfolgt, sodass alles, was nur durch sie erreichbar war, im Live-Modus gefegt wurde ([#6494](https://github.com/PerryTS/perry/pull/6494)), und die Layoutmaske meldete Überlaufslots nicht ausreichend, sodass der Kollektor sie übersprang ([#6506](https://github.com/PerryTS/perry/pull/6506)). Diese beiden sind die Art von Fehlern, die in *jedem* kompilierten Programm zu einem mysteriösen Absturz von eins zu fünfzig führen. Mit einer Testsuite hätten wir sie nicht gefunden.

## So debuggen Sie eine 13 MB große minimierte Binärdatei

Keines der oben genannten Elemente kann durch Lesen des Codes gefunden werden. Die Werkzeuge, die es handhabbar machten:

-   **Ein differenzielles Geschirr mit Node als Orakel.** Jede Hypothese wird zu einem kleinen TypeScript-Programm, das sowohl unter `node --experimental-strip-types` als auch unter einem Perry binär, Byte für Byte verglichen. Es wurden selbst Fehler gefunden – ein Klassenausdruck, der nur als `instanceof` auf der rechten Seite verwendet wurde, wurde durch toten Code eliminiert, da elf Analysedurchläufe diesen Knotentyp nicht durchschauen konnten ([#6245](https://github.com/PerryTS/perry/pull/6245)).

-   **Drei simulierte API-Server.** Ein Protokollierungsmodell, ein Forward-Proxy, der echte Antwortbytes erfasst, und ein Wiedergabeserver, der genau diese Bytes deterministisch zurückgibt. Der Wiedergabeserver ist es, der „Hänge gegen die Produktion“ in eine lokale Reproduktion verwandelt.

-   **Ein PTY-Kabelbaum, der Terminalanfragen beantwortet.** Ein dummes Pseudoterminal bringt Ihnen 50 Bytes und einen Stall. Die App prüft die Cursorposition (`ESC[6n`), Geräteattribute (`ESC[c`) und die Hintergrundfarbe (`OSC 11`) und wartet vor dem Malen auf Antworten. Beantworten Sie sie und Sie erhalten den vollständigen 3.331 Byte großen Begrüßungsbildschirm – und ein Byte-vergleichbares Rendering zwischen Node und Perry.

-   **Verknüpfen Sie Karten zur Symbolik.** Reduzierte 180-MB-Binärdateien erzeugen Absturzberichte voller Rohoffsets. Die `ld64 -map`-Ausgabe plus ein Bisect-Skript wandelt diese wieder in Funktionsnamen um.

-   **Alles A/B.** Die Regel, die sich herausstellte, steht oben auf den Übergabenotizen in Großbuchstaben: *Niemals eine Theorie erben – testen Sie sie.* Vier aufeinanderfolgende Grundursachenhypothesen für einen Fehler wurden jeweils durch A/B-Läufe widerlegt. Ein Prüfsignal, dem wir tagelang nachjagten („445 fehlende alte→junge Kanten“), stellte sich als Messartefakt heraus – die Prüfung lief zwischen dem Löschen und dem Wiederherstellen des gespeicherten Satzes. Der eigene Kommentar des Codes warnte davor.


## Wo es tatsächlich steht

Ganz ehrlich: Es funktioniert, und es ist langsam.

Funktioniert heute, Byte-identisch mit Node, wobei die Ausgabe vergleichbar ist: Startup, `--help`, `--version`, einmaliger `-p`-Modus gegen echte API einschließlich Fehlerklassifizierung und dem JSON-Envelope, dem vollständigen TUI-Rendering, dem OAuth `/login`-Flow, Streaming Antworten und Tippen. Hier ist die gesamte Schleife in einer Aufnahme: Starten, `/login`, eine Frage, eine gestreamte Antwort, beenden:

<figure><video controls="" playsinline="" preload="none" poster="/blog/compiling-claude-code/claude-code-demo-poster.png"><source src="/blog/compiling-claude-code/claude-code-demo.mp4" type="video/mp4">Ihr Browser unterstützt kein eingebettetes Video.</video><figcaption>63 Sekunden, kein Ton, Schnitt an zwei Stellen: die Browserhälfte des OAuth-Handshakes und ein verirrter macOS Schlüsselbund-Eingabeaufforderung. Alles im Terminal erfolgt in Echtzeit und unbearbeitet – einschließlich der Startverzögerung, die in diesem Beitrag am langsamsten ist.</figcaption></figure>

Zwei Dinge sind noch offen, und sie könnten durchaus eins sein. Die Eingabe wird nach etwa einer Minute anhaltender interaktiver Nutzung nicht mehr registriert – kein Absturz, kein Fehler, sie stoppt einfach. Und `ESC` unterbricht eine Antwort während des Flugs nicht, obwohl `Ctrl-C` jetzt sauber beendet wird, was vor einer Woche noch nicht der Fall war (das ist der Ausgang, den Sie am Ende der Aufzeichnung sehen). Ein Quit-Pfad, der funktioniert, während ein Interrupt-Pfad nicht auf denselben Verdächtigen verweist wie der Eingabetod: Tastendruckereignisse, die die App nicht mehr erreichen, und nicht irgendetwas, das mit den eigenen Handlern der App nicht in Ordnung ist.

Das Leistungsbild, gemessen am Node, der das identische Paket ausführt, vor und nach der ersten Runde der Geschwindigkeitskampagne, die an dem Tag begann, an dem die Korrektheit eintraf. Diese kamen am 17. Juli von `cc_final` und `cc_perf2` – gewöhnliche Builds ohne einkompilierte Diagnose, nicht die instrumentierte Binärdatei im Screenshot oben:

| Metrik| Node| Perry (17. Juli)| Perry (nachher) |
| --- | --- | --- | --- |
| `--version` | 328 ms| 1.168 ms| **227 ms** |
| `--help` | 715 ms| 5.071 ms| 4.099 ms |
| TUI erster Anstrich| 0.76 s | 10.9 s | 8.4 s |
| Tastendruck → Malen (S. 50)| 2,2 ms| 111–143 ms| 119–138 ms |
| Speicherbedarf, im Leerlauf| 290 MB flach| ~420 MB Klettern| ~420 MB Klettern |

`--version` schlägt jetzt **Node**, und der Sieg hatte einen peinlichen Ursprung: Die kompilierte ausführbare Datei exportierte 300.281 Symbole, sodass ~80 % dieses Starts dyld führt die Zusammenführung schwacher Definitionen durch. Ein Linker-Flag erhöhte die Exporte auf 3 und die Binärdatei von 228 MB auf 197 MB ([#6533](https://github.com/PerryTS/perry/pull/6533)). Erstellen Sie jeden eindeutigen regulären Ausdruck einmal statt zweimal ([#6534](https://github.com/PerryTS/perry/pull/6534)) und Zwischenspeichern der Abhörprüfung pro Geschäft ([#6532](https://github.com/PerryTS/perry/pull/6532), [#6541](https://github.com/PerryTS/perry/pull/6541)) übernahm den Rest.

Auf diesen 197 MB, bevor irgendjemand damit beginnt: Perry verknüpft statisch seine eigene Laufzeit und gibt Maschinencode für alle 16.023 Funktionen im Voraus aus, ohne dass etwas außer Kraft gesetzt werden muss – ein selbstausführendes Bundle macht im Wesentlichen alles erreichbar, sodass es kein bundesübergreifendes DCE gibt zum Anlehnen – was bedeutet, dass 197 MB ein ganzes Programm *plus* seine Laufzeit in einer Datei sind, im Vergleich zu den **138 MB, die die Binärdatei von Node v26 wiegt, bevor sie eine einzige Zeile Ihres JavaScript** gelesen hat.

Die Tastenanschlagszeile ist diejenige, die Sie sorgfältig lesen sollten, da die „Nachher“-Zahl schlechter aussieht. Das ist nicht der Fall: Es handelt sich um Bereiche über wiederholte Durchläufe und sie überlappen sich, sodass sich der Median nicht in die eine oder andere Richtung bewegt hat – das ist eine Varianz von Lauf zu Lauf, keine Regression. Es ist auch genau das, was wir erwartet haben. Alle drei Änderungen betreffen den Linkschritt, die Regex-Konstruktion und den *store*-Pfad; Der Tastenanschlag-Median wird dominiert von der Eigenschaft *read*-Pfad, dem Rooting-Overhead pro Aufruf und GC-Schritten von 40–80 ms, die innerhalb von Tastendruckfenstern landen. Der Beweis kam in der nächsten Runde: Get/Set Fast Lanes machten einen Field-Access-Mikrobenchmark um das Dreifache schneller und erhöhten diese Zahl um nichts ([#6539](https://github.com/PerryTS/perry/pull/6539)). Ein Mikrobenchmark-Sieg, der nicht in der App angezeigt wird, ist eine falsche Diagnose, und wir hatten eine.

Die Speicherzeile ist die aktuelle Kampagne. Perrys Kopierkollektor *kann* komprimieren – das Problem besteht darin, dass er ungefähr einmal alle 45 Sekunden im Leerlauf aktiviert wird, sodass die Baumschule zwischen den Auslösungen wieder auf ~300 MB anwächst, während Node durch kontinuierliche Komprimierung flach bleibt. Das ist ein Trigger-Frequenz-Problem, kein Algorithmus-Problem, und das ist viel besser als im Juni.

Keines davon ist geparkt. Die Speicher- und Leistungskampagne ist *live*, während dieser Beitrag veröffentlicht wird – die Arbeit am GC-Trigger läuft heute genau auf dieser Binärdatei – daher ist die obige Leistungstabelle der Teil dieses Beitrags, von dem wir am meisten erwarten, dass er ungültig wird, und je früher, desto besser. Es dauerte einen Monat, bis die Mauern die Richtigkeit durchdrangen. Übrig bleiben ein Triggerfrequenzproblem und ein Lesepfadproblem, die beide verstanden und bereits im Einsatz sind. Wir gehen davon aus, dass sich die Sache reibungslos anfühlt und nicht nur korrekt, und wir erwarten, dass es bald geschieht.

## Warum wir das tun

Keine der 160 Korrekturen betrifft Claude Code. Eine fehlende Schreibbarriere für RegExp-Header beschädigt den Speicher in *jedem* Programm, das unter Last reguläre Ausdrücke erstellt. `for await` mit einem `continue` dreht sich in jedem Stream-Consumer. Das Löschen von Nachrichten durch `MessageChannel` unterbricht jede React-artige App. Das `Object.prototype`-Deskriptor-Flag hat *jedes* Programm, das `Object.prototype` berührt, in seinem breitesten Objekt quadratisch gemacht.

Diese Fehler befanden sich alle in Perry, während CI grün war, während die test262-Zahlen stiegen, während die Node-Paritätsmatrix 97 % anzeigte. Um sie loszuwerden, waren dreizehn Megabyte des minimierten JavaScript eines anderen nötig, das echte Arbeit gegen eine echte API in einem echten Terminal leistete.

Da gibt es noch etwas, und das ist der Teil, den wir am lustigsten finden. Perry ist nicht nur von Hand geschrieben – ein großer Teil davon, einschließlich eines großen Teils *dieser* Kampagne, wurde mit Claude Code geschrieben. Die Scheinserver, das PTY-Geschirr, der Differential Runner, die langen Nächte der Halbierung eines GC-Bugs um vier Uhr morgens: Agentensitzungen, überprüft und zusammengeführt von einem Menschen. Nicht alle von Perry und nicht ohne viele Argumente. Aber genug, dass der Satz in beide Richtungen wahr ist.

Der Compiler, der Claude Code aß, wurde zu einem wesentlichen Teil von Claude Code erstellt.

Wir machen weiter so. Die nächsten Ziele stehen bereits in der Warteschlange.

* * *

Perry ist nicht mit Anthropic verbunden oder wird von diesem unterstützt. Claude Code ist eine Marke von Anthropic PBC. Die hier beschriebene Binärdatei wurde aus dem öffentlich veröffentlichten npm-Paket ausschließlich als Compiler-Testziel erstellt und wird nicht verteilt.
