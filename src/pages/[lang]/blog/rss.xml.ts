import type { APIRoute } from "astro";
import { messages } from "../../../i18n/messages.ts";
import { localePath, localeStaticPaths, type Locale } from "../../../i18n/index.ts";
import { getPosts } from "../../../lib/blog.ts";

export const getStaticPaths = localeStaticPaths;

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** RSS 2.0 feed per locale; untranslated posts appear in English, as on the blog index. */
export const GET: APIRoute = async ({ params, site }) => {
  const lang = params.lang as Locale;
  const posts = await getPosts(lang);
  const url = (path: string) => new URL(localePath(lang, path), site).toString();
  const items = posts.map(({ slug, entry }) => `
    <item>
      <title>${escape(entry.data.title)}</title>
      <link>${url(`blog/${slug}`)}</link>
      <guid>${url(`blog/${slug}`)}</guid>
      <pubDate>${entry.data.date.toUTCString()}</pubDate>
      <description>${escape(entry.data.excerpt)}</description>
    </item>`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Perry Blog</title>
    <link>${url("blog")}</link>
    <description>${escape(messages(lang).blog.metaDescription)}</description>
    <language>${lang}</language>${items.join("")}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
};
