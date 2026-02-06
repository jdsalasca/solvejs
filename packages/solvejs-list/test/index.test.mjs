import test from "node:test";
import assert from "node:assert/strict";
import { chunk, compact, groupBy, unique } from "../dist/esm/index.js";

test("array/list helpers", () => {
  assert.deepEqual(unique([1, 1, 2, 3, 3]), [1, 2, 3]);
  assert.deepEqual(compact([0, 1, null, 2, undefined, 3, "", false]), [1, 2, 3]);
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(groupBy(["one", "two", "three"], value => value.length), { 3: ["one", "two"], 5: ["three"] });
});
