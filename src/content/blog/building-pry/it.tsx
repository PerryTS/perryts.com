import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Pry è un visualizzatore JSON nativo costruito interamente in TypeScript e compilato con Perry. Non è
        una demo tecnologica — è uno strumento reale che usiamo ogni giorno per ispezionare risposte API, file di
        configurazione e dump di dati. Questo articolo illustra come è stato costruito, come viene compilato e come
        appare l&apos;esperienza di sviluppo quando il tuo TypeScript compila in un&apos;app nativa.
      </p>

      <h2>Cosa fa Pry</h2>
      <p>
        Pry legge un file JSON (o accetta JSON da stdin) e lo renderizza come un albero interattivo e
        navigabile in una finestra nativa. Se hai usato il Quick Look integrato di macOS
        per i JSON, immagina quello — ma più veloce, con ricerca e navigazione da tastiera.
      </p>
      <p>
        Le funzionalità:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Vista ad albero</strong> — nodi espandibili/comprimibili per oggetti e array, con indicatori di profondità e espandi/comprimi tutto</li>
        <li><strong>Ricerca</strong> — ricerca full-text su chiavi e valori con evidenziazione in tempo reale e navigazione tra le corrispondenze</li>
        <li><strong>Scorciatoie da tastiera</strong> — tasti freccia per navigare, invio per espandere/comprimere, barra per cercare, <code className="text-perry-400">⌘C</code> per copiare</li>
        <li><strong>Appunti</strong> — copia qualsiasi nodo o sotto-albero come JSON formattato</li>
        <li><strong>Colorazione sintattica</strong> — stringhe in verde, numeri in arancione, booleani in viola, null in rosso</li>
        <li><strong>Barra di stato</strong> — mostra conteggio totale dei nodi, profondità attuale, dimensione del file e tempo di parsing</li>
      </ul>

      <h2>Il codice sorgente</h2>
      <p>
        Pry è scritto in TypeScript standard. Non c&apos;è sintassi speciale, né macro, né
        generazione di codice al momento del build. Utilizza l&apos;API UI di Perry, che fornisce widget nativi
        che compilano in codice specifico per piattaforma.
      </p>
      <p>
        Ecco il punto di ingresso (semplificato per chiarezza):
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">pry.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">TreeView</span>, <span className="text-cyan-400">SearchBar</span>, <span className="text-cyan-400">StatusBar</span>, <span className="text-cyan-400">State</span> {"}"}</p>
          <p>  <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">readFile</span>, <span className="text-cyan-400">readStdin</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/fs&quot;</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Read input from file arg or stdin</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">input</span> = process.argv[<span className="text-orange-400">2</span>]</p>
          <p>  ? <span className="text-yellow-400">readFile</span>(process.argv[<span className="text-orange-400">2</span>])</p>
          <p>  : <span className="text-yellow-400">readStdin</span>();</p>
          <p className="mt-3"><span className="text-purple-400">const</span> <span className="text-cyan-400">startTime</span> = Date.<span className="text-yellow-400">now</span>();</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">data</span> = JSON.<span className="text-yellow-400">parse</span>(<span className="text-cyan-400">input</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">parseMs</span> = Date.<span className="text-yellow-400">now</span>() - <span className="text-cyan-400">startTime</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Reactive state</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">searchQuery</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-green-400">&quot;&quot;</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">matchCount</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-3"><span className="text-slate-500">// Build the app</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Pry&quot;</span>, {"{"}</p>
          <p>  width: <span className="text-orange-400">800</span>,</p>
          <p>  height: <span className="text-orange-400">600</span>,</p>
          <p>  minWidth: <span className="text-orange-400">400</span>,</p>
          <p>  minHeight: <span className="text-orange-400">300</span>,</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">0</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">SearchBar</span>({"{"}</p>
          <p>      placeholder: <span className="text-green-400">&quot;Search keys and values...&quot;</span>,</p>
          <p>      onSearch: (<span className="text-cyan-400">q</span>) =&gt; <span className="text-cyan-400">searchQuery</span>.value = <span className="text-cyan-400">q</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">TreeView</span>(<span className="text-cyan-400">data</span>, {"{"}</p>
          <p>      collapsible: <span className="text-orange-400">true</span>,</p>
          <p>      syntaxHighlight: <span className="text-orange-400">true</span>,</p>
          <p>      searchQuery: <span className="text-cyan-400">searchQuery</span>,</p>
          <p>      onMatchCount: (<span className="text-cyan-400">n</span>) =&gt; <span className="text-cyan-400">matchCount</span>.value = <span className="text-cyan-400">n</span>,</p>
          <p>      copyOnClick: <span className="text-orange-400">true</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">StatusBar</span>([</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>){"}"} nodes`</span>,</p>
          <p>      <span className="text-green-400">`Parsed in ${"{"}<span className="text-cyan-400">parseMs</span>{"}"}ms`</span>,</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-cyan-400">matchCount</span>.value{"}"} matches`</span>,</p>
          <p>    ]),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;/&quot;</span>, () =&gt; <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusSearchBar</span>());</p>
          <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;Escape&quot;</span>, () =&gt; {"{"}</p>
          <p>  <span className="text-cyan-400">searchQuery</span>.value = <span className="text-green-400">&quot;&quot;</span>;</p>
          <p>  <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusTree</span>();</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        Questo è il cuore di un&apos;applicazione nativa. Nessun boilerplate del framework, nessuna
        configurazione di build, nessun file specifico per piattaforma. Un singolo file TypeScript.
      </p>

      <h3>Le funzioni helper</h3>
      <p>
        Pry include anche un&apos;utilità <code className="text-perry-400">countNodes</code> che
        conta ricorsivamente tutti i nodi nell&apos;albero JSON, e un helper{" "}
        <code className="text-perry-400">formatBytes</code> per mostrare le dimensioni dei file. Queste
        sono funzioni TypeScript standard — niente di specifico di Perry. Compilano in
        codice nativo come tutto il resto.
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">utils.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">export function</span> <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>: <span className="text-cyan-400">unknown</span>): <span className="text-cyan-400">number</span> {"{"}</p>
          <p>  <span className="text-purple-400">if</span> (<span className="text-cyan-400">data</span> === <span className="text-orange-400">null</span> || <span className="text-purple-400">typeof</span> <span className="text-cyan-400">data</span> !== <span className="text-green-400">&quot;object&quot;</span>) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span>;</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">if</span> (Array.<span className="text-yellow-400">isArray</span>(<span className="text-cyan-400">data</span>)) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">data</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">item</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">item</span>), <span className="text-orange-400">0</span>);</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">const</span> <span className="text-cyan-400">values</span> = Object.<span className="text-yellow-400">values</span>(<span className="text-cyan-400">data</span> <span className="text-purple-400">as</span> Record&lt;<span className="text-cyan-400">string</span>, <span className="text-cyan-400">unknown</span>&gt;);</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">values</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">val</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">val</span>), <span className="text-orange-400">0</span>);</p>
          <p>{"}"}</p>
        </div>
      </div>

      <h2>Compilare Pry</h2>
      <p>
        Compilare Pry con Perry è un singolo comando. Nessun progetto Xcode, nessuna configurazione Gradle,
        nessun webpack config. Basta puntare Perry al file di ingresso e specificare il target.
      </p>

      <h3>macOS (ARM64)</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target macos-arm64</p>
          <p className="text-slate-500">Parsing pry.ts...</p>
          <p className="text-slate-500">Resolving imports: perry/ui, perry/fs</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking with AppKit.framework...</p>
          <p className="text-green-400">✓ Built executable: pry (48 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file pry</p>
          <p className="text-slate-300">pry: Mach-O 64-bit executable arm64</p>
          <p className="mt-3"><span className="text-slate-500">$</span> otool -L pry | head -5</p>
          <p className="text-slate-400">pry:</p>
          <p className="text-slate-400">  /System/Library/Frameworks/AppKit.framework/AppKit</p>
          <p className="text-slate-400">  /System/Library/Frameworks/Foundation.framework/Foundation</p>
          <p className="text-slate-400">  /usr/lib/libSystem.B.dylib</p>
        </div>
      </div>
      <p>
        Il binario è di 48 MB perché include l&apos;intero stack UI AppKit — rendering della vista ad albero,
        evidenziazione della ricerca, colorazione sintattica e gestione della tastiera. Per confronto, la stessa app
        in Electron sarebbe oltre 200 MB. Un&apos;app Perry solo CLI compila a 2–5 MB.
      </p>

      <h3>iOS</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: pry (52 MB)</p>
        </div>
      </div>
      <p>
        La build iOS si collega a UIKit invece di AppKit. Perry mappa la stessa API{" "}
        <code className="text-perry-400">TreeView</code> su <code className="text-perry-400">UITableView</code> con
        sezioni espandibili, <code className="text-perry-400">SearchBar</code> su{" "}
        <code className="text-perry-400">UISearchBar</code>, e gli eventi touch sostituiscono quelli del mouse.
        La build iOS può essere distribuita su dispositivi fisici e simulatori.
      </p>

      <h3>Android</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target android-arm64</p>
          <p className="text-green-400">✓ Built: pry.apk</p>
        </div>
      </div>
      <p>
        La build Android genera una libreria nativa caricata attraverso JNI, pacchettizzata in un APK.{" "}
        <code className="text-perry-400">TreeView</code> mappa a un <code className="text-perry-400">RecyclerView</code> con
        view holder espandibili, <code className="text-perry-400">SearchBar</code> mappa a un{" "}
        <code className="text-perry-400">EditText</code> con un <code className="text-perry-400">TextWatcher</code>, e la
        barra di stato mappa a un <code className="text-perry-400">TextView</code> in fondo al layout.
      </p>

      <h2>Cosa succede sotto il cofano</h2>
      <p>
        Quando Perry compila Pry, attraversa diverse fasi:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Parse</strong> — SWC analizza il sorgente TypeScript in un AST. Gli import da{" "}
          <code className="text-perry-400">perry/ui</code> e <code className="text-perry-400">perry/fs</code> sono
          risolti nelle implementazioni dei moduli integrati di Perry.
        </li>
        <li>
          <strong>Analisi dei tipi</strong> — Perry risolve tutti i tipi, inclusi i generici{" "}
          <code className="text-perry-400">State&lt;string&gt;</code> e{" "}
          <code className="text-perry-400">State&lt;number&gt;</code>, monomorfizzandoli in
          tipi concreti.
        </li>
        <li>
          <strong>Risoluzione della piattaforma</strong> — In base al flag target, Perry seleziona il
          backend UI appropriato. Ogni chiamata <code className="text-perry-400">TreeView</code>,{" "}
          <code className="text-perry-400">SearchBar</code> e <code className="text-perry-400">Button</code> viene
          risolta nell&apos;implementazione specifica della piattaforma.
        </li>
        <li>
          <strong>Generazione IR</strong> — Perry genera una rappresentazione intermedia che
          include chiamate API native — invii di messaggi Objective-C per macOS/iOS, chiamate JNI per
          Android, chiamate a funzioni C per GTK4/Win32.
        </li>
        <li>
          <strong>Generazione del codice</strong> — Cranelift compila l&apos;IR in codice macchina nativo
          per l&apos;architettura target.
        </li>
        <li>
          <strong>Linking</strong> — Il codice nativo viene collegato ai framework della piattaforma
          (AppKit, UIKit, Android NDK, GTK4 o Win32) per produrre l&apos;eseguibile finale.
        </li>
      </ol>

      <h2>Nessun runtime, nessuna web view</h2>
      <p>
        Questo vale la pena sottolinearlo perché è la differenza fondamentale tra Perry e qualsiasi
        altro approccio TypeScript-to-native. Il binario compilato di Pry ha:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Nessun motore JavaScript</strong> — nessun V8, nessun Hermes, nessun JavaScriptCore</li>
        <li><strong>Nessuna web view</strong> — nessun Chromium, nessun WebKit, nessun WKWebView</li>
        <li><strong>Nessun layer bridge</strong> — nessun messaggio serializzato tra JS e nativo</li>
        <li><strong>Nessun runtime del framework</strong> — nessun React, nessun motore Flutter, nessuna Dart VM</li>
      </ul>
      <p>
        Il binario chiama direttamente le API della piattaforma. Su macOS, chiama{" "}
        <code className="text-perry-400">objc_msgSend</code> per interagire con gli oggetti AppKit. Su Android,
        chiama funzioni JNI per creare e manipolare le Views. È la stessa cosa che farebbe un&apos;app
        nativa Swift o Kotlin.
      </p>
      <p>
        La conseguenza pratica: Pry si avvia istantaneamente. Nessun avvio della VM, nessun
        riscaldamento JIT, nessun parsing di script. Il processo parte, la finestra appare, il JSON viene renderizzato.
        L&apos;uso di memoria è una frazione di quello che consumerebbe un equivalente Electron.
      </p>

      <h2>Esperienza di sviluppo</h2>
      <p>
        Costruire Pry è stato notevolmente simile a costruire qualsiasi applicazione TypeScript. Il
        flusso di lavoro è:
      </p>
      <ol className="list-decimal list-inside">
        <li>Scrivi TypeScript nel tuo editor (VS Code, Zed, Neovim, quello che preferisci)</li>
        <li>Esegui <code className="text-perry-400">perry compile pry.ts</code></li>
        <li>Esegui <code className="text-perry-400">./pry test.json</code></li>
        <li>Itera</li>
      </ol>
      <p>
        Nessun progetto Xcode da configurare. Nessun Android Studio da installare. Nessuna build Gradle che
        impiega 45 secondi. Il compilatore Perry stesso è veloce — il parsing e la compilazione di Pry richiedono pochi
        secondi, e stiamo attivamente lavorando per renderlo più veloce.
      </p>
      <p>
        Il TypeScript che scrivi è TypeScript standard. Il type checking, l&apos;autocompletamento e gli strumenti
        di refactoring del tuo editor funzionano tutti. Puoi estrarre funzioni, creare moduli,
        usare generici — tutti i pattern TypeScript che già conosci.
      </p>

      <h2>Cosa abbiamo imparato</h2>
      <p>
        Costruire Pry ci ha insegnato molto su cosa l&apos;API UI di Perry deve supportare. Alcune lezioni:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Le viste ad albero sono complesse.</strong> Espansione, compressione, evidenziazione della ricerca,
          navigazione da tastiera e integrazione con gli appunti devono essere tutti coordinati. Il widget{" "}
          <code className="text-perry-400">TreeView</code> di Perry gestisce questo internamente, ma abbiamo dovuto
          assicurarci che l&apos;implementazione nativa fosse consistente su tutte e tre le piattaforme.
        </li>
        <li>
          <strong>Le scorciatoie da tastiera necessitano delle convenzioni della piattaforma.</strong> Su macOS, è{" "}
          <code className="text-perry-400">⌘C</code> per copiare. Su Linux e Android, è{" "}
          <code className="text-perry-400">Ctrl+C</code>. Il sistema di scorciatoie di Perry astrae questo,
          ma è servita un&apos;implementazione attenta per farlo funzionare correttamente.
        </li>
        <li>
          <strong>Le barre di stato sono sorprendentemente non banali.</strong> Ogni piattaforma ha una convenzione
          diversa per dove e come visualizzare le informazioni di stato. AppKit usa la barra inferiore della finestra,
          UIKit usa una toolbar, Android usa una view inferiore nel layout. La{" "}
          <code className="text-perry-400">StatusBar</code> di Perry mappa correttamente a ciascuna.
        </li>
        <li>
          <strong>Il supporto stdin ha richiesto consapevolezza della piattaforma.</strong> Su macOS e Linux, leggere
          da stdin è semplice. Su iOS e Android, &quot;stdin&quot; non esiste realmente
          allo stesso modo, quindi Pry usa la selezione file sulle piattaforme mobili. La funzione{" "}
          <code className="text-perry-400">readStdin</code> di Perry gestisce questo in modo trasparente.
        </li>
      </ul>

      <h2>Prestazioni</h2>
      <p>
        Pry gestisce file JSON grandi con facilità. Nei nostri test:
      </p>
      <ul className="list-disc list-inside">
        <li>Un file JSON da 1 MB (10.000+ nodi) viene analizzato e renderizzato in meno di 50 ms</li>
        <li>Un file JSON da 10 MB viene renderizzato in meno di 200 ms</li>
        <li>La ricerca su 10.000 nodi restituisce risultati mentre digiti, senza lag visibile</li>
        <li>L&apos;uso di memoria rimane sotto i 50 MB anche per file grandi</li>
      </ul>
      <p>
        Questo è il vantaggio della compilazione nativa. Il parsing JSON in Perry è compilato in
        cicli nativi compatti senza pause del GC. Il rendering dell&apos;albero usa le viste lista virtualizzate
        della piattaforma (NSOutlineView, UITableView, RecyclerView), che sono
        collaudate per le prestazioni.
      </p>

      <h2>Sorgente e download</h2>
      <p>
        Pry è open source. Puoi sfogliare il codice sorgente completo, compilarlo tu stesso, o semplicemente guardare
        il codice per capire come è strutturata un&apos;app UI nativa Perry.
      </p>
      <ul className="list-disc list-inside">
        <li>
          <a href="https://github.com/perryts/pry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
            Repository GitHub
          </a>{" "}
          — codice sorgente completo e istruzioni di build
        </li>
        <li>
          <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">
            Pagina vetrina
          </Link>{" "}
          — screenshot, lista funzionalità e dettagli sulla piattaforma
        </li>
      </ul>
      <p>
        Se stai costruendo qualcosa con Perry, ci piacerebbe saperne di più. Apri una
        issue sul{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          repository Perry
        </a>{" "}
        o avvia una discussione. Stiamo costruendo Perry in modo aperto e il feedback degli utenti reali
        che costruiscono app reali è inestimabile.
      </p>
    </>
  );
}
