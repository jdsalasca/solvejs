import test from "node:test";
import assert from "node:assert/strict";
import {
  PaginationError,
  clampPage,
  cursorToOffset,
  offsetToCursor,
  pageCount,
  pageToOffset,
  offsetToPage,
  paginate,
  withPagination
} from "../dist/esm/index.js";

test("offsetToPage and pageToOffset round trip", () => {
  assert.equal(offsetToPage(0, 20), 1);
  assert.equal(offsetToPage(1, 20), 1);
  assert.equal(offsetToPage(20, 20), 2);
  assert.equal(offsetToPage(39, 20), 2);
  assert.equal(offsetToPage(40, 20), 3);

  // Only a page-aligned offset round trips, because a page is identified by its start.
  for (const [offset, perPage] of [[0, 20], [20, 20], [40, 20], [98, 7], [1000, 50]]) {
    assert.equal(pageToOffset(offsetToPage(offset, perPage), perPage), offset, `${offset}/${perPage} round trips`);
  }
  assert.equal(
    pageToOffset(offsetToPage(19, 20), 20),
    0,
    "an offset inside a page resolves to that page's start, not back to the offset"
  );
});

test("offsetToPage uses 1-based pages", () => {
  assert.equal(offsetToPage(0, 10), 1, "the first item is page 1");
  assert.equal(pageToOffset(1, 10), 0);
  assert.throws(() => offsetToPage(0, 0), /PaginationError|perPage/);
  assert.throws(() => offsetToPage(0, -1), /PaginationError|perPage/);
  assert.throws(() => offsetToPage(0, 1.5), /PaginationError|perPage/);
  assert.throws(() => offsetToPage(-1, 10), /PaginationError|offset/);
});

test("pageToOffset validates the page number", () => {
  assert.equal(pageToOffset(1, 20), 0);
  assert.equal(pageToOffset(2, 20), 20);
  assert.equal(pageToOffset(3, 20), 40);
  assert.throws(() => pageToOffset(0, 20), /PaginationError|page/, "pages start at 1");
  assert.throws(() => pageToOffset(-1, 20), /PaginationError|page/);
  assert.throws(() => pageToOffset(1.5, 20), /PaginationError|page/);
  assert.throws(() => pageToOffset(1, 0), /PaginationError|perPage/);
});

test("pageCount", () => {
  assert.equal(pageCount(0, 20), 0, "no items means no pages");
  assert.equal(pageCount(1, 20), 1);
  assert.equal(pageCount(20, 20), 1);
  assert.equal(pageCount(21, 20), 2);
  assert.equal(pageCount(40, 20), 2, "an exact multiple does not add an empty page");
  assert.equal(pageCount(41, 20), 3);
  assert.equal(pageCount(100, 7), 15);

  assert.throws(() => pageCount(-1, 20), /PaginationError|total/);
  assert.throws(() => pageCount(10, 0), /PaginationError|perPage/);
  assert.throws(() => pageCount(10, -5), /PaginationError|perPage/);
});

test("clampPage keeps a page inside the available range", () => {
  assert.equal(clampPage(1, 100, 20), 1);
  assert.equal(clampPage(3, 100, 20), 3);
  assert.equal(clampPage(5, 100, 20), 5);
  assert.equal(clampPage(6, 100, 20), 5, "a page past the end is clamped");
  assert.equal(clampPage(99, 100, 20), 5);
  assert.equal(clampPage(0, 100, 20), 1, "a page below 1 is clamped up");
  assert.equal(clampPage(-5, 100, 20), 1);

  assert.equal(clampPage(1, 0, 20), 1, "an empty collection still reports page 1");
  assert.equal(clampPage(5, 0, 20), 1);

  assert.throws(() => clampPage(1, -1, 20), /PaginationError|total/);
  assert.throws(() => clampPage(1, 10, 0), /PaginationError|perPage/);
});

