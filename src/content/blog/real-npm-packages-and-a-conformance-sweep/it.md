---
title: "Veri pacchetti npm ora compilano: axios, zod, express — e una passata di conformance"
excerpt: "Le circa 270 release da v0.5.875 a v0.5.1146 non riguardavano un singolo benchmark — riguardavano il far compilare e girare veri pacchetti npm. axios, zod v4, express, fastify e hono ora funzionano; la parità test262 è salita (String 60→79%, Array 61→72%); Windows è diventato Fluent con Mica; e DatePicker + drag & drop sono atterrati su ogni piattaforma."
date: 2026-06-09
tags: ["npm", "test262", "Windows", "widgets", "milestone"]
---
Il post precedente si è chiuso a **v0.5.875** con la storia del GC — chiudere il gap che il benchmark di aya\_koto aveva messo in luce. Quel post parlava di vincere un benchmark. Questo parla di un genere di lavoro diverso: le circa **270 release tra v0.5.875 e v0.5.1146**, atterrate nell'arco di circa quattro settimane, quasi nessuna delle quali è un titolo da benchmark. Il tema è passato da “andare veloce su un microbenchmark” a **“far sì che TypeScript del mondo reale e veri pacchetti npm compilino e girino davvero.”** Più un completo rinnovamento visivo di Windows e una pila di nuovi widget lungo la strada.

Ecco cosa è arrivato, raggruppato per ciò a cui serviva davvero.

## I veri pacchetti npm ora compilano

Il singolo filo più grosso attraverso questa finestra è una passata per far compilare i pacchetti npm popolari in binari nativi e farli passare i test comportamentali — non solo “linkare senza errori,” ma girare e produrre l'output giusto. La lista che ora funziona attraverso `perry.compilePackages` include **axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2 e Colyseus**.

Ognuno falliva per la propria ragione, e ogni fix è una sua piccola storia:

