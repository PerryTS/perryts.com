import { Link } from "@/i18n/navigation";
import { Performance } from "@/components/Performance";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Compila TypeScript in un binario (eseguibili standalone)",
  description:
    "Compila TypeScript in un binario: eseguibili nativi standalone da 2–5 MB, senza Node.js. Come si confronta Perry con bun build --compile e Node SEA.",
  breadcrumb: "Compila TypeScript in un binario",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Compila TypeScript <span className="gradient-text">in un binario</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Un comando trasforma{" "}
            <code className="text-slate-300">main.ts</code>{" "}
            in un eseguibile nativo standalone. Niente Node.js sulla macchina
            di destinazione, nessun runtime raggruppato, nessun passaggio di
            installazione per i tuoi utenti.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/getting-started" className="btn-primary">
              Installa Perry
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
            Tre cose che si chiamano &ldquo;compilare TypeScript&rdquo;
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Quando gli sviluppatori cercano come compilare TypeScript in un
            binario, di solito si imbattono in tre tecniche molto diverse che
            condividono una parola:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Transpilazione.</strong>{" "}
              <code className="text-slate-300">tsc</code>, SWC ed esbuild
              trasformano TypeScript in JavaScript. L&apos;output ha comunque
              bisogno di Node.js, Bun o di un browser per essere eseguito.
              Nessun binario è coinvolto.
            </li>
            <li>
              <strong className="text-slate-300">
                Integrazione del runtime.
              </strong>{" "}
              <code className="text-slate-300">bun build --compile</code>,{" "}
              <code className="text-slate-300">deno compile</code> e le
              Node.js Single Executable Applications (SEA) concatenano il tuo
              JavaScript raggruppato con una copia completa del runtime.
              Ottieni un unico file, ma il motore viaggia al suo interno e il
              tuo codice viene comunque analizzato e compilato JIT ogni volta
              che il processo si avvia.
            </li>
            <li>
              <strong className="text-slate-300">
                Compilazione nativa ahead-of-time.
              </strong>{" "}
              È quello che fa Perry. TypeScript viene analizzato con SWC, i
              tipi vengono risolti, i generici vengono monomorfizzati e LLVM
              genera codice macchina. Il linker produce un eseguibile normale
              — la stessa classe di artefatto prodotta da una toolchain Rust,
              Go o C++. Non c&apos;è alcun motore JavaScript nel binario.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Poiché non c&apos;è alcun motore da avviare né nulla da analizzare
            all&apos;avvio, un binario Perry parte in circa un millisecondo.
            La pipeline stessa è descritta più in dettaglio nella pagina{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              compilatore nativo per TypeScript
            </Link>{" "}
            e nei{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              meccanismi interni del compilatore
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Quanto è grande il binario?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            La dimensione dipende da cosa includi, perché viene compilato e
            linkato solo il codice che usi effettivamente:
          </p>
          <ul className="space-y-3 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              Un hello world è di circa{" "}
              <strong className="text-slate-300">330 KB</strong>.
            </li>
            <li>
              I tipici strumenti CLI si attestano su{" "}
              <strong className="text-slate-300">2–5 MB</strong>.
            </li>
            <li>
              Le applicazioni complete che linkano framework di grandi
              dimensioni (Fastify, mysql2 e simili) sono di circa{" "}
              <strong className="text-slate-300">48 MB</strong>.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Per contrasto: un eseguibile Node SEA è una copia del binario{" "}
            <code className="text-slate-300">node</code> stesso, quindi parte
            da circa 88–118 MB a seconda della piattaforma prima ancora di
            aggiungere il tuo codice, mentre un hello world compilato con Bun
            misura circa 60 MB su macOS arm64 e circa 100 MB su Linux x64,
            perché l&apos;intero runtime di Bun è embedded.
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry vs bun build --compile vs Node SEA
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Tutti e tre ti danno un unico file che puoi consegnare a qualcuno.
            Per il resto sono strumenti molto diversi, e ognuno è la risposta
            giusta per qualcuno:
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
                    Cosa produce
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Codice macchina compilato AOT (LLVM)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JS raggruppato + runtime Bun embedded
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Copia del binario node con il tuo script raggruppato
                    iniettato
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Modello di esecuzione
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Codice nativo, nessun motore JS
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (JavaScriptCore) a runtime
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (V8) a runtime
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Dimensione hello-world
                  </td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">
                    ~60 MB (macOS arm64) a oltre 100 MB (Linux/Windows)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    ~88–118 MB (dimensione del binario node)
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Avvio
                  </td>
                  <td className="px-4 py-3 text-slate-400">~1 ms</td>
                  <td className="px-4 py-3 text-slate-400">~10 ms</td>
                  <td className="px-4 py-3 text-slate-400">~30 ms</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Cross-compilazione
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    10 target, incluso Windows/macOS/iOS da Linux
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Sì — Linux, Windows, macOS tramite --target
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    No — copia invece un binario node per piattaforma
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Compatibilità JS/npm
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    In crescita: axios, zod v4, express, fastify, hono
                    compilano nativamente; fallback V8 opzionale per il resto
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Completa — è il runtime Bun
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Semantica Node completa; richiede pre-bundling, solo
                    CommonJS su Node 24 LTS
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Stato
                  </td>
                  <td className="px-4 py-3 text-slate-400">Pre-1.0</td>
                  <td className="px-4 py-3 text-slate-400">Stabile</td>
                  <td className="px-4 py-3 text-slate-400">
                    Stabilità &ldquo;in sviluppo attivo&rdquo; in Node 24 LTS
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-400 leading-relaxed mb-6">
            Il quadro onesto: se la tua applicazione si appoggia
            sull&apos;intero ecosistema npm e vuoi un rischio di compatibilità
            zero, Bun e Node SEA eseguono esattamente la semantica del motore
            contro cui già sviluppi — questo è il loro punto di forza, e il
            costo in termini di dimensione potrebbe non contare per il tuo
            deployment. Perry è un compromesso diverso. Ottieni vera
            compilazione ahead-of-time, binari piccoli e avvio in
            millisecondi; in cambio adotti un compilatore pre-1.0 la cui
            conformità JavaScript è misurata e pubblicata (test262: String
            79%, Array 72% a partire dalla v0.5.1146) invece di essere
            ereditata da V8.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            Confronti diretti dettagliati:{" "}
            <Link
              href="/compare/bun"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun
            </Link>{" "}
            e{" "}
            <Link
              href="/compare/deno"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Deno
            </Link>
            . Per come compilano i pacchetti npm, vedi{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Veri pacchetti npm ora compilano: axios, zod, express — e una
              passata di conformance
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
              Compila il tuo primo binario oggi
            </h2>
            <p className="text-slate-400 mb-6">
              Installa con Homebrew, APT o winget — poi{" "}
              <code className="text-slate-300">perry compile main.ts</code>.
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
