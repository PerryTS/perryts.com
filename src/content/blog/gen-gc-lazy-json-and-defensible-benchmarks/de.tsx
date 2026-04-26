export default function Content() {
  return (
    <>
      <p>
        Der letzte Beitrag endete bei <strong>v0.5.174</strong> mit einer Schlagzeile: Perry gewann endlich jeden Benchmark in der In-Tree-Suite gegen Node und Bun. Drei Tage Arbeit und ein Backlog an GC- und JSON-Commits später ist Perry bei <strong>v0.5.306</strong> — das sind <strong>132 Patch-Releases</strong> — und die Geschichte ist eine andere. Die Schlagzeile ist kein 547-faches Speedup oder eine frische Win-Spalte. Es ist die Arbeit, die diese Wins verteidigbar macht.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Der <strong>Generationen-GC</strong> ist jetzt Default. Phase A bis D landeten in v0.5.217–v0.5.237.</li>
        <li>Die <strong>Small String Optimization</strong> ist jetzt Default. Schritte 1.5 → 2 landeten in v0.5.213–v0.5.216.</li>
        <li>Die <strong>JSON-Pipeline</strong> bekam einen Tape-basierten Parser, Lazy Parse, Lazy Stringify und Per-Element-Sparse-Materialisierung. Default-Validate-and-Roundtrip liegt jetzt bei <strong>75 ms Median</strong> — Bestwert im Dynamic-Typing-Feld.</li>
        <li>Die <strong>Benchmarks-Seite</strong> ist Ende-zu-Ende neu geschrieben mit <strong>RUNS=11 Median + p95 + σ + min + max</strong>, simdjson und AssemblyScript+json-as als Peers hinzugefügt, Optimization-Probes von echten Vergleichen getrennt, und jede Schwäche, die Perry hat, ehrlich offengelegt.</li>
      </ul>
      <p>
        Das Begleitprogramm ist eine stetige Reihe von Korrektheits-Fixes: Promise-Microtask-FIFO, NaN-Equality und ECMAScript-Number-Formatierung, BigInt-Zweierkomplement, AsyncLocalStorage Ende-zu-Ende, decimal.js + ioredis + commander Runtimes, und ein JSON.stringify-Segfault auf reinem f64, der sich unter Tape-Pfaden versteckt hatte. Plus die Windows-Toolchain wird endlich leichtgewichtig: LLVM + xwin, keine Visual-Studio-Installation nötig.
      </p>

      <h2>1. Generationen-GC, standardmäßig an</h2>
      <p>
        Der Generationen-GC ist seit zwei Monaten ein gestaffelter Roll-out. Die Zusammenfassung der Phasen, die in diesem Fenster geschlossen wurden:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.217–v0.5.221</strong> — Phase A: Shadow-Stack-Runtime-Scaffolding, Push/Pop-Emission, Slot-Map-Threading, <code>Let</code>/<code>LocalSet</code>-Shadow-Mirroring und der Root-Scanner.</li>
        <li><strong>v0.5.222</strong> — Phase B: Nursery- + Old-Gen-Arena-Split.</li>
        <li><strong>v0.5.223–v0.5.225</strong> — Phase C1–C2: Write-Barrier-Runtime-Infrastruktur, Codegen emittiert die Barrier, jeder Heap-Store geht durch sie hindurch.</li>
        <li><strong>v0.5.226–v0.5.228</strong> — Phase C3a–C4: Remembered-Set-Roots fließen in Mark + Clear; Minor-GC-Trace überspringt Old-Gen; non-moving Tenuring.</li>
        <li><strong>v0.5.229–v0.5.236</strong> — Phase C4b α/β/γ/δ: Forwarding-Pointer-Infrastruktur, Pinning- + Evacuation-Pass, Scanner + transitives Pinning, Reference-Rewriting, idle Nursery-Blocks ans OS zurückgegeben, GC-Trigger auf den initialen Threshold gedeckelt.</li>
        <li><strong>v0.5.237</strong> — Phase D Teil 1: <code>PERRY_GEN_GC=1</code> standardmäßig.</li>
        <li><strong>v0.5.238</strong> — Phase D Teil 2: <code>PERRY_SHADOW_STACK=1</code> standardmäßig.</li>
        <li><strong>v0.5.239–v0.5.240</strong> — Abschluss-Docs: Roadmap finalisiert, akademischer + industrieller Lineage-Anhang (Bartlett 1988, Ungar 1984, Cheney 1970).</li>
      </ul>
      <p>
        Der gemessene Win, der am wichtigsten war: <code>test_memory_json_churn</code> fiel von <strong>115 MB → 91 MB</strong> Peak-RSS in dem Moment, als der Gen-GC-Default umgelegt wurde. Die Compute-Regressionen waren klein und werden ungeschönt aufgelistet — <code>nested_loops</code> 8 → 18 ms, <code>accumulate</code> 24 → 34 ms, <code>object_create</code> 0 → 1 ms, <code>array_read</code> / <code>array_write</code> jeweils +1 ms. Der Notausgang (<code>PERRY_GEN_GC=0</code>) holt die alten Zahlen zurück; der Trade-off war bewusst, und die Benchmarks-Seite listet jetzt beide Zeilen nebeneinander, sodass eine Leserin wählen kann.
      </p>

      <h2>2. Small String Optimization, standardmäßig an</h2>
      <p>
        SSO ist eine 22-Byte-Inline-String-Repräsentation, die für kurze Strings die Heap-Allokation vermeidet — typische JSON-Keys (2–8 Bytes) und kurze Werte landen in der Inline-Form. Der Roll-out war an der Oberfläche winzig und unter der Haube groß:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.213</strong>: SSO-Infrastruktur (Repräsentation + Accessors).</li>
        <li><strong>v0.5.214</strong>: Schritt 1 Consumer-Arms + <code>PERRY_SSO_FORCE</code>-Gate fürs Testen.</li>
        <li><strong>v0.5.215</strong>: Schritt 1.5 Codegen <code>PropertyGet</code>-Drei-Wege-Branch — Fast-Path für Inline-Strings, Fast-Path für Heap-Strings, Slow-Path für den Rest.</li>
        <li><strong>v0.5.216</strong>: Schritt 2 Flip — SSO standardmäßig emittieren.</li>
      </ul>
      <p>
        Die Follow-ups in v0.5.279 schlossen den letzten Property-Read-NaN-Bug, der auftauchte, als SSO heiß lief, und der Fix für Chained-Cross-Module-Getter-Dispatch in v0.5.272 schloss noch einen. Beide standen vor dem Default-Flip auf der Punch-List; beide gingen ohne Perf-Regression live.
      </p>

      <h2>3. JSON: Tape-basiertes Parsen, standardmäßig lazy</h2>
      <p>
        Die JSON-Pipeline bekam das invasivste Rewrite des Zeitraums. Altes Verhalten: <code>JSON.parse</code> baute einen voll materialisierten Baum aus NaN-geboxten Werten. Neues Verhalten: <code>JSON.parse</code> baut ein 12-Byte-pro-Wert-Tape und materialisiert lazy — nur die Werte, die du tatsächlich liest, zahlen die Materialisierungs-Kosten. Stringify auf einem unveränderten Parse ist jetzt ein memcpy des Original-Inputs, derselbe Fast-Path-Trick, den simdjson mit <code>raw_json()</code> verwendet.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.200</strong>: <code>JSON.parse&lt;T&gt;(blob)</code> Schema-gerichteter Parse (Schritt 1). Compile-Time-bekannte Shape lässt den Compiler vorab aufgelösten Key-Zugriff emittieren.</li>
        <li><strong>v0.5.203</strong>: Tape-basiertes Parse-Fundament — Schritt 2 Phase 1.</li>
        <li><strong>v0.5.204</strong>: Lazy Parse + Lazy Stringify — Schritt 2 Phasen 2+4.</li>
        <li><strong>v0.5.206</strong>: Lazy-sicherer indizierter Zugriff + Edge Cases — Schritt 2 Phase 3.</li>
        <li><strong>v0.5.208</strong>: Per-Element-Sparse-Materialisierung — Schritt 2 Phase 5b.</li>
        <li><strong>v0.5.209</strong>: Walk-Cursor + adaptiver Materialize-Threshold.</li>
        <li><strong>v0.5.210</strong>: Lazy Parse zum Default für Blobs ≥1 KB umgelegt.</li>
      </ul>
      <p>
        Das Ergebnis auf der Workload, für die das Lazy-Tape entworfen wurde (10k Records, ~1 MB Blob, Parse → Stringify ohne Zwischen-Iteration):
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Implementierung</th>
              <th className="text-right py-2 px-3">Median (ms)</th>
              <th className="text-right py-2 px-3">p95 (ms)</th>
              <th className="text-right py-2 px-3">σ</th>
              <th className="text-right py-2 px-3">Peak RSS</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">c++ <code>-O3 -flto</code> (simdjson)</td><td className="text-right py-2 px-3">24</td><td className="text-right py-2 px-3">28</td><td className="text-right py-2 px-3">1.2</td><td className="text-right py-2 px-3">8 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3 text-amber-400 font-semibold">perry (gen-gc + lazy tape)</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">75</td><td className="text-right py-2 px-3">91</td><td className="text-right py-2 px-3">6.9</td><td className="text-right py-2 px-3">85 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">rust serde_json (LTO)</td><td className="text-right py-2 px-3">185</td><td className="text-right py-2 px-3">190</td><td className="text-right py-2 px-3">1.7</td><td className="text-right py-2 px-3">11 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">bun</td><td className="text-right py-2 px-3">259</td><td className="text-right py-2 px-3">342</td><td className="text-right py-2 px-3">26.1</td><td className="text-right py-2 px-3">82 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">node</td><td className="text-right py-2 px-3">394</td><td className="text-right py-2 px-3">602</td><td className="text-right py-2 px-3">60.1</td><td className="text-right py-2 px-3">127 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">kotlin (kotlinx.serialization)</td><td className="text-right py-2 px-3">473</td><td className="text-right py-2 px-3">533</td><td className="text-right py-2 px-3">21.4</td><td className="text-right py-2 px-3">606 MB</td></tr>
            <tr><td className="py-2 px-3">assemblyscript+json-as (wasmtime)</td><td className="text-right py-2 px-3">598</td><td className="text-right py-2 px-3">621</td><td className="text-right py-2 px-3">10.5</td><td className="text-right py-2 px-3">58 MB</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Perry bei <strong>75 ms Median</strong> ist die schnellste Dynamic-Typing-Runtime im Vergleich — schlägt Bun (259 ms), schlägt Node (394 ms), schlägt Kotlins Server-JIT (453 ms). simdjson bei 24 ms ist die SIMD-beschleunigte C++-Decke und steht absichtlich auf der Seite, nicht hinter einem Cherry-Pick versteckt. Perry schlägt das nicht. Der Punkt ist, die Lücke zu zeigen, sodass es ein Ziel gibt, sie zu schließen — getrackt in <code>docs/json-typed-parse-plan.md</code>.
      </p>
      <p>
        Der ehrliche Begleit-Bench ist <strong>parse-and-iterate</strong>: gleicher Blob, aber jede Iteration summiert <code>nested.x</code> jedes Records, was das Lazy-Tape zur Materialisierung zwingt. Da landet Perry bei <strong>466 ms</strong> — langsamer als die 375 ms des Mark-Sweep-Notausgangs, weil das Tape Overhead zahlt, den es nicht amortisieren kann. Diese Zeile ist in TL;DR §B. Wenn man der Arbeit nicht ausweichen kann, tut das Lazy-Tape nicht so, als ob.
      </p>

      <h2>4. Die Benchmarks-Seite, neu geschrieben</h2>
      <p>
        Drei Dinge haben sich daran verändert, wie Perry Performance-Zahlen präsentiert.
      </p>
      <p>
        <strong>RUNS=11 Median + p95 + σ + min + max, nicht Best-of-N.</strong> Best-of-N lässt Tail-Latenz still unter den Tisch fallen; auf dieser Hardware versteckte es 9,4-Sekunden-Python-<code>accumulate</code>-Outlier und Swift-JSONs 5,3-Sekunden-p95-Spikes. Median bringt die Tails zurück auf die Seite. Die Methodik-Änderung landete in v0.5.248; jede Zelle in TL;DR §A und §B ist RUNS=11 frisch zum <strong>2026-04-25</strong>.
      </p>
      <p>
        <strong>Optimization-Probes sind von echter Runtime-Perf getrennt.</strong> Die fünf Zellen, die Perry bei 12–34 ms vs. Rust/C++ bei 98 ms zeigen — <code>loop_overhead</code>, <code>math_intensive</code>, <code>accumulate</code>, <code>array_read</code>, <code>array_write</code> — messen Compiler-Flag-Posture, nicht Silizium. Sie stehen jetzt in ihrem eigenen Unterabschnitt, mit einem Absatz darüber, der erklärt, dass <code>clang++ -O3 -ffast-math</code> sie auf eine Millisekunde heranbringt. Der Headline-Real-Runtime-Kernel ist <code>loop_data_dependent</code>: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — Perry sitzt mittendrin im No-FMA-Contract-Feld auf einem Kernel, wo der Compiler die Arbeit echt nicht wegfalten kann. Das ist der ehrliche Vergleich.
      </p>
      <p>
        <strong>Peers hinzugefügt.</strong> simdjson (4.3.0) ist jetzt in beiden JSON-Tabellen — die C++-Parse-Throughput-Decke, auf der Seite, sodass eine Leserin die Lücke sehen kann. AssemblyScript mit json-as (1.3.2) ist der nächstliegende installierbare TS-zu-Native-Peer; porffor segfaultete bei der Workload in dieser Größe, Static Hermes ließ sich auf macOS arm64 nicht installieren. Kotlin mit kotlinx.serialization ist in v0.5.241–v0.5.242 zum JSON-Polyglot dazugekommen. Jede Zeile ist echt, jeder Disclaimer steht auf der Seite.
      </p>

      <h2>5. Die Polyglot-Compute-Tabelle</h2>
      <p>
        Die echt-nicht-faltbaren Headline-Kernels, RUNS=11 Median, aktualisiert am 2026-04-25 bei v0.5.249:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Rust</th>
              <th className="text-right py-2 px-3">C++</th>
              <th className="text-right py-2 px-3">Java</th>
              <th className="text-right py-2 px-3">Node</th>
              <th className="text-right py-2 px-3">Bun</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">318</td><td className="text-right py-2 px-3">330</td><td className="text-right py-2 px-3">315</td><td className="text-right py-2 px-3">282</td><td className="text-right py-2 px-3">1022</td><td className="text-right py-2 px-3">589</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_data_dependent</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">235</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">129</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">322</td><td className="text-right py-2 px-3">232</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">1</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">5</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">6</td></tr>
            <tr><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">18</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">18</td><td className="text-right py-2 px-3">21</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Bei <code>fibonacci</code> hält Perry mit dem kompilierten Feld auf 3–15 ms mit. Javas HotSpot-JIT ist ~11% schneller, weil er den rekursiven Call inlined. Bei <code>loop_data_dependent</code> spaltet sich der Kernel in zwei FP-Contract-Cluster: das FMA-Contract-Feld bei ~128 ms (Go-Default, <code>g++ -O3</code> auf Apple Clang — beide fusionieren <code>sum * a + b</code> in ein einzelnes FMADDD) und das No-Contract-Feld bei 229–235 ms (Perry, Rust-Default, Swift, Java ohne <code>-XX:+UseFMA</code>, Bun), das skalares FMUL + FADD ausführt. LLVM matcht das FMA-Feld mit <code>-ffp-contract=fast</code>; Perry aktiviert das nicht standardmäßig. <code>nested_loops</code> ist Cache-bound, nicht Compute-bound; alle landen bei 8–21 ms.
      </p>

      <h2>6. Windows-Toolchain, leichtgewichtig</h2>
      <p>
        Windows-Nutzer brauchen keine Visual-Studio-Installation mehr. <strong>v0.5.199</strong> schloss <a href="https://github.com/PerryTS/perry/issues/176" className="text-amber-400 hover:text-amber-300">#176</a>: <code>perry setup windows</code> + winget LLVM + xwin ersetzt den ganzen VS-BuildTools-Baum. <code>v0.5.201</code> entfernte das cfg-Gate auf <code>find_lld_link</code> / <code>find_perry_windows_sdk</code>, sodass die Path-Discovery auf jeder Plattform funktioniert, die Windows targetiert, nicht nur auf macOS-Hosts.
      </p>
      <pre><code>{`# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Runtime-Korrektheits-Pass</h2>
      <p>
        Ein Thema des Zeitraums: stille Runtime-Divergenzen von V8/JSC wurden zu Fixes oder Compile-Fehlern. Die nicht-trivialen:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.255</strong>: <code>BigInt.fromTwos</code>/<code>toTwos</code> Zweierkomplement.</li>
        <li><strong>v0.5.263</strong>: <code>Promise.all</code>/<code>race</code>/<code>any</code> Non-Promise-Type-Diskriminierung.</li>
        <li><strong>v0.5.281</strong>: <code>NaN==NaN</code> + ECMAScript-Number-Formatierung (<code>3 → &bdquo;3&ldquo;</code>, nicht <code>&bdquo;3.0&ldquo;</code>; <code>-0 → &bdquo;0&ldquo;</code>; usw.).</li>
        <li><strong>v0.5.280</strong>: <code>NaN</code>/<code>Infinity</code> ToInt32-Coercion in <code>(x) | 0</code>.</li>
        <li><strong>v0.5.284</strong>: Promise-Microtask-FIFO + Thrown-Handler-Propagation.</li>
        <li><strong>v0.5.286</strong>: <code>JSON.stringify</code> auf einem reinen f64 segfaultete unter Tape-Pfaden.</li>
        <li><strong>v0.5.277</strong>: <code>fs.readFileSync</code> gibt Buffer zurück, wenn keine Encoding übergeben wird (matcht Node).</li>
        <li><strong>v0.5.272</strong>: Chained-Cross-Module-Getter-Dispatch gab <code>undefined</code> zurück.</li>
      </ul>
      <p>
        Stdlib-Follow-ups für Issue <a href="https://github.com/PerryTS/perry/issues/187" className="text-amber-400 hover:text-amber-300">#187</a> wurden aufgefüllt: AsyncLocalStorage Ende-zu-Ende (v0.5.261), commander-Runtime + Codegen, der <code>.action()</code> tatsächlich aufruft (v0.5.250), decimal.js-Code (v0.5.259), Redis ioredis Ende-zu-Ende (v0.5.270), pg + mongo Async-Factory-Pattern (v0.5.275), und derselbe Async-Factory-Bug auf EE/LRU/WSS (v0.5.252).
      </p>
      <p>
        Auf der <code>perry/ui</code>-Seite: Notification-Tap-Callback (#97) verdrahtet über Apple (v0.5.254) und Android (v0.5.258); Schedule + Cancel lokaler Notifications (#96, v0.5.244); FCM Register + Receive auf Android (v0.5.262).
      </p>

      <h2>8. Zusammenfassung</h2>
      <p>
        Das Muster dieser Strecke sind keine Headline-Zahlen. Es ist die Arbeit, die existierende Wins gegen Prüfung bestehen lässt: ein Generationen-GC, der Sustained-Allocation-Workloads abfängt, eine SSO, die die Short-String-Cost-Lücke schließt, eine JSON-Pipeline, die die &bdquo;keine Modifikation&ldquo;-Struktur der häufigsten Workload ausnutzt, und eine Benchmarks-Seite, die Mediane statt Best-of-N misst und simdjsons 24-ms-Parse-Decke in derselben Zeile zeigt wie Perrys 75 ms. Die Leserin sieht die Lücke — und wo Perry relativ zum Boden sitzt.
      </p>
      <p>
        Probier&apos;s aus:
      </p>
      <pre><code>{`# npm (jede Plattform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — keine VS-Installation nötig)
winget install PerryTS.Perry

# Default Benchmark-Suite
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Benchmarks: <a href="https://github.com/PerryTS/perry/blob/main/benchmarks/README.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">benchmarks/README.md</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
