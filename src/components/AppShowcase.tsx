import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

export async function AppShowcase() {
  const t = await getTranslations("appShowcase");

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t.rich("title", {
              gradient: (chunks) => (
                <span className="gradient-text">{chunks}</span>
              ),
            })}
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="space-y-16">
          {/* Mango */}
          <div className="feature-card !p-8">
            <div className="flex items-center gap-4 mb-6">
              <Image
                src="/showcase/mango-logo.svg"
                alt="Mango"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <div>
                <h3 className="text-2xl font-bold">Mango</h3>
                <p className="text-slate-400">{t("mangoTagline")}</p>
              </div>
              <div className="ml-auto flex gap-2">
                <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-3 py-1">
                  macOS
                </span>
                <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-3 py-1">
                  Linux
                </span>
                <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-3 py-1">
                  Windows
                </span>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl overflow-hidden border border-white/5 shadow-2xl">
                <Image
                  src="/showcase/mango-screenshot-1.png"
                  alt="Mango — document editor"
                  width={1200}
                  height={800}
                  className="w-full h-auto"
                />
              </div>
              <div className="rounded-xl overflow-hidden border border-white/5 shadow-2xl">
                <Image
                  src="/showcase/mango-screenshot-2.png"
                  alt="Mango — query explorer"
                  width={1200}
                  height={800}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

          {/* Hone */}
          <div className="feature-card !p-8">
            <div className="flex items-center gap-4 mb-6">
              <Image
                src="/showcase/hone-icon.svg"
                alt="Hone"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <div>
                <h3 className="text-2xl font-bold">Hone</h3>
                <p className="text-slate-400">{t("honeTagline")}</p>
              </div>
              <div className="ml-auto flex gap-2">
                <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-3 py-1">
                  macOS
                </span>
                <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-3 py-1">
                  iOS
                </span>
                <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-3 py-1">
                  Web
                </span>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/5 shadow-2xl max-w-4xl mx-auto">
              <Image
                src="/showcase/hone-screenshot.png"
                alt="Hone — native AI code editor"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link
            href="/showcase"
            className="btn-secondary inline-flex items-center gap-2"
          >
            {t("viewAll")}
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
