/** Stable cache codes. */
export type CacheErrorCode =
  | "CACHE_INVALID_OPTION"
  | "CACHE_INVALID_KEY"
  | "CACHE_LOADER_FAILED";

/**
 * Error thrown by the cache utilities.
 *
 * Carries a stable machine-readable `code` and a `details` context object so
 * callers can branch on the code instead of matching message text.
 */
export class CacheError extends Error {
  readonly code: CacheErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: CacheErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "CacheError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, CacheError.prototype);
  }
}

function fail(code: CacheErrorCode, message: string, details: Record<string, unknown> = {}): never {
  throw new CacheError(code, message, details);
}

function assertPositiveNumber(value: unknown, option: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    fail("CACHE_INVALID_OPTION", `Expected ${option} to be a positive finite number.`, {
      option,
      received: value
    });
  }
}

function assertPositiveInteger(value: unknown, option: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    fail("CACHE_INVALID_OPTION", `Expected ${option} to be a positive integer.`, {
      option,
      received: value
    });
  }
}

function assertKey(key: unknown): asserts key is string {
  if (typeof key !== "string" || key.length === 0) {
    fail("CACHE_INVALID_KEY", "Expected key to be a non-empty string.", { received: key });
  }
}

function defaultNow(): number {
  return Date.now();
}

/**
 * Serialises a value into a deterministic string suitable for use as a cache key.
 *
 * Object keys are sorted at every depth, so two structurally equal values always
 * produce the same string regardless of insertion order. Array order is preserved
 * because it is meaningful.
 *
 * @param value - Value to serialise. Must not contain cycles.
 * @returns Deterministic string key.
 * @throws {CacheError} `CACHE_INVALID_OPTION` if the value contains a cycle.
 */
export function stableKey(value: unknown): string {
  const seen = new WeakSet();

  const walk = (input: unknown): string => {
    if (input === undefined) return "undefined";
    if (input === null) return "null";
    // A non-finite number is emitted with a leading "!" so it can never collide with
// the string "NaN" or "Infinity", which JSON.stringify would render identically.
if (typeof input === "number") return Number.isFinite(input) ? String(input) : `!${String(input)}`;
    if (typeof input === "boolean" || typeof input === "string") return JSON.stringify(input);
    if (typeof input === "bigint") return `!${input.toString()}n`;
    if (typeof input === "function" || typeof input === "symbol") {
      fail("CACHE_INVALID_OPTION", "Expected a value that can be serialised to a cache key.", {
        received: typeof input
      });
    }

    if (seen.has(input as object)) {
      fail("CACHE_INVALID_OPTION", "Expected a value without circular references.", { received: "circular" });
    }
    seen.add(input as object);

    try {
      if (Array.isArray(input)) {
        return `[${input.map(walk).join(",")}]`;
      }
      const entries = Object.entries(input as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        // Keys of one entry set are unique, so a tie cannot happen and 0 is never needed.
  .sort(([a], [b]) => (a < b ? -1 : 1));
      return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${walk(entryValue)}`).join(",")}}`;
    } finally {
      seen.delete(input as object);
    }
  };

  return walk(value);
}

/** Options for {@link createTtlCache}. */
export type TtlCacheOptions = {
  /** How long an entry stays fresh, in milliseconds. */
  ttlMs: number;
  /** Clock source. Defaults to `Date.now`. */
  now?: () => number;
};

/** A cache that expires entries after a fixed time to live. */
export interface TtlCache<T = unknown> {
  get(key: string): T | undefined;
  set(key: string, value: T, options?: { ttlMs?: number }): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  keys(): string[];
  size(): number;
}

/**
 * Creates a time-to-live cache backed by a Map.
 *
 * Expired entries are removed lazily when they are read, so `keys` and `size`
 * always reflect what a caller would actually get back.
 *
 * @param options - Cache options.
 * @param options.ttlMs - Default lifetime of an entry.
 * @param options.now - Clock source, injectable for tests.
 * @returns The cache.
 * @throws {CacheError} `CACHE_INVALID_OPTION` if `ttlMs` is not a positive finite number.
 *
 * @example
 * const cache = createTtlCache<string>({ ttlMs: 60_000 });
 * cache.set("token", "abc");
 * cache.get("token"); // "abc"
 */
export function createTtlCache<T = unknown>(options: TtlCacheOptions): TtlCache<T> {
  assertPositiveNumber(options?.ttlMs, "ttlMs");
  const now = options.now ?? defaultNow;
  const entries = new Map<string, { value: T; expiresAt: number }>();

  const read = (key: string) => {
    const entry = entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now()) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  };

  return {
    get(key) {
      assertKey(key);
      return read(key)?.value;
    },
    set(key, value, setOptions) {
      assertKey(key);
      const ttlMs = setOptions?.ttlMs ?? options.ttlMs;
      assertPositiveNumber(ttlMs, "ttlMs");
      entries.delete(key);
      entries.set(key, { value, expiresAt: now() + ttlMs });
    },
    has(key) {
      assertKey(key);
      return read(key) !== undefined;
    },
    delete(key) {
      assertKey(key);
      return entries.delete(key);
    },
    clear() {
      entries.clear();
    },
    keys() {
      for (const key of [...entries.keys()]) read(key);
      return [...entries.keys()];
    },
    size() {
      return this.keys().length;
    }
  };
}

