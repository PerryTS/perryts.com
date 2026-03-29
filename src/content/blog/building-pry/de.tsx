import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Pry ist ein nativer JSON-Viewer, komplett in TypeScript geschrieben und mit Perry kompiliert. Es ist keine Tech-Demo — es ist ein echtes Tool, das wir täglich verwenden, um API-Antworten, Konfigurationsdateien und Daten-Dumps zu inspizieren. Dieser Beitrag geht durch, wie es gebaut wurde, wie es kompiliert und wie die Entwicklererfahrung aussieht, wenn dein TypeScript zu einer nativen App kompiliert.
      </p>

      <h2>Was Pry macht</h2>
      <p>
        Pry liest eine JSON-Datei (oder akzeptiert JSON von stdin) und rendert sie als interaktiven, navigierbaren Baum in einem nativen Fenster. Wenn du macOS&apos;s eingebautes Quick Look für JSON kennst, stell dir das vor — aber schneller, durchsuchbar und mit tastaturgesteuerter Navigation.
      </p>
      <p>
        Der Funktionsumfang:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Baumansicht</strong> — klappbare Knoten für Objekte und Arrays, mit Tiefeindikatoren und Alles-auf-/zuklappen</li>
        <li><strong>Suche</strong> — Volltextsuche über Schlüssel und Werte mit Echtzeit-Hervorhebung und Treffer-Navigation</li>
        <li><strong>Tastenkombinationen</strong> — Pfeiltasten zur Navigation, Enter zum Auf-/Zuklappen, Schrägstrich zum Suchen, <code className="text-perry-400">⌘C</code> zum Kopieren</li>
        <li><strong>Zwischenablage</strong> — jeden Knoten oder Teilbaum als formatierten JSON kopieren</li>
        <li><strong>Syntaxfärbung</strong> — Strings in Grün, Zahlen in Orange, Booleans in Lila, null in Rot</li>
        <li><strong>Statusleiste</strong> — zeigt Gesamtknoten-Anzahl, aktuelle Tiefe, Dateigröße und Parse-Zeit</li>
      </ul>

      <h2>Der Quellcode</h2>
      <p>
        Pry ist in Standard-TypeScript geschrieben. Es gibt keine spezielle Syntax, keine Makros, keine Build-Time-Code-Generierung. Es verwendet Perrys UI-API, die native Widgets bereitstellt, die zu plattformspezifischem Code kompilieren.
      </p>
      <p>
        Hier ist der Einstiegspunkt (vereinfacht für Klarheit):
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">pry.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">TreeView</span>, <span className="text-cyan-400">SearchBar</span>, <span className="text-cyan-400">StatusBar</span>, <span className="text-cyan-400">State</span> {"}"}</p>
          <p>  <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">readFile</span>, <span className="text-cyan-400">readStdin</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/fs&quot;</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Eingabe von Dateiargument oder stdin lesen</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">input</span> = process.argv[<span className="text-orange-400">2</span>]</p>
          <p>  ? <span className="text-yellow-400">readFile</span>(process.argv[<span className="text-orange-400">2</span>])</p>
          <p>  : <span className="text-yellow-400">readStdin</span>();</p>
          <p className="mt-3"><span className="text-purple-400">const</span> <span className="text-cyan-400">startTime</span> = Date.<span className="text-yellow-400">now</span>();</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">data</span> = JSON.<span className="text-yellow-400">parse</span>(<span className="text-cyan-400">input</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">parseMs</span> = Date.<span className="text-yellow-400">now</span>() - <span className="text-cyan-400">startTime</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Reaktiver State</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">searchQuery</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-green-400">&quot;&quot;</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">matchCount</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-3"><span className="text-slate-500">// App erstellen</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Pry&quot;</span>, {"{"}</p>
          <p>  width: <span className="text-orange-400">800</span>,</p>
          <p>  height: <span className="text-orange-400">600</span>,</p>
          <p>  minWidth: <span className="text-orange-400">400</span>,</p>
          <p>  minHeight: <span className="text-orange-400">300</span>,</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">0</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">SearchBar</span>({"{"}</p>
          <p>      placeholder: <span className="text-green-400">&quot;Search keys and values...&quot;</span>,</p>
          <p>      onSearch: (<span className="text-cyan-400">q</span>) =&gt; <span className="text-cyan-400">searchQuery</span>.value = <span className="text-cyan-400">q</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">TreeView</span>(<span className="text-cyan-400">data</span>, {"{"}</p>
          <p>      collapsible: <span className="text-orange-400">true</span>,</p>
          <p>      syntaxHighlight: <span className="text-orange-400">true</span>,</p>
          <p>      searchQuery: <span className="text-cyan-400">searchQuery</span>,</p>
          <p>      onMatchCount: (<span className="text-cyan-400">n</span>) =&gt; <span className="text-cyan-400">matchCount</span>.value = <span className="text-cyan-400">n</span>,</p>
          <p>      copyOnClick: <span className="text-orange-400">true</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">StatusBar</span>([</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>){"}"} nodes`</span>,</p>
          <p>      <span className="text-green-400">`Parsed in ${"{"}<span className="text-cyan-400">parseMs</span>{"}"}ms`</span>,</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-cyan-400">matchCount</span>.value{"}"} matches`</span>,</p>
          <p>    ]),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;/&quot;</span>, () =&gt; <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusSearchBar</span>());</p>
          <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;Escape&quot;</span>, () =&gt; {"{"}</p>
          <p>  <span className="text-cyan-400">searchQuery</span>.value = <span className="text-green-400">&quot;&quot;</span>;</p>
          <p>  <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusTree</span>();</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        Das ist der Kern einer nativen Anwendung. Kein Framework-Boilerplate, keine Build-Konfiguration, keine plattformspezifischen Dateien. Eine TypeScript-Datei.
      </p>

      <h3>Die Hilfsfunktionen</h3>
      <p>
        Pry enthält auch eine <code className="text-perry-400">countNodes</code>-Utility, die rekursiv alle Knoten im JSON-Baum zählt, und einen <code className="text-perry-400">formatBytes</code>-Helper zum Anzeigen von Dateigrößen. Das sind Standard-TypeScript-Funktionen — nichts Perry-spezifisches daran. Sie kompilieren genauso zu nativem Code wie alles andere.
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">utils.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">export function</span> <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>: <span className="text-cyan-400">unknown</span>): <span className="text-cyan-400">number</span> {"{"}</p>
          <p>  <span className="text-purple-400">if</span> (<span className="text-cyan-400">data</span> === <span className="text-orange-400">null</span> || <span className="text-purple-400">typeof</span> <span className="text-cyan-400">data</span> !== <span className="text-green-400">&quot;object&quot;</span>) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span>;</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">if</span> (Array.<span className="text-yellow-400">isArray</span>(<span className="text-cyan-400">data</span>)) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">data</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">item</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">item</span>), <span className="text-orange-400">0</span>);</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">const</span> <span className="text-cyan-400">values</span> = Object.<span className="text-yellow-400">values</span>(<span className="text-cyan-400">data</span> <span className="text-purple-400">as</span> Record&lt;<span className="text-cyan-400">string</span>, <span className="text-cyan-400">unknown</span>&gt;);</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">values</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">val</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">val</span>), <span className="text-orange-400">0</span>);</p>
          <p>{"}"}</p>
        </div>
      </div>

      <h2>Pry kompilieren</h2>
      <p>
        Pry mit Perry zu kompilieren ist ein einziger Befehl. Kein Xcode-Projekt, keine Gradle-Konfiguration, kein webpack-Config. Einfach Perry auf die Einstiegsdatei richten und das Ziel angeben.
      </p>

      <h3>macOS (ARM64)</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target macos-arm64</p>
          <p className="text-slate-500">Parsing pry.ts...</p>
          <p className="text-slate-500">Resolving imports: perry/ui, perry/fs</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking with AppKit.framework...</p>
          <p className="text-green-400">✓ Built executable: pry (48 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file pry</p>
          <p className="text-slate-300">pry: Mach-O 64-bit executable arm64</p>
          <p className="mt-3"><span className="text-slate-500">$</span> otool -L pry | head -5</p>
          <p className="text-slate-400">pry:</p>
          <p className="text-slate-400">  /System/Library/Frameworks/AppKit.framework/AppKit</p>
          <p className="text-slate-400">  /System/Library/Frameworks/Foundation.framework/Foundation</p>
          <p className="text-slate-400">  /usr/lib/libSystem.B.dylib</p>
        </div>
      </div>
      <p>
        Die Binärdatei ist 48 MB groß, weil sie den vollständigen AppKit-UI-Stack enthält — Baumansicht-Rendering, Such-Hervorhebung, Syntaxfärbung und Tastatur-Handling. Zum Vergleich: dieselbe App in Electron wäre über 200 MB. Eine CLI-only Perry-App kompiliert zu 2–5 MB.
      </p>

      <h3>iOS</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: pry (52 MB)</p>
        </div>
      </div>
      <p>
        Der iOS-Build linkt gegen UIKit statt AppKit. Perry bildet dieselbe <code className="text-perry-400">TreeView</code>-API auf <code className="text-perry-400">UITableView</code> mit erweiterbaren Sektionen ab, <code className="text-perry-400">SearchBar</code> auf <code className="text-perry-400">UISearchBar</code>, und Touch-Events ersetzen Maus-Events. Der iOS-Build kann auf physischen Geräten und Simulatoren deployed werden.
      </p>

      <h3>Android</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target android-arm64</p>
          <p className="text-green-400">✓ Built: pry.apk</p>
        </div>
      </div>
      <p>
        Der Android-Build generiert eine native Bibliothek, die über JNI geladen wird, verpackt in ein APK. <code className="text-perry-400">TreeView</code> bildet auf ein <code className="text-perry-400">RecyclerView</code> mit erweiterbaren View-Holdern ab, <code className="text-perry-400">SearchBar</code> auf ein <code className="text-perry-400">EditText</code> mit <code className="text-perry-400">TextWatcher</code>, und die Statusleiste auf ein <code className="text-perry-400">TextView</code> am unteren Rand des Layouts.
      </p>

      <h2>Was unter der Haube passiert</h2>
      <p>
        Wenn Perry Pry kompiliert, durchläuft es mehrere Phasen:
      </p>
      <ol className="list-decimal list-inside">
        <li><strong>Parsen</strong> — SWC parst den TypeScript-Quellcode in einen AST. Imports von <code className="text-perry-400">perry/ui</code> und <code className="text-perry-400">perry/fs</code> werden zu Perrys eingebauten Modulimplementierungen aufgelöst.</li>
        <li><strong>Typanalyse</strong> — Perry löst alle Typen auf, einschließlich der generischen <code className="text-perry-400">State&lt;string&gt;</code> und <code className="text-perry-400">State&lt;number&gt;</code>, und monomorphisiert sie zu konkreten Typen.</li>
        <li><strong>Plattformauflösung</strong> — Basierend auf dem Target-Flag wählt Perry das entsprechende UI-Backend. Jeder <code className="text-perry-400">TreeView</code>-, <code className="text-perry-400">SearchBar</code>- und <code className="text-perry-400">Button</code>-Aufruf wird zur plattformspezifischen Implementierung aufgelöst.</li>
        <li><strong>IR-Generierung</strong> — Perry generiert eine Zwischendarstellung, die native API-Aufrufe enthält — Objective-C Message-Sends für macOS/iOS, JNI-Aufrufe für Android, C-Funktionsaufrufe für GTK4/Win32.</li>
        <li><strong>Code-Generierung</strong> — Cranelift kompiliert die IR zu nativem Maschinencode für die Zielarchitektur.</li>
        <li><strong>Linken</strong> — Der native Code wird gegen die Plattform-Frameworks (AppKit, UIKit, Android NDK, GTK4 oder Win32) gelinkt, um die finale ausführbare Datei zu produzieren.</li>
      </ol>

      <h2>Keine Runtime, keine Web Views</h2>
      <p>
        Das ist es wert, betont zu werden, weil es der Kernunterschied zwischen Perry und jedem anderen TypeScript-zu-nativ-Ansatz ist. Die kompilierte Pry-Binärdatei hat:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Keine JavaScript-Engine</strong> — kein V8, kein Hermes, kein JavaScriptCore</li>
        <li><strong>Keine Web Views</strong> — kein Chromium, kein WebKit, kein WKWebView</li>
        <li><strong>Keine Bridge-Schicht</strong> — keine serialisierten Nachrichten zwischen JS und nativem Code</li>
        <li><strong>Keine Framework-Runtime</strong> — kein React, keine Flutter-Engine, keine Dart-VM</li>
      </ul>
      <p>
        Die Binärdatei ruft Plattform-APIs direkt auf. Auf macOS ruft sie <code className="text-perry-400">objc_msgSend</code> auf, um mit AppKit-Objekten zu interagieren. Auf Android ruft sie JNI-Funktionen auf, um Views zu erstellen und zu manipulieren. Es ist dasselbe, was eine native Swift- oder Kotlin-App tun würde.
      </p>
      <p>
        Die praktische Konsequenz: Pry startet sofort. Es gibt keinen VM-Start, kein JIT-Aufwärmen, kein Script-Parsing. Der Prozess startet, das Fenster erscheint, das JSON wird gerendert. Der Speicherverbrauch ist ein Bruchteil dessen, was ein Electron-Äquivalent verbrauchen würde.
      </p>

      <h2>Entwicklererfahrung</h2>
      <p>
        Pry zu bauen fühlte sich bemerkenswert ähnlich an wie jede TypeScript-Anwendung zu bauen. Der Workflow ist:
      </p>
      <ol className="list-decimal list-inside">
        <li>TypeScript in deinem Editor schreiben (VS Code, Zed, Neovim, was du bevorzugst)</li>
        <li><code className="text-perry-400">perry compile pry.ts</code> ausführen</li>
        <li><code className="text-perry-400">./pry test.json</code> ausführen</li>
        <li>Iterieren</li>
      </ol>
      <p>
        Kein Xcode-Projekt zum Konfigurieren. Kein Android Studio zum Installieren. Kein 45-Sekunden Gradle-Build. Der Perry-Compiler selbst ist schnell — das Parsen und Kompilieren von Pry dauert wenige Sekunden, und wir arbeiten aktiv daran, es schneller zu machen.
      </p>
      <p>
        Das TypeScript, das du schreibst, ist Standard-TypeScript. Die Typprüfung, Autovervollständigung und Refactoring-Tools deines Editors funktionieren alle. Du kannst Funktionen extrahieren, Module erstellen, Generics verwenden — alle TypeScript-Muster, die du bereits kennst.
      </p>

      <h2>Was wir gelernt haben</h2>
      <p>
        Pry zu bauen hat uns viel darüber gelehrt, was die Perry UI-API unterstützen muss. Einige Lektionen:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Baumansichten sind komplex.</strong> Auf-/Zuklappen, Such-Hervorhebung, Tastatur-Navigation und Zwischenablage-Integration müssen alle koordiniert werden. Perrys <code className="text-perry-400">TreeView</code>-Widget handhabt das intern, aber wir mussten sicherstellen, dass die native Implementierung auf allen drei Plattformen konsistent war.</li>
        <li><strong>Tastenkombinationen brauchen Plattformkonventionen.</strong> Auf macOS ist es <code className="text-perry-400">⌘C</code> zum Kopieren. Auf Linux und Android ist es <code className="text-perry-400">Ctrl+C</code>. Perrys Shortcut-System abstrahiert das, aber es brauchte sorgfältige Implementierung, um es richtig hinzubekommen.</li>
        <li><strong>Statusleisten sind überraschend nicht-trivial.</strong> Jede Plattform hat eine andere Konvention, wo und wie Statusinformationen angezeigt werden. AppKit verwendet die untere Leiste des Fensters, UIKit verwendet eine Toolbar, Android verwendet eine untere View im Layout. Perrys <code className="text-perry-400">StatusBar</code> bildet auf jede korrekt ab.</li>
        <li><strong>Stdin-Unterstützung erforderte Plattform-Bewusstsein.</strong> Auf macOS und Linux ist das Lesen von stdin unkompliziert. Auf iOS und Android &quot;existiert&quot; stdin nicht wirklich auf dieselbe Weise, also verwendet Pry auf mobilen Plattformen stattdessen Dateiauswahl. Perrys <code className="text-perry-400">readStdin</code> handhabt das transparent.</li>
      </ul>

      <h2>Performance</h2>
      <p>
        Pry handhabt große JSON-Dateien komfortabel. In unseren Tests:
      </p>
      <ul className="list-disc list-inside">
        <li>Eine 1 MB JSON-Datei (10.000+ Knoten) parst und rendert in unter 50 ms</li>
        <li>Eine 10 MB JSON-Datei rendert in unter 200 ms</li>
        <li>Suche über 10.000 Knoten liefert Ergebnisse beim Tippen, ohne sichtbare Verzögerung</li>
        <li>Speicherverbrauch bleibt auch bei großen Dateien unter 50 MB</li>
      </ul>
      <p>
        Das ist der Vorteil nativer Kompilierung. JSON-Parsing in Perry wird zu engen nativen Schleifen ohne GC-Pausen kompiliert. Baum-Rendering verwendet die plattformeigenen virtualisierten Listenansichten (NSOutlineView, UITableView, RecyclerView), die für Performance kampferprobt sind.
      </p>

      <h2>Quellcode und Downloads</h2>
      <p>
        Pry ist Open Source. Du kannst den vollständigen Quellcode durchstöbern, es selbst bauen oder einfach den Code anschauen, um zu verstehen, wie eine native Perry-UI-App strukturiert ist.
      </p>
      <ul className="list-disc list-inside">
        <li>
          <a href="https://github.com/nicktrebes/perry-pry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">GitHub Repo</a>{" "}
          — vollständiger Quellcode und Build-Anleitungen
        </li>
        <li>
          <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">Showcase-Seite</Link>{" "}
          — Screenshots, Feature-Liste und Plattform-Details
        </li>
      </ul>
      <p>
        Wenn du etwas mit Perry baust, würden wir gerne davon hören. Eröffne ein Issue im{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">Perry Repo</a>{" "}
        oder starte eine Diskussion. Wir bauen Perry offen und Feedback von echten Nutzern, die echte Apps bauen, ist von unschätzbarem Wert.
      </p>
    </>
  );
}
