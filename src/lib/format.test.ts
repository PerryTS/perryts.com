import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCompact } from "./format.ts";

test("formatCompact rounds down to one decimal and keeps small values whole", () => {
  assert.equal(formatCompact(5047, "en"), "5.0k");
  assert.equal(formatCompact(5099, "en"), "5.0k");
  assert.equal(formatCompact(12345, "es"), "12,3k");
  assert.equal(formatCompact(182, "en"), "182");
});

