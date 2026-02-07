# @jdsalasc/solvejs-list

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-list)](https://www.npmjs.com/package/@jdsalasc/solvejs-list)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-list)](https://www.npmjs.com/package/@jdsalasc/solvejs-list)


Zero-dependency array/list utilities for JavaScript and TypeScript.

## Utilities

- `unique`, `uniqueBy`, `compact`, `chunk`
- `groupBy`, `keyBy`, `partition`
- `intersection`, `difference`
- `sortBy`

## When to use this package

Use it when you repeatedly write list transformation logic and want consistent, tested helpers for grouping, deduplication, and sorting.

## Install

```bash
npm i @jdsalasc/solvejs-list
```

## Quick example

```ts
import { uniqueBy, groupBy, sortBy } from "@jdsalasc/solvejs-list";

const rows = [{ id: "a", team: "x", score: 2 }, { id: "a", team: "x", score: 2 }, { id: "b", team: "y", score: 1 }];
const uniqueRows = uniqueBy(rows, (r) => r.id);
const byTeam = groupBy(uniqueRows, (r) => r.team);
sortBy(byTeam.x, (r) => r.score, "desc");
```

## Scale note

For high-volume pipelines (`10k`/`100k` rows), run `npm run benchmark` from the monorepo to profile `uniqueBy`, `groupBy`, and `sortBy` with your real data shape.
