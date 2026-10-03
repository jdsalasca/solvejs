import test from "node:test";
import assert from "node:assert/strict";
import {
  capitalize,
  mask,
  normalizeWhitespace,
  slugify,
  stripHtml,
  toCamelCase,
  toKebabCase,
  toTitleCase,
  truncate
} from "../dist/esm/index.js";

// Unicode combining diacritical marks, U+0300 to U+036F. A slug must never
// contain one, because it renders as a stray mark on an otherwise empty base.
const COMBINING_MARKS = /[\u0300-\u036f]/u;

test("toKebabCase", () => {
  assert.equal(toKebabCase("Hello World Foo"), "hello-world-foo");
  assert.equal(toKebabCase("hello_world-foo bar"), "hello-world-foo-bar");
  assert.equal(toKebabCase(""), "");
  assert.equal(toKebabCase("   "), "");
  assert.equal(toKebabCase("A"), "a");
  assert.equal(toKebabCase("Café Ünïcode"), "cafe-unicode", "accents are folded, marks are dropped");
  assert.equal(toKebabCase("日本語"), "", "scripts with no ASCII letters reduce to an empty string");
  assert.equal(toKebabCase("👋 Hi"), "hi", "emoji are dropped");
  assert.equal(toKebabCase("a--b"), "a-b", "runs of separators collapse into one");
});

test("toCamelCase", () => {
  assert.equal(toCamelCase("hello world-foo bar"), "helloWorldFooBar");
  assert.equal(toCamelCase("Hello World"), "helloWorld");
  assert.equal(toCamelCase(""), "");
  assert.equal(toCamelCase("   "), "");
assert.equal(toCamelCase("already"), "already");
assert.equal(
    toCamelCase("parseHTTPResponse"),
    "parseHttpresponse",
    "acronym runs are not split, so HTTPResponse becomes Httpresponse"
  );
assert.equal(
  toCamelCase("HTTPServer"),
  "httpserver",
  "a leading acronym is not split, because the split needs a lowercase char before the uppercase one"
);
assert.equal(toCamelCase(toKebabCase("hello world")), "helloWorld", "round trip through kebab is stable");
});

test("capitalize", () => {
  assert.equal(capitalize("hello world"), "Hello world");
  assert.equal(capitalize("hello"), "Hello");
  assert.equal(capitalize(""), "");
  assert.equal(capitalize("  "), "  ", "whitespace-only input is left untouched");
  assert.equal(capitalize("HELLO"), "HELLO", "an already capitalised word is not lowercased");
});

test("normalizeWhitespace", () => {
  assert.equal(normalizeWhitespace("  a   b  "), "a b");
  assert.equal(normalizeWhitespace("a\n\nb\tc"), "a b c", "newlines and tabs collapse to single spaces");
  assert.equal(normalizeWhitespace(""), "");
  assert.equal(normalizeWhitespace("   "), "");
  assert.equal(normalizeWhitespace("single"), "single");
});

test("truncate", () => {
  assert.equal(truncate("abcdef", 10), "abcdef", "a value shorter than the limit is unchanged");
  assert.equal(truncate("abcdef", 6), "abcdef", "an equal length is unchanged");
  assert.equal(truncate("abcdef", 5), "ab...");
  assert.equal(truncate("abcdef", 3), "...");
  assert.equal(truncate("abcdef", 0), "", "a zero limit yields an empty string, not the whole value");
  assert.equal(truncate("abcdef", 1), ".", "a limit below the suffix length returns a truncated suffix");
  assert.equal(truncate("abcdef", 2), "..");
  assert.equal(truncate("abcdef", 5, "~"), "abcd~", "a custom suffix is honoured");
  assert.equal(truncate("", 5), "");
  assert.throws(() => truncate("abcdef", -1), /non-negative integer/);
  assert.throws(() => truncate("abcdef", 2.5), /non-negative integer/);
});

test("slugify", () => {
  assert.equal(slugify("Build Better JS Apps"), "build-better-js-apps");
  assert.equal(slugify("Hello_World-Test"), "hello-world-test", "separators normalise to a hyphen");
  assert.equal(slugify("  Hello   World  "), "hello-world");
  assert.equal(slugify("A"), "a");
  assert.equal(slugify(""), "");
  assert.equal(slugify("---"), "", "a separator-only value yields an empty slug");
  assert.equal(slugify("SolveJS"), "solve-js", "a lowercase-to-uppercase boundary splits into a new word");
  assert.equal(
    slugify("HTTPServer"),
    "httpserver",
    "a leading acronym stays glued, matching the toKebabCase split rule"
  );

  assert.equal(slugify("Café Ünïcode"), "cafe-unicode");
  assert.equal(slugify("ñoño 日本"), "nono");
  assert.equal(slugify("👋 Hello World"), "hello-world", "emoji are stripped, not encoded");

  for (const input of ["Café Ünïcode", "ñoño", "Àéîõü", "Ω≈ç√"]) {
    const slug = slugify(input);
    assert.equal(COMBINING_MARKS.test(slug), false, `orphan combining mark in ${JSON.stringify(slug)}`);
    assert.equal(slug, slug.normalize("NFC"), `slug is not normalised: ${JSON.stringify(slug)}`);
  }
});

test("stripHtml", () => {
  assert.equal(stripHtml("<p>hi<b>there</b></p>"), "hithere");
  assert.equal(stripHtml("plain"), "plain");
  assert.equal(stripHtml(""), "");
  assert.equal(stripHtml("   "), "   ");
  assert.equal(stripHtml("<script>alert(1)</script>"), "alert(1)", "tags are removed, content is kept");
});

test("toTitleCase", () => {
  assert.equal(toTitleCase("the quick brown fox"), "The Quick Brown Fox");
  assert.equal(toTitleCase("hello"), "Hello");
  assert.equal(toTitleCase(""), "");
  assert.equal(toTitleCase("   "), "");
  assert.equal(toTitleCase("a  b   c"), "A B C", "runs of spaces do not create empty words");
});

test("mask", () => {
  assert.equal(mask("4111111111111111"), "************1111");
  assert.equal(mask("4111111111111111", 4), "************1111");
  assert.equal(mask("1234567890", 4, "#"), "######7890", "a custom mask character is honoured");
  assert.equal(mask("1234567890", 0), "**********", "visibleEnd 0 masks everything");
  assert.equal(mask("1234567890", 10), "1234567890", "visibleEnd equal to the length leaves it visible");
  assert.equal(mask("1234567890", 20), "1234567890", "an out-of-range visibleEnd is a no-op");
  assert.equal(mask("1234567890", 3), "*******890");
  assert.equal(mask(""), "");
  assert.throws(() => mask("123", -1), /non-negative integer/);
});
