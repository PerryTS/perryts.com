import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Performance } from "@/components/Performance";
import { JsonLd } from "@/components/JsonLd";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd } from "@/lib/breadcrumbs";

export const metadata: Metadata = {
  title: "Compile TypeScript to a Binary (Standalone Executables)",
  description:
    "Compile TypeScript to a binary: 2–5 MB standalone native executables, no Node.js. How Perry compares to bun build --compile and Node SEA.",
  alternates: {
    canonical: "/en/compile-typescript-to-binary/",
  },
  openGraph: {
    title: "Compile TypeScript to a Binary (Standalone Executables)",
    description:
      "One command turns main.ts into a standalone native executable — no Node.js, no bundled runtime.",
    url: "/en/compile-typescript-to-binary/",
    type: "article",
  },
};

export default async function CompileTypescriptToBinaryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: `/${locale}/` },
          {
            name: "Compile TypeScript to a Binary",
            path: `/${locale}/compile-typescript-to-binary/`,
          },
        ])}
      />
      <Header />

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Compile TypeScript <span className="gradient-text">to a Binary</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            One command turns <code className="text-slate-300">main.ts</code>{" "}
            into a standalone native executable. No Node.js on the target
            machine, no bundled runtime, no install step for your users.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/getting-started" className="btn-primary">
              Install Perry
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
            Three things people call &ldquo;compiling TypeScript&rdquo;
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            When developers search for how to compile TypeScript to a binary,
            they usually run into three very different techniques that share one
            word:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Transpiling.</strong>{" "}
              <code className="text-slate-300">tsc</code>, SWC, and esbuild
              turn TypeScript into JavaScript. The output still needs Node.js,
              Bun, or a browser to run. No binary is involved.
            </li>
            <li>
              <strong className="text-slate-300">Runtime embedding.</strong>{" "}
              <code className="text-slate-300">bun build --compile</code>,{" "}
              <code className="text-slate-300">deno compile</code>, and Node.js
              Single Executable Applications (SEA) concatenate your bundled
              JavaScript with a full copy of the runtime. You get a single
              file, but the engine rides along inside it and your code is still
              parsed and JIT-compiled every time the process starts.
            </li>
            <li>
              <strong className="text-slate-300">
                Ahead-of-time native compilation.
              </strong>{" "}
              This is what Perry does. TypeScript is parsed with SWC, types are
              resolved, generics are monomorphized, and LLVM emits machine code.
              The linker produces a normal executable — the same class of
              artifact a Rust, Go, or C++ toolchain produces. There is no
              JavaScript engine in the binary at all.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Because there is no engine to boot and nothing to parse at startup,
            a Perry binary starts in about a millisecond. The pipeline itself is
            described in more depth on the{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript native compiler
            </Link>{" "}
            page and in the{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              compiler internals
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">How big is the binary?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Size depends on what you pull in, because only the code you actually
            use is compiled and linked:
          </p>
          <ul className="space-y-3 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              A hello world is around{" "}
              <strong className="text-slate-300">330 KB</strong>.
            </li>
            <li>
              Typical CLI tools land at{" "}
              <strong className="text-slate-300">2–5 MB</strong>.
            </li>
            <li>
              Full applications that link large frameworks (Fastify, mysql2,
              and friends) are around{" "}
              <strong className="text-slate-300">48 MB</strong>.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            For contrast: a Node SEA executable is a copy of the{" "}
            <code className="text-slate-300">node</code> binary itself, so it
            starts at roughly 88–118 MB depending on platform before your code
            is added, and a Bun-compiled hello world measures about 60 MB on
            macOS arm64 and around 100 MB on Linux x64, because the entire Bun
            runtime is embedded.
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry vs bun build --compile vs Node SEA
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            All three give you a single file you can hand to someone. They are
            otherwise very different tools, and each is the right answer for
            someone:
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
                    What it produces
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    AOT-compiled machine code (LLVM)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Bundled JS + embedded Bun runtime
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Copy of the node binary with your bundled script injected
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Execution model
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Native code, no JS engine
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (JavaScriptCore) at run time
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (V8) at run time
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Hello-world size
                  </td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">
                    ~60 MB (macOS arm64) to ~100+ MB (Linux/Windows)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    ~88–118 MB (size of the node binary)
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Startup
                  </td>
                  <td className="px-4 py-3 text-slate-400">~1 ms</td>
                  <td className="px-4 py-3 text-slate-400">~10 ms</td>
                  <td className="px-4 py-3 text-slate-400">~30 ms</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Cross-compilation
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    10 targets, including Windows/macOS/iOS from Linux
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Yes — Linux, Windows, macOS via --target
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    No — copy a per-platform node binary instead
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    JS/npm compatibility
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Growing: axios, zod v4, express, fastify, hono compile
                    natively; optional V8 fallback for the rest
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Full — it is the Bun runtime
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Full Node semantics; requires pre-bundling, CommonJS-only on
                    Node 24 LTS
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Status
                  </td>
                  <td className="px-4 py-3 text-slate-400">Pre-1.0</td>
                  <td className="px-4 py-3 text-slate-400">Stable</td>
                  <td className="px-4 py-3 text-slate-400">
                    &ldquo;Active development&rdquo; stability in Node 24 LTS
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-400 leading-relaxed mb-6">
            The honest framing: if your application leans on the full npm
            ecosystem and you want zero compatibility risk, Bun and Node SEA
            run exactly the engine semantics you already develop against — that
            is their strength, and the size cost may not matter for your
            deployment. Perry is a different trade. You get true ahead-of-time
            compilation, small binaries, and millisecond startup; in exchange
            you adopt a pre-1.0 compiler whose JavaScript conformance is
            measured and published (test262: String 79%, Array 72% as of
            v0.5.1146) rather than inherited from V8.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            Detailed head-to-heads:{" "}
            <Link
              href="/compare/bun"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun
            </Link>{" "}
            and{" "}
            <Link
              href="/compare/deno"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Deno
            </Link>
            . For how npm packages compile, see{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Real npm packages and a conformance sweep
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
              Compile your first binary today
            </h2>
            <p className="text-slate-400 mb-6">
              Install with Homebrew, APT, or winget — then{" "}
              <code className="text-slate-300">perry compile main.ts</code>.
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

      <Footer />
    </main>
  );
}
