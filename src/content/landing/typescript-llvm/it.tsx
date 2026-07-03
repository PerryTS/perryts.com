import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript su LLVM: monomorfizzazione e codegen nativo",
  description:
    "Come Perry converte TypeScript in LLVM IR — un HIR tipizzato, monomorfizzazione, NaN-boxing — e perché il backend è passato da Cranelift a LLVM per le performance AOT.",
  breadcrumb: "TypeScript su LLVM",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            TypeScript su <span className="gradient-text">LLVM</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Come Perry converte, tramite lowering, un linguaggio progettato
            per motori JIT in LLVM IR — monomorfizzazione, NaN-boxing,
            lowering inline — e perché ha abbandonato Cranelift.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/internals" className="btn-primary">
              Meccanismi interni del compilatore
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
          <h2 className="text-2xl font-bold mb-6">Perché LLVM per TypeScript?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Un compilatore ahead-of-time vive in un regime diverso da un JIT.
            Un JIT compila mentre l&apos;utente aspetta, quindi la latenza di
            compilazione è il vincolo. Un compilatore AOT come Perry compila
            una sola volta — sulla macchina dello sviluppatore o in CI — e il
            binario viene poi eseguito milioni di volte. Questa asimmetria è
            esattamente dove un ottimizzatore pesante si ripaga da solo.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            LLVM porta con sé due decenni di lavoro sul middle-end:
            vettorizzazione dei cicli, loop-invariant code motion, global
            value numbering, sparse conditional constant propagation, inlining
            aggressivo, analisi degli alias. Il compito di Perry è fornire a
            quella macchineria un IR che possa davvero ottimizzare — ed è qui
            che entrano in gioco le informazioni di tipo di TypeScript.
          </p>

          <h2 className="text-2xl font-bold mb-6">La pipeline di lowering</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Il codice sorgente viene analizzato con SWC, poi sottoposto a
            lowering in un IR tipizzato di alto livello (HIR) dove avvengono
            le decisioni interessanti prima che LLVM veda mai il codice:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-12 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Monomorfizzazione.</strong>{" "}
              Le funzioni e le classi generiche vengono specializzate per ogni
              istanziazione concreta, la stessa strategia usata da Rust e C++.{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> e{" "}
              <code className="text-slate-300">{`Stack<string>`}</code>{" "}
              diventano due funzioni indipendenti e completamente tipizzate —
              così l&apos;ottimizzatore lavora con tipi concreti invece di un
              blob di dispatch generico, e i generici non costano nulla a
              runtime.
            </li>
            <li>
              <strong className="text-slate-300">Dispatch statico.</strong>{" "}
              Dove il tipo del receiver è noto a tempo di compilazione, le
              chiamate ai metodi compilano in chiamate dirette che LLVM può
              fare inline, non in ricerche in hash-table.
            </li>
            <li>
              <strong className="text-slate-300">
                Accesso diretto ai campi.
              </strong>{" "}
              I campi degli oggetti si risolvono in indici a tempo di
              compilazione, quindi una lettura di proprietà è un load a
              offset fisso — non una ricerca in un dizionario.
            </li>
          </ul>

          <h2 className="text-2xl font-bold mb-6">
            NaN-boxing e lowering inline
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Dove i valori sono dinamici, Perry usa il NaN-boxing: ogni valore
            è una parola a 64 bit. I double sono memorizzati direttamente;
            oggetti, stringhe, booleani, <code className="text-slate-300">null</code>{" "}
            e{" "}
            <code className="text-slate-300">undefined</code> sono codificati
            nei bit pattern inutilizzati di un IEEE 754 quiet NaN. I numeri
            sono a costo zero — nessun boxing, nessuna allocazione per
            l&apos;aritmetica.
          </p>
          <p className="text-slate-400 leading-relaxed mb-6">
            Il problema è che le operazioni sui valori non numerici richiedono
            sequenze di bit per scompattare, operare e ricompattare. Se quelle
            sequenze vivono come chiamate a un runtime compilato
            separatamente, LLVM vede scatole nere opache e non può ottimizzare
            attraverso di esse. Perry emette quindi le operazioni calde —
            caricamenti di proprietà, dispatch di metodi, allocazione di
            oggetti — come IR LLVM inline che l&apos;ottimizzatore può fondere
            e semplificare. L&apos;allocazione di oggetti, ad esempio, compila
            fino a un&apos;allocazione bump inline thread-local:
          </p>

          <div className="code-block mb-12">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">LLVM IR — allocazione bump inline</span>
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

          <h2 className="text-2xl font-bold mb-6">Perché non Cranelift?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Il primo backend di Perry era Cranelift — il codegen dietro
            wasmtime, costruito per una compilazione veloce e prevedibile.
            Era il punto di partenza giusto, e resta una scelta eccellente per
            i JIT e i runtime sandboxati. Due cose hanno forzato il cambio:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-6 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Il tetto dell&apos;ottimizzatore.</strong>{" "}
              Cranelift è deliberatamente un compilatore veloce a singolo
              livello: &ldquo;codice decente velocemente,&rdquo; che è il
              compromesso giusto per un JIT e quello sbagliato per un
              compilatore AOT il cui punto di forza è la performance nativa
              massima.
            </li>
            <li>
              <strong className="text-slate-300">arm64_32.</strong> L&apos;Apple
              Watch usa un ABI (istruzioni a 64 bit, puntatori a 32 bit) che
              Cranelift non supporta. Perché watchOS potesse esistere come
              target, LLVM era necessario — e mantenere due backend
              significava due insiemi di bug, test e baseline di performance.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            La migrazione non è stata gratuita: la prima release solo-LLVM ha
            fatto regredire alcuni benchmark fino a 70x perché le operazioni
            calde inizialmente passavano attraverso chiamate opache a helper
            del runtime. Il recupero — lowering inline, il bump allocator
            sopra, confini di inlining migliori — ha portato il backend oltre
            i numeri di Cranelift, e una volta assestato Perry ha battuto
            Node.js su ogni benchmark della sua suite, da 1,7x a 24,6x con
            due pareggi (aprile 2026). Il post-mortem completo vale la
            lettura:{" "}
            <Link
              href="/blog/cranelift-to-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Da Cranelift a LLVM
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Per approfondire</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            La{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              pagina dei meccanismi interni del compilatore
            </Link>{" "}
            tratta NaN-boxing, monomorfizzazione e dispatch statico più in
            dettaglio. Sul blog,{" "}
            <Link
              href="/blog/optimizing-everything"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Ottimizzare tutto
            </Link>{" "}
            ripercorre il lavoro di ottimizzazione release dopo release, e{" "}
            <Link
              href="/blog/gen-gc-lazy-json-and-defensible-benchmarks"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              GC generazionale, JSON lazy e benchmark che reggono il controllo
            </Link>{" "}
            spiega come funziona la metodologia di benchmark (RUNS=11, mediana
            + p95). Per il quadro più ampio, inizia dalla panoramica{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              compilatore nativo per TypeScript
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
              Guarda tu stesso l&apos;output
            </h2>
            <p className="text-slate-400 mb-6">
              <code className="text-slate-300">perry compile main.ts</code> —
              codice macchina nativo, nessun motore collegato.
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
        </div>
      </section>
    </>
  );
}
