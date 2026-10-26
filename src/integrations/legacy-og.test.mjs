import { test } from "node:test";
import assert from "node:assert/strict";
import { hadLegacyOgImage } from "./legacy-og.mjs";

test("matches the pages that served /opengraph-image on the Next.js site", () => {
  for (const p of ["", "en/", "zh-Hans/", "de/coop/", "es/compare/bun/", "ja/blog/cranelift-to-llvm/"]) {
    assert.equal(hadLegacyOgImage(p), true, p);
  }
});

test("leaves every other page alone", () => {
  for (const p of ["en/blog/", "en/compare/", "en/pricing/", "en/showcase/pry/", "404/", "xx/"]) {
    assert.equal(hadLegacyOgImage(p), false, p);
  }
});
