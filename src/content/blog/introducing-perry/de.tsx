import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Wir freuen uns, Perry vorzustellen — einen nativen TypeScript-Compiler, geschrieben in Rust, der dein TypeScript direkt zu eigenständigen ausführbaren Dateien kompiliert. Kein Node.js-Runtime, kein Electron-Wrapper, keine Kompromisse. Nur dein Code, kompiliert zu einer nativen Binärdatei, die sofort startet und überall läuft.
      </p>
      <p>
        Perry stellt ein grundlegendes Umdenken dessen dar, was TypeScript sein kann. Statt es als Obermenge von JavaScript zu behandeln, die durch eine JS-Engine laufen muss, behandelt Perry TypeScript als Systemsprache — eine, die zufällig eine Syntax hat, die Millionen von Entwicklern bereits kennen und lieben.
      </p>

      <h2>Warum wir Perry gebaut haben</h2>
      <p>
        TypeScript ist zur Lingua Franca der modernen Softwareentwicklung geworden. Es ist die Sprache hinter den meisten Web-Frontends, einem wachsenden Anteil an Backends und zunehmend die Wahl für Tooling, Scripting und Automatisierung. Aber es hat immer eine fundamentale Einschränkung mit sich getragen: Es kompiliert zu JavaScript, und JavaScript benötigt eine Runtime.
      </p>
      <p>
        Diese Runtime — ob Node.js, Deno oder Bun — kommt mit Kompromissen. Kaltstartzeiten, gemessen in Zehnteln oder Hundertsten von Millisekunden. Speicher-Overhead durch JIT-Compiler und Garbage Collector. Binärdistributionen, die entweder die gesamte Runtime mitbündeln oder vom Benutzer verlangen, eine zu installieren. Und für GUI-Anwendungen war die einzige Option Electron, das einen kompletten Chromium-Browser mit deiner App ausliefert.
      </p>
      <p>
        Wir fragten: Was, wenn TypeScript gar nicht über JavaScript gehen müsste? Was, wenn man es direkt zu nativem Maschinencode kompilieren könnte, auf die gleiche Weise wie Rust, Go oder C++?
      </p>

      <h2>Wie Perry funktioniert</h2>
      <p>
        Perrys Kompilierungs-Pipeline hat drei Stufen:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Parsing</strong> — Perry verwendet SWC (den Rust-basierten TypeScript/JavaScript-Parser), um deinen TypeScript-Quellcode in einen AST zu parsen. SWC ist derselbe Parser, der von Next.js verwendet wird, und er ist extrem schnell.
        </li>
        <li>
          <strong>Typgesteuerte Kompilierung</strong> — Perry durchläuft den AST mit vollständiger Typinformation. Anders als eine JS-Engine, die dynamische Typen zur Laufzeit handhaben muss, kennt Perry jeden Typ zur Kompilierzeit. Das ermöglicht Monomorphisierung von Generics, statischen Dispatch von Methodenaufrufen und direkte Speicherlayout-Optimierung.
        </li>
        <li>
          <strong>Code-Generierung</strong> — Perry generiert nativen Maschinencode mit Cranelift, demselben Code-Generator, der von Wasmtime und Teilen des Firefox-JIT verwendet wird. Cranelift erzeugt effizienten nativen Code für x86_64 und ARM64.
        </li>
      </ol>
      <p>
        Das Ergebnis ist eine eigenständige ausführbare Datei — typischerweise 2–5 MB für ein CLI-Tool — die sofort ohne Aufwärmzeit startet.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts</p>
          <p className="text-slate-500">Parsing app.ts...</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking...</p>
          <p className="text-green-400">✓ Built executable: app (2.3 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./app</p>
          <p className="text-slate-300">Hello from native TypeScript!</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file app</p>
          <p className="text-slate-300">app: Mach-O 64-bit executable arm64</p>
        </div>
      </div>

      <h2>Welche TypeScript-Features unterstützt werden</h2>
      <p>
        Perry unterstützt eine breite und wachsende Teilmenge von TypeScript. Das Ziel ist vollständige Kompatibilität mit der Sprache, wie Entwickler sie tatsächlich nutzen. Heute umfasst das:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Alle primitiven Typen</strong> — string, number, boolean, null, undefined, bigint, symbol</li>
        <li><strong>Interfaces und Type-Aliases</strong> — einschließlich Union-Typen, Intersection-Typen und Mapped Types</li>
        <li><strong>Generics</strong> — kompiliert via Monomorphisierung, sodass <code className="text-perry-400">Array&lt;number&gt;</code> und <code className="text-perry-400">Array&lt;string&gt;</code> unterschiedliche optimierte Codepfade generieren</li>
        <li><strong>Klassen</strong> — mit Vererbung, privaten Feldern (<code className="text-perry-400">#field</code>), statischen Mitgliedern, Gettern/Settern und Decorators</li>
        <li><strong>Async/await und Promises</strong> — kompiliert zu einer Zustandsmaschine, ähnlich wie Rust Async handhabt</li>
        <li><strong>Generatoren und Iteratoren</strong> — <code className="text-perry-400">function*</code> und <code className="text-perry-400">for...of</code>-Schleifen</li>
        <li><strong>Closures</strong> — mit korrekter Capture-Semantik</li>
        <li><strong>Destructuring</strong> — Arrays, Objekte, verschachtelte Muster und Rest-Elemente</li>
        <li><strong>Template Literals</strong> — einschließlich Tagged Templates</li>
        <li><strong>Module</strong> — ESM-Imports/Exports zur Kompilierzeit aufgelöst</li>
      </ul>

      <h2>Plattformübergreifende native UI</h2>
      <p>
        Perry ist nicht auf CLI-Tools und serverseitige Anwendungen beschränkt. Es liefert native UI-Frameworks für sechs Plattformen mit:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>macOS</strong> — AppKit (NSWindow, NSView, NSButton, NSTextField und mehr)</li>
        <li><strong>iOS</strong> — UIKit (UIViewController, UIView, UIButton, UITableView)</li>
        <li><strong>iPadOS</strong> — UIKit (dieselbe API wie iOS, mit iPad-spezifischen Anpassungen)</li>
        <li><strong>Android</strong> — JNI + Android Views (Activity, View, Button, RecyclerView)</li>
        <li><strong>Linux</strong> — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)</li>
        <li><strong>Windows</strong> — Win32 (CreateWindowEx, Common Controls, GDI)</li>
      </ul>
      <p>
        Die zentrale Erkenntnis ist, dass Perry eine gemeinsame TypeScript-API auf das native Widget-Toolkit jeder Plattform zur Kompilierzeit abbildet. Es gibt keine Bridge-Schicht, keine Web-View und keine benutzerdefinierte Rendering-Engine. Deine App verwendet echte Plattform-Widgets, gerendert vom Betriebssystem selbst. Mehr dazu in unserem Deep Dive:{" "}
        <Link href="/blog/cross-platform-native-ui" className="text-perry-400 hover:text-perry-300">
          Plattformübergreifende native UI aus TypeScript
        </Link>.
      </p>

      <h2>Über 27 native npm-Paket-Implementierungen</h2>
      <p>
        Eine der größten praktischen Herausforderungen eines neuen Compilers ist die Ökosystem-Kompatibilität. Entwickler schreiben nicht nur Code von Grund auf — sie verwenden Pakete. Perry adressiert dies mit nativen Implementierungen von über 27 beliebten npm-Paketen:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Datenbanken</strong> — mysql2, pg, mongodb, better-sqlite3, ioredis</li>
        <li><strong>HTTP</strong> — axios, express, ws (WebSockets)</li>
        <li><strong>Sicherheit</strong> — bcrypt, jsonwebtoken, crypto</li>
        <li><strong>Utilities</strong> — uuid, chalk, dotenv, lodash (teilweise), moment</li>
        <li><strong>System</strong> — fs-extra, glob, chokidar, commander</li>
      </ul>
      <p>
        Das sind keine dünnen Wrapper um Node.js-Module. Sie werden direkt in deine Binärdatei kompiliert unter Verwendung nativer Systembibliotheken — libpq für PostgreSQL, OpenSSL für Kryptografie, libcurl für HTTP. Die API-Oberfläche entspricht dem, was du vom npm-Paket erwarten würdest, sodass die Migration unkompliziert ist.
      </p>

      <h2>Optionale V8-Kompatibilitätsschicht</h2>
      <p>
        Für npm-Pakete, die noch keine nativen Perry-Implementierungen haben, bietet Perry einen optionalen V8-Einbettungsmodus. Wenn aktiviert, bündelt Perry eine V8-Runtime und kann Standard-JavaScript-npm-Pakete neben deinem kompilierten TypeScript ausführen. Dies ist ein pragmatisches Notventil, das dir ermöglicht, Perry schrittweise zu übernehmen — kompiliere die heißen Pfade zu nativem Code und behalte dabei Zugriff auf das vollständige npm-Ökosystem für alles andere.
      </p>

      <h2>Cross-Kompilierung</h2>
      <p>
        Perry unterstützt Cross-Kompilierung direkt von Haus aus. Von deiner macOS-Entwicklungsmaschine aus kannst du für Linux (x86_64 und ARM64) und iOS kompilieren. Das bedeutet, du kannst deine CI/CD-Pipeline auf macOS aufbauen und Binärdateien für alle deine Deployment-Ziele produzieren, ohne dedizierte Build-Maschinen für jede Plattform zu brauchen.
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p className="text-slate-500"># Für Linux von macOS aus bauen</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target linux-x86_64</p>
          <p className="text-green-400">✓ Built executable: app (3.1 MB)</p>
          <p className="mt-3 text-slate-500"># Für iOS von macOS aus bauen</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: app (4.8 MB)</p>
        </div>
      </div>

      <h2>Performance</h2>
      <p>
        Perry-kompilierte Binärdateien sind schnell. Da es kein JIT-Aufwärmen, keinen Interpreter-Overhead und keine Garbage-Collector-Pausen gibt, ist die Performance vorhersagbar und konsistent ab dem ersten Aufruf.
      </p>
      <p>
        In unseren Benchmarks:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Startzeit</strong> — effektiv 0 ms (nativer Prozessstart)</li>
        <li><strong>Binärgröße</strong> — 2–5 MB für typische CLI-Tools (vs. 50+ MB für gebündeltes Node.js)</li>
        <li><strong>Speicherverbrauch</strong> — 5–10x niedriger als gleichwertige Node.js-Anwendungen</li>
        <li><strong>Durchsatz</strong> — konkurrenzfähig mit handgeschriebenem C für rechenintensive Arbeitslasten</li>
      </ul>
      <p>
        Live-Benchmarks findest du auf{" "}
        <a href="https://demo.perryts.com" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          demo.perryts.com
        </a>, wo Perry-kompilierte ausführbare Dateien in Echtzeit mit Node.js und Bun verglichen werden.
      </p>

      <h2>Aktueller Stand</h2>
      <p>
        Perry befindet sich in aktiver Entwicklung. Der Compiler ist stabil mit 62 von 62 bestandenen Tests in der Testsuite. Alle sechs Plattform-UI-Backends sind funktionsfähig. Die Kernsprachfeatures sind solide und werden erweitert.
      </p>
      <p>
        Wir arbeiten aktiv an der Erweiterung der UI-Widget-Bibliothek, der Verbesserung der String- und Objekt-Performance, der Vervollständigung der vollen Regex-Unterstützung und dem Bau des Stream-Moduls. Längerfristig planen wir WASM-Kompilierungsziele, Multi-Threading, eine VS Code-Erweiterung und Paketmanager-Integration.
      </p>
      <p>
        Schau dir die vollständige <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">Roadmap</Link> für Details an, was ausgeliefert wurde, was in Arbeit ist und was als Nächstes kommt.
      </p>

      <h2>Loslegen</h2>
      <p>
        Perry ist Open Source. Du kannst das Repo klonen, aus dem Quellcode bauen und heute anfangen, TypeScript zu kompilieren:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> git clone https://github.com/PerryTS/perry.git</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">cd</span> perry</p>
          <p><span className="text-slate-500">$</span> cargo build --release</p>
          <p className="mt-3 text-slate-500"># Kompiliere deine erste TypeScript-Datei</p>
          <p><span className="text-slate-500">$</span> ./target/release/<span className="text-cyan-400">perry</span> build hello.ts</p>
          <p className="text-green-400">✓ Built executable: hello (2.1 MB)</p>
          <p><span className="text-slate-500">$</span> ./hello</p>
          <p className="text-slate-300">Hello, world!</p>
        </div>
      </div>
      <p>
        Durchstöbere den Quellcode auf{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          GitHub
        </a>
        , schau dir die{" "}
        <Link href="/showcase" className="text-perry-400 hover:text-perry-300">Showcase</Link>
        {" "}an, um zu sehen, was mit Perry gebaut wird, oder tauche direkt in den Code ein. Wir können es kaum erwarten zu sehen, was du baust.
      </p>
    </>
  );
}