test("offsetToCursor and cursorToOffset round trip", () => {
  assert.equal(offsetToCursor(0), "0");
  assert.equal(offsetToCursor(40), "40");
  assert.equal(cursorToOffset("0"), 0);
  assert.equal(cursorToOffset("40"), 40);

  for (const offset of [0, 7, 100, 99999]) {
    assert.equal(cursorToOffset(offsetToCursor(offset)), offset, `${offset} round trips`);
  }

  assert.equal(offsetToCursor(10, "idx_"), "idx_10", "a prefix is applied");
  assert.equal(cursorToOffset("idx_10", "idx_"), 10);
  assert.equal(
    cursorToOffset("idx_10"),
    null,
    "the prefix must be supplied to read a prefixed cursor, which is what makes it opaque"
  );
  assert.equal(cursorToOffset("10", "idx_"), 10, "an unprefixed cursor reads without the prefix");
  assert.equal(cursorToOffset("nonsense"), null, "an unparsable cursor is null rather than a throw");
  assert.equal(cursorToOffset(""), null);
  assert.equal(cursorToOffset("-1"), null, "a negative offset is not a cursor");
  assert.throws(() => cursorToOffset(10), /PaginationError|cursor/);
});

test("paginate slices a collection", () => {
  const items = Array.from({ length: 95 }, (_, index) => index + 1);

  const first = paginate(items, { page: 1, perPage: 20 });
  assert.equal(first.page, 1);
  assert.equal(first.perPage, 20);
  assert.equal(first.total, 95);
  assert.equal(first.totalPages, 5);
  assert.equal(first.hasPrevious, false);
  assert.equal(first.hasNext, true);
  assert.deepEqual(first.items, items.slice(0, 20));

  const last = paginate(items, { page: 5, perPage: 20 });
  assert.equal(last.items.length, 15);
  assert.equal(last.hasNext, false);
  assert.equal(last.hasPrevious, true);

  const empty = paginate([], { page: 1, perPage: 20 });
  assert.deepEqual(empty.items, []);
  assert.equal(empty.total, 0);
  assert.equal(empty.totalPages, 0);
  assert.equal(empty.hasNext, false);
});

test("paginate clamps an out-of-range page by default", () => {
  const items = Array.from({ length: 30 }, (_, index) => index);

  const clamped = paginate(items, { page: 99, perPage: 10 });
  assert.equal(clamped.page, 3, "the page is clamped to the last one");
  assert.deepEqual(clamped.items, items.slice(20, 30));

  assert.equal(paginate(items, { page: 0, perPage: 10 }).page, 1, "page 0 is clamped up to 1");

  assert.throws(
    () => paginate(items, { page: 99, perPage: 10, clamp: false }),
    /PaginationError|page/,
    "clamp false surfaces the out-of-range page instead"
  );
});

test("paginate does not mutate the input", () => {
  const items = [1, 2, 3, 4, 5];
  const before = [...items];
  const result = paginate(items, { page: 1, perPage: 2 });

  assert.deepEqual(items, before);
  assert.notEqual(result.items, items, "the slice is a new array");
});

test("paginate validates perPage against a maximum", () => {
  const items = [1, 2, 3];

  assert.throws(() => paginate(items, { page: 1, perPage: 0 }), /PaginationError|perPage/);
  assert.throws(() => paginate(items, { page: 1, perPage: -1 }), /PaginationError|perPage/);
  assert.throws(
    () => paginate(items, { page: 1, perPage: 500, maxPerPage: 100 }),
    /PaginationError|maxPerPage|perPage/,
    "a perPage above the cap is refused"
  );
  assert.equal(paginate(items, { page: 1, perPage: 100, maxPerPage: 100 }).items.length, 3);
  assert.equal(paginate(items, { page: 1, perPage: 2, maxPerPage: 0 }).items.length, 2, "maxPerPage 0 means no cap");
});

