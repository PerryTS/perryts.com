import en from "./locales/en.json";
import type { Locale } from "./index.ts";

/**
 * UI text lives in one JSON file per locale (src/i18n/locales/<locale>.json), grouped by page or
 * section. English is complete; any key a locale lacks falls back to English.
 */
export type Messages = typeof en;

const files = import.meta.glob<Record<string, unknown>>("./locales/*.json", { eager: true, import: "default" });
const cache = new Map<Locale, Messages>();

function merge(base: unknown, override: unknown): unknown {
  if (override === undefined) return base;
  if (Array.isArray(base) || Array.isArray(override) || typeof base !== "object" || base === null) return override;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(override as Record<string, unknown>)) out[k] = merge(out[k], v);
  return out;
}

export function messages(lang: Locale): Messages {
  let m = cache.get(lang);
  if (!m) {
    m = merge(en, files[`./locales/${lang}.json`]) as Messages;
    cache.set(lang, m);
  }
  return m;
}

/** Replaces {name} placeholders: fill("{n} posts", { n: 3 }) → "3 posts". */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/** Picks the plural form for n ({ one: "{n} post", other: "{n} posts" }) and fills {n}. */
export function plural(lang: Locale, forms: { one?: string; other: string }, n: number): string {
  const rule = new Intl.PluralRules(lang).select(n);
  return fill((rule === "one" && forms.one) || forms.other, { n });
}

/** fill() applied to every string inside a messages subtree (arrays and nested objects included). */
export function fillDeep<T>(value: T, values: Record<string, string | number>): T {
  if (typeof value === "string") return fill(value, values) as T;
  if (Array.isArray(value)) return value.map((v) => fillDeep(v, values)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillDeep(v, values)])) as T;
  }
  return value;
}
