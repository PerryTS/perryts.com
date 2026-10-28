---
title: "Costruire Pry: un visualizzatore JSON nativo in TypeScript"
excerpt: "Una procedura dettagliata per creare Pry, un visualizzatore JSON nativo compilato dal runtime TypeScript al codice macchina con il runtime Perry e GC collegato e non visualizzazione web."
date: 2025-02-20
tags: ["tutorial", "showcase", "Pry"]
---
Pry è un visualizzatore JSON nativo costruito interamente in TypeScript e compilato con Perry. Non è una demo tecnologica — è uno strumento reale che usiamo ogni giorno per ispezionare risposte API, file di configurazione e dump di dati. Questo articolo illustra come è stato costruito, come viene compilato e come appare l'esperienza di sviluppo quando il tuo TypeScript compila in un'app nativa.

## Cosa fa Pry

Pry legge un file JSON (o accetta JSON da stdin) e lo renderizza come un albero interattivo e navigabile in una finestra nativa. Se hai usato il Quick Look integrato di macOS per i JSON, immagina quello — ma più veloce, con ricerca e navigazione da tastiera.

Le funzionalità:

-   **Vista ad albero** — nodi espandibili/comprimibili per oggetti e array, con indicatori di profondità e espandi/comprimi tutto
-   **Ricerca** — ricerca full-text su chiavi e valori con evidenziazione in tempo reale e navigazione tra le corrispondenze
-   **Scorciatoie da tastiera** — tasti freccia per navigare, invio per espandere/comprimere, barra per cercare, `⌘C` per copiare
-   **Appunti** — copia qualsiasi nodo o sotto-albero come JSON formattato
-   **Colorazione sintattica** — stringhe in verde, numeri in arancione, booleani in viola, null in rosso
-   **Barra di stato** — mostra conteggio totale dei nodi, profondità attuale, dimensione del file e tempo di parsing

## Il codice sorgente

Pry è scritto in TypeScript standard. Non c'è sintassi speciale, né macro, né generazione di codice al momento del build. Utilizza l'API UI di Perry, che fornisce widget nativi che compilano in codice specifico per piattaforma.

Ecco il punto di ingresso (semplificato per chiarezza):

**pry.ts**

```typescript
import { App, VStack, TreeView, SearchBar, StatusBar, State }
from "perry/ui";
import { readFile, readStdin } from "perry/fs";
// Read input from file arg or stdin
const input = process.argv[2]
? readFile(process.argv[2])
: readStdin();
const startTime = Date.now();
const data = JSON.parse(input);
const parseMs = Date.now() - startTime;
// Reactive state
const searchQuery = new State("");
const matchCount = new State(0);
// Build the app
const app = new App("Pry", {
width: 800,
height: 600,
minWidth: 400,
minHeight: 300,
});
app.body(() => {
return VStack({ spacing: 0 }, [
SearchBar({
placeholder: "Search keys and values...",
onSearch: (q) => searchQuery.value = q,
}),
TreeView(data, {
collapsible: true,
syntaxHighlight: true,
searchQuery: searchQuery,
onMatchCount: (n) => matchCount.value = n,
copyOnClick: true,
}),
StatusBar([
`${countNodes(data)} nodes`,
`Parsed in ${parseMs}ms`,
`${matchCount.value} matches`,
]),
]);
});
app.registerShortcut("/", () => app.focusSearchBar());
app.registerShortcut("Escape", () => {
searchQuery.value = "";
app.focusTree();
});
app.run();
```

Questo è il cuore di un'applicazione nativa. Nessun boilerplate del framework, nessuna configurazione di build, nessun file specifico per piattaforma. Un singolo file TypeScript.

### Le funzioni helper

Pry include anche un'utilità `countNodes` che conta ricorsivamente tutti i nodi nell'albero JSON, e un helper `formatBytes` per mostrare le dimensioni dei file. Queste sono funzioni TypeScript standard — niente di specifico di Perry. Compilano in codice nativo come tutto il resto.

**utils.ts**

```typescript
export function countNodes(data: unknown): number {
if (data === null || typeof data !== "object") {
return 1;
}
if (Array.isArray(data)) {
return 1 + data.reduce((sum, item) => sum + countNodes(item), 0);
}
const values = Object.values(data as Record<string, unknown>);
return 1 + values.reduce((sum, val) => sum + countNodes(val), 0);
}
```

