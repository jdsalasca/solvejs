import test from "node:test";
import assert from "node:assert/strict";
import {
  UrlError,
  buildUrl,
  getUrlParam,
  joinUrl,
  omitQuery,
  parseQuery,
  replacePathParam,
  stringifyQuery,
  withQuery
} from "../dist/esm/index.js";

test("buildUrl", () => {
  assert.equal(buildUrl("https://example.com"), "https://example.com/");
  assert.equal(buildUrl("https://example.com/base"), "https://example.com/base");
  assert.equal(buildUrl("https://example.com", { path: "users" }), "https://example.com/users");
  assert.equal(buildUrl("https://example.com/base/", { path: "/users" }), "https://example.com/base/users");
  assert.equal(buildUrl("https://example.com", { query: { a: 1 } }), "https://example.com/?a=1");
  assert.equal(
    buildUrl("https://example.com", { path: "u", query: { a: 1 }, hash: "top" }),
    "https://example.com/u?a=1#top"
  );
  assert.equal(buildUrl("https://example.com", { path: "users", query: {}, hash: "" }), "https://example.com/users");
  assert.equal(
    buildUrl("https://example.com", { query: { tag: ["a", "b"] } }),
    "https://example.com/?tag=a&tag=b",
    "an array value repeats the key"
  );
  assert.equal(
    buildUrl("https://example.com", { query: { skip: null } }),
    "https://example.com/",
    "null and undefined are dropped rather than stringified"
  );
  assert.equal(
    buildUrl("https://example.com", { query: { flag: false, zero: 0 } }),
    "https://example.com/?flag=false&zero=0",
    "false and 0 are kept, not treated as absent"
  );

  assert.throws(() => buildUrl("/relative/path"), (error) => error instanceof UrlError && error.code === "URL_NOT_ABSOLUTE");
  assert.throws(() => buildUrl("example.com"), (error) => error.code === "URL_NOT_ABSOLUTE");
  assert.throws(() => buildUrl("https://"), (error) => error.code === "URL_INVALID_BASE");
  assert.throws(() => buildUrl("not a url at all"), (error) => error.code === "URL_NOT_ABSOLUTE");
});

test("joinUrl", () => {
  assert.equal(joinUrl("https://example.com", "users"), "https://example.com/users");
  assert.equal(joinUrl("https://example.com/", "/users"), "https://example.com/users");
  assert.equal(joinUrl("https://example.com/", "users", "42"), "https://example.com/users/42");
  assert.equal(joinUrl("https://example.com", ""), "https://example.com/", "empty segments are ignored");
  assert.equal(joinUrl("https://example.com", "a//b"), "https://example.com/a/b", "inner slashes collapse");
  assert.equal(joinUrl("https://example.com"), "https://example.com/");
});

test("stringifyQuery", () => {
  assert.equal(stringifyQuery({}), "");
  assert.equal(stringifyQuery({ a: 1 }), "a=1");
  assert.equal(stringifyQuery({ b: 2, a: 1 }), "a=1&b=2", "keys are sorted for deterministic output");
  assert.equal(stringifyQuery({ a: "x y" }), "a=x+y", "space encodes as + per x-www-form-urlencoded");
  assert.equal(stringifyQuery({ tag: ["a", "b"] }), "tag=a&tag=b");
  assert.equal(stringifyQuery({ a: null, b: undefined }), "", "null and undefined are dropped");
  assert.equal(stringifyQuery({ a: false }), "a=false");
  assert.equal(
    stringifyQuery({ b: 2, a: 1 }),
    stringifyQuery({ a: 1, b: 2 }),
    "insertion order does not change the result, so it is safe as a cache key"
  );
});

test("parseQuery", () => {
  assert.deepEqual(parseQuery(""), {});
  assert.deepEqual(parseQuery("?"), {});
  assert.deepEqual(parseQuery("?a=1&b=2"), { a: "1", b: "2" });
  assert.deepEqual(parseQuery("a=1&b=2"), { a: "1", b: "2" }, "a leading ? is optional");
  assert.deepEqual(parseQuery("?q=hello+world"), { q: "hello world" }, "+ decodes to a space");
  assert.deepEqual(parseQuery("?q=hello%20world"), { q: "hello world" });
  assert.deepEqual(parseQuery("?a=1&a=2"), { a: ["1", "2"] }, "a repeated key becomes an array");
  assert.deepEqual(parseQuery("?a=1&a=2&a=3"), { a: ["1", "2", "3"] });
  assert.deepEqual(parseQuery("?flag"), { flag: "" }, "a key with no value is an empty string");
  assert.deepEqual(parseQuery("?a=%E2%9C%93"), { a: "\u2713" }, "percent-encoded UTF-8 decodes");
  assert.deepEqual(parseQuery("?a=%ZZ"), { a: "%ZZ" }, "malformed encoding does not throw");
  assert.deepEqual(parseQuery("?a=1&&b=2"), { a: "1", b: "2" }, "empty pairs are skipped");
});

