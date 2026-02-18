import test from "node:test";
import assert from "node:assert/strict";
import {
  createRateLimiter,
  createTaskQueue,
  createTokenBucketLimiter,
  debouncePromise,
  pMap,
  retry,
  sleep,
  throttlePromise,
  timeout
} from "../dist/esm/index.js";

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

test("debouncePromise resolves latest call", async () => {
  const fn = debouncePromise(async (value) => value * 2, { waitMs: 5 });
  const first = fn(1);
  const second = fn(2);

  await assert.rejects(() => first, /Debounced by a newer call/);
  assert.equal(await second, 4);
});

test("throttlePromise runs at most once per window", async () => {
  let calls = 0;
  const fn = throttlePromise(async (value) => {
    calls += 1;
    return value * 3;
  }, { waitMs: 20 });

  const first = await fn(2);
  const second = await fn(3);
  await sleep(25);
  const third = await fn(4);

  assert.equal(first, 6);
  assert.equal(second, undefined);
  assert.equal(third, 12);
  assert.equal(calls, 2);
});

test("createTaskQueue enforces concurrency and preserves all results", async () => {
  const queue = createTaskQueue({ concurrency: 2 });
  let active = 0;
  let peak = 0;

  const jobs = [1, 2, 3, 4, 5].map((value) =>
    queue.add(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await sleep(5);
      active -= 1;
      return value * 10;
    })
  );

  const results = await Promise.all(jobs);
  assert.deepEqual(results, [10, 20, 30, 40, 50]);
  assert.equal(peak <= 2, true);
  assert.equal(queue.pending(), 0);
  assert.equal(queue.running(), 0);
});

test("createRateLimiter caps executions inside a window", async () => {
  const limiter = createRateLimiter({ maxCalls: 2, windowMs: 40 });
  const startedAt = [];
  const start = Date.now();

  await Promise.all([
    limiter(async () => {
      startedAt.push(Date.now() - start);
      return 1;
    }),
    limiter(async () => {
      startedAt.push(Date.now() - start);
      return 2;
    }),
    limiter(async () => {
      startedAt.push(Date.now() - start);
      return 3;
    })
  ]);

  startedAt.sort((a, b) => a - b);
  assert.equal(startedAt.length, 3);
  assert.equal(startedAt[2] >= 35, true);
});

test("createTokenBucketLimiter smooths bursts and enforces token costs", async () => {
  const limiter = createTokenBucketLimiter({ capacity: 3, refillTokens: 1, refillIntervalMs: 30 });
  const startedAt = [];
  const start = Date.now();

  await Promise.all([
    limiter(async () => {
      startedAt.push(Date.now() - start);
      return "first";
    }, 2),
    limiter(async () => {
      startedAt.push(Date.now() - start);
      return "second";
    }, 2)
  ]);

  startedAt.sort((a, b) => a - b);
  assert.equal(startedAt.length, 2);
  assert.equal(startedAt[1] >= 20, true);

  assert.throws(() => limiter(async () => "invalid", 4), /tokenCost to be less than or equal to capacity/);
});
