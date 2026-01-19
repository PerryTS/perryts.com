export function Performance() {
  const comparisons = [
    {
      metric: "Binary Size",
      perry: "2-5 MB",
      node: "~80 MB",
      bun: "~90 MB",
      perryHighlight: true,
    },
    {
      metric: "Startup Time",
      perry: "~1 ms",
      node: "~30 ms",
      bun: "~10 ms",
      perryHighlight: true,
    },
    {
      metric: "Runtime Dependencies",
      perry: "None",
      node: "Node.js",
      bun: "Bun",
      perryHighlight: true,
    },
    {
      metric: "Memory Overhead",
      perry: "Minimal",
      node: "V8 + GC",
      bun: "JSC + GC",
      perryHighlight: true,
    },
  ];

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Performance <span className="gradient-text">Comparison</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Native compilation delivers unmatched efficiency
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-4 px-4 text-slate-400 font-medium">
                    Metric
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <span className="gradient-text font-bold">Perry</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 text-slate-400 font-medium">
                    Node.js
                  </th>
                  <th className="text-center py-4 px-4 text-slate-400 font-medium">
                    Bun
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors"
                  >
                    <td className="py-4 px-4 text-slate-300">{row.metric}</td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={
                          row.perryHighlight
                            ? "text-perry-400 font-semibold"
                            : "text-slate-300"
                        }
                      >
                        {row.perry}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center text-slate-500">
                      {row.node}
                    </td>
                    <td className="py-4 px-4 text-center text-slate-500">
                      {row.bun}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Visual comparison bars */}
          <div className="mt-16 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">Binary Size</span>
                <span className="text-sm text-slate-500">Lower is better</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="w-16 text-sm text-slate-400">Perry</span>
                  <div className="flex-1 h-8 bg-slate-800 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-perry-500 to-cyan-500 rounded-lg flex items-center justify-end pr-3"
                      style={{ width: "6%" }}
                    >
                      <span className="text-xs font-medium">5 MB</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-16 text-sm text-slate-500">Node.js</span>
                  <div className="flex-1 h-8 bg-slate-800 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-slate-600 rounded-lg flex items-center justify-end pr-3"
                      style={{ width: "89%" }}
                    >
                      <span className="text-xs font-medium text-slate-300">80 MB</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-16 text-sm text-slate-500">Bun</span>
                  <div className="flex-1 h-8 bg-slate-800 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-slate-600 rounded-lg flex items-center justify-end pr-3"
                      style={{ width: "100%" }}
                    >
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