/** Options for {@link createLruCache}. */
export type LruCacheOptions = {
  /** Maximum number of live entries. */
  maxSize: number;
  /** Optional lifetime of an entry in milliseconds. */
  ttlMs?: number;
  /** Clock source. Defaults to `Date.now`. */
  now?: () => number;
};

/**
 * Creates a cache that evicts the least recently used entry once `maxSize` is exceeded.
 *
 * Reading an entry marks it as recently used, so a hot key survives eviction.
 *
 * @param options - Cache options.
 * @param options.maxSize - Maximum live entries.
 * @param options.ttlMs - Optional per-entry lifetime.
 * @param options.now - Clock source, injectable for tests.
 * @returns The cache.
 * @throws {CacheError} `CACHE_INVALID_OPTION` if `maxSize` or `ttlMs` is invalid.
 *
 * @example
 * const cache = createLruCache<number>({ maxSize: 100 });
 * cache.set("a", 1);
 * cache.get("a");
 */
export function createLruCache<T = unknown>(options: LruCacheOptions): TtlCache<T> {
  assertPositiveInteger(options?.maxSize, "maxSize");
  if (options.ttlMs !== undefined) assertPositiveNumber(options.ttlMs, "ttlMs");

  const now = options.now ?? defaultNow;
  const entries = new Map<string, { value: T; expiresAt: number }>();

  const dropExpired = (key: string) => {
    const entry = entries.get(key);
    if (entry && entry.expiresAt <= now()) {
      entries.delete(key);
      return true;
    }
    return false;
  };

  const touch = (key: string) => {
    const entry = entries.get(key);
    if (!entry) return undefined;
    entries.delete(key);
    entries.set(key, entry);
    return entry;
  };

  const cache: TtlCache<T> = {
    get(key) {
      assertKey(key);
      if (dropExpired(key)) return undefined;
      return touch(key)?.value;
    },
    set(key, value) {
      assertKey(key);
      const ttlMs = options.ttlMs ?? Number.POSITIVE_INFINITY;
      entries.delete(key);
      entries.set(key, { value, expiresAt: now() + ttlMs });
      while (entries.size > options.maxSize) {
        // maxSize is at least 1 and the loop only runs while entries is larger, so the
        // oldest key always exists.
        const oldest = entries.keys().next();
        entries.delete(oldest.value as string);
      }
    },
    has(key) {
      assertKey(key);
      if (dropExpired(key)) return false;
      return entries.has(key);
    },
    delete(key) {
      assertKey(key);
      return entries.delete(key);
    },
    clear() {
      entries.clear();
    },
    keys() {
      for (const key of [...entries.keys()]) dropExpired(key);
      return [...entries.keys()];
    },
    size() {
      return cache.keys().length;
    }
  };

  return cache;
}

/** Options for {@link memoizeAsync}. */
export type MemoizeAsyncOptions = {
  /** Entry lifetime in milliseconds. Omit or pass 0 to never expire. */
  ttlMs?: number;
  /** Builds the cache key from the call arguments. Defaults to {@link stableKey} of the argument list. */
  key?: (...args: unknown[]) => string;
  /** Clock source. Defaults to `Date.now`. */
  now?: () => number;
};

/** A memoized async function. */
export type MemoizedAsync<TArgs extends unknown[], TResult> = ((...args: TArgs) => Promise<TResult>) & {
  clear(): void;
  delete(...args: TArgs): boolean;
  readonly size: number;
};

/**
 * Memoizes an async function, sharing one in-flight promise per key.
 *
 * A rejected call is not cached, so a transient failure does not poison the entry.
 *
 * @param factory - Function to memoize.
 * @param options - Memoization options.
 * @param options.ttlMs - Entry lifetime. Omit to keep entries until cleared.
 * @param options.key - Custom key builder.
 * @param options.now - Clock source, injectable for tests.
 * @returns The memoized function, with `clear`, `delete` and `size`.
 * @throws {CacheError} `CACHE_INVALID_OPTION` if `ttlMs` or `key` is invalid.
 *
 * @example
 * const loadUser = memoizeAsync(async (id: string) => fetchUser(id));
 * await loadUser("u1"); // one request
 * await loadUser("u1"); // served from memory
 */
