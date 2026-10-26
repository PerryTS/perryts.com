---
title: "O Pipeline Completo: Documentação, Distribuição e WidgetKit"
excerpt: "82 commits em uma semana: um site de documentação de 49 páginas, publicação automatizada na App Store e Play Store, pacotes Homebrew e APT, extensões WidgetKit nativas a partir de TypeScript, novos widgets, módulos http/https e um compilador LLVM auto-hospedado."
date: 2026-03-13
tags: ["distribution", "documentation", "WidgetKit", "milestone"]
---
82 commits em sete dias. Um site de documentação com 49 páginas. Publicação automatizada na App Store e Play Store. Pacotes Homebrew e APT. Extensões WidgetKit nativas compiladas a partir de TypeScript. Um compilador LLVM auto-hospedado. E dezenas de correções de bugs em todas as plataformas.

Este post cobre tudo que foi lançado no Perry entre 6 e 13 de março de 2026. O tema é conclusão — preencher as lacunas entre "eu escrevi TypeScript" e "meu app está na App Store."

## docs.perryts.com

O Perry agora tem um site de documentação de verdade. 49 páginas construídas com mdBook, cobrindo tudo desde primeiros passos até a referência da CLI. A documentação está organizada em seções:

-   **Primeiros Passos** — instalação, primeiro projeto, estrutura do projeto
-   **Recursos da Linguagem** — tudo que o Perry suporta do TypeScript
-   **UI Nativa** — 12 páginas cobrindo todos os tipos de widgets, layout, gerenciamento de estado e comportamento específico de plataforma
-   **Plataformas** — páginas dedicadas para cada uma das 6 plataformas alvo
-   **Biblioteca Padrão** — mais de 50 implementações de pacotes nativos documentadas
-   **APIs de Sistema** — diálogos de arquivo, keychain, notificações, multi-janela
-   **WidgetKit** — o novo módulo de extensão de widgets
-   **Plugins** — arquitetura de plugins em tempo de compilação
-   **Referência CLI** — todos os comandos e flags

