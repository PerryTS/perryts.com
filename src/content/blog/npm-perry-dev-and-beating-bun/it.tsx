export default function Content() {
  return (
    <>
      <p>
        L&apos;ultimo articolo si chiudeva con Perry alla v0.5.80 e una sola sconfitta ostinata nella tabella dei benchmark: il roundtrip <code>JSON.parse</code>/<code>stringify</code> era ancora 1,6x più lento di Node. Sei giorni dopo Perry è alla <strong>v0.5.174</strong> — si tratta di <strong>94 patch release</strong> — e tre cose sono cambiate e vale la pena sottolinearle prima di ogni altra:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code>@perryts/perry</code> viene distribuito su <strong>npm</strong>. Un solo comando installa Perry su ogni piattaforma supportata.</li>
        <li><strong><code>perry dev</code></strong> aggiunge la ricompilazione automatica in watch-mode, sopra una nuova cache AST in memoria e una cache degli oggetti per-modulo su disco.</li>
        <li>La sconfitta su <code>json_roundtrip</code> è stata chiusa. Perry ora <strong>batte Node e Bun su ogni benchmark</strong> nella suite principale (15/15 contro entrambi).</li>
      </ul>
      <p>
        Il resto dell&apos;articolo è il contorno: correzioni WebAssembly, watchOS che finalmente compila end-to-end, le primitive di <code>perry/thread</code> cablate fino in fondo, e un lotto di vittorie di strictness a tempo di compilazione che trasformano i drop silenziosi in errori veri.
      </p>

      <h2>1. <code>@perryts/perry</code> su npm</h2>
      <p>
        Perry è sempre stato installabile via Homebrew su macOS e APT su Debian/Ubuntu. Buona copertura per gli sviluppatori su quelle piattaforme, niente di niente per gli utenti Windows a meno che non compilassero dai sorgenti, e nulla di uniforme per un team che mescola Mac, Linux e Windows. La v0.5.107 ha fatto sparire quel problema.
      </p>
      <pre><code>{`npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp`}</code></pre>
      <p>
        Il pacchetto è un launcher sottile che dipende da sette pacchetti opzionali per piattaforma — macOS arm64/x64, Linux x64/arm64 sia su glibc che musl, Windows x64 — e npm installa solo quello che corrisponde alla tua macchina. La dimensione del binario per piattaforma è nell&apos;ordine dei pochi megabyte. L&apos;installazione stessa dura pochi secondi. C&apos;è anche un percorso di installazione globale (<code>npm install -g @perryts/perry</code>) se lo preferisci, ma l&apos;installazione locale al progetto fissa la versione del compilatore accanto alle tue dipendenze, che è il default giusto.
      </p>
      <p>
        La pubblicazione è passata per OIDC Trusted Publisher, quindi ogni release ha una provenance ed è legata al job CI che l&apos;ha costruita. È stata una giornata di lavoro sulla CI a sé stante — diversi commit CI su <code>v0.5.107</code> a inseguire la giusta combinazione di <code>--provenance</code> / versione npm / percorso del workflow — ma è andata in porto, e ogni release successiva è stata pulita. Gli utenti Windows sono ora cittadini di prima classe, e l&apos;attrito fra team di &ldquo;installalo come piace al tuo OS&rdquo; è sparito.
      </p>

      <h2>2. <code>perry dev</code> — watch mode</h2>
      <p>
        La v0.5.143 ha aggiunto un nuovo sottocomando della CLI:
      </p>
      <pre><code>{`perry dev`}</code></pre>
      <p>
        Tutto qui. Osserva il tuo progetto, ricompila al salvataggio e rilancia il tuo binario. L&apos;ispirazione è Vite e <code>nodemon</code>; il punto è smettere di fingere che un workflow da compilatore-a-binario debba sembrare più lento di un runtime. Per la maggior parte dei progetti <code>perry dev</code> ricompila in meno di un secondo su cache calda.
      </p>
      <p>
        Il pezzo della &ldquo;cache calda&rdquo; conta. Due nuove cache sono atterrate insieme a <code>perry dev</code>:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>Cache AST in memoria</strong> (v0.5.156). Attraverso le ricompilazioni in una singola sessione di <code>perry dev</code>, Perry mantiene l&apos;AST parsato per ogni modulo che non è cambiato su disco. Modificare un file ri-parsa un file, non l&apos;intero grafo dei moduli.
        </li>
        <li>
          <strong>Cache degli oggetti per-modulo su disco (V2.2)</strong>. Ogni modulo compila al proprio file <code>.o</code> e viene hashato; i moduli invariati saltano del tutto il codegen e il linker raccoglie l&apos;oggetto dalla cache. L&apos;output verbose della cache segue la spec in <a href="https://github.com/PerryTS/perry/issues/131" className="text-amber-400 hover:text-amber-300">#131</a>, e un giro di rafforzamento dell&apos;audit nella v0.5.160 ha chiuso i casi limite in cui entry di cache obsolete potevano sopravvivere a un cambio di header.
        </li>
      </ul>
      <p>
        Le due cache si sommano. La prima modifica della sessione è una compilazione completa; tutto ciò che segue fa solo lavoro proporzionale a ciò che hai effettivamente cambiato. È il più grande cambiamento di DX della settimana, da solo.
      </p>

      <h2>3. Battere Bun su ogni benchmark</h2>
      <p>
        Alla v0.5.166 il README aveva un unico caveat onesto: Perry era 1,6x più lento di Node su <code>json_roundtrip</code> (50× <code>JSON.parse</code> + <code>JSON.stringify</code> su un blob da 1MB con 10K elementi), e 2,4x più lento di Bun. L&apos;issue <a href="https://github.com/PerryTS/perry/issues/149" className="text-amber-400 hover:text-amber-300">#149</a> tracciava il follow-up. Alla v0.5.173 — sette giorni dopo — quel divario si è chiuso.
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Workload</th>
              <th className="text-right py-2 px-3">Perry v0.5.173</th>
              <th className="text-right py-2 px-3">Node v25</th>
              <th className="text-right py-2 px-3">Bun 1.3</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>json_roundtrip</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">314ms</td><td className="text-right py-2 px-3">377ms</td><td className="text-right py-2 px-3">250ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>closure</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">10ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3">51ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>factorial</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">31ms</td><td className="text-right py-2 px-3">596ms</td><td className="text-right py-2 px-3">98ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>fibonacci(40)</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">320ms</td><td className="text-right py-2 px-3">1033ms</td><td className="text-right py-2 px-3">521ms</td></tr>
            <tr><td className="py-2 px-3"><code>mandelbrot</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">23ms</td><td className="text-right py-2 px-3">25ms</td><td className="text-right py-2 px-3">30ms</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Perry ora vince su ogni workload nella suite principale di benchmark — <strong>15/15 contro Node, 15/15 contro Bun</strong>, best of 5 su macOS ARM64. Bun 1.3 è ancora avanti sull&apos;RSS di picco (84MB contro i 310MB di Perry su <code>json_roundtrip</code>), quindi la pressione sull&apos;allocatore è la prossima cosa da chiudere, ma la latenza pura è di Perry.
      </p>
      <p>
        La chiusura del divario JSON non è stata un singolo cambiamento — è stata l&apos;accumulo del lavoro di parità sul layout degli oggetti che ha attraversato la settimana: Fase 1 di inferenza dello shape per i literal di oggetto (v0.5.167), Fase 4 di inferenza del tipo di ritorno basata sul corpo per funzioni libere, metodi di classe, getter e arrow (v0.5.169), e Fase 4.1 di inferenza del tipo di ritorno per le chiamate a metodo (v0.5.170). Il tema è lo stesso dell&apos;articolo precedente: dai a LLVM abbastanza struttura statica da vederci attraverso, e l&apos;ottimizzatore fa il resto.
      </p>
      <p>
        La v0.5.164 ha anche ripristinato l&apos;autovettorizzazione con accumulatore parallelo <code>&lt;2 x double&gt;</code> sui cicli di riduzione a sola fadd, che ad un certo punto nell&apos;intervallo v0.5.9x→v0.5.16x era silenziosamente regredita. È questo che riporta <code>math_intensive</code> e <code>accumulate</code> al loro vecchio vantaggio 3-4x su Rust/C++/Go/Swift — stesso LLVM, un solo flag <code>reassoc contract</code>, un solo corpo di ciclo vettorizzato.
      </p>

      <h2>4. <code>perry/ui</code> e doc-test</h2>
      <p>
        Quattro lacune residue di perry/ui si sono chiuse nella v0.5.151. Insieme a questo, la v0.5.119 ha capovolto l&apos;uso scorretto silenzioso dell&apos;API perry/ui da &ldquo;compila e non fa nulla&rdquo; a un errore di compilazione forte — stessa logica della v0.5.165 applicata ai decorator (vedi sotto). Che l&apos;uso scorretto emerga a tempo di compilazione è sempre meglio che a runtime.
      </p>
      <p>
        La v0.5.123 ha spedito una <strong>test harness per gli esempi della documentazione</strong> e una widget gallery. Ogni esempio TypeScript nella documentazione viene ora compilato ad ogni run di CI, e la widget gallery confronta gli screenshot con baseline approvate. La v0.5.125 ha esteso questo a una matrice di cross-compilazione: ogni esempio della documentazione viene costruito per iOS, tvOS, Android, WASM e Web oltre che per la piattaforma host, così la deriva delle API fra i target viene colta sulla PR che l&apos;ha introdotta invece che nel ciclo di release che l&apos;ha spedita.
      </p>
      <p>
        Una piccola vittoria di quality-of-life: <code>perry check</code> ora emette <code>file:riga:colonna</code> per gli errori di lowering HIR (<a href="https://github.com/PerryTS/perry/issues/129" className="text-amber-400 hover:text-amber-300">#129</a>), il che significa che il jump-to-error dell&apos;editor funziona invece di mostrare un messaggio generico senza una posizione.
      </p>

      <h2>5. watchOS compila end-to-end</h2>
      <p>
        watchOS è stato spedito come target di compilazione il mese scorso, ma una build end-to-end pulita aveva qualche angolo ruvido. Il lavoro di questa settimana su watchOS:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.113</strong>: <code>--target watchos</code> e <code>--target watchos-simulator</code> ora compilano end-to-end senza i workaround che si erano accumulati.</li>
        <li><strong>v0.5.114</strong>: <code>--features watchos-game-loop</code> per le app con superficie Metal.</li>
        <li><strong>v0.5.122</strong>: <code>--features watchos-swift-app</code> per il rendering ospitato in SwiftUI — quando vuoi che SwiftUI possieda il ciclo di vita dell&apos;app e che Perry componga l&apos;UI al suo interno.</li>
        <li><strong>v0.5.135</strong>: <code>PERRY_UI_TEST_MODE</code> cablato in perry-ui-ios e perry-ui-tvos, così il testing UI con Geisterhand gira allo stesso modo su quei due target come su macOS e Linux.</li>
      </ul>

      <h2>6. Primitive di <code>perry/thread</code> cablate fino in fondo</h2>
      <p>
        La v0.5.174 (oggi) ha chiuso la <a href="https://github.com/PerryTS/perry/issues/146" className="text-amber-400 hover:text-amber-300">#146</a>: <code>parallelMap</code>, <code>parallelFilter</code> e <code>spawn</code> sono completamente cablati attraverso il percorso di codegen con l&apos;applicazione della sicurezza a tempo di compilazione. Le catture mutabili vengono rifiutate a tempo di compilazione — la stessa postura di correttezza a tempo di compilazione che ora hanno perry/ui e i decorator. Le primitive thread che erano parzialmente cablate dall&apos;annuncio della v0.4.0 sono ora complete end-to-end.
      </p>

      <h2>7. WebAssembly e il target web</h2>
      <p>
        Due correzioni WASM da sottolineare:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.158</strong>: cinque bug che si compensavano in <code>--target web</code> (il percorso di output WASM) che si mascheravano a vicenda. Corretti in batch, quindi ora il target web regge sotto l&apos;intera superficie di <code>perry/ui</code> (<a href="https://github.com/PerryTS/perry/issues/133" className="text-amber-400 hover:text-amber-300">#133</a>).</li>
        <li><strong>v0.5.161</strong>: <code>break</code>/<code>continue</code> dentro un <code>if</code> dentro un loop si impiccava su WASM — un bug di codegen che non si riproduceva sui target nativi. Corretto (<a href="https://github.com/PerryTS/perry/issues/135" className="text-amber-400 hover:text-amber-300">#135</a>).</li>
      </ul>
      <p>
        Anche sul lato correttezza: la v0.5.157 ha corretto <code>obj.field</code> che restituiva <code>NaN</code> su Android (<a href="https://github.com/PerryTS/perry/issues/128" className="text-amber-400 hover:text-amber-300">#128</a>), e la v0.5.162 ha corretto un bug maledetto di ws dove <code>sendToClient</code> e <code>closeClient</code> stavano compilando a no-op silenziosi (<a href="https://github.com/PerryTS/perry/issues/136" className="text-amber-400 hover:text-amber-300">#136</a>).
      </p>

      <h2>8. Vittorie di strictness a tempo di compilazione</h2>
      <p>
        Un tema di questa settimana: tutto ciò che era un fallimento silenzioso è ora un errore di compilazione.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.165</strong>: i decorator TypeScript venivano parsati in HIR e poi scartati silenziosamente. Ora producono un errore al punto della decorazione con un messaggio chiaro (<a href="https://github.com/PerryTS/perry/issues/144" className="text-amber-400 hover:text-amber-300">#144</a>). Stesso ragionamento warn→bail della v0.5.119 applicato a perry/ui.</li>
        <li><strong>v0.5.119</strong>: l&apos;uso scorretto dell&apos;API perry/ui viene rifiutato a tempo di compilazione invece di produrre un binario no-op.</li>
        <li><strong>v0.5.172</strong>: <code>console.trace()</code> ora emette un vero backtrace nativo su stderr invece di limitarsi a riecheggiare il messaggio (<a href="https://github.com/PerryTS/perry/issues/20" className="text-amber-400 hover:text-amber-300">#20</a>). I frame simbolizzati richiedono <code>PERRY_DEBUG_SYMBOLS=1</code>; senza quello ottieni gli indirizzi, che è comunque più del comportamento di message-echo che sostituisce.</li>
      </ul>

      <h2>9. In chiusura</h2>
      <p>
        Il pattern della settimana: <strong>distribuzione</strong> (npm), <strong>developer experience</strong> (<code>perry dev</code>, cache incrementali), e <strong>l&apos;ultima sconfitta rimasta sui benchmark chiusa</strong>. Più un lotto di strictness a tempo di compilazione che trasforma i drop silenziosi in errori veri. Sei giorni, 94 patch release, un grande cambiamento di DX.
      </p>
      <p>
        Provalo:
      </p>
      <pre><code>{`# npm (qualsiasi piattaforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Watch mode per lo sviluppo iterativo
perry dev`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
