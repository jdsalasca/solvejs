/**
 * Ensures a number is finite.
 *
 * @param value - Input number.
 * @param label - Parameter label for error messages.
 * @throws {TypeError} If the value is not finite.
 */
function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`Expected ${label} to be a finite number.`);
  }
}

/**
 * Restricts a number to a closed interval.
 *
 * @param value - Number to clamp.
 * @param min - Minimum allowed value.
 * @param max - Maximum allowed value.
 * @returns Clamped value between `min` and `max`.
 * @throws {TypeError} If inputs are not finite numbers.
 * @throws {RangeError} If `min` is greater than `max`.
 */
export function clamp(value: number, min: number, max: number): number {
  assertFinite(value, "value");
  assertFinite(min, "min");
  assertFinite(max, "max");

  if (min > max) {
    throw new RangeError("Expected min to be less than or equal to max.");
  }

  return Math.min(Math.max(value, min), max);
}

/**
 * Rounds a number to a specific decimal precision.
 *
 * @param value - Number to round.
 * @param decimals - Decimal precision.
 * @returns Rounded number.
 * @throws {TypeError} If `value` is not finite.
 * @throws {TypeError} If `decimals` is not an integer.
 * @throws {RangeError} If `decimals` is outside [-12, 12].
 */
export function roundTo(value: number, decimals = 0): number {
  assertFinite(value, "value");
  if (!Number.isInteger(decimals)) {
    throw new TypeError("Expected decimals to be an integer.");
  }
  if (decimals < -12 || decimals > 12) {
    throw new RangeError("Expected decimals to be between -12 and 12.");
  }

  if (decimals === 0) {
    return Math.round(value);
  }

  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Sums a list of numbers.
 *
 * @param values - Numeric collection.
 * @returns Sum of all values.
 * @throws {TypeError} If any element is not finite.
 */
export function sum(values: readonly number[]): number {
  return values.reduce((accumulator, value, index) => {
    assertFinite(value, `values[${index}]`);
    return accumulator + value;
  }, 0);
}

/**
 * Computes the arithmetic mean of a numeric collection.
 *
 * @param values - Numeric collection.
 * @returns Average of the collection.
 * @throws {TypeError} If any value is not finite.
 * @throws {RangeError} If the collection is empty.
 */
export function average(values: readonly number[]): number {
  if (values.length === 0) {
    throw new RangeError("Expected at least one value to compute average.");
  }
  return sum(values) / values.length;
}

/**
 * Computes the median of a numeric collection.
 *
 * @param values - Numeric collection.
 * @returns Median value.
 * @throws {TypeError} If any value is not finite.
 * @throws {RangeError} If the collection is empty.
 */
export function median(values: readonly number[]): number {
  if (values.length === 0) {
    throw new RangeError("Expected at least one value to compute median.");
  }

  const sorted = [...values];
  sorted.forEach((value, index) => assertFinite(value, `values[${index}]`));
  sorted.sort((a, b) => a - b);

  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Calculates percentage as `(part / total) * 100`.
 *
 * @param part - Partial value.
 * @param total - Total reference value.
 * @param decimals - Optional decimal precision.
 * @returns Percentage value.
 * @throws {TypeError} If inputs are not finite numbers.
 * @throws {RangeError} If `total` is zero.
 */
export function percent(part: number, total: number, decimals = 2): number {
  assertFinite(part, "part");
  assertFinite(total, "total");

  if (total === 0) {
    throw new RangeError("Cannot compute percentage when total is zero.");
  }

  return roundTo((part / total) * 100, decimals);
}

/**
 * Generates a random integer within an inclusive range.
 *
 * @param min - Minimum integer value.
 * @param max - Maximum integer value.
 * @returns Random integer in `[min, max]`.
 * @throws {TypeError} If bounds are not integers.
 * @throws {RangeError} If `min` is greater than `max`.
 */
export function randomInt(min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new TypeError("Expected min and max to be integers.");
  }
  if (min > max) {
    throw new RangeError("Expected min to be less than or equal to max.");
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
}
