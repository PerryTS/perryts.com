export default function Content() {
  return (
    <>
      <p>
        El último post cerró en <strong>v0.5.306</strong> con la historia de gen-GC + JSON + benchmarks. Cuatro días después, Perry está en <strong>v0.5.359</strong> — son <strong>53 patch releases</strong> — y la historia es otra vez distinta. Ninguna de esas releases es un titular de números de benchmark. Casi todas son <strong>issues del tracker que se cierran</strong>.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry/updater</code></strong> ya está aquí — auto-actualización tipo Sparkle/Tauri para apps de escritorio (Ed25519 sobre un digest SHA-256, sentinel-rollback, relanzamiento desacoplado). PR de la comunidad por <strong>TheHypnoo</strong> (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a>).</li>
        <li><strong>Geisterhand Fase D</strong> — un inspector en vivo en <code>http://localhost:7676</code> con árbol de widgets, detalle por widget, dispatch de clicks y edición de estilo en vivo vía <code>POST /style/:h</code>.</li>
        <li><strong>El refactor del compilador.</strong> A lo largo de v0.5.329 → v0.5.343, los cuatro archivos más mencionados se trocearon: <code>lower::lower_expr</code> 6.687 → 624 LOC (−91 %), <code>compile.rs</code> 9.391 → 3.783 LOC (−60 %), <code>lower.rs</code> 13.591 → 7.554 LOC (−44 %), <code>lower_call.rs</code> 7.000+ → 4.681 LOC (−33 %). El nuevo <code>walker.rs</code> convierte la clase de bug del catch-all <code>_ =&gt; {}</code> en un error de compilación.</li>
        <li><strong>El styling UI Fase C cierra</strong> — props inline <code>style: {`{ ... }`}</code> en cada widget de Apple, Android, GTK4, Windows y Web. Windows recibe 4 de 5 stubs cableados (decoration / opacity / borders); solo queda <code>widget.shadow</code> (follow-up con DirectComposition).</li>
        <li><strong>Un bucket de Scoop</strong> para Windows: <code>scoop install perry-ts/perry</code>. Sidecars SHA-256 en el workflow de release.</li>
        <li><strong>Ola de fixes de issues de la comunidad</strong> — unas 30 issues cerradas en runtime, codegen, fetch, GTK4, linker de Windows, async y stdlib.</li>
      </ul>

      <h2>1. perry/updater — auto-actualización para apps de escritorio</h2>
      <p>
        Antes del fix, Perry no tenía ruta de actualización. Las apps se publicaban, y se publicaban, y eso era todo. <strong>TheHypnoo</strong> abrió <a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> con la historia completa:
      </p>
      <pre><code>{`import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // sentinel-rollback si el lanzamiento anterior crasheó

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(\`\${pct}%\`));
  await update.installAndRelaunch();
}

markHealthy(); // llamar después de que el nuevo build arranque correctamente`}</code></pre>
      <p>
        Modelo de confianza: <strong>Ed25519 sobre el digest SHA-256 del archivo</strong> (no sobre los bytes del archivo — mantiene la verificación barata en binarios grandes). El manifest es JSON, versionado por esquema, una entrada por triple <code>&lt;os&gt;-&lt;arch&gt;</code>. Instalación atómica con backup <code>&lt;exe&gt;.prev</code>, relanzamiento desacoplado (<code>setsid</code> en Unix, <code>DETACHED_PROCESS</code> en Windows). El móvil queda excluido por diseño — App Store / Play Store son los dueños del pipeline de instalación a nivel del SO.
      </p>
      <p>
        Dos peculiaridades del runtime de Perry afloraron al escribir el smoke test, y se arreglaron de paso:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>response.arrayBuffer()</code> devolvía un stub solo de metadatos.</strong> Arreglado en <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> (también TheHypnoo) — <code>js_response_array_buffer</code> ahora aloca un <code>BufferHeader</code> real y hace <code>memcpy</code> de <code>resp.body</code> dentro.</li>
        <li><strong><code>fs.appendFileSync</code> escribía 0 bytes.</strong> Arreglado en <a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a> — el camino de lowering del namespace-import (<code>import * as fs from &quot;fs&quot;</code>) no tenía rama para <code>appendFileSync</code>, y el codegen LLVM tampoco tenía rama para la variante HIR. Ambos cableados.</li>
      </ul>
      <p>
        La documentación vive en <code>docs/src/updater/overview.md</code>.
      </p>

      <h2>2. Geisterhand: inspector en vivo en localhost:7676</h2>
      <p>
        Geisterhand ha sido el harness de pruebas de UI in-process de Perry — una API HTTP en el puerto 7676 para snapshotear el estado de los widgets y disparar clicks. La Fase D lo convierte en un inspector estilo devtools que puedes abrir desde cualquier navegador.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Paso 1 (v0.5.349)</strong> — <code>GET /</code> sirve una UI vanilla-JS de una sola página con árbol de widgets, detalle por widget (frame, value, raw JSON), auto-refresh de 1,5 s con pausa/reanudar y un botón &ldquo;disparar onClick&rdquo;. El codegen ancla <code>INSPECTOR_HTML</code> contra el lazy-load <code>-dead_strip</code> de macOS para que sobreviva a los release builds.</li>
        <li><strong>Paso 2 (v0.5.350)</strong> — <code>POST /style/:h</code> toma una bolsa de props JSON y la aplica en vivo. 9 props (<code>backgroundColor</code>, <code>color</code>, <code>borderColor</code>, <code>borderWidth</code>, <code>borderRadius</code>, <code>opacity</code>, <code>padding</code>, <code>hidden</code>, <code>enabled</code>) fluyen del hilo HTTP → hilo principal vía la pump-queue existente. JSON inválido → 400; handle inválido → 400; props desconocidas se filtran en el servidor y la respuesta lista cuáles pasaron.</li>
      </ul>
      <pre><code>{`perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \\
  -H 'content-type: application/json' \\
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}`}</code></pre>
      <p>
        El dispatcher de macOS está cableado; Linux / Windows / iOS / tvOS / visionOS / Android siguen el mismo patrón y son los siguientes.
      </p>

      <h2>3. El refactor del compilador — partir los cuatro archivos más grandes</h2>
      <p>
        Cinco issues del tracker (<a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a>, <a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a>, <a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a>, <a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a>, más una cola larga) tenían la misma forma: se añadió una nueva variante de <code>Expr</code> a <code>ir.rs</code>, pero uno de los cuatro walkers ad-hoc en <code>lower.rs</code> tenía un catch-all <code>_ =&gt; {}</code> y compilaba mal la nueva variante en silencio. Atrapar esto en runtime es caro — a veces invisible, a veces un SIGSEGV bajo SSO.
      </p>
      <p>
        <strong>v0.5.329</strong> introdujo <code>crates/perry-hir/src/walker.rs</code> con <code>walk_expr_children</code> / <code>walk_expr_children_mut</code> — matches exhaustivos sobre las 178 variantes de <code>Expr</code>, <strong>sin catch-all</strong>. Añadir una nueva variante sin listarla aquí es ahora un error de compilación. Los cuatro consumidores (<code>substitute_locals</code>, <code>find_max_local_id::check_expr</code>, <code>collect_local_refs_expr</code>, <code>remap_local_ids_in_expr</code>) colapsaron:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Función</th>
              <th className="text-right py-2 px-3">Antes</th>
              <th className="text-right py-2 px-3">Después</th>
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
        Total: <strong>−1.830 líneas de descenso duplicado</strong>, reemplazadas por <strong>+1.840 líneas de un walker centralizado</strong> — neto plano, pero la clase de bug desaparece.
      </p>
      <p>
        Eso desbloqueó el resto. <strong>v0.5.331 → v0.5.343</strong> cortaron los cuatro monolitos en 14 commits. Las cifras de portada:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Archivo</th>
              <th className="text-right py-2 px-3">Antes</th>
              <th className="text-right py-2 px-3">Después</th>
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
        El split aterrizó como 19 nuevos sub-módulos enfocados: <code>compile/{`{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}`}.rs</code>, <code>lower/{`{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}`}.rs</code>, <code>lower_call/{`{ui_styling, builtin, native}`}.rs</code>, más una nueva crate <code>crates/perry-dispatch</code> que se convirtió en la única fuente de verdad para las tablas de métodos UI / system / i18n (el fan-out <code>_ =&gt; &quot;perry_ui_unknown&quot;</code> que provocaba las sorpresas &ldquo;compila en macOS, rompe en web&rdquo; del issue <a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a> es ahora un solo lookup).
      </p>
      <p>
        <strong>Wins de perf de Tier 4</strong> vinieron acompañando (v0.5.335–v0.5.336):
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Fusionados dos passes en <code>inline_functions</code> y tres rayon passes en <code>compile.rs</code> — ahorra 5 escaneos de módulo + 3 idas y vueltas del scheduler por compilación.</li>
        <li>Acotada la parse cache de <code>perry dev</code> a 500 entradas, eviction FIFO. Antes del fix, una sesión recorriendo <code>node_modules</code> podía retener más de 100 MB de AST de SWC.</li>
        <li>Paralelizado el bucle de escritura <code>.ll</code> post-codegen — 2–4× más rápido en wall-time en SSDs con más de 50 módulos.</li>
        <li><code>Arc&lt;I18nTable&gt;</code> en lugar de clonar la tabla de locales por worker.</li>
      </ul>
      <p>
        Los tests del workspace se mantuvieron en <strong>434 passed / 0 failed / 5 ignored</strong> en cada commit; gap tests en baseline 25/28; doc-tests en baseline 80/82.
      </p>

      <h2>4. UI styling Fase C, terminada</h2>
      <p>
        La Fase C era el rollout de <code>style: {`{ ... }`}</code> inline. Los pasos 1–7 cerraron en esta ventana:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.305 → v0.5.306</strong> — superficie de tipo <code>StyleProps</code> + <code>style:</code> inline en Button.</li>
        <li><strong>v0.5.307 → v0.5.309</strong> — destructure inline de color/padding/shadow en cada widget de tabla, luego VStack / HStack.</li>
        <li><strong>v0.5.310 → v0.5.311</strong> — strings hex + gradient + <code>parseColor</code> en runtime para valores dinámicos.</li>
        <li><strong>v0.5.312</strong> — docs de styling + issue de tracking de Windows.</li>
      </ul>
      <p>Luego el barrido cross-platform:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GTK4</strong> (<a href="https://github.com/PerryTS/perry/issues/202" className="text-amber-400 hover:text-amber-300">#202</a>, <a href="https://github.com/PerryTS/perry/issues/206" className="text-amber-400 hover:text-amber-300">#206</a>) — 4 FFIs de styling cableados, más 7 FFIs faltantes que bloqueaban la puerta de doc-tests de Linux (v0.5.322).</li>
        <li><strong>macOS</strong> (v0.5.324) — plumbing de sombra <code>CALayer</code> para <code>widget.shadow</code> + infraestructura de visual_test; sondeo de clase <code>set_color</code> para widgets que no son <code>NSTextField</code>.</li>
        <li><strong>iOS / tvOS / visionOS</strong> (v0.5.346) — Button con <code>color: ...</code> golpeaba <code>setTextColor:</code> en <code>UIButton</code>, que no implementa ese selector; el panic de <code>objc2</code> cruzaba un límite <code>extern &quot;C&quot;</code> y el proceso abortaba. Arreglado con el mismo patrón de sondeo de clase que macOS — UIButton ahora rutea por <code>setTitleColor:forState:UIControlStateNormal</code>.</li>
        <li><strong>Windows</strong> (v0.5.347) — 4 de 5 stubs de styling cableados (<code>text.decoration</code> vía round-trip <code>LOGFONT</code>, <code>widget.opacity</code> vía <code>WS_EX_LAYERED</code> + <code>SetLayeredWindowAttributes</code>, borders vía <code>SetWindowSubclass</code> + <code>WM_PAINT</code>). Solo queda <code>widget.shadow</code> (necesita DirectComposition).</li>
      </ul>
      <p>
        La matriz de styling en <code>docs/src/ui/styling-matrix.md</code> termina la ventana con <strong>Web en 43/43 Wired</strong>, <strong>Windows en 42/43 Wired</strong>, el resto en cobertura completa.
      </p>

      <h2>5. La pasada de corrección del runtime — issue por issue</h2>
      <p>
        Un tema del periodo: cada miscompile que entró por el tracker terminó como un fix o como un error en tiempo de compilación. Lo destacado:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a> (v0.5.323)</strong> — los métodos de clase dentro de <code>fn</code> no podían capturar locales de la fn envolvente. Los repros multi-módulo coinciden ahora con Node byte por byte.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a> (v0.5.321 + v0.5.330)</strong> — unboxing de string-handle SSO-safe en 7 sitios con operandos string: <code>arr.join</code>, <code>arr.toString</code>, <code>obj[stringKey]</code> get/set/delete, <code>string.match(re)</code>, <code>process.env[dynKey]</code>, input de digest crypto. Antes del fix, cada uno o devolvía basura en silencio o hacía SIGSEGV con operandos de string inline.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/221" className="text-amber-400 hover:text-amber-300">#221</a> (v0.5.351)</strong> — los arrays vacíos <code>const</code> a nivel de módulo perdían las escrituras <code>arr[i]=</code> desde dentro de funciones. Apareció cuando <code>discoverLevels()</code> de Bloom-Engine/jump rellenaba <code>LEVEL_FILES</code> a nivel de módulo vía index-assign y la pantalla de selección de nivel salía vacía.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/233" className="text-amber-400 hover:text-amber-300">#233</a> (v0.5.357)</strong> — <code>Array.push</code> desde dentro de una función async se topaba con un cap silencioso de 16 elementos cuando el array entraba como parámetro. Las funciones async no se inlinean; la realocación devolvía un nuevo puntero que el llamador nunca veía. Fix: instalar un puntero de forwarding en la posición vieja en cada crecimiento, reutilizando el mecanismo <code>GC_FLAG_FORWARDED</code> existente del GC.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/235" className="text-amber-400 hover:text-amber-300">#235</a> (v0.5.358)</strong> — el dispatch con default params de método pasaba basura cuando los llamadores omitían args al final. Dos partes contribuyentes: los declares de método cross-module hardcodeaban 6 doubles en lugar de <code>arity + 1</code>, y <code>lower_class_method</code> no llamaba a <code>build_default_param_stmts</code> en absoluto. Apareció en <code>findOne(filter, options = {`{}`})</code> de mongodb colgando en silencio; el fix es uniforme entre dispatch local y cross-module.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/236" className="text-amber-400 hover:text-amber-300">#236</a> (v0.5.355)</strong> — tres bugs independientes de fetch + promise desde un solo repro: api.github.com daba 403 anónimo (User-Agent por defecto ahora establecido), <code>.then(console.log)</code> colgaba para siempre (los callbacks null no empujaban entradas a la TASK_QUEUE), cada rechazo de fetch imprimía <code>Uncaught exception: [object Object]</code> (<code>*StringHeader</code> NaN-boxeado pelado en lugar de un <code>ErrorHeader</code> real).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/234" className="text-amber-400 hover:text-amber-300">#234</a> (v0.5.359)</strong> — <code>Blob</code> real con métodos de instancia <code>arrayBuffer</code> / <code>text</code> / <code>bytes</code> / <code>slice</code>. Antes del fix, <code>await response.blob()</code> devolvía un stub solo de metadatos <code>{`{size, type}`}</code>. Fix de tres partes que aterrizó en runtime + HIR + codegen.</li>
      </ul>
      <p>Más los retrasos pequeños:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/181" className="text-amber-400 hover:text-amber-300">#181</a></strong> — strip-dedup poda excesiva de monomorfizaciones genéricas en Linux + silent-fallback de link de GTK4. Fix: reemplazar el filtrado por patrón de nombre con comparación de <strong>conjunto de símbolos</strong> vía <code>llvm-nm</code>. Los miembros con incluso un solo símbolo único se quedan. <code>libperry_ui_macos.a</code> recortado de 196 → 35 objetos sin errores de link.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/220" className="text-amber-400 hover:text-amber-300">#220</a></strong> — <code>secur32.lib</code> añadido a la línea de link de Windows.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/198" className="text-amber-400 hover:text-amber-300">#198</a></strong> — i18n <code>FormatNumber</code> round-trip de FP vía Ryū.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/188" className="text-amber-400 hover:text-amber-300">#188</a></strong> — codegen dispatch cableado para los wrappers de formato de <code>perry/i18n</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/189" className="text-amber-400 hover:text-amber-300">#189</a> / <a href="https://github.com/PerryTS/perry/issues/203" className="text-amber-400 hover:text-amber-300">#203</a></strong> — codegen dispatch de <code>perry/plugin</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/190" className="text-amber-400 hover:text-amber-300">#190</a></strong> — widget Canvas a través del codegen LLVM.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a></strong> — CameraView a través del codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/192" className="text-amber-400 hover:text-amber-300">#192</a></strong> — widget Table a través del codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/193" className="text-amber-400 hover:text-amber-300">#193</a></strong> (parcial) — 11 ramas de dispatch de helpers de stdlib.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/98" className="text-amber-400 hover:text-amber-300">#98</a></strong> — recepción en background de notificaciones en iOS + Android (warm-path).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/106" className="text-amber-400 hover:text-amber-300">#106</a></strong> — fallbacks débiles para hooks de FFI de game-loop en watchOS.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/154" className="text-amber-400 hover:text-amber-300">#154</a></strong> — hooks de dispose de <code>using</code> / <code>await using</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a></strong> — alloca de args de <code>js_native_call_method</code> elevada al bloque de entrada.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a></strong> — ramas de Uint8Array de <code>substitute_locals</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a></strong> — <code>fs.appendFileSync</code> cableado de extremo a extremo (PR de la comunidad).</li>
      </ul>

      <h2>6. Windows + Scoop</h2>
      <p>
        La historia de la toolchain de Windows sigue simplificándose. <strong>v0.5.353</strong> ancló <code>clang -target</code> en builds de host — clang no-MSVC en el PATH (MinGW / MSYS2 / Anaconda / bundles GNU de Rust) reescribía silenciosamente la IR <code>x86_64-pc-windows-msvc</code> de Perry a <code>windows-gnu</code>, y lld-link no podía resolver la referencia <code>__main</code> que el emisor mingw32 de LLVM insertaba. El nuevo <code>probe_clang_default_triple</code> ejecuta <code>clang --version</code> una vez por proceso e imprime una sola nota informativa cuando el default del host es GNU pero estamos targeteando MSVC. Suprimir con <code>PERRY_NO_CLANG_PROBE=1</code>.
      </p>
      <p>
        <strong>v0.5.345</strong> alineó la ABI de <code>perry-ui</code> en Win64 con <code>perry-dispatch</code> — tres firmas extern de runtime habían divergido (<code>perry_ui_navstack_create</code>, <code>perry_ui_menu_add_item_with_shortcut</code>, <code>perry_ui_app_set_timer</code>). En la ABI de Win64, los args posicionales de entero y float comparten índices de slot, así que un mismatch lee basura de registros no inicializados. SysV (macOS / Linux) usa pools separados de registros int/float y por casualidad caían bits válidos — crash solo en Windows, arreglado en las 8 crates de plataforma perry-ui-*.
      </p>
      <p>
        Luego: <strong><code>scoop install perry-ts/perry</code></strong>. Manifest fijado a v0.5.345 (con <code>depends: main/llvm</code> para auto-tirar el LLVM oficial con default MSVC). El workflow de release ahora emite sidecars <code>&lt;artifact&gt;.sha256</code> al lado de cada archivo, en formato compatible con <code>sha256sum</code> para cualquier bumper de package manager downstream.
      </p>
      <pre><code>{`# Host Windows
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\\main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Cierre</h2>
      <p>
        El patrón de este tramo es engagement de la comunidad más higiene interna. <strong>TheHypnoo</strong> entregó tres PRs significativos (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> perry/updater, <a href="https://github.com/PerryTS/perry/pull/231" className="text-amber-400 hover:text-amber-300">#231</a> cableado de <code>fs.appendFileSync</code>, <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> bytes de body en <code>response.arrayBuffer</code>). El tracker se vació de unas 30 issues. El compilador se quedó 60 % más pequeño en su archivo más grande y le creció un walker exhaustivo que convierte &ldquo;olvidé actualizar uno de los cuatro walkers ad-hoc&rdquo; de un miscompile en runtime a un error de <code>cargo build</code>. El UI styling alcanzó paridad en cada plataforma de escritorio salvo sombras en Windows. Geisterhand creció una superficie devtools en navegador. La ruta de instalación de Windows se acortó un comando.
      </p>
      <p>Pruébalo:</p>
      <pre><code>{`# npm (cualquier plataforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Auto-actualización para apps de escritorio
npm install @perry/updater

# Inspector en vivo
perry compile main.ts -o app --enable-geisterhand
./app &  # luego abre http://localhost:7676`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
