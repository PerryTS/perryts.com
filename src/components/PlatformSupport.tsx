import { getTranslations } from "next-intl/server";
import { PLATFORM_FACTS, PRODUCT_FACTS } from "@/lib/product-facts";

const statusStyles = {
  broad: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  core: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  preview: "text-violet-300 bg-violet-500/10 border-violet-500/20",
} as const;

export async function PlatformSupport() {
  const t = await getTranslations("platforms");

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t.rich("title", {
              gradient: (chunks) => <span className="gradient-text">{chunks}</span>,
            })}
          </h2>
          <p className="text-lg text-slate-400 max-w-3xl mx-auto">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {PLATFORM_FACTS.map((platform) => {
            const note =
              platform.name === "Web / WASM"
                ? t("webAliasNote")
                : platform.name === "HarmonyOS"
                  ? t("harmonyPreviewNote")
                  : undefined;

            return (
            <div key={platform.name} className="feature-card text-center flex flex-col items-center gap-3">
              <div className="w-11 h-11 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-sm font-bold text-perry-400">
                {platform.name.slice(0, 2)}
              </div>
              <div>
                <h3 className="font-semibold text-white">{platform.name}</h3>
                <p className="text-sm text-slate-500">{platform.framework}</p>
              </div>
              <span className={`text-xs font-medium border rounded-full px-2 py-1 ${statusStyles[platform.status]}`}>
                {t(platform.status)}
              </span>
              {note && <p className="text-[11px] leading-snug text-slate-600">{note}</p>}
            </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          {t("countNote", { count: PRODUCT_FACTS.documentedTargetCount })}{" "}
          <a href={PRODUCT_FACTS.platformsUrl} target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-white underline underline-offset-4">
            {t("platformGuide")}
          </a>
        </p>
      </div>
    </section>
  );
}
