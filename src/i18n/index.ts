import { locales } from "./locales.mjs";

export { locales };
export type Locale = (typeof locales)[number];

/**
 * Per-locale copy. English is required; other locales are optional and fall back
 * to English through `pick`, so untranslated strings never render empty.
 */
export type Copy<T> = { en: T } & Partial<Record<Locale, T>>;

export function pick<T>(copy: Copy<T>, lang: Locale): T {
  return copy[lang] ?? copy.en;
}

export function isLocale(value: string | undefined): value is Locale {
  return (locales as readonly string[]).includes(value ?? "");
}

export const localeLabels: Record<Locale, { short: string; name: string }> = {
  en: { short: "EN", name: "English" },
  de: { short: "DE", name: "Deutsch" },
  es: { short: "ES", name: "Español" },
  fr: { short: "FR", name: "Français" },
  it: { short: "IT", name: "Italiano" },
  ja: { short: "JA", name: "日本語" },
  ko: { short: "KO", name: "한국어" },
  pt: { short: "PT", name: "Português" },
  th: { short: "TH", name: "ไทย" },
  tr: { short: "TR", name: "Türkçe" },
  vi: { short: "VI", name: "Tiếng Việt" },
  id: { short: "ID", name: "Bahasa Indonesia" },
  "zh-Hans": { short: "中文", name: "简体中文" },
};

/** Site path for a locale, always prefixed and with a trailing slash: ("es", "blog") → "/es/blog/". */
export function localePath(lang: Locale, path = ""): string {
  const clean = path.replace(/^\/+|\/+$/g, "");
  return clean ? `/${lang}/${clean}/` : `/${lang}/`;
}

/** `getStaticPaths` result for pages generated once per locale. */
export function localeStaticPaths() {
  return locales.map((lang) => ({ params: { lang } }));
}

/**
 * Locale of a content entry id like "<slug>/<locale>". Astro lowercases ids ("zh-Hans" → "zh-hans"),
 * so the configured casing is restored here; unknown locales return undefined.
 */
export function localeFromId(id: string): Locale | undefined {
  const raw = id.slice(id.lastIndexOf("/") + 1).toLowerCase();
  return locales.find((l) => l.toLowerCase() === raw);
}
