---
title: "tvOS, Compilação Cruzada de iOS a Partir do Linux e Perry Login"
excerpt: "Perry v0.4.24: tvOS como 10º alvo de compilação, compilação cruzada de iOS e macOS a partir do Linux via ld64.lld, perry login com cobrança baseada em uso, reformulação da UI do Windows, notarização no macOS e 120 commits em 5 dias."
date: 2026-03-28
tags: ["tvOS", "cross-compilation", "billing", "Windows", "milestone"]
---
Cinco dias, 120 commits, e o Perry salta de v0.4.0 para v0.4.24. Os destaques: tvOS torna-se o 10.º alvo de compilação, apps iOS e macOS podem agora ser construídas inteiramente a partir do Linux, perry login traz faturação baseada em utilização, e o UI do Windows recebe uma reformulação completa. Aqui está tudo o que foi lançado.

## tvOS: O 10.º Alvo de Compilação

O Perry agora compila para Apple TV. O alvo tvOS usa o mesmo renderizador SwiftUI que o watchOS, partilhando a arquitetura orientada por dados onde o Perry constrói uma árvore de UI e uma app Swift host enviada renderiza-a nativamente. Combinado com a integração WASM `@perry/threads` existente, apps tvOS podem executar cargas de trabalho computacionalmente pesadas em segundo plano enquanto mantêm a UI responsiva.

```
# Compile for Apple TV
perry compile main.ts --target tvos

# Run on tvOS simulator
perry run tvos
```

Isto eleva a contagem total de alvos para **10**: macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly e Web/JavaScript. Uma base de código TypeScript, dez saídas nativas.

## Cross-Compile iOS e macOS a partir do Linux

O Perry agora pode construir binários iOS e macOS inteiramente a partir de uma máquina Linux usando `ld64.lld` como linker Mach-O. Esta é a peça que faltava para CI/CD totalmente automatizado — faça push de TypeScript para um servidor Linux, obtenha binários nativos assinados para cada plataforma Apple sem uma máquina de build macOS.

Chegar aqui exigiu resolver uma cascata de problemas do linker:

-   **Triple de codegen Mach-O** — adicionados triples de alvo `aarch64-apple-macos` e `aarch64-apple-ios` para Cranelift
-   **Linkagem de frameworks** — caminhos de pesquisa de frameworks CoreGraphics, Metal, IOKit, DiskArbitration para cross-compile
-   **`-lobjc`** — símbolos do runtime ObjC necessários para todos os alvos Apple
-   **Versão SDK** — `sdk_version 26.0` no ld64.lld (Apple requer iOS 18+)
-   **Remoção de código morto** — `-dead_strip` em vez de `-Wl,-dead_strip` para o linker Mach-O
-   **Deduplicação do runtime** — remover `perry_runtime` duplicado de libs estáticas UI para evitar erros de linkagem

Combinado com a cross-compilação existente Linux → Windows (v0.2.195+), o Perry agora pode fazer cross-compile para **todas as plataformas a partir do Linux** — iOS, macOS, Windows, Android, WASM e Web.

## Prontidão para a App Store iOS

Um foco importante deste ciclo foi tornar apps iOS compiladas com Perry totalmente compatíveis com a App Store:

-   **Info.plist completo** — todas as chaves requeridas pela Apple: `CFBundleIdentifier`, `CFBundleName`, `CFBundleShortVersionString`, `CFBundleVersion`, `UIDeviceFamily`, `UIRequiredDeviceCapabilities`
-   **CFBundleIcons** — nomeação padrão de ícones iOS (`AppIcon60x60@2x`, etc.) com resolução de fallback
-   **Versão do perry.toml** — campos `version` e `build_number` fluem diretamente para o Info.plist
-   **UILaunchScreen** — usa a chave moderna em vez de `UILaunchStoryboardName` (sem ficheiro storyboard necessário)
-   **Perfis de aprovisionamento** — suporte a perfis de aprovisionamento macOS para distribuição App Store e TestFlight

## Perry Login e Faturação

