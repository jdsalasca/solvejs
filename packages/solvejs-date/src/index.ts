export type DateFormatToken = "YYYY-MM-DD" | "DD/MM/YYYY" | "MM-DD-YYYY";

/**
 * Left-pads a number using two digits.
 *
 * @param value - Numeric value to pad.
 * @returns The padded string representation.
 */
function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/**
 * Checks if a value is a valid Date object.
 *
 * @param value - Unknown input to evaluate.
 * @returns `true` when the value is a non-invalid Date instance.
 */
function isDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * Public guard to validate Date values.
 *
 * @param value - Unknown value.
 * @returns `true` when the value is a valid Date.
 */
export function isValidDate(value: unknown): value is Date {
  return isDate(value);
}

/**
 * Parses an ISO-8601 date-like string.
 *
 * @param value - String representation of a date.
 * @returns Parsed Date instance, or `null` if invalid.
 */
export function parseIsoDate(value: string): Date | null {
  const parsed = new Date(value);
  return isDate(parsed) ? parsed : null;
}

/**
 * Adds a number of days to a date, preserving UTC semantics.
 *
 * @param date - Source date.
 * @param amount - Integer number of days to add (can be negative).
 * @returns A new Date with the delta applied.
 * @throws {TypeError} If `date` is invalid or `amount` is not an integer.
 */
export function addDays(date: Date, amount: number): Date {
  if (!isDate(date)) {
    throw new TypeError("Expected a valid Date instance.");
  }
  if (!Number.isInteger(amount)) {
    throw new TypeError("Expected amount to be an integer.");
  }

  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

/**
 * Returns the UTC start of day for a date.
 *
 * @param date - Source date.
 * @returns A new Date set to `00:00:00.000` UTC.
 * @throws {TypeError} If `date` is invalid.
 */
export function startOfDay(date: Date): Date {
  if (!isDate(date)) {
    throw new TypeError("Expected a valid Date instance.");
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Formats a date into a compact tokenized output.
 *
 * @param date - Source date.
 * @param format - Output token format.
 * @returns Formatted date string.
 * @throws {TypeError} If `date` is invalid.
 */
export function formatDate(date: Date, format: DateFormatToken = "YYYY-MM-DD"): string {
  if (!isDate(date)) {
    throw new TypeError("Expected a valid Date instance.");
  }

  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());

  if (format === "YYYY-MM-DD") {
    return `${year}-${month}-${day}`;
  }

  if (format === "DD/MM/YYYY") {
    return `${day}/${month}/${year}`;
  }

  return `${month}-${day}-${year}`;
}
