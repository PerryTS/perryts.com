import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Fünf Tage, 120 Commits, und Perry springt von v0.4.0 auf v0.4.24. Die Highlights: tvOS wird das 10. Kompilierungsziel, iOS- und macOS-Apps können jetzt vollständig unter Linux gebaut werden, perry login bringt nutzungsbasierte Abrechnung, und die Windows-UI erhält eine komplette Überarbeitung. Hier ist alles, was ausgeliefert wurde.
      </p>

      <h2>tvOS: Das 10. Kompilierungsziel</h2>
      <p>
        Perry kompiliert jetzt für Apple TV. Das tvOS-Ziel verwendet denselben SwiftUI-Renderer wie watchOS und teilt die datengesteuerte Architektur, bei der Perry einen UI-Baum erstellt und eine mitgelieferte Swift-Host-App diesen nativ rendert. Kombiniert mit der bestehenden <code>@perry/threads</code> WASM-Integration können tvOS-Apps rechenintensive Arbeitslasten im Hintergrund ausführen, während die Benutzeroberfläche reaktionsfähig bleibt.
      </p>
      <pre><code>{`# Für Apple TV kompilieren
perry compile main.ts --target tvos

# Auf tvOS-Simulator ausführen
perry run tvos`}</code></pre>
      <p>
        Damit steigt die Gesamtzahl der Ziele auf <strong>10</strong>: macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly und Web/JavaScript. Eine TypeScript-Codebasis, zehn native Ausgaben.
      </p>

      <h2>Cross-Kompilierung von iOS und macOS unter Linux</h2>
      <p>
        Perry kann jetzt iOS- und macOS-Binärdateien vollständig auf einem Linux-Rechner mit <code>ld64.lld</code> als Mach-O-Linker erstellen. Dies ist das fehlende Puzzlestück für vollautomatisiertes CI/CD — TypeScript auf einen Linux-Server pushen und signierte native Binärdateien für jede Apple-Plattform erhalten, ohne eine macOS-Build-Maschine.
      </p>
      <p>
        Um hierhin zu gelangen, musste eine Kaskade von Linker-Problemen gelöst werden:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Mach-O-Codegen-Triple</strong> — <code>aarch64-apple-macos</code> und <code>aarch64-apple-ios</code> Ziel-Triples für Cranelift hinzugefügt</li>
        <li><strong>Framework-Verlinkung</strong> — CoreGraphics, Metal, IOKit, DiskArbitration Framework-Suchpfade für Cross-Kompilierung</li>
        <li><strong><code>-lobjc</code></strong> — ObjC-Runtime-Symbole werden für alle Apple-Ziele benötigt</li>
        <li><strong>SDK-Version</strong> — <code>sdk_version 26.0</code> in ld64.lld (Apple erfordert iOS 18+)</li>
        <li><strong>Dead Stripping</strong> — <code>-dead_strip</code> statt <code>-Wl,-dead_strip</code> für den Mach-O-Linker</li>
        <li><strong>Runtime-Deduplizierung</strong> — doppelte <code>perry_runtime</code> aus UI-Static-Libs entfernen, um Link-Fehler zu vermeiden</li>
      </ul>
      <p>
        Kombiniert mit der bestehenden Linux → Windows Cross-Kompilierung (v0.2.195+) kann Perry jetzt <strong>von Linux aus zu jeder Plattform cross-kompilieren</strong> — iOS, macOS, Windows, Android, WASM und Web.
      </p>

      <h2>iOS App Store-Bereitschaft</h2>
      <p>
        Ein Hauptfokus dieses Zyklus lag darauf, Perry-kompilierte iOS-Apps vollständig App Store-konform zu machen:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Vollständige Info.plist</strong> — alle von Apple geforderten Schlüssel: <code>CFBundleIdentifier</code>, <code>CFBundleName</code>, <code>CFBundleShortVersionString</code>, <code>CFBundleVersion</code>, <code>UIDeviceFamily</code>, <code>UIRequiredDeviceCapabilities</code></li>
        <li><strong>CFBundleIcons</strong> — Standard-iOS-Icon-Benennung (<code>AppIcon60x60@2x</code>, etc.) mit Fallback-Auflösung</li>
        <li><strong>Version aus perry.toml</strong> — <code>version</code>- und <code>build_number</code>-Felder fließen direkt in die Info.plist</li>
        <li><strong>UILaunchScreen</strong> — verwendet den modernen Schlüssel statt <code>UILaunchStoryboardName</code> (keine Storyboard-Datei nötig)</li>
        <li><strong>Provisioning-Profile</strong> — macOS-Provisioning-Profile-Unterstützung für App Store und TestFlight-Distribution</li>
      </ul>

      <h2>Perry Login und Abrechnung</h2>
      <p>
        Perry hat jetzt Benutzerkonten und nutzungsbasierte Abrechnung, angetrieben durch einen neuen <code>perry login</code> CLI-Befehl und ein Dashboard unter <a href="https://app.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">app.perryts.com</a>.
      </p>
      <h3>So funktioniert es</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry login</code></strong> — GitHub OAuth Device Flow, öffnet den Browser, fragt den Abschluss ab</li>
        <li><strong>Kostenlose Stufe</strong> — 15 Builds/Monat, unbegrenzte Projekte mit einem GitHub-Konto</li>
        <li><strong>Pro-Stufe</strong> — unbegrenzte Builds über Polar.sh-Abonnement</li>
        <li><strong>API-Tokens</strong> — Tokens im Dashboard für CI/CD generieren und verwalten</li>
        <li><strong>Nutzungsverfolgung</strong> — monatliche Publish- und Verify-Zähler mit Echtzeit-Nutzungsbalken</li>
      </ul>
      <p>
        Das Dashboard selbst ist ein Perry-kompilierter Fastify-Server mit Next.js-Static-Export — gebaut mit Perry, für Perry-Nutzer.
      </p>

      <h2>macOS-Notarisierung und Code-Signierung</h2>
      <p>
        Zwei neue Signierungsfähigkeiten:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry publish macos --notarize</code></strong> — wechselt automatisch zum Developer ID-Zertifikat (statt App Store-Zertifikat), reicht bei Apples Notarisierungsdienst ein und heftet das Ergebnis an</li>
        <li><strong>GCloud KMS Code-Signierung</strong> — Windows-Builds können jetzt mit Google Cloud KMS-Schlüsseln signiert werden, was automatisierte Signierung im CI ermöglicht, ohne private Schlüssel preiszugeben</li>
      </ul>

      <h2>Windows-UI-Überarbeitung</h2>
      <p>
        Das Windows-UI-Backend erhielt sein bisher umfassendstes Update:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>DPI-bewusste Skalierung</strong> — Fenstergröße, Schriften und Widget-Dimensionen skalieren korrekt auf High-DPI-Displays</li>
        <li><strong>Launcher-Fenster-APIs</strong> — rahmenlose Fenster mit benutzerdefinierter Positionierung für Launcher-/Spotlight-artige UIs</li>
        <li><strong>Globale Hotkeys</strong> — systemweite Tastenkombinationen, die auch funktionieren, wenn die App nicht fokussiert ist</li>
        <li><strong>App-Icons</strong> — <code>getAppIcon</code>-API zum Anzeigen von Anwendungssymbolen in Launcher-UIs</li>
        <li><strong>Reentrancy-sicheres Layout</strong> — <code>RefCell</code>-basiertes Painting wurde durch <code>SetPropW</code> HWND-Speicher ersetzt, um Panics bei verschachtelten WM_PAINT-Nachrichten zu verhindern</li>
        <li><strong>Geisterhand-Integration</strong> — alle Widget-Typen beim UI-Testing-Framework registriert, <code>/type</code> verwendet <code>SendMessageW</code> über HWND-Map</li>
        <li><strong>Android-Kamera-Unterstützung</strong> — Kamera-Capture-API auf Android über JNI erweitert</li>
      </ul>

      <h2>Performance</h2>
      <p>
        v0.4.14 lieferte ein umfassendes Performance-Audit:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Native <code>fcmp</code></strong> — Gleitkommavergleiche verwenden native CPU-Instruktionen statt Runtime-Funktionsaufrufe. Mandelbrot-Benchmark <strong>30 % schneller</strong>.</li>
        <li><strong>In-Place String-Append</strong> — <code>str += &quot;text&quot;</code> modifiziert den Puffer direkt, statt einen neuen String zu allokieren. <strong>125x schneller</strong> für wiederholte Verkettung.</li>
        <li><strong>Kurzschluss-AND/OR</strong> — <code>&amp;&amp;</code> und <code>||</code> überspringen die Auswertung des rechten Operanden, wenn das Ergebnis bereits feststeht.</li>
        <li><strong>Negatives Literal-Folding</strong> — <code>-1</code>, <code>-0.5</code> usw. werden auf HIR-Ebene zu Konstanten gefaltet, anstatt eine Negationsinstruktion auszugeben.</li>
      </ul>

      <h2>Hub Parallele Builds</h2>
      <p>
        Der Build-Orchestrierungsserver unterstützt jetzt parallele Builds pro Worker:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Slot-basierte Verteilung</strong> — Worker melden <code>max_concurrent</code>-Kapazität, Hub verfolgt aktive Jobs pro Worker</li>
        <li><strong>Keine 429er mehr</strong> — Jobs werden in eine Warteschlange gestellt, anstatt abgelehnt zu werden, wenn alle Worker beschäftigt sind</li>
        <li><strong>Base64-Artefakt-Downloads</strong> — binäre Artefakte werden als Base64 bereitgestellt, wenn die Perry-Runtime keine rohen binären HTTP-Antworten verarbeiten kann</li>
        <li><strong>Auto-Reconnect WebSocket</strong> — Build-Monitoring-Verbindungen verbinden sich automatisch bei Unterbrechung wieder</li>
      </ul>

      <h2>Neues Paket: perry/appstorereview</h2>
      <p>
        Ein neues First-Party-Paket zum Anfordern von App Store-Bewertungen:
      </p>
      <pre><code>{`import { requestReview } from "perry/appstorereview";

// Öffnet den nativen Bewertungsdialog
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();`}</code></pre>
      <p>
        Eine Funktion, zwei Plattformen, native Bewertungs-UI. Timing und Anzeigelogik bleiben vollständig dem Entwickler überlassen.
      </p>

      <h2>Codegen-Fixes</h2>
      <p>
        120 Commits bedeuten viele Bugfixes. Die wichtigsten:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Strikte Gleichheit (===)</strong> — drei separate Bugs in v0.4.2 behoben: Type-Tag-Vergleich, NaN-Behandlung und null/undefined-Unterscheidung</li>
        <li><strong>String-Vergleich für verkettete Strings</strong> — <code>===</code> schlug fehl beim Vergleich von durch Verkettung erstellten Strings aufgrund von Pointer-Vergleich statt Inhaltsvergleich</li>
        <li><strong>Konstruktor-Auflösung</strong> — <code>new X(args)</code> löst jetzt korrekt modulübergreifend importierte Konstruktoren und Closure-basierte Konstruktorfunktionen auf</li>
        <li><strong>Modul-Level Array-Push</strong> — Werte, die in verschachtelten Funktionsaufrufen in Schleifen an Modul-Level-Arrays gepusht wurden, gingen aufgrund veralteter Pointer nach Reallokierung verloren</li>
        <li><strong>Null-Arithmetik-Koercion</strong> — <code>null + 1</code> ergibt jetzt korrekt <code>1</code> über <code>js_number_coerce</code></li>
        <li><strong>Bitweises NOT-Wrapping</strong> — <code>~x</code> wird jetzt gemäß ECMAScript-Semantik auf i32 gewrappt</li>
        <li><strong>fetch().then()</strong> — Callbacks wurden in nativen UI-Apps nie ausgelöst, weil die Event-Loop-Abarbeitung fehlte (v0.4.3)</li>
        <li><strong>WASM Modulo und Exponent</strong> — <code>%</code> und <code>**</code> Operatoren verursachten WASM-Validierungsfehler (v0.4.5)</li>
      </ul>

      <h2>In Zahlen</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>~120 Commits</strong> zum Haupt-Perry-Compiler in 5 Tagen</li>
        <li><strong>24 Patch-Releases</strong>: v0.4.1 → v0.4.24</li>
        <li><strong>Kompilierungsziele</strong>: 9 → 10 (tvOS hinzugefügt)</li>
        <li><strong>Cross-Compile-Ziele von Linux</strong>: Windows → Windows, iOS, macOS (alle Apple + Windows)</li>
        <li><strong>Neue Pakete</strong>: perry/appstorereview</li>
        <li><strong>Neue Infrastruktur</strong>: app.perryts.com Dashboard, perry login CLI, Polar.sh-Abrechnung</li>
        <li><strong>Performance-Gewinne</strong>: 30 % schnellerer Mandelbrot (natives fcmp), 125x schnellere String-Verkettung</li>
      </ul>

      <h2>Was kommt als Nächstes</h2>
      <p>
        Cross-Kompilierung von iOS und macOS unter Linux bedeutet, dass der Hub jetzt für jede Plattform von einem einzigen Linux-Server aus bauen kann — keine dedizierten macOS-Build-Maschinen mehr für die Kompilierung (nur noch für die Signierung). Die Abrechnungsinfrastruktur ebnet den Weg zur öffentlichen Hub-Beta. Und mit tvOS deckt Perry jede Apple-Plattform ab: macOS, iOS, iPadOS, watchOS und tvOS.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Öffentliche Hub-Beta</strong> — externe Nutzer können TypeScript pushen und native Binärdateien erhalten</li>
        <li><strong>Vollständige Regex-Unterstützung</strong> — die letzte große Sprachlücke</li>
        <li><strong>perry/ui-Erweiterung</strong> — Drag and Drop, Barrierefreiheit, DatePicker</li>
        <li><strong>Source Maps &amp; Debug-Info</strong> — DWARF Debug-Informationen für natives Debugging</li>
      </ul>
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
