import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/JsonLd";

interface FaqEntry {
  question: string;
  answer: string;
  render?: React.ReactNode;
}

const linkCls =
  "text-perry-400 hover:text-white transition-colors underline underline-offset-2";

// English-only for now — rendered on /en/ until translations exist.
// `answer` is the plain-text version used for FAQPage JSON-LD; `render`
// is the same text with internal links and must mirror it word-for-word.
const faqs: FaqEntry[] = [
  {
    question: "Does Perry need Node.js or a runtime?",
    answer:
      "No. Perry compiles TypeScript ahead of time to a standalone native executable. The binary runs without Node.js, Bun, Deno, or any JavaScript runtime installed on the machine. For npm packages that can't compile natively yet, an optional embedded V8 fallback is available via --enable-js-runtime.",
  },
  {
    question: "How big are the compiled binaries?",
    answer:
      "A hello-world binary is around 330 KB. Typical CLI tools land at 2–5 MB. Full applications that pull in large frameworks (Fastify, mysql2, etc.) are around 48 MB — still far below the ~80–150 MB an Electron app or runtime-embedded binary starts at.",
  },
  {
    question: "Can I use npm packages?",
    answer:
      "Yes. Pure TypeScript/JavaScript packages compile natively via perry.compilePackages — axios, zod v4, express, fastify, and hono compile and run today. Packages that need full JS engine semantics can run through the optional V8 fallback with --enable-js-runtime.",
  },
  {
    question: "Which platforms does Perry support?",
    answer:
      "Ten compilation targets: macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly, and Web/JS. GUI apps use native platform widgets — AppKit, UIKit, GTK4, Win32, and Android via JNI.",
  },
  {
    question: "Is Perry free and open source?",
    answer:
      "Yes. The compiler is free and open source. Compiling and running locally costs nothing and requires no account. Perry Publish — the hosted build, signing, and store-submission pipeline — has a free tier (15 publishes per month) and a Pro plan.",
  },
  {
    question: "How is Perry different from Bun or Deno compile?",
    answer:
      "Bun and Deno bundle your JavaScript together with their runtime into one file — a hello world is roughly 60–100 MB depending on platform, and the code is still JIT-executed. Perry compiles TypeScript ahead of time to machine code via LLVM: no embedded engine, ~330 KB hello world, ~1 ms startup. See the full Perry vs Bun and Perry vs Deno comparisons.",
    render: (
      <>
        Bun and Deno bundle your JavaScript together with their runtime into
        one file — a hello world is roughly 60–100 MB depending on platform,
        and the code is still JIT-executed. Perry compiles TypeScript ahead of
        time to machine code via LLVM: no embedded engine, ~330 KB hello
        world, ~1 ms startup. See the full{" "}
        <Link href="/compare/bun" className={linkCls}>
          Perry vs Bun
        </Link>{" "}
        and{" "}
        <Link href="/compare/deno" className={linkCls}>
          Perry vs Deno
        </Link>{" "}
        comparisons.
      </>
    ),
  },
  {
    question: "How is Perry different from Electron or Tauri?",
    answer:
      "Electron ships Chromium and Node.js with every app, so installers start at roughly 80–150 MB. Tauri is much smaller but still renders a web frontend in the system webview, with app logic in Rust. Perry uses no webview at all: TypeScript compiles to machine code that drives real platform widgets — AppKit, UIKit, GTK4, Win32 — in a single process. See the full Perry vs Electron and Perry vs Tauri comparisons.",
    render: (
      <>
        Electron ships Chromium and Node.js with every app, so installers
        start at roughly 80–150 MB. Tauri is much smaller but still renders a
        web frontend in the system webview, with app logic in Rust. Perry uses
        no webview at all: TypeScript compiles to machine code that drives
        real platform widgets — AppKit, UIKit, GTK4, Win32 — in a single
        process. See the full{" "}
        <Link href="/compare/electron" className={linkCls}>
          Perry vs Electron
        </Link>{" "}
        and{" "}
        <Link href="/compare/tauri" className={linkCls}>
          Perry vs Tauri
        </Link>{" "}
        comparisons.
      </>
    ),
  },
  {
    question: "How mature is Perry?",
    answer:
      "Perry is pre-1.0 and moving fast, but real apps built with it are shipping today — Bloom Engine, Mango, Hone, Pry, and dB Meter among them. See the showcase for details.",
    render: (
      <>
        Perry is pre-1.0 and moving fast, but real apps built with it are
        shipping today — Bloom Engine, Mango, Hone, Pry, and dB Meter among
        them. See the{" "}
        <Link href="/showcase" className={linkCls}>
          showcase
        </Link>{" "}
        for details.
      </>
    ),
  },
];

export function Faq() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900/30">
      <JsonLd data={faqJsonLd} />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Everything people ask before compiling their first binary
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {faqs.map((f) => (
            <div key={f.question} className="feature-card">
              <h3 className="text-lg font-semibold mb-3">{f.question}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {f.render ?? f.answer}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-slate-400">
          More questions? Read the{" "}
          <Link href="/getting-started" className={linkCls}>
            getting-started guide
          </Link>{" "}
          or ask on{" "}
          <a
            href="https://github.com/PerryTS/perry/discussions"
            target="_blank"
            rel="noopener noreferrer"
            className={linkCls}
          >
            GitHub Discussions
          </a>
          .
        </p>
      </div>
    </section>
  );
}
