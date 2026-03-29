import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Quando lancamos a primeira versao do sistema de UI nativa do Perry, &quot;multiplataforma&quot; significava que macOS funcionava bem e as outras cinco plataformas eram stubs. Hoje, com v0.2.162, isso nao e mais verdade. Todas as seis plataformas — macOS, iOS, iPadOS, Android, Linux e Windows — agora compartilham paridade total de recursos. O mesmo codigo TypeScript compila para widgets nativos em cada alvo.
      </p>
      <p>
        Este post percorre o que lancamos entre v0.2.152 e v0.2.164: um widget Canvas, uma implementacao completa de NSTableView, mais de 20 widgets de UI no total, o modulo{" "}
        <code className="text-amber-400">perry/system</code>, suporte multi-janela, notificacoes do sistema, acesso ao keychain, reducao automatica do tamanho do binario e um sistema de plugins em tempo de compilacao. Muita coisa aconteceu.
      </p>

      <h2>O Sprint de Widgets: Mais de 20 Componentes de UI Nativos</h2>
      <p>
        O maior salto veio na v0.2.155, que trouxe mais de 20 widgets de UI em todas as plataformas. A API de UI TypeScript do Perry agora cobre os componentes que voce realmente precisa para enviar um app real:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Layout</strong> — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView</li>
        <li><strong>Entrada</strong> — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker</li>
        <li><strong>Exibicao</strong> — Text, Label, Image, ProgressView, Divider, Spacer</li>
        <li><strong>Dados</strong> — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)</li>
        <li><strong>Sobreposicao</strong> — Alert, Sheet, Popover, Toolbar, NavigationBar</li>
        <li><strong>Desenho</strong> — Canvas (API de desenho 2D, acelerada por hardware por plataforma)</li>
      </ul>
      <p>
        Estes nao sao wrappers em torno de um renderizador customizado. Cada widget compila para o componente nativo da propria plataforma: <code className="text-amber-400">NSButton</code> no macOS,{" "}
        <code className="text-amber-400">UIButton</code> no iOS,{" "}
        <code className="text-amber-400">GtkButton</code> no Linux,{" "}
        <code className="text-amber-400">android.widget.Button</code> no Android via JNI, e{" "}
        <code className="text-amber-400">CreateWindowEx</code> no Windows. O SO os desenha, aplica temas e lida com acessibilidade — Perry apenas conecta a API TypeScript.
      </p>

      <h2>Canvas: Desenho 2D a partir de TypeScript</h2>
      <p>
        Uma das adicoes mais tecnicamente interessantes e o widget Canvas (v0.2.152). Ele expoe uma API de desenho 2D familiar diretamente do TypeScript — curvas bezier, preenchimentos, tracos, blitting de imagem — e compila para o backend 2D acelerado da plataforma: Core Graphics no macOS/iOS, Cairo no Linux, Direct2D no Windows e Skia no Android.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">canvas.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Canvas, Color }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3 text-slate-500">// Compiles to Core Graphics on macOS, Cairo on Linux, etc.</p>
          <p><span className="text-blue-400">const</span> canvas = <span className="text-blue-400">new</span> <span className="text-amber-400">Canvas</span>({`{ width: 400, height: 300 }`});</p>
          <p className="mt-2">canvas.<span className="text-amber-400">onDraw</span>((ctx) =&gt; {`{`}</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillStyle</span> = Color.<span className="text-amber-400">amber</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillRect</span>(10, 10, 100, 60);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">strokeStyle</span> = Color.<span className="text-amber-400">blue</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">lineWidth</span> = 2;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">beginPath</span>();</p>
          <p className="ml-4">ctx.<span className="text-amber-400">arc</span>(200, 150, 80, 0, Math.<span className="text-amber-400">PI</span> * 2);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">stroke</span>();</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>Widget Table: NSTableView Chega ao TypeScript</h2>
      <p>
        A v0.2.163 trouxe o widget Table — o componente mais complexo da biblioteca. No macOS ele mapeia para <code className="text-amber-400">NSTableView</code> com fiacao completa de delegate/data source. No Linux usa <code className="text-amber-400">GtkTreeView</code> do GTK4. No Windows, o controle <code className="text-amber-400">ListView</code> do Win32. No Android vincula-se ao <code className="text-amber-400">RecyclerView</code> atraves de JNI.
      </p>
      <p>
        A API TypeScript e declarativa: voce define colunas, fornece uma fonte de dados e Perry lida com a fiacao especifica da plataforma em tempo de compilacao. Ordenacao de colunas, tratamento de selecao e personalizacao da altura das linhas funcionam nativamente.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">table.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Table, Column }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> table = <span className="text-blue-400">new</span> <span className="text-amber-400">Table</span>({`{`}</p>
          <p className="ml-4">columns: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Name", key: "name", width: 200 }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Size", key: "size", width: 80 }`}),</p>
          <p className="ml-4">],</p>
          <p className="ml-4">rows: files,  <span className="text-slate-500">// TypeScript array of objects</span></p>
          <p className="ml-4">onSelect: (row) =&gt; console.<span className="text-amber-400">log</span>(row.name),</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>O Modulo perry/system</h2>
      <p>
        A v0.2.155 tambem introduziu <code className="text-amber-400">perry/system</code> — um modulo TypeScript que expoe APIs de sistema da plataforma sem nenhum runtime: dialogos de arquivo, dialogos de salvamento, alertas, sheets, acesso ao keychain, notificacoes do sistema e gerenciamento multi-janela.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code className="text-amber-400">system.showOpenDialog()</code> — seletor de arquivo nativo (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)</li>
        <li><code className="text-amber-400">system.showSaveDialog()</code> — dialogo de salvamento nativo</li>
        <li><code className="text-amber-400">system.showAlert()</code> — painel de alerta nativo</li>
        <li><code className="text-amber-400">system.notify()</code> — notificacao do SO (UserNotifications / libnotify / WinRT)</li>
        <li><code className="text-amber-400">system.keychain.get/set()</code> — Keychain Services / Secret Service / Windows Credential Store</li>
        <li><code className="text-amber-400">system.openWindow()</code> — gerenciamento multi-janela</li>
      </ul>
      <p>
        Todos chamam APIs nativas da plataforma diretamente — sem IPC do Electron, sem bridge de web view. Perry compila o ponto de chamada TypeScript para uma chamada de funcao nativa direta no SDK da plataforma.
      </p>

      <h2>Paridade de Recursos em Seis Plataformas: v0.2.162</h2>
      <p>
        O marco v0.2.162 foi sobre fechar lacunas. Antes desta versao, macOS tinha o conjunto de recursos mais completo, iOS estava quase la, e Linux/Windows/Android ficavam para tras. v0.2.162 trouxe todas as seis plataformas ao mesmo nivel:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>macOS</strong> — AppKit, conjunto completo de widgets, Keychain, notificacoes, multi-janela, toolbar</li>
        <li><strong>iOS / iPadOS</strong> — UIKit, paridade total de widgets com macOS, ciclo de vida de scene</li>
        <li><strong>Android</strong> — JNI bridge, todos os widgets via Android Views, compilacao cruzada NDK</li>
        <li><strong>Linux</strong> — GTK4, conjunto completo de widgets incluindo Table, dialogos de arquivo, keychain libsecret</li>
        <li><strong>Windows</strong> — Win32, todos os widgets, Windows Credential Store, notificacoes WinRT</li>
      </ul>
      <p>
        Este e o marco que torna &quot;um codigo, seis plataformas&quot; real em vez de aspiracional. O mesmo arquivo TypeScript compila para apps nativos em todos os seis alvos sem caminhos de codigo especificos de plataforma para casos de uso comuns.
      </p>

      <h2>Reducao Automatica do Tamanho do Binario</h2>
      <p>
        A v0.2.153 trouxe a reducao automatica do tamanho do binario — o compilador agora remove agressivamente caminhos de codigo nao utilizados, elimina funcoes stdlib inalcancaveis e deduplica definicoes de simbolos durante a vinculacao. Uma ferramenta CLI tipica que anteriormente compilava para ~4 MB agora fica abaixo de 2 MB sem mudancas no seu codigo.
      </p>
      <p>
        Isso importa para implantacoes reais. Quando seu binario e a unidade de implantacao — copiado para um servidor, distribuido como um unico arquivo, embutido em um container — o tamanho afeta diretamente o tempo de transferencia e o custo de armazenamento. Reduzir pela metade o tamanho do binario gratuitamente e uma melhoria significativa.
      </p>

      <h2>O Sistema de Plugins em Tempo de Compilacao</h2>
      <p>
        A v0.2.152 introduziu o sistema de plugins do Perry — e e arquiteturalmente diferente de todos os outros sistemas de plugins no ecossistema TypeScript. Nao ha carregamento de plugins em runtime, sem IPC, sem <code className="text-amber-400">require()</code> dinamico. Plugins sao modulos TypeScript que Perry resolve e compila em tempo de build.
      </p>
      <p>
        O resultado: plugins tem exatamente zero sobrecarga de runtime. Compilam no mesmo binario que o codigo da sua aplicacao, com chamadas de funcao diretas entre codigo de plugin e codigo host. Se voce nao usa um plugin, ele nao aparece no seu binario. Se usa, e inlinado como qualquer outro modulo.
      </p>
      <p>
        Escrevemos sobre a filosofia por tras disso em{" "}
        <Link href="/blog/plugin-systems-are-a-performance-tax" className="text-amber-400 hover:text-amber-300">
          Sistemas de Plugins Sao um Imposto de Desempenho
        </Link>. A versao curta: arquiteturas de plugins em runtime trocam desempenho por extensibilidade. Composicao em tempo de build da ambos.
      </p>

      <h2>Melhorias na Linguagem</h2>
      <p>
        O sprint de UI nao aconteceu isolado — o proprio compilador continuou ficando mais capaz. Ao longo dessas versoes:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Expressoes de classe</strong> — <code className="text-amber-400">const Foo = class extends Bar {`{}`}</code> agora compila corretamente</li>
        <li><strong>Transformacoes de generators</strong> — <code className="text-amber-400">function*</code> e <code className="text-amber-400">yield</code> compilam para maquinas de estado nativas</li>
        <li><strong>Map/Set como campos de classe</strong> — <code className="text-amber-400">private items = new Map()</code> funciona no codegen</li>
        <li><strong>Coercao de tipo de parametro FFI</strong> — chamadas de biblioteca nativa lidam com coercao de tipo automaticamente</li>
        <li><strong>Referencias de metodo vinculado</strong> — referencias <code className="text-amber-400">this.method</code> funcionam para modulos nativos (fs, os, path)</li>
        <li><code className="text-amber-400">string.match()</code> — agora totalmente suportado</li>
        <li><code className="text-amber-400">path.isAbsolute()</code>, <code className="text-amber-400">path.join()</code> multi-argumento, <code className="text-amber-400">path.resolve()</code></li>
        <li><strong>Alvo web</strong> — Perry agora pode compilar para uma saida compativel com web para implantacoes hibridas</li>
      </ul>

      <h2>Proximos Passos</h2>
      <p>
        Com a paridade de UI em seis plataformas entregue, a proxima fase e profundidade em vez de largura. Estamos trabalhando em:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Suporte completo a RegExp (<code className="text-amber-400">regex.test()</code>, <code className="text-amber-400">string.matchAll()</code>)</li>
        <li>Arrastar e soltar, menus de contexto customizados e labels de acessibilidade no sistema de widgets</li>
        <li>Uma extensao VS Code para diagnosticos Perry e compilar ao salvar</li>
        <li>Integracao com gerenciador de pacotes — instalar e compilar pacotes Perry nativos com um comando</li>
        <li>Alvo de compilacao WASM para implantacao em navegador</li>
        <li>Multi-threading via threads <code className="text-amber-400">Worker</code></li>
      </ul>
      <p>
        Se voce quiser acompanhar, o{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          repositorio Perry
        </a>{" "}
        e aberto. Confira o{" "}
        <Link href="/showcase" className="text-amber-400 hover:text-amber-300">showcase</Link>
        {" "}para ver o que ja esta sendo construido, ou navegue pelo{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">roadmap</Link>
        {" "}para o panorama completo.
      </p>
    </>
  );
}
