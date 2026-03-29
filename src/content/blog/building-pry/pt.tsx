import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Pry e um visualizador JSON nativo construido inteiramente em TypeScript e compilado com Perry. Nao e
        uma demonstracao tecnica — e uma ferramenta real que usamos todos os dias para inspecionar respostas de API, arquivos de
        configuracao e dumps de dados. Este post explica como foi construido, como compila e como
        e a experiencia do desenvolvedor quando seu TypeScript compila para um app nativo.
      </p>

      <h2>O Que o Pry Faz</h2>
      <p>
        Pry le um arquivo JSON (ou aceita JSON do stdin) e o renderiza como uma arvore interativa e
        navegavel em uma janela nativa. Se voce ja usou o Quick Look nativo do macOS
        para JSON, imagine isso — mas mais rapido, com busca e navegacao por teclado.
      </p>
      <p>
        O conjunto de recursos:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Visualizacao em arvore</strong> — nos retratieis para objetos e arrays, com indicadores de profundidade e expandir/recolher tudo</li>
        <li><strong>Busca</strong> — busca de texto completo em chaves e valores com realce em tempo real e navegacao por correspondencias</li>
        <li><strong>Atalhos de teclado</strong> — setas para navegar, enter para expandir/recolher, barra para buscar, <code className="text-perry-400">⌘C</code> para copiar</li>
        <li><strong>Area de transferencia</strong> — copiar qualquer no ou subarvore como JSON formatado</li>
        <li><strong>Coloracao sintatica</strong> — strings em verde, numeros em laranja, booleans em roxo, null em vermelho</li>
        <li><strong>Barra de status</strong> — mostra contagem total de nos, profundidade atual, tamanho do arquivo e tempo de analise</li>
      </ul>

      <h2>O Codigo-Fonte</h2>
      <p>
        Pry e escrito em TypeScript padrao. Nao ha sintaxe especial, macros ou
        geracao de codigo em tempo de build. Usa a API de UI do Perry, que fornece widgets nativos
        que compilam para codigo especifico de plataforma.
      </p>
      <p>
        Aqui esta o ponto de entrada (simplificado para clareza):
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">pry.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">TreeView</span>, <span className="text-cyan-400">SearchBar</span>, <span className="text-cyan-400">StatusBar</span>, <span className="text-cyan-400">State</span> {"}"}</p>
          <p>  <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">readFile</span>, <span className="text-cyan-400">readStdin</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/fs&quot;</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Read input from file arg or stdin</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">input</span> = process.argv[<span className="text-orange-400">2</span>]</p>
          <p>  ? <span className="text-yellow-400">readFile</span>(process.argv[<span className="text-orange-400">2</span>])</p>
          <p>  : <span className="text-yellow-400">readStdin</span>();</p>
          <p className="mt-3"><span className="text-purple-400">const</span> <span className="text-cyan-400">startTime</span> = Date.<span className="text-yellow-400">now</span>();</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">data</span> = JSON.<span className="text-yellow-400">parse</span>(<span className="text-cyan-400">input</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">parseMs</span> = Date.<span className="text-yellow-400">now</span>() - <span className="text-cyan-400">startTime</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Reactive state</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">searchQuery</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-green-400">&quot;&quot;</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">matchCount</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-3"><span className="text-slate-500">// Build the app</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Pry&quot;</span>, {"{"}</p>
          <p>  width: <span className="text-orange-400">800</span>,</p>
          <p>  height: <span className="text-orange-400">600</span>,</p>
          <p>  minWidth: <span className="text-orange-400">400</span>,</p>
          <p>  minHeight: <span className="text-orange-400">300</span>,</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">0</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">SearchBar</span>({"{"}</p>
          <p>      placeholder: <span className="text-green-400">&quot;Search keys and values...&quot;</span>,</p>
          <p>      onSearch: (<span className="text-cyan-400">q</span>) =&gt; <span className="text-cyan-400">searchQuery</span>.value = <span className="text-cyan-400">q</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">TreeView</span>(<span className="text-cyan-400">data</span>, {"{"}</p>
          <p>      collapsible: <span className="text-orange-400">true</span>,</p>
          <p>      syntaxHighlight: <span className="text-orange-400">true</span>,</p>
          <p>      searchQuery: <span className="text-cyan-400">searchQuery</span>,</p>
          <p>      onMatchCount: (<span className="text-cyan-400">n</span>) =&gt; <span className="text-cyan-400">matchCount</span>.value = <span className="text-cyan-400">n</span>,</p>
          <p>      copyOnClick: <span className="text-orange-400">true</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">StatusBar</span>([</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>){"}"} nodes`</span>,</p>
          <p>      <span className="text-green-400">`Parsed in ${"{"}<span className="text-cyan-400">parseMs</span>{"}"}ms`</span>,</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-cyan-400">matchCount</span>.value{"}"} matches`</span>,</p>
          <p>    ]),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;/&quot;</span>, () =&gt; <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusSearchBar</span>());</p>
          <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;Escape&quot;</span>, () =&gt; {"{"}</p>
          <p>  <span className="text-cyan-400">searchQuery</span>.value = <span className="text-green-400">&quot;&quot;</span>;</p>
          <p>  <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusTree</span>();</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        Esse e o nucleo de um aplicativo nativo. Sem boilerplate de framework, sem configuracao de build,
        sem arquivos especificos de plataforma. Um arquivo TypeScript.
      </p>

      <h3>As Funcoes Auxiliares</h3>
      <p>
        Pry tambem inclui um utilitario <code className="text-perry-400">countNodes</code> que
        conta recursivamente todos os nos na arvore JSON, e um auxiliar{" "}
        <code className="text-perry-400">formatBytes</code> para exibir tamanhos de arquivo. Estas
        sao funcoes TypeScript padrao — nada especifico do Perry. Compilam para
        codigo nativo como todo o resto.
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">utils.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">export function</span> <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>: <span className="text-cyan-400">unknown</span>): <span className="text-cyan-400">number</span> {"{"}</p>
          <p>  <span className="text-purple-400">if</span> (<span className="text-cyan-400">data</span> === <span className="text-orange-400">null</span> || <span className="text-purple-400">typeof</span> <span className="text-cyan-400">data</span> !== <span className="text-green-400">&quot;object&quot;</span>) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span>;</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">if</span> (Array.<span className="text-yellow-400">isArray</span>(<span className="text-cyan-400">data</span>)) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">data</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">item</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">item</span>), <span className="text-orange-400">0</span>);</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">const</span> <span className="text-cyan-400">values</span> = Object.<span className="text-yellow-400">values</span>(<span className="text-cyan-400">data</span> <span className="text-purple-400">as</span> Record&lt;<span className="text-cyan-400">string</span>, <span className="text-cyan-400">unknown</span>&gt;);</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">values</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">val</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">val</span>), <span className="text-orange-400">0</span>);</p>
          <p>{"}"}</p>
        </div>
      </div>

      <h2>Compilando o Pry</h2>
      <p>
        Compilar o Pry com Perry e um unico comando. Sem projeto Xcode, sem configuracao Gradle,
        sem configuracao webpack. Apenas aponte Perry para o arquivo de entrada e especifique seu alvo.
      </p>

      <h3>macOS (ARM64)</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target macos-arm64</p>
          <p className="text-slate-500">Parsing pry.ts...</p>
          <p className="text-slate-500">Resolving imports: perry/ui, perry/fs</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking with AppKit.framework...</p>
          <p className="text-green-400">✓ Built executable: pry (48 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file pry</p>
          <p className="text-slate-300">pry: Mach-O 64-bit executable arm64</p>
          <p className="mt-3"><span className="text-slate-500">$</span> otool -L pry | head -5</p>
          <p className="text-slate-400">pry:</p>
          <p className="text-slate-400">  /System/Library/Frameworks/AppKit.framework/AppKit</p>
          <p className="text-slate-400">  /System/Library/Frameworks/Foundation.framework/Foundation</p>
          <p className="text-slate-400">  /usr/lib/libSystem.B.dylib</p>
        </div>
      </div>
      <p>
        O binario tem 48 MB porque inclui toda a pilha de UI AppKit — renderizacao de tree view,
        realce de busca, coloracao sintatica e tratamento de teclado. Para comparacao, o mesmo app
        em Electron seria 200+ MB. Um app Perry somente CLI compila para 2-5 MB.
      </p>

      <h3>iOS</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: pry (52 MB)</p>
        </div>
      </div>
      <p>
        O build iOS vincula-se ao UIKit em vez de AppKit. Perry mapeia a mesma API{" "}
        <code className="text-perry-400">TreeView</code> para <code className="text-perry-400">UITableView</code> com
        secoes expansiveis, <code className="text-perry-400">SearchBar</code> para{" "}
        <code className="text-perry-400">UISearchBar</code>, e eventos de toque substituem eventos de mouse.
        O build iOS pode ser implantado em dispositivos fisicos e simuladores.
      </p>

      <h3>Android</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target android-arm64</p>
          <p className="text-green-400">✓ Built: pry.apk</p>
        </div>
      </div>
      <p>
        O build Android gera uma biblioteca nativa carregada atraves de JNI, empacotada em um APK.{" "}
        <code className="text-perry-400">TreeView</code> mapeia para um <code className="text-perry-400">RecyclerView</code> com
        view holders expansiveis, <code className="text-perry-400">SearchBar</code> mapeia para um{" "}
        <code className="text-perry-400">EditText</code> com um <code className="text-perry-400">TextWatcher</code>, e a
        barra de status mapeia para um <code className="text-perry-400">TextView</code> na parte inferior do layout.
      </p>

      <h2>O Que Acontece Por Baixo dos Panos</h2>
      <p>
        Quando Perry compila o Pry, passa por varias fases:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Analise</strong> — SWC analisa o codigo TypeScript em uma AST. Importacoes de{" "}
          <code className="text-perry-400">perry/ui</code> e <code className="text-perry-400">perry/fs</code> sao
          resolvidas para as implementacoes de modulos integrados do Perry.
        </li>
        <li>
          <strong>Analise de tipos</strong> — Perry resolve todos os tipos, incluindo os genericos{" "}
          <code className="text-perry-400">State&lt;string&gt;</code> e{" "}
          <code className="text-perry-400">State&lt;number&gt;</code>, monomorfizando-os em
          tipos concretos.
        </li>
        <li>
          <strong>Resolucao de plataforma</strong> — Com base na flag de alvo, Perry seleciona o
          backend de UI apropriado. Cada chamada de <code className="text-perry-400">TreeView</code>,{" "}
          <code className="text-perry-400">SearchBar</code> e <code className="text-perry-400">Button</code> e
          resolvida para a implementacao especifica da plataforma.
        </li>
        <li>
          <strong>Geracao de IR</strong> — Perry gera uma representacao intermediaria que
          inclui chamadas de API nativa — envios de mensagem Objective-C para macOS/iOS, chamadas JNI para
          Android, chamadas de funcao C para GTK4/Win32.
        </li>
        <li>
          <strong>Geracao de codigo</strong> — Cranelift compila o IR para codigo de maquina nativo
          para a arquitetura alvo.
        </li>
        <li>
          <strong>Vinculacao</strong> — O codigo nativo e vinculado contra os frameworks da plataforma
          (AppKit, UIKit, Android NDK, GTK4 ou Win32) para produzir o executavel final.
        </li>
      </ol>

      <h2>Sem Runtime, Sem Web Views</h2>
      <p>
        Isso merece enfase porque e a diferenca fundamental entre Perry e toda
        outra abordagem TypeScript-para-nativo. O binario compilado do Pry tem:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Sem motor JavaScript</strong> — sem V8, sem Hermes, sem JavaScriptCore</li>
        <li><strong>Sem web views</strong> — sem Chromium, sem WebKit, sem WKWebView</li>
        <li><strong>Sem camada de ponte</strong> — sem mensagens serializadas entre JS e nativo</li>
        <li><strong>Sem runtime de framework</strong> — sem React, sem motor Flutter, sem Dart VM</li>
      </ul>
      <p>
        O binario chama APIs da plataforma diretamente. No macOS, chama{" "}
        <code className="text-perry-400">objc_msgSend</code> para interagir com objetos AppKit. No Android,
        chama funcoes JNI para criar e manipular Views. E a mesma coisa que um app nativo
        Swift ou Kotlin faria.
      </p>
      <p>
        A consequencia pratica: Pry inicia instantaneamente. Nao ha startup de VM, sem aquecimento de JIT,
        sem analise de script. O processo inicia, a janela aparece, o JSON e renderizado.
        O uso de memoria e uma fracao do que um equivalente Electron consumiria.
      </p>

      <h2>Experiencia do Desenvolvedor</h2>
      <p>
        Construir o Pry pareceu notavelmente similar a construir qualquer aplicacao TypeScript. O
        fluxo de trabalho e:
      </p>
      <ol className="list-decimal list-inside">
        <li>Escreva TypeScript no seu editor (VS Code, Zed, Neovim, o que preferir)</li>
        <li>Execute <code className="text-perry-400">perry compile pry.ts</code></li>
        <li>Execute <code className="text-perry-400">./pry test.json</code></li>
        <li>Itere</li>
      </ol>
      <p>
        Sem projeto Xcode para configurar. Sem Android Studio para instalar. Sem build Gradle que leva
        45 segundos. O proprio compilador Perry e rapido — analisar e compilar o Pry leva alguns
        segundos, e estamos trabalhando ativamente para torna-lo mais rapido.
      </p>
      <p>
        O TypeScript que voce escreve e TypeScript padrao. A verificacao de tipos do seu editor,
        autocomplete e ferramentas de refatoracao funcionam. Voce pode extrair funcoes, criar modulos,
        usar genericos — todos os padroes TypeScript que voce ja conhece.
      </p>

      <h2>O Que Aprendemos</h2>
      <p>
        Construir o Pry nos ensinou muito sobre o que a API de UI do Perry precisa suportar. Algumas licoes:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Tree views sao complexas.</strong> Expandir, recolher, realce de busca,
          navegacao por teclado e integracao com a area de transferencia precisam ser coordenados. O widget{" "}
          <code className="text-perry-400">TreeView</code> do Perry lida com isso internamente, mas tivemos
          que garantir que a implementacao nativa fosse consistente em todas as tres plataformas.
        </li>
        <li>
          <strong>Atalhos de teclado precisam seguir convencoes da plataforma.</strong> No macOS, e{" "}
          <code className="text-perry-400">⌘C</code> para copiar. No Linux e Android, e{" "}
          <code className="text-perry-400">Ctrl+C</code>. O sistema de atalhos do Perry abstrai isso,
          mas foi preciso implementacao cuidadosa para acertar.
        </li>
        <li>
          <strong>Barras de status sao surpreendentemente nao triviais.</strong> Cada plataforma tem uma convencao diferente
          para onde e como exibir informacoes de status. AppKit usa a barra inferior da janela,
          UIKit usa uma toolbar, Android usa uma view inferior no layout. O{" "}
          <code className="text-perry-400">StatusBar</code> do Perry mapeia para cada um corretamente.
        </li>
        <li>
          <strong>Suporte a stdin requer consciencia de plataforma.</strong> No macOS e Linux, ler
          do stdin e direto. No iOS e Android, &quot;stdin&quot; realmente nao existe
          da mesma forma, entao o Pry usa selecao de arquivo em plataformas moveis. O{" "}
          <code className="text-perry-400">readStdin</code> do Perry lida com isso de forma transparente.
        </li>
      </ul>

      <h2>Desempenho</h2>
      <p>
        Pry lida com arquivos JSON grandes confortavelmente. Em nossos testes:
      </p>
      <ul className="list-disc list-inside">
        <li>Um arquivo JSON de 1 MB (10.000+ nos) analisa e renderiza em menos de 50 ms</li>
        <li>Um arquivo JSON de 10 MB renderiza em menos de 200 ms</li>
        <li>Busca em 10.000 nos retorna resultados conforme voce digita, sem lag visivel</li>
        <li>Uso de memoria fica abaixo de 50 MB mesmo para arquivos grandes</li>
      </ul>
      <p>
        Esta e a vantagem da compilacao nativa. A analise JSON no Perry e compilada para
        loops nativos apertados sem pausas do GC. A renderizacao de arvore usa as proprias
        list views virtualizadas da plataforma (NSOutlineView, UITableView, RecyclerView), que sao
        testadas em batalha quanto ao desempenho.
      </p>

      <h2>Codigo-Fonte e Downloads</h2>
      <p>
        Pry e open source. Voce pode navegar pelo codigo completo, compila-lo voce mesmo, ou simplesmente olhar
        o codigo para entender como um app de UI nativa Perry e estruturado.
      </p>
      <ul className="list-disc list-inside">
        <li>
          <a href="https://github.com/nicktrebes/perry-pry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
            Repositorio GitHub
          </a>{" "}
          — codigo-fonte completo e instrucoes de build
        </li>
        <li>
          <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">
            Pagina do showcase
          </Link>{" "}
          — capturas de tela, lista de recursos e detalhes de plataforma
        </li>
      </ul>
      <p>
        Se voce esta construindo algo com Perry, adorariamos saber. Abra uma
        issue no{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          repositorio Perry
        </a>{" "}
        ou inicie uma discussao. Estamos construindo Perry abertamente e o feedback de usuarios reais
        construindo apps reais e inestimavel.
      </p>
    </>
  );
}
