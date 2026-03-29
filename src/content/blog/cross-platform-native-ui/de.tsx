import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Eines der ambitioniertesten Ziele von Perry ist die Bereitstellung wirklich nativer GUI-Anwendungen aus einer einzigen TypeScript-Codebasis. Keine Web-Views in einer nativen Hülle. Keine benutzerdefinierte Rendering-Engine, die eigene Pixel zeichnet. Echte native Widgets, gerendert vom UI-Framework der jeweiligen Plattform, zur Build-Zeit aus TypeScript kompiliert.
      </p>
      <p>
        Dieser Beitrag erklärt, wie es funktioniert — die Architektur, das Plattform-Mapping, die Kompromisse und wo wir heute stehen.
      </p>

      <h2>Das Problem mit aktuellen Ansätzen</h2>
      <p>
        Plattformübergreifende GUI-Entwicklung ist seit Jahrzehnten ein schwieriges Problem. Jedes große Framework hat unterschiedliche Kompromisse eingegangen:
      </p>

      <h3>Electron / Tauri (Web-basiert)</h3>
      <p>
        Electron bündelt Chromium und Node.js und gibt dir einen Webbrowser als App-Shell. Du hast vollen Zugriff auf die Web-Plattform, aber deine &quot;native&quot; App ist ein 150+ MB Download, der Hunderte von Megabytes RAM verbraucht, nur um ein Fenster anzuzeigen. Tauri ersetzt Chromium durch die OS-Web-View und reduziert die Größe dramatisch, aber deine UI ist immer noch HTML/CSS, gerendert in einer Web-View — keine nativen Widgets.
      </p>

      <h3>React Native (Bridge-basiert)</h3>
      <p>
        React Native führt dein JavaScript in einer JS-Engine (Hermes oder V8) aus und überbrückt zu nativen Widgets über eine serialisierte Nachrichtenwarteschlange. Du bekommst echte native Widgets, aber die Bridge fügt Latenz hinzu, besonders bei Gesten und Animationen. Komplexe Interaktionen erfordern den Wechsel zu nativem Code (Swift/Kotlin), was das Single-Codebase-Versprechen unterminiert.
      </p>

      <h3>Flutter (Benutzerdefinierter Renderer)</h3>
      <p>
        Flutter kompiliert Dart zu nativem Code und zeichnet alles mit seiner eigenen Skia-basierten Rendering-Engine. Die Performance ist ausgezeichnet, aber deine Widgets sind nicht nativ — sie sind pixelperfekte Repliken. Das bedeutet, Plattformkonventionen (Scroll-Physik, Textauswahl, Barrierefreiheitsverhalten) müssen neu implementiert statt vererbt werden. Und auf dem Desktop werden die Unterschiede deutlicher.
      </p>

      <h3>KMP + Compose Multiplatform (Teilweise nativ)</h3>
      <p>
        Kotlin Multiplatform kompiliert zur JVM auf Android und nativ auf iOS, aber geteilte UI über Compose Multiplatform verwendet einen benutzerdefinierten Skia-basierten Renderer — derselbe Kompromiss wie Flutter. Für wirklich native UI schreibst du wieder plattformspezifischen Code.
      </p>

      <h2>Perrys Ansatz: Kompilieren zu nativen Toolkits</h2>
      <p>
        Perry verfolgt einen grundlegend anderen Ansatz. Statt deinen Code in einer Runtime auszuführen und zu nativen Widgets zu überbrücken, oder benutzerdefinierte Pixel zu zeichnen, kompiliert Perry deinen TypeScript-UI-Code direkt in Aufrufe des nativen Toolkits der jeweiligen Plattform zur Build-Zeit.
      </p>
      <p>
        Der entscheidende Unterschied: <strong>Es gibt keine Runtime-Schicht zwischen deinem Code und dem Plattform-SDK.</strong>{" "}
        Die kompilierte Binärdatei ruft AppKit, UIKit, Android Views, GTK4 oder Win32 direkt auf, genau wie eine in Swift, Kotlin oder C++ geschriebene App.
      </p>

      <h2>Die einheitliche UI-API</h2>
      <p>
        Perry bietet eine gemeinsame TypeScript-API zum Erstellen von Benutzeroberflächen. Diese API ist bewusst auf hohem Niveau — du beschreibst, was deine UI enthalten soll und wie sie sich verhalten soll, und Perry bildet es auf die entsprechenden nativen Konstrukte ab.
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
        Derselbe Code kompiliert auf allen sechs Plattformen zu nativer UI. Kein <code className="text-perry-400">#ifdef</code>, keine Plattformprüfungen, keine bedingten Imports.
      </p>

      <h2>Plattform-Mapping im Detail</h2>
      <p>
        So bildet Perry die einheitliche API auf das native Framework jeder Plattform ab:
      </p>

      <h3>macOS — AppKit</h3>
      <p>
        Auf macOS generiert Perry Code, der AppKit-Objekte direkt erstellt und verwaltet. Ein <code className="text-perry-400">App</code> wird zu einer <code className="text-perry-400">NSApplication</code> mit einem <code className="text-perry-400">NSWindow</code>.{" "}
        <code className="text-perry-400">Text</code> wird zu <code className="text-perry-400">NSTextField</code> (mit deaktivierter Bearbeitung).{" "}
        <code className="text-perry-400">Button</code> wird zu <code className="text-perry-400">NSButton</code> mit einem Target-Action-Pattern, verdrahtet mit deinem Callback.{" "}
        <code className="text-perry-400">VStack</code> wird zu einem <code className="text-perry-400">NSStackView</code> mit vertikaler Orientierung. Layout verwendet Auto Layout Constraints.
      </p>
      <p>
        Die kompilierte Binärdatei linkt gegen das AppKit-Framework und ruft Objective-C-Runtime-Funktionen direkt auf. Es ist dasselbe, was Xcode-kompiliertes Swift tun würde.
      </p>

      <h3>iOS &amp; iPadOS — UIKit</h3>
      <p>
        Auf iOS ist das Mapping ähnlich, zielt aber auf UIKit.{" "}
        <code className="text-perry-400">App</code> wird zu einer <code className="text-perry-400">UIApplication</code> mit einem <code className="text-perry-400">UIWindow</code> und Root-<code className="text-perry-400">UIViewController</code>.{" "}
        <code className="text-perry-400">Text</code> bildet auf <code className="text-perry-400">UILabel</code> ab.{" "}
        <code className="text-perry-400">Button</code> bildet auf <code className="text-perry-400">UIButton</code> ab.{" "}
        Layout verwendet <code className="text-perry-400">UIStackView</code> und Auto Layout. Touch-Events werden über UIKits Responder Chain behandelt.
      </p>

      <h3>Android — JNI + Views</h3>
      <p>
        Auf Android generiert Perry eine native Bibliothek, die über JNI (Java Native Interface) geladen wird.{" "}
        <code className="text-perry-400">App</code> bildet auf eine <code className="text-perry-400">Activity</code> ab.{" "}
        <code className="text-perry-400">Text</code> wird zu einem <code className="text-perry-400">TextView</code>.{" "}
        <code className="text-perry-400">Button</code> wird zu einem <code className="text-perry-400">android.widget.Button</code> mit einem <code className="text-perry-400">OnClickListener</code>.{" "}
        <code className="text-perry-400">VStack</code> bildet auf ein vertikales <code className="text-perry-400">LinearLayout</code> ab. Der native Code ruft über JNI zurück in das Android-Framework und erstellt und manipuliert echte Android Views.
      </p>

      <h3>Linux — GTK4</h3>
      <p>
        Auf Linux zielt Perry auf GTK4.{" "}
        <code className="text-perry-400">App</code> wird zu einer <code className="text-perry-400">GtkApplication</code> mit einem <code className="text-perry-400">GtkApplicationWindow</code>.{" "}
        <code className="text-perry-400">Text</code> bildet auf <code className="text-perry-400">GtkLabel</code> ab.{" "}
        <code className="text-perry-400">Button</code> bildet auf <code className="text-perry-400">GtkButton</code> mit einem Signal-Handler ab.{" "}
        <code className="text-perry-400">VStack</code> bildet auf eine <code className="text-perry-400">GtkBox</code> mit vertikaler Orientierung ab. GTK4s CSS-Theming bedeutet, dass deine App automatisch dem Desktop-Theme des Benutzers folgt.
      </p>

      <h3>Windows — Win32</h3>
      <p>
        Auf Windows generiert Perry Win32-API-Aufrufe.{" "}
        <code className="text-perry-400">App</code> erstellt eine Fensterklasse, registriert sie und führt eine Nachrichtenschleife aus.{" "}
        <code className="text-perry-400">Button</code> wird zu einem <code className="text-perry-400">BUTTON</code>-Steuerelement, erstellt mit <code className="text-perry-400">CreateWindowEx</code>.{" "}
        <code className="text-perry-400">Text</code> bildet auf ein <code className="text-perry-400">STATIC</code>-Steuerelement ab. Events werden über die Win32-Nachrichtenpumpe behandelt (<code className="text-perry-400">WM_COMMAND</code>,{" "}
        <code className="text-perry-400">WM_NOTIFY</code>, etc.).
      </p>

      <h2>State Management</h2>
      <p>
        Perrys <code className="text-perry-400">State&lt;T&gt;</code>-Primitive bietet reaktives State Management, das zu plattform-nativen Update-Mechanismen kompiliert. Wenn sich ein State-Wert ändert, löst Perry ein UI-Update über das Invalidierungssystem der Plattform aus — <code className="text-perry-400">setNeedsDisplay</code> auf macOS/iOS,{" "}
        <code className="text-perry-400">invalidate()</code> auf Android,{" "}
        <code className="text-perry-400">gtk_widget_queue_draw</code> auf Linux.
      </p>
      <p>
        Es gibt kein Virtual-DOM-Diffing, keinen Reconciliation-Pass, keine Serialisierung. Zustandsänderungen propagieren direkt zum nativen Widget, das den Wert anzeigt.
      </p>

      <h2>Warum nicht SwiftUI / Jetpack Compose Syntax?</h2>
      <p>
        Man könnte sich fragen, warum Perry keine deklarative Syntax ähnlich zu SwiftUI oder Jetpack Compose verwendet. Die Antwort ist pragmatisch: Perry kompiliert TypeScript, und TypeScript hat seine eigenen Idiome. Statt eine DSL zu erfinden, die TypeScript-Entwicklern fremd erscheint, verwendet Perry eine Builder-Style-API, die sich in TypeScript natürlich anfühlt — Konstruktoren, Methodenaufrufe, Callbacks und Closures. Es sind dieselben Muster, die du bereits bei der Arbeit mit Express, React Hooks oder jeder anderen TypeScript-Bibliothek verwendest.
      </p>

      <h2>Was heute verfügbar ist</h2>
      <p>
        Alle sechs Plattform-Backends sind implementiert und stabil. Der aktuelle Widget-Satz umfasst:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Layout</strong> — VStack, HStack, Spacer, ScrollView, Divider</li>
        <li><strong>Anzeige</strong> — Text, Image</li>
        <li><strong>Eingabe</strong> — Button, TextField, Toggle, Slider</li>
        <li><strong>Navigation</strong> — NavigationView, TabView, List</li>
        <li><strong>Container</strong> — TreeView, SearchBar, StatusBar</li>
        <li><strong>State</strong> — State&lt;T&gt; für reaktive Updates</li>
      </ul>

      <h2>Was kommt</h2>
      <p>
        Wir erweitern aktiv die Widget-Bibliothek. Als Nächstes:
      </p>
      <ul className="list-disc list-inside">
        <li><code className="text-perry-400">SecureField</code> — Passworteingabe mit plattform-nativer sicherer Texteingabe</li>
        <li><code className="text-perry-400">ProgressView</code> — bestimmte und unbestimmte Fortschrittsanzeigen</li>
        <li><code className="text-perry-400">Alert</code> — native Warndialoge mit Buttons und Textfeldern</li>
        <li><code className="text-perry-400">DatePicker</code> — plattform-native Datums-/Zeitauswahl</li>
        <li><code className="text-perry-400">Menu</code> — native Menüleisten und Kontextmenüs</li>
      </ul>
      <p>
        Das Ziel ist vollständige GUI-Framework-Parität über alle Plattformen — jedes Widget, Layout, jede Geste und Animation überall verfügbar. Siehe die{" "}
        <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">Roadmap</Link> für das vollständige Bild.
      </p>

      <h2>Ausprobieren</h2>
      <p>
        Der beste Weg, Perrys native UI zu verstehen, ist sie in Aktion zu sehen.{" "}
        <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">Pry</Link> ist ein nativer JSON-Viewer, vollständig in TypeScript mit Perry gebaut — eine echte App mit Baumnavigation, Suche und Tastenkombinationen, kompiliert zu nativen Binärdateien auf macOS, iOS und Android. Lies den{" "}
        <Link href="/blog/building-pry" className="text-perry-400 hover:text-perry-300">vollständigen Walkthrough</Link>{" "}
        darüber, wie es gebaut wurde.
      </p>
    </>
  );
}
