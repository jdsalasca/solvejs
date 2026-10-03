import test from "node:test";
import assert from "node:assert/strict";
import {
  average,
  applyDiscount,
  calculateTaxAmount,
  clamp,
  grossMargin,
  isBetween,
  median,
  percent,
  percentChange,
  randomInt,
  roundTo,
  safeDivide,
  sum,
  toCurrency,
  toNumber,
  toPercent
} from "../dist/esm/index.js";

test("clamp", () => {
  assert.equal(clamp(120, 0, 100), 100);
  assert.equal(clamp(-5, 0, 100), 0);
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(0, 0, 10), 0, "lower bound is inclusive");
  assert.equal(clamp(10, 0, 10), 10, "upper bound is inclusive");
  assert.throws(() => clamp(NaN, 0, 1), /finite/);
  assert.throws(() => clamp(5, 10, 0), /less than or equal to max/);
});

test("roundTo", () => {
  assert.equal(roundTo(10.235, 2), 10.24);
  assert.equal(roundTo(2.5), 3);
  assert.equal(roundTo(-2.5), -2, "Math.round rounds toward positive infinity");
  assert.equal(roundTo(1.005, 2), 1.01, "Number.EPSILON nudges positive halves up");
  // Known asymmetry: the EPSILON nudge is applied before rounding, so it only helps
  // positive values. -1.005 keeps -1 where a symmetric implementation would give -1.01.
  assert.equal(roundTo(-1.005, 2), -1, "negative halves are not nudged, by design");
  assert.equal(roundTo(1.0049999, 2), 1, "values below the midpoint round down");
  assert.throws(() => roundTo(1, 13), /between -12 and 12/);
  assert.throws(() => roundTo(1, -13), /between -12 and 12/);
  assert.throws(() => roundTo(1, 1.5), /integer/);
});

test("sum", () => {
  assert.equal(sum([1, 2, 3, 4]), 10);
  assert.equal(sum([]), 0);
  assert.equal(sum([-1, 1]), 0);
  assert.throws(() => sum([NaN]), /values\[0\]/, "the offending index is reported");
});

test("average", () => {
  assert.equal(average([2, 4, 6]), 4);
  assert.equal(average([2, 4, 6, 8]), 5);
  assert.equal(average([5]), 5);
  assert.throws(() => average([]), /at least one value/);
});

test("median", () => {
  assert.equal(median([10, 1, 3]), 3);
  assert.equal(median([10, 1, 3, 7]), 5, "even length averages the two middle values");
  assert.equal(median([3, 1, 2]), 2, "unsorted input is sorted internally");
  assert.throws(() => median([]), /at least one value/);
});

test("percent", () => {
  assert.equal(percent(25, 200, 1), 12.5);
  assert.equal(percent(0, 100), 0);
  assert.equal(percent(1, 3, 4), 33.3333);
  assert.equal(percent(-50, 200), -25);
  assert.throws(() => percent(1, 0), /total is zero/);
});

test("randomInt", () => {
  for (let i = 0; i < 200; i += 1) {
    const value = randomInt(1, 3);
    assert.equal(value >= 1 && value <= 3, true, `out of range: ${value}`);
  }
  assert.equal(randomInt(5, 5), 5, "a zero-width range yields that single value");
  assert.throws(() => randomInt(1.5, 3), /integers/);
  assert.throws(() => randomInt(5, 1), /less than or equal to max/);
});

test("safeDivide", () => {
  assert.equal(safeDivide(10, 0, -1), -1);
  assert.equal(safeDivide(10, 2), 5);
  assert.equal(safeDivide(10, 0), 0, "default fallback is 0");
  assert.equal(safeDivide(0, 0, 42), 42, "0/0 uses the fallback rather than NaN");
  assert.throws(() => safeDivide(1, 0, NaN), /fallback/);
});

test("percentChange", () => {
  assert.equal(percentChange(120, 100, 1), 20);
  assert.equal(percentChange(80, 100), -20, "a decrease is negative");
  assert.equal(percentChange(100, 80), 25);
  assert.equal(percentChange(100, -100), 200, "a negative base is compared by magnitude");
  assert.throws(() => percentChange(1, 0), /previous is zero/);
});

