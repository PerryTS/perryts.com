import { getTranslations } from "next-intl/server";

export async function Performance() {
  const t = await getTranslations("performance");

  const benchmarks = [
    { name: "accumulate", perry: 34, node: 617, speedup: "18x" },
    { name: "object_create", perry: 1, node: 11, speedup: "11x" },
    { name: "json_roundtrip", perry: 75, node: 394, speedup: "5.3x" },
    { name: "loop_overhead", perry: 12, node: 54, speedup: "4.5x" },
    { name: "math_intensive", perry: 14, node: 51, speedup: "3.6x" },
    { name: "array_read", perry: 4, node: 13, speedup: "3.3x" },
    { name: "fibonacci", perry: 318, node: 1022, speedup: "3.2x" },
    { name: "array_write", perry: 4, node: 9, speedup: "2.3x" },
    { name: "loop_data_dependent", perry: 235, node: 322, speedup: "1.4x" },
    { name: "nested_loops", perry: 18, node: 18, speedup: "1.0x" },
  ];

  const comparisons = [
    { metric: t("binarySize"), perry: "2-5 MB", node: "~80 MB", bun: "~90 MB", perryHighlight: true },
    { metric: t("startupTime"), perry: "~1 ms", node: "~30 ms", bun: "~10 ms", perryHighlight: true },
    { metric: t("runtimeDeps"), perry: t("none"), node: "Node.js", bun: "Bun", perryHighlight: true },
    { metric: t("memoryOverhead"), perry: t("minimal"), node: "V8 + GC", bun: "JSC + GC", perryHighlight: true },
  ];

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t.rich("title", { gradient: (chunks) => <span className="gradient-text">{chunks}</span> })}
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">{t("subtitle")}</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-4 px-4 text-slate-400 font-medium">{t("metric")}</th>
                  <th className="text-center py-4 px-4"><span className="gradient-text font-bold">Perry</span></th>
                  <th className="text-center py-4 px-4 text-slate-400 font-medium">Node.js</th>
                  <th className="text-center py-4 px-4 text-slate-400 font-medium">Bun</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row, index) => (
                  <tr key={index} className="border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors">
                    <td className="py-4 px-4 text-slate-300">{row.metric}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={row.perryHighlight ? "text-perry-400 font-semibold" : "text-slate-300"}>{row.perry}</span>
                    </td>
                    <td className="py-4 px-4 text-center text-slate-500">{row.node}</td>
                    <td className="py-4 px-4 text-center text-slate-500">{row.bun}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-16">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">
                {t.rich("benchmarkTitle", { gradient: (chunks) => <span className="gradient-text">{chunks}</span> })}
              </h3>
              <p className="text-slate-400 text-sm">{t("benchmarkSubtitle")}</p>
            </div>
            <div className="grid gap-3">
              {benchmarks.map((bench) => {
                const perryWidth = (bench.perry / bench.node) * 100;
                return (
                  <div key={bench.name} className="flex items-center gap-4">
                    <span className="w-28 text-sm text-slate-400 text-right">{bench.name.replace(/_/g, " ")}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-6 bg-slate-800 rounded overflow-hidden relative">
                        <div className="absolute h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded" style={{ width: `${perryWidth}%` }} />
                        <div className="absolute h-full bg-slate-600/50 rounded" style={{ width: "100%" }} />
                        <div className="absolute h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded" style={{ width: `${perryWidth}%` }} />
                      </div>
                      <span className="w-16 text-sm text-perry-400 font-semibold">{bench.speedup}</span>
                    </div>
                    <div className="w-32 text-xs text-slate-500 hidden sm:block">{bench.perry}ms vs {bench.node}ms</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-16 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">{t("binarySize")}</span>
                <span className="text-sm text-slate-500">{t("lowerIsBetter")}</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="w-16 text-sm text-slate-400">Perry</span>
                  <div className="flex-1 h-8 bg-slate-800 rounded-lg overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-end pr-3" style={{ width: "6%" }}>
                      <span className="text-xs font-medium">5 MB</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-16 text-sm text-slate-500">Node.js</span>
                  <div className="flex-1 h-8 bg-slate-800 rounded-lg overflow-hidden">
                    <div className="h-full bg-slate-600 rounded-lg flex items-center justify-end pr-3" style={{ width: "89%" }}>
                      <span className="text-xs font-medium text-slate-300">80 MB</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-16 text-sm text-slate-500">Bun</span>
                  <div className="flex-1 h-8 bg-slate-800 rounded-lg overflow-hidden">
                    <div className="h-full bg-slate-600 rounded-lg flex items-center justify-end pr-3" style={{ width: "100%" }}>
                      <span className="text-xs font-medium text-slate-300">90 MB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
