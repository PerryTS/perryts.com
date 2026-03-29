import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Perry v0.4.0 ist das größte Release seit Projektbeginn. Drei Versionssprünge in einem Zyklus — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (Multi-Threading) — und der Compiler selbst ist jetzt parallel. Hier ist alles, was ausgeliefert wurde.
      </p>

      <h2>Echtes Multi-Threading</h2>
      <p>
        Perry hat jetzt echte OS-Thread-basierte Parallelität. Keine Web Worker mit Serialisierungs-Overhead. Kein <code>SharedArrayBuffer</code> mit <code>Atomics</code>. Echte Threads — leichtgewichtige 8MB-Stack-OS-Threads, die nichts teilen und nichts kosten, wenn sie idle sind.
      </p>
      <p>
        Das neue <code>perry/thread</code>-Modul bietet drei Primitive:
      </p>
      <pre><code>{`import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Arbeit auf alle CPU-Kerne verteilen, Ergebnisse in Reihenfolge
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Parallel filtern
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Hintergrund-Thread starten, Promise erhalten
const result = await spawn(() => {
  // läuft auf einem separaten OS-Thread
  return computeExpensiveResult();
});`}</code></pre>
      <p>
        <code>parallelMap</code> und <code>parallelFilter</code> erkennen automatisch die Anzahl der CPU-Kerne und verteilen das Eingabe-Array darauf. Bei kleinen Arrays wird Threading komplett übersprungen und synchron ausgeführt — kein Overhead für triviale Arbeitslasten.
      </p>
      <p>
        <code>spawn</code> startet einen Hintergrund-OS-Thread und gibt ein Promise zurück. Das Ergebnis fließt über eine ausstehende Ergebnis-Warteschlange zurück, die während der Microtask-Verarbeitung geleert wird, sodass man es wie jede andere asynchrone Operation mit <code>await</code> behandeln kann.
      </p>

      <h3>Compile-Time-Sicherheit</h3>
      <p>
        Der wichtigste Teil ist nicht die API — es ist das, was der Compiler <em>verhindert</em>. Perry lehnt statisch Closures ab, die veränderbare Variablen erfassen:
      </p>
      <pre><code>{`let counter = 0;

// ✗ Kompilierfehler: Closure erfasst veränderbare Variable 'counter'
parallelMap(items, (item) => {
  counter++;  // zur Kompilierzeit abgelehnt
  return item * 2;
});`}</code></pre>
      <p>
        Kein geteilter veränderbarer Zustand bedeutet keine Data Races. Keine Locks, keine Mutexes, keine <code>Atomics</code>. Der Compiler erzwingt Thread-Sicherheit, bevor eine einzige Zeile Maschinencode erzeugt wird.
      </p>

      <h3>Unter der Haube</h3>
      <p>
        Jeder Worker-Thread bekommt seine eigene Speicher-Arena mit <code>Drop</code>-Bereinigung — keine GC-Koordination zwischen Threads. Werte werden über <code>SerializedValue</code>-Tiefkopie übertragen: kostenfrei für Zahlen, O(n) für Strings, Arrays und Objekte. Die Implementierung lebt in einer einzigen 1.120-Zeilen Rust-Datei (<code>perry-runtime/src/thread.rs</code>) und erforderte keine Änderungen am Garbage Collector.
      </p>
      <p>
        Vergleich zu V8-Isolates, die separate Heaps pro Worker mit ~2MB Overhead benötigen. Perrys Threads sind einfach pthreads mit Arenas.
      </p>

      <h3>Parallele Compiler-Pipeline</h3>
      <p>
        Auch der Compiler selbst ist jetzt parallel. Modul-Codegen, Transform-Passes (JS-Imports, native Instanzen, Monomorphisierung) und <code>nm</code>-Symbolscannen laufen alle über alle CPU-Kerne via rayon. Kombiniert mit dem Cranelift 0.121 Upgrade (von 0.113 — acht Minor-Versionen mit Register-Allokation- und x64-Verbesserungen) ist die Kompilierung deutlich schneller.
      </p>

      <h2>Compile-Time i18n (v0.3.0)</h2>
      <p>
        Perrys Internationalisierungssystem hat null Zeremonie. String-Literale in UI-Widgets werden automatisch als lokalisierbare Schlüssel behandelt. Übersetzungsdateien sind flache JSON-Dateien in einem <code>locales/</code>-Verzeichnis. Alle Validierung erfolgt zur Kompilierzeit.
      </p>
      <pre><code>{`// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Dein Code — verwende Strings einfach normal
Button({ title: "greeting", action: () => {} })`}</code></pre>
      <p>
        Der Compiler validiert alles: fehlende Übersetzungen, Parameter-Unstimmigkeiten, Plural-Fehler. Übersetzungen werden als eingebettete 2D-String-Tabelle in die Binärdatei eingebettet, mit nahezu null Runtime-Lookup — kein JSON-Parsing beim Start.
      </p>

      <h3>Was enthalten ist</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>CLDR-Pluralregeln</strong> für 30+ Locales mit <code>.one</code>/<code>.other</code>/<code>.few</code>/<code>.many</code>/<code>.zero</code>/<code>.two</code>-Suffixen</li>
        <li><strong>Format-Wrapper</strong>: <code>Currency</code>, <code>Percent</code>, <code>ShortDate</code>, <code>LongDate</code>, <code>FormatNumber</code>, <code>FormatTime</code>, <code>Raw</code></li>
        <li><strong>Native Locale-Erkennung</strong> auf allen Plattformen: <code>CFLocaleCopyCurrent</code> (macOS/iOS), <code>GetUserDefaultLocaleName</code> (Windows), <code>system_property_get</code> (Android), <code>LANG</code>/<code>LC_ALL</code> (Linux)</li>
        <li><strong><code>perry i18n extract</code></strong> CLI: scannt TS/TSX-Dateien, generiert und aktualisiert Locale-JSON-Gerüste</li>
        <li><strong>Plattform-native Ressourcengenerierung</strong>: iOS <code>.lproj</code> und Android <code>values-xx/</code> Verzeichnisse</li>
        <li><strong><code>import {`{ t }`} from &quot;perry/i18n&quot;</code></strong> für die Lokalisierung von Nicht-UI-Strings</li>
      </ul>
      <p>
        Konfiguration in <code>perry.toml</code>:
      </p>
      <pre><code>{`[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }`}</code></pre>

      <h2>Native watchOS-Apps (v0.3.2)</h2>
      <p>
        Perry kompiliert jetzt für watchOS — das 9. Kompilierungsziel. Das ist kein Wrapper oder eine Companion-App. Es ist eine eigenständige watchOS-Binärdatei mit einer nativen SwiftUI-Oberfläche.
      </p>
      <p>
        Der watchOS-Renderer verwendet einen <strong>datengesteuerten Ansatz</strong>: Perry erstellt einen UI-Baum über <code>perry_ui_*</code> FFI-Aufrufe, und eine mitgelieferte <code>PerryWatchApp.swift</code> fragt den Baum ab und rendert SwiftUI-Views reaktiv. 15 Widget-Typen werden unterstützt, mit Stubs für nicht unterstützte.
      </p>
      <pre><code>{`# Für watchOS kompilieren
perry compile main.ts --target watchos

# Auf Apple Watch Simulator ausführen
perry run watchos

# Signierung für watchOS einrichten
perry setup watchos`}</code></pre>
      <p>
        Der vollständige Ablauf funktioniert: <code>perry setup watchos</code> teilt App Store Connect-Anmeldedaten mit iOS, <code>perry run watchos</code> erkennt automatisch Apple Watch-Simulatoren, und <code>perry publish watchos</code> reicht beim App Store ein.
      </p>
      <p>
        Damit steigt die Gesamtzahl der <strong>Widget-Ziele auf vier</strong>: iOS (WidgetKit), Android (Glance), watchOS (WidgetKit) und Wear OS (Tiles). Jedes hat sein eigenes Compile-Target und Codegen-Backend.
      </p>

      <h2>Audio- &amp; Kamera-APIs</h2>
      <p>
        Zwei neue Hardware-APIs werden in diesem Release ausgeliefert:
      </p>
      <h3>Audio-Aufnahme (<code>perry/system</code>)</h3>
      <p>
        Plattformübergreifende Audio-Aufnahme mit A-bewerteter dB(A)-Messung:
      </p>
      <pre><code>{`import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) mit EMA-Glättung
const waveform = audioGetWaveformSamples();  // 256-Sample Ringpuffer
audioStop();`}</code></pre>
      <p>
        Plattform-Backends: AVAudioEngine (macOS/iOS), AudioRecord über JNI (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web).
      </p>
      <h3>Kamera-Aufnahme (<code>perry/ui</code>)</h3>
      <p>
        Native Kamera-Vorschau mit pixelgenauer Farbentnahme (iOS):
      </p>
      <pre><code>{`import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 Mittelwertbildung`}</code></pre>

      <h2>Ökosystem-Pakete</h2>
      <p>
        Zwei neue First-Party-Pakete:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/push</strong> — Push-Notification-Bindings für iOS/macOS: Berechtigungsanfragen, APNs-Token-Abruf, Badge-Zähler. Android-Stub mit FCM geplant.</li>
        <li><strong>perry/storekit</strong> — StoreKit 2 In-App-Kauf-Bindings: Produktladen, Käufe mit JWS-Quittungen, Abonnement-Prüfung, Wiederherstellung und Transaktions-Listener.</li>
      </ul>
      <p>
        Beide folgen derselben Architektur: TypeScript-Deklarationen → Rust FFI-Crate → Swift-Bridge. Als Abhängigkeit installieren, Funktionen importieren, Ergebnisse mit <code>await</code> abwarten. Der Compiler kümmert sich um alle nativen Bridges.
      </p>

      <h2>Infrastruktur</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Cranelift 0.113 → 0.121</strong> — acht Minor-Versionen mit Register-Allokation, x64-Fixes und Stack-Slot-Alignment-Verbesserungen</li>
        <li><strong>Windows-Funktionsaufteilung</strong> — teilt automatisch Funktionen mit 50+ Anweisungen in Fortsetzungen auf, um Cranelift-Codegen-Probleme unter Windows zu umgehen</li>
        <li><strong>Selektives Modul-Variablen-Laden</strong> — lädt nur referenzierte Modul-Level-Variablen beim Funktionseintritt, reduziert die Windows-Binärgröße um 26 %</li>
        <li><strong>Array.sort() Upgrade</strong> — von O(n²) Insertion Sort zu O(n log n) TimSort-Hybrid</li>
        <li><strong>perry run android</strong> — vollständige APK-Build-Pipeline: Kompilieren, Gradle-Projektgenerierung, assembleDebug, Installieren, Starten</li>
        <li><strong>Benutzerdefinierte Info.plist-Einträge</strong> — <code>[ios.info_plist]</code> in perry.toml für Datenschutzbeschreibungen, URL-Schemata, Hintergrundmodi</li>
      </ul>

      <h2>In Zahlen</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Version</strong>: 0.2.197 → 0.4.0 (drei große Meilensteine)</li>
        <li><strong>Kompilierungsziele</strong>: 8 → 9 (watchOS hinzugefügt)</li>
        <li><strong>Widget-Ziele</strong>: 1 → 4 (iOS, Android, watchOS, Wear OS)</li>
        <li><strong>Neue Crates</strong>: perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles</li>
        <li><strong>Neue Dokumentation</strong>: Threading (4 Seiten), i18n (4 Seiten), watchOS, erweiterte Widget-Docs (3 → 8 Seiten)</li>
        <li><strong>perry/thread Implementierung</strong>: 1.120 Zeilen Rust, null Änderungen am GC</li>
      </ul>

      <h2>Was kommt als Nächstes</h2>
      <p>
        Die Threading-Grundlage eröffnet vieles: parallele HTTP-Anfrageverarbeitung, gleichzeitige Dateioperationen und rechenintensive Arbeitslasten, die zuvor durch Single-Threaded-Ausführung blockiert waren. Auf der Sprachseite bleibt volle Regex-Unterstützung die größte Lücke, und die <code>perry/ui</code>-Erweiterung (Drag and Drop, Barrierefreiheit, DatePicker) geht weiter.
      </p>
      <p>
        Verfolge den Fortschritt auf{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, lies die Dokumentation auf{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>, oder sieh dir die{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">Roadmap</Link>
        {" "}für das vollständige Bild an.
      </p>
    </>
  );
}
