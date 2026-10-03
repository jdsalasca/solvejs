import test from "node:test";
import assert from "node:assert/strict";
import {
  getEnvDsn,
  getEnvArray,
  getEnvBoolean,
  getEnvEnum,
  getEnvJson,
  getEnvNumber,
  getEnvObject,
  getEnvString,
  getEnvUrl,
  validateRequiredEnv
} from "../dist/esm/index.js";

test("getEnvString reads required values and trims by default", () => {
  const env = { APP_NAME: "  solvejs  " };
  assert.equal(getEnvString("APP_NAME", env), "solvejs");
  assert.equal(getEnvString("MISSING", env, { defaultValue: "fallback" }), "fallback");
  assert.throws(() => getEnvString("EMPTY", { EMPTY: "   " }), /cannot be empty/);
});

test("getEnvNumber validates integer and range constraints", () => {
  const env = { PORT: "3000", TIMEOUT_MS: "1500" };
  assert.equal(getEnvNumber("PORT", env, { integer: true, min: 1, max: 65535 }), 3000);
  assert.equal(getEnvNumber("TIMEOUT_MS", env, { min: 1000 }), 1500);
  assert.equal(getEnvNumber("MISSING", env, { defaultValue: 42 }), 42);
  assert.throws(() => getEnvNumber("PORT", { PORT: "abc" }), /valid number/);
  assert.throws(() => getEnvNumber("PORT", { PORT: "3.5" }, { integer: true }), /integer/);
});

test("getEnvBoolean parses common true/false values", () => {
  assert.equal(getEnvBoolean("FEATURE_X", { FEATURE_X: "true" }), true);
  assert.equal(getEnvBoolean("FEATURE_X", { FEATURE_X: "OFF" }), false);
  assert.equal(getEnvBoolean("MISSING", {}, { defaultValue: true }), true);
  assert.throws(() => getEnvBoolean("FEATURE_X", { FEATURE_X: "enabled" }), /boolean-like/);
});

test("getEnvEnum validates allowed values with optional case-insensitive mode", () => {
  const env = { NODE_ENV: "production", REGION: "us-east-1" };
  assert.equal(getEnvEnum("NODE_ENV", ["development", "test", "production"], env), "production");
  assert.equal(getEnvEnum("REGION", ["US-EAST-1", "EU-WEST-1"], env, { caseInsensitive: true }), "US-EAST-1");
  assert.equal(getEnvEnum("STAGE", ["dev", "prod"], env, { defaultValue: "dev" }), "dev");
  assert.throws(() => getEnvEnum("NODE_ENV", ["development", "test"], env), /must be one of/);
});

test("validateRequiredEnv returns missing and empty names", () => {
  const env = { DB_URL: "postgres://x", API_KEY: " ", PORT: "3000" };
  assert.deepEqual(validateRequiredEnv(["DB_URL", "API_KEY", "JWT_SECRET", "PORT"], env), ["API_KEY", "JWT_SECRET"]);
});

test("getEnvArray parses comma-separated values with trimming", () => {
  const env = { CORS_ORIGINS: " https://a.dev,https://b.dev , ,https://c.dev " };
  assert.deepEqual(getEnvArray("CORS_ORIGINS", env), ["https://a.dev", "https://b.dev", "https://c.dev"]);
  assert.deepEqual(getEnvArray("MISSING", env, { defaultValue: ["*"] }), ["*"]);
  assert.throws(() => getEnvArray("EMPTY", { EMPTY: " , , " }), /at least one non-empty item/);
});

test("getEnvJson parses JSON values and throws for invalid payloads", () => {
  const env = {
    FEATURE_FLAGS: "{\"newCheckout\":true,\"maxRetries\":3}"
  };
  assert.deepEqual(getEnvJson("FEATURE_FLAGS", env), { newCheckout: true, maxRetries: 3 });
  assert.deepEqual(getEnvJson("MISSING_JSON", env, { defaultValue: { enabled: false } }), { enabled: false });
  assert.throws(() => getEnvJson("BROKEN_JSON", { BROKEN_JSON: "{invalid" }), /valid JSON/);
});

test("getEnvObject parses JSON objects and validates shape", () => {
  const env = { SERVICE: "{\"name\":\"api\",\"retries\":3}" };
  const service = getEnvObject("SERVICE", env, {
    validate: (value) =>
      typeof value === "object" &&
      value !== null &&
      "name" in value &&
      "retries" in value
  });
  assert.deepEqual(service, { name: "api", retries: 3 });
  assert.deepEqual(getEnvObject("MISSING", env, { defaultValue: { enabled: true } }), { enabled: true });
  assert.throws(() => getEnvObject("LIST", { LIST: "[1,2,3]" }), /JSON object/);
  assert.throws(() => getEnvObject("SERVICE", env, { validate: () => false }), /expected object shape/);
});

