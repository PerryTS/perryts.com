---
title: "GC geracional, JSON preguiçoso e benchmarks que aguentam escrutínio"
excerpt: "Perry v0.5.174 → v0.5.306 em três dias, mais o trabalho de GC e JSON que aterrou em paralelo. O GC geracional vira o padrão. A Small String Optimization vira o padrão. A pipeline de JSON ganha uma tape preguiçosa que aterra em 75 ms de mediana em validate-and-roundtrip — a melhor do pelotão de tipagem dinâmica. A página de benchmarks foi reescrita com mediana RUNS=11 + p95 + σ, simdjson e AssemblyScript+json-as adicionados como pares, e cada fraqueza do Perry exposta com honestidade."
date: 2026-04-26
tags: ["GC", "JSON", "performance", "benchmarks", "milestone"]
---
O último artigo fechou na **v0.5.174** com uma manchete: o Perry estava finalmente a vencer todos os benchmarks da suite in-tree contra o Node e o Bun. Três dias de trabalho e um backlog de commits de GC + JSON depois, o Perry está na **v0.5.306** — isto são **132 releases de patch** — e a história é outra. A manchete não é um speedup de 547x ou uma nova coluna de vitórias. É o trabalho que torna essas vitórias defensáveis.

-   O **GC geracional** entrega-se como default. As Fases A até D aterraram entre a v0.5.217 e a v0.5.237.
-   A **Small String Optimization** entrega-se como default. Os passos 1.5 → 2 aterraram nas v0.5.213–v0.5.216.
-   A **pipeline de JSON** ganhou um parser baseado em tape, parse lazy, stringify lazy, e materialização esparsa por elemento. O default de validate-and-roundtrip está agora em **75 ms de mediana** — o melhor do grupo de typing dinâmico.
-   A **página de benchmarks** foi reescrita de ponta a ponta com **RUNS=11 mediana + p95 + σ + min + max**, simdjson e AssemblyScript+json-as adicionados como peers, sondas de otimização separadas das comparações reais, e cada fraqueza do Perry exposta com honestidade.

O elenco de apoio é uma sequência constante de correções de correção: FIFO de microtasks de Promise, igualdade de NaN e formatação de números do ECMAScript, complemento para dois de BigInt, AsyncLocalStorage de ponta a ponta, runtimes de decimal.js + ioredis + commander, e um segfault do JSON.stringify em f64 puro que estava escondido debaixo dos caminhos de tape. Mais a toolchain do Windows finalmente fica leve: LLVM + xwin, sem ser preciso instalar o Visual Studio.

## 1\. GC geracional, ligado por default

O GC geracional foi um roll-out faseado durante dois meses. O resumo das fases que fecharam nesta janela:

-   **v0.5.217–v0.5.221** — Fase A: scaffolding de runtime de shadow-stack, emissão de push/pop, threading do slot-map, espelhamento de shadow para `Let`/`LocalSet`, e o root scanner.
-   **v0.5.222** — Fase B: divisão de arena nursery + old-gen.
-   **v0.5.223–v0.5.225** — Fase C1–C2: infraestrutura de runtime do write-barrier, codegen emite a barreira, cada heap store passa por ela.
-   **v0.5.226–v0.5.228** — Fase C3a–C4: roots do remembered-set fluem para o mark + clear; trace de minor GC salta o old-gen; tenuring não-movente.
-   **v0.5.229–v0.5.236** — Fase C4b α/β/γ/δ: infraestrutura de forwarding-pointer, passe de pinning + evacuação, scanner + pinning transitivo, reescrita de referências, blocos de nursery ociosos devolvidos ao SO, trigger de GC limitado ao threshold inicial.
-   **v0.5.237** — Fase D parte 1: `PERRY_GEN_GC=1` por default.
-   **v0.5.238** — Fase D parte 2: `PERRY_SHADOW_STACK=1` por default.
-   **v0.5.239–v0.5.240** — docs de fecho: roadmap finalizado, apêndice de linhagem académica + industrial (Bartlett 1988, Ungar 1984, Cheney 1970).

A vitória medida que mais importou: o `test_memory_json_churn` caiu de **115 MB → 91 MB** de pico de RSS no momento em que o gen-GC foi virado para default. As regressões de compute foram pequenas e listadas sem desculpas — `nested_loops` 8 → 18 ms, `accumulate` 24 → 34 ms, `object_create` 0 → 1 ms, `array_read` / `array_write` +1 ms cada. A escotilha de fuga (`PERRY_GEN_GC=0`) recupera os números antigos; o trade-off foi deliberado, e a página de benchmarks lista agora ambas as linhas lado a lado para que o leitor possa escolher.

## 2\. Small String Optimization, ligada por default

SSO é uma representação de string inline de 22 bytes que evita alocação de heap para strings curtas — chaves típicas de JSON (2–8 bytes) e valores curtos aterram na forma inline. O roll-out foi pequeno à superfície e grande por baixo:

