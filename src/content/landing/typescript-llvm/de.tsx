import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript auf LLVM: Monomorphisierung und native Codegenerierung",
  description:
    "Wie Perry TypeScript zu LLVM-IR absenkt — eine typisierte HIR, Monomorphisierung, NaN-Boxing — und warum das Backend für AOT-Performance von Cranelift zu LLVM wechselte.",
  breadcrumb: "TypeScript auf LLVM",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            TypeScript auf <span className="gradient-text">LLVM</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Wie Perry eine für JIT-Engines konzipierte Sprache zu LLVM-IR
            absenkt — Monomorphisierung, NaN-Boxing, inline-Lowerings — und
            warum es Cranelift verlassen hat.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/internals" className="btn-primary">
              Compiler-Interna
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
            Warum LLVM für TypeScript?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Ein Ahead-of-Time-Compiler lebt in einem anderen Regime als ein
            JIT. Ein JIT kompiliert, während der Nutzer wartet, also ist die
            Kompilierlatenz die Einschränkung. Ein AOT-Compiler wie Perry
            kompiliert einmal — auf der Maschine des Entwicklers oder in CI —
            und die Binary wird danach millionenfach ausgeführt. Genau in
            dieser Asymmetrie zahlt sich ein schwergewichtiger Optimierer aus.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            LLVM bringt zwei Jahrzehnte Middle-End-Arbeit mit:
            Schleifenvektorisierung, schleifeninvariante Code-Verschiebung,
            globale Wertenummerierung, spärliche bedingte
            Konstantenpropagation, aggressives Inlining, Alias-Analyse. Perrys
            Aufgabe ist es, dieser Maschinerie eine IR zu liefern, die sie
            tatsächlich optimieren kann — und genau hier kommt TypeScripts
            Typinformation ins Spiel.
          </p>

          <h2 className="text-2xl font-bold mb-6">Die Lowering-Pipeline</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Der Quellcode wird mit SWC geparst und dann zu einer typisierten
            High-Level-IR (HIR) abgesenkt, in der die interessanten
            Entscheidungen fallen, bevor LLVM den Code überhaupt zu Gesicht
            bekommt:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-12 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Monomorphisierung.</strong>{" "}
              Generische Funktionen und Klassen werden pro konkreter
              Instanziierung spezialisiert — dieselbe Strategie, die Rust und
              C++ verwenden.{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> und{" "}
              <code className="text-slate-300">{`Stack<string>`}</code> werden
              zu zwei unabhängigen, vollständig typisierten Funktionen — sodass
              der Optimierer mit konkreten Typen statt mit einem generischen
              Dispatch-Blob arbeitet und Generics zur Laufzeit nichts kosten.
            </li>
            <li>
              <strong className="text-slate-300">Statischer Dispatch.</strong>{" "}
              Wo der Empfängertyp zur Kompilierzeit bekannt ist, werden
              Methodenaufrufe zu direkten Aufrufen kompiliert, die LLVM
              inlinen kann, statt zu Hash-Table-Lookups.
            </li>
            <li>
              <strong className="text-slate-300">
                Direkter Feldzugriff.
              </strong>{" "}
              Objektfelder werden zu Compile-Time-Indizes aufgelöst, sodass ein
              Property-Read ein Ladevorgang mit festem Offset ist — kein
              Dictionary-Lookup.
            </li>
          </ul>

          <h2 className="text-2xl font-bold mb-6">
            NaN-Boxing und inline-Lowerings
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Wo Werte dynamisch sind, nutzt Perry NaN-Boxing: Jeder Wert ist
            ein 64-Bit-Wort. Doubles werden direkt gespeichert; Objekte,
            Strings, Booleans, <code className="text-slate-300">null</code>{" "}
            und <code className="text-slate-300">undefined</code> werden in
            die ungenutzten Bitmuster eines IEEE-754-Quiet-NaN kodiert. Zahlen
            sind kostenlos — kein Boxing, keine Allokation für Arithmetik.
          </p>
          <p className="text-slate-400 leading-relaxed mb-6">
            Der Haken ist, dass Operationen auf Nicht-Zahlen-Werten
            Unpack-Operate-Repack-Bitfolgen benötigen. Wenn diese Folgen als
            Aufrufe in eine separat kompilierte Laufzeitumgebung existieren,
            sieht LLVM nur undurchsichtige Blackboxes und kann nicht über sie
            hinweg optimieren. Deshalb gibt Perry heiße Operationen —
            Property-Loads, Methoden-Dispatch, Objektallokation — als inline
            LLVM-IR aus, die der Optimierer verschmelzen und vereinfachen
            kann. Objektallokation zum Beispiel kompiliert zu einer inline
            Thread-Local-Bump-Allokation herunter:
          </p>

          <div className="code-block mb-12">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">LLVM IR — inline bump allocation</span>
            </div>
            <pre className="text-sm text-slate-300 overflow-x-auto">
              <code>{`%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr        ; current bump offset
%new_off = add i64 %offset, 96           ; headers + 8 fields
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr         ; block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow`}</code>
            </pre>
          </div>

          <h2 className="text-2xl font-bold mb-6">Warum nicht Cranelift?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perrys erstes Backend war Cranelift — der Codegen hinter wasmtime,
            gebaut für schnelle, vorhersagbare Kompilierung. Es war der
            richtige Ausgangspunkt und bleibt eine hervorragende Wahl für JITs
            und sandboxed Laufzeitumgebungen. Zwei Dinge erzwangen den
            Wechsel:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-6 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Die Optimierer-Decke.</strong>{" "}
              Cranelift ist bewusst ein schneller Single-Tier-Compiler:
              &ldquo;anständiger Code, schnell&rdquo;, was der richtige
              Trade-off für einen JIT und der falsche für einen AOT-Compiler
              ist, dessen Verkaufsargument Spitzen-Performance auf nativem
              Code ist.
            </li>
            <li>
              <strong className="text-slate-300">arm64_32.</strong> Apple
              Watch nutzt ein ABI (64-Bit-Instruktionen, 32-Bit-Pointer), das
              Cranelift nicht unterstützt. Damit watchOS als Ziel existieren
              konnte, war LLVM erforderlich — und zwei Backends zu pflegen
              bedeutete zwei Sätze von Bugs, Tests und
              Performance-Baselines.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Die Migration war nicht kostenlos: Das erste reine
            LLVM-Release verschlechterte manche Benchmarks um bis zu das
            70-Fache, weil heiße Operationen zunächst über undurchsichtige
            Runtime-Helper-Aufrufe liefen. Die Aufholjagd — inline
            Lowerings, der obige Bump-Allocator, bessere Inlining-Grenzen —
            brachte das Backend über die Zahlen von Cranelift hinaus, und als es
            sich eingependelt hatte, schlug Perry Node.js in jedem Benchmark
            der eigenen Suite, um das 1,7- bis 24,6-Fache bei zwei
            Gleichständen (April 2026). Der vollständige Post-Mortem lohnt
            sich zu lesen:{" "}
            <Link
              href="/blog/cranelift-to-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              From Cranelift to LLVM
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Tiefer eintauchen</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            Die{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Seite zu den Compiler-Interna
            </Link>{" "}
            behandelt NaN-Boxing, Monomorphisierung und statischen Dispatch
            ausführlicher. Im Blog geht{" "}
            <Link
              href="/blog/optimizing-everything"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Optimizing Everything
            </Link>{" "}
            Release für Release durch die Optimierungsarbeit, und{" "}
            <Link
              href="/blog/gen-gc-lazy-json-and-defensible-benchmarks"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Gen GC, lazy JSON, and defensible benchmarks
            </Link>{" "}
            erklärt, wie die Benchmark-Methodik funktioniert (RUNS=11, Median +
            p95). Für das große Ganze starte bei der Übersicht{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Nativer TypeScript-Compiler
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
              Sieh dir die Ausgabe selbst an
            </h2>
            <p className="text-slate-400 mb-6">
              <code className="text-slate-300">perry compile main.ts</code> —
              nativer Maschinencode, keine Engine im Schlepptau.
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
      </section>
    </>
  );
}
