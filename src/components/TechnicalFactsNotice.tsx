import { getLocale, getTranslations } from "next-intl/server";

export async function TechnicalFactsNotice() {
  const locale = await getLocale();
  if (locale === "en") return null;

  const t = await getTranslations("hero");
  return (
    <p className="mx-auto mb-8 max-w-3xl rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
      {t("factsLanguageNotice")}
    </p>
  );
}
