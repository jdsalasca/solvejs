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

type KeyPrimitive = { handled: true; text: string } | { handled: false };

const JSON_KEY_TYPES = new Set(["boolean", "string"]);
const UNSERIALISABLE_KEY_TYPES = new Set(["function", "symbol"]);

function stableNumberKey(value: number): string {
  return Number.isFinite(value) ? String(value) : `!${String(value)}`;
}

function keyPrimitive(input: unknown): KeyPrimitive {
  if (input === undefined) return { handled: true, text: "undefined" };
  if (input === null) return { handled: true, text: "null" };

  const type = typeof input;
  if (type === "number") return { handled: true, text: stableNumberKey(input as number) };
  if (JSON_KEY_TYPES.has(type)) return { handled: true, text: JSON.stringify(input) };
  if (type === "bigint") return { handled: true, text: `!${(input as bigint).toString()}n` };
  if (UNSERIALISABLE_KEY_TYPES.has(type)) {
    fail("CACHE_INVALID_OPTION", "Expected a value that can be serialised to a cache key.", { received: type });
  }
  return { handled: false };
}

function assertKeyNotCircular(input: object, seen: WeakSet<object>): void {
  if (seen.has(input)) {
    fail("CACHE_INVALID_OPTION", "Expected a value without circular references.", { received: "circular" });
  }
  seen.add(input);
}

