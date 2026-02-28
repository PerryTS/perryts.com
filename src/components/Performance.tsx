export function Performance() {
  const benchmarks = [
    { name: "closure", perry: 14, node: 63, speedup: "4.5x" },
    { name: "object_create", perry: 2, node: 7, speedup: "3.5x" },
    { name: "array_read", perry: 4, node: 12, speedup: "3.0x" },
    { name: "math_intensive", perry: 22, node: 66, speedup: "3.0x" },
    { name: "method_calls", perry: 5, node: 15, speedup: "3.0x" },
    { name: "binary_trees", perry: 3, node: 8, speedup: "2.7x" },
    { name: "string_concat", perry: 2, node: 5, speedup: "2.5x" },
    { name: "fibonacci", perry: 621, node: 1318, speedup: "2.1x" },
    { name: "mandelbrot", perry: 25, node: 47, speedup: "1.9x" },
    { name: "factorial", perry: 70, node: 116, speedup: "1.7x" },
  ];

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

          {/* Benchmark comparison */}
          <div className="mt-16">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">
                Benchmark Results: <span className="gradient-text">2.2x Faster</span>
              </h3>
              <p className="text-slate-400 text-sm">
                Perry vs Node.js v24 on macOS ARM64 (lower is better)
              </p>
            </div>
            <div className="grid gap-3">
              {benchmarks.map((bench) => {
                const perryWidth = (bench.perry / bench.node) * 100;
                return (
                  <div key={bench.name} className="flex items-center gap-4">
                    <span className="w-28 text-sm text-slate-400 text-right">
                      {bench.name.replace(/_/g, " ")}
                    </span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-6 bg-slate-800 rounded overflow-hidden relative">
                        <div
                          className="absolute h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded"
                          style={{ width: `${perryWidth}%` }}
                        />
                        <div
                          className="absolute h-full bg-slate-600/50 rounded"
                          style={{ width: "100%" }}
                        />
                        <div
                          className="absolute h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded"
                          style={{ width: `${perryWidth}%` }}
                        />
                      </div>
                      <span className="w-16 text-sm text-perry-400 font-semibold">
                        {bench.speedup}
                      </span>
                    </div>
                    <div className="w-32 text-xs text-slate-500 hidden sm:block">
                      {bench.perry}ms vs {bench.node}ms
                    </div>
                  </div>
                );
              })}
            </div>
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
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-end pr-3"
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
