import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { locales } from "../src/i18n/locales.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const content = join(root, "src/content/blog");
const out = join(root, "out");
const slugs = readdirSync(content).filter((slug) => statSync(join(content, slug)).isDirectory());
const published = slugs.filter((slug) => !/^draft:\s*true\s*$/m.test(readFileSync(join(content, slug, "en.md"), "utf8")));
const sitemap = readFileSync(join(out, "sitemap.xml"), "utf8");
const decode = (s) => s.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'");
const targets = new Set();
let pages = 0;
const translated = (slug) => locales.filter((l) => ["md", "mdx"].some((ext) => existsSync(join(content, slug, `${l}.${ext}`))));

function read(path) {
  assert.ok(existsSync(path), `Missing file: ${path}`);
  return readFileSync(path, "utf8");
}

function paragraphs(markdown) {
  return markdown
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\/(?:en|de|es|fr|it|ja|ko|pt|th|tr|vi|id|zh-Hans)\//g, "/en/").trim())
    .filter((p) => p.length > 120 && !/^[|<]/.test(p));
}

for (const locale of locales) {
  const index = read(join(out, locale, "blog/index.html"));
  for (const slug of published) {
    const source = ["md", "mdx"].map((ext) => join(content, slug, `${locale}.${ext}`)).find(existsSync);
    const path = `/${locale}/blog/${slug}/`;
    const englishPath = `/en/blog/${slug}/`;
    if (!source) {
      // English-only post: every locale serves the English article behind a translation bar.
      assert.ok(locale !== "en", `Missing English source: ${slug}`);
      const html = read(join(out, path, "index.html"));
      assert.ok(index.includes(`href="${path}"`), `Post missing from ${locale} blog index: ${slug}`);
      assert.ok(html.includes(`<html lang="${locale}"`), `Wrong page language: ${path}`);
      assert.ok(/<div[^>]*class="prose[^\"]*"[^>]*lang="en"/.test(html), `English-only article not marked lang="en": ${path}`);
      assert.ok(html.includes('class="translation"'), `Missing translation bar: ${path}`);
      assert.ok(html.includes(`rel="canonical" href="https://perryts.com${englishPath}"`), `English-only post must canonicalize to English: ${path}`);
      assert.ok(!/<link[^>]*hreflang=/.test(html), `English-only post must not declare hreflang alternates: ${path}`);
      assert.ok(!sitemap.includes(`<loc>https://perryts.com${path}</loc>`), `Fallback article in sitemap: ${path}`);
      pages++;
      continue;
    }
    const markdown = read(source);
    assert.ok(!/ZXQ\w*QXZ/.test(markdown), `Translation placeholder in ${source}`);
    assert.ok(!/^draft:\s*true\s*$/m.test(markdown), `Translation is still a draft: ${source}`);
    if (locale !== "en") {
      const english = read(join(content, slug, "en.md"));
      for (const field of ["title", "excerpt"]) {
        const value = new RegExp(`^${field}: (.*)$`, "m");
        assert.notEqual(markdown.match(value)?.[1], english.match(value)?.[1], `Untranslated ${field}: ${source}`);
      }
      const englishParagraphs = new Set(paragraphs(english));
      assert.ok(!paragraphs(markdown).some((p) => englishParagraphs.has(p)), `Untranslated English paragraph: ${source}`);
    }
    const html = read(join(out, path, "index.html"));
    assert.ok(index.includes(`href="${path}"`), `Post missing from ${locale} blog index: ${slug}`);
    assert.ok(html.includes(`<html lang="${locale}"`), `Wrong page language: ${path}`);
    assert.ok(new RegExp(`<div[^>]*class="prose[^\"]*"[^>]*lang="${locale}"`).test(html), `Article falls back to another language: ${path}`);
    assert.ok(html.includes(`rel="canonical" href="https://perryts.com${path}"`), `Wrong canonical: ${path}`);
    assert.ok(sitemap.includes(`<loc>https://perryts.com${path}</loc>`), `Article missing from sitemap: ${path}`);
    const alternates = translated(slug);
    if (alternates.length === 1) assert.ok(!/<link[^>]*hreflang=/.test(html), `English-only post must not declare hreflang alternates: ${path}`);
    for (const alternate of locales) {
      const alternatePath = `/${alternate}/blog/${slug}/`;
      if (alternates.length > 1 && alternates.includes(alternate)) {
        assert.ok(html.includes(`hreflang="${alternate}" href="https://perryts.com${alternatePath}"`), `Missing language alternate ${alternate}: ${path}`);
      }
      assert.ok(html.includes(`href="${alternatePath}" hreflang="${alternate}"`), `Language switcher loses the article: ${path}`);
    }
    for (const match of html.matchAll(/\b(?:href|src|poster)="([^\"]+)"/g)) {
      const target = decode(match[1]);
      if (!target.startsWith("/") || target.startsWith("//")) continue;
      targets.add(target.split(/[?#]/)[0]);
    }
    pages++;
  }
}

for (const target of targets) {
  const path = join(out, decodeURIComponent(target));
  assert.ok([path, join(path, "index.html"), `${path}.html`].some((p) => existsSync(p) && statSync(p).isFile()), `Broken local link or media: ${target}`);
}

console.log(`Blog verified: ${published.length} posts × ${locales.length} languages = ${pages} articles, ${locales.length} indexes, and ${targets.size} local link/media targets.`);
