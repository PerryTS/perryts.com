import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Pry — Native JSON Viewer - Perry Showcase",
  description:
    "Pry is a native JSON viewer built with Perry. Tree navigation, search, keyboard shortcuts — compiled from TypeScript to native macOS, iOS, and Android apps.",
};

export default async function PryShowcase({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pry");
  const tc = await getTranslations("common");

  const features = [
    {
      title: t("treeView"),
      description: t("treeViewDesc"),
    },
    {
      title: t("search"),
      description: t("searchDesc"),
    },
    {
      title: t("keyboardShortcuts"),
      description: t("keyboardShortcutsDesc"),
    },
    {
      title: t("clipboardSupport"),
      description: t("clipboardSupportDesc"),
    },
    {
      title: t("statusBar"),
      description: t("statusBarDesc"),
    },
    {
      title: t("syntaxColoring"),
      description: t("syntaxColoringDesc"),
    },
  ];

  const platforms = [
    { name: "macOS", framework: "AppKit", status: t("available") },
    { name: "iOS", framework: "UIKit", status: t("available") },
    { name: "Android", framework: "Views", status: t("available") },
  ];

  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-perry-950/50 via-slate-950 to-slate-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-perry-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto">
          <Link
            href="/showcase"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16l-4-4m0 0l4-4m-4 4h18"
              />
            </svg>
            {tc("backToShowcase")}
          </Link>

          <div className="flex flex-wrap gap-2 mb-4">
            {platforms.map((p) => (
              <span
                key={p.name}
                className="text-xs px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
              >
                {p.name}
              </span>
            ))}
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold mb-4">
            <span className="gradient-text">Pry</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mb-8">
            {t("subtitle")}
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="https://github.com/nicktrebes/perry-pry"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              {tc("viewOnGithub")}
            </a>
            <Link href="/blog/building-pry" className="btn-secondary">
              {tc("readTheBlogPost")}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">{t("features")}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <div key={feature.title} className="feature-card">
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it's built */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">{t("howItsBuilt")}</h2>
          <p className="text-lg text-slate-400 mb-8 max-w-2xl">
            {t("howItsBuiltDesc")}
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            <div className="feature-card text-center">
              <div className="text-3xl mb-2">📝</div>
              <h3 className="font-semibold text-white mb-1">{t("typeScriptSource")}</h3>
              <p className="text-sm text-slate-400">
                {t("typeScriptSourceDesc")}
              </p>
            </div>
            <div className="feature-card text-center">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="font-semibold text-white mb-1">{t("perryCompile")}</h3>
              <p className="text-sm text-slate-400">
                {t("perryCompileDesc")}
              </p>
            </div>
            <div className="feature-card text-center">
              <div className="text-3xl mb-2">🖥️</div>
              <h3 className="font-semibold text-white mb-1">{t("nativeBinary")}</h3>
              <p className="text-sm text-slate-400">
                {t("nativeBinaryDesc")}
              </p>
            </div>
          </div>

          <div className="code-block">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">pry.ts (simplified)</span>
            </div>
            <div className="space-y-1 text-sm">
              <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">TreeView</span>, <span className="text-cyan-400">SearchBar</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
              <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">readFile</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/fs&quot;</span>;</p>
              <p className="mt-3"><span className="text-purple-400">const</span> <span className="text-cyan-400">data</span> = JSON.<span className="text-yellow-400">parse</span>(<span className="text-yellow-400">readFile</span>(process.argv[2]));</p>
              <p><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Pry&quot;</span>, {"{"} width: <span className="text-orange-400">800</span>, height: <span className="text-orange-400">600</span> {"}"});</p>
              <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">addSearchBar</span>({"{"} placeholder: <span className="text-green-400">&quot;Search JSON...&quot;</span> {"}"});</p>
              <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">addTreeView</span>(<span className="text-cyan-400">data</span>, {"{"}</p>
              <p>  collapsible: <span className="text-orange-400">true</span>,</p>
              <p>  syntaxHighlight: <span className="text-orange-400">true</span>,</p>
              <p>  copyOnClick: <span className="text-orange-400">true</span>,</p>
              <p>{"}"});</p>
              <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">addStatusBar</span>();</p>
              <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
            </div>
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">{t("platformSupport")}</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {platforms.map((p) => (
              <div key={p.name} className="feature-card">
                <h3 className="font-semibold text-white mb-1">{p.name}</h3>
                <p className="text-sm text-slate-500 mb-2">
                  {t("nativeWidgets", { framework: p.framework })}
                </p>
                <span className="text-xs font-medium text-green-400">
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">{t("screenshots")}</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="feature-card overflow-hidden p-0">
              <div className="aspect-video bg-slate-800/50 flex items-center justify-center text-slate-500">
                <p className="text-sm">{t("macOsScreenshot")}</p>
              </div>
            </div>
            <div className="feature-card overflow-hidden p-0">
              <div className="aspect-video bg-slate-800/50 flex items-center justify-center text-slate-500">
                <p className="text-sm">{t("iosScreenshot")}</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-4">
            {t("screenshotsNote")}
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
