---
title: "Cross-compilazione per Windows, game loop iOS e 100% di parità nei test"
excerpt: "103 commit in una settimana: cross-compilazione per Windows da Linux via lld-link, supporto game loop iOS, crash reporting, una pipeline di build Hub a due stadi e il compilatore self-hosted raggiunge 68/68 di parità deterministica nei test."
date: 2026-03-20
tags: ["compiler", "cross-compilation", "infrastructure", "milestone"]
---
103 commit al compilatore Perry questa settimana. Le funzionalità principali: ora è possibile eseguire la cross-compilazione di eseguibili Windows da Linux, le app iOS possono eseguire game loop bloccanti, il compilatore segnala i crash per la telemetria e il compilatore self-hosting supera tutti i test deterministici che gli sottoponiamo. In più un importante aggiornamento dell'infrastruttura Hub e oltre 50 correzioni di bug.

## Cross-Compilazione verso Windows da Linux

Perry ora può produrre binari Windows `.exe` da un host Linux. Questo è il pezzo mancante per le pipeline CI/CD che devono puntare a Windows senza eseguire una macchina di build Windows per l'intera compilazione.

L'implementazione sostituisce i controlli `#[cfg]` in fase di compilazione con il rilevamento del target a runtime. Quando il compilatore rileva un target Windows su un host non-Windows, localizza `lld-link`, `llvm-nm` e `llvm-ar` dalla toolchain Rust o dal PATH tramite un nuovo helper `find_llvm_tool()`. Le librerie di sistema Windows provengono da un sysroot in stile [xwin](https://github.com/Jake-Shadle/xwin) indicato da `PERRY_WINDOWS_SYSROOT`.

Il linker utilizza automaticamente `/FORCE:UNRESOLVED` e genera stub per i simboli UI mancanti, così le app CLI si cross-compilano senza problemi. L'output predefinito è `.exe` quando si punta a Windows. I dettagli completi sono nella [documentazione sulla cross-compilazione](https://docs.perryts.com).

terminal — Linux host

$ perry compile main.ts --target windows

Compiling main.ts for windows-x86\_64...

Using lld-link from Rust toolchain

✓ Compiled executable: main.exe (2.8 MB)

## Supporto Game Loop per iOS

iOS richiede che UIKit possieda il thread principale. Questo va bene per le app guidate da eventi, ma è un problema per i giochi che necessitano di un loop bloccante `while (!shouldClose)`. Perry ora risolve questo problema con il flag `--features ios-game-loop`.

Quando abilitato, il compilatore emette `_perry_user_main` invece di `main`. Il runtime fornisce una `main()` che chiama `UIApplicationMain` sul thread principale e avvia il tuo codice su un thread in background. Scene delegate e app delegate gestiscono l'intero ciclo di vita UIKit mentre il tuo game loop funziona senza blocchi.

main.ts

// Your game loop runs on a background thread

while (!shouldClose) {

update();

render();

awaitNextFrame();

}

terminal

$ perry run ios --features ios-game-loop

Questo abilita un'intera categoria di app — giochi, simulazioni, visualizzazioni in tempo reale — che non erano praticabili su iOS prima. I percorsi di pump e callback iOS sono ora anche avvolti nella gestione dei panic, così i crash sia nel game loop che nel ciclo di vita UIKit vengono catturati in modo pulito.

## Segnalazione Crash

Le app compilate con Perry ora installano un hook per i panic e gestori di segnale per `SIGSEGV`, `SIGBUS` e `SIGABRT` all'avvio. Quando si verifica un crash fatale, i dettagli vengono scritti in `~/.hone/crash.log` per il sistema di telemetria Chirp. I panic catturati (in `catch_callback_panic`) cancellano il log, così vengono segnalati solo i crash genuinamente irrecuperabili.

Questa è una funzionalità di prontezza per la produzione. Quando qualcosa va storto sul campo, ne saremo al corrente — e il log dei crash include abbastanza contesto per diagnosticare il problema senza richiedere agli utenti di segnalare nulla manualmente.

## Hub: Pipeline di Build Windows a Due Fasi

L'infrastruttura di build Perry Hub ha ricevuto un significativo aggiornamento architetturale. In precedenza, la build per Windows richiedeva un worker Windows per l'intera compilazione. Ora la pipeline si divide in due fasi:

1.  Un worker Linux cross-compila l'artefatto Windows utilizzando il nuovo supporto lld-link
2.  L'Hub mantiene l'artefatto pre-compilato e rimette in coda il job per un worker Windows
3.  Il worker Windows gestisce solo la firma e il packaging — un compito molto più leggero

Quando un worker invia `complete` con `needs_finishing: "windows"`, l'Hub rimette trasparentemente in coda il job. La CLI vede un'esperienza di build unica e senza interruzioni.

L'Hub ora avvia anche automaticamente le VM Azure Windows quando nessun worker Windows è connesso, e i worker di build si aggiornano automaticamente all'ultima versione di Perry nelle nuove release. Meno gestione manuale dell'infrastruttura, build più veloci.

## Revisione della Documentazione

