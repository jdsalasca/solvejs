# @jdsalasc/solvejs-date

Date utilities for common JavaScript and TypeScript tasks.

## Install

```bash
npm i @jdsalasc/solvejs-date
```

## Example

```ts
import { formatDate, addDays } from "@jdsalasc/solvejs-date";

formatDate(new Date("2026-02-07T00:00:00.000Z"), "YYYY-MM-DD");
addDays(new Date("2026-02-07T00:00:00.000Z"), 5);
```
