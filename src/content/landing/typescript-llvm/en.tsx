import { Link } from "@/i18n/navigation";
import { TechnicalFactsNotice } from "@/components/TechnicalFactsNotice";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript on LLVM: Monomorphization and Native Codegen",
  description:
    "How Perry lowers TypeScript to LLVM IR — a typed HIR, monomorphization, NaN-boxing — and why the backend moved from Cranelift to LLVM for AOT performance.",
  breadcrumb: "TypeScript on LLVM",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <TechnicalFactsNotice />
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            TypeScript on <span className="gradient-text">LLVM</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            How Perry lowers a language designed for JIT engines into LLVM IR —
            monomorphization, NaN-boxing, inline lowerings — and why it left
            Cranelift.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/internals" className="btn-primary">
              Compiler Internals
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
          <h2 className="text-2xl font-bold mb-6">Why LLVM for TypeScript?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            An ahead-of-time compiler lives in a different regime than a JIT.
            A JIT compiles while the user waits, so compile latency is the
            constraint. An AOT compiler like Perry compiles once — on the
            developer&apos;s machine or in CI — and the binary is executed
            millions of times afterwards. That asymmetry is exactly where a
            heavyweight optimizer pays for itself.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            LLVM brings two decades of middle-end work: loop vectorization,
            loop-invariant code motion, global value numbering, sparse
            conditional constant propagation, aggressive inlining, alias
            analysis. Perry&apos;s job is to hand that machinery IR it can
            actually optimize — which is where TypeScript&apos;s type
            information comes in.
          </p>

          <h2 className="text-2xl font-bold mb-6">The lowering pipeline</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Source is parsed with SWC, then lowered to a typed high-level IR
            (HIR) where the interesting decisions happen before LLVM ever sees
            the code:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-12 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Monomorphization.</strong>{" "}
              Known function and generic call shapes can be specialized for a
              bounded set of representations.{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> and{" "}
              <code className="text-slate-300">{`Stack<string>`}</code> become
              can therefore give the optimizer more specific inputs, while
              unproved or highly polymorphic calls retain dynamic fallbacks.
            </li>
            <li>
              <strong className="text-slate-300">Static dispatch.</strong>{" "}
              Where the receiver type is known at compile time, method calls
              can compile to direct calls that LLVM can inline. Unknown
              receivers retain runtime method and prototype dispatch.
            </li>
            <li>
              <strong className="text-slate-300">Direct field access.</strong>{" "}
              Shape-proved object fields can resolve to fixed offsets. Dynamic
              property access keeps the runtime lookup path required for
              JavaScript behavior.
            </li>
          </ul>

          <h2 className="text-2xl font-bold mb-6">
            NaN-boxing and inline lowerings
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry&apos;s canonical dynamic value is a 64-bit NaN-boxed word,
            while representation selection can keep proved values in native
            forms. Doubles are stored directly; objects, strings,
            booleans, <code className="text-slate-300">null</code>, and{" "}
            <code className="text-slate-300">undefined</code> can be encoded in
            the unused bit patterns of an IEEE 754 quiet NaN. This can avoid
            heap boxing for numeric arithmetic, but conversions and dynamic
            operations can still have runtime cost.
          </p>
          <p className="text-slate-400 leading-relaxed mb-6">
            The catch is that operations on non-number values need
            unpack-operate-repack bit sequences. If those sequences live as
            calls into a separately-compiled runtime, LLVM sees opaque black
            boxes and can&apos;t optimize across them. So Perry emits hot
            operations — property loads, method dispatch, object allocation —
            as inline LLVM IR that the optimizer can fuse and simplify.
            Object allocation, for example, compiles down to an inline
            thread-local bump allocation:
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

          <h2 className="text-2xl font-bold mb-6">Why not Cranelift?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry&apos;s first backend was Cranelift — the codegen behind
            wasmtime, built for fast, predictable compilation. It was the right
            starting point, and it remains an excellent choice for JITs and
            sandboxed runtimes. Two things forced the switch:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-6 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">The optimizer ceiling.</strong>{" "}
              Cranelift is deliberately a fast single-tier compiler:
              &ldquo;decent code quickly,&rdquo; which is the right trade for a
              JIT and the wrong one for an AOT compiler whose selling point is
              peak native performance.
            </li>
            <li>
              <strong className="text-slate-300">arm64_32.</strong> Apple
              Watch uses an ABI (64-bit instructions, 32-bit pointers) that
              Cranelift doesn&apos;t support. For watchOS to exist as a target,
              LLVM was required — and maintaining two backends meant two sets
              of bugs, tests, and performance baselines.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            The migration was not free: the first LLVM-only release regressed
            some benchmarks by up to 70x because hot operations initially went
            through opaque runtime helper calls. Recovering — inline lowerings,
            the bump allocator above, better inlining boundaries — took the
            backend past its earlier baseline. That April 2026 result is
            historical, not a current universal speed claim. The current
            public suite includes Perry wins, mixed rows, and losses against
            Node.js and Bun. The migration post-mortem is worth reading:{" "}
            <Link
              href="/blog/cranelift-to-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              From Cranelift to LLVM
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Going deeper</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            The{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              compiler internals page
            </Link>{" "}
            covers NaN-boxing, monomorphization, and static dispatch in more
            detail. On the blog,{" "}
            <Link
              href="/blog/optimizing-everything"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Optimizing Everything
            </Link>{" "}
            walks through the optimization work release by release, and{" "}
            <Link
              href="/blog/gen-gc-lazy-json-and-defensible-benchmarks"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Gen GC, lazy JSON, and defensible benchmarks
            </Link>{" "}
            explains how the benchmark methodology works (RUNS=11, median +
            p95). For the bigger picture, start at the{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript native compiler
            </Link>{" "}
            overview.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              See the output yourself
            </h2>
            <p className="text-slate-400 mb-6">
              <code className="text-slate-300">perry compile main.ts</code> —
              native machine code with the Perry runtime and GC statically
              linked, and no external JavaScript engine by default.
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
        </div>
      </section>
    </>
  );
}
