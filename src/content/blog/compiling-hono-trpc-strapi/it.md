---
title: "Compilare Hono, tRPC e Strapi in binari nativi"
excerpt: "Perry ora compila tre importanti framework TypeScript — Hono, tRPC e Strapi — in eseguibili ARM64 nativi. Si compilano in meno di un secondo, producono binari sotto i 2 MB e funzionano senza crash."
date: 2026-02-25
tags: ["compiler", "frameworks", "progress"]
---
Perry ora compila tre importanti framework TypeScript — Hono, tRPC e Strapi — in eseguibili nativi ARM64. Compilano in meno di un secondo, producono binari sotto i 2 MB e funzionano senza crash.

Questo articolo illustra cosa funziona, cosa non funziona ancora e cosa abbiamo imparato spingendo il compilatore contro codice del mondo reale.

## I progetti

Abbiamo scelto questi tre perché rappresentano diverse forme di TypeScript:

-   **Hono** — Un framework web leggero (29 moduli). Uso intensivo di generici, ereditarietà di classi, assegnazione dinamica di metodi e le Web API `Request`/`Response`. La sua struttura di esportazione usa re-export nominati attraverso barrel file.
-   **tRPC** — Un framework RPC type-safe (52 moduli). Catene di re-export profonde su 4+ livelli, pattern builder con restringimento di tipi generici, istanziazione di classi a livello di modulo e streaming via Web Streams.
-   **Strapi** — Un CMS headless core (4 moduli compilati nativamente, il resto risolto come esterno). Monorepo con risoluzione di pacchetti workspace, re-export di namespace (`export * as X`), pattern service container con `Map` e funzioni factory.

## Risultati della compilazione

Tutti e tre compilano in binari nativi con zero errori di compilazione:

| Progetto | Moduli compilati | Dimensione binario | Tempo di compilazione |
| --- | --- | --- | --- |
| Hono | 29 | 1.6 MB | 0.59s |
| tRPC | 52 | 1.8 MB | 0.97s |
| Strapi | 4 | 1.9 MB | 0.80s |

Ogni modulo sorgente passa attraverso l'intera pipeline: parse SWC, lowering HIR, codegen Cranelift, emissione file oggetto e linking nativo. I tempi di compilazione includono tutto — dal parsing al link finale.

Per contesto, `tsc --noEmit` su tRPC da solo richiede diversi secondi. Perry compila 52 moduli in un binario nativo linkato in meno di uno.

## Cosa funziona a runtime

### Istanziazione di classi cross-modulo

Questa è stata la grande pietra miliare. La struttura di esportazione di Hono è così:

**hono**

```
// hono/src/hono.ts
export class Hono extends HonoBase { ... }
// hono/src/index.ts
import { Hono } from './hono'
export { Hono }
```

Quel `export { Hono }` è un re-export nominato — non `export * from` o `export { Hono } from './hono'`. Nell'HIR di Perry, questo diventa `Export::Named`, non `Export::ReExport` o `Export::ExportAll`. In precedenza, la propagazione delle classi del compilatore seguiva solo le catene `ExportAll` e `ReExport`, quindi importare `Hono` da `index.ts` falliva silenziosamente — il lookup della classe mancava, e `new Hono()` restituiva `undefined`.

Ora Perry traccia `Export::Named` all'indietro attraverso gli import del modulo per trovare la definizione originale della classe e la propaga. Il risultato:

```
$ ./perry compile test_hono.ts -o /tmp/test-hono && /tmp/test-hono
[1] Class instantiation through named re-export chain
PASS: new Hono() returned a real object
[2] Constructor-initialized fields
PASS: app.router initialized by constructor
PASS: app.router.name = SmartRouter
[5] Multiple instances
PASS: second instance created with router
[6] Constructor with options
PASS: new Hono({ strict: false }) accepted options
```

Il costruttore Hono viene eseguito, inizializza uno `SmartRouter` (che internamente crea sia un `RegExpRouter` che un `TrieRouter`), e restituisce un oggetto reale. Funzionano istanze multiple indipendenti. Le opzioni del costruttore sono accettate.

### Risoluzione di re-export multi-livello

L'`initTRPC` di tRPC si trova a 4 livelli di profondità:

```
initTRPC.ts                          (export const initTRPC = ...)
-> unstable-core-do-not-import.ts  (export * from './initTRPC')
-> @trpc/server/index.ts           (export { initTRPC } from '../../..')
-> index.ts                        (export * from './@trpc/server')
```

Quello è `ExportAll` → `Named` → `ExportAll`. Perry risolve l'intera catena — `initTRPC` è accessibile nel binario compilato. Lo stesso per `TRPCError`, che segue lo stesso percorso.

### Istanziazione di classi cross-modulo con argomenti

```
const err = new TRPCError({ code: 'NOT_FOUND', message: 'resource missing' })
// PASS: new TRPCError() returned object
// PASS: err.code = NOT_FOUND
```

`TRPCError` è definito in un modulo, ri-esportato attraverso tre barrel file intermedi, importato nel test e istanziato con un oggetto opzioni. Il campo `code` dell'istanza è accessibile.

### Risoluzione dei pacchetti nei monorepo

