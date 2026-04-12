export default function Content() {
  return (
    <>
      <p>
        A migra&ccedil;&atilde;o do backend do Perry de Cranelift para LLVM est&aacute; conclu&iacute;da. A partir da v0.5.12, o LLVM &eacute; o &uacute;nico backend de gera&ccedil;&atilde;o de c&oacute;digo, e o Perry agora supera o Node.js em 14 de 15 benchmarks &mdash; com margens que v&atilde;o de 1,06x a 24,6x.
      </p>
      <p>
        Chegar aqui n&atilde;o foi um caminho linear. A transi&ccedil;&atilde;o inicial na v0.5.0 deixou v&aacute;rios benchmarks <strong>70x mais lentos</strong> do que a vers&atilde;o com Cranelift que substitui. Este artigo &eacute; a vers&atilde;o detalhada do que aconteceu, por que fizemos a troca mesmo assim, o que quebrou, o que resolveu, e como est&atilde;o os n&uacute;meros do outro lado.
      </p>
      <p>
        Se voc&ecirc; est&aacute; construindo um compilador, avaliando backends de codegen, ou simplesmente tem curiosidade sobre por que &ldquo;mudar para LLVM&rdquo; raramente &eacute; t&atilde;o simples quanto parece, isto &eacute; para voc&ecirc;.
      </p>

      <h2>Parte 1: Por Que Mudar?</h2>
      <p>
        O Perry compila TypeScript diretamente para c&oacute;digo de m&aacute;quina nativo. Sem Node, sem V8, sem Electron, sem WebView. A proposta &eacute; &ldquo;escreva TypeScript, gere um bin&aacute;rio nativo&rdquo;, e toda a proposta de valor desmorona se esse bin&aacute;rio n&atilde;o for realmente r&aacute;pido.
      </p>
      <p>
        Nas primeiras vers&otilde;es do Perry, o backend de codegen era o <a href="https://cranelift.dev/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Cranelift</a>. O Cranelift &eacute; excelente &mdash; &eacute; o codegen por tr&aacute;s do wasmtime, &eacute; usado pelo JIT baseline do SpiderMonkey, e &eacute; a ferramenta ideal quando se precisa de compila&ccedil;&atilde;o r&aacute;pida e previs&iacute;vel com uma hist&oacute;ria de integra&ccedil;&atilde;o limpa. Para um projeto iniciando uma nova linguagem, foi o ponto de partida certo.
      </p>
      <p>
        Mas duas coisas acabaram nos afastando dele.
      </p>

      <h3>1. O teto do otimizador</h3>
      <p>
        O Cranelift &eacute; intencionalmente um compilador otimizador r&aacute;pido de n&iacute;vel &uacute;nico. Seu mandato &eacute; &ldquo;produzir c&oacute;digo decente rapidamente&rdquo;, n&atilde;o &ldquo;produzir o melhor c&oacute;digo poss&iacute;vel sem limite de tempo.&rdquo; Esse &eacute; o tradeoff certo para um JIT. &Eacute; o tradeoff errado para um compilador AOT cuja principal proposta &eacute; o desempenho nativo.
      </p>
      <p>
        O LLVM teve mais de duas d&eacute;cadas de trabalho investidas no seu middle-end. Vetoriza&ccedil;&atilde;o de loops, LICM, GVN, SCCP, combina&ccedil;&atilde;o de instru&ccedil;&otilde;es, heur&iacute;sticas de inlining, reassocia&ccedil;&atilde;o fast-math, an&aacute;lise de alias &mdash; n&atilde;o existe universo realista em que um projeto menor alcance isso. Se o Perry vai afirmar &ldquo;mais r&aacute;pido que o Node&rdquo;, precisamos dessa maquinaria.
      </p>

      <h3>2. O problema do arm64_32</h3>
      <p>
        O fator decisivo imediato foi o Apple Watch. <code>arm64_32</code> &eacute; uma ABI que a Apple introduziu para o Series 4 em diante &mdash; instru&ccedil;&otilde;es de 64 bits, ponteiros de 32 bits. O Cranelift n&atilde;o suporta isso, e n&atilde;o havia caminho realista para o suporte chegar. Para o Perry afirmar com credibilidade &ldquo;9 plataformas a partir de um &uacute;nico c&oacute;digo&rdquo;, o watchOS n&atilde;o podia faltar. O LLVM suporta <code>arm64_32</code> nativamente.
      </p>
      <p>
        Uma vez que aceitamos que <em>alguns</em> alvos exigiriam LLVM, manter dois backends tornou-se insustent&aacute;vel. Dois backends significam dois conjuntos de bugs, dois conjuntos de passes de otimiza&ccedil;&atilde;o, duas matrizes de testes, duas baselines de desempenho. A resposta honesta foi: escolher um.
      </p>
      <p>Escolhemos o LLVM.</p>

      <h2>Parte 2: Sobre o Cranelift</h2>
      <p>
        Antes de prosseguir: este artigo n&atilde;o &eacute; uma cr&iacute;tica ao Cranelift. O Cranelift &eacute; uma pe&ccedil;a brilhante de engenharia, e se voc&ecirc; est&aacute; construindo um JIT, um runtime sandboxed, ou qualquer coisa onde a lat&ecirc;ncia de compila&ccedil;&atilde;o importa mais que o throughput m&aacute;ximo, ele deve estar no topo da sua lista. O wasmtime o utiliza por bons motivos. A Bytecode Alliance tem feito um trabalho exemplar.
      </p>
      <p>
        As necessidades do Perry s&atilde;o simplesmente diferentes. Compilamos antecipadamente, geramos o bin&aacute;rio uma vez, e o utilizador executa-o milh&otilde;es de vezes. Essa assimetria &mdash; compilar raramente, executar sempre &mdash; &eacute; exatamente o regime em que o otimizador mais pesado do LLVM se paga. Ferramenta diferente para um trabalho diferente.
      </p>

      <h2>Parte 3: O Desastre da Transi&ccedil;&atilde;o</h2>
      <p>
        A v0.5.0 foi a primeira release com o LLVM como &uacute;nico backend. Esper&aacute;vamos uma pequena regress&atilde;o no tempo de compila&ccedil;&atilde;o e uma melhoria significativa no desempenho em runtime. Obtivemos o oposto do segundo.
      </p>
      <p>Aqui est&aacute; a tabela que eu n&atilde;o queria publicar na altura:</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Cranelift</th>
              <th className="text-right py-2 px-3">LLVM v0.5.0</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3">1,084ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">68x mais lento</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">5ms</td><td className="text-right py-2 px-3">318ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">64x mais lento</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">61ms</td><td className="text-right py-2 px-3">184ms</td><td className="text-right py-2 px-3 text-red-400">3x mais lento</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">370ms</td><td className="text-right py-2 px-3">131ms</td><td className="text-right py-2 px-3 text-green-400">2,8x mais r&aacute;pido</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">32ms</td><td className="text-right py-2 px-3">57ms</td><td className="text-right py-2 px-3 text-red-400">1,8x mais lento</td></tr>
            <tr><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">505ms</td><td className="text-right py-2 px-3">1,156ms</td><td className="text-right py-2 px-3 text-red-400">2,3x mais lento</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        Algumas cargas de trabalho ficaram mais r&aacute;pidas. A maioria ficou dramaticamente pior. <code>method_calls</code> &mdash; um dos benchmarks mais importantes porque representa o uso idiom&aacute;tico de classes TypeScript &mdash; ficou quase 70x pior do que o que hav&iacute;amos publicado duas releases antes.
      </p>

      <h3>O que realmente deu errado</h3>
      <p>
        O Perry usa <strong>NaN-boxing</strong> para representa&ccedil;&atilde;o de valores. Cada valor TypeScript &eacute; uma word de 64 bits. N&uacute;meros f64 s&atilde;o armazenados diretamente; tudo o mais (objetos, strings, booleanos, undefined, null) &eacute; codificado nos bits n&atilde;o utilizados de um quiet NaN IEEE 754.
      </p>
      <p>
        A vantagem: n&uacute;meros s&atilde;o custo zero. Sem boxing, sem tagging, sem aloca&ccedil;&atilde;o para aritm&eacute;tica.
      </p>
      <p>
        A desvantagem: cada opera&ccedil;&atilde;o sobre um valor n&atilde;o num&eacute;rico requer manipula&ccedil;&atilde;o de bits para desempacotar, operar e reempacotar. Se essas sequ&ecirc;ncias vivem como IR inline no seu codegen, o otimizador pode fundi-las e simplific&aacute;-las. Se vivem como <strong>chamadas a fun&ccedil;&otilde;es helper do runtime</strong>, o otimizador v&ecirc; uma chamada opaca e desiste.
      </p>
      <p>
        O nosso backend Cranelift tinha desenvolvido um grande n&uacute;mero de lowerings inline para opera&ccedil;&otilde;es frequentes &mdash; cargas de propriedades, dispatch de m&eacute;todos, aloca&ccedil;&atilde;o de objetos, aritm&eacute;tica inteira em valores tagged como f64. A transi&ccedil;&atilde;o para LLVM, no interesse de gerar c&oacute;digo <em>correto</em> primeiro, encaminhou quase todas essas opera&ccedil;&otilde;es para helpers do runtime no <code>perry-runtime</code>. Cada helper era uma instru&ccedil;&atilde;o <code>call</code> no LLVM IR.
      </p>
      <p>
        O LLVM &eacute; excelente, mas n&atilde;o consegue fazer inline de uma fun&ccedil;&atilde;o cujo corpo nunca viu. <code>perry-runtime</code> &eacute; compilado separadamente, ligado no final, e da perspetiva do otimizador cada chamada de helper &eacute; uma caixa preta. O resultado foi que loops quentes que o backend Cranelift tinha compilado para ~5 instru&ccedil;&otilde;es de aritm&eacute;tica inline estavam agora a compilar para chamadas de fun&ccedil;&atilde;o &mdash; saves de registos, configura&ccedil;&atilde;o de stack frame, tudo isso &mdash; repetidas milh&otilde;es de vezes.
      </p>
      <p>
        &Eacute; da&iacute; que vieram os 70x. N&atilde;o codegen mau. M&aacute;s <strong>fronteiras de inlining</strong>.
      </p>

      <h2>Parte 4: A Corre&ccedil;&atilde;o</h2>
      <p>
        O trabalho para recuperar e superar os n&uacute;meros do Cranelift dividiu-se em cerca de seis categorias. Nenhuma delas &eacute; ex&oacute;tica. A maioria s&atilde;o otimiza&ccedil;&otilde;es de compilador cl&aacute;ssicas que s&oacute; precisavam de ser aplicadas nos lugares certos.
      </p>

      <h3>1. Bump allocator inline para aloca&ccedil;&atilde;o de objetos</h3>
      <p>
        <code>object_create</code> foi a pior regress&atilde;o depois de <code>method_calls</code>. O caminho antigo chamava <code>js_object_alloc_class_with_keys</code> para cada <code>new Point()</code> &mdash; uma chamada de fun&ccedil;&atilde;o, um acesso a arena thread-local, uma busca no cache de shapes, e uma escrita do cabe&ccedil;alho GC + cabe&ccedil;alho do objeto.
      </p>
      <p>
        A corre&ccedil;&atilde;o: emitir a bump allocation <strong>inline</strong> no LLVM IR. Cada fun&ccedil;&atilde;o que aloca objetos recebe um ponteiro em cache para uma struct <code>InlineArenaState</code> thread-local. A aloca&ccedil;&atilde;o torna-se:
      </p>
      <pre><code>{`; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr           ; current bump offset
%new_off = add i64 %offset, 96              ; GcHeader(8) + ObjectHeader(24) + 8 fields(64)
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr            ; current block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow
fast:
  store i64 %new_off, ptr %off_ptr          ; bump the offset
  %data = load ptr, ptr %state              ; data pointer at offset 0
  %raw  = getelementptr i8, ptr %data, i64 %offset
  store i64 <packed_gc_header>, ptr %raw    ; GcHeader as one i64
slow:
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)`}</code></pre>
      <p>
        O fast path s&atilde;o ~13 instru&ccedil;&otilde;es de IR inline que o LLVM pode ver, escalonar e elevar de loops. <code>object_create</code> foi de 318ms para 9ms.
      </p>

      <h3>2. Contadores de loop i32</h3>
      <p>
        NaN-boxing significa que cada n&uacute;mero TypeScript &eacute; f64. Isso inclui contadores de loop. Um loop <code>{'for (let i = 0; i < 100_000_000; i++)'}</code> com vari&aacute;veis de indu&ccedil;&atilde;o f64 &eacute; um desastre: incremento f64, compara&ccedil;&atilde;o f64, convers&atilde;o f64-para-i64 cada vez que se indexa um array.
      </p>
      <p>
        O codegen deteta for-loops onde a vari&aacute;vel de indu&ccedil;&atilde;o &eacute; comprovadamente inteira e aloca um <strong>slot de stack i32 paralelo</strong>. A condi&ccedil;&atilde;o do loop muda de <code>fcmp</code> para <code>icmp slt i32</code>, eliminando o contador f64 inteiramente.
      </p>
      <p>
        Isso moveu <code>array_write</code> de 11ms para 3ms, <code>nested_loops</code> de 18ms para 9ms, e <code>array_read</code> de 11ms para 4ms.
      </p>

      <h3>3. Flags fast-math</h3>
      <p>
        Adicionamos flags <code>reassoc contract</code> a cada instru&ccedil;&atilde;o aritm&eacute;tica f64. <code>reassoc</code> permite ao LLVM quebrar cadeias seriais de acumuladores em paralelas, e <code>contract</code> permite fused multiply-add. Mantemos <code>nnan</code> e <code>ninf</code> desligados porque o Perry usa bits NaN como tags de valores.
      </p>
      <p>
        Com essas flags, o vetorizador de loops do LLVM entra em a&ccedil;&atilde;o no <code>math_intensive</code>, que caiu de 131ms para 14ms &mdash; superando o Node em 3,5x.
      </p>

      <h3>4. Fast path para m&oacute;dulo inteiro</h3>
      <p>
        <code>%</code> em f64 no JavaScript &eacute; <code>fmod</code>, que &eacute; uma chamada libm no ARM. Mas para operandos f64 com valores inteiros, podemos fazer <code>fptosi &rarr; srem &rarr; sitofp</code> e ignorar completamente a ida-e-volta pela libm. O codegen usa an&aacute;lise est&aacute;tica para detetar operandos com valores inteiros &mdash; sem verifica&ccedil;&atilde;o em runtime necess&aacute;ria.
      </p>
      <p>
        Esta &eacute; a raz&atilde;o completa pela qual <code>factorial</code> foi de 1.553ms para 24ms &mdash; e de 591ms do Node para 24ms. <strong>24,6x mais r&aacute;pido que o Node.</strong>
      </p>

      <h3>5. LICM para loops aninhados</h3>
      <p>
        O LLVM faz loop-invariant code motion nativamente, mas o NaN-boxing esconde a estrutura. <code>arr.length</code> converte-se numa carga atrav&eacute;s de um ponteiro NaN-boxed com verifica&ccedil;&atilde;o de tag &mdash; n&atilde;o &eacute; obviamente invariante.
      </p>
      <p>
        O codegen deteta o padr&atilde;o <code>{'for (...; i < arr.length; ...)'}</code> e pr&eacute;-carrega o comprimento num slot de stack antes do loop, com um walker est&aacute;tico a verificar que o corpo do loop n&atilde;o pode alterar o comprimento do array. Quando o contador &eacute; limitado por este comprimento elevado, IndexGet/IndexSet ignoram verifica&ccedil;&otilde;es de limites inteiramente.
      </p>

      <h3>6. Objetos com cache de shape</h3>
      <p>
        Quando o codegen conhece a classe de um objeto, resolve os offsets dos campos em tempo de compila&ccedil;&atilde;o e emite <strong>cargas indexadas diretas</strong> &mdash; sem dispatch em runtime. Para dispatch de m&eacute;todos, <code>obj.method(args)</code> torna-se um <code>call @perry_method_Class_name(this, args)</code> direto &mdash; sem vtable, sem inline cache, sem hash lookup.
      </p>
      <p>
        A transi&ccedil;&atilde;o para LLVM tinha regredido isto para o slow path universal. Restaurar o dispatch est&aacute;tico deu-nos a recupera&ccedil;&atilde;o de <code>method_calls</code> &mdash; de 1.084ms de volta para 1ms. <strong>11x mais r&aacute;pido que o Node.</strong>
      </p>

      <h2>Parte 5: Os N&uacute;meros Atuais</h2>
      <p>Mediana de tr&ecirc;s execu&ccedil;&otilde;es, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Node.js</th>
              <th className="text-right py-2 px-3">vs Node</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">factorial</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">591ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">24.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">11ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">11x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_overhead</td><td className="text-right py-2 px-3">12ms</td><td className="text-right py-2 px-3">53ms</td><td className="text-right py-2 px-3 text-green-400">4.4x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">14ms</td><td className="text-right py-2 px-3">49ms</td><td className="text-right py-2 px-3 text-green-400">3.5x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_read</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">13ms</td><td className="text-right py-2 px-3 text-green-400">3.2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">closure</td><td className="text-right py-2 px-3">97ms</td><td className="text-right py-2 px-3">303ms</td><td className="text-right py-2 px-3 text-green-400">3.1x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_write</td><td className="text-right py-2 px-3">3ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-green-400">2.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">string_concat</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">2ms</td><td className="text-right py-2 px-3 text-green-400">2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">prime_sieve</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">7ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">21ms</td><td className="text-right py-2 px-3">34ms</td><td className="text-right py-2 px-3 text-green-400">1.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">932ms</td><td className="text-right py-2 px-3">991ms</td><td className="text-right py-2 px-3 text-green-400">1.06x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">binary_trees</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3 text-slate-400">empate</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">mandelbrot</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3 text-slate-400">empate</td></tr>
            <tr><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-red-400">0.9x</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        14 de 15 vit&oacute;rias. A &uacute;nica derrota &eacute; <code>object_create</code>, onde o alocador do V8 &eacute; genuinamente excelente e estamos a 12% de dist&acirc;ncia.
      </p>

      <h2>Parte 6: A Quest&atilde;o do Tempo de Compila&ccedil;&atilde;o</h2>
      <p>
        A raz&atilde;o n&uacute;mero um pela qual as pessoas escolhem Cranelift em vez de LLVM &eacute; a velocidade de compila&ccedil;&atilde;o. Ent&atilde;o vamos falar disso.
      </p>
      <p>
        O LLVM aumentou o tempo de compila&ccedil;&atilde;o por ficheiro do Perry em <strong>20-50ms</strong>, ou cerca de <strong>8-19%</strong>. N&atilde;o 5x. N&atilde;o 2x. Percentagem de um d&iacute;gito a dois d&iacute;gitos baixos.
      </p>
      <p>
        A raz&atilde;o &eacute; que codegen n&atilde;o &eacute; o gargalo no pipeline do Perry. A distribui&ccedil;&atilde;o para um ficheiro t&iacute;pico:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Parsing SWC: ~30%</li>
        <li>Lowering HIR (AST &rarr; IR, infer&ecirc;ncia de tipos): ~25%</li>
        <li>Passes de transforma&ccedil;&atilde;o IR (convers&atilde;o de closures, lowering async, inlining): ~15%</li>
        <li><strong>Codegen (emiss&atilde;o de texto LLVM IR + <code>clang -c -O3</code>): ~20%</strong></li>
        <li>Linking (<code>cc</code> + biblioteca de runtime): ~10%</li>
      </ul>
      <p>
        Codegen &eacute; uma fatia de cinco. Mesmo duplicando essa fatia, o total move-se apenas 5-10%. Se voc&ecirc; est&aacute; construindo um compilador AOT onde o utilizador executa <code>perry compile</code> uma vez e depois executa o bin&aacute;rio para sempre, o c&aacute;lculo &eacute;: gastar 25ms a mais na compila&ccedil;&atilde;o, poupar at&eacute; 24x em cada execu&ccedil;&atilde;o.
      </p>

      <h2>Parte 7: O Que Faria Diferente</h2>
      <p>
        Se eu estivesse a come&ccedil;ar o Perry hoje e pudesse saltar diretamente para LLVM, n&atilde;o o faria. A fase Cranelift foi genuinamente valiosa. Permitiu-nos iterar no frontend sem a complexidade do LLVM, deu-nos uma baseline funcional para compara&ccedil;&atilde;o, e for&ccedil;ou-nos a manter o nosso HIR limpo o suficiente para ser port&aacute;vel entre backends.
      </p>
      <p>
        O que faria diferente &eacute; a transi&ccedil;&atilde;o em si. Lan&ccedil;&aacute;mos a v0.5.0 com a maioria das opera&ccedil;&otilde;es a passar por chamadas de helper do runtime, com a inten&ccedil;&atilde;o de as tornar inline mais tarde. Isso estava errado. A ordem certa teria sido: identificar os hot paths primeiro, baix&aacute;-los inline antes da transi&ccedil;&atilde;o, e s&oacute; lan&ccedil;ar quando o backend LLVM estivesse pelo menos em paridade.
      </p>
      <p>
        A li&ccedil;&atilde;o &eacute; a &oacute;bvia: fronteiras de otimiza&ccedil;&atilde;o importam mais que a qualidade do otimizador. O LLVM &eacute; uma pe&ccedil;a not&aacute;vel de software, mas n&atilde;o pode ajud&aacute;-lo com c&oacute;digo que n&atilde;o consegue ver. Se o seu codegen encaminha tudo atrav&eacute;s de chamadas opacas ao runtime, voc&ecirc; construiu uma parede entre o seu programa-fonte e cada pass de otimiza&ccedil;&atilde;o existente.
      </p>

      <h2>Conclus&atilde;o</h2>
      <p>
        O Perry &eacute; agora exclusivamente LLVM, mais r&aacute;pido que o Node em 14 de 15 benchmarks, e em produ&ccedil;&atilde;o. A migra&ccedil;&atilde;o demorou mais do que planei, doeu mais do que esperava no meio, e &eacute; inquestionavelmente a decis&atilde;o certa em retrospetiva. O Cranelift levou-nos at&eacute; a v0.5; o LLVM est&aacute; a levar-nos o resto do caminho.
      </p>
      <p>Se quiser experimentar o Perry:</p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        C&oacute;digo-fonte: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}&mdash; Execute os benchmarks voc&ecirc; mesmo: <code>cd benchmarks/suite && ./run_benchmarks.sh</code>
      </p>
      <p>
        Se tiver perguntas, encontrar bugs, ou quiser debater sobre backends de codegen, as issues do GitHub est&atilde;o abertas. Eu leio todas.
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
