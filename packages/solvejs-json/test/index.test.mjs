import test from "node:test";
import assert from "node:assert/strict";
import {
  JsonError,
  deepClone,
  deepEqual,
  getOrDefault,
  jsonMerge,
  omitJsonKeys,
  pickJsonKeys,
  safeJsonParse,
  safeJsonStringify,
  stableStringify
} from "../dist/esm/index.js";

test("safeJsonParse", () => {
  assert.deepEqual(safeJsonParse('{"a":1}'), { ok: true, value: { a: 1 } });
  assert.deepEqual(safeJsonParse("[1,2]"), { ok: true, value: [1, 2] });
  assert.deepEqual(safeJsonParse("42"), { ok: true, value: 42 });
  assert.deepEqual(safeJsonParse('"text"'), { ok: true, value: "text" });
  assert.deepEqual(safeJsonParse("null"), { ok: true, value: null });
  assert.deepEqual(safeJsonParse("true"), { ok: true, value: true });

  const bad = safeJsonParse("{oops}");
  assert.equal(bad.ok, false);
  assert.equal(bad.error.code, "JSON_INVALID");
  assert.ok(bad.error.message.length > 0, "the failure carries a message");

  for (const input of ["", "   ", "{", "undefined", "NaN"]) {
    assert.equal(safeJsonParse(input).ok, false, `${JSON.stringify(input)} must not parse`);
  }
});

test("safeJsonParse can supply a fallback instead of a result object", () => {
  assert.deepEqual(safeJsonParse('{"a":1}', { fallback: { a: 0 } }), { a: 1 });
  assert.deepEqual(safeJsonParse("{oops}", { fallback: { a: 0 } }), { a: 0 });
  assert.deepEqual(safeJsonParse("{oops}", { fallback: [] }), []);
  assert.equal(safeJsonParse("null", { fallback: "x" }), null, "a valid null is not replaced");
});

test("safeJsonStringify", () => {
  assert.deepEqual(safeJsonStringify({ a: 1 }), { ok: true, value: '{"a":1}' });
  assert.deepEqual(safeJsonStringify([1, 2]), { ok: true, value: "[1,2]" });
  assert.deepEqual(safeJsonStringify("text"), { ok: true, value: '"text"' });

  // Matches JSON.stringify: no JSON representation is undefined, not an error, and a function or
  // undefined property inside an object is dropped.
  assert.deepEqual(safeJsonStringify(undefined), { ok: true, value: undefined });
  assert.deepEqual(safeJsonStringify(() => 1), { ok: true, value: undefined });
  assert.deepEqual(safeJsonStringify({ fn: () => 1 }), { ok: true, value: "{}" });
  assert.deepEqual(safeJsonStringify({ a: 1, b: undefined }), { ok: true, value: '{"a":1}' });

  const circular = { a: 1 };
  circular.self = circular;
  assert.equal(safeJsonStringify(circular).ok, false);
  assert.equal(safeJsonStringify(circular).error.code, "JSON_CIRCULAR");

  // With a fallback supplied the return value is the string itself, not a result object.
  assert.equal(safeJsonStringify({ a: 1 }, { fallback: "{}" }), '{"a":1}');
  assert.equal(safeJsonStringify(circular, { fallback: "{}" }), "{}");
  assert.equal(safeJsonStringify(undefined, { fallback: "null" }), "null");
});

test("stableStringify sorts keys at every depth", () => {
  assert.equal(stableStringify({ b: 1, a: 2 }), '{"a":2,"b":1}');
  assert.equal(stableStringify({ a: 2, b: 1 }), stableStringify({ b: 1, a: 2 }));
  assert.equal(stableStringify({ z: { b: 1, a: 2 } }), '{"z":{"a":2,"b":1}}');
  assert.equal(stableStringify([{ b: 1, a: 2 }]), '[{"a":2,"b":1}]', "array order is preserved");
  assert.notEqual(stableStringify([1, 2]), stableStringify([2, 1]));
  assert.equal(stableStringify("text"), '"text"');
  assert.equal(stableStringify(null), "null");
  assert.equal(stableStringify(undefined), undefined);
  assert.equal(stableStringify([1, [2, [3]]]), "[1,[2,[3]]]");
});

test("stableStringify rejects cycles", () => {
  const circular = { a: 1 };
  circular.self = circular;
  assert.throws(() => stableStringify(circular), /JsonError|circular/i);
  assert.throws(() => stableStringify([circular]), /JsonError|circular/i);
});

