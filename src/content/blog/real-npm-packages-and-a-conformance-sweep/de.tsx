export default function Content() {
  return (
    <>
      <p>
        Der letzte Beitrag endete bei <strong>v0.5.875</strong> mit der GC-Story — dem Schließen der Lücke, die aya_kotos Benchmark aufgedeckt hatte. Jener Beitrag handelte vom Gewinnen eines Benchmarks. Dieser handelt von einer anderen Art Arbeit: den etwa <strong>270 Releases zwischen v0.5.875 und v0.5.1146</strong>, gelandet über etwa vier Wochen, von denen fast keines eine Benchmark-Schlagzeile ist. Das Thema verschob sich von &bdquo;auf einem Microbenchmark schnell sein&ldquo; zu <strong>&bdquo;echtes TypeScript und echte npm-Pakete tatsächlich zum Kompilieren und Laufen bringen&ldquo;</strong>. Plus eine komplette visuelle Windows-Überholung und einen Haufen neuer Widgets auf dem Weg.
      </p>
      <p>
        Hier ist, was ausgeliefert wurde, gruppiert danach, wofür es tatsächlich war.
      </p>

      <h2>Echte npm-Pakete kompilieren jetzt</h2>
      <p>
        Der größte einzelne Faden durch dieses Fenster ist ein Sweep, um beliebte npm-Pakete zu nativen Binärdateien zu kompilieren und Verhaltenstests bestehen zu lassen — nicht nur &bdquo;ohne Fehler linken&ldquo;, sondern laufen und die richtige Ausgabe produzieren. Die Liste, die jetzt über <code>perry.compilePackages</code> funktioniert, umfasst <strong>axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2 und Colyseus</strong>.
      </p>
      <p>
        Jedes scheiterte aus seinem eigenen Grund, und jeder Fix ist seine eigene kleine Geschichte:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>zod v4</strong> stürzte mit <code>Cannot read properties of undefined (reading &apos;onattach&apos;)</code> ab. Grundursache (v0.5.1144, <a href="https://github.com/PerryTS/perry/issues/4698" className="text-amber-400 hover:text-amber-300">#4698</a>): <code>new F()</code>, wobei <code>F</code> eine aus einem anderen Modul importierte Funktion ist, produzierte stillschweigend ein leeres Objekt — der Konstruktor-Body lief nie, sodass jeder <code>$ZodCheckMinLength</code>-artige Check ohne seine <code>_zod</code>-Property zurückkam.</li>
        <li><strong>axios + jose</strong> brauchten Crypto und Kompression, die Perry noch nicht hatte: <code>zlib.createBrotliDecompress</code>, <code>crypto.subtle.wrapKey</code>/<code>unwrapKey</code>, <code>subtle.generateKey</code> / <code>encrypt</code> / <code>decrypt</code> für AES-GCM und <code>randomFillSync</code> (v0.5.972–976).</li>
        <li><strong>fastify</strong> verklemmte sich an einem Eine-Sekunde-Polling-Timeout in <code>wait_for_promise</code>; wir ersetzten es durch ein Condvar-Wait und ließen abgelehnte Promises als <code>HTTP 500</code> auftauchen, statt zu hängen (v0.5.912).</li>
        <li><strong>@hono/node-server</strong> konnte einen POST-Body nicht lesen — <code>c.req.text()</code> / <code>.json()</code> / <code>.formData()</code> gaben bei POST/PUT leer zurück, bis ein Parent-Registration-Fix in v0.5.1142.</li>
        <li><strong>chalk, ms, debug, express</strong> trafen alle dieselbe Form: einen <em>aufrufbaren Wert mit angehängten Properties</em> (<code>chalk.red</code>, <code>express()</code> plus <code>express.Router</code>). Drei Varianten dieses Musters wurden über v0.5.935 und den umgebenden npm-Sweep gefixt, plus <code>util.inherits</code> + ein Stream-Prototype-Scaffold, um express zu entsperren (v0.5.990).</li>
        <li><strong>dayjs</strong>, ausgeliefert als minifiziertes Bundle, übte JS-klassischen Prototype-Method-Dispatch (<code>Class.prototype.m = fn</code>) aus, den Perry falsch lowerte (v0.5.924/932).</li>
      </ul>
      <p>
        Unter all dem sitzt der Teil, der Pakete, die Perry <em>nicht</em> nativ kompilieren kann, trotzdem laufen lässt: Die <strong>V8-Fallback-Runtime</strong> wurde in diesem Fenster real. Ihr ModuleLoader liest jetzt aus einer eingebetteten Modul-Map, sodass eine Fallback-Binärdatei weiterhin <strong>self-contained</strong> ist — keine losen <code>node_modules</code> zur Laufzeit (v0.5.994). <code>createServer</code> brückt zu einem echten hyper-Server (v0.5.999), und die Web-Fetch-Globals <code>Response</code> / <code>Request</code> / <code>Headers</code> existieren im Fallback-Pfad (v0.5.1006). Und <strong>Compile-Time-dynamisches <code>import()</code></strong> — String-Literal-<code>await import(&apos;./foo.ts&apos;)</code>, zur Build-Zeit aufgelöst — landete endlich (v0.5.905, <a href="https://github.com/PerryTS/perry/issues/100" className="text-amber-400 hover:text-amber-300">#100</a>).
      </p>

      <h2>Ein test262-Conformance-Sweep</h2>
      <p>
        Der andere dominante Faden ist Conformance. Wir liefen fokussierte Passes gegen die test262-Subset-Radars und bewegten die Nadel bei den Built-ins, auf die sich echter Code am stärksten stützt:
      </p>
      <pre><code>{`built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)`}</code></pre>
      <p>
        Der String-Sprung kam daher, jeder <code>String.prototype</code>-Methode generischen <code>this</code>-Dispatch zu geben und die <code>slice</code>/<code>substring</code>-Index-Coercion zu fixen. Der Array-Sprung war <code>thisArg</code> auf den Dense-Array-Callbacks (<code>forEach</code>/<code>map</code>/<code>filter</code>/…), Array-like-<code>ToLength</code>, Spec-Operation-Ordering und Zero-Argument-Validierung. Destructuring nahm Parameter-Destructuring über plain, Generator-, Async-Generator-, statische und private Klassen-Methoden auf.
      </p>
      <p>
        Neben den Schlagzeilen-Zahlen landete ein langer Schwanz an Korrektheit: <code>JSON.parse</code> wirft jetzt einen echten <code>SyntaxError</code> (kein <code>TypeError</code>) und lehnt nachgestellte Tokens ab; sein Reviver läuft über den Spec-<code>InternalizeJSONProperty</code>-Algorithmus; <code>Object.prototype.toString</code> brandet korrekt für Typed Arrays, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp; <code>RegExp.prototype.toString</code> liefert <code>/source/flags</code>; Async-Generatoren bekamen ihre <code>yield</code>-awaits-operand-Semantik richtig. Das sind Subset-Radars, nicht die volle Suite — Perry klettert noch immer — aber der Anstieg diesen Monat war steil.
      </p>

      <h2>Windows wird Fluent</h2>
      <p>
        Windows bekam eine visuelle Überholung (die <a href="https://github.com/PerryTS/perry/issues/4681" className="text-amber-400 hover:text-amber-300">#4681</a>-Serie). Perry-Fenster wählen jetzt standardmäßig das moderne DWM-Chrome — <strong>Mica-Backdrop</strong>, abgerundete Ecken und eine theme-bewusste Titelleiste — und die Common Controls rendern durch <strong>comctl32 v6</strong> statt der Defaults aus der Windows-95-Ära. Die Window-Proc handhabt jetzt <code>WM_DPICHANGED</code>, sodass ein Fenster gestochen scharf bleibt, wenn du es zwischen Monitoren mit gemischter Skalierung ziehst, statt bitmap-gestreckt zu werden.
      </p>
      <p>
        Entscheidend ist, dass nichts davon die alte <a href="https://github.com/PerryTS/perry/issues/1542" className="text-amber-400 hover:text-amber-300">#1542</a>-Regression &bdquo;schwarzer Bereich nach Resize&ldquo; wieder einführte: Der Client-Bereich wird weiterhin opak gemalt, und Full-Frame-Mica/Acrylic-Blur-Through bleibt ein expliziter <code>app.setVibrancy(...)</code>-Opt-in. Es gibt außerdem ein neues <code>--target windows-winui</code>-Backend-Scaffold (WinUI 3) für Apps, die den voll modernen Stack wollen, und einen kleinen, aber echten Fix, der <code>perry compile main.ts -o main</code> auf Windows <code>main.exe</code> produzieren lässt, damit PowerShell es tatsächlich startet (v0.5.1146).
      </p>

      <h2>Neue Widgets, jede Plattform</h2>
      <p>
        Zwei Widgets landeten erst am letzten Tag, und beide spannen über jede UI-Plattform, die Perry targetet:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>DatePicker</strong> (<a href="https://github.com/PerryTS/perry/issues/4772" className="text-amber-400 hover:text-amber-300">#4772</a>) — ein kompaktes, feld-artiges Datums-Control: <code>NSDatePicker</code> auf macOS, <code>UIDatePicker</code> (.compact) auf iOS/visionOS, <code>SysDateTimePick32</code> auf Windows, <code>android.widget.DatePicker</code> auf Android, GTK4 auf Linux. Eine TS-Oberfläche über alle hinweg.</li>
        <li><strong>Drag &amp; Drop</strong> (<a href="https://github.com/PerryTS/perry/issues/4773" className="text-amber-400 hover:text-amber-300">#4773</a>) — jedes Widget kann ein Drop-Ziel und eine Drag-Quelle für Text/Dateien/URLs sein, gemappt auf <code>NSDraggingDestination</code> (AppKit), <code>UIDropInteraction</code> (UIKit) und <code>View.setOnDragListener</code> (Android).</li>
      </ul>
      <pre><code>{`import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});`}</code></pre>
      <p>
        Früher im Fenster füllte sich das Widget-Regal auch über Desktop und Mobile — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation und eine swipebare ImageGallery — jedes von dem echten nativen Control auf jeder Plattform gestützt. HarmonyOS (ArkTS) bekam Chart und TreeView (v0.5.893), die letzten zwei Widgets, die es brauchte, um Parität mit den anderen zu erreichen.
      </p>

      <h2>GC, Internals und Stabilität</h2>
      <p>
        Die meisten dieser 270 Releases sind keine Schlagzeilen — sie sind Bug-Fixes und Internals, und das ist der Punkt dieser Phase. Ein paar, die hervorzuheben sind:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>GC ging weiter.</strong> Die Conditional-Free-List-Arbeit aus dem GC-Beitrag setzte sich weiter, und eine scharfe Bug-Klasse wurde geschlossen: Native-gebrückte Promises werden jetzt <strong>gepinnt, während sie auf einem tokio-Worker in Flight sind</strong>, sodass der GC sie nicht wegfegen kann, bevor die Auflösung landet (v0.5.923). Wenn du ein Async-Fetch unter Last liefest und eine Phantom-Collection sahst, war das das.</li>
        <li><strong>Das Memory-Modell ist dokumentiert.</strong> Es gibt jetzt einen <code>internals/memory-model.md</code>-Deep-Dive — NaN-Boxing, den generationellen GC, den Shadow-Stack und Write-Barriers — in die Docs-Site verdrahtet (v0.5.933).</li>
        <li><strong>Eine Welle von Codegen-Stabilitäts-Fixes</strong>, aufgetaucht durch den npm-Sweep: Ein Modul-Level-<code>const</code>-Arrow, das innerhalb eines wiederaufgenommenen Async-Steps aufgerufen wird, SIGSEGVt nicht mehr (v0.5.953), <code>{`try { await rejected } catch { return X }`}</code> hängt nicht mehr ewig (v0.5.870), und eine Handvoll <code>js_is_truthy</code> / Raw-Pointer-Range-Crashes, über die echte Bundles stolperten.</li>
      </ul>

      <h2>Apple-Hausarbeit</h2>
      <p>
        Kleiner, aber echt: <code>perry setup ios --development</code> provisioniert jetzt für Development-Builds (v0.5.1023), und der Apple-Cross-Library-Build/Link-Pfad wurde dedupliziert und pointer-width-portabel gemacht (v0.5.1121/1125) — was die npm / Homebrew / APT / winget-Publish-Matrix entsperrte, die festgesteckt hatte.
      </p>

      <h2>Wo das die Dinge hinterlässt</h2>
      <p>
        Die Wette hinter Perry war immer, dass &bdquo;natives TypeScript&ldquo; nur dann zählt, wenn <em>echtes</em> TypeScript läuft — nicht ein Spielzeug-Subset, sondern die tatsächlichen Pakete, die Leute <code>npm install</code>en. Dieser Monat war größtenteils diese Arbeit: weniger eine einzelne Zahl zum Angeben, mehr ein langer, unglamouröser Vorstoß, um die Lücke zwischen &bdquo;kompiliert&ldquo; und &bdquo;funktioniert&ldquo; zu schließen. Die Conformance-Radars und die npm-Paritätstests sind die Anzeigetafel, die wir jetzt beobachten, und wir werden weiter die Zahlen posten — die guten und die noch unvollkommenen.
      </p>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
