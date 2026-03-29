export default function Content() {
  return (
    <>
      <p>
        Voce instala o VS Code. E rapido. Voce adiciona 15 extensoes. Agora leva 4 segundos para iniciar e o Extension Host consome 800 MB de RAM. O que aconteceu?
      </p>
      <p>
        O padrao se repete em toda parte: WordPress, Eclipse, Chrome, Figma, Slack. O app e entregue rapido. Plugins o tornam lento. Ninguem mais se surpreende — aceitamos isso como o custo da extensibilidade.
      </p>
      <p>
        Mas sistemas de plugins nao sao apenas um problema de desempenho. Sao um problema de filosofia de design. A industria confundiu &quot;extensibilidade&quot; com &quot;dinamismo em tempo de execucao&quot; quando frequentemente a melhor resposta e composicao em tempo de compilacao. Os unicos plugins performaticos sao os que deixam de ser plugins em tempo de compilacao.
      </p>

      <h2>O Espectro de Desempenho da Extensibilidade</h2>
      <p>
        Nem toda extensibilidade custa o mesmo. Ha um espectro de custo zero a custo maximo, e a maior parte da industria se acomodou no extremo caro:
      </p>
      <ol className="list-decimal list-inside">
        <li><strong>Link estatico / modulos em tempo de compilacao</strong> — zero sobrecarga. Bibliotecas C, crates Rust, pacotes Go. O limite do modulo desaparece completamente no binario final.</li>
        <li><strong>Bibliotecas compartilhadas carregadas na inicializacao</strong> — quase zero. Modulos nginx, modulos do kernel Linux. Custo unico no carregamento, depois chamadas de funcao diretas.</li>
        <li><strong>Despacho dinamico via interfaces / vtables</strong> — pequena sobrecarga. Plugins de motor de jogos em C++. Uma indireccao de ponteiro por chamada.</li>
        <li><strong>Plugins interpretados no mesmo processo</strong> — moderado. Plugins PHP do WordPress, bundles OSGi do Eclipse. Toda invocacao de plugin passa por um interpretador.</li>
        <li><strong>Plugins em processo separado via IPC</strong> — significativo. Extensoes VS Code, extensoes Chrome. Toda interacao cruza uma fronteira de processo e serializa dados.</li>
        <li><strong>Plugins sandboxed sobre IPC serializado</strong> — pesado. Plugins Figma, scripts de conteudo de extensoes de navegador. Serializacao, desserializacao e aplicacao de sandbox em toda chamada.</li>
      </ol>
      <p>
        O insight chave: os unicos plugins performaticos sao os que deixam de ser plugins em tempo de compilacao. Os niveis 1 e 2 sao rapidos precisamente porque o &quot;plugin&quot; se torna indistinguivel do codigo host no artefato final.
      </p>

      <h2>O Dano no Mundo Real</h2>

      <h3>WordPress</h3>
      <p>
        Cada plugin se conecta ao ciclo de vida da requisicao. 30 plugins significam 30 camadas de chamadas de funcao por carregamento de pagina. O resultado: plugins de cache existem unicamente para mitigar o dano de outros plugins. Plugins de desempenho para corrigir o problema de desempenho que plugins criaram. A meta-ironia se escreve sozinha.
      </p>

      <h3>VS Code</h3>
      <p>
        Extensoes compartilham um unico event loop Node.js em um processo separado. Uma extensao mal comportada bloqueia todas as outras. O Extension Host regularmente aparece como o maior consumidor de CPU em maquinas de desenvolvedores. A Microsoft construiu ferramentas de profiling, comandos de biseccao e sistemas de eventos de ativacao — toda uma infraestrutura para gerenciar o problema que extensoes criam.
      </p>

      <h3>Eclipse</h3>
      <p>
        O conto de advertencia. Resolucao de bundles OSGi, sobrecarga de carregamento de classes, grafos de dependencia massivos. Outrora a IDE mais popular, agora em grande parte abandonada por desenvolvedores mainstream. A arquitetura de plugins que deveria ser sua maior forca tornou-se sua fraqueza definidora.
      </p>

      <h3>O Proprio Electron</h3>
      <p>
        O problema de plugins no nivel da plataforma. Todo app Electron envia um runtime completo Chromium + Node.js. VS Code e Electron. Slack e Electron. Discord e Electron. Cada um consumindo independentemente 300&ndash;500 MB de RAM para renderizar o que e essencialmente uma janela de chat ou um editor de texto. O &quot;plugin&quot; aqui e toda a plataforma web, empacotada novamente para cada aplicacao.
      </p>

      <h2>Por Que a Industria Continua Escolhendo Plugins</h2>
      <p>
        Se plugins sao tao caros, por que todos continuam construindo-os? As razoes sao principalmente organizacionais, nao tecnicas:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Experiencia do desenvolvedor</strong> — plugins sao faceis de escrever quando voce nao se importa com desempenho. Envie um arquivo JS, conecte-se a alguns eventos, pronto.</li>
        <li><strong>Crescimento do ecossistema</strong> — plugins criam efeitos de rede e engajamento da comunidade. Um marketplace de 30.000 extensoes e um fosso poderoso.</li>
        <li><strong>Conveniencia organizacional</strong> — plugins permitem que equipes adiem decisoes de design. &quot;Alguem vai escrever um plugin para isso&quot; e o equivalente arquitetural de &quot;vamos arrumar na pos-producao.&quot;</li>
        <li><strong>Modelo de negocio</strong> — marketplaces de plugins criam receita e lock-in. A plataforma captura valor do ecossistema.</li>
      </ul>
      <p>
        A verdade desconfortavel: plugins sao frequentemente uma maneira de evitar tomar decisoes arquiteturais dificeis sobre o que pertence ao core. Eles permitem enviar algo incompleto e chama-lo de &quot;extensivel.&quot;
      </p>

      <h2>A Alternativa: Composicao em Tempo de Compilacao</h2>
      <p>
        E se a extensibilidade acontecesse em tempo de build em vez de runtime?
      </p>
      <p>
        Isso nao e hipotetico. Ha precedentes bem comprovados em linguagens de sistemas:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Proc macros do Rust</strong> — codigo arbitrario que roda em tempo de compilacao e gera codigo nativo sem sobrecarga. Serializacao Serde, configuracao do runtime Tokio, roteamento Axum — tudo resolvido antes do seu programa iniciar.</li>
        <li><strong>Comptime do Zig</strong> — execucao em tempo de compilacao que elimina todo branching em runtime. Estruturas de dados genericas sao monomorfizadas, configuracao e resolvida, codigo morto e eliminado. O que resta e exatamente o que roda.</li>
        <li><strong>Templates / constexpr do C++</strong> — polimorfismo em tempo de compilacao com custo zero em runtime. A STL alcanca desempenho extraordinario porque todo algoritmo generico especializa em tempo de compilacao.</li>
        <li><strong>Tree-shaking em bundlers</strong> — uma versao parcial e imperfeita desta ideia aplicada a JavaScript. Webpack e Rollup eliminam exportacoes nao utilizadas em tempo de build. A limitacao e que so podem remover codigo, nao especializa-lo.</li>
      </ul>
      <p>
        O padrao e consistente: mova decisoes do runtime para o tempo de build. O que voce nao inclui nao custa nada. O que voce inclui compila para codigo nativo sem indireccao. O limite do modulo se torna uma ferramenta de organizacao no nivel do codigo-fonte, nao uma fronteira de desempenho em runtime.
      </p>

      <h2>O Que Isso Significa para TypeScript</h2>
      <p>
        TypeScript e a linguagem mais popular para construir ferramentas extensiveis — e a pior em desempenho de runtime. Todo o ecossistema TypeScript roda em Node.js, que roda em V8, que compila JIT JavaScript. Cada camada adiciona sobrecarga: tempo de aquecimento JIT, pausas de coleta de lixo, despacho dinamico para todo acesso a propriedade, fronteiras IPC entre processos.
      </p>
      <p>
        E aqui que Perry entra. Perry compila TypeScript diretamente para binarios nativos. Sem V8, sem aquecimento JIT, sem pausas de coleta de lixo, sem fronteiras IPC.
      </p>
      <p>
        Quando seus modulos compilam para codigo nativo, &quot;plugins&quot; se tornam apenas... modulos. Eles se compoem em tempo de build. O binario final tem zero sobrecarga de plugins porque nao ha plugins — apenas codigo nativo. Um handler de rota Express, uma funcao de middleware, uma biblioteca utilitaria — todos compilam para chamadas diretas de funcao no mesmo binario. Sem carregamento dinamico, sem serializacao, sem fronteiras de processo.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500"># Your app, your dependencies, your &quot;plugins&quot; — one binary</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile server.ts -o server</p>
          <p className="text-slate-500">Compiling server.ts + 43 modules...</p>
          <p className="text-green-400">{"✓"} Built executable: server (1.8 MB, 0.7s)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./server</p>
          <p className="text-slate-300">Listening on port 3000</p>
        </div>
      </div>

      <p>
        Isso nao e teorico. Perry ja compila frameworks TypeScript do mundo real — Hono, tRPC, Strapi — em binarios nativos ARM64 abaixo de 2 MB, em menos de um segundo. Os modulos que compoem esses frameworks sao compilados, vinculados e inlinados em um unico executavel. O que seria uma arquitetura de plugins com sobrecarga de runtime em Node.js se torna composicao sem custo em um binario Perry.
      </p>

      <h2>A Extensibilidade Que Voce Realmente Precisa</h2>
      <p>
        A objecao e obvia: &quot;Mas eu preciso de extensibilidade em runtime. Usuarios precisam instalar plugins sem recompilar.&quot;
      </p>
      <p>
        Precisam mesmo? Para a maioria das aplicacoes, o conjunto de extensoes e conhecido em tempo de build. Voce escolhe seu middleware Express, seu driver de banco de dados, sua biblioteca de autenticacao, seu framework de logging — e entao faz deploy. A &quot;extensibilidade&quot; esta no seu <code className="text-perry-400">package.json</code>, resolvida no <code className="text-perry-400">npm install</code>, nao em runtime.
      </p>
      <p>
        As aplicacoes que genuinamente precisam de carregamento de plugins em runtime — VS Code, WordPress, navegadores — sao a excecao, nao a regra. E mesmo essas pagam um preco alto por isso. Para todo o resto, composicao em tempo de compilacao da a mesma flexibilidade sem nenhuma sobrecarga.
      </p>
      <p>
        A diferenca e honestidade arquitetural. Em vez de fingir que toda aplicacao precisa de um sistema de plugins, voce pergunta: essa extensibilidade precisa acontecer em runtime, ou o compilador pode fazer o trabalho?
      </p>

      <h2>O Caminho a Seguir</h2>
      <p>
        A adicao da industria a arquiteturas de plugins e um sintoma de aceitar sobrecarga de runtime como inevitavel. Nao e. O compilador pode fazer o trabalho. Composicao em tempo de build da extensibilidade sem o imposto.
      </p>
      <p>
        Estamos construindo Perry porque acreditamos que desenvolvedores TypeScript merecem desempenho nativo sem abrir mao da linguagem que amam. Seus modulos devem se compor em tempo de build, compilar para chamadas diretas de funcao e rodar sem a sobrecarga de um runtime que existe apenas para tornar a &quot;extensibilidade&quot; possivel.
      </p>
      <p>
        O sistema de plugins mais rapido e aquele que nao existe em runtime.
      </p>
    </>
  );
}
