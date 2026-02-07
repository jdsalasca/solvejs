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

## When to use this package

Use it when you need predictable retry logic, promise time limits, and controlled async concurrency without adding heavy helper libraries.

## Install

```bash
npm i @jdsalasc/solvejs-async
```

## Quick example

```ts
import { retry, timeout, pMap } from "@jdsalasc/solvejs-async";

const data = await retry(
  () => timeout(fetch("https://api.example.com/items").then((r) => r.json()), 3000),
  { retries: 2, delayMs: 200, backoffFactor: 2 }
);

const ids = await pMap(data.items, async (item) => item.id, { concurrency: 4 });
```
