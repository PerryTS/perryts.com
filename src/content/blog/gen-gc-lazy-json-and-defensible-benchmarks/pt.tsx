export default function Content() {
  return (
    <>
      <p>
        O &uacute;ltimo artigo fechou na <strong>v0.5.174</strong> com uma manchete: o Perry estava finalmente a vencer todos os benchmarks da suite in-tree contra o Node e o Bun. Tr&ecirc;s dias de trabalho e um backlog de commits de GC + JSON depois, o Perry est&aacute; na <strong>v0.5.306</strong> &mdash; isto s&atilde;o <strong>132 releases de patch</strong> &mdash; e a hist&oacute;ria &eacute; outra. A manchete n&atilde;o &eacute; um speedup de 547x ou uma nova coluna de vit&oacute;rias. &Eacute; o trabalho que torna essas vit&oacute;rias defens&aacute;veis.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>O <strong>GC geracional</strong> entrega-se como default. As Fases A at&eacute; D aterraram entre a v0.5.217 e a v0.5.237.</li>
        <li>A <strong>Small String Optimization</strong> entrega-se como default. Os passos 1.5 &rarr; 2 aterraram nas v0.5.213&ndash;v0.5.216.</li>
        <li>A <strong>pipeline de JSON</strong> ganhou um parser baseado em tape, parse lazy, stringify lazy, e materializa&ccedil;&atilde;o esparsa por elemento. O default de validate-and-roundtrip est&aacute; agora em <strong>75 ms de mediana</strong> &mdash; o melhor do grupo de typing din&acirc;mico.</li>
        <li>A <strong>p&aacute;gina de benchmarks</strong> foi reescrita de ponta a ponta com <strong>RUNS=11 mediana + p95 + &sigma; + min + max</strong>, simdjson e AssemblyScript+json-as adicionados como peers, sondas de otimiza&ccedil;&atilde;o separadas das compara&ccedil;&otilde;es reais, e cada fraqueza do Perry exposta com honestidade.</li>
      </ul>
      <p>
        O elenco de apoio &eacute; uma sequ&ecirc;ncia constante de corre&ccedil;&otilde;es de corre&ccedil;&atilde;o: FIFO de microtasks de Promise, igualdade de NaN e formata&ccedil;&atilde;o de n&uacute;meros do ECMAScript, complemento para dois de BigInt, AsyncLocalStorage de ponta a ponta, runtimes de decimal.js + ioredis + commander, e um segfault do JSON.stringify em f64 puro que estava escondido debaixo dos caminhos de tape. Mais a toolchain do Windows finalmente fica leve: LLVM + xwin, sem ser preciso instalar o Visual Studio.
      </p>

      <h2>1. GC geracional, ligado por default</h2>
      <p>
        O GC geracional foi um roll-out faseado durante dois meses. O resumo das fases que fecharam nesta janela:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.217&ndash;v0.5.221</strong> &mdash; Fase A: scaffolding de runtime de shadow-stack, emiss&atilde;o de push/pop, threading do slot-map, espelhamento de shadow para <code>Let</code>/<code>LocalSet</code>, e o root scanner.</li>
        <li><strong>v0.5.222</strong> &mdash; Fase B: divis&atilde;o de arena nursery + old-gen.</li>
        <li><strong>v0.5.223&ndash;v0.5.225</strong> &mdash; Fase C1&ndash;C2: infraestrutura de runtime do write-barrier, codegen emite a barreira, cada heap store passa por ela.</li>
        <li><strong>v0.5.226&ndash;v0.5.228</strong> &mdash; Fase C3a&ndash;C4: roots do remembered-set fluem para o mark + clear; trace de minor GC salta o old-gen; tenuring n&atilde;o-movente.</li>
        <li><strong>v0.5.229&ndash;v0.5.236</strong> &mdash; Fase C4b &alpha;/&beta;/&gamma;/&delta;: infraestrutura de forwarding-pointer, passe de pinning + evacua&ccedil;&atilde;o, scanner + pinning transitivo, reescrita de refer&ecirc;ncias, blocos de nursery ociosos devolvidos ao SO, trigger de GC limitado ao threshold inicial.</li>
        <li><strong>v0.5.237</strong> &mdash; Fase D parte 1: <code>PERRY_GEN_GC=1</code> por default.</li>
        <li><strong>v0.5.238</strong> &mdash; Fase D parte 2: <code>PERRY_SHADOW_STACK=1</code> por default.</li>
        <li><strong>v0.5.239&ndash;v0.5.240</strong> &mdash; docs de fecho: roadmap finalizado, ap&ecirc;ndice de linhagem acad&eacute;mica + industrial (Bartlett 1988, Ungar 1984, Cheney 1970).</li>
      </ul>
      <p>
        A vit&oacute;ria medida que mais importou: o <code>test_memory_json_churn</code> caiu de <strong>115 MB &rarr; 91 MB</strong> de pico de RSS no momento em que o gen-GC foi virado para default. As regress&otilde;es de compute foram pequenas e listadas sem desculpas &mdash; <code>nested_loops</code> 8 &rarr; 18 ms, <code>accumulate</code> 24 &rarr; 34 ms, <code>object_create</code> 0 &rarr; 1 ms, <code>array_read</code> / <code>array_write</code> +1 ms cada. A escotilha de fuga (<code>PERRY_GEN_GC=0</code>) recupera os n&uacute;meros antigos; o trade-off foi deliberado, e a p&aacute;gina de benchmarks lista agora ambas as linhas lado a lado para que o leitor possa escolher.
      </p>

      <h2>2. Small String Optimization, ligada por default</h2>
      <p>
        SSO &eacute; uma representa&ccedil;&atilde;o de string inline de 22 bytes que evita aloca&ccedil;&atilde;o de heap para strings curtas &mdash; chaves t&iacute;picas de JSON (2&ndash;8 bytes) e valores curtos aterram na forma inline. O roll-out foi pequeno &agrave; superf&iacute;cie e grande por baixo:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.213</strong>: infraestrutura de SSO (representa&ccedil;&atilde;o + acessores).</li>
        <li><strong>v0.5.214</strong>: bra&ccedil;os consumidores do Passo 1 + porta <code>PERRY_SSO_FORCE</code> para testes.</li>
        <li><strong>v0.5.215</strong>: codegen do Passo 1.5 com branch de tr&ecirc;s vias para <code>PropertyGet</code> &mdash; fast path para strings inline, fast path para strings em heap, slow path para o residual.</li>
        <li><strong>v0.5.216</strong>: viragem do Passo 2 &mdash; emite SSO por default.</li>
      </ul>
      <p>
        Os follow-ups na v0.5.279 fecharam o &uacute;ltimo bug de NaN em property-read que apareceu quando a SSO ficou quente, e a corre&ccedil;&atilde;o de dispatch de getter cross-module encadeado na v0.5.272 fechou outro. Ambos estavam na lista de pend&ecirc;ncias antes de o default ser virado; ambos entregaram-se sem regress&atilde;o de perf.
      </p>

      <h2>3. JSON: parse baseado em tape, lazy por default</h2>
      <p>
        A pipeline de JSON levou a reescrita mais invasiva do per&iacute;odo. Comportamento antigo: <code>JSON.parse</code> constru&iacute;a uma &aacute;rvore totalmente materializada de valores NaN-boxed. Comportamento novo: <code>JSON.parse</code> constr&oacute;i uma tape de 12 bytes por valor e materializa lazily &mdash; apenas os valores que realmente l&ecirc; pagam o custo de materializa&ccedil;&atilde;o. O stringify sobre um parse n&atilde;o-mutado &eacute; agora um memcpy do input original, o mesmo truque de fast-path que o simdjson usa com <code>raw_json()</code>.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.200</strong>: <code>JSON.parse&lt;T&gt;(blob)</code> parse dirigido por schema (Passo 1). Forma conhecida em tempo de compila&ccedil;&atilde;o permite ao compilador emitir acesso a chaves pr&eacute;-resolvido.</li>
        <li><strong>v0.5.203</strong>: funda&ccedil;&atilde;o do parse baseado em tape &mdash; Passo 2 Fase 1.</li>
        <li><strong>v0.5.204</strong>: parse lazy + stringify lazy &mdash; Passo 2 Fases 2+4.</li>
        <li><strong>v0.5.206</strong>: acesso indexado lazy-safe + edge cases &mdash; Passo 2 Fase 3.</li>
        <li><strong>v0.5.208</strong>: materializa&ccedil;&atilde;o esparsa por elemento &mdash; Passo 2 Fase 5b.</li>
        <li><strong>v0.5.209</strong>: cursor de walk + threshold adaptativo de materializa&ccedil;&atilde;o.</li>
        <li><strong>v0.5.210</strong>: vira o parse lazy para default em blobs &ge; 1 KB.</li>
      </ul>
      <p>
        O resultado no workload para o qual a tape lazy foi desenhada (10k registos, blob de ~1 MB, parse &rarr; stringify sem itera&ccedil;&atilde;o intermedi&aacute;ria):
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Implementa&ccedil;&atilde;o</th>
              <th className="text-right py-2 px-3">Mediana (ms)</th>
              <th className="text-right py-2 px-3">p95 (ms)</th>
              <th className="text-right py-2 px-3">&sigma;</th>
              <th className="text-right py-2 px-3">Pico de RSS</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">c++ <code>-O3 -flto</code> (simdjson)</td><td className="text-right py-2 px-3">24</td><td className="text-right py-2 px-3">28</td><td className="text-right py-2 px-3">1.2</td><td className="text-right py-2 px-3">8 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3 text-amber-400 font-semibold">perry (gen-gc + lazy tape)</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">75</td><td className="text-right py-2 px-3">91</td><td className="text-right py-2 px-3">6.9</td><td className="text-right py-2 px-3">85 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">rust serde_json (LTO)</td><td className="text-right py-2 px-3">185</td><td className="text-right py-2 px-3">190</td><td className="text-right py-2 px-3">1.7</td><td className="text-right py-2 px-3">11 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">bun</td><td className="text-right py-2 px-3">259</td><td className="text-right py-2 px-3">342</td><td className="text-right py-2 px-3">26.1</td><td className="text-right py-2 px-3">82 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">node</td><td className="text-right py-2 px-3">394</td><td className="text-right py-2 px-3">602</td><td className="text-right py-2 px-3">60.1</td><td className="text-right py-2 px-3">127 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">kotlin (kotlinx.serialization)</td><td className="text-right py-2 px-3">473</td><td className="text-right py-2 px-3">533</td><td className="text-right py-2 px-3">21.4</td><td className="text-right py-2 px-3">606 MB</td></tr>
            <tr><td className="py-2 px-3">assemblyscript+json-as (wasmtime)</td><td className="text-right py-2 px-3">598</td><td className="text-right py-2 px-3">621</td><td className="text-right py-2 px-3">10.5</td><td className="text-right py-2 px-3">58 MB</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        O Perry com <strong>75 ms de mediana</strong> &eacute; o runtime de typing din&acirc;mico mais r&aacute;pido da compara&ccedil;&atilde;o &mdash; vence o Bun (259 ms), vence o Node (394 ms), vence o JIT de servidor do Kotlin (453 ms). O simdjson com 24 ms &eacute; o teto C++ acelerado por SIMD e vive na p&aacute;gina de prop&oacute;sito, n&atilde;o escondido atr&aacute;s de um cherry-pick. O Perry n&atilde;o o vence. O ponto &eacute; mostrar a lacuna para que fech&aacute;-la tenha um alvo &mdash; rastreado em <code>docs/json-typed-parse-plan.md</code>.
      </p>
      <p>
        O bench companheiro honesto &eacute; o <strong>parse-and-iterate</strong>: mesmo blob, mas cada itera&ccedil;&atilde;o soma o <code>nested.x</code> de cada registo, o que for&ccedil;a a tape lazy a materializar. A&iacute; o Perry aterra em <strong>466 ms</strong> &mdash; mais lento do que os 375 ms da escotilha de fuga mark-sweep porque a tape paga overhead que n&atilde;o consegue amortizar. Essa linha est&aacute; no TL;DR &sect;B. Quando n&atilde;o se consegue evitar o trabalho, a tape lazy n&atilde;o finge o contr&aacute;rio.
      </p>

      <h2>4. A p&aacute;gina de benchmarks, reescrita</h2>
      <p>
        Tr&ecirc;s coisas mudaram na forma como o Perry apresenta n&uacute;meros de performance.
      </p>
      <p>
        <strong>RUNS=11 mediana + p95 + &sigma; + min + max, n&atilde;o best-of-N.</strong> Best-of-N descarta silenciosamente a lat&ecirc;ncia de cauda; neste hardware estava a esconder outliers de 9,4 segundos no <code>accumulate</code> de Python e picos de p95 de 5,3 segundos no JSON do Swift. A mediana p&otilde;e as caudas de volta na p&aacute;gina. A mudan&ccedil;a de metodologia aterrou na v0.5.248; cada c&eacute;lula no TL;DR &sect;A e &sect;B est&aacute; fresca em RUNS=11 com data de <strong>2026-04-25</strong>.
      </p>
      <p>
        <strong>Sondas de otimiza&ccedil;&atilde;o est&atilde;o separadas da perf de runtime real.</strong> As cinco c&eacute;lulas que mostram o Perry em 12&ndash;34 ms vs Rust/C++ em 98 ms &mdash; <code>loop_overhead</code>, <code>math_intensive</code>, <code>accumulate</code>, <code>array_read</code>, <code>array_write</code> &mdash; medem postura de flag do compilador, n&atilde;o sil&iacute;cio. Est&atilde;o agora na sua pr&oacute;pria subsec&ccedil;&atilde;o, com um par&aacute;grafo acima delas a explicar que <code>clang++ -O3 -ffast-math</code> as fecha at&eacute; um milissegundo. O kernel de runtime real da manchete &eacute; o <code>loop_data_dependent</code>: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 &mdash; o Perry senta-se mesmo no meio do grupo no-FMA-contract num kernel onde o compilador genuinamente n&atilde;o consegue dobrar o trabalho. Essa &eacute; a compara&ccedil;&atilde;o honesta.
      </p>
      <p>
        <strong>Peers adicionados.</strong> O simdjson (4.3.0) est&aacute; agora em ambas as tabelas de JSON &mdash; o teto de throughput de parse de C++, na p&aacute;gina para que o leitor possa ver a lacuna. O AssemblyScript com json-as (1.3.2) &eacute; o peer TS-to-native instal&aacute;vel mais pr&oacute;ximo; o porffor deu segfault no workload neste tamanho, o Static Hermes n&atilde;o instalava em macOS arm64. O Kotlin com kotlinx.serialization juntou-se ao polyglot de JSON nas v0.5.241&ndash;v0.5.242. Cada linha &eacute; real, cada disclaimer est&aacute; na p&aacute;gina.
      </p>

      <h2>5. A tabela polyglot de compute</h2>
      <p>
        Os kernels de manchete genuinamente n&atilde;o-dobr&aacute;veis, mediana RUNS=11, atualizados em 2026-04-25 na v0.5.249:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Rust</th>
              <th className="text-right py-2 px-3">C++</th>
              <th className="text-right py-2 px-3">Java</th>
              <th className="text-right py-2 px-3">Node</th>
              <th className="text-right py-2 px-3">Bun</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">318</td><td className="text-right py-2 px-3">330</td><td className="text-right py-2 px-3">315</td><td className="text-right py-2 px-3">282</td><td className="text-right py-2 px-3">1022</td><td className="text-right py-2 px-3">589</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_data_dependent</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">235</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">129</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">322</td><td className="text-right py-2 px-3">232</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">1</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">5</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">6</td></tr>
            <tr><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">18</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">18</td><td className="text-right py-2 px-3">21</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        No <code>fibonacci</code>, o Perry iguala o grupo compilado dentro de 3&ndash;15 ms. O JIT HotSpot do Java &eacute; ~11% mais r&aacute;pido por inlining a chamada recursiva. No <code>loop_data_dependent</code>, o kernel divide-se em dois clusters de FP-contract: o grupo FMA-contract a ~128 ms (Go default, <code>g++ -O3</code> no Apple Clang &mdash; ambos fundem <code>sum * a + b</code> num &uacute;nico FMADDD) e o grupo no-contract a 229&ndash;235 ms (Perry, Rust default, Swift, Java sem <code>-XX:+UseFMA</code>, Bun) a correr FMUL + FADD escalares. O LLVM iguala o grupo FMA com <code>-ffp-contract=fast</code>; o Perry n&atilde;o ativa isso por default. <code>nested_loops</code> &eacute; cache-bound, n&atilde;o compute-bound; toda a gente aterra em 8&ndash;21 ms.
      </p>

      <h2>6. Toolchain do Windows, leve</h2>
      <p>
        Os utilizadores de Windows j&aacute; n&atilde;o precisam de uma instala&ccedil;&atilde;o do Visual Studio. A <strong>v0.5.199</strong> fechou a <a href="https://github.com/PerryTS/perry/issues/176" className="text-amber-400 hover:text-amber-300">#176</a>: <code>perry setup windows</code> + winget LLVM + xwin substituem a &aacute;rvore inteira de VS BuildTools. A <code>v0.5.201</code> tirou a porta cfg de <code>find_lld_link</code> / <code>find_perry_windows_sdk</code> para que a descoberta de caminhos funcione em todas as plataformas que tenham como target o Windows, n&atilde;o apenas em hosts macOS.
      </p>
      <pre><code>{`# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Passe de corre&ccedil;&atilde;o de runtime</h2>
      <p>
        Um tema do per&iacute;odo: diverg&ecirc;ncias silenciosas de runtime em rela&ccedil;&atilde;o ao V8/JSC viraram-se ou em corre&ccedil;&otilde;es ou em erros de compila&ccedil;&atilde;o. As n&atilde;o-triviais:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.255</strong>: complemento para dois em <code>BigInt.fromTwos</code>/<code>toTwos</code>.</li>
        <li><strong>v0.5.263</strong>: discrimina&ccedil;&atilde;o de tipo n&atilde;o-promise em <code>Promise.all</code>/<code>race</code>/<code>any</code>.</li>
        <li><strong>v0.5.281</strong>: <code>NaN==NaN</code> + formata&ccedil;&atilde;o de n&uacute;meros do ECMAScript (<code>3 &rarr; &quot;3&quot;</code>, n&atilde;o <code>&quot;3.0&quot;</code>; <code>-0 &rarr; &quot;0&quot;</code>; etc.).</li>
        <li><strong>v0.5.280</strong>: coer&ccedil;&atilde;o de <code>NaN</code>/<code>Infinity</code> para ToInt32 em <code>(x) | 0</code>.</li>
        <li><strong>v0.5.284</strong>: FIFO de microtasks de Promise + propaga&ccedil;&atilde;o de handlers que lan&ccedil;am.</li>
        <li><strong>v0.5.286</strong>: <code>JSON.stringify</code> de um f64 puro dava segfault sob caminhos de tape.</li>
        <li><strong>v0.5.277</strong>: <code>fs.readFileSync</code> retorna Buffer quando n&atilde;o se passa encoding (corresponde ao Node).</li>
        <li><strong>v0.5.272</strong>: dispatch de getter cross-module encadeado retornava <code>undefined</code>.</li>
      </ul>
      <p>
        Os follow-ups de stdlib para a issue <a href="https://github.com/PerryTS/perry/issues/187" className="text-amber-400 hover:text-amber-300">#187</a> preencheram-se: AsyncLocalStorage de ponta a ponta (v0.5.261), runtime de commander + codegen a invocar realmente <code>.action()</code> (v0.5.250), c&oacute;digo de decimal.js (v0.5.259), ioredis para Redis de ponta a ponta (v0.5.270), padr&atilde;o de async-factory para pg + mongo (v0.5.275), e o mesmo bug de async-factory em EE/LRU/WSS (v0.5.252).
      </p>
      <p>
        Do lado do <code>perry/ui</code>: callback de tap em notifica&ccedil;&atilde;o (#97) ligado em ambos Apple (v0.5.254) e Android (v0.5.258); agendar + cancelar notifica&ccedil;&otilde;es locais (#96, v0.5.244); registo + receber FCM em Android (v0.5.262).
      </p>

      <h2>8. Fechando</h2>
      <p>
        O padr&atilde;o desta etapa n&atilde;o s&atilde;o n&uacute;meros de manchete. &Eacute; o trabalho que faz com que as vit&oacute;rias existentes sobrevivam ao escrut&iacute;nio: um GC geracional que apanha workloads de aloca&ccedil;&atilde;o sustentada, uma SSO que fecha a lacuna de custo das strings curtas, uma pipeline de JSON que explora a estrutura de &ldquo;sem modifica&ccedil;&atilde;o&rdquo; do workload mais comum, e uma p&aacute;gina de benchmarks que mede medianas em vez de best-of-N e mostra o teto de parse de 24 ms do simdjson na mesma linha que os 75 ms do Perry. O leitor pode ver a lacuna &mdash; e onde o Perry se senta em rela&ccedil;&atilde;o ao ch&atilde;o.
      </p>
      <p>
        Experimente:
      </p>
      <pre><code>{`# npm (qualquer plataforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — sem precisar de instalar VS)
winget install PerryTS.Perry

# Suite default de benchmarks
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh`}</code></pre>
      <p>
        C&oacute;digo-fonte: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; Benchmarks: <a href="https://github.com/PerryTS/perry/blob/main/benchmarks/README.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">benchmarks/README.md</a>
        {" "}&mdash; Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
