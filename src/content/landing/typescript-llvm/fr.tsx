import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript sur LLVM : monomorphisation et génération de code natif",
  description:
    "Comment Perry abaisse TypeScript vers l'IR LLVM — un HIR typé, la monomorphisation, le NaN-boxing — et pourquoi le backend est passé de Cranelift à LLVM pour la performance AOT.",
  breadcrumb: "TypeScript sur LLVM",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            TypeScript sur <span className="gradient-text">LLVM</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Comment Perry abaisse un langage conçu pour des moteurs JIT vers
            l&apos;IR LLVM — monomorphisation, NaN-boxing, abaissements en
            ligne — et pourquoi il a quitté Cranelift.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/internals" className="btn-primary">
              Fonctionnement interne du compilateur
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
          <h2 className="text-2xl font-bold mb-6">Pourquoi LLVM pour TypeScript ?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Un compilateur ahead-of-time vit dans un régime différent
            d&apos;un JIT. Un JIT compile pendant que l&apos;utilisateur
            attend, donc la latence de compilation est la contrainte. Un
            compilateur AOT comme Perry compile une seule fois — sur la
            machine du développeur ou en CI — et le binaire est ensuite
            exécuté des millions de fois. Cette asymétrie est exactement
            l&apos;endroit où un optimiseur lourd se rentabilise.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            LLVM apporte deux décennies de travail de middle-end : la
            vectorisation de boucles, le déplacement de code invariant de
            boucle, la numérotation de valeurs globales, la propagation de
            constantes conditionnelles éparses, l&apos;inlining agressif,
            l&apos;analyse d&apos;alias. Le travail de Perry est de fournir à
            cette machinerie une IR qu&apos;elle peut réellement optimiser —
            ce qui est précisément le rôle des informations de type de
            TypeScript.
          </p>

          <h2 className="text-2xl font-bold mb-6">Le pipeline d&apos;abaissement</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Le code source est analysé avec SWC, puis abaissé vers une IR
            typée de haut niveau (HIR) où les décisions intéressantes ont
            lieu avant même que LLVM ne voie le code :
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-12 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Monomorphisation.</strong>{" "}
              Les fonctions et classes génériques sont spécialisées par
              instanciation concrète, la même stratégie qu&apos;utilisent
              Rust et C++.{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> et{" "}
              <code className="text-slate-300">{`Stack<string>`}</code>{" "}
              deviennent deux fonctions indépendantes et entièrement typées —
              si bien que l&apos;optimiseur travaille avec des types concrets
              plutôt qu&apos;un blob de dispatch générique, et les génériques
              ne coûtent rien à l&apos;exécution.
            </li>
            <li>
              <strong className="text-slate-300">Dispatch statique.</strong>{" "}
              Là où le type du receveur est connu à la compilation, les
              appels de méthode compilent vers des appels directs que LLVM
              peut inliner, pas des recherches dans une table de hachage.
            </li>
            <li>
              <strong className="text-slate-300">Accès direct aux champs.</strong>{" "}
              Les champs d&apos;objet se résolvent en index à la
              compilation, si bien qu&apos;une lecture de propriété est un
              chargement à décalage fixe — pas une recherche dans un
              dictionnaire.
            </li>
          </ul>

          <h2 className="text-2xl font-bold mb-6">
            NaN-boxing et abaissements en ligne
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Là où les valeurs sont dynamiques, Perry utilise le NaN-boxing :
            chaque valeur est un mot de 64 bits. Les doubles sont stockés
            directement ; les objets, chaînes, booléens,{" "}
            <code className="text-slate-300">null</code> et{" "}
            <code className="text-slate-300">undefined</code> sont encodés
            dans les motifs de bits inutilisés d&apos;un NaN silencieux IEEE
            754. Les nombres sont à coût nul — aucun boxing, aucune
            allocation pour l&apos;arithmétique.
          </p>
          <p className="text-slate-400 leading-relaxed mb-6">
            Le piège est que les opérations sur des valeurs non numériques
            nécessitent des séquences de bits déballer-opérer-remballer. Si
            ces séquences vivent sous forme d&apos;appels vers un runtime
            compilé séparément, LLVM voit des boîtes noires opaques et ne
            peut pas optimiser à travers elles. Perry émet donc les
            opérations chaudes — lectures de propriétés, dispatch de
            méthodes, allocation d&apos;objets — sous forme d&apos;IR LLVM en
            ligne que l&apos;optimiseur peut fusionner et simplifier.
            L&apos;allocation d&apos;objets, par exemple, se compile en une
            allocation par décalage (bump allocation) en ligne et
            thread-local :
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

          <h2 className="text-2xl font-bold mb-6">Pourquoi pas Cranelift ?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Le premier backend de Perry était Cranelift — le générateur de
            code derrière wasmtime, conçu pour une compilation rapide et
            prévisible. C&apos;était le bon point de départ, et il reste un
            excellent choix pour les JIT et les runtimes en bac à sable.
            Deux choses ont forcé le changement :
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-6 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Le plafond de l&apos;optimiseur.</strong>{" "}
              Cranelift est délibérément un compilateur mono-niveau rapide :
              « du code correct rapidement », ce qui est le bon compromis
              pour un JIT et le mauvais pour un compilateur AOT dont
              l&apos;argument de vente est la performance native maximale.
            </li>
            <li>
              <strong className="text-slate-300">arm64_32.</strong> L&apos;Apple
              Watch utilise une ABI (instructions 64 bits, pointeurs 32
              bits) que Cranelift ne supporte pas. Pour que watchOS existe en
              tant que cible, LLVM était requis — et maintenir deux backends
              signifiait deux ensembles de bugs, de tests et de bases de
              référence de performance.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            La migration n&apos;a pas été gratuite : la première release
            uniquement-LLVM a régressé certains benchmarks jusqu&apos;à 70x
            parce que les opérations chaudes passaient initialement par des
            appels opaques à des helpers du runtime. Le rattrapage —
            abaissements en ligne, l&apos;allocateur par décalage ci-dessus,
            de meilleures frontières d&apos;inlining — a fait dépasser au
            backend les chiffres de Cranelift, et une fois stabilisé Perry
            battait Node.js sur chaque benchmark de sa suite, de 1,7x à
            24,6x avec deux égalités (avril 2026). Le post-mortem complet
            vaut la lecture :{" "}
            <Link
              href="/blog/cranelift-to-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              De Cranelift à LLVM : comment Perry est devenu 24x plus rapide
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Aller plus loin</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            La{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              page de fonctionnement interne du compilateur
            </Link>{" "}
            couvre le NaN-boxing, la monomorphisation et le dispatch
            statique plus en détail. Sur le blog,{" "}
            <Link
              href="/blog/optimizing-everything"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Tout optimiser : une semaine, 68 versions et une accélération
              JSON de 547x
            </Link>{" "}
            retrace le travail d&apos;optimisation release par release, et{" "}
            <Link
              href="/blog/gen-gc-lazy-json-and-defensible-benchmarks"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              GC générationnel, JSON paresseux et benchmarks qui résistent à
              l&apos;examen
            </Link>{" "}
            explique comment fonctionne la méthodologie de benchmark
            (RUNS=11, médiane + p95). Pour la vue d&apos;ensemble,
            commencez par l&apos;aperçu du{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              compilateur TypeScript natif
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
              Voyez la sortie par vous-même
            </h2>
            <p className="text-slate-400 mb-6">
              <code className="text-slate-300">perry compile main.ts</code> —
              code machine natif, aucun moteur attaché.
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
      </section>
    </>
  );
}
