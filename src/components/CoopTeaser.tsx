import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCoopContent } from "@/lib/coop-content";
import { CoopTopology } from "@/components/CoopTopology";

export async function CoopTeaser() {
  const locale = await getLocale();
  const content = getCoopContent(locale);

  return (
    <section id="coop" className="relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-950/[0.12] to-transparent" />
      <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/[0.04] blur-3xl" />

      <div className="relative max-w-7xl mx-auto rounded-[2rem] border border-emerald-400/15 bg-[#0f1014]/90 p-6 sm:p-10 lg:p-12">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] items-center gap-10 lg:gap-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-xs font-medium text-emerald-300 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {content.adjacent}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5">
              <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                {content.tagline}
              </span>
            </h2>
            <p className="text-lg leading-relaxed text-slate-400 mb-7">
              {content.intro}
            </p>

            <ul className="grid sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-3 mb-8">
              {content.facts.map((fact) => (
                <li key={fact} className="rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3 text-sm text-slate-300">
                  <span className="mr-2 text-emerald-400">✓</span>
                  {fact}
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/coop" className="btn-primary inline-flex items-center justify-center gap-2">
                {content.explore}
                <span aria-hidden="true">→</span>
              </Link>
              <a
                href="https://github.com/PerryTS/coop"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center justify-center"
              >
                {content.viewSource}
              </a>
            </div>
          </div>

          <CoopTopology content={content} compact />
        </div>
      </div>
    </section>
  );
}
