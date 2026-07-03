import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Installation } from "@/components/Installation";
import { JsonLd } from "@/components/JsonLd";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd } from "@/lib/breadcrumbs";

export const metadata: Metadata = {
  title: {
    absolute: "Get Started with Perry — Install & Compile TypeScript to Native",
  },
  description:
    "Install Perry with Homebrew, APT, or winget and compile your first TypeScript file into a native executable in under a minute. No Node.js required.",
  alternates: {
    canonical: "/en/getting-started/",
  },
  openGraph: {
    title: "Get Started with Perry",
    description:
      "Install Perry and compile your first TypeScript file into a native executable in under a minute.",
    url: "/en/getting-started/",
    type: "website",
  },
};

export default async function GettingStartedPage({
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
          { name: "Get Started", path: `/${locale}/getting-started/` },
        ])}
      />
      <Header />

      <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Get Started with <span className="gradient-text">Perry</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            From zero to a running native executable in three steps. No Node.js,
            no bundler, no runtime to install on the target machine.
          </p>
        </div>
      </section>

      <Installation />

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Your first binary, step by step
          </h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            Once Perry is installed, compiling TypeScript to a native executable
            is a single command. Write a file:
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
            Compile it and run the result — the output is a self-contained
            machine-code binary, not a bundled script:
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
            That binary starts in about a millisecond and runs on any machine
            with the same OS and architecture — nothing to install first. Read
            more about{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              how Perry compiles TypeScript to a binary
            </Link>{" "}
            or what happens inside the{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript native compiler
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Where to go next</h2>
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
                Guides for the CLI, perry/ui widgets, threading, i18n, and every
                compilation target — at docs.perryts.com.
              </p>
            </a>
            <Link href="/showcase" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Showcase
              </h3>
              <p className="text-slate-400 text-sm">
                Real apps compiled with Perry, shipping on the App Store and
                beyond.
              </p>
            </Link>
            <Link href="/compare" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Compare
              </h3>
              <p className="text-slate-400 text-sm">
                How Perry stacks up against Bun, Deno, Electron, Tauri, React
                Native, and Static Hermes.
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
                Source, issues, and discussions — Perry is open source.
              </p>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
