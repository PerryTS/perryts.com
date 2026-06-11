export default function Content() {
  return (
    <>
      <p>
        Vor ein paar Wochen veröffentlichte <a href="https://zenn.dev/aya_koto" className="text-amber-400 hover:text-amber-300">Ayasaka-Koto</a> (@axt_ayakoto auf X) <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">ein Benchmark von Perry gegen Deno und Bun</a> beim AtCoder-Problem ABC451D, &bdquo;Concat Power of 2&ldquo;. Seine Messung: Perry lief <strong>3,85× langsamer als Bun</strong>. Sein Fazit war höflich, aber bestimmt — Perry war noch nicht bereit, eine Runtime für Competitive Programming zu sein, und würde es vielleicht auch im reifen Zustand nicht sein.
      </p>
      <p>
        Wir schulden ihm ein Follow-up. Hier sind wir beim gleichen Benchmark gelandet, mit dem gleichen <code>hyperfine</code>-Befehl, auf der gleichen Maschinenklasse:
      </p>
      <pre><code>{`Command                                Mean         Min      Max
Perry v0.5.875                         425.0 ± 78 ms  367 ms  745 ms
Bun 1.3.12                             430.7 ± 74 ms  376 ms  787 ms
Deno 2.7.14                            544.8 ± 140 ms 426 ms  984 ms

Perry vs Bun:   1.01× faster (statistical tie, within error)
Perry vs Deno:  1.28× faster
Perry vs aya_koto's published Perry number: 2.87× faster`}</code></pre>
      <p>
        Das Schließen dieser Lücke erforderte eine Untersuchung, die mit einer falschen Hypothese begann, einen echten, aber bewussten GC-Architektur-Kompromiss fand und ein Ergebnis lieferte, über das zu schreiben sich unserer Meinung nach lohnt — nicht weil wir aufgeholt haben, sondern weil die Art, wie der Kompromiss unter dem Profiler aussah, an sich interessant ist.
      </p>

      <h2>Das Benchmark</h2>
      <p>
        aya_kotos <code>abc451d-perry.ts</code> macht eine rekursive Tiefensuche über Konkatenationen von Zweierpotenz-Strings, dedupliziert durch ein <code>Set&lt;number&gt;</code> und sortiert. Die heiße Funktion ist kurz:
      </p>
      <pre><code>{`function search(before: string, powersOfTwoStr: string[]): string[] {
    const answers: string[] = [];
    if (before.length > 0) answers.push(before);
    const remainDigits = 9 - before.length;
    for (let i = 0; i < powersOfTwoStr.length; i++) {
        const after = powersOfTwoStr[i];
        if (after.length > remainDigits) break;
        const child = search(before + after, powersOfTwoStr);
        for (let j = 0; j < child.length; j++) answers.push(child[j]);
    }
    return answers;
}`}</code></pre>
      <p>
        Die Form ist die Geschichte. Jeder Aufruf alloziert ein frisches <code>string[]</code>. Die Rekursion ist tief — Verzweigungsfaktor von bis zu etwa 30 an der Spitze — und jeder Eltern-Frame hält sein <code>answers</code>-Array am Leben, während er das Array des Kindes iteriert und auf sein eigenes pusht. Kurzlebige Allokationen, tiefe Rekursion, Live-Referenzen über jeden aktiven Arena-Block verstreut. Das stellte sich als genau die Workload heraus, gegen die Perrys GC <em>nicht</em> abgestimmt war.
      </p>

      <h2>Die falsche Hypothese</h2>
      <p>
        Ein Leser hatte eine Fußnote unter aya_kotos Artikel hinterlassen, die darauf hinwies, dass Perrys BigInt intern ein 1024-Bit-Integer fester Länge war und dass BigInt-lastige Programme etwa 4× langsamer als Bun liefen. ABC451D involviert Zweierpotenzen — große Zahlen schienen plausibel — und so war der erste Instinkt: BigInt ist der Übeltäter, fixe den BigInt-Pfad, die Lücke schließt sich.
      </p>
      <p>
        War es nicht. <code>grep -i bigint abc451d-perry.ts</code> lieferte nichts. Das Benchmark benutzt durchgehend <code>number</code>; jeder Wert passt bequem unter 2^53. Die BigInt-Fußnote war korrekt, real und ein Problem, das zu fixen sich lohnte — und wir haben es gefixt, separat, in v0.5.736. Aber es hatte nichts mit ABC451D zu tun.
      </p>
      <p>
        Die Kosten dafür, zuerst der falschen Hypothese nachzujagen, betrugen etwa einen Tag. Die Lektion — von der ich behaupten möchte, dass wir sie schon kannten — war: Profile, bevor du dich auf eine Theorie festlegst, selbst wenn die Theorie aus einer glaubwürdigen Quelle stammt und zu deinen Vorannahmen passt. Gerade dann.
      </p>

      <h2>Das Benchmark reproduzieren</h2>
      <p>
        Das Erste, was wir taten, nachdem wir aufgehört hatten, BigInt nachzujagen, war, aya_kotos Zahlen sauber zu reproduzieren. Wir erwarteten, nahe seinen 1,219 s auf Perry zu landen. Wir landeten bei <strong>2,998 s</strong> auf Perry v0.5.729.
      </p>
      <p>
        Das ist eine 2,5×-Regression zwischen der Version, die er getestet hat, und unserem damals aktuellen main. Deno und Bun reproduzierten innerhalb von 50 % seiner Zahlen (andere Hardware, Versions-Drift). Die Perry-Lücke war von 3,85× auf 6,59× gewachsen, während niemand hinsah.
      </p>
      <p>
        Wir haben nicht per Bisect bestimmt, welcher Commit die Regression verursacht hat — das ging über diese Untersuchung hinaus. Aber das Fehlen einer CI-Schutzplanke, die den Drift gefangen hätte, ist selbst ein Befund, und darauf kommen wir am Ende zurück.
      </p>

      <h2>Profilgesteuerte Diagnose</h2>
      <p>
        Kompiliert mit <code>PERRY_DEBUG_SYMBOLS=1</code> und aufgezeichnet mit <code>samply</code>, war das Self-Time-Bild eindeutig:
      </p>
      <pre><code>{`% Self    Function
41.2%     perry_runtime::gc::try_mark_value
12.7%     perry_runtime::gc::drain_trace_worklist_inner
 9.0%     perry_runtime::gc::build_valid_pointer_set
 8.5%     perry_runtime::arena::arena_walk_objects_with_block_index
 5.6%     perry_runtime::gc::try_mark_value_or_raw
 4.2%     js_number_coerce
 3.1%     js_array_sort_with_comparator`}</code></pre>
      <p>
        <strong>76 % der Self-Time war GC-Maschinerie.</strong> Die Inclusive-Time stimmte zu: <code>gc_collect_minor</code> bei 80 %, <code>Arena::alloc</code> bei 76 %, <code>js_array_alloc</code> bei 45 %, <code>js_array_push_f64</code> bei 22 %. Das rekursive <code>search()</code> war heiß, aber es war heiß unterhalb der GC-Mark-Phase. Jeder Aufruf löste genug Allokation aus, um eine Collection auszulösen.
      </p>
      <p>
        Ein Negativ-Kontroll-Microbenchmark bestätigte, dass die Verlangsamung nicht allgemein war. Enges Integer-<code>fib(80) × 100_000</code>, keine Allokation: Perry <strong>6,1 ms</strong> vs Bun <strong>24,7 ms</strong> — Perry 4× schneller. Codegen für nicht-allozierende heiße Schleifen war Bun bereits voraus. Die Lücke von ABC451D war auf einen spezifischen Code-Pfad konzentriert: Allokations-Durchsatz plus GC-Mark-Sweep auf dieser speziellen Allokationsform.
      </p>

      <h2>Das Smoking Gun</h2>
      <p>
        Wir hatten ein Flag — <code>PERRY_GC_DIAG=1</code> — das pro Zyklus GC-Statistiken ausgab. Die Ausgabe war die tragende Beobachtung der gesamten Untersuchung:
      </p>
      <pre><code>{`[gc-step] pre_in_use=67 MB  post_in_use=67 MB  sweep_freed=38 MB  block_reclaim=0  pct=57%
[gc-step] pre_in_use=100 MB post_in_use=100 MB sweep_freed=55 MB  block_reclaim=0  pct=55%
[gc-step] pre_in_use=119 MB post_in_use=119 MB sweep_freed=65 MB  block_reclaim=0  pct=55%
…
arena blocks: 61 → 84 → 100 → 116 → 131 → 145 → 157 → … → 270+`}</code></pre>
      <p>
        Jeder Zyklus, dasselbe Muster. Der Sweep identifizierte korrekt, dass <strong>55–60 % der allozierten Objekte tot waren</strong>. Und die Arena gewann <strong>null Blöcke</strong> zurück. Der Heap wuchs während des Laufs monoton, während der GC weiter Mark-Sweep-Kosten über ein immer größeres Working Set zahlte.
      </p>
      <p>
        Warum <code>block_reclaim=0</code>, obwohl mehr als die Hälfte der Objekte tot war? Weil Perrys Arena-GC auf Block-Granularität zurückgewinnt. Ein 1-MB-Block wird nur zurückgesetzt, wenn jedes Objekt darin tot ist. In ABC451D hält das rekursive <code>search()</code> Live-Referenzen — das <code>answers</code>-Array des Eltern-Frames — über jeden aktiven Block verstreut. Kein Block ist jemals vollständig tot. Der Mark-Sweep identifiziert die toten Objekte korrekt, hat keinen Per-Objekt-Reclaim-Pfad und tut deshalb nichts mit ihnen. Der Heap wächst, die GC-Trigger feuern auf einem Laufband, und die Kosten jedes Zyklus steigen, wie das Working Set steigt.
      </p>

      <h2>Der bewusste Kompromiss</h2>
      <p>
        Das Aufschlussreichste, was wir fanden, war nicht im Profil. Es war im Sweep selbst, bei <code>crates/perry-runtime/src/gc.rs:2733</code>, als ein Kommentar, der das Design erklärte:
      </p>
      <blockquote className="border-l-4 border-amber-500/40 pl-4 my-6 text-slate-400 italic">
        Wir pushen bewusst KEINE toten Objekte auf die globale ARENA_FREE_LIST. Der Inline-Bump-Allocator liest die Free-List nie — er nutzt stattdessen das Per-Block-Reset. Tote Objekte auf die Free-List zu pushen würde ~50ns pro Objekt × ~700k Objekte pro GC × ~12 GC-Zyklen pro Benchmark = 420ms reine Verschwendung in <code>object_create</code> kosten.
      </blockquote>
      <p>
        Das ist genau richtig für die Workload, gegen die es abgestimmt wurde. <code>object_create</code> ist ein Benchmark, der uns wichtig ist, wo Allokationen in einer engen Schleife sterben und ganze Blöcke zwischen Zyklen leer werden. Einen Per-Objekt-Free-List-Pass hinzuzufügen würde 420 ms sinnloser Buchführung für diese Workload verbrennen, und der Block-Reset-Pfad erfasst denselben Speicher günstiger.
      </p>
      <p>
        Es passt schlecht zu ABC451Ds Form, wo die Live-Referenzen verstreut bleiben und das Block-Reset nie feuert. Die Architektur hatte einen bewussten Kompromiss eincodiert, und wir hatten nie den Fall gebenchmarkt, in dem der Kompromiss in die falsche Richtung läuft.
      </p>
      <p>
        Das ist die eigentliche Lektion. Der GC war nicht kaputt. Er war auf eine andere Verteilung von Allokationsmustern abgestimmt als das, was aya_kotos Benchmark repräsentiert, und wir hatten nicht bemerkt, dass die Verteilung, auf die er abgestimmt war, eine Klasse echter Workloads ausschloss — rekursive Suche, Baum-Walks, alles, was Live-State auf jeder Ebene des Stacks hält, während es darunter kurzlebige Allokation betreibt.
      </p>

      <h2>Dinge, die nicht funktionierten</h2>
      <p>
        Bevor wir zu einem echten Fix kamen, stellten sich mehrere plausibel aussehende Hebel als die falschen Hebel heraus. Wir berichten sie mit Zahlen, weil sie die interessantere Hälfte der Untersuchung waren:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong><code>PERRY_GEN_GC_EVACUATE=1</code></strong> — Perry hatte bereits einen optionalen Copying-Evacuation-Pass. Ihn für ABC451D einzuschalten: <strong>11,4 Sekunden</strong>, viermal langsamer als die Baseline. Der Pass läuft jeden Zyklus, ob nützlich oder nicht, und seine Per-Objekt-Copy plus Reference-Rewrite-Kosten sind katastrophal, wenn das Live-Set kleine kurzlebige Objekte sind. Wert, für die Workloads behalten zu werden, die davon profitieren, aber nicht die Antwort hier.</li>
        <li><strong><code>PERRY_GEN_GC=0</code></strong> (voller Mark-Sweep statt generationell) — 3,06 s, im Wesentlichen identisch zur Baseline. Die Wahl der Strategie ist nicht das Bindende; das Fehlen des Per-Objekt-Reclaim ist es.</li>
        <li><strong><code>ValidPointerSet</code>-Strukturbereinigung (Commit 0fa42e0b).</strong> Die zwei separaten sortierten Vektoren (Arena-Pointer und malloc&apos;te Pointer) zu einem zusammengeführt, einen Min/Max-Range-Prefilter hinzugefügt, <code>try_mark_value</code>s Tag-Rejection geinlined. Halbierte die Per-Call-Kosten von <code>contains()</code> — was die heiße innere Schleife war, die das Profil markiert hatte. Das ABC451D-Benchmark bewegte sich von 3,07 s auf 3,21 s. Ein Nullsummenspiel, innerhalb des Rauschens. Die Änderung liefert weiterhin Wert für Workloads, in denen <code>contains()</code> tatsächlich die bindende Beschränkung ist (ECS-förmige Benchmarks, hono-Compose-Chains), aber sie war hier nicht die bindende Beschränkung. Das absolute Call-Volumen — getrieben vom Allokationsdruck, der die Mark-Phase speist — dominierte selbst bei Per-Call-Kosten von null.</li>
      </ul>
      <p>
        Das Muster über alle drei: Die GC-Strategie und die Per-Call-Inner-Loop-Kosten waren zweitrangig. Die bindende Beschränkung war das Fehlen eines Reclaim-Pfads für tote Objekte in Blöcken, die nicht vollständig leer werden. Bis das adressiert war, bewegte nichts anderes die Nadel.
      </p>

      <h2>Wo wir gelandet sind</h2>
      <p>
        Zwischen v0.5.737 und v0.5.875, über etwa 137 Patch-Versionen, schloss sich die Lücke. Wir sind bewusst beim Schreiben dieses Textes: Wir haben nicht per Bisect zu einem einzelnen Helden-Commit gefunden. Der Fix landete über eine Reihe von Änderungen im GC-Subsystem, die den bewussten &bdquo;keine Per-Objekt-Free-List&ldquo;-Kompromiss bedingt statt permanent machten — wenn <code>block_reclaim</code> über aufeinanderfolgende Zyklen bei null bleibt, beginnt der Sweep eine größen-gebucketete Free-List zu befüllen und der Bump-Allocator gewinnt einen Fallback-Pfad. Die genaue Reihenfolge und welcher Patch wie viel beitrug, würde ein sorgfältiges Bisect erfordern, das wir schulden, aber noch nicht gemacht haben.
      </p>
      <p>
        Das Ergebnis, auf aya_kotos exaktem Benchmark und Befehl, auf Apple M-Serie, macOS 26.4:
      </p>
      <pre><code>{`Perry v0.5.875: 425.0 ± 78 ms  (367 – 745)
Bun 1.3.12:     430.7 ± 74 ms  (376 – 787)
Deno 2.7.14:    544.8 ± 140 ms (426 – 984)`}</code></pre>
      <p>
        Zwei Ehrlichkeits-Anmerkungen zu dieser Tabelle. Erstens, Perrys 1,01×-Vorsprung über Bun liegt innerhalb der Fehlerbalken — das korrekte Wort ist &bdquo;gleichauf&ldquo;, nicht &bdquo;schneller&ldquo;. Zweitens, die Varianz auf allen drei Runtimes ist signifikant (Perrys Max ist 745 ms gegen einen Mittelwert von 425 ms), und jeder einzelne Lauf kann in einem der beiden Enden landen. Wir haben aus diesem Grund Min und Max neben dem Mittelwert gezeigt; wir möchten lieber, dass du die Streuung siehst.
      </p>

      <h2>Was noch unvollkommen ist</h2>
      <p>
        Ein paar Dinge, die wir nicht beschönigen:
      </p>
      <p>
        Die Regression von 1,2 s auf 3,0 s, die zwischen aya_kotos Messung und dem Beginn dieser Untersuchung passierte, sagt uns, dass wir keine CI-Schutzplanke hatten, die diese Klasse von Verlangsamung fing. Wir fügen <code>abc451d-perry.ts</code> und eine kleine umgebende Suite zu Perrys CI als Perf-Regression-Gate hinzu, bevor dieser Beitrag live geht. Wenn dieses Benchmark in einem zukünftigen Release stillschweigend degradiert, sollte es einen Build scheitern lassen, nicht ein Benchmark von einem Kritiker in drei Monaten.
      </p>
      <p>
        Der Fix lockert einen bewussten Kompromiss in eine bestimmte Richtung. Wir beobachten das <code>object_create</code>-Benchmark und Freunde — Workloads, die die ursprüngliche &bdquo;keine Free-List&ldquo;-Wahl schützte — um sicherzustellen, dass der bedingte Free-List-Pfad sie nicht regrediert. Frühe Zahlen liegen innerhalb des Rauschens, aber das ist die Art von Sache, bei der Vertrauen aus Zeit kommt, nicht aus einem einzelnen Benchmark-Lauf.
      </p>
      <p>
        Wir haben den 137-Versionen-Bereich nicht per Bisect untersucht. Wir werden es. Es ist wichtig für die Dokumentation, und es ist wichtig, um zu verstehen, welche der Conditional-Free-List-Mechanismen die Arbeit leisten.
      </p>

      <h2>Dank</h2>
      <p>
        aya_kotos Artikel war genau die Art von Writeup, die ein Open-Source-Projekt braucht und selten bekommt. Er maß sorgfältig, veröffentlichte sein Test-Repo, benannte spezifische Reibung im Installationspfad und gelangte zu der ehrlichen Schlussfolgerung, dass Perry für den Anwendungsfall, den er evaluierte, nicht bereit war. Diese Schlussfolgerung war korrekt, als er sie machte. Sie wäre länger korrekt geblieben, wenn er nicht darüber geschrieben hätte.
      </p>
      <p>
        Sein Test-Repo ist unter <a href="https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421" className="text-amber-400 hover:text-amber-300">github.com/AXT-AyaKoto/perry-ts-test-2026-0421</a>. Sein Artikel ist unter <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">zenn.dev/aya_koto/articles/553ce04b1d5ac4</a>. Beide sind selbst nach diesem Follow-up lesenswert — besonders der Artikel, weil er eine ehrliche Evaluation eines Compilers im Frühstadium von jemandem dokumentiert, der keinen Anreiz hat, höflich zu sein.
      </p>
      <p>
        Zwei spezifische Dinge in seinem Artikel sollten wir festhalten. Die Installationspfad-Reibung, die er markierte — dass die Spitze von perryts.com auf eine Methode zeigte, während die Docs eine andere empfahlen — ist gefixt; der npm-Pfad ist jetzt die prominente Option auf der Landing-Page, passend zu den Docs. Die &bdquo;Dinge außerhalb des Limitations-Docs, die nicht kompilieren&ldquo;-Frustration, die er markierte — wir sind jede <code>.ts</code>-Datei in seinem Test-Repo gegen das aktuelle Perry durchgegangen; die echten Lücken bekamen Issues angelegt, und die dokumentierten Limitationen wurden erweitert.
      </p>
      <p>
        Die BigInt-Fußnote unter seinem Artikel war, wie oben besprochen, nicht mit ABC451D verbunden, aber für sich genommen real — Perrys BigInt-Implementierung war tatsächlich ein 1024-Bit-Integer fester Breite unter der Haube, und BigInt-lastige Programme zahlten dafür. Das ist in v0.5.736 gefixt, mit einem Small-Value-Inline-Pfad und <code>num-bigint</code> als Arbitrary-Precision-Fallback. Der Dank dafür gebührt dem Leser, der die Fußnote unter aya_kotos Artikel hinterließ; wir wissen nicht, wer er ist, aber falls du das liest: danke.
      </p>

      <h2>Reproduktion</h2>
      <p>
        Falls du diese Zahlen selbst reproduzieren möchtest:
      </p>
      <pre><code>{`git clone https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421.git /tmp/aya-koto-bench
cd /tmp/aya-koto-bench

npm install -g @perryts/perry@0.5.875
perry abc451d-perry.ts -o abc451d-perry

# Sanity (should print 328 for input 69):
./abc451d-perry < abc451d-input.txt

# The article's exact command:
hyperfine --warmup 10 --runs 100 --export-markdown abc451d-bench.md \\
  './abc451d-perry < abc451d-input.txt' \\
  'deno run --quiet --allow-all abc451d-deno.ts < abc451d-input.txt' \\
  'bun run abc451d-bun.ts < abc451d-input.txt'`}</code></pre>
      <p>
        Deine Zahlen variieren mit Hardware und Runtime-Versionen. Falls sie auf eine Weise variieren, die falsch aussieht, <a href="https://github.com/PerryTS/perry/issues" className="text-amber-400 hover:text-amber-300">öffne ein Issue</a> — wir hören lieber davon.
      </p>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
