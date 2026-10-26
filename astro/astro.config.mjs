import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { locales } from "./src/i18n/locales.mjs";

// URLs match the previous Next.js site: every page lives under a locale prefix
// (`/en/…`) with a trailing slash, and `/` redirects to `/en/`.
export default defineConfig({
  site: "https://perryts.com",
  integrations: [mdx()],
  markdown: { shikiConfig: { theme: "github-dark-dimmed" } },
  trailingSlash: "always",
  build: { format: "directory" },
  i18n: {
    locales: [...locales],
    defaultLocale: "en",
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
});
