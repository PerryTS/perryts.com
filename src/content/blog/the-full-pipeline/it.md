---
title: "La pipeline completa: documentazione, distribuzione e WidgetKit"
excerpt: "82 commit in una settimana: un sito di documentazione di 49 pagine, pubblicazione automatizzata su App Store e Play Store, pacchetti Homebrew e APT, estensioni WidgetKit native da TypeScript, nuovi widget, moduli http/https e un compilatore LLVM self-hosted."
date: 2026-03-13
tags: ["distribution", "documentation", "WidgetKit", "milestone"]
---
82 commit in sette giorni. Un sito di documentazione con 49 pagine. Pubblicazione automatica su App Store e Play Store. Pacchetti Homebrew e APT. Estensioni WidgetKit native compilate da TypeScript. Un compilatore LLVM self-hosting. E dozzine di correzioni di bug su ogni piattaforma.

Questo post copre tutto ciò che è stato rilasciato in Perry tra il 6 e il 13 marzo 2026. Il tema è il completamento — colmare le lacune tra "ho scritto del TypeScript" e "la mia app è sull'App Store."

## docs.perryts.com

Perry ora ha un vero sito di documentazione. 49 pagine costruite con mdBook, che coprono tutto da come iniziare al riferimento della CLI. La documentazione è organizzata in sezioni:

-   **Per Iniziare** — installazione, primo progetto, struttura del progetto
-   **Funzionalità del Linguaggio** — tutto ciò che Perry supporta da TypeScript
-   **UI Nativa** — 12 pagine che coprono tutti i tipi di widget, layout, gestione dello stato e comportamento specifico della piattaforma
-   **Piattaforme** — pagine dedicate per ognuna delle 6 piattaforme target
-   **Libreria Standard** — oltre 50 implementazioni di pacchetti nativi documentate
-   **API di Sistema** — dialoghi file, keychain, notifiche, multi-finestra
-   **WidgetKit** — il nuovo modulo per le estensioni widget
-   **Plugin** — architettura dei plugin a tempo di compilazione
-   **Riferimento CLI** — ogni comando e flag

