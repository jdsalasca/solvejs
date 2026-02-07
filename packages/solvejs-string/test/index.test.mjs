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

test("string helpers edge cases", () => {
  assert.equal(toKebabCase("  Árbol   Útil  "), "arbol-util");
  assert.equal(toCamelCase("Árbol útil"), "arbolUtil");
  assert.equal(truncate("hello", 0), "");
  assert.equal(truncate("hello", 3), "...");
  assert.equal(mask("1234", 4), "1234");
  assert.equal(mask("1234", 0), "****");
  assert.equal(stripHtml("<div><p>safe</p></div>"), "safe");
  assert.equal(toTitleCase("   MANY    spaces "), "Many Spaces");
  assert.equal(toKebabCase("Straße für Öl"), "stra-e-fur-ol");
  assert.equal(toCamelCase("İstanbul büyükşehir"), "istanbulBuyuksehir");
  assert.equal(toTitleCase("mañana útil"), "Mañana Útil");
  assert.equal(truncate("😀😀😀", 2), "..");
  assert.equal(mask("🔒secret", 3), "*****ret");
  assert.throws(() => truncate("x", -1), /non-negative integer/i);
  assert.throws(() => mask("x", -1), /non-negative integer/i);
});
