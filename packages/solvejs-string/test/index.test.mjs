import test from "node:test";
import assert from "node:assert/strict";
import { capitalize, toCamelCase, toKebabCase, truncate } from "../dist/esm/index.js";

test("string case and truncate helpers", () => {
  assert.equal(toKebabCase("HolaMundo JS"), "hola-mundo-js");
  assert.equal(toCamelCase("hola-mundo-js"), "holaMundoJs");
  assert.equal(capitalize("solvejs"), "Solvejs");
  assert.equal(truncate("JavaScript utilities", 10), "JavaScr...");
});
