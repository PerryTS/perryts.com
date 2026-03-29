import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Temos o prazer de apresentar o Perry — um compilador nativo de TypeScript escrito em Rust
        que compila seu TypeScript diretamente para executaveis independentes. Sem runtime Node.js,
        sem wrapper Electron, sem compromissos. Apenas seu codigo, compilado para um binario nativo que
        inicia instantaneamente e roda em qualquer lugar.
      </p>
      <p>
        Perry representa uma reformulacao fundamental do que TypeScript pode ser. Em vez de
        trata-lo como um superconjunto de JavaScript que deve rodar atraves de um motor JS, Perry
        trata TypeScript como uma linguagem de sistemas — uma que por acaso tem uma sintaxe que milhoes
        de desenvolvedores ja conhecem e adoram.
      </p>

      <h2>Por Que Construimos o Perry</h2>
      <p>
        TypeScript se tornou a lingua franca do desenvolvimento de software moderno. E a
        linguagem por tras da maioria dos frontends web, uma parcela crescente de backends, e cada vez mais
        a escolha para ferramentas, scripts e automacao. Mas sempre carregou uma limitacao
        fundamental: compila para JavaScript, e JavaScript requer um runtime.
      </p>
      <p>
        Esse runtime — seja Node.js, Deno ou Bun — vem com compromissos.
        Tempos de inicializacao a frio medidos em dezenas ou centenas de milissegundos. Sobrecarga de memoria do
        compilador JIT e coletor de lixo. Distribuicoes binarias que empacotam o runtime
        inteiro ou exigem que o usuario instale um. E para aplicacoes GUI, a unica opcao
        tem sido Electron, que envia um navegador Chromium inteiro com seu aplicativo.
      </p>
      <p>
        Nos perguntamos: e se TypeScript nao precisasse passar pelo JavaScript? E se
        voce pudesse compila-lo diretamente para codigo de maquina nativo, da mesma forma que compila Rust,
        Go ou C++?
      </p>

      <h2>Como o Perry Funciona</h2>
      <p>
        O pipeline de compilacao do Perry tem tres estagios:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Analise sintatica</strong> — Perry usa SWC (o parser de TypeScript/JavaScript baseado em Rust)
          para analisar seu codigo TypeScript em uma AST. SWC e o mesmo parser usado pelo Next.js,
          e e extremamente rapido.
        </li>
        <li>
          <strong>Compilacao dirigida por tipos</strong> — Perry percorre a AST com informacao
          completa de tipos. Diferente de um motor JS que precisa lidar com tipos dinamicos em tempo de execucao, Perry conhece
          todos os tipos em tempo de compilacao. Isso permite monomorfizacao de genericos, despacho estatico
          de chamadas de metodo e otimizacao direta do layout de memoria.
        </li>
        <li>
          <strong>Geracao de codigo</strong> — Perry gera codigo de maquina nativo usando Cranelift,
          o mesmo gerador de codigo usado pelo Wasmtime e partes do JIT do Firefox. Cranelift
          produz codigo nativo eficiente para x86_64 e ARM64.
        </li>
      </ol>
      <p>
        O resultado e um executavel independente — tipicamente 2-5 MB para uma ferramenta CLI — que inicia
        instantaneamente com zero tempo de aquecimento.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts</p>
          <p className="text-slate-500">Parsing app.ts...</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking...</p>
          <p className="text-green-400">✓ Built executable: app (2.3 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./app</p>
          <p className="text-slate-300">Hello from native TypeScript!</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file app</p>
          <p className="text-slate-300">app: Mach-O 64-bit executable arm64</p>
        </div>
      </div>

      <h2>Quais Recursos do TypeScript Sao Suportados</h2>
      <p>
        Perry suporta um subconjunto amplo e crescente do TypeScript. O objetivo e compatibilidade total
        com a linguagem como os desenvolvedores realmente a usam. Hoje, isso inclui:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Todos os tipos primitivos</strong> — string, number, boolean, null, undefined, bigint, symbol</li>
        <li><strong>Interfaces e aliases de tipo</strong> — incluindo tipos union, tipos intersection e tipos mapeados</li>
        <li><strong>Genericos</strong> — compilados via monomorfizacao, entao <code className="text-perry-400">Array&lt;number&gt;</code> e <code className="text-perry-400">Array&lt;string&gt;</code> geram caminhos de codigo otimizados distintos</li>
        <li><strong>Classes</strong> — com heranca, campos privados (<code className="text-perry-400">#field</code>), membros estaticos, getters/setters e decoradores</li>
        <li><strong>Async/await e Promises</strong> — compilados para uma maquina de estados, similar a como Rust lida com async</li>
        <li><strong>Geradores e iteradores</strong> — <code className="text-perry-400">function*</code> e lacos <code className="text-perry-400">for...of</code></li>
        <li><strong>Closures</strong> — com semantica de captura adequada</li>
        <li><strong>Desestruturacao</strong> — arrays, objetos, padroes aninhados e elementos rest</li>
        <li><strong>Template literals</strong> — incluindo tagged templates</li>
        <li><strong>Modulos</strong> — imports/exports ESM resolvidos em tempo de compilacao</li>
      </ul>

      <h2>UI Nativa Multiplataforma</h2>
      <p>
        Perry nao se limita a ferramentas CLI e aplicacoes do lado do servidor. Ele vem com frameworks
        de UI nativos para seis plataformas:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>macOS</strong> — AppKit (NSWindow, NSView, NSButton, NSTextField e mais)</li>
        <li><strong>iOS</strong> — UIKit (UIViewController, UIView, UIButton, UITableView)</li>
        <li><strong>iPadOS</strong> — UIKit (mesma API do iOS, com adaptacoes especificas para iPad)</li>
        <li><strong>Android</strong> — JNI + Android Views (Activity, View, Button, RecyclerView)</li>
        <li><strong>Linux</strong> — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)</li>
        <li><strong>Windows</strong> — Win32 (CreateWindowEx, controles comuns, GDI)</li>
      </ul>
      <p>
        O insight principal e que Perry mapeia uma API TypeScript comum para o toolkit
        de widgets nativos de cada plataforma em tempo de compilacao. Nao ha camada de ponte, nao ha web view e
        nao ha motor de renderizacao customizado. Seu aplicativo usa widgets reais da plataforma, renderizados pelo
        proprio SO. Leia mais em nosso aprofundamento:{" "}
        <Link href="/blog/cross-platform-native-ui" className="text-perry-400 hover:text-perry-300">
          UI Nativa Multiplataforma a partir de TypeScript
        </Link>.
      </p>

      <h2>Mais de 27 Implementacoes Nativas de Pacotes npm</h2>
      <p>
        Um dos maiores desafios praticos de um novo compilador e a compatibilidade com o ecossistema.
        Desenvolvedores nao escrevem apenas codigo do zero — eles usam pacotes. Perry resolve
        isso com implementacoes nativas de mais de 27 pacotes npm populares:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Bancos de dados</strong> — mysql2, pg, mongodb, better-sqlite3, ioredis</li>
        <li><strong>HTTP</strong> — axios, express, ws (WebSockets)</li>
        <li><strong>Seguranca</strong> — bcrypt, jsonwebtoken, crypto</li>
        <li><strong>Utilitarios</strong> — uuid, chalk, dotenv, lodash (parcial), moment</li>
        <li><strong>Sistema</strong> — fs-extra, glob, chokidar, commander</li>
      </ul>
      <p>
        Estas nao sao wrappers finos sobre modulos Node.js. Sao compiladas diretamente
        no seu binario usando bibliotecas nativas do sistema — libpq para PostgreSQL, OpenSSL para
        crypto, libcurl para HTTP. A superficie da API corresponde ao que voce esperaria do pacote npm,
        entao a migracao e direta.
      </p>

      <h2>Camada Opcional de Compatibilidade V8</h2>
      <p>
        Para pacotes npm que ainda nao tem implementacoes nativas no Perry, Perry oferece um
        modo opcional de incorporacao V8. Quando habilitado, Perry empacota um runtime V8 e pode executar
        pacotes npm JavaScript padrao junto com seu TypeScript compilado. Esta e uma valvula de escape
        pragmatica que permite adotar Perry incrementalmente — compile os caminhos criticos para codigo
        nativo enquanto ainda acessa o ecossistema npm completo para todo o resto.
      </p>

      <h2>Compilacao Cruzada</h2>
      <p>
        Perry suporta compilacao cruzada nativamente. Da sua maquina de desenvolvimento macOS,
        voce pode compilar para Linux (x86_64 e ARM64) e iOS. Isso significa que voce pode construir seu
        pipeline CI/CD no macOS e produzir binarios para todos os seus alvos de implantacao sem
        precisar de maquinas de build dedicadas para cada plataforma.
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p className="text-slate-500"># Build for Linux from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target linux-x86_64</p>
          <p className="text-green-400">✓ Built executable: app (3.1 MB)</p>
          <p className="mt-3 text-slate-500"># Build for iOS from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: app (4.8 MB)</p>
        </div>
      </div>

      <h2>Desempenho</h2>
      <p>
        Binarios compilados pelo Perry sao rapidos. Como nao ha aquecimento JIT, nenhuma sobrecarga de
        interpretador e nenhuma pausa do coletor de lixo, o desempenho e previsivel e consistente
        desde a primeira invocacao.
      </p>
      <p>
        Em nossos benchmarks:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Tempo de inicializacao</strong> — efetivamente 0 ms (lancamento de processo nativo)</li>
        <li><strong>Tamanho do binario</strong> — 2-5 MB para ferramentas CLI tipicas (vs 50+ MB para Node.js empacotado)</li>
        <li><strong>Uso de memoria</strong> — 5-10x menor que aplicacoes Node.js equivalentes</li>
        <li><strong>Throughput</strong> — competitivo com C escrito a mao para cargas de trabalho intensivas em computacao</li>
      </ul>
      <p>
        Voce pode ver benchmarks ao vivo em{" "}
        <a href="https://demo.perryts.com" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          demo.perryts.com
        </a>, que compara executaveis compilados pelo Perry contra Node.js e Bun em tempo real.
      </p>

      <h2>Status Atual</h2>
      <p>
        Perry esta em desenvolvimento ativo. O compilador e estavel com 62 de 62 testes
        passando em toda a suite de testes. Todos os seis backends de UI de plataforma estao funcionais. Os recursos
        principais da linguagem sao solidos e estao expandindo.
      </p>
      <p>
        Estamos trabalhando ativamente na expansao da biblioteca de widgets de UI, melhorando o desempenho de
        strings e objetos, completando o suporte total a regex e construindo o modulo Stream. A longo
        prazo, estamos planejando alvos de compilacao WASM, multi-threading, uma extensao VS Code
        e integracao com gerenciador de pacotes.
      </p>
      <p>
        Confira o <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">roadmap</Link> completo para
        detalhes sobre o que foi lancado, o que esta em andamento e o que vem a seguir.
      </p>

      <h2>Comece Agora</h2>
      <p>
        Perry e open source. Voce pode clonar o repositorio, compilar a partir do codigo-fonte e comecar a compilar
        TypeScript hoje:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> git clone https://github.com/PerryTS/perry.git</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">cd</span> perry</p>
          <p><span className="text-slate-500">$</span> cargo build --release</p>
          <p className="mt-3 text-slate-500"># Compile your first TypeScript file</p>
          <p><span className="text-slate-500">$</span> ./target/release/<span className="text-cyan-400">perry</span> build hello.ts</p>
          <p className="text-green-400">✓ Built executable: hello (2.1 MB)</p>
          <p><span className="text-slate-500">$</span> ./hello</p>
          <p className="text-slate-300">Hello, world!</p>
        </div>
      </div>
      <p>
        Navegue pelo codigo-fonte no{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          GitHub
        </a>
        , confira o{" "}
        <Link href="/showcase" className="text-perry-400 hover:text-perry-300">showcase</Link>
        {" "}para ver o que esta sendo construido com Perry, ou mergulhe direto no codigo.
        Mal podemos esperar para ver o que voce vai construir.
      </p>
    </>
  );
}
