---
title: "Compilando Hono, tRPC e Strapi para Binários Nativos"
excerpt: "Perry agora compila três grandes frameworks TypeScript — Hono, tRPC e Strapi — para executáveis ARM64 nativos. Compilam em menos de um segundo, produzem binários com menos de 2 MB e rodam sem crashes."
date: 2026-02-25
tags: ["compiler", "frameworks", "progress"]
---
Perry agora compila tres grandes frameworks TypeScript — Hono, tRPC e Strapi — em executaveis nativos ARM64. Compilam em menos de um segundo, produzem binarios abaixo de 2 MB e rodam sem crashes.

Este post cobre o que funciona, o que ainda nao funciona e o que aprendemos ao testar o compilador contra codigo do mundo real.

## Os Projetos

Escolhemos estes tres porque representam diferentes formas de TypeScript:

-   **Hono** — Um framework web leve (29 modulos). Uso intenso de genericos, heranca de classes, atribuicao dinamica de metodos e APIs Web `Request`/`Response`. Sua estrutura de exportacao usa re-exportacoes nomeadas atraves de barrel files.
-   **tRPC** — Um framework RPC type-safe (52 modulos). Cadeias profundas de re-exportacao em 4+ niveis, padrao builder com refinamento de tipos genericos, instanciacao de classes no escopo do modulo e streaming via Web Streams.
-   **Strapi** — Um CMS headless core (4 modulos compilados nativamente, o restante resolvido como externo). Monorepo com resolucao de pacotes workspace, re-exportacoes de namespace (`export * as X`), padrao de container de servico com `Map` e funcoes factory.

## Resultados de Compilacao

Todos os tres compilam para binarios nativos com zero erros de compilacao:

| Projeto | Modulos Compilados | Tamanho do Binario | Tempo de Compilacao |
| --- | --- | --- | --- |
| Hono | 29 | 1.6 MB | 0.59s |
| tRPC | 52 | 1.8 MB | 0.97s |
| Strapi | 4 | 1.9 MB | 0.80s |

Cada modulo fonte passa pelo pipeline completo: analise SWC, reducao HIR, geracao de codigo Cranelift, emissao de arquivo objeto e vinculacao nativa. Os tempos de compilacao incluem tudo — da analise ate o link final.

Para contexto, `tsc --noEmit` no tRPC sozinho leva varios segundos. Perry compila 52 modulos para um binario nativo vinculado em menos de um.

## O Que Funciona em Tempo de Execucao

### Instanciacao de Classes entre Modulos

Este foi o grande marco. A estrutura de exportacao do Hono parece assim:

hono export chain

// hono/src/hono.ts

export class Hono extends HonoBase { ... }

// hono/src/index.ts

import { Hono } from './hono'

export { Hono }

Esse `export { Hono }` e uma re-exportacao nomeada — nao `export * from` ou `export { Hono } from './hono'`. No HIR do Perry, isso se torna `Export::Named`, nao `Export::ReExport` ou `Export::ExportAll`. Anteriormente, a propagacao de classes do compilador so seguia cadeias `ExportAll` e `ReExport`, entao importar `Hono` de `index.ts` falhava silenciosamente — a busca de classe falhava e `new Hono()` retornava `undefined`.

Agora Perry rastrea `Export::Named` de volta atraves das importacoes do modulo para encontrar a definicao original da classe e propaga-la. O resultado:

$ ./perry compile test\_hono.ts -o /tmp/test-hono && /tmp/test-hono

\[1\] Class instantiation through named re-export chain

PASS: new Hono() returned a real object

\[2\] Constructor-initialized fields

PASS: app.router initialized by constructor

PASS: app.router.name = SmartRouter

\[5\] Multiple instances

PASS: second instance created with router

\[6\] Constructor with options

PASS: new Hono({ strict: false }) accepted options

O construtor do Hono executa, inicializa um `SmartRouter` (que internamente cria tanto um `RegExpRouter` quanto um `TrieRouter`), e retorna um objeto real. Multiplas instancias independentes funcionam. Opcoes do construtor sao aceitas.

### Resolucao de Re-exportacao Multi-nivel

O `initTRPC` do tRPC fica 4 niveis de profundidade:

initTRPC.ts (export const initTRPC = ...)

\-> unstable-core-do-not-import.ts (export \* from './initTRPC')

\-> @trpc/server/index.ts (export { initTRPC } from '../../..')

\-> index.ts (export \* from './@trpc/server')

Isso e `ExportAll` → `Named` → `ExportAll`. Perry resolve a cadeia completa — `initTRPC` e acessivel no binario compilado. O mesmo para `TRPCError`, que segue o mesmo caminho.

### Instanciacao de Classes entre Modulos com Argumentos

const err = new TRPCError({ code: 'NOT\_FOUND', message: 'resource missing' })

// PASS: new TRPCError() returned object

// PASS: err.code = NOT\_FOUND

`TRPCError` e definido em um modulo, re-exportado atraves de tres barrel files intermediarios, importado no teste e instanciado com um objeto de opcoes. O campo `code` da instancia e acessivel.

### Resolucao de Pacotes em Monorepos

