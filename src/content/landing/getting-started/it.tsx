import { Link } from "@/i18n/navigation";
import { Installation } from "@/components/Installation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Inizia con Perry — Installa e compila TypeScript in nativo",
  description:
    "Installa Perry con Homebrew, APT o winget e compila il tuo primo file TypeScript in un eseguibile nativo in meno di un minuto. Non serve Node.js.",
  breadcrumb: "Inizia",
  absoluteTitle: true,
};

export default function Content() {
  return (
    <>
            <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Inizia con <span className="gradient-text">Perry</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Da zero a un eseguibile nativo funzionante in tre passaggi. Niente
            Node.js, niente bundler, nessun runtime da installare sulla
            macchina di destinazione.
          </p>
        </div>
      </section>

      <Installation />

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Il tuo primo binario, passo dopo passo
          </h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            Una volta installato Perry, compilare TypeScript in un eseguibile
            nativo è un singolo comando. Scrivi un file:
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
            Compilalo ed esegui il risultato — l&apos;output è un binario di
            codice macchina autonomo, non uno script raggruppato:
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
            Quel binario si avvia in circa un millisecondo e funziona su
            qualsiasi macchina con lo stesso sistema operativo e la stessa
            architettura — niente da installare prima. Scopri di più su{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              come Perry compila TypeScript in un binario
            </Link>{" "}
            o cosa succede dentro il{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              compilatore nativo per TypeScript
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Dove andare adesso</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://docs.perryts.com"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Documentazione
              </h3>
              <p className="text-slate-400 text-sm">
                Guide per la CLI, i widget perry/ui, il threading, l&apos;i18n
                e ogni target di compilazione — su docs.perryts.com.
              </p>
            </a>
            <Link href="/showcase" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Showcase
              </h3>
              <p className="text-slate-400 text-sm">
                App reali compilate con Perry, distribuite sull&apos;App Store
                e non solo.
              </p>
            </Link>
            <Link href="/compare" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Confronta
              </h3>
              <p className="text-slate-400 text-sm">
                Come Perry si confronta con Bun, Deno, Electron, Tauri, React
                Native e Static Hermes.
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
                Codice sorgente, issue e discussioni — Perry è open source.
              </p>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
