import test from "node:test";
import assert from "node:assert/strict";
import {
  MoneyError,
  addMoney,
  allocateAmount,
  applyPercentage,
  formatMoney,
  fromDecimal,
  multiplyMoney,
  percentageOf,
  subtractMoney,
  sumMoney,
  toDecimal
} from "../dist/esm/index.js";

test("fromDecimal converts a decimal amount into minor units without floating point drift", () => {
  assert.equal(fromDecimal("10.00"), 1000);
  assert.equal(fromDecimal("10"), 1000);
  assert.equal(fromDecimal("10.5"), 1050);
  assert.equal(fromDecimal("10.05"), 1005);
  assert.equal(fromDecimal("0.1"), 10);
  assert.equal(fromDecimal("-10.50"), -1050);
  assert.equal(fromDecimal("1234.56"), 123456);
  assert.equal(fromDecimal("0"), 0);
  assert.equal(fromDecimal(19.99), 1999, "a number input is accepted");

  // Extra precision is refused rather than silently rounded, because a quietly
  // rounded input amount is how an invoice dispute starts.
  assert.throws(() => fromDecimal("2.675"), /MoneyError|fraction digits/);
  assert.throws(() => fromDecimal("0.005"), /MoneyError|fraction digits/);
  assert.equal(fromDecimal("1.5000"), 150, "trailing zeros are not extra precision");
  assert.equal(fromDecimal("10.00"), 1000, "a full-width amount is not extra precision");
});

test("fromDecimal rejects anything that is not a plain decimal amount", () => {
  for (const bad of ["", " ", "abc", "1.2.3", "1,000", "$10", "10%", "1e3", "-", ".", "1.", "NaN", "Infinity"]) {
    assert.throws(() => fromDecimal(bad), /MoneyError|decimal/, `${JSON.stringify(bad)} must be rejected`);
  }
  assert.throws(() => fromDecimal(NaN), /MoneyError|decimal/);
  assert.throws(() => fromDecimal(Infinity), /MoneyError|decimal/);
  assert.throws(() => fromDecimal(null), /MoneyError|decimal/);
  assert.throws(() => fromDecimal("1.005", { fractionDigits: -1 }), /MoneyError|fractionDigits/);
  assert.throws(() => fromDecimal("1.005", { fractionDigits: 2 }), /MoneyError|fractionDigits/, "more precision than allowed is refused");
  assert.equal(fromDecimal("1.005", { fractionDigits: 3 }), 1005, "a currency with three digits accepts it");
  assert.equal(fromDecimal("1.5000", { fractionDigits: 2 }), 150, "trailing zeros are not extra precision");
  assert.throws(() => fromDecimal("1.0001", { fractionDigits: 2 }), /MoneyError|fraction digits/, "a discarded part is refused, not rounded");
  assert.throws(() => fromDecimal("0.006", { fractionDigits: 2 }), /MoneyError|fraction digits/);
  assert.equal(fromDecimal("10.5", { fractionDigits: 1 }), 105, "a one-digit currency accepts one digit");
});

test("toDecimal converts minor units back to a decimal string", () => {
  assert.equal(toDecimal(1000), "10.00");
  assert.equal(toDecimal(1050), "10.50");
  assert.equal(toDecimal(1), "0.01");
  assert.equal(toDecimal(0), "0.00");
  assert.equal(toDecimal(-1050), "-10.50");
  assert.equal(toDecimal(1, { fractionDigits: 3 }), "0.001");
  assert.equal(toDecimal(123456), "1234.56");

  assert.equal(toDecimal(fromDecimal("19.99")), "19.99", "it round trips");
  assert.equal(toDecimal(fromDecimal("0.07")), "0.07");

  assert.throws(() => toDecimal(1.5), /MoneyError|minor units/);
  assert.throws(() => toDecimal(NaN), /MoneyError|minor units/);
  assert.throws(() => toDecimal("100"), /MoneyError|minor units/);
});

test("addMoney, subtractMoney and sumMoney stay exact", () => {
  assert.equal(addMoney(1050, 995), 2045);
  assert.equal(addMoney(-1050, 1050), 0);
  assert.equal(subtractMoney(1000, 1), 999);
  assert.equal(subtractMoney(1, 1000), -999);
  assert.equal(sumMoney([100, 200, 300]), 600);
  assert.equal(sumMoney([]), 0);
  assert.equal(sumMoney([1, -1, 1]), 1);

  // The classic float failure: 0.1 + 0.2 !== 0.3 in floating point.
  assert.equal(addMoney(fromDecimal("0.1"), fromDecimal("0.2")), fromDecimal("0.3"));
  assert.equal(sumMoney([fromDecimal("0.1"), fromDecimal("0.2")]), fromDecimal("0.3"));

  for (const bad of [1.5, NaN, "10", null, undefined]) {
    assert.throws(() => addMoney(bad, 1), /MoneyError|minor units/);
    assert.throws(() => addMoney(1, bad), /MoneyError|minor units/);
  }
  assert.throws(() => sumMoney([1, "2"]), /MoneyError|minor units/);
  assert.throws(() => sumMoney("nope"), /MoneyError|must be an array/);
});

