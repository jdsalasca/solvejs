import { failXlsx } from "./errors.js";

/** A cell accepted by the writer. `null` and `undefined` render as an empty cell. */
export type XlsxCell = string | number | boolean | Date | null | undefined;

/** A column definition: optional header and width in Excel character units. */
export type XlsxColumn = {
  header?: string;
  width?: number;
};

/** A worksheet accepted by the writer. */
export type XlsxSheetInput = {
  name: string;
  columns?: readonly XlsxColumn[];
  rows: readonly (readonly XlsxCell[])[];
};

/** A workbook accepted by the writer. */
export type XlsxWorkbookInput = {
  sheets: readonly XlsxSheetInput[];
};

/** A cell returned by the reader. Dates are returned as `Date` in UTC. */
export type XlsxCellValue = string | number | boolean | Date | null;

/** A worksheet returned by the reader. */
export type XlsxSheetData = {
  name: string;
  rows: XlsxCellValue[][];
};

/** A workbook returned by the reader. */
export type XlsxWorkbookData = {
  sheets: XlsxSheetData[];
};

/** Hard limits that keep a malformed file from exhausting memory. */
export const XLSX_LIMITS = {
  maxEntries: 10_000,
  maxEntryBytes: 64 * 1024 * 1024,
  maxTotalBytes: 256 * 1024 * 1024,
  maxXmlLength: 64 * 1024 * 1024,
  maxRows: 100_000,
  maxColumns: 10_000,
  maxCells: 1_000_000,
  maxSheets: 100
} as const;

const INVALID_SHEET_CHARS = /[\\/?*[\]:]/;
const EXCEL_EPOCH_1900 = Date.UTC(1899, 11, 30);
const EXCEL_EPOCH_1904 = Date.UTC(1904, 0, 1);

/** Converts a one-based column index into Excel letters (1 -> A, 27 -> AA). */
export function columnLetters(column: number): string {
  let value = column;
  let letters = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters;
}

/** Builds an A1 reference from one-based row and column numbers. */
export function cellReference(row: number, column: number): string {
  return `${columnLetters(column)}${row}`;
}

export function assertPositiveInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    failXlsx("XLSX_INVALID_INPUT", `Expected ${label} to be a positive integer.`, { [label]: value });
  }
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20) return true;
  }
  return false;
}

function assertSheetNameSyntax(name: string): void {
  if (typeof name !== "string" || name.trim().length === 0) {
    failXlsx("XLSX_INVALID_INPUT", "Expected every sheet to have a non-empty name.", { name });
  }
  if (name.length > 31) {
    failXlsx("XLSX_INVALID_INPUT", "Expected a sheet name with at most 31 characters.", { name });
  }
  if (INVALID_SHEET_CHARS.test(name)) {
    failXlsx("XLSX_INVALID_INPUT", "Sheet names cannot contain \\ / ? * [ ] or :.", { name });
  }
  if (hasControlCharacters(name)) {
    failXlsx("XLSX_INVALID_INPUT", "Sheet names cannot contain control characters.", { name });
  }
}

function assertSheetNameReserved(name: string): void {
  if (name.startsWith("'") || name.endsWith("'")) {
    failXlsx("XLSX_INVALID_INPUT", "Sheet names cannot start or end with an apostrophe.", { name });
  }
  if (name.toLowerCase() === "history") {
    failXlsx("XLSX_INVALID_INPUT", "The sheet name History is reserved by Excel.", { name });
  }
}

export function assertSheetName(name: string, existing: ReadonlySet<string>): void {
  assertSheetNameSyntax(name);
  assertSheetNameReserved(name);
  if (existing.has(name.toLowerCase())) {
    failXlsx("XLSX_INVALID_INPUT", "Sheet names must be unique (case-insensitive).", { name });
  }
}

/** Converts a Date into an Excel serial number, using the 1900 date system. */
export function excelSerial(date: Date): number {
  const time = date.getTime();
  if (!Number.isFinite(time)) {
    failXlsx("XLSX_INVALID_INPUT", "Expected a valid Date instance.", { received: String(date) });
  }
  const days = (time - EXCEL_EPOCH_1900) / 86_400_000;
  // Excel's fake 1900-02-29 means dates before 1900-03-01 are one serial lower.
  return days < 61 ? days - 1 : days;
}

/** Converts an Excel serial number into a UTC Date. Serial 60 is Excel's fake 1900-02-29. */
export function dateFromExcelSerial(serial: number, date1904 = false): Date {
  if (!Number.isFinite(serial)) {
    failXlsx("XLSX_INVALID_INPUT", "Expected a finite Excel serial number.", { received: serial });
  }
  if (date1904) return new Date(EXCEL_EPOCH_1904 + serial * 86_400_000);
  if (serial < 60) return new Date(Date.UTC(1899, 11, 31) + serial * 86_400_000);
  if (serial === 60) return new Date(Date.UTC(1900, 1, 28));
  return new Date(EXCEL_EPOCH_1900 + serial * 86_400_000);
}

/** Removes characters XML 1.0 cannot represent. */
export function sanitizeXmlText(value: string): string {
  let result = "";
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code === 0x9 || code === 0xa || code === 0xd || code >= 0x20) result += character;
  }
  return result;
}
