export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];

/** Per-locale copy. Sections keep their own `Copy<…>` object next to the markup. */
export type Copy<T> = Record<Locale, T>;

export const localeLabels: Record<Locale, { short: string; name: string }> = {
  en: { short: "EN", name: "English" },
  es: { short: "ES", name: "Español" },
};

/** Path on this site for a locale. English has no prefix. */
export function localePath(lang: Locale, path = ""): string {
  const clean = path.replace(/^\/+/, "");
  return lang === "en" ? `/${clean}` : `/${lang}/${clean}`;
}
