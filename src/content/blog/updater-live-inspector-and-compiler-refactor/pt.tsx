export default function Content() {
  return (
    <>
      <p>
        O último post fechou em <strong>v0.5.306</strong> com a história gen-GC + JSON + benchmarks. Quatro dias depois, Perry está em <strong>v0.5.359</strong> — são <strong>53 patch releases</strong> — e a história é outra de novo. Nenhuma dessas releases é uma manchete de números de benchmark. Quase todas são <strong>issues do tracker sendo fechadas</strong>.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry/updater</code></strong> chega — auto-update no estilo Sparkle/Tauri para apps desktop (Ed25519 sobre um digest SHA-256, sentinel-rollback, relançamento desacoplado). PR da comunidade por <strong>TheHypnoo</strong> (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a>).</li>
        <li><strong>Geisterhand Fase D</strong> — um inspector ao vivo em <code>http://localhost:7676</code> com árvore de widgets, detalhe por widget, dispatch de cliques e edição de estilo ao vivo via <code>POST /style/:h</code>.</li>
        <li><strong>O refactor do compilador.</strong> Entre v0.5.329 → v0.5.343 os quatro arquivos mais citados foram fatiados: <code>lower::lower_expr</code> 6.687 → 624 LOC (−91%), <code>compile.rs</code> 9.391 → 3.783 LOC (−60%), <code>lower.rs</code> 13.591 → 7.554 LOC (−44%), <code>lower_call.rs</code> 7.000+ → 4.681 LOC (−33%). O novo <code>walker.rs</code> transforma a classe de bug do catch-all <code>_ =&gt; {}</code> em erro de compilação.</li>
        <li><strong>O styling UI Fase C fecha</strong> — props inline <code>style: {`{ ... }`}</code> em todo widget no Apple, Android, GTK4, Windows e Web. Windows ganha 4 de 5 stubs ligados (decoration / opacity / borders); só falta <code>widget.shadow</code> (follow-up com DirectComposition).</li>
        <li><strong>Um bucket Scoop</strong> para Windows: <code>scoop install perry-ts/perry</code>. Sidecars SHA-256 no workflow de release.</li>
        <li><strong>Onda de fixes de issues da comunidade</strong> — cerca de 30 issues fechadas em runtime, codegen, fetch, GTK4, linker do Windows, async e stdlib.</li>
      </ul>

      <h2>1. perry/updater — auto-update para apps desktop</h2>
      <p>
        Antes do fix, Perry não tinha caminho de update. Apps eram lançadas, e pronto. <strong>TheHypnoo</strong> abriu <a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> com a história completa:
      </p>
      <pre><code>{`import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // sentinel-rollback se o lançamento anterior crashou

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(\`\${pct}%\`));
  await update.installAndRelaunch();
}

markHealthy(); // chamar depois de a nova build subir corretamente`}</code></pre>
      <p>
        Modelo de confiança: <strong>Ed25519 sobre o digest SHA-256 do arquivo</strong> (não sobre os bytes do arquivo — mantém a verificação barata em binários grandes). O manifest é JSON, versionado por esquema, uma entrada por tripla <code>&lt;os&gt;-&lt;arch&gt;</code>. Instalação atômica com backup <code>&lt;exe&gt;.prev</code>, relançamento desacoplado (<code>setsid</code> em Unix, <code>DETACHED_PROCESS</code> no Windows). Mobile fica de fora por design — App Store / Play Store controlam o pipeline de instalação no nível do SO.
      </p>
      <p>
        Duas peculiaridades do runtime de Perry apareceram ao escrever o smoke test, e foram corrigidas no caminho:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>response.arrayBuffer()</code> retornava um stub só com metadata.</strong> Corrigido em <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> (também TheHypnoo) — <code>js_response_array_buffer</code> agora aloca um <code>BufferHeader</code> real e faz <code>memcpy</code> de <code>resp.body</code> dentro.</li>
        <li><strong><code>fs.appendFileSync</code> escrevia 0 bytes.</strong> Corrigido em <a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a> — o caminho de lowering do namespace-import (<code>import * as fs from &quot;fs&quot;</code>) não tinha braço para <code>appendFileSync</code>, e o codegen LLVM também não tinha braço para a variante HIR. Ambos ligados.</li>
      </ul>
      <p>
        A documentação vive em <code>docs/src/updater/overview.md</code>.
      </p>

      <h2>2. Geisterhand: inspector ao vivo em localhost:7676</h2>
      <p>
        Geisterhand era o harness de testes de UI in-process do Perry — uma API HTTP na porta 7676 para snapshotear estado de widget e dispatchar cliques. A Fase D o transforma em um inspector estilo devtools que dá para abrir em qualquer navegador.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Passo 1 (v0.5.349)</strong> — <code>GET /</code> serve uma UI vanilla-JS de página única com árvore de widgets, detalhe por widget (frame, value, raw JSON), auto-refresh de 1,5 s com pause/resume, e um botão &laquo;disparar onClick&raquo;. O codegen prende <code>INSPECTOR_HTML</code> contra o lazy-load <code>-dead_strip</code> do macOS para sobreviver às release builds.</li>
        <li><strong>Passo 2 (v0.5.350)</strong> — <code>POST /style/:h</code> recebe um saco de props JSON e aplica ao vivo. 9 props (<code>backgroundColor</code>, <code>color</code>, <code>borderColor</code>, <code>borderWidth</code>, <code>borderRadius</code>, <code>opacity</code>, <code>padding</code>, <code>hidden</code>, <code>enabled</code>) fluem da thread HTTP → thread principal via a pump-queue existente. JSON ruim → 400; handle ruim → 400; props desconhecidas são filtradas no servidor e a response lista quais passaram.</li>
      </ul>
      <pre><code>{`perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \\
  -H 'content-type: application/json' \\
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}`}</code></pre>
      <p>
        O dispatcher do macOS está ligado; Linux / Windows / iOS / tvOS / visionOS / Android seguem o mesmo formato e são os próximos.
      </p>

      <h2>3. O refactor do compilador — fatiando os quatro maiores arquivos</h2>
      <p>
        Cinco issues no tracker (<a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a>, <a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a>, <a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a>, <a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a>, mais uma cauda longa) tinham a mesma forma: uma nova variante de <code>Expr</code> adicionada a <code>ir.rs</code>, mas um dos quatro walkers ad-hoc em <code>lower.rs</code> tinha um catch-all <code>_ =&gt; {}</code> e mis-compilava silenciosamente a nova variante. Pegar isso em runtime é caro — às vezes invisível, às vezes um SIGSEGV sob SSO.
      </p>
      <p>
        <strong>v0.5.329</strong> introduziu <code>crates/perry-hir/src/walker.rs</code> com <code>walk_expr_children</code> / <code>walk_expr_children_mut</code> — matches exaustivos sobre todas as 178 variantes de <code>Expr</code>, <strong>sem catch-all</strong>. Adicionar uma nova variante sem listá-la aqui é agora um erro de compilação. Os quatro consumidores (<code>substitute_locals</code>, <code>find_max_local_id::check_expr</code>, <code>collect_local_refs_expr</code>, <code>remap_local_ids_in_expr</code>) colapsaram:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Função</th>
              <th className="text-right py-2 px-3">Antes</th>
              <th className="text-right py-2 px-3">Depois</th>
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
        Total: <strong>−1.830 linhas de descent duplicado</strong>, substituídas por <strong>+1.840 linhas de um walker centralizado</strong> — saldo zero, mas a classe de bug se foi.
      </p>
      <p>
        Isso destravou o resto. <strong>v0.5.331 → v0.5.343</strong> partiram os quatro monólitos em 14 commits. Os números de capa:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Arquivo</th>
              <th className="text-right py-2 px-3">Antes</th>
              <th className="text-right py-2 px-3">Depois</th>
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
        O split aterrissou como 19 novos sub-módulos focados: <code>compile/{`{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}`}.rs</code>, <code>lower/{`{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}`}.rs</code>, <code>lower_call/{`{ui_styling, builtin, native}`}.rs</code>, mais um novo crate <code>crates/perry-dispatch</code> que virou a única fonte de verdade para tabelas de método UI / system / i18n (o fan-out <code>_ =&gt; &quot;perry_ui_unknown&quot;</code> que levava às surpresas &laquo;compila no macOS, quebra na web&raquo; do issue <a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a> agora é um único lookup).
      </p>
      <p>
        <strong>Ganhos de perf de Tier 4</strong> vieram juntos (v0.5.335–v0.5.336):
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Fundidos dois passes em <code>inline_functions</code> e três passes rayon em <code>compile.rs</code> — economiza 5 scans de módulo + 3 round-trips do scheduler por compilação.</li>
        <li>Limitado o parse cache do <code>perry dev</code> a 500 entradas, eviction FIFO. Antes do fix, uma sessão andando por <code>node_modules</code> podia segurar mais de 100 MB de AST do SWC.</li>
        <li>Paralelizado o loop de escrita <code>.ll</code> pós-codegen — wall-time 2–4× mais rápido em SSDs com 50+ módulos.</li>
        <li><code>Arc&lt;I18nTable&gt;</code> em vez de clonar a tabela de locales por worker.</li>
      </ul>
      <p>
        Os testes do workspace ficaram em <strong>434 passed / 0 failed / 5 ignored</strong> em todo commit; gap tests na baseline 25/28; doc-tests na baseline 80/82.
      </p>

      <h2>4. UI styling Fase C, encerrada</h2>
      <p>
        A Fase C era o rollout de <code>style: {`{ ... }`}</code> inline. Os passos 1–7 fecharam nesta janela:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.305 → v0.5.306</strong> — superfície de tipo <code>StyleProps</code> + <code>style:</code> inline em Button.</li>
        <li><strong>v0.5.307 → v0.5.309</strong> — destructure inline color/padding/shadow em todo widget de tabela, depois VStack / HStack.</li>
        <li><strong>v0.5.310 → v0.5.311</strong> — strings hex + gradient + <code>parseColor</code> em runtime para valores dinâmicos.</li>
        <li><strong>v0.5.312</strong> — docs de styling + issue de tracking do Windows.</li>
      </ul>
      <p>Depois a varredura cross-platform:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GTK4</strong> (<a href="https://github.com/PerryTS/perry/issues/202" className="text-amber-400 hover:text-amber-300">#202</a>, <a href="https://github.com/PerryTS/perry/issues/206" className="text-amber-400 hover:text-amber-300">#206</a>) — 4 FFIs de styling ligados, mais 7 FFIs faltantes que travavam o gate dos doc-tests do Linux (v0.5.322).</li>
        <li><strong>macOS</strong> (v0.5.324) — encanamento de sombra <code>CALayer</code> para <code>widget.shadow</code> + infraestrutura de visual_test; class-probe de <code>set_color</code> para widgets que não são <code>NSTextField</code>.</li>
        <li><strong>iOS / tvOS / visionOS</strong> (v0.5.346) — Button com <code>color: ...</code> batia em <code>setTextColor:</code> em <code>UIButton</code>, que não implementa esse seletor; o panic do <code>objc2</code> cruzava uma fronteira <code>extern &quot;C&quot;</code> e o processo abortava. Corrigido com o mesmo padrão de class-probe do macOS — UIButton agora vai por <code>setTitleColor:forState:UIControlStateNormal</code>.</li>
        <li><strong>Windows</strong> (v0.5.347) — 4 de 5 stubs de styling ligados (<code>text.decoration</code> via round-trip <code>LOGFONT</code>, <code>widget.opacity</code> via <code>WS_EX_LAYERED</code> + <code>SetLayeredWindowAttributes</code>, borders via <code>SetWindowSubclass</code> + <code>WM_PAINT</code>). Só falta <code>widget.shadow</code> (precisa de DirectComposition).</li>
      </ul>
      <p>
        A matriz de styling em <code>docs/src/ui/styling-matrix.md</code> termina a janela com <strong>Web em 43/43 Wired</strong>, <strong>Windows em 42/43 Wired</strong>, o resto em cobertura completa.
      </p>

      <h2>5. A passada de correção do runtime — issue por issue</h2>
      <p>
        Um tema do período: cada miscompile que entrou pelo tracker virou ou um fix ou um erro de compilação. Destaques:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a> (v0.5.323)</strong> — métodos de classe dentro de <code>fn</code> não conseguiam capturar locais da fn que envolvia. Repros multi-módulo agora batem com Node byte por byte.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a> (v0.5.321 + v0.5.330)</strong> — unboxing de string-handle SSO-safe em 7 sites com operandos string: <code>arr.join</code>, <code>arr.toString</code>, <code>obj[stringKey]</code> get/set/delete, <code>string.match(re)</code>, <code>process.env[dynKey]</code>, input de digest crypto. Antes do fix, cada um ou retornava lixo silenciosamente ou dava SIGSEGV em operandos string inline.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/221" className="text-amber-400 hover:text-amber-300">#221</a> (v0.5.351)</strong> — arrays vazios <code>const</code> em nível de módulo perdiam as escritas <code>arr[i]=</code> de dentro de funções. Apareceu quando <code>discoverLevels()</code> de Bloom-Engine/jump populava <code>LEVEL_FILES</code> em nível de módulo via index-assign e a tela de seleção de fase saía vazia.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/233" className="text-amber-400 hover:text-amber-300">#233</a> (v0.5.357)</strong> — <code>Array.push</code> de dentro de função async era silenciosamente limitado a 16 elementos quando o array entrava como parâmetro. Funções async não são inlined; a realocação retornava um novo ponteiro que o chamador nunca via. Fix: instalar um ponteiro de forwarding na posição antiga a cada crescimento, reusando o mecanismo <code>GC_FLAG_FORWARDED</code> existente do GC.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/235" className="text-amber-400 hover:text-amber-300">#235</a> (v0.5.358)</strong> — o dispatch de parâmetros default de método passava lixo quando os chamadores omitiam args do final. Duas partes contribuintes: declares de método cross-module hardcodavam 6 doubles em vez de <code>arity + 1</code>, e <code>lower_class_method</code> não chamava <code>build_default_param_stmts</code>. Apareceu em <code>findOne(filter, options = {`{}`})</code> de mongodb travando em silêncio; o fix é uniforme entre dispatch local e cross-module.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/236" className="text-amber-400 hover:text-amber-300">#236</a> (v0.5.355)</strong> — três bugs independentes de fetch + promise vindos de um único repro: api.github.com retornava 403 anônimo (User-Agent default agora setado), <code>.then(console.log)</code> travava para sempre (callbacks null não empurravam entradas para a TASK_QUEUE), todo rejeito de fetch imprimia <code>Uncaught exception: [object Object]</code> (<code>*StringHeader</code> nu NaN-boxado em vez de um <code>ErrorHeader</code> real).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/234" className="text-amber-400 hover:text-amber-300">#234</a> (v0.5.359)</strong> — <code>Blob</code> real com métodos de instância <code>arrayBuffer</code> / <code>text</code> / <code>bytes</code> / <code>slice</code>. Antes do fix, <code>await response.blob()</code> retornava um stub só com metadata <code>{`{size, type}`}</code>. Fix em três partes aterrissou em runtime + HIR + codegen.</li>
      </ul>
      <p>Mais os pequenos atrasos:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/181" className="text-amber-400 hover:text-amber-300">#181</a></strong> — strip-dedup podava em excesso monomorfizações genéricas no Linux + silent-fallback do link do GTK4. Fix: substituir filtragem por padrão de nome por comparação de <strong>conjunto de símbolos</strong> via <code>llvm-nm</code>. Membros com mesmo um único símbolo único são mantidos. <code>libperry_ui_macos.a</code> reduzido de 196 → 35 objetos sem erros de link.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/220" className="text-amber-400 hover:text-amber-300">#220</a></strong> — <code>secur32.lib</code> adicionado à linha de link do Windows.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/198" className="text-amber-400 hover:text-amber-300">#198</a></strong> — i18n <code>FormatNumber</code> round-trip de FP via Ryū.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/188" className="text-amber-400 hover:text-amber-300">#188</a></strong> — codegen dispatch ligado para os wrappers de format de <code>perry/i18n</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/189" className="text-amber-400 hover:text-amber-300">#189</a> / <a href="https://github.com/PerryTS/perry/issues/203" className="text-amber-400 hover:text-amber-300">#203</a></strong> — codegen dispatch de <code>perry/plugin</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/190" className="text-amber-400 hover:text-amber-300">#190</a></strong> — widget Canvas pelo codegen LLVM.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a></strong> — CameraView pelo codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/192" className="text-amber-400 hover:text-amber-300">#192</a></strong> — widget Table pelo codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/193" className="text-amber-400 hover:text-amber-300">#193</a></strong> (parcial) — 11 braços de dispatch de helpers da stdlib.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/98" className="text-amber-400 hover:text-amber-300">#98</a></strong> — recebimento em background de notificações no iOS + Android (warm-path).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/106" className="text-amber-400 hover:text-amber-300">#106</a></strong> — fallbacks fracos para hooks de FFI de game-loop no watchOS.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/154" className="text-amber-400 hover:text-amber-300">#154</a></strong> — hooks de dispose de <code>using</code> / <code>await using</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a></strong> — alloca de args de <code>js_native_call_method</code> içada para o bloco de entry.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a></strong> — braços Uint8Array de <code>substitute_locals</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a></strong> — <code>fs.appendFileSync</code> ligado de ponta a ponta (PR da comunidade).</li>
      </ul>

      <h2>6. Windows + Scoop</h2>
      <p>
        A história da toolchain do Windows continua a se simplificar. <strong>v0.5.353</strong> prendeu <code>clang -target</code> em builds de host — clang não-MSVC no PATH (MinGW / MSYS2 / Anaconda / bundles GNU do Rust) reescrevia silenciosamente a IR <code>x86_64-pc-windows-msvc</code> de Perry para <code>windows-gnu</code>, e lld-link não conseguia resolver a referência <code>__main</code> que o emissor mingw32 do LLVM inseria. O novo <code>probe_clang_default_triple</code> roda <code>clang --version</code> uma vez por processo e imprime uma única nota informativa quando o default do host é GNU mas estamos targetando MSVC. Suprimir com <code>PERRY_NO_CLANG_PROBE=1</code>.
      </p>
      <p>
        <strong>v0.5.345</strong> alinhou a ABI <code>perry-ui</code> Win64 com <code>perry-dispatch</code> — três assinaturas extern de runtime tinham deslizado (<code>perry_ui_navstack_create</code>, <code>perry_ui_menu_add_item_with_shortcut</code>, <code>perry_ui_app_set_timer</code>). Na ABI Win64, args posicionais inteiros e float compartilham os índices de slot, então um mismatch lê lixo de registradores não inicializados. SysV (macOS / Linux) usa pools de registradores int/float separados e por sorte caía bits válidos — crash apenas no Windows, corrigido em todas as 8 crates de plataforma perry-ui-*.
      </p>
      <p>
        Depois: <strong><code>scoop install perry-ts/perry</code></strong>. Manifest fixado em v0.5.345 (com <code>depends: main/llvm</code> para puxar automaticamente o LLVM oficial default-MSVC). O workflow de release agora emite sidecars <code>&lt;artifact&gt;.sha256</code> ao lado de cada arquivo, em formato compatível com <code>sha256sum</code> para qualquer bumper de package manager downstream.
      </p>
      <pre><code>{`# Host Windows
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\\main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Encerrando</h2>
      <p>
        O padrão deste trecho é engajamento da comunidade mais higiene interna. <strong>TheHypnoo</strong> entregou três PRs significativos (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> perry/updater, <a href="https://github.com/PerryTS/perry/pull/231" className="text-amber-400 hover:text-amber-300">#231</a> ligação de <code>fs.appendFileSync</code>, <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> bytes do body em <code>response.arrayBuffer</code>). O tracker esvaziou cerca de 30 issues. O compilador ficou 60% menor no maior arquivo e ganhou um walker exaustivo que transforma &laquo;esqueci de atualizar um dos quatro walkers ad-hoc&raquo; de um miscompile em runtime para um erro <code>cargo build</code>. O styling UI alcançou paridade em toda plataforma desktop exceto sombras no Windows. Geisterhand ganhou uma superfície devtools em navegador. O caminho de instalação no Windows ficou um comando mais curto.
      </p>
      <p>Experimente:</p>
      <pre><code>{`# npm (qualquer plataforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Auto-update para apps desktop
npm install @perry/updater

# Inspector ao vivo
perry compile main.ts -o app --enable-geisterhand
./app &  # então abra http://localhost:7676`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
