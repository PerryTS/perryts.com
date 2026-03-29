import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        82 commits em sete dias. Um site de documentação com 49 páginas. Publicação automatizada na App Store e Play Store.
        Pacotes Homebrew e APT. Extensões WidgetKit nativas compiladas a partir de TypeScript.
        Um compilador LLVM auto-hospedado. E dezenas de correções de bugs em todas as plataformas.
      </p>
      <p>
        Este post cobre tudo que foi lançado no Perry entre 6 e 13 de março de 2026. O tema
        é conclusão — preencher as lacunas entre &quot;eu escrevi TypeScript&quot; e &quot;meu app
        está na App Store.&quot;
      </p>

      <h2>docs.perryts.com</h2>
      <p>
        O Perry agora tem um site de documentação de verdade. 49 páginas construídas com mdBook, cobrindo tudo desde
        primeiros passos até a referência da CLI. A documentação está organizada em seções:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Primeiros Passos</strong> — instalação, primeiro projeto, estrutura do projeto</li>
        <li><strong>Recursos da Linguagem</strong> — tudo que o Perry suporta do TypeScript</li>
        <li><strong>UI Nativa</strong> — 12 páginas cobrindo todos os tipos de widgets, layout, gerenciamento de estado e comportamento específico de plataforma</li>
        <li><strong>Plataformas</strong> — páginas dedicadas para cada uma das 6 plataformas alvo</li>
        <li><strong>Biblioteca Padrão</strong> — mais de 50 implementações de pacotes nativos documentadas</li>
        <li><strong>APIs de Sistema</strong> — diálogos de arquivo, keychain, notificações, multi-janela</li>
        <li><strong>WidgetKit</strong> — o novo módulo de extensão de widgets</li>
        <li><strong>Plugins</strong> — arquitetura de plugins em tempo de compilação</li>
        <li><strong>Referência CLI</strong> — todos os comandos e flags</li>
      </ul>
      <p>
        O site também inclui um arquivo <code className="text-amber-400">llms.txt</code> para
        descobribilidade por IA, e é implantado via GitHub Pages com um domínio personalizado em{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>.
      </p>

      <h2>Instale o Perry com Um Comando</h2>
      <p>
        O Perry agora é distribuído através do Homebrew e APT, além da compilação a partir do código-fonte. Uma nova
        pipeline de release do GitHub Actions compila binários para macOS (arm64 e x86_64) e
        Linux (x86_64 e arm64), depois atualiza automaticamente o tap do Homebrew e o repositório APT.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500"># macOS</span></p>
          <p><span className="text-cyan-400">brew</span> tap PerryTS/perry</p>
          <p><span className="text-cyan-400">brew</span> install perry</p>
          <p className="mt-3"><span className="text-slate-500"># Debian/Ubuntu</span></p>
          <p><span className="text-cyan-400">sudo</span> apt update &amp;&amp; sudo apt install perry</p>
        </div>
      </div>

      <p>
        Sem mais clonar o repo e compilar com Cargo. Instale o Perry da mesma forma que instala
        qualquer outra ferramenta.
      </p>

      <h2>Publicação Automatizada na App Store</h2>
      <p>
        Esta é a mudança que elimina o maior número de etapas manuais. Executar{" "}
        <code className="text-amber-400">perry publish ios</code> agora trata de todo o pipeline de distribuição iOS
        automaticamente:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>Gera uma chave RSA e CSR via API do App Store Connect</li>
        <li>Cria um certificado de distribuição e empacota em um <code className="text-amber-400">.p12</code></li>
        <li>Registra o bundle ID</li>
        <li>Cria e baixa um perfil de provisioning</li>
        <li>Cria o registro do app no App Store Connect</li>
        <li>Compila, assina e faz upload para o TestFlight ou App Store</li>
      </ol>
      <p>
        Sem Xcode. Sem visitas manuais ao portal. Sem download de certificados do navegador. O assistente
        de configuração roda automaticamente na primeira vez que você publica, guiando pela configuração
        da chave API e armazenando credenciais no <code className="text-amber-400">perry.toml</code>.
      </p>
      <p>
        A distribuição macOS é igualmente automatizada. O Perry suporta três modos: TestFlight, DMG notarizado
        e um novo modo <strong>&quot;ambos&quot;</strong> que publica na App Store e cria um
        DMG notarizado simultaneamente. Três tipos de certificado são gerados automaticamente:{" "}
        <code className="text-amber-400">MAC_APP_DISTRIBUTION</code>,{" "}
        <code className="text-amber-400">MAC_INSTALLER_DISTRIBUTION</code> e{" "}
        <code className="text-amber-400">DEVELOPER_ID_APPLICATION</code>.
      </p>
      <p>
        A publicação Android também ganhou um assistente de configuração automático. As três plataformas agora seguem
        o mesmo padrão: a primeira execução dispara a configuração, as credenciais são salvas no projeto, as execuções
        subsequentes são de configuração zero.
      </p>
      <p>
        A validação pré-voo captura problemas antes do build iniciar — incompatibilidade de bundle ID no
        perfil de provisioning, expiração de certificado, ícone do app ausente, formato de versão inválido, team ID errado.
        E <code className="text-amber-400">encryption_exempt</code> no{" "}
        <code className="text-amber-400">perry.toml [ios]</code> define automaticamente a chave{" "}
        <code className="text-amber-400">ITSAppUsesNonExemptEncryption</code> no Info.plist, pulando
        o prompt manual de conformidade de exportação no App Store Connect.
      </p>

      <h2>perry/widget: WidgetKit a partir de TypeScript</h2>
      <p>
        O Perry agora pode compilar TypeScript para extensões WidgetKit SwiftUI nativas. Isto não é um wrapper
        ou uma ponte — o compilador percorre a árvore de renderização no nível HIR e emite código-fonte SwiftUI
        diretamente. A saída é um bundle completo de extensão WidgetKit que o Xcode (ou o pipeline de build
        do Perry) pode incorporar no seu app.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-cyan-400">perry</span> widget.ts --target ios-widget --app-bundle-id com.example.app -o out/</p>
        </div>
      </div>

      <p>
        A abordagem é fundamentalmente diferente do resto da compilação do Perry. O código Perry normal
        passa pelo Cranelift para código de máquina nativo. O código de widget passa pelo HIR para
        saída de texto SwiftUI, porque o WidgetKit requer SwiftUI — não há como construir uma extensão de widget
        com código imperativo UIKit ou AppKit. O Perry resolve isso tratando a árvore de renderização do widget como um
        template em tempo de compilação, não código em runtime.
      </p>

      <h2>Novos Widgets e Melhorias de Plataforma</h2>
      <p>
        Quatro novos tipos de widget chegaram esta semana:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>TextArea</strong> — edição de texto multilinha no macOS, iOS e Android</li>
        <li><strong>SecureField</strong> — input de senha no iOS e macOS</li>
        <li><strong>QR Code</strong> — geração nativa de QR code no iOS, macOS e Android</li>
        <li><strong>Splash Screen</strong> — storyboards LaunchScreen gerados automaticamente (iOS) e temas splash (Android)</li>
      </ul>

      <h3>iPad Vai Nativo</h3>
      <p>
        O Perry agora gera apps totalmente nativos para iPad: <code className="text-amber-400">UIDeviceFamily [1,2]</code>,
        suporte a orientação, <code className="text-amber-400">UIRequiresFullScreen</code> e um storyboard
        LaunchScreen compilado via ibtool. Uma nova função <code className="text-amber-400">getDeviceIdiom()</code>{" "}
        detecta telefone vs. iPad em runtime, e <code className="text-amber-400">PerryFrameSplit</code>{" "}
        fornece contêineres de divisão horizontal baseados em frame para layouts iPad.
      </p>

      <h3>Windows</h3>
      <p>
        O Windows ganhou suporte a timer (tick <code className="text-amber-400">WM_TIMER</code> de 50ms),
        botões owner-drawn com fundos de tema escuro e correções para um bug de use-after-free em{" "}
        <code className="text-amber-400">to_wide().as_ptr()</code> em 18 arquivos de widget. O runtime V8
        agora funciona no Windows com as bibliotecas de sistema necessárias linkadas.
      </p>

      <h3>GTK4 (Linux)</h3>
      <p>
        O backend GTK4 recebeu polimento visual para corresponder ao macOS: padding CSS para insets de borda, estilo
        de botão Adwaita, correções de margem VStack e política horizontal de ScrollView.
      </p>

      <h2>http/https e better-sqlite3</h2>
      <p>
        Duas adições significativas à stdlib:
      </p>
      <p>
        Os novos módulos nativos <code className="text-amber-400">http</code> e{" "}
        <code className="text-amber-400">https</code> fornecem HTTP do lado do cliente
        usando reqwest internamente. A API corresponde ao Node.js:{" "}
        <code className="text-amber-400">request()</code>,{" "}
        <code className="text-amber-400">get()</code>,{" "}
        <code className="text-amber-400">ClientRequest</code> com write/end/on e{" "}
        <code className="text-amber-400">IncomingMessage</code> com statusCode e handlers de eventos.
      </p>
      <p>
        <code className="text-amber-400">better-sqlite3</code> agora é totalmente suportado:{" "}
        <code className="text-amber-400">new Database()</code>,{" "}
        <code className="text-amber-400">prepare</code>,{" "}
        <code className="text-amber-400">exec</code>,{" "}
        <code className="text-amber-400">run</code>,{" "}
        <code className="text-amber-400">get</code>,{" "}
        <code className="text-amber-400">all</code> — com NaN-boxing adequado e objetos de linha
        com acesso a propriedades nomeadas.
      </p>
      <p>
        Outras melhorias da stdlib: <code className="text-amber-400">crypto.randomBytes()</code> agora
        retorna um Buffer (correspondendo ao Node.js), MongoDB ganhou{" "}
        <code className="text-amber-400">listDatabases</code> e{" "}
        <code className="text-amber-400">listCollections</code> com correções de thread-safety, e
        INSERT/UPDATE/DELETE do mysql2 agora retorna{" "}
        <code className="text-amber-400">ResultSetHeader</code> com{" "}
        <code className="text-amber-400">insertId</code>.
      </p>

      <h2>Correções de GC e Corretude</h2>
      <p>
        Várias correções críticas de garbage collector e corretude do runtime foram lançadas esta semana:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Guarda de reentrância do GC</strong> — previne coleta durante alocação, corrigindo panics de double-borrow RefCell</li>
        <li><strong>Rastreamento de Map do GC</strong> — Maps agora são devidamente rastreados durante a fase de marcação, prevenindo coleta de chaves string</li>
        <li><strong>Correção de aliasing de strings</strong> — append de string agora sempre aloca strings novas, corrigindo corrupção de aliasing por cópia de ponteiro</li>
        <li><strong>Aritmética BigInt</strong> — deslocamento à direita usa deslocamento aritmético para números negativos, operações bitwise usam semântica de wrapping ToInt32</li>
        <li><strong>Map.get() undefined</strong> — retorna o correto <code className="text-amber-400">TAG_UNDEFINED</code> para chaves ausentes em vez da tag NaN errada</li>
        <li><strong>Raízes GC de campos estáticos</strong> — valores BigInt em campos estáticos de classe registrados como raízes GC</li>
      </ul>
      <p>
        Estas não são correções menores. A correção de reentrância do GC sozinha resolveu uma classe inteira de
        crashes intermitentes. A correção de aliasing de strings afetava qualquer programa que atribuía uma variável
        string a outra e depois modificava qualquer uma delas. Estes são os tipos de bugs que só aparecem sob cargas
        de trabalho reais, e corrigi-los é o que torna o compilador pronto para produção.
      </p>

      <h2>perry-verify: Reforçado</h2>
      <p>
        <code className="text-amber-400">perry-verify</code>, o serviço de verificação automatizada de apps,
        recebeu um passo de endurecimento de segurança: execução em sandbox via{" "}
        <code className="text-amber-400">bwrap</code> no Linux e{" "}
        <code className="text-amber-400">sandbox-exec</code> no macOS, tokens de autenticação no handshake WebSocket
        e download de binários, limitação de taxa por IP, IDs de trabalho UUID completos para prevenir enumeração
        e limites de body reduzidos.
      </p>

      <h2>perrysdad: O Compilador Auto-Hospedado</h2>
      <p>
        Em um esforço paralelo, <code className="text-amber-400">perrysdad</code> — um compilador LLVM IR auto-hospedado
        escrito em TypeScript — foi de zero a auto-compilação em cinco fases durante a semana:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li><strong>Fase 0-1</strong> — esqueleto de ponta a ponta: HIR para texto LLVM IR para clang, linkado contra <code className="text-amber-400">libperry_runtime.a</code> do Perry</li>
        <li><strong>Fase 2</strong> — parser de descida recursiva escrito à mão com parsing de expressões Pratt para arquivos <code className="text-amber-400">.ts</code> reais</li>
        <li><strong>Fase 3</strong> — arrays, objetos e maps com FFI runtime, mais a correção de um descompasso ABI crítico (JSValue declarado como double no LLVM IR em vez de i64)</li>
        <li><strong>Fase 4</strong> — classes, enums, closures, compilação multi-arquivo com descoberta de módulos e ordenação topológica</li>
      </ol>
      <p>
        O marco: o binário <code className="text-amber-400">anvil</code> auto-compilado agora pode
        compilar programas de teste e produzir saída correta correspondendo à versão compilada por node. Um compilador TypeScript,
        compilado pelo Perry para código nativo, compilando mais TypeScript para código nativo. Tartarugas
        até o fim.
      </p>

      <h2>Em Números</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>82 commits</strong> no compilador Perry principal</li>
        <li><strong>1 release</strong>: v0.2.173 (8 de março)</li>
        <li><strong>49 páginas de documentação</strong> em docs.perryts.com</li>
        <li><strong>4 novos widgets</strong>: TextArea, SecureField, QR Code, Splash Screen</li>
        <li><strong>3 canais de distribuição</strong>: Homebrew, APT, código-fonte</li>
        <li><strong>3 pipelines de store automatizados</strong>: App Store, TestFlight, Google Play</li>
        <li><strong>Todas as 6 plataformas</strong> receberam melhorias esta semana</li>
      </ul>

      <h2>Próximos Passos</h2>
      <p>
        O pipeline está se preenchendo. Você pode escrever TypeScript, compilar para seis plataformas, distribuir via
        Homebrew ou APT, publicar na App Store e Play Store, adicionar widgets na tela inicial e ler
        documentação abrangente — tudo sem sair da toolchain do Perry. O que falta:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Suporte completo a regex</strong> — a última grande lacuna da linguagem</li>
        <li><strong>Expansão do perry/ui</strong> — arrastar e soltar, rótulos de acessibilidade, DatePicker</li>
        <li><strong>Maturação do perrysdad</strong> — expandindo o compilador auto-hospedado em direção à paridade total com o Perry</li>
        <li><strong>Beta público do Hub</strong> — abrindo builds distribuídas para usuários externos</li>
      </ul>
      <p>
        Acompanhe o progresso no{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, leia a nova documentação em{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>, ou confira o{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">roadmap</Link>
        {" "}para o panorama completo.
      </p>
    </>
  );
}
