import type { CoopContent } from "@/lib/coop-content";

export function CoopTopology({
  content,
  compact = false,
}: {
  content: CoopContent;
  compact?: boolean;
}) {
  const steps = [
    { label: "TypeScript", tone: "border-cyan-400/30 bg-cyan-400/8 text-cyan-200" },
    { label: "Perry", tone: "border-amber-400/30 bg-amber-400/8 text-amber-200" },
    { label: content.appLibrary, tone: "border-violet-400/30 bg-violet-400/8 text-violet-200" },
    { label: content.worker, tone: "border-emerald-400/30 bg-emerald-400/8 text-emerald-200" },
  ];

  return (
    <div
      role="img"
      aria-label={content.diagramAria}
      className={`rounded-3xl border border-white/10 bg-[#111116]/90 ${compact ? "p-5 sm:p-6" : "p-6 sm:p-8"}`}
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {steps.map((step, index) => (
          <div key={step.label} className="contents">
            <div
              className={`flex-1 rounded-xl border px-3 py-3 text-center font-mono text-xs sm:text-sm font-semibold ${step.tone}`}
            >
              {step.label}
            </div>
            {index < steps.length - 1 && (
              <span aria-hidden="true" className="text-center text-slate-600 sm:-mx-0.5 sm:rotate-0 rotate-90">
                →
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end pr-4 sm:pr-8">
        <div aria-hidden="true" className="h-5 w-px bg-emerald-400/25" />
      </div>
      <div className="ml-auto max-w-xs rounded-xl border border-dashed border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-3 text-center font-mono text-xs text-emerald-200">
        {content.sharedProviders}
        <span className="block mt-1 text-[10px] uppercase tracking-[0.18em] text-emerald-400/60">
          {content.onePerMachine}
        </span>
      </div>
    </div>
  );
}
