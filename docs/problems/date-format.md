# How to format dates in JavaScript

Use `@jdsalasc/solvejs-date` when you need strict parsing, stable formatting tokens, and UTC-safe date math.

```ts
import { parseDateStrict, formatDate, addDays, toIsoDate } from "@jdsalasc/solvejs-date";

const parsed = parseDateStrict("2026-02-07", "YYYY-MM-DD");
if (parsed) {
  const inThreeDays = addDays(parsed, 3);
  formatDate(inThreeDays, "DD/MM/YYYY"); // "10/02/2026"
  toIsoDate(inThreeDays); // "2026-02-10"
}
```

## Regional timezone/DST matrix (UTC-safe checks)

Use UTC ISO timestamps for boundaries and compare with `diffInDays`:

```ts
import { diffInDays, parseIsoDate } from "@jdsalasc/solvejs-date";

const windows = [
  { region: "US/Eastern DST starts", start: "2026-03-08T06:59:59.000Z", end: "2026-03-09T06:59:59.000Z" },
  { region: "Europe/Madrid DST starts", start: "2026-03-29T00:59:59.000Z", end: "2026-03-30T00:59:59.000Z" },
  { region: "America/Bogota (no DST)", start: "2026-03-08T00:00:00.000Z", end: "2026-03-09T00:00:00.000Z" }
];

for (const window of windows) {
  const start = parseIsoDate(window.start);
  const end = parseIsoDate(window.end);
  if (!start || !end) throw new Error(`Invalid ISO window for ${window.region}`);
  console.log(window.region, diffInDays(end, start)); // always 1
}
```

Reference matrix:

| Region / Case | Start (UTC) | End (UTC) | Expected `diffInDays(end, start)` |
|---|---|---|---|
| US/Eastern DST starts (Mar 8, 2026) | `2026-03-08T06:59:59.000Z` | `2026-03-09T06:59:59.000Z` | `1` |
| Europe/Madrid DST starts (Mar 29, 2026) | `2026-03-29T00:59:59.000Z` | `2026-03-30T00:59:59.000Z` | `1` |
| America/Bogota (no DST baseline) | `2026-03-08T00:00:00.000Z` | `2026-03-09T00:00:00.000Z` | `1` |

Notes:

- Keep event boundaries in UTC at ingest/store layers.
- Convert to local display timezone only in UI/reporting layers.
- When you need legal timezone calendars per city, combine this with a dedicated timezone library.