O site também inclui um arquivo `llms.txt` para descobribilidade por IA, e é implantado via GitHub Pages com um domínio personalizado em [docs.perryts.com](https://docs.perryts.com).

## Instale o Perry com Um Comando

O Perry agora é distribuído através do Homebrew e APT, além da compilação a partir do código-fonte. Uma nova pipeline de release do GitHub Actions compila binários para macOS (arm64 e x86\_64) e Linux (x86\_64 e arm64), depois atualiza automaticamente o tap do Homebrew e o repositório APT.

terminal

\# macOS

brew tap PerryTS/perry

brew install perry

\# Debian/Ubuntu

sudo apt update && sudo apt install perry

Sem mais clonar o repo e compilar com Cargo. Instale o Perry da mesma forma que instala qualquer outra ferramenta.

## Publicação Automatizada na App Store

Esta é a mudança que elimina o maior número de etapas manuais. Executar `perry publish ios` agora trata de todo o pipeline de distribuição iOS automaticamente:

1.  Gera uma chave RSA e CSR via API do App Store Connect
2.  Cria um certificado de distribuição e empacota em um `.p12`
3.  Registra o bundle ID
4.  Cria e baixa um perfil de provisioning
5.  Cria o registro do app no App Store Connect
6.  Compila, assina e faz upload para o TestFlight ou App Store

Sem Xcode. Sem visitas manuais ao portal. Sem download de certificados do navegador. O assistente de configuração roda automaticamente na primeira vez que você publica, guiando pela configuração da chave API e armazenando credenciais no `perry.toml`.

A distribuição macOS é igualmente automatizada. O Perry suporta três modos: TestFlight, DMG notarizado e um novo modo **"ambos"** que publica na App Store e cria um DMG notarizado simultaneamente. Três tipos de certificado são gerados automaticamente: `MAC_APP_DISTRIBUTION`, `MAC_INSTALLER_DISTRIBUTION` e `DEVELOPER_ID_APPLICATION`.

A publicação Android também ganhou um assistente de configuração automático. As três plataformas agora seguem o mesmo padrão: a primeira execução dispara a configuração, as credenciais são salvas no projeto, as execuções subsequentes são de configuração zero.

A validação pré-voo captura problemas antes do build iniciar — incompatibilidade de bundle ID no perfil de provisioning, expiração de certificado, ícone do app ausente, formato de versão inválido, team ID errado. E `encryption_exempt` no `perry.toml [ios]` define automaticamente a chave `ITSAppUsesNonExemptEncryption` no Info.plist, pulando o prompt manual de conformidade de exportação no App Store Connect.

## perry/widget: WidgetKit a partir de TypeScript

O Perry agora pode compilar TypeScript para extensões WidgetKit SwiftUI nativas. Isto não é um wrapper ou uma ponte — o compilador percorre a árvore de renderização no nível HIR e emite código-fonte SwiftUI diretamente. A saída é um bundle completo de extensão WidgetKit que o Xcode (ou o pipeline de build do Perry) pode incorporar no seu app.

terminal

perry widget.ts --target ios-widget --app-bundle-id com.example.app -o out/

A abordagem é fundamentalmente diferente do resto da compilação do Perry. O código Perry normal passa pelo Cranelift para código de máquina nativo. O código de widget passa pelo HIR para saída de texto SwiftUI, porque o WidgetKit requer SwiftUI — não há como construir uma extensão de widget com código imperativo UIKit ou AppKit. O Perry resolve isso tratando a árvore de renderização do widget como um template em tempo de compilação, não código em runtime.

## Novos Widgets e Melhorias de Plataforma

Quatro novos tipos de widget chegaram esta semana:

-   **TextArea** — edição de texto multilinha no macOS, iOS e Android
-   **SecureField** — input de senha no iOS e macOS
-   **QR Code** — geração nativa de QR code no iOS, macOS e Android
-   **Splash Screen** — storyboards LaunchScreen gerados automaticamente (iOS) e temas splash (Android)

### iPad Vai Nativo

O Perry agora gera apps totalmente nativos para iPad: `UIDeviceFamily [1,2]`, suporte a orientação, `UIRequiresFullScreen` e um storyboard LaunchScreen compilado via ibtool. Uma nova função `getDeviceIdiom()` detecta telefone vs. iPad em runtime, e `PerryFrameSplit` fornece contêineres de divisão horizontal baseados em frame para layouts iPad.

### Windows

O Windows ganhou suporte a timer (tick `WM_TIMER` de 50ms), botões owner-drawn com fundos de tema escuro e correções para um bug de use-after-free em `to_wide().as_ptr()` em 18 arquivos de widget. O runtime V8 agora funciona no Windows com as bibliotecas de sistema necessárias linkadas.

### GTK4 (Linux)

O backend GTK4 recebeu polimento visual para corresponder ao macOS: padding CSS para insets de borda, estilo de botão Adwaita, correções de margem VStack e política horizontal de ScrollView.

## http/https e better-sqlite3

Duas adições significativas à stdlib:

Os novos módulos nativos `http` e `https` fornecem HTTP do lado do cliente usando reqwest internamente. A API corresponde ao Node.js: `request()`, `get()`, `ClientRequest` com write/end/on e `IncomingMessage` com statusCode e handlers de eventos.

`better-sqlite3` agora é totalmente suportado: `new Database()`, `prepare`, `exec`, `run`, `get`, `all` — com NaN-boxing adequado e objetos de linha com acesso a propriedades nomeadas.

Outras melhorias da stdlib: `crypto.randomBytes()` agora retorna um Buffer (correspondendo ao Node.js), MongoDB ganhou `listDatabases` e `listCollections` com correções de thread-safety, e INSERT/UPDATE/DELETE do mysql2 agora retorna `ResultSetHeader` com `insertId`.

## Correções de GC e Corretude

Várias correções críticas de garbage collector e corretude do runtime foram lançadas esta semana:

-   **Guarda de reentrância do GC** — previne coleta durante alocação, corrigindo panics de double-borrow RefCell
-   **Rastreamento de Map do GC** — Maps agora são devidamente rastreados durante a fase de marcação, prevenindo coleta de chaves string
-   **Correção de aliasing de strings** — append de string agora sempre aloca strings novas, corrigindo corrupção de aliasing por cópia de ponteiro
-   **Aritmética BigInt** — deslocamento à direita usa deslocamento aritmético para números negativos, operações bitwise usam semântica de wrapping ToInt32
-   **Map.get() undefined** — retorna o correto `TAG_UNDEFINED` para chaves ausentes em vez da tag NaN errada
-   **Raízes GC de campos estáticos** — valores BigInt em campos estáticos de classe registrados como raízes GC

Estas não são correções menores. A correção de reentrância do GC sozinha resolveu uma classe inteira de crashes intermitentes. A correção de aliasing de strings afetava qualquer programa que atribuía uma variável string a outra e depois modificava qualquer uma delas. Estes são os tipos de bugs que só aparecem sob cargas de trabalho reais, e corrigi-los é o que torna o compilador pronto para produção.

## perry-verify: Reforçado

`perry-verify`, o serviço de verificação automatizada de apps, recebeu um passo de endurecimento de segurança: execução em sandbox via `bwrap` no Linux e `sandbox-exec` no macOS, tokens de autenticação no handshake WebSocket e download de binários, limitação de taxa por IP, IDs de trabalho UUID completos para prevenir enumeração e limites de body reduzidos.

## perrysdad: O Compilador Auto-Hospedado

Em um esforço paralelo, `perrysdad` — um compilador LLVM IR auto-hospedado escrito em TypeScript — foi de zero a auto-compilação em cinco fases durante a semana:

1.  **Fase 0-1** — esqueleto de ponta a ponta: HIR para texto LLVM IR para clang, linkado contra `libperry_runtime.a` do Perry
2.  **Fase 2** — parser de descida recursiva escrito à mão com parsing de expressões Pratt para arquivos `.ts` reais
3.  **Fase 3** — arrays, objetos e maps com FFI runtime, mais a correção de um descompasso ABI crítico (JSValue declarado como double no LLVM IR em vez de i64)
4.  **Fase 4** — classes, enums, closures, compilação multi-arquivo com descoberta de módulos e ordenação topológica

O marco: o binário `anvil` auto-compilado agora pode compilar programas de teste e produzir saída correta correspondendo à versão compilada por node. Um compilador TypeScript, compilado pelo Perry para código nativo, compilando mais TypeScript para código nativo. Tartarugas até o fim.

## Em Números

-   **82 commits** no compilador Perry principal
-   **1 release**: v0.2.173 (8 de março)
-   **49 páginas de documentação** em docs.perryts.com
-   **4 novos widgets**: TextArea, SecureField, QR Code, Splash Screen
-   **3 canais de distribuição**: Homebrew, APT, código-fonte
-   **3 pipelines de store automatizados**: App Store, TestFlight, Google Play
-   **Todas as 6 plataformas** receberam melhorias esta semana

## Próximos Passos

O pipeline está se preenchendo. Você pode escrever TypeScript, compilar para seis plataformas, distribuir via Homebrew ou APT, publicar na App Store e Play Store, adicionar widgets na tela inicial e ler documentação abrangente — tudo sem sair da toolchain do Perry. O que falta:

-   **Suporte completo a regex** — a última grande lacuna da linguagem
-   **Expansão do perry/ui** — arrastar e soltar, rótulos de acessibilidade, DatePicker
-   **Maturação do perrysdad** — expandindo o compilador auto-hospedado em direção à paridade total com o Perry
-   **Beta público do Hub** — abrindo builds distribuídas para usuários externos

Acompanhe o progresso no [GitHub](https://github.com/PerryTS/perry), leia a nova documentação em [docs.perryts.com](https://docs.perryts.com), ou confira o [roadmap](/pt/roadmap/) para o panorama completo.
