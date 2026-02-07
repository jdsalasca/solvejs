import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  daysInMonth,
  diffInDays,
  endOfDay,
  formatDate,
  fromUtcParts,
  isValidDate,
  isLeapYear,
  parseDateStrict,
  parseIsoDate,
  startOfDay
} from "../dist/esm/index.js";

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

test("strict parsing and utc parts", () => {
  assert.equal(parseDateStrict("2026-02-07", "YYYY-MM-DD")?.toISOString(), "2026-02-07T00:00:00.000Z");
  assert.equal(parseDateStrict("07/02/2026", "DD/MM/YYYY")?.toISOString(), "2026-02-07T00:00:00.000Z");
  assert.equal(parseDateStrict("02-07-2026", "MM-DD-YYYY")?.toISOString(), "2026-02-07T00:00:00.000Z");
  assert.equal(parseDateStrict("31/02/2026", "DD/MM/YYYY"), null);
  assert.equal(fromUtcParts(2026, 2, 7).toISOString(), "2026-02-07T00:00:00.000Z");
  assert.equal(endOfDay(new Date("2026-02-07T00:00:00.000Z")).toISOString(), "2026-02-07T23:59:59.999Z");
  assert.equal(diffInDays(new Date("2026-02-10T00:00:00.000Z"), new Date("2026-02-07T00:00:00.000Z")), 3);
  assert.equal(isLeapYear(2024), true);
  assert.equal(daysInMonth(2026, 2), 28);
});
