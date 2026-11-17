import { failXlsx } from "./errors.js";
import type { XlsxCell, XlsxCellValue, XlsxColumn } from "./shared.js";
import { writeXlsx } from "./xlsx/write.js";
import type { XlsxCellStyle } from "./style.js";

/** A column key or a column definition for JSON conversion. */
export type JsonToXlsxColumn = string | { key: string; header?: string; width?: number; style?: XlsxCellStyle };

/** Options for `jsonToXlsx` and `jsonToRows`. */
export type JsonToXlsxOptions = {
  sheetName?: string;
  columns?: readonly JsonToXlsxColumn[];
  /** Flatten nested objects into dotted keys. Defaults to true. */
  flatten?: boolean;
  /** Write the header row. Defaults to true. */
  headers?: boolean;
  title?: string;
  creator?: string;
  subject?: string;
  keywords?: string;
  description?: string;
  category?: string;
  company?: string;
  created?: Date | string;
  modified?: Date | string;
};

type RecordValue = Record<string, XlsxCellValue>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function jsonValue(value: unknown): XlsxCellValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return JSON.stringify(value);
}

function flattenInto(target: Record<string, XlsxCellValue>, key: string, value: unknown, flatten: boolean): void {
  if (flatten && isPlainObject(value)) {
    for (const [child, childValue] of Object.entries(value)) {
      flattenInto(target, key ? `${key}.${child}` : child, childValue, flatten);
    }
    return;
  }
  if (Array.isArray(value) && flatten && value.every((item) => typeof item !== "object" || item === null)) {
    target[key] = value.map((item) => (item === null ? "" : String(item))).join(", ");
    return;
  }
  target[key] = jsonValue(value);
}

function recordsOf(data: unknown, flatten: boolean): RecordValue[] {
  const list = Array.isArray(data) ? data : data === undefined || data === null ? [] : [data];
  return list.map((item, index) => {
    if (!isPlainObject(item)) {
      if (Array.isArray(item)) failXlsx("XLSX_INVALID_INPUT", "Expected each JSON row to be an object.", { row: index + 1 });
      return { value: jsonValue(item) };
    }
    const record: Record<string, XlsxCellValue> = {};
    for (const [key, value] of Object.entries(item)) flattenInto(record, key, value, flatten);
    return record;
  });
}

function columnDefinitions(options: JsonToXlsxOptions, records: RecordValue[]): Array<{ key: string; column: XlsxColumn }> {
  if (options.columns && options.columns.length > 0) {
    return options.columns.map((entry) => {
      if (typeof entry === "string") return { key: entry, column: { header: entry } };
      if (!entry.key) failXlsx("XLSX_INVALID_INPUT", "Expected every JSON column to have a key.");
      return { key: entry.key, column: { header: entry.header ?? entry.key, width: entry.width, style: entry.style } };
    });
  }
  const keys: string[] = [];
  for (const record of records) {
    for (const key of Object.keys(record)) if (!keys.includes(key)) keys.push(key);
  }
  return keys.map((key) => ({ key, column: { header: key } }));
}

/** Converts JSON to worksheet columns and rows without writing the file. */
export function jsonToSheet(
  data: unknown,
  options: JsonToXlsxOptions = {}
): { columns: string[]; rows: XlsxCell[][]; columnDefinitions: XlsxColumn[] } {
  const records = recordsOf(data, options.flatten !== false);
  const definitions = columnDefinitions(options, records);
  const rows = records.map((record) => definitions.map((definition) => record[definition.key] ?? null));
  return {
    columns: definitions.map((definition) => definition.key),
    rows,
    columnDefinitions: definitions.map((definition) => definition.column)
  };
}

/** Converts an array of objects (or one object) into a one-sheet XLSX workbook. */
export function jsonToXlsx(data: unknown, options: JsonToXlsxOptions = {}): Uint8Array {
  const { rows, columnDefinitions: columns } = jsonToSheet(data, options);
  const sheetColumns = options.headers === false ? columns.map((column) => ({ ...column, header: undefined })) : columns;
  return writeXlsx({
    title: options.title,
    creator: options.creator,
    subject: options.subject,
    keywords: options.keywords,
    description: options.description,
    category: options.category,
    company: options.company,
    created: options.created,
    modified: options.modified,
    sheets: [
      {
        name: options.sheetName ?? "Data",
        columns: sheetColumns,
        rows
      }
    ]
  });
}

/** Alias for callers that think in objects rather than JSON. */
export const objectsToXlsx = jsonToXlsx;
