# Deduplicate and group analytics data

Common data pipeline task: dedupe by ID and then group by status.

```ts
import { uniqueBy, groupBy } from "@jdsalasc/solvejs-list";

const deduped = uniqueBy(rows, (row) => row.id);
const grouped = groupBy(deduped, (row) => row.status);
```

CTA: invite contributors to take a `good first issue`.

```ts
import { uniqueBy, groupBy } from "@jdsalasc/solvejs-list";

const deduped = uniqueBy(rows, (row) => row.id);
const grouped = groupBy(deduped, (row) => row.status);
```

Useful links:
- Docs cookbook: https://jdsalasca.github.io/solvejs/?utm_source=social&utm_medium=post&utm_campaign=community_growth
- npm package: https://www.npmjs.com/package/@jdsalasc/solvejs?utm_source=social&utm_medium=post&utm_campaign=community_growth

If this solves a recurring issue in your team, comment with your use case.
