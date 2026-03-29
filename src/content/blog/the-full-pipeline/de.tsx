import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        82 Commits in sieben Tagen. Eine Dokumentationsseite mit 49 Seiten. Automatisierte App Store und Play Store-Veröffentlichung. Homebrew- und APT-Pakete. Native WidgetKit-Erweiterungen, kompiliert aus TypeScript. Ein Self-Hosting-LLVM-Compiler. Und Dutzende von Bugfixes auf jeder Plattform.
      </p>
      <p>
        Dieser Beitrag deckt alles ab, was bei Perry zwischen dem 6. und 13. März 2026 ausgeliefert wurde. Das Thema ist Vervollständigung — die Lücken zwischen &quot;Ich habe etwas TypeScript geschrieben&quot; und &quot;Meine App ist im App Store&quot; füllen.
      </p>

      <h2>docs.perryts.com</h2>
      <p>
        Perry hat jetzt eine richtige Dokumentationsseite. 49 Seiten, gebaut mit mdBook, die alles von den ersten Schritten bis zur CLI-Referenz abdecken. Die Docs sind in Abschnitte gegliedert:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Erste Schritte</strong> — Installation, erstes Projekt, Projektstruktur</li>
        <li><strong>Sprachfeatures</strong> — alles, was Perry von TypeScript unterstützt</li>
        <li><strong>Native UI</strong> — 12 Seiten über alle Widget-Typen, Layout, State Management und plattformspezifisches Verhalten</li>
        <li><strong>Plattformen</strong> — dedizierte Seiten für jede der 6 Zielplattformen</li>
        <li><strong>Standardbibliothek</strong> — über 50 native Paketimplementierungen dokumentiert</li>
        <li><strong>System-APIs</strong> — Dateidialoge, Keychain, Benachrichtigungen, Multi-Window</li>
        <li><strong>WidgetKit</strong> — das neue Widget-Erweiterungsmodul</li>
        <li><strong>Plugins</strong> — Compile-Time-Plugin-Architektur</li>
        <li><strong>CLI-Referenz</strong> — jeder Befehl und jedes Flag</li>
      </ul>
      <p>
        Die Seite enthält auch eine <code className="text-amber-400">llms.txt</code>-Datei für KI-Auffindbarkeit und wird über GitHub Pages mit einer Custom Domain unter{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a> bereitgestellt.
      </p>

      <h2>Perry in einem Befehl installieren</h2>
      <p>
        Perry wird jetzt über Homebrew und APT verteilt, zusätzlich zum Bauen aus dem Quellcode. Eine neue GitHub Actions Release-Pipeline baut Binärdateien für macOS (arm64 und x86_64) und Linux (x86_64 und arm64) und aktualisiert dann automatisch den Homebrew-Tap und das APT-Repository.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500"># macOS</span></p>
          <p><span className="text-cyan-400">brew</span> tap PerryTS/perry</p>
          <p><span className="text-cyan-400">brew</span> install perry</p>
          <p className="mt-3"><span className="text-slate-500"># Debian/Ubuntu</span></p>
          <p><span className="text-cyan-400">sudo</span> apt update &amp;&amp; sudo apt install perry</p>
        </div>
      </div>

      <p>
        Kein Klonen des Repos und Bauen mit Cargo mehr. Installiere Perry genauso wie jedes andere Tool.
      </p>

      <h2>Automatisierte App Store-Veröffentlichung</h2>
      <p>
        Das ist die Änderung, die die meisten manuellen Schritte zusammenfasst. Das Ausführen von{" "}
        <code className="text-amber-400">perry publish ios</code> übernimmt jetzt automatisch die gesamte iOS-Verteilungspipeline:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>Generiert einen RSA-Schlüssel und CSR über die App Store Connect API</li>
        <li>Erstellt ein Verteilungszertifikat und bündelt es in eine <code className="text-amber-400">.p12</code></li>
        <li>Registriert die Bundle-ID</li>
        <li>Erstellt und lädt ein Provisioning-Profil herunter</li>
        <li>Erstellt den App Store Connect App-Eintrag</li>
        <li>Baut, signiert und lädt zu TestFlight oder dem App Store hoch</li>
      </ol>
      <p>
        Kein Xcode. Keine manuellen Portal-Besuche. Kein Herunterladen von Zertifikaten aus einem Browser. Der Setup-Assistent läuft automatisch beim ersten Veröffentlichen, führt durch die API-Schlüssel-Konfiguration und speichert Anmeldedaten in <code className="text-amber-400">perry.toml</code>.
      </p>
      <p>
        Die macOS-Distribution ist genauso automatisiert. Perry unterstützt drei Modi: TestFlight, notarisiertes DMG und einen neuen <strong>&quot;both&quot;</strong>-Modus, der im App Store veröffentlicht und gleichzeitig ein notarisiertes DMG erstellt. Drei Zertifikatstypen werden automatisch generiert:{" "}
        <code className="text-amber-400">MAC_APP_DISTRIBUTION</code>,{" "}
        <code className="text-amber-400">MAC_INSTALLER_DISTRIBUTION</code> und{" "}
        <code className="text-amber-400">DEVELOPER_ID_APPLICATION</code>.
      </p>
      <p>
        Die Android-Veröffentlichung erhielt ebenfalls einen automatisch ausgelösten Setup-Assistenten. Alle drei Plattformen folgen jetzt demselben Muster: Erster Lauf löst Setup aus, Anmeldedaten werden im Projekt gespeichert, nachfolgende Läufe sind ohne Konfiguration.
      </p>
      <p>
        Die Pre-Flight-Validierung fängt Probleme vor dem Build ab — Provisioning-Profil Bundle-ID-Mismatch, Zertifikatsablauf, fehlendes App-Icon, ungültiges Versionsformat, falsche Team-ID. Und <code className="text-amber-400">encryption_exempt</code> in{" "}
        <code className="text-amber-400">perry.toml [ios]</code> setzt automatisch den <code className="text-amber-400">ITSAppUsesNonExemptEncryption</code> Info.plist-Schlüssel und überspringt die manuelle Export-Compliance-Abfrage in App Store Connect.
      </p>

      <h2>perry/widget: WidgetKit aus TypeScript</h2>
      <p>
        Perry kann jetzt TypeScript zu nativen SwiftUI WidgetKit-Erweiterungen kompilieren. Das ist kein Wrapper oder Bridge — der Compiler durchläuft den Render-Baum auf HIR-Ebene und gibt SwiftUI-Quellcode direkt aus. Das Ergebnis ist ein vollständiges WidgetKit-Extension-Bundle, das Xcode (oder Perrys Build-Pipeline) in deine App einbetten kann.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-cyan-400">perry</span> widget.ts --target ios-widget --app-bundle-id com.example.app -o out/</p>
        </div>
      </div>

      <p>
        Der Ansatz unterscheidet sich grundlegend vom Rest der Perry-Kompilierung. Normaler Perry-Code geht durch Cranelift zu nativem Maschinencode. Widget-Code geht durch die HIR zu SwiftUI-Textausgabe, weil WidgetKit SwiftUI erfordert — es gibt keine Möglichkeit, eine Widget-Erweiterung mit imperativem UIKit- oder AppKit-Code zu bauen. Perry löst dies, indem es den Widget-Render-Baum als Compile-Time-Template behandelt, nicht als Runtime-Code.
      </p>

      <h2>Neue Widgets und Plattform-Verbesserungen</h2>
      <p>
        Vier neue Widget-Typen landeten diese Woche:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>TextArea</strong> — mehrzeilige Textbearbeitung auf macOS, iOS und Android</li>
        <li><strong>SecureField</strong> — Passworteingabe auf iOS und macOS</li>
        <li><strong>QR Code</strong> — native QR-Code-Generierung auf iOS, macOS und Android</li>
        <li><strong>Splash Screen</strong> — automatisch generierte LaunchScreen-Storyboards (iOS) und Splash-Themes (Android)</li>
      </ul>

      <h3>iPad wird nativ</h3>
      <p>
        Perry generiert jetzt vollständig iPad-native Apps: <code className="text-amber-400">UIDeviceFamily [1,2]</code>, Orientierungsunterstützung, <code className="text-amber-400">UIRequiresFullScreen</code> und ein kompiliertes LaunchScreen-Storyboard über ibtool. Eine neue <code className="text-amber-400">getDeviceIdiom()</code>-Funktion erkennt zur Laufzeit Phone vs. iPad, und <code className="text-amber-400">PerryFrameSplit</code> bietet frame-basierte horizontale Split-Container für iPad-Layouts.
      </p>

      <h3>Windows</h3>
      <p>
        Windows bekam Timer-Unterstützung (50ms <code className="text-amber-400">WM_TIMER</code>-Tick), owner-drawn Buttons mit Dark-Theme-Hintergründen und Fixes für einen Use-After-Free-Bug in <code className="text-amber-400">to_wide().as_ptr()</code> über 18 Widget-Dateien. Die V8-Runtime funktioniert jetzt unter Windows mit den erforderlichen verlinkten Systembibliotheken.
      </p>

      <h3>GTK4 (Linux)</h3>
      <p>
        Das GTK4-Backend erhielt visuelles Polishing passend zu macOS: CSS-Padding für Edge-Insets, Adwaita-Button-Styling, VStack-Margin-Fixes und ScrollView-Horizontal-Policy.
      </p>

      <h2>http/https und better-sqlite3</h2>
      <p>
        Zwei bedeutende stdlib-Ergänzungen:
      </p>
      <p>
        Die neuen nativen Module <code className="text-amber-400">http</code> und <code className="text-amber-400">https</code> bieten clientseitiges HTTP mit reqwest unter der Haube. Die API entspricht Node.js: <code className="text-amber-400">request()</code>, <code className="text-amber-400">get()</code>, <code className="text-amber-400">ClientRequest</code> mit write/end/on und <code className="text-amber-400">IncomingMessage</code> mit statusCode und Event-Handlern.
      </p>
      <p>
        <code className="text-amber-400">better-sqlite3</code> wird jetzt vollständig unterstützt: <code className="text-amber-400">new Database()</code>, <code className="text-amber-400">prepare</code>, <code className="text-amber-400">exec</code>, <code className="text-amber-400">run</code>, <code className="text-amber-400">get</code>, <code className="text-amber-400">all</code> — mit korrektem NaN-Boxing und Zeilenobjekten mit benanntem Property-Zugriff.
      </p>
      <p>
        Weitere stdlib-Verbesserungen: <code className="text-amber-400">crypto.randomBytes()</code> gibt jetzt einen Buffer zurück (entspricht Node.js), MongoDB erhielt <code className="text-amber-400">listDatabases</code> und <code className="text-amber-400">listCollections</code> mit Thread-Safety-Fixes, und mysql2 INSERT/UPDATE/DELETE gibt jetzt <code className="text-amber-400">ResultSetHeader</code> mit <code className="text-amber-400">insertId</code> zurück.
      </p>

      <h2>GC- und Korrektheitsfixes</h2>
      <p>
        Mehrere kritische Garbage-Collector- und Runtime-Korrektheitsfixes wurden diese Woche ausgeliefert:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GC-Reentrancy-Guard</strong> — verhindert Collection während der Allokation, behebt RefCell Double-Borrow Panics</li>
        <li><strong>GC Map-Tracing</strong> — Maps werden jetzt während der Mark-Phase korrekt getrasst, verhindert String-Key-Collection</li>
        <li><strong>String-Aliasing-Fix</strong> — String-Append allokiert jetzt immer frische Strings, behebt Korruption durch Pointer-Copy-Aliasing</li>
        <li><strong>BigInt-Arithmetik</strong> — Right-Shift verwendet arithmetischen Shift für negative Zahlen, Bitwise-Ops verwenden ToInt32-Wrapping-Semantik</li>
        <li><strong>Map.get() undefined</strong> — gibt korrektes <code className="text-amber-400">TAG_UNDEFINED</code> für fehlende Schlüssel zurück statt falschem NaN-Tag</li>
        <li><strong>Statische Feld-GC-Roots</strong> — BigInt-Werte in statischen Klassenfeldern als GC-Roots registriert</li>
      </ul>
      <p>
        Das sind keine Kleinigkeiten. Der GC-Reentrancy-Fix allein löste eine ganze Klasse von intermittierenden Abstürzen. Der String-Aliasing-Fix betraf jedes Programm, das eine String-Variable einer anderen zuwies und dann eine davon mutierte. Das sind die Art von Bugs, die erst unter realen Arbeitslasten auftreten, und sie zu beheben macht den Compiler produktionsreif.
      </p>

      <h2>perry-verify: Gehärtet</h2>
      <p>
        <code className="text-amber-400">perry-verify</code>, der automatisierte App-Verifizierungsservice, erhielt eine Sicherheitshärtung: sandboxed Ausführung über <code className="text-amber-400">bwrap</code> auf Linux und <code className="text-amber-400">sandbox-exec</code> auf macOS, Auth-Tokens bei WebSocket-Handshake und Binary-Download, Per-IP Rate-Limiting, vollständige UUID-Job-IDs zur Verhinderung von Enumeration und reduzierte Body-Limits.
      </p>

      <h2>perrysdad: Der Self-Hosting-Compiler</h2>
      <p>
        In einer parallelen Anstrengung ging <code className="text-amber-400">perrysdad</code> — ein Self-Hosting LLVM IR-Compiler, geschrieben in TypeScript — in fünf Phasen über die Woche von null zur Self-Compilation:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li><strong>Phase 0-1</strong> — End-to-End-Skelett: HIR zu LLVM IR-Text zu clang, gelinkt gegen Perrys <code className="text-amber-400">libperry_runtime.a</code></li>
        <li><strong>Phase 2</strong> — handgeschriebener rekursiver Abstiegsparser mit Pratt-Expression-Parsing für echte <code className="text-amber-400">.ts</code>-Dateien</li>
        <li><strong>Phase 3</strong> — Arrays, Objekte und Maps mit Runtime-FFI, plus Behebung eines kritischen ABI-Mismatches (JSValue als double in LLVM IR deklariert statt i64)</li>
        <li><strong>Phase 4</strong> — Klassen, Enums, Closures, Multi-File-Compilation mit Modul-Discovery und topologischer Sortierung</li>
      </ol>
      <p>
        Der Meilenstein: die selbst-kompilierte <code className="text-amber-400">anvil</code>-Binärdatei kann jetzt Testprogramme kompilieren und korrekte Ausgaben produzieren, die mit der node-kompilierten Version übereinstimmen. Ein TypeScript-Compiler, kompiliert von Perry zu nativem Code, der weiteres TypeScript zu nativem Code kompiliert. Schildkröten bis ganz nach unten.
      </p>

      <h2>In Zahlen</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>82 Commits</strong> zum Haupt-Perry-Compiler</li>
        <li><strong>1 Release</strong>: v0.2.173 (8. März)</li>
        <li><strong>49 Dokumentationsseiten</strong> auf docs.perryts.com</li>
        <li><strong>4 neue Widgets</strong>: TextArea, SecureField, QR Code, Splash Screen</li>
        <li><strong>3 Vertriebskanäle</strong>: Homebrew, APT, Quellcode</li>
        <li><strong>3 automatisierte Store-Pipelines</strong>: App Store, TestFlight, Google Play</li>
        <li><strong>Alle 6 Plattformen</strong> erhielten diese Woche Verbesserungen</li>
      </ul>

      <h2>Was kommt als Nächstes</h2>
      <p>
        Die Pipeline füllt sich. Du kannst TypeScript schreiben, auf sechs Plattformen kompilieren, über Homebrew oder APT verteilen, im App Store und Play Store veröffentlichen, Homescreen-Widgets hinzufügen und umfassende Dokumentation lesen — alles ohne Perrys Toolchain zu verlassen. Was bleibt:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Vollständige Regex-Unterstützung</strong> — die letzte große Sprachlücke</li>
        <li><strong>perry/ui-Erweiterung</strong> — Drag and Drop, Barrierefreiheitslabels, DatePicker</li>
        <li><strong>perrysdad-Reifung</strong> — den Self-Hosting-Compiler in Richtung voller Perry-Parität erweitern</li>
        <li><strong>Hub öffentliche Beta</strong> — verteilte Builds für externe Nutzer öffnen</li>
      </ul>
      <p>
        Verfolge den Fortschritt auf{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">GitHub</a>, lies die neue Dokumentation auf{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>, oder sieh dir die{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">Roadmap</Link>
        {" "}für das vollständige Bild an.
      </p>
    </>
  );
}
