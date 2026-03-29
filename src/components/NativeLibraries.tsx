import { getTranslations } from "next-intl/server";

export async function NativeLibraries() {
  const t = await getTranslations("nativeLibs");

  const libraryCategories = [
    { nameKey: "database" as const, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>, packages: ["mysql2", "pg", "mongodb", "better-sqlite3", "ioredis"] },
    { nameKey: "security" as const, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>, packages: ["bcrypt", "argon2", "jsonwebtoken", "crypto"] },
    { nameKey: "http" as const, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>, packages: ["http", "https", "axios", "node-fetch", "ws", "nodemailer"] },
    { nameKey: "dataProcessing" as const, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, packages: ["cheerio", "sharp", "zlib", "lodash"] },
    { nameKey: "dateTime" as const, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, packages: ["dayjs", "moment", "date-fns", "node-cron"] },
    { nameKey: "utilities" as const, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, packages: ["uuid", "nanoid", "slugify", "validator", "dotenv", "rate-limiter-flexible"] },
  ];

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t.rich("title", { gradient: (chunks) => <span className="gradient-text">{chunks}</span> })}
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">{t("subtitle")}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {libraryCategories.map((category, index) => (
            <div key={index} className="feature-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-amber-400">{category.icon}</div>
                <h3 className="text-lg font-semibold">{t(category.nameKey)}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {category.packages.map((pkg, pkgIndex) => (
                  <span key={pkgIndex} className="px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-full text-sm text-slate-300 hover:border-perry-500/50 hover:text-perry-400 transition-colors cursor-default">{pkg}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 bg-slate-800/50 border border-slate-700 rounded-xl px-6 py-4">
            <svg className="w-5 h-5 text-perry-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-slate-300">{t("info")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
