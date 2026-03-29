export default function Content() {
  return (
    <>
      <p>
        Perry ora compila tre importanti framework TypeScript — Hono, tRPC e Strapi — in
        eseguibili nativi ARM64. Compilano in meno di un secondo, producono binari sotto i 2 MB
        e funzionano senza crash.
      </p>
      <p>
        Questo articolo illustra cosa funziona, cosa non funziona ancora e cosa abbiamo imparato spingendo il
        compilatore contro codice del mondo reale.
      </p>

      <h2>I progetti</h2>
      <p>
        Abbiamo scelto questi tre perché rappresentano diverse forme di TypeScript:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Hono</strong> — Un framework web leggero (29 moduli). Uso intensivo di generici,
          ereditarietà di classi, assegnazione dinamica di metodi e le Web API <code className="text-perry-400">Request</code>/<code className="text-perry-400">Response</code>.
          La sua struttura di esportazione usa re-export nominati attraverso barrel file.
        </li>
        <li>
          <strong>tRPC</strong> — Un framework RPC type-safe (52 moduli). Catene di re-export profonde
          su 4+ livelli, pattern builder con restringimento di tipi generici, istanziazione di classi a
          livello di modulo e streaming via Web Streams.
        </li>
        <li>
          <strong>Strapi</strong> — Un CMS headless core (4 moduli compilati nativamente, il resto risolto
          come esterno). Monorepo con risoluzione di pacchetti workspace, re-export di namespace
          (<code className="text-perry-400">export * as X</code>), pattern service container con{" "}
          <code className="text-perry-400">Map</code> e funzioni factory.
        </li>
      </ul>

      <h2>Risultati della compilazione</h2>
      <p>
        Tutti e tre compilano in binari nativi con zero errori di compilazione:
      </p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Progetto</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Moduli compilati</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Dimensione binario</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Tempo di compilazione</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">Hono</td>
              <td className="py-3 px-4 text-slate-400">29</td>
              <td className="py-3 px-4 text-slate-400">1.6 MB</td>
              <td className="py-3 px-4 text-slate-400">0.59s</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">tRPC</td>
              <td className="py-3 px-4 text-slate-400">52</td>
              <td className="py-3 px-4 text-slate-400">1.8 MB</td>
              <td className="py-3 px-4 text-slate-400">0.97s</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">Strapi</td>
              <td className="py-3 px-4 text-slate-400">4</td>
              <td className="py-3 px-4 text-slate-400">1.9 MB</td>
              <td className="py-3 px-4 text-slate-400">0.80s</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Ogni modulo sorgente passa attraverso l&apos;intera pipeline: parse SWC, lowering HIR, codegen Cranelift,
        emissione file oggetto e linking nativo. I tempi di compilazione includono tutto —
        dal parsing al link finale.
      </p>
      <p>
        Per contesto, <code className="text-perry-400">tsc --noEmit</code> su tRPC da solo richiede diversi
        secondi. Perry compila 52 moduli in un binario nativo linkato in meno di uno.
      </p>

      <h2>Cosa funziona a runtime</h2>

      <h3>Istanziazione di classi cross-modulo</h3>
      <p>
        Questa è stata la grande pietra miliare. La struttura di esportazione di Hono è così:
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">hono export chain</span>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500">// hono/src/hono.ts</p>
          <p><span className="text-purple-400">export class</span> <span className="text-yellow-400">Hono</span> <span className="text-purple-400">extends</span> <span className="text-cyan-400">HonoBase</span> {"{"} ... {"}"}</p>
          <p className="mt-3 text-slate-500">// hono/src/index.ts</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;./hono&apos;</span></p>
          <p><span className="text-purple-400">export</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"}</p>
        </div>
      </div>
      <p>
        Quel <code className="text-perry-400">export {"{"} Hono {"}"}</code> è un re-export nominato — non{" "}
        <code className="text-perry-400">export * from</code> o{" "}
        <code className="text-perry-400">export {"{"} Hono {"}"} from &apos;./hono&apos;</code>. Nell&apos;HIR di Perry,
        questo diventa <code className="text-perry-400">Export::Named</code>, non{" "}
        <code className="text-perry-400">Export::ReExport</code> o{" "}
        <code className="text-perry-400">Export::ExportAll</code>. In precedenza, la propagazione delle classi del compilatore
        seguiva solo le catene <code className="text-perry-400">ExportAll</code> e{" "}
        <code className="text-perry-400">ReExport</code>, quindi importare{" "}
        <code className="text-perry-400">Hono</code> da <code className="text-perry-400">index.ts</code> falliva
        silenziosamente — il lookup della classe mancava, e <code className="text-perry-400">new Hono()</code> restituiva{" "}
        <code className="text-perry-400">undefined</code>.
      </p>
      <p>
        Ora Perry traccia <code className="text-perry-400">Export::Named</code> all&apos;indietro attraverso gli import del modulo
        per trovare la definizione originale della classe e la propaga. Il risultato:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> ./perry compile test_hono.ts -o /tmp/test-hono && /tmp/test-hono</p>
          <p className="mt-2"><span className="text-slate-400">[1] Class instantiation through named re-export chain</span></p>
          <p className="text-green-400">  PASS: new Hono() returned a real object</p>
          <p><span className="text-slate-400">[2] Constructor-initialized fields</span></p>
          <p className="text-green-400">  PASS: app.router initialized by constructor</p>
          <p className="text-green-400">  PASS: app.router.name = SmartRouter</p>
          <p><span className="text-slate-400">[5] Multiple instances</span></p>
          <p className="text-green-400">  PASS: second instance created with router</p>
          <p><span className="text-slate-400">[6] Constructor with options</span></p>
          <p className="text-green-400">  PASS: new Hono({"{"} strict: false {"}"}) accepted options</p>
        </div>
      </div>
      <p>
        Il costruttore Hono viene eseguito, inizializza uno <code className="text-perry-400">SmartRouter</code>{" "}
        (che internamente crea sia un <code className="text-perry-400">RegExpRouter</code> che un{" "}
        <code className="text-perry-400">TrieRouter</code>), e restituisce un oggetto reale. Funzionano istanze
        multiple indipendenti. Le opzioni del costruttore sono accettate.
      </p>

      <h3>Risoluzione di re-export multi-livello</h3>
      <p>
        L&apos;<code className="text-perry-400">initTRPC</code> di tRPC si trova a 4 livelli di profondità:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-400">initTRPC.ts</span>                          <span className="text-slate-600">(export const initTRPC = ...)</span></p>
          <p><span className="text-slate-400">  -&gt; unstable-core-do-not-import.ts</span>  <span className="text-slate-600">(export * from &apos;./initTRPC&apos;)</span></p>
          <p><span className="text-slate-400">  -&gt; @trpc/server/index.ts</span>           <span className="text-slate-600">(export {"{"} initTRPC {"}"} from &apos;../../..&apos;)</span></p>
          <p><span className="text-slate-400">  -&gt; index.ts</span>                        <span className="text-slate-600">(export * from &apos;./@trpc/server&apos;)</span></p>
        </div>
      </div>
      <p>
        Quello è <code className="text-perry-400">ExportAll</code> →{" "}
        <code className="text-perry-400">Named</code> → <code className="text-perry-400">ExportAll</code>. Perry
        risolve l&apos;intera catena — <code className="text-perry-400">initTRPC</code> è accessibile nel
        binario compilato. Lo stesso per <code className="text-perry-400">TRPCError</code>, che segue lo stesso percorso.
      </p>

      <h3>Istanziazione di classi cross-modulo con argomenti</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">err</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">TRPCError</span>({"{"} code: <span className="text-green-400">&apos;NOT_FOUND&apos;</span>, message: <span className="text-green-400">&apos;resource missing&apos;</span> {"}"})</p>
          <p className="text-green-400">// PASS: new TRPCError() returned object</p>
          <p className="text-green-400">// PASS: err.code = NOT_FOUND</p>
        </div>
      </div>
      <p>
        <code className="text-perry-400">TRPCError</code> è definito in un modulo, ri-esportato attraverso
        tre barrel file intermedi, importato nel test e istanziato con un oggetto opzioni.
        Il campo <code className="text-perry-400">code</code> dell&apos;istanza è accessibile.
      </p>

      <h3>Risoluzione dei pacchetti nei monorepo</h3>
      <p>
        Strapi utilizza pacchetti workspace — <code className="text-perry-400">@strapi/core</code> è un pacchetto
        fratello nel monorepo, non una dipendenza npm. Perry risolve lo specificatore bare attraverso
        i campi exports di <code className="text-perry-400">package.json</code>:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-green-400">&quot;exports&quot;</span>: {"{"}</p>
          <p>  <span className="text-green-400">&quot;.&quot;</span>: {"{"} <span className="text-green-400">&quot;source&quot;</span>: <span className="text-green-400">&quot;./src/index.ts&quot;</span>, <span className="text-green-400">&quot;import&quot;</span>: <span className="text-green-400">&quot;./dist/index.mjs&quot;</span> {"}"}</p>
          <p>{"}"}</p>
        </div>
      </div>
      <p>
        La funzione <code className="text-perry-400">createStrapi</code> si risolve correttamente come funzione
        richiamabile attraverso <code className="text-perry-400">export * from &apos;@strapi/core&apos;</code>.
      </p>

      <h3>Filtraggio export solo tipo</h3>
      <p>
        La sintassi <code className="text-perry-400">export type {"{"} Foo {"}"}</code> di TypeScript non ha
        significato a runtime — ma in precedenza Perry le trasformava in vere
        voci <code className="text-perry-400">Export::ReExport</code> che si propagavano attraverso il linker
        e generavano simboli stub. Il file <code className="text-perry-400">index.ts</code> di Hono da solo ha
        quattro dichiarazioni <code className="text-perry-400">export type</code> che coprono decine di tipi.
      </p>
      <p>
        Perry ora controlla il flag <code className="text-perry-400">type_only</code> di SWC sulle
        dichiarazioni <code className="text-perry-400">ExportNamed</code> e{" "}
        <code className="text-perry-400">is_type_only</code> sui singoli specificatori, saltandoli durante
        il lowering HIR. Questo ha eliminato la generazione di stub morti dai re-export di tipo in tutti e tre
        i progetti.
      </p>

      <h3>Costruttore RegExp</h3>
      <p>
        <code className="text-perry-400">new RegExp(pattern, flags)</code> ora compila nella funzione runtime{" "}
        <code className="text-perry-400">js_regexp_new</code> esistente di Perry. Questo è stato
        semplice — il runtime supportava già RegExp — ma il gestore codegen{" "}
        <code className="text-perry-400">Expr::New</code> non aveva un caso per esso, quindi ogni{" "}
        <code className="text-perry-400">new RegExp(...)</code> finiva in un avviso &quot;Unknown class&quot;.
        Il <code className="text-perry-400">RegExpRouter</code> di Hono lo usa estensivamente.
      </p>

      <h2>Cosa non funziona ancora</h2>
      <p>
        Siamo specifici qui perché le lacune dicono tanto quanto i successi.
      </p>

      <h3>Assegnazione dinamica di proprietà su <code className="text-perry-400">this</code></h3>
      <p>
        Il costruttore di Hono configura i gestori di metodi HTTP dinamicamente:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">allMethods</span> = [<span className="text-green-400">&apos;get&apos;</span>, <span className="text-green-400">&apos;post&apos;</span>, <span className="text-green-400">&apos;put&apos;</span>, <span className="text-green-400">&apos;delete&apos;</span>, ...]</p>
          <p><span className="text-cyan-400">allMethods</span>.<span className="text-yellow-400">forEach</span>((<span className="text-cyan-400">method</span>) =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">this</span>[<span className="text-cyan-400">method</span>] = (<span className="text-cyan-400">args1</span>, ...<span className="text-cyan-400">args</span>) =&gt; {"{"}</p>
          <p>    <span className="text-slate-500">// register route</span></p>
          <p>    <span className="text-purple-400">return this</span></p>
          <p>  {"}"}</p>
          <p>{"}"})</p>
        </div>
      </div>
      <p>
        Questo significa che <code className="text-perry-400">app.get</code>,{" "}
        <code className="text-perry-400">app.post</code>, ecc. non sono dichiarati staticamente — sono
        assegnati a runtime tramite nomi di proprietà calcolati. Perry non supporta ancora{" "}
        <code className="text-perry-400">this[variable] = value</code>, quindi questi metodi mancano:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-400">[4] Dynamic method assignment (this[method] = ...)</span></p>
          <p className="text-amber-400">  INFO: app.get not available</p>
          <p className="text-amber-400">  INFO: app.on not available</p>
        </div>
      </div>
      <p>
        Questa è la singola lacuna più grande per Hono. La classe Hono esiste, il suo router è inizializzato,
        ma non è possibile registrare route.
      </p>

      <h3>Chiamate al costruttore a livello di modulo</h3>
      <p>
        tRPC definisce il suo punto di ingresso come:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">export const</span> <span className="text-cyan-400">initTRPC</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">TRPCBuilder</span>()</p>
        </div>
      </div>
      <p>
        A runtime, <code className="text-perry-400">initTRPC</code> appare come{" "}
        <code className="text-perry-400">typeof function</code> piuttosto che{" "}
        <code className="text-perry-400">typeof object</code> — l&apos;espressione{" "}
        <code className="text-perry-400">new TRPCBuilder()</code> a livello di modulo non esegue il
        costruttore, quindi si ottiene un riferimento alla classe piuttosto che un&apos;istanza. Questo
        significa che <code className="text-perry-400">initTRPC.create()</code> e{" "}
        <code className="text-perry-400">initTRPC.context()</code> sono entrambi{" "}
        <code className="text-perry-400">undefined</code>.
      </p>

      <h3>Proprietà ereditate</h3>
      <p>
        <code className="text-perry-400">TRPCError extends Error</code>, e mentre{" "}
        <code className="text-perry-400">err.code</code> (definito direttamente su{" "}
        <code className="text-perry-400">TRPCError</code>) funziona,{" "}
        <code className="text-perry-400">err.message</code> (ereditato da{" "}
        <code className="text-perry-400">Error</code>) non è accessibile. La catena di prototipi per il
        lookup delle proprietà non è completamente implementata.
      </p>

      <h3>Catene di costruttori complesse</h3>
      <p>
        La funzione <code className="text-perry-400">createStrapi()</code> di Strapi internamente chiama{" "}
        <code className="text-perry-400">new Strapi(opts)</code>, che estende{" "}
        <code className="text-perry-400">Container</code> (supportato da{" "}
        <code className="text-perry-400">Map</code>), chiama{" "}
        <code className="text-perry-400">loadConfiguration()</code>, itera sui provider e registra
        servizi. Questa catena profonda di costruttori produce un valore falsy — non crasha,
        ma non produce nemmeno un&apos;istanza utilizzabile.
      </p>

      <h3>Classi built-in Web API</h3>
      <p>
        Questi sono gli avvisi &quot;Unknown class&quot; rimanenti nei tre progetti:
      </p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Classe</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Conteggio</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Response", "11"],
              ["TransformStream", "7"],
              ["ReadableStream", "5"],
              ["Request", "4"],
              ["Headers", "3"],
              ["Proxy", "2"],
              ["TextEncoderStream", "2"],
              ["WritableStream", "1"],
              ["DOMException", "1"],
            ].map(([cls, count]) => (
              <tr key={cls} className="border-b border-slate-800">
                <td className="py-2 px-4 text-slate-300 font-mono text-xs">{cls}</td>
                <td className="py-2 px-4 text-slate-400">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code>
        e <code className="text-perry-400">Headers</code> sono quelli critici per qualsiasi framework HTTP.
        Questi necessitano di supporto codegen built-in simile a quello già esistente per{" "}
        <code className="text-perry-400">Map</code>, <code className="text-perry-400">Set</code>,{" "}
        <code className="text-perry-400">RegExp</code>, <code className="text-perry-400">Buffer</code>,{" "}
        <code className="text-perry-400">AbortController</code> e altri.
      </p>

      <h2>Cosa ci dice questo</h2>
      <p>
        La buona notizia: la pipeline di compilazione di Perry gestisce codice di framework reale. Progetti
        multi-file con catene di re-export complesse, firme di tipo pesantemente generiche, gerarchie di classi
        e risoluzione di pacchetti monorepo arrivano tutti fino ai binari linkati.
      </p>
      <p>
        Le lacune sono lacune a runtime, non lacune di compilazione. Il lavoro rimanente è:
      </p>
      <ol className="list-decimal list-inside">
        <li><strong>Assegnazione dinamica di proprietà</strong> — necessaria per i framework che configurano metodi programmaticamente</li>
        <li><strong>Espressioni init a livello di modulo</strong> — <code className="text-perry-400">export const x = new Foo()</code> deve effettivamente eseguire il costruttore</li>
        <li><strong>Catena di prototipi</strong> — proprietà e metodi ereditati</li>
        <li><strong>Built-in Web API</strong> — <code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code>, <code className="text-perry-400">Headers</code> per framework HTTP</li>
      </ol>
      <p>
        Questi sono problemi concreti e ben delimitati. Nessuno di essi richiede cambiamenti architetturali —
        sono estensioni di pattern che già funzionano per casi più semplici.
      </p>
      <p>
        Continueremo a lavorarci. L&apos;obiettivo è che{" "}
        <code className="text-perry-400">new Hono().get(&apos;/&apos;, (c) =&gt; c.text(&apos;hello&apos;))</code>{" "}
        produca un server HTTP funzionante in un binario nativo.
      </p>
    </>
  );
}
