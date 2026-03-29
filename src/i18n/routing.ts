export const locales = [
  "en",
  "de",
  "es",
  "fr",
  "it",
  "ja",
  "ko",
  "pt",
  "th",
  "tr",
  "vi",
  "id",
  "zh-Hans",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  pt: "Português",
  th: "ไทย",
  tr: "Türkçe",
  vi: "Tiếng Việt",
  id: "Indonesia",
  "zh-Hans": "中文",
};
