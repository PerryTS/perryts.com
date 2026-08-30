import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CoopTopology } from "@/components/CoopTopology";
import { JsonLd } from "@/components/JsonLd";
import { getCoopContent } from "@/lib/coop-content";
import { locales } from "@/i18n/routing";

const REPOSITORY = "https://github.com/PerryTS/coop";
const QUICK_START = `${REPOSITORY}/blob/main/docs/src/quickstart.md`;
const BENCHMARKS = `${REPOSITORY}/blob/main/docs/src/benchmarks.md`;
const STATUS = `${REPOSITORY}/blob/main/docs/src/status.md`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const content = getCoopContent(locale);
  const url = `/${locale}/coop/`;

  return {
    title: { absolute: content.metaTitle },
    description: content.metaDescription,
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(locales.map((language) => [language, `/${language}/coop/`])),
        "x-default": "/en/coop/",
      },
    },
    openGraph: {
      title: content.metaTitle,
      description: content.metaDescription,
      url,
      siteName: "Perry",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: content.metaTitle,
      description: content.metaDescription,
    },
  };
}

function ExternalLink({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${primary ? "btn-primary" : "btn-secondary"} inline-flex items-center justify-center gap-2`}
    >
      {children}
      <span aria-hidden="true">↗</span>
    </a>
  );
}

function ListCard({ title, items, tone }: { title: string; items: string[]; tone: "good" | "caution" }) {
  const good = tone === "good";
  return (
    <div className={`rounded-2xl border p-6 sm:p-8 ${good ? "border-emerald-400/20 bg-emerald-400/[0.04]" : "border-amber-400/20 bg-amber-400/[0.04]"}`}>
      <h3 className={`text-xl font-semibold mb-5 ${good ? "text-emerald-300" : "text-amber-300"}`}>{title}</h3>
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-slate-300">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${good ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300"}`}>
              {good ? "✓" : "·"}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function CoopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = getCoopContent(locale);

  const softwareSourceJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: "Coop",
    description: content.metaDescription,
    codeRepository: REPOSITORY,
    license: "https://opensource.org/license/mit",
    programmingLanguage: ["Rust", "TypeScript"],
    runtimePlatform: "Linux and macOS",
  };

  return (
    <main className="min-h-screen overflow-hidden">
      <JsonLd data={softwareSourceJsonLd} />
      <Header />

      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="absolute left-1/2 top-12 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-emerald-400/[0.05] blur-3xl" />
        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[0.95fr_1.05fr] items-center gap-12 lg:gap-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-xs font-medium text-emerald-300 mb-7">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {content.adjacent}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                {content.tagline}
              </span>
            </h1>
            <p className="text-xl leading-relaxed text-slate-400 mb-7">{content.intro}</p>
            <p className="inline-flex rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-sm text-amber-200 mb-8">
              {content.experimental}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <ExternalLink href={REPOSITORY} primary>{content.viewSource}</ExternalLink>
              <ExternalLink href={QUICK_START}>{content.quickStart}</ExternalLink>
            </div>
          </div>
          <CoopTopology content={content} />
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8 border-y border-white/[0.06] bg-white/[0.015]">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{content.whyTitle}</h2>
            <p className="text-lg leading-relaxed text-slate-400">{content.whyBody}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="feature-card">
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-amber-400 mb-4">Perry</div>
              <h3 className="text-xl font-semibold mb-3">{content.perryTitle}</h3>
              <p className="leading-relaxed text-slate-400">{content.perryBody}</p>
              <div className="mt-6 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-4 font-mono text-xs text-amber-200">
                app + runtime + stdlib → executable
              </div>
            </div>
            <div className="feature-card !border-emerald-400/20">
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-400 mb-4">Coop</div>
              <h3 className="text-xl font-semibold mb-3">{content.coopTitle}</h3>
              <p className="leading-relaxed text-slate-400">{content.coopBody}</p>
              <div className="mt-6 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4 font-mono text-xs text-emerald-200">
                apps → shared runtime + stdlib
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{content.architectureTitle}</h2>
            <p className="text-lg text-slate-400">{content.architectureBody}</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-5">
            {content.tiers.map((tier, index) => (
              <div key={tier.title} className="relative feature-card">
                <span className="absolute right-5 top-4 font-mono text-4xl font-bold text-white/[0.04]">0{index + 1}</span>
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] font-mono text-sm text-emerald-300">
                  0{index + 1}
                </div>
                <h3 className="text-lg font-semibold mb-3">{tier.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{tier.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900/25">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.7fr_1.3fr] gap-10 lg:gap-16">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{content.workingTitle}</h2>
            <p className="text-lg leading-relaxed text-slate-400">{content.workingBody}</p>
          </div>
          <ul className="grid sm:grid-cols-2 gap-4">
            {content.workingItems.map((item) => (
              <li key={item} className="rounded-xl border border-white/8 bg-white/[0.025] p-4 text-sm leading-relaxed text-slate-300">
                <span className="mr-2 text-emerald-400">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="quick-start" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{content.developerTitle}</h2>
            <p className="text-lg leading-relaxed text-slate-400">{content.developerBody}</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="code-block">
              <div className="text-xs text-emerald-300 mb-4">{content.configLabel}</div>
              <pre className="text-slate-300"><code>{`name = "hello"
version = "0.1.0"

[hosts]
domains = ["hello.test"]

[[handlers]]
file = "handlers/hello.ts"
path = "/hello"
method = "GET"`}</code></pre>
            </div>
            <div className="code-block">
              <div className="text-xs text-cyan-300 mb-4">{content.handlerLabel}</div>
              <pre className="text-slate-300"><code>{`import { CoopRequest, respond } from "@coop/runtime";

export function handle(reqJson: string): string {
  const req = new CoopRequest(reqJson);
  return respond(200, {}, \`hello from \${req.path}\`);
}`}</code></pre>
            </div>
          </div>
          <div className="mt-5 code-block max-w-2xl">
            <div className="text-xs text-amber-300 mb-3">{content.runLabel}</div>
            <code className="text-emerald-300">$ coop-cli dev ./hello</code>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8 border-y border-white/[0.06] bg-white/[0.015]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">{content.fitTitle}</h2>
          <div className="grid lg:grid-cols-2 gap-6">
            <ListCard title={content.rightTitle} items={content.rightItems} tone="good" />
            <ListCard title={content.notYetTitle} items={content.notYetItems} tone="caution" />
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.06] to-emerald-400/[0.03] p-7 sm:p-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">{content.benchmarkTitle}</h2>
          <p className="text-lg leading-relaxed text-slate-400 mb-7">{content.benchmarkBody}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <ExternalLink href={BENCHMARKS}>{content.benchmarks}</ExternalLink>
            <ExternalLink href={STATUS}>{content.status}</ExternalLink>
          </div>
        </div>
      </section>

      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.045] p-8 sm:p-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{content.closingTitle}</h2>
          <p className="text-lg text-slate-400 mb-8">{content.closingBody}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <ExternalLink href={REPOSITORY} primary>{content.viewSource}</ExternalLink>
            <ExternalLink href={QUICK_START}>{content.quickStart}</ExternalLink>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
