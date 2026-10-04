import test from "node:test";
import assert from "node:assert/strict";

// Everything is imported from the meta package on purpose. Each leaf package has its own tests,
// so this file exists to catch the one failure they cannot: a re-export that is declared but does
// not actually resolve in the built output. Exercising a value from every package keeps a broken
// `export *` from reaching a user who imports from @jdsalasc/solvejs.
import {
  // date
  formatDate,
  // string
  toKebabCase,
  slugify,
  // list
  uniqueBy,
  // numbers
  clamp,
  toNumber,
  // objects
  deepMerge,
  // validators
  isCellphoneNumber,
  isUuidV4,
  validateUsername,
  // regex
  REGEX_PATTERNS,
  escapeRegex,
  validateByName,
  // constants
  HTTP_STATUS,
  TIME,
  parseBooleanString,
  // async
  sleep,
  pMap,
  // env
  getEnvBoolean,
  getEnvEnum,
  // schema
  s,
  // url
  UrlError,
  buildUrl,
  parseQuery,
  // cache
  CacheError,
  stableKey,
  createTtlCache,
  // json
  JsonError,
  safeJsonParse,
  safeJsonStringify,
  // pagination
  PaginationError,
  offsetToCursor,
  paginate,
  // semver
  SemverError,
  parseVersion,
  satisfies,
  // errors
  AppError,
  createError,
  serializeError,
  // money
  MoneyError,
  fromDecimal,
  toDecimal,
  // http
  HttpError,
  isRetryableStatus,
  parseContentType
} from "../dist/esm/index.js";

test("meta package re-exports symbols", async () => {
  assert.equal(formatDate(new Date("2026-01-02T00:00:00.000Z"), "YYYY-MM-DD"), "2026-01-02");
  assert.equal(toKebabCase("Hello World"), "hello-world");
  assert.equal(slugify("Hello World"), "hello-world");
  assert.equal(clamp(200, 0, 100), 100);
  assert.equal(toNumber("1,200"), 1200);
  assert.deepEqual(uniqueBy([{ id: "a" }, { id: "a" }, { id: "b" }], (x) => x.id), [{ id: "a" }, { id: "b" }]);
  assert.equal(isCellphoneNumber("+573001234567"), true);
  assert.equal(isUuidV4("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(validateUsername("solvejs_team").ok, true);
  assert.deepEqual(
    deepMerge({ app: { env: "dev", flags: { a: true } } }, { app: { flags: { b: true } } }),
    { app: { env: "dev", flags: { a: true, b: true } } }
  );
  assert.equal(getEnvBoolean("FEATURE_X", { FEATURE_X: "true" }), true);
  assert.equal(s.object({ id: s.string() }).parse({ id: "u1" }).id, "u1");
  await sleep(1);
  assert.deepEqual(await pMap([1, 2, 3], async (x) => x * 2, { concurrency: 2 }), [2, 4, 6]);
});

test("every leaf package is reachable through the meta package", () => {
  // regex
  assert.equal(escapeRegex("a.b"), "a\\.b");
  assert.equal(validateByName("a@b.co", "email"), true);
  assert.equal(REGEX_PATTERNS.email.test("a@b.co"), true);

  // constants
  assert.equal(HTTP_STATUS.OK, 200);
  assert.equal(TIME.SECOND_MS, 1000);
  assert.equal(parseBooleanString("yes"), true);
  assert.equal(parseBooleanString("0"), false);

  // env
  assert.equal(getEnvEnum("MODE", ["dev", "prod"], { MODE: "prod" }), "prod");

  // url
  assert.equal(buildUrl("https://x.test", { path: "users" }), "https://x.test/users");
  assert.deepEqual(parseQuery("?a=1&b=two"), { a: "1", b: "two" });

  // cache
  assert.equal(stableKey({ a: 1 }), '{"a":1}');
  const ttl = createTtlCache({ ttlMs: 60_000 });
  ttl.set("k", "v");
  assert.equal(ttl.get("k"), "v");

  // json
  assert.deepEqual(safeJsonParse('{"a":1}'), { ok: true, value: { a: 1 } });
  assert.deepEqual(safeJsonStringify({ a: 1 }), { ok: true, value: '{"a":1}' });

  // pagination
  assert.equal(offsetToCursor(0), "0");
  assert.deepEqual(paginate([1, 2, 3, 4], { page: 2, perPage: 2 }).items, [3, 4]);

  // semver
  assert.equal(satisfies("1.4.2", "^1.2.0"), true);
  assert.equal(parseVersion("1.2.3-rc.1").prerelease[0], "rc");

  // errors
  assert.equal(createError("NOT_FOUND", "gone").status, 404);
  assert.deepEqual(serializeError(createError("NOT_FOUND", "gone")), {
    error: { code: "NOT_FOUND", message: "gone", status: 404 }
  });

  // money
  assert.equal(fromDecimal("1.50", { currency: "USD" }), 150);
  assert.equal(toDecimal(150, { currency: "USD" }), "1.50");

  // http
  assert.equal(isRetryableStatus(503), true);
  assert.equal(parseContentType("application/json").type, "application/json");
});

test("every error class is exported and keeps its identity", () => {
  // The error classes are part of the public contract, so an instanceof check from the meta
  // package has to hold. If a class were re-exported twice, the identity would break.
  const cases = [
    [new UrlError("URL_NOT_ABSOLUTE", "relative"), UrlError],
    [new CacheError("CACHE_INVALID_OPTION", "bad"), CacheError],
    [new JsonError("JSON_PARSE", "bad"), JsonError],
    [new PaginationError("PAGINATION_INVALID_PAGE", "bad"), PaginationError],
    [new SemverError("SEMVER_INVALID_VERSION", "bad"), SemverError],
    [new AppError("NOT_FOUND", "gone"), AppError],
    [new MoneyError("MONEY_INVALID_AMOUNT", "bad"), MoneyError],
    [new HttpError("HTTP_INVALID_LIST", "bad"), HttpError]
  ];

  for (const [instance, Class] of cases) {
    assert.equal(instance instanceof Class, true, `${Class.name} should keep its identity`);
    assert.equal(instance instanceof Error, true, `${Class.name} should still be an Error`);
    assert.equal(typeof instance.code, "string", `${Class.name} exposes a machine-readable code`);
  }

  // A value produced by a leaf package is an instance of the class the meta package exports.
  assert.equal(createError("NOT_FOUND") instanceof AppError, true);
});
