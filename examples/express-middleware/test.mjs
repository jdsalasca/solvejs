import test from "node:test";
import assert from "node:assert/strict";
import { runSignup } from "./index.mjs";

test("runSignup accepts valid phone", () => {
  const response = runSignup({ phone: "+573001112233" });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
});

test("runSignup rejects invalid phone", () => {
  const response = runSignup({ phone: "abc" });
  assert.equal(response.status, 400);
  assert.equal(response.json.ok, false);
});
