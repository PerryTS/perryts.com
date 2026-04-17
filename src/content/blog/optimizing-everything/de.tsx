export default function Content() {
  return (
    <>
      <p>
        Der letzte Blog-Beitrag erschien mit Perry v0.5.12. Heute sind wir bei v0.5.80. Das sind <strong>68 Patch-Releases in sieben Tagen</strong>, fast vollständig auf eine Sache fokussiert: jeden verbliebenen Slow Path in einen Fast Path zu verwandeln.
      </p>
      <p>
        Die LLVM-Umstellung in v0.5.0 hatte bis v0.5.12 wieder Parität mit Cranelift erreicht. Das war das Ende einer Geschichte und der Anfang einer anderen. LLVM sieht jetzt alles. Die Frage lautete nicht mehr &ldquo;warum ist das langsam?&rdquo;, sondern &ldquo;warum ist das nicht schon schnell?&rdquo; — und das ist eine sehr viel handhabbarere Frage.
      </p>
      <p>
        Dieser Beitrag ist eine Tour durch die Woche. JSON bekam einen 547x-Speedup. mimalloc wurde zum globalen Allocator. Property-Zugriff bekam einen monomorphen Inline Cache. Buffer bekamen typisierte Pointer-Slots mit <code>noalias</code>-Metadaten. Fastify- und WebSocket-Server hörten auf, nach einer Minute abzustürzen. Und die Benchmarks bewegten sich erneut.
      </p>

      <h2>1. JSON: 547x Rückstand aufholen</h2>
      <p>
        Bei v0.5.29 war Perrys JSON.parse auf einem 20-Record-Array <strong>547x langsamer als Node</strong>. Bei v0.5.46 waren es 1,3x. Diese Zahl ist das größte Einzel-Delta der Woche, und es lohnt sich, sie durchzugehen, weil jede andere Optimierung in diesem Beitrag eine Variation desselben Themas ist: mache keine Arbeit, die du nicht machen musst.
      </p>
      <p>
        Der ursprüngliche Parser allozierte einen Vec pro Property, einen Vec von Keys pro Objekt und ein RefCell-geschütztes Thread-Local für den Key-Cache. Er kopierte jeden String. Er hashte jeden Feldnamen erneut. Er baute für jeden Record eine brandneue Object-Shape, selbst wenn alle 20 Records exakt dieselben Felder in exakt derselben Reihenfolge hatten. Nodes Parser handhabt das, indem er das Muster erkennt und eine einzige Shape über alle Records hinweg teilt. Perrys tat das nicht.
      </p>
      <p>Der Fix kam in vier Schritten:</p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Key-Interning via einem Thread-Local <code>PARSE_KEY_CACHE</code></strong> (v0.5.45). Der erste Record alloziert N Key-Strings; Records 2 bis 20 allozieren null. Wiederholte Keys lösen sich zum selben Pointer auf, was sie ohne strcmp als Shape-Cache-Lookup-Keys nutzbar macht.</li>
        <li><strong>Shape-Sharing über den Transition-Cache</strong> (v0.5.45). Objekte, die von <code>js_object_set_field_by_name</code> gebaut werden, laufen denselben Transition-Graph entlang. Wenn das Schema sich wiederholt, wird der <code>keys_array</code>-Pointer geteilt, und genau das braucht ein polymorpher Inline Cache, um zu treffen.</li>
        <li><strong>Zero-Copy-String-Parsing + inkrementeller Object-Aufbau</strong> (v0.5.46). <code>parse_string_bytes</code> liefert nun <code>ParsedStr::Borrowed(&amp;[u8])</code> zurück, wenn es keine Backslash-Escapes gibt — der Normalfall für jeden Key und die meisten Values. <code>parse_object</code> schreibt Felder direkt, anstatt sie zuerst in einem Vec zu sammeln.</li>
        <li><strong>GC-Unterdrückung während des Parsens</strong> (v0.5.60, schließt #59). Das Parsen eines großen Arrays alloziert Tausende kleiner Objekte in einer engen Schleife. Jedes davon stieß den GC-Threshold-Check an. Ein &ldquo;parsing in progress&rdquo;-Flag zu setzen, schiebt die Collection auf, bis das Parsen zurückkehrt — gleiche effektive Heap-Größe, drastisch weniger Buchhaltungs-Branches.</li>
      </ol>
      <p>
        Dann stringify. JSON.stringify auf homogenen Arrays — dieselbe Shape, millionenfach — machte pro Objekt volle Property-Iteration, was für ein Shape-stabiles Array pure Verschwendung ist. Ein Fünf-Schritte-Fix schloss den Großteil dieser Lücke ebenfalls:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>v0.5.62: itoa-/ryu-Fast-Paths für Zahlen, tiefenbasierter Circular-Reference-Check statt eines HashSet.</li>
        <li>v0.5.63: <code>toJSON</code>-Guard + persistenter Key-Cache + Inline-Dispatch (die drei Pro-Call-Kosten, die sich summierten).</li>
        <li>v0.5.65: homogeneous-shape Stringify-Template + ASCII-Escape-Fast-Path. Wenn jedes Element dieselbe Shape hat, wird das Key/Colon/Comma-Gerüst einmal vorberechnet.</li>
        <li>v0.5.70, v0.5.72, v0.5.75: Pro-Call-Shape-Template-Cache, Schließen der Parse-Leftover-GC-Lücke, Eliminieren des verbleibenden fixen Pro-Call-Overheads.</li>
        <li>v0.5.79: der Small-Value-Path. Zahlen, Booleans und kurze Strings laufen über einen direkten Pfad, der keine Object-Machinerie aufsetzt.</li>
      </ul>
      <p>
        Das kumulative Ergebnis: Eine JSON-Pipeline, die zu Beginn der Woche <strong>547x hinter Node</strong> lag, liegt jetzt auf realistischen Workloads bei etwa <strong>1,3x beim Parse und konkurrenzfähig beim Stringify</strong>.
      </p>

      <h2>2. Die Allocator-Geschichte</h2>
      <p>
        Perry alloziert viel. Jedes Object-Literal, jedes Array-Literal, jede String-Konkatenation, jede Closure. Der Allocator ist heiß, und für den größten Teil von v0.5 war er Rusts Standard-System-Allocator plus ein Thread-Local-Arena für kurzlebige Werte.
      </p>
      <p>
        v0.5.67 ersetzte den globalen Allocator durch <strong>mimalloc</strong>. Das ist eine Einzeilen-Änderung in Cargo.toml, die sich sofort bei jedem Workload auszahlt, der viele kleine Allokationen macht — also bei jedem TypeScript-Programm. v0.5.66 ging voraus, indem es den gesamten <code>gc_malloc</code>-Thread-Local-State zu einem einzigen TLS-Zugriff pro Aufruf konsolidierte, sodass der Pfad nach mimalloc so billig wie möglich war.
      </p>
      <p>
        v0.5.68 trieb das weiter mit <strong>arena-allozierten Strings</strong>. Kurzlebige Strings (Zwischenergebnisse von Konkatenationen, <code>split()</code>-Stücke, Parser-Scratch) umgehen den globalen Allocator komplett und landen in einer Pro-Thread-Bump-Arena, die an natürlichen Grenzen zurückgesetzt wird. Für JSON-Parsing war das allein ein zweistelliger Prozent-Gewinn.
      </p>
      <p>
        Und die zwei Optimierungen, die überhaupt nicht allozieren:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Scalar Replacement von nicht-entkommenden Objekten</strong> (v0.5.17, dann Object-Literale in v0.5.76). Wenn ein Objekt nie seine umschließende Funktion verlässt, muss es nicht existieren. Seine Felder werden zu einfachen Locals. LLVM handhabt das von Haus aus, sobald man aufhört, das Objekt hinter einem opaken Allocator-Aufruf zu verstecken.</li>
        <li><strong>Scalar Replacement von nicht-entkommenden Arrays</strong> (v0.5.73). Gleiche Idee — wenn das Array nicht entkommt, werden seine Elemente zu SSA-Values und die ganze Allokation verschwindet.</li>
      </ul>
      <p>
        Speziell für den Array-Literal-Pfad fügte v0.5.69 einen <strong>exact-sized Fast Path</strong> hinzu (die Capacity-Growth-Machinerie überspringen, wenn die Größe zur Kompilierzeit bekannt ist), und v0.5.74 inlinte die Bump-Allocator-IR für kleine Array-Literale, damit LLVM die Allokation sehen, falten, heben oder eliminieren kann. Array-lastige Benchmarks bewegten sich einen weiteren Schritt.
      </p>
      <p>
        Abrundend behob v0.5.25 einen leiseren Bug: <code>gc_malloc</code> triggerte auf seinem eigenen Pfad keine Collection, sodass malloc-lastige Workloads den Heap unbegrenzt wachsen lassen konnten, bevor irgendetwas prüfte. v0.5.61 fügte dem Threshold adaptive Schrittgrößen hinzu, was man eigentlich will: günstig prüfen, wenn der Heap klein ist, seltener, wenn er groß ist.
      </p>

      <h2>3. Property-Zugriff bekam einen echten Inline Cache</h2>
      <p>
        Jede moderne JavaScript-Engine hat einen polymorphen Inline Cache (PIC) auf Property-Zugriff. Für den größten Teil von Perrys v0.5-Serie lief PropertyGet durch einen Shape-Table-Lookup mit einem Thread-Local-Hash. Das ist okay für kalten Code. Es ist nicht okay, wenn 95% der Property-Reads an einer gegebenen Callsite dieselbe Shape sehen, was fast immer der Fall ist.
      </p>
      <p>
        v0.5.44 brachte einen <strong>monomorphen Inline Cache</strong> für <code>PropertyGet</code>. Jede PropertyGet-Site bekommt einen Pro-Callsite-Cache-Eintrag: einen erwarteten Shape-Pointer und einen Feld-Offset. Hit-Path ist ein einzelner Vergleich plus ein indizierter Load. Miss-Path fällt durch zu einem langsamen Helper, der den Cache aktualisiert.
      </p>
      <pre><code>{`; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont`}</code></pre>
      <p>
        v0.5.51 fügte einen <strong>Content-Hash-Shape-Transition-Cache</strong> für dynamische Property-Writes hinzu. Zwei Objekte, die dieselben Felder in derselben Reihenfolge wachsen lassen, hashen zur selben Transition, sodass sie am Ende dieselbe Shape teilen — und das bedeutet, dass die Read-Seite des PIC tatsächlich trifft.
      </p>
      <p>
        v0.5.55 entfernte den letzten TLS-Zugriff aus dem Transition-Cache. v0.5.46 behob einen PIC-Miss-Handler-Bug, bei dem Objekte mit &gt;8 Feldern über die Inline-Slots hinaus in uninitialisierten Speicher lasen (schließt #55). v0.5.78 fügte einen Guard hinzu, der verhindert, dass PropertyGets PIC in Nicht-Pointer-Receiver wie rohe Zahlen indiziert — was bei allzu optimistischer Type-Refinement passieren konnte und eines der letzten Stabilitätsprobleme im IC war.
      </p>
      <p>
        Netto-Effekt: Property-lastiger Code — was in der Praxis meistens TypeScript bedeutet — ist alleine durch den IC etwa 2–3x schneller als noch vor einer Woche.
      </p>

      <h2>4. Integer, bitweise Operationen und das <code>| 0</code>-Muster</h2>
      <p>
        NaN-Boxing macht jede Zahl zu einem f64. TypeScript-Programmierer schreiben <code>x | 0</code>, um Integer-Semantik zu erzwingen. V8 hat fünfzehn Jahre darauf verwendet, das billig zu machen. Perry holte diese Woche auf.
      </p>
      <p>Der Stapel der Änderungen, der Reihe nach:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.48</strong>: <code>sdiv</code> für <code>(int / const) | 0</code>. LLVM faltet zu <code>smulh + asr</code>, was ~2 Zyklen sind vs. ~10 für <code>fdiv</code>.</li>
        <li><strong>v0.5.48</strong>: <code>@llvm.assume</code> auf Uint8ArrayGet-Grenzen. Ersetzt das Bounds-Check-Branch+Phi-Diamant durch einen einzigen Basic Block, über den der Vectorizer räsonieren kann.</li>
        <li><strong>v0.5.49</strong>: Fix für bitweise Operationen mit NaN/Infinity, damit sie gemäß ToInt32-Spec 0 produzieren. Korrektheit zuerst.</li>
        <li><strong>v0.5.50</strong>: <code>toint32_fast</code>, das den 5-Instruktionen-NaN/Inf-Guard überspringt, wenn der Wert bekanntermaßen endlich ist. Plus <code>alwaysinline</code> auf winzigen Helpern und Clamp-Erkennung.</li>
        <li><strong>v0.5.52</strong>: Clamp-Funktionen direkt mit <code>smin</code>/<code>smax</code>-Intrinsics ansprechen. Clamp ist das häufigste Integer-Muster nach Inkrement.</li>
        <li><strong>v0.5.53</strong>: <code>x | 0</code> und <code>x &gt;&gt;&gt; 0</code> auf einem bekannt-endlichen Wert werden zu einem Noop &mdash; nur <code>fptosi + sitofp</code>, ganz ohne Guard.</li>
        <li><strong>v0.5.56</strong>: i32-native bitweise Operationen; i32-Index und -Value in Uint8ArrayGet/Set.</li>
        <li><strong>v0.5.58, v0.5.60</strong>: <code>Math.imul</code> wird zum nativen i32-Multiply heruntergebrochen statt über den Polyfill-Pfad. Die Polyfill-Erkennung erkennt vom Nutzer geschriebene <code>Math.imul</code>-Shims und ersetzt sie.</li>
        <li><strong>v0.5.59</strong>: Pure-Function-Init-Inlining + Integer-Local-Seeding. Die Function-Local-Integer-Analyse darf über Call-Grenzen hinwegschauen, wenn der Callee klein und pur ist.</li>
        <li><strong>v0.5.37–v0.5.40</strong>: Fast Path für Akkumulator-Muster-Int-Arithmetik. Die klassische <code>for (...) acc += f(i)</code>-Schleife bleibt Ende-zu-Ende in i32, wenn die Typen es erlauben.</li>
      </ul>
      <p>
        v0.5.41 ist der subtile Fall. Wenn der Codegen ein modulweites <code>const K: number[][] = [[...], ...]</code> sieht, bricht er das Ganze zu einer flachen <code>[N x i32]</code>-Konstante in <code>.rodata</code> herunter. <code>K[y][x]</code> wird zu einem einzelnen <code>getelementptr + load i32</code>. Kombiniert mit der Int-Analyse-Bridge in v0.5.43 verschaffte das <code>image_conv</code> (einem 5×5-Gaußschen Blur über einem 4K-RGB-Frame) einen <strong>3x-Speedup in einem einzigen Release</strong>.
      </p>

      <h2>5. Buffer und Uint8Array</h2>
      <p>
        Binäre Workloads — Crypto, Bildverarbeitung, Parsing, Netzwerk — leben in Buffer und Uint8Array. v0.5.64 gab ihnen <strong>typisierte Pointer-Slots plus <code>noalias</code>-Metadaten</strong>. Wo ein Buffer früher ein NaN-geboxter Double in einem <code>alloca double</code> war, ist er jetzt ein roher <code>i64</code>-Pointer in einem <code>alloca i64</code>, mit LLVM-Annotationen, die dem Optimierer sagen: &ldquo;dieser Pointer aliased keine anderen Pointer im Scope.&rdquo; Das schaltet Load/Store-Reordering, Vektorisierung und Register-Allokation frei, die der Optimierer sonst ablehnen würde.
      </p>
      <p>
        v0.5.80 schloss das letzte Korrektheits-Problem hier: einen modulweiten Buffer-<code>alias-scope</code>-Zähler, der pro Funktion zurückgesetzt wurde, was in seltenen Fällen LLVM erlauben konnte, über Scopes hinweg zu räsonieren, die keine Scope-ID teilen sollten. Jetzt ist der Zähler modulweit und die <code>noalias</code>-Geschichte ist wasserdicht.
      </p>
      <p>
        v0.5.53 machte <code>Uint8ArraySet</code> branchless — ein Masked Store statt eines if/else, das bei Out-of-Bounds 0 schrieb. v0.5.54 fügte ein <strong>Two-Way indexOf</strong> für längere Muster und ein arena-alloziertes <code>split</code> hinzu, was zusammen den größten Teil der Lücke beim String-lastigen Buffer-Parsing schloss.
      </p>

      <h2>6. Strings: ASCII ist der Fast Path</h2>
      <p>
        JavaScript-Strings sind UTF-16, aber die meisten realen Strings (Keys, Identifier, HTTP-Header, JSON-Gerüst) sind ASCII. v0.5.71 fügte ein <strong>O(1) <code>charCodeAt</code> und <code>codePointAt</code> für ASCII-Strings</strong> hinzu — kein UTF-16-Scan, nur ein Byte-Load. v0.5.20 hatte bereits <code>indexOf</code>, <code>slice</code> und <code>charAt</code> den UTF-16-Scan bei ASCII umgehen lassen.
      </p>
      <p>
        Eine Korrektheits-Notiz innerhalb desselben Releases: <code>String.length</code> liefert jetzt UTF-16-Code-Units (ECMAScript-Spec) statt Byte-Count zurück. Das war ein lauernder Bug, bei dem <code>&quot;caf&eacute;&quot;.length</code> 5 statt 4 zurückgab.
      </p>

      <h2>7. Die Server bleiben jetzt tatsächlich oben</h2>
      <p>
        Die unglamouröseste Arbeit der Woche war auch die sichtbarste für Nutzer: langlaufende Node-Style-Server — Fastify, ws, http, net — daran zu hindern, nach ein paar Minuten abzustürzen.
      </p>
      <p>
        Die Abstürze teilten alle dieselbe Grundursache: Der GC wusste nichts über Listener-Closures. Wenn man <code>wss.on(&apos;message&apos;, handler)</code> schreibt, fängt die Closure Variablen ein, die als Felder innerhalb einer GC-allozierten Zelle leben. Wenn der GC-Root-Scanner nicht weiß, dass er diese Zellen besuchen muss, werden ihre Captures eingesammelt, und das nächste Message-Event dereferenziert freigegebenen Speicher.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.26</strong>: Root-Scan für <code>net.Socket</code>-Event-Listener-Closures (schließt #35).</li>
        <li><strong>v0.5.27</strong>: auf <code>ws</code>, <code>http</code>, <code>events</code>, <code>fastify</code> erweitert.</li>
        <li><strong>v0.5.28</strong>: Modulweite Globals als GC-Roots registrieren (schließt #36). Lifetime-Bug eine Ebene höher.</li>
        <li><strong>v0.5.21</strong>: <code>gc()</code>-Sicherheit innerhalb von Fastify/WebSocket-Request-Handlern — der explizite GC-Aufruf lief, während Request-Handler Pointer in die Arena hielten (schließt #31).</li>
      </ul>
      <p>
        Neben der GC-Arbeit lieferte v0.5.20 eine <strong>Main-Event-Loop</strong> aus — eine echte, kein Platzhalter —, die WebSocket- und Timer-basierte Server am Leben hält, anstatt zu beenden, nachdem der letzte synchrone Aufruf zurückkehrt (refs #28). Das war der einzelne wirkungsvollste Fix für jeden, der versucht, Perry als produktiven HTTP-Server zu betreiben. Fastify bleibt jetzt oben. WebSocket-Server bleiben jetzt oben.
      </p>
      <p>
        v0.5.19 behob den SysV-AMD64-ABI-Mismatch für JSValue-FFI-Argumente/-Returns — ein Problem unter Linux, bei dem native FFI-Aufrufe Argumente stillschweigend korrumpieren konnten. v0.5.18 fügte nativen Dispatch für <code>axios</code> hinzu (get/post/put/delete/patch), einschließlich <code>response.status</code> und <code>response.data</code>. v0.5.30 behob den <code>fastify request.header()</code>- und <code>request.headers[]</code>-Dispatch, der bei case-insensitiven Lookups undefined zurückgegeben hatte.
      </p>

      <h2>8. <code>@perry/postgres</code>: der Treiber, der all das nötig gemacht hat</h2>
      <p>
        Viel von der Arbeit dieser Woche wurde von einem Workload getrieben: einen vollständigen Node-kompatiblen <a href="https://github.com/PerryTS/postgres" className="text-amber-400 hover:text-amber-300">Postgres-Treiber</a> auf Perry-nativ zum Laufen zu bringen. Der Treiber ist TLS-fähig, hat eine modulübergreifende Codec-Registry, unterstützt cancel/close/notify und benchmarkt jetzt gegen <code>pg</code>, <code>postgres.js</code> und <code>tokio-postgres</code>.
      </p>
      <p>Die treiberseitige Perf-Arbeit verlief parallel zur compilerseitigen:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Pro-Spalten-Codec hoisten</strong> und Pro-Zellen-Buffer-Kopien weglassen. BigInt(string) für int8, um Zwischen-Allokationen zu vermeiden.</li>
        <li><strong>Dynamischer Pro-Shape-Row-Konstruktor</strong> für Object-Form-Rows. Wenn deine Query immer dieselben Spalten zurückgibt, baut der Treiber beim ersten Mal einen Shape-spezialisierten Row-Konstruktor und verwendet ihn wieder — was in Kombination mit dem PIC des Compilers Feld-Zugriff auf Rows so schnell macht wie Feld-Zugriff auf jedes andere Objekt.</li>
        <li><strong><code>parseTypes: &apos;minimal&apos;</code>-Opt-out</strong> für Caller, die rohe Strings für int8/numeric/date wollen.</li>
      </ul>
      <p>
        Das ist die positive Feedback-Schleife, die der Compiler immer ermöglichen sollte. Ein echter Treiber bringt echte Engpässe an die Oberfläche. Der Engpass bekommt einen Einzeiler-Reproducer als GitHub-Issue eingereicht. Eine Woche Compiler-Fixes später ist der Treiber schneller und der Compiler ist auch für alle anderen schneller. Das ist der ganze Plan, komprimiert in sieben Tage.
      </p>

      <h2>9. Korrektheits-Fixes, die erwähnt werden sollten</h2>
      <p>
        Performance-Arbeit bringt Korrektheits-Probleme an die Oberfläche, so wie das Ausbaggern eines Flusses Einkaufswagen zutage fördert. Eine Teilliste:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Promise.race</strong> las bei Rejection <code>.value</code> statt <code>.reason</code>, sodass Rejections stillschweigend geschluckt wurden (v0.5.13–v0.5.14).</li>
        <li><strong>Promise.any</strong> wirft jetzt einen ordentlichen <code>AggregateError</code>, wenn alle Input-Promises rejecten. <code>Promise.withResolvers</code> hinzugefügt und die <code>queueMicrotask</code>-Reihenfolge behoben.</li>
        <li><strong><code>[...&quot;hello&quot;]</code></strong> produziert jetzt ein Character-Array statt eines kaputten Objekts (schließt #16).</li>
        <li><strong>BigInt-Arithmetik und <code>BigInt()</code>-Coercion</strong> (schließt #33). Der i64-bigint-Fast-Path (v0.5.29) macht den Normalfall billig.</li>
        <li><strong>Buffer.indexOf / Buffer.includes</strong> mit einem numerischen Byte-Argument verglichen gegen Buffer-Pointer statt gegen Byte-Values (schließt #56).</li>
        <li><strong>Bitweise Operationen mit NaN/Infinity</strong> produzieren gemäß ToInt32-Spec 0 (schließt #57).</li>
        <li><strong>Windows x86_64</strong>: fünf plattformspezifische Fixes — <code>localtime</code>, <code>clang</code>-Discovery und eine Handvoll Codegen-Anpassungen — brachten Windows x86_64 zurück in den grünen Bereich (v0.5.72).</li>
      </ul>

      <h2>10. Die Zahlen</h2>
      <p>
        Der Headline-Benchmark aus dem letzten Beitrag war <code>factorial</code> mit 24,6x schneller als Node. Diese Zahl ist unverändert. Was sich diese Woche bewegt hat, ist alles drumherum:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Workload</th>
              <th className="text-right py-2 px-3">v0.5.12</th>
              <th className="text-right py-2 px-3">v0.5.80</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">JSON.parse (20-Record-Schema)</td><td className="text-right py-2 px-3">547x langsamer als Node</td><td className="text-right py-2 px-3">1,3x langsamer als Node</td><td className="text-right py-2 px-3 text-green-400 font-semibold">~420x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">image_conv (4K 5×5 Blur)</td><td className="text-right py-2 px-3">1.980ms</td><td className="text-right py-2 px-3">457ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">4,3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Property-lastiger Code (PIC-Hit)</td><td className="text-right py-2 px-3">Baseline</td><td className="text-right py-2 px-3">2–3x</td><td className="text-right py-2 px-3 text-green-400">2–3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3 text-green-400">1,3x</td></tr>
            <tr><td className="py-2 px-3">Fastify-Uptime unter Last</td><td className="text-right py-2 px-3">~60s bis zum Absturz</td><td className="text-right py-2 px-3">unbegrenzt</td><td className="text-right py-2 px-3 text-green-400">∞</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Die volle 15-Benchmark-Suite gegen Node steht weiterhin bei 14 Siegen und 1 Gleichstand — dieselbe Tabelle wie im letzten Beitrag, mit durchweg leicht besseren Zahlen. Die echte Bewegung diese Woche liegt bei Workloads, die nicht in dieser Suite waren: JSON, Bildverarbeitung, langlaufende Server. Dort lagen die Lücken, und genau diese sind geschlossen.
      </p>

      <h2>11. Was als Nächstes kommt</h2>
      <p>
        Der eine Benchmark, dem wir noch hinterherjagen, ist <code>image_conv</code> vs. Zig. Perry liegt bei 457ms; Zig bei 246ms. Diese Lücke ist architektonisch, nicht auf Optimierungspass-Ebene, und sie lebt an drei Stellen:
      </p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Typisierte Buffer-Locals</strong>. Der Großteil der Buffer-Arbeit landete diese Woche, aber buffer-typisierte Funktionsparameter und -Locals unboxen weiterhin bei jedem Zugriff. Der <code>i64</code>-Slot-Ansatz, den wir für Schleifenzähler verwenden, muss auf Buffer erweitert werden.</li>
        <li><strong>Interior/Border-Loop-Splitting</strong>. Die Blur-Schleife clamped jeden Pixel, einschließlich der 99,9% der Pixel, die das nicht brauchen. Das Aufteilen in Border-Regionen (clamped) und Interior (kein Clamp) lässt LLVM das Interior mit NEON <code>ld3</code>/<code>st3</code> vektorisieren.</li>
        <li><strong>Double-ABI-FNV-1a-Hash</strong>. Der Hash-Helper wird über die NaN-Box-ABI aufgerufen. Ihn für heiße Pfade auf rohes i64 in/out zu spezialisieren, ist ein paar Stunden Arbeit, die sich über jeden Hash-lastigen Workload hinweg auszahlen wird.</li>
      </ol>
      <p>
        Diese werden in <code>PERF_ROADMAP.md</code> getrackt. Erwarte sie im nächsten Zyklus.
      </p>

      <h2>Zusammenfassung</h2>
      <p>
        Das Muster dieser Woche — 68 Patch-Releases, fast alles Performance, eine JSON-Lücke von 547x auf 1,3x — ist das, was passiert, wenn man auf die gute Seite des LLVM-Umstellungs-Hügels kommt. Der Optimierer ist jetzt ein Verbündeter statt einer Mauer, und der Großteil dessen, was bleibt, ist kleine, spezifische, messbare Arbeit: einen langsamen Pfad finden, herausfinden, warum der Optimierer nicht hindurchsehen kann, die Struktur freilegen, erneut messen. Keiner dieser Commits ist exotisch. Sie werden nur dort angewandt, wo sie gebraucht werden.
      </p>
      <p>
        Wenn du irgendetwas davon ausprobieren willst:
      </p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>
        Issues, Reproducer und Benchmarks, die nicht schnell genug sind: immer her damit. Dieses Tempo funktioniert nur, weil die Bug-Reports spezifisch genug sind, um in Einzeiler-Reproducer umgewandelt zu werden. Jeder Commit in diesem Beitrag hat aus gutem Grund ein <code>#N</code> angehängt.
      </p>
      <p>— Ralph</p>
    </>
  );
}
