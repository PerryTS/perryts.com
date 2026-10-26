import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCompact, formatInteger, perDay } from "./format.ts";

test("formatInteger follows locale grouping", () => {
  assert.equal(formatInteger(7173, "en"), "7,173");
  assert.equal(formatInteger(7173, "es"), "7173");
  assert.equal(formatInteger(17173, "es"), "17.173");
});

test("formatCompact rounds down to one decimal and keeps small values whole", () => {
  assert.equal(formatCompact(5047, "en"), "5.0k");
  assert.equal(formatCompact(5099, "en"), "5.0k");
  assert.equal(formatCompact(12345, "es"), "12,3k");
  assert.equal(formatCompact(182, "en"), "182");
});

test("perDay averages and guards against zero days", () => {
  assert.equal(perDay(1467, 30), 49);
  assert.equal(perDay(10, 0), 0);
});
