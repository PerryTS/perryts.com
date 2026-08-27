import { Link } from "@/i18n/navigation";
import { Architecture } from "@/components/Architecture";
import { TechnicalFactsNotice } from "@/components/TechnicalFactsNotice";
import { PRODUCT_FACTS } from "@/lib/product-facts";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title: "TypeScript Native Compiler: Perry’s SWC and LLVM Pipeline",
  description:
    "How Perry parses TypeScript with SWC, lowers supported behavior through its HIR and LLVM, and links the runtime needed for JavaScript semantics.",
  breadcrumb: "TypeScript Native Compiler",
};

export default function Content() {
  return (
    <>
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <TechnicalFactsNotice />
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            A TypeScript Native Compiler, <span className="gradient-text">Built in Rust</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Perry compiles supported TypeScript and JavaScript ahead of time to
            machine code. Native builds do not require an external JavaScript
            engine by default, while the Perry runtime and GC remain part of
            the executable.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/getting-started" className="btn-primary">Get started</Link>
            <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="btn-secondary">View source</a>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">A hybrid compiler, not “types make JavaScript static”</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            TypeScript annotations are mostly erased and do not prove a concrete
            runtime representation for every expression. Perry combines declared
            types, inference, known call shapes, and representation selection to
            optimize proved cases. Dynamic values, unknown receivers, prototypes,
            and other JavaScript behavior retain runtime paths.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            That distinction matters: known numeric operations or object shapes
            may become direct machine operations, while other code uses the
            statically linked runtime and garbage collector. Some unsupported
            engine semantics require the optional V8 fallback or do not compile.
          </p>
        </article>
      </section>

      <Architecture />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">The current pipeline</h2>
          <ol className="space-y-4 text-slate-400 leading-relaxed mb-12 list-decimal pl-6 marker:text-amber-400">
            <li><strong className="text-slate-300">Parse with SWC.</strong> Perry builds an AST and resolves modules before its own lowering passes.</li>
            <li><strong className="text-slate-300">Lower to Perry HIR.</strong> The compiler records operations and the type or representation evidence it can actually prove.</li>
            <li><strong className="text-slate-300">Specialize bounded known cases.</strong> Known calls and values can use direct paths; polymorphic cases keep checked, boxed, or dynamic fallbacks.</li>
            <li><strong className="text-slate-300">Generate LLVM IR.</strong> LLVM optimizes and emits target-specific object code.</li>
            <li><strong className="text-slate-300">Link and package.</strong> Perry links the required runtime, GC, libraries, and target-specific platform pieces.</li>
          </ol>

          <h2 className="text-2xl font-bold mb-6">Support is broad, not universal</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            The current project reports {PRODUCT_FACTS.nodeParity} parity across
            {" "}{PRODUCT_FACTS.nodeModuleCount} tracked Node modules and roughly
            {" "}{PRODUCT_FACTS.nativePackageCount} native package/API implementations.
            Known gaps include dynamic code paths and parts of JavaScript,
            TypeScript, Node.js, and package compatibility.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Perry documents {PRODUCT_FACTS.documentedTargetCount} targets, with
            narrower core support on some devices and HarmonyOS kept as a
            separate preview. “One codebase” is a portability goal, not a promise
            that every API and layout behaves identically on every platform.
          </p>

          <div className="flex flex-wrap gap-4">
            <a href={PRODUCT_FACTS.limitationsUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">Known limitations</a>
            <a href={PRODUCT_FACTS.platformsUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">Platform status</a>
            <Link href="/typescript-llvm" className="btn-secondary">LLVM deep dive</Link>
          </div>
        </article>
      </section>

      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="feature-card text-center max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-3 gradient-text">Try it against real code</h2>
          <p className="text-slate-400 mb-6">Run Perry’s checker and compile the exact package graph and target you intend to ship.</p>
          <Link href="/getting-started" className="btn-primary inline-block">Get started</Link>
        </div>
      </section>
    </>
  );
}
