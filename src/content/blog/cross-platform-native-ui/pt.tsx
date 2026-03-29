import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Um dos objetivos mais ambiciosos do Perry e fornecer aplicacoes GUI verdadeiramente nativas
        a partir de um unico codigo TypeScript. Nao sao web views envolvidas em uma casca nativa. Nao e
        um motor de renderizacao customizado desenhando seus proprios pixels. Widgets nativos reais, renderizados pelo
        framework de UI proprio de cada plataforma, compilados a partir de TypeScript em tempo de build.
      </p>
      <p>
        Este post explica como funciona — a arquitetura, o mapeamento de plataformas, os compromissos
        e onde estamos hoje.
      </p>

      <h2>O Problema com as Abordagens Atuais</h2>
      <p>
        O desenvolvimento de GUI multiplataforma tem sido um problema dificil por decadas. Cada grande
        framework fez um conjunto diferente de compromissos:
      </p>

      <h3>Electron / Tauri (Baseados em Web)</h3>
      <p>
        Electron empacota Chromium e Node.js, dando a voce um navegador web como shell do seu aplicativo.
        Voce tem acesso total a plataforma web, mas seu aplicativo &quot;nativo&quot; e um download de 150+ MB
        que usa centenas de megabytes de RAM so para mostrar uma janela. Tauri substitui
        Chromium pela web view do SO, reduzindo drasticamente o tamanho, mas sua UI ainda e HTML/CSS
        renderizado em uma web view — nao widgets nativos.
      </p>

      <h3>React Native (Baseado em Bridge)</h3>
      <p>
        React Native roda seu JavaScript em um motor JS (Hermes ou V8) e faz ponte para widgets
        nativos atraves de uma fila de mensagens serializadas. Voce obtem widgets nativos reais, mas a ponte
        adiciona latencia, especialmente para gestos e animacoes. Interacoes complexas exigem
        descer para codigo nativo (Swift/Kotlin), anulando a promessa de codigo unico.
      </p>

      <h3>Flutter (Renderizador customizado)</h3>
      <p>
        Flutter compila Dart para codigo nativo e desenha tudo com seu proprio motor de renderizacao
        baseado em Skia. O desempenho e excelente, mas seus widgets nao sao nativos — sao
        replicas perfeitas em pixels. Isso significa que convencoes de plataforma (fisica de rolagem, selecao de texto,
        comportamentos de acessibilidade) precisam ser reimplementadas em vez de herdadas. E no desktop,
        as diferencas se tornam mais notaveis.
      </p>

      <h3>KMP + Compose Multiplatform (Parcialmente nativo)</h3>
      <p>
        Kotlin Multiplatform compila para JVM no Android e nativo no iOS, mas UI compartilhada atraves de
        Compose Multiplatform usa um renderizador baseado em Skia — mesmo compromisso que Flutter. Para
        UI verdadeiramente nativa, voce volta a escrever codigo especifico de plataforma.
      </p>

      <h2>Abordagem do Perry: Compilar para Toolkits Nativos</h2>
      <p>
        Perry adota uma abordagem fundamentalmente diferente. Em vez de rodar seu codigo em um runtime
        e fazer ponte para widgets nativos, ou desenhar pixels customizados, Perry compila seu codigo de
        UI TypeScript diretamente em chamadas ao toolkit nativo de cada plataforma em tempo de build.
      </p>
      <p>
        A diferenca chave: <strong>nao ha camada de runtime entre seu codigo e o SDK da plataforma.</strong>{" "}
        O binario compilado chama AppKit, UIKit, Android Views, GTK4 ou Win32 diretamente, exatamente
        como um app escrito em Swift, Kotlin ou C++ faria.
      </p>

      <h2>A API de UI Unificada</h2>
      <p>
        Perry fornece uma API TypeScript comum para construir interfaces de usuario. Esta API e
        deliberadamente de alto nivel — voce descreve o que sua UI deve conter e como deve
        se comportar, e Perry mapeia para as construcoes nativas apropriadas.
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">Text</span>, <span className="text-cyan-400">Button</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">State</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">count</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Counter&quot;</span>, {"{"} width: <span className="text-orange-400">400</span>, height: <span className="text-orange-400">300</span> {"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">16</span>, alignment: <span className="text-green-400">&quot;center&quot;</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">Text</span>(<span className="text-green-400">`Count: ${"{"}<span className="text-cyan-400">count</span>.value{"}"}`</span>, {"{"} fontSize: <span className="text-orange-400">32</span> {"}"}),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Increment&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value++),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Reset&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value = <span className="text-orange-400">0</span>),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        Este mesmo codigo compila para UI nativa em todas as seis plataformas. Sem <code className="text-perry-400">#ifdef</code>,
        sem verificacoes de plataforma, sem imports condicionais.
      </p>

      <h2>Mapeamento de Plataformas em Detalhe</h2>
      <p>
        Veja como Perry mapeia a API unificada para o framework nativo de cada plataforma:
      </p>

      <h3>macOS — AppKit</h3>
      <p>
        No macOS, Perry gera codigo que cria e gerencia objetos AppKit diretamente.
        Um <code className="text-perry-400">App</code> se torna um <code className="text-perry-400">NSApplication</code> com
        um <code className="text-perry-400">NSWindow</code>.{" "}
        <code className="text-perry-400">Text</code> se torna <code className="text-perry-400">NSTextField</code> (com edicao desativada).{" "}
        <code className="text-perry-400">Button</code> se torna <code className="text-perry-400">NSButton</code> com um padrao target-action
        conectado ao seu callback.{" "}
        <code className="text-perry-400">VStack</code> se torna um <code className="text-perry-400">NSStackView</code> com orientacao
        vertical. O layout usa restricoes Auto Layout.
      </p>
      <p>
        O binario compilado vincula-se ao framework AppKit e chama funcoes do runtime Objective-C
        diretamente. E a mesma coisa que Swift compilado pelo Xcode faria.
      </p>

      <h3>iOS &amp; iPadOS — UIKit</h3>
      <p>
        No iOS, o mapeamento e similar, mas visa UIKit.{" "}
        <code className="text-perry-400">App</code> se torna um <code className="text-perry-400">UIApplication</code> com
        um <code className="text-perry-400">UIWindow</code> e <code className="text-perry-400">UIViewController</code> raiz.{" "}
        <code className="text-perry-400">Text</code> mapeia para <code className="text-perry-400">UILabel</code>.{" "}
        <code className="text-perry-400">Button</code> mapeia para <code className="text-perry-400">UIButton</code>.{" "}
        O layout usa <code className="text-perry-400">UIStackView</code> e Auto Layout.
        Eventos de toque sao tratados pela cadeia de respondedores do UIKit.
      </p>

      <h3>Android — JNI + Views</h3>
      <p>
        No Android, Perry gera uma biblioteca nativa carregada via JNI (Java Native Interface).{" "}
        <code className="text-perry-400">App</code> mapeia para uma <code className="text-perry-400">Activity</code>.{" "}
        <code className="text-perry-400">Text</code> se torna um <code className="text-perry-400">TextView</code>.{" "}
        <code className="text-perry-400">Button</code> se torna um <code className="text-perry-400">android.widget.Button</code> com
        um <code className="text-perry-400">OnClickListener</code>.{" "}
        <code className="text-perry-400">VStack</code> mapeia para um <code className="text-perry-400">LinearLayout</code> vertical.
        O codigo nativo chama de volta o framework Android atraves de JNI, criando e
        manipulando views Android reais.
      </p>

      <h3>Linux — GTK4</h3>
      <p>
        No Linux, Perry usa GTK4.{" "}
        <code className="text-perry-400">App</code> se torna um <code className="text-perry-400">GtkApplication</code> com
        um <code className="text-perry-400">GtkApplicationWindow</code>.{" "}
        <code className="text-perry-400">Text</code> mapeia para <code className="text-perry-400">GtkLabel</code>.{" "}
        <code className="text-perry-400">Button</code> mapeia para <code className="text-perry-400">GtkButton</code> com
        um manipulador de sinal.{" "}
        <code className="text-perry-400">VStack</code> mapeia para um <code className="text-perry-400">GtkBox</code> com orientacao
        vertical. O CSS theming do GTK significa que seu aplicativo segue automaticamente o tema
        da area de trabalho do usuario.
      </p>

      <h3>Windows — Win32</h3>
      <p>
        No Windows, Perry gera chamadas da API Win32.{" "}
        <code className="text-perry-400">App</code> cria uma classe de janela, registra-a e roda um loop de
        mensagens.{" "}
        <code className="text-perry-400">Button</code> se torna um controle <code className="text-perry-400">BUTTON</code>
        criado com <code className="text-perry-400">CreateWindowEx</code>.{" "}
        <code className="text-perry-400">Text</code> mapeia para um controle <code className="text-perry-400">STATIC</code>.
        Eventos sao tratados pelo message pump do Win32 (<code className="text-perry-400">WM_COMMAND</code>,{" "}
        <code className="text-perry-400">WM_NOTIFY</code>, etc.).
      </p>

      <h2>Gerenciamento de Estado</h2>
      <p>
        O primitivo <code className="text-perry-400">State&lt;T&gt;</code> do Perry fornece gerenciamento de
        estado reativo que compila para mecanismos de atualizacao nativos da plataforma. Quando um
        valor de estado muda, Perry dispara uma atualizacao de UI atraves do proprio
        sistema de invalidacao da plataforma — <code className="text-perry-400">setNeedsDisplay</code> no macOS/iOS,{" "}
        <code className="text-perry-400">invalidate()</code> no Android,{" "}
        <code className="text-perry-400">gtk_widget_queue_draw</code> no Linux.
      </p>
      <p>
        Nao ha diffing de DOM virtual, nenhuma passagem de reconciliacao, nenhuma serializacao. Mudancas
        de estado propagam diretamente para o widget nativo que exibe o valor.
      </p>

      <h2>Por Que Nao a Sintaxe SwiftUI / Jetpack Compose?</h2>
      <p>
        Voce pode se perguntar por que Perry nao usa uma sintaxe declarativa similar ao SwiftUI ou
        Jetpack Compose. A resposta e pragmatica: Perry compila TypeScript, e TypeScript
        tem seus proprios idiomas. Em vez de inventar uma DSL que parece estranha para desenvolvedores
        TypeScript, Perry usa uma API estilo builder que parece natural em TypeScript — construtores,
        chamadas de metodo, callbacks e closures. Sao os mesmos padroes que voce ja usa ao
        trabalhar com Express, React hooks ou qualquer outra biblioteca TypeScript.
      </p>

      <h2>O Que Esta Disponivel Hoje</h2>
      <p>
        Todos os seis backends de plataforma estao implementados e estaveis. O conjunto atual de widgets inclui:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Layout</strong> — VStack, HStack, Spacer, ScrollView, Divider</li>
        <li><strong>Exibicao</strong> — Text, Image</li>
        <li><strong>Entrada</strong> — Button, TextField, Toggle, Slider</li>
        <li><strong>Navegacao</strong> — NavigationView, TabView, List</li>
        <li><strong>Conteineres</strong> — TreeView, SearchBar, StatusBar</li>
        <li><strong>Estado</strong> — State&lt;T&gt; para atualizacoes reativas</li>
      </ul>

      <h2>O Que Vem a Seguir</h2>
      <p>
        Estamos expandindo ativamente a biblioteca de widgets. Proximos itens:
      </p>
      <ul className="list-disc list-inside">
        <li><code className="text-perry-400">SecureField</code> — entrada de senha com campo de texto seguro nativo da plataforma</li>
        <li><code className="text-perry-400">ProgressView</code> — indicadores de progresso determinado e indeterminado</li>
        <li><code className="text-perry-400">Alert</code> — dialogos de alerta nativos com botoes e campos de texto</li>
        <li><code className="text-perry-400">DatePicker</code> — selecao de data/hora nativa da plataforma</li>
        <li><code className="text-perry-400">Menu</code> — barras de menu e menus de contexto nativos</li>
      </ul>
      <p>
        O objetivo e paridade total de framework GUI entre todas as plataformas — cada widget, layout,
        gesto e animacao disponivel em todos os lugares. Veja o{" "}
        <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">roadmap</Link> para o
        panorama completo.
      </p>

      <h2>Experimente</h2>
      <p>
        A melhor maneira de entender a UI nativa do Perry e ve-la em acao.{" "}
        <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">Pry</Link> e um visualizador
        JSON nativo construido inteiramente em TypeScript com Perry — um app real com navegacao em arvore,
        busca e atalhos de teclado, compilado para binarios nativos no macOS, iOS e Android.
        Leia o{" "}
        <Link href="/blog/building-pry" className="text-perry-400 hover:text-perry-300">passo a passo completo</Link>{" "}
        de como foi construido.
      </p>
    </>
  );
}
