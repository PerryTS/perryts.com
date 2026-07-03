import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function Architecture() {
  const t = await getTranslations("architecture");
  const locale = await getLocale();

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
          <div className="relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/20 via-amber-500/50 to-amber-500/20 -translate-y-1/2 hidden md:block" />
            <div className="grid md:grid-cols-5 gap-4 md:gap-2">
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-perry-400 z-10">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <span className="mt-3 text-sm font-medium text-slate-300">TypeScript</span>
                <span className="text-xs text-slate-500">{t("tsFiles")}</span>
              </div>
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400 z-10">
                  <span className="text-lg font-bold">SWC</span>
                </div>
                <span className="mt-3 text-sm font-medium text-slate-300">{t("parser")}</span>
                <span className="text-xs text-slate-500">{t("fastParsing")}</span>
              </div>
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-purple-400 z-10">
                  <span className="text-lg font-bold">HIR</span>
                </div>
                <span className="mt-3 text-sm font-medium text-slate-300">{t("transform")}</span>
                <span className="text-xs text-slate-500">Monomorphization</span>
              </div>
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-orange-400 z-10">
                  <span className="text-lg font-bold">LLVM</span>
                </div>
                <span className="mt-3 text-sm font-medium text-slate-300">{t("codegen")}</span>
                <span className="text-xs text-slate-500">{t("machineCode")}</span>
              </div>
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white z-10">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="mt-3 text-sm font-medium text-slate-300">{t("executable")}</span>
                <span className="text-xs text-slate-500">{t("binarySize")}</span>
              </div>
            </div>
          </div>

          <p className="mt-12 text-center text-slate-400">
            {t("compilerInternalsPrompt")}{" "}
            <Link href="/internals" className="text-perry-400 hover:text-white transition-colors underline underline-offset-2">
              {t("compilerInternals")}
            </Link>
          </p>
          {locale === "en" && (
            <p className="mt-4 text-center text-slate-400">
              Deep dive:{" "}
              <Link
                href="/typescript-llvm"
                className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
              >
                TypeScript on LLVM
              </Link>{" "}
              — monomorphization, NaN-boxing, and why Perry left Cranelift.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