Due importanti riscritture della documentazione sono state pubblicate questa settimana su [docs.perryts.com](https://docs.perryts.com):

-   **Riferimento perry.toml** — documentazione completa delle sezioni che copre ogni opzione di configurazione, risoluzione del bundle ID, risoluzione del file di ingresso, auto-incremento del numero di build ed esempi CI/CD
-   **Riferimento Geisterhand** — documentazione completa delle API, configurazione della piattaforma, pattern di automazione dei test e panoramica dell'architettura per il framework di test UI cross-platform

Non si tratta di aggiornamenti incrementali. Entrambe sono riscritture complete che coprono ogni funzionalità e opzione di configurazione. Se stai configurando un nuovo progetto o scrivendo test, inizia da qui.

## API Menu Cross-Platform

`menuClear` e `menuAddStandardAction` erano precedentemente solo per macOS. Ora funzionano su tutte e 6 le piattaforme native. Questo include anche una correzione per un panic di re-entrancy `RefCell` in `dispatch_menu_item` su Windows.

### Android: Allineamento Pagine a 16 KB

Google Play ora richiede l'allineamento delle pagine a 16 KB per le librerie native. Perry imposta automaticamente i `CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS` appropriati, e i file `.so` companion vengono copiati accanto all'output per l'inclusione in APK/AAB.

## Perry React: Tavola Kanban

Il livello di compatibilità React ha avuto un test reale: una tavola Kanban completa a 5 colonne con operazioni di spostamento, aggiunta, eliminazione e visualizzazione. Costruirla ha scoperto e corretto il rendering dei children array annidati in JSX — il gestore ricorsivo `_appendChildren` ora appiattisce correttamente gli array restituiti dalle chiamate `.map()`. C'è anche una nuova demo Kitchen Sink WorkBench a 14 sezioni che copre vari pattern UI.

## Anvil: 100% Parità Test Deterministici

`perrysdad` — il compilatore LLVM self-hosting scritto in TypeScript e compilato da Perry — ora supera **68 su 68** test deterministici, corrispondendo esattamente all'output del compilatore principale. Le uniche differenze sono intrinseche (timestamp, `Math.random()`), e 11 test vengono saltati perché richiedono UI, timer, crypto o funzionalità specifiche della piattaforma non ancora implementate.

Lavoro chiave che ha portato a questo risultato:

-   **Dispatch dei metodi di interfaccia** — le variabili tipizzate come interfaccia ora restituiscono i metodi corretti tramite dispatch basato su class\_id in ObjectHeader
-   **Accesso dinamico alle proprietà** — dispatch a runtime per i nomi di proprietà calcolati
-   **Closure e this-binding** — semantica di cattura corretta per i metodi degli oggetti
-   **Fase 6 in corso** — async/await, generatori e correzioni delle condizioni

Il 100% di parità sui test deterministici è una pietra miliare significativa. Significa che il binario `anvil` auto-compilato produce esattamente lo stesso output del compilatore principale per ogni scenario testabile. Il divario si sta riducendo verso il self-hosting completo.

## Oltre 50 Correzioni di Bug

Un importante push sulla correttezza questa settimana. Punti salienti:

-   **JSON.parse** — gli array non vengono più troncati a 16 elementi, input non valido gestito correttamente
-   **Uint8Array** — costruttore da variabile array, implementazione di `.set(source, offset)` (era un no-op)
-   **BigInt** — NaN-boxing con `BIGINT_TAG` per chiamate cross-modulo, correzioni del troncamento a 32 bit di keccak256
-   **Optional chaining** — espressioni condizionali annidate, rilevamento toString, NaN-boxing del valore di ritorno
-   **IndexSet** — NaN-boxing delle stringhe corretto per usare `STRING_TAG` invece di `POINTER_TAG`
-   **MySQL** — tipi DATETIME e BLOB, costruttore `Date(string)`
-   **Math.min/max** — gestione degli argomenti spread
-   **Dispatch metodi nativi** — field-scan-and-call per oggetti `POINTER_TAG`

Non si tratta di casi limite. JSON.parse che tronca gli array a 16 elementi bloccherebbe qualsiasi applicazione reale. Uint8Array.set come no-op corromperebbe silenziosamente i dati. Queste sono le correzioni che rendono il compilatore pronto per la produzione, un bug di correttezza alla volta.

## In Numeri

-   **103 commit** al compilatore principale Perry
-   **3 versioni**: v0.2.195, v0.2.196, v0.2.197
-   **1 funzionalità principale**: cross-compilazione Windows da Linux
-   **1 nuova categoria di app**: game loop iOS
-   **68/68** parità test deterministici in perrysdad
-   **Oltre 50 correzioni di bug** su NaN-boxing, stdlib e FFI nativo
-   **2 riscritture della documentazione**: perry.toml e Geisterhand
-   **5 miglioramenti Hub**: pipeline a due fasi, avvio automatico Azure, aggiornamento automatico worker

## Prossimi Passi

La cross-compilazione Windows apre la porta al CI/CD multi-piattaforma completamente automatizzato — fai push del TypeScript, ottieni binari nativi per ogni target senza macchine di build dedicate per ogni sistema operativo. Il supporto game loop sblocca un'intera nuova categoria di app iOS. E il 100% di parità test deterministici in perrysdad significa che il self-hosting sta diventando molto reale. Cosa resta:

-   **Supporto regex completo** — l'ultima grande lacuna del linguaggio
-   **Espansione perry/ui** — drag and drop, etichette di accessibilità, DatePicker
-   **perrysdad Fase 6** — async/await, generatori, espansione verso la parità completa con Perry
-   **Beta pubblica Hub** — apertura delle build distribuite agli utenti esterni

Segui i progressi su [GitHub](https://github.com/PerryTS/perry), leggi la documentazione su [docs.perryts.com](https://docs.perryts.com), o consulta la [roadmap](/it/roadmap/) per il quadro completo.
