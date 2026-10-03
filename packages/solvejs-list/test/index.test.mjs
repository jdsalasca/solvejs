import test from "node:test";
import assert from "node:assert/strict";
import {
  chunk,
  compact,
  countBy,
  difference,
  groupBy,
  intersection,
  keyBy,
  partition,
  pluck,
  sortBy,
  unique,
  uniqueBy
} from "../dist/esm/index.js";

test("unique", () => {
  assert.deepEqual(unique([1, 1, 2, 2, 3]), [1, 2, 3]);
  assert.deepEqual(unique(["a", "a", "b"]), ["a", "b"], "strings compare by value");
  assert.deepEqual(unique([NaN, NaN]), [NaN], "NaN is deduped with SameValueZero");
  assert.deepEqual(unique([0, -0, 1]), [0, -0, 1].filter((v, i, a) => a.indexOf(v) === i));
  assert.deepEqual(unique([]), []);
  assert.deepEqual(unique([1]), [1]);

  const input = [3, 1, 2, 1];
  unique(input);
  assert.deepEqual(input, [3, 1, 2, 1], "the input is not mutated");
});

test("uniqueBy", () => {
  const rows = [
    { id: 1, team: "a" },
    { id: 2, team: "b" },
    { id: 3, team: "a" }
  ];
  assert.deepEqual(uniqueBy(rows, (row) => row.team), [rows[0], rows[1]], "the first of each key wins");
  assert.deepEqual(uniqueBy(rows, (row) => row.id), rows);
  assert.deepEqual(uniqueBy([], (row) => row), []);
  assert.deepEqual(uniqueBy(rows, () => "same"), [rows[0]]);

  const large = Array.from({ length: 100000 }, (_, index) => ({ key: index % 5000 }));
  assert.equal(uniqueBy(large, (row) => row.key).length, 5000, "100k rows dedupe without a stack overflow");
});

test("compact", () => {
  assert.deepEqual(compact([0, "", null, 1, false, undefined, 2]), [1, 2]);
  assert.deepEqual(compact([]), []);
  assert.deepEqual(compact([1, 2]), [1, 2], "truthy values are kept");
  assert.deepEqual(compact([null, undefined, false, 0, ""]), [], "every falsy value is removed");
  assert.deepEqual(compact(["", "0"]), ["0"], "the string zero is truthy");
});

test("chunk", () => {
  assert.deepEqual(chunk([1, 2, 3], 2), [[1, 2], [3]]);
  assert.deepEqual(chunk([1, 2, 3, 4], 2), [[1, 2], [3, 4]], "an exact split has no short tail");
  assert.deepEqual(chunk([1, 2, 3], 3), [[1, 2, 3]]);
  assert.deepEqual(chunk([1, 2, 3], 10), [[1, 2, 3]], "a size larger than the input is one chunk");
  assert.deepEqual(chunk([], 2), []);
  assert.throws(() => chunk([1, 2, 3], 0), /positive integer/, "size 0 must not loop forever");
  assert.throws(() => chunk([1, 2, 3], -1), /positive integer/);
  assert.throws(() => chunk([1, 2, 3], 1.5), /positive integer/);
});

test("groupBy", () => {
  const rows = [
    { team: "a", n: 1 },
    { team: "b", n: 2 },
    { team: "a", n: 3 }
  ];
  assert.deepEqual(groupBy(rows, (row) => row.team), {
    a: [rows[0], rows[2]],
    b: [rows[1]]
  });
  assert.deepEqual(groupBy([], (row) => row), {});
  assert.deepEqual(groupBy([1, 2], (n) => n % 2), { 0: [2], 1: [1] }, "numeric keys are stringified by the object");

  const large = Array.from({ length: 100000 }, (_, index) => index);
  assert.equal(Object.keys(groupBy(large, (n) => n)).length, 100000, "100k unique keys without a stack overflow");
});

test("countBy", () => {
  assert.deepEqual(countBy(["a", "a", "b"], (value) => value), { a: 2, b: 1 });
  assert.deepEqual(countBy([], (value) => value), {});
  assert.deepEqual(countBy(["a"], () => "same"), { same: 1 });

  const large = Array.from({ length: 100000 }, (_, index) => index % 100);
  const counts = countBy(large, (value) => value);
  assert.equal(Object.keys(counts).length, 100, "100 distinct keys");
  assert.equal(Object.values(counts).every((n) => n === 1000), true, "every bucket holds 1000 rows");
});

