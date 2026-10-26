import { getCollection, type CollectionEntry } from "astro:content";
import type { Locale } from "../i18n/index.ts";

export type PostEntry = CollectionEntry<"blog">;

export interface Post {
  slug: string;
  /** The entry to show for the requested locale (the English one when untranslated). */
  entry: PostEntry;
  /** True when the requested locale has no translation and English is shown. */
  isFallback: boolean;
  /** Locales that have their own file for this post. */
  locales: Locale[];
}

function splitId(id: string): { slug: string; locale: Locale } {
  const i = id.lastIndexOf("/");
  return { slug: id.slice(0, i), locale: id.slice(i + 1) as Locale };
}

/** All published posts grouped by slug, newest first. */
async function bySlug(): Promise<Map<string, Map<Locale, PostEntry>>> {
  const entries = await getCollection("blog", (e) => !e.data.draft);
  const groups = new Map<string, Map<Locale, PostEntry>>();
  for (const entry of entries) {
    const { slug, locale } = splitId(entry.id);
    if (!groups.has(slug)) groups.set(slug, new Map());
    groups.get(slug)!.set(locale, entry);
  }
  for (const [slug, group] of groups) {
    if (!group.has("en")) throw new Error(`Blog post "${slug}" has no English file (en.md or en.mdx).`);
  }
  return groups;
}

function resolve(slug: string, group: Map<Locale, PostEntry>, lang: Locale): Post {
  const own = group.get(lang);
  return { slug, entry: own ?? group.get("en")!, isFallback: !own, locales: [...group.keys()] };
}

/** Every post resolved for a locale, newest first. */
export async function getPosts(lang: Locale): Promise<Post[]> {
  const groups = await bySlug();
  return [...groups]
    .map(([slug, group]) => resolve(slug, group, lang))
    .sort((a, b) => b.entry.data.date.getTime() - a.entry.data.date.getTime());
}

export function formatPostDate(date: Date, lang: Locale, style: "short" | "long" = "long"): string {
  return new Intl.DateTimeFormat(lang, {
    year: "numeric",
    month: style === "long" ? "long" : "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
