import { Link } from "@/i18n/navigation";
import { Architecture } from "@/components/Architecture";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Nativer TypeScript-Compiler: Wie Perry TS zu Maschinencode kompiliert",
  description:
    "Perry ist ein nativer TypeScript-Compiler, geschrieben in Rust: SWC-Parsing, typisierte HIR, Monomorphisierung, LLVM-Codegen. Native Binaries für 10 Plattformen, keine VM.",
  breadcrumb: "Nativer TypeScript-Compiler",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Ein nativer TypeScript-Compiler,{" "}
            <span className="gradient-text">gebaut in Rust</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Perry kompiliert das TypeScript, das du bereits schreibst, zu
            Maschinencode — so wie eine Rust- oder Go-Toolchain ihre eigene
            Sprache kompiliert. Kein transpiliertes JavaScript, keine
            virtuelle Maschine, keine Laufzeitumgebung auf dem Zielsystem.
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
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Kein Transpiler. Keine Laufzeitumgebung.
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Die meisten TypeScript-Tools lassen sich in zwei Familien
            einteilen. Transpiler —{" "}
            <code className="text-slate-300">tsc</code>, SWC, esbuild —
            prüfen die Typen und entfernen sie, um dann JavaScript für eine
            Engine auszugeben, die es später ausführt. Laufzeitumgebungen —
            Node.js, Bun, Deno — sind diese Engines: Sie parsen,
            interpretieren und JIT-kompilieren das JavaScript bei jedem Start
            deines Programms.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Ein nativer Compiler ist die dritte Familie, und für TypeScript
            war sie bisher weitgehend leer. Perry behandelt Typannotationen
            nicht als Dokumentation, die entfernt wird, sondern als die
            Eingabe, die die Codegenerierung antreibt. Das Ergebnis von{" "}
            <code className="text-slate-300">perry compile main.ts</code> ist
            ein eigenständiges Executable mit Maschinencode — typischerweise{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              2–5 MB, startet in etwa einer Millisekunde
            </Link>
            .
          </p>
        </article>
      </section>

      {/* Pipeline visual (shared section) */}
      <Architecture />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Die Pipeline, Schritt für Schritt
          </h2>
          <ol className="space-y-4 text-slate-400 leading-relaxed mb-12 list-decimal pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Parsen (SWC).</strong>{" "}
              Quelldateien werden mit SWC geparst, dem nativen
              TypeScript-Parser in Rust, sodass selbst große Projekte in
              Millisekunden geparst werden. Modul-Codegen,
              Transformations-Durchläufe und Symbol-Scanning laufen parallel
              über alle Kerne.
            </li>
            <li>
              <strong className="text-slate-300">Typauflösung.</strong> Der
              Compiler löst deklarierte Typen auf und leitet den Rest ab, sodass
              jeder Ausdruck vor Beginn der Codegenerierung einen konkreten Typ
              hat.
            </li>
            <li>
              <strong className="text-slate-300">
                Typisierte HIR &amp; Monomorphisierung.
              </strong>{" "}
              Der AST wird zu einer typisierten High-Level-IR abgesenkt.
              Generische Funktionen und Klassen werden monomorphisiert — jede
              Instanziierung wie{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> wird
              separat mit ihren konkreten Typen kompiliert, sodass Generics zur
              Laufzeit nichts kosten. Wo Typen bekannt sind, werden
              Methodenaufrufe zu statischem Dispatch und Objektfelder zu
              direkten Ladevorgängen mit festem Offset.
            </li>
            <li>
              <strong className="text-slate-300">Codegen (LLVM).</strong> Die
              HIR wird zu LLVM-IR abgesenkt und durch die
              Optimierungs-Pipeline von LLVM geführt — Inlining,
              Schleifenoptimierungen, Vektorisierung — und dann als
              Maschinencode für das Ziel ausgegeben.
            </li>
            <li>
              <strong className="text-slate-300">Linken.</strong> Die Ausgabe
              ist ein normales Plattform-Executable: Mach-O auf macOS, ELF auf
              Linux, PE auf Windows — plus Ziele für Mobile, Watch, TV und
              WebAssembly.
            </li>
          </ol>
          <p className="text-slate-400 leading-relaxed mb-12">
            Die LLVM-Seite davon — warum LLVM gegenüber Cranelift gewählt
            wurde, wie NaN-Boxing dynamische Werte darstellt, was der
            Optimierer mit typisierter IR macht — hat einen eigenen Deep Dive:{" "}
            <Link
              href="/typescript-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript auf LLVM
            </Link>
            . Implementierungsdetails wie NaN-Boxing, statischer Dispatch und
            kostenlose Abstraktionen werden in den{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Compiler-Interna
            </Link>{" "}
            behandelt.
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Was ist mit dynamischem Code und npm?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            TypeScript ist darunter immer noch JavaScript, und ein nativer
            TypeScript-Compiler muss darüber ehrlich sein. Perrys Konformität
            gegenüber der offiziellen test262-Suite wird gemessen und
            veröffentlicht — Stand v0.5.1146 liegt die String-Semantik bei
            79 % und Array bei 72 %, beide steigen von Release zu Release.
            Reine TypeScript-/JavaScript-npm-Pakete kompilieren nativ über{" "}
            <code className="text-slate-300">perry.compilePackages</code>:
            axios, zod v4, express, fastify und hono kompilieren und laufen
            bereits heute. Code, der volle Engine-Semantik benötigt, kann sich
            für einen eingebetteten V8-Fallback mit{" "}
            <code className="text-slate-300">--enable-js-runtime</code>{" "}
            entscheiden.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Die vollständige Geschichte steht in{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Real npm packages and a conformance sweep
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Wie Perry zu anderen &ldquo;nativen TypeScript&rdquo;-Ansätzen
            steht
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry ist nicht das einzige Projekt, das in TypeScripts
            Typannotationen eine Kompilierungschance gesehen hat — aber die
            Ansätze unterscheiden sich stark. AssemblyScript kompiliert eine
            strikte, TypeScript-ähnliche Sprache ausschließlich zu
            WebAssembly: Es ist bewusst nicht JavaScript-kompatibel und
            erzeugt weder OS-Executables noch native UI. Metas Static Hermes
            kompiliert ahead-of-time einen typisierten JavaScript-Subset
            innerhalb der Hermes-Engine, primär für React Native — Stand
            Mitte 2026 bleibt es ein Forschungsprojekt, das aus dem
            Quellcode gebaut werden muss, und die Hermes-V1-Engine, die
            tatsächlich in React Native ausgeliefert wurde, enthält die
            statischen Features nicht (
            <Link
              href="/compare/static-hermes"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              vollständiger Vergleich
            </Link>
            ).
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Perrys Wette ist auf beiden Achsen anders: Standard-TypeScript als
            Eingabesprache und gewöhnliche Plattform-Executables — CLI,
            Server und GUI — als Ausgabe, heute installierbar über Homebrew,
            APT, winget oder npm.
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Ein Compiler, zehn Ziele
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Weil die Codegenerierung über LLVM läuft, kompiliert eine
            Codebasis zu macOS, iOS, iPadOS, Android, Linux, Windows, watchOS,
            tvOS, WebAssembly und einfachem Web/JS — einschließlich
            Cross-Compilation von Windows-, macOS- und iOS-Binaries von einer
            Linux-Maschine aus. GUI-Apps nutzen{" "}
            <code className="text-slate-300">perry/ui</code>, eine
            deklarative API über echte Plattform-Widgets (AppKit, UIKit,
            GTK4, Win32, Android über JNI) — ohne jede Webview.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            Wie das im Vergleich zu anderen Ansätzen abschneidet:{" "}
            <Link
              href="/compare"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun, Deno, Electron, Tauri, React Native und Static
              Hermes
            </Link>
            .
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              Probiere den Compiler aus
            </h2>
            <p className="text-slate-400 mb-6">
              Installiere Perry und kompiliere deine erste native Binary in
              unter einer Minute.
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
