import { test } from "node:test";
import assert from "node:assert/strict";
import { localeFromId } from "./index.ts";

test("localeFromId restores the configured casing of lowercased content ids", () => {
  assert.equal(localeFromId("compiling-claude-code/zh-hans"), "zh-Hans");
  assert.equal(localeFromId("cranelift-to-llvm/de"), "de");
  assert.equal(localeFromId("post/xx"), undefined);
});
