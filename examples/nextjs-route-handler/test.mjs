import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "./index.mjs";

test("POST returns 200 for valid payload", async () => {
  const response = await POST({
    json: async () => ({ id: "550e8400-e29b-41d4-a716-446655440000", amount: "1,200" })
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.amount, 1200);
});

test("POST returns 400 for invalid UUID", async () => {
  const response = await POST({
    json: async () => ({ id: "invalid-id", amount: "1,200" })
  });
  assert.equal(response.status, 400);
  assert.equal(response.json.ok, false);
});