test("multiplyMoney uses integer arithmetic and an explicit rounding mode", () => {
  assert.equal(multiplyMoney(1000, 3), 3000);
  assert.equal(multiplyMoney(1050, 2), 2100);
  assert.equal(multiplyMoney(999, 0), 0);

  // 33 * 3 / 100 = 0.99 exactly; 100 * 3 / 100 = 3.00.
  assert.equal(percentageOf(3300, 3), 99);
  assert.equal(percentageOf(10000, 3), 300);

  assert.equal(multiplyMoney(1000, 1.5), 1500);
  assert.equal(multiplyMoney(101, 0.5), 51, "51 cents times half rounds half away from zero to 51");
  assert.equal(multiplyMoney(100, 0.333), 33);
  assert.equal(multiplyMoney(100, 0.333, { rounding: "floor" }), 33);
  assert.equal(multiplyMoney(105, 0.5, { rounding: "floor" }), 52, "floor of 52.5 is 52");
  assert.equal(multiplyMoney(105, 0.5, { rounding: "ceil" }), 53);
  assert.equal(multiplyMoney(105, 0.5, { rounding: "down" }), 52, "down truncates toward zero");
  assert.equal(multiplyMoney(-105, 0.5, { rounding: "down" }), -52);
  assert.equal(multiplyMoney(-105, 0.5, { rounding: "floor" }), -53, "floor goes toward negative infinity");

  assert.throws(() => multiplyMoney(1000, NaN), /MoneyError|factor/);
  assert.throws(() => multiplyMoney(1000, "2"), /MoneyError|factor/);
  assert.throws(() => multiplyMoney(1000, 2, { rounding: "nope" }), /MoneyError|rounding/);
});

test("percentageOf and applyPercentage", () => {
  assert.equal(percentageOf(10000, 10), 1000);
  assert.equal(percentageOf(10000, 0), 0);
  assert.equal(percentageOf(0, 50), 0);
  assert.equal(percentageOf(333, 10), 33);
  assert.equal(percentageOf(335, 10), 34, "33.5 rounds half away from zero");

  assert.equal(applyPercentage(10000, 10), 11000, "adds the percentage");
  assert.equal(applyPercentage(10000, -10), 9000, "a negative percentage discounts");
  assert.equal(applyPercentage(10000, 100), 20000);
  assert.equal(applyPercentage(10000, -100), 0);
  assert.equal(applyPercentage(10000, 150), 25000, "markup above 100 is allowed");

  assert.throws(() => percentageOf(10000, NaN), /MoneyError|percent/);
  assert.throws(() => applyPercentage(10000, NaN), /MoneyError|percent/);
});

