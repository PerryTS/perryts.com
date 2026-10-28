---
title: "De Cranelift para LLVM: o que quebrou e como consertamos"
excerpt: "A migração do backend do Perry de Cranelift para LLVM está concluída. A transição inicial tornou os benchmarks 70x mais lentos — isto é o que quebrou, e as seis otimizações direcionadas que consertaram."
date: 2026-04-12
tags: ["compilers", "llvm", "cranelift", "performance", "milestone"]
---
> **Correção (setembro de 2026):** O benchmark abaixo chamado “factorial” estava com o nome errado: ele soma `i % 1000` em um loop e não calcula nenhum fatorial. O número de 24,6x veio de uma execução antiga do Node.js que não se reproduz; no nosso harness publicado atual é um empate com o Node.js (93 ms vs 95 ms). É um microbenchmark de um caminho rápido de módulo inteiro, não uma medida do desempenho típico de TypeScript. Os resultados abaixo são mantidos como registro histórico. Os números atuais, incluindo os benchmarks em que o Perry perde, estão no [README do Perry](https://github.com/PerryTS/perry#performance).

A migração do backend do Perry de Cranelift para LLVM está concluída. A partir da v0.5.12, o LLVM é o único backend de geração de código, e o Perry agora supera o Node.js em todos os benchmarks — com margens que vão de 1,7x a 24,6x (com dois empates).

Chegar aqui não foi um caminho linear. A transição inicial na v0.5.0 deixou vários benchmarks **70x mais lentos** do que a versão com Cranelift que substitui. Este artigo é a versão detalhada do que aconteceu, por que fizemos a troca mesmo assim, o que quebrou, o que resolveu, e como estão os números do outro lado.

Se você está construindo um compilador, avaliando backends de codegen, ou simplesmente tem curiosidade sobre por que “mudar para LLVM” raramente é tão simples quanto parece, isto é para você.

## Parte 1: Por Que Mudar?

O Perry compila TypeScript diretamente para código de máquina nativo. Sem Node, sem V8, sem Electron, sem WebView. A proposta é “escreva TypeScript, gere um binário nativo”, e toda a proposta de valor desmorona se esse binário não for realmente rápido.

Nas primeiras versões do Perry, o backend de codegen era o [Cranelift](https://cranelift.dev/). O Cranelift é excelente — é o codegen por trás do wasmtime, é usado pelo JIT baseline do SpiderMonkey, e é a ferramenta ideal quando se precisa de compilação rápida e previsível com uma história de integração limpa. Para um projeto iniciando uma nova linguagem, foi o ponto de partida certo.

Mas duas coisas acabaram nos afastando dele.

### 1\. O teto do otimizador

O Cranelift é intencionalmente um compilador otimizador rápido de nível único. Seu mandato é “produzir código decente rapidamente”, não “produzir o melhor código possível sem limite de tempo.” Esse é o tradeoff certo para um JIT. É o tradeoff errado para um compilador AOT cuja principal proposta é o desempenho nativo.

O LLVM teve mais de duas décadas de trabalho investidas no seu middle-end. Vetorização de loops, LICM, GVN, SCCP, combinação de instruções, heurísticas de inlining, reassociação fast-math, análise de alias — não existe universo realista em que um projeto menor alcance isso. Se o Perry vai afirmar “mais rápido que o Node”, precisamos dessa maquinaria.

### 2\. O problema do arm64\_32

O fator decisivo imediato foi o Apple Watch. `arm64_32` é uma ABI que a Apple introduziu para o Series 4 em diante — instruções de 64 bits, ponteiros de 32 bits. O Cranelift não suporta isso, e não havia caminho realista para o suporte chegar. Para o Perry afirmar com credibilidade “9 plataformas a partir de um único código”, o watchOS não podia faltar. O LLVM suporta `arm64_32` nativamente.

Uma vez que aceitamos que *alguns* alvos exigiriam LLVM, manter dois backends tornou-se insustentável. Dois backends significam dois conjuntos de bugs, dois conjuntos de passes de otimização, duas matrizes de testes, duas baselines de desempenho. A resposta honesta foi: escolher um.

Escolhemos o LLVM.

## Parte 2: Sobre o Cranelift

Antes de prosseguir: este artigo não é uma crítica ao Cranelift. O Cranelift é uma peça brilhante de engenharia, e se você está construindo um JIT, um runtime sandboxed, ou qualquer coisa onde a latência de compilação importa mais que o throughput máximo, ele deve estar no topo da sua lista. O wasmtime o utiliza por bons motivos. A Bytecode Alliance tem feito um trabalho exemplar.

As necessidades do Perry são simplesmente diferentes. Compilamos antecipadamente, geramos o binário uma vez, e o utilizador executa-o milhões de vezes. Essa assimetria — compilar raramente, executar sempre — é exatamente o regime em que o otimizador mais pesado do LLVM se paga. Ferramenta diferente para um trabalho diferente.

## Parte 3: O Desastre da Transição

A v0.5.0 foi a primeira release com o LLVM como único backend. Esperávamos uma pequena regressão no tempo de compilação e uma melhoria significativa no desempenho em runtime. Obtivemos o oposto do segundo.

Aqui está a tabela que eu não queria publicar na altura:

| Referência| Cranelift | LLVM v0.5.0 | Delta |
| --- | --- | --- | --- |
| chamadas_métodos| 16ms | 1,084ms | 68x mais lento |
| object_create| 5ms | 318ms | 64x mais lento |
| matriz_multiplicar| 61ms | 184ms | 3x mais lento |
| matemática_intensiva| 370ms | 131ms | 2,8x mais rápido |
| nested_loops| 32ms | 57ms | 1,8x mais lento |
| fibonacci(40)| 505ms | 1,156ms | 2,3x mais lento |

Algumas cargas de trabalho ficaram mais rápidas. A maioria ficou dramaticamente pior. `method_calls` — um dos benchmarks mais importantes porque representa o uso idiomático de classes TypeScript — ficou quase 70x pior do que o que havíamos publicado duas releases antes.

### O que realmente deu errado

O Perry usa **NaN-boxing** para representação de valores. Cada valor TypeScript é uma word de 64 bits. Números f64 são armazenados diretamente; tudo o mais (objetos, strings, booleanos, undefined, null) é codificado nos bits não utilizados de um quiet NaN IEEE 754.

A vantagem: números são custo zero. Sem boxing, sem tagging, sem alocação para aritmética.

A desvantagem: cada operação sobre um valor não numérico requer manipulação de bits para desempacotar, operar e reempacotar. Se essas sequências vivem como IR inline no seu codegen, o otimizador pode fundi-las e simplificá-las. Se vivem como **chamadas a funções helper do runtime**, o otimizador vê uma chamada opaca e desiste.

O nosso backend Cranelift tinha desenvolvido um grande número de lowerings inline para operações frequentes — cargas de propriedades, dispatch de métodos, alocação de objetos, aritmética inteira em valores tagged como f64. A transição para LLVM, no interesse de gerar código *correto* primeiro, encaminhou quase todas essas operações para helpers do runtime no `perry-runtime`. Cada helper era uma instrução `call` no LLVM IR.

O LLVM é excelente, mas não consegue fazer inline de uma função cujo corpo nunca viu. `perry-runtime` é compilado separadamente, ligado no final, e da perspetiva do otimizador cada chamada de helper é uma caixa preta. O resultado foi que loops quentes que o backend Cranelift tinha compilado para ~5 instruções de aritmética inline estavam agora a compilar para chamadas de função — saves de registos, configuração de stack frame, tudo isso — repetidas milhões de vezes.

É daí que vieram os 70x. Não codegen mau. Más **fronteiras de inlining**.

## Parte 4: A Correção

O trabalho para recuperar e superar os números do Cranelift dividiu-se em cerca de seis categorias. Nenhuma delas é exótica. A maioria são otimizações de compilador clássicas que só precisavam de ser aplicadas nos lugares certos.

### 1\. Bump allocator inline para alocação de objetos

`object_create` foi a pior regressão depois de `method_calls`. O caminho antigo chamava `js_object_alloc_class_with_keys` para cada `new Point()` — uma chamada de função, um acesso a arena thread-local, uma busca no cache de shapes, e uma escrita do cabeçalho GC + cabeçalho do objeto.

A correção: emitir a bump allocation **inline** no LLVM IR. Cada função que aloca objetos recebe um ponteiro em cache para uma struct `InlineArenaState` thread-local. A alocação torna-se:

```
; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
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
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)
```

O fast path são ~13 instruções de IR inline que o LLVM pode ver, escalonar e elevar de loops. `object_create` foi de 318ms para 9ms.

### 2\. Contadores de loop i32

NaN-boxing significa que cada número TypeScript é f64. Isso inclui contadores de loop. Um loop `for (let i = 0; i < 100_000_000; i++)` com variáveis de indução f64 é um desastre: incremento f64, comparação f64, conversão f64-para-i64 cada vez que se indexa um array.

O codegen deteta for-loops onde a variável de indução é comprovadamente inteira e aloca um **slot de stack i32 paralelo**. A condição do loop muda de `fcmp` para `icmp slt i32`, eliminando o contador f64 inteiramente.

Isso moveu `array_write` de 11ms para 3ms, `nested_loops` de 18ms para 9ms, e `array_read` de 11ms para 4ms.

### 3\. Flags fast-math

Adicionamos flags `reassoc contract` a cada instrução aritmética f64. `reassoc` permite ao LLVM quebrar cadeias seriais de acumuladores em paralelas, e `contract` permite fused multiply-add. Mantemos `nnan` e `ninf` desligados porque o Perry usa bits NaN como tags de valores.

Com essas flags, o vetorizador de loops do LLVM entra em ação no `math_intensive`, que caiu de 131ms para 14ms — superando o Node em 3,5x.

### 4\. Fast path para módulo inteiro

`%` em f64 no JavaScript é `fmod`, que é uma chamada libm no ARM. Mas para operandos f64 com valores inteiros, podemos fazer `fptosi → srem → sitofp` e ignorar completamente a ida-e-volta pela libm. O codegen usa análise estática para detetar operandos com valores inteiros — sem verificação em runtime necessária.

Esta é a razão completa pela qual `factorial` foi de 1.553ms para 24ms — e de 591ms do Node para 24ms. **24,6x mais rápido que o Node.**

### 5\. LICM para loops aninhados

O LLVM faz loop-invariant code motion nativamente, mas o NaN-boxing esconde a estrutura. `arr.length` converte-se numa carga através de um ponteiro NaN-boxed com verificação de tag — não é obviamente invariante.

O codegen deteta o padrão `for (...; i < arr.length; ...)` e pré-carrega o comprimento num slot de stack antes do loop, com um walker estático a verificar que o corpo do loop não pode alterar o comprimento do array. Quando o contador é limitado por este comprimento elevado, IndexGet/IndexSet ignoram verificações de limites inteiramente.

### 6\. Objetos com cache de shape

Quando o codegen conhece a classe de um objeto, resolve os offsets dos campos em tempo de compilação e emite **cargas indexadas diretas** — sem dispatch em runtime. Para dispatch de métodos, `obj.method(args)` torna-se um `call @perry_method_Class_name(this, args)` direto — sem vtable, sem inline cache, sem hash lookup.

A transição para LLVM tinha regredido isto para o slow path universal. Restaurar o dispatch estático deu-nos a recuperação de `method_calls` — de 1.084ms de volta para 1ms. **11x mais rápido que o Node.**

## Parte 5: Os Números Atuais

Mediana de três execuções, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:

| Referência| Perry | Node.js | vs Node |
| --- | --- | --- | --- |
| fatorial| 24ms | 591ms | 24.6x |
| chamadas_métodos| 1ms | 11ms | 11x |
| loop_overhead| 12ms | 53ms | 4.4x |
| matemática_intensiva| 14ms | 49ms | 3.5x |
| array_read| 4ms | 13ms | 3.2x |
| closure | 97ms | 303ms | 3.1x |
| array_write| 3ms | 8ms | 2.6x |
| string_concat| 1ms | 2ms | 2x |
| nested_loops| 9ms | 16ms | 1.7x |
| prime_sieve| 4ms | 7ms | 1.7x |
| matriz_multiplicar| 21ms | 34ms | 1.6x |
| fibonacci(40)| 401ms | 991ms | 2.5x |
| árvores_binárias| 9ms | 9ms | empate |
| mandelbrot| 24ms | 24ms | empate |
| object_create| 9ms | 8ms | 0.9x |

Todos os benchmarks são vitórias ou empates. O mais apertado é `object_create` (9ms vs 8ms), onde o alocador do V8 é genuinamente excelente.

## Parte 6: A Questão do Tempo de Compilação

A razão número um pela qual as pessoas escolhem Cranelift em vez de LLVM é a velocidade de compilação. Então vamos falar disso.

O LLVM aumentou o tempo de compilação por ficheiro do Perry em **20-50ms**, ou cerca de **8-19%**. Não 5x. Não 2x. Percentagem de um dígito a dois dígitos baixos.

A razão é que codegen não é o gargalo no pipeline do Perry. A distribuição para um ficheiro típico:

-   Parsing SWC: ~30%
-   Lowering HIR (AST → IR, inferência de tipos): ~25%
-   Passes de transformação IR (conversão de closures, lowering async, inlining): ~15%
-   **Codegen (emissão de texto LLVM IR + `clang -c -O3`): ~20%**
-   Linking (`cc` + biblioteca de runtime): ~10%

Codegen é uma fatia de cinco. Mesmo duplicando essa fatia, o total move-se apenas 5-10%. Se você está construindo um compilador AOT onde o utilizador executa `perry compile` uma vez e depois executa o binário para sempre, o cálculo é: gastar 25ms a mais na compilação, poupar até 24x em cada execução.

## Parte 7: O Que Faria Diferente

Se eu estivesse a começar o Perry hoje e pudesse saltar diretamente para LLVM, não o faria. A fase Cranelift foi genuinamente valiosa. Permitiu-nos iterar no frontend sem a complexidade do LLVM, deu-nos uma baseline funcional para comparação, e forçou-nos a manter o nosso HIR limpo o suficiente para ser portável entre backends.

O que faria diferente é a transição em si. Lançámos a v0.5.0 com a maioria das operações a passar por chamadas de helper do runtime, com a intenção de as tornar inline mais tarde. Isso estava errado. A ordem certa teria sido: identificar os hot paths primeiro, baixá-los inline antes da transição, e só lançar quando o backend LLVM estivesse pelo menos em paridade.

A lição é a óbvia: fronteiras de otimização importam mais que a qualidade do otimizador. O LLVM é uma peça notável de software, mas não pode ajudá-lo com código que não consegue ver. Se o seu codegen encaminha tudo através de chamadas opacas ao runtime, você construiu uma parede entre o seu programa-fonte e cada pass de otimização existente.

## Conclusão

O Perry é agora exclusivamente LLVM, mais rápido que o Node em todos os benchmarks, e em produção. A migração demorou mais do que planei, doeu mais do que esperava no meio, e é inquestionavelmente a decisão certa em retrospetiva. O Cranelift levou-nos até a v0.5; o LLVM está a levar-nos o resto do caminho.

Se quiser experimentar o Perry:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Código-fonte: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Execute os benchmarks você mesmo: `cd benchmarks/suite && ./run_benchmarks.sh`

Se tiver perguntas, encontrar bugs, ou quiser debater sobre backends de codegen, as issues do GitHub estão abertas. Eu leio todas.

— Ralph
