import { getTranslations } from "next-intl/server";
import { PRODUCT_FACTS, PUBLIC_BENCHMARKS } from "@/lib/product-facts";

const resultStyles = {
  win: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  mixed: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  loss: "bg-rose-500/10 text-rose-300 border-rose-500/20",
} as const;

export async function Performance() {
  const t = await getTranslations("performance");

  const comparisons = [
    {
      metric: t("binarySize"),
      perry: `${PRODUCT_FACTS.helloWorldSize} hello world; ${PRODUCT_FACTS.mangoSize} Mango`,
      node: t("nodeDistribution"),
      bun: t("bunDistribution"),
    },
    {
      metric: t("startupTime"),
      perry: `${PRODUCT_FACTS.measuredMacStartup}*`,
      node: t("engineStartup"),
      bun: t("engineStartup"),
    },
    {
      metric: t("runtimeDeps"),
      perry: t("linkedRuntime"),
      node: t("externalRuntime"),
      bun: t("embeddedRuntime"),
    },
    {
      metric: t("memoryOverhead"),
      perry: t("workloadDependent"),
      node: t("workloadDependent"),
      bun: t("workloadDependent"),
    },
  ];

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t.rich("title", {
              gradient: (chunks) => <span className="gradient-text">{chunks}</span>,
            })}
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">{t("subtitle")}</p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[720px]">
              <thead className="bg-white/[0.03]">
                <tr className="border-b border-slate-800">
                  <th className="text-left py-4 px-4 text-slate-400 font-medium">{t("metric")}</th>
                  <th className="text-left py-4 px-4"><span className="gradient-text font-bold">Perry</span></th>
                  <th className="text-left py-4 px-4 text-slate-400 font-medium">Node.js</th>
                  <th className="text-left py-4 px-4 text-slate-400 font-medium">Bun</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row) => (
                  <tr key={row.metric} className="border-b border-slate-800/50 last:border-0">
                    <td className="py-4 px-4 text-slate-300">{row.metric}</td>
                    <td className="py-4 px-4 text-perry-400 font-medium">{row.perry}</td>
                    <td className="py-4 px-4 text-slate-500">{row.node}</td>
                    <td className="py-4 px-4 text-slate-500">{row.bun}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">* {t("startupFootnote")}</p>

          <div className="mt-16">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">
                {t.rich("benchmarkTitle", {
                  gradient: (chunks) => <span className="gradient-text">{chunks}</span>,
                })}
              </h3>
              <p className="text-slate-400 text-sm">
                {PRODUCT_FACTS.benchmarkVersion} · {PRODUCT_FACTS.benchmarkNode} · {PRODUCT_FACTS.benchmarkBun}
                {" · "}{PRODUCT_FACTS.benchmarkHost} · {PRODUCT_FACTS.benchmarkDate}
              </p>
              <p className="text-slate-500 text-xs mt-2">{t("benchmarkSubtitle")}</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-white/[0.03]">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">{t("benchmark")}</th>
                    <th className="text-right px-4 py-3 text-perry-400 font-medium">Perry</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Node.js</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Bun</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">{t("result")}</th>
                  </tr>
                </thead>
                <tbody>
                  {PUBLIC_BENCHMARKS.map((benchmark) => (
                    <tr key={benchmark.name} className="border-t border-white/5">
                      <td className="px-4 py-3">
                        <div className="text-slate-300 font-medium">{benchmark.name}</div>
                        <div className="text-xs text-slate-600">{benchmark.description}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-perry-400">{benchmark.perry} ms</td>
                      <td className="px-4 py-3 text-right text-slate-400">{benchmark.node} ms</td>
                      <td className="px-4 py-3 text-right text-slate-400">{benchmark.bun} ms</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs ${resultStyles[benchmark.result]}`}>
                          {t(`result_${benchmark.result}`)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm">
              <a href={PRODUCT_FACTS.benchmarkSource} target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-white underline underline-offset-4">
                {t("benchmarkSource")}
              </a>
              <a href={PRODUCT_FACTS.benchmarkMethodology} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white underline underline-offset-4">
                {t("methodology")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
