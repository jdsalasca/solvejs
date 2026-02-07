# How to format dates in JavaScript

Use `@jdsalasc/solvejs-date` when you need lightweight formatting and date arithmetic.

```ts
import { formatDate, addDays } from "@jdsalasc/solvejs-date";

const today = new Date("2026-02-07T00:00:00.000Z");
formatDate(today, "YYYY-MM-DD"); // "2026-02-07"
formatDate(addDays(today, 3), "DD/MM/YYYY"); // "10/02/2026"
```