export function memoizeAsync<TArgs extends unknown[], TResult>(
  factory: (...args: TArgs) => Promise<TResult> | TResult,
  options: MemoizeAsyncOptions = {}
): MemoizedAsync<TArgs, TResult> {
  if (typeof factory !== "function") {
    fail("CACHE_INVALID_OPTION", "Expected factory to be a function.", { received: typeof factory });
  }
  if (options.ttlMs !== undefined) assertPositiveNumber(options.ttlMs, "ttlMs");
  if (options.key !== undefined && typeof options.key !== "function") {
    fail("CACHE_INVALID_OPTION", "Expected key to be a function.", { received: typeof options.key });
  }

  const now = options.now ?? defaultNow;
  const ttlMs = options.ttlMs ?? Number.POSITIVE_INFINITY;
  const keyOf = options.key ?? ((...args: unknown[]) => stableKey(args));

  const entries = new Map<string, { promise: Promise<TResult>; expiresAt: number }>();

  const memoized = ((...args: TArgs) => {
    const key = keyOf(...args);
    const existing = entries.get(key);

    if (existing && existing.expiresAt > now()) {
      return existing.promise;
    }
    if (existing) entries.delete(key);

    const promise = (async () => factory(...args))();
    entries.set(key, { promise, expiresAt: now() + ttlMs });

    // A rejection must not stay cached, but the handler has to be attached
    // synchronously to avoid an unhandled rejection warning.
    promise.catch(() => {
      const current = entries.get(key);
      if (current && current.promise === promise) entries.delete(key);
    });

    return promise;
  }) as MemoizedAsync<TArgs, TResult>;

  memoized.clear = () => entries.clear();
  memoized.delete = (...args: TArgs) => entries.delete(keyOf(...args));
  Object.defineProperty(memoized, "size", { get: () => entries.size });

  return memoized;
}

/** Options for {@link createStaleWhileRevalidate}. */
export type StaleWhileRevalidateOptions = {
  /** How long a value counts as fresh, in milliseconds. */
  freshMs: number;
  /** How long a stale value may still be served while a refresh runs. */
  staleMs: number;
  /** Clock source. Defaults to `Date.now`. */
  now?: () => number;
};

/** A stale-while-revalidate reader. */
export type StaleWhileRevalidate<T> = () => Promise<T>;

/**
 * Wraps a loader so a stale value can be served while a refresh runs in the background.
 *
 * Inside `freshMs` the cached value is returned as-is. Between `freshMs` and `staleMs` the stale
 * value is returned immediately and the loader runs in the background. Past `staleMs` the loader
 * is awaited, so a caller never receives arbitrarily old data.
 *
 * @param loader - Async producer of the value.
 * @param options - Window options.
 * @param options.freshMs - Freshness window.
 * @param options.staleMs - Staleness window, must be at least `freshMs`.
 * @param options.now - Clock source, injectable for tests.
 * @returns A reader function.
 * @throws {CacheError} `CACHE_INVALID_OPTION` if either window is invalid.
 *
 * @example
 * const read = createStaleWhileRevalidate(fetchConfig, { freshMs: 30_000, staleMs: 300_000 });
 * await read(); // first call loads
 * await read(); // fresh, no reload
 */
export function createStaleWhileRevalidate<T>(
  loader: () => Promise<T>,
  options: StaleWhileRevalidateOptions
): StaleWhileRevalidate<T> {
  if (typeof loader !== "function") {
    fail("CACHE_INVALID_OPTION", "Expected loader to be a function.", { received: typeof loader });
  }
  assertPositiveNumber(options?.freshMs, "freshMs");
  assertPositiveNumber(options?.staleMs, "staleMs");
  if (options.staleMs < options.freshMs) {
    fail("CACHE_INVALID_OPTION", "Expected staleMs to be greater than or equal to freshMs.", {
      freshMs: options.freshMs,
      staleMs: options.staleMs
    });
  }

  const now = options.now ?? defaultNow;
  let entry: { value: T; storedAt: number } | undefined;
  let inFlight: Promise<T> | undefined;

  const refresh = () => {
    if (inFlight) return inFlight;

    inFlight = (async () => {
      try {
        const value = await loader();
        entry = { value, storedAt: now() };
        return value;
      } finally {
        inFlight = undefined;
      }
    })();

    return inFlight;
  };

  return async () => {
    if (!entry) return refresh();

    const age = now() - entry.storedAt;
    if (age < options.freshMs) return entry.value;

    if (age < options.staleMs) {
      // Serve the stale value now and let the refresh finish in the background.
      void refresh().catch(() => undefined);
      return entry.value;
    }

    return refresh();
  };
}