## Compilare Pry

Compilare Pry con Perry è un singolo comando. Nessun progetto Xcode, nessuna configurazione Gradle, nessun webpack config. Basta puntare Perry al file di ingresso e specificare il target.

### macOS (ARM64)

```
$ perry build pry.ts --target macos-arm64
Parsing pry.ts...
Resolving imports: perry/ui, perry/fs
Compiling (cranelift, arm64)...
Linking with AppKit.framework...
✓ Built executable: pry (48 MB)
$ file pry
pry: Mach-O 64-bit executable arm64
$ otool -L pry | head -5
pry:
/System/Library/Frameworks/AppKit.framework/AppKit
/System/Library/Frameworks/Foundation.framework/Foundation
/usr/lib/libSystem.B.dylib
```

Il binario è di 48 MB perché include l'intero stack UI AppKit — rendering della vista ad albero, evidenziazione della ricerca, colorazione sintattica e gestione della tastiera. Per confronto, la stessa app in Electron sarebbe oltre 200 MB. Un'app Perry solo CLI compila a 2–5 MB.

### iOS

```
$ perry build pry.ts --target ios-arm64
✓ Built executable: pry (52 MB)
```

La build iOS si collega a UIKit invece di AppKit. Perry mappa la stessa API `TreeView` su `UITableView` con sezioni espandibili, `SearchBar` su `UISearchBar`, e gli eventi touch sostituiscono quelli del mouse. La build iOS può essere distribuita su dispositivi fisici e simulatori.

### Android

```
$ perry build pry.ts --target android-arm64
✓ Built: pry.apk
```

La build Android genera una libreria nativa caricata attraverso JNI, pacchettizzata in un APK. `TreeView` mappa a un `RecyclerView` con view holder espandibili, `SearchBar` mappa a un `EditText` con un `TextWatcher`, e la barra di stato mappa a un `TextView` in fondo al layout.

## Cosa succede sotto il cofano

Quando Perry compila Pry, attraversa diverse fasi:

1.  **Parse** — SWC analizza il sorgente TypeScript in un AST. Gli import da `perry/ui` e `perry/fs` sono risolti nelle implementazioni dei moduli integrati di Perry.
2.  **Analisi dei tipi** — Perry risolve tutti i tipi, inclusi i generici `State<string>` e `State<number>`, monomorfizzandoli in tipi concreti.
3.  **Risoluzione della piattaforma** — In base al flag target, Perry seleziona il backend UI appropriato. Ogni chiamata `TreeView`, `SearchBar` e `Button` viene risolta nell'implementazione specifica della piattaforma.
4.  **Generazione IR** — Perry genera una rappresentazione intermedia che include chiamate API native — invii di messaggi Objective-C per macOS/iOS, chiamate JNI per Android, chiamate a funzioni C per GTK4/Win32.
5.  **Generazione del codice** — Cranelift compila l'IR in codice macchina nativo per l'architettura target.
6.  **Linking** — Il codice nativo viene collegato ai framework della piattaforma (AppKit, UIKit, Android NDK, GTK4 o Win32) per produrre l'eseguibile finale.

## Nessun runtime, nessuna web view

Questo vale la pena sottolinearlo perché è la differenza fondamentale tra Perry e qualsiasi altro approccio TypeScript-to-native. Il binario compilato di Pry ha:

-   **Nessun motore JavaScript** — nessun V8, nessun Hermes, nessun JavaScriptCore
-   **Nessuna web view** — nessun Chromium, nessun WebKit, nessun WKWebView
-   **Nessun layer bridge** — nessun messaggio serializzato tra JS e nativo
-   **Nessun runtime del framework** — nessun React, nessun motore Flutter, nessuna Dart VM

Il binario chiama direttamente le API della piattaforma. Su macOS, chiama `objc_msgSend` per interagire con gli oggetti AppKit. Su Android, chiama funzioni JNI per creare e manipolare le Views. È la stessa cosa che farebbe un'app nativa Swift o Kotlin.

