---
title: "Distribuição npm, perry dev e vencer todos os benchmarks"
excerpt: "Perry v0.5.80 → v0.5.174 em seis dias. @perryts/perry é publicado no npm para todas as sete plataformas suportadas. perry dev adiciona auto-recompilação em modo watch sobre uma cache de AST em memória e uma cache de objetos por módulo em disco. json_roundtrip fecha a sua última lacuna — o Perry agora vence todos os benchmarks contra o Node.js e o Bun."
date: 2026-04-23
tags: ["npm", "developer-experience", "performance", "watch-mode", "milestone"]
---
O último artigo fechou com o Perry na v0.5.80 e uma derrota teimosa na tabela de benchmarks: o roundtrip de `JSON.parse`/`stringify` ainda era 1,6x mais lento que o Node. Seis dias depois, o Perry está na **v0.5.174** — isto são **94 releases de patch** — e três coisas mudaram que merecem ser destacadas antes de mais nada:

-   `@perryts/perry` está no **npm**. Um comando instala o Perry em qualquer plataforma suportada.
-   **`perry dev`** adiciona auto-recompilação em modo watch, além de uma nova cache de AST em memória e uma cache de objetos por módulo em disco.
-   A derrota no `json_roundtrip` foi fechada. O Perry agora **vence o Node e o Bun em todos os benchmarks** da suite principal (15/15 contra ambos).

O resto do artigo é o elenco de apoio: correções no WebAssembly, watchOS finalmente a compilar de ponta a ponta, primitivas `perry/thread` ligadas até ao fim, e um lote de vitórias de estritência em tempo de compilação que transformam drops silenciosos em erros reais.

## 1\. `@perryts/perry` no npm

O Perry sempre se instalou via Homebrew no macOS e APT no Debian/Ubuntu. Boa cobertura para programadores nessas plataformas, nada de todo para utilizadores de Windows a menos que fizessem build a partir do código-fonte, e nada de uniforme numa equipa que mistura Mac, Linux e Windows. A v0.5.107 fez esse problema desaparecer.

```
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp
```

O pacote é um launcher fino que depende de sete pacotes opcionais por plataforma — macOS arm64/x64, Linux x64/arm64 tanto em glibc como em musl, Windows x64 — e o npm instala apenas aquele que corresponde à sua máquina. O tamanho binário por plataforma está na faixa baixa de megabytes de um único dígito. A instalação em si demora segundos. Há também um caminho de instalação global (`npm install -g @perryts/perry`) se preferir, mas a instalação local do projeto fixa a versão do compilador junto às suas dependências, que é o default correto.

A publicação passou por OIDC Trusted Publisher, então cada release tem proveniência e está ligada de volta ao job de CI que a construiu. Isso foi um dia inteiro de trabalho de CI — vários commits de CI `v0.5.107` a perseguir a combinação certa de `--provenance` / versão do npm / caminho de workflow — mas aterrou, e cada release desde então tem sido limpa. Utilizadores de Windows agora são cidadãos de primeira classe, e a fricção transversal de equipas de “instale como o seu SO gostar” desapareceu.

## 2\. `perry dev` — modo watch

A v0.5.143 adicionou um novo subcomando ao CLI:

```
perry dev
```

É isso. Ele observa o seu projeto, recompila ao gravar, e relança o seu binário. A inspiração é o Vite e o `nodemon`; o propósito é parar de fingir que um workflow de compilador-para-binário tem de parecer mais lento do que um runtime. Para a maioria dos projetos, o `perry dev` reconstrói em menos de um segundo numa cache quente.

A parte da “cache quente” importa. Duas novas caches aterraram junto com o `perry dev`:

