# @jdsalasc/solvejs-date

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-date)](https://www.npmjs.com/package/@jdsalasc/solvejs-date)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-date)](https://www.npmjs.com/package/@jdsalasc/solvejs-date)


Zero-dependency date utilities for JavaScript and TypeScript.

## Utilities

- `formatDate`, `toIsoDate`
- `parseDateStrict`, `parseIsoDate`, `parseUnixTimestamp`
- `addDays`, `addBusinessDays`, `nextBusinessDay`, `previousBusinessDay`, `diffInDays`
- `startOfDay`, `endOfDay`
- `isBusinessDay`, `isWeekend`, `isLeapYear`, `daysInMonth`

## When to use this package

Use it when you need predictable date parsing/formatting, UTC-safe operations, weekend-aware business-day math, and common date helpers without adding heavy dependencies.

## Limitations and Constraints

- Formatting tokens are intentionally limited to a small practical set.
- Helpers operate in UTC-safe mode and avoid locale-calendar formatting features.
- For advanced timezone rules per region, integrate a dedicated timezone library.

### Anchor your input Dates to UTC

The helpers read the UTC calendar of the `Date` you pass in. `new Date(2024, 3, 8)` builds a
**local** midnight, so in `Asia/Tokyo` it is really `2024-03-07T15:00:00Z` and every helper reports
the previous day. Build UTC-anchored inputs instead:

```ts
import { fromUtcParts, parseIsoDate, toIsoDate, addDays } from "@jdsalasc/solvejs-date";

const date = fromUtcParts(2024, 3, 8);        // 2024-03-08T00:00:00.000Z, stable everywhere
const parsed = parseIsoDate("2024-03-08");    // ISO date-only is parsed as UTC midnight
const noon = new Date("2024-03-08T12:00:00.000Z"); // explicit Z, same calendar day everywhere

toIsoDate(addDays(date, 1)); // "2024-03-09" on every host
```

Midday UTC (`T12:00:00.000Z`) is the safest anchor for test fixtures, because no real timezone
offset from -12 to +14 moves it to another calendar day.

### parseIsoDate is lenient on purpose

`parseIsoDate` delegates to `new Date(value)`, which means it inherits two platform behaviours that
can surprise you. Use `parseDateStrict` for untrusted or user-supplied input.

```ts
parseIsoDate("2026-02-30");  // 2026-03-02, an impossible day rolls forward
parseDateStrict("2026-02-30"); // null

parseIsoDate("07/02/2026");   // 2 July, read as US M/D/Y in LOCAL time
parseDateStrict("07/02/2026"); // null, unless you pass "DD/MM/YYYY"
```

`nextBusinessDay` and `previousBusinessDay` always move, so calling one on a business day gives the
next/previous one rather than the same day.

```ts
toIsoDate(nextBusinessDay(fromUtcParts(2024, 3, 11))); // "2024-03-12", a Monday moves to Tuesday
```

## Install

```bash
npm i @jdsalasc/solvejs-date
```

## Quick example

```ts
import { parseDateStrict, addBusinessDays, toIsoDate } from "@jdsalasc/solvejs-date";

const d = parseDateStrict("2026-02-07", "YYYY-MM-DD");
const next = addBusinessDays(d!, 3);
toIsoDate(next); // "2026-02-11"
```

## DST/Timezone matrix quick check

Every helper reads the UTC calendar of its input, so a daylight saving transition cannot change the
answer. This is pinned by tests that run the same assertions under `UTC`, `America/New_York`,
`Europe/Madrid`, `Australia/Sydney` and `Asia/Kolkata` at the exact transition instants of 2024.

```ts
import { diffInDays, parseIsoDate } from "@jdsalasc/solvejs-date";

const usStart = parseIsoDate("2026-03-08T06:59:59.000Z");
const usEnd = parseIsoDate("2026-03-09T06:59:59.000Z");
const euStart = parseIsoDate("2026-03-29T00:59:59.000Z");
const euEnd = parseIsoDate("2026-03-30T00:59:59.000Z");

if (usStart && usEnd) diffInDays(usEnd, usStart); // 1
if (euStart && euEnd) diffInDays(euEnd, euStart); // 1
```

`diffInDays` is `left - right`, which is what `date-fns` does, so a later date in the first position
returns a negative number. Say it plainly, because getting it backwards is the one mistake this
function invites:

```ts
diffInDays(new Date("2024-01-02T00:00:00Z"), new Date("2024-01-01T00:00:00Z")); // 1
diffInDays(new Date("2024-01-01T00:00:00Z"), new Date("2024-01-02T00:00:00Z")); // -1
```

Business-day arithmetic is UTC too, so a month that ends on a weekend resolves to the following
Monday regardless of where the code runs. Holidays are not consulted; only Saturday and Sunday are
skipped.

```ts
addBusinessDays(new Date("2024-01-31T12:00:00Z"), 1); // "2024-02-01", Wednesday month end
addBusinessDays(new Date("2024-03-31T12:00:00Z"), 1); // "2024-04-01", Sunday month end skips the weekend
```