test("deepClone", () => {
  const source = { a: 1, nested: { b: [1, 2, { c: 3 }] }, when: new Date(0) };
  const clone = deepClone(source);

  assert.deepEqual(clone, source);
  assert.notEqual(clone, source, "the root is a new object");
  assert.notEqual(clone.nested, source.nested, "nested objects are cloned too");
  assert.notEqual(clone.nested.b, source.nested.b, "arrays are cloned too");
  assert.notEqual(clone.nested.b[2], source.nested.b[2], "objects inside arrays are cloned");
  assert.notEqual(clone.when, source.when, "a Date is cloned, not shared");
  assert.equal(clone.when.getTime(), 0);

  clone.nested.b.push(99);
  assert.equal(source.nested.b.length, 3, "mutating the clone leaves the source alone");

  assert.deepEqual(deepClone([1, [2]]), [1, [2]]);
  assert.deepEqual(deepClone(null), null);
  assert.equal(deepClone(undefined), undefined);
  assert.deepEqual(deepClone("text"), "text");
  assert.deepEqual(deepClone(42), 42);
});

test("deepClone handles repeated references without recursing forever", () => {
  const shared = { value: 1 };
  const clone = deepClone({ x: shared, y: shared });

  assert.deepEqual(clone, { x: { value: 1 }, y: { value: 1 } });
  assert.equal(clone.x, clone.y, "the shared reference is preserved in the clone");
});

test("deepEqual compares structurally", () => {
  assert.equal(deepEqual({ a: 1 }, { a: 1 }), true);
  assert.equal(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 }), true, "key order does not matter");
  assert.equal(deepEqual({ a: 1 }, { a: 2 }), false);
  assert.equal(deepEqual([1, 2], [1, 2]), true);
  assert.equal(deepEqual([1, 2], [2, 1]), false, "array order matters");
  assert.equal(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }), true);
  assert.equal(deepEqual(null, null), true);
  assert.equal(deepEqual(null, undefined), false);
  assert.equal(deepEqual(NaN, NaN), true, "NaN equals NaN here");
  assert.equal(deepEqual(0, -0), true, "0 and -0 compare equal, unlike Object.is");
  assert.equal(deepEqual(new Date(0), new Date(0)), true);
  assert.equal(deepEqual(new Date(0), new Date(1)), false);
  assert.equal(deepEqual(/a/g, /a/g), true);
  assert.equal(deepEqual(/a/g, /a/i), false);
});

test("deepEqual survives a cycle", () => {
  const left = { a: 1 };
  left.self = left;
  const right = { a: 1 };
  right.self = right;

  assert.equal(deepEqual(left, right), true);
  assert.equal(deepEqual(left, { a: 1 }), false);
});

test("jsonMerge", () => {
  assert.deepEqual(jsonMerge({ a: 1 }, { b: 2 }), { a: 1, b: 2 });
  assert.deepEqual(jsonMerge({ a: 1 }, { a: 2 }), { a: 2 }, "the later value wins");
  assert.deepEqual(jsonMerge({ a: { b: 1 } }, { a: { c: 2 } }), { a: { b: 1, c: 2 } });
  assert.deepEqual(jsonMerge({ a: [1] }, { a: [2, 3] }), { a: [2, 3] }, "arrays are replaced");
  assert.deepEqual(jsonMerge({ a: 1 }, { a: null }), { a: null }, "null overwrites");
  assert.deepEqual(jsonMerge({ a: 1 }, {}, { b: 2 }), { a: 1, b: 2 }, "variadic sources");

  const target = { a: { b: 1 } };
  const source = { a: { c: 2 } };
  jsonMerge(target, source);
  assert.deepEqual(target, { a: { b: 1 } }, "neither input is mutated");

  assert.deepEqual(jsonMerge({ a: 1 }, { __proto__: { polluted: true } }, { b: 2 }), { a: 1, b: 2 });
  assert.equal({}.polluted, undefined, "prototype pollution is refused");
  assert.deepEqual(jsonMerge({ constructor: { x: 1 } }, { b: 2 }), { constructor: { x: 1 }, b: 2 });
});

test("pickJsonKeys", () => {
  assert.deepEqual(pickJsonKeys({ a: 1, b: 2, c: 3 }, ["a", "c"]), { a: 1, c: 3 });
  assert.deepEqual(pickJsonKeys({ a: 1 }, ["zz"]), {}, "an absent key is skipped");
  assert.deepEqual(pickJsonKeys({ a: 1 }, []), {});
  assert.deepEqual(pickJsonKeys({}, ["a"]), {});

  const source = { a: 1, b: 2 };
  const picked = pickJsonKeys(source, ["a"]);
  assert.notEqual(picked, source, "a new object is returned");
  assert.deepEqual(source, { a: 1, b: 2 });
});

test("omitJsonKeys", () => {
  assert.deepEqual(omitJsonKeys({ a: 1, b: 2, c: 3 }, ["b"]), { a: 1, c: 3 });
  assert.deepEqual(omitJsonKeys({ a: 1 }, []), { a: 1 });
  assert.deepEqual(omitJsonKeys({ a: 1 }, ["zz"]), { a: 1 });
  assert.deepEqual(omitJsonKeys({}, ["a"]), {});

  const source = { a: 1, b: 2 };
  assert.notEqual(omitJsonKeys(source, ["a"]), source, "a new object is returned");
  assert.deepEqual(source, { a: 1, b: 2 });
});

