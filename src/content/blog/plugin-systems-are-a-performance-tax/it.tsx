export default function Content() {
  return (
    <>
      <p>
        Installi VS Code. È veloce. Aggiungi 15 estensioni. Ora ci mette 4 secondi
        ad avviarsi e l&apos;Extension Host consuma 800 MB di RAM. Cos&apos;è successo?
      </p>
      <p>
        Il pattern si ripete ovunque: WordPress, Eclipse, Chrome, Figma, Slack. L&apos;app
        viene rilasciata veloce. I plugin la rendono lenta. Nessuno è più sorpreso — abbiamo accettato
        questo come il costo dell&apos;estensibilità.
      </p>
      <p>
        Ma i sistemi di plugin non sono solo un problema di prestazioni. Sono un problema di
        filosofia di design. L&apos;industria ha confuso &quot;estensibilità&quot; con
        &quot;dinamismo a runtime&quot; quando spesso la risposta migliore è la composizione
        a tempo di compilazione. Gli unici plugin performanti sono quelli che smettono di essere plugin al
        momento della compilazione.
      </p>

      <h2>Lo spettro prestazionale dell&apos;estensibilità</h2>
      <p>
        Non tutta l&apos;estensibilità costa uguale. C&apos;è uno spettro da zero-cost a
        massimo-cost, e la maggior parte dell&apos;industria si è stabilita all&apos;estremità costosa:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Linking statico / moduli a tempo di compilazione</strong> — zero overhead. Librerie C,
          crate Rust, pacchetti Go. Il confine del modulo scompare completamente
          nel binario finale.
        </li>
        <li>
          <strong>Librerie condivise caricate all&apos;avvio</strong> — quasi zero. Moduli nginx,
          moduli del kernel Linux. Costo una tantum al caricamento, poi chiamate a funzione dirette.
        </li>
        <li>
          <strong>Dispatch dinamico via interfacce / vtable</strong> — piccolo overhead.
          Plugin per game engine in C++. Un&apos;indirezione di puntatore per chiamata.
        </li>
        <li>
          <strong>Plugin interpretati nello stesso processo</strong> — moderato. Plugin PHP di WordPress,
          bundle OSGi di Eclipse. Ogni invocazione di plugin passa attraverso un interprete.
        </li>
        <li>
          <strong>Plugin in processo separato via IPC</strong> — significativo. Estensioni VS Code,
          estensioni Chrome. Ogni interazione attraversa un confine di processo
          e serializza i dati.
        </li>
        <li>
          <strong>Plugin sandboxed via IPC serializzato</strong> — pesante. Plugin Figma,
          content script delle estensioni browser. Serializzazione, deserializzazione e applicazione
          della sandbox a ogni chiamata.
        </li>
      </ol>
      <p>
        L&apos;intuizione chiave: gli unici plugin performanti sono quelli che smettono di essere
        plugin al momento della compilazione. I livelli 1 e 2 sono veloci proprio perché il
        &quot;plugin&quot; diventa indistinguibile dal codice host nell&apos;artefatto finale.
      </p>

      <h2>Il danno nel mondo reale</h2>

      <h3>WordPress</h3>
      <p>
        Ogni plugin si aggancia al ciclo di vita della richiesta. 30 plugin significano 30 livelli di
        chiamate a funzione per caricamento pagina. Il risultato: i plugin di caching esistono unicamente per
        mitigare il danno degli altri plugin. Plugin per le prestazioni per risolvere il problema di prestazioni
        che i plugin hanno creato. La meta-ironia si scrive da sola.
      </p>

      <h3>VS Code</h3>
      <p>
        Le estensioni condividono un singolo event loop Node.js in un processo separato. Un&apos;estensione
        che si comporta male blocca tutte le altre. L&apos;Extension Host appare regolarmente
        come il principale consumatore di CPU sulle macchine degli sviluppatori. Microsoft ha costruito strumenti
        di profilazione, comandi bisect e sistemi di eventi di attivazione — un&apos;intera infrastruttura
        per gestire il problema che le estensioni creano.
      </p>

      <h3>Eclipse</h3>
      <p>
        Il monito. Risoluzione dei bundle OSGi, overhead del class loading, enormi
        grafi di dipendenze. Un tempo l&apos;IDE più popolare, ora largamente abbandonato dagli sviluppatori
        mainstream. L&apos;architettura a plugin che doveva essere il suo più grande punto di forza
        è diventata la sua debolezza definente.
      </p>

      <h3>Electron stesso</h3>
      <p>
        Il problema dei plugin a livello di piattaforma. Ogni app Electron include un runtime
        Chromium + Node.js completo. VS Code è Electron. Slack è Electron. Discord è
        Electron. Ognuno consuma indipendentemente 300&ndash;500 MB di RAM per renderizzare quello
        che è essenzialmente una finestra di chat o un editor di testo. Il &quot;plugin&quot; qui è
        l&apos;intera piattaforma web, inclusa ex novo per ogni applicazione.
      </p>

      <h2>Perché l&apos;industria continua a scegliere i plugin</h2>
      <p>
        Se i plugin sono così costosi, perché tutti continuano a costruirli? Le ragioni
        sono principalmente organizzative, non tecniche:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Esperienza sviluppatore</strong> — i plugin sono facili da scrivere quando non
          ti interessa delle prestazioni. Spedisci un file JS, agganci qualche evento, fatto.
        </li>
        <li>
          <strong>Crescita dell&apos;ecosistema</strong> — i plugin creano effetti di rete e coinvolgimento
          della community. Un marketplace di 30.000 estensioni è un potente vantaggio competitivo.
        </li>
        <li>
          <strong>Convenienza organizzativa</strong> — i plugin permettono ai team di rimandare decisioni di
          design. &quot;Qualcuno scriverà un plugin per quello&quot; è l&apos;equivalente architetturale
          di &quot;lo sistemiamo in post-produzione.&quot;
        </li>
        <li>
          <strong>Modello di business</strong> — i marketplace di plugin creano ricavi e lock-in.
          La piattaforma cattura valore dall&apos;ecosistema.
        </li>
      </ul>
      <p>
        La verità scomoda: i plugin sono spesso un modo per evitare di prendere decisioni architetturali
        difficili su cosa appartiene al core. Ti permettono di rilasciare
        qualcosa di incompleto e chiamarlo &quot;estensibile.&quot;
      </p>

      <h2>L&apos;alternativa: composizione a tempo di compilazione</h2>
      <p>
        E se l&apos;estensibilità avvenisse al momento del build invece che a runtime?
      </p>
      <p>
        Non è un&apos;ipotesi. Ci sono precedenti ben consolidati nei linguaggi di sistema:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Macro procedurali Rust</strong> — codice arbitrario che viene eseguito al momento della compilazione e
          genera codice nativo a zero overhead. Serializzazione Serde, setup del runtime async Tokio,
          routing Axum — tutto risolto prima che il tuo programma parta.
        </li>
        <li>
          <strong>Zig comptime</strong> — esecuzione a tempo di compilazione che elimina tutto il
          branching a runtime. Le strutture dati generiche sono monomorfizzate, la configurazione
          è risolta, il codice morto è eliminato. Ciò che rimane è esattamente ciò che viene eseguito.
        </li>
        <li>
          <strong>Template C++ / constexpr</strong> — polimorfismo a tempo di compilazione con
          zero costo a runtime. La STL raggiunge prestazioni straordinarie perché ogni
          algoritmo generico si specializza al momento della compilazione.
        </li>
        <li>
          <strong>Tree-shaking nei bundler</strong> — una versione parziale e imperfetta di
          questa idea applicata a JavaScript. Webpack e Rollup eliminano gli export non usati
          al momento del build. Il limite è che possono solo rimuovere codice, non
          specializzarlo.
        </li>
      </ul>
      <p>
        Il pattern è consistente: spostare le decisioni dal runtime al momento del build. Ciò che
        non includi non costa nulla. Ciò che includi compila in
        codice nativo senza indirezione. Il confine del modulo diventa uno strumento di organizzazione
        a livello di sorgente, non un confine di prestazioni a runtime.
      </p>

      <h2>Cosa significa per TypeScript</h2>
      <p>
        TypeScript è il linguaggio più popolare per costruire strumenti estensibili — e il
        peggiore per prestazioni a runtime. L&apos;intero ecosistema TypeScript gira su Node.js,
        che gira su V8, che compila JIT JavaScript. Ogni livello aggiunge overhead: tempo di
        warmup JIT, pause del garbage collection, dispatch dinamico per ogni accesso a proprietà,
        confini IPC tra processi.
      </p>
      <p>
        Qui entra in gioco Perry. Perry compila TypeScript direttamente in
        binari nativi. Nessun V8, nessun warmup JIT, nessuna pausa del garbage collection, nessun confine
        IPC.
      </p>
      <p>
        Quando i tuoi moduli compilano in codice nativo, i &quot;plugin&quot; diventano
        semplicemente... moduli. Si compongono al momento del build. Il binario finale ha zero overhead
        da plugin perché non ci sono plugin — solo codice nativo. Un gestore di route Express,
        una funzione middleware, una libreria di utilità — compilano tutti in
        chiamate a funzione dirette nello stesso binario. Nessun caricamento dinamico, nessuna
        serializzazione, nessun confine di processo.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500"># Your app, your dependencies, your &quot;plugins&quot; — one binary</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile server.ts -o server</p>
          <p className="text-slate-500">Compiling server.ts + 43 modules...</p>
          <p className="text-green-400">{"✓"} Built executable: server (1.8 MB, 0.7s)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./server</p>
          <p className="text-slate-300">Listening on port 3000</p>
        </div>
      </div>

      <p>
        Questo non è teorico. Perry già compila framework TypeScript del mondo reale
        — Hono, tRPC, Strapi — in binari nativi ARM64 sotto i 2 MB,
        in meno di un secondo. I moduli che compongono quei framework vengono compilati,
        linkati e integrati in un singolo eseguibile. Quella che sarebbe un&apos;architettura
        a plugin con overhead a runtime in Node.js diventa composizione a zero costo
        in un binario Perry.
      </p>

      <h2>L&apos;estensibilità di cui hai realmente bisogno</h2>
      <p>
        L&apos;obiezione è ovvia: &quot;Ma ho bisogno di estensibilità a runtime. Gli utenti devono
        installare plugin senza ricompilare.&quot;
      </p>
      <p>
        Davvero? Per la maggior parte delle applicazioni, l&apos;insieme delle estensioni è noto al momento del build.
        Scegli il tuo middleware Express, il driver del database, la libreria di autenticazione, il
        framework di logging — e poi fai il deploy. L&apos;&quot;estensibilità&quot; è nel tuo{" "}
        <code className="text-perry-400">package.json</code>, risolta al{" "}
        <code className="text-perry-400">npm install</code>, non a runtime.
      </p>
      <p>
        Le applicazioni che hanno genuinamente bisogno di caricamento di plugin a runtime — VS Code, WordPress,
        browser — sono l&apos;eccezione, non la regola. E anche quelle pagano un prezzo alto per
        questo. Per tutto il resto, la composizione a tempo di compilazione offre la stessa flessibilità
        senza nessun overhead.
      </p>
      <p>
        La differenza è onestà architetturale. Invece di fingere che ogni applicazione
        abbia bisogno di un sistema di plugin, chiedi: questa estensibilità deve avvenire a runtime,
        o il compilatore può fare il lavoro?
      </p>

      <h2>La strada da percorrere</h2>
      <p>
        La dipendenza dell&apos;industria dalle architetture a plugin è un sintomo dell&apos;accettare
        l&apos;overhead a runtime come inevitabile. Non lo è. Il compilatore può fare il lavoro.
        La composizione a tempo di build ti dà estensibilità senza la tassa.
      </p>
      <p>
        Stiamo costruendo Perry perché crediamo che gli sviluppatori TypeScript meritino prestazioni
        native senza rinunciare al linguaggio che amano. I tuoi moduli dovrebbero comporsi
        al momento del build, compilare in chiamate a funzione dirette ed eseguire senza l&apos;overhead di
        un runtime che esiste solo per rendere possibile l&apos;&quot;estensibilità&quot;.
      </p>
      <p>
        Il sistema di plugin più veloce è quello che non esiste a runtime.
      </p>
    </>
  );
}
