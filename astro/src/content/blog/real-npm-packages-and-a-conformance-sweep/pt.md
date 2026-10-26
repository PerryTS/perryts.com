---
title: "Pacotes npm reais agora compilam: axios, zod, express — e uma varredura de conformidade"
excerpt: "As ~270 releases de v0.5.875 a v0.5.1146 não eram sobre um benchmark — eram sobre fazer pacotes npm reais compilarem e rodarem. axios, zod v4, express, fastify e hono agora funcionam; a paridade test262 saltou (String 60→79%, Array 61→72%); o Windows ficou Fluent com Mica; e DatePicker + drag & drop chegaram em toda plataforma."
date: 2026-06-09
tags: ["npm", "test262", "Windows", "widgets", "milestone"]
---
O último post terminou em **v0.5.875** com a história do GC — fechando o gap que o benchmark de aya\_koto expôs. Aquele post era sobre vencer um benchmark. Este é sobre um tipo de trabalho diferente: as cerca de **270 releases entre v0.5.875 e v0.5.1146**, aterrissadas ao longo de cerca de quatro semanas, quase nenhuma delas sendo manchete de benchmark. O tema mudou de “ir rápido num microbenchmark” para **“fazer TypeScript do mundo real e pacotes npm reais de fato compilarem e rodarem.”** Mais uma revisão visual completa do Windows e uma pilha de novos widgets pelo caminho.

Eis o que saiu, agrupado pelo que de fato servia.

## Pacotes npm reais compilam agora

O maior fio único através desta janela é uma varredura para fazer pacotes npm populares compilarem para binários nativos e passarem em testes comportamentais — não apenas “linkar sem erros,” mas rodar e produzir a saída certa. A lista que agora funciona através de `perry.compilePackages` inclui **axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2, e Colyseus**.

Cada um falhava por sua própria razão, e cada fix é sua própria pequena história:

