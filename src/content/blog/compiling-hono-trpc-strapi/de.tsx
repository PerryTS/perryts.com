export default function Content() {
  return (
    <>
      <p>
        Perry kompiliert jetzt drei große TypeScript-Frameworks — Hono, tRPC und Strapi — zu nativen ARM64-Executables. Sie kompilieren in unter einer Sekunde, produzieren Binärdateien unter 2 MB und laufen ohne Abstürze.
      </p>
      <p>
        Dieser Beitrag behandelt, was funktioniert, was noch nicht funktioniert und was wir gelernt haben, als wir den Compiler gegen realen Code gedrückt haben.
      </p>

      <h2>Die Projekte</h2>
      <p>Wir haben diese drei ausgewählt, weil sie verschiedene Formen von TypeScript repräsentieren:</p>
      <ul className="list-disc list-inside">
        <li><strong>Hono</strong> — Ein leichtgewichtiges Web-Framework (29 Module). Starker Einsatz von Generics, Klassenvererbung, dynamischer Methodenzuweisung und den <code className="text-perry-400">Request</code>/<code className="text-perry-400">Response</code> Web-APIs. Seine Export-Struktur verwendet benannte Re-Exports über Barrel-Dateien.</li>
        <li><strong>tRPC</strong> — Ein typsicheres RPC-Framework (52 Module). Tiefe Re-Export-Ketten über 4+ Ebenen, Builder-Pattern mit generischer Typverengung, Klasseninstanziierung auf Modulebene und Streaming über Web Streams.</li>
        <li><strong>Strapi</strong> — Ein Headless CMS-Core (4 Module nativ kompiliert, Rest als extern aufgelöst). Monorepo mit Workspace-Paketauflösung, Namespace-Re-Exports (<code className="text-perry-400">export * as X</code>), Service-Container-Pattern mit <code className="text-perry-400">Map</code> und Factory-Funktionen.</li>
      </ul>

      <h2>Kompilierungsergebnisse</h2>
      <p>Alle drei kompilieren zu nativen Binärdateien mit null Kompilierungsfehlern:</p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Projekt</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Kompilierte Module</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Binärgröße</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Kompilierzeit</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800"><td className="py-3 px-4 text-slate-300">Hono</td><td className="py-3 px-4 text-slate-400">29</td><td className="py-3 px-4 text-slate-400">1.6 MB</td><td className="py-3 px-4 text-slate-400">0.59s</td></tr>
            <tr className="border-b border-slate-800"><td className="py-3 px-4 text-slate-300">tRPC</td><td className="py-3 px-4 text-slate-400">52</td><td className="py-3 px-4 text-slate-400">1.8 MB</td><td className="py-3 px-4 text-slate-400">0.97s</td></tr>
            <tr className="border-b border-slate-800"><td className="py-3 px-4 text-slate-300">Strapi</td><td className="py-3 px-4 text-slate-400">4</td><td className="py-3 px-4 text-slate-400">1.9 MB</td><td className="py-3 px-4 text-slate-400">0.80s</td></tr>
          </tbody>
        </table>
      </div>
      <p>Jedes Quellmodul durchläuft die vollständige Pipeline: SWC-Parse, HIR-Lowering, Cranelift-Codegen, Objektdatei-Emission und natives Linken. Die Kompilierzeiten beinhalten alles — vom Parsen bis zum finalen Link.</p>
      <p>Zum Kontext: <code className="text-perry-400">tsc --noEmit</code> allein auf tRPC dauert mehrere Sekunden. Perry kompiliert 52 Module zu einer gelinkten nativen Binärdatei in unter einer.</p>

      <h2>Was zur Runtime funktioniert</h2>
      <h3>Cross-Modul-Klasseninstanziierung</h3>
      <p>Das war der große Meilenstein. Honos Export-Struktur sieht so aus:</p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500"><div className="w-3 h-3 rounded-full bg-red-500/50" /><div className="w-3 h-3 rounded-full bg-yellow-500/50" /><div className="w-3 h-3 rounded-full bg-green-500/50" /><span className="ml-2 text-xs">hono export chain</span></div>
        <div className="space-y-1">
          <p className="text-slate-500">// hono/src/hono.ts</p>
          <p><span className="text-purple-400">export class</span> <span className="text-yellow-400">Hono</span> <span className="text-purple-400">extends</span> <span className="text-cyan-400">HonoBase</span> {"{"} ... {"}"}</p>
          <p className="mt-3 text-slate-500">// hono/src/index.ts</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;./hono&apos;</span></p>
          <p><span className="text-purple-400">export</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"}</p>
        </div>
      </div>
      <p>Dieses <code className="text-perry-400">export {"{"} Hono {"}"}</code> ist ein benannter Re-Export. In Perrys HIR wird daraus <code className="text-perry-400">Export::Named</code>. Zuvor folgte die Klassenpropagation des Compilers nur <code className="text-perry-400">ExportAll</code>- und <code className="text-perry-400">ReExport</code>-Ketten. Jetzt verfolgt Perry <code className="text-perry-400">Export::Named</code> durch die Imports des Moduls zurück, um die ursprüngliche Klassendefinition zu finden und sie zu propagieren.</p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> ./perry compile test_hono.ts -o /tmp/test-hono && /tmp/test-hono</p>
          <p className="mt-2"><span className="text-slate-400">[1] Class instantiation through named re-export chain</span></p>
          <p className="text-green-400">  PASS: new Hono() returned a real object</p>
          <p><span className="text-slate-400">[2] Constructor-initialized fields</span></p>
          <p className="text-green-400">  PASS: app.router initialized by constructor</p>
          <p className="text-green-400">  PASS: app.router.name = SmartRouter</p>
          <p><span className="text-slate-400">[5] Multiple instances</span></p>
          <p className="text-green-400">  PASS: second instance created with router</p>
          <p><span className="text-slate-400">[6] Constructor with options</span></p>
          <p className="text-green-400">  PASS: new Hono({"{"} strict: false {"}"}) accepted options</p>
        </div>
      </div>

      <h3>Multi-Level Re-Export-Auflösung</h3>
      <p>tRPCs <code className="text-perry-400">initTRPC</code> lebt 4 Ebenen tief:</p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-400">initTRPC.ts</span>                          <span className="text-slate-600">(export const initTRPC = ...)</span></p>
          <p><span className="text-slate-400">  -&gt; unstable-core-do-not-import.ts</span>  <span className="text-slate-600">(export * from &apos;./initTRPC&apos;)</span></p>
          <p><span className="text-slate-400">  -&gt; @trpc/server/index.ts</span>           <span className="text-slate-600">(export {"{"} initTRPC {"}"} from &apos;../../..&apos;)</span></p>
          <p><span className="text-slate-400">  -&gt; index.ts</span>                        <span className="text-slate-600">(export * from &apos;./@trpc/server&apos;)</span></p>
        </div>
      </div>
      <p>Das ist <code className="text-perry-400">ExportAll</code> → <code className="text-perry-400">Named</code> → <code className="text-perry-400">ExportAll</code>. Perry löst die vollständige Kette auf.</p>

      <h3>Type-Only Export-Filterung</h3>
      <p>Perry prüft jetzt SWCs <code className="text-perry-400">type_only</code>-Flag auf <code className="text-perry-400">ExportNamed</code>-Deklarationen und <code className="text-perry-400">is_type_only</code> auf einzelnen Specifiern und überspringt sie beim HIR-Lowering. Dies eliminierte die Generierung toter Stubs aus Type-Re-Exports über alle drei Projekte.</p>

      <h2>Was noch nicht funktioniert</h2>
      <p>Wir sind hier spezifisch, weil die Lücken genauso viel erzählen wie die Erfolge.</p>

      <h3>Dynamische Property-Zuweisung auf <code className="text-perry-400">this</code></h3>
      <p>Perry unterstützt <code className="text-perry-400">this[variable] = value</code> noch nicht, daher fehlen Honos HTTP-Methoden wie <code className="text-perry-400">app.get</code>, <code className="text-perry-400">app.post</code>. Das ist die größte einzelne Lücke für Hono.</p>

      <h3>Modul-Level Konstruktoraufrufe</h3>
      <p><code className="text-perry-400">export const initTRPC = new TRPCBuilder()</code> führt den Konstruktor zur Runtime nicht aus, sodass <code className="text-perry-400">initTRPC.create()</code> <code className="text-perry-400">undefined</code> ist.</p>

      <h3>Vererbte Properties</h3>
      <p><code className="text-perry-400">TRPCError extends Error</code>, und während <code className="text-perry-400">err.code</code> funktioniert, ist <code className="text-perry-400">err.message</code> (von <code className="text-perry-400">Error</code> geerbt) nicht zugänglich. Die Prototyp-Kette für Property-Lookup ist nicht vollständig implementiert.</p>

      <h3>Web API Built-In-Klassen</h3>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-700"><th className="text-left py-3 px-4 font-semibold text-slate-300">Klasse</th><th className="text-left py-3 px-4 font-semibold text-slate-300">Anzahl</th></tr></thead>
          <tbody>
            {[["Response","11"],["TransformStream","7"],["ReadableStream","5"],["Request","4"],["Headers","3"],["Proxy","2"],["TextEncoderStream","2"],["WritableStream","1"],["DOMException","1"]].map(([cls, count]) => (
              <tr key={cls} className="border-b border-slate-800"><td className="py-2 px-4 text-slate-300 font-mono text-xs">{cls}</td><td className="py-2 px-4 text-slate-400">{count}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p><code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code> und <code className="text-perry-400">Headers</code> sind die kritischen für jedes HTTP-Framework. Diese brauchen Built-In-Codegen-Unterstützung ähnlich zu dem, was wir bereits für <code className="text-perry-400">Map</code>, <code className="text-perry-400">Set</code>, <code className="text-perry-400">RegExp</code>, <code className="text-perry-400">Buffer</code>, <code className="text-perry-400">AbortController</code> und andere haben.</p>

      <h2>Was uns das zeigt</h2>
      <p>Die gute Nachricht: Perrys Kompilierungs-Pipeline verarbeitet echten Framework-Code. Die Lücken sind Runtime-Lücken, keine Kompilierungslücken. Die verbleibende Arbeit ist:</p>
      <ol className="list-decimal list-inside">
        <li><strong>Dynamische Property-Zuweisung</strong> — benötigt für Frameworks, die Methoden programmatisch einrichten</li>
        <li><strong>Modul-Level Init-Ausdrücke</strong> — <code className="text-perry-400">export const x = new Foo()</code> muss den Konstruktor tatsächlich ausführen</li>
        <li><strong>Prototyp-Kette</strong> — vererbte Properties und Methoden</li>
        <li><strong>Web API Built-Ins</strong> — <code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code>, <code className="text-perry-400">Headers</code> für HTTP-Frameworks</li>
      </ol>
      <p>Das sind konkrete, gut abgegrenzte Probleme. Keines davon erfordert architektonische Änderungen — es sind Erweiterungen von Mustern, die bereits für einfachere Fälle funktionieren.</p>
      <p>Wir werden weiter daran arbeiten. Das Ziel ist <code className="text-perry-400">new Hono().get(&apos;/&apos;, (c) =&gt; c.text(&apos;hello&apos;))</code>, das einen funktionierenden HTTP-Server in einer nativen Binärdatei produziert.</p>
    </>
  );
}