test("withPagination builds an API response envelope", () => {
  const items = Array.from({ length: 30 }, (_, index) => ({ id: index }));
  // withPagination wraps, it does not slice: the caller already holds one page, which is why it
  // passes `total` separately.
  const secondPage = items.slice(10, 20);

  const envelope = withPagination(secondPage, { total: 30, page: 2, perPage: 10 });
  assert.deepEqual(envelope, {
    data: secondPage,
    meta: {
      page: 2,
      perPage: 10,
      total: 30,
      totalPages: 3,
      hasPrevious: true,
      hasNext: true
    }
  });

  assert.notEqual(envelope.data, secondPage, "the data array is copied, not shared");
  envelope.data.push({ id: 999 });
  assert.equal(secondPage.length, 10, "mutating the response leaves the caller's array alone");

  const withLinks = withPagination(secondPage, {
    total: 30,
    page: 2,
    perPage: 10,
    baseUrl: "https://api.dev/items"
  });
  assert.equal(withLinks.meta.links?.self, "https://api.dev/items?page=2&perPage=10");
  assert.equal(withLinks.meta.links?.first, "https://api.dev/items?page=1&perPage=10");
  assert.equal(withLinks.meta.links?.last, "https://api.dev/items?page=3&perPage=10");
  assert.equal(withLinks.meta.links?.previous, "https://api.dev/items?page=1&perPage=10");
  assert.equal(withLinks.meta.links?.next, "https://api.dev/items?page=3&perPage=10");

  assert.equal(
    withLinks.meta.links?.self,
    "https://api.dev/items?page=2&perPage=10",
    "links are built"
  );
  assert.equal(
    withPagination(secondPage, { total: 30, page: 2, perPage: 10, baseUrl: "https://api.dev/items?filter=a" })
      .meta.links?.self,
    "https://api.dev/items?filter=a&page=2&perPage=10",
    "an existing query string is appended to, not replaced"
  );

  assert.equal(withPagination(secondPage, { total: 30, page: 1, perPage: 10 }).meta.links, undefined, "no links without a baseUrl");
  assert.equal(
    withPagination([], { total: 30, page: 99, perPage: 10 }).meta.page,
    3,
    "an out-of-range page is clamped"
  );
  assert.equal(withPagination([], { total: 0, page: 1, perPage: 10 }).meta.totalPages, 0);
});

test("PaginationError carries a stable code and context", () => {
  const error = new PaginationError("PAGINATION_INVALID_PAGE", "Expected page to be at least 1.", {
    page: 0
  });

  assert.ok(error instanceof PaginationError);
  assert.ok(error instanceof Error);
  assert.equal(error.name, "PaginationError");
  assert.equal(error.code, "PAGINATION_INVALID_PAGE");
  assert.equal(error.message, "Expected page to be at least 1.");
  assert.deepEqual(error.details, { page: 0 });
});
test("paginate rejects a non-array collection and a non-integer page", () => {
  assert.throws(() => paginate("nope", { page: 1, perPage: 10 }), /PaginationError|array/);
  assert.throws(() => paginate(null, { page: 1, perPage: 10 }), /PaginationError|array/);
  assert.throws(() => paginate(undefined, { page: 1, perPage: 10 }), /PaginationError|array/);
  assert.throws(() => paginate({ length: 3 }, { page: 1, perPage: 10 }), /PaginationError|array/, "an array-like is not an array");

  assert.throws(() => paginate([1, 2], { page: 1.5, perPage: 10 }), /PaginationError|page/);
  assert.throws(() => paginate([1, 2], { page: NaN, perPage: 10 }), /PaginationError|page/);
  assert.throws(() => paginate([1, 2], { page: "2", perPage: 10 }), /PaginationError|page/);

  assert.deepEqual(paginate([1, 2], { page: 1, perPage: 10 }).items, [1, 2]);
});

test("cursorToOffset rejects a non-string cursor", () => {
  assert.throws(() => cursorToOffset(10), /PaginationError|cursor/);
  assert.throws(() => cursorToOffset(null), /PaginationError|cursor/);
  assert.throws(() => cursorToOffset({}), /PaginationError|cursor/);

  assert.equal(cursorToOffset("0"), 0);
  assert.equal(cursorToOffset("007"), 7, "leading zeros are accepted");
  assert.equal(cursorToOffset("99999999999999999999"), null, "an unsafe integer is refused");
  assert.equal(cursorToOffset("10.5"), null);
  assert.equal(cursorToOffset(" 10"), null, "surrounding whitespace is refused");
  assert.equal(cursorToOffset("-0"), null);
  assert.equal(offsetToCursor(0, "idx_"), "idx_0");
});

test("withPagination validates its inputs", () => {
  const items = [1, 2, 3];

  assert.throws(() => withPagination(items, { total: 30, page: 1, perPage: 0 }), /PaginationError|perPage/);
  assert.throws(() => withPagination(items, { total: -1, page: 1, perPage: 10 }), /PaginationError|total/);
  assert.throws(() => withPagination(items, { total: 1.5, page: 1, perPage: 10 }), /PaginationError|total/);
  assert.throws(() => withPagination(items, { total: 30, page: 1, perPage: 10.5 }), /PaginationError|perPage/);

  assert.deepEqual(
    withPagination([], { total: 0, page: 1, perPage: 10 }).meta,
    { page: 1, perPage: 10, total: 0, totalPages: 0, hasPrevious: false, hasNext: false },
    "an empty collection still reports page 1"
  );
});