test("calculateTaxAmount", () => {
  assert.equal(calculateTaxAmount(100, 19), 19);
  assert.equal(calculateTaxAmount(49.99, 8.25, 2), 4.12);
  assert.equal(calculateTaxAmount(100, 0), 0);
  assert.throws(() => calculateTaxAmount(100, -1), /greater than or equal to 0/);
});

test("applyDiscount", () => {
  assert.equal(applyDiscount(200, 15), 170);
  assert.equal(applyDiscount(49.99, 12.5, 2), 43.74);
  assert.equal(applyDiscount(100, 100), 0);
  assert.equal(applyDiscount(100, 0), 100);
  assert.throws(() => applyDiscount(100, 120), /between 0 and 100/);
});

test("grossMargin", () => {
  assert.equal(grossMargin(1000, 700, 1), 30);
  assert.equal(grossMargin(100, 100), 0, "cost equal to revenue is a zero margin");
  assert.equal(grossMargin(100, 150), -50, "cost above revenue is a negative margin");
  assert.throws(() => grossMargin(0, 10), /revenue is zero/);
});

test("isBetween", () => {
  assert.equal(isBetween(5, 1, 10), true);
  assert.equal(isBetween(1, 1, 10, false), false, "exclusive bounds reject the bound itself");
  assert.equal(isBetween(5, 1, 10, false), true, "exclusive bounds accept inner values");
  assert.equal(isBetween(11, 1, 10), false);
  assert.throws(() => isBetween(1, 10, 0), /less than or equal to max/);
});

test("toCurrency", () => {
  assert.equal(toCurrency(10, "USD", "en-US"), "$10.00");
  assert.equal(toCurrency(1234.5), "$1,234.50", "defaults to USD and en-US");
  assert.equal(toCurrency(0), "$0.00");
  assert.equal(toCurrency(1234.5, "EUR", "de-DE"), "1.234,50\u00a0\u20ac");
  assert.throws(() => toCurrency(NaN), /finite/);
});

test("toPercent", () => {
  assert.equal(toPercent(12.345, { maximumFractionDigits: 1 }), "12.3%");
  assert.equal(toPercent(0.1234, { input: "ratio", maximumFractionDigits: 1 }), "12.3%");
  assert.equal(toPercent(0), "0%");
  assert.equal(toPercent(1, { input: "ratio" }), "100%", "ratio 1 is 100%");
  assert.equal(toPercent(-0.5), "-0.5%", "negatives keep their sign");
});

test("toNumber", () => {
  assert.equal(toNumber("1,234.5"), 1234.5);
  assert.equal(toNumber("12,345,678.9"), 12345678.9);
  assert.equal(toNumber(" 42 "), 42);
  assert.equal(toNumber("1,2,3"), null, "malformed grouping is rejected");
  assert.equal(toNumber("1,234", { allowThousandsSeparator: false }), null);
  assert.equal(toNumber("n/a"), null);
  assert.equal(toNumber(""), null);
  assert.equal(toNumber("   "), null);
  assert.equal(toNumber("1.5e3"), null, "scientific notation is rejected");
  assert.equal(toNumber("Infinity"), null);
  assert.equal(toNumber("+42"), 42, "a leading plus is accepted");
  assert.equal(toNumber(".5"), 0.5, "a leading dot is accepted");
  assert.equal(toNumber("1,234"), 1234);
});

test("toNumber keeps a non-numeric spelling out before it can overflow", () => {
  assert.equal(toNumber("Infinity"), null);
  assert.equal(toNumber("NaN"), null);
  assert.equal(toNumber("-Infinity"), null);
  assert.equal(toNumber("1e999"), null, "an exponential form is not the accepted shape at all");
});

test("toNumber refuses a numeric string that overflows to Infinity", () => {
  // The shape is valid, so the regex lets it through, but Number() gives Infinity and an
  // Infinity from a "parsed number" would silently poison every later calculation.
  assert.equal(toNumber("9".repeat(400)), null);
  assert.equal(toNumber("1".repeat(1000)), null);
  assert.equal(toNumber("-9".repeat(400)), null);

const finite = "9".repeat(15);
  assert.equal(toNumber(finite), Number(finite), "a long digit run that stays finite is still parsed");
  assert.equal(toNumber("123456789012345678"), 123456789012345678,
    "precision beyond 2^53 is kept as the nearest double, not refused");
});
