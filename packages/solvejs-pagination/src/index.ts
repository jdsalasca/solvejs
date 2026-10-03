/** Stable pagination error codes. */
export type PaginationErrorCode =
  | "PAGINATION_INVALID_PAGE"
  | "PAGINATION_INVALID_PER_PAGE"
  | "PAGINATION_INVALID_OFFSET"
  | "PAGINATION_INVALID_TOTAL"
  | "PAGINATION_INVALID_CURSOR";

/**
 * Error thrown by the pagination utilities.
 *
 * Carries a stable machine-readable `code` and a `details` context object.
 */
export class PaginationError extends Error {
  readonly code: PaginationErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: PaginationErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "PaginationError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, PaginationError.prototype);
  }
}

function fail(code: PaginationErrorCode, message: string, details: Record<string, unknown> = {}): never {
  throw new PaginationError(code, message, details);
}

function assertPositiveInteger(value: unknown, code: PaginationErrorCode, label: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    fail(code, `Expected ${label} to be a positive integer.`, { [label]: value });
  }
}

function assertNonNegativeInteger(value: unknown, code: PaginationErrorCode, label: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    fail(code, `Expected ${label} to be a non-negative integer.`, { [label]: value });
  }
}

/**
 * Converts a one-based page number into a zero-based offset.
 *
 * @param page - Page number, starting at 1.
 * @param perPage - Items per page.
 * @returns Zero-based offset.
 * @throws {PaginationError} `PAGINATION_INVALID_PAGE` or `PAGINATION_INVALID_PER_PAGE`.
 *
 * @example
 * pageToOffset(3, 20); // 40
 */
export function pageToOffset(page: number, perPage: number): number {
  assertPositiveInteger(page, "PAGINATION_INVALID_PAGE", "page");
  assertPositiveInteger(perPage, "PAGINATION_INVALID_PER_PAGE", "perPage");
  return (page - 1) * perPage;
}

/**
 * Converts a zero-based offset into a one-based page number.
 *
 * @param offset - Zero-based offset.
 * @param perPage - Items per page.
 * @returns Page number, starting at 1.
 * @throws {PaginationError} `PAGINATION_INVALID_OFFSET` or `PAGINATION_INVALID_PER_PAGE`.
 *
 * @example
 * offsetToPage(40, 20); // 3
 */
export function offsetToPage(offset: number, perPage: number): number {
  assertNonNegativeInteger(offset, "PAGINATION_INVALID_OFFSET", "offset");
  assertPositiveInteger(perPage, "PAGINATION_INVALID_PER_PAGE", "perPage");
  return Math.floor(offset / perPage) + 1;
}

/**
 * Counts how many pages a collection needs.
 *
 * Returns `0` for an empty collection, and never counts a trailing empty page when the total is an
 * exact multiple of `perPage`.
 *
 * @param total - Total number of items.
 * @param perPage - Items per page.
 * @returns Number of pages.
 * @throws {PaginationError} `PAGINATION_INVALID_TOTAL` or `PAGINATION_INVALID_PER_PAGE`.
 *
 * @example
 * pageCount(40, 20); // 2
 */
export function pageCount(total: number, perPage: number): number {
  assertNonNegativeInteger(total, "PAGINATION_INVALID_TOTAL", "total");
  assertPositiveInteger(perPage, "PAGINATION_INVALID_PER_PAGE", "perPage");
  return Math.ceil(total / perPage);
}

/**
 * Clamps a page number into the range that actually holds items.
 *
 * An empty collection still reports page 1, because there is no page 0 to fall back to.
 *
 * @param page - Requested page, one-based.
 * @param total - Total number of items.
 * @param perPage - Items per page.
 * @returns A page within `[1, pageCount]`.
 * @throws {PaginationError} `PAGINATION_INVALID_TOTAL` or `PAGINATION_INVALID_PER_PAGE`.
 */
export function clampPage(page: number, total: number, perPage: number): number {
  assertNonNegativeInteger(total, "PAGINATION_INVALID_TOTAL", "total");
  assertPositiveInteger(perPage, "PAGINATION_INVALID_PER_PAGE", "perPage");

  const lastPage = Math.max(1, pageCount(total, perPage));
  return Math.min(Math.max(1, page), lastPage);
}

/**
 * Encodes an offset as an opaque cursor string.
 *
 * @param offset - Zero-based offset.
 * @param prefix - Optional prefix, useful to tell cursors apart in one API.
 * @returns Cursor string.
 * @throws {PaginationError} `PAGINATION_INVALID_OFFSET`.
 */
export function offsetToCursor(offset: number, prefix = ""): string {
  assertNonNegativeInteger(offset, "PAGINATION_INVALID_OFFSET", "offset");
  return `${prefix}${offset}`;
}

/**
 * Decodes a cursor string back into an offset.
 *
 * @param cursor - Cursor produced by {@link offsetToCursor}.
 * @param prefix - Prefix to strip, when the cursor carries one.
 * @returns The offset, or `null` when the cursor is not a valid offset.
 * @throws {PaginationError} `PAGINATION_INVALID_CURSOR` if `cursor` is not a string.
 */
