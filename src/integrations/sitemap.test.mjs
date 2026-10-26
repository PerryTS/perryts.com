import { test } from "node:test";
import assert from "node:assert/strict";
import { sitemapXml } from "./sitemap.mjs";

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

