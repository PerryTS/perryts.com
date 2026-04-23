export default function Content() {
  return (
    <>
      <p>
        Der letzte Beitrag endete mit Perry bei v0.5.80 und einer hartnäckigen Niederlage in der Benchmark-Tabelle: <code>JSON.parse</code>/<code>stringify</code>-Roundtrip war immer noch 1,6x langsamer als Node. Sechs Tage später ist Perry bei <strong>v0.5.174</strong> — das sind <strong>94 Patch-Releases</strong> — und drei Dinge haben sich verändert, die es wert sind, vor allem anderen herausgestellt zu werden:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code>@perryts/perry</code> ist auf <strong>npm</strong> verfügbar. Ein einziger Befehl installiert Perry auf jeder unterstützten Plattform.</li>
        <li><strong><code>perry dev</code></strong> bringt Watch-Mode-Auto-Recompile mit, obendrauf auf einen neuen In-Memory-AST-Cache und einen On-Disk-Pro-Modul-Object-Cache.</li>
        <li>Die <code>json_roundtrip</code>-Lücke ist geschlossen. Perry <strong>schlägt Node und Bun jetzt bei jedem Benchmark</strong> in der Haupt-Suite (15/15 gegen beide).</li>
      </ul>
      <p>
        Der Rest des Beitrags ist das Ensemble im Hintergrund: WebAssembly-Fixes, watchOS kompiliert endlich Ende-zu-Ende, <code>perry/thread</code>-Primitive sind den Rest des Weges verdrahtet, und eine Reihe von Compile-Time-Strictness-Gewinnen, die stille Drops in echte Fehler verwandeln.
      </p>

      <h2>1. <code>@perryts/perry</code> auf npm</h2>
      <p>
        Perry ließ sich schon immer via Homebrew auf macOS und APT auf Debian/Ubuntu installieren. Gute Abdeckung für Entwickler auf diesen Plattformen, gar nichts für Windows-Nutzer, es sei denn, sie bauten aus dem Quellcode, und nichts Einheitliches für ein Team, das Mac, Linux und Windows mischt. v0.5.107 hat dieses Problem aus dem Weg geräumt.
      </p>
      <pre><code>{`npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp`}</code></pre>
      <p>
        Das Paket ist ein schlanker Launcher, der von sieben plattformspezifischen Optional-Packages abhängt — macOS arm64/x64, Linux x64/arm64 auf glibc und musl, Windows x64 — und npm installiert nur das eine, das zu deiner Maschine passt. Die Binary-Größe pro Plattform liegt im niedrigen einstelligen Megabyte-Bereich. Die Installation selbst dauert Sekunden. Es gibt auch einen globalen Installationspfad (<code>npm install -g @perryts/perry</code>), falls du das bevorzugst, aber die projektlokale Installation pinnt die Compiler-Version neben deine Dependencies, was der richtige Default ist.
      </p>
      <p>
        Die Veröffentlichung lief über OIDC Trusted Publisher, sodass jeder Release provenanced ist und auf den CI-Job zurückverfolgt werden kann, der ihn gebaut hat. Das war ein eigener Tag CI-Arbeit — mehrere <code>v0.5.107</code>-CI-Commits, die die richtige Kombination aus <code>--provenance</code> / npm-Version / Workflow-Pfad jagten — aber es hat geklappt, und jeder Release seitdem war sauber. Windows-Nutzer sind jetzt First-Class-Citizens, und die teamübergreifende Reibung von &ldquo;installier es halt, wie dein OS es mag&rdquo; ist weg.
      </p>

      <h2>2. <code>perry dev</code> — Watch-Mode</h2>
      <p>
        v0.5.143 fügte einen neuen CLI-Subcommand hinzu:
      </p>
      <pre><code>{`perry dev`}</code></pre>
      <p>
        Das ist alles. Es beobachtet dein Projekt, rekompiliert beim Speichern und startet deine Binary neu. Die Inspiration sind Vite und <code>nodemon</code>; der Punkt ist, aufzuhören so zu tun, als müsse sich ein Compiler-zu-Binary-Workflow langsamer anfühlen als eine Runtime. Für die meisten Projekte baut <code>perry dev</code> bei warmem Cache in unter einer Sekunde neu.
      </p>
      <p>
        Der &ldquo;warme Cache&rdquo;-Teil ist wichtig. Zwei neue Caches landeten zusammen mit <code>perry dev</code>:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>In-Memory-AST-Cache</strong> (v0.5.156). Über Rebuilds hinweg innerhalb einer einzelnen <code>perry dev</code>-Session hält Perry den geparsten AST für jedes Modul, das sich nicht auf der Disk verändert hat. Eine Datei zu bearbeiten parst eine Datei neu, nicht den gesamten Modul-Graphen.
        </li>
        <li>
          <strong>On-Disk-Pro-Modul-Object-Cache (V2.2)</strong>. Jedes Modul kompiliert zu seiner eigenen <code>.o</code>-Datei und wird gehasht; unveränderte Module überspringen den Codegen komplett und der Linker greift auf das gecachte Object zurück. Die Verbose-Ausgabe des Caches entspricht der Spezifikation in <a href="https://github.com/PerryTS/perry/issues/131" className="text-amber-400 hover:text-amber-300">#131</a>, und eine Runde Audit-Härtung in v0.5.160 schloss die Edge Cases, in denen veraltete Cache-Einträge eine Header-Änderung überleben konnten.
        </li>
      </ul>
      <p>
        Die zwei Caches stapeln sich. Die erste Bearbeitung der Session ist eine Voll-Kompilierung; alles danach macht nur Arbeit proportional zu dem, was du tatsächlich verändert hast. Das ist der einzelne größte DX-Shift der Woche.
      </p>

      <h2>3. Bun bei jedem Benchmark schlagen</h2>
      <p>
        Bei v0.5.166 hatte die README eine ehrliche Einschränkung: Perry war 1,6x langsamer als Node bei <code>json_roundtrip</code> (50× <code>JSON.parse</code> + <code>JSON.stringify</code> auf einem 1MB, 10K-Item-Blob) und 2,4x langsamer als Bun. Issue <a href="https://github.com/PerryTS/perry/issues/149" className="text-amber-400 hover:text-amber-300">#149</a> trackte das Follow-up. Bis v0.5.173 — sieben Tage später — hat sich diese Lücke geschlossen.
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Workload</th>
              <th className="text-right py-2 px-3">Perry v0.5.173</th>
              <th className="text-right py-2 px-3">Node v25</th>
              <th className="text-right py-2 px-3">Bun 1.3</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>json_roundtrip</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">314ms</td><td className="text-right py-2 px-3">377ms</td><td className="text-right py-2 px-3">250ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>closure</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">10ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3">51ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>factorial</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">31ms</td><td className="text-right py-2 px-3">596ms</td><td className="text-right py-2 px-3">98ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>fibonacci(40)</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">320ms</td><td className="text-right py-2 px-3">1033ms</td><td className="text-right py-2 px-3">521ms</td></tr>
            <tr><td className="py-2 px-3"><code>mandelbrot</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">23ms</td><td className="text-right py-2 px-3">25ms</td><td className="text-right py-2 px-3">30ms</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Perry gewinnt jetzt jeden Workload in der Haupt-Benchmark-Suite — <strong>15/15 gegen Node, 15/15 gegen Bun</strong>, best of 5 Runs auf macOS ARM64. Bun 1.3 liegt noch vorn beim Peak-RSS (84MB vs. Perrys 310MB bei <code>json_roundtrip</code>), also ist Allocator-Druck das Nächste, was zu schließen ist, aber die reine Latenz gehört Perry.
      </p>
      <p>
        Das Schließen der JSON-Lücke war nicht eine einzelne Änderung — es war die Akkumulation der Object-Layout-Paritäts-Arbeit, die diese Woche durchlief: Phase-1-Object-Literal-Shape-Inferenz (v0.5.167), Phase-4-Body-basierte Return-Type-Inferenz für freie Funktionen, Klassen-Methoden, Getter und Arrows (v0.5.169) und Phase-4.1-Method-Call-Return-Type-Inferenz (v0.5.170). Das Thema ist dasselbe wie im letzten Beitrag: gib LLVM genug statische Struktur, durch die es hindurchschauen kann, und der Optimizer erledigt den Rest.
      </p>
      <p>
        v0.5.164 stellte außerdem <code>&lt;2 x double&gt;</code>-Parallel-Akkumulator-Autovectorization auf Pure-Fadd-Reduktionsschleifen wieder her, die irgendwann im v0.5.9x→v0.5.16x-Bereich stillschweigend regressiert war. Das bringt <code>math_intensive</code> und <code>accumulate</code> zurück zu ihrem alten 3-4x-Vorsprung gegenüber Rust/C++/Go/Swift — gleiches LLVM, ein <code>reassoc contract</code>-Flag, ein vektorisierter Schleifenkörper.
      </p>

      <h2>4. <code>perry/ui</code> und Doc-Tests</h2>
      <p>
        Vier verbleibende perry/ui-Lücken wurden in v0.5.151 geschlossen. Daneben wandelte v0.5.119 stillen perry/ui-API-Missbrauch von &ldquo;kompiliert und tut nichts&rdquo; in einen harten Compile-Fehler um — gleiche Logik wie v0.5.165 angewandt auf Dekoratoren (siehe unten). Missbrauch, der zur Compile-Zeit auftaucht, ist immer besser als zur Laufzeit.
      </p>
      <p>
        v0.5.123 lieferte ein <strong>Doc-Examples-Test-Harness</strong> und eine Widget-Galerie aus. Jedes TypeScript-Beispiel in der Dokumentation wird jetzt bei jedem CI-Run kompiliert, und die Widget-Galerie vergleicht Screenshots gegen abgesegnete Baselines. v0.5.125 erweiterte das auf eine Cross-Compile-Matrix: Jedes Doc-Beispiel wird für iOS, tvOS, Android, WASM und Web sowie die Host-Plattform gebaut, sodass API-Drift über Targets hinweg im PR gefangen wird, der ihn eingeführt hat, statt im Release-Zyklus, der ihn ausgeliefert hat.
      </p>
      <p>
        Ein kleiner Quality-of-Life-Gewinn: <code>perry check</code> gibt jetzt <code>file:line:column</code> für HIR-Lowering-Fehler aus (<a href="https://github.com/PerryTS/perry/issues/129" className="text-amber-400 hover:text-amber-300">#129</a>), was bedeutet, dass Editor-Jump-to-Error funktioniert, statt eine generische Meldung ohne Location anzuzeigen.
      </p>

      <h2>5. watchOS kompiliert Ende-zu-Ende</h2>
      <p>
        watchOS wurde letzten Monat als Kompilierungsziel ausgeliefert, aber ein sauberer Ende-zu-Ende-Build hatte einige raue Kanten. Die watchOS-Arbeit dieser Woche:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.113</strong>: <code>--target watchos</code> und <code>--target watchos-simulator</code> kompilieren jetzt Ende-zu-Ende, ohne die angesammelten Workarounds.</li>
        <li><strong>v0.5.114</strong>: <code>--features watchos-game-loop</code> für Metal-Surface-Apps.</li>
        <li><strong>v0.5.122</strong>: <code>--features watchos-swift-app</code> für SwiftUI-gehostetes Rendering — wenn du willst, dass SwiftUI den App-Lifecycle besitzt und Perry die UI darin komponiert.</li>
        <li><strong>v0.5.135</strong>: <code>PERRY_UI_TEST_MODE</code> in perry-ui-ios und perry-ui-tvos verdrahtet, sodass Geisterhand-UI-Tests auf diesen zwei Targets genauso laufen wie auf macOS und Linux.</li>
      </ul>

      <h2>6. <code>perry/thread</code>-Primitive vollständig verdrahtet</h2>
      <p>
        v0.5.174 (heute) schloss <a href="https://github.com/PerryTS/perry/issues/146" className="text-amber-400 hover:text-amber-300">#146</a>: <code>parallelMap</code>, <code>parallelFilter</code> und <code>spawn</code> sind vollständig durch den Codegen-Pfad verdrahtet, mit Compile-Time-Safety-Enforcement. Mutable Captures werden zur Compile-Zeit abgelehnt — dieselbe Compile-Time-Correctness-Haltung, die perry/ui und Dekoratoren jetzt haben. Thread-Primitive, die seit dem v0.4.0-Announcement teilweise verdrahtet waren, sind jetzt Ende-zu-Ende vollständig.
      </p>

      <h2>7. WebAssembly und das Web-Target</h2>
      <p>
        Zwei WASM-Fixes, die es wert sind, herausgestellt zu werden:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.158</strong>: fünf sich akkumulierende Bugs in <code>--target web</code> (dem WASM-Output-Pfad), die sich gegenseitig maskierten. Als Paket gefixt, sodass das Web-Target jetzt unter der vollen <code>perry/ui</code>-Oberfläche standhält (<a href="https://github.com/PerryTS/perry/issues/133" className="text-amber-400 hover:text-amber-300">#133</a>).</li>
        <li><strong>v0.5.161</strong>: <code>break</code>/<code>continue</code> innerhalb eines <code>if</code> innerhalb einer Schleife hing auf WASM — ein Codegen-Bug, der sich auf den nativen Targets nicht reproduzieren ließ. Gefixt (<a href="https://github.com/PerryTS/perry/issues/135" className="text-amber-400 hover:text-amber-300">#135</a>).</li>
      </ul>
      <p>
        Auch auf der Korrektheits-Seite: v0.5.157 behob <code>obj.field</code>, das <code>NaN</code> auf Android zurückgab (<a href="https://github.com/PerryTS/perry/issues/128" className="text-amber-400 hover:text-amber-300">#128</a>), und v0.5.162 behob einen verwünschten ws-Bug, bei dem <code>sendToClient</code> und <code>closeClient</code> zu stillen No-Ops kompiliert worden waren (<a href="https://github.com/PerryTS/perry/issues/136" className="text-amber-400 hover:text-amber-300">#136</a>).
      </p>

      <h2>8. Compile-Time-Strictness-Gewinne</h2>
      <p>
        Ein Thema dieser Woche: Alles, was früher ein stiller Fehlschlag war, ist jetzt ein Compile-Fehler.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.165</strong>: TypeScript-Dekoratoren wurden in HIR geparst und dann stillschweigend fallengelassen. Jetzt werfen sie am Dekorationspunkt einen Fehler mit einer klaren Meldung (<a href="https://github.com/PerryTS/perry/issues/144" className="text-amber-400 hover:text-amber-300">#144</a>). Gleiche Warn-zu-Bail-Argumentation wie v0.5.119 angewandt auf perry/ui.</li>
        <li><strong>v0.5.119</strong>: perry/ui-API-Missbrauch wird zur Compile-Zeit abgelehnt, statt eine No-Op-Binary zu produzieren.</li>
        <li><strong>v0.5.172</strong>: <code>console.trace()</code> emittiert jetzt einen echten nativen Backtrace auf stderr, statt nur die Meldung zu echoen (<a href="https://github.com/PerryTS/perry/issues/20" className="text-amber-400 hover:text-amber-300">#20</a>). Symbolisierte Frames erfordern <code>PERRY_DEBUG_SYMBOLS=1</code>; ohne das bekommst du Adressen, was immer noch mehr ist als das Message-Echo-Verhalten, das es ersetzt.</li>
      </ul>

      <h2>9. Zusammenfassung</h2>
      <p>
        Das Muster der Woche: <strong>Distribution</strong> (npm), <strong>Developer Experience</strong> (<code>perry dev</code>, inkrementelle Caches) und <strong>die letzte verbleibende Benchmark-Niederlage geschlossen</strong>. Plus ein Paket an Compile-Time-Strictness, das stille Drops in echte Fehler verwandelt. Sechs Tage, 94 Patch-Releases, ein großer DX-Shift.
      </p>
      <p>
        Probier&apos;s aus:
      </p>
      <pre><code>{`# npm (jede Plattform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Watch-Mode für iterative Entwicklung
perry dev`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
