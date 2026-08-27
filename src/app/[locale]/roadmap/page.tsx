import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PRODUCT_FACTS } from "@/lib/product-facts";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("roadmap");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: "/en/roadmap/" },
  };
}

function StatusList({ items, tone }: { items: string[]; tone: "green" | "amber" | "slate" }) {
  const styles = {
    green: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    slate: "text-slate-300 bg-slate-500/10 border-slate-500/20",
  } as const;

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-slate-300">
          <span className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-xs shrink-0 ${styles[tone]}`}>
            {tone === "green" ? "✓" : tone === "amber" ? "→" : "·"}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function RoadmapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("roadmap");
  const currentItems = t.raw("currentItems") as string[];
  const activeItems = t.raw("activeItems") as string[];
  const policyItems = t.raw("policyItems") as string[];

  return (
    <main className="min-h-screen">
      <Header />
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {locale !== "en" && (
            <p className="mb-8 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-center text-sm text-amber-200">
              {t("languageNotice")}
            </p>
          )}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="gradient-text">{t("title")}</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">{t("subtitle")}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="feature-card">
              <h2 className="text-xl font-semibold text-emerald-400 mb-5">{t("currentTitle")}</h2>
              <StatusList items={currentItems} tone="green" />
            </section>
            <section className="feature-card">
              <h2 className="text-xl font-semibold text-amber-300 mb-5">{t("activeTitle")}</h2>
              <StatusList items={activeItems} tone="amber" />
            </section>
          </div>

          <section className="feature-card mt-6">
            <h2 className="text-xl font-semibold text-white mb-5">{t("policyTitle")}</h2>
            <StatusList items={policyItems} tone="slate" />
          </section>

          <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
            <p>{t("snapshotNote")}</p>
            <div className="flex flex-wrap gap-4 mt-4">
              <a href={PRODUCT_FACTS.platformsUrl} target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-white underline underline-offset-4">{t("platformStatus")}</a>
              <a href={PRODUCT_FACTS.limitationsUrl} target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-white underline underline-offset-4">{t("knownLimitations")}</a>
              <a href={PRODUCT_FACTS.benchmarkSource} target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-white underline underline-offset-4">{t("benchmarkArtifact")}</a>
              <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-white underline underline-offset-4">{t("changelog")}</a>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
