import { Link } from "@/i18n/navigation";
import { Architecture } from "@/components/Architecture";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Compilador nativo de TypeScript: cómo Perry compila TS a código máquina",
  description:
    "Perry es un compilador nativo de TypeScript escrito en Rust: parseo con SWC, HIR tipado, monomorfización, codegen con LLVM. Binarios nativos para 10 plataformas, sin VM.",
  breadcrumb: "Compilador nativo de TypeScript",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Un compilador nativo de TypeScript,{" "}
            <span className="gradient-text">construido en Rust</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Perry compila el TypeScript que ya escribes a código máquina — de
            la misma forma en que un toolchain de Rust o Go compila su
            lenguaje. Sin JavaScript transpilado, sin máquina virtual, sin
            runtime en el sistema de destino.
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
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            No es un transpilador. No es un runtime.
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            La mayoría de las herramientas de TypeScript caen en dos familias.
            Los transpiladores —{" "}
            <code className="text-slate-300">tsc</code>, SWC, esbuild —
            verifican y eliminan los tipos, y luego emiten JavaScript para que
            un motor lo ejecute después. Los runtimes — Node.js, Bun, Deno —
            son esos motores: parsean, interpretan y compilan con JIT el
            JavaScript cada vez que arranca tu programa.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Un compilador nativo es la tercera familia, y para TypeScript ha
            estado prácticamente vacía. Perry trata las anotaciones de tipos
            no como documentación para eliminar, sino como la entrada que
            impulsa la generación de código. El resultado de{" "}
            <code className="text-slate-300">perry compile main.ts</code> es
            un ejecutable independiente que contiene código máquina —
            típicamente{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              de 2–5 MB, arrancando en aproximadamente un milisegundo
            </Link>
            .
          </p>
        </article>
      </section>

      {/* Pipeline visual (shared section) */}
      <Architecture />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">La pipeline, paso a paso</h2>
          <ol className="space-y-4 text-slate-400 leading-relaxed mb-12 list-decimal pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Parseo (SWC).</strong> Los
              archivos fuente se parsean con SWC, el parser de TypeScript
              nativo en Rust, así que incluso los proyectos grandes se
              parsean en milisegundos. El codegen de módulos, los transform
              passes y el escaneo de símbolos se ejecutan en paralelo entre
              núcleos.
            </li>
            <li>
              <strong className="text-slate-300">Resolución de tipos.</strong>{" "}
              El compilador resuelve los tipos declarados e infiere el resto,
              dando a cada expresión un tipo concreto antes de que comience la
              generación de código.
            </li>
            <li>
              <strong className="text-slate-300">
                HIR tipado y monomorfización.
              </strong>{" "}
              El AST se reduce a un IR de alto nivel tipado (HIR). Las
              funciones y clases genéricas se monomorfizan — cada
              instanciación como{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> se
              compila por separado con sus tipos concretos, así que los
              genéricos no cuestan nada en runtime. Donde los tipos son
              conocidos, las llamadas a métodos se convierten en static
              dispatch y los campos de los objetos se convierten en cargas
              directas de desplazamiento fijo.
            </li>
            <li>
              <strong className="text-slate-300">Codegen (LLVM).</strong> El
              HIR se reduce a LLVM IR y se pasa por la pipeline de
              optimización de LLVM — inlining, optimizaciones de bucles,
              vectorización — y luego se emite como código máquina para la
              plataforma de destino.
            </li>
            <li>
              <strong className="text-slate-300">Enlazado.</strong> La salida
              es un ejecutable normal de la plataforma: Mach-O en macOS, ELF
              en Linux, PE en Windows — además de plataformas móviles, de
              reloj, de TV y WebAssembly.
            </li>
          </ol>
          <p className="text-slate-400 leading-relaxed mb-12">
            El lado de LLVM en todo esto — por qué se eligió LLVM sobre
            Cranelift, cómo NaN-boxing representa los valores dinámicos, qué
            hace el optimizador con el IR tipado — tiene su propio análisis a
            fondo:{" "}
            <Link
              href="/typescript-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript sobre LLVM
            </Link>
            . Los detalles de implementación como NaN-boxing, static dispatch
            y las abstracciones de coste cero se cubren en los{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              internos del compilador
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            ¿Qué pasa con el código dinámico y npm?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            TypeScript sigue siendo JavaScript por debajo, y un compilador
            nativo de TypeScript tiene que ser honesto al respecto. La
            conformidad de Perry frente a la suite oficial test262 se mide y
            se publica — a fecha de v0.5.1146, la semántica de String está en
            79% y la de Array en 72%, ambas subiendo con cada release. Los
            paquetes npm de TypeScript/JavaScript puro compilan de forma
            nativa mediante{" "}
            <code className="text-slate-300">perry.compilePackages</code>:
            axios, zod v4, express, fastify y hono compilan y se ejecutan
            hoy. El código que necesita la semántica completa de un motor
            puede optar por un fallback embebido con V8 mediante{" "}
            <code className="text-slate-300">--enable-js-runtime</code>.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            La historia completa está en{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Paquetes npm reales y un barrido de conformidad
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Cómo se relaciona Perry con otros esfuerzos de «TypeScript nativo»
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry no es el único proyecto que ha mirado las anotaciones de
            tipos de TypeScript y ha visto una oportunidad de compilación —
            pero los enfoques difieren radicalmente. AssemblyScript compila
            un lenguaje estricto parecido a TypeScript únicamente a
            WebAssembly: deliberadamente no es compatible con JavaScript, y
            no produce ejecutables de sistema operativo ni UI nativa. Static
            Hermes, de Meta, compila de forma anticipada un subconjunto
            tipado de JavaScript dentro del motor Hermes, principalmente para
            React Native — a mediados de 2026 sigue siendo un proyecto de
            investigación que debe compilarse desde el código fuente, y el
            motor Hermes V1 que realmente se distribuyó en React Native no
            incluye las funciones estáticas (
            <Link
              href="/compare/static-hermes"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              comparación completa
            </Link>
            ).
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            La apuesta de Perry es distinta en ambos ejes: TypeScript
            estándar como lenguaje de entrada, y ejecutables de plataforma
            comunes — CLI, servidor y GUI — como salida, instalable hoy vía
            Homebrew, APT, winget o npm.
          </p>

          <h2 className="text-2xl font-bold mb-6">Un compilador, diez plataformas</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Como la generación de código pasa por LLVM, un único código
            fuente compila a macOS, iOS, iPadOS, Android, Linux, Windows,
            watchOS, tvOS, WebAssembly y Web/JS puro — incluyendo la
            compilación cruzada de binarios de Windows, macOS e iOS desde una
            máquina Linux. Las apps GUI usan{" "}
            <code className="text-slate-300">perry/ui</code>, una API
            declarativa sobre widgets reales de la plataforma (AppKit, UIKit,
            GTK4, Win32, Android vía JNI) — sin ningún webview involucrado.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            Cómo se compara eso frente a otros enfoques:{" "}
            <Link
              href="/compare"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry frente a Bun, Deno, Electron, Tauri, React Native y Static
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
              Prueba el compilador
            </h2>
            <p className="text-slate-400 mb-6">
              Instala Perry y compila tu primer binario nativo en menos de un
              minuto.
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
