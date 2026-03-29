import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Perry v0.4.0 è il rilascio più grande dall&apos;inizio del progetto. Tre salti di versione in un ciclo — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (multi-threading) — e il compilatore stesso è ora parallelo. Ecco tutto ciò che è stato rilasciato.
      </p>

      <h2>Vero multi-threading</h2>
      <p>
        Perry ora ha un vero parallelismo con thread del sistema operativo. Non web worker con overhead di serializzazione. Non <code>SharedArrayBuffer</code> con <code>Atomics</code>. Veri thread — thread OS leggeri con stack da 8MB che non condividono nulla e non costano nulla quando inattivi.
      </p>
      <p>
        Il nuovo modulo <code>perry/thread</code> espone tre primitive:
      </p>
      <pre><code>{`import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Split work across all CPU cores, results in order
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filter in parallel
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Spawn a background thread, get a Promise
const result = await spawn(() => {
  // runs on a separate OS thread
  return computeExpensiveResult();
});`}</code></pre>
      <p>
        <code>parallelMap</code> e <code>parallelFilter</code> rilevano automaticamente il numero di core CPU e dividono l&apos;array di input tra essi. Per array piccoli, saltano completamente il threading e eseguono in modo sincrono — nessun overhead per carichi di lavoro banali.
      </p>
      <p>
        <code>spawn</code> lancia un thread OS in background e restituisce una Promise. Il risultato ritorna attraverso una coda di risultati pendenti che viene svuotata durante l&apos;elaborazione dei microtask, quindi si fa <code>await</code> come qualsiasi altra operazione asincrona.
      </p>

      <h3>Sicurezza a tempo di compilazione</h3>
      <p>
        La parte più importante non è l&apos;API — è ciò che il compilatore <em>previene</em>. Perry rifiuta staticamente le closure che catturano variabili mutabili:
      </p>
      <pre><code>{`let counter = 0;

// ✗ Compile error: closure captures mutable variable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejected at compile time
  return item * 2;
});`}</code></pre>
      <p>
        Nessuno stato mutabile condiviso significa nessuna data race. Nessun lock, nessun mutex, nessun <code>Atomics</code>. Il compilatore garantisce la sicurezza dei thread prima che una singola riga di codice macchina venga emessa.
      </p>

      <h3>Sotto il cofano</h3>
      <p>
        Ogni thread worker ottiene la propria arena di memoria con cleanup <code>Drop</code> — nessun coordinamento GC tra thread. I valori vengono trasferiti tramite deep-copy <code>SerializedValue</code>: zero-cost per i numeri, O(n) per stringhe, array e oggetti. L&apos;implementazione risiede in un singolo file Rust di 1.120 righe (<code>perry-runtime/src/thread.rs</code>) e non ha richiesto modifiche al garbage collector.
      </p>
      <p>
        Confrontalo con gli isolate V8, che richiedono heap separati per worker con ~2MB di overhead ciascuno. I thread di Perry sono semplicemente pthread con arena.
      </p>

      <h3>Pipeline del compilatore parallela</h3>
      <p>
        Anche il compilatore stesso è ora parallelo. La codegen dei moduli, i passaggi di trasformazione (import JS, istanze native, monomorfizzazione) e la scansione dei simboli <code>nm</code> vengono tutti eseguiti su tutti i core CPU tramite rayon. Combinato con l&apos;aggiornamento a Cranelift 0.121 (da 0.113 — otto versioni minori di miglioramenti all&apos;allocazione dei registri e x64), la compilazione è significativamente più veloce.
      </p>

      <h2>i18n a tempo di compilazione (v0.3.0)</h2>
      <p>
        Il sistema di internazionalizzazione di Perry ha zero cerimonia. I letterali stringa nei widget UI vengono automaticamente trattati come chiavi localizzabili. I file di traduzione sono JSON piatto in una directory <code>locales/</code>. Tutta la validazione avviene a tempo di compilazione.
      </p>
      <pre><code>{`// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Your code — just use strings normally
Button({ title: "greeting", action: () => {} })`}</code></pre>
      <p>
        Il compilatore valida tutto: traduzioni mancanti, mismatch di parametri, errori nelle forme plurali. Le traduzioni vengono integrate nel binario come tabella di stringhe 2D incorporata con lookup a runtime quasi zero — nessun parsing JSON all&apos;avvio.
      </p>

      <h3>Cosa è incluso</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Regole plurali CLDR</strong> per 30+ lingue con suffissi <code>.one</code>/<code>.other</code>/<code>.few</code>/<code>.many</code>/<code>.zero</code>/<code>.two</code></li>
        <li><strong>Wrapper di formato</strong>: <code>Currency</code>, <code>Percent</code>, <code>ShortDate</code>, <code>LongDate</code>, <code>FormatNumber</code>, <code>FormatTime</code>, <code>Raw</code></li>
        <li><strong>Rilevamento locale nativo</strong> su tutte le piattaforme: <code>CFLocaleCopyCurrent</code> (macOS/iOS), <code>GetUserDefaultLocaleName</code> (Windows), <code>system_property_get</code> (Android), <code>LANG</code>/<code>LC_ALL</code> (Linux)</li>
        <li><strong><code>perry i18n extract</code></strong> CLI: scansiona file TS/TSX, genera e aggiorna scaffold JSON per le lingue</li>
        <li><strong>Generazione risorse native della piattaforma</strong>: directory iOS <code>.lproj</code> e Android <code>values-xx/</code></li>
        <li><strong><code>import {`{ t }`} from &quot;perry/i18n&quot;</code></strong> per localizzare stringhe non-UI</li>
      </ul>
      <p>
        Configuralo in <code>perry.toml</code>:
      </p>
      <pre><code>{`[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }`}</code></pre>

      <h2>App native watchOS (v0.3.2)</h2>
      <p>
        Perry ora compila per watchOS — il 9° target di compilazione. Non è un wrapper o un&apos;app companion. È un binario watchOS standalone con un&apos;interfaccia SwiftUI nativa.
      </p>
      <p>
        Il renderer watchOS utilizza un <strong>approccio data-driven</strong>: Perry costruisce un albero UI tramite chiamate FFI <code>perry_ui_*</code>, e un <code>PerryWatchApp.swift</code> incluso interroga l&apos;albero e renderizza view SwiftUI in modo reattivo. 15 tipi di widget sono supportati con stub per quelli non supportati.
      </p>
      <pre><code>{`# Compile for watchOS
perry compile main.ts --target watchos

# Run on Apple Watch simulator
perry run watchos

# Setup signing for watchOS
perry setup watchos`}</code></pre>
      <p>
        Il flusso completo funziona: <code>perry setup watchos</code> condivide le credenziali App Store Connect con iOS, <code>perry run watchos</code> rileva automaticamente i simulatori Apple Watch e <code>perry publish watchos</code> invia all&apos;App Store.
      </p>
      <p>
        Questo porta anche il <strong>conteggio totale dei target widget a quattro</strong>: iOS (WidgetKit), Android (Glance), watchOS (WidgetKit) e Wear OS (Tiles). Ciascuno ha il proprio target di compilazione e backend di codegen.
      </p>

      <h2>API Audio e Camera</h2>
      <p>
        Due nuove API hardware in questo rilascio:
      </p>
      <h3>Cattura Audio (<code>perry/system</code>)</h3>
      <p>
        Cattura audio cross-platform con misurazione dB(A) pesata A:
      </p>
      <pre><code>{`import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) with EMA smoothing
const waveform = audioGetWaveformSamples();  // 256-sample ring buffer
audioStop();`}</code></pre>
      <p>
        Backend di piattaforma: AVAudioEngine (macOS/iOS), AudioRecord via JNI (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web).
      </p>
      <h3>Cattura Camera (<code>perry/ui</code>)</h3>
      <p>
        Anteprima camera nativa con campionamento colore a livello di pixel (iOS):
      </p>
      <pre><code>{`import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 averaging`}</code></pre>

      <h2>Pacchetti dell&apos;ecosistema</h2>
      <p>
        Due pacchetti nativi first-party lanciati:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/push</strong> — Binding per notifiche push per iOS/macOS: richieste di permesso, recupero token APNs, conteggio badge. Stub Android con FCM pianificato.</li>
        <li><strong>perry/storekit</strong> — Binding StoreKit 2 per acquisti in-app: caricamento prodotti, acquisti con ricevute JWS, verifica abbonamenti, ripristino e listener transazioni.</li>
      </ul>
      <p>
        Entrambi seguono la stessa architettura: dichiarazioni TypeScript → crate FFI Rust → bridge Swift. Installa come dipendenza, importa le funzioni, fai <code>await</code> dei risultati. Il compilatore gestisce tutto il bridging nativo.
      </p>

      <h2>Infrastruttura</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Cranelift 0.113 → 0.121</strong> — otto versioni minori di miglioramenti all&apos;allocazione dei registri, fix x64 e allineamento degli slot dello stack</li>
        <li><strong>Splitting funzioni Windows</strong> — divide automaticamente le funzioni con 50+ istruzioni in continuazioni per aggirare problemi di codegen Cranelift su Windows</li>
        <li><strong>Caricamento selettivo variabili modulo</strong> — carica solo le variabili a livello di modulo referenziate all&apos;ingresso della funzione, riducendo la dimensione del binario Windows del 26%</li>
        <li><strong>Aggiornamento Array.sort()</strong> — da insertion sort O(n&sup2;) a ibrido TimSort O(n log n)</li>
        <li><strong>perry run android</strong> — pipeline completa di build APK: compilazione, generazione progetto Gradle, assembleDebug, installazione, lancio</li>
        <li><strong>Voci Info.plist personalizzate</strong> — <code>[ios.info_plist]</code> in perry.toml per descrizioni privacy, URL scheme, modalità background</li>
      </ul>

      <h2>I numeri</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Versione</strong>: 0.2.197 → 0.4.0 (tre pietre miliari principali)</li>
        <li><strong>Target di compilazione</strong>: 8 → 9 (aggiunto watchOS)</li>
        <li><strong>Target widget</strong>: 1 → 4 (iOS, Android, watchOS, Wear OS)</li>
        <li><strong>Nuovi crate</strong>: perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles</li>
        <li><strong>Nuova documentazione</strong>: threading (4 pagine), i18n (4 pagine), watchOS, documentazione widget espansa (3 → 8 pagine)</li>
        <li><strong>Implementazione perry/thread</strong>: 1.120 righe di Rust, zero modifiche al GC</li>
      </ul>

      <h2>Prossimi passi</h2>
      <p>
        La base del threading apre molte possibilità: elaborazione parallela delle richieste HTTP, operazioni su file concorrenti e carichi di lavoro pesanti che erano precedentemente bloccati dall&apos;esecuzione single-threaded. Sul lato del linguaggio, il supporto completo alle regex rimane il gap più grande, e l&apos;espansione di <code>perry/ui</code> (drag and drop, accessibilità, DatePicker) continua.
      </p>
      <p>
        Segui i progressi su{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, leggi la documentazione su{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>, o consulta la{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">roadmap</Link>
        {" "}per il quadro completo.
      </p>
    </>
  );
}
