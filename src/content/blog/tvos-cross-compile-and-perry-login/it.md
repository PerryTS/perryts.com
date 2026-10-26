---
title: "tvOS, cross-compilazione iOS da Linux e Perry Login"
excerpt: "Perry v0.4.24: tvOS come 10° target di compilazione, cross-compilazione iOS e macOS da Linux via ld64.lld, perry login con fatturazione a consumo, rinnovamento dell'UI Windows, notarizzazione macOS e 120 commit in 5 giorni."
date: 2026-03-28
tags: ["tvOS", "cross-compilation", "billing", "Windows", "milestone"]
---
Cinque giorni, 120 commit, e Perry salta da v0.4.0 a v0.4.24. I punti salienti: tvOS diventa il 10° target di compilazione, le app iOS e macOS possono ora essere compilate interamente da Linux, perry login porta la fatturazione basata sull'uso, e l'interfaccia Windows riceve una revisione completa. Ecco tutto ciò che è stato rilasciato.

## tvOS: il 10° target di compilazione

Perry ora compila per Apple TV. Il target tvOS usa lo stesso renderer SwiftUI di watchOS, condividendo l'architettura data-driven dove Perry costruisce un albero UI e un'app host Swift fornita lo renderizza nativamente. Combinato con l'integrazione WASM `@perry/threads` esistente, le app tvOS possono eseguire carichi di lavoro pesanti in background mantenendo l'UI reattiva.

```
# Compile for Apple TV
perry compile main.ts --target tvos

# Run on tvOS simulator
perry run tvos
```

Questo porta il conteggio totale dei target a **10**: macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly e Web/JavaScript. Un codice TypeScript, dieci output nativi.

## Cross-compilazione iOS e macOS da Linux

Perry può ora compilare binari iOS e macOS interamente da una macchina Linux usando `ld64.lld` come linker Mach-O. Questo è il pezzo mancante per un CI/CD completamente automatizzato — invia TypeScript a un server Linux, ottieni binari nativi firmati per ogni piattaforma Apple senza una macchina di build macOS.

Arrivarci ha richiesto la risoluzione di una cascata di problemi del linker:

-   **Triple codegen Mach-O** — aggiunte triple target `aarch64-apple-macos` e `aarch64-apple-ios` per Cranelift
-   **Linking dei framework** — percorsi di ricerca dei framework CoreGraphics, Metal, IOKit, DiskArbitration per la cross-compilazione
-   **`-lobjc`** — simboli runtime ObjC necessari per tutti i target Apple
-   **Versione SDK** — `sdk_version 26.0` in ld64.lld (Apple richiede iOS 18+)
-   **Dead stripping** — `-dead_strip` invece di `-Wl,-dead_strip` per il linker Mach-O
-   **Deduplicazione runtime** — rimozione duplicati `perry_runtime` dalle librerie statiche UI per evitare errori di link

Combinato con la cross-compilazione Linux → Windows esistente (v0.2.195+), Perry può ora cross-compilare verso **ogni piattaforma da Linux** — iOS, macOS, Windows, Android, WASM e Web.

## Prontezza per l'App Store iOS

Un focus importante di questo ciclo è stato rendere le app iOS compilate con Perry completamente conformi all'App Store:

-   **Info.plist completo** — tutte le chiavi richieste da Apple: `CFBundleIdentifier`, `CFBundleName`, `CFBundleShortVersionString`, `CFBundleVersion`, `UIDeviceFamily`, `UIRequiredDeviceCapabilities`
-   **CFBundleIcons** — naming icone iOS standard (`AppIcon60x60@2x`, ecc.) con risoluzione fallback
-   **Versione da perry.toml** — i campi `version` e `build_number` fluiscono direttamente nell'Info.plist
-   **UILaunchScreen** — usa la chiave moderna invece di `UILaunchStoryboardName` (nessun file storyboard necessario)
-   **Profili di provisioning** — supporto profili di provisioning macOS per la distribuzione App Store e TestFlight

## Perry Login e fatturazione

Perry ora ha account e fatturazione basata sull'uso, alimentati da un nuovo comando CLI `perry login` e una dashboard su [app.perryts.com](https://app.perryts.com).

### Come funziona

-   **`perry login`** — flusso GitHub OAuth per dispositivo, apre il browser, esegue polling per il completamento
-   **Piano gratuito** — 15 build/mese, progetti illimitati con un account GitHub
-   **Piano Pro** — build illimitate tramite abbonamento Polar.sh
-   **Token API** — genera e gestisci token dalla dashboard per CI/CD
-   **Tracciamento utilizzo** — contatori mensili di publish e verify con barre di utilizzo in tempo reale

La dashboard stessa è un server Fastify compilato con Perry con un export statico Next.js — costruito con Perry, per servire gli utenti Perry.

## Notarizzazione macOS e firma del codice

Due nuove capacità di firma:

-   **`perry publish macos --notarize`** — passa automaticamente al certificato Developer ID (invece del certificato App Store), invia al servizio di notarizzazione Apple e graffetta il risultato
-   **Firma codice GCloud KMS** — le build Windows possono ora essere firmate usando chiavi Google Cloud KMS, abilitando la firma automatizzata nel CI senza esporre chiavi private

## Revisione UI Windows

Il backend UI Windows ha ricevuto il suo aggiornamento più completo:

