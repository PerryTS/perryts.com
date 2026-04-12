export default function Content() {
  return (
    <>
      <p>
        La migrazione del backend di Perry da Cranelift a LLVM è completata. A partire da v0.5.12, LLVM è l&apos;unico backend di generazione del codice, e Perry ora batte Node.js su 14 dei 15 benchmark — con margini che vanno da 1,06x a 24,6x.
      </p>
      <p>
        Arrivarci non è stato un percorso lineare. Il passaggio iniziale nella v0.5.0 ha reso diversi benchmark <strong>70x più lenti</strong> rispetto alla versione con Cranelift che sostituiva. Questo articolo è la versione estesa di cosa è successo, perché abbiamo fatto il cambio comunque, cosa si è rotto, cosa lo ha sistemato e come appaiono i numeri dall&apos;altra parte.
      </p>
      <p>
        Se stai costruendo un compilatore, valutando backend di codegen, o sei semplicemente curioso di sapere perché &ldquo;passare a LLVM&rdquo; è raramente semplice come sembra, questo articolo è per te.
      </p>

      <h2>Parte 1: Perché cambiare?</h2>
      <p>
        Perry compila TypeScript direttamente in codice macchina nativo. Niente Node, niente V8, niente Electron, niente WebView. La proposta è &ldquo;scrivi TypeScript, distribuisci un binario nativo&rdquo;, e l&apos;intera proposta di valore crolla se quel binario non è effettivamente veloce.
      </p>
      <p>
        Per le prime versioni minori di Perry, il backend di codegen era <a href="https://cranelift.dev/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Cranelift</a>. Cranelift è eccellente — è il codegen dietro wasmtime, è usato dal JIT baseline di SpiderMonkey, ed è lo strumento di riferimento quando serve una compilazione veloce e prevedibile con un&apos;integrazione pulita. Per un progetto che avvia un nuovo linguaggio, era il punto di partenza giusto.
      </p>
      <p>
        Ma due cose alla fine ci hanno spinto ad abbandonarlo.
      </p>

      <h3>1. Il tetto dell&apos;ottimizzatore</h3>
      <p>
        Cranelift è intenzionalmente un compilatore ottimizzante veloce a singolo livello. Il suo mandato è &ldquo;produrre codice decente velocemente&rdquo;, non &ldquo;produrre il miglior codice possibile senza limiti di tempo&rdquo;. È il compromesso giusto per un JIT. È il compromesso sbagliato per un compilatore AOT il cui punto di forza è la performance nativa.
      </p>
      <p>
        LLVM ha ricevuto oltre due decenni di lavoro sul suo middle-end. Vettorizzazione dei cicli, LICM, GVN, SCCP, combinazione di istruzioni, euristiche di inlining, riassociazione fast-math, analisi degli alias — non esiste un universo realistico in cui un progetto più piccolo possa raggiungere questo livello. Se Perry vuole affermare &ldquo;più veloce di Node&rdquo;, abbiamo bisogno di questa machineria.
      </p>

      <h3>2. Il problema arm64_32</h3>
      <p>
        Il fattore scatenante immediato è stato l&apos;Apple Watch. <code>arm64_32</code> è un ABI che Apple ha introdotto per la Series 4 in poi — istruzioni a 64 bit, puntatori a 32 bit. Cranelift non lo supporta, e non c&apos;era un percorso realistico per il suo arrivo. Perché Perry possa affermare credibilmente &ldquo;9 piattaforme da un&apos;unica codebase&rdquo;, watchOS non poteva mancare. LLVM supporta <code>arm64_32</code> nativamente.
      </p>
      <p>
        Una volta accettato che <em>alcuni</em> target avrebbero richiesto LLVM, mantenere due backend è diventato insostenibile. Due backend significano due insiemi di bug, due insiemi di passi di ottimizzazione, due matrici di test, due baseline di performance. La risposta onesta era: sceglierne uno.
      </p>
      <p>Abbiamo scelto LLVM.</p>

      <h2>Parte 2: Una parola su Cranelift</h2>
      <p>
        Prima di proseguire: questo articolo non è una stroncatura di Cranelift. Cranelift è un pezzo brillante di ingegneria, e se stai costruendo un JIT, un runtime sandboxato, o qualsiasi cosa dove la latenza di compilazione conta più del throughput massimo, dovrebbe essere in cima alla tua lista. wasmtime lo usa per ottime ragioni. La Bytecode Alliance sta facendo un lavoro esemplare.
      </p>
      <p>
        Le esigenze di Perry sono semplicemente diverse. Compiliamo in anticipo, distribuiamo il binario una volta, e l&apos;utente lo esegue milioni di volte. Questa asimmetria — compilare raramente, eseguire sempre — è esattamente il regime in cui l&apos;ottimizzatore più pesante di LLVM si ripaga. Strumento diverso per un lavoro diverso.
      </p>

      <h2>Parte 3: Il disastro del passaggio</h2>
      <p>
        v0.5.0 è stata la prima release con LLVM come unico backend. Ci aspettavamo una leggera regressione nel tempo di compilazione e un miglioramento significativo nelle performance a runtime. Abbiamo ottenuto l&apos;opposto del secondo punto.
      </p>
      <p>Ecco la tabella che non volevo pubblicare all&apos;epoca:</p>

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
        Alcuni carichi di lavoro sono diventati più veloci. La maggior parte è peggiorata drasticamente. <code>method_calls</code> — uno dei benchmark più importanti perché rappresenta l&apos;uso idiomatico delle classi TypeScript — era quasi 70x peggiore di ciò che avevamo distribuito due release prima.
      </p>

      <h3>Cosa è andato storto davvero</h3>
      <p>
        Perry usa il <strong>NaN-boxing</strong> per la rappresentazione dei valori. Ogni valore TypeScript è una parola a 64 bit. I numeri f64 sono memorizzati direttamente; tutto il resto (oggetti, stringhe, booleani, undefined, null) è codificato nei bit inutilizzati di un IEEE 754 quiet NaN.
      </p>
      <p>
        Il vantaggio: i numeri sono a costo zero. Niente boxing, niente tagging, nessuna allocazione per l&apos;aritmetica.
      </p>
      <p>
        Lo svantaggio: ogni operazione su un valore non numerico richiede manipolazione di bit per scompattare, operare e ricompattare. Se quelle sequenze sono IR inline nel tuo codegen, l&apos;ottimizzatore può fonderle e semplificarle. Se sono <strong>chiamate a funzioni helper del runtime</strong>, l&apos;ottimizzatore vede una chiamata opaca e si arrende.
      </p>
      <p>
        Il nostro backend Cranelift aveva accumulato un gran numero di lowering inline per le operazioni calde — caricamenti di proprietà, dispatch di metodi, allocazione di oggetti, aritmetica intera su valori taggati f64. Il passaggio a LLVM, nell&apos;interesse di produrre prima codice <em>corretto</em>, ha instradato quasi tutte queste operazioni attraverso helper del runtime in <code>perry-runtime</code>. Ogni helper era un&apos;istruzione <code>call</code> in LLVM IR.
      </p>
      <p>
        LLVM è eccellente, ma non può fare inline di una funzione il cui corpo non ha mai visto. <code>perry-runtime</code> viene compilato separatamente, linkato alla fine, e dalla prospettiva dell&apos;ottimizzatore ogni chiamata a un helper è una scatola nera. Il risultato è stato che cicli caldi che il backend Cranelift compilava in ~5 istruzioni di aritmetica inline venivano ora compilati in chiamate di funzione — salvataggio registri, setup dello stack frame, tutto il pacchetto — ripetuto milioni di volte.
      </p>
      <p>
        Da lì venivano i 70x. Non era cattivo codegen. Erano cattive <strong>frontiere di inlining</strong>.
      </p>

      <h2>Parte 4: La soluzione</h2>
      <p>
        Il lavoro per recuperare e superare i numeri di Cranelift è rientrato approssimativamente in sei categorie. Nessuna è esotica. La maggior parte sono ottimizzazioni da manuale del compilatore che dovevano semplicemente essere applicate nei posti giusti.
      </p>

      <h3>1. Bump allocator inline per l&apos;allocazione di oggetti</h3>
      <p>
        <code>object_create</code> era la peggior regressione dopo <code>method_calls</code>. Il vecchio percorso chiamava <code>js_object_alloc_class_with_keys</code> per ogni <code>new Point()</code> — una chiamata di funzione, un accesso a un&apos;arena thread-local, una ricerca nella cache degli shape, e una scrittura del GC header + object header.
      </p>
      <p>
        La soluzione: emettere l&apos;allocazione bump <strong>inline</strong> in LLVM IR. Ogni funzione che alloca oggetti ottiene un puntatore cached a una struttura <code>InlineArenaState</code> thread-local. L&apos;allocazione diventa:
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
        Il percorso veloce consiste in ~13 istruzioni di IR inline che LLVM può vedere, schedulare e sollevare fuori dai cicli. <code>object_create</code> è passato da 318ms a 9ms.
      </p>

      <h3>2. Contatori di ciclo i32</h3>
      <p>
        Il NaN-boxing significa che ogni numero TypeScript è f64. Questo include i contatori dei cicli. Un ciclo <code>{'for (let i = 0; i < 100_000_000; i++)'}</code> con variabili di induzione f64 è un disastro: incremento f64, confronto f64, conversione f64-a-i64 ogni volta che si indicizza un array.
      </p>
      <p>
        Il codegen rileva i cicli for dove la variabile di induzione è dimostrabilmente intera e alloca uno <strong>slot di stack i32 parallelo</strong>. La condizione del ciclo passa da <code>fcmp</code> a <code>icmp slt i32</code>, eliminando completamente il contatore f64.
      </p>
      <p>
        Questo ha portato <code>array_write</code> da 11ms a 3ms, <code>nested_loops</code> da 18ms a 9ms, e <code>array_read</code> da 11ms a 4ms.
      </p>

      <h3>3. Flag fast-math</h3>
      <p>
        Aggiungiamo i flag <code>reassoc contract</code> a ogni istruzione aritmetica f64. <code>reassoc</code> permette a LLVM di spezzare le catene di accumulatore seriali in parallele, e <code>contract</code> consente il multiply-add fuso. Manteniamo <code>nnan</code> e <code>ninf</code> disattivati perché Perry usa i bit NaN come tag di valore.
      </p>
      <p>
        Con quei flag, il vettorizzatore di cicli di LLVM si attiva su <code>math_intensive</code>, che è passato da 131ms a 14ms — battendo Node di 3,5x.
      </p>

      <h3>4. Percorso veloce per il modulo intero</h3>
      <p>
        <code>%</code> su f64 in JavaScript è <code>fmod</code>, che è una chiamata libm su ARM. Ma per operandi f64 a valore intero, possiamo fare <code>fptosi → srem → sitofp</code> e saltare completamente il viaggio di andata e ritorno per libm. Il codegen usa l&apos;analisi statica per rilevare operandi a valore intero — nessun controllo a runtime necessario.
      </p>
      <p>
        Questa è l&apos;intera ragione per cui <code>factorial</code> è passato da 1.553ms a 24ms — e dai 591ms di Node a 24ms. <strong>24,6x più veloce di Node.</strong>
      </p>

      <h3>5. LICM per i cicli annidati</h3>
      <p>
        LLVM fa loop-invariant code motion nativamente, ma il NaN-boxing nasconde la struttura. <code>arr.length</code> si traduce in un load attraverso un puntatore NaN-boxed con un controllo del tag — non ovviamente invariante.
      </p>
      <p>
        Il codegen rileva il pattern <code>{'for (...; i < arr.length; ...)'}</code> e pre-carica la lunghezza in uno slot di stack prima del ciclo, con un walker statico che verifica che il corpo del ciclo non possa cambiare la lunghezza dell&apos;array. Quando il contatore è limitato da questa lunghezza sollevata, IndexGet/IndexSet saltano completamente i controlli dei limiti.
      </p>

      <h3>6. Oggetti con cache degli shape</h3>
      <p>
        Quando il codegen conosce la classe di un oggetto, risolve gli offset dei campi a tempo di compilazione ed emette <strong>load indicizzati diretti</strong> — nessun dispatch a runtime. Per il dispatch dei metodi, <code>obj.method(args)</code> diventa un <code>call @perry_method_Class_name(this, args)</code> diretto — nessuna vtable, nessun inline cache, nessuna ricerca hash.
      </p>
      <p>
        Il passaggio a LLVM aveva fatto regredire tutto al percorso lento universale. Ripristinare il dispatch statico ci ha dato il recupero di <code>method_calls</code> — da 1.084ms a 1ms. <strong>11x più veloce di Node.</strong>
      </p>

      <h2>Parte 5: I numeri oggi</h2>
      <p>Mediana di tre esecuzioni, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:</p>

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
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">932ms</td><td className="text-right py-2 px-3">991ms</td><td className="text-right py-2 px-3 text-green-400">1.06x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">binary_trees</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3 text-slate-400">tied</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">mandelbrot</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3 text-slate-400">tied</td></tr>
            <tr><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-red-400">0.9x</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        14 vittorie su 15. L&apos;unica sconfitta è <code>object_create</code>, dove l&apos;allocatore di V8 è genuinamente eccellente e siamo entro il 12%.
      </p>

      <h2>Parte 6: La questione del tempo di compilazione</h2>
      <p>
        La ragione numero uno per cui le persone scelgono Cranelift rispetto a LLVM è la velocità di compilazione. Quindi parliamone.
      </p>
      <p>
        LLVM ha aumentato il tempo di compilazione per file di Perry di <strong>20-50ms</strong>, ovvero circa <strong>8-19%</strong>. Non 5x. Non 2x. Percentuale a singola cifra o bassa doppia cifra.
      </p>
      <p>
        Il motivo è che il codegen non è il collo di bottiglia nella pipeline di Perry. La ripartizione per un file tipico:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>SWC parsing: ~30%</li>
        <li>HIR lowering (AST → IR, inferenza dei tipi): ~25%</li>
        <li>Passi di trasformazione IR (conversione delle closure, async lowering, inlining): ~15%</li>
        <li><strong>Codegen (emissione di testo LLVM IR + <code>clang -c -O3</code>): ~20%</strong></li>
        <li>Linking (<code>cc</code> + libreria runtime): ~10%</li>
      </ul>
      <p>
        Il codegen è una fetta su cinque. Anche raddoppiando quella fetta, il totale si muove solo del 5-10%. Se stai costruendo un compilatore AOT dove l&apos;utente digita <code>perry compile</code> una volta e poi esegue il binario per sempre, il calcolo è: spendere 25ms in più alla compilazione, risparmiare fino a 24x a ogni singola esecuzione.
      </p>

      <h2>Parte 7: Cosa farei diversamente</h2>
      <p>
        Se iniziassi Perry oggi e potessi saltare direttamente a LLVM, non lo farei. La fase Cranelift è stata genuinamente preziosa. Ci ha permesso di iterare sul frontend senza la tassa di complessità di LLVM, ci ha dato una baseline funzionante contro cui confrontarci, e ci ha costretto a mantenere il nostro HIR abbastanza pulito da essere portabile tra i backend.
      </p>
      <p>
        Ciò che farei diversamente è il passaggio stesso. Abbiamo rilasciato v0.5.0 con la maggior parte delle operazioni che passavano attraverso chiamate a helper del runtime, con l&apos;intenzione di inlinearle in seguito. È stato un errore. L&apos;ordine giusto sarebbe stato: identificare prima i percorsi caldi, abbassarli inline prima del passaggio, e rilasciare solo quando il backend LLVM fosse almeno a parità.
      </p>
      <p>
        La lezione è quella noiosa: le frontiere di ottimizzazione contano più della qualità dell&apos;ottimizzatore. LLVM è un software straordinario, ma non può aiutarti con codice che non riesce a vedere. Se il tuo codegen instrada tutto attraverso chiamate opache al runtime, hai costruito un muro tra il tuo programma sorgente e ogni passo di ottimizzazione esistente.
      </p>

      <h2>Conclusione</h2>
      <p>
        Perry ora è esclusivamente LLVM, più veloce di Node su 14 dei 15 benchmark, e in produzione. La migrazione ha richiesto più tempo di quanto pianificato, ha fatto più male del previsto nel mezzo, ed è inequivocabilmente la decisione giusta col senno di poi. Cranelift ci ha portato fino alla v0.5; LLVM ci porta per il resto del cammino.
      </p>
      <p>Se vuoi provare Perry:</p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}— Esegui i benchmark tu stesso: <code>cd benchmarks/suite && ./run_benchmarks.sh</code>
      </p>
      <p>
        Se hai domande, trovi bug, o vuoi discutere di backend di codegen, le issue su GitHub sono aperte. Le leggo tutte.
      </p>
      <p>— Ralph</p>
    </>
  );
}
