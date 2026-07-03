import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Alternativas a Electron para TypeScript: Perry frente a Tauri frente a Bun",
  description:
    "¿Buscas una alternativa a Electron en TypeScript? Compara Electron, Tauri, los enfoques basados en Bun y Perry en tamaño de binario, memoria, stack de UI y lenguaje.",
  breadcrumb: "Alternativas a Electron para TypeScript",
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
            Volver a las comparativas
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">
              Alternativas a Electron para desarrolladores de TypeScript
            </span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed mb-12">
            Electron hizo que las apps de escritorio fueran accesibles para
            los desarrolladores web, y sus costes de tamaño y memoria
            convirtieron «alternativa a Electron» en una búsqueda
            permanente. Si TypeScript es tu lenguaje, hay cuatro caminos
            realistas en 2026: quedarte con Electron, pasarte a Tauri,
            construir binarios con runtime embebido usando Bun, o compilar a
            nativo con Perry. Cada uno hace concesiones muy distintas.
          </p>

          <h2 className="text-2xl font-bold mb-6">Los cuatro enfoques</h2>

          <div className="space-y-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Electron — la base
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Empaqueta Chromium y Node.js con cada app. La ventaja es una
                década de madurez en producción y un stack de UI (HTML/CSS/JS)
                que tu equipo ya conoce — VS Code, Slack y Discord se
                distribuyen sobre él. La desventaja es el coste base:
                instaladores hello world de unos 80–150 MB, múltiples
                procesos de Chromium y cientos de MB de RAM en reposo. Solo
                escritorio.{" "}
                <Link
                  href="/compare/electron"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Comparativa completa de Perry frente a Electron
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Tauri — UI web en el webview del sistema, backend en Rust
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tauri conserva el frontend web pero elimina el Chromium
                empaquetado: la UI se renderiza en el webview del sistema
                operativo (WKWebView, WebView2, WebKitGTK), así que los
                instaladores se quedan en el rango de un solo dígito de MB.
                Es estable, está bien documentado, y Tauri 2 añadió
                iOS/Android. Las concesiones: el backend es Rust, no
                TypeScript — la lógica de la app más allá de la UI significa
                escribir Rust y cruzar un puente IPC — y el renderizado
                varía ligeramente según la plataforma porque cada sistema
                operativo distribuye un webview distinto.{" "}
                <Link
                  href="/compare/tauri"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Comparativa completa de Perry frente a Tauri
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Bun — binarios de un solo archivo, sin capa de GUI
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                La gente que busca «bun electron» suele querer la comodidad
                de Electron sin su peso.{" "}
                <code className="text-slate-300">bun build --compile</code>{" "}
                produce un único ejecutable embebiendo el runtime de Bun
                junto con tu TypeScript empaquetado — excelente para CLIs y
                servidores, con compatibilidad total con npm porque
                literalmente es el runtime. Pero el binario pesa entre 60 MB
                (macOS arm64) y más de 100 MB (Linux/Windows), el código se
                sigue ejecutando vía JIT, y Bun no tiene framework de UI —
                una app de escritorio todavía necesita Electron, Tauri o una
                librería de webview encima.{" "}
                <Link
                  href="/compare/bun"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Comparativa completa de Perry frente a Bun
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Perry — TypeScript compilado a widgets nativos
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Perry compila TypeScript de forma anticipada a código
                máquina y renderiza la UI a través de widgets reales de la
                plataforma — AppKit, UIKit, GTK4, Win32, Android vía JNI —
                sin webview y sin puente IPC. Un solo lenguaje para UI y
                lógica, hello world de ~330 KB, binarios típicos de 2–5 MB,
                arranque de ~1 ms, y diez plataformas incluyendo móvil, watch
                y TV. La salvedad honesta: Perry está en pre-1.0, su API de
                UI es propia (declarativa, al estilo SwiftUI — no HTML/CSS),
                y el ecosistema es joven comparado con el de Electron.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">Cara a cara</h2>
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
                  <td className="px-4 py-3 text-slate-300 font-medium">Lenguaje</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript en todas partes</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS + HTML/CSS</td>
                  <td className="px-4 py-3 text-slate-400">Frontend JS/TS, backend Rust</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Enfoque de UI</td>
                  <td className="px-4 py-3 text-slate-400">Widgets nativos de la plataforma</td>
                  <td className="px-4 py-3 text-slate-400">Chromium empaquetado</td>
                  <td className="px-4 py-3 text-slate-400">Webview del sistema</td>
                  <td className="px-4 py-3 text-slate-400">Ninguno (CLI/servidor)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Tamaño del hello world</td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">~80–150 MB</td>
                  <td className="px-4 py-3 text-slate-400">~3–10 MB</td>
                  <td className="px-4 py-3 text-slate-400">~60–116 MB según la plataforma</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Ejecución</td>
                  <td className="px-4 py-3 text-slate-400">Código máquina AOT</td>
                  <td className="px-4 py-3 text-slate-400">JIT (V8)</td>
                  <td className="px-4 py-3 text-slate-400">JIT (motor JS del webview) + Rust nativo</td>
                  <td className="px-4 py-3 text-slate-400">JIT (JavaScriptCore)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Memoria en reposo</td>
                  <td className="px-4 py-3 text-slate-400">Decenas de MB (un único proceso nativo)</td>
                  <td className="px-4 py-3 text-slate-400">Cientos de MB (Chromium multiproceso)</td>
                  <td className="px-4 py-3 text-slate-400">Menor que Electron (webview del SO)</td>
                  <td className="px-4 py-3 text-slate-400">Típico de un runtime</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Móvil / watch / TV</td>
                  <td className="px-4 py-3 text-slate-400">iOS, iPadOS, Android, watchOS, tvOS</td>
                  <td className="px-4 py-3 text-slate-400">No</td>
                  <td className="px-4 py-3 text-slate-400">iOS, Android (Tauri 2)</td>
                  <td className="px-4 py-3 text-slate-400">No</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Madurez</td>
                  <td className="px-4 py-3 text-slate-400">Pre-1.0</td>
                  <td className="px-4 py-3 text-slate-400">Más de una década en producción</td>
                  <td className="px-4 py-3 text-slate-400">Estable (1.x/2.x)</td>
                  <td className="px-4 py-3 text-slate-400">Estable</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-6">
            ¿Qué pasa con React Native o Flutter?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-16">
            Aparecen en todos los hilos sobre Electron, pero responden a una
            pregunta distinta. React Native es mobile-first: tu JavaScript
            corre en el motor Hermes y controla vistas nativas a través de
            un bridge, y el soporte de escritorio solo existe mediante forks
            separados de la comunidad/Microsoft — no es un reemplazo directo
            de Electron (
            <Link
              href="/compare/react-native"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry frente a React Native
            </Link>
            ). Flutter cubre escritorio y móvil pero implica dejar
            TypeScript por Dart, y pinta sus propios widgets en lugar de
            usar los de la plataforma. Si quedarte en TypeScript es la
            restricción, la lista realista de opciones de escritorio sigue
            siendo las cuatro anteriores.
          </p>

          <h2 className="text-2xl font-bold mb-6">¿Cuál deberías elegir?</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Quédate con el stack web
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Si tu UI ya está construida en React/Vue/Svelte y necesitas
                hoy una distribución de escritorio probada en batalla,
                Electron sigue siendo la opción de menor riesgo — pagas en
                tamaño y memoria. Si ese coste te molesta y te sientes
                cómodo escribiendo el backend en Rust, Tauri te da la mayor
                parte de la experiencia del stack web a una fracción de la
                huella.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Deja atrás el webview
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Si lo que realmente quieres es TypeScript como entrada, app
                nativa como salida — un solo lenguaje, widgets reales de la
                plataforma, binarios pequeños, y móvil/watch/TV desde el
                mismo código — ese es precisamente el hueco que Perry existe
                para llenar, con la madurez pre-1.0 como precio de entrada.
                Y si solo necesitas una CLI o un servidor como un único
                archivo con cero riesgo de compatibilidad, el{" "}
                <code className="text-slate-300">--compile</code> de Bun es
                la elección pragmática.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              Compruébalo tú mismo
            </h2>
            <p className="text-slate-400 mb-6">
              Instala Perry y distribuye una app nativa desde TypeScript.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                Comenzar
              </Link>
              <a
                href="https://github.com/PerryTS/perry"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Ver en GitHub
              </a>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
