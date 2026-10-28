---
title: "Todas as Seis Plataformas, Paridade Total de Funcionalidades"
excerpt: "Mais de 20 widgets UI nativos, widget Canvas, Table views, notificações do sistema, acesso ao keychain, suporte a múltiplas janelas e paridade total de funcionalidades em macOS, iOS, iPadOS, Android, Linux e Windows — tudo a partir de um único código TypeScript."
date: 2026-02-28
tags: ["UI", "cross-platform", "release", "milestone"]
---
Quando lancamos a primeira versao do sistema de UI nativa do Perry, "multiplataforma" significava que macOS funcionava bem e as outras cinco plataformas eram stubs. Hoje, com v0.2.162, isso nao e mais verdade. Todas as seis plataformas — macOS, iOS, iPadOS, Android, Linux e Windows — agora compartilham paridade total de recursos. O mesmo codigo TypeScript compila para widgets nativos em cada alvo.

Este post percorre o que lancamos entre v0.2.152 e v0.2.164: um widget Canvas, uma implementacao completa de NSTableView, mais de 20 widgets de UI no total, o modulo `perry/system`, suporte multi-janela, notificacoes do sistema, acesso ao keychain, reducao automatica do tamanho do binario e um sistema de plugins em tempo de compilacao. Muita coisa aconteceu.

## O Sprint de Widgets: Mais de 20 Componentes de UI Nativos

O maior salto veio na v0.2.155, que trouxe mais de 20 widgets de UI em todas as plataformas. A API de UI TypeScript do Perry agora cobre os componentes que voce realmente precisa para enviar um app real:

-   **Layout** — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView
-   **Entrada** — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker
-   **Exibicao** — Text, Label, Image, ProgressView, Divider, Spacer
-   **Dados** — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)
-   **Sobreposicao** — Alert, Sheet, Popover, Toolbar, NavigationBar
-   **Desenho** — Canvas (API de desenho 2D, acelerada por hardware por plataforma)

Estes nao sao wrappers em torno de um renderizador customizado. Cada widget compila para o componente nativo da propria plataforma: `NSButton` no macOS, `UIButton` no iOS, `GtkButton` no Linux, `android.widget.Button` no Android via JNI, e `CreateWindowEx` no Windows. O SO os desenha, aplica temas e lida com acessibilidade — Perry apenas conecta a API TypeScript.

## Canvas: Desenho 2D a partir de TypeScript

Uma das adicoes mais tecnicamente interessantes e o widget Canvas (v0.2.152). Ele expoe uma API de desenho 2D familiar diretamente do TypeScript — curvas bezier, preenchimentos, tracos, blitting de imagem — e compila para o backend 2D acelerado da plataforma: Core Graphics no macOS/iOS, Cairo no Linux, Direct2D no Windows e Skia no Android.

**canvas.ts**

```typescript
import { Canvas, Color } from 'perry/ui';
// Compiles to Core Graphics on macOS, Cairo on Linux, etc.
const canvas = new Canvas({ width: 400, height: 300 });
canvas.onDraw((ctx) => {
  ctx.fillStyle = Color.amber;
  ctx.fillRect(10, 10, 100, 60);
  ctx.strokeStyle = Color.blue;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(200, 150, 80, 0, Math.PI * 2);
  ctx.stroke();
});
```

## Widget Table: NSTableView Chega ao TypeScript

A v0.2.163 trouxe o widget Table — o componente mais complexo da biblioteca. No macOS ele mapeia para `NSTableView` com fiacao completa de delegate/data source. No Linux usa `GtkTreeView` do GTK4. No Windows, o controle `ListView` do Win32. No Android vincula-se ao `RecyclerView` atraves de JNI.

A API TypeScript e declarativa: voce define colunas, fornece uma fonte de dados e Perry lida com a fiacao especifica da plataforma em tempo de compilacao. Ordenacao de colunas, tratamento de selecao e personalizacao da altura das linhas funcionam nativamente.

**table.ts**

```typescript
import { Table, Column } from 'perry/ui';
const table = new Table({
  columns: [
    new Column({ title: "Name", key: "name", width: 200 }),
    new Column({ title: "Size", key: "size", width: 80 }),
  ],
  rows: files,  // TypeScript array of objects
  onSelect: (row) => console.log(row.name),
});
```

## O Modulo perry/system

A v0.2.155 tambem introduziu `perry/system` — um modulo TypeScript que expoe APIs de sistema da plataforma sem nenhum runtime: dialogos de arquivo, dialogos de salvamento, alertas, sheets, acesso ao keychain, notificacoes do sistema e gerenciamento multi-janela.

-   `system.showOpenDialog()` — seletor de arquivo nativo (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)
-   `system.showSaveDialog()` — dialogo de salvamento nativo
-   `system.showAlert()` — painel de alerta nativo
-   `system.notify()` — notificacao do SO (UserNotifications / libnotify / WinRT)
-   `system.keychain.get/set()` — Serviços de chaveiro / Serviço secreto / Armazenamento de credenciais do Windows
-   `system.openWindow()` — gerenciamento multi-janela

