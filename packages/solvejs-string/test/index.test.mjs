import test from "node:test";
import assert from "node:assert/strict";
import { capitalize, mask, slugify, stripHtml, toCamelCase, toKebabCase, toTitleCase, truncate } from "../dist/esm/index.js";

test("string case and truncate helpers", () => {
  assert.equal(toKebabCase("HolaMundo JS"), "hola-mundo-js");
  assert.equal(toCamelCase("hola-mundo-js"), "holaMundoJs");
  assert.equal(capitalize("solvejs"), "Solvejs");
  assert.equal(truncate("JavaScript utilities", 10), "JavaScr...");
  assert.equal(slugify("Hello, SolveJS World!"), "hello-solve-js-world");
  assert.equal(stripHtml("<p>safe</p>"), "safe");
  assert.equal(toTitleCase("hello solvejs community"), "Hello Solvejs Community");
  assert.equal(mask("1234567890", 4), "******7890");
});
