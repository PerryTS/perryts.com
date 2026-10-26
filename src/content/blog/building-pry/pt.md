---
title: "Construindo o Pry: Um Visualizador JSON Nativo em TypeScript"
excerpt: "A walkthrough of building Pry, a native JSON viewer compiled from TypeScript to machine code with the Perry runtime and GC linked in and no webview."
date: 2025-02-20
tags: ["tutorial", "showcase", "Pry"]
---
Pry e um visualizador JSON nativo construido inteiramente em TypeScript e compilado com Perry. Nao e uma demonstracao tecnica — e uma ferramenta real que usamos todos os dias para inspecionar respostas de API, arquivos de configuracao e dumps de dados. Este post explica como foi construido, como compila e como e a experiencia do desenvolvedor quando seu TypeScript compila para um app nativo.

## O Que o Pry Faz

Pry le um arquivo JSON (ou aceita JSON do stdin) e o renderiza como uma arvore interativa e navegavel em uma janela nativa. Se voce ja usou o Quick Look nativo do macOS para JSON, imagine isso — mas mais rapido, com busca e navegacao por teclado.

O conjunto de recursos:

-   **Visualizacao em arvore** — nos retratieis para objetos e arrays, com indicadores de profundidade e expandir/recolher tudo
-   **Busca** — busca de texto completo em chaves e valores com realce em tempo real e navegacao por correspondencias
-   **Atalhos de teclado** — setas para navegar, enter para expandir/recolher, barra para buscar, `⌘C` para copiar
-   **Area de transferencia** — copiar qualquer no ou subarvore como JSON formatado
-   **Coloracao sintatica** — strings em verde, numeros em laranja, booleans em roxo, null em vermelho
-   **Barra de status** — mostra contagem total de nos, profundidade atual, tamanho do arquivo e tempo de analise

## O Codigo-Fonte

Pry e escrito em TypeScript padrao. Nao ha sintaxe especial, macros ou geracao de codigo em tempo de build. Usa a API de UI do Perry, que fornece widgets nativos que compilam para codigo especifico de plataforma.

Aqui esta o ponto de entrada (simplificado para clareza):

pry.ts

import { App, VStack, TreeView, SearchBar, StatusBar, State }

from "perry/ui";

import { readFile, readStdin } from "perry/fs";

// Read input from file arg or stdin

const input = process.argv\[2\]

? readFile(process.argv\[2\])

: readStdin();

const startTime = Date.now();

const data = JSON.parse(input);

const parseMs = Date.now() - startTime;

// Reactive state

const searchQuery = new State("");

const matchCount = new State(0);

// Build the app

const app = new App("Pry", {

width: 800,

height: 600,

minWidth: 400,

minHeight: 300,

});