test("withQuery", () => {
  assert.equal(
    withQuery("https://example.com/search", { q: "shoes", page: 2 }),
    "https://example.com/search?page=2&q=shoes",
    "keys are sorted, so insertion order does not leak into the output"
  );
  assert.equal(
    withQuery("https://example.com/search?page=1", { page: 2 }),
    "https://example.com/search?page=2",
    "a given key replaces the existing value"
  );
  assert.equal(
    withQuery("https://example.com/search?keep=1", { add: 2 }),
    "https://example.com/search?add=2&keep=1",
    "unsupplied keys are preserved"
  );
  assert.equal(
    withQuery("https://example.com", {}),
    "https://example.com/",
    "an empty query leaves the input semantically unchanged"
  );
  assert.equal(
    withQuery("https://example.com/x#frag", { a: 1 }),
    "https://example.com/x?a=1#frag",
    "the fragment stays at the end"
  );
  assert.throws(() => withQuery("/relative", { a: 1 }), (error) => error.code === "URL_NOT_ABSOLUTE");
});

test("omitQuery", () => {
  assert.equal(omitQuery("https://example.com/s?a=1&b=2&c=3", ["b"]), "https://example.com/s?a=1&c=3");
  assert.equal(omitQuery("https://example.com/s?a=1", ["a"]), "https://example.com/s", "all keys are removable");
  assert.equal(
    omitQuery("https://example.com/s?a=1", ["missing"]),
    "https://example.com/s?a=1",
    "an absent key is a no-op"
  );
  assert.equal(omitQuery("https://example.com/s?token=secret", ["token"]), "https://example.com/s", "useful for stripping secrets");
  assert.throws(() => omitQuery("/relative", ["a"]), (error) => error.code === "URL_NOT_ABSOLUTE");
});

test("getUrlParam", () => {
  assert.equal(getUrlParam("https://example.com/s?page=2", "page"), "2");
  assert.equal(getUrlParam("https://example.com/s?a=1&tag=x&tag=y", "tag"), "x", "a repeated key returns the first value");
  assert.equal(getUrlParam("https://example.com/s?a=1", "missing"), null);
  assert.equal(getUrlParam("https://example.com/s", "page"), null);
  assert.equal(getUrlParam("https://example.com/s?page=", "page"), "", "an empty value is not null");
  assert.equal(getUrlParam("https://example.com/s?a=hello%20world", "a"), "hello world", "the value is decoded");
});

test("replacePathParam", () => {
  assert.equal(replacePathParam("/users/:id", "id", "42"), "/users/42");
  assert.equal(replacePathParam("/users/:id/posts/:postId", "postId", "7"), "/users/:id/posts/7");
  assert.equal(replacePathParam("/users/:id", "id", "a b"), "/users/a%20b", "the value is encoded");
  assert.equal(replacePathParam("/users/:id", "id", "a/b"), "/users/a%2Fb", "a slash in the value is encoded");
  assert.equal(replacePathParam("/users/:id", "missing", "1"), "/users/:id", "an absent parameter is a no-op");
  assert.equal(
    replacePathParam("/users/:id", "id", ""),
    "/users/",
    "an empty value leaves a trailing slash rather than the placeholder"
  );
  assert.equal(replacePathParam("/users", "id", "1"), "/users");

  assert.throws(
    () => replacePathParam("/users", "id", "1", { required: true }),
    (error) => error instanceof UrlError && error.code === "URL_PATH_PARAM_MISSING"
  );
});

test("UrlError carries a stable code and context", () => {
  const error = new UrlError("URL_NOT_ABSOLUTE", "Input must be an absolute URL.", { received: "/relative" });

  assert.ok(error instanceof UrlError);
  assert.ok(error instanceof Error, "UrlError stays catchable as a plain Error");
  assert.equal(error.name, "UrlError");
  assert.equal(error.code, "URL_NOT_ABSOLUTE");
  assert.equal(error.message, "Input must be an absolute URL.");
  assert.deepEqual(error.details, { received: "/relative" });
});

test("round trip a query string through parse and stringify", () => {
  assert.equal(
    stringifyQuery(parseQuery("?a=1&b=2")),
    "a=1&b=2",
    "round tripping is stable once the leading ? is dropped"
  );
  assert.equal(
    stringifyQuery(parseQuery("?z=9&a=1&b=2")),
    "a=1&b=2&z=9",
    "round tripping normalises the key order"
  );
  assert.deepEqual(parseQuery(stringifyQuery({ a: "x y" })), { a: "x y" }, "spaces survive a round trip");
});
