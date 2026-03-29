import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        103 commits no compilador Perry esta semana. Os destaques: agora &eacute; poss&iacute;vel fazer cross-compile de execut&aacute;veis Windows a partir do Linux, apps iOS podem executar game loops bloqueantes, o compilador reporta crashes para telemetria, e o compilador self-hosting passa todos os testes determin&iacute;sticos que lhe aplicamos. Al&eacute;m de uma grande atualiza&ccedil;&atilde;o da infraestrutura Hub e mais de 50 corre&ccedil;&otilde;es de bugs.
      </p>

      <h2>Cross-Compile para Windows a partir do Linux</h2>
      <p>
        O Perry agora pode produzir bin&aacute;rios Windows <code className="text-amber-400">.exe</code> a partir de um host Linux. Esta &eacute; a pe&ccedil;a que faltava para pipelines CI/CD que precisam visar Windows sem executar uma m&aacute;quina de build Windows para toda a compila&ccedil;&atilde;o.
      </p>
      <p>
        A implementa&ccedil;&atilde;o substitui verifica&ccedil;&otilde;es <code className="text-amber-400">#[cfg]</code> em tempo de compila&ccedil;&atilde;o por detec&ccedil;&atilde;o de target em runtime. Quando o compilador detecta um target Windows num host n&atilde;o-Windows, localiza <code className="text-amber-400">lld-link</code>,{" "}
        <code className="text-amber-400">llvm-nm</code> e{" "}
        <code className="text-amber-400">llvm-ar</code> a partir da toolchain Rust ou do PATH atrav&eacute;s de um novo helper <code className="text-amber-400">find_llvm_tool()</code>. As bibliotecas de sistema Windows v&ecirc;m de um sysroot estilo{" "}
        <a href="https://github.com/Jake-Shadle/xwin" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          xwin
        </a>{" "}
        apontado por <code className="text-amber-400">PERRY_WINDOWS_SYSROOT</code>.
      </p>
      <p>
        O linker usa automaticamente <code className="text-amber-400">/FORCE:UNRESOLVED</code> e gera stubs para s&iacute;mbolos de UI em falta, para que apps CLI fa&ccedil;am cross-compile sem problemas. A sa&iacute;da &eacute; por padr&atilde;o <code className="text-amber-400">.exe</code> quando o target &eacute; Windows. Os detalhes completos est&atilde;o na{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          documenta&ccedil;&atilde;o de cross-compila&ccedil;&atilde;o
        </a>.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal — Linux host</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile main.ts --target windows</p>
          <p className="text-slate-500">Compiling main.ts for windows-x86_64...</p>
          <p className="text-slate-500">Using lld-link from Rust toolchain</p>
          <p className="text-green-400">&#x2713; Compiled executable: main.exe (2.8 MB)</p>
        </div>
      </div>

      <h2>Suporte a Game Loop no iOS</h2>
      <p>
        O iOS exige que o UIKit seja dono da thread principal. Isso &eacute; adequado para apps baseadas em eventos, mas &eacute; um problema para jogos que precisam de um loop bloqueante <code className="text-amber-400">while (!shouldClose)</code>. O Perry agora resolve isso com a flag <code className="text-amber-400">--features ios-game-loop</code>.
      </p>
      <p>
        Quando ativado, o compilador emite{" "}
        <code className="text-amber-400">_perry_user_main</code> em vez de{" "}
        <code className="text-amber-400">main</code>. O runtime fornece uma{" "}
        <code className="text-amber-400">main()</code> que chama{" "}
        <code className="text-amber-400">UIApplicationMain</code> na thread principal e inicia o seu c&oacute;digo numa thread em segundo plano. O scene delegate e o app delegate gerem o ciclo de vida completo do UIKit enquanto o seu game loop executa sem bloqueios.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">main.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">// Your game loop runs on a background thread</span></p>
          <p><span className="text-blue-400">while</span> (!shouldClose) {"{"}</p>
          <p>  update();</p>
          <p>  render();</p>
          <p>  awaitNextFrame();</p>
          <p>{"}"}</p>
        </div>
      </div>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> run ios --features ios-game-loop</p>
        </div>
      </div>

      <p>
        Isto permite uma categoria inteira de apps — jogos, simula&ccedil;&otilde;es, visualiza&ccedil;&otilde;es em tempo real — que n&atilde;o eram pr&aacute;ticas no iOS antes. Os caminhos de pump e callback do iOS agora tamb&eacute;m est&atilde;o envolvidos em tratamento de panic, para que crashes tanto no game loop quanto no ciclo de vida do UIKit sejam capturados de forma limpa.
      </p>

      <h2>Relat&oacute;rio de Crashes</h2>
      <p>
        Apps compiladas com Perry agora instalam um hook de panic e handlers de sinal para{" "}
        <code className="text-amber-400">SIGSEGV</code>,{" "}
        <code className="text-amber-400">SIGBUS</code> e{" "}
        <code className="text-amber-400">SIGABRT</code> na inicializa&ccedil;&atilde;o. Quando um crash fatal ocorre, os detalhes s&atilde;o escritos em <code className="text-amber-400">~/.hone/crash.log</code> para o sistema de telemetria Chirp. Panics capturados (em{" "}
        <code className="text-amber-400">catch_callback_panic</code>) limpam o log, para que apenas crashes genuinamente irrecuper&aacute;veis sejam reportados.
      </p>
      <p>
        Esta &eacute; uma funcionalidade de prontid&atilde;o para produ&ccedil;&atilde;o. Quando algo corre mal em campo, vamos saber — e o log de crash inclui contexto suficiente para diagnosticar o problema sem exigir que os utilizadores reportem nada manualmente.
      </p>

      <h2>Hub: Pipeline de Build Windows em Duas Fases</h2>
      <p>
        A infraestrutura de build do Perry Hub recebeu uma atualiza&ccedil;&atilde;o arquitetural significativa. Anteriormente, a build para Windows exigia um worker Windows para toda a compila&ccedil;&atilde;o. Agora o pipeline divide-se em duas fases:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>Um worker Linux faz cross-compile do artefacto Windows usando o novo suporte lld-link</li>
        <li>O Hub mant&eacute;m o artefacto pr&eacute;-compilado e recoloca o job na fila para um worker Windows</li>
        <li>O worker Windows apenas trata da assinatura e empacotamento — uma tarefa muito mais leve</li>
      </ol>
      <p>
        Quando um worker envia <code className="text-amber-400">complete</code> com{" "}
        <code className="text-amber-400">needs_finishing: &quot;windows&quot;</code>, o Hub recoloca transparentemente o job na fila. A CLI v&ecirc; uma experi&ecirc;ncia de build &uacute;nica e cont&iacute;nua.
      </p>
      <p>
        O Hub agora tamb&eacute;m inicia automaticamente VMs Azure Windows quando nenhum worker Windows est&aacute; conectado, e os workers de build atualizam-se automaticamente para a vers&atilde;o mais recente do Perry em novos lan&ccedil;amentos. Menos gest&atilde;o manual de infraestrutura, builds mais r&aacute;pidas.
      </p>

      <h2>Revis&atilde;o da Documenta&ccedil;&atilde;o</h2>
      <p>
        Duas grandes reescritas de documenta&ccedil;&atilde;o foram publicadas esta semana em{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>Refer&ecirc;ncia perry.toml</strong> — documenta&ccedil;&atilde;o completa de se&ccedil;&otilde;es cobrindo cada op&ccedil;&atilde;o de configura&ccedil;&atilde;o, resolu&ccedil;&atilde;o de bundle ID, resolu&ccedil;&atilde;o de ficheiro de entrada, auto-incremento do n&uacute;mero de build e exemplos CI/CD
        </li>
        <li>
          <strong>Refer&ecirc;ncia Geisterhand</strong> — documenta&ccedil;&atilde;o completa da API, configura&ccedil;&atilde;o de plataforma, padr&otilde;es de automa&ccedil;&atilde;o de testes e vis&atilde;o geral da arquitetura para o framework de testes de UI cross-platform
        </li>
      </ul>
      <p>
        Estas n&atilde;o s&atilde;o atualiza&ccedil;&otilde;es incrementais. Ambas s&atilde;o reescritas completas que cobrem cada funcionalidade e op&ccedil;&atilde;o de configura&ccedil;&atilde;o. Se est&aacute; a configurar um novo projeto ou a escrever testes, comece aqui.
      </p>

      <h2>APIs de Menu Cross-Platform</h2>
      <p>
        <code className="text-amber-400">menuClear</code> e{" "}
        <code className="text-amber-400">menuAddStandardAction</code> eram anteriormente exclusivos do macOS. Agora funcionam nas 6 plataformas nativas. Isto tamb&eacute;m inclui uma corre&ccedil;&atilde;o para um panic de re-entrancy de <code className="text-amber-400">RefCell</code> em{" "}
        <code className="text-amber-400">dispatch_menu_item</code> no Windows.
      </p>

      <h3>Android: Alinhamento de P&aacute;gina de 16 KB</h3>
      <p>
        O Google Play agora exige alinhamento de p&aacute;gina de 16 KB para bibliotecas nativas. O Perry define automaticamente os <code className="text-amber-400">CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS</code>{" "}
        apropriados, e ficheiros <code className="text-amber-400">.so</code> complementares s&atilde;o copiados junto &agrave; sa&iacute;da para inclus&atilde;o em APK/AAB.
      </p>

      <h2>Perry React: Quadro Kanban</h2>
      <p>
        A camada de compatibilidade React recebeu um teste real: um quadro Kanban completo de 5 colunas com opera&ccedil;&otilde;es de mover, adicionar, eliminar e visualizar. Constru&iacute;-lo revelou e corrigiu a renderiza&ccedil;&atilde;o de children de arrays aninhados em JSX — o handler recursivo{" "}
        <code className="text-amber-400">_appendChildren</code> agora aplana corretamente arrays retornados de chamadas <code className="text-amber-400">.map()</code>. Tamb&eacute;m h&aacute; uma nova demo Kitchen Sink WorkBench de 14 sec&ccedil;&otilde;es cobrindo v&aacute;rios padr&otilde;es de UI.
      </p>

      <h2>Anvil: 100% de Paridade em Testes Determin&iacute;sticos</h2>
      <p>
        <code className="text-amber-400">perrysdad</code> — o compilador LLVM self-hosting escrito em TypeScript e compilado pelo Perry — agora passa <strong>68 de 68</strong> testes determin&iacute;sticos, correspondendo exatamente &agrave; sa&iacute;da do compilador principal. As &uacute;nicas diferen&ccedil;as s&atilde;o inerentes (timestamps, <code className="text-amber-400">Math.random()</code>), e 11 testes s&atilde;o ignorados porque requerem UI, timers, crypto ou funcionalidades espec&iacute;ficas de plataforma ainda n&atilde;o implementadas.
      </p>
      <p>
        Trabalho chave que levou a este resultado:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Dispatch de m&eacute;todos de interface</strong> — vari&aacute;veis tipadas como interface agora retornam m&eacute;todos corretos via dispatch baseado em class_id no ObjectHeader</li>
        <li><strong>Acesso din&acirc;mico a propriedades</strong> — dispatch em runtime para nomes de propriedades calculados</li>
        <li><strong>Closures e this-binding</strong> — sem&acirc;ntica de captura correta para m&eacute;todos de objetos</li>
        <li><strong>Fase 6 em progresso</strong> — async/await, geradores e corre&ccedil;&otilde;es de condi&ccedil;&otilde;es</li>
      </ul>
      <p>
        100% de paridade em testes determin&iacute;sticos &eacute; um marco significativo. Significa que o bin&aacute;rio{" "}
        <code className="text-amber-400">anvil</code> auto-compilado produz exatamente a mesma sa&iacute;da que o compilador principal para cada cen&aacute;rio test&aacute;vel. A diferen&ccedil;a est&aacute; a diminuir rumo ao self-hosting completo.
      </p>

      <h2>Mais de 50 Corre&ccedil;&otilde;es de Bugs</h2>
      <p>
        Uma grande investida na corre&ccedil;&atilde;o esta semana. Destaques:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>JSON.parse</strong> — arrays j&aacute; n&atilde;o s&atilde;o truncados em 16 elementos, input inv&aacute;lido tratado corretamente</li>
        <li><strong>Uint8Array</strong> — construtor a partir de vari&aacute;vel array, implementa&ccedil;&atilde;o de <code className="text-amber-400">.set(source, offset)</code> (era um no-op)</li>
        <li><strong>BigInt</strong> — NaN-boxing com <code className="text-amber-400">BIGINT_TAG</code> para chamadas cross-module, corre&ccedil;&otilde;es de truncamento de 32 bits do keccak256</li>
        <li><strong>Optional chaining</strong> — express&otilde;es condicionais aninhadas, dete&ccedil;&atilde;o de toString, NaN-boxing do valor de retorno</li>
        <li><strong>IndexSet</strong> — NaN-boxing de strings corrigido para usar <code className="text-amber-400">STRING_TAG</code> em vez de <code className="text-amber-400">POINTER_TAG</code></li>
        <li><strong>MySQL</strong> — tipos DATETIME e BLOB, construtor <code className="text-amber-400">Date(string)</code></li>
        <li><strong>Math.min/max</strong> — tratamento de argumentos spread</li>
        <li><strong>Dispatch de m&eacute;todos nativos</strong> — field-scan-and-call para objetos <code className="text-amber-400">POINTER_TAG</code></li>
      </ul>
      <p>
        Estes n&atilde;o s&atilde;o casos extremos. JSON.parse a truncar arrays em 16 elementos quebraria qualquer aplica&ccedil;&atilde;o real. Uint8Array.set como no-op corromperia silenciosamente os dados. Estas s&atilde;o as corre&ccedil;&otilde;es que tornam o compilador pronto para produ&ccedil;&atilde;o, um bug de corre&ccedil;&atilde;o de cada vez.
      </p>

      <h2>Em N&uacute;meros</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>103 commits</strong> no compilador principal Perry</li>
        <li><strong>3 vers&otilde;es</strong>: v0.2.195, v0.2.196, v0.2.197</li>
        <li><strong>1 funcionalidade principal</strong>: cross-compile Windows a partir do Linux</li>
        <li><strong>1 nova categoria de app</strong>: game loops iOS</li>
        <li><strong>68/68</strong> paridade de testes determin&iacute;sticos no perrysdad</li>
        <li><strong>Mais de 50 corre&ccedil;&otilde;es de bugs</strong> em NaN-boxing, stdlib e FFI nativo</li>
        <li><strong>2 reescritas de documenta&ccedil;&atilde;o</strong>: perry.toml e Geisterhand</li>
        <li><strong>5 melhorias no Hub</strong>: pipeline de duas fases, arranque autom&aacute;tico Azure, atualiza&ccedil;&atilde;o autom&aacute;tica de workers</li>
      </ul>

      <h2>Pr&oacute;ximos Passos</h2>
      <p>
        A cross-compila&ccedil;&atilde;o para Windows abre a porta para CI/CD multi-plataforma totalmente automatizado — fa&ccedil;a push de TypeScript, obtenha bin&aacute;rios nativos para cada target sem m&aacute;quinas de build dedicadas para cada SO. O suporte a game loop desbloqueia toda uma nova categoria de apps iOS. E 100% de paridade de testes determin&iacute;sticos no perrysdad significa que o self-hosting est&aacute; a tornar-se muito real. O que resta:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Suporte completo a regex</strong> — a &uacute;ltima grande lacuna da linguagem</li>
        <li><strong>Expans&atilde;o do perry/ui</strong> — drag and drop, r&oacute;tulos de acessibilidade, DatePicker</li>
        <li><strong>perrysdad Fase 6</strong> — async/await, geradores, expandindo rumo &agrave; paridade completa com Perry</li>
        <li><strong>Beta p&uacute;blica do Hub</strong> — abertura de builds distribu&iacute;das a utilizadores externos</li>
      </ul>
      <p>
        Acompanhe o progresso no{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, leia a documenta&ccedil;&atilde;o em{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>, ou consulte o{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">roadmap</Link>
        {" "}para o panorama completo.
      </p>
    </>
  );
}