-   **v0.5.213**: infraestrutura de SSO (representação + acessores).
-   **v0.5.214**: braços consumidores do Passo 1 + porta `PERRY_SSO_FORCE` para testes.
-   **v0.5.215**: codegen do Passo 1.5 com branch de três vias para `PropertyGet` — fast path para strings inline, fast path para strings em heap, slow path para o residual.
-   **v0.5.216**: viragem do Passo 2 — emite SSO por default.

Os follow-ups na v0.5.279 fecharam o último bug de NaN em property-read que apareceu quando a SSO ficou quente, e a correção de dispatch de getter cross-module encadeado na v0.5.272 fechou outro. Ambos estavam na lista de pendências antes de o default ser virado; ambos entregaram-se sem regressão de perf.

## 3\. JSON: parse baseado em tape, lazy por default

A pipeline de JSON levou a reescrita mais invasiva do período. Comportamento antigo: `JSON.parse` construía uma árvore totalmente materializada de valores NaN-boxed. Comportamento novo: `JSON.parse` constrói uma tape de 12 bytes por valor e materializa lazily — apenas os valores que realmente lê pagam o custo de materialização. O stringify sobre um parse não-mutado é agora um memcpy do input original, o mesmo truque de fast-path que o simdjson usa com `raw_json()`.

-   **v0.5.200**: `JSON.parse<T>(blob)` parse dirigido por schema (Passo 1). Forma conhecida em tempo de compilação permite ao compilador emitir acesso a chaves pré-resolvido.
-   **v0.5.203**: fundação do parse baseado em tape — Passo 2 Fase 1.
-   **v0.5.204**: parse lazy + stringify lazy — Passo 2 Fases 2+4.
-   **v0.5.206**: acesso indexado lazy-safe + edge cases — Passo 2 Fase 3.
-   **v0.5.208**: materialização esparsa por elemento — Passo 2 Fase 5b.
-   **v0.5.209**: cursor de walk + threshold adaptativo de materialização.
-   **v0.5.210**: vira o parse lazy para default em blobs ≥ 1 KB.

O resultado no workload para o qual a tape lazy foi desenhada (10k registos, blob de ~1 MB, parse → stringify sem iteração intermediária):

| Implementação | Mediana (ms) | p95 (ms) | σ | Pico de RSS |
| --- | --- | --- | --- | --- |
| c++ `-O3 -flto` (simdjson)| 24 | 28 | 1.2 | 8 MB |
| perry (gen-gc + fita lenta)| 75 | 91 | 6.9 | 85 MB |
| ferrugem serde_json (LTO)| 185 | 190 | 1.7 | 11 MB |
| bun | 259 | 342 | 26.1 | 82 MB |
| node | 394 | 602 | 60.1 | 127 MB |
| kotlin (kotlinx.serialização)| 473 | 533 | 21.4 | 606 MB |
| assemblyscript+json-as (wasmtime)| 598 | 621 | 10.5 | 58 MB |

O Perry com **75 ms de mediana** é o runtime de typing dinâmico mais rápido da comparação — vence o Bun (259 ms), vence o Node (394 ms), vence o JIT de servidor do Kotlin (453 ms). O simdjson com 24 ms é o teto C++ acelerado por SIMD e vive na página de propósito, não escondido atrás de um cherry-pick. O Perry não o vence. O ponto é mostrar a lacuna para que fechá-la tenha um alvo — rastreado em `docs/json-typed-parse-plan.md`.

O bench companheiro honesto é o **parse-and-iterate**: mesmo blob, mas cada iteração soma o `nested.x` de cada registo, o que força a tape lazy a materializar. Aí o Perry aterra em **466 ms** — mais lento do que os 375 ms da escotilha de fuga mark-sweep porque a tape paga overhead que não consegue amortizar. Essa linha está no TL;DR §B. Quando não se consegue evitar o trabalho, a tape lazy não finge o contrário.

## 4\. A página de benchmarks, reescrita

Três coisas mudaram na forma como o Perry apresenta números de performance.

**RUNS=11 mediana + p95 + σ + min + max, não best-of-N.** Best-of-N descarta silenciosamente a latência de cauda; neste hardware estava a esconder outliers de 9,4 segundos no `accumulate` de Python e picos de p95 de 5,3 segundos no JSON do Swift. A mediana põe as caudas de volta na página. A mudança de metodologia aterrou na v0.5.248; cada célula no TL;DR §A e §B está fresca em RUNS=11 com data de **2026-04-25**.

**Sondas de otimização estão separadas da perf de runtime real.** As cinco células que mostram o Perry em 12–34 ms vs Rust/C++ em 98 ms — `loop_overhead`, `math_intensive`, `accumulate`, `array_read`, `array_write` — medem postura de flag do compilador, não silício. Estão agora na sua própria subsecção, com um parágrafo acima delas a explicar que `clang++ -O3 -ffast-math` as fecha até um milissegundo. O kernel de runtime real da manchete é o `loop_data_dependent`: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — o Perry senta-se mesmo no meio do grupo no-FMA-contract num kernel onde o compilador genuinamente não consegue dobrar o trabalho. Essa é a comparação honesta.

