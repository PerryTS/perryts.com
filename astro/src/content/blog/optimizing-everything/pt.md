---
title: "Otimizando tudo: uma semana, 68 lançamentos e uma aceleração JSON de 547x"
excerpt: "Perry v0.5.13 → v0.5.80 em sete dias. JSON.parse fecha uma lacuna de 547x em relação ao Node. mimalloc chega como alocador global. Inline caches, transições de shape, slots de Buffer tipados, operações bitwise nativas em i32, scalar replacement e um event loop nativo que mantém servidores Fastify e WebSocket vivos."
date: 2026-04-17
tags: ["performance", "llvm", "JSON", "GC", "server", "milestone"]
---
O último artigo do blog foi publicado com o Perry na v0.5.12. Hoje estamos na v0.5.80. Isso são **68 releases de patch em sete dias**, quase inteiramente focadas numa coisa: transformar cada slow path restante num fast path.

A migração para o LLVM na v0.5.0 recuperou a paridade com o Cranelift na v0.5.12. Esse foi o fim de uma história e o início de outra. O LLVM vê tudo agora. A pergunta deixou de ser “porque é que isto está lento?” e passou a ser “porque é que isto ainda não está rápido?” — uma pergunta muito mais tratável.

Este artigo é um passeio pela semana. JSON ganhou um speedup de 547x. mimalloc tornou-se o alocador global. O acesso a propriedades ganhou um inline cache monomórfico. Buffers ganharam slots de ponteiros tipados com metadados `noalias`. Servidores Fastify e WebSocket deixaram de crashar após um minuto. E os benchmarks moveram-se novamente.

## 1\. JSON: fechando uma lacuna de 547x

Na v0.5.29, o JSON.parse do Perry num array de 20 registos era **547x mais lento que o Node**. Na v0.5.46 era 1,3x. Esse número é o maior delta da semana, e vale a pena percorrê-lo porque cada outra otimização neste artigo é uma variação do mesmo tema: não faça trabalho que não precisa de fazer.

O parser original alocava um Vec por propriedade, um Vec de chaves por objeto, e um thread-local protegido por RefCell para o cache de chaves. Copiava cada string. Fazia re-hash de cada nome de campo. Construiía uma shape de objeto totalmente nova para cada registo, mesmo quando todos os 20 registos tinham exatamente os mesmos campos na mesma ordem. O parser do Node lida com isto detetando o padrão e partilhando uma única shape entre todos os registos. O do Perry não.

A correção chegou em quatro passos:

