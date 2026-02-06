import test from "node:test";
import assert from "node:assert/strict";
import { REGEX_PATTERNS, validateByName, validateWithPattern } from "../dist/esm/index.js";

test("regex helpers", () => {
  assert.equal(validateByName("user@example.com", "email"), true);
  assert.equal(validateByName("not-email", "email"), false);
  assert.equal(validateWithPattern(" #ffaa00 ", REGEX_PATTERNS.hexColor, { trim: true }), true);
});
