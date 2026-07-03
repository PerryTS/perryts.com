import { Link } from "@/i18n/navigation";
import { Performance } from "@/components/Performance";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Compila TypeScript a un binario (ejecutables independientes)",
  description:
    "Compila TypeScript a un binario: ejecutables nativos independientes de 2–5 MB, sin Node.js. Cómo se compara Perry con bun build --compile y Node SEA.",
  breadcrumb: "Compila TypeScript a un binario",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Compila TypeScript <span className="gradient-text">a un binario</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Un comando convierte <code className="text-slate-300">main.ts</code>{" "}
            en un ejecutable nativo independiente. Sin Node.js en la máquina de
            destino, sin runtime empaquetado, sin paso de instalación para tus
            usuarios.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/getting-started" className="btn-primary">
              Instala Perry
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
            Tres cosas que la gente llama «compilar TypeScript»
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Cuando los desarrolladores buscan cómo compilar TypeScript a un
            binario, normalmente se topan con tres técnicas muy distintas que
            comparten una palabra:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Transpilación.</strong>{" "}
              <code className="text-slate-300">tsc</code>, SWC y esbuild
              convierten TypeScript en JavaScript. La salida todavía necesita
              Node.js, Bun o un navegador para ejecutarse. No hay ningún
              binario involucrado.
            </li>
            <li>
              <strong className="text-slate-300">Runtime embebido.</strong>{" "}
              <code className="text-slate-300">bun build --compile</code>,{" "}
              <code className="text-slate-300">deno compile</code> y las Single
              Executable Applications (SEA) de Node.js concatenan tu
              JavaScript empaquetado con una copia completa del runtime.
              Obtienes un único archivo, pero el motor viaja dentro de él y tu
              código se sigue parseando y compilando con JIT cada vez que
              arranca el proceso.
            </li>
            <li>
              <strong className="text-slate-300">
                Compilación nativa anticipada.
              </strong>{" "}
              Esto es lo que hace Perry. TypeScript se parsea con SWC, se
              resuelven los tipos, los genéricos se monomorfizan y LLVM emite
              código máquina. El linker produce un ejecutable normal — el
              mismo tipo de artefacto que produce un toolchain de Rust, Go o
              C++. No hay ningún motor de JavaScript en el binario.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Como no hay ningún motor que arrancar ni nada que parsear al
            inicio, un binario de Perry arranca en aproximadamente un
            milisegundo. La pipeline en sí se describe con más detalle en la
            página{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              compilador nativo de TypeScript
            </Link>{" "}
            y en los{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              internos del compilador
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">¿Qué tamaño tiene el binario?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            El tamaño depende de lo que incluyas, porque solo se compila y
            enlaza el código que realmente usas:
          </p>
          <ul className="space-y-3 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              Un hello world ronda los{" "}
              <strong className="text-slate-300">330 KB</strong>.
            </li>
            <li>
              Las herramientas CLI típicas se sitúan en{" "}
              <strong className="text-slate-300">2–5 MB</strong>.
            </li>
            <li>
              Las aplicaciones completas que enlazan frameworks grandes
              (Fastify, mysql2 y similares) rondan los{" "}
              <strong className="text-slate-300">48 MB</strong>.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Para contrastar: un ejecutable Node SEA es una copia del binario{" "}
            <code className="text-slate-300">node</code> en sí, así que
            arranca en torno a 88–118 MB según la plataforma antes de añadir
            tu código, y un hello world compilado con Bun mide unos 60 MB en
            macOS arm64 y alrededor de 100 MB en Linux x64, porque se embebe
            el runtime completo de Bun.
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry frente a bun build --compile frente a Node SEA
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Los tres te dan un único archivo que puedes entregarle a alguien.
            Por lo demás son herramientas muy distintas, y cada una es la
            respuesta correcta para alguien:
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
                    Qué produce
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Código máquina compilado con AOT (LLVM)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JS empaquetado + runtime de Bun embebido
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Copia del binario node con tu script empaquetado inyectado
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Modelo de ejecución
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Código nativo, sin motor JS
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (JavaScriptCore) en runtime
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (V8) en runtime
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Tamaño del hello world
                  </td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">
                    ~60 MB (macOS arm64) a ~100+ MB (Linux/Windows)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    ~88–118 MB (tamaño del binario node)
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Arranque
                  </td>
                  <td className="px-4 py-3 text-slate-400">~1 ms</td>
                  <td className="px-4 py-3 text-slate-400">~10 ms</td>
                  <td className="px-4 py-3 text-slate-400">~30 ms</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Compilación cruzada
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    10 plataformas, incluyendo Windows/macOS/iOS desde Linux
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Sí — Linux, Windows, macOS mediante --target
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    No — en su lugar, copia un binario node específico de cada
                    plataforma
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Compatibilidad JS/npm
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Creciente: axios, zod v4, express, fastify y hono
                    compilan de forma nativa; fallback opcional con V8 para el
                    resto
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Total — es el runtime de Bun
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Semántica completa de Node; requiere empaquetado previo,
                    solo CommonJS en Node 24 LTS
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Estado
                  </td>
                  <td className="px-4 py-3 text-slate-400">Pre-1.0</td>
                  <td className="px-4 py-3 text-slate-400">Estable</td>
                  <td className="px-4 py-3 text-slate-400">
                    Estabilidad «en desarrollo activo» en Node 24 LTS
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-400 leading-relaxed mb-6">
            Con honestidad: si tu aplicación depende del ecosistema npm
            completo y quieres cero riesgo de compatibilidad, Bun y Node SEA
            ejecutan exactamente la semántica del motor contra la que ya
            desarrollas — esa es su fortaleza, y el coste en tamaño puede no
            importarte para tu despliegue. Perry es una apuesta distinta.
            Obtienes compilación anticipada real, binarios pequeños y arranque
            en milisegundos; a cambio, adoptas un compilador pre-1.0 cuya
            conformidad con JavaScript se mide y se publica (test262: String
            79%, Array 72% a fecha de v0.5.1146) en lugar de heredarla de V8.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            Comparativas detalladas:{" "}
            <Link
              href="/compare/bun"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry frente a Bun
            </Link>{" "}
            y{" "}
            <Link
              href="/compare/deno"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry frente a Deno
            </Link>
            . Para ver cómo compilan los paquetes npm, consulta{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Paquetes npm reales y un barrido de conformidad
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
              Compila tu primer binario hoy
            </h2>
            <p className="text-slate-400 mb-6">
              Instala con Homebrew, APT o winget — luego{" "}
              <code className="text-slate-300">perry compile main.ts</code>.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                Comenzar
              </Link>
              <a
                href="https://docs.perryts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Leer la documentación
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