-   **zod v4** crashava con `Cannot read properties of undefined (reading 'onattach')`. Causa radice (v0.5.1144, [#4698](https://github.com/PerryTS/perry/issues/4698)): `new F()` dove `F` è una funzione importata da un altro modulo produceva silenziosamente un oggetto vuoto — il corpo del costruttore non girava mai, quindi ogni check in stile `$ZodCheckMinLength` tornava privo della sua proprietà `_zod`.
-   **axios + jose** avevano bisogno di crypto e compressione che Perry non aveva ancora: `zlib.createBrotliDecompress`, `crypto.subtle.wrapKey`/`unwrapKey`, `subtle.generateKey` / `encrypt` / `decrypt` per AES-GCM, e `randomFillSync` (v0.5.972–976).
-   **fastify** andava in deadlock su un timeout di polling di un secondo in `wait_for_promise`; l'abbiamo sostituito con un'attesa su condvar e fatto sì che le promise rifiutate emergessero come `HTTP 500` invece di bloccarsi (v0.5.912).
-   **@hono/node-server** non riusciva a leggere un body POST — `c.req.text()` / `.json()` / `.formData()` tornavano vuoti su POST/PUT fino a un fix di registrazione del parent in v0.5.1142.
-   **chalk, ms, debug, express** hanno colpito tutti la stessa forma: un *valore chiamabile con proprietà attaccate* (`chalk.red`, `express()` più `express.Router`). Tre varianti di quel pattern sono state risolte tra v0.5.935 e la passata npm circostante, più `util.inherits` + uno scaffold di prototype di stream per sbloccare express (v0.5.990).
-   **dayjs**, distribuito come bundle minificato, esercitava il dispatch di metodi prototipali JS-classic (`Class.prototype.m = fn`) che Perry abbassava in modo sbagliato (v0.5.924/932).

Sotto tutto questo sta la parte che fa girare comunque i pacchetti che Perry *non riesce* a compilare nativamente: il **runtime di fallback V8** è diventato reale in questa finestra. Il suo ModuleLoader ora legge da una module map embedded, così un binario di fallback è comunque **autonomo** — niente `node_modules` sparsi a runtime (v0.5.994). `createServer` fa da ponte verso un vero server hyper (v0.5.999), e i global Web Fetch `Response` / `Request` / `Headers` esistono nel percorso di fallback (v0.5.1006). E l'**`import()` dinamico a compile-time** — `await import('./foo.ts')` con string-literal risolto a build time — è finalmente arrivato (v0.5.905, [#100](https://github.com/PerryTS/perry/issues/100)).

## Una passata di conformance su test262

L'altro filo dominante è la conformance. Abbiamo fatto passate mirate contro i radar del sottoinsieme test262 e abbiamo spostato l'ago sui built-in su cui il codice reale si appoggia di più:

```
built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)
```

Il salto di String è venuto dal dare a ogni metodo `String.prototype` un dispatch con `this` generico e dal correggere la coercizione degli indici di `slice`/`substring`. Il salto di Array è stato `thisArg` sui callback degli array densi (`forEach`/`map`/`filter`/…), `ToLength` array-like, ordinamento delle operazioni da spec e validazione a zero argomenti. Il destructuring ha raccolto il destructuring dei parametri su metodi di classe plain, generator, async-generator, statici e privati.

Accanto ai numeri di copertina, è atterrata una lunga coda di correttezza: `JSON.parse` ora lancia un vero `SyntaxError` (non un `TypeError`) e rifiuta i token in coda; il suo reviver cammina via l'algoritmo da spec `InternalizeJSONProperty`; `Object.prototype.toString` marca correttamente i typed array, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp; `RegExp.prototype.toString` ritorna `/source/flags`; gli async generator hanno azzeccato la semantica `yield`\-attende-operando. Questi sono radar di sottoinsiemi, non la suite completa — Perry sta ancora salendo — ma la salita di questo mese è stata ripida.

## Windows diventa Fluent

Windows ha avuto un rinnovamento visivo (la serie [#4681](https://github.com/PerryTS/perry/issues/4681)). Le finestre di Perry ora optano di default per il chrome DWM moderno — **backdrop Mica**, angoli arrotondati e una title bar consapevole del tema — e i common control vengono renderizzati attraverso **comctl32 v6** invece dei default in stile Windows 95. Il window proc ora gestisce `WM_DPICHANGED`, così una finestra resta nitida quando la trascini tra monitor con scaling misto invece di subire uno stretch bitmap.

Soprattutto, niente di tutto questo ha reintrodotto la vecchia regressione [#1542](https://github.com/PerryTS/perry/issues/1542) “area nera dopo il resize”: la client area è ancora dipinta opaca, e il blur-through Mica/Acrylic a frame intero resta un opt-in esplicito via `app.setVibrancy(...)`. C'è anche un nuovo scaffold di backend `--target windows-winui` (WinUI 3) per le app che vogliono lo stack pienamente moderno, e un fix piccolo ma reale che fa sì che `perry compile main.ts -o main` produca `main.exe` su Windows così che PowerShell lo lanci davvero (v0.5.1146).

## Nuovi widget, ogni piattaforma

Due widget sono arrivati proprio nell'ultimo giorno, ed entrambi coprono ogni piattaforma UI che Perry targeta:

-   **DatePicker** ([#4772](https://github.com/PerryTS/perry/issues/4772)) — un controllo di data compatto, in stile campo: `NSDatePicker` su macOS, `UIDatePicker` (.compact) su iOS/visionOS, `SysDateTimePick32` su Windows, `android.widget.DatePicker` su Android, GTK4 su Linux. Un'unica superficie TS attraverso tutti.
-   **Drag & drop** ([#4773](https://github.com/PerryTS/perry/issues/4773)) — qualsiasi widget può essere una destinazione di drop e una sorgente di drag per testo/file/URL, mappato a `NSDraggingDestination` (AppKit), `UIDropInteraction` (UIKit) e `View.setOnDragListener` (Android).

```
import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});
```

Prima, nella finestra, lo scaffale dei widget si è riempito anche su desktop e mobile — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation e una ImageGallery scorribile — ciascuno supportato dal vero controllo nativo su ogni piattaforma. HarmonyOS (ArkTS) ha avuto Chart e TreeView (v0.5.893), gli ultimi due widget che gli servivano per raggiungere la parità con gli altri.

## GC, internals e stabilità

La maggior parte di quelle 270 release non sono titoli — sono bug fix e internals, ed è il punto di questa fase. Alcuni da segnalare:

-   **Il GC è continuato.** Il lavoro sulla free list condizionale dal post sul GC ha continuato a sedimentarsi, e una classe netta di bug è stata chiusa: le Promise native-bridged sono ora **pinnate mentre sono in volo su un worker tokio** così che il GC non possa spazzarle via prima che atterri la risoluzione (v0.5.923). Se hai eseguito un fetch async sotto carico e hai visto una collection fantasma, era questo.
-   **Il modello di memoria è documentato.** C'è ora un approfondimento `internals/memory-model.md` — NaN-boxing, il GC generazionale, lo shadow stack e le write barrier — cablato nel sito dei docs (v0.5.933).
-   **Un'ondata di fix di stabilità del codegen** emersa dalla passata npm: una arrow `const` a livello modulo chiamata dentro uno step async ripreso non fa più SIGSEGV (v0.5.953), `try { await rejected } catch { return X }` non si blocca più per sempre (v0.5.870), e una manciata di crash `js_is_truthy` / raw-pointer-range che i bundle reali innescavano.

## Pulizie su Apple

Più piccolo ma reale: `perry setup ios --development` ora fa il provisioning per le build di sviluppo (v0.5.1023), e il percorso di build/link delle cross-library Apple è stato deduplicato e reso portabile sulla larghezza del puntatore (v0.5.1121/1125) — che è ciò che ha sbloccato la matrice di publish npm / Homebrew / APT / winget che era rimasta incastrata.

## Dove ci lascia tutto questo

La scommessa dietro Perry è sempre stata che “TypeScript nativo” conta solo se gira TypeScript *vero* — non un sottoinsieme giocattolo, i pacchetti veri che la gente fa `npm install`. Questo mese è stato per lo più quel lavoro: meno un singolo numero di cui vantarsi, più una spinta lunga e poco glamour per chiudere il gap tra “compila” e “funziona.” I radar di conformance e i test di parità npm sono il tabellone che stiamo osservando ora, e continueremo a pubblicare i numeri — quelli buoni e quelli ancora imperfetti.

Fonte: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Problemi: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues)

— Ralph
