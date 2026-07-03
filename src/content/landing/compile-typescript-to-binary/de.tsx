import { Link } from "@/i18n/navigation";
import { Performance } from "@/components/Performance";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript zu einer Binary kompilieren (eigenständige Executables)",
  description:
    "TypeScript zu einer Binary kompilieren: 2–5 MB eigenständige native Executables, ohne Node.js. Wie Perry im Vergleich zu bun build --compile und Node SEA abschneidet.",
  breadcrumb: "TypeScript zu einer Binary kompilieren",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            TypeScript zu einer <span className="gradient-text">Binary kompilieren</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Ein Befehl verwandelt{" "}
            <code className="text-slate-300">main.ts</code>{" "}
            in ein eigenständiges natives Executable. Kein Node.js auf der
            Zielmaschine, keine gebündelte Laufzeitumgebung, kein
            Installationsschritt für deine Nutzer.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/getting-started" className="btn-primary">
              Perry installieren
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

          <div className="max-w-2xl mx-auto text-left">
            <div className="code-block glow">
              <div className="flex items-center gap-2 mb-4 text-slate-500">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="ml-2 text-xs">terminal</span>
              </div>
              <div className="space-y-2">
                <p>
                  <span className="text-slate-500">$</span>{" "}
                  <span className="text-cyan-400">perry</span> compile main.ts
                </p>
                <p className="text-green-400">
                  ✓ Compiled executable: main (2.3 MB)
                </p>
                <p className="mt-4">
                  <span className="text-slate-500">$</span> ./main
                </p>
                <p className="text-slate-300">Hello, World!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Drei Dinge, die Leute &ldquo;TypeScript kompilieren&rdquo; nennen
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Wenn Entwickler danach suchen, wie man TypeScript zu einer Binary
            kompiliert, stoßen sie meist auf drei sehr unterschiedliche
            Techniken, die sich ein Wort teilen:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Transpilieren.</strong>{" "}
              <code className="text-slate-300">tsc</code>, SWC und esbuild
              verwandeln TypeScript in JavaScript. Die Ausgabe braucht
              weiterhin Node.js, Bun oder einen Browser, um zu laufen. Es ist
              keine Binary im Spiel.
            </li>
            <li>
              <strong className="text-slate-300">
                Eingebettete Laufzeitumgebung.
              </strong>{" "}
              <code className="text-slate-300">bun build --compile</code>,{" "}
              <code className="text-slate-300">deno compile</code> und Node.js
              Single Executable Applications (SEA) hängen dein gebündeltes
              JavaScript an eine vollständige Kopie der Laufzeitumgebung an.
              Du bekommst eine einzelne Datei, aber die Engine reist darin mit,
              und dein Code wird bei jedem Prozessstart erneut geparst und
              JIT-kompiliert.
            </li>
            <li>
              <strong className="text-slate-300">
                Ahead-of-Time-native Kompilierung.
              </strong>{" "}
              Das macht Perry. TypeScript wird mit SWC geparst, Typen werden
              aufgelöst, Generics werden monomorphisiert, und LLVM erzeugt
              Maschinencode. Der Linker erzeugt ein normales Executable —
              dieselbe Art von Artefakt, die eine Rust-, Go- oder
              C++-Toolchain erzeugt. Es steckt überhaupt keine
              JavaScript-Engine in der Binary.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Weil keine Engine gestartet werden muss und beim Start nichts
            geparst werden muss, startet eine Perry-Binary in etwa einer
            Millisekunde. Die Pipeline selbst wird ausführlicher auf der Seite{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              nativer TypeScript-Compiler
            </Link>{" "}
            und in den{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Compiler-Interna
            </Link>{" "}
            beschrieben.
          </p>

          <h2 className="text-2xl font-bold mb-6">Wie groß ist die Binary?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Die Größe hängt davon ab, was eingebunden wird, denn nur der Code,
            den du tatsächlich benutzt, wird kompiliert und gelinkt:
          </p>
          <ul className="space-y-3 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              Ein Hello World liegt bei rund{" "}
              <strong className="text-slate-300">330 KB</strong>.
            </li>
            <li>
              Typische CLI-Tools landen bei{" "}
              <strong className="text-slate-300">2–5 MB</strong>.
            </li>
            <li>
              Vollständige Anwendungen, die große Frameworks einbinden
              (Fastify, mysql2 und Ähnliches), liegen bei rund{" "}
              <strong className="text-slate-300">48 MB</strong>.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Zum Vergleich: Ein Node-SEA-Executable ist eine Kopie der{" "}
            <code className="text-slate-300">node</code>-Binary selbst, es
            startet also je nach Plattform bei etwa 88–118 MB, bevor dein Code
            hinzukommt, und ein mit Bun kompiliertes Hello World misst rund
            60 MB auf macOS arm64 und rund 100 MB auf Linux x64, weil die
            komplette Bun-Laufzeitumgebung eingebettet ist.
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry vs bun build --compile vs Node SEA
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Alle drei liefern dir eine einzelne Datei, die du weitergeben
            kannst. Ansonsten sind es sehr unterschiedliche Tools, und jedes
            ist für jemanden die richtige Antwort:
          </p>
          <div className="overflow-x-auto mb-8 border border-white/10 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300"></th>
                  <th className="text-left px-4 py-3 font-semibold text-amber-300">
                    Perry
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">
                    bun build --compile
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">
                    Node SEA
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Was es erzeugt
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    AOT-kompilierter Maschinencode (LLVM)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Gebündeltes JS + eingebettete Bun-Laufzeitumgebung
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Kopie der node-Binary mit eingeschleustem gebündeltem
                    Skript
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Ausführungsmodell
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Nativer Code, keine JS-Engine
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (JavaScriptCore) zur Laufzeit
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (V8) zur Laufzeit
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Hello-World-Größe
                  </td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">
                    ~60 MB (macOS arm64) bis ~100+ MB (Linux/Windows)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    ~88–118 MB (Größe der node-Binary)
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Startzeit
                  </td>
                  <td className="px-4 py-3 text-slate-400">~1 ms</td>
                  <td className="px-4 py-3 text-slate-400">~10 ms</td>
                  <td className="px-4 py-3 text-slate-400">~30 ms</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Cross-Compilation
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    10 Ziele, einschließlich Windows/macOS/iOS von Linux aus
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Ja — Linux, Windows, macOS über --target
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Nein — stattdessen eine plattformspezifische node-Binary
                    kopieren
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    JS-/npm-Kompatibilität
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Wachsend: axios, zod v4, express, fastify, hono kompilieren
                    nativ; optionaler V8-Fallback für den Rest
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Vollständig — es ist die Bun-Laufzeitumgebung
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Vollständige Node-Semantik; erfordert vorheriges Bundling,
                    nur CommonJS auf Node 24 LTS
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Status
                  </td>
                  <td className="px-4 py-3 text-slate-400">Pre-1.0</td>
                  <td className="px-4 py-3 text-slate-400">Stabil</td>
                  <td className="px-4 py-3 text-slate-400">
                    Stabilitätsstufe &ldquo;Active development&rdquo; in Node
                    24 LTS
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-400 leading-relaxed mb-6">
            Die ehrliche Einordnung: Wenn sich deine Anwendung auf das volle
            npm-Ökosystem stützt und du null Kompatibilitätsrisiko willst,
            liefern Bun und Node SEA genau die Engine-Semantik, gegen die du
            ohnehin schon entwickelst — das ist ihre Stärke, und die Kosten in
            der Größe spielen für dein Deployment vielleicht keine Rolle.
            Perry ist ein anderer Trade-off. Du bekommst echte
            Ahead-of-Time-Kompilierung, kleine Binaries und Startzeit im
            Millisekundenbereich; im Gegenzug nimmst du einen Pre-1.0-Compiler
            in Kauf, dessen JavaScript-Konformität gemessen und
            veröffentlicht wird (test262: String 79 %, Array 72 % Stand
            v0.5.1146), statt von V8 geerbt zu sein.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            Ausführliche direkte Vergleiche:{" "}
            <Link
              href="/compare/bun"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun
            </Link>{" "}
            und{" "}
            <Link
              href="/compare/deno"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Deno
            </Link>
            . Wie npm-Pakete kompilieren, steht in{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Real npm packages and a conformance sweep
            </Link>
            .
          </p>
        </article>
      </section>

      {/* Benchmark table (shared section) */}
      <Performance />

      {/* CTA */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              Kompiliere noch heute deine erste Binary
            </h2>
            <p className="text-slate-400 mb-6">
              Installiere mit Homebrew, APT oder winget — dann{" "}
              <code className="text-slate-300">perry compile main.ts</code>.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                Loslegen
              </Link>
              <a
                href="https://docs.perryts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Dokumentation lesen
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
