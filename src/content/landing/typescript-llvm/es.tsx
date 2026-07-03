import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript sobre LLVM: monomorfización y codegen nativo",
  description:
    "Cómo Perry reduce TypeScript a LLVM IR — un HIR tipado, monomorfización, NaN-boxing — y por qué el backend pasó de Cranelift a LLVM para el rendimiento AOT.",
  breadcrumb: "TypeScript sobre LLVM",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            TypeScript sobre <span className="gradient-text">LLVM</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Cómo Perry reduce un lenguaje diseñado para motores JIT a LLVM
            IR — monomorfización, NaN-boxing, inline lowerings — y por qué
            abandonó Cranelift.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/internals" className="btn-primary">
              Internos del compilador
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
          <h2 className="text-2xl font-bold mb-6">¿Por qué LLVM para TypeScript?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Un compilador anticipado (AOT) vive en un régimen distinto al de
            un JIT. Un JIT compila mientras el usuario espera, así que la
            latencia de compilación es la restricción. Un compilador AOT
            como Perry compila una sola vez — en la máquina del
            desarrollador o en CI — y el binario se ejecuta millones de
            veces después. Esa asimetría es exactamente donde un optimizador
            pesado se paga solo.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            LLVM aporta dos décadas de trabajo en el middle-end: vectorización
            de bucles, loop-invariant code motion, global value numbering,
            sparse conditional constant propagation, inlining agresivo,
            análisis de alias. El trabajo de Perry es entregarle a esa
            maquinaria un IR que realmente pueda optimizar — y ahí es donde
            entra la información de tipos de TypeScript.
          </p>

          <h2 className="text-2xl font-bold mb-6">La pipeline de lowering</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            El código fuente se parsea con SWC, y luego se reduce a un IR
            tipado de alto nivel (HIR) donde ocurren las decisiones
            interesantes antes de que LLVM llegue siquiera a ver el código:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-12 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Monomorfización.</strong>{" "}
              Las funciones y clases genéricas se especializan para cada
              instanciación concreta, la misma estrategia que usan Rust y
              C++.{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> y{" "}
              <code className="text-slate-300">{`Stack<string>`}</code> se
              convierten en dos funciones independientes y completamente
              tipadas — así que el optimizador trabaja con tipos concretos en
              lugar de un blob de dispatch genérico, y los genéricos no
              cuestan nada en runtime.
            </li>
            <li>
              <strong className="text-slate-300">Static dispatch.</strong>{" "}
              Cuando el tipo del receptor se conoce en tiempo de compilación,
              las llamadas a métodos se compilan como llamadas directas que
              LLVM puede inlinear, no como búsquedas en tablas hash.
            </li>
            <li>
              <strong className="text-slate-300">Acceso directo a campos.</strong>{" "}
              Los campos de los objetos se resuelven en índices en tiempo de
              compilación, así que leer una propiedad es una carga de
              desplazamiento fijo — no una búsqueda en un diccionario.
            </li>
          </ul>

          <h2 className="text-2xl font-bold mb-6">
            NaN-boxing e inline lowerings
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Donde los valores son dinámicos, Perry usa NaN-boxing: cada valor
            es una palabra de 64 bits. Los doubles se almacenan
            directamente; los objetos, strings, booleans,{" "}
            <code className="text-slate-300">null</code> y{" "}
            <code className="text-slate-300">undefined</code> se codifican
            en los patrones de bits no usados de un NaN silencioso de IEEE
            754. Los números tienen coste cero — sin boxing, sin asignación
            para la aritmética.
          </p>
          <p className="text-slate-400 leading-relaxed mb-6">
            El truco está en que las operaciones sobre valores que no son
            números necesitan secuencias de bits de
            desempaquetar-operar-reempaquetar. Si esas secuencias viven como
            llamadas a un runtime compilado por separado, LLVM las ve como
            cajas negras opacas y no puede optimizar a través de ellas. Por
            eso Perry emite las operaciones calientes — cargas de
            propiedades, dispatch de métodos, asignación de objetos — como
            LLVM IR en línea que el optimizador puede fusionar y simplificar.
            La asignación de objetos, por ejemplo, se compila como una
            asignación bump thread-local en línea:
          </p>

          <div className="code-block mb-12">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">LLVM IR — asignación bump en línea</span>
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

          <h2 className="text-2xl font-bold mb-6">¿Por qué no Cranelift?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            El primer backend de Perry fue Cranelift — el codegen detrás de
            wasmtime, construido para una compilación rápida y predecible.
            Fue el punto de partida correcto, y sigue siendo una excelente
            opción para JITs y runtimes en sandbox. Dos cosas forzaron el
            cambio:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-6 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">El techo del optimizador.</strong>{" "}
              Cranelift es deliberadamente un compilador rápido de un solo
              nivel: «código decente y rápido», que es la decisión correcta
              para un JIT y la incorrecta para un compilador AOT cuyo
              argumento de venta es el máximo rendimiento nativo.
            </li>
            <li>
              <strong className="text-slate-300">arm64_32.</strong> Apple
              Watch usa una ABI (instrucciones de 64 bits, punteros de 32
              bits) que Cranelift no soporta. Para que watchOS existiera
              como plataforma de destino, LLVM era necesario — y mantener
              dos backends significaba dos conjuntos de bugs, tests y líneas
              base de rendimiento.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            La migración no fue gratis: la primera release exclusiva de LLVM
            empeoró algunos benchmarks hasta 70x, porque las operaciones
            calientes al principio pasaban por llamadas opacas a helpers del
            runtime. Recuperarse — inline lowerings, el asignador bump de
            arriba, mejores límites de inlining — llevó al backend más allá
            de las cifras de Cranelift, y para cuando se estabilizó, Perry
            superaba a Node.js en todos los benchmarks de su suite, de 1,7x
            a 24,6x con dos empates (abril de 2026). Vale la pena leer el
            post-mortem completo:{" "}
            <Link
              href="/blog/cranelift-to-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              De Cranelift a LLVM
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Profundizando</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            La{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              página de internos del compilador
            </Link>{" "}
            cubre NaN-boxing, monomorfización y static dispatch con más
            detalle. En el blog,{" "}
            <Link
              href="/blog/optimizing-everything"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Optimizarlo todo
            </Link>{" "}
            recorre el trabajo de optimización release por release, y{" "}
            <Link
              href="/blog/gen-gc-lazy-json-and-defensible-benchmarks"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              GC generacional, JSON perezoso y benchmarks defendibles
            </Link>{" "}
            explica cómo funciona la metodología de benchmarks (RUNS=11,
            mediana + p95). Para el panorama completo, empieza por el
            resumen de{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              compilador nativo de TypeScript
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
              Ve el resultado tú mismo
            </h2>
            <p className="text-slate-400 mb-6">
              <code className="text-slate-300">perry compile main.ts</code> —
              código máquina nativo, sin motor adjunto.
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
      </section>
    </>
  );
}
