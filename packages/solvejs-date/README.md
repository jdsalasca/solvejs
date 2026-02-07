# @jdsalasc/solvejs-date

Zero-dependency date utilities for JavaScript and TypeScript.

## Utilities

- `formatDate`, `toIsoDate`
- `parseDateStrict`, `parseIsoDate`, `parseUnixTimestamp`
- `addDays`, `diffInDays`
- `startOfDay`, `endOfDay`
- `isLeapYear`, `daysInMonth`

## When to use this package

Use it when you need predictable date parsing/formatting, UTC-safe operations, and common date math without adding heavy dependencies.

## Install

```bash
npm i @jdsalasc/solvejs-date
```

## Quick example

```ts
import { parseDateStrict, addDays, toIsoDate } from "@jdsalasc/solvejs-date";

const d = parseDateStrict("2026-02-07", "YYYY-MM-DD");
const next = addDays(d!, 3);
toIsoDate(next); // "2026-02-10"
```
