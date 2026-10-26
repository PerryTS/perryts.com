import { test } from "node:test";
import assert from "node:assert/strict";
import { metaDescription, pageTitle } from "./seo.ts";

test("pageTitle appends the brand only while the result stays within 60 characters", () => {
  assert.equal(pageTitle("Blog"), "Blog — Perry");
  const long = "Building a GC for a Native TypeScript Compiler: Decisions";
  assert.equal(pageTitle(long), long);
  assert.equal(pageTitle("Perry — anything", true), "Perry — anything");
});

test("metaDescription keeps short text and trims long text at a word boundary", () => {
  assert.equal(metaDescription("Short and sweet."), "Short and sweet.");
  const long = "word ".repeat(60).trim();
  const out = metaDescription(long);
  assert.ok(out.length <= 160, `length ${out.length}`);
  assert.ok(out.endsWith("…"));
  assert.ok(!out.includes("wor…"), "no cut inside a word");
});

test("metaDescription trims CJK text without spaces by characters", () => {
  const out = metaDescription("字".repeat(300));
  assert.ok(out.length <= 160 && out.endsWith("…"));
});

test("pageTitle does not repeat the brand when the title already names Perry", () => {
  assert.equal(pageTitle("Perry Newsletter"), "Perry Newsletter");
  assert.equal(pageTitle("Perry 소개"), "Perry 소개");
});
