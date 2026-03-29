import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        103 commit al compilatore Perry questa settimana. Le funzionalit&agrave; principali: ora &egrave; possibile eseguire la cross-compilazione di eseguibili Windows da Linux, le app iOS possono eseguire game loop bloccanti, il compilatore segnala i crash per la telemetria e il compilatore self-hosting supera tutti i test deterministici che gli sottoponiamo. In pi&ugrave; un importante aggiornamento dell&apos;infrastruttura Hub e oltre 50 correzioni di bug.
      </p>

      <h2>Cross-Compilazione verso Windows da Linux</h2>
      <p>
        Perry ora pu&ograve; produrre binari Windows <code className="text-amber-400">.exe</code> da un host Linux. Questo &egrave; il pezzo mancante per le pipeline CI/CD che devono puntare a Windows senza eseguire una macchina di build Windows per l&apos;intera compilazione.
      </p>
      <p>
        L&apos;implementazione sostituisce i controlli <code className="text-amber-400">#[cfg]</code> in fase di compilazione con il rilevamento del target a runtime. Quando il compilatore rileva un target Windows su un host non-Windows, localizza <code className="text-amber-400">lld-link</code>,{" "}
        <code className="text-amber-400">llvm-nm</code> e{" "}
        <code className="text-amber-400">llvm-ar</code> dalla toolchain Rust o dal PATH tramite un nuovo helper <code className="text-amber-400">find_llvm_tool()</code>. Le librerie di sistema Windows provengono da un sysroot in stile{" "}
        <a href="https://github.com/Jake-Shadle/xwin" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          xwin
        </a>{" "}
        indicato da <code className="text-amber-400">PERRY_WINDOWS_SYSROOT</code>.
      </p>
      <p>
        Il linker utilizza automaticamente <code className="text-amber-400">/FORCE:UNRESOLVED</code> e genera stub per i simboli UI mancanti, cos&igrave; le app CLI si cross-compilano senza problemi. L&apos;output predefinito &egrave; <code className="text-amber-400">.exe</code> quando si punta a Windows. I dettagli completi sono nella{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          documentazione sulla cross-compilazione
        </a>.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal — Linux host</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile main.ts --target windows</p>
          <p className="text-slate-500">Compiling main.ts for windows-x86_64...</p>
          <p className="text-slate-500">Using lld-link from Rust toolchain</p>
          <p className="text-green-400">&#x2713; Compiled executable: main.exe (2.8 MB)</p>
        </div>
      </div>

      <h2>Supporto Game Loop per iOS</h2>
      <p>
        iOS richiede che UIKit possieda il thread principale. Questo va bene per le app guidate da eventi, ma &egrave; un problema per i giochi che necessitano di un loop bloccante <code className="text-amber-400">while (!shouldClose)</code>. Perry ora risolve questo problema con il flag <code className="text-amber-400">--features ios-game-loop</code>.
      </p>
      <p>
        Quando abilitato, il compilatore emette{" "}
        <code className="text-amber-400">_perry_user_main</code> invece di{" "}
        <code className="text-amber-400">main</code>. Il runtime fornisce una{" "}
        <code className="text-amber-400">main()</code> che chiama{" "}
        <code className="text-amber-400">UIApplicationMain</code> sul thread principale e avvia il tuo codice su un thread in background. Scene delegate e app delegate gestiscono l&apos;intero ciclo di vita UIKit mentre il tuo game loop funziona senza blocchi.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">main.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">// Your game loop runs on a background thread</span></p>
          <p><span className="text-blue-400">while</span> (!shouldClose) {"{"}</p>
          <p>  update();</p>
          <p>  render();</p>
          <p>  awaitNextFrame();</p>
          <p>{"}"}</p>
        </div>
      </div>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> run ios --features ios-game-loop</p>
        </div>
      </div>

      <p>
        Questo abilita un&apos;intera categoria di app — giochi, simulazioni, visualizzazioni in tempo reale — che non erano praticabili su iOS prima. I percorsi di pump e callback iOS sono ora anche avvolti nella gestione dei panic, cos&igrave; i crash sia nel game loop che nel ciclo di vita UIKit vengono catturati in modo pulito.
      </p>

      <h2>Segnalazione Crash</h2>
      <p>
        Le app compilate con Perry ora installano un hook per i panic e gestori di segnale per{" "}
        <code className="text-amber-400">SIGSEGV</code>,{" "}
        <code className="text-amber-400">SIGBUS</code> e{" "}
        <code className="text-amber-400">SIGABRT</code> all&apos;avvio. Quando si verifica un crash fatale, i dettagli vengono scritti in <code className="text-amber-400">~/.hone/crash.log</code> per il sistema di telemetria Chirp. I panic catturati (in{" "}
        <code className="text-amber-400">catch_callback_panic</code>) cancellano il log, cos&igrave; vengono segnalati solo i crash genuinamente irrecuperabili.
      </p>
      <p>
        Questa &egrave; una funzionalit&agrave; di prontezza per la produzione. Quando qualcosa va storto sul campo, ne saremo al corrente — e il log dei crash include abbastanza contesto per diagnosticare il problema senza richiedere agli utenti di segnalare nulla manualmente.
      </p>

      <h2>Hub: Pipeline di Build Windows a Due Fasi</h2>
      <p>
        L&apos;infrastruttura di build Perry Hub ha ricevuto un significativo aggiornamento architetturale. In precedenza, la build per Windows richiedeva un worker Windows per l&apos;intera compilazione. Ora la pipeline si divide in due fasi:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>Un worker Linux cross-compila l&apos;artefatto Windows utilizzando il nuovo supporto lld-link</li>
        <li>L&apos;Hub mantiene l&apos;artefatto pre-compilato e rimette in coda il job per un worker Windows</li>
        <li>Il worker Windows gestisce solo la firma e il packaging — un compito molto pi&ugrave; leggero</li>
      </ol>
      <p>
        Quando un worker invia <code className="text-amber-400">complete</code> con{" "}
        <code className="text-amber-400">needs_finishing: &quot;windows&quot;</code>, l&apos;Hub rimette trasparentemente in coda il job. La CLI vede un&apos;esperienza di build unica e senza interruzioni.
      </p>
      <p>
        L&apos;Hub ora avvia anche automaticamente le VM Azure Windows quando nessun worker Windows &egrave; connesso, e i worker di build si aggiornano automaticamente all&apos;ultima versione di Perry nelle nuove release. Meno gestione manuale dell&apos;infrastruttura, build pi&ugrave; veloci.
      </p>

      <h2>Revisione della Documentazione</h2>
      <p>
        Due importanti riscritture della documentazione sono state pubblicate questa settimana su{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>Riferimento perry.toml</strong> — documentazione completa delle sezioni che copre ogni opzione di configurazione, risoluzione del bundle ID, risoluzione del file di ingresso, auto-incremento del numero di build ed esempi CI/CD
        </li>
        <li>
          <strong>Riferimento Geisterhand</strong> — documentazione completa delle API, configurazione della piattaforma, pattern di automazione dei test e panoramica dell&apos;architettura per il framework di test UI cross-platform
        </li>
      </ul>
      <p>
        Non si tratta di aggiornamenti incrementali. Entrambe sono riscritture complete che coprono ogni funzionalit&agrave; e opzione di configurazione. Se stai configurando un nuovo progetto o scrivendo test, inizia da qui.
      </p>

      <h2>API Menu Cross-Platform</h2>
      <p>
        <code className="text-amber-400">menuClear</code> e{" "}
        <code className="text-amber-400">menuAddStandardAction</code> erano precedentemente solo per macOS. Ora funzionano su tutte e 6 le piattaforme native. Questo include anche una correzione per un panic di re-entrancy <code className="text-amber-400">RefCell</code> in{" "}
        <code className="text-amber-400">dispatch_menu_item</code> su Windows.
      </p>

      <h3>Android: Allineamento Pagine a 16 KB</h3>
      <p>
        Google Play ora richiede l&apos;allineamento delle pagine a 16 KB per le librerie native. Perry imposta automaticamente i <code className="text-amber-400">CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS</code>{" "}
        appropriati, e i file <code className="text-amber-400">.so</code> companion vengono copiati accanto all&apos;output per l&apos;inclusione in APK/AAB.
      </p>

      <h2>Perry React: Tavola Kanban</h2>
      <p>
        Il livello di compatibilit&agrave; React ha avuto un test reale: una tavola Kanban completa a 5 colonne con operazioni di spostamento, aggiunta, eliminazione e visualizzazione. Costruirla ha scoperto e corretto il rendering dei children array annidati in JSX — il gestore ricorsivo{" "}
        <code className="text-amber-400">_appendChildren</code> ora appiattisce correttamente gli array restituiti dalle chiamate <code className="text-amber-400">.map()</code>. C&apos;&egrave; anche una nuova demo Kitchen Sink WorkBench a 14 sezioni che copre vari pattern UI.
      </p>

      <h2>Anvil: 100% Parit&agrave; Test Deterministici</h2>
      <p>
        <code className="text-amber-400">perrysdad</code> — il compilatore LLVM self-hosting scritto in TypeScript e compilato da Perry — ora supera <strong>68 su 68</strong> test deterministici, corrispondendo esattamente all&apos;output del compilatore principale. Le uniche differenze sono intrinseche (timestamp, <code className="text-amber-400">Math.random()</code>), e 11 test vengono saltati perch&eacute; richiedono UI, timer, crypto o funzionalit&agrave; specifiche della piattaforma non ancora implementate.
      </p>
      <p>
        Lavoro chiave che ha portato a questo risultato:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Dispatch dei metodi di interfaccia</strong> — le variabili tipizzate come interfaccia ora restituiscono i metodi corretti tramite dispatch basato su class_id in ObjectHeader</li>
        <li><strong>Accesso dinamico alle propriet&agrave;</strong> — dispatch a runtime per i nomi di propriet&agrave; calcolati</li>
        <li><strong>Closure e this-binding</strong> — semantica di cattura corretta per i metodi degli oggetti</li>
        <li><strong>Fase 6 in corso</strong> — async/await, generatori e correzioni delle condizioni</li>
      </ul>
      <p>
        Il 100% di parit&agrave; sui test deterministici &egrave; una pietra miliare significativa. Significa che il binario{" "}
        <code className="text-amber-400">anvil</code> auto-compilato produce esattamente lo stesso output del compilatore principale per ogni scenario testabile. Il divario si sta riducendo verso il self-hosting completo.
      </p>

      <h2>Oltre 50 Correzioni di Bug</h2>
      <p>
        Un importante push sulla correttezza questa settimana. Punti salienti:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>JSON.parse</strong> — gli array non vengono pi&ugrave; troncati a 16 elementi, input non valido gestito correttamente</li>
        <li><strong>Uint8Array</strong> — costruttore da variabile array, implementazione di <code className="text-amber-400">.set(source, offset)</code> (era un no-op)</li>
        <li><strong>BigInt</strong> — NaN-boxing con <code className="text-amber-400">BIGINT_TAG</code> per chiamate cross-modulo, correzioni del troncamento a 32 bit di keccak256</li>
        <li><strong>Optional chaining</strong> — espressioni condizionali annidate, rilevamento toString, NaN-boxing del valore di ritorno</li>
        <li><strong>IndexSet</strong> — NaN-boxing delle stringhe corretto per usare <code className="text-amber-400">STRING_TAG</code> invece di <code className="text-amber-400">POINTER_TAG</code></li>
        <li><strong>MySQL</strong> — tipi DATETIME e BLOB, costruttore <code className="text-amber-400">Date(string)</code></li>
        <li><strong>Math.min/max</strong> — gestione degli argomenti spread</li>
        <li><strong>Dispatch metodi nativi</strong> — field-scan-and-call per oggetti <code className="text-amber-400">POINTER_TAG</code></li>
      </ul>
      <p>
        Non si tratta di casi limite. JSON.parse che tronca gli array a 16 elementi bloccherebbe qualsiasi applicazione reale. Uint8Array.set come no-op corromperebbe silenziosamente i dati. Queste sono le correzioni che rendono il compilatore pronto per la produzione, un bug di correttezza alla volta.
      </p>

      <h2>In Numeri</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>103 commit</strong> al compilatore principale Perry</li>
        <li><strong>3 versioni</strong>: v0.2.195, v0.2.196, v0.2.197</li>
        <li><strong>1 funzionalit&agrave; principale</strong>: cross-compilazione Windows da Linux</li>
        <li><strong>1 nuova categoria di app</strong>: game loop iOS</li>
        <li><strong>68/68</strong> parit&agrave; test deterministici in perrysdad</li>
        <li><strong>Oltre 50 correzioni di bug</strong> su NaN-boxing, stdlib e FFI nativo</li>
        <li><strong>2 riscritture della documentazione</strong>: perry.toml e Geisterhand</li>
        <li><strong>5 miglioramenti Hub</strong>: pipeline a due fasi, avvio automatico Azure, aggiornamento automatico worker</li>
      </ul>

      <h2>Prossimi Passi</h2>
      <p>
        La cross-compilazione Windows apre la porta al CI/CD multi-piattaforma completamente automatizzato — fai push del TypeScript, ottieni binari nativi per ogni target senza macchine di build dedicate per ogni sistema operativo. Il supporto game loop sblocca un&apos;intera nuova categoria di app iOS. E il 100% di parit&agrave; test deterministici in perrysdad significa che il self-hosting sta diventando molto reale. Cosa resta:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Supporto regex completo</strong> — l&apos;ultima grande lacuna del linguaggio</li>
        <li><strong>Espansione perry/ui</strong> — drag and drop, etichette di accessibilit&agrave;, DatePicker</li>
        <li><strong>perrysdad Fase 6</strong> — async/await, generatori, espansione verso la parit&agrave; completa con Perry</li>
        <li><strong>Beta pubblica Hub</strong> — apertura delle build distribuite agli utenti esterni</li>
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