La conseguenza pratica: Pry si avvia istantaneamente. Nessun avvio della VM, nessun riscaldamento JIT, nessun parsing di script. Il processo parte, la finestra appare, il JSON viene renderizzato. L'uso di memoria è una frazione di quello che consumerebbe un equivalente Electron.

## Esperienza di sviluppo

Costruire Pry è stato notevolmente simile a costruire qualsiasi applicazione TypeScript. Il flusso di lavoro è:

1.  Scrivi TypeScript nel tuo editor (VS Code, Zed, Neovim, quello che preferisci)
2.  Esegui `perry compile pry.ts`
3.  Esegui `./pry test.json`
4.  Itera

Nessun progetto Xcode da configurare. Nessun Android Studio da installare. Nessuna build Gradle che impiega 45 secondi. Il compilatore Perry stesso è veloce — il parsing e la compilazione di Pry richiedono pochi secondi, e stiamo attivamente lavorando per renderlo più veloce.

Il TypeScript che scrivi è TypeScript standard. Il type checking, l'autocompletamento e gli strumenti di refactoring del tuo editor funzionano tutti. Puoi estrarre funzioni, creare moduli, usare generici — tutti i pattern TypeScript che già conosci.

## Cosa abbiamo imparato

Costruire Pry ci ha insegnato molto su cosa l'API UI di Perry deve supportare. Alcune lezioni:

-   **Le viste ad albero sono complesse.** Espansione, compressione, evidenziazione della ricerca, navigazione da tastiera e integrazione con gli appunti devono essere tutti coordinati. Il widget `TreeView` di Perry gestisce questo internamente, ma abbiamo dovuto assicurarci che l'implementazione nativa fosse consistente su tutte e tre le piattaforme.
-   **Le scorciatoie da tastiera necessitano delle convenzioni della piattaforma.** Su macOS, è `⌘C` per copiare. Su Linux e Android, è `Ctrl+C`. Il sistema di scorciatoie di Perry astrae questo, ma è servita un'implementazione attenta per farlo funzionare correttamente.
-   **Le barre di stato sono sorprendentemente non banali.** Ogni piattaforma ha una convenzione diversa per dove e come visualizzare le informazioni di stato. AppKit usa la barra inferiore della finestra, UIKit usa una toolbar, Android usa una view inferiore nel layout. La `StatusBar` di Perry mappa correttamente a ciascuna.
-   **Il supporto stdin ha richiesto consapevolezza della piattaforma.** Su macOS e Linux, leggere da stdin è semplice. Su iOS e Android, "stdin" non esiste realmente allo stesso modo, quindi Pry usa la selezione file sulle piattaforme mobili. La funzione `readStdin` di Perry gestisce questo in modo trasparente.

## Prestazioni

Pry gestisce file JSON grandi con facilità. Nei nostri test:

-   Un file JSON da 1 MB (10.000+ nodi) viene analizzato e renderizzato in meno di 50 ms
-   Un file JSON da 10 MB viene renderizzato in meno di 200 ms
-   La ricerca su 10.000 nodi restituisce risultati mentre digiti, senza lag visibile
-   L'uso di memoria rimane sotto i 50 MB anche per file grandi

Questo è il vantaggio della compilazione nativa. Il parsing JSON in Perry è compilato in cicli nativi compatti senza pause del GC. Il rendering dell'albero usa le viste lista virtualizzate della piattaforma (NSOutlineView, UITableView, RecyclerView), che sono collaudate per le prestazioni.

## Sorgente e download

Pry è open source. Puoi sfogliare il codice sorgente completo, compilarlo tu stesso, o semplicemente guardare il codice per capire come è strutturata un'app UI nativa Perry.

-   [Repository GitHub](https://github.com/perryts/pry) — codice sorgente completo e istruzioni di build
-   [Pagina vetrina](/it/showcase/pry/) — screenshot, lista funzionalità e dettagli sulla piattaforma

Se stai costruendo qualcosa con Perry, ci piacerebbe saperne di più. Apri una issue sul [repository Perry](https://github.com/PerryTS/perry) o avvia una discussione. Stiamo costruendo Perry in modo aperto e il feedback degli utenti reali che costruiscono app reali è inestimabile.
