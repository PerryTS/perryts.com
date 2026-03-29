import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Uno degli obiettivi più ambiziosi di Perry è fornire applicazioni GUI veramente native
        da un singolo codice TypeScript. Non web view racchiuse in un guscio nativo. Non un
        motore di rendering personalizzato che disegna i propri pixel. Veri widget nativi, renderizzati dal
        framework UI proprio di ciascuna piattaforma, compilati da TypeScript al momento del build.
      </p>
      <p>
        Questo articolo spiega come funziona — l&apos;architettura, il mapping delle piattaforme, i compromessi
        e dove siamo oggi.
      </p>

      <h2>Il problema degli approcci attuali</h2>
      <p>
        Lo sviluppo GUI cross-platform è stato un problema difficile per decenni. Ogni grande
        framework ha fatto una serie diversa di compromessi:
      </p>

      <h3>Electron / Tauri (basati sul web)</h3>
      <p>
        Electron include Chromium e Node.js, fornendoti un browser web come shell dell&apos;app.
        Hai pieno accesso alla piattaforma web, ma la tua app &quot;nativa&quot; è un download di 150+ MB
        che utilizza centinaia di megabyte di RAM solo per mostrare una finestra. Tauri sostituisce
        Chromium con la web view del sistema operativo, riducendo drasticamente le dimensioni, ma la tua UI è ancora HTML/CSS
        renderizzata in una web view — non widget nativi.
      </p>

      <h3>React Native (basato su bridge)</h3>
      <p>
        React Native esegue il tuo JavaScript in un motore JS (Hermes o V8) e fa da ponte verso i widget
        nativi attraverso una coda di messaggi serializzati. Ottieni veri widget nativi, ma il bridge
        aggiunge latenza, specialmente per gesture e animazioni. Le interazioni complesse richiedono
        di scendere al codice nativo (Swift/Kotlin), vanificando la promessa del singolo codice.
      </p>

      <h3>Flutter (renderer personalizzato)</h3>
      <p>
        Flutter compila Dart in codice nativo e disegna tutto con il suo motore di rendering basato su Skia.
        Le prestazioni sono eccellenti, ma i tuoi widget non sono nativi — sono
        repliche pixel-perfect. Questo significa che le convenzioni della piattaforma (fisica dello scroll, selezione del testo,
        comportamenti di accessibilità) devono essere reimplementate piuttosto che ereditate. E su desktop,
        le differenze diventano più evidenti.
      </p>

      <h3>KMP + Compose Multiplatform (nativo parziale)</h3>
      <p>
        Kotlin Multiplatform compila in JVM su Android e nativo su iOS, ma la UI condivisa attraverso
        Compose Multiplatform utilizza un renderer personalizzato basato su Skia — stesso compromesso di Flutter. Per
        una UI veramente nativa, si torna a scrivere codice specifico per piattaforma.
      </p>

      <h2>L&apos;approccio di Perry: compilare verso toolkit nativi</h2>
      <p>
        Perry adotta un approccio fondamentalmente diverso. Invece di eseguire il tuo codice in un runtime
        e fare da ponte verso i widget nativi, o disegnare pixel personalizzati, Perry compila il tuo codice
        UI TypeScript direttamente in chiamate al toolkit nativo di ciascuna piattaforma al momento del build.
      </p>
      <p>
        La differenza chiave: <strong>non c&apos;è nessun livello runtime tra il tuo codice e l&apos;SDK della piattaforma.</strong>{" "}
        Il binario compilato chiama AppKit, UIKit, Android Views, GTK4 o Win32 direttamente, esattamente
        come farebbe un&apos;app scritta in Swift, Kotlin o C++.
      </p>

      <h2>L&apos;API UI unificata</h2>
      <p>
        Perry fornisce un&apos;API TypeScript comune per costruire interfacce utente. Questa API è
        deliberatamente di alto livello — descrivi cosa deve contenere la tua UI e come deve
        comportarsi, e Perry la mappa ai costrutti nativi appropriati.
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">Text</span>, <span className="text-cyan-400">Button</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">State</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">count</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Counter&quot;</span>, {"{"} width: <span className="text-orange-400">400</span>, height: <span className="text-orange-400">300</span> {"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">16</span>, alignment: <span className="text-green-400">&quot;center&quot;</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">Text</span>(<span className="text-green-400">`Count: ${"{"}<span className="text-cyan-400">count</span>.value{"}"}`</span>, {"{"} fontSize: <span className="text-orange-400">32</span> {"}"}),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Increment&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value++),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Reset&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value = <span className="text-orange-400">0</span>),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        Lo stesso codice compila in UI nativa su tutte e sei le piattaforme. Nessun <code className="text-perry-400">#ifdef</code>,
        nessun controllo della piattaforma, nessun import condizionale.
      </p>

      <h2>Mapping delle piattaforme in dettaglio</h2>
      <p>
        Ecco come Perry mappa l&apos;API unificata al framework nativo di ciascuna piattaforma:
      </p>

      <h3>macOS — AppKit</h3>
      <p>
        Su macOS, Perry genera codice che crea e gestisce oggetti AppKit direttamente.
        Un <code className="text-perry-400">App</code> diventa un <code className="text-perry-400">NSApplication</code> con
        un <code className="text-perry-400">NSWindow</code>.{" "}
        <code className="text-perry-400">Text</code> diventa <code className="text-perry-400">NSTextField</code> (con editing disabilitato).{" "}
        <code className="text-perry-400">Button</code> diventa <code className="text-perry-400">NSButton</code> con un pattern target-action
        collegato alla tua callback.{" "}
        <code className="text-perry-400">VStack</code> diventa un <code className="text-perry-400">NSStackView</code> con orientamento verticale. Il layout usa i vincoli Auto Layout.
      </p>
      <p>
        Il binario compilato si collega al framework AppKit e chiama le funzioni del runtime Objective-C
        direttamente. È la stessa cosa che farebbe del codice Swift compilato da Xcode.
      </p>

      <h3>iOS e iPadOS — UIKit</h3>
      <p>
        Su iOS, il mapping è simile ma punta a UIKit.{" "}
        <code className="text-perry-400">App</code> diventa un <code className="text-perry-400">UIApplication</code> con
        un <code className="text-perry-400">UIWindow</code> e un root <code className="text-perry-400">UIViewController</code>.{" "}
        <code className="text-perry-400">Text</code> mappa a <code className="text-perry-400">UILabel</code>.{" "}
        <code className="text-perry-400">Button</code> mappa a <code className="text-perry-400">UIButton</code>.{" "}
        Il layout usa <code className="text-perry-400">UIStackView</code> e Auto Layout.
        Gli eventi touch sono gestiti attraverso la catena di risposta di UIKit.
      </p>

      <h3>Android — JNI + Views</h3>
      <p>
        Su Android, Perry genera una libreria nativa caricata via JNI (Java Native Interface).{" "}
        <code className="text-perry-400">App</code> mappa a un <code className="text-perry-400">Activity</code>.{" "}
        <code className="text-perry-400">Text</code> diventa un <code className="text-perry-400">TextView</code>.{" "}
        <code className="text-perry-400">Button</code> diventa un <code className="text-perry-400">android.widget.Button</code> con
        un <code className="text-perry-400">OnClickListener</code>.{" "}
        <code className="text-perry-400">VStack</code> mappa a un <code className="text-perry-400">LinearLayout</code> verticale.
        Il codice nativo richiama il framework Android attraverso JNI, creando e
        manipolando vere view Android.
      </p>

      <h3>Linux — GTK4</h3>
      <p>
        Su Linux, Perry punta a GTK4.{" "}
        <code className="text-perry-400">App</code> diventa un <code className="text-perry-400">GtkApplication</code> con
        un <code className="text-perry-400">GtkApplicationWindow</code>.{" "}
        <code className="text-perry-400">Text</code> mappa a <code className="text-perry-400">GtkLabel</code>.{" "}
        <code className="text-perry-400">Button</code> mappa a <code className="text-perry-400">GtkButton</code> con
        un gestore di segnale.{" "}
        <code className="text-perry-400">VStack</code> mappa a un <code className="text-perry-400">GtkBox</code> con orientamento
        verticale. Il theming CSS di GTK significa che la tua app segue automaticamente il tema desktop
        dell&apos;utente.
      </p>

      <h3>Windows — Win32</h3>
      <p>
        Su Windows, Perry genera chiamate all&apos;API Win32.{" "}
        <code className="text-perry-400">App</code> crea una classe finestra, la registra e esegue un ciclo di messaggi.{" "}
        <code className="text-perry-400">Button</code> diventa un controllo <code className="text-perry-400">BUTTON</code>
        creato con <code className="text-perry-400">CreateWindowEx</code>.{" "}
        <code className="text-perry-400">Text</code> mappa a un controllo <code className="text-perry-400">STATIC</code>.
        Gli eventi sono gestiti attraverso la pompa di messaggi Win32 (<code className="text-perry-400">WM_COMMAND</code>,{" "}
        <code className="text-perry-400">WM_NOTIFY</code>, ecc.).
      </p>

      <h2>Gestione dello stato</h2>
      <p>
        La primitiva <code className="text-perry-400">State&lt;T&gt;</code> di Perry fornisce una gestione
        reattiva dello stato che compila nei meccanismi di aggiornamento nativi della piattaforma. Quando un
        valore di stato cambia, Perry attiva un aggiornamento UI attraverso il sistema di invalidazione
        della piattaforma — <code className="text-perry-400">setNeedsDisplay</code> su macOS/iOS,{" "}
        <code className="text-perry-400">invalidate()</code> su Android,{" "}
        <code className="text-perry-400">gtk_widget_queue_draw</code> su Linux.
      </p>
      <p>
        Non c&apos;è nessun diffing del virtual DOM, nessun passaggio di riconciliazione, nessuna serializzazione. Le modifiche
        dello stato si propagano direttamente al widget nativo che visualizza il valore.
      </p>

      <h2>Perché non una sintassi SwiftUI / Jetpack Compose?</h2>
      <p>
        Potresti chiederti perché Perry non usa una sintassi dichiarativa simile a SwiftUI o
        Jetpack Compose. La risposta è pragmatica: Perry compila TypeScript, e TypeScript
        ha i suoi idiomi. Piuttosto che inventare un DSL che sembra estraneo agli sviluppatori
        TypeScript, Perry usa un&apos;API in stile builder che risulta naturale in TypeScript — costruttori,
        chiamate a metodi, callback e closure. Sono gli stessi pattern che già usi quando
        lavori con Express, gli hook di React o qualsiasi altra libreria TypeScript.
      </p>

      <h2>Cosa è disponibile oggi</h2>
      <p>
        Tutti e sei i backend delle piattaforme sono implementati e stabili. Il set di widget attuale include:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Layout</strong> — VStack, HStack, Spacer, ScrollView, Divider</li>
        <li><strong>Visualizzazione</strong> — Text, Image</li>
        <li><strong>Input</strong> — Button, TextField, Toggle, Slider</li>
        <li><strong>Navigazione</strong> — NavigationView, TabView, List</li>
        <li><strong>Contenitori</strong> — TreeView, SearchBar, StatusBar</li>
        <li><strong>Stato</strong> — State&lt;T&gt; per aggiornamenti reattivi</li>
      </ul>

      <h2>Cosa arriverà</h2>
      <p>
        Stiamo attivamente espandendo la libreria di widget. Prossimamente:
      </p>
      <ul className="list-disc list-inside">
        <li><code className="text-perry-400">SecureField</code> — input password con inserimento testo sicuro nativo della piattaforma</li>
        <li><code className="text-perry-400">ProgressView</code> — indicatori di progresso determinati e indeterminati</li>
        <li><code className="text-perry-400">Alert</code> — finestre di dialogo native con pulsanti e campi di testo</li>
        <li><code className="text-perry-400">DatePicker</code> — selezione data/ora nativa della piattaforma</li>
        <li><code className="text-perry-400">Menu</code> — barre dei menu native e menu contestuali</li>
      </ul>
      <p>
        L&apos;obiettivo è la parità completa del framework GUI su tutte le piattaforme — ogni widget, layout,
        gesture e animazione disponibile ovunque. Consulta la{" "}
        <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">roadmap</Link> per il
        quadro completo.
      </p>

      <h2>Provalo</h2>
      <p>
        Il modo migliore per capire l&apos;UI nativa di Perry è vederla in azione.{" "}
        <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">Pry</Link> è un visualizzatore
        JSON nativo costruito interamente in TypeScript con Perry — un&apos;app reale con navigazione ad albero,
        ricerca e scorciatoie da tastiera, compilata in binari nativi su macOS, iOS e Android.
        Leggi la{" "}
        <Link href="/blog/building-pry" className="text-perry-400 hover:text-perry-300">guida completa</Link>{" "}
        su come è stato costruito.
      </p>
    </>
  );
}
