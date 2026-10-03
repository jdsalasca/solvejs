/** Stable money error codes. */
export type MoneyErrorCode =
  | "MONEY_INVALID_DECIMAL"
  | "MONEY_INVALID_MINOR_UNITS"
  | "MONEY_INVALID_FACTOR"
  | "MONEY_INVALID_WEIGHTS"
  | "MONEY_INVALID_FRACTION_DIGITS";

/**
 * Error thrown by the money utilities.
 *
 * Carries a stable machine-readable `code` and a `details` context object.
 */
export class MoneyError extends Error {
  readonly code: MoneyErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: MoneyErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "MoneyError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, MoneyError.prototype);
  }
}

function fail(code: MoneyErrorCode, message: string, details: Record<string, unknown> = {}): never {
  throw new MoneyError(code, message, details);
}

/** Rounding behaviour for a fractional result. */
export type RoundingMode = "half-away-from-zero" | "half-up" | "floor" | "ceil" | "down";

const ROUNDING_MODES: RoundingMode[] = ["half-away-from-zero", "half-up", "floor", "ceil", "down"];

// A plain decimal string. Deliberately narrow: no exponent, no currency symbol, no separators.
const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/;

/** Options for {@link fromDecimal}. */
export type FromDecimalOptions = {
  /** Digits the currency supports. Defaults to 2. More than this is refused. */
  fractionDigits?: number;
};

/** Options for {@link toDecimal}. */
export type ToDecimalOptions = {
  /** Digits to render. Defaults to 2. */
  fractionDigits?: number;
};

/** Options for {@link multiplyMoney}, {@link percentageOf} and {@link applyPercentage}. */
export type MultiplyOptions = {
  /** How to settle a fractional minor unit. Defaults to `half-away-from-zero`. */
  rounding?: RoundingMode;
};

/** Options for {@link formatMoney}. */
export type FormatMoneyOptions = {
  /** ISO 4217 currency code. */
  currency?: string;
  /** BCP 47 locale tag. */
  locale?: string;
  /** Omit the currency symbol or code. */
  showCurrency?: boolean;
  /** Force an explicit `+` on a positive amount. */
  signed?: boolean;
};

function assertFractionDigits(value: unknown): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    fail("MONEY_INVALID_FRACTION_DIGITS", "Expected fractionDigits to be a non-negative integer.", {
      received: value
    });
  }
}

function assertMinorUnits(value: unknown, label = "minor units"): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    fail("MONEY_INVALID_MINOR_UNITS", `Expected ${label} to be a safe integer.`, { received: value });
  }
}

function assertFactor(value: unknown, label = "factor"): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail("MONEY_INVALID_FACTOR", `Expected ${label} to be a finite number.`, { received: value });
  }
}

function round(value: number, mode: RoundingMode): number {
  switch (mode) {
    case "floor":
      return Math.floor(value);
    case "ceil":
      return Math.ceil(value);
    case "down":
      // Toward zero, unlike floor on a negative result.
      return value < 0 ? Math.ceil(value) : Math.floor(value);
    case "half-up":
      // Ties go toward positive infinity, so -0.5 settles to 0.
      return Math.round(value);
    default:
      // Half away from zero, which is what invoices and tax tables expect.
      return value < 0 ? -Math.round(-value) : Math.round(value);
  }
}

/**
 * Converts a decimal amount into integer minor units.
 *
 * Parsing the decimal as a string keeps the conversion exact: `"2.675"` becomes `268` minor units
 * for a two-digit currency rather than inheriting the float `2.674999...`.
 *
 * @param value - Decimal amount as a string, or a number you already trust.
 * @param options - Conversion options.
 * @param options.fractionDigits - Digits the currency supports. Defaults to 2.
 * @returns Amount in minor units.
 * @throws {MoneyError} `MONEY_INVALID_DECIMAL` or `MONEY_INVALID_FRACTION_DIGITS`.
 *
 * @example
 * fromDecimal("19.99"); // 1999
 * fromDecimal("0.07");  // 7
 */
export function fromDecimal(value: string | number, options: FromDecimalOptions = {}): number {
  const fractionDigits = options.fractionDigits ?? 2;
  assertFractionDigits(fractionDigits);

  const raw = typeof value === "number" ? value.toString() : value;
  if (typeof raw !== "string") {
    fail("MONEY_INVALID_DECIMAL", "Expected a decimal string or a number.", { received: typeof value });
  }

  const match = raw.trim().match(DECIMAL);
  if (!match) {
    fail("MONEY_INVALID_DECIMAL", `Expected a plain decimal amount, received ${JSON.stringify(value)}.`, {
      received: value
    });
  }

  const [, sign, whole, fraction = ""] = match;
  const discarded = fraction.slice(fractionDigits);

  // Conversion is exact or refused. Rounding an input amount silently is how an invoice dispute
  // starts, so anything beyond the currency's own precision is an error rather than a rounded value.
  if (/[^0]/.test(discarded)) {
    fail("MONEY_INVALID_DECIMAL", `Expected at most ${fractionDigits} fraction digits.`, {
      received: value,
      fractionDigits
    });
  }

  const kept = fraction.padEnd(fractionDigits, "0").slice(0, fractionDigits);
  const scaled = Number(`${whole}${kept}`);
  if (!Number.isSafeInteger(scaled)) {
    fail("MONEY_INVALID_DECIMAL", "Expected an amount within the safe integer range.", { received: value });
  }

  return (sign === "-" ? -1 : 1) * scaled;
}

