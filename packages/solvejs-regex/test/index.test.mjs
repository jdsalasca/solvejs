import test from "node:test";
import assert from "node:assert/strict";
import {
  REGEX_PATTERNS,
  escapeRegex,
  literalRegex,
  testPattern,
  validateByName,
  validateWithPattern
} from "../dist/esm/index.js";

test("testPattern", () => {
  assert.equal(testPattern("ada@example.com", /^\S+@\S+\.\S+$/), true);
  assert.equal(testPattern("not-an-email", /^\S+@\S+\.\S+$/), false);
  assert.equal(testPattern("", /^$/), true, "an empty string can still match");
  assert.equal(testPattern("abc", /^abc$/), true);

  // The implementation resets lastIndex before testing, so a global regex is
  // not stateful across calls. Without that reset this would alternate.
  const global = /a/g;
  assert.equal(testPattern("a", global), true);
  assert.equal(testPattern("a", global), true);
  assert.equal(testPattern("a", global), true);

  assert.throws(() => testPattern("x", "not-a-regexp"), /RegExp instance/);
  assert.throws(() => testPattern("x", undefined), /RegExp instance/);
  assert.throws(() => testPattern("x", 123), /RegExp instance/);
});

test("validateWithPattern", () => {
  assert.equal(validateWithPattern("abc123", /^[a-z0-9]+$/), true);
  assert.equal(validateWithPattern("abc 123", /^[a-z0-9]+$/), false);
  assert.equal(validateWithPattern("  abc  ", /^[a-z0-9]+$/), false, "no trim by default");
  assert.equal(validateWithPattern("  abc  ", /^[a-z0-9]+$/, { trim: true }), true, "trim is opt-in");
  assert.equal(validateWithPattern("", /^$/, { trim: true }), true);
  assert.equal(validateWithPattern("   ", /^$/, { trim: true }), true, "trim makes it empty");
  assert.throws(() => validateWithPattern("x", "nope"), /RegExp instance/);
});

test("validateByName", () => {
  assert.equal(validateByName("ada@example.com", "email"), true);
  assert.equal(validateByName("+573001234567", "phoneE164"), true);
  assert.equal(validateByName("https://example.com", "urlHttp"), true);
  assert.equal(validateByName("#1a2b3c", "hexColor"), true);
  assert.equal(validateByName("ada_lovelace", "username"), true);
  assert.equal(validateByName("550e8400-e29b-41d4-a716-446655440000", "uuidV4"), true);
  assert.equal(validateByName("192.168.1.1", "ipv4"), true);
  assert.equal(validateByName("2026-02-07", "isoDate"), true);

  assert.equal(validateByName("ada@", "email"), false);
  assert.equal(validateByName("+0123456789", "phoneE164"), false, "a leading zero is rejected");
  assert.equal(validateByName("ftp://example.com", "urlHttp"), false);
  assert.equal(validateByName("#12345", "hexColor"), false);
  assert.equal(validateByName("ab", "username"), false, "shorter than 3 characters");
  assert.equal(validateByName("550e8400-e29b-11d4-a716-446655440000", "uuidV4"), false);
  assert.equal(validateByName("256.1.1.1", "ipv4"), false);
  assert.equal(validateByName("07/02/2026", "isoDate"), false);
  assert.equal(validateByName("", "email"), false);

  // An unknown name resolves to undefined and is rejected loudly rather than
  // silently returning true.
  assert.throws(() => validateByName("x", "notAPattern"), /RegExp instance/);

  for (const name of Object.keys(REGEX_PATTERNS)) {
    assert.equal(typeof validateByName("probe", name), "boolean", `${name} must return a boolean`);
  }
});

test("escapeRegex", () => {
  assert.equal(escapeRegex("a.b*c"), "a\\.b\\*c");
  assert.equal(escapeRegex("a+b?c^d$e{f}g(h)i|j[k]l\\m"), "a\\+b\\?c\\^d\\$e\\{f\\}g\\(h\\)i\\|j\\[k\\]l\\\\m");
  assert.equal(escapeRegex("plain"), "plain");
  assert.equal(escapeRegex(""), "");
  assert.equal(escapeRegex("a-b/c"), "a-b/c", "hyphen and slash need no escape outside a character class");

  for (const metachar of [".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\"]) {
    assert.equal(escapeRegex(metachar), `\\${metachar}`, `${metachar} must be escaped`);
  }

  for (const literal of ["a.b*c", "[a-z]", "1+1=2", "C:\\Users", "(x)", "a|b"]) {
    const escaped = escapeRegex(literal);
    assert.equal(new RegExp(`^${escaped}$`).test(literal), true, `round trip failed for ${literal}`);
    assert.equal(new RegExp(`^${escaped}$`).test("zzz"), false, `escaped form must not over-match ${literal}`);
  }
});

test("literalRegex", () => {
  assert.ok(literalRegex("abc") instanceof RegExp);
  assert.equal(literalRegex("a.b*c").test("a.b*c"), true, "the literal matches itself");
  assert.equal(literalRegex("a.b*c").test("axbxc"), false, "metacharacters do not act as wildcards");
  assert.equal(literalRegex("").test(""), true);
  assert.equal(literalRegex("a", "i").test("A"), true, "flags are forwarded");
  assert.equal(literalRegex("a").test("A"), false, "matching is case-sensitive by default");
  assert.equal(literalRegex("[x]").test("[x]"), true);
  assert.equal(literalRegex("[x]").test("x"), false, "a character class is matched literally");
  assert.equal(literalRegex("a.b", "g").test("a.b"), true);
});