test("pluck", () => {
  assert.deepEqual(pluck([{ id: 1 }, { id: 2 }], "id"), [1, 2]);
  assert.deepEqual(pluck([{ a: "x" }], "a"), ["x"]);
  assert.deepEqual(pluck([], "a"), []);
  assert.deepEqual(
    pluck([{ a: 1 }, {}], "a"),
    [1, undefined],
    "a missing property becomes undefined rather than throwing"
  );
});

test("partition", () => {
  assert.deepEqual(
    partition([1, 2, 3, 4], (n) => n % 2 === 0),
    [[2, 4], [1, 3]],
    "the first tuple holds the matches and the second the rejects"
  );
  assert.deepEqual(partition([], () => true), [[], []]);
  assert.deepEqual(partition([1, 2], () => true), [[1, 2], []]);
  assert.deepEqual(partition([1, 2], () => false), [[], [1, 2]]);
});

test("keyBy", () => {
  const rows = [
    { id: "a", n: 1 },
    { id: "b", n: 2 },
    { id: "a", n: 3 }
  ];
  assert.deepEqual(keyBy(rows, (row) => row.id), { a: rows[2], b: rows[1] }, "the last of each key wins");
  assert.deepEqual(keyBy([], (row) => row), {});
});

test("intersection", () => {
  assert.deepEqual(intersection([1, 2, 3], [2, 3, 4]), [2, 3]);
  assert.deepEqual(intersection([], [1]), []);
  assert.deepEqual(intersection([1], []), []);
  assert.deepEqual(intersection([], []), []);
  assert.deepEqual(intersection(["a"], ["a", "b"]), ["a"]);

  // Both operands are filtered by a Set of the right side, so duplicates in the
  // left operand survive. This differs from lodash, which deduplicates. Call
  // unique() first when you need lodash semantics.
  assert.deepEqual(
    intersection([1, 1, 2], [2, 1]),
    [1, 1, 2],
    "duplicates in the left operand are preserved"
  );
  assert.deepEqual(intersection(unique([1, 1, 2]), [2, 1]), [1, 2], "compose with unique for deduplicated output");
});

test("difference", () => {
  assert.deepEqual(difference([1, 2, 3], [2]), [1, 3]);
  assert.deepEqual(difference([], [1]), []);
  assert.deepEqual(difference([1], []), [1]);
  assert.deepEqual(difference([], []), []);

  // Same rule as intersection: the left operand keeps its duplicates.
  assert.deepEqual(difference([1, 1, 2], [2]), [1, 1], "duplicates in the left operand are preserved");
  assert.deepEqual(difference(unique([1, 1, 2]), [2]), [1], "compose with unique for deduplicated output");
});

test("sortBy", () => {
  const rows = [{ n: 3 }, { n: 1 }, { n: 2 }];
  assert.deepEqual(sortBy(rows, (row) => row.n), [{ n: 1 }, { n: 2 }, { n: 3 }]);
  assert.deepEqual(sortBy(rows, (row) => row.n, "desc"), [{ n: 3 }, { n: 2 }, { n: 1 }]);
  assert.deepEqual(sortBy([], (row) => row), []);
  assert.deepEqual(sortBy(["b", "a"], (v) => v), ["a", "b"], "string keys sort lexicographically");

  const before = JSON.stringify(rows);
  const sorted = sortBy(rows, (row) => row.n);
  assert.equal(JSON.stringify(rows), before, "the input array is not mutated");
  assert.notEqual(sorted, rows, "a new array is returned");

  assert.deepEqual(sortBy(rows, (row) => row.n, "asc"), sorted, "asc is the default order");
});

test("sortBy is stable for equal keys", () => {
  const rows = [
    { group: "a", order: 2, id: "first" },
    { group: "a", order: 1, id: "second" },
    { group: "a", order: 2, id: "third" },
    { group: "a", order: 1, id: "fourth" }
  ];

  const ascending = sortBy(rows, (row) => row.order);
  assert.deepEqual(
    ascending.map((row) => row.id),
    ["second", "fourth", "first", "third"],
    "rows with an equal key keep their original relative order"
  );

  const descending = sortBy(rows, (row) => row.order, "desc");
  assert.deepEqual(
    descending.map((row) => row.id),
    ["first", "third", "second", "fourth"],
    "stability holds in descending order too"
  );

  assert.deepEqual(sortBy(rows, (row) => row.group), rows, "one distinct key leaves the order untouched");

  const repeated = sortBy(rows, (row) => row.order);
  assert.deepEqual(repeated, ascending, "sorting twice gives the same result");
});