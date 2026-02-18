import test from "node:test";
import assert from "node:assert/strict";
import {
  BOOLEAN_STRINGS,
  COMMON_HTTP_HEADERS,
  FILE_SIZE_BYTES,
  HTTP_METHODS,
  TIME,
  parseBooleanString
} from "../dist/esm/index.js";

test("constants module", () => {
  assert.equal(TIME.MINUTE_MS, 60000);
  assert.deepEqual(BOOLEAN_STRINGS.TRUE_VALUES, ["true", "1", "yes", "on"]);
  assert.equal(parseBooleanString("YES"), true);
  assert.equal(parseBooleanString("off"), false);
  assert.equal(FILE_SIZE_BYTES.MB, 1048576);
  assert.equal(HTTP_METHODS.POST, "POST");
  assert.equal(COMMON_HTTP_HEADERS.CONTENT_TYPE, "content-type");
});

test("parseBooleanString supports whitespace and mixed casing", () => {
  assert.equal(parseBooleanString("  TrUe "), true);
  assert.equal(parseBooleanString(" No "), false);
});

test("parseBooleanString throws on unsupported values", () => {
  assert.throws(() => parseBooleanString("enabled"), /Unsupported boolean string value/);
});
