# Parse date from mixed input safely

Teams receive dates from forms, CSV, and APIs in inconsistent formats. Parse strictly to avoid silent failures.

```ts
import { parseDateStrict, parseUnixTimestamp } from "@jdsalasc/solvejs-date";

parseDateStrict("2026-02-07", "YYYY-MM-DD");
parseUnixTimestamp("1738886400");
```

CTA: share this snippet and link docs + npm with UTM tags.

```ts
import { parseDateStrict, parseUnixTimestamp } from "@jdsalasc/solvejs-date";

parseDateStrict("2026-02-07", "YYYY-MM-DD");
parseUnixTimestamp("1738886400");
```

Useful links:
- Docs cookbook: https://jdsalasca.github.io/solvejs/?utm_source=social&utm_medium=post&utm_campaign=community_growth
- npm package: https://www.npmjs.com/package/@jdsalasc/solvejs?utm_source=social&utm_medium=post&utm_campaign=community_growth

If this solves a recurring issue in your team, comment with your use case.
