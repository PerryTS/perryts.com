import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        82 commit in sette giorni. Un sito di documentazione con 49 pagine. Pubblicazione automatica su App Store e Play Store.
        Pacchetti Homebrew e APT. Estensioni WidgetKit native compilate da TypeScript.
        Un compilatore LLVM self-hosting. E dozzine di correzioni di bug su ogni piattaforma.
      </p>
      <p>
        Questo post copre tutto ciò che è stato rilasciato in Perry tra il 6 e il 13 marzo 2026. Il tema
        è il completamento — colmare le lacune tra &quot;ho scritto del TypeScript&quot; e &quot;la mia app
        è sull&apos;App Store.&quot;
      </p>

      <h2>docs.perryts.com</h2>
      <p>
        Perry ora ha un vero sito di documentazione. 49 pagine costruite con mdBook, che coprono tutto da
        come iniziare al riferimento della CLI. La documentazione è organizzata in sezioni:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Per Iniziare</strong> — installazione, primo progetto, struttura del progetto</li>
        <li><strong>Funzionalità del Linguaggio</strong> — tutto ciò che Perry supporta da TypeScript</li>
        <li><strong>UI Nativa</strong> — 12 pagine che coprono tutti i tipi di widget, layout, gestione dello stato e comportamento specifico della piattaforma</li>
        <li><strong>Piattaforme</strong> — pagine dedicate per ognuna delle 6 piattaforme target</li>
        <li><strong>Libreria Standard</strong> — oltre 50 implementazioni di pacchetti nativi documentate</li>
        <li><strong>API di Sistema</strong> — dialoghi file, keychain, notifiche, multi-finestra</li>
        <li><strong>WidgetKit</strong> — il nuovo modulo per le estensioni widget</li>
        <li><strong>Plugin</strong> — architettura dei plugin a tempo di compilazione</li>
        <li><strong>Riferimento CLI</strong> — ogni comando e flag</li>
      </ul>
      <p>
        Il sito include anche un file <code className="text-amber-400">llms.txt</code> per
        la scopribilità AI, ed è distribuito tramite GitHub Pages con un dominio personalizzato su{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>.
      </p>

      <h2>Installa Perry con Un Comando</h2>
      <p>
        Perry è ora distribuito attraverso Homebrew e APT, oltre alla compilazione dal sorgente. Una nuova
        pipeline di rilascio GitHub Actions compila binari per macOS (arm64 e x86_64) e
        Linux (x86_64 e arm64), poi aggiorna automaticamente il tap Homebrew e il repository APT.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500"># macOS</span></p>
          <p><span className="text-cyan-400">brew</span> tap PerryTS/perry</p>
          <p><span className="text-cyan-400">brew</span> install perry</p>
          <p className="mt-3"><span className="text-slate-500"># Debian/Ubuntu</span></p>
          <p><span className="text-cyan-400">sudo</span> apt update &amp;&amp; sudo apt install perry</p>
        </div>
      </div>

      <p>
        Niente più clonazione del repo e compilazione con Cargo. Installa Perry nello stesso modo in cui installi
        qualsiasi altro strumento.
      </p>

      <h2>Pubblicazione Automatica sull&apos;App Store</h2>
      <p>
        Questo è il cambiamento che elimina il maggior numero di passaggi manuali. Eseguire{" "}
        <code className="text-amber-400">perry publish ios</code> ora gestisce l&apos;intera pipeline di distribuzione iOS
        automaticamente:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>Genera una chiave RSA e CSR tramite l&apos;API di App Store Connect</li>
        <li>Crea un certificato di distribuzione e lo impacchetta in un <code className="text-amber-400">.p12</code></li>
        <li>Registra il bundle ID</li>
        <li>Crea e scarica un profilo di provisioning</li>
        <li>Crea il record dell&apos;app su App Store Connect</li>
        <li>Compila, firma e carica su TestFlight o sull&apos;App Store</li>
      </ol>
      <p>
        Nessun Xcode. Nessuna visita manuale al portale. Nessun download di certificati dal browser. La procedura guidata
        di configurazione si avvia automaticamente la prima volta che pubblichi, guidandoti nella configurazione
        della chiave API e salvando le credenziali in <code className="text-amber-400">perry.toml</code>.
      </p>
      <p>
        La distribuzione macOS è ugualmente automatizzata. Perry supporta tre modalità: TestFlight, DMG notarizzato
        e una nuova modalità <strong>&quot;entrambi&quot;</strong> che pubblica sull&apos;App Store e crea un
        DMG notarizzato contemporaneamente. Tre tipi di certificato vengono generati automaticamente:{" "}
        <code className="text-amber-400">MAC_APP_DISTRIBUTION</code>,{" "}
        <code className="text-amber-400">MAC_INSTALLER_DISTRIBUTION</code> e{" "}
        <code className="text-amber-400">DEVELOPER_ID_APPLICATION</code>.
      </p>
      <p>
        Anche la pubblicazione Android ha ottenuto una procedura guidata di configurazione automatica. Tutte e tre le piattaforme ora seguono
        lo stesso schema: la prima esecuzione avvia la configurazione, le credenziali vengono salvate nel progetto, le esecuzioni
        successive sono a zero configurazione.
      </p>
      <p>
        La validazione pre-volo cattura i problemi prima che la compilazione inizi — mismatch del bundle ID nel
        profilo di provisioning, scadenza del certificato, icona dell&apos;app mancante, formato di versione non valido, team ID errato.
        E <code className="text-amber-400">encryption_exempt</code> in{" "}
        <code className="text-amber-400">perry.toml [ios]</code> imposta automaticamente la chiave{" "}
        <code className="text-amber-400">ITSAppUsesNonExemptEncryption</code> nell&apos;Info.plist, saltando
        il prompt manuale di conformità all&apos;esportazione in App Store Connect.
      </p>

      <h2>perry/widget: WidgetKit da TypeScript</h2>
      <p>
        Perry può ora compilare TypeScript in estensioni WidgetKit SwiftUI native. Questo non è un wrapper
        o un bridge — il compilatore percorre l&apos;albero di render a livello HIR ed emette codice sorgente SwiftUI
        direttamente. L&apos;output è un bundle completo di estensione WidgetKit che Xcode (o la pipeline di build
        di Perry) può incorporare nella tua app.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-cyan-400">perry</span> widget.ts --target ios-widget --app-bundle-id com.example.app -o out/</p>
        </div>
      </div>

      <p>
        L&apos;approccio è fondamentalmente diverso dal resto della compilazione di Perry. Il codice Perry normale
        passa attraverso Cranelift al codice macchina nativo. Il codice dei widget passa attraverso l&apos;HIR all&apos;output
        di testo SwiftUI, perché WidgetKit richiede SwiftUI — non c&apos;è modo di costruire un&apos;estensione widget
        con codice imperativo UIKit o AppKit. Perry risolve questo trattando l&apos;albero di render del widget come un
        template a tempo di compilazione, non come codice runtime.
      </p>

      <h2>Nuovi Widget e Miglioramenti per Piattaforma</h2>
      <p>
        Quattro nuovi tipi di widget sono arrivati questa settimana:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>TextArea</strong> — modifica di testo multilinea su macOS, iOS e Android</li>
        <li><strong>SecureField</strong> — input per password su iOS e macOS</li>
        <li><strong>QR Code</strong> — generazione nativa di codici QR su iOS, macOS e Android</li>
        <li><strong>Splash Screen</strong> — storyboard LaunchScreen auto-generati (iOS) e temi splash (Android)</li>
      </ul>

      <h3>iPad Diventa Nativo</h3>
      <p>
        Perry ora genera app completamente native per iPad: <code className="text-amber-400">UIDeviceFamily [1,2]</code>,
        supporto all&apos;orientamento, <code className="text-amber-400">UIRequiresFullScreen</code> e uno storyboard
        LaunchScreen compilato tramite ibtool. Una nuova funzione <code className="text-amber-400">getDeviceIdiom()</code>{" "}
        rileva telefono vs. iPad a runtime, e <code className="text-amber-400">PerryFrameSplit</code>{" "}
        fornisce contenitori split orizzontali basati su frame per layout iPad.
      </p>

      <h3>Windows</h3>
      <p>
        Windows ha ottenuto il supporto timer (tick <code className="text-amber-400">WM_TIMER</code> da 50ms),
        pulsanti owner-drawn con sfondi tema scuro e correzioni per un bug use-after-free in{" "}
        <code className="text-amber-400">to_wide().as_ptr()</code> in 18 file di widget. Il runtime V8
        ora funziona su Windows con le librerie di sistema richieste collegate.
      </p>

      <h3>GTK4 (Linux)</h3>
      <p>
        Il backend GTK4 ha ricevuto una rifinitura visiva per corrispondere a macOS: padding CSS per gli edge inset, stile
        pulsanti Adwaita, correzioni margini VStack e policy orizzontale ScrollView.
      </p>

      <h2>http/https e better-sqlite3</h2>
      <p>
        Due aggiunte significative alla stdlib:
      </p>
      <p>
        I nuovi moduli nativi <code className="text-amber-400">http</code> e{" "}
        <code className="text-amber-400">https</code> forniscono HTTP lato client
        usando reqwest sotto il cofano. L&apos;API corrisponde a Node.js:{" "}
        <code className="text-amber-400">request()</code>,{" "}
        <code className="text-amber-400">get()</code>,{" "}
        <code className="text-amber-400">ClientRequest</code> con write/end/on e{" "}
        <code className="text-amber-400">IncomingMessage</code> con statusCode e gestori di eventi.
      </p>
      <p>
        <code className="text-amber-400">better-sqlite3</code> è ora completamente supportato:{" "}
        <code className="text-amber-400">new Database()</code>,{" "}
        <code className="text-amber-400">prepare</code>,{" "}
        <code className="text-amber-400">exec</code>,{" "}
        <code className="text-amber-400">run</code>,{" "}
        <code className="text-amber-400">get</code>,{" "}
        <code className="text-amber-400">all</code> — con NaN-boxing appropriato e oggetti riga
        con accesso alle proprietà per nome.
      </p>
      <p>
        Altri miglioramenti della stdlib: <code className="text-amber-400">crypto.randomBytes()</code> ora
        restituisce un Buffer (come in Node.js), MongoDB ha ottenuto{" "}
        <code className="text-amber-400">listDatabases</code> e{" "}
        <code className="text-amber-400">listCollections</code> con correzioni di thread-safety, e
        le operazioni INSERT/UPDATE/DELETE di mysql2 ora restituiscono{" "}
        <code className="text-amber-400">ResultSetHeader</code> con{" "}
        <code className="text-amber-400">insertId</code>.
      </p>

      <h2>Correzioni GC e di Correttezza</h2>
      <p>
        Diverse correzioni critiche al garbage collector e alla correttezza del runtime sono state rilasciate questa settimana:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Guardia di rientranza GC</strong> — previene la raccolta durante l&apos;allocazione, correggendo i panic di double-borrow RefCell</li>
        <li><strong>Tracciamento Map del GC</strong> — le Map sono ora correttamente tracciate durante la fase di mark, prevenendo la raccolta delle chiavi stringa</li>
        <li><strong>Correzione aliasing stringhe</strong> — l&apos;append di stringhe ora alloca sempre stringhe fresche, correggendo la corruzione dall&apos;aliasing della copia dei puntatori</li>
        <li><strong>Aritmetica BigInt</strong> — lo shift a destra usa lo shift aritmetico per numeri negativi, le operazioni bitwise usano la semantica di wrapping ToInt32</li>
        <li><strong>Map.get() undefined</strong> — restituisce il corretto <code className="text-amber-400">TAG_UNDEFINED</code> per chiavi mancanti invece del tag NaN errato</li>
        <li><strong>Radici GC per campi statici</strong> — i valori BigInt nei campi statici delle classi registrati come radici GC</li>
      </ul>
      <p>
        Queste non sono correzioni minori. La correzione della rientranza GC da sola ha risolto un&apos;intera classe di
        crash intermittenti. La correzione dell&apos;aliasing delle stringhe riguardava qualsiasi programma che assegnava una variabile
        stringa a un&apos;altra e poi modificava una delle due. Questi sono i tipi di bug che emergono solo sotto carichi
        di lavoro reali, e correggerli è ciò che rende il compilatore pronto per la produzione.
      </p>

      <h2>perry-verify: Rafforzato</h2>
      <p>
        <code className="text-amber-400">perry-verify</code>, il servizio di verifica automatica delle app,
        ha ricevuto un passaggio di hardening della sicurezza: esecuzione sandboxed tramite{" "}
        <code className="text-amber-400">bwrap</code> su Linux e{" "}
        <code className="text-amber-400">sandbox-exec</code> su macOS, token di autenticazione sull&apos;handshake WebSocket
        e il download dei binari, rate limiting per IP, job ID UUID completi per prevenire l&apos;enumerazione
        e limiti di dimensione del body ridotti.
      </p>

      <h2>perrysdad: Il Compilatore Self-Hosting</h2>
      <p>
        In uno sforzo parallelo, <code className="text-amber-400">perrysdad</code> — un compilatore LLVM IR self-hosting
        scritto in TypeScript — è passato da zero all&apos;auto-compilazione in cinque fasi durante la settimana:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li><strong>Fase 0-1</strong> — scheletro end-to-end: HIR a testo LLVM IR a clang, linkato contro <code className="text-amber-400">libperry_runtime.a</code> di Perry</li>
        <li><strong>Fase 2</strong> — parser a discesa ricorsiva scritto a mano con parsing di espressioni Pratt per file <code className="text-amber-400">.ts</code> reali</li>
        <li><strong>Fase 3</strong> — array, oggetti e map con FFI runtime, più la correzione di un mismatch ABI critico (JSValue dichiarato come double nell&apos;LLVM IR invece di i64)</li>
        <li><strong>Fase 4</strong> — classi, enum, closure, compilazione multi-file con scoperta dei moduli e ordinamento topologico</li>
      </ol>
      <p>
        Il traguardo: il binario <code className="text-amber-400">anvil</code> auto-compilato può ora
        compilare programmi di test e produrre output corretto corrispondente alla versione compilata con node. Un compilatore TypeScript,
        compilato da Perry in codice nativo, che compila altro TypeScript in codice nativo. Tartarughe
        fino in fondo.
      </p>

      <h2>In Numeri</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>82 commit</strong> al compilatore Perry principale</li>
        <li><strong>1 rilascio</strong>: v0.2.173 (8 marzo)</li>
        <li><strong>49 pagine di documentazione</strong> su docs.perryts.com</li>
        <li><strong>4 nuovi widget</strong>: TextArea, SecureField, QR Code, Splash Screen</li>
        <li><strong>3 canali di distribuzione</strong>: Homebrew, APT, sorgente</li>
        <li><strong>3 pipeline automatiche per store</strong>: App Store, TestFlight, Google Play</li>
        <li><strong>Tutte e 6 le piattaforme</strong> hanno ricevuto miglioramenti questa settimana</li>
      </ul>

      <h2>Cosa Viene Dopo</h2>
      <p>
        La pipeline si sta riempiendo. Puoi scrivere TypeScript, compilare per sei piattaforme, distribuire tramite
        Homebrew o APT, pubblicare sull&apos;App Store e Play Store, aggiungere widget alla schermata home e leggere
        documentazione completa — tutto senza lasciare la toolchain di Perry. Cosa resta:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Supporto regex completo</strong> — l&apos;ultima grande lacuna del linguaggio</li>
        <li><strong>Espansione perry/ui</strong> — drag and drop, etichette di accessibilità, DatePicker</li>
        <li><strong>Maturazione di perrysdad</strong> — espansione del compilatore self-hosting verso la piena parità con Perry</li>
        <li><strong>Beta pubblica dell&apos;Hub</strong> — apertura delle build distribuite agli utenti esterni</li>
      </ul>
      <p>
        Segui i progressi su{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, leggi la nuova documentazione su{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>, o consulta la{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">roadmap</Link>
        {" "}per il quadro completo.
      </p>
    </>
  );
}