O Perry agora tem contas e faturação baseada em utilização, alimentado por um novo comando CLI `perry login` e um painel em [app.perryts.com](https://app.perryts.com).

### Como Funciona

-   **`perry login`** — fluxo de dispositivo GitHub OAuth, abre browser, faz polling para conclusão
-   **Plano gratuito** — 15 builds/mês, projetos ilimitados com conta GitHub
-   **Plano Pro** — builds ilimitados via subscrição Polar.sh
-   **Tokens API** — gere e administre tokens a partir do painel para CI/CD
-   **Rastreio de utilização** — contadores mensais de publish e verify com barras de utilização em tempo real

O próprio painel é um servidor Fastify compilado com Perry com uma exportação estática Next.js — construído com Perry, servindo utilizadores Perry.

## Notarização macOS e Assinatura de Código

Duas novas capacidades de assinatura:

-   **`perry publish macos --notarize`** — muda automaticamente para certificado Developer ID (em vez de certificado App Store), submete ao serviço de notarização da Apple e anexa o resultado
-   **Assinatura de código GCloud KMS** — builds Windows podem agora ser assinados usando chaves Google Cloud KMS, permitindo assinatura automatizada em CI sem expor chaves privadas

## Reformulação do UI Windows

O backend de UI Windows recebeu a sua atualização mais abrangente até agora:

-   **Escalonamento DPI-aware** — tamanho da janela, fontes e dimensões de widgets escalam corretamente em displays de alto DPI
-   **APIs de janela estilo launcher** — janelas sem bordas com posicionamento personalizado para UIs estilo launcher/spotlight
-   **Atalhos globais** — atalhos de teclado de sistema que funcionam mesmo quando a app não está focada
-   **Ícones de app** — API `getAppIcon` para exibir ícones de aplicação em UIs de launcher
-   **Layout seguro contra reentrada** — pintura baseada em `RefCell` substituída por armazenamento HWND `SetPropW` para prevenir panics durante mensagens WM\_PAINT aninhadas
-   **Integração Geisterhand** — todos os tipos de widget registados no framework de testes UI, `/type` usa `SendMessageW` via mapa HWND
-   **Suporte de câmara Android** — API de captura de câmara estendida para Android via JNI

## Desempenho

v0.4.14 incluiu uma auditoria de performance abrangente:

-   **`fcmp` nativo** — comparações de ponto flutuante usam instruções nativas do CPU em vez de chamadas de função runtime. Benchmark Mandelbrot **30% mais rápido**.
-   **Append de string in-place** — `str += "text"` modifica o buffer no local em vez de alocar uma nova string. **125x mais rápido** para concatenação repetida.
-   **Curto-circuito AND/OR** — `&&` e `||` ignoram a avaliação do operando direito quando o resultado já está determinado.
-   **Folding de literais negativos** — `-1`, `-0.5` etc. são convertidos em constantes ao nível HIR em vez de emitir uma instrução de negação.

## Builds Paralelas no Hub

O servidor de orquestração de builds agora suporta builds concorrentes por worker:

-   **Despacho baseado em slots** — workers reportam capacidade `max_concurrent`, Hub rastreia jobs ativos por worker
-   **Sem mais 429s** — jobs entram em fila em vez de serem rejeitados quando todos os workers estão ocupados
-   **Downloads de artefactos Base64** — artefactos binários servidos como base64 quando o runtime Perry não consegue lidar com respostas HTTP binárias brutas
-   **WebSocket auto-reconecta** — conexões de monitorização de builds reconectam automaticamente em caso de desconexão

## Novo Pacote: perry/appstorereview

Um novo pacote de primeira parte para solicitar avaliações na app store:

```
import { requestReview } from "perry/appstorereview";

// Opens the native review prompt
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();
```

Uma função, duas plataformas, UI de avaliação nativa. Lógica de timing e exibição fica inteiramente por conta do programador.

## Correções de Codegen

120 commits significam muitas correções de bugs. As mais impactantes:

-   **Igualdade estrita (===)** — três bugs separados corrigidos em v0.4.2: comparação de tags de tipo, tratamento de NaN e distinção null/undefined
-   **Comparação de strings concatenadas** — `===` falhava ao comparar strings construídas via concatenação devido a comparação de ponteiros em vez de comparação de conteúdo
-   **Resolução de construtores** — `new X(args)` agora resolve corretamente construtores importados cross-module e funções construtoras baseadas em closure
-   **Array push ao nível de módulo** — valores adicionados a arrays de nível de módulo dentro de chamadas de função aninhadas em loops eram perdidos devido a ponteiros obsoletos após realocação
-   **Coerção aritmética de null** — `null + 1` agora produz corretamente `1` via `js_number_coerce`
-   **Wrapping de NOT bit-a-bit** — `~x` agora faz wrap para i32 conforme a semântica ECMAScript
-   **fetch().then()** — callbacks nunca disparavam em apps UI nativas devido a falta de drenagem do event loop (v0.4.3)
-   **Módulo e expoente WASM** — operadores `%` e `**` causavam erros de validação WASM (v0.4.5)

## Em Números

-   **~120 commits** no compilador principal Perry em 5 dias
-   **24 versões de patch**: v0.4.1 → v0.4.24
-   **Alvos de compilação**: 9 → 10 (adicionado tvOS)
-   **Alvos cross-compile a partir do Linux**: Windows → Windows, iOS, macOS (todos Apple + Windows)
-   **Novos pacotes**: perry/appstorereview
-   **Nova infraestrutura**: painel app.perryts.com, CLI perry login, faturação Polar.sh
-   **Ganhos de performance**: mandelbrot 30% mais rápido (fcmp nativo), concatenação de strings 125x mais rápida

## Próximos Passos

Fazer cross-compile de iOS e macOS a partir do Linux significa que o Hub agora pode construir para todas as plataformas a partir de um único servidor Linux — sem mais máquinas de build macOS dedicadas para compilação (apenas para assinatura). A infraestrutura de faturação abre o caminho para o beta público do Hub. E com tvOS adicionado, o Perry cobre todas as plataformas Apple: macOS, iOS, iPadOS, watchOS e tvOS.

-   **Beta pública do Hub** — utilizadores externos podem enviar TypeScript e obter binários nativos
-   **Suporte completo a regex** — a última grande lacuna da linguagem
-   **Expansão do perry/ui** — drag and drop, acessibilidade, DatePicker
-   **Source maps e informação de debug** — informação de debug DWARF para depuração nativa

Acompanhe o progresso no [GitHub](https://github.com/PerryTS/perry), leia a documentação em [docs.perryts.com](https://docs.perryts.com), ou consulte o [roadmap](/pt/roadmap/) para o panorama completo.
