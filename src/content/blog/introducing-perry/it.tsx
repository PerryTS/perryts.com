import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Siamo entusiasti di presentare Perry — un compilatore TypeScript nativo scritto in Rust
        che compila il tuo TypeScript direttamente in eseguibili autonomi. Nessun runtime Node.js,
        nessun wrapper Electron, nessun compromesso. Solo il tuo codice, compilato in un binario
        nativo che si avvia istantaneamente e funziona ovunque.
      </p>
      <p>
        Perry rappresenta un ripensamento fondamentale di ciò che TypeScript può essere. Invece di
        trattarlo come un superset di JavaScript che deve essere eseguito attraverso un motore JS, Perry
        tratta TypeScript come un linguaggio di sistema — uno che ha una sintassi che milioni
        di sviluppatori già conoscono e amano.
      </p>

      <h2>Perché abbiamo creato Perry</h2>
      <p>
        TypeScript è diventato la lingua franca dello sviluppo software moderno. È il
        linguaggio dietro la maggior parte dei frontend web, una quota crescente di backend, e sempre più
        la scelta per strumenti, scripting e automazione. Ma ha sempre portato con sé una limitazione
        fondamentale: si compila in JavaScript, e JavaScript richiede un runtime.
      </p>
      <p>
        Quel runtime — che sia Node.js, Deno o Bun — comporta dei compromessi.
        Tempi di avvio a freddo misurati in decine o centinaia di millisecondi. Overhead di memoria dal
        compilatore JIT e dal garbage collector. Distribuzioni binarie che o includono l&apos;intero
        runtime o richiedono all&apos;utente di installarne uno. E per le applicazioni GUI, l&apos;unica opzione
        è stata Electron, che include un intero browser Chromium con la tua app.
      </p>
      <p>
        Ci siamo chiesti: e se TypeScript non dovesse passare attraverso JavaScript? E se
        potessi compilarlo direttamente in codice macchina nativo, nello stesso modo in cui compili Rust,
        Go o C++?
      </p>

      <h2>Come funziona Perry</h2>
      <p>
        La pipeline di compilazione di Perry ha tre fasi:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Parsing</strong> — Perry utilizza SWC (il parser TypeScript/JavaScript basato su Rust)
          per analizzare il tuo sorgente TypeScript in un AST. SWC è lo stesso parser utilizzato da Next.js,
          ed è estremamente veloce.
        </li>
        <li>
          <strong>Compilazione guidata dai tipi</strong> — Perry percorre l&apos;AST con informazioni
          complete sui tipi. A differenza di un motore JS che deve gestire i tipi dinamici a runtime, Perry conosce
          ogni tipo al momento della compilazione. Questo permette la monomorfizzazione dei generici, il dispatch
          statico delle chiamate ai metodi e l&apos;ottimizzazione diretta del layout di memoria.
        </li>
        <li>
          <strong>Generazione del codice</strong> — Perry genera codice macchina nativo usando Cranelift,
          lo stesso generatore di codice utilizzato da Wasmtime e parti del JIT di Firefox. Cranelift
          produce codice nativo efficiente per x86_64 e ARM64.
        </li>
      </ol>
      <p>
        Il risultato è un eseguibile autonomo — tipicamente 2–5 MB per uno strumento CLI — che si avvia
        istantaneamente senza tempo di riscaldamento.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts</p>
          <p className="text-slate-500">Parsing app.ts...</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking...</p>
          <p className="text-green-400">✓ Built executable: app (2.3 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./app</p>
          <p className="text-slate-300">Hello from native TypeScript!</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file app</p>
          <p className="text-slate-300">app: Mach-O 64-bit executable arm64</p>
        </div>
      </div>

      <h2>Quali funzionalità TypeScript sono supportate</h2>
      <p>
        Perry supporta un sottoinsieme ampio e in crescita di TypeScript. L&apos;obiettivo è la piena compatibilità
        con il linguaggio come gli sviluppatori lo usano realmente. Oggi, questo include:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Tutti i tipi primitivi</strong> — string, number, boolean, null, undefined, bigint, symbol</li>
        <li><strong>Interfacce e alias di tipo</strong> — inclusi tipi union, tipi intersezione e tipi mappati</li>
        <li><strong>Generici</strong> — compilati tramite monomorfizzazione, quindi <code className="text-perry-400">Array&lt;number&gt;</code> e <code className="text-perry-400">Array&lt;string&gt;</code> generano percorsi di codice ottimizzati distinti</li>
        <li><strong>Classi</strong> — con ereditarietà, campi privati (<code className="text-perry-400">#field</code>), membri statici, getter/setter e decoratori</li>
        <li><strong>Async/await e Promise</strong> — compilati in una macchina a stati, simile a come Rust gestisce l&apos;async</li>
        <li><strong>Generatori e iteratori</strong> — <code className="text-perry-400">function*</code> e cicli <code className="text-perry-400">for...of</code></li>
        <li><strong>Closure</strong> — con semantica di cattura corretta</li>
        <li><strong>Destrutturazione</strong> — array, oggetti, pattern annidati ed elementi rest</li>
        <li><strong>Template literal</strong> — inclusi i tagged template</li>
        <li><strong>Moduli</strong> — import/export ESM risolti al momento della compilazione</li>
      </ul>

      <h2>UI nativa cross-platform</h2>
      <p>
        Perry non è limitato a strumenti CLI e applicazioni server-side. Include framework UI nativi
        per sei piattaforme:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>macOS</strong> — AppKit (NSWindow, NSView, NSButton, NSTextField e altro)</li>
        <li><strong>iOS</strong> — UIKit (UIViewController, UIView, UIButton, UITableView)</li>
        <li><strong>iPadOS</strong> — UIKit (stessa API di iOS, con adattamenti specifici per iPad)</li>
        <li><strong>Android</strong> — JNI + Android Views (Activity, View, Button, RecyclerView)</li>
        <li><strong>Linux</strong> — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)</li>
        <li><strong>Windows</strong> — Win32 (CreateWindowEx, controlli comuni, GDI)</li>
      </ul>
      <p>
        L&apos;intuizione chiave è che Perry mappa un&apos;API TypeScript comune al toolkit di widget nativi
        di ciascuna piattaforma al momento della compilazione. Non c&apos;è nessun layer bridge, nessuna web view e
        nessun motore di rendering personalizzato. La tua app utilizza veri widget della piattaforma, renderizzati dal
        sistema operativo stesso. Leggi di più nel nostro approfondimento:{" "}
        <Link href="/blog/cross-platform-native-ui" className="text-perry-400 hover:text-perry-300">
          UI nativa cross-platform da TypeScript
        </Link>.
      </p>

      <h2>27+ implementazioni native di pacchetti npm</h2>
      <p>
        Una delle sfide pratiche più grandi di un nuovo compilatore è la compatibilità con l&apos;ecosistema.
        Gli sviluppatori non scrivono solo codice da zero — usano pacchetti. Perry affronta
        questo problema con implementazioni native di oltre 27 pacchetti npm popolari:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Database</strong> — mysql2, pg, mongodb, better-sqlite3, ioredis</li>
        <li><strong>HTTP</strong> — axios, express, ws (WebSocket)</li>
        <li><strong>Sicurezza</strong> — bcrypt, jsonwebtoken, crypto</li>
        <li><strong>Utilità</strong> — uuid, chalk, dotenv, lodash (parziale), moment</li>
        <li><strong>Sistema</strong> — fs-extra, glob, chokidar, commander</li>
      </ul>
      <p>
        Queste non sono sottili wrapper attorno ai moduli Node.js. Sono compilate direttamente
        nel tuo binario usando librerie di sistema native — libpq per PostgreSQL, OpenSSL per
        la crittografia, libcurl per HTTP. La superficie API corrisponde a ciò che ti aspetteresti dal pacchetto
        npm, quindi la migrazione è semplice.
      </p>

      <h2>Layer di compatibilità V8 opzionale</h2>
      <p>
        Per i pacchetti npm che non hanno ancora implementazioni native Perry, Perry offre una
        modalità di embedding V8 opzionale. Quando abilitata, Perry include un runtime V8 e può eseguire
        pacchetti npm JavaScript standard insieme al tuo TypeScript compilato. Questa è una via d&apos;uscita
        pragmatica che ti permette di adottare Perry incrementalmente — compila i percorsi critici in codice
        nativo continuando ad accedere all&apos;intero ecosistema npm per tutto il resto.
      </p>

      <h2>Compilazione incrociata</h2>
      <p>
        Perry supporta la compilazione incrociata nativamente. Dalla tua macchina di sviluppo macOS,
        puoi compilare per Linux (x86_64 e ARM64) e iOS. Questo significa che puoi costruire la tua
        pipeline CI/CD su macOS e produrre binari per tutti i tuoi target di deployment senza
        bisogno di macchine di build dedicate per ciascuna piattaforma.
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p className="text-slate-500"># Build for Linux from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target linux-x86_64</p>
          <p className="text-green-400">✓ Built executable: app (3.1 MB)</p>
          <p className="mt-3 text-slate-500"># Build for iOS from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: app (4.8 MB)</p>
        </div>
      </div>

      <h2>Prestazioni</h2>
      <p>
        I binari compilati con Perry sono veloci. Poiché non c&apos;è riscaldamento JIT, nessun overhead
        dell&apos;interprete e nessuna pausa del garbage collector, le prestazioni sono prevedibili e costanti
        fin dalla prima invocazione.
      </p>
      <p>
        Nei nostri benchmark:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Tempo di avvio</strong> — effettivamente 0 ms (avvio processo nativo)</li>
        <li><strong>Dimensione del binario</strong> — 2–5 MB per strumenti CLI tipici (vs 50+ MB per Node.js in bundle)</li>
        <li><strong>Uso della memoria</strong> — 5–10x inferiore rispetto ad applicazioni Node.js equivalenti</li>
        <li><strong>Throughput</strong> — competitivo con C scritto a mano per carichi di lavoro compute-bound</li>
      </ul>
      <p>
        Puoi vedere i benchmark dal vivo su{" "}
        <a href="https://demo.perryts.com" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          demo.perryts.com
        </a>, che confronta gli eseguibili compilati con Perry con Node.js e Bun in tempo reale.
      </p>

      <h2>Stato attuale</h2>
      <p>
        Perry è in sviluppo attivo. Il compilatore è stabile con 62 test su 62
        superati nella suite di test. Tutti e sei i backend UI sono funzionali. Le funzionalità
        principali del linguaggio sono solide e in espansione.
      </p>
      <p>
        Stiamo lavorando attivamente per espandere la libreria di widget UI, migliorare le prestazioni
        di stringhe e oggetti, completare il supporto completo alle regex e costruire il modulo Stream. A lungo
        termine, stiamo pianificando target di compilazione WASM, multi-threading, un&apos;estensione VS Code
        e l&apos;integrazione con il package manager.
      </p>
      <p>
        Consulta la <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">roadmap</Link> completa per
        i dettagli su ciò che è stato rilasciato, ciò che è in corso e ciò che arriverà.
      </p>

      <h2>Inizia subito</h2>
      <p>
        Perry è open source. Puoi clonare il repository, compilare dal sorgente e iniziare a compilare
        TypeScript oggi:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> git clone https://github.com/PerryTS/perry.git</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">cd</span> perry</p>
          <p><span className="text-slate-500">$</span> cargo build --release</p>
          <p className="mt-3 text-slate-500"># Compile your first TypeScript file</p>
          <p><span className="text-slate-500">$</span> ./target/release/<span className="text-cyan-400">perry</span> build hello.ts</p>
          <p className="text-green-400">✓ Built executable: hello (2.1 MB)</p>
          <p><span className="text-slate-500">$</span> ./hello</p>
          <p className="text-slate-300">Hello, world!</p>
        </div>
      </div>
      <p>
        Sfoglia il codice sorgente su{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          GitHub
        </a>
        , dai un&apos;occhiata alla{" "}
        <Link href="/showcase" className="text-perry-400 hover:text-perry-300">vetrina</Link>
        {" "}per vedere cosa si sta costruendo con Perry, o tuffati direttamente nel codice.
        Non vediamo l&apos;ora di vedere cosa costruirai.
      </p>
    </>
  );
}
