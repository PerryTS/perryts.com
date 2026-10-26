---
title: "I sistemi di plugin sono una tassa sulle prestazioni"
excerpt: "Le architetture a plugin sacrificano le prestazioni per l'estensibilità. Ma se l'estensibilità avvenisse a tempo di compilazione anziché a runtime? La composizione a tempo di compilazione offre entrambe — zero overhead, massima flessibilità."
date: 2026-02-27
tags: ["architecture", "performance", "compiler"]
---
Installi VS Code. È veloce. Aggiungi 15 estensioni. Ora ci mette 4 secondi ad avviarsi e l'Extension Host consuma 800 MB di RAM. Cos'è successo?

Il pattern si ripete ovunque: WordPress, Eclipse, Chrome, Figma, Slack. L'app viene rilasciata veloce. I plugin la rendono lenta. Nessuno è più sorpreso — abbiamo accettato questo come il costo dell'estensibilità.

Ma i sistemi di plugin non sono solo un problema di prestazioni. Sono un problema di filosofia di design. L'industria ha confuso "estensibilità" con "dinamismo a runtime" quando spesso la risposta migliore è la composizione a tempo di compilazione. Gli unici plugin performanti sono quelli che smettono di essere plugin al momento della compilazione.

## Lo spettro prestazionale dell'estensibilità

Non tutta l'estensibilità costa uguale. C'è uno spettro da zero-cost a massimo-cost, e la maggior parte dell'industria si è stabilita all'estremità costosa:

1.  **Linking statico / moduli a tempo di compilazione** — zero overhead. Librerie C, crate Rust, pacchetti Go. Il confine del modulo scompare completamente nel binario finale.
2.  **Librerie condivise caricate all'avvio** — quasi zero. Moduli nginx, moduli del kernel Linux. Costo una tantum al caricamento, poi chiamate a funzione dirette.
3.  **Dispatch dinamico via interfacce / vtable** — piccolo overhead. Plugin per game engine in C++. Un'indirezione di puntatore per chiamata.
4.  **Plugin interpretati nello stesso processo** — moderato. Plugin PHP di WordPress, bundle OSGi di Eclipse. Ogni invocazione di plugin passa attraverso un interprete.
5.  **Plugin in processo separato via IPC** — significativo. Estensioni VS Code, estensioni Chrome. Ogni interazione attraversa un confine di processo e serializza i dati.
6.  **Plugin sandboxed via IPC serializzato** — pesante. Plugin Figma, content script delle estensioni browser. Serializzazione, deserializzazione e applicazione della sandbox a ogni chiamata.

L'intuizione chiave: gli unici plugin performanti sono quelli che smettono di essere plugin al momento della compilazione. I livelli 1 e 2 sono veloci proprio perché il "plugin" diventa indistinguibile dal codice host nell'artefatto finale.

## Il danno nel mondo reale

### WordPress

Ogni plugin si aggancia al ciclo di vita della richiesta. 30 plugin significano 30 livelli di chiamate a funzione per caricamento pagina. Il risultato: i plugin di caching esistono unicamente per mitigare il danno degli altri plugin. Plugin per le prestazioni per risolvere il problema di prestazioni che i plugin hanno creato. La meta-ironia si scrive da sola.

### VS Code

Le estensioni condividono un singolo event loop Node.js in un processo separato. Un'estensione che si comporta male blocca tutte le altre. L'Extension Host appare regolarmente come il principale consumatore di CPU sulle macchine degli sviluppatori. Microsoft ha costruito strumenti di profilazione, comandi bisect e sistemi di eventi di attivazione — un'intera infrastruttura per gestire il problema che le estensioni creano.

### Eclipse

Il monito. Risoluzione dei bundle OSGi, overhead del class loading, enormi grafi di dipendenze. Un tempo l'IDE più popolare, ora largamente abbandonato dagli sviluppatori mainstream. L'architettura a plugin che doveva essere il suo più grande punto di forza è diventata la sua debolezza definente.

### Electron stesso

Il problema dei plugin a livello di piattaforma. Ogni app Electron include un runtime Chromium + Node.js completo. VS Code è Electron. Slack è Electron. Discord è Electron. Ognuno consuma indipendentemente 300–500 MB di RAM per renderizzare quello che è essenzialmente una finestra di chat o un editor di testo. Il "plugin" qui è l'intera piattaforma web, inclusa ex novo per ogni applicazione.

## Perché l'industria continua a scegliere i plugin

Se i plugin sono così costosi, perché tutti continuano a costruirli? Le ragioni sono principalmente organizzative, non tecniche:

-   **Esperienza sviluppatore** — i plugin sono facili da scrivere quando non ti interessa delle prestazioni. Spedisci un file JS, agganci qualche evento, fatto.
-   **Crescita dell'ecosistema** — i plugin creano effetti di rete e coinvolgimento della community. Un marketplace di 30.000 estensioni è un potente vantaggio competitivo.
-   **Convenienza organizzativa** — i plugin permettono ai team di rimandare decisioni di design. "Qualcuno scriverà un plugin per quello" è l'equivalente architetturale di "lo sistemiamo in post-produzione."
-   **Modello di business** — i marketplace di plugin creano ricavi e lock-in. La piattaforma cattura valore dall'ecosistema.

