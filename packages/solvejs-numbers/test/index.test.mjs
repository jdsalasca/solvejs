import test from "node:test";
import assert from "node:assert/strict";
import { average, clamp, median, percent, randomInt, roundTo, sum } from "../dist/esm/index.js";

test("numbers helpers", () => {
  assert.equal(clamp(120, 0, 100), 100);
  assert.equal(roundTo(10.235, 2), 10.24);
  assert.equal(sum([1, 2, 3, 4]), 10);
  assert.equal(average([2, 4, 6]), 4);
  assert.equal(median([10, 1, 3]), 3);
  assert.equal(median([10, 1, 3, 7]), 5);
  assert.equal(percent(25, 200, 1), 12.5);
});

test("randomInt returns value inside inclusive range", () => {
  const value = randomInt(1, 3);
  assert.equal(value >= 1 && value <= 3, true);
});
