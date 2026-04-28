export default function Content() {
  return (
    <>
      <p>
        Der letzte Beitrag endete bei <strong>v0.5.306</strong> mit der Gen-GC + JSON + Benchmarks-Story. Vier Tage später ist Perry bei <strong>v0.5.359</strong> — das sind <strong>53 Patch-Releases</strong> — und die Geschichte ist wieder eine andere. Keines dieser Releases ist eine Schlagzeile mit Benchmark-Zahlen. Fast alle sind <strong>Issues aus dem Tracker, die geschlossen werden</strong>.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry/updater</code></strong> ist da — Auto-Update für Desktop-Apps in Sparkle/Tauri-Manier (Ed25519 über einen SHA-256-Digest, Sentinel-Rollback, Detached Relaunch). Community-PR von <strong>TheHypnoo</strong> (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a>).</li>
        <li><strong>Geisterhand Phase D</strong> — ein Live-Inspector unter <code>http://localhost:7676</code> mit Widget-Baum, Per-Widget-Detail, Click-Dispatch und Live-Style-Edit über <code>POST /style/:h</code>.</li>
        <li><strong>Das Compiler-Refactoring.</strong> Über v0.5.329 → v0.5.343 wurden die vier am häufigsten genannten Dateien zerlegt: <code>lower::lower_expr</code> 6.687 → 624 LOC (−91 %), <code>compile.rs</code> 9.391 → 3.783 LOC (−60 %), <code>lower.rs</code> 13.591 → 7.554 LOC (−44 %), <code>lower_call.rs</code> 7.000+ → 4.681 LOC (−33 %). Neuer <code>walker.rs</code> verwandelt die <code>_ =&gt; {}</code>-Catch-all-Bug-Klasse in einen Compile-Error.</li>
        <li><strong>UI-Styling Phase C abgeschlossen</strong> — Inline-<code>style: {`{ ... }`}</code>-Props auf jedem Widget über Apple, Android, GTK4, Windows und Web. Windows bekommt 4 von 5 Stubs verdrahtet (Decoration / Opacity / Borders); nur <code>widget.shadow</code> bleibt offen (DirectComposition-Follow-up).</li>
        <li><strong>Ein Scoop-Bucket</strong> für Windows: <code>scoop install perry-ts/perry</code>. SHA-256-Sidecars im Release-Workflow.</li>
        <li><strong>Welle von Community-Issue-Fixes</strong> — etwa 30 Issues geschlossen über Runtime, Codegen, fetch, GTK4, Windows-Linker, Async und Stdlib.</li>
      </ul>

      <h2>1. perry/updater — Auto-Update für Desktop-Apps</h2>
      <p>
        Vor dem Fix hatte Perry keinen Update-Pfad. Apps wurden ausgeliefert, und das war&apos;s. <strong>TheHypnoo</strong> öffnete <a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> mit der ganzen Story:
      </p>
      <pre><code>{`import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // Sentinel-Rollback, falls der vorherige Start gecrasht ist

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(\`\${pct}%\`));
  await update.installAndRelaunch();
}

markHealthy(); // aufrufen, nachdem der neue Build erfolgreich gestartet ist`}</code></pre>
      <p>
        Trust-Modell: <strong>Ed25519 über den SHA-256-Digest der Datei</strong> (nicht über die Datei-Bytes — das hält die Verifikation bei großen Binärdateien günstig). Das Manifest ist JSON, schema-versioniert, ein Eintrag pro <code>&lt;os&gt;-&lt;arch&gt;</code>-Tripel. Atomare Installation mit <code>&lt;exe&gt;.prev</code>-Backup, Detached Relaunch (<code>setsid</code> auf Unix, <code>DETACHED_PROCESS</code> auf Windows). Mobile ist bewusst ausgeschlossen — App Store / Play Store kontrollieren die Installation auf OS-Ebene.
      </p>
      <p>
        Beim Schreiben des Smoke-Tests tauchten zwei Perry-Runtime-Eigenheiten auf, die direkt mitgefixt wurden:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>response.arrayBuffer()</code> lieferte einen Metadaten-Stub.</strong> Gefixt in <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> (auch TheHypnoo) — <code>js_response_array_buffer</code> alloziert jetzt einen echten <code>BufferHeader</code> und <code>memcpy</code>t <code>resp.body</code> hinein.</li>
        <li><strong><code>fs.appendFileSync</code> schrieb 0 Bytes.</strong> Gefixt in <a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a> — der Namespace-Import-Lowering-Pfad (<code>import * as fs from &quot;fs&quot;</code>) hatte keinen Arm für <code>appendFileSync</code>, und der LLVM-Codegen hatte ebenfalls keinen Arm für die HIR-Variante. Beide jetzt verdrahtet.</li>
      </ul>
      <p>
        Die Dokumentation lebt unter <code>docs/src/updater/overview.md</code>.
      </p>

      <h2>2. Geisterhand: Live-Inspector unter localhost:7676</h2>
      <p>
        Geisterhand ist Perrys In-Process-UI-Test-Harness — eine HTTP-API auf Port 7676 zum Snapshotten von Widget-State und Dispatchen von Klicks. Phase D macht daraus einen Devtools-artigen Inspector, den du in jedem Browser öffnen kannst.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Schritt 1 (v0.5.349)</strong> — <code>GET /</code> liefert eine Single-Page-Vanilla-JS-UI mit Widget-Baum, Per-Widget-Detail (Frame, Value, Raw JSON), 1,5 s Auto-Refresh mit Pause/Resume und einem &bdquo;fire onClick&ldquo;-Action-Button. Der Codegen pinnt <code>INSPECTOR_HTML</code> gegen das macOS-Lazy-Load-<code>-dead_strip</code>, damit es Release-Builds übersteht.</li>
        <li><strong>Schritt 2 (v0.5.350)</strong> — <code>POST /style/:h</code> nimmt einen JSON-Prop-Bag und wendet ihn live an. 9 Props (<code>backgroundColor</code>, <code>color</code>, <code>borderColor</code>, <code>borderWidth</code>, <code>borderRadius</code>, <code>opacity</code>, <code>padding</code>, <code>hidden</code>, <code>enabled</code>) fließen vom HTTP-Thread → Main-Thread über die existierende Pump-Queue. Schlechtes JSON → 400; schlechter Handle → 400; unbekannte Props werden serverseitig gefiltert und die Response listet, welche durchgekommen sind.</li>
      </ul>
      <pre><code>{`perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \\
  -H 'content-type: application/json' \\
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}`}</code></pre>
      <p>
        Der macOS-Dispatcher ist verdrahtet; Linux / Windows / iOS / tvOS / visionOS / Android folgen dem gleichen Muster und sind als Nächstes dran.
      </p>

      <h2>3. Das Compiler-Refactoring — die vier größten Dateien zerlegen</h2>
      <p>
        Fünf Issues im Tracker (<a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a>, <a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a>, <a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a>, <a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a>, plus ein langer Schwanz) hatten dieselbe Form: Eine neue <code>Expr</code>-Variante wurde zu <code>ir.rs</code> hinzugefügt, aber einer von vier Ad-hoc-Walkern in <code>lower.rs</code> hatte einen <code>_ =&gt; {}</code>-Catch-all und kompilierte die neue Variante stillschweigend falsch. Sowas zur Laufzeit zu fangen ist teuer — manchmal unsichtbar, manchmal ein SIGSEGV unter SSO.
      </p>
      <p>
        <strong>v0.5.329</strong> brachte <code>crates/perry-hir/src/walker.rs</code> mit <code>walk_expr_children</code> / <code>walk_expr_children_mut</code> — exhaustive Matches über alle 178 <code>Expr</code>-Varianten, <strong>kein Catch-all</strong>. Eine neue Variante hinzuzufügen, ohne sie hier zu listen, ist jetzt ein Compile-Error. Die vier Konsumenten (<code>substitute_locals</code>, <code>find_max_local_id::check_expr</code>, <code>collect_local_refs_expr</code>, <code>remap_local_ids_in_expr</code>) kollabierten:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Funktion</th>
              <th className="text-right py-2 px-3">Vorher</th>
              <th className="text-right py-2 px-3">Nachher</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>find_max_local_id::check_expr</code></td><td className="text-right py-2 px-3">225</td><td className="text-right py-2 px-3">57</td><td className="text-right py-2 px-3">−75 %</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>substitute_locals</code></td><td className="text-right py-2 px-3">553</td><td className="text-right py-2 px-3">80</td><td className="text-right py-2 px-3">−86 %</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>collect_local_refs_expr</code></td><td className="text-right py-2 px-3">720</td><td className="text-right py-2 px-3">70</td><td className="text-right py-2 px-3">−90 %</td></tr>
            <tr><td className="py-2 px-3"><code>remap_local_ids_in_expr</code></td><td className="text-right py-2 px-3">542</td><td className="text-right py-2 px-3">85</td><td className="text-right py-2 px-3">−84 %</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Summe: <strong>−1.830 Zeilen duplizierter Descent</strong>, ersetzt durch <strong>+1.840 Zeilen eines zentralisierten Walkers</strong> — netto flach, aber die Bug-Klasse ist weg.
      </p>
      <p>
        Das schaltete den Rest frei. <strong>v0.5.331 → v0.5.343</strong> zerlegten die vier Monolithen über 14 Commits. Die Headline-Zahlen:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Datei</th>
              <th className="text-right py-2 px-3">Vorher</th>
              <th className="text-right py-2 px-3">Nachher</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower::lower_expr</code></td><td className="text-right py-2 px-3">6.687</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">624</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−91 %</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>compile.rs</code></td><td className="text-right py-2 px-3">9.391</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">3.783</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−60 %</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower.rs</code></td><td className="text-right py-2 px-3">13.591</td><td className="text-right py-2 px-3">7.554</td><td className="text-right py-2 px-3">−44 %</td></tr>
            <tr><td className="py-2 px-3"><code>lower_call.rs</code></td><td className="text-right py-2 px-3">7.000+</td><td className="text-right py-2 px-3">4.681</td><td className="text-right py-2 px-3">−33 %</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Der Split landete als 19 neue, fokussierte Sub-Module: <code>compile/{`{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}`}.rs</code>, <code>lower/{`{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}`}.rs</code>, <code>lower_call/{`{ui_styling, builtin, native}`}.rs</code>, plus eine neue <code>crates/perry-dispatch</code>-Crate, die zur Single Source of Truth für UI- / System- / i18n-Method-Tables wurde (das <code>_ =&gt; &quot;perry_ui_unknown&quot;</code>-Fan-out, das die &bdquo;kompiliert auf macOS, kaputt im Web&ldquo;-Überraschungen aus Issue <a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a> getrieben hatte, ist jetzt ein einziges Lookup).
      </p>
      <p>
        <strong>Tier-4-Perf-Wins</strong> kamen mit (v0.5.335–v0.5.336):
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Zwei Passes in <code>inline_functions</code> und drei rayon-Passes in <code>compile.rs</code> fusioniert — spart 5 Modul-Scans + 3 Scheduler-Round-Trips pro Compile.</li>
        <li>Den <code>perry dev</code>-Parse-Cache bei 500 Einträgen begrenzt, FIFO-Eviction. Vor dem Fix konnte eine Session, die <code>node_modules</code> durchläuft, 100+ MB SWC-AST halten.</li>
        <li>Die Post-Codegen-<code>.ll</code>-Write-Schleife parallelisiert — 2–4× schnellere Wall-Time auf SSDs mit 50+ Modulen.</li>
        <li><code>Arc&lt;I18nTable&gt;</code> statt die Locale-Tabelle pro Worker zu klonen.</li>
      </ul>
      <p>
        Workspace-Tests blieben bei <strong>434 passed / 0 failed / 5 ignored</strong> über jeden Commit; Gap-Tests bei 25/28 Baseline; Doc-Tests bei 80/82 Baseline.
      </p>

      <h2>4. UI-Styling Phase C, abgeschlossen</h2>
      <p>
        Phase C war der Inline-<code>style: {`{ ... }`}</code>-Rollout. Schritte 1–7 schlossen in diesem Fenster:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.305 → v0.5.306</strong> — <code>StyleProps</code>-Type-Surface + Inline-<code>style:</code> auf Button.</li>
        <li><strong>v0.5.307 → v0.5.309</strong> — Color/Padding/Shadow-Inline-Destructure auf jedem Tabellen-Widget, dann VStack / HStack.</li>
        <li><strong>v0.5.310 → v0.5.311</strong> — Hex-Strings + Gradient + Runtime-<code>parseColor</code> für dynamische Werte.</li>
        <li><strong>v0.5.312</strong> — Styling-Docs + Windows-Tracking-Issue.</li>
      </ul>
      <p>Dann der Cross-Platform-Sweep:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GTK4</strong> (<a href="https://github.com/PerryTS/perry/issues/202" className="text-amber-400 hover:text-amber-300">#202</a>, <a href="https://github.com/PerryTS/perry/issues/206" className="text-amber-400 hover:text-amber-300">#206</a>) — 4 Styling-FFIs verdrahtet, plus 7 fehlende FFIs, die das Linux-Doc-Tests-Gate blockierten (v0.5.322).</li>
        <li><strong>macOS</strong> (v0.5.324) — <code>CALayer</code>-Shadow-Plumbing für <code>widget.shadow</code> + visual_test-Infrastruktur; <code>set_color</code>-Class-Probe für Nicht-<code>NSTextField</code>-Widgets.</li>
        <li><strong>iOS / tvOS / visionOS</strong> (v0.5.346) — Button-<code>color: ...</code> traf <code>setTextColor:</code> auf <code>UIButton</code>, der diesen Selektor nicht implementiert; <code>objc2</code>-Panic überquerte eine <code>extern &quot;C&quot;</code>-Grenze und der Prozess brach ab. Über das gleiche Class-Probe-Muster wie macOS gefixt — UIButton routet jetzt durch <code>setTitleColor:forState:UIControlStateNormal</code>.</li>
        <li><strong>Windows</strong> (v0.5.347) — 4 von 5 Styling-Stubs verdrahtet (<code>text.decoration</code> via <code>LOGFONT</code>-Round-Trip, <code>widget.opacity</code> via <code>WS_EX_LAYERED</code> + <code>SetLayeredWindowAttributes</code>, Borders via <code>SetWindowSubclass</code> + <code>WM_PAINT</code>). Nur <code>widget.shadow</code> bleibt offen (braucht DirectComposition).</li>
      </ul>
      <p>
        Die Styling-Matrix in <code>docs/src/ui/styling-matrix.md</code> beendet das Fenster mit <strong>Web bei 43/43 Wired</strong>, <strong>Windows bei 42/43 Wired</strong>, der Rest bei voller Abdeckung.
      </p>

      <h2>5. Der Runtime-Korrektheits-Pass — Issue für Issue</h2>
      <p>
        Ein Thema des Zeitraums: Jeder Miscompile, der über den Tracker reinkam, wurde entweder zu einem Fix oder zu einem Compile-Time-Error. Highlights:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a> (v0.5.323)</strong> — Klassen-Methoden innerhalb von <code>fn</code> konnten umschließende Fn-Locals nicht capturen. Multi-Module-Repros matchen jetzt Node Byte-für-Byte.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a> (v0.5.321 + v0.5.330)</strong> — SSO-sicheres String-Handle-Unboxing über 7 String-Operand-Sites: <code>arr.join</code>, <code>arr.toString</code>, <code>obj[stringKey]</code> get/set/delete, <code>string.match(re)</code>, <code>process.env[dynKey]</code>, Crypto-Digest-Input. Vor dem Fix lieferte jede dieser Stellen entweder stumm Müll oder SIGSEGV bei Inline-String-Operanden.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/221" className="text-amber-400 hover:text-amber-300">#221</a> (v0.5.351)</strong> — Modul-Level leere <code>const</code>-Arrays verloren <code>arr[i]=</code>-Writes aus Funktionen heraus. Aufgetaucht, als Bloom-Engine/jumps <code>discoverLevels()</code> <code>LEVEL_FILES</code> auf Modul-Level via Index-Assign befüllte und der Level-Select-Screen leer rauskam.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/233" className="text-amber-400 hover:text-amber-300">#233</a> (v0.5.357)</strong> — <code>Array.push</code> aus einer Async-Funktion war stumm bei 16 Elementen gedeckelt, wenn das Array als Parameter übergeben wurde. Async-Funktionen werden nicht inlined; Reallocation gab einen neuen Pointer zurück, den der Caller nie sah. Fix: bei jedem Wachstum einen Forwarding-Pointer an der alten Position installieren, wiederverwendet wird der GC-eigene <code>GC_FLAG_FORWARDED</code>-Mechanismus.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/235" className="text-amber-400 hover:text-amber-300">#235</a> (v0.5.358)</strong> — Method-Default-Param-Dispatch lieferte Müll, wenn Caller nachgestellte Args wegließen. Zwei Anteile: Cross-Module-Method-Declares hardcodierten 6 Doubles statt <code>arity + 1</code>, und <code>lower_class_method</code> hatte überhaupt keinen <code>build_default_param_stmts</code>-Aufruf. Aufgetaucht in mongodbs <code>findOne(filter, options = {`{}`})</code>, das stumm hing; Fix ist einheitlich über lokalen + Cross-Module-Dispatch.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/236" className="text-amber-400 hover:text-amber-300">#236</a> (v0.5.355)</strong> — drei unabhängige fetch- + Promise-Bugs aus einem Repro: api.github.com 403&apos;te anonym (Default-User-Agent jetzt gesetzt), <code>.then(console.log)</code> hing ewig (Null-Callbacks pushten keine TASK_QUEUE-Einträge), jede fetch-Rejection druckte <code>Uncaught exception: [object Object]</code> (NaN-geboxter blanker <code>*StringHeader</code> statt eines echten <code>ErrorHeader</code>).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/234" className="text-amber-400 hover:text-amber-300">#234</a> (v0.5.359)</strong> — echte <code>Blob</code> mit <code>arrayBuffer</code> / <code>text</code> / <code>bytes</code> / <code>slice</code>-Instance-Methoden. Vor dem Fix gab <code>await response.blob()</code> einen Metadaten-Stub <code>{`{size, type}`}</code> zurück. Dreiteiliger Fix landete über Runtime + HIR + Codegen.</li>
      </ul>
      <p>Plus die kleinen Catch-ups:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/181" className="text-amber-400 hover:text-amber-300">#181</a></strong> — Strip-Dedup über-prunte generische Monomorphisierungen unter Linux + GTK4-Link-Silent-Fallback. Fix: Name-Pattern-Filter durch <strong>Symbol-Set</strong>-Vergleich via <code>llvm-nm</code> ersetzen. Members mit auch nur einem unique Symbol bleiben drin. <code>libperry_ui_macos.a</code> getrimmt 196 → 35 Objekte ohne Link-Errors.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/220" className="text-amber-400 hover:text-amber-300">#220</a></strong> — <code>secur32.lib</code> zur Windows-Link-Line hinzugefügt.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/198" className="text-amber-400 hover:text-amber-300">#198</a></strong> — i18n-<code>FormatNumber</code>-FP-Round-Trip via Ryū.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/188" className="text-amber-400 hover:text-amber-300">#188</a></strong> — Codegen-Dispatch für <code>perry/i18n</code>-Format-Wrapper verdrahtet.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/189" className="text-amber-400 hover:text-amber-300">#189</a> / <a href="https://github.com/PerryTS/perry/issues/203" className="text-amber-400 hover:text-amber-300">#203</a></strong> — <code>perry/plugin</code>-Codegen-Dispatch.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/190" className="text-amber-400 hover:text-amber-300">#190</a></strong> — Canvas-Widget durch LLVM-Codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a></strong> — CameraView durch Codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/192" className="text-amber-400 hover:text-amber-300">#192</a></strong> — Table-Widget durch Codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/193" className="text-amber-400 hover:text-amber-300">#193</a></strong> (teilweise) — 11 Stdlib-Helper-Dispatch-Arms.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/98" className="text-amber-400 hover:text-amber-300">#98</a></strong> — Background-Receive-Notifications auf iOS + Android (Warm-Path).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/106" className="text-amber-400 hover:text-amber-300">#106</a></strong> — watchOS-Weak-Fallbacks für Game-Loop-FFI-Hooks.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/154" className="text-amber-400 hover:text-amber-300">#154</a></strong> — <code>using</code> / <code>await using</code>-Dispose-Hooks.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a></strong> — <code>js_native_call_method</code>-Args-Alloca in den Entry-Block gehoist.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a></strong> — <code>substitute_locals</code>-Uint8Array-Arms.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a></strong> — <code>fs.appendFileSync</code> Ende-zu-Ende verdrahtet (Community-PR).</li>
      </ul>

      <h2>6. Windows + Scoop</h2>
      <p>
        Die Windows-Toolchain-Story vereinfacht sich weiter. <strong>v0.5.353</strong> pinnte <code>clang -target</code> bei Host-Builds — Nicht-MSVC-clang im PATH (MinGW / MSYS2 / Anaconda / Rust-GNU-Bundles) schrieb Perrys <code>x86_64-pc-windows-msvc</code>-IR stillschweigend zu <code>windows-gnu</code> um, und lld-link konnte die <code>__main</code>-Referenz, die LLVMs mingw32-Emitter eingefügt hatte, nicht auflösen. Neuer <code>probe_clang_default_triple</code> ruft einmal pro Prozess <code>clang --version</code> auf und druckt einen einzigen Info-Hinweis, wenn der Host-Default GNU ist, wir aber MSVC targeten. Mit <code>PERRY_NO_CLANG_PROBE=1</code> unterdrücken.
      </p>
      <p>
        <strong>v0.5.345</strong> brachte das Win64-<code>perry-ui</code>-ABI mit <code>perry-dispatch</code> in Einklang — drei Runtime-Extern-Signaturen waren auseinandergedriftet (<code>perry_ui_navstack_create</code>, <code>perry_ui_menu_add_item_with_shortcut</code>, <code>perry_ui_app_set_timer</code>). Auf Win64-ABI teilen sich Integer- und Float-Positions-Args dieselben Slot-Indices, also liest ein Mismatch Müll aus uninitialisierten Registern. SysV (macOS / Linux) nutzt separate Int/Float-Register-Pools und landete zufällig valide Bits — Windows-only-Crash, gefixt über alle 8 perry-ui-*-Plattform-Crates.
      </p>
      <p>
        Dann: <strong><code>scoop install perry-ts/perry</code></strong>. Manifest gepinnt auf v0.5.345 (mit <code>depends: main/llvm</code>, um offizielles MSVC-Default-LLVM automatisch zu ziehen). Der Release-Workflow emittiert jetzt <code>&lt;artifact&gt;.sha256</code>-Sidecars neben jedem Archiv, im <code>sha256sum</code>-kompatiblen Format für jeden Downstream-Package-Manager-Bumper.
      </p>
      <pre><code>{`# Windows-Host
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\\main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Abschluss</h2>
      <p>
        Das Muster dieser Phase ist Community-Engagement plus interne Hygiene. <strong>TheHypnoo</strong> lieferte drei substanzielle PRs (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> perry/updater, <a href="https://github.com/PerryTS/perry/pull/231" className="text-amber-400 hover:text-amber-300">#231</a> <code>fs.appendFileSync</code>-Wiring, <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> <code>response.arrayBuffer</code>-Body-Bytes). Der Tracker leerte sich um etwa 30 Issues. Der Compiler wurde auf seiner größten Datei 60 % kleiner und bekam einen exhaustive Walker, der &bdquo;hab vergessen, einen von vier Ad-hoc-Walkern zu updaten&ldquo; von einem Runtime-Miscompile in einen <code>cargo build</code>-Error verwandelt. UI-Styling erreichte Parität über jede Desktop-Plattform außer Shadows auf Windows. Geisterhand bekam eine Browser-basierte Devtools-Oberfläche. Der Windows-Install-Pfad wurde einen Befehl kürzer.
      </p>
      <p>Probier&apos;s aus:</p>
      <pre><code>{`# npm (jede Plattform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Auto-Update für Desktop-Apps
npm install @perry/updater

# Live-Inspector
perry compile main.ts -o app --enable-geisterhand
./app &  # dann http://localhost:7676 öffnen`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
