import { test } from "node:test";
import assert from "node:assert/strict";
import { localePath, pick, isLocale } from "./index.ts";

test("localePath always prefixes the locale and ends with a slash", () => {
  assert.equal(localePath("en"), "/en/");
  assert.equal(localePath("zh-Hans", "blog"), "/zh-Hans/blog/");
  assert.equal(localePath("es", "/blog/gc-decisions-surprises/"), "/es/blog/gc-decisions-surprises/");
});

test("pick falls back to English when a locale has no copy", () => {
  const copy = { en: "Hello", es: "Hola" };
  assert.equal(pick(copy, "es"), "Hola");
  assert.equal(pick(copy, "ja"), "Hello");
});

test("isLocale only accepts configured locales", () => {
  assert.equal(isLocale("zh-Hans"), true);
  assert.equal(isLocale("zh"), false);
  assert.equal(isLocale(undefined), false);
});

test("localeFromId restores the configured casing of lowercased content ids", async () => {
  const { localeFromId } = await import("./index.ts");
  assert.equal(localeFromId("compiling-claude-code/zh-hans"), "zh-Hans");
  assert.equal(localeFromId("cranelift-to-llvm/de"), "de");
  assert.equal(localeFromId("post/xx"), undefined);
});
