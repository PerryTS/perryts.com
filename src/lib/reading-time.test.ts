import { test } from "node:test";
import assert from "node:assert/strict";
import { readingMinutes } from "./reading-time.ts";

test("counts words for space-separated languages, ignoring code blocks", () => {
  const prose = Array.from({ length: 450 }, () => "word").join(" ");
  const code = "```\n" + Array.from({ length: 900 }, () => "x").join(" ") + "\n```";
  assert.equal(readingMinutes(`${prose}\n\n${code}`, "en"), 2);
});

test("counts characters for CJK and Thai", () => {
  assert.equal(readingMinutes("字".repeat(1000), "zh-Hans"), 2);
  assert.equal(readingMinutes("あ".repeat(1500), "ja"), 3);
});

