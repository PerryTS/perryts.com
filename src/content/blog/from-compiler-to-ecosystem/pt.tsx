import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Uma semana atrás, Perry era um compilador com um toolkit de UI. Você podia escrever TypeScript,
        compilá-lo para um binário nativo e distribuí-lo em seis plataformas. Essa era a história. Hoje a história é
        maior: Perry está se tornando um ecossistema. Três ORMs de banco de dados, notificações push universais,
        builds distribuídas com publicação na App Store e Play Store, uma camada de compatibilidade React
        e verificação automatizada de apps — tudo isso chegou na última semana.
      </p>
      <p>
        Este post cobre o que foi lançado, por que isso importa e como o código se parece.
      </p>

      <h2>perry/ui: A Base</h2>
      <p>
        Antes de entrar nas novas bibliotecas, vale enfatizar o que está no centro
        de tudo: <code className="text-amber-400">perry/ui</code>. Este é o toolkit de UI
        nativo próprio do Perry — mais de 20 widgets que compilam diretamente para componentes nativos da plataforma em todos
        os seis alvos. Não é um wrapper, não é uma camada de abstração, não é uma web view.
        Todo <code className="text-amber-400">Button</code> se torna um{" "}
        <code className="text-amber-400">NSButton</code> no macOS, um{" "}
        <code className="text-amber-400">UIButton</code> no iOS, um{" "}
        <code className="text-amber-400">GtkButton</code> no Linux, um{" "}
        <code className="text-amber-400">android.widget.Button</code> no Android e um{" "}
        <code className="text-amber-400">CreateWindowEx</code> control no Windows.
      </p>
      <p>
        <code className="text-amber-400">perry/ui</code> é a superfície de UI primária e mais avançada
        do Perry. Inclui gerenciamento de estado reativo, contêineres de layout (VStack, HStack,
        ZStack, SplitView), um Canvas com aceleração de hardware, views Table com ordenação de colunas, o{" "}
        módulo <code className="text-amber-400">perry/system</code> para diálogos de arquivo, acesso ao
        keychain, notificações e multi-janela — tudo a partir de TypeScript, tudo compilado para chamadas diretas
        à API da plataforma. Toda outra abordagem de UI no Perry, incluindo a camada de compatibilidade
        React, é construída sobre <code className="text-amber-400">perry/ui</code> e mapeia de volta
        para seus widgets.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">app.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Window, VStack, Button, Text, State }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> count = <span className="text-blue-400">new</span> <span className="text-amber-400">State</span>(0);</p>
          <p className="mt-3"><span className="text-blue-400">const</span> window = <span className="text-blue-400">new</span> <span className="text-amber-400">Window</span>({`{ title: "Counter" }`});</p>
          <p>window.<span className="text-amber-400">setContent</span>(</p>
          <p className="ml-4"><span className="text-blue-400">new</span> <span className="text-amber-400">VStack</span>({`{`} children: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Text</span>({`{ text: count }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Button</span>({`{ title: "+1", onClick: () => count.set(count.get() + 1) }`}),</p>
          <p className="ml-4">] {`})`}</p>
          <p>);</p>
        </div>
      </div>

      <p>
        O objeto reativo <code className="text-amber-400">State</code> é a primitiva chave.
        Quando um valor State muda, apenas os widgets vinculados a esse estado atualizam — sem
        diffing de DOM virtual, sem re-renderizações de árvore completa, sem passagem de reconciliação.
        É o caminho mais direto de TypeScript para UI nativa da plataforma que existe.
      </p>

      <h2>Compatibilidade React: Uma Camada Fina sobre perry/ui</h2>
      <p>
        Para desenvolvedores vindos do React, <code className="text-amber-400">perry-react</code>{" "}
        fornece uma camada de compatibilidade que mapeia o modelo de componentes do React para os{" "}
        widgets do <code className="text-amber-400">perry/ui</code>. Você pode usar{" "}
        <code className="text-amber-400">useState</code>,{" "}
        <code className="text-amber-400">useRef</code>,{" "}
        <code className="text-amber-400">useReducer</code> e JSX — e o Perry compila tudo para os
        mesmos widgets nativos por baixo. É uma ponte de conveniência, não um motor de renderização separado.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.tsx</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> React, {`{ useState }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;react&apos;</span>;</p>
          <p className="mt-3"><span className="text-violet-400">function</span> <span className="text-amber-400">Counter</span>() {`{`}</p>
          <p className="ml-4"><span className="text-blue-400">const</span> [count, setCount] = <span className="text-amber-400">useState</span>(0);</p>
          <p className="ml-4"><span className="text-violet-400">return</span> (</p>
          <p className="ml-8">&lt;<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">h1</span>&gt;{`{count}`}&lt;/<span className="text-blue-400">h1</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">button</span> <span className="text-amber-400">onClick</span>={`{() => setCount(count + 1)}`}&gt;+1&lt;/<span className="text-blue-400">button</span>&gt;</p>
          <p className="ml-8">&lt;/<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-4">);</p>
          <p>{`}`}</p>
        </div>
      </div>

      <p>
        Por baixo dos panos, todo elemento JSX mapeia para um widget do <code className="text-amber-400">perry/ui</code>:{" "}
        <code className="text-amber-400">{`<div>`}</code> se torna um VStack,{" "}
        <code className="text-amber-400">{`<button>`}</code> se torna um Button,{" "}
        <code className="text-amber-400">useState</code> é implementado pelo State reativo do Perry.
        Está em fase inicial — Fase 1 com re-renderizações de árvore completa e armazenamento global de hooks — mas
        prova que código React existente pode atingir plataformas nativas através do Perry. Também estamos
        explorando compatibilidade com Angular e Ionic em linhas semelhantes.
      </p>

      <h2>Três ORMs de Banco de Dados: API Prisma, Performance Nativa</h2>
      <p>
        Se você está construindo um servidor ou um app desktop que se comunica com um banco de dados, o Perry agora
        te cobre com três ORMs compatíveis com Prisma:{" "}
        <code className="text-amber-400">perry-prisma</code> (MySQL),{" "}
        <code className="text-amber-400">perry-sqlite</code> (SQLite) e{" "}
        <code className="text-amber-400">perry-postgres</code> (PostgreSQL). Todos os três são substituições
        diretas para <code className="text-amber-400">@prisma/client</code>. Mesma API, mesmos
        padrões de query, mas compilados para código nativo com FFI direta ao banco de dados — sem motor Prisma,
        sem Node.js.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">database.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ PrismaClient }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;@prisma/client&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> prisma = <span className="text-blue-400">new</span> <span className="text-amber-400">PrismaClient</span>();</p>
          <p className="mt-3"><span className="text-slate-500">// Same Prisma API — compiled to native SQL via Rust FFI</span></p>
          <p><span className="text-blue-400">const</span> users = <span className="text-violet-400">await</span> prisma.user.<span className="text-amber-400">findMany</span>({`{`}</p>
          <p className="ml-4">where: {`{ email: { contains: "@perry.dev" } }`},</p>
          <p className="ml-4">orderBy: {`{ createdAt: "desc" }`},</p>
          <p className="ml-4">take: 10,</p>
          <p>{`});`}</p>
          <p className="mt-3"><span className="text-violet-400">await</span> prisma.post.<span className="text-amber-400">create</span>({`{`}</p>
          <p className="ml-4">data: {`{ title: "Hello", authorId: users[0].id }`},</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        Por baixo dos panos, cada ORM é um front-end TypeScript apoiado por uma camada FFI Rust usando{" "}
        <code className="text-amber-400">sqlx</code>. O fluxo de query: TypeScript serializa a
        query para JSON, passa através da fronteira FFI, Rust constrói SQL parametrizado, executa
        via pool de conexões e serializa o resultado de volta. O schema Prisma é lido em
        tempo de compilação — zero parsing em runtime.
      </p>
      <p>
        As três implementações compartilham cerca de 95% do código. As diferenças são as que você
        esperaria: quoting de identificadores (<code className="text-amber-400">`col`</code> vs{" "}
        <code className="text-amber-400">&quot;col&quot;</code>), sintaxe de placeholder ({" "}
        <code className="text-amber-400">?</code> vs{" "}
        <code className="text-amber-400">$1, $2</code>) e semântica de transações. Todos os três
        suportam a superfície CRUD completa do Prisma: findMany, findFirst, findUnique, create, createMany,
        update, updateMany, upsert, delete, deleteMany, count — mais SQL raw, transações
        e mais de 10 operadores de filtro WHERE.
      </p>

      <h2>perry-push: Notificações Push Universais</h2>
      <p>
        <code className="text-amber-400">perry-push</code> é uma biblioteca única que lida com notificações
        push em todas as plataformas: APNs (iOS/macOS), FCM (Android), Web Push (navegadores)
        e WNS (Windows). Cada provedor é um módulo FFI Rust com exatamente três funções:{" "}
        <code className="text-amber-400">*_provider_new</code>,{" "}
        <code className="text-amber-400">*_provider_close</code> e{" "}
        <code className="text-amber-400">*_send</code>.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">notify.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ ApnProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/apn&apos;</span>;</p>
          <p><span className="text-violet-400">import</span> {`{ FcmProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/fcm&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> apn = <span className="text-blue-400">new</span> <span className="text-amber-400">ApnProvider</span>({`{ teamId, keyId, key }`});</p>
          <p><span className="text-blue-400">const</span> fcm = <span className="text-blue-400">new</span> <span className="text-amber-400">FcmProvider</span>({`{ serviceAccount }`});</p>
          <p className="mt-3"><span className="text-slate-500">// Unified result type for all providers</span></p>
          <p><span className="text-blue-400">const</span> result = <span className="text-violet-400">await</span> apn.<span className="text-amber-400">send</span>({`{`}</p>
          <p className="ml-4">deviceToken: token,</p>
          <p className="ml-4">title: <span className="text-green-400">&quot;New message&quot;</span>,</p>
          <p className="ml-4">body: <span className="text-green-400">&quot;You have a new reply&quot;</span>,</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        A criptografia é tratada pelo{" "}
        <code className="text-amber-400">ring</code> — JWTs ES256 para APNs e VAPID, RS256 para
        contas de serviço FCM, AES-GCM para criptografia de payload Web Push. Tudo compilado para código nativo.
        Sem <code className="text-amber-400">node-gyp</code>, sem dependência de OpenSSL.
      </p>

      <h2>Perry Hub + Builders: Builds Cloud Distribuídas</h2>
      <p>
        Este é o movimento de infraestrutura. <code className="text-amber-400">perry-hub</code> é um
        servidor de orquestração de builds — ele mesmo compilado de TypeScript pelo Perry — que gerencia um pool
        de workers de build. Você envia seu projeto, o hub despacha para o worker certo com base na
        plataforma alvo, e o worker compila, assina e opcionalmente publica seu app.
      </p>
      <p>
        Dois workers existem hoje: um builder macOS (lida com alvos macOS, iOS e Android) e um
        builder Linux (lida com Linux e Android). Ambos são binários Rust que se conectam ao hub
        via WebSocket, baixam tarballs de código-fonte, executam o compilador Perry e fazem upload dos artefatos.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Assinatura de código</strong> — notarização Apple para macOS, perfis de provisioning para iOS, assinatura de keystore Android</li>
        <li><strong>Publicação na App Store</strong> — upload direto para App Store Connect e Google Play Store</li>
        <li><strong>Gerenciamento de artefatos</strong> — binários compilados enviados ao hub com limpeza baseada em TTL</li>
        <li><strong>Gerenciamento de licenças</strong> — limites de taxa por licença, fila com prioridade (tier pro tem prioridade)</li>
      </ul>
      <p>
        O hub em si é um estudo de caso fascinante. É um arquivo TypeScript de aproximadamente 1.500 linhas compilado
        para um binário nativo de 2 MB pelo Perry. Roda Fastify na porta 3456 para HTTP e{" "}
        <code className="text-amber-400">ws</code> na porta 3457 para WebSocket. Todo o estado é
        em memória com persistência JSON — sem banco de dados externo. É o tipo de servidor que
        você pode implantar com <code className="text-amber-400">scp</code> e um arquivo unit systemd.
      </p>

      <h2>perry-verify: Verificação Automatizada de Apps</h2>
      <p>
        <code className="text-amber-400">perry-verify</code> é um serviço HTTP independente que
        recebe um binário compilado e uma configuração, executa um pipeline de verificação e retorna
        resultados estruturados de pass/fail com capturas de tela. Ele lança o app, executa fluxos de autenticação
        (determinísticos ou assistidos por IA), verifica o estado e captura evidências.
      </p>
      <p>
        Adaptadores de plataforma existem para macOS (via APIs de acessibilidade), Linux (AT-SPI) e stubs
        para iOS Simulator e Android Emulator. A camada de IA usa Claude para autenticação de fallback
        e verificação de estado quando verificações determinísticas não são possíveis. Foi projetado
        para se encaixar no pipeline de build do hub como uma etapa pós-build: compilar, assinar, verificar, publicar.
      </p>

      <h2>Pry em Todas as Plataformas</h2>
      <p>
        <Link href="/blog/building-pry" className="text-amber-400 hover:text-amber-300">Pry</Link>,
        o visualizador JSON nativo que construímos como vitrine do Perry, agora está disponível em cinco plataformas. Está
        na{" "}
        <a href="https://apps.apple.com/app/pry-json-viewer/id6759329040" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Mac App Store
        </a>{" "}
        e no{" "}
        <a href="https://play.google.com/store/apps/details?id=com.perry.pry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Google Play
        </a>, com binários nativos para Linux e Windows. Mesmo codebase TypeScript, cinco
        pontos de entrada específicos por plataforma, cinco binários nativos. É a prova mais concreta
        de que toda essa abordagem funciona de ponta a ponta — do código-fonte TypeScript à listagem na App Store.
      </p>

      <h2>O Que Tudo Isso Significa</h2>
      <p>
        Um compilador é interessante. Um ecossistema é útil. Na última semana, Perry passou de
        &quot;você pode compilar TypeScript para nativo&quot; para &quot;você pode construir um app completo com
        UI nativa, banco de dados Prisma, notificações push e builds que auto-publicam na
        App Store.&quot;
      </p>
      <p>
        As peças estão começando a se conectar:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/ui</strong> é o caminho mais direto de TypeScript para UI nativa da plataforma — estado reativo, mais de 20 widgets, zero camadas de abstração</li>
        <li><strong>perry-prisma/sqlite/postgres</strong> significa que código de banco de dados existente é portado com mudanças mínimas</li>
        <li><strong>perry-push</strong> significa notificações push nativas sem bibliotecas por plataforma</li>
        <li><strong>perry-hub + builders</strong> significa que você pode ir de <code className="text-amber-400">perry publish</code> à App Store em um passo</li>
        <li><strong>perry-verify</strong> significa testes automatizados da saída compilada, não apenas do código-fonte</li>
        <li><strong>perry-react</strong> significa que desenvolvedores React podem entrar no Perry usando padrões familiares, tudo mapeando para perry/ui por baixo</li>
      </ul>
      <p>
        Estas não são teóricas. Toda biblioteca listada aqui tem código funcionando, testes e
        documentação. Várias já são usadas em produção — o próprio site do Perry
        roda em um servidor Fastify compilado pelo Perry, e o Pry está ativo em duas app stores.
      </p>

      <h2>Próximos Passos</h2>
      <p>
        O roadmap imediato:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Expansão do perry/ui</strong> — arrastar e soltar, rótulos de acessibilidade, menus de contexto personalizados, mais primitivas de layout</li>
        <li><strong>Integração do perry-verify</strong> — verificação automatizada no pipeline de build</li>
        <li><strong>Compatibilidade com frameworks</strong> — melhorando as camadas React, Angular e Ionic como rampas de acesso ao perry/ui</li>
        <li><strong>Suporte completo a regex</strong> — motor de regex compatível com ECMAScript compilado para nativo</li>
      </ul>
      <p>
        Acompanhe o progresso no{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, ou confira o{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">roadmap</Link>
        {" "}para o panorama completo.
      </p>
    </>
  );
}
