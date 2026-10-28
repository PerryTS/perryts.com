---
title: "De Compilador a Ecossistema: React, Bancos de Dados e Builds na Nuvem"
excerpt: "Perry cresce de um compilador para um ecossistema completo. perry/ui no centro, ORMs compatíveis com Prisma para MySQL/PostgreSQL/SQLite, notificações push universais, builds distribuídos com publicação na App Store e uma camada de compatibilidade React — tudo em uma semana."
date: 2026-03-06
tags: ["ecosystem", "perry/ui", "databases", "infrastructure", "milestone"]
---
Uma semana atrás, Perry era um compilador com um toolkit de UI. Você podia escrever TypeScript, compilá-lo para um binário nativo e distribuí-lo em seis plataformas. Essa era a história. Hoje a história é maior: Perry está se tornando um ecossistema. Três ORMs de banco de dados, notificações push universais, builds distribuídas com publicação na App Store e Play Store, uma camada de compatibilidade React e verificação automatizada de apps — tudo isso chegou na última semana.

Este post cobre o que foi lançado, por que isso importa e como o código se parece.

## perry/ui: A Base

Antes de entrar nas novas bibliotecas, vale enfatizar o que está no centro de tudo: `perry/ui`. Este é o toolkit de UI nativo próprio do Perry — mais de 20 widgets que compilam diretamente para componentes nativos da plataforma em todos os seis alvos. Não é um wrapper, não é uma camada de abstração, não é uma web view. Todo `Button` se torna um `NSButton` no macOS, um `UIButton` no iOS, um `GtkButton` no Linux, um `android.widget.Button` no Android e um `CreateWindowEx` control no Windows.

`perry/ui` é a superfície de UI primária e mais avançada do Perry. Inclui gerenciamento de estado reativo, contêineres de layout (VStack, HStack, ZStack, SplitView), um Canvas com aceleração de hardware, views Table com ordenação de colunas, o módulo `perry/system` para diálogos de arquivo, acesso ao keychain, notificações e multi-janela — tudo a partir de TypeScript, tudo compilado para chamadas diretas à API da plataforma. Toda outra abordagem de UI no Perry, incluindo a camada de compatibilidade React, é construída sobre `perry/ui` e mapeia de volta para seus widgets.

**app.ts**

```typescript
import { Window, VStack, Button, Text, State } from 'perry/ui';
const count = new State(0);
const window = new Window({ title: "Counter" });
window.setContent(
  new VStack({ children: [
    new Text({ text: count }),
    new Button({ title: "+1", onClick: () => count.set(count.get() + 1) }),
  ] })
);
```

O objeto reativo `State` é a primitiva chave. Quando um valor State muda, apenas os widgets vinculados a esse estado atualizam — sem diffing de DOM virtual, sem re-renderizações de árvore completa, sem passagem de reconciliação. É o caminho mais direto de TypeScript para UI nativa da plataforma que existe.

## Compatibilidade React: Uma Camada Fina sobre perry/ui

Para desenvolvedores vindos do React, `perry-react` fornece uma camada de compatibilidade que mapeia o modelo de componentes do React para os widgets do `perry/ui`. Você pode usar `useState`, `useRef`, `useReducer` e JSX — e o Perry compila tudo para os mesmos widgets nativos por baixo. É uma ponte de conveniência, não um motor de renderização separado.

**counter.tsx**

```tsx
import React, { useState } from 'react';
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h1>{count}</h1>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

Por baixo dos panos, todo elemento JSX mapeia para um widget do `perry/ui`: `<div>` se torna um VStack, `<button>` se torna um Button, `useState` é implementado pelo State reativo do Perry. Está em fase inicial — Fase 1 com re-renderizações de árvore completa e armazenamento global de hooks — mas prova que código React existente pode atingir plataformas nativas através do Perry. Também estamos explorando compatibilidade com Angular e Ionic em linhas semelhantes.

## Três ORMs de Banco de Dados: API Prisma, Performance Nativa

Se você está construindo um servidor ou um app desktop que se comunica com um banco de dados, o Perry agora te cobre com três ORMs compatíveis com Prisma: `perry-prisma` (MySQL), `perry-sqlite` (SQLite) e `perry-postgres` (PostgreSQL). Todos os três são substituições diretas para `@prisma/client`. Mesma API, mesmos padrões de query, mas compilados para código nativo com FFI direta ao banco de dados — sem motor Prisma, sem Node.js.

**database.ts**

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// Same Prisma API — compiled to native SQL via Rust FFI
const users = await prisma.user.findMany({
  where: { email: { contains: "@perry.dev" } },
  orderBy: { createdAt: "desc" },
  take: 10,
});
await prisma.post.create({
  data: { title: "Hello", authorId: users[0].id },
});
```

Por baixo dos panos, cada ORM é um front-end TypeScript apoiado por uma camada FFI Rust usando `sqlx`. O fluxo de query: TypeScript serializa a query para JSON, passa através da fronteira FFI, Rust constrói SQL parametrizado, executa via pool de conexões e serializa o resultado de volta. O schema Prisma é lido em tempo de compilação — zero parsing em runtime.

As três implementações compartilham cerca de 95% do código. As diferenças são as que você esperaria: quoting de identificadores (`` `col` `` vs `"col"`), sintaxe de placeholder ( `?` vs `$1, $2`) e semântica de transações. Todos os três suportam a superfície CRUD completa do Prisma: findMany, findFirst, findUnique, create, createMany, update, updateMany, upsert, delete, deleteMany, count — mais SQL raw, transações e mais de 10 operadores de filtro WHERE.

## perry-push: Notificações Push Universais