function serialiseKeyObject(input: object, walk: (value: unknown) => string): string {
  if (Array.isArray(input)) return `[${input.map(walk).join(",")}]`;
  if (input instanceof Date) return `Date(${input.toISOString()})`;
  if (input instanceof RegExp) return `RegExp(${input.source}/${input.flags})`;
  if (input instanceof Map) {
    return `Map(${[...input.entries()].map(([key, value]) => `${walk(key)}=>${walk(value)}`).join(",")})`;
  }
  if (input instanceof Set) return `Set(${[...input.values()].map(walk).join(",")})`;
  if (ArrayBuffer.isView(input)) {
    return `View(${Object.prototype.toString.call(input)}:${Array.from(input as unknown as ArrayLike<number>).join(",")})`;
  }
  if (input instanceof ArrayBuffer) return `ArrayBuffer(${Array.from(new Uint8Array(input)).join(",")})`;

  const entries = Object.entries(input as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    // Keys of one entry set are unique, so a tie cannot happen and 0 is never needed.
    .sort(([a], [b]) => (a < b ? -1 : 1));

  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${walk(entryValue)}`).join(",")}}`;
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
  const seen = new WeakSet<object>();

  const walk = (input: unknown): string => {
    const primitive = keyPrimitive(input);
    if (primitive.handled) return primitive.text;

    const target = input as object;
    assertKeyNotCircular(target, seen);

    try {
      return serialiseKeyObject(target, walk);
    } finally {
      seen.delete(target);
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

type CacheEntry<T> = { value: T; expiresAt: number };

function readTtlEntry<T>(entries: Map<string, CacheEntry<T>>, key: string, now: () => number): CacheEntry<T> | undefined {
  const entry = entries.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= now()) {
    entries.delete(key);
    return undefined;
  }
  return entry;
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
  const entries = new Map<string, CacheEntry<T>>();

  return {
    get(key) {
      assertKey(key);
      return readTtlEntry(entries, key, now)?.value;
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
      return readTtlEntry(entries, key, now) !== undefined;
    },
    delete(key) {
      assertKey(key);
      return entries.delete(key);
    },
    clear() {
      entries.clear();
    },
    keys() {
      for (const key of [...entries.keys()]) readTtlEntry(entries, key, now);
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

function dropExpiredEntry<T>(entries: Map<string, CacheEntry<T>>, key: string, now: () => number): boolean {
  const entry = entries.get(key);
  if (entry && entry.expiresAt <= now()) {
    entries.delete(key);
    return true;
  }
  return false;
}

function touchEntry<T>(entries: Map<string, CacheEntry<T>>, key: string): CacheEntry<T> | undefined {
  const entry = entries.get(key);
  if (!entry) return undefined;
  entries.delete(key);
  entries.set(key, entry);
  return entry;
}

function evictOldest<T>(entries: Map<string, CacheEntry<T>>, maxSize: number): void {
  while (entries.size > maxSize) {
    // maxSize is at least 1 and the loop only runs while entries is larger, so the
    // oldest key always exists.
    const oldest = entries.keys().next();
    entries.delete(oldest.value as string);
  }
}

/* eslint-disable max-lines-per-function -- the cache methods share one closure */
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
  const entries = new Map<string, CacheEntry<T>>();

  const cache: TtlCache<T> = {
    get(key) {
      assertKey(key);
      if (dropExpiredEntry(entries, key, now)) return undefined;
      return touchEntry(entries, key)?.value;
    },
    set(key, value, setOptions) {
      assertKey(key);
      const ttlMs = setOptions?.ttlMs ?? options.ttlMs;
      if (ttlMs !== undefined) assertPositiveNumber(ttlMs, "ttlMs");
      entries.delete(key);
      entries.set(key, { value, expiresAt: now() + (ttlMs ?? Number.POSITIVE_INFINITY) });
      evictOldest(entries, options.maxSize);
    },
    has(key) {
      assertKey(key);
      if (dropExpiredEntry(entries, key, now)) return false;
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
      for (const key of [...entries.keys()]) dropExpiredEntry(entries, key, now);
      return [...entries.keys()];
    },
    size() {
      return cache.keys().length;
    }
  };

  return cache;
}
/* eslint-enable max-lines-per-function */

/** Options for {@link memoizeAsync}. */
export type MemoizeAsyncOptions = {
  /** Entry lifetime in milliseconds. Omit to keep entries until cleared. */
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

function assertMemoizeOptions(options: MemoizeAsyncOptions): void {
  if (options.ttlMs !== undefined) assertPositiveNumber(options.ttlMs, "ttlMs");
  if (options.key !== undefined && typeof options.key !== "function") {
    fail("CACHE_INVALID_OPTION", "Expected key to be a function.", { received: typeof options.key });
  }
}

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
  assertMemoizeOptions(options);

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

function assertStaleWhileRevalidateOptions(options: StaleWhileRevalidateOptions): void {
  assertPositiveNumber(options?.freshMs, "freshMs");
  assertPositiveNumber(options?.staleMs, "staleMs");
  if (options.staleMs < options.freshMs) {
    fail("CACHE_INVALID_OPTION", "Expected staleMs to be greater than or equal to freshMs.", {
      freshMs: options.freshMs,
      staleMs: options.staleMs
    });
  }
}

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
  assertStaleWhileRevalidateOptions(options);

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

/** Options for {@link createSingleFlight}. */
export type SingleFlightOptions<TArgs extends unknown[]> = {
  /** Builds the in-flight key from the call arguments. Defaults to a stable key. */
  key?: (...args: TArgs) => string;
};

/** A loader that deduplicates concurrent calls with the same key. */
export type SingleFlight<TArgs extends unknown[], TResult> = ((...args: TArgs) => Promise<TResult>) & {
  /** Number of calls currently in flight. */
  readonly size: number;
  /** Forgets all in-flight entries without cancelling the promises. */
  clear(): void;
};

/**
 * Deduplicates concurrent async calls without caching the resolved value.
 *
 * While a call is in flight, later calls with the same key share its promise. Once it settles,
 * the entry is removed, so the next call runs the loader again. Rejected calls are shared by
 * concurrent callers and then removed.
 *
 * @param loader - Async work to run.
 * @param options - Optional key builder.
 * @returns A loader with `size` and `clear()`.
 */
export function createSingleFlight<TArgs extends unknown[], TResult>(
  loader: (...args: TArgs) => Promise<TResult> | TResult,
  options: SingleFlightOptions<TArgs> = {}
): SingleFlight<TArgs, TResult> {
  const inFlight = new Map<string, Promise<TResult>>();
  const keyOf = options.key ?? ((...args: TArgs) => stableKey(args));

  const run = (...args: TArgs): Promise<TResult> => {
    const key = keyOf(...args);
    const existing = inFlight.get(key);
    if (existing) return existing;

    const promise = Promise.resolve().then(() => loader(...args));
    inFlight.set(key, promise);
    const remove = () => {
      if (inFlight.get(key) === promise) inFlight.delete(key);
    };
    promise.then(remove, remove);
    return promise;
  };

  Object.defineProperty(run, "size", { get: () => inFlight.size });
  (run as SingleFlight<TArgs, TResult>).clear = () => inFlight.clear();
  return run as SingleFlight<TArgs, TResult>;
}