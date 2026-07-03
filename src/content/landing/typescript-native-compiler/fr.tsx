import { Link } from "@/i18n/navigation";
import { Architecture } from "@/components/Architecture";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Compilateur TypeScript natif : comment Perry compile TS en code machine",
  description:
    "Perry est un compilateur TypeScript natif écrit en Rust : analyse SWC, HIR typé, monomorphisation, génération de code LLVM. Binaires natifs pour 10 plateformes, sans VM.",
  breadcrumb: "Compilateur TypeScript natif",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Un compilateur TypeScript natif,{" "}
            <span className="gradient-text">bâti en Rust</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Perry compile le TypeScript que vous écrivez déjà en code
            machine — de la même façon qu&apos;une toolchain Rust ou Go
            compile son langage. Pas de JavaScript transpilé, pas de machine
            virtuelle, aucun runtime sur le système cible.
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
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Ni un transpileur. Ni un runtime.
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            La plupart de l&apos;outillage TypeScript se divise en deux
            familles. Les transpileurs —{" "}
            <code className="text-slate-300">tsc</code>, SWC, esbuild —
            vérifient et suppriment les types, puis émettent du JavaScript
            qu&apos;un moteur exécutera plus tard. Les runtimes — Node.js,
            Bun, Deno — sont ces moteurs : ils analysent, interprètent et
            compilent le JavaScript en JIT à chaque démarrage de votre
            programme.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Un compilateur natif est la troisième famille, et pour
            TypeScript elle est restée largement vide. Perry traite les
            annotations de type non pas comme une documentation à
            supprimer, mais comme l&apos;entrée qui pilote la génération de
            code. Le résultat de{" "}
            <code className="text-slate-300">perry compile main.ts</code> est
            un exécutable autonome contenant du code machine — typiquement{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              2 à 5 Mo, démarrant en environ une milliseconde
            </Link>
            .
          </p>
        </article>
      </section>

      {/* Pipeline visual (shared section) */}
      <Architecture />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Le pipeline, étape par étape</h2>
          <ol className="space-y-4 text-slate-400 leading-relaxed mb-12 list-decimal pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Analyse (SWC).</strong> Les
              fichiers source sont analysés avec SWC, le parseur TypeScript
              natif en Rust, si bien que même les gros projets s&apos;analysent
              en quelques millisecondes. La génération de code par module,
              les passes de transformation et le scan de symboles
              s&apos;exécutent en parallèle sur plusieurs cœurs.
            </li>
            <li>
              <strong className="text-slate-300">Résolution des types.</strong>{" "}
              Le compilateur résout les types déclarés et infère le reste,
              donnant à chaque expression un type concret avant que la
              génération de code ne commence.
            </li>
            <li>
              <strong className="text-slate-300">
                HIR typé et monomorphisation.
              </strong>{" "}
              L&apos;AST est abaissé vers une IR typée de haut niveau. Les
              fonctions et classes génériques sont monomorphisées — chaque
              instanciation comme{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> est
              compilée séparément avec ses types concrets, si bien que les
              génériques ne coûtent rien à l&apos;exécution. Là où les types
              sont connus, les appels de méthode deviennent du dispatch
              statique et les champs d&apos;objet deviennent des chargements
              directs à décalage fixe.
            </li>
            <li>
              <strong className="text-slate-300">Génération de code (LLVM).</strong>{" "}
              Le HIR est abaissé vers de l&apos;IR LLVM et passé à travers le
              pipeline d&apos;optimisation de LLVM — inlining, optimisations
              de boucles, vectorisation — puis émis en code machine pour la
              cible.
            </li>
            <li>
              <strong className="text-slate-300">Édition de liens.</strong> La
              sortie est un exécutable de plateforme normal : Mach-O sur
              macOS, ELF sur Linux, PE sur Windows — plus les cibles mobile,
              montre, TV et WebAssembly.
            </li>
          </ol>
          <p className="text-slate-400 leading-relaxed mb-12">
            Le volet LLVM de tout cela — pourquoi LLVM a été choisi plutôt
            que Cranelift, comment le NaN-boxing représente les valeurs
            dynamiques, ce que l&apos;optimiseur fait avec l&apos;IR typée —
            a sa propre plongée en profondeur :{" "}
            <Link
              href="/typescript-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript sur LLVM
            </Link>
            . Les détails d&apos;implémentation comme le NaN-boxing, le
            dispatch statique et les abstractions à coût nul sont couverts
            dans le{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              fonctionnement interne du compilateur
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Qu&apos;en est-il du code dynamique et de npm ?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            TypeScript reste du JavaScript en dessous, et un compilateur
            TypeScript natif doit l&apos;assumer honnêtement. La conformité
            de Perry face à la suite officielle test262 est mesurée et
            publiée — à la date de v0.5.1146, la sémantique String est à 79 %
            et Array à 72 %, toutes deux en progression de release en
            release. Les paquets npm purement TypeScript/JavaScript
            compilent nativement via{" "}
            <code className="text-slate-300">perry.compilePackages</code> :
            axios, zod v4, express, fastify et hono compilent et
            s&apos;exécutent dès aujourd&apos;hui. Le code qui nécessite la
            sémantique complète d&apos;un moteur peut opter pour un V8
            embarqué en repli avec{" "}
            <code className="text-slate-300">--enable-js-runtime</code>.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Le récit complet se trouve dans{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Les vrais packages npm compilent désormais : axios, zod, express
              — et une passe de conformité
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Comment Perry se situe par rapport aux autres efforts de
            « TypeScript natif »
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry n&apos;est pas le seul projet à avoir regardé les
            annotations de type de TypeScript et y avoir vu une opportunité
            de compilation — mais les approches diffèrent nettement.
            AssemblyScript compile un langage strict de type TypeScript
            uniquement vers WebAssembly : il est délibérément incompatible
            avec JavaScript, et ne produit ni exécutables OS ni UI native.
            Static Hermes, de Meta, compile ahead-of-time un sous-ensemble
            JavaScript typé à l&apos;intérieur du moteur Hermes,
            principalement pour React Native — à la mi-2026, il reste un
            projet de recherche qui doit être compilé depuis les sources, et
            le moteur Hermes V1 qui a réellement été livré dans React Native
            n&apos;inclut pas les fonctionnalités statiques (
            <Link
              href="/compare/static-hermes"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              comparaison complète
            </Link>
            ).
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Le pari de Perry est différent sur les deux axes : TypeScript
            standard comme langage d&apos;entrée, et des exécutables de
            plateforme ordinaires — CLI, serveur et GUI — comme sortie,
            installable dès aujourd&apos;hui via Homebrew, APT, winget ou
            npm.
          </p>

          <h2 className="text-2xl font-bold mb-6">Un compilateur, dix cibles</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Comme la génération de code passe par LLVM, un seul codebase
            compile vers macOS, iOS, iPadOS, Android, Linux, Windows,
            watchOS, tvOS, WebAssembly et le Web/JS pur — y compris la
            compilation croisée de binaires Windows, macOS et iOS depuis une
            machine Linux. Les applications GUI utilisent{" "}
            <code className="text-slate-300">perry/ui</code>, une API
            déclarative au-dessus de vrais widgets de plateforme (AppKit,
            UIKit, GTK4, Win32, Android via JNI) — sans aucune webview
            impliquée.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            Comment cela se positionne face aux autres approches :{" "}
            <Link
              href="/compare"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun, Deno, Electron, Tauri, React Native et Static
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
              Essayer le compilateur
            </h2>
            <p className="text-slate-400 mb-6">
              Installez Perry et compilez votre premier binaire natif en
              moins d&apos;une minute.
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