`perry-push` é uma biblioteca única que lida com notificações push em todas as plataformas: APNs (iOS/macOS), FCM (Android), Web Push (navegadores) e WNS (Windows). Cada provedor é um módulo FFI Rust com exatamente três funções: `*_provider_new`, `*_provider_close` e `*_send`.

**notify.ts**

```typescript
import { ApnProvider } from 'perry-push/apn';
import { FcmProvider } from 'perry-push/fcm';
const apn = new ApnProvider({ teamId, keyId, key });
const fcm = new FcmProvider({ serviceAccount });
// Unified result type for all providers
const result = await apn.send({
  deviceToken: token,
  title: "New message",
  body: "You have a new reply",
});
```

A criptografia é tratada pelo `ring` — JWTs ES256 para APNs e VAPID, RS256 para contas de serviço FCM, AES-GCM para criptografia de payload Web Push. Tudo compilado para código nativo. Sem `node-gyp`, sem dependência de OpenSSL.

## Perry Hub + Builders: Builds Cloud Distribuídas

Este é o movimento de infraestrutura. `perry-hub` é um servidor de orquestração de builds — ele mesmo compilado de TypeScript pelo Perry — que gerencia um pool de workers de build. Você envia seu projeto, o hub despacha para o worker certo com base na plataforma alvo, e o worker compila, assina e opcionalmente publica seu app.

Dois workers existem hoje: um builder macOS (lida com alvos macOS, iOS e Android) e um builder Linux (lida com Linux e Android). Ambos são binários Rust que se conectam ao hub via WebSocket, baixam tarballs de código-fonte, executam o compilador Perry e fazem upload dos artefatos.

-   **Assinatura de código** — notarização Apple para macOS, perfis de provisioning para iOS, assinatura de keystore Android
-   **Publicação na App Store** — upload direto para App Store Connect e Google Play Store
-   **Gerenciamento de artefatos** — binários compilados enviados ao hub com limpeza baseada em TTL
-   **Gerenciamento de licenças** — limites de taxa por licença, fila com prioridade (tier pro tem prioridade)

O hub em si é um estudo de caso fascinante. É um arquivo TypeScript de aproximadamente 1.500 linhas compilado para um binário nativo de 2 MB pelo Perry. Roda Fastify na porta 3456 para HTTP e `ws` na porta 3457 para WebSocket. Todo o estado é em memória com persistência JSON — sem banco de dados externo. É o tipo de servidor que você pode implantar com `scp` e um arquivo unit systemd.

## perry-verify: Verificação Automatizada de Apps

`perry-verify` é um serviço HTTP independente que recebe um binário compilado e uma configuração, executa um pipeline de verificação e retorna resultados estruturados de pass/fail com capturas de tela. Ele lança o app, executa fluxos de autenticação (determinísticos ou assistidos por IA), verifica o estado e captura evidências.

Adaptadores de plataforma existem para macOS (via APIs de acessibilidade), Linux (AT-SPI) e stubs para iOS Simulator e Android Emulator. A camada de IA usa Claude para autenticação de fallback e verificação de estado quando verificações determinísticas não são possíveis. Foi projetado para se encaixar no pipeline de build do hub como uma etapa pós-build: compilar, assinar, verificar, publicar.

## Pry em Todas as Plataformas

[Pry](/pt/blog/building-pry/), o visualizador JSON nativo que construímos como vitrine do Perry, agora está disponível em cinco plataformas. Está na [Mac App Store](https://apps.apple.com/app/pry-json-viewer/id6759329040) e no [Google Play](https://play.google.com/store/apps/details?id=com.perry.pry), com binários nativos para Linux e Windows. Mesmo codebase TypeScript, cinco pontos de entrada específicos por plataforma, cinco binários nativos. É a prova mais concreta de que toda essa abordagem funciona de ponta a ponta — do código-fonte TypeScript à listagem na App Store.

## O Que Tudo Isso Significa

Um compilador é interessante. Um ecossistema é útil. Na última semana, Perry passou de "você pode compilar TypeScript para nativo" para "você pode construir um app completo com UI nativa, banco de dados Prisma, notificações push e builds que auto-publicam na App Store."

As peças estão começando a se conectar:

-   **perry/ui** é o caminho mais direto de TypeScript para UI nativa da plataforma — estado reativo, mais de 20 widgets, zero camadas de abstração
-   **perry-prisma/sqlite/postgres** significa que código de banco de dados existente é portado com mudanças mínimas
-   **perry-push** significa notificações push nativas sem bibliotecas por plataforma
-   **perry-hub + builders** significa que você pode ir de `perry publish` à App Store em um passo
-   **perry-verify** significa testes automatizados da saída compilada, não apenas do código-fonte
-   **perry-react** significa que desenvolvedores React podem entrar no Perry usando padrões familiares, tudo mapeando para perry/ui por baixo

Estas não são teóricas. Toda biblioteca listada aqui tem código funcionando, testes e documentação. Várias já são usadas em produção — o próprio site do Perry roda em um servidor Fastify compilado pelo Perry, e o Pry está ativo em duas app stores.

## Próximos Passos

O roadmap imediato:

-   **Expansão do perry/ui** — arrastar e soltar, rótulos de acessibilidade, menus de contexto personalizados, mais primitivas de layout
-   **Integração do perry-verify** — verificação automatizada no pipeline de build
-   **Compatibilidade com frameworks** — melhorando as camadas React, Angular e Ionic como rampas de acesso ao perry/ui
-   **Suporte completo a regex** — motor de regex compatível com ECMAScript compilado para nativo

Acompanhe o progresso no [GitHub](https://github.com/PerryTS/perry), ou confira o [roadmap](/pt/roadmap/) para o panorama completo.
