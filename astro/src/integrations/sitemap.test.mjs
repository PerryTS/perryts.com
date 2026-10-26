import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalOf, sitemapXml } from "./sitemap.mjs";

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