test("getEnvUrl parses URLs and enforces protocols", () => {
  const env = { API_BASE_URL: "https://api.solvejs.dev/v1" };
  const url = getEnvUrl("API_BASE_URL", env, { allowedProtocols: ["https"] });
  assert.equal(url.protocol, "https:");
  assert.equal(url.hostname, "api.solvejs.dev");
  assert.equal(getEnvUrl("MISSING", env, { defaultValue: "http://localhost:3000" }).hostname, "localhost");
  assert.throws(() => getEnvUrl("BAD_URL", { BAD_URL: "not-a-url" }), /valid URL/);
  assert.throws(() => getEnvUrl("API_BASE_URL", env, { allowedProtocols: ["http"] }), /must use one of/);
});

test("getEnvDsn validates DSN protocol and optional credentials", () => {
  const env = { DATABASE_DSN: "postgres://user:secret@localhost:5432/app" };
  const dsn = getEnvDsn("DATABASE_DSN", env);
  assert.equal(dsn.protocol, "postgres:");
  assert.equal(dsn.hostname, "localhost");
  assert.equal(dsn.username, "user");
  assert.equal(dsn.password, "secret");
  assert.throws(() => getEnvDsn("CACHE_DSN", { CACHE_DSN: "http://localhost:6379" }), /must use one of/);
  assert.throws(
    () => getEnvDsn("DATABASE_DSN", { DATABASE_DSN: "postgres://localhost:5432/app" }, { requireAuth: true }),
    /username and password/
  );
});
test("every getter rejects a missing required variable", () => {
  const env = {};
  const missing = /Missing required environment variable/;

  assert.throws(() => getEnvString("A", env), missing);
  assert.throws(() => getEnvNumber("A", env), missing);
  assert.throws(() => getEnvBoolean("A", env), missing);
  assert.throws(() => getEnvEnum("A", ["x"], env), missing);
  assert.throws(() => getEnvArray("A", env), missing);
  assert.throws(() => getEnvJson("A", env), missing);
  assert.throws(() => getEnvObject("A", env), missing);
  assert.throws(() => getEnvUrl("A", env), missing);
  assert.throws(() => getEnvDsn("A", env), missing);

  // Every message names the variable, so a startup crash points at the culprit.
  assert.throws(() => getEnvString("DATABASE_URL", env), /DATABASE_URL/);
  assert.throws(() => getEnvNumber("PORT", env), /PORT/);
  assert.throws(() => getEnvUrl("API_ORIGIN", env), /API_ORIGIN/);
});

test("every getter falls back to an explicit default when the variable is absent", () => {
  const env = {};
  assert.equal(getEnvString("A", env, { defaultValue: "fallback" }), "fallback");
  assert.equal(getEnvNumber("A", env, { defaultValue: 7 }), 7);
  assert.equal(getEnvBoolean("A", env, { defaultValue: true }), true);
  assert.equal(getEnvEnum("A", ["dev", "prod"], env, { defaultValue: "dev" }), "dev");
  assert.deepEqual(getEnvArray("A", env, { defaultValue: ["a"] }), ["a"]);
  assert.deepEqual(getEnvJson("A", env, { defaultValue: { a: 1 } }), { a: 1 });
  assert.deepEqual(getEnvObject("A", env, { defaultValue: { a: 1 } }), { a: 1 });
  assert.equal(getEnvUrl("A", env, { defaultValue: "https://x.dev" }).href, "https://x.dev/");
});

test("a blank value falls back to the default, except in getEnvString", () => {
  const blank = { A: "   " };

  assert.equal(getEnvNumber("A", blank, { defaultValue: 9 }), 9);
  assert.equal(getEnvBoolean("A", blank, { defaultValue: true }), true);
  assert.deepEqual(getEnvArray("A", blank, { defaultValue: ["d"] }), ["d"]);
  assert.deepEqual(getEnvJson("A", blank, { defaultValue: { d: 1 } }), { d: 1 });
  assert.deepEqual(getEnvObject("A", blank, { defaultValue: { d: 1 } }), { d: 1 });
  assert.equal(getEnvUrl("A", blank, { defaultValue: "https://d.dev" }).href, "https://d.dev/");
  assert.equal(getEnvEnum("A", ["d"], blank, { defaultValue: "d" }), "d");

  // getEnvString is the exception: a present-but-blank value raises "cannot be
  // empty" instead of using the default, even though an absent variable does use
  // it. Pinned because the asymmetry surprises people in CI, where a variable is
  // often exported but empty.
  assert.equal(getEnvString("A", {}, { defaultValue: "d" }), "d", "absent uses the default");
  assert.throws(
    () => getEnvString("A", blank, { defaultValue: "d" }),
    /cannot be empty/,
    "present-but-blank does not"
  );
  assert.throws(() => getEnvString("A", blank), /cannot be empty/);
  assert.equal(getEnvString("A", blank, { defaultValue: "d", allowEmpty: true }), "", "allowEmpty accepts the blank");
});

