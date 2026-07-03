import { Link } from "@/i18n/navigation";
import { Architecture } from "@/components/Architecture";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript Native Compiler: How Perry Compiles TS to Machine Code",
  description:
    "Perry is a TypeScript native compiler written in Rust: SWC parsing, typed HIR, monomorphization, LLVM codegen. Native binaries for 10 platforms, no VM.",
  breadcrumb: "TypeScript Native Compiler",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            A TypeScript Native Compiler,{" "}
            <span className="gradient-text">Built in Rust</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Perry compiles the TypeScript you already write to machine code —
            the way a Rust or Go toolchain compiles its language. No transpiled
            JavaScript, no virtual machine, no runtime on the target system.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/getting-started" className="btn-primary">
              Get Started
            </Link>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Not a transpiler. Not a runtime.
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Most TypeScript tooling falls into two families. Transpilers —{" "}
            <code className="text-slate-300">tsc</code>, SWC, esbuild — check
            and strip the types, then emit JavaScript for an engine to execute
            later. Runtimes — Node.js, Bun, Deno — are those engines: they
            parse, interpret, and JIT-compile the JavaScript every time your
            program starts.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            A native compiler is the third family, and for TypeScript it has
            been mostly empty. Perry treats type annotations not as
            documentation to be stripped but as the input that drives code
            generation. The result of{" "}
            <code className="text-slate-300">perry compile main.ts</code> is a
            standalone executable containing machine code — typically{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              2–5 MB, starting in about a millisecond
            </Link>
            .
          </p>
        </article>
      </section>

      {/* Pipeline visual (shared section) */}
      <Architecture />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">The pipeline, step by step</h2>
          <ol className="space-y-4 text-slate-400 leading-relaxed mb-12 list-decimal pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Parse (SWC).</strong> Source
              files are parsed with SWC, the Rust-native TypeScript parser, so
              even large projects parse in milliseconds. Module codegen,
              transform passes, and symbol scanning run in parallel across
              cores.
            </li>
            <li>
              <strong className="text-slate-300">Type resolution.</strong> The
              compiler resolves declared types and infers the rest, giving
              every expression a concrete type before code generation begins.
            </li>
            <li>
              <strong className="text-slate-300">
                Typed HIR &amp; monomorphization.
              </strong>{" "}
              The AST is lowered to a typed high-level IR. Generic functions and
              classes are monomorphized — each instantiation like{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> is
              compiled separately with its concrete types, so generics cost
              nothing at run time. Where types are known, method calls become
              static dispatch and object fields become direct, fixed-offset
              loads.
            </li>
            <li>
              <strong className="text-slate-300">Codegen (LLVM).</strong> The
              HIR is lowered to LLVM IR and run through LLVM&apos;s optimization
              pipeline — inlining, loop optimizations, vectorization — then
              emitted as machine code for the target.
            </li>
            <li>
              <strong className="text-slate-300">Link.</strong> The output is a
              normal platform executable: Mach-O on macOS, ELF on Linux, PE on
              Windows — plus mobile, watch, TV, and WebAssembly targets.
            </li>
          </ol>
          <p className="text-slate-400 leading-relaxed mb-12">
            The LLVM side of this — why LLVM was chosen over Cranelift, how
            NaN-boxing represents dynamic values, what the optimizer does with
            typed IR — has its own deep dive:{" "}
            <Link
              href="/typescript-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript on LLVM
            </Link>
            . Implementation details like NaN-boxing, static dispatch, and
            zero-cost abstractions are covered in the{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              compiler internals
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            What about dynamic code and npm?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            TypeScript is still JavaScript underneath, and a native TypeScript
            compiler has to be honest about that. Perry&apos;s conformance
            against the official test262 suite is measured and published — as
            of v0.5.1146, String semantics are at 79% and Array at 72%, both
            climbing release over release. Pure TypeScript/JavaScript npm
            packages compile natively via{" "}
            <code className="text-slate-300">perry.compilePackages</code>:
            axios, zod v4, express, fastify, and hono compile and run today.
            Code that needs full engine semantics can opt into an embedded V8
            fallback with{" "}
            <code className="text-slate-300">--enable-js-runtime</code>.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            The full story is in{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Real npm packages and a conformance sweep
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            How Perry relates to other &ldquo;native TypeScript&rdquo; efforts
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry isn&apos;t the only project that has looked at TypeScript&apos;s
            type annotations and seen a compilation opportunity — but the
            approaches differ sharply. AssemblyScript compiles a strict
            TypeScript-like language to WebAssembly only: it is deliberately
            not JavaScript-compatible, and it doesn&apos;t produce OS
            executables or native UI. Meta&apos;s Static Hermes ahead-of-time
            compiles a typed JavaScript subset inside the Hermes engine,
            primarily for React Native — as of mid-2026 it remains a research
            project that must be built from source, and the Hermes V1 engine
            that actually shipped in React Native does not include the static
            features (
            <Link
              href="/compare/static-hermes"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              full comparison
            </Link>
            ).
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Perry&apos;s bet is different on both axes: standard TypeScript as
            the input language, and ordinary platform executables — CLI,
            server, and GUI — as the output, installable today via Homebrew,
            APT, winget, or npm.
          </p>

          <h2 className="text-2xl font-bold mb-6">One compiler, ten targets</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Because code generation goes through LLVM, one codebase compiles to
            macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS,
            WebAssembly, and plain Web/JS — including cross-compiling Windows,
            macOS, and iOS binaries from a Linux machine. GUI apps use{" "}
            <code className="text-slate-300">perry/ui</code>, a declarative API
            over real platform widgets (AppKit, UIKit, GTK4, Win32, Android via
            JNI) — no webview involved.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            How that stacks up against other approaches:{" "}
            <Link
              href="/compare"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun, Deno, Electron, Tauri, React Native, and Static
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
              Try the compiler
            </h2>
            <p className="text-slate-400 mb-6">
              Install Perry and compile your first native binary in under a
              minute.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                Get Started
              </Link>
              <a
                href="https://docs.perryts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Read the Docs
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
