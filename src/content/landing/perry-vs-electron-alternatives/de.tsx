import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Electron-Alternativen für TypeScript: Perry vs Tauri vs Bun",
  description:
    "Auf der Suche nach einer Electron-Alternative in TypeScript? Vergleiche Electron, Tauri, Bun-basierte Ansätze und Perry nach Binary-Größe, Speicher, UI-Stack und Sprache.",
  breadcrumb: "Electron-Alternativen für TypeScript",
};

export default function Content() {
  return (
    <>
            <article className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Zurück zu den Vergleichen
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">
              Electron-Alternativen für TypeScript-Entwickler
            </span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed mb-12">
            Electron hat Desktop-Apps für Webentwickler zugänglich gemacht,
            und seine Kosten bei Größe und Speicher haben &ldquo;Electron
            alternative&rdquo; zu einer festen Suchanfrage gemacht. Wenn
            TypeScript deine Sprache ist, gibt es 2026 vier realistische
            Wege: bei Electron bleiben, zu Tauri wechseln,
            Runtime-eingebettete Binaries mit Bun bauen oder mit Perry nativ
            kompilieren. Sie gehen sehr unterschiedliche Trade-offs ein.
          </p>

          <h2 className="text-2xl font-bold mb-6">Die vier Ansätze</h2>

          <div className="space-y-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Electron — die Baseline
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Bündelt Chromium und Node.js mit jeder App. Der Vorteil ist
                ein Jahrzehnt Produktionsreife und ein UI-Stack
                (HTML/CSS/JS), den dein Team bereits kennt — VS Code, Slack
                und Discord laufen darauf. Der Nachteil sind die
                Grundkosten: Hello-World-Installer von rund 80–150 MB,
                mehrere Chromium-Prozesse und Hunderte MB RAM im Leerlauf.
                Nur Desktop.{" "}
                <Link
                  href="/compare/electron"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Vollständiger Vergleich Perry vs Electron
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Tauri — Web-UI in der System-Webview, Rust-Backend
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tauri behält das Web-Frontend, verzichtet aber auf
                gebündeltes Chromium: Die UI rendert in der OS-Webview
                (WKWebView, WebView2, WebKitGTK), sodass Installer im
                einstelligen MB-Bereich landen. Es ist stabil, gut
                dokumentiert, und Tauri 2 hat iOS/Android hinzugefügt. Die
                Kompromisse: Das Backend ist Rust, nicht TypeScript —
                App-Logik jenseits der UI bedeutet, Rust zu schreiben und
                eine IPC-Brücke zu überqueren — und das Rendering variiert
                leicht je Plattform, weil jedes Betriebssystem eine andere
                Webview mitbringt.{" "}
                <Link
                  href="/compare/tauri"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Vollständiger Vergleich Perry vs Tauri
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Bun — Single-File-Binaries, keine GUI-Schicht
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Leute, die nach &ldquo;bun electron&rdquo; suchen, wollen
                meist Electrons Bequemlichkeit ohne dessen Gewicht.{" "}
                <code className="text-slate-300">bun build --compile</code>{" "}
                erzeugt ein einzelnes Executable, indem es die
                Bun-Laufzeitumgebung mit deinem gebündelten TypeScript
                einbettet — hervorragend für CLIs und Server, mit voller
                npm-Kompatibilität, weil es buchstäblich die
                Laufzeitumgebung ist. Aber die Binary ist mit rund 60 MB
                (macOS arm64) bis 100+ MB (Linux/Windows) recht groß, der
                Code wird weiterhin JIT-ausgeführt, und Bun hat kein
                UI-Framework — eine Desktop-App braucht weiterhin Electron,
                Tauri oder eine Webview-Bibliothek obendrauf.{" "}
                <Link
                  href="/compare/bun"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Vollständiger Vergleich Perry vs Bun
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Perry — TypeScript kompiliert zu nativen Widgets
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Perry kompiliert TypeScript ahead-of-time zu Maschinencode
                und rendert die UI über echte Plattform-Widgets — AppKit,
                UIKit, GTK4, Win32, Android über JNI — ohne Webview und ohne
                IPC-Brücke. Eine Sprache für UI und Logik, ~330 KB Hello
                World, 2–5 MB typische Binaries, ~1 ms Startzeit und zehn
                Ziele einschließlich Mobile, Watch und TV. Der ehrliche
                Wermutstropfen: Perry ist Pre-1.0, seine UI-API ist ihr
                eigenes Ding (deklarativ, im SwiftUI-Stil — nicht
                HTML/CSS), und das Ökosystem ist jung im Vergleich zu
                Electrons.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">Im direkten Vergleich</h2>
          <div className="overflow-x-auto mb-16 border border-white/10 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300"></th>
                  <th className="text-left px-4 py-3 font-semibold text-amber-300">Perry</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Electron</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Tauri</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Bun (--compile)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Sprache</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript überall</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS + HTML/CSS</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS-Frontend, Rust-Backend</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">UI-Ansatz</td>
                  <td className="px-4 py-3 text-slate-400">Native Plattform-Widgets</td>
                  <td className="px-4 py-3 text-slate-400">Gebündeltes Chromium</td>
                  <td className="px-4 py-3 text-slate-400">System-Webview</td>
                  <td className="px-4 py-3 text-slate-400">Keine (CLI/Server)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Hello-World-Größe</td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">~80–150 MB</td>
                  <td className="px-4 py-3 text-slate-400">~3–10 MB</td>
                  <td className="px-4 py-3 text-slate-400">~60–116 MB je nach Plattform</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Ausführung</td>
                  <td className="px-4 py-3 text-slate-400">AOT-Maschinencode</td>
                  <td className="px-4 py-3 text-slate-400">JIT (V8)</td>
                  <td className="px-4 py-3 text-slate-400">JIT (Webview-JS-Engine) + natives Rust</td>
                  <td className="px-4 py-3 text-slate-400">JIT (JavaScriptCore)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Speicher im Leerlauf</td>
                  <td className="px-4 py-3 text-slate-400">Zig-MB-Bereich (einzelner nativer Prozess)</td>
                  <td className="px-4 py-3 text-slate-400">Hunderte MB (Multi-Prozess-Chromium)</td>
                  <td className="px-4 py-3 text-slate-400">Niedriger als Electron (OS-Webview)</td>
                  <td className="px-4 py-3 text-slate-400">Laufzeit-typisch</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Mobile / Watch / TV</td>
                  <td className="px-4 py-3 text-slate-400">iOS, iPadOS, Android, watchOS, tvOS</td>
                  <td className="px-4 py-3 text-slate-400">Nein</td>
                  <td className="px-4 py-3 text-slate-400">iOS, Android (Tauri 2)</td>
                  <td className="px-4 py-3 text-slate-400">Nein</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Reife</td>
                  <td className="px-4 py-3 text-slate-400">Pre-1.0</td>
                  <td className="px-4 py-3 text-slate-400">Jahrzehnt+ in Produktion</td>
                  <td className="px-4 py-3 text-slate-400">Stabil (1.x/2.x)</td>
                  <td className="px-4 py-3 text-slate-400">Stabil</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-6">
            Was ist mit React Native oder Flutter?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-16">
            Sie kommen in jedem Electron-Thread zur Sprache, beantworten
            aber eine andere Frage. React Native ist Mobile-First: Dein
            JavaScript läuft in der Hermes-Engine und steuert native Views
            über eine Bridge an, und Desktop-Support existiert nur über
            separate Community-/Microsoft-Forks — es ist kein
            Drop-in-Ersatz für Electron (
            <Link
              href="/compare/react-native"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs React Native
            </Link>
            ). Flutter deckt Desktop und Mobile ab, bedeutet aber, TypeScript
            für Dart zu verlassen, und es malt seine eigenen Widgets, statt
            die der Plattform zu nutzen. Wenn das Bleiben in TypeScript die
            Vorgabe ist, bleibt die realistische Desktop-Shortlist bei den
            vier oben genannten Optionen.
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Welche solltest du wählen?
          </h2>
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Beim Web-Stack bleiben
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Wenn deine UI bereits in React/Vue/Svelte gebaut ist und du
                heute bewährte Desktop-Distribution brauchst, bleibt
                Electron die Wahl mit dem geringsten Risiko — du zahlst mit
                Größe und Speicher. Wenn dich das stört und du dich damit
                wohlfühlst, das Backend in Rust zu schreiben, gibt dir Tauri
                das meiste der Web-Stack-Erfahrung bei einem Bruchteil des
                Fußabdrucks.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Die Webview hinter dir lassen
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Wenn du eigentlich TypeScript rein, native App raus willst —
                eine Sprache, echte Plattform-Widgets, kleine Binaries und
                Mobile/Watch/TV aus derselben Codebasis — genau das ist die
                Lücke, die Perry füllen soll, mit Pre-1.0-Reife als Preis
                des Eintritts. Und wenn du nur eine CLI oder einen Server als
                einzelne Datei mit null Kompatibilitätsrisiko brauchst, ist
                Buns{" "}
                <code className="text-slate-300">--compile</code> die
                pragmatische Wahl.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              Überzeug dich selbst
            </h2>
            <p className="text-slate-400 mb-6">
              Installiere Perry und liefere eine native App aus TypeScript
              aus.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                Loslegen
              </Link>
              <a
                href="https://github.com/PerryTS/perry"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Auf GitHub ansehen
              </a>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
