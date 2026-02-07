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