-   **Cache de AST em memória** (v0.5.156). Entre rebuilds numa única sessão de `perry dev`, o Perry mantém a AST parseada para cada módulo que não mudou em disco. Editar um ficheiro re-parseia um ficheiro, não o grafo de módulos inteiro.
-   **Cache de objetos por módulo em disco (V2.2)**. Cada módulo compila para o seu próprio ficheiro `.o` e é hasheado; módulos inalterados saltam o codegen inteiramente e o linker apanha o objeto em cache. A saída verbose da cache corresponde à spec em [#131](https://github.com/PerryTS/perry/issues/131), e uma ronda de endurecimento de auditoria na v0.5.160 fechou os edge cases onde entradas de cache obsoletas podiam sobreviver a uma mudança de cabeçalho.

As duas caches empilham-se. A primeira edição da sessão é compilação completa; tudo depois disso apenas faz trabalho proporcional ao que realmente mudou. Esta é a maior mudança de DX da semana.

## 3\. Vencer o Bun em todos os benchmarks

Na v0.5.166 o README tinha uma ressalva honesta: o Perry era 1,6x mais lento que o Node no `json_roundtrip` (50× `JSON.parse` + `JSON.stringify` num blob de 1MB, 10K itens), e 2,4x mais lento que o Bun. A issue [#149](https://github.com/PerryTS/perry/issues/149) rastreava o follow-up. Na v0.5.173 — sete dias depois — essa lacuna fechou.

| Carga de trabalho| Perry v0.5.173 | Node v25 | Bun 1.3 |
| --- | --- | --- | --- |
| `json_roundtrip` | 314ms | 377ms | 250ms |
| `closure` | 10ms | 309ms | 51ms |
| `factorial` | 31ms | 596ms | 98ms |
| `fibonacci(40)` | 320ms | 1033ms | 521ms |
| `mandelbrot` | 23ms | 25ms | 30ms |

O Perry agora vence todos os workloads na suite principal de benchmarks — **15/15 contra o Node, 15/15 contra o Bun**, best of 5 runs em macOS ARM64. O Bun 1.3 ainda está à frente em peak RSS (84MB contra os 310MB do Perry em `json_roundtrip`), então a pressão sobre o alocador é a próxima coisa a fechar, mas a latência bruta é do Perry.

O fecho da lacuna do JSON não foi uma única mudança — foi a acumulação do trabalho de paridade de layout de objetos que correu ao longo desta semana: inferência de shape de object-literal da Fase 1 (v0.5.167), inferência de tipo de retorno baseada em corpo da Fase 4 para funções livres, métodos de classe, getters e arrow functions (v0.5.169), e inferência de tipo de retorno em chamadas de método da Fase 4.1 (v0.5.170). O tema é o mesmo do último artigo: dê ao LLVM estrutura estática suficiente para ver através, e o otimizador faz o resto.

A v0.5.164 também restaurou a autovetorização de acumulador paralelo `<2 x double>` em loops de redução de fadd puro, que tinha regredido silenciosamente em algum ponto da faixa v0.5.9x→v0.5.16x. É isso que traz o `math_intensive` e o `accumulate` de volta à sua velha liderança de 3-4x sobre Rust/C++/Go/Swift — mesmo LLVM, uma flag `reassoc contract`, um corpo de loop vetorizado.

## 4\. `perry/ui` e doc-tests

Quatro lacunas restantes de perry/ui foram fechadas na v0.5.151. Juntamente com isso, a v0.5.119 virou o mau uso silencioso de APIs do perry/ui de “compila e não faz nada” para um erro hard de compilação — mesma lógica da v0.5.165 aplicada aos decorators (veja abaixo). Mau uso a aparecer em tempo de compilação é sempre melhor do que em tempo de execução.

A v0.5.123 entregou um **harness de teste de doc-examples** e uma widget gallery. Cada exemplo de TypeScript na documentação agora é compilado em cada corrida de CI, e a widget gallery compara screenshots contra baselines abençoadas. A v0.5.125 estendeu isso para uma matriz de cross-compile: cada exemplo de doc é construído para iOS, tvOS, Android, WASM e Web, além da plataforma host, então drift de API entre targets é apanhado no PR que o introduziu, em vez do ciclo de release que o entregou.

Uma pequena vitória de qualidade de vida: `perry check` agora emite `file:line:column` para erros de HIR lowering ([#129](https://github.com/PerryTS/perry/issues/129)), o que significa que o jump-to-error do editor funciona em vez de mostrar uma mensagem genérica sem localização.

## 5\. watchOS compila de ponta a ponta

O watchOS foi entregue como target de compilação no mês passado, mas um build limpo de ponta a ponta tinha algumas arestas. O trabalho de watchOS desta semana:

-   **v0.5.113**: `--target watchos` e `--target watchos-simulator` agora compilam de ponta a ponta sem os workarounds que se tinham acumulado.
-   **v0.5.114**: `--features watchos-game-loop` para apps de superfície Metal.
-   **v0.5.122**: `--features watchos-swift-app` para renderização hospedada por SwiftUI — quando quer que o SwiftUI seja dono do ciclo de vida da app e o Perry componha a UI dentro dele.
-   **v0.5.135**: `PERRY_UI_TEST_MODE` ligado no perry-ui-ios e perry-ui-tvos, para que o teste de UI com Geisterhand corra da mesma forma nesses dois targets como corre no macOS e Linux.

## 6\. Primitivas `perry/thread` totalmente ligadas

A v0.5.174 (hoje) fechou a [#146](https://github.com/PerryTS/perry/issues/146): `parallelMap`, `parallelFilter` e `spawn` estão totalmente ligados através do caminho de codegen com aplicação de segurança em tempo de compilação. Capturas mutáveis são rejeitadas em tempo de compilação — a mesma postura de correção-em-tempo-de-compilação que o perry/ui e os decorators agora têm. Primitivas de thread que estavam parcialmente ligadas desde o anúncio da v0.4.0 agora estão completas de ponta a ponta.

## 7\. WebAssembly e o target web

Duas correções de WASM que merecem destaque:

-   **v0.5.158**: cinco bugs compostos no `--target web` (o caminho de saída de WASM) que se mascaravam uns aos outros. Corrigidos em lote para que o target web agora aguente sob a superfície completa de `perry/ui` ([#133](https://github.com/PerryTS/perry/issues/133)).
-   **v0.5.161**: `break`/`continue` dentro de `if` dentro de um loop estava a ficar pendurado em WASM — um bug de codegen que não se reproduzia nos targets nativos. Corrigido ([#135](https://github.com/PerryTS/perry/issues/135)).

Também do lado da correção: a v0.5.157 corrigiu `obj.field` a retornar `NaN` no Android ([#128](https://github.com/PerryTS/perry/issues/128)), e a v0.5.162 corrigiu um bug amaldiçoado do ws onde `sendToClient` e `closeClient` estavam a compilar para no-ops silenciosos ([#136](https://github.com/PerryTS/perry/issues/136)).

## 8\. Vitórias de estritência em tempo de compilação

Um tema desta semana: tudo o que costumava ser uma falha silenciosa é agora um erro de compilação.

-   **v0.5.165**: os decorators de TypeScript eram parseados para HIR e depois silenciosamente descartados. Agora dão erro no ponto de decoração com uma mensagem clara ([#144](https://github.com/PerryTS/perry/issues/144)). Mesmo raciocínio de warn→bail da v0.5.119 aplicado ao perry/ui.
-   **v0.5.119**: mau uso de API do perry/ui rejeitado em tempo de compilação em vez de produzir um binário no-op.
-   **v0.5.172**: `console.trace()` agora emite um backtrace nativo real para o stderr em vez de apenas ecoar a mensagem ([#20](https://github.com/PerryTS/perry/issues/20)). Frames simbolicados requerem `PERRY_DEBUG_SYMBOLS=1`; sem isso terá endereços, que ainda é mais do que o comportamento de eco de mensagem que substitui.

## 9\. Fechando

O padrão da semana: **distribuição** (npm), **experiência de programador** (`perry dev`, caches incrementais), e **a última derrota de benchmark restante fechada**. Além de um lote de estritência em tempo de compilação que transforma drops silenciosos em erros reais. Seis dias, 94 releases de patch, uma grande mudança de DX.

Experimente:

```
# npm (qualquer plataforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Modo watch para dev iterativo
perry dev
```

Código-fonte: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
