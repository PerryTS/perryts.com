export default function Content() {
  return (
    <>
      <p>
        Perry agora compila tres grandes frameworks TypeScript — Hono, tRPC e Strapi — em
        executaveis nativos ARM64. Compilam em menos de um segundo, produzem binarios abaixo de 2 MB
        e rodam sem crashes.
      </p>
      <p>
        Este post cobre o que funciona, o que ainda nao funciona e o que aprendemos ao testar o
        compilador contra codigo do mundo real.
      </p>

      <h2>Os Projetos</h2>
      <p>
        Escolhemos estes tres porque representam diferentes formas de TypeScript:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Hono</strong> — Um framework web leve (29 modulos). Uso intenso de genericos,
          heranca de classes, atribuicao dinamica de metodos e APIs Web <code className="text-perry-400">Request</code>/<code className="text-perry-400">Response</code>.
          Sua estrutura de exportacao usa re-exportacoes nomeadas atraves de barrel files.
        </li>
        <li>
          <strong>tRPC</strong> — Um framework RPC type-safe (52 modulos). Cadeias profundas de re-exportacao
          em 4+ niveis, padrao builder com refinamento de tipos genericos, instanciacao de classes no
          escopo do modulo e streaming via Web Streams.
        </li>
        <li>
          <strong>Strapi</strong> — Um CMS headless core (4 modulos compilados nativamente, o restante resolvido
          como externo). Monorepo com resolucao de pacotes workspace, re-exportacoes de namespace
          (<code className="text-perry-400">export * as X</code>), padrao de container de servico com{" "}
          <code className="text-perry-400">Map</code> e funcoes factory.
        </li>
      </ul>

      <h2>Resultados de Compilacao</h2>
      <p>
        Todos os tres compilam para binarios nativos com zero erros de compilacao:
      </p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Projeto</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Modulos Compilados</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Tamanho do Binario</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Tempo de Compilacao</th>
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
        Cada modulo fonte passa pelo pipeline completo: analise SWC, reducao HIR, geracao de codigo Cranelift,
        emissao de arquivo objeto e vinculacao nativa. Os tempos de compilacao incluem tudo —
        da analise ate o link final.
      </p>
      <p>
        Para contexto, <code className="text-perry-400">tsc --noEmit</code> no tRPC sozinho leva varios
        segundos. Perry compila 52 modulos para um binario nativo vinculado em menos de um.
      </p>

      <h2>O Que Funciona em Tempo de Execucao</h2>

      <h3>Instanciacao de Classes entre Modulos</h3>
      <p>
        Este foi o grande marco. A estrutura de exportacao do Hono parece assim:
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
        Esse <code className="text-perry-400">export {"{"} Hono {"}"}</code> e uma re-exportacao nomeada — nao{" "}
        <code className="text-perry-400">export * from</code> ou{" "}
        <code className="text-perry-400">export {"{"} Hono {"}"} from &apos;./hono&apos;</code>. No HIR do Perry,
        isso se torna <code className="text-perry-400">Export::Named</code>, nao{" "}
        <code className="text-perry-400">Export::ReExport</code> ou{" "}
        <code className="text-perry-400">Export::ExportAll</code>. Anteriormente, a propagacao de classes do
        compilador so seguia cadeias <code className="text-perry-400">ExportAll</code> e{" "}
        <code className="text-perry-400">ReExport</code>, entao importar{" "}
        <code className="text-perry-400">Hono</code> de <code className="text-perry-400">index.ts</code> falhava
        silenciosamente — a busca de classe falhava e <code className="text-perry-400">new Hono()</code> retornava{" "}
        <code className="text-perry-400">undefined</code>.
      </p>
      <p>
        Agora Perry rastrea <code className="text-perry-400">Export::Named</code> de volta atraves das importacoes do
        modulo para encontrar a definicao original da classe e propaga-la. O resultado:
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
        O construtor do Hono executa, inicializa um <code className="text-perry-400">SmartRouter</code>{" "}
        (que internamente cria tanto um <code className="text-perry-400">RegExpRouter</code> quanto um{" "}
        <code className="text-perry-400">TrieRouter</code>), e retorna um objeto real. Multiplas instancias
        independentes funcionam. Opcoes do construtor sao aceitas.
      </p>

      <h3>Resolucao de Re-exportacao Multi-nivel</h3>
      <p>
        O <code className="text-perry-400">initTRPC</code> do tRPC fica 4 niveis de profundidade:
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
        Isso e <code className="text-perry-400">ExportAll</code> →{" "}
        <code className="text-perry-400">Named</code> → <code className="text-perry-400">ExportAll</code>. Perry
        resolve a cadeia completa — <code className="text-perry-400">initTRPC</code> e acessivel no
        binario compilado. O mesmo para <code className="text-perry-400">TRPCError</code>, que segue o mesmo caminho.
      </p>

      <h3>Instanciacao de Classes entre Modulos com Argumentos</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">err</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">TRPCError</span>({"{"} code: <span className="text-green-400">&apos;NOT_FOUND&apos;</span>, message: <span className="text-green-400">&apos;resource missing&apos;</span> {"}"})</p>
          <p className="text-green-400">// PASS: new TRPCError() returned object</p>
          <p className="text-green-400">// PASS: err.code = NOT_FOUND</p>
        </div>
      </div>
      <p>
        <code className="text-perry-400">TRPCError</code> e definido em um modulo, re-exportado atraves de
        tres barrel files intermediarios, importado no teste e instanciado com um objeto de opcoes.
        O campo <code className="text-perry-400">code</code> da instancia e acessivel.
      </p>

      <h3>Resolucao de Pacotes em Monorepos</h3>
      <p>
        Strapi usa pacotes workspace — <code className="text-perry-400">@strapi/core</code> e um pacote
        irmao no monorepo, nao uma dependencia npm. Perry resolve o especificador bare atraves de
        campos <code className="text-perry-400">package.json</code> exports:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-green-400">&quot;exports&quot;</span>: {"{"}</p>
          <p>  <span className="text-green-400">&quot;.&quot;</span>: {"{"} <span className="text-green-400">&quot;source&quot;</span>: <span className="text-green-400">&quot;./src/index.ts&quot;</span>, <span className="text-green-400">&quot;import&quot;</span>: <span className="text-green-400">&quot;./dist/index.mjs&quot;</span> {"}"}</p>
          <p>{"}"}</p>
        </div>
      </div>
      <p>
        A funcao <code className="text-perry-400">createStrapi</code> resolve corretamente como uma funcao
        chamavel atraves de <code className="text-perry-400">export * from &apos;@strapi/core&apos;</code>.
      </p>

      <h3>Filtragem de Exportacao Somente de Tipo</h3>
      <p>
        A sintaxe <code className="text-perry-400">export type {"{"} Foo {"}"}</code> do TypeScript nao tem
        significado em runtime — mas anteriormente Perry as transformava em entradas reais{" "}
        <code className="text-perry-400">Export::ReExport</code> que propagavam pelo linker
        e geravam simbolos stub. O <code className="text-perry-400">index.ts</code> do Hono sozinho tem
        quatro declaracoes <code className="text-perry-400">export type</code> cobrindo dezenas de tipos.
      </p>
      <p>
        Perry agora verifica a flag <code className="text-perry-400">type_only</code> do SWC em
        declaracoes <code className="text-perry-400">ExportNamed</code> e{" "}
        <code className="text-perry-400">is_type_only</code> em especificadores individuais, pulando-os durante
        a reducao HIR. Isso eliminou a geracao de stubs mortos de re-exportacoes de tipo em todos os tres
        projetos.
      </p>

      <h3>Construtor RegExp</h3>
      <p>
        <code className="text-perry-400">new RegExp(pattern, flags)</code> agora compila para a funcao de
        runtime existente <code className="text-perry-400">js_regexp_new</code> do Perry. Isso foi
        direto — o runtime ja suportava RegExp — mas o handler de codegen{" "}
        <code className="text-perry-400">Expr::New</code> nao tinha um caso para ele, entao todo{" "}
        <code className="text-perry-400">new RegExp(...)</code> passava para um aviso &quot;Unknown class&quot;.
        O <code className="text-perry-400">RegExpRouter</code> do Hono usa isso extensivamente.
      </p>

      <h2>O Que Ainda Nao Funciona</h2>
      <p>
        Estamos sendo especificos aqui porque as lacunas dizem tanto quanto as vitorias.
      </p>

      <h3>Atribuicao Dinamica de Propriedade em <code className="text-perry-400">this</code></h3>
      <p>
        O construtor do Hono configura handlers de metodo HTTP dinamicamente:
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
        Isso significa que <code className="text-perry-400">app.get</code>,{" "}
        <code className="text-perry-400">app.post</code>, etc. nao sao declarados estaticamente — sao
        atribuidos em runtime via nomes de propriedade computados. Perry ainda nao suporta{" "}
        <code className="text-perry-400">this[variable] = value</code>, entao esses metodos estao ausentes:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-400">[4] Dynamic method assignment (this[method] = ...)</span></p>
          <p className="text-amber-400">  INFO: app.get not available</p>
          <p className="text-amber-400">  INFO: app.on not available</p>
        </div>
      </div>
      <p>
        Esta e a maior lacuna para o Hono. A classe Hono existe, seu roteador e inicializado,
        mas voce nao pode registrar rotas.
      </p>

      <h3>Chamadas de Construtor no Nivel do Modulo</h3>
      <p>
        tRPC define seu ponto de entrada como:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">export const</span> <span className="text-cyan-400">initTRPC</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">TRPCBuilder</span>()</p>
        </div>
      </div>
      <p>
        Em runtime, <code className="text-perry-400">initTRPC</code> aparece como{" "}
        <code className="text-perry-400">typeof function</code> em vez de{" "}
        <code className="text-perry-400">typeof object</code> — a expressao{" "}
        <code className="text-perry-400">new TRPCBuilder()</code> no nivel do modulo nao esta executando o
        construtor, entao o que voce recebe e uma referencia a classe em vez de uma instancia. Isso
        significa que <code className="text-perry-400">initTRPC.create()</code> e{" "}
        <code className="text-perry-400">initTRPC.context()</code> sao ambos{" "}
        <code className="text-perry-400">undefined</code>.
      </p>

      <h3>Propriedades Herdadas</h3>
      <p>
        <code className="text-perry-400">TRPCError extends Error</code>, e enquanto{" "}
        <code className="text-perry-400">err.code</code> (definido diretamente em{" "}
        <code className="text-perry-400">TRPCError</code>) funciona,{" "}
        <code className="text-perry-400">err.message</code> (herdado de{" "}
        <code className="text-perry-400">Error</code>) nao e acessivel. A cadeia de prototipos para busca de
        propriedades nao esta totalmente implementada.
      </p>

      <h3>Cadeias de Construtores Complexas</h3>
      <p>
        A funcao <code className="text-perry-400">createStrapi()</code> do Strapi internamente chama{" "}
        <code className="text-perry-400">new Strapi(opts)</code>, que estende{" "}
        <code className="text-perry-400">Container</code> (apoiado por{" "}
        <code className="text-perry-400">Map</code>), chama{" "}
        <code className="text-perry-400">loadConfiguration()</code>, itera sobre provedores e registra
        servicos. Esta cadeia profunda de construtores produz um valor de retorno falsy — nao crasha,
        mas tambem nao produz uma instancia utilizavel.
      </p>

      <h3>Classes Built-in de Web API</h3>
      <p>
        Estes sao os avisos restantes de &quot;Unknown class&quot; nos tres projetos:
      </p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Classe</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Contagem</th>
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
        e <code className="text-perry-400">Headers</code> sao os criticos para qualquer framework HTTP.
        Estes precisam de suporte de codegen built-in similar ao que ja temos para{" "}
        <code className="text-perry-400">Map</code>, <code className="text-perry-400">Set</code>,{" "}
        <code className="text-perry-400">RegExp</code>, <code className="text-perry-400">Buffer</code>,{" "}
        <code className="text-perry-400">AbortController</code> e outros.
      </p>

      <h2>O Que Isso Nos Diz</h2>
      <p>
        A boa noticia: o pipeline de compilacao do Perry lida com codigo real de frameworks. Projetos multi-arquivo
        com cadeias complexas de re-exportacao, assinaturas de tipo pesadas em genericos, hierarquias de classes
        e resolucao de pacotes monorepo passam todos para binarios vinculados.
      </p>
      <p>
        As lacunas sao lacunas de runtime, nao lacunas de compilacao. O trabalho restante e:
      </p>
      <ol className="list-decimal list-inside">
        <li><strong>Atribuicao dinamica de propriedade</strong> — necessaria para frameworks que configuram metodos programaticamente</li>
        <li><strong>Expressoes de inicializacao no nivel do modulo</strong> — <code className="text-perry-400">export const x = new Foo()</code> precisa realmente executar o construtor</li>
        <li><strong>Cadeia de prototipos</strong> — propriedades e metodos herdados</li>
        <li><strong>Built-ins de Web API</strong> — <code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code>, <code className="text-perry-400">Headers</code> para frameworks HTTP</li>
      </ol>
      <p>
        Estes sao problemas concretos e bem delimitados. Nenhum deles requer mudancas arquiteturais —
        sao extensoes de padroes que ja funcionam para casos mais simples.
      </p>
      <p>
        Continuaremos trabalhando neles. O objetivo e{" "}
        <code className="text-perry-400">new Hono().get(&apos;/&apos;, (c) =&gt; c.text(&apos;hello&apos;))</code>{" "}
        produzindo um servidor HTTP funcional em um binario nativo.
      </p>
    </>
  );
}
