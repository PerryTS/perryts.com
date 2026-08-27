import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function ComparisonMatrix() {
  const t = await getTranslations("comparison");

  const strengths = [t("nativeCompiled"), t("realPlatformWidgets"), t("noExternalEngine")];
  const tradeoffs = [t("linkedRuntime"), t("compatibilityTradeoff"), t("platformMaturityTradeoff")];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 max-w-[760px] mx-auto">
          <div className="inline-block px-3.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-500 text-xs font-semibold uppercase tracking-wider mb-5">
            {t("badge")}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {t.rich("title", {
              gradient: (chunks) => <span className="bg-gradient-to-br from-emerald-500 to-emerald-400 bg-clip-text text-transparent">{chunks}</span>,
            })}
          </h2>
          <p className="text-base text-slate-500 leading-relaxed">{t("subtitle")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="feature-card">
            <h3 className="text-lg font-semibold text-emerald-400 mb-5">{t("designedFor")}</h3>
            <ul className="space-y-4">
              {strengths.map((item) => (
                <li key={item} className="flex gap-3 text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-center shrink-0 mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="feature-card">
            <h3 className="text-lg font-semibold text-amber-300 mb-5">{t("tradeoffs")}</h3>
            <ul className="space-y-4">
              {tradeoffs.map((item) => (
                <li key={item} className="flex gap-3 text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-center shrink-0 mt-0.5">–</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          {t("compareNote")}{" "}
          <Link href="/compare" className="text-perry-400 hover:text-white underline underline-offset-4">
            {t("viewComparisons")}
          </Link>
        </p>
      </div>
    </section>
  );
}
