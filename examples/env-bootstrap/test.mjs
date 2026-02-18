import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "./index.mjs";

test("loadConfig returns typed configuration", () => {
  const config = loadConfig({
    NODE_ENV: "test",
    PORT: "4000",
    DATABASE_DSN: "postgres://user:secret@localhost:5432/test",
    API_BASE_URL: "https://api.solvejs.dev",
    JWT_SECRET: "token",
    ENABLE_CACHE: "false",
    CORS_ORIGINS: "http://localhost:3000,https://app.example.com",
    FEATURE_FLAGS: "{\"newCheckout\":true}"
  });

  assert.equal(config.nodeEnv, "test");
  assert.equal(config.port, 4000);
  assert.equal(config.databaseDsn.includes("postgres://user:secret@localhost:5432/test"), true);
  assert.equal(config.apiBaseUrl, "https://api.solvejs.dev/");
  assert.equal(config.enableCache, false);
  assert.deepEqual(config.corsOrigins, ["http://localhost:3000", "https://app.example.com"]);
  assert.deepEqual(config.featureFlags, { newCheckout: true });
});

test("loadConfig throws for missing required keys", () => {
  assert.throws(
    () =>
      loadConfig({
        PORT: "4000",
        DATABASE_DSN: "postgres://user:secret@localhost:5432/test"
      }),
    /Missing env vars/
  );
});