Strapi usa pacotes workspace — `@strapi/core` e um pacote irmao no monorepo, nao uma dependencia npm. Perry resolve o especificador bare atraves de campos `package.json` exports:

"exports": {

".": { "source": "./src/index.ts", "import": "./dist/index.mjs" }

}

A funcao `createStrapi` resolve corretamente como uma funcao chamavel atraves de `export * from '@strapi/core'`.

### Filtragem de Exportacao Somente de Tipo

A sintaxe `export type { Foo }` do TypeScript nao tem significado em runtime — mas anteriormente Perry as transformava em entradas reais `Export::ReExport` que propagavam pelo linker e geravam simbolos stub. O `index.ts` do Hono sozinho tem quatro declaracoes `export type` cobrindo dezenas de tipos.

Perry agora verifica a flag `type_only` do SWC em declaracoes `ExportNamed` e `is_type_only` em especificadores individuais, pulando-os durante a reducao HIR. Isso eliminou a geracao de stubs mortos de re-exportacoes de tipo em todos os tres projetos.

### Construtor RegExp

`new RegExp(pattern, flags)` agora compila para a funcao de runtime existente `js_regexp_new` do Perry. Isso foi direto — o runtime ja suportava RegExp — mas o handler de codegen `Expr::New` nao tinha um caso para ele, entao todo `new RegExp(...)` passava para um aviso "Unknown class". O `RegExpRouter` do Hono usa isso extensivamente.

## O Que Ainda Nao Funciona

Estamos sendo especificos aqui porque as lacunas dizem tanto quanto as vitorias.

### Atribuicao Dinamica de Propriedade em `this`

O construtor do Hono configura handlers de metodo HTTP dinamicamente:

const allMethods = \['get', 'post', 'put', 'delete', ...\]

allMethods.forEach((method) => {

this\[method\] = (args1, ...args) => {

// register route

return this

}

})

Isso significa que `app.get`, `app.post`, etc. nao sao declarados estaticamente — sao atribuidos em runtime via nomes de propriedade computados. Perry ainda nao suporta `this[variable] = value`, entao esses metodos estao ausentes:

\[4\] Dynamic method assignment (this\[method\] = ...)

INFO: app.get not available

INFO: app.on not available

Esta e a maior lacuna para o Hono. A classe Hono existe, seu roteador e inicializado, mas voce nao pode registrar rotas.

### Chamadas de Construtor no Nivel do Modulo

tRPC define seu ponto de entrada como:

export const initTRPC = new TRPCBuilder()

Em runtime, `initTRPC` aparece como `typeof function` em vez de `typeof object` — a expressao `new TRPCBuilder()` no nivel do modulo nao esta executando o construtor, entao o que voce recebe e uma referencia a classe em vez de uma instancia. Isso significa que `initTRPC.create()` e `initTRPC.context()` sao ambos `undefined`.

### Propriedades Herdadas

`TRPCError extends Error`, e enquanto `err.code` (definido diretamente em `TRPCError`) funciona, `err.message` (herdado de `Error`) nao e acessivel. A cadeia de prototipos para busca de propriedades nao esta totalmente implementada.

### Cadeias de Construtores Complexas

A funcao `createStrapi()` do Strapi internamente chama `new Strapi(opts)`, que estende `Container` (apoiado por `Map`), chama `loadConfiguration()`, itera sobre provedores e registra servicos. Esta cadeia profunda de construtores produz um valor de retorno falsy — nao crasha, mas tambem nao produz uma instancia utilizavel.

### Classes Built-in de Web API

Estes sao os avisos restantes de "Unknown class" nos tres projetos:

| Classe | Contagem |
| --- | --- |
| Response | 11 |
| TransformStream | 7 |
| ReadableStream | 5 |
| Request | 4 |
| Headers | 3 |
| Proxy | 2 |
| TextEncoderStream | 2 |
| WritableStream | 1 |
| DOMException | 1 |

`Response`, `Request`e `Headers` sao os criticos para qualquer framework HTTP. Estes precisam de suporte de codegen built-in similar ao que ja temos para `Map`, `Set`, `RegExp`, `Buffer`, `AbortController` e outros.

## O Que Isso Nos Diz

A boa noticia: o pipeline de compilacao do Perry lida com codigo real de frameworks. Projetos multi-arquivo com cadeias complexas de re-exportacao, assinaturas de tipo pesadas em genericos, hierarquias de classes e resolucao de pacotes monorepo passam todos para binarios vinculados.

As lacunas sao lacunas de runtime, nao lacunas de compilacao. O trabalho restante e:

1.  **Atribuicao dinamica de propriedade** — necessaria para frameworks que configuram metodos programaticamente
2.  **Expressoes de inicializacao no nivel do modulo** — `export const x = new Foo()` precisa realmente executar o construtor
3.  **Cadeia de prototipos** — propriedades e metodos herdados
4.  **Built-ins de Web API** — `Response`, `Request`, `Headers` para frameworks HTTP

Estes sao problemas concretos e bem delimitados. Nenhum deles requer mudancas arquiteturais — sao extensoes de padroes que ja funcionam para casos mais simples.

Continuaremos trabalhando neles. O objetivo e `new Hono().get('/', (c) => c.text('hello'))` produzindo um servidor HTTP funcional em um binario nativo.
