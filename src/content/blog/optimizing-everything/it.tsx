export default function Content() {
  return (
    <>
      <p>
        L&apos;ultimo articolo del blog è uscito con Perry alla v0.5.12. Oggi siamo alla v0.5.80. Sono <strong>68 patch release in sette giorni</strong>, concentrate quasi interamente su una cosa sola: trasformare ogni percorso lento rimasto in un percorso veloce.
      </p>
      <p>
        Il passaggio a LLVM nella v0.5.0 è tornato alla parità con Cranelift entro la v0.5.12. Quella era la fine di una storia e l&apos;inizio di un&apos;altra. LLVM ora vede tutto. La domanda ha smesso di essere &ldquo;perché questo è lento?&rdquo; ed è diventata &ldquo;perché questo non è già veloce?&rdquo; — una domanda molto più trattabile.
      </p>
      <p>
        Questo articolo è una panoramica della settimana. JSON ha ottenuto uno speedup di 547x. mimalloc è diventato l&apos;allocatore globale. L&apos;accesso alle proprietà ha guadagnato una inline cache monomorfica. I Buffer hanno ottenuto slot di puntatori tipizzati con metadati <code>noalias</code>. I server Fastify e WebSocket hanno smesso di crashare dopo un minuto. E i benchmark si sono mossi di nuovo.
      </p>

      <h2>1. JSON: colmare un divario di 547x</h2>
      <p>
        Alla v0.5.29, JSON.parse di Perry su un array di 20 record era <strong>547x più lento di Node</strong>. Alla v0.5.46 era 1,3x. Quel numero è il più grande delta singolo della settimana, e vale la pena ripercorrerlo perché ogni altra ottimizzazione in questo articolo è una variazione sullo stesso tema: non fare lavoro che non devi fare.
      </p>
      <p>
        Il parser originale allocava un Vec per ogni proprietà, un Vec di chiavi per ogni oggetto, e un thread-local protetto da RefCell per la cache delle chiavi. Copiava ogni stringa. Ri-hashava ogni nome di campo. Costruiva uno shape di oggetto nuovo di zecca per ogni record, anche quando tutti e 20 i record avevano esattamente gli stessi campi nello stesso ordine. Il parser di Node gestisce questo notando il pattern e condividendo un singolo shape fra tutti i record. Quello di Perry no.
      </p>
      <p>La soluzione è arrivata in quattro passi:</p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Interning delle chiavi tramite una <code>PARSE_KEY_CACHE</code> thread-local</strong> (v0.5.45). Il primo record alloca N stringhe di chiavi; i record dal 2 al 20 allocano zero. Le chiavi ripetute si risolvono nello stesso puntatore, il che le rende utilizzabili come chiavi di lookup della shape-cache senza uno strcmp.</li>
        <li><strong>Condivisione degli shape tramite la transition cache</strong> (v0.5.45). Gli oggetti costruiti da <code>js_object_set_field_by_name</code> percorrono lo stesso grafo di transizioni. Quando lo schema si ripete, il puntatore <code>keys_array</code> è condiviso, ed è esattamente ciò di cui una inline cache polimorfica ha bisogno per colpire il bersaglio.</li>
        <li><strong>Parsing di stringhe zero-copy + costruzione incrementale dell&apos;oggetto</strong> (v0.5.46). <code>parse_string_bytes</code> ora restituisce <code>ParsedStr::Borrowed(&amp;[u8])</code> quando non ci sono escape con backslash — che è il caso comune per ogni chiave e la maggior parte dei valori. <code>parse_object</code> scrive i campi direttamente invece di raccoglierli prima in un Vec.</li>
        <li><strong>Soppressione del GC durante il parse</strong> (v0.5.60, chiude #59). Il parsing di un array grande alloca migliaia di piccoli oggetti in un ciclo stretto. Ognuno di essi stuzzicava il controllo della soglia del GC. Impostare un flag &ldquo;parsing in corso&rdquo; rimanda la collection fino al termine del parse — stessa dimensione effettiva dell&apos;heap, molti meno branch di bookkeeping.</li>
      </ol>
      <p>
        Poi la stringify. JSON.stringify su array omogenei — stesso shape, milioni di volte — faceva un&apos;iterazione completa delle proprietà per ogni oggetto, che per un array shape-stabile è puro spreco. Una correzione in cinque passi ha chiuso anche la maggior parte di quel divario:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>v0.5.62: fast path itoa / ryu per i numeri, controllo dei riferimenti circolari basato sulla profondità invece di un HashSet.</li>
        <li>v0.5.63: guard <code>toJSON</code> + cache persistente delle chiavi + dispatch inline (i tre costi per chiamata che sommati facevano la differenza).</li>
        <li>v0.5.65: template di stringify per shape omogenei + fast path per escape ASCII. Quando ogni elemento ha lo stesso shape, l&apos;impalcatura di chiavi/due punti/virgole viene precalcolata una sola volta.</li>
        <li>v0.5.70, v0.5.72, v0.5.75: cache dello shape-template per chiamata, chiusura del divario GC residuo del parse, eliminazione dell&apos;overhead fisso per chiamata rimanente.</li>
        <li>v0.5.79: il percorso per valori piccoli. Numeri, booleani e stringhe corte passano per un percorso diretto che non configura nessuna della machineria degli oggetti.</li>
      </ul>
      <p>
        Il risultato cumulativo: una pipeline JSON che era <strong>547x più lenta di Node</strong> all&apos;inizio della settimana è ora circa <strong>1,3x più lenta sul parse e competitiva sulla stringify</strong>, su workload realistici.
      </p>

      <h2>2. La storia dell&apos;allocatore</h2>
      <p>
        Perry alloca parecchio. Ogni literal di oggetto, ogni literal di array, ogni concatenazione di stringhe, ogni closure. L&apos;allocatore è caldo, e per la maggior parte della v0.5 è stato l&apos;allocatore di sistema predefinito di Rust più un&apos;arena thread-local per i valori di breve durata.
      </p>
      <p>
        La v0.5.67 ha sostituito l&apos;allocatore globale con <strong>mimalloc</strong>. È una modifica di una sola riga in Cargo.toml che ripaga immediatamente su qualsiasi workload che fa molte piccole allocazioni — che è ogni programma TypeScript. La v0.5.66 l&apos;ha preceduta consolidando tutto lo stato thread-local di <code>gc_malloc</code> in un singolo accesso TLS per chiamata, in modo che il percorso verso mimalloc fosse il più economico possibile.
      </p>
      <p>
        La v0.5.68 ha spinto oltre con le <strong>stringhe allocate in arena</strong>. Le stringhe di breve durata (risultati intermedi di concat, pezzi di <code>split()</code>, scratch del parser) saltano completamente l&apos;allocatore globale e atterrano in un&apos;arena bump per-thread che si resetta ai confini naturali. Per il parsing JSON, questo da solo è stato un guadagno percentuale a due cifre.
      </p>
      <p>
        E le due ottimizzazioni che non allocano affatto:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Scalar replacement di oggetti non-escaping</strong> (v0.5.17, poi object literal nella v0.5.76). Se un oggetto non lascia mai la sua funzione contenitore, non ha bisogno di esistere. I suoi campi diventano semplici locali. LLVM gestisce questo out-of-the-box, una volta che smetti di nascondere l&apos;oggetto dietro una chiamata opaca all&apos;allocatore.</li>
        <li><strong>Scalar replacement di array non-escaping</strong> (v0.5.73). Stessa idea — se l&apos;array non esce dalla funzione, i suoi elementi diventano valori SSA e l&apos;intera allocazione sparisce.</li>
      </ul>
      <p>
        Per il percorso degli array literal in particolare, la v0.5.69 ha aggiunto un <strong>fast path di dimensione esatta</strong> (salta la machineria di crescita della capacità quando la dimensione è nota a tempo di compilazione), e la v0.5.74 ha inlineato l&apos;IR del bump allocator per piccoli array literal in modo che LLVM possa vedere l&apos;allocazione, piegarla, sollevarla o eliminarla. I benchmark array-heavy si sono mossi di un ulteriore passo.
      </p>
      <p>
        A chiudere il cerchio, la v0.5.25 ha corretto un bug più silenzioso: <code>gc_malloc</code> non innescava la collection sul proprio percorso, quindi i workload malloc-heavy potevano far crescere l&apos;heap senza limiti prima che qualcosa lo controllasse. La v0.5.61 ha aggiunto un dimensionamento adattivo dello step alla soglia, che è quello che vuoi davvero: controllare a basso costo quando l&apos;heap è piccolo, meno spesso quando è grande.
      </p>

      <h2>3. L&apos;accesso alle proprietà ha guadagnato una vera inline cache</h2>
      <p>
        Ogni motore JavaScript moderno ha una inline cache polimorfica (PIC) sull&apos;accesso alle proprietà. Per la maggior parte della serie v0.5 di Perry, PropertyGet passava per un lookup nella shape-table con un hash thread-local. Va bene per codice freddo. Non va bene quando il 95% delle letture di proprietà in un dato call site vedono lo stesso shape, che è quasi sempre il caso.
      </p>
      <p>
        La v0.5.44 ha introdotto una <strong>inline cache monomorfica</strong> per <code>PropertyGet</code>. Ogni call site di PropertyGet ottiene una entry della cache per-callsite: un puntatore allo shape atteso e un offset del campo. Il percorso hit è un singolo compare più un load indicizzato. Il percorso miss cade in un helper lento che aggiorna la cache.
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
        La v0.5.51 ha aggiunto una <strong>shape-transition cache basata su content-hash</strong> per le scritture dinamiche di proprietà. Due oggetti che crescono con gli stessi campi nello stesso ordine hashano alla stessa transizione, quindi finiscono per condividere lo stesso shape — e questo significa che il lato read della PIC effettivamente colpisce.
      </p>
      <p>
        La v0.5.55 ha rimosso l&apos;ultimo accesso TLS dalla transition cache. La v0.5.46 ha corretto un bug del miss-handler della PIC dove oggetti con &gt;8 campi leggevano oltre gli slot inline in memoria non inizializzata (chiude #55). La v0.5.78 ha aggiunto un guard per impedire alla PIC di PropertyGet di indicizzare in receiver non-puntatore come numeri grezzi — cosa che poteva accadere con una raffinazione dei tipi troppo ottimistica ed era uno degli ultimi problemi di stabilità nella IC.
      </p>
      <p>
        Effetto netto: il codice con molte proprietà — che in pratica significa la maggior parte del TypeScript — è circa 2–3x più veloce di quanto fosse una settimana fa, solo grazie alla IC.
      </p>

      <h2>4. Interi, operazioni bitwise e il pattern <code>| 0</code></h2>
      <p>
        Il NaN-boxing rende ogni numero un f64. I programmatori TypeScript scrivono <code>x | 0</code> per forzare la semantica intera. V8 ha passato quindici anni a rendere questo economico. Perry ha passato questa settimana a recuperare.
      </p>
      <p>Lo stack dei cambiamenti, in ordine:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.48</strong>: <code>sdiv</code> per <code>(int / const) | 0</code>. LLVM piega a <code>smulh + asr</code>, che è ~2 cicli contro ~10 per <code>fdiv</code>.</li>
        <li><strong>v0.5.48</strong>: <code>@llvm.assume</code> sui bound di Uint8ArrayGet. Sostituisce il diamante branch+phi del bounds-check con un singolo basic block su cui il vettorizzatore può ragionare.</li>
        <li><strong>v0.5.49</strong>: correzione delle operazioni bitwise con NaN/Infinity per produrre 0 secondo la spec ToInt32. Prima la correttezza.</li>
        <li><strong>v0.5.50</strong>: <code>toint32_fast</code> che salta il guard NaN/Inf da 5 istruzioni quando il valore è noto come finito. Più <code>alwaysinline</code> su piccoli helper e rilevamento del clamp.</li>
        <li><strong>v0.5.52</strong>: target delle funzioni di clamp direttamente con intrinsic <code>smin</code>/<code>smax</code>. Il clamp è il pattern intero più comune dopo l&apos;incremento.</li>
        <li><strong>v0.5.53</strong>: <code>x | 0</code> e <code>x &gt;&gt;&gt; 0</code> su un valore noto come finito diventano un noop &mdash; solo <code>fptosi + sitofp</code>, nessun guard.</li>
        <li><strong>v0.5.56</strong>: operazioni bitwise native su i32; indice e valore i32 in Uint8ArrayGet/Set.</li>
        <li><strong>v0.5.58, v0.5.60</strong>: <code>Math.imul</code> abbassa a una moltiplicazione i32 nativa invece del percorso polyfill. Il rilevamento del polyfill riconosce gli shim <code>Math.imul</code> scritti dall&apos;utente e li sostituisce.</li>
        <li><strong>v0.5.59</strong>: inlining dell&apos;init delle funzioni pure + seeding degli interi locali. L&apos;analisi degli interi function-local riesce a vedere oltre i confini delle chiamate quando la callee è piccola e pura.</li>
        <li><strong>v0.5.37–v0.5.40</strong>: fast path per l&apos;aritmetica intera sul pattern accumulatore. Il classico ciclo <code>for (...) acc += f(i)</code> resta i32 end-to-end quando i tipi lo permettono.</li>
      </ul>
      <p>
        La v0.5.41 è la più sottile. Quando il codegen vede un <code>const K: number[][] = [[...], ...]</code> a livello modulo, abbassa l&apos;intera cosa a una costante piatta <code>[N x i32]</code> in <code>.rodata</code>. <code>K[y][x]</code> diventa un singolo <code>getelementptr + load i32</code>. Combinato con il ponte dell&apos;analisi degli interi nella v0.5.43, è questo che ha dato a <code>image_conv</code> (una sfocatura Gaussiana 5×5 su un frame RGB 4K) uno <strong>speedup di 3x in una singola release</strong>.
      </p>

      <h2>5. Buffer e Uint8Array</h2>
      <p>
        I workload binari — crypto, elaborazione immagini, parsing, networking — vivono in Buffer e Uint8Array. La v0.5.64 ha dato loro <strong>slot di puntatori tipizzati più metadati <code>noalias</code></strong>. Dove un Buffer era un double NaN-boxed in un <code>alloca double</code>, ora è un puntatore grezzo <code>i64</code> in un <code>alloca i64</code>, con annotazioni LLVM che dicono all&apos;ottimizzatore &ldquo;questo puntatore non fa alias con altri puntatori nello scope&rdquo;. Questo sblocca riordinamento di load/store, vettorizzazione e allocazione dei registri che l&apos;ottimizzatore altrimenti si rifiuterebbe di fare.
      </p>
      <p>
        La v0.5.80 ha chiuso l&apos;ultimo problema di correttezza qui: un contatore <code>alias-scope</code> per i buffer a livello modulo che veniva resettato per-funzione, il che in rari casi poteva permettere a LLVM di ragionare attraverso scope che non dovrebbero condividere un ID di scope. Ora il contatore è a livello modulo e la storia <code>noalias</code> è a tenuta stagna.
      </p>
      <p>
        La v0.5.53 ha reso <code>Uint8ArraySet</code> branchless — una store mascherata invece di un if/else che scriveva 0 in caso di out-of-bounds. La v0.5.54 ha aggiunto un <strong>indexOf Two-Way</strong> per pattern più lunghi e uno <code>split</code> allocato in arena, che insieme hanno chiuso la maggior parte del divario sul parsing di Buffer con molte stringhe.
      </p>

      <h2>6. Stringhe: ASCII è il fast path</h2>
      <p>
        Le stringhe JavaScript sono UTF-16, ma la maggior parte delle stringhe del mondo reale (chiavi, identificatori, header HTTP, scaffolding JSON) sono ASCII. La v0.5.71 ha aggiunto un <strong><code>charCodeAt</code> e <code>codePointAt</code> O(1) per stringhe ASCII</strong> — nessuna scansione UTF-16, solo un byte load. La v0.5.20 aveva già fatto sì che <code>indexOf</code>, <code>slice</code> e <code>charAt</code> bypassassero la scansione UTF-16 su ASCII.
      </p>
      <p>
        Una nota di correttezza all&apos;interno della stessa release: <code>String.length</code> ora restituisce le code unit UTF-16 (spec ECMAScript) invece del conteggio dei byte. Era un bug latente in cui <code>&quot;caf&eacute;&quot;.length</code> restituiva 5 invece di 4.
      </p>

      <h2>7. I server ora restano effettivamente attivi</h2>
      <p>
        Il lavoro meno glamour della settimana è stato anche il più visibile per gli utenti: far sì che i server long-running in stile Node — Fastify, ws, http, net — non crashassero dopo pochi minuti.
      </p>
      <p>
        I crash condividevano tutti una causa radice: il GC non conosceva le closure dei listener. Quando scrivi <code>wss.on(&apos;message&apos;, handler)</code>, la closure cattura variabili, che vivono come campi all&apos;interno di una cella allocata dal GC. Se il root scanner del GC non sa di dover visitare quelle celle, le loro catture vengono recuperate e il prossimo evento message dereferenzia memoria liberata.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.26</strong>: root-scan delle closure dei listener di evento di <code>net.Socket</code> (chiude #35).</li>
        <li><strong>v0.5.27</strong>: estensione a <code>ws</code>, <code>http</code>, <code>events</code>, <code>fastify</code>.</li>
        <li><strong>v0.5.28</strong>: registrazione dei global a livello modulo come root del GC (chiude #36). Bug di lifetime un livello sopra.</li>
        <li><strong>v0.5.21</strong>: sicurezza di <code>gc()</code> all&apos;interno degli handler di request di Fastify/WebSocket — la chiamata GC esplicita veniva eseguita mentre gli handler di request tenevano puntatori nell&apos;arena (chiude #31).</li>
      </ul>
      <p>
        Accanto al lavoro sul GC, la v0.5.20 ha spedito un <strong>main event loop</strong> — uno vero, non un placeholder — che mantiene vivi i server WebSocket e basati su timer invece di uscire dopo il ritorno dell&apos;ultima chiamata sincrona (refs #28). È stata la singola correzione più impattante per chiunque provasse a far girare Perry come server HTTP di produzione. Fastify ora rimane attivo. I server WebSocket ora rimangono attivi.
      </p>
      <p>
        La v0.5.19 ha corretto il mismatch dell&apos;ABI SysV AMD64 per gli argomenti/ritorni FFI di JSValue — un problema su Linux dove le chiamate FFI native potevano corrompere silenziosamente gli argomenti. La v0.5.18 ha aggiunto dispatch nativo per <code>axios</code> (get/post/put/delete/patch), inclusi <code>response.status</code> e <code>response.data</code>. La v0.5.30 ha corretto il dispatch di <code>fastify request.header()</code> e <code>request.headers[]</code>, che restituiva undefined per i lookup case-insensitive.
      </p>

      <h2>8. <code>@perry/postgres</code>: il driver che ha reso tutto questo necessario</h2>
      <p>
        Gran parte del lavoro di questa settimana è stato guidato da un workload: far funzionare un <a href="https://github.com/PerryTS/postgres" className="text-amber-400 hover:text-amber-300">driver Postgres</a> completamente compatibile con Node su Perry-native. Il driver è TLS-capable, ha un registro di codec cross-module, supporta cancel/close/notify, e ora esegue benchmark contro <code>pg</code>, <code>postgres.js</code> e <code>tokio-postgres</code>.
      </p>
      <p>Il lavoro di performance lato driver è stato parallelo a quello lato compilatore:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Sollevamento del codec per colonna</strong> ed eliminazione delle copie Buffer per cella. BigInt(string) per int8 per evitare allocazioni intermedie.</li>
        <li><strong>Costruttore di Row dinamico per-shape</strong> per righe in forma di oggetto. Se la tua query restituisce sempre le stesse colonne, il driver costruisce un costruttore di row specializzato per lo shape la prima volta e lo riutilizza — il che, in combinazione con la PIC del compilatore, rende l&apos;accesso ai campi sulle row veloce quanto l&apos;accesso ai campi su qualsiasi altro oggetto.</li>
        <li><strong>Opt-out <code>parseTypes: &apos;minimal&apos;</code></strong> per i chiamanti che vogliono stringhe grezze per int8/numeric/date.</li>
      </ul>
      <p>
        Questo è il ciclo di feedback positivo che il compilatore era sempre stato pensato per abilitare. Un driver reale fa emergere colli di bottiglia reali. Il collo di bottiglia ottiene un riproduttore da una riga archiviato come issue GitHub. Una settimana di fix del compilatore dopo, il driver è più veloce e il compilatore è più veloce anche per tutti gli altri. È l&apos;intero piano, compresso in sette giorni.
      </p>

      <h2>9. Correzioni di correttezza degne di nota</h2>
      <p>
        Il lavoro sulle performance fa emergere problemi di correttezza nel modo in cui il dragaggio di un fiume fa emergere carrelli della spesa. Una lista parziale:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Promise.race</strong> leggeva <code>.value</code> al rigetto invece di <code>.reason</code>, quindi i reject venivano ingoiati silenziosamente (v0.5.13–v0.5.14).</li>
        <li><strong>Promise.any</strong> ora lancia un <code>AggregateError</code> appropriato quando tutte le promise in input vengono rigettate. Aggiunto <code>Promise.withResolvers</code> e corretto l&apos;ordinamento di <code>queueMicrotask</code>.</li>
        <li><strong><code>[...&quot;hello&quot;]</code></strong> ora produce un array di caratteri invece di un oggetto rotto (chiude #16).</li>
        <li><strong>Aritmetica BigInt e coercizione <code>BigInt()</code></strong> (chiude #33). Il fast path bigint i64 (v0.5.29) rende il caso comune economico.</li>
        <li><strong>Buffer.indexOf / Buffer.includes</strong> con un argomento byte numerico confrontavano contro puntatori di buffer invece di valori byte (chiude #56).</li>
        <li><strong>Operazioni bitwise con NaN/Infinity</strong> producono 0 secondo la spec ToInt32 (chiude #57).</li>
        <li><strong>Windows x86_64</strong>: cinque fix specifici per piattaforma — <code>localtime</code>, discovery di <code>clang</code> e una manciata di aggiustamenti del codegen — hanno riportato Windows x86_64 in verde (v0.5.72).</li>
      </ul>

      <h2>10. I numeri</h2>
      <p>
        Il benchmark di punta dell&apos;ultimo articolo era <code>factorial</code> a 24,6x più veloce di Node. Quel numero è invariato. Ciò che si è mosso questa settimana è tutto il resto:
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
            <tr className="border-b border-slate-800"><td className="py-2 px-3">JSON.parse (schema 20 record)</td><td className="text-right py-2 px-3">547x più lento di Node</td><td className="text-right py-2 px-3">1,3x più lento di Node</td><td className="text-right py-2 px-3 text-green-400 font-semibold">~420x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">image_conv (sfocatura 5×5 su 4K)</td><td className="text-right py-2 px-3">1.980ms</td><td className="text-right py-2 px-3">457ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">4,3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Codice con molte proprietà (PIC hit)</td><td className="text-right py-2 px-3">baseline</td><td className="text-right py-2 px-3">2–3x</td><td className="text-right py-2 px-3 text-green-400">2–3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3 text-green-400">1,3x</td></tr>
            <tr><td className="py-2 px-3">Uptime di Fastify sotto carico</td><td className="text-right py-2 px-3">~60s prima del crash</td><td className="text-right py-2 px-3">indefinito</td><td className="text-right py-2 px-3 text-green-400">∞</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        La suite completa di 15 benchmark contro Node è ancora 14 vittorie e 1 pareggio — la stessa tabella dell&apos;articolo precedente, con numeri leggermente migliori su tutta la linea. Il movimento reale di questa settimana è sui workload che non erano in quella suite: JSON, elaborazione immagini, server long-running. È lì che vivevano i divari, ed è ciò che si è chiuso.
      </p>

      <h2>11. Cosa viene dopo</h2>
      <p>
        L&apos;unico benchmark che stiamo ancora inseguendo è <code>image_conv</code> contro Zig. Perry è a 457ms; Zig è a 246ms. Quel divario è architetturale, non a livello di pass di ottimizzazione, e vive in tre punti:
      </p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Locali buffer tipizzati</strong>. La maggior parte del lavoro sui Buffer è atterrata questa settimana, ma i parametri di funzione e i locali tipizzati come buffer si sboxano ancora ad ogni accesso. L&apos;approccio a slot <code>i64</code> che usiamo per i contatori di ciclo deve estendersi ai buffer.</li>
        <li><strong>Splitting del ciclo interno/bordo</strong>. Il ciclo di sfocatura fa clamp di ogni pixel, inclusi il 99,9% dei pixel che non ne hanno bisogno. Dividere in regioni di bordo (con clamp) e interno (senza clamp) permette a LLVM di vettorizzare l&apos;interno con <code>ld3</code>/<code>st3</code> NEON.</li>
        <li><strong>Hash FNV-1a con doppia ABI</strong>. L&apos;helper di hash viene chiamato tramite l&apos;ABI NaN-box. Specializzarlo a i64 grezzo in/out per i percorsi caldi è un lavoro di poche ore che ripagherà su ogni workload hash-heavy.</li>
      </ol>
      <p>
        Questi sono tracciati in <code>PERF_ROADMAP.md</code>. Aspettateveli nel prossimo ciclo.
      </p>

      <h2>In chiusura</h2>
      <p>
        Il pattern di questa settimana — 68 patch release, quasi tutte di performance, un divario JSON passato da 547x a 1,3x — è ciò che accade quando si attraversa la vetta e si arriva sul lato buono della collina del passaggio a LLVM. L&apos;ottimizzatore ora è un alleato invece di un muro, e la maggior parte di ciò che resta è lavoro piccolo, specifico, misurabile: trovare un percorso lento, capire perché l&apos;ottimizzatore non riesce a vederci attraverso, esporre la struttura, misurare di nuovo. Nessuno di questi commit è esotico. Sono semplicemente applicati dove servono.
      </p>
      <p>
        Se vuoi provare qualcosa di tutto questo:
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
        Issue, riproduttori e benchmark che non sono abbastanza veloci: continuate a mandarli. Questo ritmo funziona solo perché le segnalazioni di bug sono abbastanza specifiche da trasformarsi in riproduttori da una riga. Ogni commit in questo articolo ha un <code>#N</code> allegato per un motivo.
      </p>
      <p>— Ralph</p>
    </>
  );
}
