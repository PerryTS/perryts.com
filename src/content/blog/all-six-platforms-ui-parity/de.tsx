import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Als wir die erste Version von Perrys nativem UI-System ausgeliefert haben, bedeutete &quot;plattformübergreifend&quot;, dass macOS gut funktionierte und die anderen fünf Plattformen Stubs waren. Heute, mit v0.2.162, ist das nicht mehr der Fall. Alle sechs Plattformen — macOS, iOS, iPadOS, Android, Linux und Windows — haben jetzt vollständige Feature-Parität. Derselbe TypeScript-Code kompiliert auf jedem Ziel zu nativen Widgets.
      </p>
      <p>
        Dieser Beitrag geht durch, was wir zwischen v0.2.152 und v0.2.164 ausgeliefert haben: ein Canvas-Widget, eine vollständige NSTableView-Implementierung, über 20 UI-Widgets insgesamt, das{" "}
        <code className="text-amber-400">perry/system</code>-Modul, Multi-Window-Unterstützung, System-Benachrichtigungen, Keychain-Zugriff, automatische Binärgrößenreduzierung und ein Compile-Time-Plugin-System. Es ist viel passiert.
      </p>

      <h2>Der Widget-Sprint: Über 20 native UI-Komponenten</h2>
      <p>
        Der größte einzelne Sprung kam mit v0.2.155, das über 20 UI-Widgets auf allen Plattformen einführte. Perrys TypeScript-UI-API deckt jetzt die Komponenten ab, die man tatsächlich braucht, um eine echte App auszuliefern:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Layout</strong> — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView</li>
        <li><strong>Eingabe</strong> — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker</li>
        <li><strong>Anzeige</strong> — Text, Label, Image, ProgressView, Divider, Spacer</li>
        <li><strong>Daten</strong> — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)</li>
        <li><strong>Overlay</strong> — Alert, Sheet, Popover, Toolbar, NavigationBar</li>
        <li><strong>Zeichnung</strong> — Canvas (2D-Zeichen-API, hardwarebeschleunigt pro Plattform)</li>
      </ul>
      <p>
        Das sind keine Wrapper um einen benutzerdefinierten Renderer. Jedes Widget kompiliert zur plattformeigenen nativen Komponente: <code className="text-amber-400">NSButton</code> auf macOS,{" "}
        <code className="text-amber-400">UIButton</code> auf iOS,{" "}
        <code className="text-amber-400">GtkButton</code> auf Linux,{" "}
        <code className="text-amber-400">android.widget.Button</code> auf Android über JNI, und{" "}
        <code className="text-amber-400">CreateWindowEx</code> auf Windows. Das Betriebssystem zeichnet sie, gibt ihnen ein Theme und kümmert sich um Barrierefreiheit — Perry verdrahtet nur die TypeScript-API.
      </p>

      <h2>Canvas: 2D-Zeichnung aus TypeScript</h2>
      <p>
        Eine der technisch interessanteren Ergänzungen ist das Canvas-Widget (v0.2.152). Es bietet eine vertraute 2D-Zeichen-API direkt aus TypeScript — Bezier-Kurven, Füllungen, Striche, Bild-Blitting — und kompiliert zum beschleunigten 2D-Backend der Plattform: Core Graphics auf macOS/iOS, Cairo auf Linux, Direct2D auf Windows und Skia auf Android.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">canvas.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Canvas, Color }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3 text-slate-500">// Kompiliert zu Core Graphics auf macOS, Cairo auf Linux, etc.</p>
          <p><span className="text-blue-400">const</span> canvas = <span className="text-blue-400">new</span> <span className="text-amber-400">Canvas</span>({`{ width: 400, height: 300 }`});</p>
          <p className="mt-2">canvas.<span className="text-amber-400">onDraw</span>((ctx) =&gt; {`{`}</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillStyle</span> = Color.<span className="text-amber-400">amber</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillRect</span>(10, 10, 100, 60);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">strokeStyle</span> = Color.<span className="text-amber-400">blue</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">lineWidth</span> = 2;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">beginPath</span>();</p>
          <p className="ml-4">ctx.<span className="text-amber-400">arc</span>(200, 150, 80, 0, Math.<span className="text-amber-400">PI</span> * 2);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">stroke</span>();</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>Table-Widget: NSTableView kommt zu TypeScript</h2>
      <p>
        v0.2.163 brachte das Table-Widget — die komplexeste Komponente der Bibliothek. Auf macOS bildet es auf <code className="text-amber-400">NSTableView</code> mit vollständiger Delegate/Data-Source-Verdrahtung ab. Auf Linux verwendet es GTK4s <code className="text-amber-400">GtkTreeView</code>. Auf Windows Win32s <code className="text-amber-400">ListView</code>-Steuerelement. Auf Android bindet es an{" "}
        <code className="text-amber-400">RecyclerView</code> über JNI.
      </p>
      <p>
        Die TypeScript-API ist deklarativ: Du definierst Spalten, stellst eine Datenquelle bereit, und Perry kümmert sich zur Kompilierzeit um die plattformspezifische Verdrahtung. Spaltensortierung, Auswahlbehandlung und Zeilenhöhenanpassung funktionieren direkt out of the box.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">table.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Table, Column }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> table = <span className="text-blue-400">new</span> <span className="text-amber-400">Table</span>({`{`}</p>
          <p className="ml-4">columns: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Name", key: "name", width: 200 }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Size", key: "size", width: 80 }`}),</p>
          <p className="ml-4">],</p>
          <p className="ml-4">rows: files,  <span className="text-slate-500">// TypeScript-Array von Objekten</span></p>
          <p className="ml-4">onSelect: (row) =&gt; console.<span className="text-amber-400">log</span>(row.name),</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>Das perry/system-Modul</h2>
      <p>
        v0.2.155 führte auch <code className="text-amber-400">perry/system</code> ein — ein TypeScript-Modul, das plattformseitige System-APIs ohne jegliche Runtime bereitstellt: Dateidialoge, Speicherdialoge, Warnungen, Sheets, Keychain-Zugriff, System-Benachrichtigungen und Multi-Window-Verwaltung.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code className="text-amber-400">system.showOpenDialog()</code> — nativer Dateiauswahldialog (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)</li>
        <li><code className="text-amber-400">system.showSaveDialog()</code> — nativer Speicherdialog</li>
        <li><code className="text-amber-400">system.showAlert()</code> — natives Warnungspanel</li>
        <li><code className="text-amber-400">system.notify()</code> — OS-Benachrichtigung (UserNotifications / libnotify / WinRT)</li>
        <li><code className="text-amber-400">system.keychain.get/set()</code> — Keychain Services / Secret Service / Windows Credential Store</li>
        <li><code className="text-amber-400">system.openWindow()</code> — Multi-Window-Verwaltung</li>
      </ul>
      <p>
        All diese rufen native Plattform-APIs direkt auf — kein Electron IPC, keine Web-View-Bridge. Perry kompiliert die TypeScript-Aufrufstelle zu einem direkten nativen Funktionsaufruf in das Plattform-SDK.
      </p>

      <h2>Sechs-Plattform-Feature-Parität: v0.2.162</h2>
      <p>
        Der Meilenstein v0.2.162 ging darum, Lücken zu schließen. Vor diesem Release hatte macOS den vollständigsten Funktionsumfang, iOS war größtenteils da, und Linux/Windows/Android hinkten hinterher. v0.2.162 brachte alle sechs Plattformen auf dasselbe Niveau:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>macOS</strong> — AppKit, vollständiger Widget-Satz, Keychain, Benachrichtigungen, Multi-Window, Toolbar</li>
        <li><strong>iOS / iPadOS</strong> — UIKit, volle Widget-Parität mit macOS, Scene-Lifecycle</li>
        <li><strong>Android</strong> — JNI-Bridge, alle Widgets über Android Views, NDK-Cross-Kompilierung</li>
        <li><strong>Linux</strong> — GTK4, vollständiger Widget-Satz inklusive Table, Dateidialoge, libsecret Keychain</li>
        <li><strong>Windows</strong> — Win32, alle Widgets, Windows Credential Store, WinRT-Benachrichtigungen</li>
      </ul>
      <p>
        Dies ist der Meilenstein, der &quot;eine Codebasis, sechs Plattformen&quot; real statt angestrebt macht. Dieselbe TypeScript-Datei kompiliert auf allen sechs Zielen zu nativen Apps, ohne dass für gängige Anwendungsfälle plattformspezifische Codepfade erforderlich sind.
      </p>

      <h2>Automatische Binärgrößenreduzierung</h2>
      <p>
        v0.2.153 lieferte automatische Binärgrößenreduzierung — der Compiler entfernt jetzt aggressiv ungenutzte Codepfade, eliminiert unerreichbare stdlib-Funktionen und dedupliziert Symboldefinitionen beim Linken. Ein typisches CLI-Tool, das zuvor ~4 MB kompilierte, kommt jetzt auf unter 2 MB, ohne Änderungen am Quellcode.
      </p>
      <p>
        Das ist wichtig für reale Deployments. Wenn deine Binärdatei die Deploymenteinheit ist — auf einen Server kopiert, als einzelne Datei verteilt, in einen Container eingebettet — beeinflusst die Größe direkt Übertragungszeit und Speicherkosten. Die Halbierung der Binärgröße ohne Mehraufwand ist eine bedeutende Verbesserung.
      </p>

      <h2>Das Compile-Time-Plugin-System</h2>
      <p>
        v0.2.152 führte Perrys Plugin-System ein — und es ist architektonisch anders als jedes andere Plugin-System im TypeScript-Ökosystem. Es gibt kein Runtime-Plugin-Laden, kein IPC, kein dynamisches <code className="text-amber-400">require()</code>. Plugins sind TypeScript-Module, die Perry zur Build-Zeit auflöst und kompiliert.
      </p>
      <p>
        Das Ergebnis: Plugins haben exakt null Runtime-Overhead. Sie werden in dieselbe Binärdatei wie dein Anwendungscode kompiliert, mit direkten Funktionsaufrufen zwischen Plugin-Code und Host-Code. Wenn du ein Plugin nicht verwendest, erscheint es nicht in deiner Binärdatei. Wenn du es verwendest, wird es wie jedes andere Modul inlined.
      </p>
      <p>
        Wir haben über die Philosophie dahinter in{" "}
        <Link href="/blog/plugin-systems-are-a-performance-tax" className="text-amber-400 hover:text-amber-300">
          Plugin-Systeme sind eine Performance-Steuer
        </Link> geschrieben. Die Kurzversion: Runtime-Plugin-Architekturen tauschen Performance gegen Erweiterbarkeit. Build-Time-Komposition gibt dir beides.
      </p>

      <h2>Sprachverbesserungen</h2>
      <p>
        Der UI-Sprint fand nicht isoliert statt — der Compiler selbst wurde immer leistungsfähiger. Über diese Releases hinweg:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Klassen-Ausdrücke</strong> — <code className="text-amber-400">const Foo = class extends Bar {`{}`}</code> kompiliert jetzt korrekt</li>
        <li><strong>Generator-Transformationen</strong> — <code className="text-amber-400">function*</code> und <code className="text-amber-400">yield</code> kompilieren zu nativen Zustandsmaschinen</li>
        <li><strong>Map/Set als Klassenfelder</strong> — <code className="text-amber-400">private items = new Map()</code> funktioniert in der Codegen</li>
        <li><strong>FFI-Parameter-Typ-Koercion</strong> — native Bibliotheksaufrufe behandeln Typkonvertierung automatisch</li>
        <li><strong>Gebundene Methodenreferenzen</strong> — <code className="text-amber-400">this.method</code>-Referenzen funktionieren für native Module (fs, os, path)</li>
        <li><code className="text-amber-400">string.match()</code> — jetzt vollständig unterstützt</li>
        <li><code className="text-amber-400">path.isAbsolute()</code>, Multi-Arg <code className="text-amber-400">path.join()</code>, <code className="text-amber-400">path.resolve()</code></li>
        <li><strong>Web-Ziel</strong> — Perry kann jetzt in eine webkompatible Ausgabe für Hybrid-Deployments kompilieren</li>
      </ul>

      <h2>Was kommt als Nächstes</h2>
      <p>
        Mit der Sechs-Plattform-UI-Parität ausgeliefert, ist die nächste Phase Tiefe statt Breite. Wir arbeiten an:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Vollständige RegExp-Unterstützung (<code className="text-amber-400">regex.test()</code>, <code className="text-amber-400">string.matchAll()</code>)</li>
        <li>Drag and Drop, benutzerdefinierte Kontextmenüs und Barrierefreiheitslabels im Widget-System</li>
        <li>Eine VS Code-Erweiterung für Perry-Diagnosen und Compile-on-Save</li>
        <li>Paketmanager-Integration — Perry-native Pakete mit einem Befehl installieren und kompilieren</li>
        <li>WASM-Kompilierungsziel für Browser-Deployment</li>
        <li>Multi-Threading über <code className="text-amber-400">Worker</code>-Threads</li>
      </ul>
      <p>
        Wer mitmachen möchte, das{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Perry-Repo
        </a>{" "}
        ist offen. Schau dir die{" "}
        <Link href="/showcase" className="text-amber-400 hover:text-amber-300">Showcase</Link>
        {" "}an, um zu sehen, was bereits gebaut wird, oder durchstöbere die{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">Roadmap</Link>
        {" "}für das vollständige Bild.
      </p>
    </>
  );
}
