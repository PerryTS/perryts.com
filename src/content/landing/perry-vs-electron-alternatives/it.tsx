import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Alternative a Electron per TypeScript: Perry vs Tauri vs Bun",
  description:
    "Cerchi un'alternativa a Electron in TypeScript? Confronta Electron, Tauri, gli approcci basati su Bun e Perry per dimensione del binario, memoria, stack UI e linguaggio.",
  breadcrumb: "Alternative a Electron per TypeScript",
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
            Torna ai confronti
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">
              Alternative a Electron per sviluppatori TypeScript
            </span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed mb-12">
            Electron ha reso le app desktop accessibili agli sviluppatori web,
            e i suoi costi in termini di dimensione e memoria hanno reso
            &ldquo;Electron alternative&rdquo; una query di ricerca
            permanente. Se TypeScript è il tuo linguaggio, ci sono quattro
            percorsi realistici nel 2026: restare con Electron, passare a
            Tauri, costruire binari con runtime embedded con Bun, o compilare
            in nativo con Perry. Fanno compromessi molto diversi.
          </p>

          <h2 className="text-2xl font-bold mb-6">I quattro approcci</h2>

          <div className="space-y-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Electron — la base di riferimento
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Distribuisce Chromium e Node.js con ogni app. Il vantaggio è
                un decennio di maturità in produzione e uno stack UI
                (HTML/CSS/JS) che il tuo team già conosce — VS Code, Slack e
                Discord ci girano sopra. Lo svantaggio è il costo di base:
                installer hello-world di circa 80–150 MB, più processi
                Chromium e centinaia di MB di RAM a riposo. Solo desktop.{" "}
                <Link
                  href="/compare/electron"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Confronto completo Perry vs Electron
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Tauri — UI web nella webview di sistema, backend Rust
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tauri mantiene il frontend web ma elimina Chromium in bundle:
                la UI viene renderizzata nella webview del sistema operativo
                (WKWebView, WebView2, WebKitGTK), quindi gli installer si
                attestano su una manciata di MB. È stabile, ben documentato, e
                Tauri 2 ha aggiunto iOS/Android. I compromessi: il backend è
                Rust, non TypeScript — la logica dell&apos;app oltre la UI
                significa scrivere Rust e attraversare un bridge IPC — e il
                rendering varia leggermente per piattaforma perché ogni
                sistema operativo distribuisce una webview diversa.{" "}
                <Link
                  href="/compare/tauri"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Confronto completo Perry vs Tauri
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Bun — binari a file singolo, nessun layer GUI
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Chi cerca &ldquo;bun electron&rdquo; di solito vuole la
                comodità di Electron senza il suo peso.{" "}
                <code className="text-slate-300">bun build --compile</code>{" "}
                produce un unico eseguibile incorporando il runtime Bun con il
                tuo TypeScript raggruppato — eccellente per CLI e server, con
                piena compatibilità npm dato che è letteralmente il runtime.
                Ma il binario è di circa 60 MB (macOS arm64) fino a oltre
                100 MB (Linux/Windows), il codice viene comunque eseguito
                tramite JIT, e Bun non ha alcun framework UI — un&apos;app
                desktop ha comunque bisogno di Electron, Tauri o di una
                libreria webview sopra.{" "}
                <Link
                  href="/compare/bun"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Confronto completo Perry vs Bun
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Perry — TypeScript compilato in widget nativi
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Perry compila TypeScript ahead-of-time in codice macchina e
                renderizza la UI tramite veri widget di piattaforma — AppKit,
                UIKit, GTK4, Win32, Android tramite JNI — senza alcuna webview
                e senza bridge IPC. Un solo linguaggio per UI e logica, hello
                world di ~330 KB, binari tipici di 2–5 MB, avvio di ~1 ms, e
                dieci target inclusi mobile, watch e TV. L&apos;avvertenza
                onesta: Perry è pre-1.0, la sua API UI è propria (dichiarativa,
                in stile SwiftUI — non HTML/CSS), e l&apos;ecosistema è
                giovane rispetto a quello di Electron.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">A confronto</h2>
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
                  <td className="px-4 py-3 text-slate-300 font-medium">Linguaggio</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript ovunque</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS + HTML/CSS</td>
                  <td className="px-4 py-3 text-slate-400">Frontend JS/TS, backend Rust</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Approccio UI</td>
                  <td className="px-4 py-3 text-slate-400">Widget nativi di piattaforma</td>
                  <td className="px-4 py-3 text-slate-400">Chromium in bundle</td>
                  <td className="px-4 py-3 text-slate-400">Webview di sistema</td>
                  <td className="px-4 py-3 text-slate-400">Nessuno (CLI/server)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Dimensione hello-world</td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">~80–150 MB</td>
                  <td className="px-4 py-3 text-slate-400">~3–10 MB</td>
                  <td className="px-4 py-3 text-slate-400">~60–116 MB a seconda della piattaforma</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Esecuzione</td>
                  <td className="px-4 py-3 text-slate-400">Codice macchina AOT</td>
                  <td className="px-4 py-3 text-slate-400">JIT (V8)</td>
                  <td className="px-4 py-3 text-slate-400">JIT (motore JS della webview) + Rust nativo</td>
                  <td className="px-4 py-3 text-slate-400">JIT (JavaScriptCore)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Memoria a riposo</td>
                  <td className="px-4 py-3 text-slate-400">Decine di MB (singolo processo nativo)</td>
                  <td className="px-4 py-3 text-slate-400">Centinaia di MB (Chromium multi-processo)</td>
                  <td className="px-4 py-3 text-slate-400">Inferiore a Electron (webview del sistema operativo)</td>
                  <td className="px-4 py-3 text-slate-400">Tipica di un runtime</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Mobile / watch / TV</td>
                  <td className="px-4 py-3 text-slate-400">iOS, iPadOS, Android, watchOS, tvOS</td>
                  <td className="px-4 py-3 text-slate-400">No</td>
                  <td className="px-4 py-3 text-slate-400">iOS, Android (Tauri 2)</td>
                  <td className="px-4 py-3 text-slate-400">No</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Maturità</td>
                  <td className="px-4 py-3 text-slate-400">Pre-1.0</td>
                  <td className="px-4 py-3 text-slate-400">Oltre un decennio in produzione</td>
                  <td className="px-4 py-3 text-slate-400">Stabile (1.x/2.x)</td>
                  <td className="px-4 py-3 text-slate-400">Stabile</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-6">
            E React Native o Flutter?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-16">
            Emergono in ogni discussione su Electron, ma rispondono a una
            domanda diversa. React Native è mobile-first: il tuo JavaScript
            gira nel motore Hermes e pilota viste native tramite un bridge, e
            il supporto desktop esiste solo tramite fork separati della
            community/Microsoft — non è un sostituto diretto di Electron (
            <Link
              href="/compare/react-native"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs React Native
            </Link>
            ). Flutter copre desktop e mobile ma significa abbandonare
            TypeScript per Dart, e disegna i propri widget invece di usare
            quelli della piattaforma. Se restare in TypeScript è il vincolo,
            la shortlist realistica per il desktop resta quella delle quattro
            opzioni sopra.
          </p>

          <h2 className="text-2xl font-bold mb-6">Quale scegliere?</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Resta con lo stack web
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Se la tua UI è già costruita in React/Vue/Svelte e hai bisogno
                oggi di una distribuzione desktop collaudata, Electron resta
                la scelta a più basso rischio — paghi in dimensione e memoria.
                Se quel costo ti infastidisce e te la senti di scrivere il
                backend in Rust, Tauri ti dà gran parte dell&apos;esperienza
                dello stack web con una frazione dell&apos;ingombro.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Lascia la webview alle spalle
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Se quello che vuoi davvero è TypeScript in ingresso, app
                nativa in uscita — un solo linguaggio, veri widget di
                piattaforma, binari piccoli e mobile/watch/TV dalla stessa
                codebase — questo è esattamente il vuoto che Perry esiste per
                colmare, con la maturità pre-1.0 come prezzo da pagare. E se ti
                serve solo una CLI o un server come file singolo con rischio
                di compatibilità zero,{" "}
                <code className="text-slate-300">--compile</code> di Bun è la
                scelta pragmatica.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              Guarda tu stesso
            </h2>
            <p className="text-slate-400 mb-6">
              Installa Perry e distribuisci un&apos;app nativa da TypeScript.
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
      </article>
    </>
  );
}
