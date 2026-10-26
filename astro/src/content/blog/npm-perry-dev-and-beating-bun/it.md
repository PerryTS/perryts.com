---
title: "Distribuzione npm, perry dev e vincere ogni benchmark"
excerpt: "Perry v0.5.80 → v0.5.174 in sei giorni. @perryts/perry viene distribuito su npm per tutte e sette le piattaforme supportate. perry dev aggiunge la ricompilazione automatica in watch-mode sopra una cache AST in memoria e una cache degli oggetti per-modulo su disco. json_roundtrip chiude la sua ultima lacuna — Perry ora vince ogni benchmark contro Node.js e Bun."
date: 2026-04-23
tags: ["npm", "developer-experience", "performance", "watch-mode", "milestone"]
---
L'ultimo articolo si chiudeva con Perry alla v0.5.80 e una sola sconfitta ostinata nella tabella dei benchmark: il roundtrip `JSON.parse`/`stringify` era ancora 1,6x più lento di Node. Sei giorni dopo Perry è alla **v0.5.174** — si tratta di **94 patch release** — e tre cose sono cambiate e vale la pena sottolinearle prima di ogni altra:

-   `@perryts/perry` viene distribuito su **npm**. Un solo comando installa Perry su ogni piattaforma supportata.
-   **`perry dev`** aggiunge la ricompilazione automatica in watch-mode, sopra una nuova cache AST in memoria e una cache degli oggetti per-modulo su disco.
-   La sconfitta su `json_roundtrip` è stata chiusa. Perry ora **batte Node e Bun su ogni benchmark** nella suite principale (15/15 contro entrambi).

Il resto dell'articolo è il contorno: correzioni WebAssembly, watchOS che finalmente compila end-to-end, le primitive di `perry/thread` cablate fino in fondo, e un lotto di vittorie di strictness a tempo di compilazione che trasformano i drop silenziosi in errori veri.

## 1\. `@perryts/perry` su npm

Perry è sempre stato installabile via Homebrew su macOS e APT su Debian/Ubuntu. Buona copertura per gli sviluppatori su quelle piattaforme, niente di niente per gli utenti Windows a meno che non compilassero dai sorgenti, e nulla di uniforme per un team che mescola Mac, Linux e Windows. La v0.5.107 ha fatto sparire quel problema.

```
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp
```

Il pacchetto è un launcher sottile che dipende da sette pacchetti opzionali per piattaforma — macOS arm64/x64, Linux x64/arm64 sia su glibc che musl, Windows x64 — e npm installa solo quello che corrisponde alla tua macchina. La dimensione del binario per piattaforma è nell'ordine dei pochi megabyte. L'installazione stessa dura pochi secondi. C'è anche un percorso di installazione globale (`npm install -g @perryts/perry`) se lo preferisci, ma l'installazione locale al progetto fissa la versione del compilatore accanto alle tue dipendenze, che è il default giusto.

La pubblicazione è passata per OIDC Trusted Publisher, quindi ogni release ha una provenance ed è legata al job CI che l'ha costruita. È stata una giornata di lavoro sulla CI a sé stante — diversi commit CI su `v0.5.107` a inseguire la giusta combinazione di `--provenance` / versione npm / percorso del workflow — ma è andata in porto, e ogni release successiva è stata pulita. Gli utenti Windows sono ora cittadini di prima classe, e l'attrito fra team di “installalo come piace al tuo OS” è sparito.

## 2\. `perry dev` — watch mode

La v0.5.143 ha aggiunto un nuovo sottocomando della CLI:

```
perry dev
```

Tutto qui. Osserva il tuo progetto, ricompila al salvataggio e rilancia il tuo binario. L'ispirazione è Vite e `nodemon`; il punto è smettere di fingere che un workflow da compilatore-a-binario debba sembrare più lento di un runtime. Per la maggior parte dei progetti `perry dev` ricompila in meno di un secondo su cache calda.

Il pezzo della “cache calda” conta. Due nuove cache sono atterrate insieme a `perry dev`:

