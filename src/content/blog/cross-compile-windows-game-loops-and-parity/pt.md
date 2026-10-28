---
title: "Compilação Cruzada para Windows, Game Loops no iOS e 100% de Paridade de Testes"
excerpt: "103 commits em uma semana: compilação cruzada para Windows a partir do Linux via lld-link, suporte a game loop no iOS, relatório de crashes, pipeline de build Hub em dois estágios e o compilador auto-hospedado atinge paridade determinística de 68/68 testes."
date: 2026-03-20
tags: ["compiler", "cross-compilation", "infrastructure", "milestone"]
---
103 commits no compilador Perry esta semana. Os destaques: agora é possível fazer cross-compile de executáveis Windows a partir do Linux, apps iOS podem executar game loops bloqueantes, o compilador reporta crashes para telemetria, e o compilador self-hosting passa todos os testes determinísticos que lhe aplicamos. Além de uma grande atualização da infraestrutura Hub e mais de 50 correções de bugs.

## Cross-Compile para Windows a partir do Linux

O Perry agora pode produzir binários Windows `.exe` a partir de um host Linux. Esta é a peça que faltava para pipelines CI/CD que precisam visar Windows sem executar uma máquina de build Windows para toda a compilação.

A implementação substitui verificações `#[cfg]` em tempo de compilação por detecção de target em runtime. Quando o compilador detecta um target Windows num host não-Windows, localiza `lld-link`, `llvm-nm` e `llvm-ar` a partir da toolchain Rust ou do PATH através de um novo helper `find_llvm_tool()`. As bibliotecas de sistema Windows vêm de um sysroot estilo [xwin](https://github.com/Jake-Shadle/xwin) apontado por `PERRY_WINDOWS_SYSROOT`.

O linker usa automaticamente `/FORCE:UNRESOLVED` e gera stubs para símbolos de UI em falta, para que apps CLI façam cross-compile sem problemas. A saída é por padrão `.exe` quando o target é Windows. Os detalhes completos estão na [documentação de cross-compilação](https://docs.perryts.com).

**terminal — host Linux**

```
$ perry compile main.ts --target windows
Compiling main.ts for windows-x86_64...
Using lld-link from Rust toolchain
✓ Compiled executable: main.exe (2.8 MB)
```

## Suporte a Game Loop no iOS

O iOS exige que o UIKit seja dono da thread principal. Isso é adequado para apps baseadas em eventos, mas é um problema para jogos que precisam de um loop bloqueante `while (!shouldClose)`. O Perry agora resolve isso com a flag `--features ios-game-loop`.

Quando ativado, o compilador emite `_perry_user_main` em vez de `main`. O runtime fornece uma `main()` que chama `UIApplicationMain` na thread principal e inicia o seu código numa thread em segundo plano. O scene delegate e o app delegate gerem o ciclo de vida completo do UIKit enquanto o seu game loop executa sem bloqueios.

**main.ts**

```typescript
// Your game loop runs on a background thread
while (!shouldClose) {
update();
render();
awaitNextFrame();
}
```

```text
$ perry run ios --features ios-game-loop
```

Isto permite uma categoria inteira de apps — jogos, simulações, visualizações em tempo real — que não eram práticas no iOS antes. Os caminhos de pump e callback do iOS agora também estão envolvidos em tratamento de panic, para que crashes tanto no game loop quanto no ciclo de vida do UIKit sejam capturados de forma limpa.

## Relatório de Crashes

Apps compiladas com Perry agora instalam um hook de panic e handlers de sinal para `SIGSEGV`, `SIGBUS` e `SIGABRT` na inicialização. Quando um crash fatal ocorre, os detalhes são escritos em `~/.hone/crash.log` para o sistema de telemetria Chirp. Panics capturados (em `catch_callback_panic`) limpam o log, para que apenas crashes genuinamente irrecuperáveis sejam reportados.

Esta é uma funcionalidade de prontidão para produção. Quando algo corre mal em campo, vamos saber — e o log de crash inclui contexto suficiente para diagnosticar o problema sem exigir que os utilizadores reportem nada manualmente.

## Hub: Pipeline de Build Windows em Duas Fases

A infraestrutura de build do Perry Hub recebeu uma atualização arquitetural significativa. Anteriormente, a build para Windows exigia um worker Windows para toda a compilação. Agora o pipeline divide-se em duas fases:

1.  Um worker Linux faz cross-compile do artefacto Windows usando o novo suporte lld-link
2.  O Hub mantém o artefacto pré-compilado e recoloca o job na fila para um worker Windows
3.  O worker Windows apenas trata da assinatura e empacotamento — uma tarefa muito mais leve

Quando um worker envia `complete` com `needs_finishing: "windows"`, o Hub recoloca transparentemente o job na fila. A CLI vê uma experiência de build única e contínua.

O Hub agora também inicia automaticamente VMs Azure Windows quando nenhum worker Windows está conectado, e os workers de build atualizam-se automaticamente para a versão mais recente do Perry em novos lançamentos. Menos gestão manual de infraestrutura, builds mais rápidas.

## Revisão da Documentação

Duas grandes reescritas de documentação foram publicadas esta semana em [docs.perryts.com](https://docs.perryts.com):

-   **Referência perry.toml** — documentação completa de seções cobrindo cada opção de configuração, resolução de bundle ID, resolução de ficheiro de entrada, auto-incremento do número de build e exemplos CI/CD
-   **Referência Geisterhand** — documentação completa da API, configuração de plataforma, padrões de automação de testes e visão geral da arquitetura para o framework de testes de UI cross-platform

Estas não são atualizações incrementais. Ambas são reescritas completas que cobrem cada funcionalidade e opção de configuração. Se está a configurar um novo projeto ou a escrever testes, comece aqui.

## APIs de Menu Cross-Platform

`menuClear` e `menuAddStandardAction` eram anteriormente exclusivos do macOS. Agora funcionam nas 6 plataformas nativas. Isto também inclui uma correção para um panic de re-entrancy de `RefCell` em `dispatch_menu_item` no Windows.

### Android: Alinhamento de Página de 16 KB

O Google Play agora exige alinhamento de página de 16 KB para bibliotecas nativas. O Perry define automaticamente os `CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS` apropriados, e ficheiros `.so` complementares são copiados junto à saída para inclusão em APK/AAB.

## Perry React: Quadro Kanban

A camada de compatibilidade React recebeu um teste real: um quadro Kanban completo de 5 colunas com operações de mover, adicionar, eliminar e visualizar. Construí-lo revelou e corrigiu a renderização de children de arrays aninhados em JSX — o handler recursivo `_appendChildren` agora aplana corretamente arrays retornados de chamadas `.map()`. Também há uma nova demo Kitchen Sink WorkBench de 14 secções cobrindo vários padrões de UI.

## Anvil: 100% de Paridade em Testes Determinísticos

`perrysdad` — o compilador LLVM self-hosting escrito em TypeScript e compilado pelo Perry — agora passa **68 de 68** testes determinísticos, correspondendo exatamente à saída do compilador principal. As únicas diferenças são inerentes (timestamps, `Math.random()`), e 11 testes são ignorados porque requerem UI, timers, crypto ou funcionalidades específicas de plataforma ainda não implementadas.

Trabalho chave que levou a este resultado:

-   **Dispatch de métodos de interface** — variáveis tipadas como interface agora retornam métodos corretos via dispatch baseado em class\_id no ObjectHeader
-   **Acesso dinâmico a propriedades** — dispatch em runtime para nomes de propriedades calculados
-   **Closures e this-binding** — semântica de captura correta para métodos de objetos
-   **Fase 6 em progresso** — async/await, geradores e correções de condições

100% de paridade em testes determinísticos é um marco significativo. Significa que o binário `anvil` auto-compilado produz exatamente a mesma saída que o compilador principal para cada cenário testável. A diferença está a diminuir rumo ao self-hosting completo.

## Mais de 50 Correções de Bugs

Uma grande investida na correção esta semana. Destaques:

-   **JSON.parse** — arrays já não são truncados em 16 elementos, input inválido tratado corretamente
-   **Uint8Array** — construtor a partir de variável array, implementação de `.set(source, offset)` (era um no-op)
-   **BigInt** — NaN-boxing com `BIGINT_TAG` para chamadas cross-module, correções de truncamento de 32 bits do keccak256
-   **Optional chaining** — expressões condicionais aninhadas, deteção de toString, NaN-boxing do valor de retorno
-   **IndexSet** — NaN-boxing de strings corrigido para usar `STRING_TAG` em vez de `POINTER_TAG`
-   **MySQL** — tipos DATETIME e BLOB, construtor `Date(string)`
-   **Math.min/max** — tratamento de argumentos spread
-   **Dispatch de métodos nativos** — field-scan-and-call para objetos `POINTER_TAG`

Estes não são casos extremos. JSON.parse a truncar arrays em 16 elementos quebraria qualquer aplicação real. Uint8Array.set como no-op corromperia silenciosamente os dados. Estas são as correções que tornam o compilador pronto para produção, um bug de correção de cada vez.

## Em Números

-   **103 commits** no compilador principal Perry
-   **3 versões**: v0.2.195, v0.2.196, v0.2.197
-   **1 funcionalidade principal**: cross-compile Windows a partir do Linux
-   **1 nova categoria de app**: game loops iOS
-   **68/68** paridade de testes determinísticos no perrysdad
-   **Mais de 50 correções de bugs** em NaN-boxing, stdlib e FFI nativo
-   **2 reescritas de documentação**: perry.toml e Geisterhand
-   **5 melhorias no Hub**: pipeline de duas fases, arranque automático Azure, atualização automática de workers

## Próximos Passos

A cross-compilação para Windows abre a porta para CI/CD multi-plataforma totalmente automatizado — faça push de TypeScript, obtenha binários nativos para cada target sem máquinas de build dedicadas para cada SO. O suporte a game loop desbloqueia toda uma nova categoria de apps iOS. E 100% de paridade de testes determinísticos no perrysdad significa que o self-hosting está a tornar-se muito real. O que resta:

-   **Suporte completo a regex** — a última grande lacuna da linguagem
-   **Expansão do perry/ui** — drag and drop, rótulos de acessibilidade, DatePicker
-   **perrysdad Fase 6** — async/await, geradores, expandindo rumo à paridade completa com Perry
-   **Beta pública do Hub** — abertura de builds distribuídas a utilizadores externos

Acompanhe o progresso no [GitHub](https://github.com/PerryTS/perry), leia a documentação em [docs.perryts.com](https://docs.perryts.com), ou consulte o [roadmap](/pt/roadmap/) para o panorama completo.
