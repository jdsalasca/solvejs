import { failXlsx } from "./errors.js";
import type { XlsxCellStyle, XlsxColor } from "./style.js";

/** A primitive cell value. `null` and `undefined` render as an empty cell. */
export type XlsxCellValue = string | number | boolean | Date | null;

/**
 * A cell with a formula, a hyperlink, or both. `value` is the cached result written next to the
 * formula; the package does not calculate formulas.
 */
export type XlsxCellObject = {
  value?: XlsxCellValue;
  formula?: string;
  href?: string;
};

/** A cell accepted by the writer. */
export type XlsxCell = XlsxCellValue | undefined | XlsxCellObject;

/** Returns true when a cell carries formula or hyperlink metadata. */
export function isCellObject(value: unknown): value is XlsxCellObject {
  return typeof value === "object" && value !== null && !(value instanceof Date);
}

/** A column definition: optional header, width and default style. */
export type XlsxColumn = {
  header?: string;
  width?: number;
  style?: XlsxCellStyle;
};

/** An image anchored to a worksheet cell. */
export type XlsxImageInput = {
  data: Uint8Array | string;
  format?: "png" | "jpeg";
  /** Top-left anchor in A1 notation; defaults to A1. */
  anchor?: string;
  /** Display size in CSS pixels. Defaults to the intrinsic size at 96 DPI. */
  width?: number;
  height?: number;
  alt?: string;
};

export type XlsxPageSetup = {
  orientation?: "portrait" | "landscape";
  paperSize?: number;
  fitToWidth?: number;
  fitToHeight?: number;
};

export type XlsxDataValidationType =
  | "list"
  | "whole"
  | "decimal"
  | "date"
  | "time"
  | "textLength"
  | "custom";

export type XlsxDataValidationOperator =
  | "between"
  | "notBetween"
  | "equal"
  | "notEqual"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqual"
  | "lessThanOrEqual";

/** A dropdown, range check or custom rule applied to a worksheet range. */
export type XlsxDataValidation = {
  /** A1 or A1:B2 range. */
  range: string;
  type: XlsxDataValidationType;
  operator?: XlsxDataValidationOperator;
  /** List items for `type: "list"`; joined into an inline list formula. */
  values?: readonly string[];
  /** Raw formula, for example `$A$1:$A$5`, `1`, `DATE(2026,1,1)` or `AND(A1>0,A1<10)`. */
  formula1?: string;
  /** Second formula for `between` and `notBetween`. */
  formula2?: string;
  allowBlank?: boolean;
  /** Hide the dropdown arrow for list validation. */
  hideDropDown?: boolean;
  showInputMessage?: boolean;
  showErrorMessage?: boolean;
  errorStyle?: "stop" | "warning" | "information";
  errorTitle?: string;
  error?: string;
  promptTitle?: string;
  prompt?: string;
};

/** A worksheet accepted by the writer. */
export type XlsxSheetInput = {
  name: string;
  columns?: readonly XlsxColumn[];
  rows: readonly (readonly XlsxCell[])[];
  freeze?: { rows?: number; columns?: number };
  autoFilter?: boolean | string;
  tabColor?: XlsxColor;
  pageSetup?: XlsxPageSetup;
  dataValidations?: readonly XlsxDataValidation[];
  images?: readonly XlsxImageInput[];
};

/** A workbook accepted by the writer. */
export type XlsxWorkbookInput = {
  sheets: readonly XlsxSheetInput[];
  title?: string;
  creator?: string;
  definedNames?: Record<string, string>;
};

/** A cell style returned by the reader, including the raw number format when present. */
export type XlsxReadStyle = XlsxCellStyle & { numberFormatCode?: string };

/** A worksheet returned by the reader. */
export type XlsxSheetData = {
  name: string;
  rows: XlsxCellValue[][];
  merges?: string[];
  columns?: Array<{ width?: number; style?: XlsxReadStyle }>;
  rowHeights?: Record<number, number>;
  rowStyles?: Record<number, XlsxReadStyle>;
  freeze?: { rows: number; columns: number };
  autoFilter?: string;
  pageSetup?: XlsxPageSetup;
  dataValidations?: XlsxDataValidation[];
  links?: Record<string, string>;
  formulas?: Record<string, string>;
  styles?: Record<string, XlsxReadStyle>;
  images?: Array<{
    anchor: string;
    to?: string;
    fromOffset?: { column: number; row: number };
    toOffset?: { column: number; row: number };
    width: number;
    height: number;
    format: "png" | "jpeg";
    data: Uint8Array;
  }>;
};

/** Options for {@link readXlsx}. */
export type ReadXlsxOptions = {
  /** Only parse these sheet names, in workbook order. */
  sheets?: readonly string[];
  /** Include cell and column styles in the result. */
  includeStyles?: boolean;
  /** Include formulas in the result. Defaults to true. */
  includeFormulas?: boolean;
};

/** A workbook returned by the reader. */
export type XlsxWorkbookData = {
  sheets: XlsxSheetData[];
  date1904?: boolean;
  properties?: { title?: string; creator?: string };
  definedNames?: Record<string, string>;
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
  maxWorkbookCells: 2_000_000,
  maxSheets: 100,
  maxImagePixels: 40_000_000,
  maxImageDisplay: 10_000,
  maxMerges: 10_000,
  maxDefinedNames: 1_000,
  maxDataValidations: 1_000
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
