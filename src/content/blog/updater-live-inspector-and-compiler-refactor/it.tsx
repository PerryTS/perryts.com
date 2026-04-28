export default function Content() {
  return (
    <>
      <p>
        Il post precedente si è chiuso a <strong>v0.5.306</strong> sulla storia gen-GC + JSON + benchmark. Quattro giorni dopo, Perry è a <strong>v0.5.359</strong> — sono <strong>53 patch release</strong> — e la storia è ancora un&apos;altra. Nessuna di quelle release è un titolo a colpi di numeri di benchmark. Quasi tutte sono <strong>issue del tracker che vengono chiuse</strong>.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry/updater</code></strong> arriva — auto-update stile Sparkle/Tauri per app desktop (Ed25519 su un digest SHA-256, sentinel-rollback, riavvio detached). PR community di <strong>TheHypnoo</strong> (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a>).</li>
        <li><strong>Geisterhand Fase D</strong> — un inspector live a <code>http://localhost:7676</code> con albero dei widget, dettaglio per widget, dispatch dei click ed editing di stile live via <code>POST /style/:h</code>.</li>
        <li><strong>Il refactor del compilatore.</strong> Tra v0.5.329 → v0.5.343 i quattro file più citati sono stati spezzati: <code>lower::lower_expr</code> 6.687 → 624 LOC (−91%), <code>compile.rs</code> 9.391 → 3.783 LOC (−60%), <code>lower.rs</code> 13.591 → 7.554 LOC (−44%), <code>lower_call.rs</code> 7.000+ → 4.681 LOC (−33%). Il nuovo <code>walker.rs</code> trasforma la classe di bug del catch-all <code>_ =&gt; {}</code> in errore di compilazione.</li>
        <li><strong>Lo styling UI Fase C chiude</strong> — props inline <code>style: {`{ ... }`}</code> su ogni widget tra Apple, Android, GTK4, Windows e Web. Windows ottiene 4 stub su 5 cablati (decoration / opacity / borders); resta solo <code>widget.shadow</code> (follow-up con DirectComposition).</li>
        <li><strong>Un bucket Scoop</strong> per Windows: <code>scoop install perry-ts/perry</code>. Sidecar SHA-256 nel workflow di release.</li>
        <li><strong>Ondata di fix di issue dalla community</strong> — circa 30 issue chiuse tra runtime, codegen, fetch, GTK4, linker Windows, async e stdlib.</li>
      </ul>

      <h2>1. perry/updater — auto-update per app desktop</h2>
      <p>
        Prima del fix, Perry non aveva un percorso di aggiornamento. Le app uscivano, e basta. <strong>TheHypnoo</strong> ha aperto <a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> con tutta la storia:
      </p>
      <pre><code>{`import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // sentinel-rollback se il lancio precedente è crashato

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(\`\${pct}%\`));
  await update.installAndRelaunch();
}

markHealthy(); // chiamare dopo che la nuova build è partita correttamente`}</code></pre>
      <p>
        Modello di trust: <strong>Ed25519 sul digest SHA-256 del file</strong> (non sui byte del file — mantiene la verifica economica sui binari grandi). Il manifest è JSON, versionato per schema, una entry per tripla <code>&lt;os&gt;-&lt;arch&gt;</code>. Installazione atomica con backup <code>&lt;exe&gt;.prev</code>, riavvio detached (<code>setsid</code> su Unix, <code>DETACHED_PROCESS</code> su Windows). Il mobile è escluso per design — App Store / Play Store controllano la pipeline di installazione a livello OS.
      </p>
      <p>
        Due quirk del runtime di Perry sono emersi scrivendo lo smoke test, e sono stati fixati al volo:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>response.arrayBuffer()</code> tornava uno stub di soli metadati.</strong> Fixato in <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> (sempre TheHypnoo) — <code>js_response_array_buffer</code> ora alloca un vero <code>BufferHeader</code> e fa <code>memcpy</code> di <code>resp.body</code> dentro.</li>
        <li><strong><code>fs.appendFileSync</code> scriveva 0 byte.</strong> Fixato in <a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a> — il path di lowering del namespace-import (<code>import * as fs from &quot;fs&quot;</code>) non aveva un arm per <code>appendFileSync</code>, e nemmeno il codegen LLVM aveva un arm per la variante HIR. Entrambi cablati.</li>
      </ul>
      <p>
        La documentazione vive in <code>docs/src/updater/overview.md</code>.
      </p>

      <h2>2. Geisterhand: inspector live a localhost:7676</h2>
      <p>
        Geisterhand è stato l&apos;harness di test UI in-process di Perry — una API HTTP sulla porta 7676 per snapshottare lo stato dei widget e dispatchare click. La Fase D lo trasforma in un inspector stile devtools che si può aprire da qualsiasi browser.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Step 1 (v0.5.349)</strong> — <code>GET /</code> serve una UI vanilla-JS single-page con albero dei widget, dettaglio per widget (frame, value, raw JSON), auto-refresh da 1,5 s con pause/resume e un bottone &laquo;fire onClick&raquo;. Il codegen pinna <code>INSPECTOR_HTML</code> contro il lazy-load <code>-dead_strip</code> di macOS perché sopravviva ai release build.</li>
        <li><strong>Step 2 (v0.5.350)</strong> — <code>POST /style/:h</code> prende un sacchetto di props JSON e lo applica live. 9 props (<code>backgroundColor</code>, <code>color</code>, <code>borderColor</code>, <code>borderWidth</code>, <code>borderRadius</code>, <code>opacity</code>, <code>padding</code>, <code>hidden</code>, <code>enabled</code>) fluiscono dal thread HTTP → thread principale via la pump-queue esistente. JSON sbagliato → 400; handle sbagliato → 400; le props sconosciute sono filtrate lato server e la response elenca quali sono passate.</li>
      </ul>
      <pre><code>{`perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \\
  -H 'content-type: application/json' \\
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}`}</code></pre>
      <p>
        Il dispatcher macOS è cablato; Linux / Windows / iOS / tvOS / visionOS / Android seguono la stessa forma e sono i prossimi.
      </p>

      <h2>3. Il refactor del compilatore — spezzare i quattro file più grossi</h2>
      <p>
        Cinque issue nel tracker (<a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a>, <a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a>, <a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a>, <a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a>, più una coda lunga) avevano la stessa forma: una nuova variante di <code>Expr</code> aggiunta a <code>ir.rs</code>, ma uno dei quattro walker ad-hoc in <code>lower.rs</code> aveva un catch-all <code>_ =&gt; {}</code> e mis-compilava silenziosamente la nuova variante. Beccarlo a runtime è caro — a volte invisibile, a volte un SIGSEGV sotto SSO.
      </p>
      <p>
        <strong>v0.5.329</strong> ha introdotto <code>crates/perry-hir/src/walker.rs</code> con <code>walk_expr_children</code> / <code>walk_expr_children_mut</code> — match esaustivi su tutte le 178 varianti di <code>Expr</code>, <strong>nessun catch-all</strong>. Aggiungere una nuova variante senza elencarla qui ora è un errore di compilazione. I quattro consumer (<code>substitute_locals</code>, <code>find_max_local_id::check_expr</code>, <code>collect_local_refs_expr</code>, <code>remap_local_ids_in_expr</code>) sono collassati:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Funzione</th>
              <th className="text-right py-2 px-3">Prima</th>
              <th className="text-right py-2 px-3">Dopo</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>find_max_local_id::check_expr</code></td><td className="text-right py-2 px-3">225</td><td className="text-right py-2 px-3">57</td><td className="text-right py-2 px-3">−75%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>substitute_locals</code></td><td className="text-right py-2 px-3">553</td><td className="text-right py-2 px-3">80</td><td className="text-right py-2 px-3">−86%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>collect_local_refs_expr</code></td><td className="text-right py-2 px-3">720</td><td className="text-right py-2 px-3">70</td><td className="text-right py-2 px-3">−90%</td></tr>
            <tr><td className="py-2 px-3"><code>remap_local_ids_in_expr</code></td><td className="text-right py-2 px-3">542</td><td className="text-right py-2 px-3">85</td><td className="text-right py-2 px-3">−84%</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Totale: <strong>−1.830 righe di descent duplicato</strong>, sostituite da <strong>+1.840 righe di un walker centralizzato</strong> — netto piatto, ma la classe di bug è andata.
      </p>
      <p>
        Quello ha sbloccato il resto. <strong>v0.5.331 → v0.5.343</strong> hanno tagliato i quattro monoliti in 14 commit. I numeri di copertina:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">File</th>
              <th className="text-right py-2 px-3">Prima</th>
              <th className="text-right py-2 px-3">Dopo</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower::lower_expr</code></td><td className="text-right py-2 px-3">6.687</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">624</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−91%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>compile.rs</code></td><td className="text-right py-2 px-3">9.391</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">3.783</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−60%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower.rs</code></td><td className="text-right py-2 px-3">13.591</td><td className="text-right py-2 px-3">7.554</td><td className="text-right py-2 px-3">−44%</td></tr>
            <tr><td className="py-2 px-3"><code>lower_call.rs</code></td><td className="text-right py-2 px-3">7.000+</td><td className="text-right py-2 px-3">4.681</td><td className="text-right py-2 px-3">−33%</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Lo split è atterrato come 19 nuovi sotto-moduli focalizzati: <code>compile/{`{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}`}.rs</code>, <code>lower/{`{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}`}.rs</code>, <code>lower_call/{`{ui_styling, builtin, native}`}.rs</code>, più una nuova crate <code>crates/perry-dispatch</code> diventata l&apos;unica fonte di verità per le tabelle di metodi UI / system / i18n (il fan-out <code>_ =&gt; &quot;perry_ui_unknown&quot;</code> che provocava le sorprese &laquo;compila su macOS, si rompe sul web&raquo; dell&apos;issue <a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a> ora è un solo lookup).
      </p>
      <p>
        <strong>I win di perf di Tier 4</strong> hanno accompagnato (v0.5.335–v0.5.336):
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Fusi due passi in <code>inline_functions</code> e tre passi rayon in <code>compile.rs</code> — risparmia 5 scan di modulo + 3 round-trip dello scheduler per compilazione.</li>
        <li>Limitato il parse cache di <code>perry dev</code> a 500 entry, eviction FIFO. Prima del fix, una sessione che girava su <code>node_modules</code> poteva trattenere 100+ MB di AST SWC.</li>
        <li>Parallelizzato il loop di scrittura <code>.ll</code> post-codegen — wall-time 2–4× più veloce su SSD con 50+ moduli.</li>
        <li><code>Arc&lt;I18nTable&gt;</code> invece di clonare la tabella locale per worker.</li>
      </ul>
      <p>
        I test del workspace sono rimasti a <strong>434 passed / 0 failed / 5 ignored</strong> in ogni commit; gap test alla baseline 25/28; doc-test alla baseline 80/82.
      </p>

      <h2>4. UI styling Fase C, finita</h2>
      <p>
        La Fase C era il rollout di <code>style: {`{ ... }`}</code> inline. Gli step 1–7 hanno chiuso in questa finestra:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.305 → v0.5.306</strong> — superficie di tipo <code>StyleProps</code> + <code>style:</code> inline su Button.</li>
        <li><strong>v0.5.307 → v0.5.309</strong> — destructure inline color/padding/shadow su ogni widget tabella, poi VStack / HStack.</li>
        <li><strong>v0.5.310 → v0.5.311</strong> — stringhe hex + gradient + <code>parseColor</code> a runtime per valori dinamici.</li>
        <li><strong>v0.5.312</strong> — docs di styling + issue di tracking Windows.</li>
      </ul>
      <p>Poi la passata cross-platform:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GTK4</strong> (<a href="https://github.com/PerryTS/perry/issues/202" className="text-amber-400 hover:text-amber-300">#202</a>, <a href="https://github.com/PerryTS/perry/issues/206" className="text-amber-400 hover:text-amber-300">#206</a>) — 4 FFI di styling cablati, più 7 FFI mancanti che bloccavano il gate dei doc-test Linux (v0.5.322).</li>
        <li><strong>macOS</strong> (v0.5.324) — plumbing dell&apos;ombra <code>CALayer</code> per <code>widget.shadow</code> + infrastruttura visual_test; class-probe <code>set_color</code> per i widget non-<code>NSTextField</code>.</li>
        <li><strong>iOS / tvOS / visionOS</strong> (v0.5.346) — Button <code>color: ...</code> colpiva <code>setTextColor:</code> su <code>UIButton</code>, che non implementa quel selettore; il panic di <code>objc2</code> attraversava una frontiera <code>extern &quot;C&quot;</code> e il processo si abortiva. Fixato con lo stesso pattern di class-probe di macOS — UIButton ora viene istradato attraverso <code>setTitleColor:forState:UIControlStateNormal</code>.</li>
        <li><strong>Windows</strong> (v0.5.347) — 4 stub di styling su 5 cablati (<code>text.decoration</code> via round-trip <code>LOGFONT</code>, <code>widget.opacity</code> via <code>WS_EX_LAYERED</code> + <code>SetLayeredWindowAttributes</code>, borders via <code>SetWindowSubclass</code> + <code>WM_PAINT</code>). Resta solo <code>widget.shadow</code> (serve DirectComposition).</li>
      </ul>
      <p>
        La matrice di styling in <code>docs/src/ui/styling-matrix.md</code> chiude la finestra con <strong>Web a 43/43 Wired</strong>, <strong>Windows a 42/43 Wired</strong>, il resto a copertura piena.
      </p>

      <h2>5. La passata di correttezza del runtime — issue per issue</h2>
      <p>
        Un tema del periodo: ogni miscompile arrivato dal tracker si è trasformato o in un fix o in un errore di compilazione. Highlight:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a> (v0.5.323)</strong> — i metodi di classe dentro <code>fn</code> non potevano catturare local della fn racchiudente. Repro multi-modulo ora combaciano con Node byte per byte.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a> (v0.5.321 + v0.5.330)</strong> — unboxing di string-handle SSO-safe su 7 site con operandi string: <code>arr.join</code>, <code>arr.toString</code>, <code>obj[stringKey]</code> get/set/delete, <code>string.match(re)</code>, <code>process.env[dynKey]</code>, input di digest crypto. Prima del fix, ognuno o tornava silenziosamente garbage o faceva SIGSEGV su operandi inline-string.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/221" className="text-amber-400 hover:text-amber-300">#221</a> (v0.5.351)</strong> — gli array vuoti <code>const</code> a livello modulo perdevano le scritture <code>arr[i]=</code> dall&apos;interno delle funzioni. Emerso quando <code>discoverLevels()</code> di Bloom-Engine/jump popolava <code>LEVEL_FILES</code> a livello modulo via index-assign e la schermata di selezione livello veniva vuota.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/233" className="text-amber-400 hover:text-amber-300">#233</a> (v0.5.357)</strong> — <code>Array.push</code> dall&apos;interno di una funzione async era silenziosamente cappato a 16 elementi quando l&apos;array entrava come parametro. Le funzioni async non vengono inlinate; la realloc tornava un nuovo puntatore che il chiamante non vedeva mai. Fix: installare un puntatore di forwarding alla vecchia posizione a ogni crescita, riusando il meccanismo <code>GC_FLAG_FORWARDED</code> esistente del GC.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/235" className="text-amber-400 hover:text-amber-300">#235</a> (v0.5.358)</strong> — il dispatch di parametri di default dei metodi passava garbage quando i chiamanti omettevano arg in coda. Due contributori: i declare di metodo cross-module hardcodavano 6 double invece di <code>arity + 1</code>, e <code>lower_class_method</code> non chiamava affatto <code>build_default_param_stmts</code>. Emerso in <code>findOne(filter, options = {`{}`})</code> di mongodb che si bloccava in silenzio; il fix è uniforme tra dispatch locale e cross-module.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/236" className="text-amber-400 hover:text-amber-300">#236</a> (v0.5.355)</strong> — tre bug indipendenti fetch + promise da un solo repro: api.github.com restituiva 403 anonimo (User-Agent di default ora impostato), <code>.then(console.log)</code> si bloccava per sempre (i callback null non spingevano entry su TASK_QUEUE), ogni rifiuto fetch stampava <code>Uncaught exception: [object Object]</code> (<code>*StringHeader</code> nudo NaN-boxato invece di un vero <code>ErrorHeader</code>).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/234" className="text-amber-400 hover:text-amber-300">#234</a> (v0.5.359)</strong> — <code>Blob</code> reale con metodi di istanza <code>arrayBuffer</code> / <code>text</code> / <code>bytes</code> / <code>slice</code>. Prima del fix, <code>await response.blob()</code> tornava uno stub di soli metadati <code>{`{size, type}`}</code>. Fix in tre parti atterrato su runtime + HIR + codegen.</li>
      </ul>
      <p>Più i piccoli recuperi:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/181" className="text-amber-400 hover:text-amber-300">#181</a></strong> — strip-dedup potava in eccesso le monomorfizzazioni generiche su Linux + silent-fallback del link GTK4. Fix: sostituire il filtraggio per pattern di nome con confronto di <strong>insieme di simboli</strong> via <code>llvm-nm</code>. I membri con anche un solo simbolo unique vengono tenuti. <code>libperry_ui_macos.a</code> tagliato 196 → 35 oggetti senza errori di link.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/220" className="text-amber-400 hover:text-amber-300">#220</a></strong> — <code>secur32.lib</code> aggiunto alla riga di link Windows.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/198" className="text-amber-400 hover:text-amber-300">#198</a></strong> — i18n <code>FormatNumber</code> round-trip FP via Ryū.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/188" className="text-amber-400 hover:text-amber-300">#188</a></strong> — codegen dispatch cablato per i wrapper di formato <code>perry/i18n</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/189" className="text-amber-400 hover:text-amber-300">#189</a> / <a href="https://github.com/PerryTS/perry/issues/203" className="text-amber-400 hover:text-amber-300">#203</a></strong> — codegen dispatch <code>perry/plugin</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/190" className="text-amber-400 hover:text-amber-300">#190</a></strong> — widget Canvas attraverso il codegen LLVM.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a></strong> — CameraView attraverso il codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/192" className="text-amber-400 hover:text-amber-300">#192</a></strong> — widget Table attraverso il codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/193" className="text-amber-400 hover:text-amber-300">#193</a></strong> (parziale) — 11 arm di dispatch di helper stdlib.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/98" className="text-amber-400 hover:text-amber-300">#98</a></strong> — ricezione in background delle notifiche su iOS + Android (warm-path).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/106" className="text-amber-400 hover:text-amber-300">#106</a></strong> — fallback deboli per gli hook FFI di game-loop su watchOS.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/154" className="text-amber-400 hover:text-amber-300">#154</a></strong> — hook di dispose <code>using</code> / <code>await using</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a></strong> — alloca degli arg di <code>js_native_call_method</code> issata al blocco di entry.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a></strong> — arm Uint8Array di <code>substitute_locals</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a></strong> — <code>fs.appendFileSync</code> cablato end-to-end (PR community).</li>
      </ul>

      <h2>6. Windows + Scoop</h2>
      <p>
        La storia della toolchain Windows continua a semplificarsi. <strong>v0.5.353</strong> ha pinnato <code>clang -target</code> sui build host — clang non-MSVC nel PATH (MinGW / MSYS2 / Anaconda / bundle GNU di Rust) riscriveva silenziosamente l&apos;IR <code>x86_64-pc-windows-msvc</code> di Perry in <code>windows-gnu</code>, e lld-link non riusciva a risolvere il riferimento <code>__main</code> che l&apos;emettitore mingw32 di LLVM inseriva. Il nuovo <code>probe_clang_default_triple</code> esegue <code>clang --version</code> una volta per processo e stampa una sola nota informativa quando il default dell&apos;host è GNU ma stiamo targetando MSVC. Sopprimere con <code>PERRY_NO_CLANG_PROBE=1</code>.
      </p>
      <p>
        <strong>v0.5.345</strong> ha allineato l&apos;ABI <code>perry-ui</code> Win64 con <code>perry-dispatch</code> — tre firme extern di runtime erano andate alla deriva (<code>perry_ui_navstack_create</code>, <code>perry_ui_menu_add_item_with_shortcut</code>, <code>perry_ui_app_set_timer</code>). Sull&apos;ABI Win64 gli arg posizionali interi e float condividono gli indici di slot, quindi un mismatch legge garbage da registri non inizializzati. SysV (macOS / Linux) usa pool di registri int/float separati e per caso atterravano bit validi — crash solo Windows, fixato sulle 8 crate di piattaforma perry-ui-*.
      </p>
      <p>
        Poi: <strong><code>scoop install perry-ts/perry</code></strong>. Manifest pinnato a v0.5.345 (con <code>depends: main/llvm</code> per tirare automaticamente il LLVM ufficiale default-MSVC). Il workflow di release ora emette sidecar <code>&lt;artifact&gt;.sha256</code> accanto a ogni archivio, in formato compatibile <code>sha256sum</code> per ogni bumper di package manager downstream.
      </p>
      <pre><code>{`# Host Windows
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\\main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Tirando le somme</h2>
      <p>
        Il pattern di questo tratto è engagement della community più igiene interna. <strong>TheHypnoo</strong> ha consegnato tre PR significativi (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> perry/updater, <a href="https://github.com/PerryTS/perry/pull/231" className="text-amber-400 hover:text-amber-300">#231</a> cablaggio di <code>fs.appendFileSync</code>, <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> byte di body in <code>response.arrayBuffer</code>). Il tracker si è svuotato di circa 30 issue. Il compilatore è diventato 60% più piccolo sul suo file più grosso e ha messo su un walker esaustivo che trasforma &laquo;ho dimenticato di aggiornare uno dei quattro walker ad-hoc&raquo; da miscompile runtime a errore <code>cargo build</code>. Lo styling UI ha raggiunto la parità su ogni piattaforma desktop tranne le ombre su Windows. Geisterhand ha fatto crescere una superficie devtools da browser. Il path di installazione su Windows si è accorciato di un comando.
      </p>
      <p>Provalo:</p>
      <pre><code>{`# npm (qualunque piattaforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Auto-update per app desktop
npm install @perry/updater

# Inspector live
perry compile main.ts -o app --enable-geisterhand
./app &  # poi apri http://localhost:7676`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issue: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
