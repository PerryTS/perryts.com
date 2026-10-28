---
title: "UI Nativa Multiplataforma a Partir de TypeScript"
excerpt: "Como Perry mapeia uma base de código TypeScript para widgets de plataforma em seus destinos documentados, incluindo as limitações e pré-requisitos específicos da plataforma."
date: 2025-02-01
tags: ["architecture", "UI", "cross-platform"]
---
Um dos objetivos mais ambiciosos do Perry e fornecer aplicacoes GUI verdadeiramente nativas a partir de um unico codigo TypeScript. Nao sao web views envolvidas em uma casca nativa. Nao e um motor de renderizacao customizado desenhando seus proprios pixels. Widgets nativos reais, renderizados pelo framework de UI proprio de cada plataforma, compilados a partir de TypeScript em tempo de build.

Este post explica como funciona — a arquitetura, o mapeamento de plataformas, os compromissos e onde estamos hoje.

## O Problema com as Abordagens Atuais

O desenvolvimento de GUI multiplataforma tem sido um problema dificil por decadas. Cada grande framework fez um conjunto diferente de compromissos:

### Electron / Tauri (Baseados em Web)

Electron empacota Chromium e Node.js, dando a voce um navegador web como shell do seu aplicativo. Voce tem acesso total a plataforma web, mas seu aplicativo "nativo" e um download de 150+ MB que usa centenas de megabytes de RAM so para mostrar uma janela. Tauri substitui Chromium pela web view do SO, reduzindo drasticamente o tamanho, mas sua UI ainda e HTML/CSS renderizado em uma web view — nao widgets nativos.

### React Native (Baseado em Bridge)

React Native roda seu JavaScript em um motor JS (Hermes ou V8) e faz ponte para widgets nativos atraves de uma fila de mensagens serializadas. Voce obtem widgets nativos reais, mas a ponte adiciona latencia, especialmente para gestos e animacoes. Interacoes complexas exigem descer para codigo nativo (Swift/Kotlin), anulando a promessa de codigo unico.

### Flutter (Renderizador customizado)

Flutter compila Dart para codigo nativo e desenha tudo com seu proprio motor de renderizacao baseado em Skia. O desempenho e excelente, mas seus widgets nao sao nativos — sao replicas perfeitas em pixels. Isso significa que convencoes de plataforma (fisica de rolagem, selecao de texto, comportamentos de acessibilidade) precisam ser reimplementadas em vez de herdadas. E no desktop, as diferencas se tornam mais notaveis.

### KMP + Compose Multiplatform (Parcialmente nativo)

Kotlin Multiplatform compila para JVM no Android e nativo no iOS, mas UI compartilhada atraves de Compose Multiplatform usa um renderizador baseado em Skia — mesmo compromisso que Flutter. Para UI verdadeiramente nativa, voce volta a escrever codigo especifico de plataforma.

## Abordagem do Perry: Compilar para Toolkits Nativos

Perry adota uma abordagem fundamentalmente diferente. Em vez de rodar seu codigo em um runtime e fazer ponte para widgets nativos, ou desenhar pixels customizados, Perry compila seu codigo de UI TypeScript diretamente em chamadas ao toolkit nativo de cada plataforma em tempo de build.

A diferenca chave: **nao ha camada de runtime entre seu codigo e o SDK da plataforma.** O binario compilado chama AppKit, UIKit, Android Views, GTK4 ou Win32 diretamente, exatamente como um app escrito em Swift, Kotlin ou C++ faria.

## A API de UI Unificada

Perry fornece uma API TypeScript comum para construir interfaces de usuario. Esta API e deliberadamente de alto nivel — voce descreve o que sua UI deve conter e como deve se comportar, e Perry mapeia para as construcoes nativas apropriadas.

**counter.ts**

```typescript
import { App, Text, Button, VStack, State } from "perry/ui";
const count = new State(0);
const app = new App("Counter", { width: 400, height: 300 });
app.body(() => {
return VStack({ spacing: 16, alignment: "center" }, [
Text(`Count: ${count.value}`, { fontSize: 32 }),
Button("Increment", () => count.value++),
Button("Reset", () => count.value = 0),
]);
});
app.run();
```

Este mesmo codigo compila para UI nativa em todas as seis plataformas. Sem `#ifdef`, sem verificacoes de plataforma, sem imports condicionais.

## Mapeamento de Plataformas em Detalhe

Veja como Perry mapeia a API unificada para o framework nativo de cada plataforma:

### macOS — AppKit

No macOS, Perry gera codigo que cria e gerencia objetos AppKit diretamente. Um `App` se torna um `NSApplication` com um `NSWindow`. `Text` se torna `NSTextField` (com edicao desativada). `Button` se torna `NSButton` com um padrao target-action conectado ao seu callback. `VStack` se torna um `NSStackView` com orientacao vertical. O layout usa restricoes Auto Layout.