1.  **Interning de chaves via um `PARSE_KEY_CACHE` thread-local** (v0.5.45). O primeiro registo aloca N strings de chave; os registos 2 a 20 alocam zero. Chaves repetidas resolvem para o mesmo ponteiro, o que as torna utilizáveis como chaves de lookup no cache de shapes sem um strcmp.
2.  **Partilha de shapes através do cache de transições** (v0.5.45). Objetos construídos por `js_object_set_field_by_name` percorrem o mesmo grafo de transições. Quando o schema se repete, o ponteiro `keys_array` é partilhado, e isso é o que um inline cache polimórfico precisa para acertar.
3.  **Parsing de strings zero-copy + construção incremental de objetos** (v0.5.46). `parse_string_bytes` agora retorna `ParsedStr::Borrowed(&[u8])` quando não há escapes com backslash — que é o caso comum para cada chave e para a maioria dos valores. `parse_object` escreve campos diretamente em vez de coletar num Vec primeiro.
4.  **Supressão do GC durante o parse** (v0.5.60, fecha #59). Fazer parse de um array grande aloca milhares de pequenos objetos num loop apertado. Cada um estava a despoletar a verificação de threshold do GC. Definir uma flag de “parsing em progresso” adia a coleta até o parse retornar — mesmo tamanho efetivo de heap, muito menos branches de bookkeeping.

Depois o stringify. JSON.stringify em arrays homogéneos — a mesma shape, milhões de vezes — estava a fazer iteração completa de propriedades por objeto, o que para um array com shape estável é puro desperdício. Uma correção em cinco passos fechou a maior parte dessa lacuna também:

-   v0.5.62: fast paths itoa / ryu para números, verificação de referência circular baseada em profundidade em vez de um HashSet.
-   v0.5.63: guarda de `toJSON` + cache de chaves persistente + dispatch inline (os três custos por chamada que se acumulavam).
-   v0.5.65: template de stringify para shape homogénea + fast path de escape ASCII. Quando cada elemento tem a mesma shape, a estrutura de chave/dois-pontos/vírgula é pré-calculada uma vez.
-   v0.5.70, v0.5.72, v0.5.75: cache de shape-template por chamada, fechar a lacuna do GC residual do parse, eliminar o overhead fixo por chamada restante.
-   v0.5.79: o caminho de valores pequenos. Números, booleanos e strings curtas passam por um caminho direto que não configura nenhuma da maquinaria de objetos.

O resultado cumulativo: um pipeline de JSON que estava **547x atrás do Node** no início da semana está agora aproximadamente **1,3x atrás no parse e competitivo no stringify**, em workloads realistas.

## 2\. A história do alocador

O Perry aloca muito. Cada objeto literal, cada array literal, cada concatenação de string, cada closure. O alocador é quente, e durante a maior parte da v0.5 foi o alocador de sistema padrão do Rust mais uma arena thread-local para valores de curta duração.

A v0.5.67 substituiu o alocador global por **mimalloc**. Esta é uma mudança de uma linha no Cargo.toml que se paga imediatamente em qualquer workload que faça muitas pequenas alocações — que é cada programa TypeScript. A v0.5.66 precedeu-a consolidando todo o estado thread-local de `gc_malloc` num único acesso TLS por chamada, para que o caminho para o mimalloc fosse o mais barato possível.

A v0.5.68 levou isto mais longe com **strings alocadas em arena**. Strings de curta duração (resultados intermediários de concat, pedaços de `split()`, scratch do parser) saltam o alocador global inteiramente e aterram numa bump arena por thread que reseta em fronteiras naturais. Para parsing de JSON isto foi uma vitória de percentagem de dois dígitos por si só.

E as duas otimizações que não alocam nada:

-   **Substituição escalar de objetos que não escapam** (v0.5.17, depois objetos literais na v0.5.76). Se um objeto nunca sai da sua função englobante, não precisa de existir. Os seus campos tornam-se locais simples. O LLVM lida com isto out of the box assim que se deixa de esconder o objeto atrás de uma chamada opaca ao alocador.
-   **Substituição escalar de arrays que não escapam** (v0.5.73). Mesma ideia — se o array não escapa, os seus elementos tornam-se valores SSA e toda a alocação desaparece.

Para o caminho do array literal especificamente, a v0.5.69 adicionou um **fast path de tamanho exato** (saltar a maquinaria de crescimento de capacidade quando o tamanho é conhecido em tempo de compilação), e a v0.5.74 colocou inline o IR do bump allocator para pequenos array literais para que o LLVM possa ver a alocação, dobrá-la, elevá-la ou eliminá-la. Benchmarks array-heavy moveram-se mais um passo.

Para arredondar, a v0.5.25 corrigiu um bug mais silencioso: `gc_malloc` não estava a despoletar coleta no seu próprio caminho, então workloads malloc-heavy podiam fazer o heap crescer ilimitadamente antes de qualquer coisa verificar. A v0.5.61 adicionou dimensionamento de passo adaptativo ao threshold, que é o que realmente se quer: verificar de forma barata quando o heap é pequeno, menos frequentemente quando é grande.

## 3\. O acesso a propriedades ganhou um inline cache real

Todos os motores JavaScript modernos têm um inline cache polimórfico (PIC) no acesso a propriedades. Durante a maior parte da série v0.5 do Perry, PropertyGet passava por um lookup em tabela de shapes com um hash thread-local. Isso é bom para código frio. Não é bom quando 95% das leituras de propriedade num dado call site veem a mesma shape, o que é quase sempre.

A v0.5.44 entregou um **inline cache monomórfico** para `PropertyGet`. Cada site de PropertyGet recebe uma entrada de cache por callsite: um ponteiro de shape esperada e um offset de campo. O caminho de hit é uma única comparação mais um load indexado. O caminho de miss cai para um helper lento que atualiza o cache.

```
; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont
```

A v0.5.51 adicionou um **cache de transições de shape baseado em hash de conteúdo** para escritas de propriedades dinâmicas. Dois objetos que crescem os mesmos campos na mesma ordem fazem hash para a mesma transição, então acabam por partilhar a mesma shape — e isso significa que o lado de leitura do PIC realmente acerta.

A v0.5.55 removeu o último acesso TLS do cache de transições. A v0.5.46 corrigiu um bug no miss-handler do PIC onde objetos com >8 campos estavam a ler para além dos slots inline para memória não inicializada (fecha #55). A v0.5.78 adicionou uma guarda para impedir que o PIC do PropertyGet indexasse em receivers não-ponteiro como números brutos — o que podia acontecer em refinamento de tipos excessivamente otimista e era um dos últimos problemas de estabilidade no IC.

Efeito líquido: código property-heavy — que na prática significa a maior parte do TypeScript — é aproximadamente 2-3x mais rápido do que era há uma semana, apenas com o IC sozinho.

## 4\. Inteiros, bitwise, e o padrão `| 0`

NaN-boxing torna cada número um f64. Programadores TypeScript escrevem `x | 0` para forçar semântica de inteiros. O V8 passou quinze anos a tornar isso barato. O Perry passou esta semana a recuperar.

A pilha de mudanças, por ordem:

-   **v0.5.48**: `sdiv` para `(int / const) | 0`. O LLVM dobra para `smulh + asr`, que são ~2 ciclos vs ~10 para `fdiv`.
-   **v0.5.48**: `@llvm.assume` em limites de Uint8ArrayGet. Substitui o diamante branch+phi de verificação de limites por um único bloco básico sobre o qual o vetorizador pode raciocinar.
-   **v0.5.49**: corrigir operações bitwise com NaN/Infinity para produzir 0 conforme a especificação ToInt32. Correção em primeiro lugar.
-   **v0.5.50**: `toint32_fast` que salta a guarda NaN/Inf de 5 instruções quando o valor é conhecido-finito. Mais `alwaysinline` em helpers pequenos e deteção de clamp.
-   **v0.5.52**: alvo funções de clamp diretamente com intrínsecos `smin`/`smax`. Clamp é o padrão inteiro mais comum depois do incremento.
-   **v0.5.53**: `x | 0` e `x >>> 0` num valor conhecido-finito tornam-se um noop — apenas `fptosi + sitofp`, sem qualquer guarda.
-   **v0.5.56**: ops bitwise i32-nativas; índice e valor i32 em Uint8ArrayGet/Set.
-   **v0.5.58, v0.5.60**: `Math.imul` baixa para o multiply i32 nativo em vez do caminho polyfill. A deteção de polyfill reconhece shims `Math.imul` escritos pelo utilizador e substitui-os.
-   **v0.5.59**: inlining de init de função pura + seeding de inteiro local. A análise de inteiros ao nível da função pode ver para além das fronteiras de chamada quando o callee é pequeno e puro.
-   **v0.5.37-v0.5.40**: fast path de aritmética de inteiros para padrão acumulador. O clássico loop `for (...) acc += f(i)` permanece em i32 de ponta a ponta quando os tipos o permitem.

A v0.5.41 é a subtil. Quando o codegen vê uma `const K: number[][] = [[...], ...]` ao nível de módulo, baixa a coisa toda para uma constante `[N x i32]` flat em `.rodata`. `K[y][x]` torna-se um único `getelementptr + load i32`. Combinado com a ponte de análise de inteiros na v0.5.43, isto é o que deu ao `image_conv` (um blur Gaussiano 5×5 sobre um frame RGB 4K) um **speedup de 3x numa única release**.

## 5\. Buffers e Uint8Array

Workloads binários — crypto, processamento de imagens, parsing, redes — vivem em Buffer e Uint8Array. A v0.5.64 deu-lhes **slots de ponteiros tipados mais metadados `noalias`**. Onde um Buffer costumava ser um double NaN-boxed num `alloca double`, agora é um ponteiro `i64` cru num `alloca i64`, com anotações LLVM a dizer ao otimizador “este ponteiro não faz alias com outros ponteiros no escopo.” Isso desbloqueia reordenação de load/store, vetorização e alocação de registos que o otimizador de outra forma recusaria fazer.

A v0.5.80 fechou a questão final de correção aqui: um contador de `alias-scope` de buffer ao nível do módulo que estava a ser resetado por função, o que podia em casos raros deixar o LLVM raciocinar através de escopos que não deviam partilhar um ID de escopo. Agora o contador é ao nível do módulo e a história do `noalias` é hermética.

A v0.5.53 tornou `Uint8ArraySet` sem branches — um store mascarado em vez de um if/else que escrevia 0 fora dos limites. A v0.5.54 adicionou um **indexOf Two-Way** para padrões mais longos e um `split` alocado em arena, que juntos fecharam a maior parte da lacuna no parsing de Buffer com strings pesadas.

## 6\. Strings: ASCII é o fast path

Strings JavaScript são UTF-16, mas a maioria das strings do mundo real (chaves, identificadores, cabeçalhos HTTP, estrutura JSON) são ASCII. A v0.5.71 adicionou um **`charCodeAt` e `codePointAt` O(1) para strings ASCII** — sem scan UTF-16, apenas um load de byte. A v0.5.20 já fazia com que `indexOf`, `slice` e `charAt` ignorassem o scan UTF-16 em ASCII.

Uma nota de correção dentro dessa mesma release: `String.length` agora retorna unidades de código UTF-16 (especificação ECMAScript) em vez da contagem de bytes. Isso era um bug latente onde `"café".length` retornava 5 em vez de 4.

## 7\. Os servidores agora realmente mantêm-se de pé

O trabalho menos glamoroso da semana foi também o mais visível para o utilizador: fazer com que servidores longos estilo Node — Fastify, ws, http, net — não crashassem após alguns minutos.

Os crashes partilhavam todos uma causa raiz: o GC não sabia sobre closures de listeners. Quando se escreve `wss.on('message', handler)`, a closure captura variáveis, que vivem como campos dentro de uma célula alocada pelo GC. Se o scanner de roots do GC não sabe que deve visitar essas células, as suas capturas são reclamadas e o próximo evento de mensagem dereferencia memória libertada.

-   **v0.5.26**: root-scan de closures de event listener de `net.Socket` (fecha #35).
-   **v0.5.27**: estender a `ws`, `http`, `events`, `fastify`.
-   **v0.5.28**: registar globais ao nível de módulo como roots do GC (fecha #36). Bug de lifetime uma camada acima.
-   **v0.5.21**: segurança de `gc()` dentro de handlers de requisição Fastify/WebSocket — a chamada explícita ao GC estava a correr enquanto os handlers de requisição mantinham ponteiros para a arena (fecha #31).

Junto com o trabalho do GC, a v0.5.20 entregou um **main event loop** — um real, não um placeholder — que mantém servidores WebSocket e baseados em timer vivos em vez de saírem depois da última chamada síncrona retornar (refs #28). Esta foi a única correção de maior impacto para quem quer que tentasse correr o Perry como um servidor HTTP em produção. Fastify agora mantém-se de pé. Servidores WebSocket agora mantêm-se de pé.

A v0.5.19 corrigiu a incompatibilidade da ABI SysV AMD64 para args/returns de JSValue FFI — um problema em Linux onde chamadas FFI nativas podiam corromper argumentos silenciosamente. A v0.5.18 adicionou dispatch nativo para `axios` (get/post/put/delete/patch), incluindo `response.status` e `response.data`. A v0.5.30 corrigiu o dispatch de `fastify request.header()` e `request.headers[]`, que vinha a retornar undefined para lookups case-insensitive.

## 8\. `@perry/postgres`: o driver que tornou tudo isto necessário

Muito do trabalho desta semana foi impulsionado por um workload: fazer um [driver Postgres](https://github.com/PerryTS/postgres) totalmente compatível com Node funcionar em Perry-native. O driver tem suporte a TLS, tem um registo de codecs cross-module, suporta cancel/close/notify, e agora faz benchmarks contra `pg`, `postgres.js`, e `tokio-postgres`.

O trabalho de perf do lado do driver foi em paralelo com o do lado do compilador:

-   **Hoist de codec por coluna** e eliminar cópias de Buffer por célula. BigInt(string) para int8 para evitar alocações intermediárias.
-   **Construtor de Row dinâmico por shape** para rows em forma de objeto. Se a sua query sempre retorna as mesmas colunas, o driver constrói um construtor de row especializado em shape na primeira vez e reutiliza-o — o que, em combinação com o PIC do compilador, torna o acesso a campos em rows tão rápido como o acesso a campos em qualquer outro objeto.
-   **Opt-out `parseTypes: 'minimal'`** para chamadores que querem strings brutas para int8/numeric/date.

Este é o loop de feedback positivo que o compilador sempre foi destinado a permitir. Um driver real revela gargalos reais. O gargalo recebe um reprodutor de uma linha registado como issue no GitHub. Uma semana de correções de compilador depois, o driver é mais rápido e o compilador é mais rápido para todos os outros também. Esse é o plano todo, comprimido em sete dias.

## 9\. Correções de correção dignas de menção

O trabalho de performance revela problemas de correção da mesma forma que dragar um rio revela carrinhos de supermercado. Uma lista parcial:

-   **Promise.race** estava a ler `.value` em rejeição em vez de `.reason`, então rejeições eram engolidas silenciosamente (v0.5.13-v0.5.14).
-   **Promise.any** agora lança um `AggregateError` apropriado quando todas as promises de entrada rejeitam. Adicionou `Promise.withResolvers` e corrigiu a ordenação de `queueMicrotask`.
-   **`[..."hello"]`** agora produz um array de caracteres em vez de um objeto partido (fecha #16).
-   **Aritmética BigInt e coerção `BigInt()`** (fecha #33). O fast path i64 bigint (v0.5.29) torna o caso comum barato.
-   **Buffer.indexOf / Buffer.includes** com um argumento numérico de byte estavam a comparar contra ponteiros de buffer em vez de valores de byte (fecha #56).
-   **Operações bitwise com NaN/Infinity** produzem 0 conforme a especificação ToInt32 (fecha #57).
-   **Windows x86\_64**: cinco correções específicas da plataforma — `localtime`, descoberta de `clang`, e uma mão-cheia de ajustes de codegen — trouxeram o Windows x86\_64 de volta ao verde (v0.5.72).

## 10\. Os números

O benchmark de destaque do último artigo foi `factorial` a 24,6x mais rápido que o Node. Esse número não mudou. O que se moveu esta semana é tudo ao redor:

| Workload | v0.5.12 | v0.5.80 | Delta |
| --- | --- | --- | --- |
| JSON.parse (schema de 20 registos) | 547x mais lento que Node | 1,3x mais lento que Node | ~420x |
| image\_conv (blur 4K 5×5) | 1.980ms | 457ms | 4,3x |
| Código property-heavy (hit do PIC) | baseline | 2-3x | 2-3x |
| Fibonacci(40) | 401ms | 309ms | 1,3x |
| Uptime do Fastify sob carga | ~60s antes do crash | indefinido | ∞ |

A suite completa de 15 benchmarks contra o Node ainda é 14 vitórias e 1 empate — a mesma tabela do último artigo, com números ligeiramente melhores em toda a linha. O movimento real desta semana é em workloads que não estavam nessa suite: JSON, processamento de imagens, servidores de longa duração. Era onde as lacunas viviam, e é isso que foi fechado.

## 11\. O que vem a seguir

O único benchmark que ainda estamos a perseguir é `image_conv` vs Zig. O Perry está a 457ms; o Zig está a 246ms. Essa lacuna é arquitetónica, não ao nível de pass de otimização, e vive em três lugares:

1.  **Locais de buffer tipados**. A maior parte do trabalho de Buffer chegou esta semana, mas parâmetros e locais de função com tipo buffer ainda fazem unbox a cada acesso. A abordagem de slot `i64` que usamos para contadores de loop precisa de se estender a buffers.
2.  **Divisão de loop interior/borda**. O loop de blur faz clamp em cada pixel, incluindo os 99,9% de pixels que não precisam. Dividir em regiões de borda (com clamp) e interior (sem clamp) permite ao LLVM vetorizar o interior com NEON `ld3`/`st3`.
3.  **Hash FNV-1a de ABI dupla**. O helper de hash é chamado através da ABI NaN-box. Especializá-lo para i64 bruto in/out em hot paths é algumas horas de trabalho que se vão pagar em cada workload hash-heavy.

Esses estão rastreados em `PERF_ROADMAP.md`. Espere vê-los no próximo ciclo.

## Fechando

O padrão desta semana — 68 releases de patch, quase todas de performance, uma lacuna de JSON a ir de 547x para 1,3x — é o que acontece quando se passa para o lado bom da colina da migração para o LLVM. O otimizador é agora um aliado em vez de uma parede, e a maior parte do que resta é trabalho pequeno, específico e mensurável: encontrar um slow path, descobrir porque é que o otimizador não consegue ver através dele, expor a estrutura, medir novamente. Nenhum destes commits é exótico. São apenas aplicados onde são precisos.

Se quiser experimentar qualquer disto:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Código-fonte: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

Issues, reprodutores, e benchmarks que não são rápidos o suficiente: continuem a mandá-los. Este ritmo só funciona porque os relatórios de bugs são específicos o suficiente para se tornarem reprodutores de uma linha. Cada commit neste artigo tem um `#N` anexado por uma razão.

— Ralph
