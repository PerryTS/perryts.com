import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

/** Canonical URL declared in a built HTML page, or null. */
export function canonicalOf(html) {
  return html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null;
}

export function sitemapXml(urls) {
  const escape = (s) => s.replace(/&/g, "&amp;");
  const body = [...new Set(urls)]
    .sort()
    .map((url) => `  <url><loc>${escape(url)}</loc></url>`)
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
          if (canonical && new URL(canonical).pathname === `/${pathname}`) urls.push(canonical);
        }
        await writeFile(join(outDir, "sitemap.xml"), sitemapXml(urls));
        logger.info(`sitemap.xml: ${urls.length} URLs`);
      },
    },
  };
}
