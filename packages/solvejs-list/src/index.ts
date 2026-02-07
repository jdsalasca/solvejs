/**
 * Removes duplicate values preserving first-seen order.
 *
 * @param values - Input collection.
 * @returns Deduplicated array.
 */
export function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

/**
 * Removes falsy values from a list.
 *
 * @param values - Input collection possibly containing falsy values.
 * @returns Collection without falsy entries.
 */
export function compact<T>(values: readonly (T | null | undefined | false | 0 | "")[]): T[] {
  return values.filter(Boolean) as T[];
}

/**
 * Splits an array into smaller chunks of equal size.
 *
 * @param values - Input collection.
 * @param size - Chunk size.
 * @returns Array of chunks.
 * @throws {TypeError} If `size` is not a positive integer.
 */
export function chunk<T>(values: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size <= 0) {
    throw new TypeError("Expected size to be a positive integer.");
  }

  const output: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size));
  }
  return output;
}

/**
 * Groups values by a selector key.
 *
 * @param values - Input collection.
 * @param selector - Function used to extract grouping key.
 * @returns Object whose keys map to grouped arrays.
 */
export function groupBy<T, K extends PropertyKey>(values: readonly T[], selector: (value: T) => K): Record<K, T[]> {
  return values.reduce((accumulator, value) => {
    const key = selector(value);
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(value);
    return accumulator;
  }, {} as Record<K, T[]>);
}

/**
 * Partitions values into two groups based on a predicate.
 *
 * @param values - Input collection.
 * @param predicate - Predicate function.
 * @returns Tuple with `[matched, unmatched]` values.
 */
export function partition<T>(values: readonly T[], predicate: (value: T) => boolean): [T[], T[]] {
  const matched: T[] = [];
  const unmatched: T[] = [];
  for (const value of values) {
    if (predicate(value)) {
      matched.push(value);
    } else {
      unmatched.push(value);
    }
  }
  return [matched, unmatched];
}

/**
 * Creates an object map from list values keyed by selector output.
 *
 * @param values - Input collection.
 * @param selector - Key selector function.
 * @returns Object map of values by key.
 */
export function keyBy<T, K extends PropertyKey>(values: readonly T[], selector: (value: T) => K): Record<K, T> {
  return values.reduce((accumulator, value) => {
    accumulator[selector(value)] = value;
    return accumulator;
  }, {} as Record<K, T>);
}

/**
 * Returns intersection between two arrays preserving order from the first one.
 *
 * @param left - Left collection.
 * @param right - Right collection.
 * @returns Values found in both collections.
 */
export function intersection<T>(left: readonly T[], right: readonly T[]): T[] {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

/**
 * Sorts values by selector output.
 *
 * @param values - Input collection.
 * @param selector - Function selecting sortable key.
 * @param order - Sort order.
 * @returns New sorted array.
 */
export function sortBy<T, K extends number | string>(
  values: readonly T[],
  selector: (value: T) => K,
  order: "asc" | "desc" = "asc"
): T[] {
  const factor = order === "asc" ? 1 : -1;
  return [...values].sort((a, b) => {
    const left = selector(a);
    const right = selector(b);
    if (left === right) {
      return 0;
    }
    return left > right ? factor : -factor;
  });
}
