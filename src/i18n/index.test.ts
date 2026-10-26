import { test } from "node:test";
import assert from "node:assert/strict";
import { localePath, localeFromId } from "./index.ts";

test("localePath always prefixes the locale and ends with a slash", () => {
  assert.equal(localePath("en"), "/en/");
  assert.equal(localePath("zh-Hans", "blog"), "/zh-Hans/blog/");
  assert.equal(localePath("es", "/blog/gc-decisions-surprises/"), "/es/blog/gc-decisions-surprises/");
});

test("localeFromId restores the configured casing of lowercased content ids", () => {
  assert.equal(localeFromId("compiling-claude-code/zh-hans"), "zh-Hans");
  assert.equal(localeFromId("cranelift-to-llvm/de"), "de");
  assert.equal(localeFromId("post/xx"), undefined);
});
