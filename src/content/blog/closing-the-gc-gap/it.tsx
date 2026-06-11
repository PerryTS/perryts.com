export default function Content() {
  return (
    <>
      <p>
        Qualche settimana fa, <a href="https://zenn.dev/aya_koto" className="text-amber-400 hover:text-amber-300">Ayasaka-Koto</a> (@axt_ayakoto su X) ha pubblicato <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">un benchmark di Perry contro Deno e Bun</a> sul problema AtCoder ABC451D, &ldquo;Concat Power of 2.&rdquo; La sua misurazione: Perry girava <strong>3,85× più lento di Bun</strong>. La sua conclusione era educata ma ferma — Perry non era pronto per essere un runtime da competitive programming, e forse non lo sarebbe stato nemmeno a maturità raggiunta.
      </p>
      <p>
        Gli dobbiamo un seguito. Ecco dove siamo arrivati sullo stesso benchmark, con lo stesso comando <code>hyperfine</code>, sulla stessa classe di macchina:
      </p>
      <pre><code>{`Command                                Mean         Min      Max
Perry v0.5.875                         425.0 ± 78 ms  367 ms  745 ms
Bun 1.3.12                             430.7 ± 74 ms  376 ms  787 ms
Deno 2.7.14                            544.8 ± 140 ms 426 ms  984 ms

Perry vs Bun:   1.01× faster (statistical tie, within error)
Perry vs Deno:  1.28× faster
Perry vs aya_koto's published Perry number: 2.87× faster`}</code></pre>
      <p>
        Chiudere quel gap ha richiesto un&apos;indagine che è partita da un&apos;ipotesi sbagliata, ha trovato un trade-off architetturale del GC reale ma deliberato, e ha prodotto un risultato che pensiamo valga la pena raccontare — non perché abbiamo recuperato, ma perché il modo in cui il trade-off appariva sotto profiling è interessante di per sé.
      </p>

      <h2>Il benchmark</h2>
      <p>
        L&apos;<code>abc451d-perry.ts</code> di aya_koto fa una ricerca ricorsiva in profondità sulle concatenazioni di stringhe potenze-di-2, deduplicate attraverso un <code>Set&lt;number&gt;</code> e ordinate. La funzione calda è breve:
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
        La forma è la storia. Ogni chiamata alloca un nuovo <code>string[]</code>. La ricorsione è profonda — fattore di branching fino a circa 30 in cima — e ogni frame genitore tiene vivo il suo array <code>answers</code> mentre itera l&apos;array del figlio e fa push sul proprio. Allocazioni di breve durata, ricorsione profonda, riferimenti vivi sparsi su ogni blocco di arena attivo. Questo si è rivelato essere esattamente il carico contro cui il GC di Perry <em>non</em> era stato tarato.
      </p>

      <h2>L&apos;ipotesi sbagliata</h2>
      <p>
        Un lettore aveva lasciato una nota a piè di pagina sull&apos;articolo di aya_koto facendo notare che il BigInt di Perry era internamente un intero a lunghezza fissa di 1024 bit, e che i programmi BigInt-pesanti giravano circa 4× più lenti di Bun. ABC451D coinvolge potenze di 2 — numeri grandi sembravano plausibili — e così il primo istinto è stato: BigInt è il colpevole, fixa il path BigInt e il gap si chiude.
      </p>
      <p>
        Non lo era. <code>grep -i bigint abc451d-perry.ts</code> non ha restituito nulla. Il benchmark usa <code>number</code> ovunque; ogni valore sta comodamente sotto 2^53. La nota su BigInt era corretta, reale, e un problema da risolvere — e l&apos;abbiamo risolto, separatamente, in v0.5.736. Ma non aveva nulla a che fare con ABC451D.
      </p>
      <p>
        Il costo di inseguire prima l&apos;ipotesi sbagliata è stato circa un giorno. La lezione — che mi piacerebbe sostenere conoscessimo già — è stata: fai profiling prima di impegnarti su una teoria, anche quando la teoria viene da una fonte credibile e combacia con i tuoi pregiudizi. Soprattutto allora.
      </p>

      <h2>Riprodurre il bench</h2>
      <p>
        La prima cosa che abbiamo fatto una volta smesso di inseguire BigInt è stata riprodurre i numeri di aya_koto in modo pulito. Ci aspettavamo di atterrare vicino al suo 1,219 s su Perry. Siamo atterrati a <strong>2,998 s</strong> su Perry v0.5.729.
      </p>
      <p>
        È una regressione di 2,5× tra la versione che ha testato lui e il nostro main allora corrente. Deno e Bun si sono riprodotti entro il 50% dei suoi numeri (hardware diverso, drift di versione). Il gap di Perry era cresciuto da 3,85× a 6,59× mentre nessuno guardava.
      </p>
      <p>
        Non abbiamo fatto bisect su quale commit avesse causato la regressione — usciva dallo scope di questa indagine. Ma l&apos;assenza di un guardrail di CI che avrebbe colto il drift è di per sé un riscontro, e ci torneremo alla fine.
      </p>

      <h2>Diagnosi guidata dal profiling</h2>
      <p>
        Compilato con <code>PERRY_DEBUG_SYMBOLS=1</code> e registrato con <code>samply</code>, il quadro del self-time era inequivocabile:
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
        <strong>Il 76% del self time era macchinario del GC.</strong> Il tempo inclusivo concordava: <code>gc_collect_minor</code> all&apos;80%, <code>Arena::alloc</code> al 76%, <code>js_array_alloc</code> al 45%, <code>js_array_push_f64</code> al 22%. La <code>search()</code> ricorsiva era calda, ma era calda sotto la fase di mark del GC. Ogni chiamata innescava abbastanza allocazione da far scattare una collection.
      </p>
      <p>
        Un microbenchmark di controllo negativo ha confermato che il rallentamento non era generale. <code>fib(80) × 100_000</code> intero stretto, nessuna allocazione: Perry <strong>6,1 ms</strong> contro Bun <strong>24,7 ms</strong> — Perry 4× più veloce. Il codegen per loop caldi senza allocazione era già davanti a Bun. Il gap di ABC451D era concentrato in un percorso di codice specifico: throughput di allocazione più mark-sweep del GC su questa particolare forma di allocazione.
      </p>

      <h2>La pistola fumante</h2>
      <p>
        Avevamo un flag — <code>PERRY_GC_DIAG=1</code> — che stampava statistiche GC per ciclo. L&apos;output è stato l&apos;osservazione portante dell&apos;intera indagine:
      </p>
      <pre><code>{`[gc-step] pre_in_use=67 MB  post_in_use=67 MB  sweep_freed=38 MB  block_reclaim=0  pct=57%
[gc-step] pre_in_use=100 MB post_in_use=100 MB sweep_freed=55 MB  block_reclaim=0  pct=55%
[gc-step] pre_in_use=119 MB post_in_use=119 MB sweep_freed=65 MB  block_reclaim=0  pct=55%
…
arena blocks: 61 → 84 → 100 → 116 → 131 → 145 → 157 → … → 270+`}</code></pre>
      <p>
        Ogni ciclo, lo stesso pattern. Lo sweep identificava correttamente che <strong>il 55–60% degli oggetti allocati era morto</strong>. E l&apos;arena recuperava <strong>zero blocchi</strong>. L&apos;heap cresceva monotonicamente per tutta l&apos;esecuzione, mentre il GC continuava a pagare il costo del mark-sweep su un working set sempre più grande.
      </p>
      <p>
        Perché <code>block_reclaim=0</code> nonostante più della metà degli oggetti fosse morta? Perché il GC ad arena di Perry recupera a granularità di blocco. Un blocco da 1 MB viene resettato solo quando ogni oggetto al suo interno è morto. In ABC451D, la <code>search()</code> ricorsiva tiene riferimenti vivi — l&apos;array <code>answers</code> del frame genitore — sparsi su ogni blocco attivo. Nessun blocco è mai interamente morto. Il mark-sweep identifica correttamente gli oggetti morti, non ha un percorso di reclaim per oggetto, e quindi non ci fa nulla. L&apos;heap cresce, i trigger del GC scattano su un tapis roulant, e il costo di ogni ciclo sale man mano che sale il working set.
      </p>

      <h2>Il trade-off deliberato</h2>
      <p>
        La cosa più istruttiva che abbiamo trovato non era nel profilo. Era nello sweep stesso, in <code>crates/perry-runtime/src/gc.rs:2733</code>, come un commento che spiegava il design:
      </p>
      <blockquote className="border-l-4 border-amber-500/40 pl-4 my-6 text-slate-400 italic">
        We deliberately do NOT push dead objects onto the global ARENA_FREE_LIST. The inline bump allocator never reads the free list — it uses the per-block reset instead. Pushing dead objects to the free list would cost ~50ns per object × ~700k objects per GC × ~12 GC cycles per benchmark = 420ms of pure waste in <code>object_create</code>.
      </blockquote>
      <p>
        Questo è esattamente corretto per il carico contro cui era stato tarato. <code>object_create</code> è un benchmark a cui teniamo, dove le allocazioni muoiono in un loop stretto e interi blocchi si svuotano davvero tra un ciclo e l&apos;altro. Aggiungere una passata di free-list per oggetto brucerebbe 420 ms di bookkeeping inutile per quel carico, e il percorso di block-reset cattura la stessa memoria a costo più basso.
      </p>
      <p>
        È un cattivo fit per la forma di ABC451D, dove i riferimenti vivi restano sparsi e il block-reset non scatta mai. L&apos;architettura aveva un trade-off deliberato codificato dentro, e non avevamo mai fatto benchmark sul caso in cui il trade-off va nella direzione sbagliata.
      </p>
      <p>
        È questa la vera lezione. Il GC non era rotto. Era tarato per una distribuzione di pattern di allocazione diversa da quella che rappresenta il bench di aya_koto, e non ci eravamo accorti che la distribuzione per cui era tarato escludeva una classe di carichi reali — ricerca ricorsiva, tree walk, qualsiasi cosa tenga stato vivo a ogni livello dello stack mentre fa allocazione di breve durata sotto.
      </p>

      <h2>Cose che non hanno funzionato</h2>
      <p>
        Prima di arrivare a un fix reale, diverse leve dall&apos;aspetto plausibile si sono rivelate leve sbagliate. Le riportiamo con i numeri perché erano la metà più interessante dell&apos;indagine:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong><code>PERRY_GEN_GC_EVACUATE=1</code></strong> — Perry aveva già una passata opt-in di copying-evacuation. Attivarla per ABC451D: <strong>11,4 secondi</strong>, quattro volte più lento della baseline. La passata gira a ogni ciclo, utile o meno, e il suo costo di copia per oggetto più reference-rewrite è catastrofico quando il live set è fatto di oggetti piccoli e di breve durata. Vale la pena tenerla per i carichi che ne beneficiano, ma non è la risposta qui.</li>
        <li><strong><code>PERRY_GEN_GC=0</code></strong> (mark-sweep completo invece di generazionale) — 3,06 s, essenzialmente identico alla baseline. Non è la scelta della strategia ad essere vincolante; è l&apos;assenza del reclaim per oggetto.</li>
        <li><strong>Pulizia strutturale di <code>ValidPointerSet</code> (commit 0fa42e0b).</strong> Uniti i due vettori ordinati separati (puntatori di arena e puntatori da malloc) in uno solo, aggiunto un prefiltro per range min/max, inlineato il rifiuto del tag di <code>try_mark_value</code>. Dimezzato il costo per chiamata di <code>contains()</code> — che era il loop interno caldo segnalato dal profilo. Il bench ABC451D si è mosso da 3,07 s a 3,21 s. Un pareggio, dentro il rumore. La modifica porta comunque valore per i carichi dove <code>contains()</code> è davvero il vincolo vincolante (benchmark a forma di ECS, catene di compose di hono), ma non era il vincolo vincolante qui. Il volume assoluto di chiamate — guidato dalla pressione di allocazione che alimenta la fase di mark — dominava anche a costo per chiamata pari a zero.</li>
      </ul>
      <p>
        Il pattern in tutti e tre: la strategia del GC e i costi del loop interno per chiamata erano di secondo ordine. Il vincolo vincolante era la mancanza di un percorso di reclaim per gli oggetti morti nei blocchi che non si svuotano del tutto. Finché non è stato affrontato, niente altro spostava l&apos;ago.
      </p>

      <h2>Dove siamo arrivati</h2>
      <p>
        Tra v0.5.737 e v0.5.875, attraverso circa 137 versioni patch, il gap si è chiuso. Siamo deliberati nello scriverlo: non abbiamo fatto bisect fino a un singolo commit eroe. Il fix è atterrato attraverso una serie di modifiche nel sottosistema GC che hanno reso il trade-off deliberato &ldquo;niente free list per oggetto&rdquo; condizionale anziché permanente — quando <code>block_reclaim</code> resta a zero per cicli consecutivi, lo sweep inizia a popolare una free list a bucket di dimensione e il bump allocator guadagna un percorso di fallback. La sequenza esatta e quale patch abbia contribuito quanto richiederebbe un bisect attento che dobbiamo ma non abbiamo ancora fatto.
      </p>
      <p>
        Il risultato, sul bench e comando esatti di aya_koto, su Apple M-series, macOS 26.4:
      </p>
      <pre><code>{`Perry v0.5.875: 425.0 ± 78 ms  (367 – 745)
Bun 1.3.12:     430.7 ± 74 ms  (376 – 787)
Deno 2.7.14:    544.8 ± 140 ms (426 – 984)`}</code></pre>
      <p>
        Due note di onestà su questa tabella. Primo, il margine di 1,01× di Perry su Bun è dentro le barre d&apos;errore — la parola corretta è &ldquo;pari,&rdquo; non &ldquo;più veloce.&rdquo; Secondo, la varianza su tutti e tre i runtime è significativa (il max di Perry è 745 ms contro una media di 425 ms), e ogni singola esecuzione può atterrare in una delle due code. Abbiamo mostrato min e max accanto alla media per questa ragione; preferiamo che tu veda la dispersione.
      </p>

      <h2>Cosa è ancora imperfetto</h2>
      <p>
        Alcune cose su cui non passiamo la mano di vernice:
      </p>
      <p>
        La regressione da 1,2 s a 3,0 s avvenuta tra la misurazione di aya_koto e l&apos;inizio di questa indagine ci dice che non avevamo un guardrail di CI a cogliere questa classe di rallentamento. Stiamo aggiungendo <code>abc451d-perry.ts</code> e una piccola suite circostante alla CI di Perry come gate di regressione di perf prima che questo post vada online. Se questo bench si degrada in silenzio in una release futura, dovrebbe far fallire una build, non un benchmark di un critico tra tre mesi.
      </p>
      <p>
        Il fix rilassa un trade-off deliberato in una direzione specifica. Stiamo osservando il benchmark <code>object_create</code> e affini — carichi che la scelta originale &ldquo;niente free list&rdquo; proteggeva — per assicurarci che il percorso di free list condizionale non li faccia regredire. I numeri preliminari sono dentro il rumore, ma questo è il genere di cosa dove la fiducia viene dal tempo, non da una singola esecuzione di benchmark.
      </p>
      <p>
        Non abbiamo fatto bisect sul range di 137 versioni. Lo faremo. Conta per la documentazione, e conta per capire quali dei meccanismi di free list condizionale stiano facendo il lavoro.
      </p>

      <h2>Riconoscimenti</h2>
      <p>
        L&apos;articolo di aya_koto era esattamente il tipo di writeup di cui un progetto open-source ha bisogno e che raramente riceve. Ha misurato con attenzione, pubblicato il suo repo di test, segnalato attrito specifico nel percorso di installazione, ed è arrivato alla conclusione onesta che Perry non era pronto per il caso d&apos;uso che stava valutando. Quella conclusione era corretta quando l&apos;ha fatta. Sarebbe rimasta corretta più a lungo se non ne avesse scritto.
      </p>
      <p>
        Il suo repo di test è su <a href="https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421" className="text-amber-400 hover:text-amber-300">github.com/AXT-AyaKoto/perry-ts-test-2026-0421</a>. Il suo articolo è su <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">zenn.dev/aya_koto/articles/553ce04b1d5ac4</a>. Entrambi valgono la lettura anche dopo questo seguito — l&apos;articolo soprattutto, perché documenta una valutazione onesta di un compilatore in fase iniziale da parte di qualcuno senza alcun incentivo a essere educato.
      </p>
      <p>
        Due cose specifiche nel suo articolo che dovremmo notare. L&apos;attrito del percorso di installazione che ha segnalato — che la cima di perryts.com puntava a un metodo mentre i docs ne raccomandavano un altro — è stato risolto; il percorso npm è ora l&apos;opzione in primo piano sulla landing page, in linea con i docs. La frustrazione &ldquo;cose fuori dal documento delle limitazioni che non compilano&rdquo; che ha segnalato — abbiamo passato in rassegna ogni file <code>.ts</code> nel suo repo di test contro Perry corrente; le lacune genuine hanno avuto issue aperte, e le limitazioni documentate sono state espanse.
      </p>
      <p>
        La nota su BigInt nel suo articolo era, come discusso sopra, slegata da ABC451D ma reale di per sé — l&apos;implementazione BigInt di Perry era infatti un intero a larghezza fissa di 1024 bit sotto il cofano, e i programmi BigInt-pesanti lo pagavano. È risolto in v0.5.736, con un percorso inline per valori piccoli e <code>num-bigint</code> come fallback a precisione arbitraria. Il merito lì va al lettore che ha lasciato la nota sull&apos;articolo di aya_koto; non sappiamo chi sia, ma se stai leggendo questo: grazie.
      </p>

      <h2>Riproduzione</h2>
      <p>
        Se vuoi riprodurre tu stesso questi numeri:
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
        I tuoi numeri varieranno con l&apos;hardware e le versioni dei runtime. Se variano in modi che sembrano sbagliati, <a href="https://github.com/PerryTS/perry/issues" className="text-amber-400 hover:text-amber-300">apri una issue</a> — preferiamo saperlo.
      </p>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
