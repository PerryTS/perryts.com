import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Una settimana fa, Perry era un compilatore con un toolkit UI. Potevi scrivere TypeScript, compilarlo
        in un binario nativo e distribuirlo su sei piattaforme. Questa era la storia. Oggi la storia è
        più grande: Perry sta diventando un ecosistema. Tre ORM per database, notifiche push universali,
        build distribuite con pubblicazione su App Store e Play Store, un livello di compatibilità React
        e verifica automatica delle app — tutto arrivato nell&apos;ultima settimana.
      </p>
      <p>
        Questo post copre cosa è stato rilasciato, perché è importante e come appare il codice.
      </p>

      <h2>perry/ui: Le Fondamenta</h2>
      <p>
        Prima di entrare nelle nuove librerie, vale la pena sottolineare cosa sta al centro
        di tutto: <code className="text-amber-400">perry/ui</code>. Questo è il toolkit UI
        nativo di Perry — oltre 20 widget che si compilano direttamente in componenti nativi della piattaforma su tutti
        e sei i target. Non è un wrapper, non è un livello di astrazione, non è una web view.
        Ogni <code className="text-amber-400">Button</code> diventa un{" "}
        <code className="text-amber-400">NSButton</code> su macOS, un{" "}
        <code className="text-amber-400">UIButton</code> su iOS, un{" "}
        <code className="text-amber-400">GtkButton</code> su Linux, un{" "}
        <code className="text-amber-400">android.widget.Button</code> su Android e un{" "}
        <code className="text-amber-400">CreateWindowEx</code> control su Windows.
      </p>
      <p>
        <code className="text-amber-400">perry/ui</code> è la superficie UI primaria e più avanzata
        di Perry. Include gestione reattiva dello stato, contenitori di layout (VStack, HStack,
        ZStack, SplitView), un Canvas con accelerazione hardware, viste Table con ordinamento delle colonne, il{" "}
        modulo <code className="text-amber-400">perry/system</code> per dialoghi file, accesso al
        keychain, notifiche e multi-finestra — tutto da TypeScript, tutto compilato in chiamate dirette
        alle API della piattaforma. Ogni altro approccio UI in Perry, incluso il livello di compatibilità
        React, è costruito sopra <code className="text-amber-400">perry/ui</code> e si riconduce
        ai suoi widget.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">app.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Window, VStack, Button, Text, State }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> count = <span className="text-blue-400">new</span> <span className="text-amber-400">State</span>(0);</p>
          <p className="mt-3"><span className="text-blue-400">const</span> window = <span className="text-blue-400">new</span> <span className="text-amber-400">Window</span>({`{ title: "Counter" }`});</p>
          <p>window.<span className="text-amber-400">setContent</span>(</p>
          <p className="ml-4"><span className="text-blue-400">new</span> <span className="text-amber-400">VStack</span>({`{`} children: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Text</span>({`{ text: count }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Button</span>({`{ title: "+1", onClick: () => count.set(count.get() + 1) }`}),</p>
          <p className="ml-4">] {`})`}</p>
          <p>);</p>
        </div>
      </div>

      <p>
        L&apos;oggetto reattivo <code className="text-amber-400">State</code> è la primitiva chiave.
        Quando un valore State cambia, solo i widget collegati a quello stato si aggiornano — nessun
        diffing del DOM virtuale, nessun re-rendering dell&apos;intero albero, nessun passaggio di riconciliazione.
        È il percorso più diretto da TypeScript alla UI nativa della piattaforma che esista.
      </p>

      <h2>Compatibilità React: Un Sottile Livello su perry/ui</h2>
      <p>
        Per gli sviluppatori provenienti da React, <code className="text-amber-400">perry-react</code>{" "}
        fornisce un livello di compatibilità che mappa il modello a componenti di React sui{" "}
        widget di <code className="text-amber-400">perry/ui</code>. Puoi usare{" "}
        <code className="text-amber-400">useState</code>,{" "}
        <code className="text-amber-400">useRef</code>,{" "}
        <code className="text-amber-400">useReducer</code> e JSX — e Perry li compila negli
        stessi widget nativi sottostanti. È un ponte di convenienza, non un motore di rendering separato.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.tsx</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> React, {`{ useState }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;react&apos;</span>;</p>
          <p className="mt-3"><span className="text-violet-400">function</span> <span className="text-amber-400">Counter</span>() {`{`}</p>
          <p className="ml-4"><span className="text-blue-400">const</span> [count, setCount] = <span className="text-amber-400">useState</span>(0);</p>
          <p className="ml-4"><span className="text-violet-400">return</span> (</p>
          <p className="ml-8">&lt;<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">h1</span>&gt;{`{count}`}&lt;/<span className="text-blue-400">h1</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">button</span> <span className="text-amber-400">onClick</span>={`{() => setCount(count + 1)}`}&gt;+1&lt;/<span className="text-blue-400">button</span>&gt;</p>
          <p className="ml-8">&lt;/<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-4">);</p>
          <p>{`}`}</p>
        </div>
      </div>

      <p>
        Sotto il cofano, ogni elemento JSX si mappa a un widget di <code className="text-amber-400">perry/ui</code>:{" "}
        <code className="text-amber-400">{`<div>`}</code> diventa un VStack,{" "}
        <code className="text-amber-400">{`<button>`}</code> diventa un Button,{" "}
        <code className="text-amber-400">useState</code> è supportato dallo State reattivo di Perry.
        È nelle fasi iniziali — Fase 1 con re-rendering dell&apos;intero albero e storage globale degli hook — ma
        dimostra che il codice React esistente può puntare a piattaforme native attraverso Perry. Stiamo
        anche esplorando la compatibilità con Angular e Ionic lungo linee simili.
      </p>

      <h2>Tre ORM per Database: API Prisma, Prestazioni Native</h2>
      <p>
        Se stai costruendo un server o un&apos;app desktop che comunica con un database, Perry ora ti
        copre con tre ORM compatibili con Prisma:{" "}
        <code className="text-amber-400">perry-prisma</code> (MySQL),{" "}
        <code className="text-amber-400">perry-sqlite</code> (SQLite) e{" "}
        <code className="text-amber-400">perry-postgres</code> (PostgreSQL). Tutti e tre sono sostituti
        diretti di <code className="text-amber-400">@prisma/client</code>. Stessa API, stessi
        pattern di query, ma compilati in codice nativo con FFI diretta al database — nessun motore Prisma,
        nessun Node.js.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">database.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ PrismaClient }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;@prisma/client&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> prisma = <span className="text-blue-400">new</span> <span className="text-amber-400">PrismaClient</span>();</p>
          <p className="mt-3"><span className="text-slate-500">// Same Prisma API — compiled to native SQL via Rust FFI</span></p>
          <p><span className="text-blue-400">const</span> users = <span className="text-violet-400">await</span> prisma.user.<span className="text-amber-400">findMany</span>({`{`}</p>
          <p className="ml-4">where: {`{ email: { contains: "@perry.dev" } }`},</p>
          <p className="ml-4">orderBy: {`{ createdAt: "desc" }`},</p>
          <p className="ml-4">take: 10,</p>
          <p>{`});`}</p>
          <p className="mt-3"><span className="text-violet-400">await</span> prisma.post.<span className="text-amber-400">create</span>({`{`}</p>
          <p className="ml-4">data: {`{ title: "Hello", authorId: users[0].id }`},</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        Sotto il cofano, ogni ORM è un front-end TypeScript supportato da un livello FFI Rust che usa{" "}
        <code className="text-amber-400">sqlx</code>. Il flusso delle query: TypeScript serializza la
        query in JSON, la passa attraverso il confine FFI, Rust costruisce SQL parametrizzato, lo esegue
        tramite il pool di connessioni e serializza il risultato indietro. Lo schema Prisma viene letto
        al momento della compilazione — zero parsing a runtime.
      </p>
      <p>
        Le tre implementazioni condividono circa il 95% del codice. Le differenze sono quelle che ci si
        aspetterebbe: quoting degli identificatori (<code className="text-amber-400">`col`</code> vs{" "}
        <code className="text-amber-400">&quot;col&quot;</code>), sintassi dei placeholder ({" "}
        <code className="text-amber-400">?</code> vs{" "}
        <code className="text-amber-400">$1, $2</code>) e semantica delle transazioni. Tutti e tre
        supportano l&apos;intera superficie CRUD di Prisma: findMany, findFirst, findUnique, create, createMany,
        update, updateMany, upsert, delete, deleteMany, count — più SQL raw, transazioni
        e oltre 10 operatori di filtro WHERE.
      </p>

      <h2>perry-push: Notifiche Push Universali</h2>
      <p>
        <code className="text-amber-400">perry-push</code> è una singola libreria che gestisce le notifiche
        push su ogni piattaforma: APNs (iOS/macOS), FCM (Android), Web Push (browser)
        e WNS (Windows). Ogni provider è un modulo FFI Rust con esattamente tre funzioni:{" "}
        <code className="text-amber-400">*_provider_new</code>,{" "}
        <code className="text-amber-400">*_provider_close</code> e{" "}
        <code className="text-amber-400">*_send</code>.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">notify.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ ApnProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/apn&apos;</span>;</p>
          <p><span className="text-violet-400">import</span> {`{ FcmProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/fcm&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> apn = <span className="text-blue-400">new</span> <span className="text-amber-400">ApnProvider</span>({`{ teamId, keyId, key }`});</p>
          <p><span className="text-blue-400">const</span> fcm = <span className="text-blue-400">new</span> <span className="text-amber-400">FcmProvider</span>({`{ serviceAccount }`});</p>
          <p className="mt-3"><span className="text-slate-500">// Unified result type for all providers</span></p>
          <p><span className="text-blue-400">const</span> result = <span className="text-violet-400">await</span> apn.<span className="text-amber-400">send</span>({`{`}</p>
          <p className="ml-4">deviceToken: token,</p>
          <p className="ml-4">title: <span className="text-green-400">&quot;New message&quot;</span>,</p>
          <p className="ml-4">body: <span className="text-green-400">&quot;You have a new reply&quot;</span>,</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        La crittografia è gestita da{" "}
        <code className="text-amber-400">ring</code> — JWT ES256 per APNs e VAPID, RS256 per
        gli account di servizio FCM, AES-GCM per la crittografia dei payload Web Push. Tutto compilato in codice nativo.
        Nessun <code className="text-amber-400">node-gyp</code>, nessuna dipendenza da OpenSSL.
      </p>

      <h2>Perry Hub + Builder: Build Cloud Distribuite</h2>
      <p>
        Questa è la mossa infrastrutturale. <code className="text-amber-400">perry-hub</code> è un
        server di orchestrazione build — esso stesso compilato da TypeScript con Perry — che gestisce un pool
        di worker di build. Carichi il tuo progetto, l&apos;hub lo invia al worker giusto in base
        alla piattaforma target, e il worker compila, firma e opzionalmente pubblica la tua app.
      </p>
      <p>
        Oggi esistono due worker: un builder macOS (gestisce i target macOS, iOS e Android) e un
        builder Linux (gestisce Linux e Android). Entrambi sono binari Rust che si connettono all&apos;hub
        via WebSocket, scaricano i tarball dei sorgenti, eseguono il compilatore Perry e caricano gli artefatti.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Firma del codice</strong> — notarizzazione Apple per macOS, profili di provisioning per iOS, firma keystore Android</li>
        <li><strong>Pubblicazione su App Store</strong> — upload diretto su App Store Connect e Google Play Store</li>
        <li><strong>Gestione degli artefatti</strong> — i binari compilati vengono caricati sull&apos;hub con pulizia basata su TTL</li>
        <li><strong>Gestione delle licenze</strong> — limiti di frequenza per licenza, code con priorità (il livello pro ha la priorità)</li>
      </ul>
      <p>
        L&apos;hub stesso è un caso di studio affascinante. È un file TypeScript di circa 1.500 righe compilato
        in un binario nativo da 2 MB da Perry. Esegue Fastify sulla porta 3456 per HTTP e{" "}
        <code className="text-amber-400">ws</code> sulla porta 3457 per WebSocket. Tutto lo stato è
        in memoria con persistenza JSON — nessun database esterno. È il tipo di server che
        puoi distribuire con <code className="text-amber-400">scp</code> e un file unit systemd.
      </p>

      <h2>perry-verify: Verifica Automatica delle App</h2>
      <p>
        <code className="text-amber-400">perry-verify</code> è un servizio HTTP indipendente che
        prende un binario compilato e una configurazione, esegue una pipeline di verifica e restituisce
        risultati strutturati pass/fail con screenshot. Lancia l&apos;app, esegue flussi di autenticazione
        (deterministici o assistiti da AI), controlla lo stato e cattura le prove.
      </p>
      <p>
        Esistono adattatori per piattaforma per macOS (tramite API di accessibilità), Linux (AT-SPI) e stub
        per iOS Simulator e Android Emulator. Il livello AI usa Claude per l&apos;autenticazione di fallback
        e la verifica dello stato quando i controlli deterministici non sono possibili. È progettato
        per inserirsi nella pipeline di build dell&apos;hub come passaggio post-build: compila, firma, verifica, pubblica.
      </p>

      <h2>Pry Arriva Ovunque</h2>
      <p>
        <Link href="/blog/building-pry" className="text-amber-400 hover:text-amber-300">Pry</Link>,
        il visualizzatore JSON nativo che abbiamo costruito come vetrina di Perry, ora è disponibile su cinque piattaforme. È
        sul{" "}
        <a href="https://apps.apple.com/app/pry-json-viewer/id6759329040" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Mac App Store
        </a>{" "}
        e su{" "}
        <a href="https://play.google.com/store/apps/details?id=com.perry.pry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Google Play
        </a>, con binari nativi per Linux e Windows. Stesso codebase TypeScript, cinque
        punti di ingresso specifici per piattaforma, cinque binari nativi. È la prova più concreta
        che l&apos;intero approccio funziona da capo a fondo — dal sorgente TypeScript alla pubblicazione sull&apos;App Store.
      </p>

      <h2>Cosa Significa Tutto Questo</h2>
      <p>
        Un compilatore è interessante. Un ecosistema è utile. Nell&apos;ultima settimana, Perry è passato da
        &quot;puoi compilare TypeScript in nativo&quot; a &quot;puoi costruire un&apos;app completa con
        UI nativa, un database Prisma, notifiche push e build che si auto-pubblicano
        sull&apos;App Store.&quot;
      </p>
      <p>
        I pezzi stanno iniziando a connettersi:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/ui</strong> è il percorso più diretto da TypeScript alla UI nativa della piattaforma — stato reattivo, oltre 20 widget, zero livelli di astrazione</li>
        <li><strong>perry-prisma/sqlite/postgres</strong> significa che il codice database esistente si porta con modifiche minime</li>
        <li><strong>perry-push</strong> significa notifiche push native senza librerie per-piattaforma</li>
        <li><strong>perry-hub + builder</strong> significa che puoi passare da <code className="text-amber-400">perry publish</code> all&apos;App Store in un solo passaggio</li>
        <li><strong>perry-verify</strong> significa test automatici dell&apos;output compilato, non solo dei sorgenti</li>
        <li><strong>perry-react</strong> significa che gli sviluppatori React possono avvicinarsi a Perry usando pattern familiari, tutti mappati su perry/ui sottostante</li>
      </ul>
      <p>
        Queste non sono cose teoriche. Ogni libreria elencata qui ha codice funzionante, test e
        documentazione. Diverse sono già usate in produzione — il sito landing di Perry stesso
        gira su un server Fastify compilato con Perry, e Pry è attivo in due app store.
      </p>

      <h2>Cosa Viene Dopo</h2>
      <p>
        La roadmap immediata:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Espansione di perry/ui</strong> — drag and drop, etichette di accessibilità, menu contestuali personalizzati, più primitive di layout</li>
        <li><strong>Integrazione di perry-verify</strong> — verifica automatica nella pipeline di build</li>
        <li><strong>Compatibilità con i framework</strong> — miglioramento dei livelli React, Angular e Ionic come rampe di accesso a perry/ui</li>
        <li><strong>Supporto regex completo</strong> — motore regex compatibile ECMAScript compilato in nativo</li>
      </ul>
      <p>
        Segui i progressi su{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, o consulta la{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">roadmap</Link>
        {" "}per il quadro completo.
      </p>
    </>
  );
}
