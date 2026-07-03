import { Link } from "@/i18n/navigation";
import { Installation } from "@/components/Installation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Perry installieren & TypeScript zu Native kompilieren",
  description:
    "Installiere Perry mit Homebrew, APT oder winget und kompiliere deine erste TypeScript-Datei in unter einer Minute zu einem nativen Executable. Ohne Node.js.",
  breadcrumb: "Erste Schritte",
  absoluteTitle: true,
};

export default function Content() {
  return (
    <>
            <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Erste Schritte mit <span className="gradient-text">Perry</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Von null zu einem laufenden nativen Executable in drei Schritten.
            Kein Node.js, kein Bundler, keine Laufzeitumgebung, die auf der
            Zielmaschine installiert werden muss.
          </p>
        </div>
      </section>

      <Installation />

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Deine erste Binary, Schritt für Schritt
          </h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            Sobald Perry installiert ist, ist das Kompilieren von TypeScript zu
            einem nativen Executable ein einziger Befehl. Schreibe eine Datei:
          </p>

          <div className="code-block mb-8">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">hello.ts</span>
            </div>
            <pre className="text-sm text-slate-300">
              <code>{`const name = process.argv[2] ?? "World";
console.log(\`Hello, \${name}!\`);`}</code>
            </pre>
          </div>

          <p className="text-slate-400 leading-relaxed mb-8">
            Kompiliere sie und führe das Ergebnis aus — die Ausgabe ist ein
            eigenständiges Maschinencode-Binary, kein gebündeltes Skript:
          </p>

          <div className="code-block mb-8">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">terminal</span>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-slate-500">$</span>{" "}
                <span className="text-cyan-400">perry</span> compile hello.ts
              </p>
              <p className="text-green-400">✓ Compiled executable: hello</p>
              <p>
                <span className="text-slate-500">$</span> ./hello Perry
              </p>
              <p className="text-slate-300">Hello, Perry!</p>
            </div>
          </div>

          <p className="text-slate-400 leading-relaxed mb-12">
            Diese Binary startet in etwa einer Millisekunde und läuft auf
            jeder Maschine mit demselben Betriebssystem und derselben
            Architektur — nichts muss vorher installiert werden. Mehr dazu,{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              wie Perry TypeScript zu einer Binary kompiliert
            </Link>{" "}
            oder was innerhalb des{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              nativen TypeScript-Compilers
            </Link>{" "}
            passiert.
          </p>

          <h2 className="text-2xl font-bold mb-6">Wie es weitergeht</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://docs.perryts.com"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Dokumentation
              </h3>
              <p className="text-slate-400 text-sm">
                Anleitungen für die CLI, perry/ui-Widgets, Threading, i18n und
                jedes Kompilierungsziel — auf docs.perryts.com.
              </p>
            </a>
            <Link href="/showcase" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Showcase
              </h3>
              <p className="text-slate-400 text-sm">
                Echte Apps, kompiliert mit Perry, im App Store und darüber
                hinaus.
              </p>
            </Link>
            <Link href="/compare" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Vergleich
              </h3>
              <p className="text-slate-400 text-sm">
                Wie Perry im Vergleich zu Bun, Deno, Electron, Tauri, React
                Native und Static Hermes abschneidet.
              </p>
            </Link>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                GitHub
              </h3>
              <p className="text-slate-400 text-sm">
                Quellcode, Issues und Discussions — Perry ist Open Source.
              </p>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
