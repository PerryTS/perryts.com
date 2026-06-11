export default function Content() {
  return (
    <>
      <p>
        Il post precedente si è chiuso a <strong>v0.5.875</strong> con la storia del GC — chiudere il gap che il benchmark di aya_koto aveva messo in luce. Quel post parlava di vincere un benchmark. Questo parla di un genere di lavoro diverso: le circa <strong>270 release tra v0.5.875 e v0.5.1146</strong>, atterrate nell&apos;arco di circa quattro settimane, quasi nessuna delle quali è un titolo da benchmark. Il tema è passato da &ldquo;andare veloce su un microbenchmark&rdquo; a <strong>&ldquo;far sì che TypeScript del mondo reale e veri pacchetti npm compilino e girino davvero.&rdquo;</strong> Più un completo rinnovamento visivo di Windows e una pila di nuovi widget lungo la strada.
      </p>
      <p>
        Ecco cosa è arrivato, raggruppato per ciò a cui serviva davvero.
      </p>

      <h2>I veri pacchetti npm ora compilano</h2>
      <p>
        Il singolo filo più grosso attraverso questa finestra è una passata per far compilare i pacchetti npm popolari in binari nativi e farli passare i test comportamentali — non solo &ldquo;linkare senza errori,&rdquo; ma girare e produrre l&apos;output giusto. La lista che ora funziona attraverso <code>perry.compilePackages</code> include <strong>axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2 e Colyseus</strong>.
      </p>
      <p>
        Ognuno falliva per la propria ragione, e ogni fix è una sua piccola storia:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>zod v4</strong> crashava con <code>Cannot read properties of undefined (reading &apos;onattach&apos;)</code>. Causa radice (v0.5.1144, <a href="https://github.com/PerryTS/perry/issues/4698" className="text-amber-400 hover:text-amber-300">#4698</a>): <code>new F()</code> dove <code>F</code> è una funzione importata da un altro modulo produceva silenziosamente un oggetto vuoto — il corpo del costruttore non girava mai, quindi ogni check in stile <code>$ZodCheckMinLength</code> tornava privo della sua proprietà <code>_zod</code>.</li>
        <li><strong>axios + jose</strong> avevano bisogno di crypto e compressione che Perry non aveva ancora: <code>zlib.createBrotliDecompress</code>, <code>crypto.subtle.wrapKey</code>/<code>unwrapKey</code>, <code>subtle.generateKey</code> / <code>encrypt</code> / <code>decrypt</code> per AES-GCM, e <code>randomFillSync</code> (v0.5.972–976).</li>
        <li><strong>fastify</strong> andava in deadlock su un timeout di polling di un secondo in <code>wait_for_promise</code>; l&apos;abbiamo sostituito con un&apos;attesa su condvar e fatto sì che le promise rifiutate emergessero come <code>HTTP 500</code> invece di bloccarsi (v0.5.912).</li>
        <li><strong>@hono/node-server</strong> non riusciva a leggere un body POST — <code>c.req.text()</code> / <code>.json()</code> / <code>.formData()</code> tornavano vuoti su POST/PUT fino a un fix di registrazione del parent in v0.5.1142.</li>
        <li><strong>chalk, ms, debug, express</strong> hanno colpito tutti la stessa forma: un <em>valore chiamabile con proprietà attaccate</em> (<code>chalk.red</code>, <code>express()</code> più <code>express.Router</code>). Tre varianti di quel pattern sono state risolte tra v0.5.935 e la passata npm circostante, più <code>util.inherits</code> + uno scaffold di prototype di stream per sbloccare express (v0.5.990).</li>
        <li><strong>dayjs</strong>, distribuito come bundle minificato, esercitava il dispatch di metodi prototipali JS-classic (<code>Class.prototype.m = fn</code>) che Perry abbassava in modo sbagliato (v0.5.924/932).</li>
      </ul>
      <p>
        Sotto tutto questo sta la parte che fa girare comunque i pacchetti che Perry <em>non riesce</em> a compilare nativamente: il <strong>runtime di fallback V8</strong> è diventato reale in questa finestra. Il suo ModuleLoader ora legge da una module map embedded, così un binario di fallback è comunque <strong>autonomo</strong> — niente <code>node_modules</code> sparsi a runtime (v0.5.994). <code>createServer</code> fa da ponte verso un vero server hyper (v0.5.999), e i global Web Fetch <code>Response</code> / <code>Request</code> / <code>Headers</code> esistono nel percorso di fallback (v0.5.1006). E l&apos;<strong><code>import()</code> dinamico a compile-time</strong> — <code>await import(&apos;./foo.ts&apos;)</code> con string-literal risolto a build time — è finalmente arrivato (v0.5.905, <a href="https://github.com/PerryTS/perry/issues/100" className="text-amber-400 hover:text-amber-300">#100</a>).
      </p>

      <h2>Una passata di conformance su test262</h2>
      <p>
        L&apos;altro filo dominante è la conformance. Abbiamo fatto passate mirate contro i radar del sottoinsieme test262 e abbiamo spostato l&apos;ago sui built-in su cui il codice reale si appoggia di più:
      </p>
      <pre><code>{`built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)`}</code></pre>
      <p>
        Il salto di String è venuto dal dare a ogni metodo <code>String.prototype</code> un dispatch con <code>this</code> generico e dal correggere la coercizione degli indici di <code>slice</code>/<code>substring</code>. Il salto di Array è stato <code>thisArg</code> sui callback degli array densi (<code>forEach</code>/<code>map</code>/<code>filter</code>/…), <code>ToLength</code> array-like, ordinamento delle operazioni da spec e validazione a zero argomenti. Il destructuring ha raccolto il destructuring dei parametri su metodi di classe plain, generator, async-generator, statici e privati.
      </p>
      <p>
        Accanto ai numeri di copertina, è atterrata una lunga coda di correttezza: <code>JSON.parse</code> ora lancia un vero <code>SyntaxError</code> (non un <code>TypeError</code>) e rifiuta i token in coda; il suo reviver cammina via l&apos;algoritmo da spec <code>InternalizeJSONProperty</code>; <code>Object.prototype.toString</code> marca correttamente i typed array, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp; <code>RegExp.prototype.toString</code> ritorna <code>/source/flags</code>; gli async generator hanno azzeccato la semantica <code>yield</code>-attende-operando. Questi sono radar di sottoinsiemi, non la suite completa — Perry sta ancora salendo — ma la salita di questo mese è stata ripida.
      </p>

      <h2>Windows diventa Fluent</h2>
      <p>
        Windows ha avuto un rinnovamento visivo (la serie <a href="https://github.com/PerryTS/perry/issues/4681" className="text-amber-400 hover:text-amber-300">#4681</a>). Le finestre di Perry ora optano di default per il chrome DWM moderno — <strong>backdrop Mica</strong>, angoli arrotondati e una title bar consapevole del tema — e i common control vengono renderizzati attraverso <strong>comctl32 v6</strong> invece dei default in stile Windows 95. Il window proc ora gestisce <code>WM_DPICHANGED</code>, così una finestra resta nitida quando la trascini tra monitor con scaling misto invece di subire uno stretch bitmap.
      </p>
      <p>
        Soprattutto, niente di tutto questo ha reintrodotto la vecchia regressione <a href="https://github.com/PerryTS/perry/issues/1542" className="text-amber-400 hover:text-amber-300">#1542</a> &ldquo;area nera dopo il resize&rdquo;: la client area è ancora dipinta opaca, e il blur-through Mica/Acrylic a frame intero resta un opt-in esplicito via <code>app.setVibrancy(...)</code>. C&apos;è anche un nuovo scaffold di backend <code>--target windows-winui</code> (WinUI 3) per le app che vogliono lo stack pienamente moderno, e un fix piccolo ma reale che fa sì che <code>perry compile main.ts -o main</code> produca <code>main.exe</code> su Windows così che PowerShell lo lanci davvero (v0.5.1146).
      </p>

      <h2>Nuovi widget, ogni piattaforma</h2>
      <p>
        Due widget sono arrivati proprio nell&apos;ultimo giorno, ed entrambi coprono ogni piattaforma UI che Perry targeta:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>DatePicker</strong> (<a href="https://github.com/PerryTS/perry/issues/4772" className="text-amber-400 hover:text-amber-300">#4772</a>) — un controllo di data compatto, in stile campo: <code>NSDatePicker</code> su macOS, <code>UIDatePicker</code> (.compact) su iOS/visionOS, <code>SysDateTimePick32</code> su Windows, <code>android.widget.DatePicker</code> su Android, GTK4 su Linux. Un&apos;unica superficie TS attraverso tutti.</li>
        <li><strong>Drag &amp; drop</strong> (<a href="https://github.com/PerryTS/perry/issues/4773" className="text-amber-400 hover:text-amber-300">#4773</a>) — qualsiasi widget può essere una destinazione di drop e una sorgente di drag per testo/file/URL, mappato a <code>NSDraggingDestination</code> (AppKit), <code>UIDropInteraction</code> (UIKit) e <code>View.setOnDragListener</code> (Android).</li>
      </ul>
      <pre><code>{`import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});`}</code></pre>
      <p>
        Prima, nella finestra, lo scaffale dei widget si è riempito anche su desktop e mobile — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation e una ImageGallery scorribile — ciascuno supportato dal vero controllo nativo su ogni piattaforma. HarmonyOS (ArkTS) ha avuto Chart e TreeView (v0.5.893), gli ultimi due widget che gli servivano per raggiungere la parità con gli altri.
      </p>

      <h2>GC, internals e stabilità</h2>
      <p>
        La maggior parte di quelle 270 release non sono titoli — sono bug fix e internals, ed è il punto di questa fase. Alcuni da segnalare:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>Il GC è continuato.</strong> Il lavoro sulla free list condizionale dal post sul GC ha continuato a sedimentarsi, e una classe netta di bug è stata chiusa: le Promise native-bridged sono ora <strong>pinnate mentre sono in volo su un worker tokio</strong> così che il GC non possa spazzarle via prima che atterri la risoluzione (v0.5.923). Se hai eseguito un fetch async sotto carico e hai visto una collection fantasma, era questo.</li>
        <li><strong>Il modello di memoria è documentato.</strong> C&apos;è ora un approfondimento <code>internals/memory-model.md</code> — NaN-boxing, il GC generazionale, lo shadow stack e le write barrier — cablato nel sito dei docs (v0.5.933).</li>
        <li><strong>Un&apos;ondata di fix di stabilità del codegen</strong> emersa dalla passata npm: una arrow <code>const</code> a livello modulo chiamata dentro uno step async ripreso non fa più SIGSEGV (v0.5.953), <code>{`try { await rejected } catch { return X }`}</code> non si blocca più per sempre (v0.5.870), e una manciata di crash <code>js_is_truthy</code> / raw-pointer-range che i bundle reali innescavano.</li>
      </ul>

      <h2>Pulizie su Apple</h2>
      <p>
        Più piccolo ma reale: <code>perry setup ios --development</code> ora fa il provisioning per le build di sviluppo (v0.5.1023), e il percorso di build/link delle cross-library Apple è stato deduplicato e reso portabile sulla larghezza del puntatore (v0.5.1121/1125) — che è ciò che ha sbloccato la matrice di publish npm / Homebrew / APT / winget che era rimasta incastrata.
      </p>

      <h2>Dove ci lascia tutto questo</h2>
      <p>
        La scommessa dietro Perry è sempre stata che &ldquo;TypeScript nativo&rdquo; conta solo se gira TypeScript <em>vero</em> — non un sottoinsieme giocattolo, i pacchetti veri che la gente fa <code>npm install</code>. Questo mese è stato per lo più quel lavoro: meno un singolo numero di cui vantarsi, più una spinta lunga e poco glamour per chiudere il gap tra &ldquo;compila&rdquo; e &ldquo;funziona.&rdquo; I radar di conformance e i test di parità npm sono il tabellone che stiamo osservando ora, e continueremo a pubblicare i numeri — quelli buoni e quelli ancora imperfetti.
      </p>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
