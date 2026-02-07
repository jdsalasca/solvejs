# Control async workflows in JavaScript

Use `@jdsalasc/solvejs-async` when you need retries, timeouts, and concurrency limits in API/client jobs.

```ts
import { retry, timeout, pMap } from "@jdsalasc/solvejs-async";

const payload = await retry(
  () => timeout(fetch("https://api.example.com/items").then((r) => r.json()), 3000),
  { retries: 2, delayMs: 200, backoffFactor: 2 }
);

const ids = await pMap(payload.items, async (item) => item.id, { concurrency: 4 });
```
