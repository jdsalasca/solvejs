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
 * Parses Unix timestamps provided in seconds or milliseconds.
 *
 * @param value - Numeric Unix timestamp.
 * @param unit - Timestamp unit (`"seconds"` or `"milliseconds"`).
 * @returns Parsed Date instance, or `null` when invalid.
 */
export function parseUnixTimestamp(value: number, unit: "seconds" | "milliseconds" = "milliseconds"): Date | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  const milliseconds = unit === "seconds" ? value * 1000 : value;
  const parsed = new Date(milliseconds);
  return isDate(parsed) ? parsed : null;
}

type DateParts = { year: number; month: number; day: number };

function utcTime(year: number, monthIndex: number, day: number): number {
  // Date.UTC maps years 0-99 to 1900-1999, so set the full year explicitly.
  const date = new Date(0);
  date.setUTCFullYear(year, monthIndex, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

function partsFromMatch(match: RegExpMatchArray | null, order: "ymd" | "dmy" | "mdy"): DateParts | null {
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  const third = Number(match[3]);
  if (order === "ymd") return { year: first, month: second, day: third };
  if (order === "dmy") return { day: first, month: second, year: third };
  return { month: first, day: second, year: third };
}

function parseParts(value: string, format: DateFormatToken): DateParts | null {
  if (format === "YYYY-MM-DD") return partsFromMatch(value.match(/^(\d{4})-(\d{2})-(\d{2})$/), "ymd");
  if (format === "DD/MM/YYYY") return partsFromMatch(value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/), "dmy");
  return partsFromMatch(value.match(/^(\d{2})-(\d{2})-(\d{4})$/), "mdy");
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const candidate = new Date(utcTime(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

/**
 * Parses a date string using a strict known format.
 *
 * @param value - Input date string.
 * @param format - Expected format token.
 * @returns Parsed UTC Date when valid, otherwise `null`.
 */
export function parseDateStrict(value: string, format: DateFormatToken = "YYYY-MM-DD"): Date | null {
  const parts = parseParts(value.trim(), format);
  if (!parts || !isValidCalendarDate(parts.year, parts.month, parts.day)) {
    return null;
  }
  return new Date(utcTime(parts.year, parts.month - 1, parts.day));
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
 * Checks whether a date falls on a UTC weekend.
 *
 * @param date - Source date.
 * @returns `true` when the date is Saturday or Sunday in UTC.
 * @throws {TypeError} If `date` is invalid.
 */
export function isWeekend(date: Date): boolean {
  if (!isDate(date)) {
    throw new TypeError("Expected a valid Date instance.");
  }
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Checks whether a date falls on a UTC weekday.
 *
 * @param date - Source date.
 * @returns `true` when the date is Monday through Friday in UTC.
 * @throws {TypeError} If `date` is invalid.
 */
export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date);
}

/* eslint-disable complexity -- weekend normalization plus full-week arithmetic */
/**
 * Adds business days while skipping UTC Saturdays and Sundays.
 *
 * @param date - Source date.
 * @param amount - Integer number of business days to add (can be negative).
 * @returns A new Date with the business-day delta applied.
 * @throws {TypeError} If `date` is invalid or `amount` is not an integer.
 */
export function addBusinessDays(date: Date, amount: number): Date {
  if (!isDate(date)) {
    throw new TypeError("Expected a valid Date instance.");
  }
  if (!Number.isInteger(amount)) {
    throw new TypeError("Expected amount to be an integer.");
  }
  if (!Number.isSafeInteger(amount)) {
    throw new TypeError("Expected amount to be a safe integer.");
  }

  if (amount === 0) return new Date(date.getTime());

  const direction = amount < 0 ? -1 : 1;
  let remaining = Math.abs(amount);
  let next = new Date(date.getTime());

  // Move off the weekend first. The first business day found is the first one to count.
  const countedFirst = isBusinessDay(date) ? 0 : 1;
  while (!isBusinessDay(next)) next = addDays(next, direction);
  remaining -= countedFirst;
  if (remaining <= 0) return next;

  // From a business day, every full week contains exactly five business days.
  const weeks = Math.floor(remaining / 5);
  if (weeks > 0) {
    next = addDays(next, direction * weeks * 7);
    remaining -= weeks * 5;
  }
  while (remaining > 0) {
    next = addDays(next, direction);
    if (isBusinessDay(next)) remaining -= 1;
  }

  return next;
}
/* eslint-enable complexity */

/**
 * Returns the next UTC business day after the provided date.
 *
 * @param date - Source date.
 * @returns A new Date on the next Monday-Friday day.
 * @throws {TypeError} If `date` is invalid.
 */
export function nextBusinessDay(date: Date): Date {
  return addBusinessDays(date, 1);
}

/**
 * Returns the previous UTC business day before the provided date.
 *
 * @param date - Source date.
 * @returns A new Date on the previous Monday-Friday day.
 * @throws {TypeError} If `date` is invalid.
 */
export function previousBusinessDay(date: Date): Date {
  return addBusinessDays(date, -1);
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
  return new Date(utcTime(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
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

  if (!isValidCalendarDate(year, month, day)) {
    throw new RangeError("Expected month and day to be valid calendar parts.");
  }

  return new Date(utcTime(year, month - 1, day));
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
  const end = new Date(utcTime(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  end.setUTCHours(23, 59, 59, 999);
  return end;
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
  return new Date(utcTime(year, month, 0)).getUTCDate();
}

/**
 * Formats a Date into strict ISO date format (`YYYY-MM-DD`) using UTC values.
 *
 * @param date - Source date.
 * @returns ISO date-only string.
 * @throws {TypeError} If `date` is invalid.
 */
export function toIsoDate(date: Date): string {
  return formatDate(date, "YYYY-MM-DD");
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

  const year = String(date.getUTCFullYear()).padStart(4, "0");
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

/**
 * Adds calendar months in UTC, clamping the day to the target month.
 *
 * @param date - Source date.
 * @param amount - Integer number of months to add (can be negative).
 * @returns A new Date with the month delta applied.
 * @throws {TypeError} If `date` is invalid or `amount` is not an integer.
 */
export function addMonths(date: Date, amount: number): Date {
  if (!isDate(date)) {
    throw new TypeError("Expected a valid Date instance.");
  }
  if (!Number.isSafeInteger(amount)) {
    throw new TypeError("Expected amount to be a safe integer.");
  }
  const next = new Date(date.getTime());
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + amount);
  next.setUTCDate(Math.min(day, daysInMonth(next.getUTCFullYear(), next.getUTCMonth() + 1)));
  return next;
}

/**
 * Returns the UTC start of the month for a date.
 *
 * @param date - Source date.
 * @returns A new Date at `00:00:00.000` UTC on the first day of the month.
 * @throws {TypeError} If `date` is invalid.
 */
export function startOfMonth(date: Date): Date {
  if (!isDate(date)) {
    throw new TypeError("Expected a valid Date instance.");
  }
  return new Date(utcTime(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * Returns the UTC end of the month for a date.
 *
 * @param date - Source date.
 * @returns A new Date at `23:59:59.999` UTC on the last day of the month.
 * @throws {TypeError} If `date` is invalid.
 */
export function endOfMonth(date: Date): Date {
  if (!isDate(date)) {
    throw new TypeError("Expected a valid Date instance.");
  }
  const end = new Date(utcTime(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

/**
 * Returns the UTC start of the week.
 *
 * @param date - Source date.
 * @param weekStartsOn - Day the week starts on, from 0 (Sunday) to 6 (Saturday). Defaults to 1 (Monday).
 * @returns A new Date at `00:00:00.000` UTC on the first day of the week.
 * @throws {TypeError} If `date` is invalid or `weekStartsOn` is outside 0-6.
 */
export function startOfWeek(date: Date, weekStartsOn = 1): Date {
  if (!isDate(date)) {
    throw new TypeError("Expected a valid Date instance.");
  }
  if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
    throw new TypeError("Expected weekStartsOn to be an integer from 0 to 6.");
  }
  const offset = (date.getUTCDay() - weekStartsOn + 7) % 7;
  return startOfDay(addDays(date, -offset));
}

/**
 * Returns the UTC end of the week.
 *
 * @param date - Source date.
 * @param weekStartsOn - Day the week starts on, from 0 (Sunday) to 6 (Saturday). Defaults to 1 (Monday).
 * @returns A new Date at `23:59:59.999` UTC on the last day of the week.
 * @throws {TypeError} If `date` is invalid or `weekStartsOn` is outside 0-6.
 */
export function endOfWeek(date: Date, weekStartsOn = 1): Date {
  return endOfDay(addDays(startOfWeek(date, weekStartsOn), 6));
}

/** A duration unit accepted by {@link parseDuration} and {@link formatDuration}. */
export type DurationUnit = "w" | "d" | "h" | "m" | "s" | "ms";

const DURATION_FACTORS: Record<DurationUnit, number> = {
  w: 604_800_000,
  d: 86_400_000,
  h: 3_600_000,
  m: 60_000,
  s: 1_000,
  ms: 1
};

/* eslint-disable complexity -- duration parser loop and unit table */
/**
 * Parses a human duration such as `"1h 30m"` into milliseconds.
 *
 * Accepts `w`, `d`, `h`, `m`, `s` and `ms`, optional decimals and a leading sign.
 *
 * @param input - Duration text.
 * @returns Milliseconds, or `null` when the text is not a complete duration.
 */
export function parseDuration(input: string): number | null {
  if (typeof input !== "string") return null;
  const text = input.trim();
  if (text.length === 0 || text.length > 1024) return null;
  const negative = text.startsWith("-");
  const body = negative ? text.slice(1).trim() : text;
  if (body.length === 0) return null;

  // eslint-disable-next-line security/detect-unsafe-regex -- linear duration grammar
  const pattern = /(\d+(?:\.\d+)?)\s*(w|d|h|ms|m|s)/gi;
  let total = 0;
  let cursor = 0;
  let matched = false;
  for (const match of body.matchAll(pattern)) {
    const gap = body.slice(cursor, match.index).trim();
    if (gap.length > 0 && !/^[,\s]+$/.test(gap)) return null;
    const value = Number(match[1]);
    const unit = match[2].toLowerCase() as DurationUnit;
    total += value * DURATION_FACTORS[unit];
    cursor = (match.index ?? 0) + match[0].length;
    matched = true;
  }
  if (!matched || body.slice(cursor).trim().length > 0) return null;
  return Math.round(negative ? -total : total);
}

/**
 * Formats milliseconds as a compact human duration.
 *
 * @param milliseconds - Duration in milliseconds.
 * @param units - Units to allow. Defaults to weeks through milliseconds.
 * @returns A compact duration such as `"1h 30m"` or `"0s"`.
 * @throws {TypeError} If `milliseconds` is not finite.
 */
export function formatDuration(
  milliseconds: number,
  units: readonly DurationUnit[] = ["w", "d", "h", "m", "s", "ms"]
): string {
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError("Expected milliseconds to be a finite number.");
  }
  if (units.length === 0) {
    throw new TypeError("Expected at least one duration unit.");
  }
  const allowed = new Set(units);
  let remaining = Math.round(Math.abs(milliseconds));
  const negative = milliseconds < 0;
  const parts: string[] = [];
  for (const unit of ["w", "d", "h", "m", "s", "ms"] as const) {
    if (!allowed.has(unit)) continue;
    const count = Math.floor(remaining / DURATION_FACTORS[unit]);
    if (count > 0) {
      parts.push(`${count}${unit}`);
      remaining -= count * DURATION_FACTORS[unit];
    }
  }
  if (parts.length === 0) return "0s";
  return `${negative ? "-" : ""}${parts.join(" ")}`;
}
/* eslint-enable complexity */
