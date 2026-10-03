# @jdsalasc/solvejs-list

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-list)](https://www.npmjs.com/package/@jdsalasc/solvejs-list)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-list)](https://www.npmjs.com/package/@jdsalasc/solvejs-list)


Zero-dependency array/list utilities for JavaScript and TypeScript.

## Utilities

- `unique`, `uniqueBy`, `compact`, `chunk`
- `groupBy`, `countBy`, `keyBy`, `pluck`, `partition`
- `intersection`, `difference`
- `sortBy`

## When to use this package

Use it when you repeatedly write list transformation logic and want consistent, tested helpers for grouping, counting, deduplication, and sorting.

## Limitations and Constraints

- Sorting/grouping semantics rely on mapper outputs and do not infer locale-aware collation.
- Large-list performance depends on data shape and key cardinality; benchmark with production-like payloads.

### intersection and difference keep duplicates from the left side

Both functions filter the left operand against a `Set` of the right one, so repeated values in
the left operand survive. lodash deduplicates in both cases, so this is the one place where
migrating from lodash changes output:

```ts
intersection([1, 1, 2], [2, 1]); // [1, 1, 2]   solvejs
                               // [1, 2]       lodash _.intersection

difference([1, 1, 2], [2]);    // [1, 1]       solvejs
                             // [1]          lodash _.difference
```

Compose with `unique` when you need the lodash result:

```ts
import { difference, unique } from "@jdsalasc/solvejs-list";

difference(unique(rows), blacklist); // matches _.difference
```

## Install

```bash
npm i @jdsalasc/solvejs-list
```

## Quick example

```ts
import { uniqueBy, groupBy, countBy, pluck, sortBy } from "@jdsalasc/solvejs-list";

const rows = [{ id: "a", team: "x", score: 2 }, { id: "a", team: "x", score: 2 }, { id: "b", team: "y", score: 1 }];
const uniqueRows = uniqueBy(rows, (r) => r.id);
const byTeam = groupBy(uniqueRows, (r) => r.team);
const totals = countBy(rows, (r) => r.team);
const ids = pluck(uniqueRows, "id");
sortBy(byTeam.x, (r) => r.score, "desc");
```

## Scale note

For high-volume pipelines (`10k`/`100k` rows), run `npm run benchmark` from the monorepo to profile `uniqueBy`, `groupBy`, and `sortBy` with your real data shape.
