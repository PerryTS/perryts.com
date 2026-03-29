import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Cinque giorni, 120 commit, e Perry salta da v0.4.0 a v0.4.24. I punti salienti: tvOS diventa il 10° target di compilazione, le app iOS e macOS possono ora essere compilate interamente da Linux, perry login porta la fatturazione basata sull&apos;uso, e l&apos;interfaccia Windows riceve una revisione completa. Ecco tutto ciò che è stato rilasciato.
      </p>

      <h2>tvOS: il 10° target di compilazione</h2>
      <p>
        Perry ora compila per Apple TV. Il target tvOS usa lo stesso renderer SwiftUI di watchOS, condividendo l&apos;architettura data-driven dove Perry costruisce un albero UI e un&apos;app host Swift fornita lo renderizza nativamente. Combinato con l&apos;integrazione WASM <code>@perry/threads</code> esistente, le app tvOS possono eseguire carichi di lavoro pesanti in background mantenendo l&apos;UI reattiva.
      </p>
      <pre><code>{`# Compile for Apple TV
perry compile main.ts --target tvos

# Run on tvOS simulator
perry run tvos`}</code></pre>
      <p>
        Questo porta il conteggio totale dei target a <strong>10</strong>: macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly e Web/JavaScript. Un codice TypeScript, dieci output nativi.
      </p>

      <h2>Cross-compilazione iOS e macOS da Linux</h2>
      <p>
        Perry può ora compilare binari iOS e macOS interamente da una macchina Linux usando <code>ld64.lld</code> come linker Mach-O. Questo è il pezzo mancante per un CI/CD completamente automatizzato — invia TypeScript a un server Linux, ottieni binari nativi firmati per ogni piattaforma Apple senza una macchina di build macOS.
      </p>
      <p>
        Arrivarci ha richiesto la risoluzione di una cascata di problemi del linker:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Triple codegen Mach-O</strong> — aggiunte triple target <code>aarch64-apple-macos</code> e <code>aarch64-apple-ios</code> per Cranelift</li>
        <li><strong>Linking dei framework</strong> — percorsi di ricerca dei framework CoreGraphics, Metal, IOKit, DiskArbitration per la cross-compilazione</li>
        <li><strong><code>-lobjc</code></strong> — simboli runtime ObjC necessari per tutti i target Apple</li>
        <li><strong>Versione SDK</strong> — <code>sdk_version 26.0</code> in ld64.lld (Apple richiede iOS 18+)</li>
        <li><strong>Dead stripping</strong> — <code>-dead_strip</code> invece di <code>-Wl,-dead_strip</code> per il linker Mach-O</li>
        <li><strong>Deduplicazione runtime</strong> — rimozione duplicati <code>perry_runtime</code> dalle librerie statiche UI per evitare errori di link</li>
      </ul>
      <p>
        Combinato con la cross-compilazione Linux → Windows esistente (v0.2.195+), Perry può ora cross-compilare verso <strong>ogni piattaforma da Linux</strong> — iOS, macOS, Windows, Android, WASM e Web.
      </p>

      <h2>Prontezza per l&apos;App Store iOS</h2>
      <p>
        Un focus importante di questo ciclo è stato rendere le app iOS compilate con Perry completamente conformi all&apos;App Store:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Info.plist completo</strong> — tutte le chiavi richieste da Apple: <code>CFBundleIdentifier</code>, <code>CFBundleName</code>, <code>CFBundleShortVersionString</code>, <code>CFBundleVersion</code>, <code>UIDeviceFamily</code>, <code>UIRequiredDeviceCapabilities</code></li>
        <li><strong>CFBundleIcons</strong> — naming icone iOS standard (<code>AppIcon60x60@2x</code>, ecc.) con risoluzione fallback</li>
        <li><strong>Versione da perry.toml</strong> — i campi <code>version</code> e <code>build_number</code> fluiscono direttamente nell&apos;Info.plist</li>
        <li><strong>UILaunchScreen</strong> — usa la chiave moderna invece di <code>UILaunchStoryboardName</code> (nessun file storyboard necessario)</li>
        <li><strong>Profili di provisioning</strong> — supporto profili di provisioning macOS per la distribuzione App Store e TestFlight</li>
      </ul>

      <h2>Perry Login e fatturazione</h2>
      <p>
        Perry ora ha account e fatturazione basata sull&apos;uso, alimentati da un nuovo comando CLI <code>perry login</code> e una dashboard su <a href="https://app.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">app.perryts.com</a>.
      </p>
      <h3>Come funziona</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry login</code></strong> — flusso GitHub OAuth per dispositivo, apre il browser, esegue polling per il completamento</li>
        <li><strong>Piano gratuito</strong> — 15 build/mese, progetti illimitati con un account GitHub</li>
        <li><strong>Piano Pro</strong> — build illimitate tramite abbonamento Polar.sh</li>
        <li><strong>Token API</strong> — genera e gestisci token dalla dashboard per CI/CD</li>
        <li><strong>Tracciamento utilizzo</strong> — contatori mensili di publish e verify con barre di utilizzo in tempo reale</li>
      </ul>
      <p>
        La dashboard stessa è un server Fastify compilato con Perry con un export statico Next.js — costruito con Perry, per servire gli utenti Perry.
      </p>

      <h2>Notarizzazione macOS e firma del codice</h2>
      <p>
        Due nuove capacità di firma:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry publish macos --notarize</code></strong> — passa automaticamente al certificato Developer ID (invece del certificato App Store), invia al servizio di notarizzazione Apple e graffetta il risultato</li>
        <li><strong>Firma codice GCloud KMS</strong> — le build Windows possono ora essere firmate usando chiavi Google Cloud KMS, abilitando la firma automatizzata nel CI senza esporre chiavi private</li>
      </ul>

      <h2>Revisione UI Windows</h2>
      <p>
        Il backend UI Windows ha ricevuto il suo aggiornamento più completo:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Scaling DPI-aware</strong> — dimensioni finestra, font e dimensioni widget scalano correttamente su display ad alta densità</li>
        <li><strong>API finestre stile launcher</strong> — finestre senza bordi con posizionamento personalizzato per UI stile launcher/spotlight</li>
        <li><strong>Hotkey globali</strong> — scorciatoie da tastiera a livello di sistema che funzionano anche quando l&apos;app non è in focus</li>
        <li><strong>Icone app</strong> — API <code>getAppIcon</code> per visualizzare icone di applicazioni nelle UI launcher</li>
        <li><strong>Layout sicuro contro la rientranza</strong> — painting basato su <code>RefCell</code> sostituito con storage HWND <code>SetPropW</code> per prevenire panic durante messaggi WM_PAINT annidati</li>
        <li><strong>Integrazione Geisterhand</strong> — tutti i tipi di widget registrati con il framework di test UI, <code>/type</code> usa <code>SendMessageW</code> tramite mappa HWND</li>
        <li><strong>Supporto camera Android</strong> — API di cattura camera estesa ad Android via JNI</li>
      </ul>

      <h2>Prestazioni</h2>
      <p>
        v0.4.14 ha rilasciato un audit completo delle prestazioni:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>fcmp</code> nativo</strong> — i confronti floating-point usano istruzioni CPU native invece di chiamate a funzioni runtime. Benchmark Mandelbrot <strong>30% più veloce</strong>.</li>
        <li><strong>Append stringa in-place</strong> — <code>str += &quot;text&quot;</code> modifica il buffer in-place invece di allocare una nuova stringa. <strong>125x più veloce</strong> per concatenazione ripetuta.</li>
        <li><strong>Cortocircuito AND/OR</strong> — <code>&amp;&amp;</code> e <code>||</code> saltano la valutazione dell&apos;operando destro quando il risultato è già determinato.</li>
        <li><strong>Folding letterali negativi</strong> — <code>-1</code>, <code>-0.5</code> ecc. vengono ridotti a costanti a livello HIR invece di emettere un&apos;istruzione di negazione.</li>
      </ul>

      <h2>Build parallele Hub</h2>
      <p>
        Il server di orchestrazione build ora supporta build concorrenti per worker:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Dispatch basato su slot</strong> — i worker riportano la capacità <code>max_concurrent</code>, l&apos;Hub traccia i job attivi per worker</li>
        <li><strong>Niente più 429</strong> — i job si mettono in coda invece di essere rifiutati quando tutti i worker sono occupati</li>
        <li><strong>Download artefatti Base64</strong> — artefatti binari serviti come base64 quando il runtime Perry non può gestire risposte HTTP binarie raw</li>
        <li><strong>WebSocket con auto-riconnessione</strong> — le connessioni di monitoraggio build si riconnettono automaticamente alla disconnessione</li>
      </ul>

      <h2>Nuovo pacchetto: perry/appstorereview</h2>
      <p>
        Un nuovo pacchetto first-party per richiedere recensioni sull&apos;app store:
      </p>
      <pre><code>{`import { requestReview } from "perry/appstorereview";

// Opens the native review prompt
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();`}</code></pre>
      <p>
        Una funzione, due piattaforme, UI di recensione nativa. La logica di timing e visualizzazione è interamente a carico dello sviluppatore.
      </p>

      <h2>Fix di codegen</h2>
      <p>
        120 commit significano molti bug fix. I più impattanti:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Uguaglianza stretta (===)</strong> — tre bug separati corretti in v0.4.2: confronto tag tipo, gestione NaN e distinzione null/undefined</li>
        <li><strong>Confronto stringhe per stringhe concatenate</strong> — <code>===</code> falliva confrontando stringhe costruite via concatenazione a causa del confronto per puntatore invece che per contenuto</li>
        <li><strong>Risoluzione costruttore</strong> — <code>new X(args)</code> ora risolve correttamente costruttori importati cross-modulo e funzioni costruttore basate su closure</li>
        <li><strong>Push array a livello di modulo</strong> — i valori inseriti in array a livello di modulo dentro chiamate a funzione annidate in loop venivano persi a causa di puntatori stantii dopo la riallocazione</li>
        <li><strong>Coercizione aritmetica null</strong> — <code>null + 1</code> ora produce correttamente <code>1</code> tramite <code>js_number_coerce</code></li>
        <li><strong>Wrapping NOT bitwise</strong> — <code>~x</code> ora esegue il wrap a i32 secondo la semantica ECMAScript</li>
        <li><strong>fetch().then()</strong> — i callback non venivano mai invocati nelle app UI native a causa del drain mancante dell&apos;event loop (v0.4.3)</li>
        <li><strong>Modulo e esponente WASM</strong> — gli operatori <code>%</code> e <code>**</code> causavano errori di validazione WASM (v0.4.5)</li>
      </ul>

      <h2>I numeri</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>~120 commit</strong> al compilatore Perry principale in 5 giorni</li>
        <li><strong>24 rilasci patch</strong>: v0.4.1 → v0.4.24</li>
        <li><strong>Target di compilazione</strong>: 9 → 10 (aggiunto tvOS)</li>
        <li><strong>Target cross-compilazione da Linux</strong>: Windows → Windows, iOS, macOS (tutti Apple + Windows)</li>
        <li><strong>Nuovi pacchetti</strong>: perry/appstorereview</li>
        <li><strong>Nuova infrastruttura</strong>: dashboard app.perryts.com, CLI perry login, fatturazione Polar.sh</li>
        <li><strong>Guadagni prestazionali</strong>: 30% più veloce mandelbrot (fcmp nativo), 125x più veloce concatenazione stringhe</li>
      </ul>

      <h2>Prossimi passi</h2>
      <p>
        La cross-compilazione di iOS e macOS da Linux significa che l&apos;Hub può ora compilare per ogni piattaforma da un singolo server Linux — niente più macchine di build macOS dedicate per la compilazione (solo per la firma). L&apos;infrastruttura di fatturazione apre la strada alla beta pubblica dell&apos;Hub. E con tvOS aggiunto, Perry copre ogni piattaforma Apple: macOS, iOS, iPadOS, watchOS e tvOS.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Beta pubblica Hub</strong> — utenti esterni possono inviare TypeScript e ottenere binari nativi</li>
        <li><strong>Supporto regex completo</strong> — l&apos;ultimo grande gap del linguaggio</li>
        <li><strong>Espansione perry/ui</strong> — drag and drop, accessibilità, DatePicker</li>
        <li><strong>Source map e info di debug</strong> — info di debug DWARF per il debugging nativo</li>
      </ul>
      <p>
        Segui i progressi su{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, leggi la documentazione su{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>, o consulta la{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">roadmap</Link>
        {" "}per il quadro completo.
      </p>
    </>
  );
}