test("getOrDefault", () => {
  assert.equal(getOrDefault({ a: 1 }, "a"), 1);
  assert.equal(getOrDefault({ a: 0 }, "a"), 0, "a falsy value is returned as-is");
  assert.equal(getOrDefault({ a: null }, "a", "fallback"), "fallback", "null falls back");
  assert.equal(getOrDefault({ a: false }, "a", "fallback"), false, "false does not fall back");
  assert.equal(getOrDefault({}, "a", "fallback"), "fallback");
  assert.equal(getOrDefault({}, "a"), undefined);
  assert.equal(getOrDefault({ a: 1 }, "toString", "fallback"), "fallback", "an inherited key is not read");
});

test("JsonError carries a stable code and context", () => {
  const error = new JsonError("JSON_INVALID", "Unexpected token o in JSON at position 1.", {
    position: 1
  });

  assert.ok(error instanceof JsonError);
  assert.ok(error instanceof Error);
  assert.equal(error.name, "JsonError");
  assert.equal(error.code, "JSON_INVALID");
  assert.equal(error.message, "Unexpected token o in JSON at position 1.");
  assert.deepEqual(error.details, { position: 1 });
});

test("a round trip through parse and stable stringify is stable", () => {
  const first = safeJsonParse('{"b":1,"a":{"d":4,"c":3}}');
  const once = stableStringify(first.value);
  const twice = stableStringify(safeJsonParse(once).value);

  assert.equal(once, '{"a":{"c":3,"d":4},"b":1}');
  assert.equal(twice, once, "sorting is idempotent, so a hash of this string is stable");
});
test("a throwing getter is reported instead of crashing", () => {
  // A lazily evaluated object, or one behind a Proxy, can throw while its
  // properties are read. Both helpers must report that rather than propagate.
  const hostile = {
    safe: 1,
    get boom() {
      throw new TypeError("getter exploded");
    }
  };

  const result = safeJsonStringify(hostile);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "JSON_UNSERIALISABLE");
  assert.match(result.error.message, /getter exploded/);

  assert.equal(safeJsonStringify(hostile, { fallback: "{}" }), "{}");

  assert.equal(deepEqual(hostile, { safe: 1, boom: 1 }), false, "a throwing getter makes the comparison false");
  assert.equal(deepEqual(hostile, hostile), true, "the same reference short-circuits before any read");
});

test("stableStringify throws a JsonError for a cycle reached through an array", () => {
  const list = [1];
  list.push(list);

  assert.throws(
    () => stableStringify(list),
    (error) => error instanceof JsonError && error.code === "JSON_CIRCULAR"
  );

  const shared = { a: 1 };
  assert.equal(stableStringify([shared, shared]), '[{"a":1},{"a":1}]', "a repeated reference is not a cycle");
});

test("safeJsonStringify handles dates and bigints", () => {
  assert.deepEqual(safeJsonStringify({ at: new Date(0) }), { ok: true, value: '{"at":"1970-01-01T00:00:00.000Z"}' });
  assert.deepEqual(safeJsonStringify(10n), { ok: true, value: '"10"' }, "a bigint becomes its text form");
  assert.deepEqual(safeJsonStringify(NaN), { ok: true, value: "null" }, "a non-finite number becomes null, like JSON");
  assert.deepEqual(safeJsonStringify([NaN, Infinity]), { ok: true, value: "[null,null]" });
});

test("deepClone drops unsafe keys and copies dates and regexes", () => {
  const clone = deepClone(JSON.parse('{"a":1,"__proto__":{"polluted":true}}'));
  assert.deepEqual(clone, { a: 1 });
  assert.equal({}.polluted, undefined);

  const source = { at: new Date(5), re: /x/gi };
  const withDates = deepClone(source);
  assert.notEqual(withDates.at, source.at, "a Date is copied, not shared");
  assert.deepEqual(withDates.at, new Date(5));
  assert.equal(withDates.at.getTime(), 5);
  assert.notEqual(withDates.re, source.re);
  assert.equal(withDates.re.source, "x");
  assert.equal(withDates.re.flags, "gi");
});

test("deepEqual separates types", () => {
  assert.equal(deepEqual([], {}), false, "an array is not a plain object");
  assert.equal(deepEqual([1], { 0: 1 }), false);
  assert.equal(deepEqual(new Date(0), {}), false);
  assert.equal(deepEqual(/a/, "a"), false);
  assert.equal(deepEqual({ a: 1 }, { a: 1, b: undefined }), false, "an explicit undefined key changes the key count");
  assert.equal(deepEqual([1, 2], [1, 2, 3]), false);
});