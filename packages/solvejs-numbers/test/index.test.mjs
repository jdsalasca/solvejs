import test from "node:test";
import assert from "node:assert/strict";
import {
  average,
  clamp,
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