test("allocateAmount splits without losing or inventing a single minor unit", () => {
  const total = 1000;
  const parts = allocateAmount(total, [1, 1, 1]);

  assert.equal(parts.reduce((sum, part) => sum + part, 0), total, "the parts sum back to the total");
  assert.deepEqual(parts, [334, 333, 333], "the remainder goes to the earliest parts");

  assert.deepEqual(allocateAmount(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(allocateAmount(100, [3, 1]), [75, 25], "weights are respected");
  assert.deepEqual(allocateAmount(100, [1, 3]), [25, 75]);
  assert.deepEqual(allocateAmount(1000, [0, 1]), [0, 1000], "a zero weight gets nothing");
  assert.deepEqual(allocateAmount(7, [1, 1, 1, 1, 1, 1, 1]), [1, 1, 1, 1, 1, 1, 1], "more parts than units is fine");
  assert.deepEqual(allocateAmount(-1000, [1, 1, 1]).reduce((sum, part) => sum + part, 0), -1000, "negatives stay exact");

  // Property check across many shapes: nothing is created or lost.
  for (const total of [0, 1, 7, 99, 100, 101, 999, 12345]) {
    for (const weights of [[1], [1, 1], [1, 1, 1], [2, 3, 5], [1, 1, 1, 1, 1, 1, 1]]) {
      const parts = allocateAmount(total, weights);
      assert.equal(
        parts.reduce((sum, part) => sum + part, 0),
        total,
        `${total} across ${weights.length} parts must be conserved`
      );
      assert.equal(parts.length, weights.length, "one output per weight");
      assert.equal(
        parts.every(Number.isInteger),
        true,
        "every part is a whole number of minor units"
      );
    }
  }
});

test("allocateAmount validates its inputs", () => {
  assert.throws(() => allocateAmount(100, []), /MoneyError|weights/);
  assert.throws(() => allocateAmount(100, [0, 0]), /MoneyError|weights/, "all-zero weights cannot be normalised");
  assert.throws(() => allocateAmount(100, [1, -1]), /MoneyError|weights/);
  assert.throws(() => allocateAmount(100, [1, 0.5]), /MoneyError|weights/);
  assert.throws(() => allocateAmount(100, "nope"), /MoneyError|weights|must be an array/);
  assert.throws(() => allocateAmount(1.5, [1]), /MoneyError|minor units/);
  assert.throws(() => allocateAmount(NaN, [1]), /MoneyError|minor units/);
});

test("formatMoney builds a currency string", () => {
  assert.equal(formatMoney(123456, { currency: "USD", locale: "en-US" }), "$1,234.56");
  assert.equal(formatMoney(1000, { currency: "USD", locale: "en-US" }), "$10.00");
  assert.equal(formatMoney(5, { currency: "USD", locale: "en-US" }), "$0.05");
  assert.equal(formatMoney(-1000, { currency: "USD", locale: "en-US" }), "-$10.00");
  assert.equal(formatMoney(0, { currency: "USD", locale: "en-US" }), "$0.00");
  assert.equal(formatMoney(123456, { currency: "EUR", locale: "de-DE" }).replace(/\u00a0/g, " "), "1.234,56 \u20ac", "de-DE renders the symbol, not the code");
  assert.equal(formatMoney(10, { currency: "JPY", locale: "en-US" }), "¥10", "a zero-decimal currency drops the fraction");
  assert.equal(formatMoney(1000, { currency: "JPY", locale: "en-US" }), "¥1,000", "minor units follow the currency's own digits");

  assert.throws(() => formatMoney(1.5), /MoneyError|minor units/);
  assert.throws(() => formatMoney(1000, { currency: "NOPE" }), /MoneyError|currency|RangeError/i);
});

test("formatMoney can hide the symbol and force a sign", () => {
  assert.equal(formatMoney(123456, { currency: "USD", locale: "en-US", showCurrency: false }), "1,234.56");
  assert.equal(formatMoney(1000, { currency: "USD", locale: "en-US", showCurrency: false, signed: true }), "+10.00");
  assert.equal(formatMoney(-1000, { currency: "USD", locale: "en-US", showCurrency: false, signed: true }), "-10.00");
  assert.equal(formatMoney(1000, { currency: "USD", locale: "en-US", signed: true }), "+$10.00");
});

test("MoneyError carries a stable code and context", () => {
  const error = new MoneyError("MONEY_INVALID_MINOR_UNITS", "Expected minor units to be a safe integer.", {
    received: 1.5
  });

  assert.ok(error instanceof MoneyError);
  assert.ok(error instanceof Error);
  assert.equal(error.name, "MoneyError");
  assert.equal(error.code, "MONEY_INVALID_MINOR_UNITS");
  assert.equal(error.message, "Expected minor units to be a safe integer.");
  assert.deepEqual(error.details, { received: 1.5 });
});

test("a full invoice flow stays exact end to end", () => {
  // The flow that motivates integer money: unit price times quantity, a discount,
  // a tax rate, then a split between two payers.
  const unitPrice = fromDecimal("19.99");
  const quantity = 3;
  const subtotal = multiplyMoney(unitPrice, quantity);
  assert.equal(toDecimal(subtotal), "59.97");

  const discounted = applyPercentage(subtotal, -10);
  assert.equal(toDecimal(discounted), "53.97");

  const taxed = applyPercentage(discounted, 21);
  assert.equal(toDecimal(taxed), "65.30");

  const halves = allocateAmount(taxed, [1, 1]);
  assert.equal(halves.reduce((sum, part) => sum + part, 0), taxed, "the split loses nothing");
  assert.deepEqual(halves.map((part) => toDecimal(part)), ["32.65", "32.65"]);

  // The floating point path lands one cent away, which is the whole reason this package exists.
  assert.equal(taxed, 6530);
  assert.equal(((19.99 * 3) * 0.9 * 1.21).toFixed(2), "65.31", "float drifts by a cent on the same flow");
  assert.notEqual(Number(((19.99 * 3) * 0.9 * 1.21).toFixed(2)), 653 / 100);
});
test("every rounding mode differs in the documented way", () => {
  // 105 * 0.5 = 52.5, the classic halfway case.
  assert.equal(multiplyMoney(105, 0.5), 53, "half-away-from-zero is the default and rounds up");
  assert.equal(multiplyMoney(105, 0.5, { rounding: "half-away-from-zero" }), 53);
  assert.equal(multiplyMoney(105, 0.5, { rounding: "half-up" }), 53);
  assert.equal(multiplyMoney(-105, 0.5, { rounding: "half-away-from-zero" }), -53, "away from zero goes negative");
  assert.equal(
    multiplyMoney(-105, 0.5, { rounding: "half-up" }),
    -52,
    "half-up sends a negative tie toward positive infinity"
  );
  assert.equal(multiplyMoney(105, 0.5, { rounding: "floor" }), 52);
  assert.equal(multiplyMoney(105, 0.5, { rounding: "ceil" }), 53);
  assert.equal(multiplyMoney(105, 0.5, { rounding: "down" }), 52);

  // Negative halfway cases separate the two "half" modes.
  assert.equal(multiplyMoney(-105, 0.5, { rounding: "floor" }), -53, "floor goes toward negative infinity");
  assert.equal(multiplyMoney(-105, 0.5, { rounding: "ceil" }), -52, "ceil goes toward positive infinity");

  assert.equal(multiplyMoney(1, 0.5, { rounding: "half-away-from-zero" }), 1);
  assert.equal(multiplyMoney(1, 0.5, { rounding: "floor" }), 0);
  assert.equal(multiplyMoney(0, 12.5), 0, "zero times anything is zero");
});

test("fromDecimal refuses an amount beyond the safe integer range", () => {
  assert.throws(
    () => fromDecimal("99999999999999999999"),
    /MoneyError|safe integer/,
    "a value that cannot be an exact integer count of minor units is refused"
  );
  assert.throws(() => fromDecimal("-99999999999999999999"), /MoneyError|safe integer/);
  assert.equal(
    fromDecimal("9007199254740991", { fractionDigits: 0 }),
    9007199254740991,
    "the largest safe integer still converts"
  );
  assert.throws(() => fromDecimal("9007199254740992", { fractionDigits: 0 }), /MoneyError|safe integer/);
});

test("percentageOf settles a fractional result with the chosen mode", () => {
  assert.equal(percentageOf(105, 50), 53, "52.5 rounds away from zero by default");
  assert.equal(percentageOf(105, 50, { rounding: "floor" }), 52);
  assert.equal(percentageOf(105, 50, { rounding: "half-up" }), 53);
  assert.equal(percentageOf(-105, 50, { rounding: "half-up" }), -52);
  assert.equal(percentageOf(105, 50, { rounding: "down" }), 52);
  assert.equal(percentageOf(100, 33), 33, "33% of 100 is exact");
  assert.equal(percentageOf(105, 33), 35, "34.65 rounds away from zero to 35");
  assert.equal(percentageOf(105, 33, { rounding: "floor" }), 34);
  assert.equal(percentageOf(105, 33, { rounding: "ceil" }), 35);
  assert.equal(percentageOf(105, 33, { rounding: "down" }), 34);
});

test("applyPercentage settles through the same modes", () => {
  assert.equal(applyPercentage(105, 50, { rounding: "floor" }), 157);
  assert.equal(applyPercentage(105, 50, { rounding: "half-away-from-zero" }), 158);
  assert.equal(applyPercentage(105, 50, { rounding: "half-up" }), 158);
  assert.equal(applyPercentage(-105, 50, { rounding: "half-up" }), -157);
});

test("multiplyMoney validates the rounding mode before doing any work", () => {
  assert.throws(() => multiplyMoney(100, 2, { rounding: "nearest" }), /MoneyError|rounding/);
  assert.throws(() => percentageOf(100, 10, { rounding: "nearest" }), /MoneyError|rounding/);
});

test("toDecimal honours a zero-digit currency", () => {
  assert.equal(toDecimal(1000, { fractionDigits: 0 }), "1000");
  assert.equal(toDecimal(10, { fractionDigits: 0 }), "10");
  assert.equal(toDecimal(-10, { fractionDigits: 0 }), "-10");
  assert.equal(toDecimal(0, { fractionDigits: 0 }), "0");
  assert.equal(toDecimal(5, { fractionDigits: 0 }), "5", "with no fraction digits, 5 minor units are 5 units");
  assert.equal(fromDecimal("10.5", { fractionDigits: 1 }), 105, "a one-digit currency parses one digit");
});

test("formatMoney lets a malformed locale throw rather than guessing", () => {
  // A bad locale or currency is a configuration error, and Intl's message names it.
  assert.throws(
    () => formatMoney(1234, { locale: "not a locale" }),
    RangeError,
    "an unusable locale fails loudly"
  );
  assert.throws(() => formatMoney(1234, { currency: "NOPE" }), RangeError);
  assert.equal(
    formatMoney(1234, { currency: "USD", locale: "en-US" }),
    "$12.34",
    "a valid configuration is unaffected"
  );
});