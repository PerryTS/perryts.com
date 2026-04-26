export default function Content() {
  return (
    <>
      <p>
        L&apos;ultimo articolo si chiudeva alla <strong>v0.5.174</strong> con un titolo solo: Perry stava finalmente vincendo ogni benchmark della suite in-tree sia contro Node che contro Bun. Tre giorni di lavoro e un arretrato di commit su GC + JSON dopo, Perry è alla <strong>v0.5.306</strong> — si tratta di <strong>132 patch release</strong> — e la storia è un&apos;altra. Il titolo non è uno speedup di 547x o una nuova colonna di vittorie. È il lavoro che rende quelle vittorie difendibili.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Il <strong>GC generazionale</strong> viene spedito come default. Le fasi A fino a D sono atterrate fra la v0.5.217 e la v0.5.237.</li>
        <li>La <strong>Small String Optimization</strong> viene spedita come default. Gli step 1.5 → 2 sono atterrati fra la v0.5.213 e la v0.5.216.</li>
        <li>La <strong>pipeline JSON</strong> ha ottenuto un parser tape-based, parse lazy, stringify lazy, e materializzazione sparsa per-elemento. Il default validate-and-roundtrip è ora <strong>75 ms mediani</strong> — il migliore nel gruppo a tipizzazione dinamica.</li>
        <li>La <strong>pagina dei benchmark</strong> è stata riscritta da capo a piedi con <strong>RUNS=11 mediana + p95 + σ + min + max</strong>, simdjson e AssemblyScript+json-as aggiunti come pari, le sonde di ottimizzazione separate dai confronti reali, e ogni debolezza di Perry è stata fatta emergere onestamente.</li>
      </ul>
      <p>
        Il contorno è una serie costante di correzioni di correttezza: FIFO dei microtask delle Promise, uguaglianza NaN e formattazione dei numeri ECMAScript, complemento a due di BigInt, AsyncLocalStorage end-to-end, runtime di decimal.js + ioredis + commander, e un segfault in JSON.stringify su un f64 puro che si nascondeva sotto i percorsi tape. In più la toolchain Windows finalmente diventa leggera: LLVM + xwin, niente installazione di Visual Studio richiesta.
      </p>

      <h2>1. GC generazionale, attivo di default</h2>
      <p>
        Il GC generazionale è stato un roll-out a fasi durato due mesi. Il riepilogo delle fasi che si sono chiuse in questa finestra:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.217–v0.5.221</strong> — Fase A: scaffolding del runtime per lo shadow-stack, emissione di push/pop, threading della slot-map, mirroring shadow di <code>Let</code>/<code>LocalSet</code>, e lo scanner delle root.</li>
        <li><strong>v0.5.222</strong> — Fase B: split arena nursery + old-gen.</li>
        <li><strong>v0.5.223–v0.5.225</strong> — Fase C1–C2: infrastruttura runtime delle write-barrier, il codegen emette la barrier, ogni store sull&apos;heap ci passa attraverso.</li>
        <li><strong>v0.5.226–v0.5.228</strong> — Fase C3a–C4: le root del remembered-set fluiscono nel mark + clear; il trace della GC minor salta l&apos;old-gen; tenuring non-moving.</li>
        <li><strong>v0.5.229–v0.5.236</strong> — Fase C4b α/β/γ/δ: infrastruttura dei forwarding-pointer, pass di pinning + evacuation, scanner + pinning transitivo, riscrittura dei riferimenti, blocchi nursery inattivi restituiti all&apos;OS, trigger della GC con tetto alla soglia iniziale.</li>
        <li><strong>v0.5.237</strong> — Fase D parte 1: <code>PERRY_GEN_GC=1</code> di default.</li>
        <li><strong>v0.5.238</strong> — Fase D parte 2: <code>PERRY_SHADOW_STACK=1</code> di default.</li>
        <li><strong>v0.5.239–v0.5.240</strong> — chiusura della documentazione: roadmap finalizzata, appendice con la lineage accademica + industriale (Bartlett 1988, Ungar 1984, Cheney 1970).</li>
      </ul>
      <p>
        La vittoria misurata che ha contato di più: <code>test_memory_json_churn</code> è sceso da <strong>115 MB → 91 MB</strong> di RSS di picco nel momento esatto in cui il default del gen-GC è stato capovolto. Le regressioni di calcolo sono state piccole ed elencate senza scuse — <code>nested_loops</code> 8 → 18 ms, <code>accumulate</code> 24 → 34 ms, <code>object_create</code> 0 → 1 ms, <code>array_read</code> / <code>array_write</code> +1 ms ciascuna. La via di fuga (<code>PERRY_GEN_GC=0</code>) recupera i vecchi numeri; il compromesso è stato deliberato, e la pagina dei benchmark ora elenca entrambe le righe affiancate così che chi legge possa scegliere.
      </p>

      <h2>2. Small String Optimization, attiva di default</h2>
      <p>
        La SSO è una rappresentazione di stringa inline da 22 byte che evita l&apos;allocazione sull&apos;heap per le stringhe corte — le tipiche chiavi JSON (2–8 byte) e i valori brevi finiscono nella forma inline. Il rollout è stato minuscolo in superficie e grande sotto il cofano:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.213</strong>: infrastruttura SSO (rappresentazione + accessor).</li>
        <li><strong>v0.5.214</strong>: armamento dei consumer dello Step 1 + gate <code>PERRY_SSO_FORCE</code> per i test.</li>
        <li><strong>v0.5.215</strong>: branch a tre vie del codegen <code>PropertyGet</code> dello Step 1.5 — fast path per le stringhe inline, fast path per le stringhe sull&apos;heap, slow path per il residuo.</li>
        <li><strong>v0.5.216</strong>: capovolgimento dello Step 2 — emissione SSO di default.</li>
      </ul>
      <p>
        I follow-up nella v0.5.279 hanno chiuso l&apos;ultimo bug NaN nelle property-read che è emerso una volta che la SSO era calda, e la correzione del dispatch dei getter cross-module concatenati nella v0.5.272 ne ha chiuso un altro. Entrambi erano sulla punch list prima che il default venisse capovolto; entrambi sono stati spediti senza una regressione di performance.
      </p>

      <h2>3. JSON: parse tape-based, lazy di default</h2>
      <p>
        La pipeline JSON ha ricevuto la riscrittura più invasiva del periodo. Vecchio comportamento: <code>JSON.parse</code> costruiva un albero completamente materializzato di valori NaN-boxed. Nuovo comportamento: <code>JSON.parse</code> costruisce un tape da 12 byte per valore e materializza pigramente — solo i valori che leggi davvero pagano il costo di materializzazione. Lo stringify su un parse non modificato è ora una memcpy dell&apos;input originale, lo stesso trucco fast-path che simdjson usa con <code>raw_json()</code>.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.200</strong>: <code>JSON.parse&lt;T&gt;(blob)</code> parse schema-directed (Step 1). Una shape nota a tempo di compilazione permette al compilatore di emettere accesso alle chiavi pre-risolto.</li>
        <li><strong>v0.5.203</strong>: fondamenta del parse tape-based — Step 2 Fase 1.</li>
        <li><strong>v0.5.204</strong>: parse lazy + stringify lazy — Step 2 Fasi 2+4.</li>
        <li><strong>v0.5.206</strong>: accesso indicizzato lazy-safe + casi limite — Step 2 Fase 3.</li>
        <li><strong>v0.5.208</strong>: materializzazione sparsa per-elemento — Step 2 Fase 5b.</li>
        <li><strong>v0.5.209</strong>: walk cursor + soglia di materializzazione adattiva.</li>
        <li><strong>v0.5.210</strong>: capovolgimento del parse lazy a default per i blob ≥1 KB.</li>
      </ul>
      <p>
        Il risultato sul workload per cui il tape lazy è stato progettato (10k record, blob da ~1 MB, parse → stringify senza iterazione intermedia):
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Implementazione</th>
              <th className="text-right py-2 px-3">Mediana (ms)</th>
              <th className="text-right py-2 px-3">p95 (ms)</th>
              <th className="text-right py-2 px-3">σ</th>
              <th className="text-right py-2 px-3">RSS di picco</th>
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
        Perry a <strong>75 ms mediani</strong> è il runtime a tipizzazione dinamica più veloce nel confronto — batte Bun (259 ms), batte Node (394 ms), batte il JIT server di Kotlin (453 ms). simdjson a 24 ms è il tetto del C++ accelerato SIMD e vive sulla pagina di proposito, non nascosto dietro un cherry-pick. Perry non lo batte. Il punto è mostrare il divario in modo che chiuderlo abbia un bersaglio — tracciato in <code>docs/json-typed-parse-plan.md</code>.
      </p>
      <p>
        Il bench compagno onesto è <strong>parse-and-iterate</strong>: stesso blob, ma ogni iterazione somma <code>nested.x</code> di ogni record, il che forza il tape lazy a materializzarsi. Lì Perry atterra a <strong>466 ms</strong> — più lento dei 375 ms della via di fuga mark-sweep perché il tape paga un overhead che non riesce ad ammortizzare. Quella riga è in TL;DR §B. Quando non puoi evitare il lavoro, il tape lazy non finge di poterlo fare.
      </p>

      <h2>4. La pagina dei benchmark, riscritta</h2>
      <p>
        Tre cose sono cambiate riguardo a come Perry presenta i numeri di performance.
      </p>
      <p>
        <strong>RUNS=11 mediana + p95 + σ + min + max, non best-of-N.</strong> Il best-of-N fa silenziosamente sparire la latenza di coda; su questo hardware stava nascondendo gli outlier di <code>accumulate</code> di Python da 9,4 secondi e i picchi p95 da 5,3 secondi del JSON di Swift. La mediana rimette le code sulla pagina. Il cambio di metodologia è atterrato nella v0.5.248; ogni cella in TL;DR §A e §B è RUNS=11 fresca al <strong>2026-04-25</strong>.
      </p>
      <p>
        <strong>Le sonde di ottimizzazione sono separate dalla performance reale del runtime.</strong> Le cinque celle che mostrano Perry a 12–34 ms contro Rust/C++ a 98 ms — <code>loop_overhead</code>, <code>math_intensive</code>, <code>accumulate</code>, <code>array_read</code>, <code>array_write</code> — misurano la postura sui flag del compilatore, non il silicio. Adesso sono in una loro sottosezione, con un paragrafo sopra che spiega che <code>clang++ -O3 -ffast-math</code> le chiude a entro un millisecondo. Il kernel headline di runtime reale è <code>loop_data_dependent</code>: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — Perry sta esattamente al centro del gruppo no-FMA-contract su un kernel dove il compilatore davvero non può ripiegare via il lavoro. Quello è il confronto onesto.
      </p>
      <p>
        <strong>Pari aggiunti.</strong> simdjson (4.3.0) è ora in entrambe le tabelle JSON — il tetto della throughput di parse C++, sulla pagina così che chi legge possa vedere il divario. AssemblyScript con json-as (1.3.2) è il pari TS-to-native installabile più vicino; porffor ha fatto segfault sul workload a questa dimensione, Static Hermes non si è voluto installare su macOS arm64. Kotlin con kotlinx.serialization si è unita al poliglotta JSON nelle v0.5.241–v0.5.242. Ogni riga è reale, ogni disclaimer è sulla pagina.
      </p>

      <h2>5. La tabella di calcolo poliglotta</h2>
      <p>
        I kernel headline genuinamente non-foldable, mediana RUNS=11, aggiornati al 2026-04-25 alla v0.5.249:
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
        Su <code>fibonacci</code>, Perry si allinea al gruppo dei compilati entro 3–15 ms. Il JIT HotSpot di Java è ~11% più veloce grazie all&apos;inlining della chiamata ricorsiva. Su <code>loop_data_dependent</code>, il kernel si divide in due cluster di FP-contract: il gruppo FMA-contract a ~128 ms (Go di default, <code>g++ -O3</code> su Apple Clang — entrambi fondono <code>sum * a + b</code> in un singolo FMADDD) e il gruppo no-contract a 229–235 ms (Perry, Rust di default, Swift, Java senza <code>-XX:+UseFMA</code>, Bun) che eseguono FMUL + FADD scalari. LLVM si allinea al gruppo FMA con <code>-ffp-contract=fast</code>; Perry non lo abilita di default. <code>nested_loops</code> è cache-bound, non compute-bound; tutti atterrano a 8–21 ms.
      </p>

      <h2>6. Toolchain Windows, leggera</h2>
      <p>
        Gli utenti Windows non hanno più bisogno di un&apos;installazione di Visual Studio. La <strong>v0.5.199</strong> ha chiuso la <a href="https://github.com/PerryTS/perry/issues/176" className="text-amber-400 hover:text-amber-300">#176</a>: <code>perry setup windows</code> + winget LLVM + xwin sostituiscono l&apos;intero albero VS BuildTools. La <code>v0.5.201</code> ha fatto cadere il cfg gate su <code>find_lld_link</code> / <code>find_perry_windows_sdk</code> così che la scoperta dei path funzioni su ogni piattaforma che fa target su Windows, non solo sugli host macOS.
      </p>
      <pre><code>{`# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Pass di correttezza del runtime</h2>
      <p>
        Un tema del periodo: le divergenze silenziose di runtime da V8/JSC sono diventate o correzioni o errori di compilazione. Quelle non banali:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.255</strong>: complemento a due di <code>BigInt.fromTwos</code>/<code>toTwos</code>.</li>
        <li><strong>v0.5.263</strong>: discriminazione del tipo non-promise di <code>Promise.all</code>/<code>race</code>/<code>any</code>.</li>
        <li><strong>v0.5.281</strong>: <code>NaN==NaN</code> + formattazione dei numeri ECMAScript (<code>3 → &quot;3&quot;</code>, non <code>&quot;3.0&quot;</code>; <code>-0 → &quot;0&quot;</code>; ecc.).</li>
        <li><strong>v0.5.280</strong>: coercion ToInt32 di <code>NaN</code>/<code>Infinity</code> in <code>(x) | 0</code>.</li>
        <li><strong>v0.5.284</strong>: FIFO dei microtask delle Promise + propagazione degli handler che hanno fatto throw.</li>
        <li><strong>v0.5.286</strong>: <code>JSON.stringify</code> di un f64 puro faceva segfault sotto i percorsi tape.</li>
        <li><strong>v0.5.277</strong>: <code>fs.readFileSync</code> restituisce un Buffer quando non viene passato un encoding (combacia con Node).</li>
        <li><strong>v0.5.272</strong>: il dispatch dei getter cross-module concatenati restituiva <code>undefined</code>.</li>
      </ul>
      <p>
        I follow-up della stdlib per la issue <a href="https://github.com/PerryTS/perry/issues/187" className="text-amber-400 hover:text-amber-300">#187</a> si sono riempiti: AsyncLocalStorage end-to-end (v0.5.261), runtime di commander + codegen che invoca davvero <code>.action()</code> (v0.5.250), codice di decimal.js (v0.5.259), Redis ioredis end-to-end (v0.5.270), pattern async-factory di pg + mongo (v0.5.275), e lo stesso bug async-factory su EE/LRU/WSS (v0.5.252).
      </p>
      <p>
        Sul lato <code>perry/ui</code>: la callback del tap delle notifiche (#97) cablata sia su Apple (v0.5.254) che su Android (v0.5.258); schedule + cancel delle notifiche locali (#96, v0.5.244); registrazione + ricezione FCM su Android (v0.5.262).
      </p>

      <h2>8. In chiusura</h2>
      <p>
        Il pattern di questo periodo non sono numeri da titolo. È il lavoro che fa sopravvivere allo scrutinio le vittorie esistenti: un GC generazionale che cattura i workload ad allocazione sostenuta, una SSO che chiude il divario di costo delle stringhe corte, una pipeline JSON che sfrutta la struttura di &ldquo;nessuna modifica&rdquo; del workload più comune, e una pagina dei benchmark che misura mediane invece di best-of-N e mostra il tetto di parse di simdjson a 24 ms sulla stessa riga dei 75 ms di Perry. Chi legge può vedere il divario — e dove sta Perry rispetto al pavimento.
      </p>
      <p>
        Provalo:
      </p>
      <pre><code>{`# npm (qualsiasi piattaforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — niente installazione VS richiesta)
winget install PerryTS.Perry

# Suite di benchmark di default
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
