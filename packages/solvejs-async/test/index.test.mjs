import test from "node:test";
import assert from "node:assert/strict";
import { pMap, retry, sleep, timeout } from "../dist/esm/index.js";

test("sleep and timeout utilities", async () => {
  const start = Date.now();
  await sleep(5);
  assert.equal(Date.now() >= start, true);

  const ok = await timeout(Promise.resolve("done"), 30);
  assert.equal(ok, "done");

  await assert.rejects(
    () => timeout(new Promise((resolve) => setTimeout(resolve, 50)), 5, "Too slow"),
    /Too slow/
  );
});

test("retry retries failures then resolves", async () => {
  let attempts = 0;
  const result = await retry(
    async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error("temporary");
      }
      return "ok";
    },
    { retries: 3, delayMs: 1 }
  );

  assert.equal(result, "ok");
  assert.equal(attempts, 3);
});

test("pMap preserves order and enforces concurrency", async () => {
  let active = 0;
  let maxActive = 0;

  const values = [1, 2, 3, 4];
  const result = await pMap(
    values,
    async (value) => {
      active += 1;
      if (active > maxActive) {
        maxActive = active;
      }
      await sleep(5);
      active -= 1;
      return value * 2;
    },
    { concurrency: 2 }
  );

  assert.deepEqual(result, [2, 4, 6, 8]);
  assert.equal(maxActive <= 2, true);
});