**Peers adicionados.** O simdjson (4.3.0) está agora em ambas as tabelas de JSON — o teto de throughput de parse de C++, na página para que o leitor possa ver a lacuna. O AssemblyScript com json-as (1.3.2) é o peer TS-to-native instalável mais próximo; o porffor deu segfault no workload neste tamanho, o Static Hermes não instalava em macOS arm64. O Kotlin com kotlinx.serialization juntou-se ao polyglot de JSON nas v0.5.241–v0.5.242. Cada linha é real, cada disclaimer está na página.

## 5\. A tabela polyglot de compute

Os kernels de manchete genuinamente não-dobráveis, mediana RUNS=11, atualizados em 2026-04-25 na v0.5.249:

| Referência| Perry | Rust | C++ | Java | Node | Bun |
| --- | --- | --- | --- | --- | --- | --- |
| Fibonacci| 318 | 330 | 315 | 282 | 1022 | 589 |
| loop_data_dependent| 235 | 229 | 129 | 229 | 322 | 232 |
| object_create| 1 | 0 | 0 | 5 | 11 | 6 |
| nested_loops| 18 | 8 | 8 | 11 | 18 | 21 |

No `fibonacci`, o Perry iguala o grupo compilado dentro de 3–15 ms. O JIT HotSpot do Java é ~11% mais rápido por inlining a chamada recursiva. No `loop_data_dependent`, o kernel divide-se em dois clusters de FP-contract: o grupo FMA-contract a ~128 ms (Go default, `g++ -O3` no Apple Clang — ambos fundem `sum * a + b` num único FMADDD) e o grupo no-contract a 229–235 ms (Perry, Rust default, Swift, Java sem `-XX:+UseFMA`, Bun) a correr FMUL + FADD escalares. O LLVM iguala o grupo FMA com `-ffp-contract=fast`; o Perry não ativa isso por default. `nested_loops` é cache-bound, não compute-bound; toda a gente aterra em 8–21 ms.

## 6\. Toolchain do Windows, leve

Os utilizadores de Windows já não precisam de uma instalação do Visual Studio. A **v0.5.199** fechou a [#176](https://github.com/PerryTS/perry/issues/176): `perry setup windows` + winget LLVM + xwin substituem a árvore inteira de VS BuildTools. A `v0.5.201` tirou a porta cfg de `find_lld_link` / `find_perry_windows_sdk` para que a descoberta de caminhos funcione em todas as plataformas que tenham como target o Windows, não apenas em hosts macOS.

```
# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe
```

## 7\. Passe de correção de runtime

Um tema do período: divergências silenciosas de runtime em relação ao V8/JSC viraram-se ou em correções ou em erros de compilação. As não-triviais:

-   **v0.5.255**: complemento para dois em `BigInt.fromTwos`/`toTwos`.
-   **v0.5.263**: discriminação de tipo não-promise em `Promise.all`/`race`/`any`.
-   **v0.5.281**: `NaN==NaN` + formatação de números do ECMAScript (`3 → "3"`, não `"3.0"`; `-0 → "0"`; etc.).
-   **v0.5.280**: coerção de `NaN`/`Infinity` para ToInt32 em `(x) | 0`.
-   **v0.5.284**: FIFO de microtasks de Promise + propagação de handlers que lançam.
-   **v0.5.286**: `JSON.stringify` de um f64 puro dava segfault sob caminhos de tape.
-   **v0.5.277**: `fs.readFileSync` retorna Buffer quando não se passa encoding (corresponde ao Node).
-   **v0.5.272**: dispatch de getter cross-module encadeado retornava `undefined`.

Os follow-ups de stdlib para a issue [#187](https://github.com/PerryTS/perry/issues/187) preencheram-se: AsyncLocalStorage de ponta a ponta (v0.5.261), runtime de commander + codegen a invocar realmente `.action()` (v0.5.250), código de decimal.js (v0.5.259), ioredis para Redis de ponta a ponta (v0.5.270), padrão de async-factory para pg + mongo (v0.5.275), e o mesmo bug de async-factory em EE/LRU/WSS (v0.5.252).

Do lado do `perry/ui`: callback de tap em notificação (#97) ligado em ambos Apple (v0.5.254) e Android (v0.5.258); agendar + cancelar notificações locais (#96, v0.5.244); registo + receber FCM em Android (v0.5.262).

## 8\. Fechando

O padrão desta etapa não são números de manchete. É o trabalho que faz com que as vitórias existentes sobrevivam ao escrutínio: um GC geracional que apanha workloads de alocação sustentada, uma SSO que fecha a lacuna de custo das strings curtas, uma pipeline de JSON que explora a estrutura de “sem modificação” do workload mais comum, e uma página de benchmarks que mede medianas em vez de best-of-N e mostra o teto de parse de 24 ms do simdjson na mesma linha que os 75 ms do Perry. O leitor pode ver a lacuna — e onde o Perry se senta em relação ao chão.

Experimente:

```
# npm (qualquer plataforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — sem precisar de instalar VS)
winget install PerryTS.Perry

# Suite default de benchmarks
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh
```

Código-fonte: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Benchmarks: [benchmarks/README.md](https://github.com/PerryTS/perry/blob/main/benchmarks/README.md) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