O binario compilado vincula-se ao framework AppKit e chama funcoes do runtime Objective-C diretamente. E a mesma coisa que Swift compilado pelo Xcode faria.

### iOS & iPadOS — UIKit

No iOS, o mapeamento e similar, mas visa UIKit. `App` se torna um `UIApplication` com um `UIWindow` e `UIViewController` raiz. `Text` mapeia para `UILabel`. `Button` mapeia para `UIButton`. O layout usa `UIStackView` e Auto Layout. Eventos de toque sao tratados pela cadeia de respondedores do UIKit.

### Android — JNI + Visualizações

No Android, Perry gera uma biblioteca nativa carregada via JNI (Java Native Interface). `App` mapeia para uma `Activity`. `Text` se torna um `TextView`. `Button` se torna um `android.widget.Button` com um `OnClickListener`. `VStack` mapeia para um `LinearLayout` vertical. O codigo nativo chama de volta o framework Android atraves de JNI, criando e manipulando views Android reais.

### Linux — GTK4

No Linux, Perry usa GTK4. `App` se torna um `GtkApplication` com um `GtkApplicationWindow`. `Text` mapeia para `GtkLabel`. `Button` mapeia para `GtkButton` com um manipulador de sinal. `VStack` mapeia para um `GtkBox` com orientacao vertical. O CSS theming do GTK significa que seu aplicativo segue automaticamente o tema da area de trabalho do usuario.

### Windows — Win32

No Windows, Perry gera chamadas da API Win32. `App` cria uma classe de janela, registra-a e roda um loop de mensagens. `Button` se torna um controle `BUTTON`criado com `CreateWindowEx`. `Text` mapeia para um controle `STATIC`. Eventos sao tratados pelo message pump do Win32 (`WM_COMMAND`, `WM_NOTIFY`, etc.).

## Gerenciamento de Estado

O primitivo `State<T>` do Perry fornece gerenciamento de estado reativo que compila para mecanismos de atualizacao nativos da plataforma. Quando um valor de estado muda, Perry dispara uma atualizacao de UI atraves do proprio sistema de invalidacao da plataforma — `setNeedsDisplay` no macOS/iOS, `invalidate()` no Android, `gtk_widget_queue_draw` no Linux.

Nao ha diffing de DOM virtual, nenhuma passagem de reconciliacao, nenhuma serializacao. Mudancas de estado propagam diretamente para o widget nativo que exibe o valor.

## Por Que Nao a Sintaxe SwiftUI / Jetpack Compose?

Voce pode se perguntar por que Perry nao usa uma sintaxe declarativa similar ao SwiftUI ou Jetpack Compose. A resposta e pragmatica: Perry compila TypeScript, e TypeScript tem seus proprios idiomas. Em vez de inventar uma DSL que parece estranha para desenvolvedores TypeScript, Perry usa uma API estilo builder que parece natural em TypeScript — construtores, chamadas de metodo, callbacks e closures. Sao os mesmos padroes que voce ja usa ao trabalhar com Express, React hooks ou qualquer outra biblioteca TypeScript.

## O Que Esta Disponivel Hoje

Todos os seis backends de plataforma estao implementados e estaveis. O conjunto atual de widgets inclui:

-   **Layout** — VStack, HStack, Spacer, ScrollView, Divider
-   **Exibicao** — Text, Image
-   **Entrada** — Button, TextField, Toggle, Slider
-   **Navegacao** — NavigationView, TabView, List
-   **Conteineres** — TreeView, SearchBar, StatusBar
-   **Estado** — State<T> para atualizacoes reativas

## O Que Vem a Seguir

Estamos expandindo ativamente a biblioteca de widgets. Proximos itens:

-   `SecureField` — entrada de senha com campo de texto seguro nativo da plataforma
-   `ProgressView` — indicadores de progresso determinado e indeterminado
-   `Alert` — dialogos de alerta nativos com botoes e campos de texto
-   `DatePicker` — selecao de data/hora nativa da plataforma
-   `Menu` — barras de menu e menus de contexto nativos

O objetivo e paridade total de framework GUI entre todas as plataformas — cada widget, layout, gesto e animacao disponivel em todos os lugares. Veja o [roadmap](/pt/roadmap/) para o panorama completo.

## Experimente

A melhor maneira de entender a UI nativa do Perry e ve-la em acao. [Pry](/pt/showcase/pry/) e um visualizador JSON nativo construido inteiramente em TypeScript com Perry — um app real com navegacao em arvore, busca e atalhos de teclado, compilado para binarios nativos no macOS, iOS e Android. Leia o [passo a passo completo](/pt/blog/building-pry/) de como foi construido.
