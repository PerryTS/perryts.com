---
title: "UI nativa multipiattaforma da TypeScript"
excerpt: "How Perry maps one TypeScript codebase to platform widgets across its documented targets, including the platform-specific limitations and prerequisites."
date: 2025-02-01
tags: ["architecture", "UI", "cross-platform"]
---
Uno degli obiettivi più ambiziosi di Perry è fornire applicazioni GUI veramente native da un singolo codice TypeScript. Non web view racchiuse in un guscio nativo. Non un motore di rendering personalizzato che disegna i propri pixel. Veri widget nativi, renderizzati dal framework UI proprio di ciascuna piattaforma, compilati da TypeScript al momento del build.

Questo articolo spiega come funziona — l'architettura, il mapping delle piattaforme, i compromessi e dove siamo oggi.

## Il problema degli approcci attuali

Lo sviluppo GUI cross-platform è stato un problema difficile per decenni. Ogni grande framework ha fatto una serie diversa di compromessi:

### Electron / Tauri (basati sul web)

Electron include Chromium e Node.js, fornendoti un browser web come shell dell'app. Hai pieno accesso alla piattaforma web, ma la tua app "nativa" è un download di 150+ MB che utilizza centinaia di megabyte di RAM solo per mostrare una finestra. Tauri sostituisce Chromium con la web view del sistema operativo, riducendo drasticamente le dimensioni, ma la tua UI è ancora HTML/CSS renderizzata in una web view — non widget nativi.

### React Native (basato su bridge)

React Native esegue il tuo JavaScript in un motore JS (Hermes o V8) e fa da ponte verso i widget nativi attraverso una coda di messaggi serializzati. Ottieni veri widget nativi, ma il bridge aggiunge latenza, specialmente per gesture e animazioni. Le interazioni complesse richiedono di scendere al codice nativo (Swift/Kotlin), vanificando la promessa del singolo codice.

### Flutter (renderer personalizzato)

Flutter compila Dart in codice nativo e disegna tutto con il suo motore di rendering basato su Skia. Le prestazioni sono eccellenti, ma i tuoi widget non sono nativi — sono repliche pixel-perfect. Questo significa che le convenzioni della piattaforma (fisica dello scroll, selezione del testo, comportamenti di accessibilità) devono essere reimplementate piuttosto che ereditate. E su desktop, le differenze diventano più evidenti.

### KMP + Compose Multiplatform (nativo parziale)

Kotlin Multiplatform compila in JVM su Android e nativo su iOS, ma la UI condivisa attraverso Compose Multiplatform utilizza un renderer personalizzato basato su Skia — stesso compromesso di Flutter. Per una UI veramente nativa, si torna a scrivere codice specifico per piattaforma.

## L'approccio di Perry: compilare verso toolkit nativi

Perry adotta un approccio fondamentalmente diverso. Invece di eseguire il tuo codice in un runtime e fare da ponte verso i widget nativi, o disegnare pixel personalizzati, Perry compila il tuo codice UI TypeScript direttamente in chiamate al toolkit nativo di ciascuna piattaforma al momento del build.

La differenza chiave: **non c'è nessun livello runtime tra il tuo codice e l'SDK della piattaforma.** Il binario compilato chiama AppKit, UIKit, Android Views, GTK4 o Win32 direttamente, esattamente come farebbe un'app scritta in Swift, Kotlin o C++.

## L'API UI unificata

Perry fornisce un'API TypeScript comune per costruire interfacce utente. Questa API è deliberatamente di alto livello — descrivi cosa deve contenere la tua UI e come deve comportarsi, e Perry la mappa ai costrutti nativi appropriati.

counter.ts

import { App, Text, Button, VStack, State } from "perry/ui";

const count = new State(0);

const app = new App("Counter", { width: 400, height: 300 });

