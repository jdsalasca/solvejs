# Deduplicate and group analytics data

Common data pipeline task: dedupe by ID and then group by status.

```ts
import { uniqueBy, groupBy } from "@jdsalasc/solvejs-list";

const deduped = uniqueBy(rows, (row) => row.id);
const grouped = groupBy(deduped, (row) => row.status);
```

CTA: invite contributors to take a `good first issue`.

## Copy/paste snippet

```ts
import { uniqueBy, groupBy } from "@jdsalasc/solvejs-list";

const deduped = uniqueBy(rows, (row) => row.id);
const grouped = groupBy(deduped, (row) => row.status);
```

## Why this matters

- Reduces repeated utility boilerplate.
- Improves consistency in production code.
- Keeps runtime dependencies at zero.

Docs: https://jdsalasca.github.io/solvejs/?utm_source=social&utm_medium=post&utm_campaign=community_growth
npm: https://www.npmjs.com/package/@jdsalasc/solvejs?utm_source=social&utm_medium=post&utm_campaign=community_growth
