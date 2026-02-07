import test from "node:test";
import assert from "node:assert/strict";
import { REGEX_PATTERNS, escapeRegex, validateByName, validateWithPattern } from "../dist/esm/index.js";

test("regex helpers", () => {
  assert.equal(validateByName("user@example.com", "email"), true);
  assert.equal(validateByName("not-email", "email"), false);
  assert.equal(validateWithPattern(" #ffaa00 ", REGEX_PATTERNS.hexColor, { trim: true }), true);
  assert.equal(validateByName("550e8400-e29b-41d4-a716-446655440000", "uuidV4"), true);
  assert.equal(validateByName("127.0.0.1", "ipv4"), true);
  assert.equal(validateByName("2026-02-07", "isoDate"), true);
  assert.equal(escapeRegex("a+b?"), "a\\+b\\?");
});