-   **Scaling DPI-aware** — dimensioni finestra, font e dimensioni widget scalano correttamente su display ad alta densità
-   **API finestre stile launcher** — finestre senza bordi con posizionamento personalizzato per UI stile launcher/spotlight
-   **Hotkey globali** — scorciatoie da tastiera a livello di sistema che funzionano anche quando l'app non è in focus
-   **Icone app** — API `getAppIcon` per visualizzare icone di applicazioni nelle UI launcher
-   **Layout sicuro contro la rientranza** — painting basato su `RefCell` sostituito con storage HWND `SetPropW` per prevenire panic durante messaggi WM\_PAINT annidati
-   **Integrazione Geisterhand** — tutti i tipi di widget registrati con il framework di test UI, `/type` usa `SendMessageW` tramite mappa HWND
-   **Supporto camera Android** — API di cattura camera estesa ad Android via JNI

## Prestazioni

v0.4.14 ha rilasciato un audit completo delle prestazioni:

-   **`fcmp` nativo** — i confronti floating-point usano istruzioni CPU native invece di chiamate a funzioni runtime. Benchmark Mandelbrot **30% più veloce**.
-   **Append stringa in-place** — `str += "text"` modifica il buffer in-place invece di allocare una nuova stringa. **125x più veloce** per concatenazione ripetuta.
-   **Cortocircuito AND/OR** — `&&` e `||` saltano la valutazione dell'operando destro quando il risultato è già determinato.
-   **Folding letterali negativi** — `-1`, `-0.5` ecc. vengono ridotti a costanti a livello HIR invece di emettere un'istruzione di negazione.

## Build parallele Hub

Il server di orchestrazione build ora supporta build concorrenti per worker:

-   **Dispatch basato su slot** — i worker riportano la capacità `max_concurrent`, l'Hub traccia i job attivi per worker
-   **Niente più 429** — i job si mettono in coda invece di essere rifiutati quando tutti i worker sono occupati
-   **Download artefatti Base64** — artefatti binari serviti come base64 quando il runtime Perry non può gestire risposte HTTP binarie raw
-   **WebSocket con auto-riconnessione** — le connessioni di monitoraggio build si riconnettono automaticamente alla disconnessione

## Nuovo pacchetto: perry/appstorereview

Un nuovo pacchetto first-party per richiedere recensioni sull'app store:

```
import { requestReview } from "perry/appstorereview";

// Opens the native review prompt
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();
```

Una funzione, due piattaforme, UI di recensione nativa. La logica di timing e visualizzazione è interamente a carico dello sviluppatore.

## Fix di codegen

120 commit significano molti bug fix. I più impattanti:

-   **Uguaglianza stretta (===)** — tre bug separati corretti in v0.4.2: confronto tag tipo, gestione NaN e distinzione null/undefined
-   **Confronto stringhe per stringhe concatenate** — `===` falliva confrontando stringhe costruite via concatenazione a causa del confronto per puntatore invece che per contenuto
-   **Risoluzione costruttore** — `new X(args)` ora risolve correttamente costruttori importati cross-modulo e funzioni costruttore basate su closure
-   **Push array a livello di modulo** — i valori inseriti in array a livello di modulo dentro chiamate a funzione annidate in loop venivano persi a causa di puntatori stantii dopo la riallocazione
-   **Coercizione aritmetica null** — `null + 1` ora produce correttamente `1` tramite `js_number_coerce`
-   **Wrapping NOT bitwise** — `~x` ora esegue il wrap a i32 secondo la semantica ECMAScript
-   **fetch().then()** — i callback non venivano mai invocati nelle app UI native a causa del drain mancante dell'event loop (v0.4.3)
-   **Modulo e esponente WASM** — gli operatori `%` e `**` causavano errori di validazione WASM (v0.4.5)

## I numeri

-   **~120 commit** al compilatore Perry principale in 5 giorni
-   **24 rilasci patch**: v0.4.1 → v0.4.24
-   **Target di compilazione**: 9 → 10 (aggiunto tvOS)
-   **Target cross-compilazione da Linux**: Windows → Windows, iOS, macOS (tutti Apple + Windows)
-   **Nuovi pacchetti**: perry/appstorereview
-   **Nuova infrastruttura**: dashboard app.perryts.com, CLI perry login, fatturazione Polar.sh
-   **Guadagni prestazionali**: 30% più veloce mandelbrot (fcmp nativo), 125x più veloce concatenazione stringhe

## Prossimi passi

La cross-compilazione di iOS e macOS da Linux significa che l'Hub può ora compilare per ogni piattaforma da un singolo server Linux — niente più macchine di build macOS dedicate per la compilazione (solo per la firma). L'infrastruttura di fatturazione apre la strada alla beta pubblica dell'Hub. E con tvOS aggiunto, Perry copre ogni piattaforma Apple: macOS, iOS, iPadOS, watchOS e tvOS.

-   **Beta pubblica Hub** — utenti esterni possono inviare TypeScript e ottenere binari nativi
-   **Supporto regex completo** — l'ultimo grande gap del linguaggio
-   **Espansione perry/ui** — drag and drop, accessibilità, DatePicker
-   **Source map e info di debug** — info di debug DWARF per il debugging nativo

Segui i progressi su [GitHub](https://github.com/PerryTS/perry), leggi la documentazione su [docs.perryts.com](https://docs.perryts.com), o consulta la [roadmap](/it/roadmap/) per il quadro completo.
