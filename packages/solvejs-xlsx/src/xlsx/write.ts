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
import { normalizeColor } from "../style.js";
import { escapeXmlAttribute, escapeXmlText } from "../xml/escape.js";
import { writeZip, writeZipDeflated, type ZipEntry } from "../zip/write.js";
import type { CellModel, ColumnModel, FreezeModel, RowModel, SheetModel, WorkbookModel } from "./model.js";
import { StyleRegistry } from "./styles.js";

const MAX_COLUMN_WIDTH = 255;
const DEFAULT_COLUMN_WIDTH = 12;
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function hasHeaders(sheet: XlsxSheetInput): boolean {
  return sheet.columns?.some((column) => column.header !== undefined) ?? false;
}

function renderDateCell(value: Date, reference: string, style: string): string {
  return `<c r="${reference}"${style}><v>${excelSerial(value)}</v></c>`;
}

function renderNumberCell(value: number, reference: string, style: string): string {
  if (!Number.isFinite(value)) {
    failXlsx("XLSX_INVALID_INPUT", "Expected every numeric cell to be finite.", { reference, value });
  }
  return `<c r="${reference}"${style}><v>${value}</v></c>`;
}

function renderStringCell(value: string, reference: string, style: string): string {
  const text = sanitizeXmlText(value);
  const preserve = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : "";
  return `<c r="${reference}"${style} t="inlineStr"><is><t${preserve}>${escapeXmlText(text)}</t></is></c>`;
}

function renderCellValue(value: string | number | boolean | Date, reference: string, style: string): string {
  if (value instanceof Date) return renderDateCell(value, reference, style);
  if (typeof value === "number") return renderNumberCell(value, reference, style);
  if (typeof value === "boolean") return `<c r="${reference}"${style} t="b"><v>${value ? 1 : 0}</v></c>`;
  return renderStringCell(value, reference, style);
}

function renderCell(value: XlsxCell, reference: string, styleId: number): string {
  const style = styleId === 0 ? "" : ` s="${styleId}"`;
  if (value === null || value === undefined) return styleId === 0 ? "" : `<c r="${reference}"${style}/>`;
  return renderCellValue(value, reference, style);
}

function renderRow(row: RowModel, rowNumber: number, styles: StyleRegistry, merges: string[]): string {
  const rendered: string[] = [];

  row.cells.forEach((cell, index) => {
    if (!cell) return;
    const column = index + 1;
    const styleId = styles.register(cell.style ?? {}, cell.value instanceof Date);
    const reference = cellReference(rowNumber, column);
    rendered.push(renderCell(cell.value, reference, styleId));

    const colSpan = cell.colSpan ?? 1;
    const rowSpan = cell.rowSpan ?? 1;
    if (colSpan > 1 || rowSpan > 1) {
      merges.push(`${reference}:${cellReference(rowNumber + rowSpan - 1, column + colSpan - 1)}`);
    }
  });

  const height = row.height !== undefined ? ` ht="${row.height}" customHeight="1"` : "";
  return `<row r="${rowNumber}"${height}>${rendered.join("")}</row>`;
}

