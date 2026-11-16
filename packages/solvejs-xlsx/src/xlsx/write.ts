import { failXlsx } from "../errors.js";
import {
  XLSX_LIMITS,
  type XlsxCell,
  type XlsxCellValue,
  type XlsxSheetInput,
  type XlsxWorkbookInput,
  assertSheetName,
  cellReference,
  excelSerial,
  isCellObject,
  sanitizeXmlText
} from "../shared.js";
import { normalizeColor, type XlsxCellStyle } from "../style.js";
import { escapeXmlAttribute, escapeXmlText } from "../xml/escape.js";
import { writeZip, writeZipDeflated, type ZipEntry } from "../zip/write.js";
import type { CellModel, ColumnModel, FreezeModel, ImageModel, RowModel, SheetModel, WorkbookModel } from "./model.js";
import { imageModel, pixelsToEmu, utf8 } from "./media.js";
import { StyleRegistry } from "./styles.js";
import type { XlsxPageSetup } from "../shared.js";

const MAX_COLUMN_WIDTH = 255;
const DEFAULT_COLUMN_WIDTH = 12;
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

type LinkRef = { reference: string; href: string };

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

function renderCellValue(value: Exclude<XlsxCellValue, null>, reference: string, style: string): string {
  if (value instanceof Date) return renderDateCell(value, reference, style);
  if (typeof value === "number") return renderNumberCell(value, reference, style);
  if (typeof value === "boolean") return `<c r="${reference}"${style} t="b"><v>${value ? 1 : 0}</v></c>`;
  return renderStringCell(value, reference, style);
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    if ((character.codePointAt(0) ?? 0) < 0x20) return true;
  }
  return false;
}

function formulaText(formula: string): string {
  const normalized = formula.startsWith("=") ? formula.slice(1) : formula;
  const text = normalized.trim();
  if (text.length === 0) failXlsx("XLSX_INVALID_INPUT", "Formula cannot be empty.");
  if (text.length > 8192) failXlsx("XLSX_LIMIT_EXCEEDED", "Formula is too long.", { length: text.length });
  if (hasControlCharacters(text)) {
    failXlsx("XLSX_INVALID_INPUT", "Formula contains control characters.");
  }
  return text;
}

function cachedFormulaValue(value: XlsxCellValue): { type: string; value: string } | undefined {
  if (value === null) return undefined;
  if (value instanceof Date) return { type: "", value: String(excelSerial(value)) };
  if (typeof value === "boolean") return { type: ' t="b"', value: value ? "1" : "0" };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) failXlsx("XLSX_INVALID_INPUT", "Expected a finite formula result.");
    return { type: "", value: String(value) };
  }
  return { type: ' t="str"', value: sanitizeXmlText(value) };
}

function renderFormulaCell(cell: CellModel, reference: string, style: string): string {
  const formula = escapeXmlText(formulaText(cell.formula ?? ""));
  const cached = cachedFormulaValue(cell.value);
  const value = cached ? `<v>${escapeXmlText(cached.value)}</v>` : "";
  return `<c r="${reference}"${cached?.type ?? ""}${style}><f>${formula}</f>${value}</c>`;
}

function renderCell(cell: CellModel, reference: string, styleId: number): string {
  const style = styleId === 0 ? "" : ` s="${styleId}"`;
  if (cell.formula !== undefined) return renderFormulaCell(cell, reference, style);
  if (cell.value === null || cell.value === undefined) return styleId === 0 ? "" : `<c r="${reference}"${style}/>`;
  return renderCellValue(cell.value, reference, style);
}

function mergedStyle(rowStyle: XlsxCellStyle | undefined, cellStyle: XlsxCellStyle | undefined): XlsxCellStyle {
  if (!rowStyle) return cellStyle ?? {};
  if (!cellStyle) return rowStyle;
  return { ...rowStyle, ...cellStyle };
}

type RowRender = {
  row: RowModel;
  rowNumber: number;
  styles: StyleRegistry;
  merges: string[];
  links: LinkRef[];
};

