import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd } from "@/lib/breadcrumbs";

export const metadata: Metadata = {
  title: "Electron Alternatives for TypeScript: Perry vs Tauri vs Bun",
  description:
    "Looking for an Electron alternative in TypeScript? Compare Electron, Tauri, Bun-based approaches, and Perry on binary size, memory, UI stack, and language.",
  alternates: {
    canonical: "/en/compare/perry-vs-electron-alternatives/",
  },
  openGraph: {
    title: "Electron Alternatives for TypeScript: Perry vs Tauri vs Bun",
    description:
      "Electron, Tauri, Bun-based approaches, and Perry compared on binary size, memory, UI stack, and language.",
    url: "/en/compare/perry-vs-electron-alternatives/",
    type: "article",
  },
};

export default async function ElectronAlternativesPage({
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
          { name: "Compare", path: `/${locale}/compare/` },
          {
            name: "Electron Alternatives for TypeScript",
            path: `/${locale}/compare/perry-vs-electron-alternatives/`,
          },
        ])}
      />
      <Header />

      <article className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Back to comparisons
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">
              Electron Alternatives for TypeScript Developers
            </span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed mb-12">
            Electron made desktop apps accessible to web developers, and its
            size and memory costs made &ldquo;Electron alternative&rdquo; a
            permanent search query. If TypeScript is your language, there are
            four realistic paths in 2026: stay with Electron, move to Tauri,
            build runtime-embedded binaries with Bun, or compile to native with
            Perry. They make very different trade-offs.
          </p>

          <h2 className="text-2xl font-bold mb-6">The four approaches</h2>

          <div className="space-y-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Electron — the baseline
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Bundles Chromium and Node.js with every app. The upside is a
                decade of production maturity and a UI stack (HTML/CSS/JS) your
                team already knows — VS Code, Slack, and Discord ship on it.
                The downside is the baseline cost: hello-world installers of
                roughly 80–150 MB, multiple Chromium processes, and hundreds of
                MB of RAM at idle. Desktop only.{" "}
                <Link
                  href="/compare/electron"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Full Perry vs Electron comparison
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Tauri — web UI in the system webview, Rust backend
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tauri keeps the web frontend but drops bundled Chromium: the UI
                renders in the OS webview (WKWebView, WebView2, WebKitGTK), so
                installers land in the single-digit MB range. It&apos;s stable,
                well-documented, and Tauri 2 added iOS/Android. The trade-offs:
                the backend is Rust, not TypeScript — app logic beyond the UI
                means writing Rust and crossing an IPC bridge — and rendering
                varies slightly per platform because each OS ships a different
                webview.{" "}
                <Link
                  href="/compare/tauri"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Full Perry vs Tauri comparison
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Bun — single-file binaries, no GUI layer
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                People searching &ldquo;bun electron&rdquo; usually want
                Electron&apos;s convenience without its weight.{" "}
                <code className="text-slate-300">bun build --compile</code>{" "}
                produces a single executable by embedding the Bun runtime with
                your bundled TypeScript — excellent for CLIs and servers, with
                full npm compatibility since it literally is the runtime. But
                the binary is roughly 60 MB (macOS arm64) to 100+ MB
                (Linux/Windows), the code is still JIT-executed, and Bun has no
                UI framework — a desktop app still needs Electron, Tauri, or a
                webview library on top.{" "}
                <Link
                  href="/compare/bun"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Full Perry vs Bun comparison
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Perry — TypeScript compiled to native widgets
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Perry compiles TypeScript ahead of time to machine code and
                renders UI through real platform widgets — AppKit, UIKit, GTK4,
                Win32, Android via JNI — with no webview and no IPC bridge. One
                language for UI and logic, ~330 KB hello world, 2–5 MB typical
                binaries, ~1 ms startup, and ten targets including mobile,
                watch, and TV. The honest caveat: Perry is pre-1.0, its UI API
                is its own (declarative, SwiftUI-style — not HTML/CSS), and the
                ecosystem is young next to Electron&apos;s.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">Side by side</h2>
          <div className="overflow-x-auto mb-16 border border-white/10 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300"></th>
                  <th className="text-left px-4 py-3 font-semibold text-amber-300">Perry</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Electron</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Tauri</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Bun (--compile)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Language</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript everywhere</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS + HTML/CSS</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS frontend, Rust backend</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">UI approach</td>
                  <td className="px-4 py-3 text-slate-400">Native platform widgets</td>
                  <td className="px-4 py-3 text-slate-400">Bundled Chromium</td>
                  <td className="px-4 py-3 text-slate-400">System webview</td>
                  <td className="px-4 py-3 text-slate-400">None (CLI/server)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Hello-world size</td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">~80–150 MB</td>
                  <td className="px-4 py-3 text-slate-400">~3–10 MB</td>
                  <td className="px-4 py-3 text-slate-400">~60–116 MB by platform</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Execution</td>
                  <td className="px-4 py-3 text-slate-400">AOT machine code</td>
                  <td className="px-4 py-3 text-slate-400">JIT (V8)</td>
                  <td className="px-4 py-3 text-slate-400">JIT (webview JS engine) + native Rust</td>
                  <td className="px-4 py-3 text-slate-400">JIT (JavaScriptCore)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Memory at idle</td>
                  <td className="px-4 py-3 text-slate-400">Tens of MB (single native process)</td>
                  <td className="px-4 py-3 text-slate-400">Hundreds of MB (multi-process Chromium)</td>
                  <td className="px-4 py-3 text-slate-400">Lower than Electron (OS webview)</td>
                  <td className="px-4 py-3 text-slate-400">Runtime-typical</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Mobile / watch / TV</td>
                  <td className="px-4 py-3 text-slate-400">iOS, iPadOS, Android, watchOS, tvOS</td>
                  <td className="px-4 py-3 text-slate-400">No</td>
                  <td className="px-4 py-3 text-slate-400">iOS, Android (Tauri 2)</td>
                  <td className="px-4 py-3 text-slate-400">No</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Maturity</td>
                  <td className="px-4 py-3 text-slate-400">Pre-1.0</td>
                  <td className="px-4 py-3 text-slate-400">Decade+ in production</td>
                  <td className="px-4 py-3 text-slate-400">Stable (1.x/2.x)</td>
                  <td className="px-4 py-3 text-slate-400">Stable</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-6">
            What about React Native or Flutter?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-16">
            They come up in every Electron thread, but they answer a different
            question. React Native is mobile-first: your JavaScript runs in the
            Hermes engine and drives native views over a bridge, and desktop
            support exists only through separate community/Microsoft forks —
            it&apos;s not a drop-in Electron replacement (
            <Link
              href="/compare/react-native"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs React Native
            </Link>
            ). Flutter covers desktop and mobile but means leaving TypeScript
            for Dart, and it paints its own widgets rather than using the
            platform&apos;s. If staying in TypeScript is the constraint, the
            realistic desktop shortlist remains the four options above.
          </p>

          <h2 className="text-2xl font-bold mb-6">Which one should you pick?</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Stay with the web stack
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                If your UI is already built in React/Vue/Svelte and you need
                battle-tested desktop distribution today, Electron remains the
                lowest-risk choice — you pay in size and memory. If that cost
                bothers you and you&apos;re comfortable writing the backend in
                Rust, Tauri gives you most of the web-stack experience at a
                fraction of the footprint.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Leave the webview behind
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                If what you actually want is TypeScript in, native app out —
                one language, real platform widgets, small binaries, and mobile
                /watch/TV from the same codebase — that is precisely the gap
                Perry exists to fill, with pre-1.0 maturity as the price of
                admission. And if you only need a CLI or server as a single
                file with zero compatibility risk, Bun&apos;s{" "}
                <code className="text-slate-300">--compile</code> is the
                pragmatic pick.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              See it for yourself
            </h2>
            <p className="text-slate-400 mb-6">
              Install Perry and ship a native app from TypeScript.
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
      </article>

      <Footer />
    </main>
  );
}
