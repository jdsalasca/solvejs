# @jdsalasc/solvejs-async

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-async)](https://www.npmjs.com/package/@jdsalasc/solvejs-async)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-async)](https://www.npmjs.com/package/@jdsalasc/solvejs-async)

Zero-dependency async/concurrency utilities for JavaScript and TypeScript.

## Utilities

- `sleep`
- `timeout`, `timeoutFallback`
- `retry`
- `pMap`
- `debouncePromise`
- `throttlePromise`
- `createTaskQueue`
- `createRateLimiter`
- `createTokenBucketLimiter`

## When to use this package

Use it when you need predictable retry logic, promise time limits, queues, and rate-limited async execution without heavy helper libraries.

## Limitations and Constraints

- `throttlePromise` drops calls made during the throttle window.
- `debouncePromise` cancels previous pending calls with a rejection.

### debouncePromise rejects superseded calls with a dedicated error

A call that a newer call replaces never runs, and its promise rejects immediately with
`Error: Debounced by a newer call.` It does not wait for the newer call, and it does not receive the
newer call's outcome. Attach a handler as soon as you make the call, or the rejection surfaces as an
unhandled rejection:

```ts
const save = debouncePromise(persist, { waitMs: 300 });

const first = save("draft");           // will be superseded
const second = save("final");          // this one runs

await second;                          // resolves
await first;                           // rejects: "Debounced by a newer call."
```

### Validation is synchronous, retry and pMap are not

`sleep`, `debouncePromise`, `createRateLimiter`, and `createTokenBucketLimiter` validate their
options synchronously, so a bad option throws at the call site. `retry` and `pMap` are `async`, so
the same mistake arrives as a rejected promise instead:

```ts
sleep(-1);                                  // throws immediately
await retry(fn, { retries: -1 });           // rejects
await pMap(items, fn, { concurrency: 0 });   // rejects
```

## Install

```bash
npm i @jdsalasc/solvejs-async
```

## Quick example

```ts
import { createTaskQueue, createRateLimiter, createTokenBucketLimiter, retry, timeout, timeoutFallback, pMap } from "@jdsalasc/solvejs-async";

const data = await retry(
  () => timeout(fetch("https://api.example.com/items").then((r) => r.json()), 3000),
  { retries: 2, delayMs: 200, backoffFactor: 2 }
);

const ids = await pMap(data.items, async (item) => item.id, { concurrency: 4 });
const cached = await timeoutFallback(fetch("https://api.example.com/cache").then((r) => r.json()), 300, []);
const queue = createTaskQueue({ concurrency: 2 });
const limiter = createRateLimiter({ maxCalls: 5, windowMs: 1000 });
const burstLimiter = createTokenBucketLimiter({ capacity: 10, refillTokens: 2, refillIntervalMs: 1000 });
await queue.add(() => limiter(() => fetch("https://api.example.com/reindex")));
await burstLimiter(() => fetch("https://api.example.com/heavy-sync"), 3);
```

## Endpoint tier token costs (token-bucket)

```ts
import { createTokenBucketLimiter } from "@jdsalasc/solvejs-async";

const limiter = createTokenBucketLimiter({ capacity: 20, refillTokens: 10, refillIntervalMs: 1000 });
const endpointCost = {
  "/health": 1,
  "/search": 2,
  "/invoice/preview": 3,
  "/invoice/finalize": 6,
  "/batch/settlement": 10
} as const;

await limiter(() => fetch("https://api.example.com/health"), endpointCost["/health"]);
await limiter(() => fetch("https://api.example.com/batch/settlement"), endpointCost["/batch/settlement"]);
```