test("getEnvString trims and enforces allowEmpty", () => {
  assert.equal(getEnvString("A", { A: "  x  " }), "x");
  assert.equal(getEnvString("A", { A: "  x  " }, { trim: false }), "  x  ");
  assert.equal(getEnvString("A", { A: "" }, { allowEmpty: true }), "");
});

test("getEnvNumber enforces integer, min, and max bounds", () => {
  const env = { N: "42", DECIMAL: "1.5", SMALL: "1", BIG: "9" };

  assert.equal(getEnvNumber("N", env), 42);
  assert.equal(getEnvNumber("N", env, { integer: true }), 42);
  assert.throws(() => getEnvNumber("DECIMAL", env, { integer: true }), /must be an integer/);
  assert.equal(getEnvNumber("DECIMAL", env), 1.5, "a decimal is fine without the integer flag");

  assert.equal(getEnvNumber("N", env, { min: 42, max: 42 }), 42, "both bounds are inclusive");
  assert.equal(getEnvNumber("SMALL", env, { min: 1 }), 1);
  assert.throws(() => getEnvNumber("N", env, { min: 43 }), /greater than or equal to 43/);
  assert.throws(() => getEnvNumber("BIG", env, { max: 5 }), /less than or equal to 5/);
  assert.throws(
    () => getEnvNumber("N", env, { min: 43, max: 41 }),
    /greater than or equal to 43/,
    "min is reported first when both are violated"
  );
  assert.throws(() => getEnvNumber("A", { A: "abc" }), /must be a valid number/);
});

test("getEnvUrl requires a hostname unless told otherwise", () => {
  assert.throws(() => getEnvUrl("U", { U: "file:///tmp/x" }, { allowedProtocols: ["file"] }), /must include a hostname/);
  assert.equal(
    getEnvUrl("U", { U: "file:///tmp/x" }, { allowedProtocols: ["file"], requireHostname: false }).protocol,
    "file:",
    "requireHostname false accepts a hostless URL"
  );
  assert.throws(() => getEnvUrl("U", { U: "nonsense" }), /must be a valid URL/);
  assert.throws(() => getEnvUrl("U", { U: "ftp://x.dev" }, { allowedProtocols: ["https"] }), /must use one of/);
  assert.equal(
    getEnvUrl("U", { U: "https://x.dev" }, { allowedProtocols: ["https", "wss"] }).host,
    "x.dev",
    "a protocol list accepts any of its entries"
  );
});

test("getEnvDsn accepts each supported driver and rejects others", () => {
  const drivers = ["postgres", "postgresql", "mysql", "mariadb", "mongodb", "redis", "amqp"];
  for (const driver of drivers) {
    const dsn = driver === "redis" || driver === "amqp" ? `${driver}://host` : `${driver}://u:p@host:1234/db`;
    assert.equal(getEnvDsn("D", { D: dsn }).protocol.replace(":", ""), driver, `${driver} must be accepted`);
  }

  assert.throws(() => getEnvDsn("D", { D: "https://host" }), /must use one of/, "the protocol check runs first");
  assert.throws(() => getEnvDsn("D", { D: "postgres:///db" }), /must include a hostname/);
  assert.throws(() => getEnvDsn("D", { D: "nonsense" }), /must be a valid URL/);
  assert.equal(
    getEnvDsn("D", { D: "sqlite://file.db" }, { allowedProtocols: ["sqlite"] }).protocol,
    "sqlite:",
    "the allowed list is configurable"
  );
  assert.throws(
    () => getEnvDsn("D", { D: "postgres://host/db" }, { requireAuth: true }),
    /username and password/
  );
});

test("validateRequiredEnv reports every missing name", () => {
  assert.deepEqual(validateRequiredEnv(["A", "B"], { A: "1" }), ["B"]);
  assert.deepEqual(validateRequiredEnv(["A", "B"], { A: "1", B: "2" }), []);
  assert.deepEqual(validateRequiredEnv(["A"], { A: "" }), ["A"], "an empty value counts as missing");
  assert.deepEqual(validateRequiredEnv(["A"], { A: "   " }), ["A"], "whitespace counts as missing");
  assert.deepEqual(validateRequiredEnv(["A"], { A: "0" }), [], "zero is a present value");
  assert.deepEqual(validateRequiredEnv(["A", "B"], {}), ["A", "B"], "order is preserved");
  assert.deepEqual(validateRequiredEnv([], {}), []);
});

