import test from "node:test";
import assert from "node:assert/strict";
import { dateFromExcelSerial, excelSerial } from "../dist/esm/shared.js";

test("1900 date system handles the leap-year bug boundaries", () => {
  assert.equal(dateFromExcelSerial(1).toISOString(), "1900-01-01T00:00:00.000Z");
  assert.equal(dateFromExcelSerial(59).toISOString(), "1900-02-28T00:00:00.000Z");
  assert.equal(dateFromExcelSerial(60).toISOString(), "1900-02-28T00:00:00.000Z");
  assert.equal(dateFromExcelSerial(61).toISOString(), "1900-03-01T00:00:00.000Z");

  assert.equal(excelSerial(new Date("1900-01-01T00:00:00.000Z")), 1);
  assert.equal(excelSerial(new Date("1900-02-28T00:00:00.000Z")), 59);
  assert.equal(excelSerial(new Date("1900-03-01T00:00:00.000Z")), 61);
  assert.equal(excelSerial(new Date("2026-11-16T00:00:00.000Z")), 46342);
});

test("1904 date system starts at 1904-01-01", () => {
  assert.equal(dateFromExcelSerial(0, true).toISOString(), "1904-01-01T00:00:00.000Z");
  assert.equal(dateFromExcelSerial(1, true).toISOString(), "1904-01-02T00:00:00.000Z");
});