app.body(() => {

return VStack({ spacing: 0 }, \[

SearchBar({

placeholder: "Search keys and values...",

onSearch: (q) => searchQuery.value = q,

}),

TreeView(data, {

collapsible: true,

syntaxHighlight: true,

searchQuery: searchQuery,

onMatchCount: (n) => matchCount.value = n,

copyOnClick: true,

}),

StatusBar(\[

\`${countNodes(data)} nodes\`,

\`Parsed in ${parseMs}ms\`,

\`${matchCount.value} matches\`,

\]),

\]);

});

app.registerShortcut("/", () => app.focusSearchBar());

app.registerShortcut("Escape", () => {

searchQuery.value = "";

app.focusTree();

});

app.run();

Esse e o nucleo de um aplicativo nativo. Sem boilerplate de framework, sem configuracao de build, sem arquivos especificos de plataforma. Um arquivo TypeScript.

### As Funcoes Auxiliares

Pry tambem inclui um utilitario `countNodes` que conta recursivamente todos os nos na arvore JSON, e um auxiliar `formatBytes` para exibir tamanhos de arquivo. Estas sao funcoes TypeScript padrao — nada especifico do Perry. Compilam para codigo nativo como todo o resto.

utils.ts

export function countNodes(data: unknown): number {

if (data === null || typeof data !== "object") {

return 1;

}

if (Array.isArray(data)) {

return 1 + data.reduce((sum, item) => sum + countNodes(item), 0);

}

const values = Object.values(data as Record<string, unknown\>);

return 1 + values.reduce((sum, val) => sum + countNodes(val), 0);

}

## Compilando o Pry

Compilar o Pry com Perry e um unico comando. Sem projeto Xcode, sem configuracao Gradle, sem configuracao webpack. Apenas aponte Perry para o arquivo de entrada e especifique seu alvo.

### macOS (ARM64)

$ perry build pry.ts --target macos-arm64

Parsing pry.ts...

Resolving imports: perry/ui, perry/fs

Compiling (cranelift, arm64)...

Linking with AppKit.framework...

✓ Built executable: pry (48 MB)

$ file pry

pry: Mach-O 64-bit executable arm64

$ otool -L pry | head -5

pry:

/System/Library/Frameworks/AppKit.framework/AppKit

/System/Library/Frameworks/Foundation.framework/Foundation

/usr/lib/libSystem.B.dylib

O binario tem 48 MB porque inclui toda a pilha de UI AppKit — renderizacao de tree view, realce de busca, coloracao sintatica e tratamento de teclado. Para comparacao, o mesmo app em Electron seria 200+ MB. Um app Perry somente CLI compila para 2-5 MB.

### iOS

$ perry build pry.ts --target ios-arm64

✓ Built executable: pry (52 MB)

O build iOS vincula-se ao UIKit em vez de AppKit. Perry mapeia a mesma API `TreeView` para `UITableView` com secoes expansiveis, `SearchBar` para `UISearchBar`, e eventos de toque substituem eventos de mouse. O build iOS pode ser implantado em dispositivos fisicos e simuladores.

### Android

$ perry build pry.ts --target android-arm64

✓ Built: pry.apk

O build Android gera uma biblioteca nativa carregada atraves de JNI, empacotada em um APK. `TreeView` mapeia para um `RecyclerView` com view holders expansiveis, `SearchBar` mapeia para um `EditText` com um `TextWatcher`, e a barra de status mapeia para um `TextView` na parte inferior do layout.

## O Que Acontece Por Baixo dos Panos

Quando Perry compila o Pry, passa por varias fases:

1.  **Analise** — SWC analisa o codigo TypeScript em uma AST. Importacoes de `perry/ui` e `perry/fs` sao resolvidas para as implementacoes de modulos integrados do Perry.
2.  **Analise de tipos** — Perry resolve todos os tipos, incluindo os genericos `State<string>` e `State<number>`, monomorfizando-os em tipos concretos.
3.  **Resolucao de plataforma** — Com base na flag de alvo, Perry seleciona o backend de UI apropriado. Cada chamada de `TreeView`, `SearchBar` e `Button` e resolvida para a implementacao especifica da plataforma.
4.  **Geracao de IR** — Perry gera uma representacao intermediaria que inclui chamadas de API nativa — envios de mensagem Objective-C para macOS/iOS, chamadas JNI para Android, chamadas de funcao C para GTK4/Win32.
5.  **Geracao de codigo** — Cranelift compila o IR para codigo de maquina nativo para a arquitetura alvo.
6.  **Vinculacao** — O codigo nativo e vinculado contra os frameworks da plataforma (AppKit, UIKit, Android NDK, GTK4 ou Win32) para produzir o executavel final.

## Sem Runtime, Sem Web Views

Isso merece enfase porque e a diferenca fundamental entre Perry e toda outra abordagem TypeScript-para-nativo. O binario compilado do Pry tem:

-   **Sem motor JavaScript** — sem V8, sem Hermes, sem JavaScriptCore
-   **Sem web views** — sem Chromium, sem WebKit, sem WKWebView
-   **Sem camada de ponte** — sem mensagens serializadas entre JS e nativo
-   **Sem runtime de framework** — sem React, sem motor Flutter, sem Dart VM

O binario chama APIs da plataforma diretamente. No macOS, chama `objc_msgSend` para interagir com objetos AppKit. No Android, chama funcoes JNI para criar e manipular Views. E a mesma coisa que um app nativo Swift ou Kotlin faria.

A consequencia pratica: Pry inicia instantaneamente. Nao ha startup de VM, sem aquecimento de JIT, sem analise de script. O processo inicia, a janela aparece, o JSON e renderizado. O uso de memoria e uma fracao do que um equivalente Electron consumiria.

## Experiencia do Desenvolvedor

Construir o Pry pareceu notavelmente similar a construir qualquer aplicacao TypeScript. O fluxo de trabalho e:

1.  Escreva TypeScript no seu editor (VS Code, Zed, Neovim, o que preferir)
2.  Execute `perry compile pry.ts`
3.  Execute `./pry test.json`
4.  Itere

Sem projeto Xcode para configurar. Sem Android Studio para instalar. Sem build Gradle que leva 45 segundos. O proprio compilador Perry e rapido — analisar e compilar o Pry leva alguns segundos, e estamos trabalhando ativamente para torna-lo mais rapido.

O TypeScript que voce escreve e TypeScript padrao. A verificacao de tipos do seu editor, autocomplete e ferramentas de refatoracao funcionam. Voce pode extrair funcoes, criar modulos, usar genericos — todos os padroes TypeScript que voce ja conhece.

## O Que Aprendemos

Construir o Pry nos ensinou muito sobre o que a API de UI do Perry precisa suportar. Algumas licoes:

-   **Tree views sao complexas.** Expandir, recolher, realce de busca, navegacao por teclado e integracao com a area de transferencia precisam ser coordenados. O widget `TreeView` do Perry lida com isso internamente, mas tivemos que garantir que a implementacao nativa fosse consistente em todas as tres plataformas.
-   **Atalhos de teclado precisam seguir convencoes da plataforma.** No macOS, e `⌘C` para copiar. No Linux e Android, e `Ctrl+C`. O sistema de atalhos do Perry abstrai isso, mas foi preciso implementacao cuidadosa para acertar.
-   **Barras de status sao surpreendentemente nao triviais.** Cada plataforma tem uma convencao diferente para onde e como exibir informacoes de status. AppKit usa a barra inferior da janela, UIKit usa uma toolbar, Android usa uma view inferior no layout. O `StatusBar` do Perry mapeia para cada um corretamente.
-   **Suporte a stdin requer consciencia de plataforma.** No macOS e Linux, ler do stdin e direto. No iOS e Android, "stdin" realmente nao existe da mesma forma, entao o Pry usa selecao de arquivo em plataformas moveis. O `readStdin` do Perry lida com isso de forma transparente.

## Desempenho

Pry lida com arquivos JSON grandes confortavelmente. Em nossos testes:

-   Um arquivo JSON de 1 MB (10.000+ nos) analisa e renderiza em menos de 50 ms
-   Um arquivo JSON de 10 MB renderiza em menos de 200 ms
-   Busca em 10.000 nos retorna resultados conforme voce digita, sem lag visivel
-   Uso de memoria fica abaixo de 50 MB mesmo para arquivos grandes

Esta e a vantagem da compilacao nativa. A analise JSON no Perry e compilada para loops nativos apertados sem pausas do GC. A renderizacao de arvore usa as proprias list views virtualizadas da plataforma (NSOutlineView, UITableView, RecyclerView), que sao testadas em batalha quanto ao desempenho.

## Codigo-Fonte e Downloads

Pry e open source. Voce pode navegar pelo codigo completo, compila-lo voce mesmo, ou simplesmente olhar o codigo para entender como um app de UI nativa Perry e estruturado.

-   [Repositorio GitHub](https://github.com/perryts/pry) — codigo-fonte completo e instrucoes de build
-   [Pagina do showcase](/pt/showcase/pry/) — capturas de tela, lista de recursos e detalhes de plataforma

Se voce esta construindo algo com Perry, adorariamos saber. Abra uma issue no [repositorio Perry](https://github.com/PerryTS/perry) ou inicie uma discussao. Estamos construindo Perry abertamente e o feedback de usuarios reais construindo apps reais e inestimavel.
