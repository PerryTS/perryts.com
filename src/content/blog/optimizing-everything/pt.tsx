export default function Content() {
  return (
    <>
      <p>
        O &uacute;ltimo artigo do blog foi publicado com o Perry na v0.5.12. Hoje estamos na v0.5.80. Isso s&atilde;o <strong>68 releases de patch em sete dias</strong>, quase inteiramente focadas numa coisa: transformar cada slow path restante num fast path.
      </p>
      <p>
        A migra&ccedil;&atilde;o para o LLVM na v0.5.0 recuperou a paridade com o Cranelift na v0.5.12. Esse foi o fim de uma hist&oacute;ria e o in&iacute;cio de outra. O LLVM v&ecirc; tudo agora. A pergunta deixou de ser &ldquo;porque &eacute; que isto est&aacute; lento?&rdquo; e passou a ser &ldquo;porque &eacute; que isto ainda n&atilde;o est&aacute; r&aacute;pido?&rdquo; &mdash; uma pergunta muito mais trat&aacute;vel.
      </p>
      <p>
        Este artigo &eacute; um passeio pela semana. JSON ganhou um speedup de 547x. mimalloc tornou-se o alocador global. O acesso a propriedades ganhou um inline cache monom&oacute;rfico. Buffers ganharam slots de ponteiros tipados com metadados <code>noalias</code>. Servidores Fastify e WebSocket deixaram de crashar ap&oacute;s um minuto. E os benchmarks moveram-se novamente.
      </p>

      <h2>1. JSON: fechando uma lacuna de 547x</h2>
      <p>
        Na v0.5.29, o JSON.parse do Perry num array de 20 registos era <strong>547x mais lento que o Node</strong>. Na v0.5.46 era 1,3x. Esse n&uacute;mero &eacute; o maior delta da semana, e vale a pena percorr&ecirc;-lo porque cada outra otimiza&ccedil;&atilde;o neste artigo &eacute; uma varia&ccedil;&atilde;o do mesmo tema: n&atilde;o fa&ccedil;a trabalho que n&atilde;o precisa de fazer.
      </p>
      <p>
        O parser original alocava um Vec por propriedade, um Vec de chaves por objeto, e um thread-local protegido por RefCell para o cache de chaves. Copiava cada string. Fazia re-hash de cada nome de campo. Construi&iacute;a uma shape de objeto totalmente nova para cada registo, mesmo quando todos os 20 registos tinham exatamente os mesmos campos na mesma ordem. O parser do Node lida com isto detetando o padr&atilde;o e partilhando uma &uacute;nica shape entre todos os registos. O do Perry n&atilde;o.
      </p>
      <p>A corre&ccedil;&atilde;o chegou em quatro passos:</p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Interning de chaves via um <code>PARSE_KEY_CACHE</code> thread-local</strong> (v0.5.45). O primeiro registo aloca N strings de chave; os registos 2 a 20 alocam zero. Chaves repetidas resolvem para o mesmo ponteiro, o que as torna utiliz&aacute;veis como chaves de lookup no cache de shapes sem um strcmp.</li>
        <li><strong>Partilha de shapes atrav&eacute;s do cache de transi&ccedil;&otilde;es</strong> (v0.5.45). Objetos constru&iacute;dos por <code>js_object_set_field_by_name</code> percorrem o mesmo grafo de transi&ccedil;&otilde;es. Quando o schema se repete, o ponteiro <code>keys_array</code> &eacute; partilhado, e isso &eacute; o que um inline cache polim&oacute;rfico precisa para acertar.</li>
        <li><strong>Parsing de strings zero-copy + constru&ccedil;&atilde;o incremental de objetos</strong> (v0.5.46). <code>parse_string_bytes</code> agora retorna <code>ParsedStr::Borrowed(&amp;[u8])</code> quando n&atilde;o h&aacute; escapes com backslash &mdash; que &eacute; o caso comum para cada chave e para a maioria dos valores. <code>parse_object</code> escreve campos diretamente em vez de coletar num Vec primeiro.</li>
        <li><strong>Supress&atilde;o do GC durante o parse</strong> (v0.5.60, fecha #59). Fazer parse de um array grande aloca milhares de pequenos objetos num loop apertado. Cada um estava a despoletar a verifica&ccedil;&atilde;o de threshold do GC. Definir uma flag de &ldquo;parsing em progresso&rdquo; adia a coleta at&eacute; o parse retornar &mdash; mesmo tamanho efetivo de heap, muito menos branches de bookkeeping.</li>
      </ol>
      <p>
        Depois o stringify. JSON.stringify em arrays homog&eacute;neos &mdash; a mesma shape, milh&otilde;es de vezes &mdash; estava a fazer itera&ccedil;&atilde;o completa de propriedades por objeto, o que para um array com shape est&aacute;vel &eacute; puro desperd&iacute;cio. Uma corre&ccedil;&atilde;o em cinco passos fechou a maior parte dessa lacuna tamb&eacute;m:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>v0.5.62: fast paths itoa / ryu para n&uacute;meros, verifica&ccedil;&atilde;o de refer&ecirc;ncia circular baseada em profundidade em vez de um HashSet.</li>
        <li>v0.5.63: guarda de <code>toJSON</code> + cache de chaves persistente + dispatch inline (os tr&ecirc;s custos por chamada que se acumulavam).</li>
        <li>v0.5.65: template de stringify para shape homog&eacute;nea + fast path de escape ASCII. Quando cada elemento tem a mesma shape, a estrutura de chave/dois-pontos/v&iacute;rgula &eacute; pr&eacute;-calculada uma vez.</li>
        <li>v0.5.70, v0.5.72, v0.5.75: cache de shape-template por chamada, fechar a lacuna do GC residual do parse, eliminar o overhead fixo por chamada restante.</li>
        <li>v0.5.79: o caminho de valores pequenos. N&uacute;meros, booleanos e strings curtas passam por um caminho direto que n&atilde;o configura nenhuma da maquinaria de objetos.</li>
      </ul>
      <p>
        O resultado cumulativo: um pipeline de JSON que estava <strong>547x atr&aacute;s do Node</strong> no in&iacute;cio da semana est&aacute; agora aproximadamente <strong>1,3x atr&aacute;s no parse e competitivo no stringify</strong>, em workloads realistas.
      </p>

      <h2>2. A hist&oacute;ria do alocador</h2>
      <p>
        O Perry aloca muito. Cada objeto literal, cada array literal, cada concatena&ccedil;&atilde;o de string, cada closure. O alocador &eacute; quente, e durante a maior parte da v0.5 foi o alocador de sistema padr&atilde;o do Rust mais uma arena thread-local para valores de curta dura&ccedil;&atilde;o.
      </p>
      <p>
        A v0.5.67 substituiu o alocador global por <strong>mimalloc</strong>. Esta &eacute; uma mudan&ccedil;a de uma linha no Cargo.toml que se paga imediatamente em qualquer workload que fa&ccedil;a muitas pequenas aloca&ccedil;&otilde;es &mdash; que &eacute; cada programa TypeScript. A v0.5.66 precedeu-a consolidando todo o estado thread-local de <code>gc_malloc</code> num &uacute;nico acesso TLS por chamada, para que o caminho para o mimalloc fosse o mais barato poss&iacute;vel.
      </p>
      <p>
        A v0.5.68 levou isto mais longe com <strong>strings alocadas em arena</strong>. Strings de curta dura&ccedil;&atilde;o (resultados intermedi&aacute;rios de concat, peda&ccedil;os de <code>split()</code>, scratch do parser) saltam o alocador global inteiramente e aterram numa bump arena por thread que reseta em fronteiras naturais. Para parsing de JSON isto foi uma vit&oacute;ria de percentagem de dois d&iacute;gitos por si s&oacute;.
      </p>
      <p>
        E as duas otimiza&ccedil;&otilde;es que n&atilde;o alocam nada:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Substitui&ccedil;&atilde;o escalar de objetos que n&atilde;o escapam</strong> (v0.5.17, depois objetos literais na v0.5.76). Se um objeto nunca sai da sua fun&ccedil;&atilde;o englobante, n&atilde;o precisa de existir. Os seus campos tornam-se locais simples. O LLVM lida com isto out of the box assim que se deixa de esconder o objeto atr&aacute;s de uma chamada opaca ao alocador.</li>
        <li><strong>Substitui&ccedil;&atilde;o escalar de arrays que n&atilde;o escapam</strong> (v0.5.73). Mesma ideia &mdash; se o array n&atilde;o escapa, os seus elementos tornam-se valores SSA e toda a aloca&ccedil;&atilde;o desaparece.</li>
      </ul>
      <p>
        Para o caminho do array literal especificamente, a v0.5.69 adicionou um <strong>fast path de tamanho exato</strong> (saltar a maquinaria de crescimento de capacidade quando o tamanho &eacute; conhecido em tempo de compila&ccedil;&atilde;o), e a v0.5.74 colocou inline o IR do bump allocator para pequenos array literais para que o LLVM possa ver a aloca&ccedil;&atilde;o, dobr&aacute;-la, elev&aacute;-la ou elimin&aacute;-la. Benchmarks array-heavy moveram-se mais um passo.
      </p>
      <p>
        Para arredondar, a v0.5.25 corrigiu um bug mais silencioso: <code>gc_malloc</code> n&atilde;o estava a despoletar coleta no seu pr&oacute;prio caminho, ent&atilde;o workloads malloc-heavy podiam fazer o heap crescer ilimitadamente antes de qualquer coisa verificar. A v0.5.61 adicionou dimensionamento de passo adaptativo ao threshold, que &eacute; o que realmente se quer: verificar de forma barata quando o heap &eacute; pequeno, menos frequentemente quando &eacute; grande.
      </p>

      <h2>3. O acesso a propriedades ganhou um inline cache real</h2>
      <p>
        Todos os motores JavaScript modernos t&ecirc;m um inline cache polim&oacute;rfico (PIC) no acesso a propriedades. Durante a maior parte da s&eacute;rie v0.5 do Perry, PropertyGet passava por um lookup em tabela de shapes com um hash thread-local. Isso &eacute; bom para c&oacute;digo frio. N&atilde;o &eacute; bom quando 95% das leituras de propriedade num dado call site veem a mesma shape, o que &eacute; quase sempre.
      </p>
      <p>
        A v0.5.44 entregou um <strong>inline cache monom&oacute;rfico</strong> para <code>PropertyGet</code>. Cada site de PropertyGet recebe uma entrada de cache por callsite: um ponteiro de shape esperada e um offset de campo. O caminho de hit &eacute; uma &uacute;nica compara&ccedil;&atilde;o mais um load indexado. O caminho de miss cai para um helper lento que atualiza o cache.
      </p>
      <pre><code>{`; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont`}</code></pre>
      <p>
        A v0.5.51 adicionou um <strong>cache de transi&ccedil;&otilde;es de shape baseado em hash de conte&uacute;do</strong> para escritas de propriedades din&acirc;micas. Dois objetos que crescem os mesmos campos na mesma ordem fazem hash para a mesma transi&ccedil;&atilde;o, ent&atilde;o acabam por partilhar a mesma shape &mdash; e isso significa que o lado de leitura do PIC realmente acerta.
      </p>
      <p>
        A v0.5.55 removeu o &uacute;ltimo acesso TLS do cache de transi&ccedil;&otilde;es. A v0.5.46 corrigiu um bug no miss-handler do PIC onde objetos com &gt;8 campos estavam a ler para al&eacute;m dos slots inline para mem&oacute;ria n&atilde;o inicializada (fecha #55). A v0.5.78 adicionou uma guarda para impedir que o PIC do PropertyGet indexasse em receivers n&atilde;o-ponteiro como n&uacute;meros brutos &mdash; o que podia acontecer em refinamento de tipos excessivamente otimista e era um dos &uacute;ltimos problemas de estabilidade no IC.
      </p>
      <p>
        Efeito l&iacute;quido: c&oacute;digo property-heavy &mdash; que na pr&aacute;tica significa a maior parte do TypeScript &mdash; &eacute; aproximadamente 2-3x mais r&aacute;pido do que era h&aacute; uma semana, apenas com o IC sozinho.
      </p>

      <h2>4. Inteiros, bitwise, e o padr&atilde;o <code>| 0</code></h2>
      <p>
        NaN-boxing torna cada n&uacute;mero um f64. Programadores TypeScript escrevem <code>x | 0</code> para for&ccedil;ar sem&acirc;ntica de inteiros. O V8 passou quinze anos a tornar isso barato. O Perry passou esta semana a recuperar.
      </p>
      <p>A pilha de mudan&ccedil;as, por ordem:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.48</strong>: <code>sdiv</code> para <code>(int / const) | 0</code>. O LLVM dobra para <code>smulh + asr</code>, que s&atilde;o ~2 ciclos vs ~10 para <code>fdiv</code>.</li>
        <li><strong>v0.5.48</strong>: <code>@llvm.assume</code> em limites de Uint8ArrayGet. Substitui o diamante branch+phi de verifica&ccedil;&atilde;o de limites por um &uacute;nico bloco b&aacute;sico sobre o qual o vetorizador pode raciocinar.</li>
        <li><strong>v0.5.49</strong>: corrigir opera&ccedil;&otilde;es bitwise com NaN/Infinity para produzir 0 conforme a especifica&ccedil;&atilde;o ToInt32. Corre&ccedil;&atilde;o em primeiro lugar.</li>
        <li><strong>v0.5.50</strong>: <code>toint32_fast</code> que salta a guarda NaN/Inf de 5 instru&ccedil;&otilde;es quando o valor &eacute; conhecido-finito. Mais <code>alwaysinline</code> em helpers pequenos e dete&ccedil;&atilde;o de clamp.</li>
        <li><strong>v0.5.52</strong>: alvo fun&ccedil;&otilde;es de clamp diretamente com intr&iacute;nsecos <code>smin</code>/<code>smax</code>. Clamp &eacute; o padr&atilde;o inteiro mais comum depois do incremento.</li>
        <li><strong>v0.5.53</strong>: <code>x | 0</code> e <code>x &gt;&gt;&gt; 0</code> num valor conhecido-finito tornam-se um noop &mdash; apenas <code>fptosi + sitofp</code>, sem qualquer guarda.</li>
        <li><strong>v0.5.56</strong>: ops bitwise i32-nativas; &iacute;ndice e valor i32 em Uint8ArrayGet/Set.</li>
        <li><strong>v0.5.58, v0.5.60</strong>: <code>Math.imul</code> baixa para o multiply i32 nativo em vez do caminho polyfill. A dete&ccedil;&atilde;o de polyfill reconhece shims <code>Math.imul</code> escritos pelo utilizador e substitui-os.</li>
        <li><strong>v0.5.59</strong>: inlining de init de fun&ccedil;&atilde;o pura + seeding de inteiro local. A an&aacute;lise de inteiros ao n&iacute;vel da fun&ccedil;&atilde;o pode ver para al&eacute;m das fronteiras de chamada quando o callee &eacute; pequeno e puro.</li>
        <li><strong>v0.5.37-v0.5.40</strong>: fast path de aritm&eacute;tica de inteiros para padr&atilde;o acumulador. O cl&aacute;ssico loop <code>for (...) acc += f(i)</code> permanece em i32 de ponta a ponta quando os tipos o permitem.</li>
      </ul>
      <p>
        A v0.5.41 &eacute; a subtil. Quando o codegen v&ecirc; uma <code>const K: number[][] = [[...], ...]</code> ao n&iacute;vel de m&oacute;dulo, baixa a coisa toda para uma constante <code>[N x i32]</code> flat em <code>.rodata</code>. <code>K[y][x]</code> torna-se um &uacute;nico <code>getelementptr + load i32</code>. Combinado com a ponte de an&aacute;lise de inteiros na v0.5.43, isto &eacute; o que deu ao <code>image_conv</code> (um blur Gaussiano 5&times;5 sobre um frame RGB 4K) um <strong>speedup de 3x numa &uacute;nica release</strong>.
      </p>

      <h2>5. Buffers e Uint8Array</h2>
      <p>
        Workloads bin&aacute;rios &mdash; crypto, processamento de imagens, parsing, redes &mdash; vivem em Buffer e Uint8Array. A v0.5.64 deu-lhes <strong>slots de ponteiros tipados mais metadados <code>noalias</code></strong>. Onde um Buffer costumava ser um double NaN-boxed num <code>alloca double</code>, agora &eacute; um ponteiro <code>i64</code> cru num <code>alloca i64</code>, com anota&ccedil;&otilde;es LLVM a dizer ao otimizador &ldquo;este ponteiro n&atilde;o faz alias com outros ponteiros no escopo.&rdquo; Isso desbloqueia reordena&ccedil;&atilde;o de load/store, vetoriza&ccedil;&atilde;o e aloca&ccedil;&atilde;o de registos que o otimizador de outra forma recusaria fazer.
      </p>
      <p>
        A v0.5.80 fechou a quest&atilde;o final de corre&ccedil;&atilde;o aqui: um contador de <code>alias-scope</code> de buffer ao n&iacute;vel do m&oacute;dulo que estava a ser resetado por fun&ccedil;&atilde;o, o que podia em casos raros deixar o LLVM raciocinar atrav&eacute;s de escopos que n&atilde;o deviam partilhar um ID de escopo. Agora o contador &eacute; ao n&iacute;vel do m&oacute;dulo e a hist&oacute;ria do <code>noalias</code> &eacute; herm&eacute;tica.
      </p>
      <p>
        A v0.5.53 tornou <code>Uint8ArraySet</code> sem branches &mdash; um store mascarado em vez de um if/else que escrevia 0 fora dos limites. A v0.5.54 adicionou um <strong>indexOf Two-Way</strong> para padr&otilde;es mais longos e um <code>split</code> alocado em arena, que juntos fecharam a maior parte da lacuna no parsing de Buffer com strings pesadas.
      </p>

      <h2>6. Strings: ASCII &eacute; o fast path</h2>
      <p>
        Strings JavaScript s&atilde;o UTF-16, mas a maioria das strings do mundo real (chaves, identificadores, cabe&ccedil;alhos HTTP, estrutura JSON) s&atilde;o ASCII. A v0.5.71 adicionou um <strong><code>charCodeAt</code> e <code>codePointAt</code> O(1) para strings ASCII</strong> &mdash; sem scan UTF-16, apenas um load de byte. A v0.5.20 j&aacute; fazia com que <code>indexOf</code>, <code>slice</code> e <code>charAt</code> ignorassem o scan UTF-16 em ASCII.
      </p>
      <p>
        Uma nota de corre&ccedil;&atilde;o dentro dessa mesma release: <code>String.length</code> agora retorna unidades de c&oacute;digo UTF-16 (especifica&ccedil;&atilde;o ECMAScript) em vez da contagem de bytes. Isso era um bug latente onde <code>&quot;caf&eacute;&quot;.length</code> retornava 5 em vez de 4.
      </p>

      <h2>7. Os servidores agora realmente mant&ecirc;m-se de p&eacute;</h2>
      <p>
        O trabalho menos glamoroso da semana foi tamb&eacute;m o mais vis&iacute;vel para o utilizador: fazer com que servidores longos estilo Node &mdash; Fastify, ws, http, net &mdash; n&atilde;o crashassem ap&oacute;s alguns minutos.
      </p>
      <p>
        Os crashes partilhavam todos uma causa raiz: o GC n&atilde;o sabia sobre closures de listeners. Quando se escreve <code>wss.on(&apos;message&apos;, handler)</code>, a closure captura vari&aacute;veis, que vivem como campos dentro de uma c&eacute;lula alocada pelo GC. Se o scanner de roots do GC n&atilde;o sabe que deve visitar essas c&eacute;lulas, as suas capturas s&atilde;o reclamadas e o pr&oacute;ximo evento de mensagem dereferencia mem&oacute;ria libertada.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.26</strong>: root-scan de closures de event listener de <code>net.Socket</code> (fecha #35).</li>
        <li><strong>v0.5.27</strong>: estender a <code>ws</code>, <code>http</code>, <code>events</code>, <code>fastify</code>.</li>
        <li><strong>v0.5.28</strong>: registar globais ao n&iacute;vel de m&oacute;dulo como roots do GC (fecha #36). Bug de lifetime uma camada acima.</li>
        <li><strong>v0.5.21</strong>: seguran&ccedil;a de <code>gc()</code> dentro de handlers de requisi&ccedil;&atilde;o Fastify/WebSocket &mdash; a chamada expl&iacute;cita ao GC estava a correr enquanto os handlers de requisi&ccedil;&atilde;o mantinham ponteiros para a arena (fecha #31).</li>
      </ul>
      <p>
        Junto com o trabalho do GC, a v0.5.20 entregou um <strong>main event loop</strong> &mdash; um real, n&atilde;o um placeholder &mdash; que mant&eacute;m servidores WebSocket e baseados em timer vivos em vez de sa&iacute;rem depois da &uacute;ltima chamada s&iacute;ncrona retornar (refs #28). Esta foi a &uacute;nica corre&ccedil;&atilde;o de maior impacto para quem quer que tentasse correr o Perry como um servidor HTTP em produ&ccedil;&atilde;o. Fastify agora mant&eacute;m-se de p&eacute;. Servidores WebSocket agora mant&ecirc;m-se de p&eacute;.
      </p>
      <p>
        A v0.5.19 corrigiu a incompatibilidade da ABI SysV AMD64 para args/returns de JSValue FFI &mdash; um problema em Linux onde chamadas FFI nativas podiam corromper argumentos silenciosamente. A v0.5.18 adicionou dispatch nativo para <code>axios</code> (get/post/put/delete/patch), incluindo <code>response.status</code> e <code>response.data</code>. A v0.5.30 corrigiu o dispatch de <code>fastify request.header()</code> e <code>request.headers[]</code>, que vinha a retornar undefined para lookups case-insensitive.
      </p>

      <h2>8. <code>@perry/postgres</code>: o driver que tornou tudo isto necess&aacute;rio</h2>
      <p>
        Muito do trabalho desta semana foi impulsionado por um workload: fazer um <a href="https://github.com/PerryTS/postgres" className="text-amber-400 hover:text-amber-300">driver Postgres</a> totalmente compat&iacute;vel com Node funcionar em Perry-native. O driver tem suporte a TLS, tem um registo de codecs cross-module, suporta cancel/close/notify, e agora faz benchmarks contra <code>pg</code>, <code>postgres.js</code>, e <code>tokio-postgres</code>.
      </p>
      <p>O trabalho de perf do lado do driver foi em paralelo com o do lado do compilador:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Hoist de codec por coluna</strong> e eliminar c&oacute;pias de Buffer por c&eacute;lula. BigInt(string) para int8 para evitar aloca&ccedil;&otilde;es intermedi&aacute;rias.</li>
        <li><strong>Construtor de Row din&acirc;mico por shape</strong> para rows em forma de objeto. Se a sua query sempre retorna as mesmas colunas, o driver constr&oacute;i um construtor de row especializado em shape na primeira vez e reutiliza-o &mdash; o que, em combina&ccedil;&atilde;o com o PIC do compilador, torna o acesso a campos em rows t&atilde;o r&aacute;pido como o acesso a campos em qualquer outro objeto.</li>
        <li><strong>Opt-out <code>parseTypes: &apos;minimal&apos;</code></strong> para chamadores que querem strings brutas para int8/numeric/date.</li>
      </ul>
      <p>
        Este &eacute; o loop de feedback positivo que o compilador sempre foi destinado a permitir. Um driver real revela gargalos reais. O gargalo recebe um reprodutor de uma linha registado como issue no GitHub. Uma semana de corre&ccedil;&otilde;es de compilador depois, o driver &eacute; mais r&aacute;pido e o compilador &eacute; mais r&aacute;pido para todos os outros tamb&eacute;m. Esse &eacute; o plano todo, comprimido em sete dias.
      </p>

      <h2>9. Corre&ccedil;&otilde;es de corre&ccedil;&atilde;o dignas de men&ccedil;&atilde;o</h2>
      <p>
        O trabalho de performance revela problemas de corre&ccedil;&atilde;o da mesma forma que dragar um rio revela carrinhos de supermercado. Uma lista parcial:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Promise.race</strong> estava a ler <code>.value</code> em rejei&ccedil;&atilde;o em vez de <code>.reason</code>, ent&atilde;o rejei&ccedil;&otilde;es eram engolidas silenciosamente (v0.5.13-v0.5.14).</li>
        <li><strong>Promise.any</strong> agora lan&ccedil;a um <code>AggregateError</code> apropriado quando todas as promises de entrada rejeitam. Adicionou <code>Promise.withResolvers</code> e corrigiu a ordena&ccedil;&atilde;o de <code>queueMicrotask</code>.</li>
        <li><strong><code>[...&quot;hello&quot;]</code></strong> agora produz um array de caracteres em vez de um objeto partido (fecha #16).</li>
        <li><strong>Aritm&eacute;tica BigInt e coer&ccedil;&atilde;o <code>BigInt()</code></strong> (fecha #33). O fast path i64 bigint (v0.5.29) torna o caso comum barato.</li>
        <li><strong>Buffer.indexOf / Buffer.includes</strong> com um argumento num&eacute;rico de byte estavam a comparar contra ponteiros de buffer em vez de valores de byte (fecha #56).</li>
        <li><strong>Opera&ccedil;&otilde;es bitwise com NaN/Infinity</strong> produzem 0 conforme a especifica&ccedil;&atilde;o ToInt32 (fecha #57).</li>
        <li><strong>Windows x86_64</strong>: cinco corre&ccedil;&otilde;es espec&iacute;ficas da plataforma &mdash; <code>localtime</code>, descoberta de <code>clang</code>, e uma m&atilde;o-cheia de ajustes de codegen &mdash; trouxeram o Windows x86_64 de volta ao verde (v0.5.72).</li>
      </ul>

      <h2>10. Os n&uacute;meros</h2>
      <p>
        O benchmark de destaque do &uacute;ltimo artigo foi <code>factorial</code> a 24,6x mais r&aacute;pido que o Node. Esse n&uacute;mero n&atilde;o mudou. O que se moveu esta semana &eacute; tudo ao redor:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Workload</th>
              <th className="text-right py-2 px-3">v0.5.12</th>
              <th className="text-right py-2 px-3">v0.5.80</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">JSON.parse (schema de 20 registos)</td><td className="text-right py-2 px-3">547x mais lento que Node</td><td className="text-right py-2 px-3">1,3x mais lento que Node</td><td className="text-right py-2 px-3 text-green-400 font-semibold">~420x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">image_conv (blur 4K 5&times;5)</td><td className="text-right py-2 px-3">1.980ms</td><td className="text-right py-2 px-3">457ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">4,3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">C&oacute;digo property-heavy (hit do PIC)</td><td className="text-right py-2 px-3">baseline</td><td className="text-right py-2 px-3">2-3x</td><td className="text-right py-2 px-3 text-green-400">2-3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3 text-green-400">1,3x</td></tr>
            <tr><td className="py-2 px-3">Uptime do Fastify sob carga</td><td className="text-right py-2 px-3">~60s antes do crash</td><td className="text-right py-2 px-3">indefinido</td><td className="text-right py-2 px-3 text-green-400">&infin;</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        A suite completa de 15 benchmarks contra o Node ainda &eacute; 14 vit&oacute;rias e 1 empate &mdash; a mesma tabela do &uacute;ltimo artigo, com n&uacute;meros ligeiramente melhores em toda a linha. O movimento real desta semana &eacute; em workloads que n&atilde;o estavam nessa suite: JSON, processamento de imagens, servidores de longa dura&ccedil;&atilde;o. Era onde as lacunas viviam, e &eacute; isso que foi fechado.
      </p>

      <h2>11. O que vem a seguir</h2>
      <p>
        O &uacute;nico benchmark que ainda estamos a perseguir &eacute; <code>image_conv</code> vs Zig. O Perry est&aacute; a 457ms; o Zig est&aacute; a 246ms. Essa lacuna &eacute; arquitet&oacute;nica, n&atilde;o ao n&iacute;vel de pass de otimiza&ccedil;&atilde;o, e vive em tr&ecirc;s lugares:
      </p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Locais de buffer tipados</strong>. A maior parte do trabalho de Buffer chegou esta semana, mas par&acirc;metros e locais de fun&ccedil;&atilde;o com tipo buffer ainda fazem unbox a cada acesso. A abordagem de slot <code>i64</code> que usamos para contadores de loop precisa de se estender a buffers.</li>
        <li><strong>Divis&atilde;o de loop interior/borda</strong>. O loop de blur faz clamp em cada pixel, incluindo os 99,9% de pixels que n&atilde;o precisam. Dividir em regi&otilde;es de borda (com clamp) e interior (sem clamp) permite ao LLVM vetorizar o interior com NEON <code>ld3</code>/<code>st3</code>.</li>
        <li><strong>Hash FNV-1a de ABI dupla</strong>. O helper de hash &eacute; chamado atrav&eacute;s da ABI NaN-box. Especializ&aacute;-lo para i64 bruto in/out em hot paths &eacute; algumas horas de trabalho que se v&atilde;o pagar em cada workload hash-heavy.</li>
      </ol>
      <p>
        Esses est&atilde;o rastreados em <code>PERF_ROADMAP.md</code>. Espere v&ecirc;-los no pr&oacute;ximo ciclo.
      </p>

      <h2>Fechando</h2>
      <p>
        O padr&atilde;o desta semana &mdash; 68 releases de patch, quase todas de performance, uma lacuna de JSON a ir de 547x para 1,3x &mdash; &eacute; o que acontece quando se passa para o lado bom da colina da migra&ccedil;&atilde;o para o LLVM. O otimizador &eacute; agora um aliado em vez de uma parede, e a maior parte do que resta &eacute; trabalho pequeno, espec&iacute;fico e mensur&aacute;vel: encontrar um slow path, descobrir porque &eacute; que o otimizador n&atilde;o consegue ver atrav&eacute;s dele, expor a estrutura, medir novamente. Nenhum destes commits &eacute; ex&oacute;tico. S&atilde;o apenas aplicados onde s&atilde;o precisos.
      </p>
      <p>
        Se quiser experimentar qualquer disto:
      </p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        C&oacute;digo-fonte: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}&mdash; Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>
        Issues, reprodutores, e benchmarks que n&atilde;o s&atilde;o r&aacute;pidos o suficiente: continuem a mand&aacute;-los. Este ritmo s&oacute; funciona porque os relat&oacute;rios de bugs s&atilde;o espec&iacute;ficos o suficiente para se tornarem reprodutores de uma linha. Cada commit neste artigo tem um <code>#N</code> anexado por uma raz&atilde;o.
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
