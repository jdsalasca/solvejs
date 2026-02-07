import test from "node:test";
import assert from "node:assert/strict";
import { chunk, compact, difference, groupBy, intersection, keyBy, partition, sortBy, unique, uniqueBy } from "../dist/esm/index.js";

test("array/list helpers", () => {
  assert.deepEqual(unique([1, 1, 2, 3, 3]), [1, 2, 3]);
  assert.deepEqual(uniqueBy([{ id: 1 }, { id: 1 }, { id: 2 }], (item) => item.id), [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(compact([0, 1, null, 2, undefined, 3, "", false]), [1, 2, 3]);
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(groupBy(["one", "two", "three"], value => value.length), { 3: ["one", "two"], 5: ["three"] });
  assert.deepEqual(partition([1, 2, 3, 4], n => n % 2 === 0), [[2, 4], [1, 3]]);
  assert.deepEqual(keyBy([{ id: "a" }, { id: "b" }], item => item.id), { a: { id: "a" }, b: { id: "b" } });
  assert.deepEqual(intersection([1, 2, 3, 4], [3, 4, 5]), [3, 4]);
  assert.deepEqual(difference([1, 2, 3, 4], [3, 4, 5]), [1, 2]);
  assert.deepEqual(sortBy([{ n: 2 }, { n: 1 }], item => item.n), [{ n: 1 }, { n: 2 }]);
});

test("array/list helpers edge cases", () => {
  assert.deepEqual(chunk([1, 2], 5), [[1, 2]]);
  assert.throws(() => chunk([1, 2], 0), /positive integer/i);
  assert.throws(() => chunk([1, 2], 1.5), /positive integer/i);
  assert.deepEqual(intersection([1, 1, 2, 3], [1, 3]), [1, 1, 3]);
  assert.deepEqual(difference([1, 1, 2, 3], [1]), [2, 3]);
  assert.deepEqual(sortBy([{ n: 1 }, { n: 2 }], item => item.n, "desc"), [{ n: 2 }, { n: 1 }]);
  assert.deepEqual(partition([], () => true), [[], []]);
});
