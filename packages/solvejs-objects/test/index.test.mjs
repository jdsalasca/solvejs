import test from "node:test";
import assert from "node:assert/strict";
import { deepMerge, get, hasOwn, mapValues, omit, pick, set } from "../dist/esm/index.js";

test("hasOwn", () => {
  assert.equal(hasOwn({ a: 1 }, "a"), true);
  assert.equal(hasOwn({}, "toString"), false, "an inherited key is not an own key");
  assert.equal(hasOwn({}, "constructor"), false);
  assert.equal(hasOwn({ a: undefined }, "a"), true, "a key holding undefined is still an own key");
  assert.equal(hasOwn("str", "length"), true, "a primitive string exposes length as an own key");
  assert.equal(hasOwn(null, "a"), false);
  assert.equal(hasOwn(undefined, "a"), false);

  const parent = { inherited: 1 };
  assert.equal(hasOwn(Object.create(parent), "inherited"), false, "a prototype key is rejected");
});

test("pick", () => {
  assert.deepEqual(pick({ a: 1, b: 2 }, ["a"]), { a: 1 });
  assert.deepEqual(pick({ a: 1, b: 2 }, ["a", "b"]), { a: 1, b: 2 });
  assert.deepEqual(pick({ a: 1 }, ["zz"]), {}, "an absent key is skipped rather than set to undefined");
  assert.deepEqual(pick({ a: 1 }, []), {});
  assert.deepEqual(pick({}, ["a"]), {});

  const source = { a: 1, b: 2 };
  assert.notEqual(pick(source, ["a"]), source, "a new object is returned");
  assert.deepEqual(source, { a: 1, b: 2 }, "the source is not mutated");
});

test("omit", () => {
  assert.deepEqual(omit({ a: 1, b: 2 }, ["a"]), { b: 2 });
  assert.deepEqual(omit({ a: 1 }, []), { a: 1 });
  assert.deepEqual(omit({ a: 1 }, ["zz"]), { a: 1 }, "an absent key is a no-op");
  assert.deepEqual(omit({}, ["a"]), {});
  assert.deepEqual(
    omit({ toString: 1 }, []),
    { toString: 1 },
    "an own key that shadows a prototype member is copied like any other"
  );

  const source = { a: 1, b: 2 };
  assert.notEqual(omit(source, ["a"]), source, "a new object is returned");
  assert.deepEqual(source, { a: 1, b: 2 }, "the source is not mutated");
});

test("mapValues", () => {
  assert.deepEqual(mapValues({ a: 1, b: 2 }, (value) => value * 2), { a: 2, b: 4 });
  assert.deepEqual(mapValues({ a: 1 }, (value, key) => `${key}:${value}`), { a: "a:1" }, "the key is passed through");
  assert.deepEqual(mapValues({}, (value) => value), {});

  const source = { a: 1 };
  mapValues(source, (value) => value + 1);
  assert.deepEqual(source, { a: 1 }, "the source is not mutated");
});

test("get", () => {
  assert.equal(get({ a: { b: 1 } }, "a.b"), 1);
  assert.deepEqual(get({ a: { b: 1 } }, "a"), { b: 1 });
  assert.equal(get({ a: { b: 1 } }, "a.z"), undefined, "a missing deep path is undefined");
  assert.equal(get({ a: { b: 1 } }, "a.z", "fallback"), "fallback");
  assert.equal(get({ a: 1 }, "a.b.c"), undefined, "walking through a primitive yields undefined");
  assert.equal(get({}, "a.b.c"), undefined);
  assert.equal(get(null, "a"), undefined);
  assert.equal(get(undefined, "a"), undefined);
  assert.equal(get({ a: { b: 0 } }, "a.b", 9), 0, "a present falsy value wins over the fallback");
  assert.equal(get({ a: { b: null } }, "a.b", "fallback"), "fallback", "null falls back");
  assert.equal(get({ a: { b: false } }, "a.b", "fallback"), false, "false does not fall back");
  assert.equal(get({ a: { b: [1, 2] } }, "a.b.0"), 1, "array indexes are addressable");
  assert.equal(get({ a: 1 }, ""), undefined);
  assert.equal(get({ a: 1 }, "   "), undefined, "a whitespace path is empty");
  assert.equal(
    get({ "a.b": 1 }, "a.b"),
    undefined,
    "a literal dotted key is not read directly; the path always splits on dots"
  );
  assert.equal(get({ a: { b: 1 } }, "a.b"), 1, "the nested shape is what the path addresses");
});

