# Control async workflows in JavaScript

Use `@jdsalasc/solvejs-async` when you need retries, timeouts, task queues, and rate limits in API/client jobs.

```ts
import { retry, timeout, pMap, createTaskQueue, createRateLimiter } from "@jdsalasc/solvejs-async";

const payload = await retry(
  () => timeout(fetch("https://api.example.com/items").then((r) => r.json()), 3000),
  { retries: 2, delayMs: 200, backoffFactor: 2 }
);

const ids = await pMap(payload.items, async (item) => item.id, { concurrency: 4 });
const queue = createTaskQueue({ concurrency: 2 });
const limiter = createRateLimiter({ maxCalls: 5, windowMs: 1000 });

await queue.add(() => limiter(() => fetch("https://api.example.com/reindex")));
```
