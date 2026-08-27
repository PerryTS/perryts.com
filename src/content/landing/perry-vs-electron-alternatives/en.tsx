import { Link } from "@/i18n/navigation";
import { TechnicalFactsNotice } from "@/components/TechnicalFactsNotice";
import { PRODUCT_FACTS } from "@/lib/product-facts";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title: "Electron Alternatives for TypeScript: Architecture and Tradeoffs",
  description:
    "A sourced guide to Electron, Tauri, Bun standalone executables, and Perry, focused on runtime and UI architecture instead of universal size or speed claims.",
  breadcrumb: "Electron Alternatives for TypeScript",
};

const approaches = [
  {
    name: "Electron",
    summary:
      "Electron embeds Chromium and Node.js. Web content runs in Chromium renderer processes, while the main process runs in a Node.js environment. It offers the most direct reuse of an existing web application and a mature desktop ecosystem.",
    bestFor: "Desktop products that prioritize web compatibility, team familiarity, and ecosystem maturity.",
    source: "https://www.electronjs.org/docs/latest/",
    compare: "/compare/electron" as const,
  },
  {
    name: "Tauri",
    summary:
      "Tauri combines a compiled Rust core with HTML, CSS, and JavaScript rendered in the operating system webview. It avoids bundling a browser engine, but remains a webview architecture and can vary with the platform webview.",
    bestFor: "Teams that want a web frontend with a Rust-native core and system-webview distribution.",
    source: "https://v2.tauri.app/concept/architecture/",
    compare: "/compare/tauri" as const,
  },
  {
    name: "Bun standalone executables",
    summary:
      "Bun’s --compile workflow packages the application with a copy of the Bun runtime. It is useful for single-file CLIs and servers, but Bun does not provide a built-in cross-platform native-widget layer.",
    bestFor: "CLIs and servers that value Bun’s runtime compatibility and integrated toolchain more than a native GUI layer.",
    source: "https://bun.sh/docs/bundler/executables",
    compare: "/compare/bun" as const,
  },
  {
    name: "Perry",
    summary:
      "Perry compiles supported TypeScript through LLVM and maps Perry UI to platform widgets where supported. Native output links the Perry runtime and GC, needs no external JavaScript engine by default, and remains a pre-1.0 compatibility surface.",
    bestFor: "Validated applications where native widgets or Perry’s mobile, wearable, TV, and Web/WASM targets solve a specific product need.",
    source: "https://github.com/PerryTS/perry#readme",
    compare: "/typescript-native-compiler" as const,
  },
];

export default function Content() {
  return (
    <article className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <TechnicalFactsNotice />
        <Link href="/compare" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8">
          ← Back to comparisons
        </Link>

        <h1 className="text-4xl sm:text-5xl font-bold mb-6">
          <span className="gradient-text">Electron Alternatives for TypeScript</span>
        </h1>
        <p className="text-lg text-slate-300 leading-relaxed mb-12">
          “Electron alternative” can mean a smaller webview application, a
          single-file runtime, or a real native-widget application. These are
          different architectural choices, so this guide avoids invented
          universal installer, memory, and startup numbers.
        </p>

        <div className="space-y-6 mb-16">
          {approaches.map((approach) => (
            <section key={approach.name} className="feature-card">
              <h2 className="text-xl font-semibold text-white mb-3">{approach.name}</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">{approach.summary}</p>
              <p className="text-slate-300 text-sm mb-4"><strong>Best fit:</strong> {approach.bestFor}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <a href={approach.source} target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-white underline underline-offset-4">Primary source</a>
                <Link href={approach.compare} className="text-perry-400 hover:text-white underline underline-offset-4">Perry comparison</Link>
              </div>
            </section>
          ))}
        </div>

        <h2 className="text-2xl font-bold mb-6">What Perry can substantiate</h2>
        <ul className="space-y-3 text-slate-400 leading-relaxed mb-12 list-disc pl-6 marker:text-amber-400">
          <li>A hello-world example around {PRODUCT_FACTS.helloWorldSize} and a public Mango application around {PRODUCT_FACTS.mangoSize}; neither establishes a universal application-size range.</li>
          <li>{PRODUCT_FACTS.documentedTargetCount} documented targets plus a separate HarmonyOS preview, with narrower core support on some targets.</li>
          <li>{PRODUCT_FACTS.nativeWidgetCount} UI widgets, with platform-specific availability and behavior.</li>
          <li>A current public benchmark suite containing Perry wins, mixed rows, and losses—not a claim that Perry is always fastest.</li>
        </ul>

        <h2 className="text-2xl font-bold mb-6">How to choose</h2>
        <p className="text-slate-400 leading-relaxed mb-6">
          Start with the UI model and compatibility you need. Choose Electron
          when Chromium consistency and mature desktop tooling dominate. Choose
          Tauri when a system webview and Rust core fit. Choose Bun for a
          runtime-centric single-file CLI or server. Evaluate Perry when its
          native widgets or broader target model justify testing against its
          current pre-1.0 limitations.
        </p>
        <p className="text-slate-400 leading-relaxed mb-12">
          Then measure the real application: installer and update size, idle and
          working memory, cold and warm startup, accessibility, package support,
          platform prerequisites, signing, and maintenance cost.
        </p>

        <div className="feature-card text-center">
          <h2 className="text-2xl font-bold mb-3 gradient-text">Compare the architectures</h2>
          <p className="text-slate-400 mb-6">Read the sourced side-by-side pages, then test the exact workload you plan to ship.</p>
          <Link href="/compare" className="btn-primary inline-block">View comparisons</Link>
        </div>
      </div>
    </article>
  );
}
