import { failXlsx } from "./errors.js";
import { XLSX_LIMITS, isCellObject, type XlsxCell, type XlsxCellValue } from "./shared.js";

/** Options shared by CSV readers and writers. */
export type CsvOptions = {
  /** Field delimiter. Defaults to `,`. */
  delimiter?: string;
  /** Quote character. Defaults to `"`. */
  quote?: string;
  /** Line ending used by the writer. Defaults to `\r\n`. */
  lineEnding?: "\n" | "\r\n";
  /** Prepend a UTF-8 BOM when writing. */
  bom?: boolean;
  /** Drop rows whose fields are all empty. Defaults to false so blank lines survive. */
  skipEmptyLines?: boolean;
  /** Prefix formula-looking strings with an apostrophe when writing. Defaults to true. */
  protectFormulas?: boolean;
};

export type SheetToJsonOptions = {
  /** Header row. Defaults to the first row. */
  header?: readonly (string | number)[];
  /** Value used when a row has no cell for a header. Defaults to `null`. */
  defval?: XlsxCellValue;
  /** Treat the first row as data instead of headers. */
  skipHeader?: boolean;
  /** Include rows that are completely empty. Defaults to false. */
  blankrows?: boolean;
};

export type JsonToRowsOptions = {
  /** Column order. Defaults to first-seen keys across all objects. */
  header?: readonly string[];
  /** Do not emit the header row. */
  skipHeader?: boolean;
};

const MAX_FIELD_LENGTH = XLSX_LIMITS.maxXmlLength;

function validateDelimiter(value: string, quote: string): string {
  if (value.length === 0 || value.includes("\n") || value.includes("\r") || value === quote) {
    failXlsx("XLSX_INVALID_INPUT", "CSV delimiter must be a non-empty character other than the quote.", {
      delimiter: value
    });
  }
  return value;
}

/** Parses CSV or TSV text into rows of strings. Quoted fields may contain newlines and delimiters. */
// eslint-disable-next-line complexity, max-lines-per-function -- single-pass CSV state machine
export function readCsv(text: string, options: CsvOptions = {}): string[][] {
  if (typeof text !== "string") failXlsx("XLSX_INVALID_INPUT", "Expected CSV text.");
  const quote = options.quote ?? '"';
  if (quote.length !== 1) failXlsx("XLSX_INVALID_INPUT", "CSV quote must be one character.", { quote });
  const delimiter = validateDelimiter(options.delimiter ?? ",", quote);
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;
  let started = false;
  let index = 0;

  const pushField = (): void => {
    if (field.length > MAX_FIELD_LENGTH) failXlsx("XLSX_LIMIT_EXCEEDED", "CSV field is too large.");
    row.push(field);
    field = "";
  };
  const pushRow = (): void => {
    pushField();
    if (row.length > XLSX_LIMITS.maxColumns) failXlsx("XLSX_LIMIT_EXCEEDED", "CSV row has too many columns.");
    if (!options.skipEmptyLines || row.some((value) => value.length > 0)) rows.push(row);
    if (rows.length > XLSX_LIMITS.maxRows) failXlsx("XLSX_LIMIT_EXCEEDED", "CSV has too many rows.");
    row = [];
    started = false;
  };

  while (index < source.length) {
    const character = source[index];
    if (closedQuote) {
      if (source.startsWith(delimiter, index)) {
        pushField();
        closedQuote = false;
        started = true;
        index += delimiter.length;
        continue;
      }
      if (character === "\r" || character === "\n") {
        pushRow();
        closedQuote = false;
        index += character === "\r" && source[index + 1] === "\n" ? 2 : 1;
        continue;
      }
      if (character === " " || character === "\t") {
        index += 1;
        continue;
      }
      failXlsx("XLSX_INVALID_INPUT", "Unexpected character after a closing CSV quote.", { index });
    }
    if (quoted) {
      if (character === quote) {
        // eslint-disable-next-line max-depth -- quote escape inside the parser's field loop
        if (source[index + 1] === quote) {
          field += quote;
          index += 2;
          continue;
        }
        quoted = false;
        closedQuote = true;
        index += 1;
        continue;
      }
      field += character;
      index += 1;
      continue;
    }
    if (character === quote && field.length === 0) {
      quoted = true;
      started = true;
      index += 1;
      continue;
    }
    if (source.startsWith(delimiter, index)) {
      pushField();
      started = true;
      index += delimiter.length;
      continue;
    }
    if (character === "\r" || character === "\n") {
      pushRow();
      index += character === "\r" && source[index + 1] === "\n" ? 2 : 1;
      continue;
    }
    field += character;
    started = true;
    index += 1;
  }

  if (quoted) failXlsx("XLSX_INVALID_INPUT", "CSV has an unterminated quoted field.");
  if (closedQuote || started || field.length > 0 || row.length > 0) pushRow();
  return rows;
}

