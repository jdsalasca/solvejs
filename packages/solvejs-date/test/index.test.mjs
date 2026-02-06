import test from "node:test";
import assert from "node:assert/strict";
import { addDays, formatDate, isValidDate, parseIsoDate, startOfDay } from "../dist/esm/index.js";

test("formatDate formats in supported tokens", () => {
  const sample = new Date("2026-02-06T12:34:56.000Z");
  assert.equal(formatDate(sample), "2026-02-06");
  assert.equal(formatDate(sample, "DD/MM/YYYY"), "06/02/2026");
  assert.equal(formatDate(sample, "MM-DD-YYYY"), "02-06-2026");
});

test("parseIsoDate and date helpers", () => {
  const parsed = parseIsoDate("2026-02-06T00:00:00.000Z");
  assert.ok(parsed);
  assert.equal(isValidDate(parsed), true);
  assert.equal(isValidDate(new Date("invalid")), false);
  assert.equal(formatDate(addDays(parsed, 3)), "2026-02-09");
  assert.equal(startOfDay(new Date("2026-02-06T23:59:59.000Z")).toISOString(), "2026-02-06T00:00:00.000Z");
});
