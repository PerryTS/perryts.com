import { test } from "node:test";
import assert from "node:assert/strict";
import { richText } from "./rich-text.ts";

const links = { bunLink: "/es/compare/bun/", discussionsLink: "https://github.com/PerryTS/perry/discussions" };

test("turns known tags into links and escapes the rest", () => {
  assert.equal(
    richText("Bun & Deno <bunLink>compared</bunLink> a < b", links),
    'Bun &amp; Deno <a href="/es/compare/bun/">compared</a> a &lt; b',
  );
});

test("unknown tags keep their text without markup", () => {
  assert.equal(richText("see <fooLink>docs</fooLink>", links), "see docs");
});

