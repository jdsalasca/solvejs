/**
 * Returns whether a value is a plain object.
 *
 * @param value - Value to evaluate.
 * @returns `true` when value is a plain object literal.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

/**
 * Safely checks whether an object owns a property.
 *
 * @param value - Candidate object.
 * @param key - Property key.
 * @returns `true` when key is an own property.
 */
export function hasOwn(value: unknown, key: PropertyKey): boolean {
  return value != null && Object.prototype.hasOwnProperty.call(value, key);
}

/**
 * Picks a subset of keys from an object.
 *
 * @param value - Source object.
 * @param keys - Keys to include.
 * @returns New object with selected keys.
 */
export function pick<T extends object, K extends keyof T>(value: T, keys: readonly K[]): Pick<T, K> {
  const output = {} as Pick<T, K>;
  for (const key of keys) {
    if (hasOwn(value, key)) {
      output[key] = value[key];
    }
  }
  return output;
}

/**
 * Omits a subset of keys from an object.
 *
 * @param value - Source object.
 * @param keys - Keys to remove.
 * @returns New object without omitted keys.
 */
export function omit<T extends object, K extends keyof T>(value: T, keys: readonly K[]): Omit<T, K> {
  const blocked = new Set<PropertyKey>(keys);
  const output: Record<PropertyKey, unknown> = {};

  for (const key of Reflect.ownKeys(value)) {
    if (!blocked.has(key)) {
      output[key] = (value as Record<PropertyKey, unknown>)[key];
    }
  }

  return output as Omit<T, K>;
}

/**
 * Gets a nested value using dot-separated path segments.
 *
 * @param value - Source object.
 * @param path - Dot path like `"user.profile.name"`.
 * @param fallback - Value returned when path is missing.
 * @returns Resolved value or fallback.
 */
export function get<T>(value: unknown, path: string, fallback?: T): T | undefined {
  if (!path.trim()) {
    return fallback;
  }

  const segments = path.split(".").filter(Boolean);
  let current: unknown = value;

  for (const segment of segments) {
    if (current == null || !(segment in Object(current))) {
      return fallback;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return (current as T) ?? fallback;
}

/**
 * Sets a nested value using dot-separated path segments.
 *
 * @param value - Source object.
 * @param path - Dot path like `"user.profile.name"`.
 * @param nextValue - Value to assign.
 * @returns Same object reference for chaining.
 * @throws {TypeError} If value is not object-like.
 * @throws {TypeError} If path is empty.
 */
export function set<T extends object>(value: T, path: string, nextValue: unknown): T {
  if (value == null || (typeof value !== "object" && typeof value !== "function")) {
    throw new TypeError("Expected value to be an object.");
  }

  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) {
    throw new TypeError("Expected path to be a non-empty dot path.");
  }

  let cursor: Record<string, unknown> = value as Record<string, unknown>;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const current = cursor[segment];
    if (current == null || typeof current !== "object") {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }

  cursor[segments[segments.length - 1]] = nextValue;
  return value;
}

/**
 * Deeply merges plain objects. Arrays are replaced by source value.
 *
 * @param target - Base object.
 * @param sources - Objects to merge into target.
 * @returns New merged object.
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: ReadonlyArray<Record<string, unknown>>
): T {
  const output: Record<string, unknown> = { ...target };

  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      const existing = output[key];
      if (isPlainObject(existing) && isPlainObject(value)) {
        output[key] = deepMerge(existing, value);
      } else {
        output[key] = value;
      }
    }
  }

  return output as T;
}
