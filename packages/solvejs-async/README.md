# @jdsalasc/solvejs-async

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-async)](https://www.npmjs.com/package/@jdsalasc/solvejs-async)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-async)](https://www.npmjs.com/package/@jdsalasc/solvejs-async)

Zero-dependency async/concurrency utilities for JavaScript and TypeScript.

## Utilities

- `sleep`
- `timeout`
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
## Install

```bash
npm i @jdsalasc/solvejs-async
```

## Quick example

```ts
import { createTaskQueue, createRateLimiter, createTokenBucketLimiter, retry, timeout, pMap } from "@jdsalasc/solvejs-async";

const data = await retry(
  () => timeout(fetch("https://api.example.com/items").then((r) => r.json()), 3000),
  { retries: 2, delayMs: 200, backoffFactor: 2 }
);

const ids = await pMap(data.items, async (item) => item.id, { concurrency: 4 });
const queue = createTaskQueue({ concurrency: 2 });
const limiter = createRateLimiter({ maxCalls: 5, windowMs: 1000 });
const burstLimiter = createTokenBucketLimiter({ capacity: 10, refillTokens: 2, refillIntervalMs: 1000 });
await queue.add(() => limiter(() => fetch("https://api.example.com/reindex")));
await burstLimiter(() => fetch("https://api.example.com/heavy-sync"), 3);
```
