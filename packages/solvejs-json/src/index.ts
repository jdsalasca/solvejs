/** Stable JSON error codes. */
export type JsonErrorCode =
  | "JSON_INVALID"
  | "JSON_UNSERIALISABLE"
  | "JSON_CIRCULAR";

/** Successful result of a safe parse or stringify. */
export type SafeParseResult<T> = { ok: true; value: T } | { ok: false; error: JsonError };

/** Options for {@link safeJsonParse}. */
export type SafeParseOptions<T> = {
  /** Returned instead of a result object when parsing fails. */
  fallback?: T;
};

/** Options for {@link safeJsonStringify}. */
export type SafeStringifyOptions = {
  /** Returned instead of a result object when stringifying fails. */
  fallback?: string;
};

/**
 * Error thrown by the JSON utilities.
 *
 * Carries a stable machine-readable `code` and a `details` context object.
 */
export class JsonError extends Error {
  readonly code: JsonErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: JsonErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "JsonError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, JsonError.prototype);
  }
}

function fail(code: JsonErrorCode, message: string, details: Record<string, unknown> = {}): never {
  throw new JsonError(code, message, details);
}

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Parses JSON without throwing.
 *
 * @param text - JSON text.
 * @param options - Parse options.
 * @param options.fallback - When given, the return value is the parsed value or this fallback.
 * @returns A result object, or the parsed value / fallback when `fallback` is supplied.
 */
export function safeJsonParse<T = unknown>(
  text: string,
  options: SafeParseOptions<T> = {}
): SafeParseResult<T> | T {
  const hasFallback = "fallback" in options;

  try {
    const value = JSON.parse(text) as T;
    return hasFallback ? value : { ok: true, value };
  } catch (error) {
    if (hasFallback) return options.fallback as T;
    return { ok: false, error: new JsonError("JSON_INVALID", (error as Error).message, { text }) };
  }
}

/**
 * Stringifies a value without throwing.
 *
 * Behaviour matches `JSON.stringify`: a value that has no JSON representation comes back as
 * `undefined` rather than as an error, and a function or `undefined` property inside an object is
 * dropped. Only a circular structure is reported as a failure.
 *
 * @param value - Value to serialise.
 * @param options - Stringify options.
 * @param options.fallback - When given, the return value is the string or this fallback.
 * @returns A result object, or the string / fallback when `fallback` is supplied.
 * @throws {JsonError} Never directly; a cycle is reported through the result object.
 */
export function safeJsonStringify(
  value: unknown,
  options: SafeStringifyOptions = {}
): { ok: true; value: string | undefined } | { ok: false; error: JsonError } | string | undefined {
  const hasFallback = "fallback" in options;

  let text: string | undefined;
  try {
    text = stableStringify(value);
  } catch (error) {
    if (error instanceof JsonError && error.code === "JSON_CIRCULAR") {
      if (hasFallback) return options.fallback;
      return { ok: false, error };
    }
    if (hasFallback) return options.fallback;
    return {
      ok: false,
      error: new JsonError("JSON_UNSERIALISABLE", (error as Error).message, { received: typeof value })
    };
  }

  if (hasFallback) return text === undefined ? options.fallback : text;
  return { ok: true, value: text };
}

/**
 * Serialises a value with object keys sorted at every depth.
 *
 * Two structurally equal values always produce the same string, which makes it safe to hash, compare,
 * or use as a cache key. Array order is preserved.
 *
 * @param value - Value to serialise.
 * @returns Deterministic JSON text, or `undefined` when the value is not serialisable.
 * @throws {JsonError} `JSON_CIRCULAR` if the value contains a cycle.
 */
export function stableStringify(value: unknown): string | undefined {
  const ancestors: unknown[] = [];

  const walk = (input: unknown): string | undefined => {
    if (input === null) return "null";
    if (input === undefined) return undefined;

    const type = typeof input;
    if (type === "number") return Number.isFinite(input as number) ? String(input) : "null";
    if (type === "boolean") return String(input);
    if (type === "string") return JSON.stringify(input);
    if (type === "bigint") return JSON.stringify((input as bigint).toString());
    if (type !== "object") return undefined;

    if (ancestors.includes(input)) {
      fail("JSON_CIRCULAR", "Expected a value without circular references.", { received: "circular" });
    }
    ancestors.push(input);

    try {
      if (Array.isArray(input)) {
        const items = input.map(walk);
        return items.some((item) => item === undefined) ? undefined : `[${items.join(",")}]`;
      }

      if (input instanceof Date) return JSON.stringify(input.toISOString());

      const entries = Object.entries(input as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        // Object keys are unique, so the two compared names are never equal and a tie cannot happen.
  .sort(([a], [b]) => (a < b ? -1 : 1));

      const parts: string[] = [];
      for (const [key, entryValue] of entries) {
        const serialised = walk(entryValue);
        if (serialised === undefined) continue;
        parts.push(`${JSON.stringify(key)}:${serialised}`);
      }
      return `{${parts.join(",")}}`;
    } finally {
      ancestors.pop();
    }
  };

  return walk(value);
}

function cloneValue(value: unknown, seen: WeakMap<object, unknown>): unknown {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);

  const existing = seen.get(value);
  if (existing !== undefined) return existing;

  if (Array.isArray(value)) {
    const copy: unknown[] = [];
    seen.set(value, copy);
    for (const item of value) copy.push(cloneValue(item, seen));
    return copy;
  }

  const copy: Record<string, unknown> = {};
  seen.set(value, copy);
  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    if (UNSAFE_KEYS.has(key)) continue;
    copy[key] = cloneValue(entryValue, seen);
  }
  return copy;
}

