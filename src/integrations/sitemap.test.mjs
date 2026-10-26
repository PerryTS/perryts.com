import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalOf, publishedDateOf, sitemapXml } from "./sitemap.mjs";

test("canonicalOf reads the canonical link, or null when missing", () => {
  assert.equal(canonicalOf('<head><link rel="canonical" href="https://perryts.com/en/blog/"></head>'), "https://perryts.com/en/blog/");
  assert.equal(canonicalOf("<head></head>"), null);
});

test("sitemapXml lists each URL once, sorted, and escapes ampersands", () => {
  const xml = sitemapXml(["https://perryts.com/es/", "https://perryts.com/en/", "https://perryts.com/en/", "https://perryts.com/en/a&b/"]);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.deepEqual([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]), [
    "https://perryts.com/en/",
    "https://perryts.com/en/a&amp;b/",
    "https://perryts.com/es/",
  ]);
});

test("sitemapXml adds lastmod when an entry has one", () => {
  const xml = sitemapXml([{ url: "https://perryts.com/en/blog/a/", lastmod: "2026-08-12" }, "https://perryts.com/en/"]);
  assert.match(xml, /<loc>https:\/\/perryts.com\/en\/blog\/a\/<\/loc><lastmod>2026-08-12<\/lastmod>/);
  assert.match(xml, /<loc>https:\/\/perryts.com\/en\/<\/loc><\/url>/);
});

test("publishedDateOf reads the article date", () => {
  assert.equal(publishedDateOf('<meta property="article:published_time" content="2026-08-12T00:00:00.000Z">'), "2026-08-12");
  assert.equal(publishedDateOf("<head></head>"), null);
});