-   **Cache AST in memoria** (v0.5.156). Attraverso le ricompilazioni in una singola sessione di `perry dev`, Perry mantiene l'AST parsato per ogni modulo che non è cambiato su disco. Modificare un file ri-parsa un file, non l'intero grafo dei moduli.
-   **Cache degli oggetti per-modulo su disco (V2.2)**. Ogni modulo compila al proprio file `.o` e viene hashato; i moduli invariati saltano del tutto il codegen e il linker raccoglie l'oggetto dalla cache. L'output verbose della cache segue la spec in [#131](https://github.com/PerryTS/perry/issues/131), e un giro di rafforzamento dell'audit nella v0.5.160 ha chiuso i casi limite in cui entry di cache obsolete potevano sopravvivere a un cambio di header.

Le due cache si sommano. La prima modifica della sessione è una compilazione completa; tutto ciò che segue fa solo lavoro proporzionale a ciò che hai effettivamente cambiato. È il più grande cambiamento di DX della settimana, da solo.

## 3\. Battere Bun su ogni benchmark

Alla v0.5.166 il README aveva un unico caveat onesto: Perry era 1,6x più lento di Node su `json_roundtrip` (50× `JSON.parse` + `JSON.stringify` su un blob da 1MB con 10K elementi), e 2,4x più lento di Bun. L'issue [#149](https://github.com/PerryTS/perry/issues/149) tracciava il follow-up. Alla v0.5.173 — sette giorni dopo — quel divario si è chiuso.

| Workload | Perry v0.5.173 | Node v25 | Bun 1.3 |
| --- | --- | --- | --- |
| `json_roundtrip` | 314ms | 377ms | 250ms |
| `closure` | 10ms | 309ms | 51ms |
| `factorial` | 31ms | 596ms | 98ms |
| `fibonacci(40)` | 320ms | 1033ms | 521ms |
| `mandelbrot` | 23ms | 25ms | 30ms |

Perry ora vince su ogni workload nella suite principale di benchmark — **15/15 contro Node, 15/15 contro Bun**, best of 5 su macOS ARM64. Bun 1.3 è ancora avanti sull'RSS di picco (84MB contro i 310MB di Perry su `json_roundtrip`), quindi la pressione sull'allocatore è la prossima cosa da chiudere, ma la latenza pura è di Perry.

La chiusura del divario JSON non è stata un singolo cambiamento — è stata l'accumulo del lavoro di parità sul layout degli oggetti che ha attraversato la settimana: Fase 1 di inferenza dello shape per i literal di oggetto (v0.5.167), Fase 4 di inferenza del tipo di ritorno basata sul corpo per funzioni libere, metodi di classe, getter e arrow (v0.5.169), e Fase 4.1 di inferenza del tipo di ritorno per le chiamate a metodo (v0.5.170). Il tema è lo stesso dell'articolo precedente: dai a LLVM abbastanza struttura statica da vederci attraverso, e l'ottimizzatore fa il resto.

La v0.5.164 ha anche ripristinato l'autovettorizzazione con accumulatore parallelo `<2 x double>` sui cicli di riduzione a sola fadd, che ad un certo punto nell'intervallo v0.5.9x→v0.5.16x era silenziosamente regredita. È questo che riporta `math_intensive` e `accumulate` al loro vecchio vantaggio 3-4x su Rust/C++/Go/Swift — stesso LLVM, un solo flag `reassoc contract`, un solo corpo di ciclo vettorizzato.

## 4\. `perry/ui` e doc-test

Quattro lacune residue di perry/ui si sono chiuse nella v0.5.151. Insieme a questo, la v0.5.119 ha capovolto l'uso scorretto silenzioso dell'API perry/ui da “compila e non fa nulla” a un errore di compilazione forte — stessa logica della v0.5.165 applicata ai decorator (vedi sotto). Che l'uso scorretto emerga a tempo di compilazione è sempre meglio che a runtime.

La v0.5.123 ha spedito una **test harness per gli esempi della documentazione** e una widget gallery. Ogni esempio TypeScript nella documentazione viene ora compilato ad ogni run di CI, e la widget gallery confronta gli screenshot con baseline approvate. La v0.5.125 ha esteso questo a una matrice di cross-compilazione: ogni esempio della documentazione viene costruito per iOS, tvOS, Android, WASM e Web oltre che per la piattaforma host, così la deriva delle API fra i target viene colta sulla PR che l'ha introdotta invece che nel ciclo di release che l'ha spedita.

Una piccola vittoria di quality-of-life: `perry check` ora emette `file:riga:colonna` per gli errori di lowering HIR ([#129](https://github.com/PerryTS/perry/issues/129)), il che significa che il jump-to-error dell'editor funziona invece di mostrare un messaggio generico senza una posizione.

## 5\. watchOS compila end-to-end

watchOS è stato spedito come target di compilazione il mese scorso, ma una build end-to-end pulita aveva qualche angolo ruvido. Il lavoro di questa settimana su watchOS:

-   **v0.5.113**: `--target watchos` e `--target watchos-simulator` ora compilano end-to-end senza i workaround che si erano accumulati.
-   **v0.5.114**: `--features watchos-game-loop` per le app con superficie Metal.
-   **v0.5.122**: `--features watchos-swift-app` per il rendering ospitato in SwiftUI — quando vuoi che SwiftUI possieda il ciclo di vita dell'app e che Perry componga l'UI al suo interno.
-   **v0.5.135**: `PERRY_UI_TEST_MODE` cablato in perry-ui-ios e perry-ui-tvos, così il testing UI con Geisterhand gira allo stesso modo su quei due target come su macOS e Linux.

## 6\. Primitive di `perry/thread` cablate fino in fondo

La v0.5.174 (oggi) ha chiuso la [#146](https://github.com/PerryTS/perry/issues/146): `parallelMap`, `parallelFilter` e `spawn` sono completamente cablati attraverso il percorso di codegen con l'applicazione della sicurezza a tempo di compilazione. Le catture mutabili vengono rifiutate a tempo di compilazione — la stessa postura di correttezza a tempo di compilazione che ora hanno perry/ui e i decorator. Le primitive thread che erano parzialmente cablate dall'annuncio della v0.4.0 sono ora complete end-to-end.

## 7\. WebAssembly e il target web

Due correzioni WASM da sottolineare:

-   **v0.5.158**: cinque bug che si compensavano in `--target web` (il percorso di output WASM) che si mascheravano a vicenda. Corretti in batch, quindi ora il target web regge sotto l'intera superficie di `perry/ui` ([#133](https://github.com/PerryTS/perry/issues/133)).
-   **v0.5.161**: `break`/`continue` dentro un `if` dentro un loop si impiccava su WASM — un bug di codegen che non si riproduceva sui target nativi. Corretto ([#135](https://github.com/PerryTS/perry/issues/135)).

Anche sul lato correttezza: la v0.5.157 ha corretto `obj.field` che restituiva `NaN` su Android ([#128](https://github.com/PerryTS/perry/issues/128)), e la v0.5.162 ha corretto un bug maledetto di ws dove `sendToClient` e `closeClient` stavano compilando a no-op silenziosi ([#136](https://github.com/PerryTS/perry/issues/136)).

## 8\. Vittorie di strictness a tempo di compilazione

Un tema di questa settimana: tutto ciò che era un fallimento silenzioso è ora un errore di compilazione.

-   **v0.5.165**: i decorator TypeScript venivano parsati in HIR e poi scartati silenziosamente. Ora producono un errore al punto della decorazione con un messaggio chiaro ([#144](https://github.com/PerryTS/perry/issues/144)). Stesso ragionamento warn→bail della v0.5.119 applicato a perry/ui.
-   **v0.5.119**: l'uso scorretto dell'API perry/ui viene rifiutato a tempo di compilazione invece di produrre un binario no-op.
-   **v0.5.172**: `console.trace()` ora emette un vero backtrace nativo su stderr invece di limitarsi a riecheggiare il messaggio ([#20](https://github.com/PerryTS/perry/issues/20)). I frame simbolizzati richiedono `PERRY_DEBUG_SYMBOLS=1`; senza quello ottieni gli indirizzi, che è comunque più del comportamento di message-echo che sostituisce.

## 9\. In chiusura

Il pattern della settimana: **distribuzione** (npm), **developer experience** (`perry dev`, cache incrementali), e **l'ultima sconfitta rimasta sui benchmark chiusa**. Più un lotto di strictness a tempo di compilazione che trasforma i drop silenziosi in errori veri. Sei giorni, 94 patch release, un grande cambiamento di DX.

Provalo:

```
# npm (qualsiasi piattaforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Watch mode per lo sviluppo iterativo
perry dev
```

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
