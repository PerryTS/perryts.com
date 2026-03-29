export default function Content() {
  return (
    <>
      <p>
        Du installierst VS Code. Es ist schnell. Du fügst 15 Erweiterungen hinzu. Jetzt dauert der Start 4 Sekunden und der Extension Host verbraucht 800 MB RAM. Was ist passiert?
      </p>
      <p>
        Das Muster wiederholt sich überall: WordPress, Eclipse, Chrome, Figma, Slack. Die App wird schnell ausgeliefert. Plugins machen sie langsam. Niemand ist mehr überrascht — wir haben es als Preis der Erweiterbarkeit akzeptiert.
      </p>
      <p>
        Aber Plugin-Systeme sind nicht nur ein Performance-Problem. Sie sind ein Problem der Designphilosophie. Die Branche hat &quot;Erweiterbarkeit&quot; mit &quot;Runtime-Dynamik&quot; verwechselt, obwohl die bessere Antwort oft Compile-Time-Komposition ist. Die einzig performanten Plugins sind die, die zur Kompilierzeit aufhören, Plugins zu sein.
      </p>

      <h2>Das Performance-Spektrum der Erweiterbarkeit</h2>
      <p>
        Nicht jede Erweiterbarkeit kostet gleich viel. Es gibt ein Spektrum von Null-Kosten bis Maximum-Kosten, und der Großteil der Branche hat sich am teuren Ende angesiedelt:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Statisches Linken / Compile-Time-Module</strong> — null Overhead. C-Bibliotheken, Rust-Crates, Go-Pakete. Die Modulgrenze verschwindet vollständig in der finalen Binärdatei.
        </li>
        <li>
          <strong>Shared Libraries beim Start geladen</strong> — nahezu null. nginx-Module, Linux-Kernelmodule. Einmalige Kosten beim Laden, danach direkte Funktionsaufrufe.
        </li>
        <li>
          <strong>Dynamischer Dispatch über Interfaces / VTables</strong> — kleiner Overhead. Game-Engine-Plugins in C++. Eine Pointer-Indirektion pro Aufruf.
        </li>
        <li>
          <strong>Same-Process interpretierte Plugins</strong> — moderater Overhead. WordPress PHP-Plugins, Eclipse OSGi-Bundles. Jeder Plugin-Aufruf geht durch einen Interpreter.
        </li>
        <li>
          <strong>Separate-Process-Plugins über IPC</strong> — signifikant. VS Code-Erweiterungen, Chrome-Erweiterungen. Jede Interaktion überquert eine Prozessgrenze und serialisiert Daten.
        </li>
        <li>
          <strong>Sandboxed Plugins über serialisiertes IPC</strong> — schwer. Figma-Plugins, Browser-Extension Content Scripts. Serialisierung, Deserialisierung und Sandbox-Durchsetzung bei jedem Aufruf.
        </li>
      </ol>
      <p>
        Die zentrale Erkenntnis: die einzig performanten Plugins sind die, die zur Kompilierzeit aufhören, Plugins zu sein. Die Stufen 1 und 2 sind schnell, gerade weil das &quot;Plugin&quot; im finalen Artefakt nicht mehr vom Host-Code unterscheidbar ist.
      </p>

      <h2>Der reale Schaden</h2>

      <h3>WordPress</h3>
      <p>
        Jedes Plugin hängt sich in den Request-Lifecycle ein. 30 Plugins bedeuten 30 Schichten von Funktionsaufrufen pro Seitenaufruf. Das Ergebnis: Caching-Plugins existieren einzig, um den Schaden anderer Plugins abzumildern. Performance-Plugins, um das Performance-Problem zu beheben, das Plugins verursacht haben. Die Meta-Ironie schreibt sich selbst.
      </p>

      <h3>VS Code</h3>
      <p>
        Erweiterungen teilen sich eine einzige Node.js Event Loop in einem separaten Prozess. Eine fehlverhaltende Erweiterung blockiert alle anderen. Der Extension Host taucht regelmäßig als größter CPU-Verbraucher auf Entwicklermaschinen auf. Microsoft hat Profiling-Tools, Bisect-Befehle und Activation-Event-Systeme gebaut — eine ganze Infrastruktur, um das Problem zu verwalten, das Erweiterungen schaffen.
      </p>

      <h3>Eclipse</h3>
      <p>
        Die warnende Geschichte. OSGi-Bundle-Auflösung, Class-Loading-Overhead, massive Abhängigkeitsgraphen. Einst die beliebteste IDE, jetzt weitgehend von Mainstream-Entwicklern verlassen. Die Plugin-Architektur, die ihre größte Stärke sein sollte, wurde zu ihrer definierenden Schwäche.
      </p>

      <h3>Electron selbst</h3>
      <p>
        Das Plugin-Problem auf Plattformebene. Jede Electron-App liefert eine vollständige Chromium + Node.js Runtime. VS Code ist Electron. Slack ist Electron. Discord ist Electron. Jedes davon verbraucht unabhängig 300&ndash;500 MB RAM, um zu rendern, was im Wesentlichen ein Chat-Fenster oder ein Texteditor ist. Das &quot;Plugin&quot; hier ist die gesamte Web-Plattform, frisch gebündelt für jede Anwendung.
      </p>

      <h2>Warum die Branche trotzdem immer wieder Plugins wählt</h2>
      <p>
        Wenn Plugins so teuer sind, warum baut sie jeder weiterhin? Die Gründe sind meist organisatorischer, nicht technischer Natur:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Entwicklererfahrung</strong> — Plugins sind einfach zu schreiben, wenn man sich nicht um Performance kümmert. Eine JS-Datei ausliefern, ein paar Events hoooken, fertig.
        </li>
        <li>
          <strong>Ökosystem-Wachstum</strong> — Plugins erzeugen Netzwerkeffekte und Community-Engagement. Ein Marktplatz mit 30.000 Erweiterungen ist ein mächtiger Burggraben.
        </li>
        <li>
          <strong>Organisatorische Bequemlichkeit</strong> — Plugins lassen Teams Designentscheidungen aufschieben. &quot;Jemand wird ein Plugin dafür schreiben&quot; ist das Architekturäquivalent von &quot;Wir fixen das in der Postproduktion.&quot;
        </li>
        <li>
          <strong>Geschäftsmodell</strong> — Plugin-Marktplätze schaffen Umsatz und Lock-in. Die Plattform schöpft Wert aus dem Ökosystem ab.
        </li>
      </ul>
      <p>
        Die unbequeme Wahrheit: Plugins sind oft ein Weg, harte architektonische Entscheidungen darüber zu vermeiden, was in den Kern gehört. Sie lassen dich etwas Unvollständiges ausliefern und es &quot;erweiterbar&quot; nennen.
      </p>

      <h2>Die Alternative: Compile-Time-Komposition</h2>
      <p>
        Was, wenn Erweiterbarkeit zur Build-Zeit statt zur Runtime stattfinden würde?
      </p>
      <p>
        Das ist keine Hypothese. Es gibt bewährte Präzedenzfälle in Systemsprachen:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Rust proc macros</strong> — beliebiger Code, der zur Kompilierzeit läuft und Zero-Overhead nativen Code generiert. Serde-Serialisierung, Tokio-Async-Runtime-Setup, Axum-Routing — alles aufgelöst, bevor dein Programm startet.
        </li>
        <li>
          <strong>Zig comptime</strong> — Compile-Time-Ausführung, die alle Runtime-Verzweigungen eliminiert. Generische Datenstrukturen werden monomorphisiert, Konfiguration wird aufgelöst, toter Code wird eliminiert. Was bleibt, ist genau das, was läuft.
        </li>
        <li>
          <strong>C++ Templates / constexpr</strong> — Compile-Time-Polymorphismus mit null Runtime-Kosten. Die STL erreicht außergewöhnliche Performance, weil jeder generische Algorithmus zur Kompilierzeit spezialisiert wird.
        </li>
        <li>
          <strong>Tree-Shaking in Bundlern</strong> — eine partielle, unvollkommene Version dieser Idee, angewandt auf JavaScript. Webpack und Rollup eliminieren ungenutzte Exporte zur Build-Zeit. Die Einschränkung ist, dass sie nur Code entfernen, nicht spezialisieren können.
        </li>
      </ul>
      <p>
        Das Muster ist konsistent: Entscheidungen von der Runtime zur Build-Zeit verschieben. Was du nicht einschließt, kostet nichts. Was du einschließt, kompiliert zu nativem Code ohne Indirektion. Die Modulgrenze wird zum Source-Level-Organisationswerkzeug, nicht zur Runtime-Performance-Grenze.
      </p>

      <h2>Was das für TypeScript bedeutet</h2>
      <p>
        TypeScript ist die beliebteste Sprache für den Bau erweiterbarer Tools — und die schlechteste bei Runtime-Performance. Das gesamte TypeScript-Ökosystem läuft auf Node.js, das auf V8 läuft, das JavaScript JIT-kompiliert. Jede Schicht fügt Overhead hinzu: JIT-Aufwärmzeit, Garbage-Collection-Pausen, dynamischer Dispatch für jeden Property-Zugriff, IPC-Grenzen zwischen Prozessen.
      </p>
      <p>
        Hier kommt Perry ins Spiel. Perry kompiliert TypeScript direkt zu nativen Binärdateien. Kein V8, kein JIT-Aufwärmen, keine Garbage-Collection-Pausen, keine IPC-Grenzen.
      </p>
      <p>
        Wenn deine Module zu nativem Code kompilieren, werden &quot;Plugins&quot; einfach... Module. Sie komponieren zur Build-Zeit. Die finale Binärdatei hat null Plugin-Overhead, weil es keine Plugins gibt — nur nativen Code. Ein Express-Route-Handler, eine Middleware-Funktion, eine Utility-Bibliothek — sie alle kompilieren zu direkten Funktionsaufrufen in derselben Binärdatei. Kein dynamisches Laden, keine Serialisierung, keine Prozessgrenzen.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500"># Deine App, deine Abhängigkeiten, deine &quot;Plugins&quot; — eine Binärdatei</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile server.ts -o server</p>
          <p className="text-slate-500">Compiling server.ts + 43 modules...</p>
          <p className="text-green-400">{"✓"} Built executable: server (1.8 MB, 0.7s)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./server</p>
          <p className="text-slate-300">Listening on port 3000</p>
        </div>
      </div>

      <p>
        Das ist nicht theoretisch. Perry kompiliert bereits reale TypeScript-Frameworks — Hono, tRPC, Strapi — zu nativen ARM64-Binärdateien unter 2 MB, in weniger als einer Sekunde. Die Module, die diese Frameworks ausmachen, werden kompiliert, gelinkt und in eine einzelne ausführbare Datei inlined. Was in Node.js eine Plugin-Architektur mit Runtime-Overhead wäre, wird in einer Perry-Binärdatei zur Zero-Cost-Komposition.
      </p>

      <h2>Die Erweiterbarkeit, die du tatsächlich brauchst</h2>
      <p>
        Der Einwand ist offensichtlich: &quot;Aber ich brauche Runtime-Erweiterbarkeit. Benutzer müssen Plugins installieren können, ohne neu zu kompilieren.&quot;
      </p>
      <p>
        Müssen sie das? Für die meisten Anwendungen ist der Satz von Erweiterungen zur Build-Zeit bekannt. Du wählst deine Express-Middleware, deinen Datenbanktreiber, deine Auth-Bibliothek, dein Logging-Framework — und dann deployest du. Die &quot;Erweiterbarkeit&quot; steckt in deiner{" "}
        <code className="text-perry-400">package.json</code>, aufgelöst bei{" "}
        <code className="text-perry-400">npm install</code>, nicht zur Runtime.
      </p>
      <p>
        Die Anwendungen, die wirklich Runtime-Plugin-Laden brauchen — VS Code, WordPress, Browser — sind die Ausnahme, nicht die Regel. Und selbst diese zahlen einen hohen Preis dafür. Für alles andere gibt Compile-Time-Komposition dieselbe Flexibilität ohne den Overhead.
      </p>
      <p>
        Der Unterschied ist architektonische Ehrlichkeit. Statt so zu tun, als bräuchte jede Anwendung ein Plugin-System, fragst du: Muss diese Erweiterbarkeit zur Runtime passieren, oder kann der Compiler die Arbeit erledigen?
      </p>

      <h2>Der Weg nach vorn</h2>
      <p>
        Die Sucht der Branche nach Plugin-Architekturen ist ein Symptom davon, Runtime-Overhead als unvermeidlich zu akzeptieren. Das ist er nicht. Der Compiler kann die Arbeit erledigen. Build-Time-Komposition gibt dir Erweiterbarkeit ohne die Steuer.
      </p>
      <p>
        Wir bauen Perry, weil wir glauben, dass TypeScript-Entwickler native Performance verdienen, ohne die Sprache aufzugeben, die sie lieben. Deine Module sollten zur Build-Zeit komponieren, zu direkten Funktionsaufrufen kompilieren und ohne den Overhead einer Runtime laufen, die nur existiert, um &quot;Erweiterbarkeit&quot; möglich zu machen.
      </p>
      <p>
        Das schnellste Plugin-System ist das, das zur Runtime nicht existiert.
      </p>
    </>
  );
}