/**
 * Converts integer minor units into a decimal string.
 *
 * @param minorUnits - Amount in minor units.
 * @param options - Conversion options.
 * @param options.fractionDigits - Digits to render. Defaults to 2.
 * @returns The decimal amount, with exactly `fractionDigits` digits.
 * @throws {MoneyError} `MONEY_INVALID_MINOR_UNITS`.
 *
 * @example
 * toDecimal(1999); // "19.99"
 */
export function toDecimal(minorUnits: number, options: ToDecimalOptions = {}): string {
  assertMinorUnits(minorUnits);

  const fractionDigits = options.fractionDigits ?? 2;
  assertFractionDigits(fractionDigits);

  const negative = minorUnits < 0;
  const digits = String(Math.abs(minorUnits)).padStart(fractionDigits + 1, "0");
  const whole = digits.slice(0, digits.length - fractionDigits);
  const fraction = fractionDigits === 0 ? "" : `.${digits.slice(digits.length - fractionDigits)}`;

  return `${negative ? "-" : ""}${whole}${fraction}`;
}

/**
 * Adds two amounts in minor units.
 *
 * @param left - First amount.
 * @param right - Second amount.
 * @returns The sum.
 * @throws {MoneyError} `MONEY_INVALID_MINOR_UNITS`.
 */
export function addMoney(left: number, right: number): number {
  assertMinorUnits(left, "left");
  assertMinorUnits(right, "right");
  const sum = left + right;
  assertMinorUnits(sum, "the sum");
  return sum;
}

/**
 * Subtracts two amounts in minor units.
 *
 * @param left - Amount to subtract from.
 * @param right - Amount to subtract.
 * @returns The difference.
 * @throws {MoneyError} `MONEY_INVALID_MINOR_UNITS`.
 */
export function subtractMoney(left: number, right: number): number {
  assertMinorUnits(left, "left");
  assertMinorUnits(right, "right");
  const difference = left - right;
  assertMinorUnits(difference, "the difference");
  return difference;
}

/**
 * Adds a list of amounts in minor units.
 *
 * @param amounts - Amounts to add.
 * @returns The sum, or `0` for an empty list.
 * @throws {MoneyError} `MONEY_INVALID_MINOR_UNITS`.
 */
export function sumMoney(amounts: readonly number[]): number {
  if (!Array.isArray(amounts)) {
    fail("MONEY_INVALID_MINOR_UNITS", "Expected amounts to be an array.", { received: typeof amounts });
  }
  return amounts.reduce<number>((total, amount) => addMoney(total, amount), 0);
}

/**
 * Multiplies an amount by a factor, settling any fraction with an explicit rounding mode.
 *
 * @param minorUnits - Amount in minor units.
 * @param factor - Multiplier.
 * @param options - Rounding options.
 * @param options.rounding - Rounding mode, defaults to `half-away-from-zero`.
 * @returns The product in minor units.
 * @throws {MoneyError} `MONEY_INVALID_MINOR_UNITS` or `MONEY_INVALID_FACTOR`.
 *
 * @example
 * multiplyMoney(1999, 3); // 5997
 */
export function multiplyMoney(minorUnits: number, factor: number, options: MultiplyOptions = {}): number {
  assertMinorUnits(minorUnits);
  assertFactor(factor);

  const rounding = options.rounding ?? "half-away-from-zero";
  if (!ROUNDING_MODES.includes(rounding)) {
    fail("MONEY_INVALID_FACTOR", `Expected rounding to be one of: ${ROUNDING_MODES.join(", ")}.`, {
      received: rounding
    });
  }

  // Reduce the factor to an integer ratio so the product stays in integer space.
  const scale = 10 ** countDecimals(factor);
  const numerator = Math.round(factor * scale);

  const result = round((minorUnits * numerator) / scale, rounding);
  assertMinorUnits(result, "the product");
  return result;
}

function countDecimals(value: number): number {
  const text = String(value);
  const dot = text.indexOf(".");
  if (dot === -1) return 0;
  return Math.min(text.length - dot - 1, 12);
}

/**
 * Returns the percentage of an amount, in minor units.
 *
 * @param minorUnits - Amount in minor units.
 * @param percent - Percentage, for example `19` for 19%.
 * @param options - Rounding options.
 * @returns The percentage amount.
 * @throws {MoneyError} `MONEY_INVALID_MINOR_UNITS` or `MONEY_INVALID_FACTOR`.
 *
 * @example
 * percentageOf(10000, 19); // 1900
 */
