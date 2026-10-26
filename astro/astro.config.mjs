import { defineConfig } from "astro/config";
import { locales } from "./src/i18n/locales.mjs";

// URLs match the previous Next.js site: every page lives under a locale prefix
// (`/en/…`) with a trailing slash, and `/` redirects to `/en/`.
export default defineConfig({
  site: "https://perryts.com",
  trailingSlash: "always",
  build: { format: "directory" },
  i18n: {
    locales: [...locales],
    defaultLocale: "en",
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
});