test("getEnvArray honours separator, trimming, and empty-item options", () => {
  assert.deepEqual(getEnvArray("A", { A: "a,b,c" }), ["a", "b", "c"]);
  assert.deepEqual(getEnvArray("A", { A: "a|b" }, { separator: "|" }), ["a", "b"]);
  assert.deepEqual(getEnvArray("A", { A: " a , b " }), ["a", "b"], "items are trimmed by default");
  assert.deepEqual(getEnvArray("A", { A: " a , b " }, { trimItems: false }), [" a ", " b "]);
  assert.deepEqual(getEnvArray("A", { A: "a" }), ["a"], "a single item is still an array");
  assert.deepEqual(getEnvArray("A", { A: "" }, { defaultValue: ["d"] }), ["d"]);

  // Empty items are dropped by default; allowEmptyItems keeps them as empty strings.
  assert.deepEqual(getEnvArray("A", { A: "a,,b" }), ["a", "b"]);
  assert.deepEqual(getEnvArray("A", { A: "a,,b" }, { allowEmptyItems: false }), ["a", "b"]);
  assert.deepEqual(getEnvArray("A", { A: "a,,b" }, { allowEmptyItems: true }), ["a", "", "b"]);
});

test("getEnvObject rejects a non-object JSON payload", () => {
  assert.deepEqual(getEnvObject("O", { O: '{"a":1}' }), { a: 1 });
  for (const payload of ["[1,2]", '"text"', "42", "true", "null"]) {
    assert.throws(
      () => getEnvObject("O", { O: payload }),
      /must contain a JSON object/,
      `${payload} is not a JSON object`
    );
  }
  assert.throws(
    () => getEnvObject("O", { O: '{"a":1}' }, { validate: () => false }),
    /does not match the expected object shape/
  );
  assert.deepEqual(getEnvObject("O", { O: '{"a":1}' }, { validate: (v) => v.a === 1 }), { a: 1 });
});

test("getEnvEnum validates membership and case sensitivity", () => {
  // getEnvEnum takes allowedValues as its second positional argument, unlike every
  // other getter which takes the env source there.
  assert.equal(getEnvEnum("E", ["dev", "prod"], { E: "dev" }), "dev");
  assert.throws(
    () => getEnvEnum("E", ["dev", "prod"], { E: "staging" }),
    /must be one of: dev, prod/
  );
  assert.throws(
    () => getEnvEnum("E", ["dev", "prod"], { E: "DEV" }),
    /must be one of/,
    "matching is case-sensitive by default"
  );
  assert.equal(
    getEnvEnum("E", ["dev", "prod"], { E: "DEV" }, { caseInsensitive: true }),
    "dev",
    "caseInsensitive returns the declared casing, not the raw input"
  );
  assert.equal(
    getEnvEnum("E", ["dev", "prod"], { E: "  dev  " }, { caseInsensitive: true }),
    "dev",
    "the value is trimmed before matching"
  );
  assert.equal(getEnvEnum("E", ["dev", "prod"], { E: " dev " }), "dev", "trimming also applies in strict mode");
});
test("getters fall back to process.env when no source is passed", () => {
  const key = "SOLVEJS_TEST_PROBE";
  const previous = process.env[key];
  try {
    process.env[key] = "probe-value";
    assert.equal(getEnvString(key), "probe-value", "the default source reads process.env");
    assert.equal(getEnvNumber(key.replace("PROBE", "NUMBER"), { [key.replace("PROBE", "NUMBER")]: "7" }), 7);
    process.env[key] = "12";
    assert.equal(getEnvNumber(key), 12, "the same default source serves every getter");
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
});

test("a variable absent from process.env throws when no source is passed", () => {
  const key = "SOLVEJS_TEST_DEFINITELY_ABSENT";
  delete process.env[key];
  assert.throws(() => getEnvString(key), new RegExp(key));
  assert.equal(getEnvString(key, {}, { defaultValue: "d" }), "d");
});

test("the default source is process.env even when a variable is set to an empty string", () => {
  const key = "SOLVEJS_TEST_EMPTY";
  const previous = process.env[key];
  try {
    process.env[key] = "";
    assert.throws(() => getEnvString(key), /cannot be empty/);
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
});