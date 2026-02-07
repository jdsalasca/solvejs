import test from "node:test";
import assert from "node:assert/strict";
import { deepMerge, get, hasOwn, omit, pick, set } from "../dist/esm/index.js";

test("object helpers", () => {
  const source = { id: "u1", name: "Ada", role: "admin" };
  assert.deepEqual(pick(source, ["id", "name"]), { id: "u1", name: "Ada" });
  assert.deepEqual(omit(source, ["role"]), { id: "u1", name: "Ada" });
  assert.equal(hasOwn(source, "id"), true);

  const profile = { user: { profile: { name: "Ada" } } };
  assert.equal(get(profile, "user.profile.name"), "Ada");
  assert.equal(get(profile, "user.profile.email", "none"), "none");

  const target = { user: { profile: {} } };
  set(target, "user.profile.name", "SolveJS");
  assert.deepEqual(target, { user: { profile: { name: "SolveJS" } } });

  const merged = deepMerge(
    { app: { retries: 1, flags: { a: true } } },
    { app: { retries: 2, flags: { b: true } } }
  );
  assert.deepEqual(merged, { app: { retries: 2, flags: { a: true, b: true } } });
});

test("nested path creation, fallback behavior, and mutation guarantees", () => {
  const state = {};
  const sameRef = set(state, "a.b.c", 1);
  assert.equal(sameRef, state);
  assert.deepEqual(state, { a: { b: { c: 1 } } });
  assert.equal(get(state, "a.b.c"), 1);
  assert.equal(get(state, "a.x.c", "fallback"), "fallback");
  assert.throws(() => set({}, "   ", 1), /non-empty dot path/i);
  assert.throws(() => set(null, "a.b", 1), /Expected value to be an object/i);
});

test("deepMerge does not mutate source objects and replaces arrays", () => {
  const left = { app: { flags: { a: true }, list: [1, 2] } };
  const right = { app: { flags: { b: true }, list: [3] } };
  const output = deepMerge(left, right);

  assert.deepEqual(left, { app: { flags: { a: true }, list: [1, 2] } });
  assert.deepEqual(right, { app: { flags: { b: true }, list: [3] } });
  assert.deepEqual(output, { app: { flags: { a: true, b: true }, list: [3] } });
});
