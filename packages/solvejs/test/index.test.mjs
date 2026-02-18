import test from "node:test";
import assert from "node:assert/strict";
import {
  deepMerge,
  getEnvBoolean,
  formatDate,
  pMap,
  toKebabCase,
  clamp,
  isCellphoneNumber,
  isUuidV4,
  slugify,
  toNumber,
  uniqueBy,
  validateUsername,
  sleep
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
  await sleep(1);
  assert.deepEqual(await pMap([1, 2, 3], async (x) => x * 2, { concurrency: 2 }), [2, 4, 6]);
});