export function cursorToOffset(cursor: string, prefix = ""): number | null {
  if (typeof cursor !== "string") {
    fail("PAGINATION_INVALID_CURSOR", "Expected cursor to be a string.", { received: typeof cursor });
  }

  const raw = prefix && cursor.startsWith(prefix) ? cursor.slice(prefix.length) : cursor;
  if (!/^\d+$/.test(raw)) return null;

  const offset = Number(raw);
  return Number.isSafeInteger(offset) ? offset : null;
}

/** Options for {@link paginate}. */
export type PaginateOptions = {
  /** One-based page number. */
  page: number;
  /** Items per page. */
  perPage: number;
  /** Clamp an out-of-range page instead of throwing. Defaults to `true`. */
  clamp?: boolean;
  /** Upper bound accepted for `perPage`. `0` means no cap. */
  maxPerPage?: number;
};

/** A page of results with the numbers needed to render navigation. */
export type Page<T> = {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

/**
 * Slices a collection into a page and reports the navigation numbers.
 *
 * @param items - The full collection.
 * @param options - Page options.
 * @param options.page - Requested page, one-based.
 * @param options.perPage - Items per page.
 * @param options.clamp - Clamp an out-of-range page. Defaults to `true`.
 * @param options.maxPerPage - Upper bound accepted for `perPage`. `0` means no cap.
 * @returns The page slice plus metadata.
 * @throws {PaginationError} When `page` or `perPage` is invalid, or when `clamp` is `false` and the page is out of range.
 */
export function paginate<T>(items: readonly T[], options: PaginateOptions): Page<T> {
  if (!Array.isArray(items)) {
    fail("PAGINATION_INVALID_TOTAL", "Expected items to be an array.", { received: typeof items });
  }

  assertPositiveInteger(options?.perPage, "PAGINATION_INVALID_PER_PAGE", "perPage");

  const maxPerPage = options.maxPerPage ?? 0;
  if (maxPerPage > 0 && options.perPage > maxPerPage) {
    fail("PAGINATION_INVALID_PER_PAGE", `Expected perPage to be at most ${maxPerPage}.`, {
      perPage: options.perPage,
      maxPerPage
    });
  }

  const total = items.length;
  const totalPages = pageCount(total, options.perPage);
  const lastPage = Math.max(1, totalPages);

  let page = options.page;
  if (!Number.isInteger(page)) {
    fail("PAGINATION_INVALID_PAGE", "Expected page to be a positive integer.", { page });
  }

  if (page < 1 || page > lastPage) {
    if (options.clamp === false) {
      fail("PAGINATION_INVALID_PAGE", `Expected page to be between 1 and ${lastPage}.`, { page, lastPage });
    }
    page = Math.min(Math.max(1, page), lastPage);
  }

  const offset = pageToOffset(page, options.perPage);

  return {
    items: items.slice(offset, offset + options.perPage),
    page,
    perPage: options.perPage,
    total,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages
  };
}

/** Options for {@link withPagination}. */
export type WithPaginationOptions = {
  /** Total number of items across every page. */
  total: number;
  /** One-based page number. */
  page: number;
  /** Items per page. */
  perPage: number;
  /** Base URL used to build `meta.links`. Omit to leave links undefined. */
  baseUrl?: string;
};

/** A JSON-friendly API response envelope. */
export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
    links?: Record<"self" | "first" | "last" | "previous" | "next", string>;
  };
};

/**
 * Wraps a page of results in a conventional `{ data, meta }` response envelope.
 *
 * @param items - The items for the requested page.
 * @param options - Envelope options.
 * @param options.total - Total items across every page.
 * @param options.page - One-based page number.
 * @param options.perPage - Items per page.
 * @param options.baseUrl - Base URL for `meta.links`, including any existing query string.
 * @returns The response envelope.
 * @throws {PaginationError} When `total`, `page` or `perPage` is invalid.
 *
 * @example
 * withPagination(items, { total: 30, page: 2, perPage: 10, baseUrl: "https://api.dev/items" });
 * // { data: [...], meta: { page: 2, totalPages: 3, links: { ... } } }
 */
export function withPagination<T>(items: readonly T[], options: WithPaginationOptions): PaginatedResponse<T> {
  assertPositiveInteger(options?.perPage, "PAGINATION_INVALID_PER_PAGE", "perPage");
  assertNonNegativeInteger(options?.total, "PAGINATION_INVALID_TOTAL", "total");

  const totalPages = pageCount(options.total, options.perPage);
  const lastPage = Math.max(1, totalPages);
  const page = clampPage(options.page, options.total, options.perPage);

  const link = (target: number) => {
    const base = options.baseUrl ?? "";
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}page=${target}&perPage=${options.perPage}`;
  };

  const links = options.baseUrl
    ? {
        self: link(page),
        first: link(1),
        last: link(lastPage),
        previous: link(Math.max(1, page - 1)),
        next: link(Math.min(lastPage, page + 1))
      }
    : undefined;

  return {
    data: [...items],
    meta: {
      page,
      perPage: options.perPage,
      total: options.total,
      totalPages,
      hasPrevious: page > 1,
      hasNext: page < totalPages,
      ...(links ? { links } : {})
    }
  };
}