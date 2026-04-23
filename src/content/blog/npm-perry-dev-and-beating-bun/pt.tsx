export default function Content() {
  return (
    <>
      <p>
        O &uacute;ltimo artigo fechou com o Perry na v0.5.80 e uma derrota teimosa na tabela de benchmarks: o roundtrip de <code>JSON.parse</code>/<code>stringify</code> ainda era 1,6x mais lento que o Node. Seis dias depois, o Perry est&aacute; na <strong>v0.5.174</strong> &mdash; isto s&atilde;o <strong>94 releases de patch</strong> &mdash; e tr&ecirc;s coisas mudaram que merecem ser destacadas antes de mais nada:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code>@perryts/perry</code> est&aacute; no <strong>npm</strong>. Um comando instala o Perry em qualquer plataforma suportada.</li>
        <li><strong><code>perry dev</code></strong> adiciona auto-recompila&ccedil;&atilde;o em modo watch, al&eacute;m de uma nova cache de AST em mem&oacute;ria e uma cache de objetos por m&oacute;dulo em disco.</li>
        <li>A derrota no <code>json_roundtrip</code> foi fechada. O Perry agora <strong>vence o Node e o Bun em todos os benchmarks</strong> da suite principal (15/15 contra ambos).</li>
      </ul>
      <p>
        O resto do artigo &eacute; o elenco de apoio: corre&ccedil;&otilde;es no WebAssembly, watchOS finalmente a compilar de ponta a ponta, primitivas <code>perry/thread</code> ligadas at&eacute; ao fim, e um lote de vit&oacute;rias de estrit&ecirc;ncia em tempo de compila&ccedil;&atilde;o que transformam drops silenciosos em erros reais.
      </p>

      <h2>1. <code>@perryts/perry</code> no npm</h2>
      <p>
        O Perry sempre se instalou via Homebrew no macOS e APT no Debian/Ubuntu. Boa cobertura para programadores nessas plataformas, nada de todo para utilizadores de Windows a menos que fizessem build a partir do c&oacute;digo-fonte, e nada de uniforme numa equipa que mistura Mac, Linux e Windows. A v0.5.107 fez esse problema desaparecer.
      </p>
      <pre><code>{`npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp`}</code></pre>
      <p>
        O pacote &eacute; um launcher fino que depende de sete pacotes opcionais por plataforma &mdash; macOS arm64/x64, Linux x64/arm64 tanto em glibc como em musl, Windows x64 &mdash; e o npm instala apenas aquele que corresponde &agrave; sua m&aacute;quina. O tamanho bin&aacute;rio por plataforma est&aacute; na faixa baixa de megabytes de um &uacute;nico d&iacute;gito. A instala&ccedil;&atilde;o em si demora segundos. H&aacute; tamb&eacute;m um caminho de instala&ccedil;&atilde;o global (<code>npm install -g @perryts/perry</code>) se preferir, mas a instala&ccedil;&atilde;o local do projeto fixa a vers&atilde;o do compilador junto &agrave;s suas depend&ecirc;ncias, que &eacute; o default correto.
      </p>
      <p>
        A publica&ccedil;&atilde;o passou por OIDC Trusted Publisher, ent&atilde;o cada release tem proveni&ecirc;ncia e est&aacute; ligada de volta ao job de CI que a construiu. Isso foi um dia inteiro de trabalho de CI &mdash; v&aacute;rios commits de CI <code>v0.5.107</code> a perseguir a combina&ccedil;&atilde;o certa de <code>--provenance</code> / vers&atilde;o do npm / caminho de workflow &mdash; mas aterrou, e cada release desde ent&atilde;o tem sido limpa. Utilizadores de Windows agora s&atilde;o cidad&atilde;os de primeira classe, e a fric&ccedil;&atilde;o transversal de equipas de &ldquo;instale como o seu SO gostar&rdquo; desapareceu.
      </p>

      <h2>2. <code>perry dev</code> &mdash; modo watch</h2>
      <p>
        A v0.5.143 adicionou um novo subcomando ao CLI:
      </p>
      <pre><code>{`perry dev`}</code></pre>
      <p>
        &Eacute; isso. Ele observa o seu projeto, recompila ao gravar, e relan&ccedil;a o seu bin&aacute;rio. A inspira&ccedil;&atilde;o &eacute; o Vite e o <code>nodemon</code>; o prop&oacute;sito &eacute; parar de fingir que um workflow de compilador-para-bin&aacute;rio tem de parecer mais lento do que um runtime. Para a maioria dos projetos, o <code>perry dev</code> reconstr&oacute;i em menos de um segundo numa cache quente.
      </p>
      <p>
        A parte da &ldquo;cache quente&rdquo; importa. Duas novas caches aterraram junto com o <code>perry dev</code>:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>Cache de AST em mem&oacute;ria</strong> (v0.5.156). Entre rebuilds numa &uacute;nica sess&atilde;o de <code>perry dev</code>, o Perry mant&eacute;m a AST parseada para cada m&oacute;dulo que n&atilde;o mudou em disco. Editar um ficheiro re-parseia um ficheiro, n&atilde;o o grafo de m&oacute;dulos inteiro.
        </li>
        <li>
          <strong>Cache de objetos por m&oacute;dulo em disco (V2.2)</strong>. Cada m&oacute;dulo compila para o seu pr&oacute;prio ficheiro <code>.o</code> e &eacute; hasheado; m&oacute;dulos inalterados saltam o codegen inteiramente e o linker apanha o objeto em cache. A sa&iacute;da verbose da cache corresponde &agrave; spec em <a href="https://github.com/PerryTS/perry/issues/131" className="text-amber-400 hover:text-amber-300">#131</a>, e uma ronda de endurecimento de auditoria na v0.5.160 fechou os edge cases onde entradas de cache obsoletas podiam sobreviver a uma mudan&ccedil;a de cabe&ccedil;alho.
        </li>
      </ul>
      <p>
        As duas caches empilham-se. A primeira edi&ccedil;&atilde;o da sess&atilde;o &eacute; compila&ccedil;&atilde;o completa; tudo depois disso apenas faz trabalho proporcional ao que realmente mudou. Esta &eacute; a maior mudan&ccedil;a de DX da semana.
      </p>

      <h2>3. Vencer o Bun em todos os benchmarks</h2>
      <p>
        Na v0.5.166 o README tinha uma ressalva honesta: o Perry era 1,6x mais lento que o Node no <code>json_roundtrip</code> (50&times; <code>JSON.parse</code> + <code>JSON.stringify</code> num blob de 1MB, 10K itens), e 2,4x mais lento que o Bun. A issue <a href="https://github.com/PerryTS/perry/issues/149" className="text-amber-400 hover:text-amber-300">#149</a> rastreava o follow-up. Na v0.5.173 &mdash; sete dias depois &mdash; essa lacuna fechou.
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
        O Perry agora vence todos os workloads na suite principal de benchmarks &mdash; <strong>15/15 contra o Node, 15/15 contra o Bun</strong>, best of 5 runs em macOS ARM64. O Bun 1.3 ainda est&aacute; &agrave; frente em peak RSS (84MB contra os 310MB do Perry em <code>json_roundtrip</code>), ent&atilde;o a press&atilde;o sobre o alocador &eacute; a pr&oacute;xima coisa a fechar, mas a lat&ecirc;ncia bruta &eacute; do Perry.
      </p>
      <p>
        O fecho da lacuna do JSON n&atilde;o foi uma &uacute;nica mudan&ccedil;a &mdash; foi a acumula&ccedil;&atilde;o do trabalho de paridade de layout de objetos que correu ao longo desta semana: infer&ecirc;ncia de shape de object-literal da Fase 1 (v0.5.167), infer&ecirc;ncia de tipo de retorno baseada em corpo da Fase 4 para fun&ccedil;&otilde;es livres, m&eacute;todos de classe, getters e arrow functions (v0.5.169), e infer&ecirc;ncia de tipo de retorno em chamadas de m&eacute;todo da Fase 4.1 (v0.5.170). O tema &eacute; o mesmo do &uacute;ltimo artigo: d&ecirc; ao LLVM estrutura est&aacute;tica suficiente para ver atrav&eacute;s, e o otimizador faz o resto.
      </p>
      <p>
        A v0.5.164 tamb&eacute;m restaurou a autovetoriza&ccedil;&atilde;o de acumulador paralelo <code>&lt;2 x double&gt;</code> em loops de redu&ccedil;&atilde;o de fadd puro, que tinha regredido silenciosamente em algum ponto da faixa v0.5.9x&rarr;v0.5.16x. &Eacute; isso que traz o <code>math_intensive</code> e o <code>accumulate</code> de volta &agrave; sua velha lideran&ccedil;a de 3-4x sobre Rust/C++/Go/Swift &mdash; mesmo LLVM, uma flag <code>reassoc contract</code>, um corpo de loop vetorizado.
      </p>

      <h2>4. <code>perry/ui</code> e doc-tests</h2>
      <p>
        Quatro lacunas restantes de perry/ui foram fechadas na v0.5.151. Juntamente com isso, a v0.5.119 virou o mau uso silencioso de APIs do perry/ui de &ldquo;compila e n&atilde;o faz nada&rdquo; para um erro hard de compila&ccedil;&atilde;o &mdash; mesma l&oacute;gica da v0.5.165 aplicada aos decorators (veja abaixo). Mau uso a aparecer em tempo de compila&ccedil;&atilde;o &eacute; sempre melhor do que em tempo de execu&ccedil;&atilde;o.
      </p>
      <p>
        A v0.5.123 entregou um <strong>harness de teste de doc-examples</strong> e uma widget gallery. Cada exemplo de TypeScript na documenta&ccedil;&atilde;o agora &eacute; compilado em cada corrida de CI, e a widget gallery compara screenshots contra baselines aben&ccedil;oadas. A v0.5.125 estendeu isso para uma matriz de cross-compile: cada exemplo de doc &eacute; constru&iacute;do para iOS, tvOS, Android, WASM e Web, al&eacute;m da plataforma host, ent&atilde;o drift de API entre targets &eacute; apanhado no PR que o introduziu, em vez do ciclo de release que o entregou.
      </p>
      <p>
        Uma pequena vit&oacute;ria de qualidade de vida: <code>perry check</code> agora emite <code>file:line:column</code> para erros de HIR lowering (<a href="https://github.com/PerryTS/perry/issues/129" className="text-amber-400 hover:text-amber-300">#129</a>), o que significa que o jump-to-error do editor funciona em vez de mostrar uma mensagem gen&eacute;rica sem localiza&ccedil;&atilde;o.
      </p>

      <h2>5. watchOS compila de ponta a ponta</h2>
      <p>
        O watchOS foi entregue como target de compila&ccedil;&atilde;o no m&ecirc;s passado, mas um build limpo de ponta a ponta tinha algumas arestas. O trabalho de watchOS desta semana:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.113</strong>: <code>--target watchos</code> e <code>--target watchos-simulator</code> agora compilam de ponta a ponta sem os workarounds que se tinham acumulado.</li>
        <li><strong>v0.5.114</strong>: <code>--features watchos-game-loop</code> para apps de superf&iacute;cie Metal.</li>
        <li><strong>v0.5.122</strong>: <code>--features watchos-swift-app</code> para renderiza&ccedil;&atilde;o hospedada por SwiftUI &mdash; quando quer que o SwiftUI seja dono do ciclo de vida da app e o Perry componha a UI dentro dele.</li>
        <li><strong>v0.5.135</strong>: <code>PERRY_UI_TEST_MODE</code> ligado no perry-ui-ios e perry-ui-tvos, para que o teste de UI com Geisterhand corra da mesma forma nesses dois targets como corre no macOS e Linux.</li>
      </ul>

      <h2>6. Primitivas <code>perry/thread</code> totalmente ligadas</h2>
      <p>
        A v0.5.174 (hoje) fechou a <a href="https://github.com/PerryTS/perry/issues/146" className="text-amber-400 hover:text-amber-300">#146</a>: <code>parallelMap</code>, <code>parallelFilter</code> e <code>spawn</code> est&atilde;o totalmente ligados atrav&eacute;s do caminho de codegen com aplica&ccedil;&atilde;o de seguran&ccedil;a em tempo de compila&ccedil;&atilde;o. Capturas mut&aacute;veis s&atilde;o rejeitadas em tempo de compila&ccedil;&atilde;o &mdash; a mesma postura de corre&ccedil;&atilde;o-em-tempo-de-compila&ccedil;&atilde;o que o perry/ui e os decorators agora t&ecirc;m. Primitivas de thread que estavam parcialmente ligadas desde o an&uacute;ncio da v0.4.0 agora est&atilde;o completas de ponta a ponta.
      </p>

      <h2>7. WebAssembly e o target web</h2>
      <p>
        Duas corre&ccedil;&otilde;es de WASM que merecem destaque:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.158</strong>: cinco bugs compostos no <code>--target web</code> (o caminho de sa&iacute;da de WASM) que se mascaravam uns aos outros. Corrigidos em lote para que o target web agora aguente sob a superf&iacute;cie completa de <code>perry/ui</code> (<a href="https://github.com/PerryTS/perry/issues/133" className="text-amber-400 hover:text-amber-300">#133</a>).</li>
        <li><strong>v0.5.161</strong>: <code>break</code>/<code>continue</code> dentro de <code>if</code> dentro de um loop estava a ficar pendurado em WASM &mdash; um bug de codegen que n&atilde;o se reproduzia nos targets nativos. Corrigido (<a href="https://github.com/PerryTS/perry/issues/135" className="text-amber-400 hover:text-amber-300">#135</a>).</li>
      </ul>
      <p>
        Tamb&eacute;m do lado da corre&ccedil;&atilde;o: a v0.5.157 corrigiu <code>obj.field</code> a retornar <code>NaN</code> no Android (<a href="https://github.com/PerryTS/perry/issues/128" className="text-amber-400 hover:text-amber-300">#128</a>), e a v0.5.162 corrigiu um bug amaldi&ccedil;oado do ws onde <code>sendToClient</code> e <code>closeClient</code> estavam a compilar para no-ops silenciosos (<a href="https://github.com/PerryTS/perry/issues/136" className="text-amber-400 hover:text-amber-300">#136</a>).
      </p>

      <h2>8. Vit&oacute;rias de estrit&ecirc;ncia em tempo de compila&ccedil;&atilde;o</h2>
      <p>
        Um tema desta semana: tudo o que costumava ser uma falha silenciosa &eacute; agora um erro de compila&ccedil;&atilde;o.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.165</strong>: os decorators de TypeScript eram parseados para HIR e depois silenciosamente descartados. Agora d&atilde;o erro no ponto de decora&ccedil;&atilde;o com uma mensagem clara (<a href="https://github.com/PerryTS/perry/issues/144" className="text-amber-400 hover:text-amber-300">#144</a>). Mesmo racioc&iacute;nio de warn&rarr;bail da v0.5.119 aplicado ao perry/ui.</li>
        <li><strong>v0.5.119</strong>: mau uso de API do perry/ui rejeitado em tempo de compila&ccedil;&atilde;o em vez de produzir um bin&aacute;rio no-op.</li>
        <li><strong>v0.5.172</strong>: <code>console.trace()</code> agora emite um backtrace nativo real para o stderr em vez de apenas ecoar a mensagem (<a href="https://github.com/PerryTS/perry/issues/20" className="text-amber-400 hover:text-amber-300">#20</a>). Frames simbolicados requerem <code>PERRY_DEBUG_SYMBOLS=1</code>; sem isso ter&aacute; endere&ccedil;os, que ainda &eacute; mais do que o comportamento de eco de mensagem que substitui.</li>
      </ul>

      <h2>9. Fechando</h2>
      <p>
        O padr&atilde;o da semana: <strong>distribui&ccedil;&atilde;o</strong> (npm), <strong>experi&ecirc;ncia de programador</strong> (<code>perry dev</code>, caches incrementais), e <strong>a &uacute;ltima derrota de benchmark restante fechada</strong>. Al&eacute;m de um lote de estrit&ecirc;ncia em tempo de compila&ccedil;&atilde;o que transforma drops silenciosos em erros reais. Seis dias, 94 releases de patch, uma grande mudan&ccedil;a de DX.
      </p>
      <p>
        Experimente:
      </p>
      <pre><code>{`# npm (qualquer plataforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Modo watch para dev iterativo
perry dev`}</code></pre>
      <p>
        C&oacute;digo-fonte: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}&mdash; Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
