---
title: "Presentazione di Perry"
excerpt: "Perry compila TypeScript supportato in eseguibili nativi autonomi con il suo runtime e GC collegato, senza richiedere un'installazione esterna di Node.js o Motore JavaScript."
date: 2025-01-15
tags: ["announcement", "compiler", "TypeScript"]
---
Siamo entusiasti di presentare Perry — un compilatore TypeScript nativo scritto in Rust che compila il tuo TypeScript direttamente in eseguibili autonomi. Nessun runtime Node.js, nessun wrapper Electron, nessun compromesso. Solo il tuo codice, compilato in un binario nativo che si avvia istantaneamente e funziona ovunque.

Perry rappresenta un ripensamento fondamentale di ciò che TypeScript può essere. Invece di trattarlo come un superset di JavaScript che deve essere eseguito attraverso un motore JS, Perry tratta TypeScript come un linguaggio di sistema — uno che ha una sintassi che milioni di sviluppatori già conoscono e amano.

## Perché abbiamo creato Perry

TypeScript è diventato la lingua franca dello sviluppo software moderno. È il linguaggio dietro la maggior parte dei frontend web, una quota crescente di backend, e sempre più la scelta per strumenti, scripting e automazione. Ma ha sempre portato con sé una limitazione fondamentale: si compila in JavaScript, e JavaScript richiede un runtime.

Quel runtime — che sia Node.js, Deno o Bun — comporta dei compromessi. Tempi di avvio a freddo misurati in decine o centinaia di millisecondi. Overhead di memoria dal compilatore JIT e dal garbage collector. Distribuzioni binarie che o includono l'intero runtime o richiedono all'utente di installarne uno. E per le applicazioni GUI, l'unica opzione è stata Electron, che include un intero browser Chromium con la tua app.

Ci siamo chiesti: e se TypeScript non dovesse passare attraverso JavaScript? E se potessi compilarlo direttamente in codice macchina nativo, nello stesso modo in cui compili Rust, Go o C++?

## Come funziona Perry

La pipeline di compilazione di Perry ha tre fasi:

1.  **Parsing** — Perry utilizza SWC (il parser TypeScript/JavaScript basato su Rust) per analizzare il tuo sorgente TypeScript in un AST. SWC è lo stesso parser utilizzato da Next.js, ed è estremamente veloce.
2.  **Compilazione guidata dai tipi** — Perry percorre l'AST con informazioni complete sui tipi. A differenza di un motore JS che deve gestire i tipi dinamici a runtime, Perry conosce ogni tipo al momento della compilazione. Questo permette la monomorfizzazione dei generici, il dispatch statico delle chiamate ai metodi e l'ottimizzazione diretta del layout di memoria.
3.  **Generazione del codice** — Perry genera codice macchina nativo usando Cranelift, lo stesso generatore di codice utilizzato da Wasmtime e parti del JIT di Firefox. Cranelift produce codice nativo efficiente per x86\_64 e ARM64.

Il risultato è un eseguibile autonomo — tipicamente 2–5 MB per uno strumento CLI — che si avvia istantaneamente senza tempo di riscaldamento.

```text
$ perry build app.ts
Parsing app.ts...
Compiling (cranelift, arm64)...
Linking...
✓ Built executable: app (2.3 MB)
$ ./app
Hello from native TypeScript!
$ file app
app: Mach-O 64-bit executable arm64
```

## Quali funzionalità TypeScript sono supportate

Perry supporta un sottoinsieme ampio e in crescita di TypeScript. L'obiettivo è la piena compatibilità con il linguaggio come gli sviluppatori lo usano realmente. Oggi, questo include:

-   **Tutti i tipi primitivi** — string, number, boolean, null, undefined, bigint, symbol
-   **Interfacce e alias di tipo** — inclusi tipi union, tipi intersezione e tipi mappati
-   **Generici** — compilati tramite monomorfizzazione, quindi `Array<number>` e `Array<string>` generano percorsi di codice ottimizzati distinti
-   **Classi** — con ereditarietà, campi privati (`#field`), membri statici, getter/setter e decoratori
-   **Async/await e Promise** — compilati in una macchina a stati, simile a come Rust gestisce l'async
-   **Generatori e iteratori** — `function*` e cicli `for...of`
-   **Closure** — con semantica di cattura corretta
-   **Destrutturazione** — array, oggetti, pattern annidati ed elementi rest
-   **Template literal** — inclusi i tagged template
-   **Moduli** — import/export ESM risolti al momento della compilazione

## UI nativa cross-platform

Perry non è limitato a strumenti CLI e applicazioni server-side. Include framework UI nativi per sei piattaforme:

-   **macOS** — AppKit (NSWindow, NSView, NSButton, NSTextField e altro)
-   **iOS** — UIKit (UIViewController, UIView, UIButton, UITableView)
-   **iPadOS** — UIKit (stessa API di iOS, con adattamenti specifici per iPad)
-   **Android**: JNI + visualizzazioni Android (attività, visualizzazione, Button, RecyclerView)
-   **Linux**: GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)
-   **Windows** — Win32 (CreateWindowEx, controlli comuni, GDI)

