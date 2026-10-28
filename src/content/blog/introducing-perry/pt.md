---
title: "Apresentando o Perry"
excerpt: "Perry compila TypeScript compatível para executáveis nativos independentes com seu tempo de execução e GC vinculados, sem exigir um Node.js ou mecanismo JavaScript."
date: 2025-01-15
tags: ["announcement", "compiler", "TypeScript"]
---
Temos o prazer de apresentar o Perry — um compilador nativo de TypeScript escrito em Rust que compila seu TypeScript diretamente para executaveis independentes. Sem runtime Node.js, sem wrapper Electron, sem compromissos. Apenas seu codigo, compilado para um binario nativo que inicia instantaneamente e roda em qualquer lugar.

Perry representa uma reformulacao fundamental do que TypeScript pode ser. Em vez de trata-lo como um superconjunto de JavaScript que deve rodar atraves de um motor JS, Perry trata TypeScript como uma linguagem de sistemas — uma que por acaso tem uma sintaxe que milhoes de desenvolvedores ja conhecem e adoram.

## Por Que Construimos o Perry

TypeScript se tornou a lingua franca do desenvolvimento de software moderno. E a linguagem por tras da maioria dos frontends web, uma parcela crescente de backends, e cada vez mais a escolha para ferramentas, scripts e automacao. Mas sempre carregou uma limitacao fundamental: compila para JavaScript, e JavaScript requer um runtime.

Esse runtime — seja Node.js, Deno ou Bun — vem com compromissos. Tempos de inicializacao a frio medidos em dezenas ou centenas de milissegundos. Sobrecarga de memoria do compilador JIT e coletor de lixo. Distribuicoes binarias que empacotam o runtime inteiro ou exigem que o usuario instale um. E para aplicacoes GUI, a unica opcao tem sido Electron, que envia um navegador Chromium inteiro com seu aplicativo.

Nos perguntamos: e se TypeScript nao precisasse passar pelo JavaScript? E se voce pudesse compila-lo diretamente para codigo de maquina nativo, da mesma forma que compila Rust, Go ou C++?

## Como o Perry Funciona

O pipeline de compilacao do Perry tem tres estagios:

1.  **Analise sintatica** — Perry usa SWC (o parser de TypeScript/JavaScript baseado em Rust) para analisar seu codigo TypeScript em uma AST. SWC e o mesmo parser usado pelo Next.js, e e extremamente rapido.
2.  **Compilacao dirigida por tipos** — Perry percorre a AST com informacao completa de tipos. Diferente de um motor JS que precisa lidar com tipos dinamicos em tempo de execucao, Perry conhece todos os tipos em tempo de compilacao. Isso permite monomorfizacao de genericos, despacho estatico de chamadas de metodo e otimizacao direta do layout de memoria.
3.  **Geracao de codigo** — Perry gera codigo de maquina nativo usando Cranelift, o mesmo gerador de codigo usado pelo Wasmtime e partes do JIT do Firefox. Cranelift produz codigo nativo eficiente para x86\_64 e ARM64.

O resultado e um executavel independente — tipicamente 2-5 MB para uma ferramenta CLI — que inicia instantaneamente com zero tempo de aquecimento.

```text
$ perry build app.ts
Parsing app.ts...
Compiling (cranelift, arm64)...
Linking...
✓ Built executable: app (2.3 MB)
$ ./app
Hello from native TypeScript!
$ file app
app: Mach-O 64-bit executable arm64
```

## Quais Recursos do TypeScript Sao Suportados

Perry suporta um subconjunto amplo e crescente do TypeScript. O objetivo e compatibilidade total com a linguagem como os desenvolvedores realmente a usam. Hoje, isso inclui:

-   **Todos os tipos primitivos** — string, number, boolean, null, undefined, bigint, symbol
-   **Interfaces e aliases de tipo** — incluindo tipos union, tipos intersection e tipos mapeados
-   **Genericos** — compilados via monomorfizacao, entao `Array<number>` e `Array<string>` geram caminhos de codigo otimizados distintos
-   **Classes** — com heranca, campos privados (`#field`), membros estaticos, getters/setters e decoradores
-   **Async/await e Promises** — compilados para uma maquina de estados, similar a como Rust lida com async
-   **Geradores e iteradores** — `function*` e lacos `for...of`
-   **Closures** — com semantica de captura adequada
-   **Desestruturacao** — arrays, objetos, padroes aninhados e elementos rest
-   **Template literals** — incluindo tagged templates
-   **Modulos** — imports/exports ESM resolvidos em tempo de compilacao

## UI Nativa Multiplataforma

Perry nao se limita a ferramentas CLI e aplicacoes do lado do servidor. Ele vem com frameworks de UI nativos para seis plataformas:

-   **macOS** — AppKit (NSWindow, NSView, NSButton, NSTextField e mais)
-   **iOS** — UIKit (UIViewController, UIView, UIButton, UITableView)
-   **iPadOS** — UIKit (mesma API do iOS, com adaptacoes especificas para iPad)
-   **Android** — JNI + visualizações do Android (atividade, visualização, Button, RecyclerView)
-   **Linux** — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)
-   **Windows** — Win32 (CreateWindowEx, controles comuns, GDI)