test("set", () => {
  assert.deepEqual(set({}, "a.b", 1), { a: { b: 1 } }, "intermediate objects are created");
  assert.deepEqual(set({ a: { b: 1 } }, "a.b", 2), { a: { b: 2 } });
  assert.deepEqual(set({ a: 1 }, "a.b", 2), { a: { b: 2 } }, "a primitive on the path is replaced by an object");

  // set mutates in place and returns the same reference, unlike lodash's
  // immutable _.set. Pinned here because it changes how call sites must be written.
  const target = { a: { b: 1 } };
  const returned = set(target, "a.c", 9);
  assert.equal(returned, target, "the same reference is returned");
  assert.deepEqual(target, { a: { b: 1, c: 9 } }, "the target is mutated in place");

  assert.deepEqual(set({ "a-b": 1 }, "a-b", 2), { "a-b": 2 }, "a key with a dash is one segment");
  assert.deepEqual(
    set({ "a.b": 1 }, "a.b", 2),
    { "a.b": 1, a: { b: 2 } },
    "a literal dotted key is separate from the nested path"
  );

  assert.throws(() => set({}, "", 1), /non-empty dot path/);
  assert.throws(() => set({}, "   ", 1), /non-empty dot path/);
  assert.throws(() => set(null, "a", 1), /Expected value to be an object/);
  assert.throws(() => set("str", "a", 1), /Expected value to be an object/);

  // Prototype pollution must be refused outright rather than walking into __proto__.
  assert.throws(() => set({}, "__proto__.polluted", true), /unsafe segment/);
  assert.throws(() => set({}, "a.__proto__.polluted", true), /unsafe segment/);
  assert.throws(() => set({}, "a.constructor.prototype.polluted", true), /unsafe segment/);
  assert.equal({}.polluted, undefined, "the global prototype stays clean");
  assert.equal({}.a, undefined, "no nested prototype member was created either");
  assert.equal(get({}, "__proto__"), undefined, "reading __proto__ yields undefined");
});

test("deepMerge", () => {
  assert.deepEqual(deepMerge({ a: 1 }, { b: 2 }), { a: 1, b: 2 });
  assert.deepEqual(deepMerge({ a: 1 }, { a: 2 }), { a: 2 }, "the later source wins a scalar conflict");
  assert.deepEqual(deepMerge({ a: { b: 1 } }, { a: { c: 2 } }), { a: { b: 1, c: 2 } }, "nested objects merge");
  assert.deepEqual(deepMerge({ a: { b: 1 } }, { a: 5 }), { a: 5 }, "a scalar replaces an object");
  assert.deepEqual(deepMerge({ a: [1] }, { a: [2, 3] }), { a: [2, 3] }, "arrays are replaced, not concatenated");
  assert.deepEqual(deepMerge({ a: 1 }, { b: 2 }, { c: 3 }), { a: 1, b: 2, c: 3 }, "sources apply left to right");
  assert.deepEqual(deepMerge({ a: 1 }, { b: 2 }, { b: 3 }), { a: 1, b: 3 }, "the last source wins");
  assert.deepEqual(deepMerge({ a: 1 }), { a: 1 }, "no sources returns the target");

  const target = { a: { b: 1 } };
  const source = { a: { c: 2 } };
  const targetBefore = JSON.stringify(target);
  const sourceBefore = JSON.stringify(source);
  const merged = deepMerge(target, source);
  assert.deepEqual(merged, { a: { b: 1, c: 2 } });
  assert.equal(JSON.stringify(target), targetBefore, "the target is not mutated");
  assert.equal(JSON.stringify(source), sourceBefore, "the source is not mutated");
  assert.notEqual(merged, target, "a new object is returned");

  assert.throws(() => deepMerge({ a: 1 }, null), TypeError);
});

test("deepMerge refuses prototype-polluting keys", () => {
  const polluted = JSON.parse('{"__proto__": {"polluted": true}}');
  const merged = deepMerge({}, polluted);

  assert.equal({}.polluted, undefined, "the global prototype is untouched");
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(merged.polluted, undefined, "the payload is not copied onto the result");
  assert.deepEqual(Object.keys(merged), [], "the unsafe top-level key is dropped entirely");

  const constructorPayload = JSON.parse('{"constructor": {"prototype": {"polluted": true}}}');
  deepMerge({}, constructorPayload);
  assert.equal({}.polluted, undefined, "a constructor.prototype payload is refused too");

  assert.deepEqual(
    deepMerge({ a: 1 }, JSON.parse('{"__proto__": {"x": 1}, "b": 2}')),
    { a: 1, b: 2 },
    "safe keys around an unsafe one still merge"
  );
});

test("a nested unsafe key is inert rather than removed", () => {
  // deepMerge only inspects keys where it actually merges. A nested plain object
  // with no counterpart on the target is assigned as-is, so its `__proto__` own
  // property survives as data. That is harmless: an own `__proto__` property does
  // not touch the prototype chain.
  const payload = JSON.parse('{"outer": {"__proto__": {"deep": true}}}');
  const merged = deepMerge({}, payload);

  assert.equal({}.deep, undefined, "no prototype pollution");
  assert.equal(Object.prototype.deep, undefined);
  assert.equal(merged.outer.deep, undefined, "the nested value is not readable through the prototype");

  // Where a merge does happen, the guard applies at that level too.
  const intoExisting = deepMerge({ outer: { keep: 1 } }, JSON.parse('{"outer": {"__proto__": {"deep": true}}}'));
  assert.equal({}.deep, undefined);
  assert.deepEqual(intoExisting, { outer: { keep: 1 } }, "the unsafe key is skipped at merge time");
});