---
title: "Tutte e sei le piattaforme, parità completa delle funzionalità"
excerpt: "Oltre 20 widget UI nativi, un widget Canvas, viste tabella, notifiche di sistema, accesso al portachiavi, supporto multi-finestra e parità completa delle funzionalità su macOS, iOS, iPadOS, Android, Linux e Windows — tutto da un unico codice TypeScript."
date: 2026-02-28
tags: ["UI", "cross-platform", "release", "milestone"]
---
Quando abbiamo rilasciato la prima versione del sistema UI nativo di Perry, "cross-platform" significava che macOS funzionava bene e le altre cinque piattaforme erano stub. Oggi, con la v0.2.162, non è più così. Tutte e sei le piattaforme — macOS, iOS, iPadOS, Android, Linux e Windows — ora condividono la parità completa delle funzionalità. Lo stesso codice TypeScript compila in widget nativi su ogni target.

Questo articolo illustra cosa abbiamo rilasciato tra la v0.2.152 e la v0.2.164: un widget Canvas, un'implementazione completa di NSTableView, oltre 20 widget UI totali, il modulo `perry/system`, supporto multi-finestra, notifiche di sistema, accesso al portachiavi, riduzione automatica delle dimensioni del binario e un sistema di plugin a tempo di compilazione. È successo molto.

## Lo sprint dei widget: 20+ componenti UI nativi

Il più grande salto singolo è arrivato con la v0.2.155, che ha portato oltre 20 widget UI su tutte le piattaforme. L'API UI TypeScript di Perry ora copre i componenti necessari per rilasciare un'app reale:

-   **Layout** — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView
-   **Input** — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker
-   **Visualizzazione** — Text, Label, Image, ProgressView, Divider, Spacer
-   **Dati** — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)
-   **Overlay** — Alert, Sheet, Popover, Toolbar, NavigationBar
-   **Disegno** — Canvas (API di disegno 2D, accelerato hardware per piattaforma)

Questi non sono wrapper attorno a un renderer personalizzato. Ogni widget compila nel componente nativo della piattaforma:`NSButton` su macOS, `UIButton` su iOS, `GtkButton` su Linux, `android.widget.Button` su Android via JNI, e `CreateWindowEx` su Windows. Il SO li disegna, li tema e gestisce l'accessibilità — Perry collega semplicemente l'API TypeScript.

## Canvas: disegno 2D da TypeScript

Una delle aggiunte tecnicamente più interessanti è il widget Canvas (v0.2.152). Espone una familiare API di disegno 2D direttamente da TypeScript — curve di Bezier, fill, stroke, blitting di immagini — e compila nel backend 2D accelerato della piattaforma: Core Graphics su macOS/iOS, Cairo su Linux, Direct2D su Windows e Skia su Android.

canvas.ts

import { Canvas, Color } from 'perry/ui';

// Compiles to Core Graphics on macOS, Cairo on Linux, etc.

const canvas = new Canvas({ width: 400, height: 300 });

canvas.onDraw((ctx) => {

ctx.fillStyle = Color.amber;

ctx.fillRect(10, 10, 100, 60);

ctx.strokeStyle = Color.blue;

ctx.lineWidth = 2;

ctx.beginPath();

ctx.arc(200, 150, 80, 0, Math.PI \* 2);

ctx.stroke();

});

## Widget Table: NSTableView arriva in TypeScript

La v0.2.163 ha portato il widget Table — il componente più complesso della libreria. Su macOS mappa a`NSTableView` con cablaggio completo delegate/data source. Su Linux usa`GtkTreeView` di GTK4. Su Windows, il controllo `ListView` di Win32. Su Android si collega a `RecyclerView` attraverso JNI.

L'API TypeScript è dichiarativa: definisci le colonne, fornisci un data source, e Perry gestisce il cablaggio specifico della piattaforma a tempo di compilazione. Ordinamento colonne, gestione della selezione e personalizzazione dell'altezza delle righe funzionano out of the box.

table.ts

import { Table, Column } from 'perry/ui';

const table = new Table({

columns: \[

new Column({ title: "Name", key: "name", width: 200 }),

new Column({ title: "Size", key: "size", width: 80 }),

\],

rows: files, // TypeScript array of objects

onSelect: (row) => console.log(row.name),

});

## Il modulo perry/system

La v0.2.155 ha anche introdotto `perry/system` — un modulo TypeScript che espone API di sistema della piattaforma senza alcun runtime: finestre di dialogo file, finestre di salvataggio, alert, sheet, accesso al portachiavi, notifiche di sistema e gestione multi-finestra.

-   `system.showOpenDialog()` — file picker nativo (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)
-   `system.showSaveDialog()` — finestra di salvataggio nativa
-   `system.showAlert()` — pannello di avviso nativo
-   `system.notify()` — notifica del SO (UserNotifications / libnotify / WinRT)
-   `system.keychain.get/set()` — Keychain Services / Secret Service / Windows Credential Store
-   `system.openWindow()` — gestione multi-finestra