O insight principal e que Perry mapeia uma API TypeScript comum para o toolkit de widgets nativos de cada plataforma em tempo de compilacao. Nao ha camada de ponte, nao ha web view e nao ha motor de renderizacao customizado. Seu aplicativo usa widgets reais da plataforma, renderizados pelo proprio SO. Leia mais em nosso aprofundamento: [UI Nativa Multiplataforma a partir de TypeScript](/pt/blog/cross-platform-native-ui/).

## Mais de 27 Implementacoes Nativas de Pacotes npm

Um dos maiores desafios praticos de um novo compilador e a compatibilidade com o ecossistema. Desenvolvedores nao escrevem apenas codigo do zero — eles usam pacotes. Perry resolve isso com implementacoes nativas de mais de 27 pacotes npm populares:

-   **Bancos de dados** — mysql2, pg, mongodb, better-sqlite3, ioredis
-   **HTTP** — axios, express, ws (WebSockets)
-   **Seguranca** — bcrypt, jsonwebtoken, crypto
-   **Utilitarios** — uuid, chalk, dotenv, lodash (parcial), moment
-   **Sistema** — fs-extra, glob, chokidar, commander

Estas nao sao wrappers finos sobre modulos Node.js. Sao compiladas diretamente no seu binario usando bibliotecas nativas do sistema — libpq para PostgreSQL, OpenSSL para crypto, libcurl para HTTP. A superficie da API corresponde ao que voce esperaria do pacote npm, entao a migracao e direta.

## Camada Opcional de Compatibilidade V8

Para pacotes npm que ainda nao tem implementacoes nativas no Perry, Perry oferece um modo opcional de incorporacao V8. Quando habilitado, Perry empacota um runtime V8 e pode executar pacotes npm JavaScript padrao junto com seu TypeScript compilado. Esta e uma valvula de escape pragmatica que permite adotar Perry incrementalmente — compile os caminhos criticos para codigo nativo enquanto ainda acessa o ecossistema npm completo para todo o resto.

## Compilacao Cruzada

Perry suporta compilacao cruzada nativamente. Da sua maquina de desenvolvimento macOS, voce pode compilar para Linux (x86\_64 e ARM64) e iOS. Isso significa que voce pode construir seu pipeline CI/CD no macOS e produzir binarios para todos os seus alvos de implantacao sem precisar de maquinas de build dedicadas para cada plataforma.

```
# Build for Linux from macOS
$ perry build app.ts --target linux-x86_64
✓ Built executable: app (3.1 MB)
# Build for iOS from macOS
$ perry build app.ts --target ios-arm64
✓ Built executable: app (4.8 MB)
```

## Desempenho

Binarios compilados pelo Perry sao rapidos. Como nao ha aquecimento JIT, nenhuma sobrecarga de interpretador e nenhuma pausa do coletor de lixo, o desempenho e previsivel e consistente desde a primeira invocacao.

Em nossos benchmarks:

-   **Tempo de inicializacao** — efetivamente 0 ms (lancamento de processo nativo)
-   **Tamanho do binario** — 2-5 MB para ferramentas CLI tipicas (vs 50+ MB para Node.js empacotado)
-   **Uso de memoria** — 5-10x menor que aplicacoes Node.js equivalentes
-   **Throughput** — competitivo com C escrito a mao para cargas de trabalho intensivas em computacao

Voce pode ver benchmarks ao vivo em [demo.perryts.com](https://demo.perryts.com), que compara executaveis compilados pelo Perry contra Node.js e Bun em tempo real.

## Status Atual

Perry esta em desenvolvimento ativo. O compilador e estavel com 62 de 62 testes passando em toda a suite de testes. Todos os seis backends de UI de plataforma estao funcionais. Os recursos principais da linguagem sao solidos e estao expandindo.

Estamos trabalhando ativamente na expansao da biblioteca de widgets de UI, melhorando o desempenho de strings e objetos, completando o suporte total a regex e construindo o modulo Stream. A longo prazo, estamos planejando alvos de compilacao WASM, multi-threading, uma extensao VS Code e integracao com gerenciador de pacotes.

Confira o [roadmap](/pt/roadmap/) completo para detalhes sobre o que foi lancado, o que esta em andamento e o que vem a seguir.

## Comece Agora

Perry e open source. Voce pode clonar o repositorio, compilar a partir do codigo-fonte e comecar a compilar TypeScript hoje:

```
$ git clone https://github.com/PerryTS/perry.git
$ cd perry
$ cargo build --release
# Compile your first TypeScript file
$ ./target/release/perry build hello.ts
✓ Built executable: hello (2.1 MB)
$ ./hello
Hello, world!
```

Navegue pelo codigo-fonte no [GitHub](https://github.com/PerryTS/perry), confira o [showcase](/pt/showcase/) para ver o que esta sendo construido com Perry, ou mergulhe direto no codigo. Mal podemos esperar para ver o que voce vai construir.