Todos chamam APIs nativas da plataforma diretamente — sem IPC do Electron, sem bridge de web view. Perry compila o ponto de chamada TypeScript para uma chamada de funcao nativa direta no SDK da plataforma.

## Paridade de Recursos em Seis Plataformas: v0.2.162

O marco v0.2.162 foi sobre fechar lacunas. Antes desta versao, macOS tinha o conjunto de recursos mais completo, iOS estava quase la, e Linux/Windows/Android ficavam para tras. v0.2.162 trouxe todas as seis plataformas ao mesmo nivel:

-   **macOS** — AppKit, conjunto completo de widgets, Keychain, notificacoes, multi-janela, toolbar
-   **iOS / iPadOS** — UIKit, paridade total de widgets com macOS, ciclo de vida de scene
-   **Android** — JNI bridge, todos os widgets via Android Views, compilacao cruzada NDK
-   **Linux** — GTK4, conjunto completo de widgets incluindo Table, dialogos de arquivo, keychain libsecret
-   **Windows** — Win32, todos os widgets, Windows Credential Store, notificacoes WinRT

Este e o marco que torna "um codigo, seis plataformas" real em vez de aspiracional. O mesmo arquivo TypeScript compila para apps nativos em todos os seis alvos sem caminhos de codigo especificos de plataforma para casos de uso comuns.

## Reducao Automatica do Tamanho do Binario

A v0.2.153 trouxe a reducao automatica do tamanho do binario — o compilador agora remove agressivamente caminhos de codigo nao utilizados, elimina funcoes stdlib inalcancaveis e deduplica definicoes de simbolos durante a vinculacao. Uma ferramenta CLI tipica que anteriormente compilava para ~4 MB agora fica abaixo de 2 MB sem mudancas no seu codigo.

Isso importa para implantacoes reais. Quando seu binario e a unidade de implantacao — copiado para um servidor, distribuido como um unico arquivo, embutido em um container — o tamanho afeta diretamente o tempo de transferencia e o custo de armazenamento. Reduzir pela metade o tamanho do binario gratuitamente e uma melhoria significativa.

## O Sistema de Plugins em Tempo de Compilacao

A v0.2.152 introduziu o sistema de plugins do Perry — e e arquiteturalmente diferente de todos os outros sistemas de plugins no ecossistema TypeScript. Nao ha carregamento de plugins em runtime, sem IPC, sem `require()` dinamico. Plugins sao modulos TypeScript que Perry resolve e compila em tempo de build.

O resultado: plugins tem exatamente zero sobrecarga de runtime. Compilam no mesmo binario que o codigo da sua aplicacao, com chamadas de funcao diretas entre codigo de plugin e codigo host. Se voce nao usa um plugin, ele nao aparece no seu binario. Se usa, e inlinado como qualquer outro modulo.

Escrevemos sobre a filosofia por tras disso em [Sistemas de Plugins Sao um Imposto de Desempenho](/pt/blog/plugin-systems-are-a-performance-tax/). A versao curta: arquiteturas de plugins em runtime trocam desempenho por extensibilidade. Composicao em tempo de build da ambos.

## Melhorias na Linguagem

O sprint de UI nao aconteceu isolado — o proprio compilador continuou ficando mais capaz. Ao longo dessas versoes:

-   **Expressoes de classe** — `const Foo = class extends Bar {}` agora compila corretamente
-   **Transformacoes de generators** — `function*` e `yield` compilam para maquinas de estado nativas
-   **Map/Set como campos de classe** — `private items = new Map()` funciona no codegen
-   **Coercao de tipo de parametro FFI** — chamadas de biblioteca nativa lidam com coercao de tipo automaticamente
-   **Referencias de metodo vinculado** — referencias `this.method` funcionam para modulos nativos (fs, os, path)
-   `string.match()` — agora totalmente suportado
-   `path.isAbsolute()`, `path.join()` multi-argumento, `path.resolve()`
-   **Alvo web** — Perry agora pode compilar para uma saida compativel com web para implantacoes hibridas

## Proximos Passos

Com a paridade de UI em seis plataformas entregue, a proxima fase e profundidade em vez de largura. Estamos trabalhando em:

-   Suporte completo a RegExp (`regex.test()`, `string.matchAll()`)
-   Arrastar e soltar, menus de contexto customizados e labels de acessibilidade no sistema de widgets
-   Uma extensao VS Code para diagnosticos Perry e compilar ao salvar
-   Integracao com gerenciador de pacotes — instalar e compilar pacotes Perry nativos com um comando
-   Alvo de compilacao WASM para implantacao em navegador
-   Multi-threading via threads `Worker`

Se voce quiser acompanhar, o [repositorio Perry](https://github.com/PerryTS/perry) e aberto. Confira o [showcase](/pt/showcase/) para ver o que ja esta sendo construido, ou navegue pelo [roadmap](/pt/roadmap/) para o panorama completo.
