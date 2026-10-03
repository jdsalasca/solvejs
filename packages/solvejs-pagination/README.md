# @jdsalasc/solvejs-pagination

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-pagination)](https://www.npmjs.com/package/@jdsalasc/solvejs-pagination)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-pagination)](https://www.npmjs.com/package/@jdsalasc/solvejs-pagination)

Zero-dependency pagination utilities for offset and cursor conversion, page clamping, and API response envelopes.

## Utilities

- `pageToOffset`
- `offsetToPage`
- `pageCount`
- `clampPage`
- `offsetToCursor`
- `cursorToOffset`
- `paginate`
- `withPagination`
- `PaginationError`

## When to use this package

Use it when you hand-roll `?page=` and `?limit=` handling: converting between a page and a SQL
offset, clamping a page a client asked for that does not exist, counting pages for a pager, or
building the `{ data, meta }` envelope most APIs return.

## Install

```bash
npm i @jdsalasc/solvejs-pagination
```

## Quick example

```ts
import { pageToOffset, offsetToPage, pageCount, clampPage, paginate, withPagination } from "@jdsalasc/solvejs-pagination";

pageToOffset(3, 20);        // 40
offsetToPage(40, 20);       // 3
pageCount(41, 20);          // 3, an exact multiple does not add an empty page
clampPage(99, 100, 20);     // 5

const page = paginate(rows, { page: 2, perPage: 20, maxPerPage: 100 });
// { items: [...], page: 2, total, totalPages, hasPrevious: true, hasNext: true }

withPagination(rows, { total: 100, page: 2, perPage: 20, baseUrl: "https://api.dev/items" });
// { data: [...], meta: { page: 2, totalPages: 5, links: { self, first, last, previous, next } } }
```

## Pages are one-based

Page 1 is the first page, and offset 0 is its start. An offset inside a page resolves to that page's
start, so the round trip only holds for page-aligned offsets:

```ts
pageToOffset(offsetToPage(19, 20), 20); // 0, not 19
```

## Cursors

`offsetToCursor` encodes an offset as a string, optionally behind a prefix. The prefix is what makes
a cursor opaque to clients, and it is also required to read one back:

```ts
offsetToCursor(40, "idx_");   // "idx_40"
cursorToOffset("idx_40", "idx_"); // 40
cursorToOffset("idx_40");     // null, the prefix is needed to decode it
cursorToOffset("nonsense");   // null, never a throw
```

## Errors

| Code | Meaning |
|---|---|
| `PAGINATION_INVALID_PAGE` | Page is not a positive integer, or is out of range while `clamp` is `false`. |
| `PAGINATION_INVALID_PER_PAGE` | `perPage` is not positive, or exceeds `maxPerPage`. |
| `PAGINATION_INVALID_OFFSET` | Offset is not a non-negative integer. |
| `PAGINATION_INVALID_TOTAL` | Total is negative or not an integer, or the collection is not an array. |
| `PAGINATION_INVALID_CURSOR` | Cursor is not a string. |

## Limitations and Constraints

### withPagination wraps, it does not slice

`withPagination` puts the array you give it straight into `data` and only uses `page` and `total` for
the metadata. That is deliberate: you usually already hold one page from a query, and passing the
full collection by mistake would otherwise be sliced a second time and return the wrong rows.

```ts
const rows = await db.selectPage(2, 10, 30);   // already one page
withPagination(rows, { total: 30, page: 2, perPage: 10 });
```

Use `paginate` when you hold the whole collection and want it sliced.

### paginate clamps by default

A page past the end is silently moved to the last page, and a page below 1 is moved to 1. Pass
`clamp: false` when a client asking for page 99 of 3 should get an error instead of a short page.

### An empty collection still reports page 1

`pageCount` is `0` for an empty collection, but `clampPage` and `paginate` report page `1`, because
there is no page 0 to fall back to and clients render a pager starting at 1.

### maxPerPage is opt-in

There is no default cap, so `perPage: 100000` is accepted unless you pass `maxPerPage`. Set it at the
edge where a request comes in, not only where you slice.

### Links reuse the base query string

`withPagination` appends `page` and `perPage` to `baseUrl`, adding `&` when a query string is already
present. It does not encode the values, so pass a base URL that is already safe to embed.