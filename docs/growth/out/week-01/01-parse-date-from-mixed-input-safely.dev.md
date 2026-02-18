# Parse date from mixed input safely

Teams receive dates from forms, CSV, and APIs in inconsistent formats. Parse strictly to avoid silent failures.

```ts
import { parseDateStrict, parseUnixTimestamp } from "@jdsalasc/solvejs-date";

parseDateStrict("2026-02-07", "YYYY-MM-DD");
parseUnixTimestamp("1738886400");
```

CTA: share this snippet and link docs + npm with UTM tags.

## Copy/paste snippet

```ts
import { parseDateStrict, parseUnixTimestamp } from "@jdsalasc/solvejs-date";

parseDateStrict("2026-02-07", "YYYY-MM-DD");
parseUnixTimestamp("1738886400");
```

## Why this matters

- Reduces repeated utility boilerplate.
- Improves consistency in production code.
- Keeps runtime dependencies at zero.

Docs: https://jdsalasca.github.io/solvejs/?utm_source=social&utm_medium=post&utm_campaign=community_growth
npm: https://www.npmjs.com/package/@jdsalasc/solvejs?utm_source=social&utm_medium=post&utm_campaign=community_growth
