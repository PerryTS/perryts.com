import { Link } from "@/i18n/navigation";
import { Architecture } from "@/components/Architecture";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Compilatore nativo per TypeScript: come Perry compila TS in codice macchina",
  description:
    "Perry è un compilatore nativo per TypeScript scritto in Rust: parsing SWC, HIR tipizzato, monomorfizzazione, codegen LLVM. Binari nativi per 10 piattaforme, senza VM.",
  breadcrumb: "Compilatore nativo per TypeScript",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Un compilatore nativo per TypeScript,{" "}
            <span className="gradient-text">costruito in Rust</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Perry compila il TypeScript che già scrivi in codice macchina —
            nello stesso modo in cui una toolchain Rust o Go compila il
            proprio linguaggio. Niente JavaScript transpilato, nessuna
            macchina virtuale, nessun runtime sul sistema di destinazione.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/getting-started" className="btn-primary">
              Inizia
            </Link>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Vedi su GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Non un transpiler. Non un runtime.
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            La maggior parte degli strumenti TypeScript rientra in due
            famiglie. I transpiler —{" "}
            <code className="text-slate-300">tsc</code>, SWC, esbuild —
            controllano e rimuovono i tipi, poi emettono JavaScript che un
            motore eseguirà in seguito. I runtime — Node.js, Bun, Deno — sono
            quei motori: analizzano, interpretano e compilano JIT il
            JavaScript ogni volta che il tuo programma si avvia.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Un compilatore nativo è la terza famiglia, e per TypeScript è
            rimasta perlopiù vuota. Perry tratta le annotazioni di tipo non
            come documentazione da rimuovere ma come l&apos;input che guida la
            generazione del codice. Il risultato di{" "}
            <code className="text-slate-300">perry compile main.ts</code> è
            un eseguibile standalone contenente codice macchina — tipicamente{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              da 2–5 MB, con avvio in circa un millisecondo
            </Link>
            .
          </p>
        </article>
      </section>

      {/* Pipeline visual (shared section) */}
      <Architecture />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">La pipeline, passo dopo passo</h2>
          <ol className="space-y-4 text-slate-400 leading-relaxed mb-12 list-decimal pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Parsing (SWC).</strong> I
              file sorgente vengono analizzati con SWC, il parser TypeScript
              nativo in Rust, così anche i progetti di grandi dimensioni
              vengono analizzati in millisecondi. La codegen dei moduli, i
              passaggi di trasformazione e la scansione dei simboli vengono
              eseguiti in parallelo su tutti i core.
            </li>
            <li>
              <strong className="text-slate-300">Risoluzione dei tipi.</strong>{" "}
              Il compilatore risolve i tipi dichiarati e deduce il resto,
              assegnando a ogni espressione un tipo concreto prima che inizi
              la generazione del codice.
            </li>
            <li>
              <strong className="text-slate-300">
                HIR tipizzato e monomorfizzazione.
              </strong>{" "}
              L&apos;AST viene sottoposto a lowering in un IR tipizzato di
              alto livello. Le funzioni e le classi generiche vengono
              monomorfizzate — ogni istanziazione come{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> viene
              compilata separatamente con i suoi tipi concreti, quindi i
              generici non costano nulla a runtime. Dove i tipi sono noti, le
              chiamate ai metodi diventano dispatch statico e i campi degli
              oggetti diventano load diretti a offset fisso.
            </li>
            <li>
              <strong className="text-slate-300">Codegen (LLVM).</strong>{" "}
              L&apos;HIR viene abbassato a LLVM IR e fatto passare attraverso
              la pipeline di ottimizzazione di LLVM — inlining, ottimizzazioni
              dei cicli, vettorizzazione — poi emesso come codice macchina per
              il target.
            </li>
            <li>
              <strong className="text-slate-300">Link.</strong> L&apos;output
              è un normale eseguibile di piattaforma: Mach-O su macOS, ELF su
              Linux, PE su Windows — oltre ai target mobile, watch, TV e
              WebAssembly.
            </li>
          </ol>
          <p className="text-slate-400 leading-relaxed mb-12">
            Il lato LLVM di tutto questo — perché LLVM è stato scelto al posto
            di Cranelift, come il NaN-boxing rappresenta i valori dinamici,
            cosa fa l&apos;ottimizzatore con l&apos;IR tipizzato — ha un
            proprio approfondimento:{" "}
            <Link
              href="/typescript-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript su LLVM
            </Link>
            . I dettagli implementativi come NaN-boxing, dispatch statico e
            astrazioni a costo zero sono trattati nei{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              meccanismi interni del compilatore
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            E il codice dinamico e npm?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Sotto il cofano, TypeScript è comunque JavaScript, e un
            compilatore nativo per TypeScript deve essere onesto su questo. La
            conformità di Perry rispetto alla suite ufficiale test262 è
            misurata e pubblicata — a partire dalla v0.5.1146, la semantica
            String è al 79% e Array al 72%, entrambe in crescita release dopo
            release. I pacchetti npm TypeScript/JavaScript puro compilano
            nativamente tramite{" "}
            <code className="text-slate-300">perry.compilePackages</code>:
            axios, zod v4, express, fastify e hono compilano e funzionano già
            oggi. Il codice che necessita della piena semantica del motore può
            optare per un fallback V8 embedded con{" "}
            <code className="text-slate-300">--enable-js-runtime</code>.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            La storia completa è in{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Veri pacchetti npm ora compilano: axios, zod, express — e una
              passata di conformance
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Come Perry si colloca rispetto ad altri sforzi di
            &ldquo;TypeScript nativo&rdquo;
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry non è l&apos;unico progetto ad aver guardato alle
            annotazioni di tipo di TypeScript vedendoci un&apos;opportunità di
            compilazione — ma gli approcci differiscono nettamente.
            AssemblyScript compila un linguaggio rigoroso simil-TypeScript
            solo verso WebAssembly: è deliberatamente non compatibile con
            JavaScript, e non produce eseguibili per il sistema operativo né
            UI native. Static Hermes di Meta compila ahead-of-time un
            sottoinsieme JavaScript tipizzato all&apos;interno del motore
            Hermes, principalmente per React Native — a metà 2026 resta un
            progetto di ricerca che deve essere compilato dai sorgenti, e il
            motore Hermes V1 effettivamente distribuito in React Native non
            include le funzionalità statiche (
            <Link
              href="/compare/static-hermes"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              confronto completo
            </Link>
            ).
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            La scommessa di Perry è diversa su entrambi gli assi: TypeScript
            standard come linguaggio di input, ed eseguibili di piattaforma
            ordinari — CLI, server e GUI — come output, installabili oggi
            tramite Homebrew, APT, winget o npm.
          </p>

          <h2 className="text-2xl font-bold mb-6">Un compilatore, dieci target</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Poiché la generazione del codice passa attraverso LLVM,
            un&apos;unica codebase compila per macOS, iOS, iPadOS, Android,
            Linux, Windows, watchOS, tvOS, WebAssembly e il semplice Web/JS —
            incluso il cross-compiling di binari Windows, macOS e iOS da una
            macchina Linux. Le app GUI usano{" "}
            <code className="text-slate-300">perry/ui</code>, un&apos;API
            dichiarativa sopra veri widget di piattaforma (AppKit, UIKit,
            GTK4, Win32, Android tramite JNI) — senza alcuna webview
            coinvolta.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            Come si confronta con altri approcci:{" "}
            <Link
              href="/compare"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun, Deno, Electron, Tauri, React Native e Static
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
              Prova il compilatore
            </h2>
            <p className="text-slate-400 mb-6">
              Installa Perry e compila il tuo primo binario nativo in meno di
              un minuto.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                Inizia
              </Link>
              <a
                href="https://docs.perryts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Leggi la documentazione
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
