import type { Locale } from "../i18n/index.ts";

/** 7173 → "7,173" (en) / "7173" (es), following each locale's grouping rules. */
export function formatInteger(value: number, lang: Locale): string {
  return new Intl.NumberFormat(lang, { maximumFractionDigits: 0 }).format(value);
}

/** 5047 → "5.0k" (en) / "5,0k" (es). Values under 1000 stay as integers. */
export function formatCompact(value: number, lang: Locale): string {
  if (value < 1000) return formatInteger(value, lang);
  const thousands = new Intl.NumberFormat(lang, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.floor(value / 100) / 10);
  return `${thousands}k`;
}

/** Average per day, rounded: (1467, 30) → 49. */
export function perDay(total: number, days: number): number {
  return days > 0 ? Math.round(total / days) : 0;
}