/**
 * Deeply clones a JSON-compatible value.
 *
 * Dates and regular expressions are copied rather than shared, unsafe keys are dropped, and a
 * repeated reference stays a single shared object in the clone.
 *
 * @param value - Value to clone.
 * @returns A structurally equal copy.
 */
export function deepClone<T>(value: T): T {
  return cloneValue(value, new WeakMap()) as T;
}

function equalValue(left: unknown, right: unknown, seen: WeakMap<object, unknown>): boolean {
  if (Object.is(left, right)) return true;
  // Object.is separates 0 and -0, which are the same value for comparison purposes.
  if (left === 0 && right === 0) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;

  if (left instanceof Date || right instanceof Date) {
    return left instanceof Date && right instanceof Date && left.getTime() === right.getTime();
  }
  if (left instanceof RegExp || right instanceof RegExp) {
    return left instanceof RegExp && right instanceof RegExp && left.source === right.source && left.flags === right.flags;
  }

  const known = seen.get(left);
  if (known !== undefined) return known === right;
  seen.set(left, right);

  const leftArray = Array.isArray(left);
  if (leftArray !== Array.isArray(right)) return false;

  if (leftArray) {
    const leftList = left as unknown[];
    const rightList = right as unknown[];
    if (leftList.length !== rightList.length) return false;
    return leftList.every((item, index) => equalValue(item, rightList[index], seen));
  }

  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  if (!leftKeys.every((key, index) => key === rightKeys[index])) return false;

  return leftKeys.every((key) =>
    equalValue(
      (left as Record<string, unknown>)[key],
      (right as Record<string, unknown>)[key],
      seen
    )
  );
}

/**
 * Compares two values structurally.
 *
 * Object key order is irrelevant, array order is significant, `NaN` equals `NaN`, and `0` equals `-0`.
 * Cycles on both sides are handled.
 *
 * @param left - First value.
 * @param right - Second value.
 * @returns `true` when the values are structurally equal.
 */
export function deepEqual(left: unknown, right: unknown): boolean {
  try {
    return equalValue(left, right, new WeakMap());
  } catch {
    return false;
  }
}

/**
 * Deeply merges JSON objects, with later sources winning.
 *
 * Nested plain objects merge, everything else is replaced, and prototype-polluting keys are dropped.
 * No input is mutated.
 *
 * @param target - Base object.
 * @param sources - Objects merged over the base, left to right.
 * @returns A new merged object.
 */
export function jsonMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: ReadonlyArray<Record<string, unknown>>
): T {
  const output: Record<string, unknown> = { ...(target ?? {}) };

  for (const source of sources) {
    if (source === null || source === undefined) continue;

    for (const [key, value] of Object.entries(source)) {
      if (UNSAFE_KEYS.has(key)) continue;

      const existing = output[key];
      const bothPlainObjects =
        existing !== null &&
        typeof existing === "object" &&
        !Array.isArray(existing) &&
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value);

      output[key] = bothPlainObjects
        ? jsonMerge(existing as Record<string, unknown>, value as Record<string, unknown>)
        : value;
    }
  }

  return output as T;
}

/**
 * Returns a new object with only the named keys, skipping any that are absent.
 *
 * @param value - Source object.
 * @param keys - Keys to keep.
 * @returns A new object holding the present keys.
 */
export function pickJsonKeys<T extends object, K extends keyof T>(value: T, keys: readonly K[]): Pick<T, K> {
  const output = {} as Pick<T, K>;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) output[key] = value[key];
  }
  return output;
}

/**
 * Returns a new object without the named keys.
 *
 * @param value - Source object.
 * @param keys - Keys to drop.
 * @returns A new object holding the remaining own keys.
 */
export function omitJsonKeys<T extends object, K extends keyof T>(value: T, keys: readonly K[]): Omit<T, K> {
  const drop = new Set<PropertyKey>(keys);
  const output: Record<PropertyKey, unknown> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (drop.has(key)) continue;
    output[key] = entryValue;
  }
  return output as Omit<T, K>;
}

/**
 * Reads a key with a fallback, treating only `undefined` and `null` as absent.
 *
 * Inherited keys are never read, so a `toString` property on the prototype cannot leak through.
 *
 * @param value - Source object.
 * @param key - Key to read.
 * @param fallback - Value returned when the key is absent or null.
 * @returns The value, or the fallback.
 */
export function getOrDefault<T extends object, K extends keyof T, F = undefined>(
  value: T,
  key: K,
  fallback?: F
): T[K] | F {
  if (!Object.prototype.hasOwnProperty.call(value, key)) return fallback as F;
  const entryValue = value[key];
  return entryValue === undefined || entryValue === null ? (fallback as F) : entryValue;
}