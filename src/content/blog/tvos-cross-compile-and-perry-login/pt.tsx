import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Cinco dias, 120 commits, e o Perry salta de v0.4.0 para v0.4.24. Os destaques: tvOS torna-se o 10.&ordm; alvo de compila&ccedil;&atilde;o, apps iOS e macOS podem agora ser constru&iacute;das inteiramente a partir do Linux, perry login traz fatura&ccedil;&atilde;o baseada em utiliza&ccedil;&atilde;o, e o UI do Windows recebe uma reformula&ccedil;&atilde;o completa. Aqui est&aacute; tudo o que foi lan&ccedil;ado.
      </p>

      <h2>tvOS: O 10.&ordm; Alvo de Compila&ccedil;&atilde;o</h2>
      <p>
        O Perry agora compila para Apple TV. O alvo tvOS usa o mesmo renderizador SwiftUI que o watchOS, partilhando a arquitetura orientada por dados onde o Perry constr&oacute;i uma &aacute;rvore de UI e uma app Swift host enviada renderiza-a nativamente. Combinado com a integra&ccedil;&atilde;o WASM <code>@perry/threads</code> existente, apps tvOS podem executar cargas de trabalho computacionalmente pesadas em segundo plano enquanto mant&ecirc;m a UI responsiva.
      </p>
      <pre><code>{`# Compile for Apple TV
perry compile main.ts --target tvos

# Run on tvOS simulator
perry run tvos`}</code></pre>
      <p>
        Isto eleva a contagem total de alvos para <strong>10</strong>: macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly e Web/JavaScript. Uma base de c&oacute;digo TypeScript, dez sa&iacute;das nativas.
      </p>

      <h2>Cross-Compile iOS e macOS a partir do Linux</h2>
      <p>
        O Perry agora pode construir bin&aacute;rios iOS e macOS inteiramente a partir de uma m&aacute;quina Linux usando <code>ld64.lld</code> como linker Mach-O. Esta &eacute; a pe&ccedil;a que faltava para CI/CD totalmente automatizado — fa&ccedil;a push de TypeScript para um servidor Linux, obtenha bin&aacute;rios nativos assinados para cada plataforma Apple sem uma m&aacute;quina de build macOS.
      </p>
      <p>
        Chegar aqui exigiu resolver uma cascata de problemas do linker:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Triple de codegen Mach-O</strong> — adicionados triples de alvo <code>aarch64-apple-macos</code> e <code>aarch64-apple-ios</code> para Cranelift</li>
        <li><strong>Linkagem de frameworks</strong> — caminhos de pesquisa de frameworks CoreGraphics, Metal, IOKit, DiskArbitration para cross-compile</li>
        <li><strong><code>-lobjc</code></strong> — s&iacute;mbolos do runtime ObjC necess&aacute;rios para todos os alvos Apple</li>
        <li><strong>Vers&atilde;o SDK</strong> — <code>sdk_version 26.0</code> no ld64.lld (Apple requer iOS 18+)</li>
        <li><strong>Remo&ccedil;&atilde;o de c&oacute;digo morto</strong> — <code>-dead_strip</code> em vez de <code>-Wl,-dead_strip</code> para o linker Mach-O</li>
        <li><strong>Deduplica&ccedil;&atilde;o do runtime</strong> — remover <code>perry_runtime</code> duplicado de libs est&aacute;ticas UI para evitar erros de linkagem</li>
      </ul>
      <p>
        Combinado com a cross-compila&ccedil;&atilde;o existente Linux → Windows (v0.2.195+), o Perry agora pode fazer cross-compile para <strong>todas as plataformas a partir do Linux</strong> — iOS, macOS, Windows, Android, WASM e Web.
      </p>

      <h2>Prontid&atilde;o para a App Store iOS</h2>
      <p>
        Um foco importante deste ciclo foi tornar apps iOS compiladas com Perry totalmente compat&iacute;veis com a App Store:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Info.plist completo</strong> — todas as chaves requeridas pela Apple: <code>CFBundleIdentifier</code>, <code>CFBundleName</code>, <code>CFBundleShortVersionString</code>, <code>CFBundleVersion</code>, <code>UIDeviceFamily</code>, <code>UIRequiredDeviceCapabilities</code></li>
        <li><strong>CFBundleIcons</strong> — nomea&ccedil;&atilde;o padr&atilde;o de &iacute;cones iOS (<code>AppIcon60x60@2x</code>, etc.) com resolu&ccedil;&atilde;o de fallback</li>
        <li><strong>Vers&atilde;o do perry.toml</strong> — campos <code>version</code> e <code>build_number</code> fluem diretamente para o Info.plist</li>
        <li><strong>UILaunchScreen</strong> — usa a chave moderna em vez de <code>UILaunchStoryboardName</code> (sem ficheiro storyboard necess&aacute;rio)</li>
        <li><strong>Perfis de aprovisionamento</strong> — suporte a perfis de aprovisionamento macOS para distribui&ccedil;&atilde;o App Store e TestFlight</li>
      </ul>

      <h2>Perry Login e Fatura&ccedil;&atilde;o</h2>
      <p>
        O Perry agora tem contas e fatura&ccedil;&atilde;o baseada em utiliza&ccedil;&atilde;o, alimentado por um novo comando CLI <code>perry login</code> e um painel em <a href="https://app.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">app.perryts.com</a>.
      </p>
      <h3>Como Funciona</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry login</code></strong> — fluxo de dispositivo GitHub OAuth, abre browser, faz polling para conclus&atilde;o</li>
        <li><strong>Plano gratuito</strong> — 15 builds/m&ecirc;s, projetos ilimitados com conta GitHub</li>
        <li><strong>Plano Pro</strong> — builds ilimitados via subscri&ccedil;&atilde;o Polar.sh</li>
        <li><strong>Tokens API</strong> — gere e administre tokens a partir do painel para CI/CD</li>
        <li><strong>Rastreio de utiliza&ccedil;&atilde;o</strong> — contadores mensais de publish e verify com barras de utiliza&ccedil;&atilde;o em tempo real</li>
      </ul>
      <p>
        O pr&oacute;prio painel &eacute; um servidor Fastify compilado com Perry com uma exporta&ccedil;&atilde;o est&aacute;tica Next.js — constru&iacute;do com Perry, servindo utilizadores Perry.
      </p>

      <h2>Notariza&ccedil;&atilde;o macOS e Assinatura de C&oacute;digo</h2>
      <p>
        Duas novas capacidades de assinatura:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry publish macos --notarize</code></strong> — muda automaticamente para certificado Developer ID (em vez de certificado App Store), submete ao servi&ccedil;o de notariza&ccedil;&atilde;o da Apple e anexa o resultado</li>
        <li><strong>Assinatura de c&oacute;digo GCloud KMS</strong> — builds Windows podem agora ser assinados usando chaves Google Cloud KMS, permitindo assinatura automatizada em CI sem expor chaves privadas</li>
      </ul>

      <h2>Reformula&ccedil;&atilde;o do UI Windows</h2>
      <p>
        O backend de UI Windows recebeu a sua atualiza&ccedil;&atilde;o mais abrangente at&eacute; agora:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Escalonamento DPI-aware</strong> — tamanho da janela, fontes e dimens&otilde;es de widgets escalam corretamente em displays de alto DPI</li>
        <li><strong>APIs de janela estilo launcher</strong> — janelas sem bordas com posicionamento personalizado para UIs estilo launcher/spotlight</li>
        <li><strong>Atalhos globais</strong> — atalhos de teclado de sistema que funcionam mesmo quando a app n&atilde;o est&aacute; focada</li>
        <li><strong>&Iacute;cones de app</strong> — API <code>getAppIcon</code> para exibir &iacute;cones de aplica&ccedil;&atilde;o em UIs de launcher</li>
        <li><strong>Layout seguro contra reentrada</strong> — pintura baseada em <code>RefCell</code> substitu&iacute;da por armazenamento HWND <code>SetPropW</code> para prevenir panics durante mensagens WM_PAINT aninhadas</li>
        <li><strong>Integra&ccedil;&atilde;o Geisterhand</strong> — todos os tipos de widget registados no framework de testes UI, <code>/type</code> usa <code>SendMessageW</code> via mapa HWND</li>
        <li><strong>Suporte de c&acirc;mara Android</strong> — API de captura de c&acirc;mara estendida para Android via JNI</li>
      </ul>

      <h2>Performance</h2>
      <p>
        v0.4.14 incluiu uma auditoria de performance abrangente:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>fcmp</code> nativo</strong> — compara&ccedil;&otilde;es de ponto flutuante usam instru&ccedil;&otilde;es nativas do CPU em vez de chamadas de fun&ccedil;&atilde;o runtime. Benchmark Mandelbrot <strong>30% mais r&aacute;pido</strong>.</li>
        <li><strong>Append de string in-place</strong> — <code>str += &quot;text&quot;</code> modifica o buffer no local em vez de alocar uma nova string. <strong>125x mais r&aacute;pido</strong> para concatena&ccedil;&atilde;o repetida.</li>
        <li><strong>Curto-circuito AND/OR</strong> — <code>&amp;&amp;</code> e <code>||</code> ignoram a avalia&ccedil;&atilde;o do operando direito quando o resultado j&aacute; est&aacute; determinado.</li>
        <li><strong>Folding de literais negativos</strong> — <code>-1</code>, <code>-0.5</code> etc. s&atilde;o convertidos em constantes ao n&iacute;vel HIR em vez de emitir uma instru&ccedil;&atilde;o de nega&ccedil;&atilde;o.</li>
      </ul>

      <h2>Builds Paralelas no Hub</h2>
      <p>
        O servidor de orquestra&ccedil;&atilde;o de builds agora suporta builds concorrentes por worker:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Despacho baseado em slots</strong> — workers reportam capacidade <code>max_concurrent</code>, Hub rastreia jobs ativos por worker</li>
        <li><strong>Sem mais 429s</strong> — jobs entram em fila em vez de serem rejeitados quando todos os workers est&atilde;o ocupados</li>
        <li><strong>Downloads de artefactos Base64</strong> — artefactos bin&aacute;rios servidos como base64 quando o runtime Perry n&atilde;o consegue lidar com respostas HTTP bin&aacute;rias brutas</li>
        <li><strong>WebSocket auto-reconecta</strong> — conex&otilde;es de monitoriza&ccedil;&atilde;o de builds reconectam automaticamente em caso de desconex&atilde;o</li>
      </ul>

      <h2>Novo Pacote: perry/appstorereview</h2>
      <p>
        Um novo pacote de primeira parte para solicitar avalia&ccedil;&otilde;es na app store:
      </p>
      <pre><code>{`import { requestReview } from "perry/appstorereview";

// Opens the native review prompt
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();`}</code></pre>
      <p>
        Uma fun&ccedil;&atilde;o, duas plataformas, UI de avalia&ccedil;&atilde;o nativa. L&oacute;gica de timing e exibi&ccedil;&atilde;o fica inteiramente por conta do programador.
      </p>

      <h2>Corre&ccedil;&otilde;es de Codegen</h2>
      <p>
        120 commits significam muitas corre&ccedil;&otilde;es de bugs. As mais impactantes:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Igualdade estrita (===)</strong> — tr&ecirc;s bugs separados corrigidos em v0.4.2: compara&ccedil;&atilde;o de tags de tipo, tratamento de NaN e distin&ccedil;&atilde;o null/undefined</li>
        <li><strong>Compara&ccedil;&atilde;o de strings concatenadas</strong> — <code>===</code> falhava ao comparar strings constru&iacute;das via concatena&ccedil;&atilde;o devido a compara&ccedil;&atilde;o de ponteiros em vez de compara&ccedil;&atilde;o de conte&uacute;do</li>
        <li><strong>Resolu&ccedil;&atilde;o de construtores</strong> — <code>new X(args)</code> agora resolve corretamente construtores importados cross-module e fun&ccedil;&otilde;es construtoras baseadas em closure</li>
        <li><strong>Array push ao n&iacute;vel de m&oacute;dulo</strong> — valores adicionados a arrays de n&iacute;vel de m&oacute;dulo dentro de chamadas de fun&ccedil;&atilde;o aninhadas em loops eram perdidos devido a ponteiros obsoletos ap&oacute;s realoca&ccedil;&atilde;o</li>
        <li><strong>Coer&ccedil;&atilde;o aritm&eacute;tica de null</strong> — <code>null + 1</code> agora produz corretamente <code>1</code> via <code>js_number_coerce</code></li>
        <li><strong>Wrapping de NOT bit-a-bit</strong> — <code>~x</code> agora faz wrap para i32 conforme a sem&acirc;ntica ECMAScript</li>
        <li><strong>fetch().then()</strong> — callbacks nunca disparavam em apps UI nativas devido a falta de drenagem do event loop (v0.4.3)</li>
        <li><strong>M&oacute;dulo e expoente WASM</strong> — operadores <code>%</code> e <code>**</code> causavam erros de valida&ccedil;&atilde;o WASM (v0.4.5)</li>
      </ul>

      <h2>Em N&uacute;meros</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>~120 commits</strong> no compilador principal Perry em 5 dias</li>
        <li><strong>24 patch releases</strong>: v0.4.1 → v0.4.24</li>
        <li><strong>Alvos de compila&ccedil;&atilde;o</strong>: 9 → 10 (adicionado tvOS)</li>
        <li><strong>Alvos cross-compile a partir do Linux</strong>: Windows → Windows, iOS, macOS (todos Apple + Windows)</li>
        <li><strong>Novos pacotes</strong>: perry/appstorereview</li>
        <li><strong>Nova infraestrutura</strong>: painel app.perryts.com, CLI perry login, fatura&ccedil;&atilde;o Polar.sh</li>
        <li><strong>Ganhos de performance</strong>: mandelbrot 30% mais r&aacute;pido (fcmp nativo), concatena&ccedil;&atilde;o de strings 125x mais r&aacute;pida</li>
      </ul>

      <h2>Pr&oacute;ximos Passos</h2>
      <p>
        Fazer cross-compile de iOS e macOS a partir do Linux significa que o Hub agora pode construir para todas as plataformas a partir de um &uacute;nico servidor Linux — sem mais m&aacute;quinas de build macOS dedicadas para compila&ccedil;&atilde;o (apenas para assinatura). A infraestrutura de fatura&ccedil;&atilde;o abre o caminho para o beta p&uacute;blico do Hub. E com tvOS adicionado, o Perry cobre todas as plataformas Apple: macOS, iOS, iPadOS, watchOS e tvOS.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Beta p&uacute;blica do Hub</strong> — utilizadores externos podem enviar TypeScript e obter bin&aacute;rios nativos</li>
        <li><strong>Suporte completo a regex</strong> — a &uacute;ltima grande lacuna da linguagem</li>
        <li><strong>Expans&atilde;o do perry/ui</strong> — drag and drop, acessibilidade, DatePicker</li>
        <li><strong>Source maps e informa&ccedil;&atilde;o de debug</strong> — informa&ccedil;&atilde;o de debug DWARF para depura&ccedil;&atilde;o nativa</li>
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
