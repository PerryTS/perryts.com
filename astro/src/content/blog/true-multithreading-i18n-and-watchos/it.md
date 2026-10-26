---
title: "Vero multi-threading, i18n a tempo di compilazione e watchOS"
excerpt: "Perry v0.4.0: veri thread OS con sicurezza a tempo di compilazione, un sistema di internazionalizzazione senza cerimonie per oltre 30 lingue, watchOS come 9° target di compilazione, API audio e fotocamera e una pipeline di compilazione parallela."
date: 2026-03-23
tags: ["threading", "i18n", "watchOS", "compiler", "milestone"]
---
Perry v0.4.0 è il rilascio più grande dall'inizio del progetto. Tre salti di versione in un ciclo — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (multi-threading) — e il compilatore stesso è ora parallelo. Ecco tutto ciò che è stato rilasciato.

## Vero multi-threading

Perry ora ha un vero parallelismo con thread del sistema operativo. Non web worker con overhead di serializzazione. Non `SharedArrayBuffer` con `Atomics`. Veri thread — thread OS leggeri con stack da 8MB che non condividono nulla e non costano nulla quando inattivi.

Il nuovo modulo `perry/thread` espone tre primitive:

```
import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Split work across all CPU cores, results in order
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filter in parallel
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Spawn a background thread, get a Promise
const result = await spawn(() => {
  // runs on a separate OS thread
  return computeExpensiveResult();
});
```

`parallelMap` e `parallelFilter` rilevano automaticamente il numero di core CPU e dividono l'array di input tra essi. Per array piccoli, saltano completamente il threading e eseguono in modo sincrono — nessun overhead per carichi di lavoro banali.

`spawn` lancia un thread OS in background e restituisce una Promise. Il risultato ritorna attraverso una coda di risultati pendenti che viene svuotata durante l'elaborazione dei microtask, quindi si fa `await` come qualsiasi altra operazione asincrona.

### Sicurezza a tempo di compilazione

La parte più importante non è l'API — è ciò che il compilatore *previene*. Perry rifiuta staticamente le closure che catturano variabili mutabili:

```
let counter = 0;

// ✗ Compile error: closure captures mutable variable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejected at compile time
  return item * 2;
});
```

Nessuno stato mutabile condiviso significa nessuna data race. Nessun lock, nessun mutex, nessun `Atomics`. Il compilatore garantisce la sicurezza dei thread prima che una singola riga di codice macchina venga emessa.

### Sotto il cofano

Ogni thread worker ottiene la propria arena di memoria con cleanup `Drop` — nessun coordinamento GC tra thread. I valori vengono trasferiti tramite deep-copy `SerializedValue`: zero-cost per i numeri, O(n) per stringhe, array e oggetti. L'implementazione risiede in un singolo file Rust di 1.120 righe (`perry-runtime/src/thread.rs`) e non ha richiesto modifiche al garbage collector.

Confrontalo con gli isolate V8, che richiedono heap separati per worker con ~2MB di overhead ciascuno. I thread di Perry sono semplicemente pthread con arena.

### Pipeline del compilatore parallela

Anche il compilatore stesso è ora parallelo. La codegen dei moduli, i passaggi di trasformazione (import JS, istanze native, monomorfizzazione) e la scansione dei simboli `nm` vengono tutti eseguiti su tutti i core CPU tramite rayon. Combinato con l'aggiornamento a Cranelift 0.121 (da 0.113 — otto versioni minori di miglioramenti all'allocazione dei registri e x64), la compilazione è significativamente più veloce.

## i18n a tempo di compilazione (v0.3.0)

Il sistema di internazionalizzazione di Perry ha zero cerimonia. I letterali stringa nei widget UI vengono automaticamente trattati come chiavi localizzabili. I file di traduzione sono JSON piatto in una directory `locales/`. Tutta la validazione avviene a tempo di compilazione.

```
// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Your code — just use strings normally
Button({ title: "greeting", action: () => {} })
```

Il compilatore valida tutto: traduzioni mancanti, mismatch di parametri, errori nelle forme plurali. Le traduzioni vengono integrate nel binario come tabella di stringhe 2D incorporata con lookup a runtime quasi zero — nessun parsing JSON all'avvio.

### Cosa è incluso

-   **Regole plurali CLDR** per 30+ lingue con suffissi `.one`/`.other`/`.few`/`.many`/`.zero`/`.two`
-   **Wrapper di formato**: `Currency`, `Percent`, `ShortDate`, `LongDate`, `FormatNumber`, `FormatTime`, `Raw`
-   **Rilevamento locale nativo** su tutte le piattaforme: `CFLocaleCopyCurrent` (macOS/iOS), `GetUserDefaultLocaleName` (Windows), `system_property_get` (Android), `LANG`/`LC_ALL` (Linux)
-   **`perry i18n extract`** CLI: scansiona file TS/TSX, genera e aggiorna scaffold JSON per le lingue
-   **Generazione risorse native della piattaforma**: directory iOS `.lproj` e Android `values-xx/`
-   **`import { t } from "perry/i18n"`** per localizzare stringhe non-UI