Strapi utilizza pacchetti workspace — `@strapi/core` è un pacchetto fratello nel monorepo, non una dipendenza npm. Perry risolve lo specificatore bare attraverso i campi exports di `package.json`:

```
"exports": {
".": { "source": "./src/index.ts", "import": "./dist/index.mjs" }
}
```

La funzione `createStrapi` si risolve correttamente come funzione richiamabile attraverso `export * from '@strapi/core'`.

### Filtraggio export solo tipo

La sintassi `export type { Foo }` di TypeScript non ha significato a runtime — ma in precedenza Perry le trasformava in vere voci `Export::ReExport` che si propagavano attraverso il linker e generavano simboli stub. Il file `index.ts` di Hono da solo ha quattro dichiarazioni `export type` che coprono decine di tipi.

Perry ora controlla il flag `type_only` di SWC sulle dichiarazioni `ExportNamed` e `is_type_only` sui singoli specificatori, saltandoli durante il lowering HIR. Questo ha eliminato la generazione di stub morti dai re-export di tipo in tutti e tre i progetti.

### Costruttore RegExp

`new RegExp(pattern, flags)` ora compila nella funzione runtime `js_regexp_new` esistente di Perry. Questo è stato semplice — il runtime supportava già RegExp — ma il gestore codegen `Expr::New` non aveva un caso per esso, quindi ogni `new RegExp(...)` finiva in un avviso "Unknown class". Il `RegExpRouter` di Hono lo usa estensivamente.

## Cosa non funziona ancora

Siamo specifici qui perché le lacune dicono tanto quanto i successi.

### Assegnazione dinamica di proprietà su `this`

Il costruttore di Hono configura i gestori di metodi HTTP dinamicamente:

```
const allMethods = ['get', 'post', 'put', 'delete', ...]
allMethods.forEach((method) => {
this[method] = (args1, ...args) => {
// register route
return this
}
})
```

Questo significa che `app.get`, `app.post`, ecc. non sono dichiarati staticamente — sono assegnati a runtime tramite nomi di proprietà calcolati. Perry non supporta ancora `this[variable] = value`, quindi questi metodi mancano:

```
[4] Dynamic method assignment (this[method] = ...)
INFO: app.get not available
INFO: app.on not available
```

Questa è la singola lacuna più grande per Hono. La classe Hono esiste, il suo router è inizializzato, ma non è possibile registrare route.

### Chiamate al costruttore a livello di modulo

tRPC definisce il suo punto di ingresso come:

```
export const initTRPC = new TRPCBuilder()
```

A runtime, `initTRPC` appare come `typeof function` piuttosto che `typeof object` — l'espressione `new TRPCBuilder()` a livello di modulo non esegue il costruttore, quindi si ottiene un riferimento alla classe piuttosto che un'istanza. Questo significa che `initTRPC.create()` e `initTRPC.context()` sono entrambi `undefined`.

### Proprietà ereditate

`TRPCError extends Error`, e mentre `err.code` (definito direttamente su `TRPCError`) funziona, `err.message` (ereditato da `Error`) non è accessibile. La catena di prototipi per il lookup delle proprietà non è completamente implementata.

### Catene di costruttori complesse

La funzione `createStrapi()` di Strapi internamente chiama `new Strapi(opts)`, che estende `Container` (supportato da `Map`), chiama `loadConfiguration()`, itera sui provider e registra servizi. Questa catena profonda di costruttori produce un valore falsy — non crasha, ma non produce nemmeno un'istanza utilizzabile.

### Classi built-in Web API

Questi sono gli avvisi "Unknown class" rimanenti nei tre progetti:

| Classe | Conteggio |
| --- | --- |
| Risposta| 11 |
| TransformStream| 7 |
| LeggibileStream| 5 |
| Request | 4 |
| Headers | 3 |
| Proxy | 2 |
| TextEncoderStream| 2 |
| Flusso scrivibile| 1 |
| DOMException| 1 |

`Response`, `Request`e `Headers` sono quelli critici per qualsiasi framework HTTP. Questi necessitano di supporto codegen built-in simile a quello già esistente per `Map`, `Set`, `RegExp`, `Buffer`, `AbortController` e altri.

## Cosa ci dice questo

La buona notizia: la pipeline di compilazione di Perry gestisce codice di framework reale. Progetti multi-file con catene di re-export complesse, firme di tipo pesantemente generiche, gerarchie di classi e risoluzione di pacchetti monorepo arrivano tutti fino ai binari linkati.

Le lacune sono lacune a runtime, non lacune di compilazione. Il lavoro rimanente è:

1.  **Assegnazione dinamica di proprietà** — necessaria per i framework che configurano metodi programmaticamente
2.  **Espressioni init a livello di modulo** — `export const x = new Foo()` deve effettivamente eseguire il costruttore
3.  **Catena di prototipi** — proprietà e metodi ereditati
4.  **Built-in Web API** — `Response`, `Request`, `Headers` per framework HTTP

Questi sono problemi concreti e ben delimitati. Nessuno di essi richiede cambiamenti architetturali — sono estensioni di pattern che già funzionano per casi più semplici.

Continueremo a lavorarci. L'obiettivo è che `new Hono().get('/', (c) => c.text('hello'))` produca un server HTTP funzionante in un binario nativo.
