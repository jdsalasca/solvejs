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