Tutte queste chiamano API native della piattaforma direttamente — nessun IPC Electron, nessun bridge web view. Perry compila il sito di chiamata TypeScript in una chiamata a funzione nativa diretta nell'SDK della piattaforma.

## Parità su sei piattaforme: v0.2.162

La pietra miliare v0.2.162 riguardava la chiusura dei gap. Prima di questo rilascio, macOS aveva il set di funzionalità più completo, iOS era quasi pronto, e Linux/Windows/Android erano indietro. La v0.2.162 ha portato tutte e sei le piattaforme allo stesso livello:

-   **macOS** — AppKit, set completo di widget, Keychain, notifiche, multi-finestra, toolbar
-   **iOS / iPadOS** — UIKit, piena parità widget con macOS, ciclo di vita scene
-   **Android** — bridge JNI, tutti i widget via Android Views, cross-compilazione NDK
-   **Linux** — GTK4, set completo di widget incluso Table, finestre di dialogo file, portachiavi libsecret
-   **Windows** — Win32, tutti i widget, Windows Credential Store, notifiche WinRT

Questa è la pietra miliare che rende "un codice, sei piattaforme" reale piuttosto che aspirazionale. Lo stesso file TypeScript compila in app native su tutti e sei i target senza percorsi di codice specifici per piattaforma per i casi d'uso comuni.

## Riduzione automatica delle dimensioni del binario

La v0.2.153 ha rilasciato la riduzione automatica delle dimensioni del binario — il compilatore ora elimina aggressivamente i percorsi di codice inutilizzati, elimina le funzioni stdlib irraggiungibili e deduplica le definizioni dei simboli durante il linking. Uno strumento CLI tipico che prima compilava a ~4 MB ora arriva sotto i 2 MB senza modifiche al sorgente.

Questo è importante per i deployment reali. Quando il tuo binario è l'unità di deployment — copiato su un server, distribuito come singolo file, incorporato in un container — le dimensioni influenzano direttamente il tempo di trasferimento e il costo di storage. Dimezzare le dimensioni del binario gratuitamente è un miglioramento significativo.

## Il sistema di plugin a tempo di compilazione

La v0.2.152 ha introdotto il sistema di plugin di Perry — ed è architetturalmente diverso da ogni altro sistema di plugin nell'ecosistema TypeScript. Nessun caricamento di plugin a runtime, nessun IPC, nessun `require()` dinamico. I plugin sono moduli TypeScript che Perry risolve e compila a tempo di build.

Il risultato: i plugin hanno esattamente zero overhead a runtime. Compilano nello stesso binario del codice dell'applicazione, con chiamate a funzione dirette tra il codice del plugin e il codice host. Se non usi un plugin, non appare nel tuo binario. Se lo usi, viene integrato come qualsiasi altro modulo.

Abbiamo scritto sulla filosofia dietro questo in [I sistemi di plugin sono una tassa sulle prestazioni](/it/blog/plugin-systems-are-a-performance-tax/). La versione breve: le architetture a plugin a runtime scambiano prestazioni per estensibilità. La composizione a tempo di build ti dà entrambe.

## Miglioramenti al linguaggio

Lo sprint UI non è avvenuto in isolamento — il compilatore stesso ha continuato a diventare più capace. In questi rilasci:

-   **Espressioni di classe** — `const Foo = class extends Bar {}` ora compila correttamente
-   **Trasformazioni generatore** — `function*` e `yield` compilano in macchine a stati native
-   **Map/Set come campi di classe** — `private items = new Map()` funziona nel codegen
-   **Coercizione tipi parametri FFI** — le chiamate a librerie native gestiscono la coercizione dei tipi automaticamente
-   **Riferimenti a metodi bound** — i riferimenti `this.method` funzionano per i moduli nativi (fs, os, path)
-   `string.match()` — ora completamente supportato
-   `path.isAbsolute()`, `path.join()` multi-argomento, `path.resolve()`
-   **Target Web** — Perry può ora compilare in un output compatibile web per deployment ibridi

## Prossimi passi

Con la parità UI su sei piattaforme rilasciata, la prossima fase è profondità piuttosto che ampiezza. Stiamo lavorando su:

-   Supporto completo RegExp (`regex.test()`, `string.matchAll()`)
-   Drag and drop, menu contestuali personalizzati e label di accessibilità nel sistema di widget
-   Un'estensione VS Code per diagnostica Perry e compilazione al salvataggio
-   Integrazione con il package manager — installa e compila pacchetti Perry-nativi con un comando
-   Target di compilazione WASM per il deployment nel browser
-   Multi-threading via thread `Worker`

Se vuoi seguire, il [repository Perry](https://github.com/PerryTS/perry) è aperto. Controlla la [vetrina](/it/showcase/) per vedere cosa si sta già costruendo, o sfoglia la [roadmap](/it/roadmap/) per il quadro completo.
