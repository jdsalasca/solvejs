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
  toNumber,
  toCurrency
} from "../dist/esm/index.js";

test("numbers helpers", () => {
  assert.equal(clamp(120, 0, 100), 100);
  assert.equal(roundTo(10.235, 2), 10.24);
  assert.equal(sum([1, 2, 3, 4]), 10);
  assert.equal(average([2, 4, 6]), 4);
  assert.equal(median([10, 1, 3]), 3);
  assert.equal(median([10, 1, 3, 7]), 5);
  assert.equal(percent(25, 200, 1), 12.5);
  assert.equal(safeDivide(10, 0, -1), -1);
  assert.equal(percentChange(120, 100, 1), 20);
  assert.equal(isBetween(5, 1, 10), true);
  assert.equal(toCurrency(10, "USD", "en-US"), "$10.00");
  assert.equal(toNumber("1,234.5"), 1234.5);
  assert.equal(toNumber(" 42 "), 42);
  assert.equal(toNumber("n/a"), null);
});

test("randomInt returns value inside inclusive range", () => {
  const value = randomInt(1, 3);
  assert.equal(value >= 1 && value <= 3, true);
});

test("business-math helpers for tax, discount, and margin", () => {
  assert.equal(calculateTaxAmount(100, 19), 19);
  assert.equal(calculateTaxAmount(49.99, 8.25, 2), 4.12);
  assert.equal(applyDiscount(200, 15), 170);
  assert.equal(applyDiscount(49.99, 12.5, 2), 43.74);
  assert.equal(grossMargin(1000, 700, 1), 30);

  assert.throws(() => calculateTaxAmount(100, -1), /taxRatePercent/);
  assert.throws(() => applyDiscount(100, 120), /discountPercent/);
  assert.throws(() => grossMargin(0, 10), /gross margin/);
});
