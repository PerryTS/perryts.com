import type { Locale } from "../i18n/index.ts";

const WORDS_PER_MINUTE = 225;
// Languages written without spaces between words: count characters instead.
const CHARS_PER_MINUTE: Partial<Record<Locale, number>> = { ja: 500, "zh-Hans": 500, ko: 500, th: 600 };

/** Estimated reading time of a Markdown body. Code blocks are skipped; the result is at least 1. */
export function readingMinutes(markdown: string, lang: Locale): number {
  const text = markdown.replace(/^(```|~~~)[\s\S]*?^\1\s*$/gm, "");
  const cpm = CHARS_PER_MINUTE[lang];
  const minutes = cpm
    ? text.replace(/\s+/g, "").length / cpm
    : text.split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE;
  return Math.max(1, Math.round(minutes));
}
