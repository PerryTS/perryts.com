import { Link } from "@/i18n/navigation";
import { Installation } from "@/components/Installation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Comienza con Perry — Instala y compila TypeScript a nativo",
  description:
    "Instala Perry con Homebrew, APT o winget y compila tu primer archivo TypeScript en un ejecutable nativo en menos de un minuto. No requiere Node.js.",
  breadcrumb: "Comenzar",
  absoluteTitle: true,
};

export default function Content() {
  return (
    <>
            <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Comienza con <span className="gradient-text">Perry</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            De cero a un ejecutable nativo funcionando en tres pasos. Sin
            Node.js, sin bundler, sin runtime que instalar en la máquina de
            destino.
          </p>
        </div>
      </section>

      <Installation />

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Tu primer binario, paso a paso
          </h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            Una vez que Perry está instalado, compilar TypeScript a un
            ejecutable nativo es un único comando. Escribe un archivo:
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
            Compílalo y ejecuta el resultado — la salida es un binario de
            código máquina autocontenido, no un script empaquetado:
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
            Ese binario arranca en aproximadamente un milisegundo y se ejecuta
            en cualquier máquina con el mismo sistema operativo y
            arquitectura — no hay nada que instalar antes. Lee más sobre{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              cómo Perry compila TypeScript a un binario
            </Link>{" "}
            o qué ocurre dentro del{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              compilador nativo de TypeScript
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Adónde ir después</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://docs.perryts.com"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Documentación
              </h3>
              <p className="text-slate-400 text-sm">
                Guías para la CLI, los widgets de perry/ui, threading, i18n y
                cada plataforma de compilación — en docs.perryts.com.
              </p>
            </a>
            <Link href="/showcase" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Showcase
              </h3>
              <p className="text-slate-400 text-sm">
                Apps reales compiladas con Perry, distribuidas en la App
                Store y más allá.
              </p>
            </Link>
            <Link href="/compare" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Comparar
              </h3>
              <p className="text-slate-400 text-sm">
                Cómo se compara Perry frente a Bun, Deno, Electron, Tauri,
                React Native y Static Hermes.
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
                Código fuente, issues y discusiones — Perry es de código
                abierto.
              </p>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
