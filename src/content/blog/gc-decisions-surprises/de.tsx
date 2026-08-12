import { BlogMarkdownContent } from "@/components/BlogMarkdownContent";

const markdown = `**TL;DR.** Perry kompiliert TypeScript zu nativen Binärdateien und verwendet einen verschiebenden, generationellen Tracing-Collector mit präzisen Roots — keine Referenzzählung. Nach einem Monat, in dem fast die gesamte GC-Arbeit darin bestand, *herauszufinden, was der Collector tatsächlich tat*, schlägt Perry Node inzwischen in 9 von 19 GC-geprägten Benchmarks (zuvor 3), den AOT-Konkurrenten mit Referenzzählung in 14 von 19 und liegt bei 15 von 19 höchstens 1,3× hinter Node. Unterwegs begegneten uns eine Fehlerklasse ohne forensische Spuren, Umgebungsvariablen, die nichts schalteten, CI-Gates, die strukturell nicht fehlschlagen konnten, ein Dokumentationskommentar, durch den unbemerkt ein anderer Collector ausgeliefert wurde, und eine abschließende Messung, laut der die verbleibende Lücke im Objekt-*Layout* liegt, nicht im Sammeln. Die neun Regeln, die wir daraus abgeleitet haben, stehen am Ende — und die meisten haben nichts mit Garbage Collection zu tun.

Perry kompiliert TypeScript direkt zu einer nativen ausführbaren Datei: SWC parst den Code, wir senken ihn zu HIR ab, LLVM erzeugt Maschinencode und \`cc\` linkt ihn. Es gibt weder Interpreter noch Bytecode. Die von uns kompilierte Sprache hat trotzdem Closures, die ihren Gültigkeitsbereich verlassen, Objekte, die länger als ihr Scope leben, und Referenzzyklen — hinter dieser nativen Binärdatei muss also irgendwo ein echter Garbage Collector stehen.

Dies ist ein Bericht über die Entscheidungen beim Bau dieses Collectors, die Dinge, die uns überrascht haben (die meisten davon unangenehm), und den heutigen Stand der Zahlen. Der Collector ist seit Monaten der mit Abstand aktivste Bereich des Codebestands: **201 Commits haben seit dem 01.07.2026 \`crates/perry-runtime/src/{gc,arena}\` berührt, 110 davon allein in den letzten zwölf Tagen**, verteilt über 127 Dateien und rund 75.000 Zeilen. 135 der 572 noch nicht veröffentlichten Changelog-Fragmente tragen Namen aus der GC-Arbeit.

Fast nichts davon war „einen Collector implementieren“. Es ging darum herauszufinden, was unser Collector tatsächlich tat.

---

## Teil 1 — Wofür wir uns entschieden haben

### Keine Referenzzählung

Die erste Frage lautet fast immer, ob ein AOT-Compiler nicht einfach Referenzzählung verwenden sollte. Das liegt nahe: kein Problem mit der Root-Ermittlung, keine Safepoints und keine erforderliche Zusammenarbeit mit dem Optimierer. Der konkurrierende AOT-TypeScript-Compiler, gegen den wir messen, geht genau diesen Weg.

Wir haben uns trotzdem für einen Tracing-Collector entschieden, weil Referenzzählung den Normalfall für den seltenen Fall bezahlen lässt — jeder Pointer-Store aktualisiert einen Zähler, Zyklen brauchen ohnehin einen zusätzlichen Tracer, und JavaScript erzeugt riesige Mengen von Objekten, die sofort sterben. Genau diesen Fall verarbeitet eine Nursery praktisch kostenlos. Heute sieht diese Entscheidung in 14 unserer 19 GC-Benchmarks richtig und in 5 falsch aus (mehr dazu am Ende).

### Werte sind NaN-boxed — und wir bauen das gerade teilweise zurück

Jeder JS-Wert besteht aus einem 64-Bit-Wort. Wir verwenden die ungefähr 2⁵² freien NaN-Muster von IEEE 754, um Pointer, kleine Ganzzahlen und Singletons zu markieren; alles andere bleibt ein gewöhnliches \`f64\`:

\`\`\`
TAG_UNDEFINED = 0x7FFC_0000_0000_0001   BIGINT_TAG  = 0x7FFA (low 48 = ptr)
TAG_NULL      = 0x7FFC_0000_0000_0002   POINTER_TAG = 0x7FFD (low 48 = ptr)
TAG_FALSE/TRUE= 0x7FFC…0003 / …0004     INT32_TAG   = 0x7FFE (low 32 = int)
                                        STRING_TAG  = 0x7FFF (low 48 = ptr)
\`\`\`

Für den Collector ist das ein ausgesprochen gutes Geschäft: „Ist dieses Wort ein Pointer?“ lässt sich mit Maske und Vergleich beantworten, ohne Typabfrage pro Wert während des Tracings. Und eine ruhende Zahl besteht bereits aus ihren IEEE-Bits, sodass ein numerisches Feld weder Box noch Header braucht.

Für den *Mutator* ist es dagegen das größte einzelne Hindernis zwischen uns und V8, und wir entfernen es aktiv. Das Problem ist nicht nur, dass NaN-boxed \`double\` *eine* Repräsentation ist, sondern dass es die **kanonische** ist — native Maschinentypen existieren nur als regionenlokale Overlays, während eine ganze Familie von \`materialize_*_to_js_value\` an jeder JS-sichtbaren Grenze erneut boxt. Im erzeugten IR lebt dadurch selbst ein nachweislich als \`i32\` typisierter Schleifenakkumulator in einem \`alloca double\`, überlebt \`-O3\` als \`phi double\` über die Rückkante und bezahlt in **jedem Schleifendurchlauf** eine \`fptosi\`- plus \`sitofp\`-Rundreise. Funktionsparameter sind einheitlich \`double %argN\`, weshalb eine heiße Funktion ihre Argumente bei Millionen Aufrufen jedes Mal neu entboxt. Numerische Locals wurden früher sogar als GC-Roots registriert, obwohl eine Zahl niemals ein Pointer sein kann.

Die entscheidende Messung: Ein originalgetreu entrolltes bcryptjs-\`_encipher\` braucht 834 ms gegenüber 184 ms bei Node — und *Typannotationen machten es noch schlimmer*: 834 → 2732 ms, weil rund 80 Guards pro Lesezugriff plus erneute Materialisierung an Grenzen dominierten. Schnelle Pfade auf Ausdrucksebene können ein Repräsentationsproblem nicht lösen; jeder weitere ist nur ein Overlay auf einem geboxten Kanon, und bei entrolltem Code kehrt sich der Nutzen um.

Die Richtung (\`docs/representation-selection-rfc.md\`, die Unbox-by-default-Kampagne) ist daher, die ungeboxte native Form für jeden statisch bewiesenen Wert kanonisch zu machen — Skalare, Strings, Objekte, Typed Arrays und Closures — durchgängig über Locals, Parameter, Rückgaben und typisierte Heap-Slots. NaN-Boxing wird auf nachweislich polymorphe Werte begrenzt. Es bleibt die *Standard*-Repräsentation, ist aber nicht länger die *einzige*. Die Phasen 1, 2, 3a, 3b, 4a und 4b sind gemergt. Static Hermes liefert den Existenzbeweis. Das AOT-Argument lautet, dass wir Typen *beweisen* müssen, wo ein JIT spekulieren darf — zugleich ist das unser Vorteil, denn ein bewiesener Kernel braucht kein Warm-up und kann nicht deoptimieren.

Für den GC wirkt das in beide Richtungen. Unboxing entfernt Roots, die der Collector sonst scannen müsste (ein bewiesener Skalar ist überhaupt kein Root), und schafft zugleich eine neue Pflicht: Sobald ein Heap-Slot etwas anderes als ein NaN-boxed Wort enthält, kann der Collector die Pointer-Eigenschaft nicht mehr aus dem Wert selbst lesen und muss eine Layout-Maske pro Shape konsultieren. Diese Mechanik — \`pointer_mask\`, \`raw_f64_mask\` und die Layout-Notizen — ist der Ursprung mehrerer Fehler, die später in diesem Beitrag auftauchen.

### Ein Heap pro Thread, kein Teilen

Perry ist standardmäßig single-threaded; \`perry/thread\` stellt \`spawn\` und \`parallelMap\` bereit, und Werte überschreiten Thread-Grenzen als tiefe Kopien (\`SerializedValue\`), nicht als gemeinsam genutzter Zustand. Das hat echte ergonomische Kosten, verschafft dem Collector aber einen großen Vorteil: **Er synchronisiert sich nie mit einem anderen Thread.** Kein globales Safepoint-Protokoll, keine Handshakes, keine Read Barriers für threadübergreifende Invarianten. Jede Arena, jeder Root-Scanner und jedes Remembered Set ist threadlokal.

### Generationell, weil die Allokationsverteilung dafür spricht

Pro Thread gibt es zwei Regionen: eine Nursery (\`ARENA\`, Blöcke zu 1 MB) und eine alte Generation (\`OLD_ARENA\`), einen 8 Byte großen \`GcHeader\` pro Allokation und zwei Alterungsbits (\`HAS_SURVIVED\`, \`TENURED\`) statt eines Zählerfelds; \`PROMOTION_AGE = 2\`. Der ursprüngliche Plan (am 24.04.2026, vor jeder Implementierung) formulierte die Begründung klar: Mehr als 90 % der JS-Allokationen sterben in dem Scope, der sie erzeugt hat. Eine flache Arena verbringt daher ihr ganzes Leben damit, offensichtlich tote Objekte erneut zu markieren.

Der Plan nannte auch die Voraussetzung korrekt, und an dieser Entscheidung hängt alles Weitere in diesem Beitrag:

> **Ein generationeller GC braucht präzise Roots.**

Ein konservativer Scanner reicht für einen nicht verschiebenden Collector — ein False Positive hält lediglich ein totes Objekt einen Zyklus länger am Leben. Ein *verschiebender* Collector kann so nicht funktionieren: Wer die Roots nicht präzise aufzählen kann, kann sie nicht umschreiben; und wer sie nicht umschreiben kann, kann nichts verschieben.

### Roots: eine Analyse, zwei Lowerings und standardmäßig LLVM-Statepoints

LLVM darf Werte in Registern halten, sie neu materialisieren und an beliebige Stellen spillen — nichts davon kann der Collector introspektieren. Perrys Antwort besteht aus zwei Ebenen, deren Trennung uns peinlich lange beschäftigt hat.

Die **Analyse** — welche Locals GC-Pointer enthalten und an welchen Stellen sie lebendig bleiben müssen — ist backendunabhängig. Wie dieses Ergebnis in erzeugten Code **abgesenkt** wird, ist eine Wahl:

- *Shadow Stack.* \`js_shadow_frame_push(n)\` beim Eintritt, ein \`js_shadow_slot_bind\` pro Local auf JS-Ebene und \`js_shadow_frame_pop\` beim Verlassen. Der Collector durchläuft einen heapbasierten Frame.
- *Native Stack Maps über RS4GC.* Root-Allokas werden zu \`ptr addrspace(1)\`, Funktionen erhalten \`gc "statepoint-example"\`, und jedes Modul läuft durch \`opt -passes='function(mem2reg),rewrite-statepoints-for-gc'\`. LLVM fügt Statepoints, Relocations und die Umschreibung aller nachfolgenden Verwendungen selbst ein; zur Sammelzeit lesen wir die Roots aus einem kompakten \`__perry_gcmap\`-Abschnitt.

**Seit #7370 ist das Statepoint-Lowering Standard** — \`PERRY_RS4GC=1\` muss nicht mehr gesetzt werden; \`PERRY_RS4GC=0\` schaltet für eine Bisektion auf den Shadow Stack zurück. Die Wahl ist zielabhängig statt pauschal, weil \`gc_map\` die Ausgabe einer Map verweigert, wenn die Runtime die Frame-Basen eines Targets nicht auflösen kann (eine ungelesene Map verliert Roots lautlos). Die Regel lautet also: native Roots, wo die Runtime den Stack durchlaufen kann, Shadow Stack, wo sie es nicht kann. aarch64/arm64 und x86-64 bekommen Statepoints; watchOS \`arm64_32\` und ARM64 Windows behalten Shadow Frames. Fallback bedeutet nicht „keine Roots“, sondern das andere Lowering derselben Analyse.

Die Evidenz für den Wechsel ohne gesetzte Umgebungsvariable: die vollständige Gap-Suite mit 479 Tests bei **0 Regressionen und 0 Compile-Fehlern**, alle **128 Tests mit \`try\`** kompiliert (die Klasse, die die alte handgeschriebene Statepoint-Bridge nie verarbeiten konnte), alle 10 GC-Ratchet-Probes byteidentisch zu Node, Laufzeit −1–2 % (also geringfügig schneller), Binärgröße +1,86 % bei den 81 Modulen von zod.

Der eigentliche Vorteil gegenüber „wir erzeugen einen Shadow Stack“ sind nicht die 1–2 %. Ein Statepoint trägt **Relocation-Semantik, die der Optimierer respektieren muss**. Ein Shadow Stack ist nur so lange korrekt, wie der Optimierer nichts Schlaues mit einem Wert anstellt, den wir zu spillen vergessen haben. Die Belege für diesen Unterschied folgen in Teil 3.

Hinzu kommen **79 registrierte Runtime-Root-Scanner** für Zustand, der in der Runtime statt im User-Code lebt — ausstehende Promises, Timer-Callbacks, Exception-State, Async-Context-Stacks, Shape-Caches, die String-Intern-Tabelle und JSON-Scratch-Tabellen.

Außerdem existiert ein konservativer Scanner des nativen Stacks. Unser eigenes Architekturdokument beschreibt ihn als einen von drei gleichberechtigten Mechanismen; diese Prosa ist veraltet, und das beim Schreiben festzustellen war selbst lehrreich. In der ausgelieferten Produktionskonfiguration ergibt \`conservative_stack_scan_decision()\` den Wert \`SkipDisabled\` — die Liveness ruht vollständig auf der präzisen Root-Map (Statepoints beziehungsweise dem Shadow Frame auf Fallback-Targets) sowie \`RuntimeHandleScope\` in Runtime-Helpern. Der konservative Pfad bleibt für bestimmte Modi bestehen, insbesondere für das Sammeln am Allokationspunkt, nicht als Sicherheitsnetz unter dem präzisen Pfad.

### Write Barriers, verzögert scharfgeschaltet

Die generationelle Gefahr sind alt→jung-Pointer: Ein Minor GC, der nur die Nursery traced, muss von ihnen erfahren. Codegen erzeugt bei Pointer-Stores Aufrufe von \`js_write_barrier\`, und die Runtime verwaltet ein Remembered Set.

Die mit #7250 ausgelieferte Invariante zum Scharfschalten ist eines der am besten wiederverwendbaren Designelemente des Collectors:

> Solange die Barriere nicht scharf ist, zeichnet sie nichts auf. Im Gegenzug vertraut der erste *Lesezugriff* auf das Remembered Set eines Threads dem Log überhaupt nicht — er rekonstruiert die vollständige Menge aller alt→jung-Kanten aus dem Heap und schaltet die Barriere dabei scharf.

Das wird strukturell statt nur durch Konvention erzwungen: \`remembered_dirty_snapshot()\` ist \`pub(super)\` und hat sieben Aufrufstellen, alle innerhalb von \`gc/\`.

*(Hinweis für alle, die den Quellcode lesen: Perry hat zwei nicht zusammenhängende Dinge namens „die Barriere“ — die GC Write Barrier und eine Compile-Time-\`Ptr<Shape>\`-Promotion-Barrier im Representation-Selection-Pass. Drei verschiedene Issues haben Zeit gekostet, weil sie verwechselt wurden. Nennt immer die Datei.)*

---

## Teil 2 — Die Überraschungen

### 1. Die Fehlerklasse, die keine Spuren hinterlässt

Die Rooting-Invariante passt in einen Satz:

> Jeder GC-verwaltete Wert, der über einen möglichen Sammelpunkt hinweg lebendig ist, muss vor diesem Punkt über einen Root erreichbar sein. Ein Wert, der aus einem Root gelesen und über einen Aufruf hinweg in einem SSA-Register gehalten wird, **ist nicht gerootet** — er ist eine Kopie, und der Collector kann Kopien nicht sehen.

Ein Verstoß erzeugt die schlimmste Debugging-Erfahrung des Projekts. Zum Zeitpunkt der Collection gibt es für den Collector *nichts zu finden*: keine hängende Referenz, keinen nicht weitergeleiteten Slot, keinerlei Anomalie. Die Nursery recycelt anschließend die Adresse, der veraltete Pointer liest ein gültiges, aber anderes Objekt, und das Programm stirbt einen oder mehrere Zyklen später in einer anderen Funktion mit \`TypeError: value is not a function\`.

Jede unserer Runtime-GC-Probes ist dafür blind. From-Space-Scans melden sauber. Verifikationspässe melden sauber. \`PERRY_GC_VERIFY_EVACUATION\` prüft, ob erreichbare Slots weitergeleitet wurden — ein Register, von dessen Existenz es nichts weiß, kann es nicht prüfen.

Inzwischen haben wir fünf verschiedene Formen katalogisiert, die alle ausgeliefert wurden:

| # | Form | Warum sie Reviews überstand |
|---|---|---|
| #7184 | Root-Store an einem Slot-Index außerhalb des gepushten Frames | \`js_shadow_slot_bind\` prüft die Grenzen und tut lautlos nichts; im IR *sieht* es aus, als wäre der Wert gerootet |
| #7192 | Root-Store wird *nach* einem allokierenden Aufruf erzeugt | Der Slot ist am Ende sowohl gerootet **als auch** hängend — jede Prüfung „ist er gerootet?“ besteht |
| #7206 | Methoden-Receiver wird geladen, danach werden Argumentausdrücke abgesenkt (jeder kann allokieren), erst dann wird er benutzt | Für sich betrachtet sieht der Load offensichtlich korrekt aus |
| #7206 | \`base[key]\` — Base materialisieren, dann den Key-Ausdruck absenken, anschließend die veraltete Base verwenden | Zwei Operanden; einer wird zuerst ausgewertet und zuletzt verwendet |
| #7226/#7239 | Eine threadlokale oder statische Zelle cached einen Heap-Pointer, den kein Scanner umschreibt | Im IR überhaupt nicht sichtbar |

Vier davon wurden **an einem einzigen Tag** ausgeliefert. Die jeweilige Korrektur bestand aus wenigen Zeilen; teuer war stets die Verzögerung bis zur Entdeckung. Nur die erste Form ist Shadow-Stack-spezifisch. Die anderen sind unabhängig vom Lowering und überlebten den Umstieg auf Statepoints unverändert, weil der Fehler darin liegt, *wann das Lowering den Root erzeugt*, nicht darin, was ein Root ist.

Die einzige wirklich nützliche Heuristik: **Ein perfekt reproduzierbarer GC-Fehler bedeutet eine Tabelle, kein Register.** Ein nicht gerootetes Register wird nur dann ungültig, wenn eine Collection genau in sein Zeitfenster fällt, und ist daher intermittierend. Ein nicht gerooteter Cache wird bei Collection #0 ungültig und bleibt es. Es gibt genau eine bekannte Ausnahme, eine sechste Form, die kein Rooting der Welt lösen kann: ein \`&str\` oder \`&[u8]\`, das aus einem Heap-\`StringHeader\` entliehen und über einen allokierenden Aufruf gehalten wird. Rooting schreibt den *Slot* um; ein Borrow ist kein Slot. Die einzig korrekte Lösung ist, die Bytes vor der ersten Allokation aus dem Heap herauszukopieren.

### 2. Also hörten wir auf zu inspizieren und bauten Instrumente

Der Wendepunkt bei #7154 war keine Korrektur. Nach zehn Untersuchungsrunden gaben wir die Inspektion auf und bauten Werkzeuge, die den Fehler in einen sofortigen Fault verwandeln.

**From-Space-Quarantäne.** Nach einem evakuierenden Minor wird der From-Space nicht recycelt. Die ausrangierten Blöcke werden in einen begrenzten Ring ausgelagert, mit einem Poison-Wort gefüllt, dessen erstes Byte als ungültiger \`obj_type\` (\`0xDE\`) gelesen wird, und der seitenbündige Innenbereich wird mit \`mprotect(PROT_NONE)\` geschützt. Eine veraltete Dereferenzierung erzeugt jetzt *an der fehlerhaften Instruktion* einen SIGSEGV, während der Halter noch auf dem Stack liegt. Der installierte Reporter nennt Fault-Adresse, den Minor, der diese Seite ausrangiert hat, und das Objekt, das dort lebte; danach stellt er \`SIG_DFL\` wieder her und löst den Fault erneut aus, damit ein Debugger weiterhin die echte Stelle sieht.

**GC Zeal.** An jedem Safepoint wird ein evakuierender Minor erzwungen. So bewegt sich ein nicht gerooteter Wert bei seiner ersten Exposition, statt nur dann, wenn zufällig ein unabhängiger Allokationsschub in sein Zeitfenster fällt. Vorbilder sind V8s \`--stress-scavenge\` und SpiderMonkeys \`gcZeal\`.

**Ein Depth-Knob, mit dem niemand gerechnet hatte.** Die Quarantäne ist ein Ring aus *N* ausrangierten Seitenmengen, standardmäßig 4. Der \`new C(…)\`-Reproducer aus #7154 faultet weder bei Tiefe 4 noch bei 8 oder 100. Sein Constructor-Body kreuzt ungefähr 600 Back-Edge-Polls. Wenn der Return-Override das veraltete Register des Callers veröffentlicht, ist die referenzierte Seite bereits 600 Ausrangierungen alt. Mit \`PERRY_GC_PROTECT_FROMSPACE_DEPTH=800\` faultet er bei der ersten Verwendung. „Erhöhe die Tiefe“ ist jetzt unser erster Rat, wenn ein vermuteter Fehler sich nicht reproduzieren lässt.

Die Instrumente selbst werden **durch Sabotage getestet**, nicht nur ausgeführt: \`quarantine_catches_a_planted_stale_from_space_deref\` pflanzt die Form aus #7184/#7192 ein und verlangt, dass das Instrument Poison meldet, während die nicht instrumentierte Kontrolle ein vollkommen gültiges recyceltes Objekt liest. Diese Kontrolle ist entscheidend — sie zeigt, dass der Fehler ohne das Werkzeug tatsächlich unsichtbar ist.

Es gibt auch ein statisches Instrument: \`scripts/gc_root_dominance_check.py\` liest erzeugtes LLVM-IR und prüft, ob Root-Stores alle nachfolgenden Stellen dominieren, an denen gesammelt werden kann. Sein CI-Gate hat aktuell eine **leere** Allowlist bekannter verbleibender Treffer; jeder neue Treffer macht den Build rot. Strukturell blind ist es trotzdem für drei Klassen: Runtime-Tabellen, nicht gerootete Locals in Runtime-Rust und alles, was seine Symbolmengen nicht benennen. Wir schreiben das ausdrücklich dazu, weil ein sauberer Report zweimal als Beweis für etwas verstanden wurde, das er unmöglich geprüft haben konnte.

### 3. Die Hälfte unserer Knobs schaltete nichts

Diese Überraschung änderte eher unsere Engineering-Policy als unseren Code.

Monatelang setzte man \`PERRY_GEN_GC_EVACUATE\`, um zu beweisen, dass eine Änderung unter Evakuierung sicher war. Als wir den Knob endlich korrekt maßen — identische Binärdateien, derselbe Host, ein zellenweiser Diff über 12 Ratchet-Probes × 8 Counter — veränderte er **0 von 96 Zellen**. Die Mediane waren bitidentisch. Dasselbe Verfahren mit \`PERRY_GEN_GC=0\` bewegte 79 Zellen, der Harness war also empfindlich; nur dieser Knob war es nicht. Er schaltete einen Fallback-Pfad, aus dem die Counter niemals stammten.

Sein einziger lebender Effekt war eine Fußangel: Er verhinderte erzwungene Evakuierung. Ein in der Umgebung vorhandenes \`PERRY_GEN_GC_EVACUATE=0\` entschärfte daher lautlos \`PERRY_GC_ZEAL\` — das Instrument aus dem vorigen Abschnitt — und ein Zeal-Lauf konnte „sauber“ melden, obwohl er nichts bewegt hatte.

Er war nicht allein:

- \`PERRY_GC_FORCE_EVACUATE\` wurde **nur im Minor-Pfad** gelesen, während jeder Test, der ihn verwendete, die Collection über \`gc()\` anstieß; dort lief hinter einem erzwungenen konservativen Scan ein vollständiges Mark-Sweep. Monate von „besteht unter erzwungener Evakuierung“ bedeuteten nichts.
- Der \`--pressure\`-Knob der Stress-Matrix deaktivierte genau den Pfad, den er messen sollte — Defer-Hardcap und Arena-Trigger-Ceiling teilten eine Formel und kollabierten gemeinsam, sodass der \`default\`-Arm in allen 22 Zeilen null Copying Minors ausführte.
- \`PERRY_GC_FROMSPACE_SCAN_ABORT=1\` war allein vollständig wirkungslos: Der Scan lief nie, also brach nichts ab, und der Lauf meldete Erfolg. Wer mitten in einer Fehlersuche nach dem Abort-Schalter griff, erhielt einen grünen Lauf ohne Scan.
- Der Doc-Comment von \`gc_incremental_enabled\` sagte acht Zeilen über einem Body-Kommentar „EXPERIMENTAL — default OFF“, während dieser „DEFAULT ON“ behauptete. Eine Merge-Entscheidung beruhte auf dem falschen.

Die daraus entstandene Policy ist inzwischen in \`CLAUDE.md\` verbindlich:

> **Jeder GC-Env-Knob hat entweder einen verpflichtenden CI-Arm, der seinen OFF-Zustand ausübt, oder wird nach einem Release Einlaufzeit gelöscht.** Höchstens ein rein diagnostischer Knob darf gleichzeitig existieren, und er muss als ungetestet gekennzeichnet sein.
>
> **Ein Modus, der noch existiert, ist eine Entscheidung, die noch nicht getroffen wurde.**

\`PERRY_GEN_GC_EVACUATE\` wurde gelöscht, nicht repariert. An jeder Löschstelle blieb ein Tombstone-Kommentar zurück, der erklärt, was dort stand und warum es nicht mehr da ist — fünf Stück, genau an den Zeilen, an denen sonst jemand die Bedingung wieder einführen würde. Ein CI-Audit leitet die akzeptierten Knob-Namen aus nicht auskommentierten Produktions-Parsern ab und schlägt bei jeder lebenden Behauptung über einen gelöschten Knob fehl. Sein Selbsttest pflanzt einen gelöschten Knob hinter einem auskommentierten Parser und beweist, dass keiner von beiden passieren kann.

### 4. Gates, die nicht fehlschlagen können

\`CLAUDE.md\` listet vier Arten auf, wie ein CI-Gate strukturell unfähig sein kann, einen Merge rot zu machen. Alle vier haben dieses Repository getroffen, drei davon in einer Woche:

1. \`continue-on-error: true\` — \`gc-stress\` trug das monatelang, obwohl es als einziger Job GC-Korrektheit abdeckte.
2. Nicht in den erforderlichen Branch-Protection-Contexts — ein Job, der einen Fehler meldet, aber nicht blockiert, ist Dokumentation, kein Gate.
3. \`concurrency\` mit bedingungslosem \`cancel-in-progress\` — in einer langsamen Runner-Queue storniert jeder neue Merge den vorigen Lauf, bevor er einen Runner erreicht. Bei \`gc-ratchet\` wurden drei aufeinanderfolgende \`main\`-Läufe storniert und keiner ausgeführt.
4. **Das Gate läuft, aber sein Prüfgegenstand lief nie** — am gefährlichsten, weil der Job wirklich grün ist.

Dann fanden wir zwei weitere. \`gc-stress\` war auf \`main\` *noch nie gelaufen*: Der \`push:\`-Trigger des Workflows galt nur für Tags, und die \`if:\`-Bedingung des Jobs ließ \`schedule\` aus. 12 von 12 Nightlies meldeten ihn als \`skipped\`. Und \`lint\` — ein *erforderlicher* Context — war über mehr als drei Nightlies hinweg rot, weil 16 Dateien die Grenze von 2000 Zeilen überschritten hatten. Jeder Merge im Repository landete daher per Admin-Bypass. Branch Protection war Theater; ein korrekt gebautes neues Gate, das an \`lint\` hing, wäre bei Ankunft wirkungslos gewesen.

Die Folgerung, die wir immer wieder lernen: **Ein Gate muss beweisen, dass sein Prüfgegenstand lebendig war**, nicht nur, dass nichts eine Exception warf. Unsere Zeal-Läufe geben jetzt beim Beenden \`forced_collections=… copying_minors=… moved_objects=… loop_polls=…\` aus und **beenden sich mit Code 70, wenn einer davon null ist**. Ein Lauf, der nichts ausgeübt hat, ist damit rot statt grün.

### 5. Der Collector plante Collections, die ihm nicht helfen konnten

Ein wiederkehrender struktureller Fehler in drei unabhängigen Varianten, immer dieselbe Form: *Ein Prädikat plant eine Collection, die den vom Prädikat gelesenen Wert nicht verändern kann.*

**Die Übergabe bei Survivor-Promotion (#7592).** Ein Prädikat ersetzte einen Minor durch ein vollständiges Mark-Sweep, um in der alten Generation Platz für gleich zu promotende Survivors zu schaffen. Ein Full Mark-Sweep verschiebt jedoch nichts — es promotet nichts — und konnte daher den Druck, der es ausgelöst hatte, nicht lindern. Beim nächsten Minor war das Prädikat erneut wahr. Gemessen an einer JSON-Pipeline mit 200.000 Records: **19 von 22 Collections waren solche Fulls, jedes gab 0,0 MB bei ungefähr 400 ms frei.** 7,6 s einer 8,6-s-Phase. Der Copying Minor, der die eigentliche Promotion erledigt hätte, lief kein einziges Mal.

**Das Nursery-Cap (#7690).** Ein Cap basierte auf der From-Space-Belegung und wurde auf einen *nicht verschiebenden* Minor angewendet, der in place sweept und den From-Space belegt lässt. Ein gecappter Trigger, der einen nicht verschiebenden Minor auslöst, ist also beim nächsten Block sofort wieder fällig: eine Collection über die gesamte Arena pro 1 MB Allokation, quadratisch in der Live-Menge.

**Das live-proportionale Cap als Fixpunkt.** Ein Versuch, das Nursery-Cap mit der Live-Menge zu skalieren, verwendete \`max(base, arena_in_use)\`. Der Dueness-Test vergleicht jedoch die *From-Space-Belegung* mit dem Cap, und in diesem Workload gilt From-Space ≈ live. Der From-Space konnte sein eigenes Cap deshalb nie überschreiten; das Scavenging stoppte vollständig. Gemessen wurde ein 5,9×-Gewinn — dadurch, dass gar keine Arbeit mehr stattfand.

Zwei Regeln entstanden daraus; sie tragen unseren Pacing-Code:

> **Steuere eine Collection nie anhand einer Größe, die diese Collection nicht verändert.**
>
> **Kein konstantes Band darf einen Collector takten, dessen Kosten pro Zyklus O(live) sind** — die Gesamtarbeit wird quadratisch in der Live-Menge; eine größere Konstante verschiebt nur die Klippe.

Die Korrektur dieser Familie brachte einen JSON-Workload von **60,4 s auf 3,86 s**. Die Kosten pro Record blieben über einen Größenbereich von 20× innerhalb von rund 30 % flach, nachdem sie zuvor um 70× gewachsen waren.

### 6. Und einmal dokumentierte der Collector eine Änderung, die nie vorgenommen wurde

Die teuerste einzelne Zeile dieser ganzen Geschichte ist ein Doc-Comment.

#7690 schrieb das vollständige Argument dafür, verschiebende Loop-Back-Edge-Polls standardmäßig einzuschalten, in zwei Doc-Comments — einen in der Runtime, einen in Codegen — und **änderte keinen der beiden Bodies.** Beide akzeptierten weiterhin nur \`1|on|true\`, waren also standardmäßig AUS, und kein Test fixierte den Default in irgendeine Richtung. Der Runtime-Kommentar verlangte sogar, Codegens Spiegel „MUST agree“; beide stimmten tatsächlich überein, nur bei dem Wert, den die Dokumentation angeblich gerade geändert hatte.

Das ist nicht bloß eine langsamere Konfiguration, sondern ein anderer Collector. Nursery-Druck hat genau zwei präzise Collection Points: den Loop-Back-Edge-Poll und die äußerste Microtask-Pump-Grenze. Ohne erzeugten Poll erreicht ein rein rechnendes Programm keinen davon. Jede Nursery-Collection landete deshalb am Allokationspunkt, wo eine frühere Korrektur Collections zu Recht nicht verschiebend gemacht hatte. **Der ausgelieferte Collector evakuierte die Nursery überhaupt nicht** und fiel auf Full Collections über die gesamte Arena zurück.

| Benchmark | ausgeliefertes \`main\` | Polls tatsächlich an |
|---|--:|--:|
| tree | 5,10 s | **1,63 s** |
| tree_wide | 7,26 s | **2,12 s** |
| retain | 2,33 s | **1,32 s** |
| churn | 1,00 s | **0,46 s** |
| cycles | 0,29 s | **0,19 s** |

Ein Benchmark führte **13 Full Collections über die gesamte Arena aus (0,477 s Pause)**, während dasselbe Programm einige Wochen zuvor **105 Copying Minors (0,016 s)** ausgeführt hatte. Die gesamte GC-Pause von \`tree\` fiel von 4,107 s auf 0,550 s, die maximale Pause von 266 ms auf 16 ms.

Gefunden wurde das nicht über die Laufzeit, sondern über die *Arten* der Zyklen in \`PERRY_GC_TRACE=1\`: \`{'full': 13}\`, wo \`{'minor': 105}\` stehen sollte.

Drei Tests fixieren jetzt den Default, einschließlich des Arms für nicht erkannte Werte; ein weiterer fixiert die Übereinstimmung der beiden Crates. Eine Abweichung bleibt in beide Richtungen stumm — Polls, die nichts konsumiert, oder eine Deferral, die niemand abarbeitet — und braucht deshalb eine Assertion statt zweier Kommentare, die Übereinstimmung behaupten.

Diese Klasse ist noch nicht geschlossen. Eine Profiling-Runde fand diese Woche dieselbe Form in der Write Barrier: **Codegen erzeugt einen \`seq_cst\`-Load des Barrier-Active-Counters — auf aarch64 ein \`ldar\`, und \`evalNode\` hat 42 solcher Stellen — während die Runtime dasselbe Global für dieselbe Entscheidung mit \`Relaxed\` liest**. Codegens eigener Doc-Comment verspricht an dieser Stelle „one relaxed load of a \`static\`“. Zwei Leser eines Globals widersprechen sich über die erforderliche Ordering-Semantik, und die Dokumentation stellt sich gegen den Code. Höchstens einer kann recht haben; falls die Runtime falsch liegt, ist der Fehler viel ernster als das \`ldar\`. Wir haben ihn bewusst nur erfasst, nicht geraten und repariert: Ein falscher Guess kann eine Insertion Barrier verpassen. Das bleibt bei der Collection unsichtbar und erscheint Zyklen später als \`TypeError: value is not a function\`.

### 7. Die schnellste GC-Arbeit ist die, die man löscht

Nachdem die Pacing-Fehler beseitigt waren, stellte sich wiederholt heraus, dass die übrigen Kosten aus Arbeit bestanden, die nicht hätte existieren dürfen.

**Ein Heap, in dem nichts stirbt, wurde immer wieder markiert.** \`retain.ts\` baut ein Array aus 3 Millionen Records und verwirft keinen davon. Perry verbrachte **1,26 s eines 1,31-s-Laufs im Collector** — 96 %. Node schafft es in 0,13 s. Zwei Full Mark-Sweeps gewannen zusammen 4 MB zurück; eines davon veränderte die Arena-Belegung exakt um null. Ursache war ein Eskalationsprädikat auf Wachstum: Eine wachsende Live-Menge überschreitet bei jeder Verdopplung erneut eine Wachstumsschwelle. Die Korrektur bewertet ein Full danach, was es zurückgewinnt, und verschiebt den Schwellenwert nach rechts, wenn sich ein Full als unproduktiv erweist.

**Jedes evakuierte Objekt nahm einen prozessglobalen Mutex, um eine leere Map zu hashen.** Ein Move-Hook führte ein SipHash-\`remove\` gegen die verbliebene \`Object.setPrototypeOf\`-Registry aus, die in jedem Programm ohne Re-Prototyping leer ist. Ein entsprechender Latch existierte bereits; der Move-Hook war der eine Leser, der ihn ignorierte. Eine Promotion von 3 Millionen Records bezahlte 2,5 Millionen uncontended, aber reale Mutex-Akquisitionen für nichts.

**Dann hörten wir auf, die Objekte überhaupt zu verschieben.** Ist die Nursery eines Copying Minors praktisch vollständig lebendig, ist objektweise Evakuierung reiner Overhead: eine neue Old-Gen-Allokation, \`memcpy\`, Layout-Transfer, Accounting, Move-Hooks, Forwarding-Stub und das Umschreiben jedes referenzierenden Slots — nur um ein Objekt an einen Ort zu bringen, an den es nicht musste. Whole-Block-In-Place-Promotion (V8 nennt es Page Promotion) etikettiert stattdessen die Generation des Blocks um. Nichts bewegt sich, also muss nichts umgeschrieben werden:

| Workload | vorher | nachher |
|---|--:|--:|
| retain | 0,81 s | **0,53 s** |
| retain_wide | 1,33 s | **1,07 s** |
| deeplist | 0,30 s | **0,24 s** |
| Promotionskosten/Objekt | 243 ns | **105 ns** |

**Und dann hörten wir auf, sie auch nur zu tracen.** Selbst danach liefen noch drei getrennte Pässe über jeden Survivor: Der Dirty-Scan des Remembered Sets markierte ihn, der Drain berührte ihn erneut, \`clear_marks\` ein drittes Mal. In einem Zyklus, in dem sich nichts bewegt und nichts freigegeben werden kann, kostete das Tracing ungefähr 55–67 ns pro Objekt, der Walk der tatsächlichen Promotion aber rund 9 ns. Ein promotender Zyklus überspringt den Trace jetzt vollständig, wenn die zuletzt gemessene Survival Ratio im vollständig lebendigen Bereich liegt. Explizit verweigert er das, sobald eine seiner Annahmen Kosten verursacht: ein registrierter Weak-Target-Holder, eine nicht leere Malloc-Registry, ein laufender inkrementeller Mark oder eines der drei aktivierten Verify-Instrumente. Jedes davon verwendet den Trace als Prüfgegenstand; ein Zyklus ohne Marks ließe alle drei Erfolg melden, ohne etwas untersucht zu haben. Ergebnis: \`retain\` −33,6 %, \`deeplist\` −43 %, und promotende Zyklen, die früher 243 ns pro Objekt kosteten, benötigen jetzt **8,9 ns**.

Die Policy dahinter beruht auf einer *Messung*, nicht auf einer Vermutung. Block-Liveness ist vor dem Trace unbekannt. Die Entscheidung wird daher pro Zyklus aus der im vorigen Zyklus gemessenen Young-Survival-Ratio getroffen — und die Population erwies sich über drei Größenordnungen als bimodal:

| Workload-Familie | Copying Minors | Young-Survival-Ratio |
|---|--:|--:|
| retain, retain1, retain_wide, deeplist | 3–7 | 0,999 – 1,000 |
| churn, churn_alloc, push_cls | 105 | 0,000 – 0,004 |
| push_num, cycles | 16–18 | 0,000 |
| tree, tree_wide, churn_read | 0 | *es läuft überhaupt kein Copying Minor* |

Ein falsch vorhergesagter Zyklus hält höchstens einige Prozent einer Nursery zurück; ein promotender Zyklus traced weiterhin oft genug, um sich selbst zu messen; und ein laufendes Cap für promotete tote Bytes begrenzt den Steady State.

Außerdem muss man klar sagen: **Die Geschichte vom „einen Mechanismus“ stimmt meist nicht, und das eigene Profil verschiebt sich unter den Füßen.** Die heutigen Pause-Anteile, gemessen am selben Commit wie die Rangliste weiter unten:

| Programm | Wall | GC-Pause | Pause-Anteil | Zyklen |
|---|--:|--:|--:|--:|
| retain | 159,5 ms | 52,0 ms | 33 % | 5 |
| retain1 | 71,4 ms | 38,7 ms | 54 % | 3 |
| retain_wide | 206,2 ms | 75,4 ms | 37 % | 8 |
| shapes | 64,8 ms | 4,6 ms | **7 %** | 1 |
| asyncpipe | 127 ms | 0 ms | **0 %** | 0 |

Zwei dieser Zahlen lagen eine Woche zuvor bei 93 % und 62 %; die Arbeit dieses Abschnitts hat sie beseitigt. \`shapes\` ist bei 7 % überhaupt kein GC-Benchmark mehr — vor dem Fehler aus \`8 bestanden 94 ms eines 139-ms-Programms aus GC, und wir hatten ihn aufgrund dieses Verhältnisses als „High-Survival GC“ einsortiert. GC-Hebel werden ihn jetzt nicht bewegen. Ein gleichförmig wirkendes Verhältnis zwischen Benchmarks war ein arithmetischer Zufall, kein Beleg für eine gemeinsame Ursache.

### 7b. „Null Zyklen“ bedeutet nicht „keine GC-Kosten“ — ein Counter, den wir als Schlussfolgerung missverstanden

Die \`asyncpipe\`-Zeile meldet 0 ms Pause in 0 Zyklen. Intern beschrieben wir das als „reines Mutator-Programm; jeder GC-Hebel ist irrelevant“. Eine Profiling-Runde, die genau auf dieser Prämisse gebrieft wurde, widerlegte sie.

\`asyncpipe\` gibt nie eine \`[gc]\`-Zeile aus, und trotzdem sind **rund 33 % seines Leaf-Profils Collector-Mechanik** — Write Barriers, Layout-Side-Tables pro Objekt und \`RuntimeHandleScope\`-Rooting. Das Abschalten verschiebender Loop-Back-Edge-Polls misst **−14,1 %, obwohl das Programm weiterhin null GC-Zyklen ausführt**: Ein inkrementelles Mark/Sweep der alten Generation wird an diesen Polls vorangetrieben, beendet aber nie einen Zyklus und meldet daher keinen. Es war der größte einzelne Hebel der Runde, und die dem Profiler mitgegebene Prämisse zeigte von ihm weg. (\`PERRY_WRITE_BARRIERS=0\` ergibt hier +0,9 %, die Codegen-Barrieren sind also tatsächlich entlastet — nicht aber der inkrementelle Drive.)

> **Ein Zyklus-Counter misst Collections, nicht die Kosten des Collectors.**

Barrieren, Side-Table-Pflege, Rooting und inkrementelle Slices liegen auf der Mutator-Seite und sind für einen Trace pro Zyklus strukturell unsichtbar. \`0 cycles\` sieht wie eine Schlussfolgerung aus, ist aber nur eine Beobachtung über einen Mechanismus.

Die verwandte Falle derselben Runde: \`asyncpipe_big.ts\` ist **keine** gültig skalierte Version von \`asyncpipe\`. Bei 120 Batches läuft kein Zyklus, bei 240 zwei Copying Minors, bei 1200 dominiert der GC. Das Skalieren eines Workloads über den Timing-Noise-Floor erzeugte lautlos einen anderen Benchmark — dieselbe Form wie die gehaltlosen „realistischen“ Varianten in \`9. Aufgefallen ist es nur, weil jemand prüfte, ob die untersuchte Eigenschaft die Skalierung überlebt hatte.

### 8. Sechzehn Byte über einer Grenze

Der beste einzelne Fehler der Kampagne. Ein Benchmark namens \`shapes\` verbrachte 94 ms eines 139-ms-Laufs in zwei Minor Collections und meldete Young-Survival-Ratios von 739‰ und 925‰, obwohl sein tatsächlicher Live-Set ungefähr 3200 Objekte umfasste.

\`arena_alloc_gc\` erzeugt alles oberhalb von \`LARGE_OBJECT_THRESHOLD_BYTES\` (16 KB) direkt in der alten Generation und stempelt es mit \`TENURED\`. Der Backing Store eines \`Node2D[]\` mit 2000 Elementen ist 16.400 Byte groß. **Sechzehn Byte über der Grenze.**

Damit war das Array jeder Runde permanent lebendig (ein Minor sweept Old-Gen nie), die Write Barrier hatte für jeden seiner 2000 Stores zuverlässig eine alt→jung-Kante aufgezeichnet, und der Remembered-Set-Scan jedes folgenden Minors markierte alle 2000 erneut als lebendig — zunächst 94.000, dann 118.006 erneut markierte Slots.

Interessant ist die Korrektur, weil „Schwelle anheben“ falsch gewesen wäre. Das Überschreiten dieser Grenze tauscht *Kopierkosten* gegen *Retention-Kosten*. Bei einem pointerfreien Objekt sind beide dieselbe, durch die Objektgröße begrenzte Menge; dort bleibt es bei 16 KB. Bei einem pointertragenden Objekt ist die Retention transitiv und unbegrenzt. Arrays, Objekte und Closures erhalten daher 128 KB (V8s \`kMaxRegularHeapObjectSize\` zieht aus demselben Grund dieselbe Grenze). Die Auswahl liest das vorhandene \`pointer_free\`-Flag statt einer hartcodierten Typliste; ein unbekannter Typ behält den konservativen Wert.

\`shapes\` fiel in der Runde dieser Korrektur von 0,139 s auf 0,061 s — im abschließenden Sweep aus Teil 4 auf 0,058 s und damit 1,39× *schneller* als Node — während Peak RSS von 71,4 MB auf 32,3 MB sank. Jedes andere Programm im 19-Programme-Korpus bewegte sich innerhalb von ±1,3 %.

### 9. Messen war schwieriger als Reparieren

Eine unvollständige Liste von Dingen, die eine selbstbewusst falsche Schlussfolgerung erzeugten:

- **Wir benchmarkten gegen ein \`main\`, das selbst kaputt war.** Mehrere Tage lang waren allokationslastige Programme auf \`main\` ungefähr 20× langsam (Überraschung #6). Jede darauf basierende A/B-Messung war bedeutungslos. Die Signatur war lastunabhängig und eindeutig — Collection Count 105 → 1304 — und niemand sah hin, weil die Wall-Clock-Zahlen bloß *schlecht*, nicht absurd waren.
- **Der Auto-Optimize-Relink baut die Runtime mit \`--no-default-features\` neu**, wodurch das \`diagnostics\`-Feature lautlos entfällt. \`PERRY_GC_TRACE\` gibt nichts aus, und Zykluszahlen erscheinen als **0**. Eine Untersuchung folgerte für drei verschiedene Arme „null Collections“, bevor es auffiel.
- **Eine gepinnte Ratchet-Baseline von einem anderen Host und 30 Versionen zuvor** meldete 29 „Regressionen“, die reiner Drift waren. Beide A/B-Arme immer direkt nacheinander auf derselben Maschine messen.
- **Ein Pretenuring-Gewinn von 108 MB → 0 war ein Confound:** Der Base-Arm lag vor einer zwischenzeitlich gelandeten Änderung. Der Mechanismus war korrekt, aber das Ziel falsch (die bewegte Kohorte war ein von der Runtime allokierter Parse Tree, nicht die für Codegen sichtbaren Literale, die wir erreichen konnten), und das Maximum lag bei ungefähr 1 MB.
- **Wir haben wochenlang ein abstürzendes Programm gemessen.** Die Binärdatei eines Konkurrenten gibt für \`deeplist\` die richtige Antwort aus und beendet sich anschließend bei einem rekursiven Refcount-Drop mit −11 (SIGSEGV). Wir erfassten diese Spalte als Niederlage. Jeder Timing-Harness speichert jetzt den Exit-Code pro Zelle.
- **\`grep -c\` beendet sich bei null Treffern mit 1** und bricht dadurch \`&&\`-Ketten in Benchmark-Skripten lautlos ab. Dasselbe gilt für eine \`PERRY_GC_TRACE\`-Pipe, die beim Beenden per SIGPIPE Code 141 erhält.

Übrig blieben diese Regeln: Zitiere den Census-Counter, nicht die Uhr (Counter sind lastunabhängig); vergleiche die *Binärdateien*, bevor du Timings vergleichst; bestätige, dass der Vergleich tatsächlich etwas verglichen hat; und prüfe, ob der angeblich getestete Arm lebendig war.

---

## Teil 3 — Die zwei langen Wege

### Statepoints: nach vier Monaten und drei Voraussetzungen genommen

LLVMS \`gc.statepoint\` war schon beim ersten Prototyp offensichtlich der in puncto Korrektheit überlegene Mechanismus. Er liefert **Relocation-Semantik, die der Optimierer respektieren muss**; ein Shadow Stack bleibt nur korrekt, solange der Optimierer nichts Schlaues mit einem Wert tut, den man zu spillen vergessen hat. Interessant ist alles zwischen „offensichtlich besser“ und „standardmäßig ausgeliefert“, denn keine Verzögerung hatte mit Performance zu tun.

**Blockiert wurde er von Dingen, die nicht der GC waren.** Exceptions wurden zu \`setjmp\`/\`longjmp\` abgesenkt. Ein \`longjmp\` kann *über* ein \`gc.relocate\` springen, sodass der verschobene Pointer nie zurückgeschrieben wird. Unter RS4GC ist es noch schlimmer: \`mem2reg\` promotet die für die Korrektheit von setjmp nötigen volatile Allocas nicht; Roots in Try-Regionen gelangen deshalb nie in SSA und werden nie relocated. \`gc.statepoint\` hat genau dafür eine Invoke-Form. Der Weg zu Statepoints führte also durch das vollständige Löschen von Perrys setjmp-Exception-Lowering und dessen Ersatz durch invoke/landingpad (#7302/#7305), außerdem durch das Verschieben von LLVM in den Prozess (#7301), damit wir die Pass-Pipeline kontrollierten. Keines davon war ein GC-Ticket.

**Der verlockende Kompromiss war die Falle.** „Shadow Stack für \`try\`-Funktionen behalten“ stand zur Debatte und hätte zwei Root-Mechanismen für immer zementiert. Ebenso „Shadow Stack löschen, Statepoints behalten“ — was sich als gar nicht *ausdrückbar* erwies, weil Statepoints ein alternatives Lowering der Root-Set-Analyse des Shadow Stacks sind, kein unabhängiger Mechanismus. Erst das Aufteilen des Prädikats (#7340) ermöglichte sowohl einen Default pro Target als auch eine künftige Löschung. Zuvor erzeugten \`PERRY_SHADOW_STACK=0\` plus Statepoints eine Binärdatei **ohne präzise Roots**, ohne \`__perry_gcmap\`-Abschnitt, mit korrekter Ausgabe und ohne ein Merkmal, das sie von einem guten Build unterschied — bis eine Collection etwas Lebendiges freigab.

**Eines der beiden Backends musste sterben.** Eine Zeit lang trugen wir neben RS4GC eine explizite, handgeschriebene Statepoint-Bridge. Gleichwertig waren sie nie: Die Bridge konnte ein \`invoke\` nicht rooten und verweigerte Funktionen mit \`try\` vollständig. Zugleich diente sie RS4GC als lautloser Fallback — genau die ungetestete Konfiguration, die unsere Knob-Kill-Policy verhindern soll. Vor der Löschung maßen wir: **1574 Funktionen aus einer echten Drizzle-App und den Ratchet-Probes wurden sämtlich als RS4GC abgesenkt; keine fiel zurück.** Bridge, CFG-basierte Liveness-Analyse, Call-Parser, Emitter, das Enum \`PreciseRootBackend\` und der Knob \`PERRY_STATEPOINTS\` verschwanden gemeinsam. Ein Bail ist jetzt ein harter Fehler, der die Funktion nennt, statt ein Downgrade.

**Danach wurde der Default ohne Abdeckung ausgeliefert.** Native Roots waren auf jedem begehbaren Target monatelang Standard, während **neun Mechaniken des Root-Lowerings keine einzige Assertion gegen das tatsächlich von Perry erzeugte Lowering hatten**. Drei Tests, die wie Abdeckung aussahen, maßen überhaupt nichts: Sie verlangten, dass \`js_shadow_slot_bind\` *fehlte* — unter dem nativen Default gilt das für jedes Programm, gerootet oder nicht. Wieder Hazard 4, ausgerechnet im Systemteil, dessen Aufgabe es ist, Roots nicht lautlos zu verlieren. #7653 korrigierte das mit drei Blickwinkeln: IR vor \`opt\`, \`"gc-live"\`-Bundles nach RS4GC und der decodierte \`__perry_gcmap\`-Blob. Jeder sieht etwas, wofür der nächste blind ist. Der statische Root-Dominance-Checker hatte dasselbe Problem von der anderen Seite: Er verankerte sich an \`@js_shadow_slot_bind\`, also wurde sein Korpus mit \`PERRY_RS4GC=0\` kompiliert. Bis #7663 Statepoints lehrte, prüfte er ein Lowering, das wir nicht mehr ausliefern.

Aus dem Experiment entstand ein Designgesetz, bezahlt mit einem gemessenen negativen Ergebnis: **Root-Metadaten ohne Relocation-Semantik sind unter einem optimierenden Compiler unsound.** Ein kompaktes Metadatenschema pro Funktion lieferte 10–13× kleinere Maps und korrumpierte deterministisch eine zehnzeilige Churn-Schleife. Nicht die Map-Mechanik war falsch; der Mutator las From-Space über veraltete, aus dem Heap abgeleitete SSA-Werte, die nur eine Relocation korrigieren kann. Barrieren beschränken Memory Ordering, nicht Dataflow.

### Unboxing: in Arbeit und jetzt das Hauptereignis

Der andere lange Weg stammt aus Teil 1: die ungeboxte native Repräsentation kanonisch zu machen und NaN-Boxing zum polymorphen Fallback herabzustufen. Die Phasen 1 (skalare Locals), 2 (spezialisierte ABI), 3a/3b (Strings und \`Ptr<Shape>\`-Pointer-Locals) sowie 4a/4b (typisierter Heap: zuerst numerische Arrays, dann die Buchhaltung, die das boxed Layout unnötig bezahlte) sind gemergt.

Zwei Dinge müssen wir dazu ehrlich berichten.

**Eine Unterphase wurde bewertet und verworfen — und der Grund ist ein Kompliment an NaN-Boxing.** Ungeboxte *Objektfelder*, die ursprüngliche Überschrift von Phase 4b, wurden nach der Erkundung nicht implementiert. Ein \`number\`-Feldslot enthält bereits rohe IEEE-Bits, weil NaN-Boxing nur \`0x7FF9..=0x7FFF\` reserviert. \`raw_f64_mask\` im Layout ist daher ein *Proof-Bit*, keine Änderung des Speichers, und der Read-Side-Guard war schon verschwunden. Rohe String-Handles in Ruhe würden die Small-String-Optimierung brechen, indem kurze Strings grundlos im Heap materialisiert werden. Rohe \`i1\`-/\`i32\`-Slots bräuchten eine dritte Maske plus Layout-Probe an ungefähr 25 direkten Slot-Lesestellen, darunter \`JSON.stringify\`, \`util.inspect\` und \`v8\`-Serde — heiße Pfade, nicht die seltenen, von denen das Argument ausging. Stattdessen wurde Elision ausgeliefert: Ein Field-Store auf einen bewiesenen Receiver lässt seine Layout-Notiz wegfallen, wenn der Wert konstruktionsbedingt kein Pointer ist, und sein String-Addref, wenn der Wert kein Heap-String sein kann.

**Der GC gab der Kampagne das nächste Ziel.** Die Abschlussmessung in Teil 4 zeigt, dass der Collector im schwierigsten Cluster nicht mehr die bindende Beschränkung ist, sondern der Mutator — konkret: **Ein Objektliteral mit zwei Feldern belegt 72 Byte.** Das ist genau im Sinn des RFC ein Repräsentationsproblem. Dort geht es mit „echten Objekten“ als Nächstes weiter.

### Nicht eingeschlagene Wege

**Nebenläufigkeit.** Die direkte Vorgabe des Owners:

> „Ich will Parallelismus/Nebenläufigkeit nicht um ihrer selbst willen verfolgen. Sie sollten später ein Mittel für Arbeit sein, die stattfinden muss — aber nicht auf Kosten des Hot Path.“

Diese Einschränkung *entscheidet* das Design, statt es aufzuschieben. Die drei Familien unterscheiden sich genau darin, wo sie den Mutator belasten: Paralleles Stop-the-World kostet ihn nichts (GC-Threads leben nur während der Pause); Concurrent Marking verlangt während des Markierens eine Store Barrier bei jedem Pointer-Write; Concurrent Compaction verlangt eine **Load Barrier** bei jedem Pointer-Read. Loads sind viel häufiger als Stores, daher ist Letzteres das klarste Nein. Parallel STW ist das einzig zulässige Design und steht hinter (1) dem Löschen unnötiger Arbeit pro Objekt und (2) dem Pretenuring der unsterblichen Kohorte an dritter Stelle. 2,1 Millionen Objektbesuche zu parallelisieren, die nicht stattfinden sollten, heißt, mit vier Kernen schneller das Falsche zu tun.

Die Messung stimmte anschließend unabhängig und noch deutlicher zu. Nach der Arbeit aus \`7 teilten sich die Objektbesuche im schlimmsten Promotionsfall ungefähr zur Hälfte in Arbeit, die wir ganz löschten, und **9,6 ms eines 159-ms-Programms**. Es liegt nicht mehr genug Collector-Zeit auf dem Tisch, um Parallelisierung zu rechtfertigen — 2× auf die GC-Arbeit ergäbe 3 % für das Programm. Parallel GC ist kein aufgeschobener Plan; für diese Workload-Menge ist es ein gemessener Nicht-Hebel.

Hinzu kommt ein Korrektheitsargument, das wir ernster nehmen als das Performance-Argument: „Ein perfekt reproduzierbarer GC-Fehler bedeutet eine Tabelle, kein Register“ ist heute eine echte Diagnose. Ein paralleler Collector zerstört sie und macht 79 Root-Scanner sowie jeden \`thread_local!\`-Cache zu einem möglichen Data Race.

**Defragmentierung alter Seiten — standardmäßig eingeschaltet und am selben Tag zurückgenommen.** Das ist das frischeste und sauberste Beispiel für Regel 1.

Die Kompaktierung teilweise lebender alter Seiten war seit einem Fehler im Juli 2026 aus. Er reproduzierte eine veraltete Nicht-Heap-Referenz auf ein verschobenes altes Objekt (6/6 Korrumpierungen bei aktivierter Funktion). Die Reaktivierung wurde als *Rewrite-Contract-Projekt* verfolgt, nicht als Env-Flip. Das Tracking-Issue setzte seine eigene Abnahmebedingung: Jeden Metadata-/IC-/Cache-Pfad auflisten, der eine alte bewegliche Adresse halten kann, und **„Defrag erst wieder aktivieren, wenn Reproducer und ein Stress-Korpus auf Dependency-Skala sauber sind.“**

Die Contract-Arbeit landete und hält Audits stand: Die Allowlist der statischen Root-Dominance ist weiter leer; die ungefähr 40 früher ausgenommenen Treffer wurden also wirklich behoben statt erneut unterdrückt. Die Runtime-Holder-Policy wurde sogar *verschärft*, sodass \`open_gap\` und \`unverified\` jetzt vollständig fehlschlagen. Die zwei Caches, deren Sicherheit ausdrücklich auf „only old-gen defrag can move them“ beruhte, wurden repariert statt ausgenommen. Selbst ein Tripwire wurde beachtet: Die gelöschte Ausnahme trug eine \`becomes_real_when\`-Klausel, die genau diesen Trigger nannte.

Der **Default-Flip** wurde zusammen damit ausgeliefert, und genau dafür gab es keine Evidenz — weil unsere Suite strukturell keine erzeugen kann. Die Auswahl verlangt \`dead_bytes >= live_bytes\` auf einer alten Seite, also Promote-then-die in großem Maßstab. Die \`retain\`-Familie überlebt zu 999–1000‰, die \`churn\`-Familie promotet fast nichts; **kein eigener Benchmark kann eine Kandidatenseite erzeugen.** Die Suite liefert weder Nutzen- noch Regressionssignal, übernimmt aber die gesamte Rewrite-Oberfläche alter Adressen. Beim Merge standen außerdem alle GC-Gates noch in der Queue und waren unausgeführt.

Darum behielten wir die gesamte Korrektheitsarbeit und setzten den Default wieder auf Opt-in, bis ein Fragmentierungs-Workload existiert, der die Funktion tatsächlich ausübt. Dann wird der verlierende Arm gelöscht statt stehen gelassen. Die neue Regel:

> **Eine Funktion, die deine Benchmark-Suite nicht auslösen kann, kann sie auch nicht verteidigen.** Liefere sie standardmäßig ausgeschaltet aus, bis ein Workload sie ausüben kann — oder akzeptiere, dass beide Arme ungetestet sind.

**Pretenuring.** Zweimal gebaut, gemessen, widerlegt und mit einer schriftlichen Reopen-Bedingung geparkt. Die architektonisch richtige Lösung (langlebige Objekte direkt in Old-Gen erzeugen) verlor gegen die emergent ausreichende (ein Promote-on-first-copy-Seed begrenzt jede Kohorte auf einen Hop). Unter jeder konstruierbaren Last waren beide Arme ununterscheidbar. Die Meta-Lektion ging direkt in unsere Praxis ein: **Teste die unterscheidende Form, bevor du die Invariante baust.**

---

## Teil 4 — Der aktuelle Stand

Abschließender Sweep am 12.08.2026, ruhiger gepinnter M1 mini, best-of-5, Exit-Codes geprüft, Ausgabe vor dem Timing byteweise gegen \`node --experimental-strip-types\` verifiziert. 19 GC-geprägte Benchmarks gegen Node 26.5.1 und einen AOT-Konkurrenten mit Referenzzählung.

**Perry schlägt Node in 9 von 19** (zu Beginn der Runde waren es 3 von 19), **den Refcounting-Compiler in 14 von 19** und liegt **bei 15 von 19 innerhalb von 1,3× zu Node.**

| Benchmark | Perry | Node | P/Node | Δ diese Runde |
|---|--:|--:|--:|--:|
| churn_read | 0.023 | 0.089 | **0.25** | −0.9% |
| fib40 | 0.393 | 1.036 | **0.38** | −0.2% |
| deeplist | 0.057 | 0.096 | **0.59** | −44.1% |
| push_num | 0.070 | 0.117 | **0.60** | −0.6% |
| shapes | 0.058 | 0.081 | **0.72** | **−58.0%** |
| retain1 | 0.069 | 0.086 | **0.80** | −36.9% |
| retain_wide1 | 0.071 | 0.091 | **0.78** | −46.5% |
| push_cls | 0.117 | 0.141 | **0.83** | −50.0% |
| churn_alloc | 0.118 | 0.141 | **0.84** | −50.8% |
| tree | 0.453 | 0.452 | 1.00 | +0.1% |
| churn | 0.171 | 0.167 | 1.02 | −40.7% |
| tree_wide | 0.951 | 0.916 | 1.04 | +0.0% |
| cycles | 0.084 | 0.076 | 1.11 | −2.4% |
| retain | 0.156 | 0.137 | 1.15 | −42.1% |
| retain_wide | 0.202 | 0.157 | 1.28 | −45.7% |
| asyncpipe | 0.127 | 0.078 | 1.63 | −3.8% |
| pipeline | 0.175 | 0.097 | 1.80 | −33.7% |
| interp | 0.674 | 0.323 | 2.09 | −20.1% |
| iso_miss | 0.966 | 0.334 | 2.89 | −21.5% |

Übrig bleiben zwei **getrennte** Cluster. Sie als einen Mechanismus zu behandeln, ist ein Fehler, den wir schon einmal gemacht haben:

1. **Gegen Node — Dispatch und Mutator, größtenteils kein GC.** \`iso_miss\`, \`interp\`, \`pipeline\`, \`asyncpipe\`. Vor allem polymorpher Property-Dispatch, Inline Caches und Representation Selection — eine andere Kampagne. Lies aber die Korrektur weiter unten, bevor du \`asyncpipe\`s 0 % als „hier kein GC“ deutest.
2. **Gegen den Refcounting-Compiler — die \`retain\`-Familie.** \`retain1\` 1,80×, \`retain_wide1\` 1,67×, \`retain_wide\` 1,65×. Alle schlagen Node bereits. In diesen Zeilen stirbt nichts; genau dort erwarteten wir einen Tracing-Collector am schwächsten — und diese Erwartung ist auf interessante Weise falsch.

Die Erkenntnis des Abschlusssweeps ordnet die ganze Kampagne neu: **Im zweiten Cluster ist der Collector nicht mehr die bindende Beschränkung, sondern der Mutator.** Zieht man die *gesamte* GC-Pause ab, verlieren \`retain_wide\` (130,8 ms reiner Mutator) und \`shapes\` (60,2 ms) weiterhin. \`retain\` bräuchte exakt null GC, um Parität zu erreichen. Tatsächlich kostet uns, dass **ein Objektliteral mit zwei Feldern 72 Byte belegt**: \`retain\` schreibt **216 MB Speicher, um 48 MB Zahlen zu speichern** — 4,5× Write Amplification. Der Vorteil des Konkurrenten war in diesen Zeilen nie Referenzzählung, sondern Kompaktheit. Das ist jetzt ein Repräsentationsproblem (#7916), kein Collector-Problem: die Unbox-by-default-Kampagne aus Teil 1, auf Objekt-Layouts statt Skalare gerichtet.

Im anderen Cluster gibt es einen entsprechenden Defekt: \`asyncpipe\` sammelt mit 1200–1650 ns pro Objekt, darunter eine **122-ms-Minor-Collection für null Objekte** — länger als das ganze Programm. Kosten pro Zyklus unabhängig von der Objektzahl sind fixer Overhead, und er ist das letzte Stück des Collectors, das noch sichtbar auf dem Critical Path liegt (#7915).

Ein negatives Ergebnis halten wir fest, weil es der offensichtliche nächste Schritt und trotzdem falsch ist: **Verkleinere die erste Nursery nicht.** Zyklus 0 macht 58–81 % der GC-Pause in der \`retain\`-Familie aus. Ein Cap scheint daher kostenlos; bei 2 MB fällt \`retain\`s GC-Pause von 52 auf 31 ms. Aber \`asyncpipe\` springt von 0 auf 4 Collections, die in einem 127-ms-Programm 385 ms kosten, und die frühere Promotion taktet den Old-Gen-Trigger in zusätzliche Full Mark-Sweeps um (\`retain_wide1\` +182 %).

Zum Maßstab des Ausgangspunkts: Die JSON-Pipeline, die diese Kampagne eröffnete, ging von 60,4 s auf 3,86 s. Die \`retain\`-Familie verbesserte sich in einer einzigen Runde der oben beschriebenen Arbeit um 36–46 %. Der gesamte Collector besitzt weiterhin einen Kill Switch zu Full Mark-Sweep (\`PERRY_GEN_GC=0\`), den wir ausüben — denn an dem Tag, an dem wir nicht mehr gegen ihn bisecten können, können wir keiner dieser Zahlen mehr vertrauen.

---

## Die Regeln, nach denen wir jetzt arbeiten

Das meiste Gelernte gilt weit über Garbage Collection hinaus:

1. **Ein Modus, der noch existiert, ist eine Entscheidung, die noch nicht getroffen wurde.** Lösche den verlierenden Branch oder behalte einen Arm, der ihn ausübt. Hinterlasse an der Löschstelle einen Tombstone-Kommentar.
2. **Ein Gate muss beweisen, dass sein Prüfgegenstand lebendig war**, nicht nur, dass nichts warf. „Grün, weil nichts lief“ ist schlimmer als rot.
3. **Steuere einen Feedback-Loop nie anhand einer Größe, die er nicht verändern kann.** Drei getrennte Livelocks, eine Form.
4. **Kein konstantes Band darf einen O(live)-Prozess takten.** Eine größere Konstante verschiebt nur die Klippe.
5. **Wenn eine Fehlerklasse keine Spuren hinterlässt, höre auf zu untersuchen und baue das Instrument.** Teste es anschließend durch Sabotage — einschließlich der nicht instrumentierten Kontrolle, die beweist, dass der Fehler unsichtbar war.
6. **Ein Doc-Comment ist keine Änderung.** Fixiere Defaults mit Tests, einschließlich unbekannter Werte, und fixiere die Übereinstimmung aller Komponenten, die übereinstimmen müssen.
7. **Messe beide Arme auf einem Host, aus demselben Tree, und prüfe den Exit-Code.**
8. **Teste die unterscheidende Form, bevor du die Invariante baust.**
9. **Verweigere den permanenten Hybrid.** „Den alten Mechanismus für die schwierigen Fälle behalten“ ist der Weg, auf dem eine Migration für immer zu zwei Mechanismen wird. Bring den schwierigen Fall zum Laufen oder migriere nicht.

Der Collector ist nicht fertig. Zum ersten Mal ist er jedoch *lesbar*: Jeder Knob schaltet etwas, jedes Gate kann fehlschlagen, jeder Default ist durch einen Test fixiert, und jede veröffentlichte Zahl wurde auf einer ruhigen Maschine gemessen, nachdem die Ausgabe geprüft war. Diese Lesbarkeit hat mehr Arbeit gekostet als der Collector selbst — und nur ihretwegen haben sich die Zahlen des letzten Monats bewegt.
`;

export default function Content() {
  return <BlogMarkdownContent markdown={markdown} />;
}
