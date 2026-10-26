import { copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { locales } from "../i18n/locales.mjs";

const locale = locales.join("|");
// Routes that had a generated `opengraph-image` on the Next.js site.
const legacy = new RegExp(`^(|(${locale})/|(${locale})/coop/|(${locale})/compare/[^/]+/|(${locale})/blog/[^/]+/)$`);

/** True when the old site served `<pathname>opengraph-image` for this page. */
export function hadLegacyOgImage(pathname) {
  return legacy.test(pathname);
}

/**
 * Keeps the old `…/opengraph-image` URLs alive (link previews cached elsewhere still point at them)
 * by writing the site-wide preview there. The server already serves that name as image/png.
 */
export default function legacyOgImages() {
  return {
    name: "perry-legacy-og",
    hooks: {
      "astro:build:done": async ({ dir, pages, logger }) => {
        const outDir = fileURLToPath(dir);
        const source = join(outDir, "og.png");
        const targets = pages.map((p) => p.pathname).filter(hadLegacyOgImage);
        await Promise.all(targets.map((p) => copyFile(source, join(outDir, p, "opengraph-image"))));
        logger.info(`opengraph-image: ${targets.length} legacy URLs`);
      },
    },
  };
}
