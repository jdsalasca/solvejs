import test from "node:test";
import assert from "node:assert/strict";
import {
  getEnvDsn,
  getEnvArray,
  getEnvBoolean,
  getEnvEnum,
  getEnvJson,
  getEnvNumber,
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