app.body(() => {

return VStack({ spacing: 16, alignment: "center" }, \[

Text(\`Count: ${count.value}\`, { fontSize: 32 }),

Button("Increment", () => count.value++),

Button("Reset", () => count.value = 0),

\]);

});

app.run();

Lo stesso codice compila in UI nativa su tutte e sei le piattaforme. Nessun `#ifdef`, nessun controllo della piattaforma, nessun import condizionale.

## Mapping delle piattaforme in dettaglio

Ecco come Perry mappa l'API unificata al framework nativo di ciascuna piattaforma:

### macOS — AppKit

Su macOS, Perry genera codice che crea e gestisce oggetti AppKit direttamente. Un `App` diventa un `NSApplication` con un `NSWindow`. `Text` diventa `NSTextField` (con editing disabilitato). `Button` diventa `NSButton` con un pattern target-action collegato alla tua callback. `VStack` diventa un `NSStackView` con orientamento verticale. Il layout usa i vincoli Auto Layout.

Il binario compilato si collega al framework AppKit e chiama le funzioni del runtime Objective-C direttamente. È la stessa cosa che farebbe del codice Swift compilato da Xcode.

### iOS e iPadOS — UIKit

Su iOS, il mapping è simile ma punta a UIKit. `App` diventa un `UIApplication` con un `UIWindow` e un root `UIViewController`. `Text` mappa a `UILabel`. `Button` mappa a `UIButton`. Il layout usa `UIStackView` e Auto Layout. Gli eventi touch sono gestiti attraverso la catena di risposta di UIKit.

### Android — JNI + Views

Su Android, Perry genera una libreria nativa caricata via JNI (Java Native Interface). `App` mappa a un `Activity`. `Text` diventa un `TextView`. `Button` diventa un `android.widget.Button` con un `OnClickListener`. `VStack` mappa a un `LinearLayout` verticale. Il codice nativo richiama il framework Android attraverso JNI, creando e manipolando vere view Android.

### Linux — GTK4

Su Linux, Perry punta a GTK4. `App` diventa un `GtkApplication` con un `GtkApplicationWindow`. `Text` mappa a `GtkLabel`. `Button` mappa a `GtkButton` con un gestore di segnale. `VStack` mappa a un `GtkBox` con orientamento verticale. Il theming CSS di GTK significa che la tua app segue automaticamente il tema desktop dell'utente.

### Windows — Win32

Su Windows, Perry genera chiamate all'API Win32. `App` crea una classe finestra, la registra e esegue un ciclo di messaggi. `Button` diventa un controllo `BUTTON`creato con `CreateWindowEx`. `Text` mappa a un controllo `STATIC`. Gli eventi sono gestiti attraverso la pompa di messaggi Win32 (`WM_COMMAND`, `WM_NOTIFY`, ecc.).

## Gestione dello stato

La primitiva `State<T>` di Perry fornisce una gestione reattiva dello stato che compila nei meccanismi di aggiornamento nativi della piattaforma. Quando un valore di stato cambia, Perry attiva un aggiornamento UI attraverso il sistema di invalidazione della piattaforma — `setNeedsDisplay` su macOS/iOS, `invalidate()` su Android, `gtk_widget_queue_draw` su Linux.

Non c'è nessun diffing del virtual DOM, nessun passaggio di riconciliazione, nessuna serializzazione. Le modifiche dello stato si propagano direttamente al widget nativo che visualizza il valore.

## Perché non una sintassi SwiftUI / Jetpack Compose?

Potresti chiederti perché Perry non usa una sintassi dichiarativa simile a SwiftUI o Jetpack Compose. La risposta è pragmatica: Perry compila TypeScript, e TypeScript ha i suoi idiomi. Piuttosto che inventare un DSL che sembra estraneo agli sviluppatori TypeScript, Perry usa un'API in stile builder che risulta naturale in TypeScript — costruttori, chiamate a metodi, callback e closure. Sono gli stessi pattern che già usi quando lavori con Express, gli hook di React o qualsiasi altra libreria TypeScript.

## Cosa è disponibile oggi

Tutti e sei i backend delle piattaforme sono implementati e stabili. Il set di widget attuale include:

-   **Layout** — VStack, HStack, Spacer, ScrollView, Divider
-   **Visualizzazione** — Text, Image
-   **Input** — Button, TextField, Toggle, Slider
-   **Navigazione** — NavigationView, TabView, List
-   **Contenitori** — TreeView, SearchBar, StatusBar
-   **Stato** — State<T> per aggiornamenti reattivi

## Cosa arriverà

Stiamo attivamente espandendo la libreria di widget. Prossimamente:

-   `SecureField` — input password con inserimento testo sicuro nativo della piattaforma
-   `ProgressView` — indicatori di progresso determinati e indeterminati
-   `Alert` — finestre di dialogo native con pulsanti e campi di testo
-   `DatePicker` — selezione data/ora nativa della piattaforma
-   `Menu` — barre dei menu native e menu contestuali

L'obiettivo è la parità completa del framework GUI su tutte le piattaforme — ogni widget, layout, gesture e animazione disponibile ovunque. Consulta la [roadmap](/it/roadmap/) per il quadro completo.

## Provalo

Il modo migliore per capire l'UI nativa di Perry è vederla in azione. [Pry](/it/showcase/pry/) è un visualizzatore JSON nativo costruito interamente in TypeScript con Perry — un'app reale con navigazione ad albero, ricerca e scorciatoie da tastiera, compilata in binari nativi su macOS, iOS e Android. Leggi la [guida completa](/it/blog/building-pry/) su come è stato costruito.
