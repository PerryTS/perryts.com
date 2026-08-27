import { Link } from "@/i18n/navigation";
import { Performance } from "@/components/Performance";
import { TechnicalFactsNotice } from "@/components/TechnicalFactsNotice";
import { PRODUCT_FACTS } from "@/lib/product-facts";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title: "Compile TypeScript to a Binary (Standalone Executables)",
  description:
    "How Perry compiles supported TypeScript through LLVM into a native executable, what is linked into the file, and how the result differs from runtime bundling.",
  breadcrumb: "Compile TypeScript to a Binary",
};

export default function Content() {
  return (
    <>
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <TechnicalFactsNotice />
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Compile TypeScript <span className="gradient-text">to a Binary</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Perry turns supported TypeScript into target-specific machine code.
            Native output needs no external Node.js installation or JavaScript
            engine, but it does statically link the Perry runtime and garbage
            collector.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/getting-started" className="btn-primary">Install Perry</Link>
            <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="btn-secondary">
              View source
            </a>
          </div>
          <div className="code-block glow max-w-2xl mx-auto text-left">
            <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile main.ts</p>
            <p className="text-green-400 mt-2">✓ Example executable written: main (size varies)</p>
            <p className="mt-4"><span className="text-slate-500">$</span> ./main</p>
            <p className="text-slate-300">Hello, World!</p>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Three different meanings of “compile”</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-14">
            <div className="feature-card">
              <h3 className="font-semibold text-white mb-3">Transpile</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                TypeScript compilers and bundlers can emit JavaScript. That
                output still runs in Node.js, Bun, Deno, or a browser.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="font-semibold text-white mb-3">Bundle a runtime</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Bun, Deno, and Node SEA can produce one file by packaging the
                program with their runtime or executable machinery. Consult
                each tool&apos;s documentation for its exact format.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="font-semibold text-white mb-3">Ahead-of-time compile</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Perry parses with SWC and uses LLVM to emit machine code for
                supported behavior, then links the Perry runtime and GC.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">What is actually in a Perry binary?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            The file contains compiled application code plus the Perry runtime
            pieces required by the program. It is therefore accurate to say
            that no <em>external</em> JavaScript runtime installation is needed;
            it is not accurate to say that Perry has no runtime at all. Native
            builds use a garbage collector, object and string support, async
            machinery, and other linked helpers. The optional V8 fallback adds
            an embedded JavaScript engine when enabled.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            The public examples show a hello-world binary around {PRODUCT_FACTS.helloWorldSize}
            {" "}and the Mango application around {PRODUCT_FACTS.mangoSize}. Those are examples,
            not a promised range. Output size changes with the target, imports,
            build profile, standard-library surface, debug information, and
            optional V8 fallback.
          </p>

          <h2 className="text-2xl font-bold mb-6">Compatibility and targets</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry documents {PRODUCT_FACTS.documentedTargetCount} targets plus a
            separate HarmonyOS preview. Web and WASM are aliases for one
            backend. Platform SDKs, host tools, signing credentials, and UI/API
            depth differ by target, so cross-compilation is not an unconditional
            “build any target from any host” promise.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Perry reports {PRODUCT_FACTS.nodeParity} of its tracked Node suite
            across {PRODUCT_FACTS.nodeModuleCount} modules and roughly {PRODUCT_FACTS.nativePackageCount}
            {" "}package/API implementations. That does not mean every npm package
            or JavaScript feature works. Run <code className="text-slate-300">perry check</code>
            {" "}and test the real application against the published limitations.
          </p>

          <h2 className="text-2xl font-bold mb-6">Primary sources</h2>
          <ul className="space-y-3 text-sm mb-4">
            <li><a className="text-perry-400 hover:text-white underline underline-offset-4" href="https://bun.sh/docs/bundler/executables" target="_blank" rel="noopener noreferrer">Bun standalone executable documentation</a></li>
            <li><a className="text-perry-400 hover:text-white underline underline-offset-4" href="https://nodejs.org/api/single-executable-applications.html" target="_blank" rel="noopener noreferrer">Node.js single executable application documentation</a></li>
            <li><a className="text-perry-400 hover:text-white underline underline-offset-4" href={PRODUCT_FACTS.limitationsUrl} target="_blank" rel="noopener noreferrer">Perry language limitations</a></li>
            <li><a className="text-perry-400 hover:text-white underline underline-offset-4" href={PRODUCT_FACTS.platformsUrl} target="_blank" rel="noopener noreferrer">Perry platform status</a></li>
          </ul>
        </article>
      </section>

      <Performance />

      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="feature-card text-center max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-3 gradient-text">Validate your application</h2>
          <p className="text-slate-400 mb-6">Install Perry, run its compatibility check, and measure the actual output you plan to ship.</p>
          <Link href="/getting-started" className="btn-primary inline-block">Get started</Link>
        </div>
      </section>
    </>
  );
}
