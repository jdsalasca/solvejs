import test from "node:test";
import assert from "node:assert/strict";
import { BOOLEAN_STRINGS, TIME } from "../dist/esm/index.js";

test("constants module", () => {
  assert.equal(TIME.MINUTE_MS, 60000);
  assert.deepEqual(BOOLEAN_STRINGS.TRUE_VALUES, ["true", "1", "yes", "on"]);
});
