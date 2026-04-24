import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function ShipIt() {
  const t = await getTranslations("shipIt");

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t.rich("title", { gradient: (chunks) => <span className="gradient-text">{chunks}</span> })}
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        {/* Pipeline visualization */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="relative">
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/20 via-amber-500/50 to-amber-500/20 hidden md:block" />
            <div className="hidden md:grid md:grid-cols-4 gap-2">
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-perry-400 z-10">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <span className="mt-3 text-sm font-medium text-slate-300">perry compile</span>
                <span className="text-xs text-slate-500">{t("compileSign")}</span>
              </div>
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400 z-10">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                </div>
                <span className="mt-3 text-sm font-medium text-slate-300">perry publish</span>
                <span className="text-xs text-slate-500">{t("packageSubmit")}</span>
              </div>
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white z-10">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="mt-3 text-sm font-medium text-slate-300">{t("storesDownloads")}</span>
                <span className="text-xs text-slate-500">{t("storesList")}</span>
              </div>
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-purple-400 z-10">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <span className="mt-3 text-sm font-medium text-slate-300">perry verify</span>
                <span className="text-xs text-slate-500">{t("testEveryPlatform")}</span>
              </div>
            </div>

            {/* Mobile pipeline */}
            <div className="md:hidden flex flex-col items-center gap-2">
              {[
                { label: "perry compile", sub: t("compileSign"), color: "text-perry-400", gradient: false },
                { label: "perry publish", sub: t("packageSubmit"), color: "text-cyan-400", gradient: false },
                { label: t("storesDownloads"), sub: t("storesList"), color: "text-white", gradient: true },
                { label: "perry verify", sub: t("testEveryPlatform"), color: "text-purple-400", gradient: false },
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center">
                  {i > 0 && <div className="w-0.5 h-6 bg-gradient-to-b from-amber-500/20 to-amber-500/50" />}
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${step.color} ${step.gradient ? "bg-gradient-to-br from-amber-500 to-orange-500" : "bg-slate-900 border border-slate-700"}`}>
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="mt-2 text-sm font-medium text-slate-300">{step.label}</span>
                  <span className="text-xs text-slate-500">{step.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="feature-card">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-amber-400 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">{t("buildSign.title")}</h3>
            <p className="text-slate-400">{t("buildSign.description")}</p>
          </div>
          <div className="feature-card">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-amber-400 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">{t("distribute.title")}</h3>
            <p className="text-slate-400">{t("distribute.description")}</p>
          </div>
          <div className="feature-card">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-amber-400 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">{t("verify.title")}</h3>
            <p className="text-slate-400">{t("verify.description")}</p>
          </div>
        </div>

        <p className="text-center mt-10 text-sm text-slate-500">
          {t("freeForOpenSource")}{" "}
          <Link href="/publish" className="text-slate-400 hover:text-white transition-colors underline underline-offset-2">
            {t("plansForTeams")}
          </Link>{" "}
          &rarr; /publish
        </p>
      </div>
    </section>
  );
}
