import { Link } from "@/i18n/navigation";
import { Installation } from "@/components/Installation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Premiers pas avec Perry — Installer et compiler TypeScript en natif",
  description:
    "Installez Perry avec Homebrew, APT ou winget et compilez votre premier fichier TypeScript en exécutable natif en moins d'une minute. Aucun Node.js requis.",
  breadcrumb: "Premiers pas",
  absoluteTitle: true,
};

export default function Content() {
  return (
    <>
            <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Premiers pas avec <span className="gradient-text">Perry</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            De zéro à un exécutable natif fonctionnel en trois étapes. Pas de
            Node.js, pas de bundler, aucun runtime à installer sur la machine
            cible.
          </p>
        </div>
      </section>

      <Installation />

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Votre premier binaire, étape par étape
          </h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            Une fois Perry installé, compiler TypeScript en exécutable natif
            tient en une seule commande. Écrivez un fichier :
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
            Compilez-le et exécutez le résultat — la sortie est un binaire
            autonome en code machine, pas un script empaqueté :
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
            Ce binaire démarre en environ une milliseconde et s&apos;exécute
            sur toute machine ayant le même OS et la même architecture — rien
            à installer au préalable. Pour en savoir plus, lisez{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              comment Perry compile TypeScript en binaire
            </Link>{" "}
            ou ce qui se passe à l&apos;intérieur du{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              compilateur TypeScript natif
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Et ensuite ?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://docs.perryts.com"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Documentation
              </h3>
              <p className="text-slate-400 text-sm">
                Des guides pour la CLI, les widgets perry/ui, le threading,
                l&apos;i18n et chaque cible de compilation — sur
                docs.perryts.com.
              </p>
            </a>
            <Link href="/showcase" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Showcase
              </h3>
              <p className="text-slate-400 text-sm">
                De vraies applications compilées avec Perry, livrées sur
                l&apos;App Store et au-delà.
              </p>
            </Link>
            <Link href="/compare" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Comparer
              </h3>
              <p className="text-slate-400 text-sm">
                Comment Perry se compare à Bun, Deno, Electron, Tauri, React
                Native et Static Hermes.
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
                Code source, issues et discussions — Perry est open source.
              </p>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
