import { Link } from "@/i18n/navigation";
import { Performance } from "@/components/Performance";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Compiler TypeScript en binaire (exécutables autonomes)",
  description:
    "Compilez TypeScript en binaire : exécutables natifs autonomes de 2 à 5 Mo, sans Node.js. Comment Perry se compare à bun build --compile et Node SEA.",
  breadcrumb: "Compiler TypeScript en binaire",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Compilez TypeScript <span className="gradient-text">en binaire</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Une seule commande transforme{" "}
            <code className="text-slate-300">main.ts</code>{" "}
            en exécutable natif autonome. Pas de Node.js sur la machine
            cible, pas de runtime empaqueté, aucune étape d&apos;installation
            pour vos utilisateurs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/getting-started" className="btn-primary">
              Installer Perry
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
            Trois choses que les gens appellent « compiler TypeScript »
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Quand les développeurs cherchent comment compiler TypeScript en
            binaire, ils tombent généralement sur trois techniques très
            différentes qui partagent un même mot :
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Transpilation.</strong>{" "}
              <code className="text-slate-300">tsc</code>, SWC et esbuild
              transforment TypeScript en JavaScript. La sortie a toujours
              besoin de Node.js, Bun ou d&apos;un navigateur pour
              s&apos;exécuter. Aucun binaire n&apos;est impliqué.
            </li>
            <li>
              <strong className="text-slate-300">Intégration du runtime.</strong>{" "}
              <code className="text-slate-300">bun build --compile</code>,{" "}
              <code className="text-slate-300">deno compile</code>, et les
              Single Executable Applications (SEA) de Node.js concatènent
              votre JavaScript empaqueté avec une copie complète du runtime.
              Vous obtenez un seul fichier, mais le moteur voyage à
              l&apos;intérieur et votre code est toujours analysé et compilé
              en JIT à chaque démarrage du processus.
            </li>
            <li>
              <strong className="text-slate-300">
                Compilation native ahead-of-time.
              </strong>{" "}
              C&apos;est ce que fait Perry. TypeScript est analysé avec SWC,
              les types sont résolus, les génériques sont monomorphisés, et
              LLVM émet du code machine. L&apos;éditeur de liens produit un
              exécutable normal — la même catégorie d&apos;artefact
              qu&apos;une toolchain Rust, Go ou C++ produit. Il n&apos;y a
              absolument aucun moteur JavaScript dans le binaire.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Comme il n&apos;y a aucun moteur à démarrer et rien à analyser au
            lancement, un binaire Perry démarre en environ une milliseconde.
            Le pipeline lui-même est décrit plus en détail sur la page{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              compilateur TypeScript natif
            </Link>{" "}
            et dans le{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              fonctionnement interne du compilateur
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Quelle est la taille du binaire ?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            La taille dépend de ce que vous embarquez, car seul le code que
            vous utilisez réellement est compilé et lié :
          </p>
          <ul className="space-y-3 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              Un hello world fait environ{" "}
              <strong className="text-slate-300">330 Ko</strong>.
            </li>
            <li>
              Les outils CLI classiques se situent entre{" "}
              <strong className="text-slate-300">2 et 5 Mo</strong>.
            </li>
            <li>
              Les applications complètes qui lient de gros frameworks
              (Fastify, mysql2 et consorts) font environ{" "}
              <strong className="text-slate-300">48 Mo</strong>.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Par contraste : un exécutable Node SEA est une copie du binaire{" "}
            <code className="text-slate-300">node</code> lui-même, donc il
            démarre à environ 88–118 Mo selon la plateforme avant même
            l&apos;ajout de votre code, et un hello world compilé avec Bun
            mesure environ 60 Mo sur macOS arm64 et environ 100 Mo sur Linux
            x64, parce que l&apos;intégralité du runtime Bun est embarquée.
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry vs bun build --compile vs Node SEA
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Les trois vous donnent un seul fichier que vous pouvez transmettre
            à quelqu&apos;un. Ce sont par ailleurs des outils très différents,
            et chacun est la bonne réponse pour quelqu&apos;un :
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
                    Ce qu&apos;il produit
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Code machine compilé AOT (LLVM)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JS empaqueté + runtime Bun embarqué
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Copie du binaire node avec votre script empaqueté injecté
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Modèle d&apos;exécution
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Code natif, aucun moteur JS
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (JavaScriptCore) à l&apos;exécution
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (V8) à l&apos;exécution
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Taille hello-world
                  </td>
                  <td className="px-4 py-3 text-slate-400">~330 Ko</td>
                  <td className="px-4 py-3 text-slate-400">
                    ~60 Mo (macOS arm64) à plus de 100 Mo (Linux/Windows)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    ~88–118 Mo (taille du binaire node)
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Démarrage
                  </td>
                  <td className="px-4 py-3 text-slate-400">~1 ms</td>
                  <td className="px-4 py-3 text-slate-400">~10 ms</td>
                  <td className="px-4 py-3 text-slate-400">~30 ms</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Compilation croisée
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    10 cibles, y compris Windows/macOS/iOS depuis Linux
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Oui — Linux, Windows, macOS via --target
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Non — copiez plutôt un binaire node par plateforme
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Compatibilité JS/npm
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    En croissance : axios, zod v4, express, fastify, hono
                    compilent nativement ; V8 optionnel en repli pour le reste
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Complète — c&apos;est le runtime Bun
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Sémantique Node complète ; nécessite un pré-empaquetage,
                    CommonJS uniquement sur Node 24 LTS
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Statut
                  </td>
                  <td className="px-4 py-3 text-slate-400">Pré-1.0</td>
                  <td className="px-4 py-3 text-slate-400">Stable</td>
                  <td className="px-4 py-3 text-slate-400">
                    Stabilité « en développement actif » dans Node 24 LTS
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-400 leading-relaxed mb-6">
            Pour être honnête : si votre application s&apos;appuie sur
            l&apos;écosystème npm complet et que vous voulez un risque de
            compatibilité nul, Bun et Node SEA exécutent exactement la
            sémantique de moteur avec laquelle vous développez déjà —
            c&apos;est leur force, et le coût en taille peut ne pas compter
            pour votre déploiement. Perry propose un compromis différent.
            Vous obtenez une véritable compilation ahead-of-time, de petits
            binaires et un démarrage en une milliseconde ; en échange, vous
            adoptez un compilateur pré-1.0 dont la conformité JavaScript est
            mesurée et publiée (test262 : String 79 %, Array 72 % à la date
            de v0.5.1146) plutôt qu&apos;héritée de V8.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            Comparaisons détaillées :{" "}
            <Link
              href="/compare/bun"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun
            </Link>{" "}
            et{" "}
            <Link
              href="/compare/deno"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Deno
            </Link>
            . Pour savoir comment les paquets npm compilent, voir{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Les vrais packages npm compilent désormais : axios, zod, express
              — et une passe de conformité
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
              Compilez votre premier binaire aujourd&apos;hui
            </h2>
            <p className="text-slate-400 mb-6">
              Installez avec Homebrew, APT ou winget — puis{" "}
              <code className="text-slate-300">perry compile main.ts</code>.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                Commencer
              </Link>
              <a
                href="https://docs.perryts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Lire la documentation
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