Configuralo in `perry.toml`:

```
[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }
```

## App native watchOS (v0.3.2)

Perry ora compila per watchOS — il 9° target di compilazione. Non è un wrapper o un'app companion. È un binario watchOS standalone con un'interfaccia SwiftUI nativa.

Il renderer watchOS utilizza un **approccio data-driven**: Perry costruisce un albero UI tramite chiamate FFI `perry_ui_*`, e un `PerryWatchApp.swift` incluso interroga l'albero e renderizza view SwiftUI in modo reattivo. 15 tipi di widget sono supportati con stub per quelli non supportati.

```
# Compile for watchOS
perry compile main.ts --target watchos

# Run on Apple Watch simulator
perry run watchos

# Setup signing for watchOS
perry setup watchos
```

Il flusso completo funziona: `perry setup watchos` condivide le credenziali App Store Connect con iOS, `perry run watchos` rileva automaticamente i simulatori Apple Watch e `perry publish watchos` invia all'App Store.

Questo porta anche il **conteggio totale dei target widget a quattro**: iOS (WidgetKit), Android (Glance), watchOS (WidgetKit) e Wear OS (Tiles). Ciascuno ha il proprio target di compilazione e backend di codegen.

## API Audio e Camera

Due nuove API hardware in questo rilascio:

### Cattura Audio (`perry/system`)

Cattura audio cross-platform con misurazione dB(A) pesata A:

```
import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) with EMA smoothing
const waveform = audioGetWaveformSamples();  // 256-sample ring buffer
audioStop();
```

Backend di piattaforma: AVAudioEngine (macOS/iOS), AudioRecord via JNI (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web).

### Cattura Camera (`perry/ui`)

Anteprima camera nativa con campionamento colore a livello di pixel (iOS):

```
import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 averaging
```

## Pacchetti dell'ecosistema

Due pacchetti nativi first-party lanciati:

-   **perry/push** — Binding per notifiche push per iOS/macOS: richieste di permesso, recupero token APNs, conteggio badge. Stub Android con FCM pianificato.
-   **perry/storekit** — Binding StoreKit 2 per acquisti in-app: caricamento prodotti, acquisti con ricevute JWS, verifica abbonamenti, ripristino e listener transazioni.

Entrambi seguono la stessa architettura: dichiarazioni TypeScript → crate FFI Rust → bridge Swift. Installa come dipendenza, importa le funzioni, fai `await` dei risultati. Il compilatore gestisce tutto il bridging nativo.

## Infrastruttura

-   **Cranelift 0.113 → 0.121** — otto versioni minori di miglioramenti all'allocazione dei registri, fix x64 e allineamento degli slot dello stack
-   **Splitting funzioni Windows** — divide automaticamente le funzioni con 50+ istruzioni in continuazioni per aggirare problemi di codegen Cranelift su Windows
-   **Caricamento selettivo variabili modulo** — carica solo le variabili a livello di modulo referenziate all'ingresso della funzione, riducendo la dimensione del binario Windows del 26%
-   **Aggiornamento Array.sort()** — da insertion sort O(n²) a ibrido TimSort O(n log n)
-   **perry run android** — pipeline completa di build APK: compilazione, generazione progetto Gradle, assembleDebug, installazione, lancio
-   **Voci Info.plist personalizzate** — `[ios.info_plist]` in perry.toml per descrizioni privacy, URL scheme, modalità background

## I numeri

-   **Versione**: 0.2.197 → 0.4.0 (tre pietre miliari principali)
-   **Target di compilazione**: 8 → 9 (aggiunto watchOS)
-   **Target widget**: 1 → 4 (iOS, Android, watchOS, Wear OS)
-   **Nuovi crate**: perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles
-   **Nuova documentazione**: threading (4 pagine), i18n (4 pagine), watchOS, documentazione widget espansa (3 → 8 pagine)
-   **Implementazione perry/thread**: 1.120 righe di Rust, zero modifiche al GC

## Prossimi passi

La base del threading apre molte possibilità: elaborazione parallela delle richieste HTTP, operazioni su file concorrenti e carichi di lavoro pesanti che erano precedentemente bloccati dall'esecuzione single-threaded. Sul lato del linguaggio, il supporto completo alle regex rimane il gap più grande, e l'espansione di `perry/ui` (drag and drop, accessibilità, DatePicker) continua.

Segui i progressi su [GitHub](https://github.com/PerryTS/perry), leggi la documentazione su [docs.perryts.com](https://docs.perryts.com), o consulta la [roadmap](/it/roadmap/) per il quadro completo.
