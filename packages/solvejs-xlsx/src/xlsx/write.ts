import { failXlsx } from "../errors.js";
import {
  XLSX_LIMITS,
  type XlsxCell,
  type XlsxSheetInput,
  type XlsxWorkbookInput,
  assertSheetName,
  cellReference,
  excelSerial,
  sanitizeXmlText
} from "../shared.js";
import { escapeXmlAttribute, escapeXmlText } from "../xml/escape.js";
import { writeZip, writeZipDeflated, type ZipEntry } from "../zip/write.js";

const STYLE_NORMAL = 0;
const STYLE_BOLD = 1;
const STYLE_DATE = 2;
const MAX_COLUMN_WIDTH = 255;
const DEFAULT_COLUMN_WIDTH = 12;
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function hasHeaders(sheet: XlsxSheetInput): boolean {
  return sheet.columns?.some((column) => column.header !== undefined) ?? false;
}

function styleAttribute(style: number): string {
  return style === STYLE_NORMAL ? "" : ` s="${style}"`;
}

function renderDateCell(value: Date, reference: string): string {
  return `<c r="${reference}" s="${STYLE_DATE}"><v>${excelSerial(value)}</v></c>`;
}

function renderNumberCell(value: number, reference: string, style: string): string {
  if (!Number.isFinite(value)) {
    failXlsx("XLSX_INVALID_INPUT", "Expected every numeric cell to be finite.", { reference, value });
  }
  return `<c r="${reference}"${style}><v>${value}</v></c>`;
}

function renderBooleanCell(value: boolean, reference: string, style: string): string {
  return `<c r="${reference}"${style} t="b"><v>${value ? 1 : 0}</v></c>`;
}

function renderStringCell(value: string, reference: string, style: string): string {
  const text = sanitizeXmlText(value);
  const preserve = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : "";
  return `<c r="${reference}"${style} t="inlineStr"><is><t${preserve}>${escapeXmlText(text)}</t></is></c>`;
}

function renderCell(value: XlsxCell, reference: string, style: number = STYLE_NORMAL): string {
  if (value === null || value === undefined) return "";

  const attributes = styleAttribute(style);
  if (value instanceof Date) return renderDateCell(value, reference);
  if (typeof value === "number") return renderNumberCell(value, reference, attributes);
  if (typeof value === "boolean") return renderBooleanCell(value, reference, attributes);
  return renderStringCell(value, reference, attributes);
}

function renderRow(row: number, cells: readonly XlsxCell[], style: number = STYLE_NORMAL): string {
  const rendered = cells
    .map((value, index) => renderCell(value, cellReference(row, index + 1), style))
    .join("");
  return `<row r="${row}">${rendered}</row>`;
}

function renderColumns(columns: readonly { width?: number }[] | undefined): string {
  if (!columns || columns.length === 0) return "";
  const rendered = columns.map((column, index) => {
    const width = column.width ?? DEFAULT_COLUMN_WIDTH;
    if (!Number.isFinite(width) || width <= 0 || width > MAX_COLUMN_WIDTH) {
      failXlsx("XLSX_INVALID_INPUT", "Expected column widths between 0 and 255.", { column: index + 1, width });
    }
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  });
  return `<cols>${rendered.join("")}</cols>`;
}

function renderSheetViews(frozen: boolean): string {
  if (!frozen) return "";
  return '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';
}

function renderSheetData(sheet: XlsxSheetInput): string {
  const header = hasHeaders(sheet);
  const rows: string[] = [];
  let rowNumber = 1;

  if (header) {
    rows.push(renderRow(rowNumber, (sheet.columns ?? []).map((column) => column.header ?? ""), STYLE_BOLD));
    rowNumber += 1;
  }
  for (const row of sheet.rows) {
    rows.push(renderRow(rowNumber, row));
    rowNumber += 1;
  }
  return `<sheetData>${rows.join("")}</sheetData>`;
}

function renderSheet(sheet: XlsxSheetInput): string {
  return `${XML_HEADER}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${renderSheetViews(
    hasHeaders(sheet)
  )}${renderColumns(sheet.columns)}${renderSheetData(sheet)}</worksheet>`;
}

function renderWorkbook(sheets: readonly XlsxSheetInput[]): string {
  const entries = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXmlAttribute(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
    )
    .join("");
  return `${XML_HEADER}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${entries}</sheets></workbook>`;
}

function renderWorkbookRels(sheetCount: number): string {
  const sheetRels = Array.from(
    { length: sheetCount },
    (_, index) =>
      `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
  ).join("");
  return `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetRels}<Relationship Id="rId${
    sheetCount + 1
  }" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
}

function renderContentTypes(sheetCount: number): string {
  const sheets = Array.from(
    { length: sheetCount },
    (_, index) =>
      `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join("");
  return `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
}

function renderStyles(): string {
  return `${XML_HEADER}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}

function validateSheet(sheet: XlsxSheetInput, names: Set<string>): void {
  assertSheetName(sheet.name, names);
  names.add(sheet.name.toLowerCase());
  if (!Array.isArray(sheet.rows)) {
    failXlsx("XLSX_INVALID_INPUT", "Expected every sheet to expose a rows array.", { sheet: sheet.name });
  }
  if (sheet.rows.length + (hasHeaders(sheet) ? 1 : 0) > XLSX_LIMITS.maxRows) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Sheet has too many rows.", { sheet: sheet.name });
  }
  for (const row of sheet.rows) {
    if (row.length > XLSX_LIMITS.maxColumns) {
      failXlsx("XLSX_LIMIT_EXCEEDED", "Sheet has too many columns.", { sheet: sheet.name });
    }
  }
}

function validateWorkbook(input: XlsxWorkbookInput): void {
  if (!input || !Array.isArray(input.sheets) || input.sheets.length === 0) {
    failXlsx("XLSX_INVALID_INPUT", "Expected a workbook with at least one sheet.");
  }
  if (input.sheets.length > XLSX_LIMITS.maxSheets) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Workbook has too many sheets.", { sheets: input.sheets.length });
  }

  const names = new Set<string>();
  for (const sheet of input.sheets) validateSheet(sheet, names);
}

function toEntry(name: string, xml: string): ZipEntry {
  return { name, data: new TextEncoder().encode(xml) };
}

function buildEntries(input: XlsxWorkbookInput): ZipEntry[] {
  const entries: ZipEntry[] = [
    toEntry("[Content_Types].xml", renderContentTypes(input.sheets.length)),
    toEntry("_rels/.rels", `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    toEntry("xl/workbook.xml", renderWorkbook(input.sheets)),
    toEntry("xl/_rels/workbook.xml.rels", renderWorkbookRels(input.sheets.length)),
    toEntry("xl/styles.xml", renderStyles())
  ];

  input.sheets.forEach((sheet, index) => {
    entries.push(toEntry(`xl/worksheets/sheet${index + 1}.xml`, renderSheet(sheet)));
  });

  return entries;
}

/** Serialises a workbook into XLSX bytes with stored (uncompressed) ZIP entries. */
export function writeXlsx(input: XlsxWorkbookInput): Uint8Array {
  validateWorkbook(input);
  return writeZip(buildEntries(input));
}

/** Serialises a workbook into XLSX bytes with DEFLATE-compressed entries. */
export async function writeXlsxCompressed(input: XlsxWorkbookInput): Promise<Uint8Array> {
  validateWorkbook(input);
  return writeZipDeflated(buildEntries(input));
}
