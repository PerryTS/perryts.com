import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

/** Canonical URL declared in a built HTML page, or null. */
export function canonicalOf(html) {
  return html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null;
}

/** Publication date declared by an article page (article:published_time), as YYYY-MM-DD, or null. */
export function publishedDateOf(html) {
  return html.match(/<meta property="article:published_time" content="(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}

/** Entries are URLs or { url, lastmod } objects; duplicates are dropped and output is sorted. */
export function sitemapXml(entries) {
  const escape = (s) => s.replace(/&/g, "&amp;");
  const byUrl = new Map(entries.map((e) => (typeof e === "string" ? [e, null] : [e.url, e.lastmod ?? null])));
  const body = [...byUrl]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([url, lastmod]) => `  <url><loc>${escape(url)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/**
 * Writes /sitemap.xml after the build with every page whose canonical points at itself.
 * Duplicates (English fallbacks under other locales, English-only pages under every prefix)
 * canonicalize elsewhere, so they are left out automatically.
 */
export default function sitemap() {
  return {
    name: "perry-sitemap",
    hooks: {
      "astro:build:done": async ({ dir, pages, logger }) => {
        const outDir = fileURLToPath(dir);
        const urls = [];
        for (const { pathname } of pages) {
          if (!pathname || pathname === "404/") continue;
          const html = await readFile(join(outDir, pathname, "index.html"), "utf8").catch(() => null);
          const canonical = html && canonicalOf(html);
          if (canonical && new URL(canonical).pathname === `/${pathname}`) urls.push({ url: canonical, lastmod: publishedDateOf(html) });
        }
        await writeFile(join(outDir, "sitemap.xml"), sitemapXml(urls));
        logger.info(`sitemap.xml: ${urls.length} URLs`);
      },
    },
  };
}
