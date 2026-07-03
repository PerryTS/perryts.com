import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Alternatives à Electron pour TypeScript : Perry vs Tauri vs Bun",
  description:
    "À la recherche d'une alternative à Electron en TypeScript ? Comparez Electron, Tauri, les approches basées sur Bun et Perry sur la taille du binaire, la mémoire, la stack UI et le langage.",
  breadcrumb: "Alternatives à Electron pour TypeScript",
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
            Retour aux comparaisons
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">
              Alternatives à Electron pour les développeurs TypeScript
            </span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed mb-12">
            Electron a rendu les applications desktop accessibles aux
            développeurs web, et son coût en taille et en mémoire a fait
            d&apos;« alternative à Electron » une requête de recherche
            permanente. Si TypeScript est votre langage, il existe quatre
            voies réalistes en 2026 : rester sur Electron, migrer vers
            Tauri, construire des binaires à runtime embarqué avec Bun, ou
            compiler en natif avec Perry. Elles font des compromis très
            différents.
          </p>

          <h2 className="text-2xl font-bold mb-6">Les quatre approches</h2>

          <div className="space-y-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Electron — la référence
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Regroupe Chromium et Node.js avec chaque application.
                L&apos;avantage est une décennie de maturité en production
                et une stack UI (HTML/CSS/JS) que votre équipe connaît déjà
                — VS Code, Slack et Discord tournent dessus. L&apos;inconvénient
                est le coût de base : des installeurs hello-world d&apos;environ
                80 à 150 Mo, plusieurs processus Chromium, et des centaines
                de Mo de RAM au repos. Desktop uniquement.{" "}
                <Link
                  href="/compare/electron"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Comparaison complète Perry vs Electron
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Tauri — UI web dans la webview système, backend Rust
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tauri conserve le frontend web mais abandonne Chromium
                embarqué : l&apos;UI se rend dans la webview de l&apos;OS
                (WKWebView, WebView2, WebKitGTK), si bien que les installeurs
                se situent dans la plage des Mo à un chiffre. C&apos;est
                stable, bien documenté, et Tauri 2 a ajouté iOS/Android. Les
                compromis : le backend est en Rust, pas en TypeScript — la
                logique applicative au-delà de l&apos;UI implique
                d&apos;écrire du Rust et de traverser un pont IPC — et le
                rendu varie légèrement selon la plateforme puisque chaque OS
                fournit une webview différente.{" "}
                <Link
                  href="/compare/tauri"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Comparaison complète Perry vs Tauri
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Bun — binaires monofichiers, aucune couche GUI
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Les gens qui cherchent « bun electron » veulent
                généralement la commodité d&apos;Electron sans son poids.{" "}
                <code className="text-slate-300">bun build --compile</code>{" "}
                produit un exécutable unique en embarquant le runtime Bun
                avec votre TypeScript empaqueté — excellent pour les CLI et
                les serveurs, avec une compatibilité npm complète puisque
                c&apos;est littéralement le runtime. Mais le binaire fait
                environ 60 Mo (macOS arm64) à plus de 100 Mo
                (Linux/Windows), le code reste exécuté en JIT, et Bun n&apos;a
                aucun framework UI — une application desktop a toujours
                besoin d&apos;Electron, Tauri ou d&apos;une bibliothèque
                webview par-dessus.{" "}
                <Link
                  href="/compare/bun"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Comparaison complète Perry vs Bun
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Perry — TypeScript compilé en widgets natifs
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Perry compile TypeScript à l&apos;avance en code machine et
                rend l&apos;UI à travers de vrais widgets de plateforme —
                AppKit, UIKit, GTK4, Win32, Android via JNI — sans webview et
                sans pont IPC. Un seul langage pour l&apos;UI et la logique,
                ~330 Ko pour un hello world, des binaires typiques de 2 à 5
                Mo, un démarrage en ~1 ms, et dix cibles dont le mobile, la
                montre et la TV. La réserve honnête : Perry est pré-1.0, son
                API UI est la sienne propre (déclarative, de style SwiftUI —
                pas HTML/CSS), et l&apos;écosystème est jeune à côté de celui
                d&apos;Electron.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">Côte à côte</h2>
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
                  <td className="px-4 py-3 text-slate-300 font-medium">Langage</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript partout</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS + HTML/CSS</td>
                  <td className="px-4 py-3 text-slate-400">Frontend JS/TS, backend Rust</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Approche UI</td>
                  <td className="px-4 py-3 text-slate-400">Widgets natifs de plateforme</td>
                  <td className="px-4 py-3 text-slate-400">Chromium embarqué</td>
                  <td className="px-4 py-3 text-slate-400">Webview système</td>
                  <td className="px-4 py-3 text-slate-400">Aucune (CLI/serveur)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Taille hello-world</td>
                  <td className="px-4 py-3 text-slate-400">~330 Ko</td>
                  <td className="px-4 py-3 text-slate-400">~80–150 Mo</td>
                  <td className="px-4 py-3 text-slate-400">~3–10 Mo</td>
                  <td className="px-4 py-3 text-slate-400">~60–116 Mo selon la plateforme</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Exécution</td>
                  <td className="px-4 py-3 text-slate-400">Code machine AOT</td>
                  <td className="px-4 py-3 text-slate-400">JIT (V8)</td>
                  <td className="px-4 py-3 text-slate-400">JIT (moteur JS de la webview) + Rust natif</td>
                  <td className="px-4 py-3 text-slate-400">JIT (JavaScriptCore)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Mémoire au repos</td>
                  <td className="px-4 py-3 text-slate-400">Dizaines de Mo (un seul processus natif)</td>
                  <td className="px-4 py-3 text-slate-400">Centaines de Mo (Chromium multi-processus)</td>
                  <td className="px-4 py-3 text-slate-400">Plus faible qu&apos;Electron (webview de l&apos;OS)</td>
                  <td className="px-4 py-3 text-slate-400">Typique d&apos;un runtime</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Mobile / montre / TV</td>
                  <td className="px-4 py-3 text-slate-400">iOS, iPadOS, Android, watchOS, tvOS</td>
                  <td className="px-4 py-3 text-slate-400">Non</td>
                  <td className="px-4 py-3 text-slate-400">iOS, Android (Tauri 2)</td>
                  <td className="px-4 py-3 text-slate-400">Non</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Maturité</td>
                  <td className="px-4 py-3 text-slate-400">Pré-1.0</td>
                  <td className="px-4 py-3 text-slate-400">Plus d&apos;une décennie en production</td>
                  <td className="px-4 py-3 text-slate-400">Stable (1.x/2.x)</td>
                  <td className="px-4 py-3 text-slate-400">Stable</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-6">
            Qu&apos;en est-il de React Native ou Flutter ?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-16">
            Ils reviennent dans chaque fil de discussion sur Electron, mais
            ils répondent à une question différente. React Native est
            mobile-first : votre JavaScript s&apos;exécute dans le moteur
            Hermes et pilote des vues natives via un pont, et le support
            desktop n&apos;existe qu&apos;à travers des forks communautaires
            ou Microsoft séparés — ce n&apos;est pas un remplacement direct
            d&apos;Electron (
            <Link
              href="/compare/react-native"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs React Native
            </Link>
            ). Flutter couvre le desktop et le mobile mais implique de
            quitter TypeScript pour Dart, et il dessine ses propres widgets
            plutôt que d&apos;utiliser ceux de la plateforme. Si rester en
            TypeScript est la contrainte, la liste restreinte réaliste pour
            le desktop reste les quatre options ci-dessus.
          </p>

          <h2 className="text-2xl font-bold mb-6">Lequel choisir ?</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Rester sur la stack web
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Si votre UI est déjà construite en React/Vue/Svelte et que
                vous avez besoin dès aujourd&apos;hui d&apos;une
                distribution desktop éprouvée, Electron reste le choix le
                moins risqué — vous en payez le prix en taille et en
                mémoire. Si ce coût vous dérange et que vous êtes à l&apos;aise
                pour écrire le backend en Rust, Tauri vous offre la majeure
                partie de l&apos;expérience de la stack web pour une
                fraction de l&apos;empreinte.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Laisser la webview derrière soi
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Si ce que vous voulez vraiment, c&apos;est du TypeScript en
                entrée, une application native en sortie — un seul langage,
                de vrais widgets de plateforme, de petits binaires, et le
                mobile/la montre/la TV depuis le même codebase — c&apos;est
                précisément le vide que Perry existe pour combler, avec la
                maturité pré-1.0 comme prix d&apos;entrée. Et si vous n&apos;avez
                besoin que d&apos;un CLI ou d&apos;un serveur sous forme d&apos;un
                seul fichier avec un risque de compatibilité nul,{" "}
                <code className="text-slate-300">--compile</code> de Bun est
                le choix pragmatique.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              Voyez par vous-même
            </h2>
            <p className="text-slate-400 mb-6">
              Installez Perry et livrez une application native depuis
              TypeScript.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                Commencer
              </Link>
              <a
                href="https://github.com/PerryTS/perry"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Voir sur GitHub
              </a>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