function primitiveCellText(value: XlsxCellValue | undefined): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) failXlsx("XLSX_INVALID_INPUT", "Expected a valid Date cell.");
    return value.toISOString();
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function cellText(value: XlsxCell): string {
  return isCellObject(value) ? primitiveCellText(value.value) : primitiveCellText(value);
}

function protectedText(text: string, protectFormulas: boolean): string {
  if (!protectFormulas) return text;
  return /^[\s]*[=+\-@\t]/.test(text) ? `'${text}` : text;
}

function needsQuotes(text: string, delimiter: string, quote: string): boolean {
  return text.includes(delimiter) || text.includes(quote) || /[\r\n]/.test(text) || /^\s|\s$/.test(text);
}

function csvField(value: XlsxCell, delimiter: string, quote: string, protectFormulas: boolean): string {
  const text = protectedText(cellText(value), protectFormulas);
  return needsQuotes(text, delimiter, quote) ? `${quote}${text.split(quote).join(quote + quote)}${quote}` : text;
}

/** Serializes rows into CSV/TSV text. */
export function writeCsv(rows: readonly (readonly XlsxCell[])[], options: CsvOptions = {}): string {
  const quote = options.quote ?? '"';
  if (quote.length !== 1) failXlsx("XLSX_INVALID_INPUT", "CSV quote must be one character.", { quote });
  const delimiter = validateDelimiter(options.delimiter ?? ",", quote);
  const lineEnding = options.lineEnding ?? "\r\n";
  const protectFormulas = options.protectFormulas !== false;
  const lines = rows.map((row) => row.map((cell) => csvField(cell, delimiter, quote, protectFormulas)).join(delimiter));
  return `${options.bom ? "\uFEFF" : ""}${lines.join(lineEnding)}${lines.length > 0 ? lineEnding : ""}`;
}

function headerName(value: XlsxCellValue, used: Set<string>): string {
  const base = value === null || value === undefined ? "" : String(value);
  let name = base;
  let suffix = 2;
  while (used.has(name)) {
    name = `${base}_${suffix}`;
    suffix += 1;
  }
  used.add(name);
  return name;
}

function headerFor(
  rows: readonly (readonly XlsxCellValue[])[],
  options: SheetToJsonOptions
): { header: string[]; start: number } {
  const headerRow = options.header ?? (options.skipHeader ? [] : (rows[0] as readonly XlsxCellValue[]));
  const used = new Set<string>();
  return {
    header: headerRow.map((value) => headerName(value, used)),
    start: options.header || options.skipHeader ? 0 : 1
  };
}

function isEmptyRow(row: readonly XlsxCellValue[]): boolean {
  return row.every((value) => value === null || value === undefined || value === "");
}

function rowRecord(
  header: readonly string[],
  row: readonly XlsxCellValue[],
  defval: XlsxCellValue
): Record<string, XlsxCellValue> {
  const record = Object.create(null) as Record<string, XlsxCellValue>;
  header.forEach((name, column) => {
    record[name] = row[column] ?? defval;
  });
  return record;
}

/** Converts rows with a header row into plain objects. Objects use a null prototype. */
export function sheetToJson(
  rows: readonly (readonly XlsxCellValue[])[],
  options: SheetToJsonOptions = {}
): Array<Record<string, XlsxCellValue>> {
  if (rows.length === 0) return [];
  if (options.skipHeader && !options.header) {
    failXlsx("XLSX_INVALID_INPUT", "sheetToJson requires a header array when skipHeader is true.");
  }
  const { header, start } = headerFor(rows, options);
  const defval = options.defval ?? null;
  return rows
    .slice(start)
    .filter((row) => options.blankrows === true || !isEmptyRow(row))
    .map((row) => rowRecord(header, row, defval));
}

function columnNames(
  data: readonly Record<string, XlsxCellValue>[],
  requested: readonly string[] | undefined
): string[] {
  if (requested) return [...requested];
  const header: string[] = [];
  const seen = new Set<string>();
  for (const record of data) {
    for (const key of Object.keys(record)) {
      if (seen.has(key)) continue;
      seen.add(key);
      header.push(key);
    }
  }
  return header;
}

function rowOf(header: readonly string[], record: Record<string, XlsxCellValue>): XlsxCellValue[] {
  return header.map((key) => record[key] ?? null);
}

/** Converts objects into rows, emitting a header row unless `skipHeader` is set. */
export function jsonToRows(
  data: readonly Record<string, XlsxCellValue>[],
  options: JsonToRowsOptions = {}
): XlsxCellValue[][] {
  const header = columnNames(data, options.header);
  const rows = data.map((record) => rowOf(header, record));
  return options.skipHeader ? rows : [header, ...rows];
}