export function percentageOf(minorUnits: number, percent: number, options: MultiplyOptions = {}): number {
  assertMinorUnits(minorUnits);
  assertFactor(percent, "percent");
  return multiplyMoney(minorUnits, percent / 100, options);
}

/**
 * Applies a percentage to an amount, adding it for a positive value and subtracting for a negative one.
 *
 * @param minorUnits - Amount in minor units.
 * @param percent - Percentage. `-10` applies a 10% discount.
 * @param options - Rounding options.
 * @returns The adjusted amount.
 * @throws {MoneyError} `MONEY_INVALID_MINOR_UNITS` or `MONEY_INVALID_FACTOR`.
 *
 * @example
 * applyPercentage(10000, 21);  // 12100
 * applyPercentage(10000, -10); // 9000
 */
export function applyPercentage(minorUnits: number, percent: number, options: MultiplyOptions = {}): number {
  return addMoney(minorUnits, percentageOf(minorUnits, percent, options));
}

/**
 * Splits an amount across weights without losing or inventing a single minor unit.
 *
 * Uses the largest-remainder method, so the parts always sum back to the total exactly. Each extra
 * minor unit goes to the earliest parts, which keeps the result deterministic.
 *
 * @param total - Amount in minor units.
 * @param weights - Non-negative whole-number weights, one per part.
 * @returns One amount per weight, summing exactly to `total`.
 * @throws {MoneyError} `MONEY_INVALID_MINOR_UNITS` or `MONEY_INVALID_WEIGHTS`.
 *
 * @example
 * allocateAmount(1000, [1, 1, 1]); // [334, 333, 333]
 */
export function allocateAmount(total: number, weights: readonly number[]): number[] {
  assertMinorUnits(total, "total");

  if (!Array.isArray(weights) || weights.length === 0) {
    fail("MONEY_INVALID_WEIGHTS", "Expected a non-empty array of weights.", { received: weights });
  }

  for (const weight of weights) {
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0 || !Number.isInteger(weight)) {
      fail("MONEY_INVALID_WEIGHTS", "Expected every weight to be a non-negative integer.", { received: weight });
    }
  }

  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum === 0) {
    fail("MONEY_INVALID_WEIGHTS", "Expected the weights to sum above zero.", { weights });
  }

  const sign = total < 0 ? -1 : 1;
  const magnitude = Math.abs(total);

  // Exact share times the weight, kept as a numerator so no precision is lost.
  const scale = 10 ** 9;
  const shares = weights.map((weight) => (weight * magnitude * scale) / weightSum);
  const floors = shares.map((share) => Math.floor(share / scale));
  let remainder = magnitude - floors.reduce((sum, value) => sum + value, 0);

  const result = [...floors];
  // Hand the leftover units to the largest fractional shares first, earliest part winning a tie.
  const order = shares
    .map((share, index) => ({ index, fraction: (share / scale) % 1 }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (const { index } of order) {
    if (remainder <= 0) break;
    result[index] += 1;
    remainder -= 1;
  }

  return result.map((value) => sign * value);
}

/**
 * Formats an amount for display.
 *
 * @param minorUnits - Amount in minor units.
 * @param options - Formatting options.
 * @param options.currency - ISO 4217 code, defaults to `USD`.
 * @param options.locale - BCP 47 tag, defaults to `en-US`.
 * @param options.showCurrency - Omit the symbol or code, defaults to `true`.
 * @param options.signed - Force an explicit `+` on a positive amount, defaults to `false`.
 * @returns The formatted string.
 * @throws {MoneyError} `MONEY_INVALID_MINOR_UNITS`.
 *
 * @example
 * formatMoney(123456); // "$1,234.56"
 */
export function formatMoney(minorUnits: number, options: FormatMoneyOptions = {}): string {
  assertMinorUnits(minorUnits);

  const currency = options.currency ?? "USD";
  const locale = options.locale ?? "en-US";
  const fractionDigits = resolveFractionDigits(currency, locale);

  // Intl decides the fraction digits for a currency, so ask it, then hand the count back so the
  // decimal style keeps its trailing zeros instead of defaulting to Intl's maximum of 3.
  const formatter = new Intl.NumberFormat(locale, {
    style: options.showCurrency === false ? "decimal" : "currency",
    ...(options.showCurrency === false ? {} : { currency }),
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    signDisplay: options.signed ? "exceptZero" : "auto"
  });

  return formatter.format(Number(toDecimal(minorUnits, { fractionDigits })));
}

function resolveFractionDigits(currency: string, locale: string): number {
  try {
    const parts = new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(1);
    const fraction = parts.find((part) => part.type === "fraction")?.value ?? "";
    return fraction.replace(/\D/g, "").length;
  } catch {
    // An unusable currency or locale falls back to the common two digits.
    return 2;
  }
}