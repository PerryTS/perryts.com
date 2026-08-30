import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { CompareItem } from "@/lib/compare";
import { getComparisonContent } from "@/lib/compare-content";

export async function CompareLayout({ item }: { item: CompareItem }) {
  const common = await getTranslations("common");
  const ui = await getTranslations("compare.ui");
  const locale = await getLocale();
  const data = getComparisonContent(item.slug);

  if (!data) return null;

  return (
    <article className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/compare"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          {ui("backToCompare")}
        </Link>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
            {ui(`category.${item.category}`)}
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold mb-6">
          <span className="gradient-text">{data.title}</span>
        </h1>

        <p className="text-lg text-slate-300 leading-relaxed mb-12">{data.tldr}</p>

        {locale !== "en" && (
          <p className="mb-8 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
            {ui("factsLanguageNotice")}
          </p>
        )}

        <time className="text-sm text-slate-500 block mb-12">
          {ui("lastUpdated")}{" "}
          {new Date(item.updated).toLocaleDateString(locale, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>

        {/* What is X / What is Perry */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <div className="feature-card">
            <h2 className="text-lg font-semibold text-white mb-3">
              {ui("whatIs", { name: item.competitor })}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">{data.competitorWhat}</p>
          </div>
          <div className="feature-card">
            <h2 className="text-lg font-semibold text-white mb-3">
              {ui("whatIs", { name: "Perry" })}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">{data.perryWhat}</p>
          </div>
        </div>

        {/* Comparison table */}
        <h2 className="text-2xl font-bold mb-6">{ui("sideBySide")}</h2>
        <div className="overflow-x-auto mb-16 border border-white/10 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-300">
                  {ui("feature")}
                </th>
                <th className="text-left px-4 py-3 font-semibold text-amber-300">Perry</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-300">
                  {item.competitor}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.table.map((row, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">{row.feature}</td>
                  <td className="px-4 py-3 text-slate-400">{row.perry}</td>
                  <td className="px-4 py-3 text-slate-400">{row.competitor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pros lists */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <div>
            <h2 className="text-xl font-semibold text-amber-300 mb-4">
              {ui("wherePerryWins")}
            </h2>
            <ul className="space-y-2 text-slate-300 text-sm">
              {data.perryWins.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-400 mt-0.5">+</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-300 mb-4">
              {ui("whereCompetitorWins", { name: item.competitor })}
            </h2>
            <ul className="space-y-2 text-slate-300 text-sm">
              {data.competitorWins.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-slate-500 mt-0.5">+</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* When to choose */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <div className="feature-card">
            <h2 className="text-lg font-semibold text-white mb-3">
              {ui("whenChoose", { name: "Perry" })}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">{data.whenPerry}</p>
          </div>
          <div className="feature-card">
            <h2 className="text-lg font-semibold text-white mb-3">
              {ui("whenChoose", { name: item.competitor })}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">{data.whenCompetitor}</p>
          </div>
        </div>

        {/* Verdict */}
        <h2 className="text-2xl font-bold mb-4">{ui("verdict")}</h2>
        <p className="text-slate-300 leading-relaxed mb-10">{data.verdict}</p>

        <h2 className="text-2xl font-bold mb-4">{ui("sources")}</h2>
        <ul className="space-y-2 mb-12 text-sm">
          {data.sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-perry-400 hover:text-white underline underline-offset-4"
              >
                {source.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="feature-card text-center">
          <h3 className="text-2xl font-bold mb-3 gradient-text">{ui("ctaTitle")}</h3>
          <p className="text-slate-400 mb-6">{ui("ctaSubtitle")}</p>
          <Link href="/" className="btn-primary inline-block">
            {common("getStarted")}
          </Link>
        </div>
      </div>
    </article>
  );
}