-   **zod v4** crashava com `Cannot read properties of undefined (reading 'onattach')`. Causa raiz (v0.5.1144, [#4698](https://github.com/PerryTS/perry/issues/4698)): `new F()` onde `F` é uma função importada de outro módulo silenciosamente produzia um objeto vazio — o corpo do construtor nunca rodava, então toda checagem estilo `$ZodCheckMinLength` voltava despida de sua propriedade `_zod`.
-   **axios + jose** precisavam de crypto e compressão que Perry ainda não tinha: `zlib.createBrotliDecompress`, `crypto.subtle.wrapKey`/`unwrapKey`, `subtle.generateKey` / `encrypt` / `decrypt` para AES-GCM, e `randomFillSync` (v0.5.972–976).
-   **fastify** estava em deadlock num timeout de polling de um segundo em `wait_for_promise`; o substituímos por uma espera com condvar e fizemos promises rejeitadas aparecerem como `HTTP 500` em vez de travar (v0.5.912).
-   **@hono/node-server** não conseguia ler um body de POST — `c.req.text()` / `.json()` / `.formData()` retornavam vazio em POST/PUT até um fix de registro de pai em v0.5.1142.
-   **chalk, ms, debug, express** todos batiam no mesmo formato: um *valor chamável com propriedades anexadas* (`chalk.red`, `express()` mais `express.Router`). Três variações desse padrão foram corrigidas ao longo de v0.5.935 e da varredura npm ao redor, mais `util.inherits` + um scaffold de prototype de stream para destravar express (v0.5.990).
-   **dayjs**, distribuído como um bundle minificado, exercitava o dispatch de método de prototype JS-clássico (`Class.prototype.m = fn`) que Perry lowereava errado (v0.5.924/932).

Por baixo de tudo isso está a parte que faz pacotes que Perry *não consegue* compilar nativamente ainda rodarem: o **runtime de fallback V8** ficou real nesta janela. Seu ModuleLoader agora lê de um mapa de módulos embutido, então um binário de fallback ainda é **autossuficiente** — sem `node_modules` soltos em runtime (v0.5.994). `createServer` faz ponte para um servidor hyper real (v0.5.999), e os globais Web Fetch `Response` / `Request` / `Headers` existem no caminho de fallback (v0.5.1006). E o **`import()` dinâmico em tempo de compilação** — `await import('./foo.ts')` com string literal resolvido em tempo de build — finalmente aterrissou (v0.5.905, [#100](https://github.com/PerryTS/perry/issues/100)).

## Uma varredura de conformidade test262

O outro fio dominante é a conformidade. Rodamos passes focados contra os radares do subconjunto test262 e movemos o ponteiro nos built-ins em que código real mais se apoia:

```
built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)
```

O salto de String veio de dar a todo método de `String.prototype` dispatch genérico de `this` e corrigir a coerção de índice de `slice`/`substring`. O salto de Array foi `thisArg` nos callbacks de array denso (`forEach`/`map`/`filter`/…), `ToLength` array-like, ordenação de operações da spec, e validação de zero argumentos. Destructuring ganhou destructuring de parâmetros em métodos de classe plain, generator, async-generator, static, e private.

Ao lado dos números de manchete, uma longa cauda de correção aterrissou: `JSON.parse` agora lança um `SyntaxError` real (não um `TypeError`) e rejeita tokens à direita; seu reviver caminha via o algoritmo da spec `InternalizeJSONProperty`; `Object.prototype.toString` branda corretamente para typed arrays, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp; `RegExp.prototype.toString` retorna `/source/flags`; async generators acertaram sua semântica de `yield`\-aguarda-operando. Estes são radares de subconjunto, não a suíte completa — Perry ainda está escalando — mas a escalada deste mês foi íngreme.

## Windows fica Fluent

O Windows ganhou uma revisão visual (a série [#4681](https://github.com/PerryTS/perry/issues/4681)). Janelas de Perry agora optam pela chrome DWM moderna por padrão — **backdrop Mica**, cantos arredondados, e uma barra de título com consciência de tema — e os controles comuns renderizam através do **comctl32 v6** em vez dos defaults da era Windows 95. O window proc agora trata `WM_DPICHANGED`, então uma janela permanece nítida quando você a arrasta entre monitores com escala mista em vez de ficar esticada por bitmap.

Crucialmente, nada disso reintroduziu a antiga regressão [#1542](https://github.com/PerryTS/perry/issues/1542) de “área preta após resize”: a área cliente ainda é pintada opaca, e o blur-through Mica/Acrylic de quadro completo permanece um opt-in explícito via `app.setVibrancy(...)`. Há também um novo scaffold de backend `--target windows-winui` (WinUI 3) para apps que querem o stack totalmente moderno, e um fix pequeno mas real que faz `perry compile main.ts -o main` produzir `main.exe` no Windows para que o PowerShell de fato o lance (v0.5.1146).

## Novos widgets, em toda plataforma

Dois widgets aterrissaram só no último dia, e ambos abrangem toda plataforma de UI que Perry mira:

-   **DatePicker** ([#4772](https://github.com/PerryTS/perry/issues/4772)) — um controle de data compacto, estilo campo: `NSDatePicker` no macOS, `UIDatePicker` (.compact) no iOS/visionOS, `SysDateTimePick32` no Windows, `android.widget.DatePicker` no Android, GTK4 no Linux. Uma superfície TS para todos eles.
-   **Drag & drop** ([#4773](https://github.com/PerryTS/perry/issues/4773)) — qualquer widget pode ser um destino de drop e uma fonte de drag para text/files/URLs, mapeado para `NSDraggingDestination` (AppKit), `UIDropInteraction` (UIKit), e `View.setOnDragListener` (Android).

```
import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});
```

Mais cedo na janela a prateleira de widgets também se preencheu por desktop e mobile — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation, e uma ImageGallery com swipe — cada um respaldado pelo controle nativo real em toda plataforma. O HarmonyOS (ArkTS) ganhou Chart e TreeView (v0.5.893), os dois últimos widgets que precisava para alcançar paridade com os outros.

## GC, internals, e estabilidade

A maioria dessas 270 releases não são manchetes — são correções de bug e internals, e esse é o ponto desta fase. Algumas que vale destacar:

-   **O GC continuou.** O trabalho de free list condicional do post do GC continuou se assentando, e uma classe aguda de bug foi fechada: Promises com ponte nativa agora são **fixadas enquanto em voo num worker tokio** para que o GC não possa varrê-las antes da resolução aterrissar (v0.5.923). Se você rodou um fetch async sob carga e viu uma coleta fantasma, era isto.
-   **O modelo de memória está documentado.** Há agora um mergulho profundo `internals/memory-model.md` — NaN-boxing, o GC geracional, a shadow stack, e write barriers — ligado ao site de docs (v0.5.933).
-   **Uma onda de fixes de estabilidade de codegen** aflorou pela varredura npm: uma arrow `const` em nível de módulo chamada dentro de um passo async retomado não dá mais SIGSEGV (v0.5.953), `try { await rejected } catch { return X }` não trava mais para sempre (v0.5.870), e um punhado de crashes de `js_is_truthy` / range de ponteiro cru que bundles reais disparavam.

## Faxina da Apple

Menor mas real: `perry setup ios --development` agora provisiona para builds de desenvolvimento (v0.5.1023), e o caminho de build/link de bibliotecas cruzadas da Apple foi deduplicado e tornado portável quanto à largura de ponteiro (v0.5.1121/1125) — que é o que destravou a matriz de publicação npm / Homebrew / APT / winget que estava emperrada.

## Onde isso deixa as coisas

A aposta por trás de Perry sempre foi que “TypeScript nativo” só importa se TypeScript *real* rodar — não um subconjunto de brinquedo, os pacotes de verdade que as pessoas dão `npm install`. Este mês foi principalmente esse trabalho: menos um número único para se gabar, mais um empurrão longo e sem glamour para fechar o gap entre “compila” e “funciona.” Os radares de conformidade e os testes de paridade npm são o placar que estamos observando agora, e vamos continuar postando os números — os bons e os ainda imperfeitos.

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues)

— Ralph
