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
  timeout,
  timeoutFallback
} from "../dist/esm/index.js";

test("sleep", async () => {
  const start = Date.now();
  await sleep(5);
  assert.equal(Date.now() >= start, true, "sleep waits at least the requested time");
});

test("timeout", async () => {
  assert.equal(await timeout(Promise.resolve("done"), 30), "done", "a fast promise resolves normally");

  await assert.rejects(
    () => timeout(new Promise((resolve) => setTimeout(resolve, 50)), 5, "Too slow"),
    /Too slow/,
    "a slow promise rejects with the supplied message"
  );
  await assert.rejects(
    () => timeout(new Promise((resolve) => setTimeout(resolve, 50)), 5),
    /timeout|timed out/i,
    "a missing message still rejects with a default"
  );
});

test("timeoutFallback returns fallback only when timeout wins", async () => {
  assert.equal(await timeoutFallback(Promise.resolve("fast"), 30, "fallback"), "fast");
  assert.equal(await timeoutFallback(new Promise((resolve) => setTimeout(resolve, 30)), 5, "fallback"), "fallback");
  await assert.rejects(() => timeoutFallback(Promise.reject(new Error("broken")), 30, "fallback"), /broken/);
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

test("retry validates its options", async () => {
  const ok = async () => "fine";

  // retry is async, so option validation surfaces as a rejected promise rather
  // than a synchronous throw.
  await assert.rejects(() => retry(ok, { retries: -1 }), /non-negative integer/);
  await assert.rejects(() => retry(ok, { retries: 1.5 }), /non-negative integer/);
  await assert.rejects(() => retry(ok, { delayMs: -1 }), /non-negative finite number/);
  await assert.rejects(() => retry(ok, { delayMs: NaN }), /non-negative finite number/);
  await assert.rejects(() => retry(ok, { backoffFactor: 0.5 }), /greater than or equal to 1/);
  await assert.rejects(() => retry(ok, { backoffFactor: -1 }), /greater than or equal to 1/);
  await assert.rejects(() => retry(ok, { backoffFactor: Infinity }), /greater than or equal to 1/);

  assert.equal(await retry(ok, { backoffFactor: 1 }), "fine", "a factor of 1 is allowed");
  assert.equal(await retry(ok, { retries: 0 }), "fine");
});

test("retry honours shouldRetry to stop early", async () => {
  let attempts = 0;
  const flaky = async () => {
    attempts += 1;
    throw new Error(`attempt ${attempts}`);
  };

  const seen = [];
  await assert.rejects(
    () =>
      retry(flaky, {
        retries: 5,
        shouldRetry: (error, failedAttempts) => {
          seen.push({ message: error.message, failedAttempts });
          return failedAttempts < 2;
        }
      }),
    /attempt 2/,
    "the operation stops once shouldRetry says no"
  );
  assert.equal(attempts, 2, "no further attempts are made");
  assert.deepEqual(seen, [
    { message: "attempt 1", failedAttempts: 1 },
    { message: "attempt 2", failedAttempts: 2 }
  ]);
});

test("retry reports the final error when every attempt fails", async () => {
  let attempts = 0;
  await assert.rejects(
    () =>
      retry(
        async () => {
          attempts += 1;
          throw new Error("always fails");
        },
        { retries: 2 }
      ),
    /always fails/
  );
  assert.equal(attempts, 3, "retries 2 means three attempts in total");
});

test("pMap validates concurrency and handles an empty input", async () => {
  await assert.rejects(() => pMap([1, 2], async (v) => v, { concurrency: 0 }), /positive integer/);
  await assert.rejects(() => pMap([1, 2], async (v) => v, { concurrency: -1 }), /positive integer/);
  await assert.rejects(() => pMap([1, 2], async (v) => v, { concurrency: 1.5 }), /positive integer/);

  assert.deepEqual(await pMap([], async (v) => v), [], "an empty input resolves to an empty array");
  assert.deepEqual(await pMap([], async (v) => v, { concurrency: 2 }), []);
  assert.deepEqual(
    await pMap([1, 2, 3], async (v) => v, { concurrency: 99 }),
    [1, 2, 3],
    "concurrency above the input length is fine"
  );
});

test("debouncePromise rejects a superseded call with its own error", async () => {
  let calls = 0;
  const failing = debouncePromise(
    async () => {
      calls += 1;
      throw new Error("boom");
    },
    { waitMs: 5 }
  );

  await assert.rejects(() => failing(), /boom/, "the executed call rejects with its own error");
  assert.equal(calls, 1);

  // A call that a newer call replaces never runs, and its promise rejects with a
  // dedicated error rather than the newer call's outcome. Attach the handler
  // immediately, otherwise Node reports an unhandled rejection.
  let runs = 0;
  const debounced = debouncePromise(
    async (value) => {
      runs += 1;
      return `ran ${value}`;
    },
    { waitMs: 10 }
  );

  const superseded = debounced("first");
  const supersededRejection = assert.rejects(() => superseded, /Debounced by a newer call/);
  const latest = debounced("second");

  assert.equal(await latest, "ran second", "the newest call runs and resolves");
  await supersededRejection;
  assert.equal(runs, 1, "the superseded call never executed");
});

test("createRateLimiter validates its options", () => {
  assert.throws(() => createRateLimiter({ maxCalls: 0, windowMs: 100 }), /positive integer/);
  assert.throws(() => createRateLimiter({ maxCalls: 1.5, windowMs: 100 }), /positive integer/);
  assert.throws(() => createRateLimiter({ maxCalls: 1, windowMs: -1 }), /non-negative finite number/);
  assert.throws(() => createRateLimiter({ maxCalls: 1, windowMs: NaN }), /non-negative finite number/);
});

test("createRateLimiter lets a new window open after the old one drains", async () => {
  const limiter = createRateLimiter({ maxCalls: 2, windowMs: 20 });
  const started = Date.now();

  await Promise.all([limiter(() => "a"), limiter(() => "b")]);
  await limiter(() => "c");
  const elapsed = Date.now() - started;

  assert.ok(elapsed >= 15, `expected the third call to wait for the window, waited ${elapsed}ms`);
  assert.deepEqual(await Promise.all([limiter(() => "d"), limiter(() => "e")]), ["d", "e"]);
});

test("createTokenBucketLimiter validates its options", () => {
  assert.throws(() => createTokenBucketLimiter({ capacity: 0, refillTokens: 1, refillIntervalMs: 10 }), /positive integer/);
  assert.throws(
    () => createTokenBucketLimiter({ capacity: 1, refillTokens: 0, refillIntervalMs: 10 }),
    /positive integer/
  );
  assert.throws(
    () => createTokenBucketLimiter({ capacity: 1, refillTokens: 1, refillIntervalMs: 0 }),
    /positive integer/
  );
  assert.throws(
    () => createTokenBucketLimiter({ capacity: 5, refillTokens: 1, refillIntervalMs: 10, initialTokens: 6 }),
    /less than or equal to capacity/,
    "initialTokens above capacity is rejected"
  );
  assert.throws(
    () => createTokenBucketLimiter({ capacity: 5, refillTokens: 1, refillIntervalMs: 10, initialTokens: -1 }),
    /non-negative finite number/
  );
  assert.ok(createTokenBucketLimiter({ capacity: 5, refillTokens: 1, refillIntervalMs: 10, initialTokens: 5 }));
});

test("createTokenBucketLimiter waits when a token cost exceeds what is available", async () => {
  const limiter = createTokenBucketLimiter({
    capacity: 4,
    refillTokens: 4,
    refillIntervalMs: 20,
    initialTokens: 4
  });

  const started = Date.now();
  await limiter(() => "cheap", 1);
  await limiter(() => "expensive", 4);

  assert.ok(Date.now() - started >= 15, "a cost above the remaining balance waits for a refill");
});

test("createTokenBucketLimiter drains a full capacity immediately", async () => {
  const limiter = createTokenBucketLimiter({
    capacity: 3,
    refillTokens: 3,
    refillIntervalMs: 1000,
    initialTokens: 3
  });

  const started = Date.now();
  await Promise.all([limiter(() => 1), limiter(() => 2), limiter(() => 3)]);
  assert.ok(Date.now() - started < 200, "three cost-1 calls fit in the initial balance");
});

test("sleep rejects a negative delay", async () => {
  // sleep validates synchronously, so the throw happens before a promise exists.
  assert.throws(() => sleep(-1), /non-negative finite number/);
  assert.throws(() => sleep(NaN), /non-negative finite number/);
  assert.throws(() => sleep(Infinity), /non-negative finite number/);
  await sleep(0);
});