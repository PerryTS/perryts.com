import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        103 Commits zum Perry-Compiler diese Woche. Die Headline-Features: Du kannst jetzt Windows-Executables von Linux aus cross-kompilieren, iOS-Apps können blockierende Game Loops ausführen, der Compiler meldet Abstürze für Telemetrie, und der Self-Hosting-Compiler besteht jeden deterministischen Test, den wir ihm vorwerfen. Dazu ein großes Hub-Infrastruktur-Upgrade und über 50 Bugfixes.
      </p>

      <h2>Cross-Kompilierung zu Windows von Linux</h2>
      <p>
        Perry kann jetzt Windows <code className="text-amber-400">.exe</code>-Binärdateien von einem Linux-Host produzieren. Das ist das fehlende Stück für CI/CD-Pipelines, die Windows als Ziel brauchen, ohne eine Windows-Build-Maschine für die gesamte Kompilierung laufen zu lassen.
      </p>
      <p>
        Die Implementierung ersetzt Compile-Time <code className="text-amber-400">#[cfg]</code>-Checks durch Runtime-Zielerkennung. Wenn der Compiler ein Windows-Ziel auf einem Nicht-Windows-Host erkennt, lokalisiert er <code className="text-amber-400">lld-link</code>,{" "}
        <code className="text-amber-400">llvm-nm</code> und{" "}
        <code className="text-amber-400">llvm-ar</code> aus der Rust-Toolchain oder dem PATH über einen neuen <code className="text-amber-400">find_llvm_tool()</code>-Helper. Die Windows-Systembibliotheken kommen von einem{" "}
        <a href="https://github.com/Jake-Shadle/xwin" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          xwin
        </a>-artigen Sysroot, auf das <code className="text-amber-400">PERRY_WINDOWS_SYSROOT</code> zeigt.
      </p>
      <p>
        Der Linker verwendet automatisch <code className="text-amber-400">/FORCE:UNRESOLVED</code> und generiert Stubs für fehlende UI-Symbole, sodass CLI-Apps sauber cross-kompilieren. Die Ausgabe hat standardmäßig die Endung <code className="text-amber-400">.exe</code> beim Windows-Targeting. Die vollständigen Details stehen in der{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Cross-Kompilierungs-Dokumentation
        </a>.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal — Linux host</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile main.ts --target windows</p>
          <p className="text-slate-500">Compiling main.ts for windows-x86_64...</p>
          <p className="text-slate-500">Using lld-link from Rust toolchain</p>
          <p className="text-green-400">&#x2713; Compiled executable: main.exe (2.8 MB)</p>
        </div>
      </div>

      <h2>iOS Game Loop-Unterstützung</h2>
      <p>
        iOS verlangt, dass UIKit den Main-Thread besitzt. Das ist für event-gesteuerte Apps in Ordnung, aber es ist ein Problem für Spiele, die eine blockierende <code className="text-amber-400">while (!shouldClose)</code>-Schleife brauchen. Perry löst dies jetzt mit dem <code className="text-amber-400">--features ios-game-loop</code>-Flag.
      </p>
      <p>
        Wenn aktiviert, emittiert der Compiler{" "}
        <code className="text-amber-400">_perry_user_main</code> statt{" "}
        <code className="text-amber-400">main</code>. Die Runtime stellt ein{" "}
        <code className="text-amber-400">main()</code> bereit, das{" "}
        <code className="text-amber-400">UIApplicationMain</code> auf dem Main-Thread aufruft und deinen Code auf einem Hintergrund-Thread startet. Scene Delegate und App Delegate handhaben den vollständigen UIKit-Lifecycle, während deine Game Loop unblockiert läuft.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">main.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">// Deine Game Loop läuft auf einem Hintergrund-Thread</span></p>
          <p><span className="text-blue-400">while</span> (!shouldClose) {"{"}</p>
          <p>  update();</p>
          <p>  render();</p>
          <p>  awaitNextFrame();</p>
          <p>{"}"}</p>
        </div>
      </div>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> run ios --features ios-game-loop</p>
        </div>
      </div>

      <p>
        Dies ermöglicht eine ganze Kategorie von Apps — Spiele, Simulationen, Echtzeit-Visualisierungen — die auf iOS vorher nicht praktikabel waren. Die iOS-Pump- und Callback-Pfade sind jetzt auch in Panic-Handling gewrappt, sodass Abstürze sowohl in der Game Loop als auch im UIKit-Lifecycle sauber abgefangen werden.
      </p>

      <h2>Crash-Reporting</h2>
      <p>
        Perry-kompilierte Apps installieren jetzt beim Start einen Panic Hook und Signal-Handler für{" "}
        <code className="text-amber-400">SIGSEGV</code>,{" "}
        <code className="text-amber-400">SIGBUS</code> und{" "}
        <code className="text-amber-400">SIGABRT</code>. Bei einem fatalen Absturz werden die Details in <code className="text-amber-400">~/.hone/crash.log</code> für das Chirp-Telemetriesystem geschrieben. Gefangene Panics (in{" "}
        <code className="text-amber-400">catch_callback_panic</code>) löschen das Log, sodass nur echte nicht-behebbare Abstürze gemeldet werden.
      </p>
      <p>
        Das ist ein Feature für Produktionsreife. Wenn etwas im Feld schiefgeht, werden wir davon erfahren — und das Crash-Log enthält genug Kontext, um das Problem zu diagnostizieren, ohne dass Benutzer manuell etwas melden müssen.
      </p>

      <h2>Hub: Zweistufige Windows-Build-Pipeline</h2>
      <p>
        Die Perry Hub Build-Infrastruktur erhielt ein bedeutendes Architektur-Upgrade. Zuvor erforderte das Bauen für Windows einen Windows-Worker für die gesamte Kompilierung. Jetzt wird die Pipeline in zwei Stufen aufgeteilt:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>Ein Linux-Worker cross-kompiliert das Windows-Artefakt mit der neuen lld-link-Unterstützung</li>
        <li>Der Hub hält das vorkompilierte Artefakt und reiht den Job für einen Windows-Worker neu ein</li>
        <li>Der Windows-Worker übernimmt nur die Signierung und Paketierung — eine viel leichtere Aufgabe</li>
      </ol>
      <p>
        Wenn ein Worker <code className="text-amber-400">complete</code> mit{" "}
        <code className="text-amber-400">needs_finishing: &quot;windows&quot;</code> sendet, reiht der Hub den Job transparent neu ein. Die CLI sieht ein nahtloses Single-Build-Erlebnis.
      </p>
      <p>
        Der Hub startet jetzt auch automatisch Azure Windows VMs, wenn kein Windows-Worker verbunden ist, und Build-Worker aktualisieren sich automatisch auf die neueste Perry-Version bei neuen Releases. Weniger manuelle Infrastrukturverwaltung, schnellere Builds.
      </p>

      <h2>Dokumentations-Überarbeitung</h2>
      <p>
        Zwei große Dokumentations-Neuschreibungen landeten diese Woche auf{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>perry.toml-Referenz</strong> — vollständige Abschnittsdokumentation zu jeder Konfigurationsoption, Bundle-ID-Auflösung, Entry-File-Auflösung, Build-Number-Auto-Inkrement und CI/CD-Beispielen
        </li>
        <li>
          <strong>Geisterhand-Referenz</strong> — vollständige API-Dokumentation, Plattform-Setup, Test-Automatisierungsmuster und Architekturübersicht für das plattformübergreifende UI-Testframework
        </li>
      </ul>
      <p>
        Das sind keine inkrementellen Updates. Beides sind Neuschreibungen von Grund auf, die jedes Feature und jede Konfigurationsoption abdecken. Wenn du ein neues Projekt aufsetzt oder Tests schreibst, starte hier.
      </p>

      <h2>Plattformübergreifende Menü-APIs</h2>
      <p>
        <code className="text-amber-400">menuClear</code> und{" "}
        <code className="text-amber-400">menuAddStandardAction</code> waren zuvor nur macOS. Sie funktionieren jetzt auf allen 6 nativen Plattformen. Das beinhaltet auch einen Fix für einen{" "}
        <code className="text-amber-400">RefCell</code>-Reentrance-Panic in{" "}
        <code className="text-amber-400">dispatch_menu_item</code> unter Windows.
      </p>

      <h3>Android: 16 KB Page Alignment</h3>
      <p>
        Google Play erfordert jetzt 16 KB Page Alignment für native Bibliotheken. Perry setzt die entsprechenden <code className="text-amber-400">CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS</code>{" "}
        automatisch, und begleitende <code className="text-amber-400">.so</code>-Dateien werden neben der Ausgabe für APK/AAB-Einbindung kopiert.
      </p>

      <h2>Perry React: Kanban Board</h2>
      <p>
        Die React-Kompatibilitätsschicht bekam einen realen Test: ein vollständiges 5-Spalten Kanban Board mit Verschiebe-, Hinzufüge-, Lösch- und Ansichts-Operationen. Beim Bau wurden verschachtelte Array-Children beim JSX-Rendering aufgedeckt und behoben — der rekursive{" "}
        <code className="text-amber-400">_appendChildren</code>-Handler flacht jetzt Arrays korrekt ab, die von <code className="text-amber-400">.map()</code>-Aufrufen zurückgegeben werden. Es gibt auch eine neue 14-Sektionen Kitchen Sink WorkBench-Demo, die verschiedene UI-Muster abdeckt.
      </p>

      <h2>Anvil: 100% deterministische Test-Parität</h2>
      <p>
        <code className="text-amber-400">perrysdad</code> — der Self-Hosting LLVM-Compiler, geschrieben in TypeScript und kompiliert von Perry — besteht jetzt <strong>68 von 68</strong> deterministischen Tests und stimmt mit der Ausgabe des Haupt-Compilers exakt überein. Die einzigen Unterschiede sind inhärent (Zeitstempel, <code className="text-amber-400">Math.random()</code>), und 11 Tests werden übersprungen, weil sie UI, Timer, Kryptografie oder plattformspezifische Features erfordern, die noch nicht implementiert sind.
      </p>
      <p>
        Wichtige Arbeiten, die das ermöglicht haben:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Interface-Methoden-Dispatch</strong> — Interface-getypte Variablen geben jetzt korrekte Methoden über class_id-basierten Dispatch im ObjectHeader zurück</li>
        <li><strong>Dynamischer Property-Zugriff</strong> — Runtime-Dispatch für berechnete Property-Namen</li>
        <li><strong>Closures und this-Binding</strong> — korrekte Capture-Semantik für Objektmethoden</li>
        <li><strong>Phase 6 in Arbeit</strong> — async/await, Generatoren und Bedingungsfixes</li>
      </ul>
      <p>
        100% Parität bei deterministischen Tests ist ein bedeutender Meilenstein. Es bedeutet, dass die selbst-kompilierte{" "}
        <code className="text-amber-400">anvil</code>-Binärdatei für jedes testbare Szenario exakt dieselbe Ausgabe wie der Haupt-Compiler produziert. Die Lücke zum vollständigen Self-Hosting wird kleiner.
      </p>

      <h2>Über 50 Bugfixes</h2>
      <p>
        Ein großer Korrektheitsvorstoß diese Woche. Highlights:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>JSON.parse</strong> — Arrays werden nicht mehr bei 16 Elementen abgeschnitten, ungültige Eingaben werden korrekt behandelt</li>
        <li><strong>Uint8Array</strong> — Konstruktor aus Array-Variable, <code className="text-amber-400">.set(source, offset)</code>-Implementierung (war ein No-Op)</li>
        <li><strong>BigInt</strong> — NaN-Boxing mit <code className="text-amber-400">BIGINT_TAG</code> für Cross-Modul-Aufrufe, keccak256 32-Bit-Truncation-Fixes</li>
        <li><strong>Optional Chaining</strong> — verschachtelte bedingte Ausdrücke, toString-Erkennung, Rückgabewert NaN-Boxing</li>
        <li><strong>IndexSet</strong> — String NaN-Boxing korrigiert, verwendet <code className="text-amber-400">STRING_TAG</code> statt <code className="text-amber-400">POINTER_TAG</code></li>
        <li><strong>MySQL</strong> — DATETIME- und BLOB-Typen, <code className="text-amber-400">Date(string)</code>-Konstruktor</li>
        <li><strong>Math.min/max</strong> — Spread-Argument-Handling</li>
        <li><strong>Nativer Methoden-Dispatch</strong> — Field-Scan-and-Call für <code className="text-amber-400">POINTER_TAG</code>-Objekte</li>
      </ul>
      <p>
        Das sind keine Randfälle. JSON.parse, das Arrays bei 16 Elementen abschneidet, würde jede reale Anwendung brechen. Uint8Array.set als No-Op würde Daten stillschweigend korrumpieren. Das sind die Fixes, die den Compiler produktionsreif machen, ein Korrektheitsbug nach dem anderen.
      </p>

      <h2>In Zahlen</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>103 Commits</strong> zum Haupt-Perry-Compiler</li>
        <li><strong>3 Versionen</strong>: v0.2.195, v0.2.196, v0.2.197</li>
        <li><strong>1 Haupt-Feature</strong>: Cross-Kompilierung Windows von Linux</li>
        <li><strong>1 neue App-Kategorie</strong>: iOS Game Loops</li>
        <li><strong>68/68</strong> deterministische Test-Parität in perrysdad</li>
        <li><strong>Über 50 Bugfixes</strong> in NaN-Boxing, stdlib und nativem FFI</li>
        <li><strong>2 Dokumentationsneuschreibungen</strong>: perry.toml und Geisterhand</li>
        <li><strong>5 Hub-Verbesserungen</strong>: Zweistufige Pipeline, Azure-Auto-Startup, Worker-Auto-Update</li>
      </ul>

      <h2>Was kommt als Nächstes</h2>
      <p>
        Windows-Cross-Kompilierung öffnet die Tür zu vollautomatisiertem Multi-Plattform-CI/CD — TypeScript pushen, native Binärdateien für jedes Ziel erhalten, ohne dedizierte Build-Maschinen für jedes OS. Die Game-Loop-Unterstützung erschließt eine ganz neue Kategorie von iOS-Apps. Und 100% deterministische Test-Parität in perrysdad bedeutet, dass Self-Hosting sehr real wird. Was bleibt:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Vollständige Regex-Unterstützung</strong> — die letzte große Sprachlücke</li>
        <li><strong>perry/ui-Erweiterung</strong> — Drag and Drop, Barrierefreiheitslabels, DatePicker</li>
        <li><strong>perrysdad Phase 6</strong> — async/await, Generatoren, Erweiterung Richtung voller Perry-Parität</li>
        <li><strong>Hub öffentliche Beta</strong> — verteilte Builds für externe Nutzer öffnen</li>
      </ul>
      <p>
        Verfolge den Fortschritt auf{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, lies die Dokumentation auf{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>, oder sieh dir die{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">Roadmap</Link>
        {" "}für das vollständige Bild an.
      </p>
    </>
  );
}