L'intuizione chiave è che Perry mappa un'API TypeScript comune al toolkit di widget nativi di ciascuna piattaforma al momento della compilazione. Non c'è nessun layer bridge, nessuna web view e nessun motore di rendering personalizzato. La tua app utilizza veri widget della piattaforma, renderizzati dal sistema operativo stesso. Leggi di più nel nostro approfondimento: [UI nativa cross-platform da TypeScript](/it/blog/cross-platform-native-ui/).

## 27+ implementazioni native di pacchetti npm

Una delle sfide pratiche più grandi di un nuovo compilatore è la compatibilità con l'ecosistema. Gli sviluppatori non scrivono solo codice da zero — usano pacchetti. Perry affronta questo problema con implementazioni native di oltre 27 pacchetti npm popolari:

-   **Database** — mysql2, pg, mongodb, better-sqlite3, ioredis
-   **HTTP** — axios, express, ws (WebSocket)
-   **Sicurezza** — bcrypt, jsonwebtoken, crypto
-   **Utilità** — uuid, chalk, dotenv, lodash (parziale), moment
-   **Sistema** — fs-extra, glob, chokidar, commander

Queste non sono sottili wrapper attorno ai moduli Node.js. Sono compilate direttamente nel tuo binario usando librerie di sistema native — libpq per PostgreSQL, OpenSSL per la crittografia, libcurl per HTTP. La superficie API corrisponde a ciò che ti aspetteresti dal pacchetto npm, quindi la migrazione è semplice.

## Layer di compatibilità V8 opzionale

Per i pacchetti npm che non hanno ancora implementazioni native Perry, Perry offre una modalità di embedding V8 opzionale. Quando abilitata, Perry include un runtime V8 e può eseguire pacchetti npm JavaScript standard insieme al tuo TypeScript compilato. Questa è una via d'uscita pragmatica che ti permette di adottare Perry incrementalmente — compila i percorsi critici in codice nativo continuando ad accedere all'intero ecosistema npm per tutto il resto.

## Compilazione incrociata

Perry supporta la compilazione incrociata nativamente. Dalla tua macchina di sviluppo macOS, puoi compilare per Linux (x86\_64 e ARM64) e iOS. Questo significa che puoi costruire la tua pipeline CI/CD su macOS e produrre binari per tutti i tuoi target di deployment senza bisogno di macchine di build dedicate per ciascuna piattaforma.

```
# Build for Linux from macOS
$ perry build app.ts --target linux-x86_64
✓ Built executable: app (3.1 MB)
# Build for iOS from macOS
$ perry build app.ts --target ios-arm64
✓ Built executable: app (4.8 MB)
```

## Prestazioni

I binari compilati con Perry sono veloci. Poiché non c'è riscaldamento JIT, nessun overhead dell'interprete e nessuna pausa del garbage collector, le prestazioni sono prevedibili e costanti fin dalla prima invocazione.

Nei nostri benchmark:

-   **Tempo di avvio** — effettivamente 0 ms (avvio processo nativo)
-   **Dimensione del binario** — 2–5 MB per strumenti CLI tipici (vs 50+ MB per Node.js in bundle)
-   **Uso della memoria** — 5–10x inferiore rispetto ad applicazioni Node.js equivalenti
-   **Throughput** — competitivo con C scritto a mano per carichi di lavoro compute-bound

Puoi vedere i benchmark dal vivo su [demo.perryts.com](https://demo.perryts.com), che confronta gli eseguibili compilati con Perry con Node.js e Bun in tempo reale.

## Stato attuale

Perry è in sviluppo attivo. Il compilatore è stabile con 62 test su 62 superati nella suite di test. Tutti e sei i backend UI sono funzionali. Le funzionalità principali del linguaggio sono solide e in espansione.

Stiamo lavorando attivamente per espandere la libreria di widget UI, migliorare le prestazioni di stringhe e oggetti, completare il supporto completo alle regex e costruire il modulo Stream. A lungo termine, stiamo pianificando target di compilazione WASM, multi-threading, un'estensione VS Code e l'integrazione con il package manager.

Consulta la [roadmap](/it/roadmap/) completa per i dettagli su ciò che è stato rilasciato, ciò che è in corso e ciò che arriverà.

## Inizia subito

Perry è open source. Puoi clonare il repository, compilare dal sorgente e iniziare a compilare TypeScript oggi:

```
$ git clone https://github.com/PerryTS/perry.git
$ cd perry
$ cargo build --release
# Compile your first TypeScript file
$ ./target/release/perry build hello.ts
✓ Built executable: hello (2.1 MB)
$ ./hello
Hello, world!
```

Sfoglia il codice sorgente su [GitHub](https://github.com/PerryTS/perry), dai un'occhiata alla [vetrina](/it/showcase/) per vedere cosa si sta costruendo con Perry, o tuffati direttamente nel codice. Non vediamo l'ora di vedere cosa costruirai.
