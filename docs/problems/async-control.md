# Control async workflows in JavaScript

Use `@jdsalasc/solvejs-async` when you need retries, timeouts, task queues, and burst-safe rate controls in API/client jobs.

```ts
import { retry, timeout, pMap, createTaskQueue, createRateLimiter, createTokenBucketLimiter } from "@jdsalasc/solvejs-async";

const payload = await retry(
  () => timeout(fetch("https://api.example.com/items").then((r) => r.json()), 3000),
  { retries: 2, delayMs: 200, backoffFactor: 2 }
);

const ids = await pMap(payload.items, async (item) => item.id, { concurrency: 4 });
const queue = createTaskQueue({ concurrency: 2 });
const limiter = createRateLimiter({ maxCalls: 5, windowMs: 1000 });
const burstLimiter = createTokenBucketLimiter({ capacity: 10, refillTokens: 2, refillIntervalMs: 1000 });

await queue.add(() => limiter(() => fetch("https://api.example.com/reindex")));
await burstLimiter(() => fetch("https://api.example.com/heavy-sync"), 3);
```

## Token-cost by endpoint tier (production pattern)

```ts
import { createTokenBucketLimiter } from "@jdsalasc/solvejs-async";

const limiter = createTokenBucketLimiter({
  capacity: 20,
  refillTokens: 10,
  refillIntervalMs: 1000
});

const endpointCost = {
  "/health": 1,
  "/search": 2,
  "/invoice/preview": 3,
  "/invoice/finalize": 6,
  "/batch/settlement": 10
};

async function callEndpoint(path: keyof typeof endpointCost) {
  const cost = endpointCost[path];
  return limiter(() => fetch(`https://api.example.com${path}`), cost);
}
```

Suggested tiering:

| Tier | Endpoint examples | Token cost |
|---|---|---|
| Low | `GET /health`, `GET /status` | `1` |
| Medium | `GET /search`, `POST /quote` | `2-3` |
| High | `POST /invoice/finalize`, `POST /payments/capture` | `5-7` |
| Batch | `POST /batch/settlement`, `POST /rebuild-index` | `8-10` |
