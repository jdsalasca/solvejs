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
 * Parses a date string using a strict known format.
 *
 * @param value - Input date string.
 * @param format - Expected format token.
 * @returns Parsed UTC Date when valid, otherwise `null`.
 */
export function parseDateStrict(value: string, format: DateFormatToken = "YYYY-MM-DD"): Date | null {
  const normalized = value.trim();
  let year = 0;
  let month = 0;
  let day = 0;

  if (format === "YYYY-MM-DD") {
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return null;
    }
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else if (format === "DD/MM/YYYY") {
    const match = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) {
      return null;
    }
    day = Number(match[1]);
    month = Number(match[2]);
    year = Number(match[3]);
  } else {
    const match = normalized.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) {
      return null;
    }
    month = Number(match[1]);
    day = Number(match[2]);
    year = Number(match[3]);
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return candidate;
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
 * Builds a UTC date from numeric parts.
 *
 * @param year - Full year.
 * @param month - Month number in range 1-12.
 * @param day - Day number in range 1-31.
 * @returns A UTC Date at `00:00:00.000`.
 * @throws {TypeError} If arguments are not integers.
 */
export function fromUtcParts(year: number, month: number, day: number): Date {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new TypeError("Expected year, month, and day to be integers.");
  }
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Returns the UTC end of day for a date.
 *
 * @param date - Source date.
 * @returns A new Date set to `23:59:59.999` UTC.
 * @throws {TypeError} If `date` is invalid.
 */
export function endOfDay(date: Date): Date {
  if (!isDate(date)) {
    throw new TypeError("Expected a valid Date instance.");
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

/**
 * Calculates full UTC day difference between two dates.
 *
 * @param left - First date.
 * @param right - Second date.
 * @returns Signed number of days (`left - right`).
 * @throws {TypeError} If either date is invalid.
 */
export function diffInDays(left: Date, right: Date): number {
  if (!isDate(left) || !isDate(right)) {
    throw new TypeError("Expected valid Date instances.");
  }
  const msPerDay = 86_400_000;
  const leftStart = startOfDay(left).getTime();
  const rightStart = startOfDay(right).getTime();
  return Math.round((leftStart - rightStart) / msPerDay);
}

/**
 * Checks if a year is leap based on Gregorian rules.
 *
 * @param year - Full year.
 * @returns `true` when year is leap.
 * @throws {TypeError} If `year` is not an integer.
 */
export function isLeapYear(year: number): boolean {
  if (!Number.isInteger(year)) {
    throw new TypeError("Expected year to be an integer.");
  }
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns number of days in a given month and year.
 *
 * @param year - Full year.
 * @param month - Month in range 1-12.
 * @returns Number of days in month.
 * @throws {TypeError} If inputs are not integers.
 * @throws {RangeError} If month is outside 1-12.
 */
export function daysInMonth(year: number, month: number): number {
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new TypeError("Expected year and month to be integers.");
  }
  if (month < 1 || month > 12) {
    throw new RangeError("Expected month to be between 1 and 12.");
  }
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
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
