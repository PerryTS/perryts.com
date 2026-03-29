import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Quando abbiamo rilasciato la prima versione del sistema UI nativo di Perry, &quot;cross-platform&quot;
        significava che macOS funzionava bene e le altre cinque piattaforme erano stub. Oggi, con la v0.2.162, non è
        più così. Tutte e sei le piattaforme — macOS, iOS, iPadOS, Android, Linux e Windows — ora
        condividono la parità completa delle funzionalità. Lo stesso codice TypeScript compila in widget nativi su ogni target.
      </p>
      <p>
        Questo articolo illustra cosa abbiamo rilasciato tra la v0.2.152 e la v0.2.164: un widget Canvas,
        un&apos;implementazione completa di NSTableView, oltre 20 widget UI totali, il modulo{" "}
        <code className="text-amber-400">perry/system</code>, supporto multi-finestra, notifiche di sistema,
        accesso al portachiavi, riduzione automatica delle dimensioni del binario e un sistema di plugin a tempo di compilazione.
        È successo molto.
      </p>

      <h2>Lo sprint dei widget: 20+ componenti UI nativi</h2>
      <p>
        Il più grande salto singolo è arrivato con la v0.2.155, che ha portato oltre 20 widget UI su tutte le piattaforme.
        L&apos;API UI TypeScript di Perry ora copre i componenti necessari per rilasciare un&apos;app reale:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Layout</strong> — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView</li>
        <li><strong>Input</strong> — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker</li>
        <li><strong>Visualizzazione</strong> — Text, Label, Image, ProgressView, Divider, Spacer</li>
        <li><strong>Dati</strong> — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)</li>
        <li><strong>Overlay</strong> — Alert, Sheet, Popover, Toolbar, NavigationBar</li>
        <li><strong>Disegno</strong> — Canvas (API di disegno 2D, accelerato hardware per piattaforma)</li>
      </ul>
      <p>
        Questi non sono wrapper attorno a un renderer personalizzato. Ogni widget compila nel componente nativo della piattaforma:
        <code className="text-amber-400">NSButton</code> su macOS,{" "}
        <code className="text-amber-400">UIButton</code> su iOS,{" "}
        <code className="text-amber-400">GtkButton</code> su Linux,{" "}
        <code className="text-amber-400">android.widget.Button</code> su Android via JNI, e{" "}
        <code className="text-amber-400">CreateWindowEx</code> su Windows. Il SO li disegna, li tema e gestisce l&apos;accessibilità — Perry collega semplicemente l&apos;API TypeScript.
      </p>

      <h2>Canvas: disegno 2D da TypeScript</h2>
      <p>
        Una delle aggiunte tecnicamente più interessanti è il widget Canvas (v0.2.152). Espone una familiare API di disegno 2D direttamente da TypeScript — curve di Bezier, fill, stroke, blitting di immagini — e compila nel backend 2D accelerato della piattaforma: Core Graphics su macOS/iOS, Cairo su Linux, Direct2D su Windows e Skia su Android.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">canvas.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Canvas, Color }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3 text-slate-500">// Compiles to Core Graphics on macOS, Cairo on Linux, etc.</p>
          <p><span className="text-blue-400">const</span> canvas = <span className="text-blue-400">new</span> <span className="text-amber-400">Canvas</span>({`{ width: 400, height: 300 }`});</p>
          <p className="mt-2">canvas.<span className="text-amber-400">onDraw</span>((ctx) =&gt; {`{`}</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillStyle</span> = Color.<span className="text-amber-400">amber</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillRect</span>(10, 10, 100, 60);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">strokeStyle</span> = Color.<span className="text-amber-400">blue</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">lineWidth</span> = 2;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">beginPath</span>();</p>
          <p className="ml-4">ctx.<span className="text-amber-400">arc</span>(200, 150, 80, 0, Math.<span className="text-amber-400">PI</span> * 2);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">stroke</span>();</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>Widget Table: NSTableView arriva in TypeScript</h2>
      <p>
        La v0.2.163 ha portato il widget Table — il componente più complesso della libreria. Su macOS mappa a
        <code className="text-amber-400">NSTableView</code> con cablaggio completo delegate/data source. Su Linux usa
        <code className="text-amber-400">GtkTreeView</code> di GTK4. Su Windows, il controllo <code className="text-amber-400">ListView</code> di Win32. Su Android si collega a <code className="text-amber-400">RecyclerView</code> attraverso JNI.
      </p>
      <p>
        L&apos;API TypeScript è dichiarativa: definisci le colonne, fornisci un data source, e Perry gestisce il cablaggio specifico della piattaforma a tempo di compilazione. Ordinamento colonne, gestione della selezione e personalizzazione dell&apos;altezza delle righe funzionano out of the box.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">table.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Table, Column }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> table = <span className="text-blue-400">new</span> <span className="text-amber-400">Table</span>({`{`}</p>
          <p className="ml-4">columns: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Name", key: "name", width: 200 }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Size", key: "size", width: 80 }`}),</p>
          <p className="ml-4">],</p>
          <p className="ml-4">rows: files,  <span className="text-slate-500">// TypeScript array of objects</span></p>
          <p className="ml-4">onSelect: (row) =&gt; console.<span className="text-amber-400">log</span>(row.name),</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>Il modulo perry/system</h2>
      <p>
        La v0.2.155 ha anche introdotto <code className="text-amber-400">perry/system</code> — un modulo TypeScript che espone API di sistema della piattaforma senza alcun runtime: finestre di dialogo file, finestre di salvataggio, alert, sheet, accesso al portachiavi, notifiche di sistema e gestione multi-finestra.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code className="text-amber-400">system.showOpenDialog()</code> — file picker nativo (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)</li>
        <li><code className="text-amber-400">system.showSaveDialog()</code> — finestra di salvataggio nativa</li>
        <li><code className="text-amber-400">system.showAlert()</code> — pannello di avviso nativo</li>
        <li><code className="text-amber-400">system.notify()</code> — notifica del SO (UserNotifications / libnotify / WinRT)</li>
        <li><code className="text-amber-400">system.keychain.get/set()</code> — Keychain Services / Secret Service / Windows Credential Store</li>
        <li><code className="text-amber-400">system.openWindow()</code> — gestione multi-finestra</li>
      </ul>
      <p>
        Tutte queste chiamano API native della piattaforma direttamente — nessun IPC Electron, nessun bridge web view. Perry compila il sito di chiamata TypeScript in una chiamata a funzione nativa diretta nell&apos;SDK della piattaforma.
      </p>

      <h2>Parità su sei piattaforme: v0.2.162</h2>
      <p>
        La pietra miliare v0.2.162 riguardava la chiusura dei gap. Prima di questo rilascio, macOS aveva il set di funzionalità più completo, iOS era quasi pronto, e Linux/Windows/Android erano indietro. La v0.2.162 ha portato tutte e sei le piattaforme allo stesso livello:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>macOS</strong> — AppKit, set completo di widget, Keychain, notifiche, multi-finestra, toolbar</li>
        <li><strong>iOS / iPadOS</strong> — UIKit, piena parità widget con macOS, ciclo di vita scene</li>
        <li><strong>Android</strong> — bridge JNI, tutti i widget via Android Views, cross-compilazione NDK</li>
        <li><strong>Linux</strong> — GTK4, set completo di widget incluso Table, finestre di dialogo file, portachiavi libsecret</li>
        <li><strong>Windows</strong> — Win32, tutti i widget, Windows Credential Store, notifiche WinRT</li>
      </ul>
      <p>
        Questa è la pietra miliare che rende &quot;un codice, sei piattaforme&quot; reale piuttosto che aspirazionale. Lo stesso file TypeScript compila in app native su tutti e sei i target senza percorsi di codice specifici per piattaforma per i casi d&apos;uso comuni.
      </p>

      <h2>Riduzione automatica delle dimensioni del binario</h2>
      <p>
        La v0.2.153 ha rilasciato la riduzione automatica delle dimensioni del binario — il compilatore ora elimina aggressivamente i percorsi di codice inutilizzati, elimina le funzioni stdlib irraggiungibili e deduplica le definizioni dei simboli durante il linking. Uno strumento CLI tipico che prima compilava a ~4 MB ora arriva sotto i 2 MB senza modifiche al sorgente.
      </p>
      <p>
        Questo è importante per i deployment reali. Quando il tuo binario è l&apos;unità di deployment — copiato su un server, distribuito come singolo file, incorporato in un container — le dimensioni influenzano direttamente il tempo di trasferimento e il costo di storage. Dimezzare le dimensioni del binario gratuitamente è un miglioramento significativo.
      </p>

      <h2>Il sistema di plugin a tempo di compilazione</h2>
      <p>
        La v0.2.152 ha introdotto il sistema di plugin di Perry — ed è architetturalmente diverso da ogni
        altro sistema di plugin nell&apos;ecosistema TypeScript. Nessun caricamento di plugin a runtime, nessun
        IPC, nessun <code className="text-amber-400">require()</code> dinamico. I plugin sono moduli TypeScript
        che Perry risolve e compila a tempo di build.
      </p>
      <p>
        Il risultato: i plugin hanno esattamente zero overhead a runtime. Compilano nello stesso binario del codice dell&apos;applicazione, con chiamate a funzione dirette tra il codice del plugin e il codice host. Se non usi un plugin, non appare nel tuo binario. Se lo usi, viene integrato come qualsiasi altro modulo.
      </p>
      <p>
        Abbiamo scritto sulla filosofia dietro questo in{" "}
        <Link href="/blog/plugin-systems-are-a-performance-tax" className="text-amber-400 hover:text-amber-300">
          I sistemi di plugin sono una tassa sulle prestazioni
        </Link>. La versione breve: le architetture a plugin a runtime scambiano prestazioni per estensibilità.
        La composizione a tempo di build ti dà entrambe.
      </p>

      <h2>Miglioramenti al linguaggio</h2>
      <p>
        Lo sprint UI non è avvenuto in isolamento — il compilatore stesso ha continuato a diventare più capace. In questi rilasci:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Espressioni di classe</strong> — <code className="text-amber-400">const Foo = class extends Bar {`{}`}</code> ora compila correttamente</li>
        <li><strong>Trasformazioni generatore</strong> — <code className="text-amber-400">function*</code> e <code className="text-amber-400">yield</code> compilano in macchine a stati native</li>
        <li><strong>Map/Set come campi di classe</strong> — <code className="text-amber-400">private items = new Map()</code> funziona nel codegen</li>
        <li><strong>Coercizione tipi parametri FFI</strong> — le chiamate a librerie native gestiscono la coercizione dei tipi automaticamente</li>
        <li><strong>Riferimenti a metodi bound</strong> — i riferimenti <code className="text-amber-400">this.method</code> funzionano per i moduli nativi (fs, os, path)</li>
        <li><code className="text-amber-400">string.match()</code> — ora completamente supportato</li>
        <li><code className="text-amber-400">path.isAbsolute()</code>, <code className="text-amber-400">path.join()</code> multi-argomento, <code className="text-amber-400">path.resolve()</code></li>
        <li><strong>Target Web</strong> — Perry può ora compilare in un output compatibile web per deployment ibridi</li>
      </ul>

      <h2>Prossimi passi</h2>
      <p>
        Con la parità UI su sei piattaforme rilasciata, la prossima fase è profondità piuttosto che ampiezza. Stiamo lavorando su:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Supporto completo RegExp (<code className="text-amber-400">regex.test()</code>, <code className="text-amber-400">string.matchAll()</code>)</li>
        <li>Drag and drop, menu contestuali personalizzati e label di accessibilità nel sistema di widget</li>
        <li>Un&apos;estensione VS Code per diagnostica Perry e compilazione al salvataggio</li>
        <li>Integrazione con il package manager — installa e compila pacchetti Perry-nativi con un comando</li>
        <li>Target di compilazione WASM per il deployment nel browser</li>
        <li>Multi-threading via thread <code className="text-amber-400">Worker</code></li>
      </ul>
      <p>
        Se vuoi seguire, il{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          repository Perry
        </a>{" "}
        è aperto. Controlla la{" "}
        <Link href="/showcase" className="text-amber-400 hover:text-amber-300">vetrina</Link>
        {" "}per vedere cosa si sta già costruendo, o sfoglia la{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">roadmap</Link>
        {" "}per il quadro completo.
      </p>
    </>
  );
}