La verità scomoda: i plugin sono spesso un modo per evitare di prendere decisioni architetturali difficili su cosa appartiene al core. Ti permettono di rilasciare qualcosa di incompleto e chiamarlo "estensibile."

## L'alternativa: composizione a tempo di compilazione

E se l'estensibilità avvenisse al momento del build invece che a runtime?

Non è un'ipotesi. Ci sono precedenti ben consolidati nei linguaggi di sistema:

-   **Macro procedurali Rust** — codice arbitrario che viene eseguito al momento della compilazione e genera codice nativo a zero overhead. Serializzazione Serde, setup del runtime async Tokio, routing Axum — tutto risolto prima che il tuo programma parta.
-   **Zig comptime** — esecuzione a tempo di compilazione che elimina tutto il branching a runtime. Le strutture dati generiche sono monomorfizzate, la configurazione è risolta, il codice morto è eliminato. Ciò che rimane è esattamente ciò che viene eseguito.
-   **Template C++ / constexpr** — polimorfismo a tempo di compilazione con zero costo a runtime. La STL raggiunge prestazioni straordinarie perché ogni algoritmo generico si specializza al momento della compilazione.
-   **Tree-shaking nei bundler** — una versione parziale e imperfetta di questa idea applicata a JavaScript. Webpack e Rollup eliminano gli export non usati al momento del build. Il limite è che possono solo rimuovere codice, non specializzarlo.

Il pattern è consistente: spostare le decisioni dal runtime al momento del build. Ciò che non includi non costa nulla. Ciò che includi compila in codice nativo senza indirezione. Il confine del modulo diventa uno strumento di organizzazione a livello di sorgente, non un confine di prestazioni a runtime.

## Cosa significa per TypeScript

TypeScript è il linguaggio più popolare per costruire strumenti estensibili — e il peggiore per prestazioni a runtime. L'intero ecosistema TypeScript gira su Node.js, che gira su V8, che compila JIT JavaScript. Ogni livello aggiunge overhead: tempo di warmup JIT, pause del garbage collection, dispatch dinamico per ogni accesso a proprietà, confini IPC tra processi.

Qui entra in gioco Perry. Perry compila TypeScript direttamente in binari nativi. Nessun V8, nessun warmup JIT, nessuna pausa del garbage collection, nessun confine IPC.

Quando i tuoi moduli compilano in codice nativo, i "plugin" diventano semplicemente... moduli. Si compongono al momento del build. Il binario finale ha zero overhead da plugin perché non ci sono plugin — solo codice nativo. Un gestore di route Express, una funzione middleware, una libreria di utilità — compilano tutti in chiamate a funzione dirette nello stesso binario. Nessun caricamento dinamico, nessuna serializzazione, nessun confine di processo.

terminal

\# Your app, your dependencies, your "plugins" — one binary

$ perry compile server.ts -o server

Compiling server.ts + 43 modules...

✓ Built executable: server (1.8 MB, 0.7s)

$ ./server

Listening on port 3000

Questo non è teorico. Perry già compila framework TypeScript del mondo reale — Hono, tRPC, Strapi — in binari nativi ARM64 sotto i 2 MB, in meno di un secondo. I moduli che compongono quei framework vengono compilati, linkati e integrati in un singolo eseguibile. Quella che sarebbe un'architettura a plugin con overhead a runtime in Node.js diventa composizione a zero costo in un binario Perry.

## L'estensibilità di cui hai realmente bisogno

L'obiezione è ovvia: "Ma ho bisogno di estensibilità a runtime. Gli utenti devono installare plugin senza ricompilare."

Davvero? Per la maggior parte delle applicazioni, l'insieme delle estensioni è noto al momento del build. Scegli il tuo middleware Express, il driver del database, la libreria di autenticazione, il framework di logging — e poi fai il deploy. L'"estensibilità" è nel tuo `package.json`, risolta al `npm install`, non a runtime.

Le applicazioni che hanno genuinamente bisogno di caricamento di plugin a runtime — VS Code, WordPress, browser — sono l'eccezione, non la regola. E anche quelle pagano un prezzo alto per questo. Per tutto il resto, la composizione a tempo di compilazione offre la stessa flessibilità senza nessun overhead.

La differenza è onestà architetturale. Invece di fingere che ogni applicazione abbia bisogno di un sistema di plugin, chiedi: questa estensibilità deve avvenire a runtime, o il compilatore può fare il lavoro?

## La strada da percorrere

La dipendenza dell'industria dalle architetture a plugin è un sintomo dell'accettare l'overhead a runtime come inevitabile. Non lo è. Il compilatore può fare il lavoro. La composizione a tempo di build ti dà estensibilità senza la tassa.

Stiamo costruendo Perry perché crediamo che gli sviluppatori TypeScript meritino prestazioni native senza rinunciare al linguaggio che amano. I tuoi moduli dovrebbero comporsi al momento del build, compilare in chiamate a funzione dirette ed eseguire senza l'overhead di un runtime che esiste solo per rendere possibile l'"estensibilità".

Il sistema di plugin più veloce è quello che non esiste a runtime.
