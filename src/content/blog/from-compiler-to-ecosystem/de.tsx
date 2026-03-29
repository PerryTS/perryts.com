import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Vor einer Woche war Perry ein Compiler mit einem UI-Toolkit. Man konnte TypeScript schreiben, es zu einer nativen Binärdatei kompilieren und auf sechs Plattformen ausliefern. Das war die Geschichte. Heute ist die Geschichte größer: Perry wird zu einem Ökosystem. Drei Datenbank-ORMs, universelle Push-Benachrichtigungen, verteilte Builds mit App Store und Play Store-Veröffentlichung, eine React-Kompatibilitätsschicht und automatisierte App-Verifizierung — alles in der letzten Woche gelandet.
      </p>
      <p>
        Dieser Beitrag behandelt, was ausgeliefert wurde, warum es wichtig ist und wie der Code aussieht.
      </p>

      <h2>perry/ui: Das Fundament</h2>
      <p>
        Bevor wir zu den neuen Bibliotheken kommen, lohnt es sich zu betonen, was im Zentrum von allem steht: <code className="text-amber-400">perry/ui</code>. Das ist Perrys eigenes natives UI-Toolkit — über 20 Widgets, die direkt zu plattform-nativen Komponenten auf allen sechs Zielen kompilieren. Es ist kein Wrapper, keine Abstraktionsschicht, keine Web View. Jeder <code className="text-amber-400">Button</code> wird zu einem <code className="text-amber-400">NSButton</code> auf macOS, einem <code className="text-amber-400">UIButton</code> auf iOS, einem <code className="text-amber-400">GtkButton</code> auf Linux, einem <code className="text-amber-400">android.widget.Button</code> auf Android und einem <code className="text-amber-400">CreateWindowEx</code>-Steuerelement auf Windows.
      </p>
      <p>
        <code className="text-amber-400">perry/ui</code> ist Perrys primäre und fortschrittlichste UI-Oberfläche. Es umfasst reaktives State Management, Layout-Container (VStack, HStack, ZStack, SplitView), ein hardwarebeschleunigtes Canvas, Table Views mit Spaltensortierung, das <code className="text-amber-400">perry/system</code>-Modul für Dateidialoge, Keychain-Zugriff, Benachrichtigungen und Multi-Window — alles aus TypeScript, alles kompiliert zu direkten Plattform-API-Aufrufen. Jeder andere UI-Ansatz in Perry, einschließlich der React-Kompatibilitätsschicht, baut auf <code className="text-amber-400">perry/ui</code> auf und bildet auf dessen Widgets zurück.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">app.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Window, VStack, Button, Text, State }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> count = <span className="text-blue-400">new</span> <span className="text-amber-400">State</span>(0);</p>
          <p className="mt-3"><span className="text-blue-400">const</span> window = <span className="text-blue-400">new</span> <span className="text-amber-400">Window</span>({`{ title: "Counter" }`});</p>
          <p>window.<span className="text-amber-400">setContent</span>(</p>
          <p className="ml-4"><span className="text-blue-400">new</span> <span className="text-amber-400">VStack</span>({`{`} children: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Text</span>({`{ text: count }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Button</span>({`{ title: "+1", onClick: () => count.set(count.get() + 1) }`}),</p>
          <p className="ml-4">] {`})`}</p>
          <p>);</p>
        </div>
      </div>

      <p>
        Das reaktive <code className="text-amber-400">State</code>-Objekt ist die Schlüssel-Primitive. Wenn sich ein State-Wert ändert, aktualisieren sich nur die an diesen State gebundenen Widgets — kein Virtual DOM Diffing, keine vollständigen Baum-Rerenders, kein Reconciliation-Pass. Es ist der direkteste Weg von TypeScript zu nativer Plattform-UI, der existiert.
      </p>

      <h2>React-Kompatibilität: Eine dünne Schicht auf perry/ui</h2>
      <p>
        Für Entwickler, die von React kommen, bietet <code className="text-amber-400">perry-react</code> eine Kompatibilitätsschicht, die Reacts Komponentenmodell auf <code className="text-amber-400">perry/ui</code>-Widgets abbildet. Du kannst <code className="text-amber-400">useState</code>, <code className="text-amber-400">useRef</code>, <code className="text-amber-400">useReducer</code> und JSX verwenden — und Perry kompiliert es zu denselben nativen Widgets darunter. Es ist eine Komfortbrücke, keine separate Rendering-Engine.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.tsx</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> React, {`{ useState }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;react&apos;</span>;</p>
          <p className="mt-3"><span className="text-violet-400">function</span> <span className="text-amber-400">Counter</span>() {`{`}</p>
          <p className="ml-4"><span className="text-blue-400">const</span> [count, setCount] = <span className="text-amber-400">useState</span>(0);</p>
          <p className="ml-4"><span className="text-violet-400">return</span> (</p>
          <p className="ml-8">&lt;<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">h1</span>&gt;{`{count}`}&lt;/<span className="text-blue-400">h1</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">button</span> <span className="text-amber-400">onClick</span>={`{() => setCount(count + 1)}`}&gt;+1&lt;/<span className="text-blue-400">button</span>&gt;</p>
          <p className="ml-8">&lt;/<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-4">);</p>
          <p>{`}`}</p>
        </div>
      </div>

      <p>
        Unter der Haube bildet jedes JSX-Element auf ein <code className="text-amber-400">perry/ui</code>-Widget ab: <code className="text-amber-400">{`<div>`}</code> wird zu einem VStack, <code className="text-amber-400">{`<button>`}</code> wird zu einem Button, <code className="text-amber-400">useState</code> wird durch Perrys reaktiven State gestützt. Es ist früh — Phase 1 mit Full-Tree-Rerenders und globalem Hook-Storage — aber es beweist, dass bestehender React-Code über Perry native Plattformen ansprechen kann. Wir erkunden auch Angular- und Ionic-Kompatibilität entlang ähnlicher Linien.
      </p>

      <h2>Drei Datenbank-ORMs: Prisma-API, native Performance</h2>
      <p>
        Wenn du einen Server oder eine Desktop-App baust, die mit einer Datenbank kommuniziert, hat Perry dich jetzt mit drei Prisma-kompatiblen ORMs abgedeckt: <code className="text-amber-400">perry-prisma</code> (MySQL), <code className="text-amber-400">perry-sqlite</code> (SQLite) und <code className="text-amber-400">perry-postgres</code> (PostgreSQL). Alle drei sind Drop-in-Ersatz für <code className="text-amber-400">@prisma/client</code>. Dieselbe API, dieselben Query-Muster, aber kompiliert zu nativem Code mit direktem Datenbank-FFI — kein Prisma-Engine, kein Node.js.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">database.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ PrismaClient }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;@prisma/client&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> prisma = <span className="text-blue-400">new</span> <span className="text-amber-400">PrismaClient</span>();</p>
          <p className="mt-3"><span className="text-slate-500">// Dieselbe Prisma-API — kompiliert zu nativem SQL via Rust FFI</span></p>
          <p><span className="text-blue-400">const</span> users = <span className="text-violet-400">await</span> prisma.user.<span className="text-amber-400">findMany</span>({`{`}</p>
          <p className="ml-4">where: {`{ email: { contains: "@perry.dev" } }`},</p>
          <p className="ml-4">orderBy: {`{ createdAt: "desc" }`},</p>
          <p className="ml-4">take: 10,</p>
          <p>{`});`}</p>
          <p className="mt-3"><span className="text-violet-400">await</span> prisma.post.<span className="text-amber-400">create</span>({`{`}</p>
          <p className="ml-4">data: {`{ title: "Hello", authorId: users[0].id }`},</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        Unter der Haube ist jedes ORM ein TypeScript-Frontend, gestützt durch eine Rust-FFI-Schicht mit <code className="text-amber-400">sqlx</code>. Der Query-Flow: TypeScript serialisiert die Query zu JSON, übergibt sie über die FFI-Grenze, Rust baut parametrisiertes SQL, führt es über den Connection Pool aus und serialisiert das Ergebnis zurück. Das Prisma-Schema wird zur Build-Zeit gelesen — null Runtime-Parsing.
      </p>
      <p>
        Die drei Implementierungen teilen ~95 % ihres Codes. Die Unterschiede sind, was man erwarten würde: Identifier-Quoting (<code className="text-amber-400">`col`</code> vs <code className="text-amber-400">&quot;col&quot;</code>), Placeholder-Syntax (<code className="text-amber-400">?</code> vs <code className="text-amber-400">$1, $2</code>) und Transaktionssemantik. Alle drei unterstützen die vollständige Prisma-CRUD-Oberfläche: findMany, findFirst, findUnique, create, createMany, update, updateMany, upsert, delete, deleteMany, count — plus Raw SQL, Transaktionen und über 10 WHERE-Filteroperatoren.
      </p>

      <h2>perry-push: Universelle Push-Benachrichtigungen</h2>
      <p>
        <code className="text-amber-400">perry-push</code> ist eine einzelne Bibliothek, die Push-Benachrichtigungen über jede Plattform hinweg handhabt: APNs (iOS/macOS), FCM (Android), Web Push (Browser) und WNS (Windows). Jeder Provider ist ein Rust-FFI-Modul mit genau drei Funktionen: <code className="text-amber-400">*_provider_new</code>, <code className="text-amber-400">*_provider_close</code> und <code className="text-amber-400">*_send</code>.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">notify.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ ApnProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/apn&apos;</span>;</p>
          <p><span className="text-violet-400">import</span> {`{ FcmProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/fcm&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> apn = <span className="text-blue-400">new</span> <span className="text-amber-400">ApnProvider</span>({`{ teamId, keyId, key }`});</p>
          <p><span className="text-blue-400">const</span> fcm = <span className="text-blue-400">new</span> <span className="text-amber-400">FcmProvider</span>({`{ serviceAccount }`});</p>
          <p className="mt-3"><span className="text-slate-500">// Einheitlicher Ergebnistyp für alle Provider</span></p>
          <p><span className="text-blue-400">const</span> result = <span className="text-violet-400">await</span> apn.<span className="text-amber-400">send</span>({`{`}</p>
          <p className="ml-4">deviceToken: token,</p>
          <p className="ml-4">title: <span className="text-green-400">&quot;New message&quot;</span>,</p>
          <p className="ml-4">body: <span className="text-green-400">&quot;You have a new reply&quot;</span>,</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        Kryptografie wird von <code className="text-amber-400">ring</code> gehandhabt — ES256 JWTs für APNs und VAPID, RS256 für FCM-Servicekonten, AES-GCM für Web Push-Payload-Verschlüsselung. Alles kompiliert zu nativem Code. Kein <code className="text-amber-400">node-gyp</code>, keine OpenSSL-Abhängigkeit.
      </p>

      <h2>Perry Hub + Builders: Verteilte Cloud-Builds</h2>
      <p>
        Das ist der Infrastruktur-Play. <code className="text-amber-400">perry-hub</code> ist ein Build-Orchestrierungsserver — selbst von Perry aus TypeScript kompiliert — der einen Pool von Build-Workern verwaltet. Du pushst dein Projekt, der Hub verteilt es an den richtigen Worker basierend auf der Zielplattform, und der Worker kompiliert, signiert und veröffentlicht optional deine App.
      </p>
      <p>
        Heute existieren zwei Worker: ein macOS-Builder (behandelt macOS, iOS und Android-Ziele) und ein Linux-Builder (behandelt Linux und Android). Beide sind Rust-Binärdateien, die sich über WebSocket mit dem Hub verbinden, Source-Tarballs herunterladen, den Perry-Compiler ausführen und Artefakte zurück hochladen.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Code-Signierung</strong> — Apple-Notarisierung für macOS, Provisioning-Profile für iOS, Android-Keystore-Signierung</li>
        <li><strong>App Store-Veröffentlichung</strong> — direkter Upload zu App Store Connect und Google Play Store</li>
        <li><strong>Artefakt-Management</strong> — gebaute Binärdateien mit TTL-basierter Bereinigung zum Hub hochgeladen</li>
        <li><strong>Lizenz-Management</strong> — Rate-Limits pro Lizenz, Prioritäts-Queuing (Pro-Stufe bekommt Priorität)</li>
      </ul>
      <p>
        Der Hub selbst ist eine faszinierende Fallstudie. Es ist eine ~1.500-Zeilen TypeScript-Datei, kompiliert zu einer 2 MB nativen Binärdatei von Perry. Er läuft Fastify auf Port 3456 für HTTP und <code className="text-amber-400">ws</code> auf Port 3457 für WebSocket. Aller State ist im Speicher mit JSON-Persistenz — keine externe Datenbank. Es ist die Art von Server, die man mit <code className="text-amber-400">scp</code> und einer systemd-Unit-Datei deployen kann.
      </p>

      <h2>perry-verify: Automatisierte App-Verifizierung</h2>
      <p>
        <code className="text-amber-400">perry-verify</code> ist ein eigenständiger HTTP-Service, der eine kompilierte Binärdatei und eine Konfiguration nimmt, eine Verifizierungs-Pipeline ausführt und strukturierte Pass/Fail-Ergebnisse mit Screenshots zurückgibt. Er startet die App, führt Authentifizierungsflows aus (deterministisch oder KI-gestützt), prüft den State und erfasst Beweise.
      </p>
      <p>
        Plattform-Adapter existieren für macOS (über Accessibility APIs), Linux (AT-SPI) und Stubs für iOS Simulator und Android Emulator. Die KI-Schicht verwendet Claude für Fallback-Authentifizierung und State-Verifizierung, wenn deterministische Checks nicht möglich sind. Es ist designed, sich in die Build-Pipeline des Hubs als Post-Build-Schritt einzufügen: Kompilieren, Signieren, Verifizieren, Veröffentlichen.
      </p>

      <h2>Pry ist überall verfügbar</h2>
      <p>
        <Link href="/blog/building-pry" className="text-amber-400 hover:text-amber-300">Pry</Link>, der native JSON-Viewer, den wir als Perry-Showcase gebaut haben, ist jetzt auf fünf Plattformen verfügbar. Er ist im{" "}
        <a href="https://apps.apple.com/app/pry-json-viewer/id6759329040" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Mac App Store</a> und{" "}
        <a href="https://play.google.com/store/apps/details?id=com.perry.pry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Google Play</a>, mit nativen Binärdateien für Linux und Windows. Dieselbe TypeScript-Codebasis, fünf plattformspezifische Einstiegspunkte, fünf native Binärdateien. Es ist der konkreteste Beweis, dass dieser gesamte Ansatz von Ende zu Ende funktioniert — vom TypeScript-Quellcode zum App Store-Eintrag.
      </p>

      <h2>Was das alles bedeutet</h2>
      <p>
        Ein Compiler ist interessant. Ein Ökosystem ist nützlich. In der letzten Woche ging Perry von &quot;du kannst TypeScript zu nativem Code kompilieren&quot; zu &quot;du kannst eine vollständige App mit nativer UI, einer Prisma-Datenbank, Push-Benachrichtigungen und Builds bauen, die automatisch im App Store veröffentlichen.&quot;
      </p>
      <p>
        Die Teile beginnen sich zu verbinden:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/ui</strong> ist der direkteste Weg von TypeScript zu nativer Plattform-UI — reaktiver State, über 20 Widgets, null Abstraktionsschichten</li>
        <li><strong>perry-prisma/sqlite/postgres</strong> bedeutet, bestehender Datenbankcode portiert mit minimalen Änderungen</li>
        <li><strong>perry-push</strong> bedeutet native Push-Benachrichtigungen ohne plattformspezifische Bibliotheken</li>
        <li><strong>perry-hub + builders</strong> bedeutet, man kann von <code className="text-amber-400">perry publish</code> zum App Store in einem Schritt gelangen</li>
        <li><strong>perry-verify</strong> bedeutet automatisiertes Testen der kompilierten Ausgabe, nicht nur des Quellcodes</li>
        <li><strong>perry-react</strong> bedeutet, React-Entwickler können Perry mit vertrauten Mustern nutzen, alles auf perry/ui darunter abgebildet</li>
      </ul>
      <p>
        Das ist nicht theoretisch. Jede hier aufgeführte Bibliothek hat funktionierenden Code, Tests und Dokumentation. Mehrere werden bereits in Produktion verwendet — die Perry-Landingpage selbst läuft auf einem Perry-kompilierten Fastify-Server, und Pry ist in zwei App Stores live.
      </p>

      <h2>Was kommt als Nächstes</h2>
      <p>
        Die unmittelbare Roadmap:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/ui-Erweiterung</strong> — Drag and Drop, Barrierefreiheitslabels, benutzerdefinierte Kontextmenüs, mehr Layout-Primitive</li>
        <li><strong>perry-verify-Integration</strong> — automatisierte Verifizierung in der Build-Pipeline</li>
        <li><strong>Framework-Kompatibilität</strong> — Verbesserung der React-, Angular- und Ionic-Schichten als Einstieg in perry/ui</li>
        <li><strong>Vollständige Regex-Unterstützung</strong> — ECMAScript-kompatible Regex-Engine kompiliert zu nativem Code</li>
      </ul>
      <p>
        Verfolge den Fortschritt auf{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">GitHub</a>, oder sieh dir die{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">Roadmap</Link>
        {" "}für das vollständige Bild an.
      </p>
    </>
  );
}
