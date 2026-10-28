const BRAND = " — Perry";
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;

export const DEFAULT_SOCIAL_IMAGE = "/og.png?v=typescript-javascript";

/** Beta serves its own preview image while canonical URLs remain on production. */
export function socialImageUrl(image: string, site: URL | undefined): URL {
  return new URL(image, import.meta.env.SOCIAL_IMAGE_ORIGIN || site);
}

/**
 * "<title> — Perry". The brand is dropped when the title already names Perry or when it would push
 * the title past what search results show.
 */
export function pageTitle(title: string, absolute = false): string {
  if (absolute || /\bPerry\b/.test(title)) return title;
  return (title + BRAND).length <= TITLE_MAX ? title + BRAND : title;
}

/** Meta description capped at ~160 characters, cut at the last whole word (or character for CJK). */
export function metaDescription(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= DESCRIPTION_MAX) return clean;
  const cut = clean.slice(0, DESCRIPTION_MAX - 1);
  const space = cut.lastIndexOf(" ");
  const base = space > DESCRIPTION_MAX * 0.6 ? cut.slice(0, space) : cut;
  return base.replace(/[\s,.;:—–-]+$/, "") + "…";
}
