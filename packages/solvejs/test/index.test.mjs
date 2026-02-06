import test from "node:test";
import assert from "node:assert/strict";
import { formatDate, toKebabCase } from "../dist/esm/index.js";

test("meta package re-exports symbols", () => {
  assert.equal(formatDate(new Date("2026-01-02T00:00:00.000Z"), "YYYY-MM-DD"), "2026-01-02");
  assert.equal(toKebabCase("Hello World"), "hello-world");
});