function renderColumns(columns: readonly ColumnModel[] | undefined): string {
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

function freezeSplits(rows: number, columns: number): string {
  return `${columns > 0 ? ` xSplit="${columns}"` : ""}${rows > 0 ? ` ySplit="${rows}"` : ""}`;
}

function freezePane(rows: number, columns: number): string {
  if (rows > 0 && columns > 0) return "bottomRight";
  return rows > 0 ? "bottomLeft" : "topRight";
}

function renderFreeze(freeze: FreezeModel | undefined): string {
  const rows = freeze?.rows ?? 0;
  const columns = freeze?.columns ?? 0;
  if (rows === 0 && columns === 0) return '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';

  const topLeftCell = cellReference(rows + 1, columns + 1);
  return `<sheetViews><sheetView workbookViewId="0"><pane${freezeSplits(rows, columns)} topLeftCell="${topLeftCell}" activePane="${freezePane(
    rows,
    columns
  )}" state="frozen"/></sheetView></sheetViews>`;
}

function renderTabColor(color: string | undefined): string {
  const normalized = normalizeColor(color);
  return normalized ? `<sheetPr><tabColor rgb="${normalized}"/></sheetPr>` : "";
}

function columnIndex(letters: string): number | null {
  if (letters.length < 1 || letters.length > 3) return null;
  let column = 0;
  for (const character of letters) {
    if (character < "A" || character > "Z") return null;
    column = column * 26 + character.charCodeAt(0) - 64;
  }
  return column <= XLSX_LIMITS.maxColumns ? column : null;
}

function isRowNumber(digits: string): boolean {
  if (digits.length === 0 || digits[0] === "0") return false;
  for (const character of digits) {
    if (character < "0" || character > "9") return false;
  }
  return Number(digits) <= XLSX_LIMITS.maxRows;
}

function isCellReference(value: string): boolean {
  let letters = 0;
  while (letters < value.length && value[letters] >= "A" && value[letters] <= "Z") letters += 1;
  return columnIndex(value.slice(0, letters)) !== null && isRowNumber(value.slice(letters));
}

function assertAutoFilterRef(reference: string): void {
  const parts = reference.split(":");
  if (parts.length > 2 || !parts.every(isCellReference)) {
    failXlsx("XLSX_INVALID_INPUT", "Expected an A1 or A1:C3 auto-filter reference.", { autoFilter: reference });
  }
}

function renderAutoFilter(reference: string | undefined): string {
  if (!reference) return "";
  assertAutoFilterRef(reference);
  return `<autoFilter ref="${escapeXmlAttribute(reference)}"/>`;
}

function renderSheetData(sheet: SheetModel, styles: StyleRegistry, merges: string[]): string {
  const rows = sheet.rows.map((row, index) => renderRow(row, index + 1, styles, merges)).join("");
  return `<sheetData>${rows}</sheetData>`;
}

function renderMerges(merges: readonly string[]): string {
  if (merges.length === 0) return "";
  return `<mergeCells count="${merges.length}">${merges
    .map((reference) => `<mergeCell ref="${reference}"/>`)
    .join("")}</mergeCells>`;
}

function renderSheet(sheet: SheetModel, styles: StyleRegistry): string {
  const merges: string[] = [];
  const data = renderSheetData(sheet, styles, merges);
  return `${XML_HEADER}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${renderTabColor(
    sheet.tabColor
  )}${renderFreeze(sheet.freeze)}${renderColumns(sheet.columns)}${data}${renderAutoFilter(
    sheet.autoFilter
  )}${renderMerges(merges)}</worksheet>`;
}

function renderWorkbook(sheets: readonly SheetModel[]): string {
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

function renderRootRels(hasCore: boolean): string {
  const core = hasCore
    ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
    : "";
  return `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>${core}</Relationships>`;
}

function renderContentTypes(sheetCount: number, hasCore: boolean): string {
  const sheets = Array.from(
    { length: sheetCount },
    (_, index) =>
      `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join("");
  const core = hasCore
    ? '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
    : "";
  return `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${core}</Types>`;
}

function renderCore(title: string | undefined, creator: string | undefined): string {
  const titleXml = title ? `<dc:title>${escapeXmlText(title)}</dc:title>` : "";
  const creatorXml = creator ? `<dc:creator>${escapeXmlText(creator)}</dc:creator>` : "";
  return `${XML_HEADER}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${titleXml}${creatorXml}</cp:coreProperties>`;
}

function assertSpan(value: number | undefined, label: string, max: number, sheet: SheetModel): void {
  if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > max)) {
    failXlsx("XLSX_INVALID_INPUT", `Expected ${label} to be a positive integer.`, {
      sheet: sheet.name,
      [label]: value
    });
  }
}

function validateCellModel(cell: CellModel, sheet: SheetModel): void {
  assertSpan(cell.colSpan, "colSpan", XLSX_LIMITS.maxColumns, sheet);
  assertSpan(cell.rowSpan, "rowSpan", XLSX_LIMITS.maxRows, sheet);
}

function validateRowModel(row: RowModel, sheet: SheetModel): void {
  if (row.cells.length > XLSX_LIMITS.maxColumns) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Sheet has too many columns.", { sheet: sheet.name });
  }
  if (row.height !== undefined && (!Number.isFinite(row.height) || row.height <= 0 || row.height > 409)) {
    failXlsx("XLSX_INVALID_INPUT", "Expected row heights between 0 and 409.", { sheet: sheet.name, height: row.height });
  }
  for (const cell of row.cells) {
    if (cell) validateCellModel(cell, sheet);
  }
}

type MergeRange = { startRow: number; startColumn: number; endRow: number; endColumn: number };

function assertRangeEmpty(sheet: SheetModel, range: MergeRange): void {
  for (let row = range.startRow; row < range.endRow; row += 1) {
    for (let column = range.startColumn; column < range.endColumn; column += 1) {
      if (row === range.startRow && column === range.startColumn) continue;
      if (sheet.rows[row]?.cells[column]) {
        failXlsx("XLSX_INVALID_INPUT", "Merged cells overlap another cell.", {
          sheet: sheet.name,
          row: row + 1,
          column: column + 1
        });
      }
    }
  }
}

function mergeRangeOf(cell: CellModel, row: number, column: number): MergeRange | undefined {
  const colSpan = cell.colSpan ?? 1;
  const rowSpan = cell.rowSpan ?? 1;
  if (colSpan === 1 && rowSpan === 1) return undefined;
  return { startRow: row, startColumn: column, endRow: row + rowSpan, endColumn: column + colSpan };
}

function assertMergeRange(sheet: SheetModel, range: MergeRange): void {
  const area = (range.endRow - range.startRow) * (range.endColumn - range.startColumn);
  if (range.endRow > XLSX_LIMITS.maxRows || range.endColumn > XLSX_LIMITS.maxColumns || area > XLSX_LIMITS.maxCells) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Merged range exceeds the worksheet limits.", { sheet: sheet.name });
  }
  assertRangeEmpty(sheet, range);
}

function assertMergeRanges(sheet: SheetModel): void {
  sheet.rows.forEach((row, rowIndex) => {
    row.cells.forEach((cell, columnIndex) => {
      if (!cell) return;
      const range = mergeRangeOf(cell, rowIndex, columnIndex);
      if (range) assertMergeRange(sheet, range);
    });
  });
}

function invalidFreeze(value: number): boolean {
  return !Number.isInteger(value) || value < 0;
}

function assertFreeze(freeze: FreezeModel, sheet: SheetModel): void {
  const rows = freeze.rows ?? 0;
  const columns = freeze.columns ?? 0;
  if (invalidFreeze(rows) || invalidFreeze(columns)) {
    failXlsx("XLSX_INVALID_INPUT", "Expected freeze rows and columns to be non-negative integers.", { sheet: sheet.name });
  }
  if (rows > XLSX_LIMITS.maxRows || columns > XLSX_LIMITS.maxColumns) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Freeze range exceeds the worksheet limits.", { sheet: sheet.name });
  }
}

function validateSheetModel(sheet: SheetModel, names: Set<string>): void {
  assertSheetName(sheet.name, names);
  names.add(sheet.name.toLowerCase());
  if (!Array.isArray(sheet.rows)) {
    failXlsx("XLSX_INVALID_INPUT", "Expected every sheet to expose a rows array.", { sheet: sheet.name });
  }
  if (sheet.rows.length > XLSX_LIMITS.maxRows) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Sheet has too many rows.", { sheet: sheet.name });
  }
  if ((sheet.columns?.length ?? 0) > XLSX_LIMITS.maxColumns) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Sheet has too many columns.", { sheet: sheet.name });
  }
  if (sheet.freeze) assertFreeze(sheet.freeze, sheet);
  for (const row of sheet.rows) validateRowModel(row, sheet);
  assertMergeRanges(sheet);
}

function validateModel(model: WorkbookModel): void {
  if (!model || !Array.isArray(model.sheets) || model.sheets.length === 0) {
    failXlsx("XLSX_INVALID_INPUT", "Expected a workbook with at least one sheet.");
  }
  if (model.sheets.length > XLSX_LIMITS.maxSheets) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Workbook has too many sheets.", { sheets: model.sheets.length });
  }
  const names = new Set<string>();
  for (const sheet of model.sheets) validateSheetModel(sheet, names);
}

function assertSimpleDimensions(sheet: XlsxSheetInput): void {
  if (sheet.rows.length + (hasHeaders(sheet) ? 1 : 0) > XLSX_LIMITS.maxRows) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Sheet has too many rows.", { sheet: sheet.name });
  }
  if ((sheet.columns?.length ?? 0) > XLSX_LIMITS.maxColumns) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Sheet has too many columns.", { sheet: sheet.name });
  }
  for (const row of sheet.rows) {
    if (row.length > XLSX_LIMITS.maxColumns) {
      failXlsx("XLSX_LIMIT_EXCEEDED", "Sheet has too many columns.", { sheet: sheet.name });
    }
  }
}

function validateSimpleSheet(sheet: XlsxSheetInput, names: Set<string>): void {
  assertSheetName(sheet.name, names);
  names.add(sheet.name.toLowerCase());
  if (!Array.isArray(sheet.rows)) {
    failXlsx("XLSX_INVALID_INPUT", "Expected every sheet to expose a rows array.", { sheet: sheet.name });
  }
  assertSimpleDimensions(sheet);
}

function validateWorkbook(input: XlsxWorkbookInput): void {
  if (!input || !Array.isArray(input.sheets) || input.sheets.length === 0) {
    failXlsx("XLSX_INVALID_INPUT", "Expected a workbook with at least one sheet.");
  }
  if (input.sheets.length > XLSX_LIMITS.maxSheets) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Workbook has too many sheets.", { sheets: input.sheets.length });
  }
  const names = new Set<string>();
  for (const sheet of input.sheets) validateSimpleSheet(sheet, names);
}

function toModel(input: XlsxWorkbookInput): WorkbookModel {
  validateWorkbook(input);
  return {
    sheets: input.sheets.map((sheet) => {
      const columns = (sheet.columns ?? []).map((column) => ({ width: column.width }));
      const rows: RowModel[] = [];
      if (hasHeaders(sheet)) {
        rows.push({
          cells: (sheet.columns ?? []).map((column) => ({ value: column.header ?? "", style: { bold: true } }))
        });
      }
      for (const row of sheet.rows) rows.push({ cells: row.map((value) => ({ value })) });
      return { name: sheet.name, columns, rows };
    })
  };
}

function buildEntries(model: WorkbookModel): ZipEntry[] {
  const styles = new StyleRegistry();
  const hasCore = Boolean(model.title || model.creator);
  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: new TextEncoder().encode(renderContentTypes(model.sheets.length, hasCore)) },
    { name: "_rels/.rels", data: new TextEncoder().encode(renderRootRels(hasCore)) },
    { name: "xl/workbook.xml", data: new TextEncoder().encode(renderWorkbook(model.sheets)) },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: new TextEncoder().encode(renderWorkbookRels(model.sheets.length))
    }
  ];

  model.sheets.forEach((sheet, index) => {
    entries.push({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: new TextEncoder().encode(renderSheet(sheet, styles))
    });
  });
  entries.push({ name: "xl/styles.xml", data: new TextEncoder().encode(styles.toXml()) });
  if (hasCore) {
    entries.push({
      name: "docProps/core.xml",
      data: new TextEncoder().encode(renderCore(model.title, model.creator))
    });
  }
  return entries;
}

/** Serialises a workbook model into XLSX bytes with stored ZIP entries. */
export function writeWorkbook(model: WorkbookModel): Uint8Array {
  validateModel(model);
  return writeZip(buildEntries(model));
}

/** Serialises a workbook model into XLSX bytes with DEFLATE-compressed entries. */
export async function writeWorkbookCompressed(model: WorkbookModel): Promise<Uint8Array> {
  validateModel(model);
  return writeZipDeflated(buildEntries(model));
}

/** Serialises the data-first workbook input into XLSX bytes with stored entries. */
export function writeXlsx(input: XlsxWorkbookInput): Uint8Array {
  return writeWorkbook(toModel(input));
}

/** Serialises the data-first workbook input into XLSX bytes with DEFLATE-compressed entries. */
export async function writeXlsxCompressed(input: XlsxWorkbookInput): Promise<Uint8Array> {
  return writeWorkbookCompressed(toModel(input));
}