function renderRow(input: RowRender): string {
  const { row, rowNumber, styles, merges, links } = input;
  const rendered: string[] = [];
  const rowStyleId = row.style ? styles.register(row.style, false) : 0;
  const rowStyle = rowStyleId === 0 ? "" : ` s="${rowStyleId}" customFormat="1"`;

  row.cells.forEach((cell, index) => {
    if (!cell) return;
    const column = index + 1;
    const styleId = styles.register(mergedStyle(row.style, cell.style), cell.value instanceof Date);
    const reference = cellReference(rowNumber, column);
    rendered.push(renderCell(cell, reference, styleId));
    if (cell.href) links.push({ reference, href: cell.href });

    const colSpan = cell.colSpan ?? 1;
    const rowSpan = cell.rowSpan ?? 1;
    if (colSpan > 1 || rowSpan > 1) {
      merges.push(`${reference}:${cellReference(rowNumber + rowSpan - 1, column + colSpan - 1)}`);
    }
  });

  const height = row.height !== undefined ? ` ht="${row.height}" customHeight="1"` : "";
  return `<row r="${rowNumber}"${height}${rowStyle}>${rendered.join("")}</row>`;
}

function renderColumns(columns: readonly ColumnModel[] | undefined, styles: StyleRegistry): string {
  if (!columns || columns.length === 0) return "";
  const rendered = columns.map((column, index) => {
    const width = column.width ?? DEFAULT_COLUMN_WIDTH;
    if (!Number.isFinite(width) || width <= 0 || width > MAX_COLUMN_WIDTH) {
      failXlsx("XLSX_INVALID_INPUT", "Expected column widths between 0 and 255.", { column: index + 1, width });
    }
    const styleId = column.style ? styles.register(column.style, false) : 0;
    const style = styleId === 0 ? "" : ` style="${styleId}"`;
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"${style}/>`;
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

function renderSheetProperties(tabColor: string | undefined, setup: XlsxPageSetup | undefined): string {
  const normalized = normalizeColor(tabColor);
  const fit = setup && (setup.fitToWidth !== undefined || setup.fitToHeight !== undefined);
  if (!normalized && !fit) return "";
  const color = normalized ? `<tabColor rgb="${normalized}"/>` : "";
  const page = fit ? `<pageSetUpPr fitToPage="1"/>` : "";
  return `<sheetPr>${color}${page}</sheetPr>`;
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

function renderSheetData(
  sheet: SheetModel,
  styles: StyleRegistry,
  merges: string[],
  links: LinkRef[]
): string {
  const rows = sheet.rows
    .map((row, index) => renderRow({ row, rowNumber: index + 1, styles, merges, links }))
    .join("");
  return `<sheetData>${rows}</sheetData>`;
}

function renderMerges(merges: readonly string[]): string {
  if (merges.length === 0) return "";
  return `<mergeCells count="${merges.length}">${merges
    .map((reference) => `<mergeCell ref="${reference}"/>`)
    .join("")}</mergeCells>`;
}

function externalLinkCount(links: readonly LinkRef[]): number {
  return links.filter((link) => !link.href.startsWith("#")).length;
}

function renderHyperlinks(links: readonly LinkRef[]): string {
  if (links.length === 0) return "";
  let relationship = 0;
  const entries = links.map((link) => {
    if (link.href.startsWith("#")) {
      return `<hyperlink ref="${link.reference}" location="${escapeXmlAttribute(link.href.slice(1))}"/>`;
    }
    relationship += 1;
    return `<hyperlink ref="${link.reference}" r:id="rId${relationship}"/>`;
  });
  return `<hyperlinks>${entries.join("")}</hyperlinks>`;
}

function renderDrawing(images: readonly ImageModel[], mediaStart: number): { xml: string; rels: string } {
  const anchors = images.map((image, index) => {
    const width = pixelsToEmu(image.width);
    const height = pixelsToEmu(image.height);
    const description = image.alt ? ` descr="${escapeXmlAttribute(image.alt)}"` : "";
    return `<xdr:oneCellAnchor><xdr:from><xdr:col>${image.anchorColumn}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${image.anchorRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${width}" cy="${height}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${index + 1}" name="Picture ${index + 1}"${description}/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${index + 1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
  });
  const relationships = images
    .map(
      (image, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${
          mediaStart + index
        }.${image.format === "png" ? "png" : "jpeg"}"/>`
    )
    .join("");
  return {
    xml: `${XML_HEADER}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors.join("")}</xdr:wsDr>`,
    rels: `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`
  };
}

function renderSheet(sheet: SheetModel, styles: StyleRegistry): { xml: string; links: LinkRef[]; hasImages: boolean } {
  const merges: string[] = [];
  const links: LinkRef[] = [];
  const data = renderSheetData(sheet, styles, merges, links);
  const hasImages = (sheet.images?.length ?? 0) > 0;
  const drawing = hasImages ? `<drawing r:id="rId${externalLinkCount(links) + 1}"/>` : "";
  const xml = `${XML_HEADER}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${renderSheetProperties(
    sheet.tabColor,
    sheet.pageSetup
  )}${renderFreeze(sheet.freeze)}${renderColumns(sheet.columns, styles)}${data}${renderAutoFilter(
    sheet.autoFilter
  )}${renderMerges(merges)}${renderHyperlinks(links)}${renderPageSetup(sheet.pageSetup)}${drawing}</worksheet>`;
  return { xml, links, hasImages };
}

function renderSheetRels(links: readonly LinkRef[], drawingNumber: number): string {
  const external = links.filter((link) => !link.href.startsWith("#"));
  const relationships = external
    .map(
      (link, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeXmlAttribute(
          link.href
        )}" TargetMode="External"/>`
    )
    .join("");
  const drawing = drawingNumber
    ? `<Relationship Id="rId${external.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawingNumber}.xml"/>`
    : "";
  return `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}${drawing}</Relationships>`;
}

function renderWorkbook(sheets: readonly SheetModel[], definedNames?: Record<string, string>): string {
  const entries = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXmlAttribute(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
    )
    .join("");
  const names =
    definedNames && Object.keys(definedNames).length > 0
      ? `<definedNames>${Object.entries(definedNames)
          .map(
            ([name, reference]) =>
              `<definedName name="${escapeXmlAttribute(name)}">${escapeXmlText(reference)}</definedName>`
          )
          .join("")}</definedNames>`
      : "";
  return `${XML_HEADER}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${entries}</sheets>${names}</workbook>`;
}

function renderPageSetup(setup: XlsxPageSetup | undefined): string {
  if (!setup) return "";
  const orientation = setup.orientation === "landscape" ? ' orientation="landscape"' : "";
  const paper = setup.paperSize ? ` paperSize="${setup.paperSize}"` : "";
  const fit =
    setup.fitToWidth || setup.fitToHeight
      ? ` fitToWidth="${setup.fitToWidth ?? 0}" fitToHeight="${setup.fitToHeight ?? 0}"`
      : "";
  return `<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup${orientation}${paper}${fit}/>`;
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

function renderContentTypes(
  sheetCount: number,
  hasCore: boolean,
  imageFormats: ReadonlySet<"png" | "jpeg">,
  drawingCount: number
): string {
  const sheets = Array.from(
    { length: sheetCount },
    (_, index) =>
      `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join("");
  const drawings = Array.from(
    { length: drawingCount },
    (_, index) =>
      `<Override PartName="/xl/drawings/drawing${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`
  ).join("");
  const images = [
    imageFormats.has("png") ? '<Default Extension="png" ContentType="image/png"/>' : "",
    imageFormats.has("jpeg") ? '<Default Extension="jpeg" ContentType="image/jpeg"/>' : ""
  ].join("");
  const core = hasCore
    ? '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
    : "";
  return `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${images}<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${drawings}${core}</Types>`;
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
  if (cell.formula !== undefined) formulaText(cell.formula);
  if (cell.href !== undefined) {
    if (
      typeof cell.href !== "string" ||
      cell.href.length === 0 ||
      cell.href.length > 2083 ||
      !/^(https?:\/\/|mailto:|tel:|#)/i.test(cell.href) ||
      hasControlCharacters(cell.href)
    ) {
      failXlsx("XLSX_INVALID_INPUT", "Expected a safe http(s), mailto, tel or internal hyperlink.", {
        sheet: sheet.name,
        href: cell.href
      });
    }
  }
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
    const cells = sheet.rows[row]?.cells;
    if (!cells) continue;
    const end = Math.min(range.endColumn, cells.length);
    for (let column = range.startColumn; column < end; column += 1) {
      if (row === range.startRow && column === range.startColumn) continue;
      if (cells[column]) {
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

function assertNoMergeIntersections(sheet: SheetModel, ranges: readonly MergeRange[]): void {
  const sorted = [...ranges].sort((a, b) => a.startRow - b.startRow || a.startColumn - b.startColumn);
  let active: MergeRange[] = [];
  for (const range of sorted) {
    active = active.filter((candidate) => candidate.endRow > range.startRow);
    for (const candidate of active) {
      if (range.startColumn < candidate.endColumn && candidate.startColumn < range.endColumn) {
        failXlsx("XLSX_INVALID_INPUT", "Merged ranges cannot intersect.", { sheet: sheet.name });
      }
    }
    active.push(range);
  }
}

function assertMergeRanges(sheet: SheetModel): void {
  const ranges: MergeRange[] = [];
  let inspected = 0;
  sheet.rows.forEach((row, rowIndex) => {
    row.cells.forEach((cell, columnIndex) => {
      if (!cell) return;
      const range = mergeRangeOf(cell, rowIndex, columnIndex);
      if (!range) return;
      if (ranges.length >= XLSX_LIMITS.maxMerges) {
        failXlsx("XLSX_LIMIT_EXCEEDED", "Sheet has too many merged ranges.", { sheet: sheet.name });
      }
      const area = (range.endRow - range.startRow) * (range.endColumn - range.startColumn);
      inspected += area;
      if (inspected > XLSX_LIMITS.maxCells * 2) {
        failXlsx("XLSX_LIMIT_EXCEEDED", "Merged ranges require too much validation work.", { sheet: sheet.name });
      }
      ranges.push(range);
      assertMergeRange(sheet, range);
    });
  });
  assertNoMergeIntersections(sheet, ranges);
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

// eslint-disable-next-line complexity -- each page setup field has its own range
function validatePageSetup(setup: XlsxPageSetup | undefined, sheet: SheetModel): void {
  if (!setup) return;
  if (setup.orientation !== undefined && setup.orientation !== "portrait" && setup.orientation !== "landscape") {
    failXlsx("XLSX_INVALID_INPUT", "Expected page orientation portrait or landscape.", { sheet: sheet.name });
  }
  if (
    setup.paperSize !== undefined &&
    (!Number.isInteger(setup.paperSize) || setup.paperSize < 1 || setup.paperSize > 118)
  ) {
    failXlsx("XLSX_INVALID_INPUT", "Expected a paper size between 1 and 118.", { sheet: sheet.name });
  }
  for (const key of ["fitToWidth", "fitToHeight"] as const) {
    const value = setup[key];
    if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > 32_767)) {
      failXlsx("XLSX_INVALID_INPUT", "Expected fit-to-page values between 0 and 32767.", {
        sheet: sheet.name,
        field: key
      });
    }
  }
}

const DEFINED_NAME = /^[A-Za-z_\\][A-Za-z0-9._\\]*$/;
const CELL_LIKE_NAME = /^[A-Za-z]{1,3}[0-9]+$/;

// eslint-disable-next-line complexity -- name and reference rules are checked together
function validateDefinedNames(names: Record<string, string> | undefined): void {
  if (!names) return;
  const entries = Object.entries(names);
  if (entries.length > XLSX_LIMITS.maxDefinedNames) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Workbook has too many defined names.", { count: entries.length });
  }
  for (const [name, reference] of entries) {
    if (name.length > 255 || !DEFINED_NAME.test(name) || CELL_LIKE_NAME.test(name)) {
      failXlsx("XLSX_INVALID_INPUT", "Defined names must be valid identifiers that are not cell references.", {
        name
      });
    }
    if (
      typeof reference !== "string" ||
      reference.length === 0 ||
      reference.length > 8192 ||
      hasControlCharacters(reference)
    ) {
      failXlsx("XLSX_INVALID_INPUT", "Defined name references must be non-empty formula text.", { name });
    }
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
  validatePageSetup(sheet.pageSetup, sheet);
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
  validateDefinedNames(model.definedNames);
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
  validateDefinedNames(input.definedNames);
}

function toCell(value: XlsxCell): CellModel {
  if (isCellObject(value)) {
    return { value: value.value ?? null, formula: value.formula, href: value.href };
  }
  return { value: value ?? null };
}

function computedFilterRange(sheet: XlsxSheetInput): string | undefined {
  const rows = sheet.rows.length + (hasHeaders(sheet) ? 1 : 0);
  const columns = sheet.rows.reduce((max, row) => Math.max(max, row.length), sheet.columns?.length ?? 0);
  return rows > 0 && columns > 0 ? `A1:${cellReference(rows, columns)}` : undefined;
}

function filterRange(sheet: XlsxSheetInput): string | undefined {
  const filter = sheet.autoFilter;
  if (filter === false || filter === undefined) return undefined;
  return typeof filter === "string" ? filter : computedFilterRange(sheet);
}

function toModel(input: XlsxWorkbookInput): WorkbookModel {
  validateWorkbook(input);
  return {
    sheets: input.sheets.map((sheet) => {
      const columns = (sheet.columns ?? []).map((column) => ({ width: column.width, style: column.style }));
      const rows: RowModel[] = [];
      if (hasHeaders(sheet)) {
        rows.push({
          cells: (sheet.columns ?? []).map((column) => ({ value: column.header ?? "", style: { bold: true } }))
        });
      }
      for (const row of sheet.rows) rows.push({ cells: row.map(toCell) });
      return {
        name: sheet.name,
        columns,
        rows,
        freeze: sheet.freeze,
        autoFilter: filterRange(sheet),
        tabColor: sheet.tabColor,
        pageSetup: sheet.pageSetup,
        images: sheet.images ? sheet.images.map(imageModel) : undefined
      };
    }),
    title: input.title,
    creator: input.creator,
    definedNames: input.definedNames
  };
}

function mediaEntries(sheet: SheetModel, drawingNumber: number, mediaStart: number): ZipEntry[] {
  const images = sheet.images ?? [];
  const entries: ZipEntry[] = [];
  images.forEach((image, index) => {
    entries.push({
      name: `xl/media/image${mediaStart + index}.${image.format === "png" ? "png" : "jpeg"}`,
      data: image.data
    });
  });
  const drawing = renderDrawing(images, mediaStart);
  entries.push({ name: `xl/drawings/drawing${drawingNumber}.xml`, data: utf8(drawing.xml) });
  entries.push({
    name: `xl/drawings/_rels/drawing${drawingNumber}.xml.rels`,
    data: utf8(drawing.rels)
  });
  return entries;
}

function buildSheetEntries(model: WorkbookModel, styles: StyleRegistry): {
  entries: ZipEntry[];
  formats: Set<"png" | "jpeg">;
  drawingCount: number;
} {
  const entries: ZipEntry[] = [];
  const formats = new Set<"png" | "jpeg">();
  let mediaIndex = 0;
  let drawingIndex = 0;
  model.sheets.forEach((sheet, index) => {
    const rendered = renderSheet(sheet, styles);
    entries.push({ name: `xl/worksheets/sheet${index + 1}.xml`, data: utf8(rendered.xml) });
    const images = sheet.images ?? [];
    for (const image of images) formats.add(image.format);
    const drawingNumber = images.length > 0 ? ++drawingIndex : 0;
    if (drawingNumber > 0) {
      entries.push(...mediaEntries(sheet, drawingNumber, mediaIndex + 1));
      mediaIndex += images.length;
    }
    if (rendered.links.some((link) => !link.href.startsWith("#")) || drawingNumber > 0) {
      entries.push({
        name: `xl/worksheets/_rels/sheet${index + 1}.xml.rels`,
        data: utf8(renderSheetRels(rendered.links, drawingNumber))
      });
    }
  });
  return { entries, formats, drawingCount: drawingIndex };
}

function baseEntries(model: WorkbookModel, formats: ReadonlySet<"png" | "jpeg">, drawingCount: number): ZipEntry[] {
  const hasCore = Boolean(model.title || model.creator);
  return [
    {
      name: "[Content_Types].xml",
      data: utf8(renderContentTypes(model.sheets.length, hasCore, formats, drawingCount))
    },
    { name: "_rels/.rels", data: utf8(renderRootRels(hasCore)) },
    { name: "xl/workbook.xml", data: utf8(renderWorkbook(model.sheets, model.definedNames)) },
    { name: "xl/_rels/workbook.xml.rels", data: utf8(renderWorkbookRels(model.sheets.length)) }
  ];
}

function buildEntries(model: WorkbookModel): ZipEntry[] {
  const styles = new StyleRegistry();
  const sheets = buildSheetEntries(model, styles);
  const entries = baseEntries(model, sheets.formats, sheets.drawingCount);
  entries.push(...sheets.entries);
  entries.push({ name: "xl/styles.xml", data: utf8(styles.toXml()) });
  if (model.title || model.creator) {
    entries.push({ name: "docProps/core.xml", data: utf8(renderCore(model.title, model.creator)) });
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