Il sito include anche un file `llms.txt` per la scopribilità AI, ed è distribuito tramite GitHub Pages con un dominio personalizzato su [docs.perryts.com](https://docs.perryts.com).

## Installa Perry con Un Comando

Perry è ora distribuito attraverso Homebrew e APT, oltre alla compilazione dal sorgente. Una nuova pipeline di rilascio GitHub Actions compila binari per macOS (arm64 e x86\_64) e Linux (x86\_64 e arm64), poi aggiorna automaticamente il tap Homebrew e il repository APT.

```text
# macOS
brew tap PerryTS/perry
brew install perry
# Debian/Ubuntu
sudo apt update && sudo apt install perry
```

Niente più clonazione del repo e compilazione con Cargo. Installa Perry nello stesso modo in cui installi qualsiasi altro strumento.

## Pubblicazione Automatica sull'App Store

Questo è il cambiamento che elimina il maggior numero di passaggi manuali. Eseguire `perry publish ios` ora gestisce l'intera pipeline di distribuzione iOS automaticamente:

1.  Genera una chiave RSA e CSR tramite l'API di App Store Connect
2.  Crea un certificato di distribuzione e lo impacchetta in un `.p12`
3.  Registra il bundle ID
4.  Crea e scarica un profilo di provisioning
5.  Crea il record dell'app su App Store Connect
6.  Compila, firma e carica su TestFlight o sull'App Store

Nessun Xcode. Nessuna visita manuale al portale. Nessun download di certificati dal browser. La procedura guidata di configurazione si avvia automaticamente la prima volta che pubblichi, guidandoti nella configurazione della chiave API e salvando le credenziali in `perry.toml`.

La distribuzione macOS è ugualmente automatizzata. Perry supporta tre modalità: TestFlight, DMG notarizzato e una nuova modalità **"entrambi"** che pubblica sull'App Store e crea un DMG notarizzato contemporaneamente. Tre tipi di certificato vengono generati automaticamente: `MAC_APP_DISTRIBUTION`, `MAC_INSTALLER_DISTRIBUTION` e `DEVELOPER_ID_APPLICATION`.

Anche la pubblicazione Android ha ottenuto una procedura guidata di configurazione automatica. Tutte e tre le piattaforme ora seguono lo stesso schema: la prima esecuzione avvia la configurazione, le credenziali vengono salvate nel progetto, le esecuzioni successive sono a zero configurazione.

La validazione pre-volo cattura i problemi prima che la compilazione inizi — mismatch del bundle ID nel profilo di provisioning, scadenza del certificato, icona dell'app mancante, formato di versione non valido, team ID errato. E `encryption_exempt` in `perry.toml [ios]` imposta automaticamente la chiave `ITSAppUsesNonExemptEncryption` nell'Info.plist, saltando il prompt manuale di conformità all'esportazione in App Store Connect.

## perry/widget: WidgetKit da TypeScript

Perry può ora compilare TypeScript in estensioni WidgetKit SwiftUI native. Questo non è un wrapper o un bridge — il compilatore percorre l'albero di render a livello HIR ed emette codice sorgente SwiftUI direttamente. L'output è un bundle completo di estensione WidgetKit che Xcode (o la pipeline di build di Perry) può incorporare nella tua app.

```text
perry widget.ts --target ios-widget --app-bundle-id com.example.app -o out/
```

L'approccio è fondamentalmente diverso dal resto della compilazione di Perry. Il codice Perry normale passa attraverso Cranelift al codice macchina nativo. Il codice dei widget passa attraverso l'HIR all'output di testo SwiftUI, perché WidgetKit richiede SwiftUI — non c'è modo di costruire un'estensione widget con codice imperativo UIKit o AppKit. Perry risolve questo trattando l'albero di render del widget come un template a tempo di compilazione, non come codice runtime.

## Nuovi Widget e Miglioramenti per Piattaforma

Quattro nuovi tipi di widget sono arrivati questa settimana:

-   **TextArea** — modifica di testo multilinea su macOS, iOS e Android
-   **SecureField** — input per password su iOS e macOS
-   **QR Code** — generazione nativa di codici QR su iOS, macOS e Android
-   **Splash Screen** — storyboard LaunchScreen auto-generati (iOS) e temi splash (Android)

### iPad Diventa Nativo

Perry ora genera app completamente native per iPad: `UIDeviceFamily [1,2]`, supporto all'orientamento, `UIRequiresFullScreen` e uno storyboard LaunchScreen compilato tramite ibtool. Una nuova funzione `getDeviceIdiom()` rileva telefono vs. iPad a runtime, e `PerryFrameSplit` fornisce contenitori split orizzontali basati su frame per layout iPad.

### Windows

Windows ha ottenuto il supporto timer (tick `WM_TIMER` da 50ms), pulsanti owner-drawn con sfondi tema scuro e correzioni per un bug use-after-free in `to_wide().as_ptr()` in 18 file di widget. Il runtime V8 ora funziona su Windows con le librerie di sistema richieste collegate.

### GTK4 (Linux)

Il backend GTK4 ha ricevuto una rifinitura visiva per corrispondere a macOS: padding CSS per gli edge inset, stile pulsanti Adwaita, correzioni margini VStack e policy orizzontale ScrollView.

## http/https e better-sqlite3

Due aggiunte significative alla stdlib:

I nuovi moduli nativi `http` e `https` forniscono HTTP lato client usando reqwest sotto il cofano. L'API corrisponde a Node.js: `request()`, `get()`, `ClientRequest` con write/end/on e `IncomingMessage` con statusCode e gestori di eventi.

`better-sqlite3` è ora completamente supportato: `new Database()`, `prepare`, `exec`, `run`, `get`, `all` — con NaN-boxing appropriato e oggetti riga con accesso alle proprietà per nome.

Altri miglioramenti della stdlib: `crypto.randomBytes()` ora restituisce un Buffer (come in Node.js), MongoDB ha ottenuto `listDatabases` e `listCollections` con correzioni di thread-safety, e le operazioni INSERT/UPDATE/DELETE di mysql2 ora restituiscono `ResultSetHeader` con `insertId`.

## Correzioni GC e di Correttezza

Diverse correzioni critiche al garbage collector e alla correttezza del runtime sono state rilasciate questa settimana:

-   **Guardia di rientranza GC** — previene la raccolta durante l'allocazione, correggendo i panic di double-borrow RefCell
-   **Tracciamento Map del GC** — le Map sono ora correttamente tracciate durante la fase di mark, prevenendo la raccolta delle chiavi stringa
-   **Correzione aliasing stringhe** — l'append di stringhe ora alloca sempre stringhe fresche, correggendo la corruzione dall'aliasing della copia dei puntatori
-   **Aritmetica BigInt** — lo shift a destra usa lo shift aritmetico per numeri negativi, le operazioni bitwise usano la semantica di wrapping ToInt32
-   **Map.get() undefined** — restituisce il corretto `TAG_UNDEFINED` per chiavi mancanti invece del tag NaN errato
-   **Radici GC per campi statici** — i valori BigInt nei campi statici delle classi registrati come radici GC

Queste non sono correzioni minori. La correzione della rientranza GC da sola ha risolto un'intera classe di crash intermittenti. La correzione dell'aliasing delle stringhe riguardava qualsiasi programma che assegnava una variabile stringa a un'altra e poi modificava una delle due. Questi sono i tipi di bug che emergono solo sotto carichi di lavoro reali, e correggerli è ciò che rende il compilatore pronto per la produzione.

## perry-verify: Rafforzato

`perry-verify`, il servizio di verifica automatica delle app, ha ricevuto un passaggio di hardening della sicurezza: esecuzione sandboxed tramite `bwrap` su Linux e `sandbox-exec` su macOS, token di autenticazione sull'handshake WebSocket e il download dei binari, rate limiting per IP, job ID UUID completi per prevenire l'enumerazione e limiti di dimensione del body ridotti.

## perrysdad: Il Compilatore Self-Hosting

In uno sforzo parallelo, `perrysdad` — un compilatore LLVM IR self-hosting scritto in TypeScript — è passato da zero all'auto-compilazione in cinque fasi durante la settimana:

1.  **Fase 0-1** — scheletro end-to-end: HIR a testo LLVM IR a clang, linkato contro `libperry_runtime.a` di Perry
2.  **Fase 2** — parser a discesa ricorsiva scritto a mano con parsing di espressioni Pratt per file `.ts` reali
3.  **Fase 3** — array, oggetti e map con FFI runtime, più la correzione di un mismatch ABI critico (JSValue dichiarato come double nell'LLVM IR invece di i64)
4.  **Fase 4** — classi, enum, closure, compilazione multi-file con scoperta dei moduli e ordinamento topologico

Il traguardo: il binario `anvil` auto-compilato può ora compilare programmi di test e produrre output corretto corrispondente alla versione compilata con node. Un compilatore TypeScript, compilato da Perry in codice nativo, che compila altro TypeScript in codice nativo. Tartarughe fino in fondo.

## In Numeri

-   **82 commit** al compilatore Perry principale
-   **1 rilascio**: v0.2.173 (8 marzo)
-   **49 pagine di documentazione** su docs.perryts.com
-   **4 nuovi widget**: TextArea, SecureField, QR Code, Splash Screen
-   **3 canali di distribuzione**: Homebrew, APT, sorgente
-   **3 pipeline automatiche per store**: App Store, TestFlight, Google Play
-   **Tutte e 6 le piattaforme** hanno ricevuto miglioramenti questa settimana

## Cosa Viene Dopo

La pipeline si sta riempiendo. Puoi scrivere TypeScript, compilare per sei piattaforme, distribuire tramite Homebrew o APT, pubblicare sull'App Store e Play Store, aggiungere widget alla schermata home e leggere documentazione completa — tutto senza lasciare la toolchain di Perry. Cosa resta:

-   **Supporto regex completo** — l'ultima grande lacuna del linguaggio
-   **Espansione perry/ui** — drag and drop, etichette di accessibilità, DatePicker
-   **Maturazione di perrysdad** — espansione del compilatore self-hosting verso la piena parità con Perry
-   **Beta pubblica dell'Hub** — apertura delle build distribuite agli utenti esterni

Segui i progressi su [GitHub](https://github.com/PerryTS/perry), leggi la nuova documentazione su [docs.perryts.com](https://docs.perryts.com), o consulta la [roadmap](/it/roadmap/) per il quadro completo.
