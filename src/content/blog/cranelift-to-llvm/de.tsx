export default function Content() {
  return (
    <>
      <p>
        Perrys Backend-Migration von Cranelift zu LLVM ist abgeschlossen. Ab v0.5.12 ist LLVM das einzige Codegenerierungs-Backend, und Perry schlägt Node.js nun in jedem Benchmark — mit Vorsprüngen von 1,7x bis 24,6x (bei zwei Gleichständen).
      </p>
      <p>
        Der Weg dorthin war nicht geradlinig. Die anfängliche Umstellung in v0.5.0 machte einige Benchmarks <strong>70x langsamer</strong> als die Cranelift-Version, die sie ersetzte. Dieser Beitrag ist die ausführliche Version dessen, was passiert ist, warum wir den Wechsel trotzdem vollzogen haben, was schiefging, was es wieder richtete und wie die Zahlen am Ende aussehen.
      </p>
      <p>
        Wenn du einen Compiler baust, Codegen-Backends evaluierst oder einfach neugierig bist, warum &ldquo;auf LLVM umsteigen&rdquo; selten so einfach ist, wie es klingt, dann ist dieser Beitrag für dich.
      </p>

      <h2>Teil 1: Warum überhaupt wechseln?</h2>
      <p>
        Perry kompiliert TypeScript direkt zu nativem Maschinencode. Kein Node, kein V8, kein Electron, keine WebView. Das Versprechen lautet &ldquo;schreibe TypeScript, liefere ein natives Binary&rdquo; — und das gesamte Wertversprechen bricht zusammen, wenn dieses Binary nicht tatsächlich schnell ist.
      </p>
      <p>
        Für Perrys erste Minor-Versionen war das Codegen-Backend <a href="https://cranelift.dev/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Cranelift</a>. Cranelift ist hervorragend — es ist das Codegen hinter wasmtime, wird von SpiderMonkeys Baseline-JIT verwendet und ist die erste Wahl, wenn man schnelle, vorhersagbare Kompilierung mit einer sauberen Embedding-Story braucht. Für ein Projekt, das eine neue Sprache bootstrappt, war es der richtige Startpunkt.
      </p>
      <p>
        Aber zwei Dinge haben uns letztlich davon weggetrieben.
      </p>

      <h3>1. Die Optimierer-Obergrenze</h3>
      <p>
        Cranelift ist bewusst ein schneller, einstufiger optimierender Compiler. Sein Auftrag lautet &ldquo;erzeuge ordentlichen Code schnell&rdquo;, nicht &ldquo;erzeuge den bestmöglichen Code ohne Zeitlimit&rdquo;. Das ist der richtige Kompromiss für einen JIT. Es ist der falsche Kompromiss für einen AOT-Compiler, dessen gesamtes Verkaufsargument native Performance ist.
      </p>
      <p>
        In LLVMs Middle-End stecken über zwei Jahrzehnte Arbeit. Loop-Vektorisierung, LICM, GVN, SCCP, Instruction Combining, Inlining-Heuristiken, Fast-Math-Reassoziation, Alias-Analyse — es gibt kein realistisches Szenario, in dem ein kleineres Projekt aufholt. Wenn Perry behaupten will &ldquo;schneller als Node&rdquo;, brauchen wir diese Maschinerie.
      </p>

      <h3>2. Das arm64_32-Problem</h3>
      <p>
        Der unmittelbare Auslöser war die Apple Watch. <code>arm64_32</code> ist ein ABI, das Apple für die Series 4 und neuer eingeführt hat — 64-Bit-Instruktionen, 32-Bit-Pointer. Cranelift unterstützt es nicht, und es gab keinen realistischen Pfad, dass es kommen würde. Damit Perry glaubwürdig &ldquo;9 Plattformen aus einer Codebasis&rdquo; behaupten kann, durfte watchOS nicht fehlen. LLVM unterstützt <code>arm64_32</code> direkt.
      </p>
      <p>
        Als wir akzeptiert hatten, dass <em>einige</em> Targets LLVM benötigen würden, wurde die Pflege zweier Backends unhaltbar. Zwei Backends bedeuten zwei Sätze von Bugs, zwei Sätze von Optimierungspässen, zwei Test-Matrizen, zwei Performance-Baselines. Die ehrliche Antwort war: eines auswählen.
      </p>
      <p>Wir haben LLVM gewählt.</p>

      <h2>Teil 2: Ein Wort zu Cranelift</h2>
      <p>
        Bevor es weitergeht: Dieser Beitrag ist kein Cranelift-Verriss. Cranelift ist ein brillantes Stück Ingenieurskunst, und wenn du einen JIT, eine Sandbox-Runtime oder irgendetwas baust, wo die Kompilier-Latenz wichtiger ist als der Spitzendurchsatz, sollte es ganz oben auf deiner Liste stehen. wasmtime setzt es nicht ohne Grund ein. Die Bytecode Alliance leistet vorbildliche Arbeit.
      </p>
      <p>
        Perrys Anforderungen sind einfach andere. Wir kompilieren im Voraus, liefern das Binary einmal aus, und der Nutzer führt es millionenfach aus. Diese Asymmetrie — selten kompilieren, immer ausführen — ist genau das Regime, in dem sich LLVMs schwererer Optimierer auszahlt. Anderes Werkzeug für einen anderen Job.
      </p>

      <h2>Teil 3: Das Umstellungs-Desaster</h2>
      <p>
        v0.5.0 war das erste Release mit LLVM als einzigem Backend. Wir erwarteten eine leichte Regression bei der Kompilierzeit und eine deutliche Verbesserung der Laufzeit-Performance. Beim zweiten Punkt trat das Gegenteil ein.
      </p>
      <p>Hier ist die Tabelle, die ich damals nicht veröffentlichen wollte:</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Cranelift</th>
              <th className="text-right py-2 px-3">LLVM v0.5.0</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3">1,084ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">68x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">5ms</td><td className="text-right py-2 px-3">318ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">64x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">61ms</td><td className="text-right py-2 px-3">184ms</td><td className="text-right py-2 px-3 text-red-400">3x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">370ms</td><td className="text-right py-2 px-3">131ms</td><td className="text-right py-2 px-3 text-green-400">2.8x faster</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">32ms</td><td className="text-right py-2 px-3">57ms</td><td className="text-right py-2 px-3 text-red-400">1.8x slower</td></tr>
            <tr><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">505ms</td><td className="text-right py-2 px-3">1,156ms</td><td className="text-right py-2 px-3 text-red-400">2.3x slower</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        Einige Workloads wurden schneller. Die meisten dramatisch langsamer. <code>method_calls</code> — einer der wichtigsten Benchmarks, weil er idiomatische TypeScript-Klassennutzung repräsentiert — war fast 70x schlechter als das, was wir zwei Releases zuvor ausgeliefert hatten.
      </p>

      <h3>Was tatsächlich schiefging</h3>
      <p>
        Perry verwendet <strong>NaN-Boxing</strong> für die Wertdarstellung. Jeder TypeScript-Wert ist ein 64-Bit-Wort. f64-Zahlen werden direkt gespeichert; alles andere (Objekte, Strings, Booleans, undefined, null) wird in die ungenutzten Bits einer IEEE-754-Quiet-NaN kodiert.
      </p>
      <p>
        Der Vorteil: Zahlen kosten nichts. Kein Boxing, kein Tagging, keine Allokation für Arithmetik.
      </p>
      <p>
        Der Nachteil: Jede Operation auf einem Nicht-Zahlen-Wert erfordert Bit-Manipulation zum Entpacken, Verarbeiten und Wiederverpacken. Wenn diese Sequenzen als Inline-IR im Codegen liegen, kann der Optimierer sie verschmelzen und vereinfachen. Wenn sie als <strong>Aufrufe in Runtime-Hilfsfunktionen</strong> vorliegen, sieht der Optimierer einen opaken Aufruf und gibt auf.
      </p>
      <p>
        Unser Cranelift-Backend hatte eine große Anzahl von Inline-Lowerings für heiße Operationen angesammelt — Property-Loads, Method-Dispatch, Object-Allokation, Integer-Arithmetik auf f64-getaggten Werten. Die LLVM-Umstellung hatte im Interesse der Korrektheit fast alle davon durch Runtime-Helpers in <code>perry-runtime</code> ersetzt. Jeder Helper war eine <code>call</code>-Instruktion in LLVM IR.
      </p>
      <p>
        LLVM ist hervorragend, aber es kann keine Funktion inlinen, deren Body es nie gesehen hat. <code>perry-runtime</code> wird separat kompiliert, am Ende dazugelinkt, und aus der Perspektive des Optimierers ist jeder Helper-Aufruf eine Black Box. Das Ergebnis war, dass heiße Schleifen, die das Cranelift-Backend zu ~5 Instruktionen Inline-Arithmetik kompiliert hatte, nun zu Funktionsaufrufen kompiliert wurden — Register-Sicherungen, Stack-Frame-Aufbau, das volle Programm — millionenfach wiederholt.
      </p>
      <p>
        Daher kamen die 70x. Kein schlechter Codegen. Schlechte <strong>Inlining-Grenzen</strong>.
      </p>

      <h2>Teil 4: Die Lösung</h2>
      <p>
        Die Arbeit, um die Cranelift-Zahlen zu erreichen und zu übertreffen, fiel grob in sechs Kategorien. Keine davon ist exotisch. Die meisten sind Lehrbuch-Compiler-Optimierungen, die nur an den richtigen Stellen angewandt werden mussten.
      </p>

      <h3>1. Inline-Bump-Allocator für Object-Allokation</h3>
      <p>
        <code>object_create</code> war die schlimmste Regression nach <code>method_calls</code>. Der alte Pfad rief <code>js_object_alloc_class_with_keys</code> für jedes <code>new Point()</code> auf — ein Funktionsaufruf, ein Thread-Local-Arena-Zugriff, ein Shape-Cache-Lookup und ein Schreiben des GC-Headers + Object-Headers.
      </p>
      <p>
        Die Lösung: die Bump-Allokation <strong>inline</strong> in LLVM IR emittieren. Jede Funktion, die Objekte alloziert, bekommt einen gecachten Pointer auf eine Thread-lokale <code>InlineArenaState</code>-Struktur. Allokation wird zu:
      </p>
      <pre><code>{`; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
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
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)`}</code></pre>
      <p>
        Der Fast Path besteht aus ~13 Instruktionen Inline-IR, die LLVM sehen, umplanen und aus Schleifen herausziehen kann. <code>object_create</code> ging von 318ms auf 9ms.
      </p>

      <h3>2. i32-Schleifenzähler</h3>
      <p>
        NaN-Boxing bedeutet, dass jede TypeScript-Zahl f64 ist. Das schließt Schleifenzähler ein. Eine <code>{'for (let i = 0; i < 100_000_000; i++)'}</code>-Schleife mit f64-Induktionsvariablen ist eine Katastrophe: f64-Inkrement, f64-Vergleich, f64-zu-i64-Konvertierung bei jedem Array-Indexzugriff.
      </p>
      <p>
        Der Codegen erkennt For-Schleifen, bei denen die Induktionsvariable beweisbar ganzzahlig ist, und alloziert einen <strong>parallelen i32-Stack-Slot</strong>. Die Schleifenbedingung wechselt von <code>fcmp</code> zu <code>icmp slt i32</code> und eliminiert den f64-Zähler vollständig.
      </p>
      <p>
        Das brachte <code>array_write</code> von 11ms auf 3ms, <code>nested_loops</code> von 18ms auf 9ms und <code>array_read</code> von 11ms auf 4ms.
      </p>

      <h3>3. Fast-Math-Flags</h3>
      <p>
        Wir hängen <code>reassoc contract</code>-Flags an jede f64-Arithmetik-Instruktion an. <code>reassoc</code> erlaubt LLVM, serielle Akkumulator-Ketten in parallele aufzubrechen, und <code>contract</code> erlaubt Fused-Multiply-Add. Wir lassen <code>nnan</code> und <code>ninf</code> deaktiviert, weil Perry NaN-Bits als Wert-Tags verwendet.
      </p>
      <p>
        Mit diesen Flags greift LLVMs Loop-Vektorisierer bei <code>math_intensive</code>, das von 131ms auf 14ms fiel — 3,5x schneller als Node.
      </p>

      <h3>4. Integer-Modulo-Fast-Path</h3>
      <p>
        <code>%</code> auf f64 in JavaScript ist <code>fmod</code>, was auf ARM ein libm-Aufruf ist. Aber für ganzzahlige f64-Operanden können wir <code>fptosi → srem → sitofp</code> machen und den libm-Umweg ganz überspringen. Der Codegen nutzt statische Analyse, um ganzzahlige Operanden zu erkennen — kein Runtime-Check nötig.
      </p>
      <p>
        Das ist der gesamte Grund, warum <code>factorial</code> von 1.553ms auf 24ms fiel — und von Nodes 591ms auf 24ms. <strong>24,6x schneller als Node.</strong>
      </p>

      <h3>5. LICM für verschachtelte Schleifen</h3>
      <p>
        LLVM macht Loop-Invariant Code Motion von Haus aus, aber NaN-Boxing verschleiert die Struktur. <code>arr.length</code> wird zu einem Load durch einen NaN-geboxten Pointer mit Tag-Check heruntergebrochen — nicht offensichtlich invariant.
      </p>
      <p>
        Der Codegen erkennt das <code>{'for (...; i < arr.length; ...)'}</code>-Muster und lädt die Länge vor der Schleife in einen Stack-Slot, wobei ein statischer Walker verifiziert, dass der Schleifen-Body die Länge des Arrays nicht ändern kann. Wenn der Zähler durch diese herausgehobene Länge begrenzt ist, überspringen IndexGet/IndexSet die Bounds-Checks vollständig.
      </p>

      <h3>6. Shape-gecachte Objekte</h3>
      <p>
        Wenn der Codegen die Klasse eines Objekts kennt, löst er Feld-Offsets zur Kompilierzeit auf und emittiert <strong>direkte indizierte Loads</strong> — kein Runtime-Dispatch. Für Method-Dispatch wird <code>obj.method(args)</code> zu einem direkten <code>call @perry_method_Class_name(this, args)</code> — keine vtable, kein Inline-Cache, kein Hash-Lookup.
      </p>
      <p>
        Die LLVM-Umstellung hatte hier auf den universellen Slow-Path zurückgestuft. Die Wiederherstellung des statischen Dispatch brachte uns die <code>method_calls</code>-Erholung — von 1.084ms zurück auf 1ms. <strong>11x schneller als Node.</strong>
      </p>

      <h2>Teil 5: Die Zahlen heute</h2>
      <p>Median aus drei Läufen, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Node.js</th>
              <th className="text-right py-2 px-3">vs Node</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">factorial</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">591ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">24.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">11ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">11x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_overhead</td><td className="text-right py-2 px-3">12ms</td><td className="text-right py-2 px-3">53ms</td><td className="text-right py-2 px-3 text-green-400">4.4x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">14ms</td><td className="text-right py-2 px-3">49ms</td><td className="text-right py-2 px-3 text-green-400">3.5x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_read</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">13ms</td><td className="text-right py-2 px-3 text-green-400">3.2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">closure</td><td className="text-right py-2 px-3">97ms</td><td className="text-right py-2 px-3">303ms</td><td className="text-right py-2 px-3 text-green-400">3.1x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_write</td><td className="text-right py-2 px-3">3ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-green-400">2.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">string_concat</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">2ms</td><td className="text-right py-2 px-3 text-green-400">2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">prime_sieve</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">7ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">21ms</td><td className="text-right py-2 px-3">34ms</td><td className="text-right py-2 px-3 text-green-400">1.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">991ms</td><td className="text-right py-2 px-3 text-green-400">2.5x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">binary_trees</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3 text-slate-400">tied</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">mandelbrot</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3 text-slate-400">tied</td></tr>
            <tr><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-red-400">0.9x</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        Jeder Benchmark ist ein Sieg oder ein Gleichstand. Am knappsten ist <code>object_create</code> (9ms vs 8ms), wo V8s Allocator wirklich hervorragend ist.
      </p>

      <h2>Teil 6: Die Kompilierzeit-Frage</h2>
      <p>
        Der Hauptgrund, warum Leute Cranelift statt LLVM wählen, ist die Kompiliergeschwindigkeit. Also reden wir darüber.
      </p>
      <p>
        LLVM erhöhte Perrys Pro-Datei-Kompilierzeit um <strong>20-50ms</strong>, also ungefähr <strong>8-19%</strong>. Nicht 5x. Nicht 2x. Einstelliger bis niedriger zweistelliger Prozentbereich.
      </p>
      <p>
        Der Grund ist, dass Codegen nicht der Engpass in Perrys Pipeline ist. Die Aufschlüsselung für eine typische Datei:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>SWC-Parsing: ~30%</li>
        <li>HIR-Lowering (AST → IR, Typinferenz): ~25%</li>
        <li>IR-Transformationspässe (Closure-Konvertierung, Async-Lowering, Inlining): ~15%</li>
        <li><strong>Codegen (LLVM-IR-Textemission + <code>clang -c -O3</code>): ~20%</strong></li>
        <li>Linking (<code>cc</code> + Runtime-Bibliothek): ~10%</li>
      </ul>
      <p>
        Codegen ist ein Stück von fünf. Selbst eine Verdoppelung dieses Stücks bewegt das Gesamtergebnis nur um 5-10%. Wenn du einen AOT-Compiler baust, bei dem der Nutzer einmal <code>perry compile</code> eingibt und dann das Binary für immer ausführt, lautet die Rechnung: 25ms mehr zur Kompilierzeit investieren, bis zu 24x bei jeder einzelnen Ausführung sparen.
      </p>

      <h2>Teil 7: Was ich anders machen würde</h2>
      <p>
        Wenn ich Perry heute starten würde und direkt zu LLVM springen könnte, würde ich es nicht tun. Die Cranelift-Phase war wirklich wertvoll. Sie ließ uns am Frontend iterieren ohne LLVMs Komplexitäts-Aufwand, gab uns eine funktionierende Baseline zum Vergleichen und zwang uns, unser HIR sauber genug zu halten, um zwischen Backends portabel zu sein.
      </p>
      <p>
        Was ich anders machen würde, ist die Umstellung selbst. Wir haben v0.5.0 ausgeliefert, wobei die meisten Operationen durch Runtime-Helper-Aufrufe liefen, mit der Absicht, sie später zu inlinen. Das war falsch. Die richtige Reihenfolge wäre gewesen: erst die heißen Pfade identifizieren, sie vor der Umstellung inline herunterbrechen und erst veröffentlichen, wenn das LLVM-Backend mindestens Parität erreicht hat.
      </p>
      <p>
        Die Lektion ist die langweilige: Optimierungsgrenzen sind wichtiger als Optimierer-Qualität. LLVM ist ein bemerkenswertes Stück Software, aber es kann dir bei Code, den es nicht sehen kann, nicht helfen. Wenn dein Codegen alles durch opake Runtime-Aufrufe leitet, hast du eine Mauer zwischen deinem Quellprogramm und jedem existierenden Optimierungspass gebaut.
      </p>

      <h2>Zusammenfassung</h2>
      <p>
        Perry ist jetzt ausschließlich auf LLVM, schneller als Node in jedem Benchmark und ausgeliefert. Die Migration hat länger gedauert als geplant, hat in der Mitte mehr wehgetan als erwartet und war im Rückblick eindeutig die richtige Entscheidung. Cranelift hat uns bis v0.5 gebracht; LLVM bringt uns den Rest des Wegs.
      </p>
      <p>Wenn du Perry ausprobieren willst:</p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}— Benchmarks selbst ausführen: <code>cd benchmarks/suite && ./run_benchmarks.sh</code>
      </p>
      <p>
        Wenn du Fragen hast, Bugs findest oder über Codegen-Backends diskutieren willst, die GitHub Issues sind offen. Ich lese sie alle.
      </p>
      <p>— Ralph</p>
    </>
  );
}
