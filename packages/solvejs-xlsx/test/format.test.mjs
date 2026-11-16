import test from "node:test";
import assert from "node:assert/strict";
import { formatCellValue, formatExcelDate, formatExcelNumber } from "../dist/esm/index.js";

test("formats common Excel number patterns", () => {
  assert.equal(formatExcelNumber(1234.5, "#,##0.00"), "1,234.50");
  assert.equal(formatExcelNumber(1234.5, "0"), "1235");
  assert.equal(formatExcelNumber(0.256, "0.0%"), "25.6%");
  assert.equal(formatExcelNumber(1234.5, "$#,##0.00"), "$1,234.50");
  assert.equal(formatExcelNumber(-1234.5, "#,##0.00;(#,##0.00)"), "(1,234.50)");
  assert.equal(formatExcelNumber(1234.5, "#,##0.00;[Red](#,##0.00)"), "1,234.50");
  assert.equal(formatExcelNumber(12345, "0.00E+00"), "1.23E+4");
  assert.equal(formatExcelNumber(1.5, "0.00##"), "1.50");
  assert.equal(formatExcelNumber(-12345, "0.00E+00"), "-1.23E+4");
  assert.equal(formatExcelNumber(12, "00000"), "00012");
  assert.equal(formatExcelNumber(12000, "0,"), "12");
  assert.equal(formatExcelDate(new Date(Date.UTC(2026, 10, 16, 15, 30)), "[h]:mm"), "15:30");
});

test("formats dates and times with Excel tokens", () => {
  const date = new Date(Date.UTC(2026, 10, 16, 0, 0, 0));
  assert.equal(formatExcelDate(date, "yyyy-mm-dd"), "2026-11-16");
  assert.equal(formatExcelDate(date, "dd/mm/yyyy"), "16/11/2026");
  assert.equal(formatExcelDate(date, "d-mmm-yy"), "16-Nov-26");
  assert.equal(formatExcelDate(date, "hh:mm"), "00:00");
  assert.equal(formatExcelDate(new Date(Date.UTC(2026, 10, 16, 12, 34, 56)), "mm:ss"), "34:56");
  assert.equal(formatExcelDate(new Date(Date.UTC(2026, 10, 16, 15, 30)), "h:mm AM/PM"), "3:30 PM");
  assert.equal(formatExcelDate(date, '"Day "yyyy'), "Day 2026");
  assert.equal(formatExcelDate(date, "m/d/yy h:mm"), "11/16/26 0:00");
});

test("formats cell values with optional number formats", () => {
  assert.equal(formatCellValue(null), "");
  assert.equal(formatCellValue(1234.5, "#,##0.00"), "1,234.50");
  assert.equal(formatCellValue(true), "TRUE");
  assert.equal(formatCellValue("text", "@"), "text");
  assert.equal(formatCellValue(new Date(Date.UTC(2026, 10, 16)), "yyyy-mm-dd"), "2026-11-16");
  assert.equal(formatCellValue(0.5, "0%"), "50%");
});
