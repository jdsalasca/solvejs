import { failXlsx } from "../errors.js";
import {
  XLSX_LIMITS,
  type XlsxCellValue,
  type XlsxSheetData,
  type XlsxWorkbookData,
  dateFromExcelSerial
} from "../shared.js";
import { childrenNamed, firstChild, parseXml, textContent, type XmlNode } from "../xml/parse.js";
import { readZip } from "../zip/read.js";

type WorkbookSheet = { name: string; relationshipId: string };
type CellContext = { shared: readonly string[]; dateStyles: ReadonlySet<number> };
type ParsedCell = { column: number; value: XlsxCellValue };

const BUILTIN_DATE_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function requiredFile(files: ReadonlyMap<string, Uint8Array>, name: string): Uint8Array {
  const data = files.get(name);
  if (!data) failXlsx("XLSX_INVALID_ZIP", `XLSX is missing the required part ${name}.`, { name });
  return data;
}

function resolveTarget(target: string): string {
  const path = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (parts.length === 0) failXlsx("XLSX_INVALID_ZIP", "XLSX relationship escapes the package root.");
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

function parseWorkbook(xml: string): WorkbookSheet[] {
  const root = parseXml(xml);
  const workbook = firstChild(root, "workbook") ?? root;
  const sheetsNode = firstChild(workbook, "sheets");
  if (!sheetsNode) failXlsx("XLSX_INVALID_XML", "Workbook is missing its sheets collection.");

  const sheets = childrenNamed(sheetsNode, "sheet").map((node) => {
    const name = node.attributes.name;
    const relationshipId = node.attributes["r:id"] ?? node.attributes.id;
    if (!name || !relationshipId) failXlsx("XLSX_INVALID_XML", "Workbook sheet is missing its name or relationship.");
    return { name, relationshipId };
  });

  if (sheets.length === 0) failXlsx("XLSX_INVALID_XML", "Workbook has no sheets.");
  if (sheets.length > XLSX_LIMITS.maxSheets) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Workbook has too many sheets.", { sheets: sheets.length });
  }
  return sheets;
}

function parseRels(xml: string): Map<string, string> {
  const root = parseXml(xml);
  const rels = firstChild(root, "Relationships") ?? root;
  const map = new Map<string, string>();
  for (const relation of childrenNamed(rels, "Relationship")) {
    const id = relation.attributes.Id;
    const target = relation.attributes.Target;
    if (id && target) map.set(id, target);
  }
  return map;
}

function sharedStringText(node: XmlNode): string {
  const direct = childrenNamed(node, "t").map(textContent).join("");
  const runs = childrenNamed(node, "r")
    .map((run) => childrenNamed(run, "t").map(textContent).join(""))
    .join("");
  return direct + runs;
}

function parseSharedStrings(xml: string): string[] {
  const root = parseXml(xml);
  const sst = firstChild(root, "sst") ?? root;
  return childrenNamed(sst, "si").map(sharedStringText);
}

function isDateFormat(formatId: number, custom: ReadonlyMap<number, string>): boolean {
  if (BUILTIN_DATE_IDS.has(formatId)) return true;
  const code = custom.get(formatId);
  return code ? /[ymdhs]/i.test(code.replace(/"[^"]*"/g, "")) : false;
}

function parseStyles(xml: string): Set<number> {
  const root = parseXml(xml);
  const styleSheet = firstChild(root, "styleSheet") ?? root;
  const custom = new Map<number, string>();
  const numFmts = firstChild(styleSheet, "numFmts");

  if (numFmts) {
    for (const format of childrenNamed(numFmts, "numFmt")) {
      const id = Number(format.attributes.numFmtId);
      const code = format.attributes.formatCode;
      if (Number.isInteger(id) && code) custom.set(id, code);
    }
  }

  const dateStyles = new Set<number>();
  const cellXfs = firstChild(styleSheet, "cellXfs");
  if (cellXfs) {
    childrenNamed(cellXfs, "xf").forEach((xf, index) => {
      if (isDateFormat(Number(xf.attributes.numFmtId ?? "0"), custom)) dateStyles.add(index);
    });
  }
  return dateStyles;
}

function parseCellRef(reference: string): { row: number; column: number } {
  const match = /^([A-Z]+)(\d+)$/.exec(reference);
  if (!match) failXlsx("XLSX_INVALID_XML", "Cell reference is invalid.", { reference });

  let column = 0;
  for (const character of match[1]) {
    column = column * 26 + character.charCodeAt(0) - 64;
  }
  const row = Number(match[2]);
  if (column <= 0 || row <= 0) failXlsx("XLSX_INVALID_XML", "Cell reference is out of range.", { reference });
  if (column > XLSX_LIMITS.maxColumns || row > XLSX_LIMITS.maxRows) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Cell reference exceeds the configured limits.", { reference });
  }
  return { row, column };
}

function rawText(node: XmlNode): string {
  const value = firstChild(node, "v");
  return value ? textContent(value) : "";
}

function inlineText(node: XmlNode): string {
  const inline = firstChild(node, "is");
  return inline ? textContent(inline) : "";
}

function numericValue(text: string, node: XmlNode, context: CellContext): XlsxCellValue {
  if (text.length === 0) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) failXlsx("XLSX_INVALID_XML", "Numeric cell is not finite.", { text });
  const style = Number(node.attributes.s ?? "0");
  return context.dateStyles.has(style) ? dateFromExcelSerial(value) : value;
}

function sharedValue(text: string, shared: readonly string[]): string {
  const index = Number(text);
  if (!Number.isInteger(index) || index < 0 || index >= shared.length) {
    failXlsx("XLSX_INVALID_XML", "Shared string index is out of range.", { index: text });
  }
  return shared[index];
}

function dateValue(text: string): Date {
  const date = new Date(text);
  if (!Number.isFinite(date.getTime())) failXlsx("XLSX_INVALID_XML", "Date cell is invalid.", { text });
  return date;
}

function cellValue(type: string, node: XmlNode, context: CellContext): XlsxCellValue {
  const text = rawText(node);

  if (type === "inlineStr") return inlineText(node);
  if (type === "s") return sharedValue(text, context.shared);
  if (type === "b") return text === "1";
  if (type === "str" || type === "e") return text;
  if (type === "d") return dateValue(text);
  return numericValue(text, node, context);
}

function parseCell(node: XmlNode, context: CellContext): ParsedCell | null {
  const reference = node.attributes.r;
  if (!reference) return null;
  const { column } = parseCellRef(reference);
  return { column, value: cellValue(node.attributes.t ?? "n", node, context) };
}

function parseRow(node: XmlNode, context: CellContext): { row: number; cells: XlsxCellValue[] } {
  const rowNumber = Number(node.attributes.r);
  if (!Number.isInteger(rowNumber) || rowNumber <= 0 || rowNumber > XLSX_LIMITS.maxRows) {
    failXlsx("XLSX_INVALID_XML", "Row number is invalid.", { row: node.attributes.r });
  }

  const cells: XlsxCellValue[] = [];
  for (const child of childrenNamed(node, "c")) {
    const parsed = parseCell(child, context);
    if (!parsed) continue;
    while (cells.length < parsed.column) cells.push(null);
    cells[parsed.column - 1] = parsed.value;
  }
  return { row: rowNumber, cells };
}

function parseSheet(xml: string, shared: readonly string[], dateStyles: ReadonlySet<number>): XlsxCellValue[][] {
  const root = parseXml(xml);
  const worksheet = firstChild(root, "worksheet") ?? root;
  const sheetData = firstChild(worksheet, "sheetData");
  if (!sheetData) return [];

  const rows: XlsxCellValue[][] = [];
  for (const rowNode of childrenNamed(sheetData, "row")) {
    const parsed = parseRow(rowNode, { shared, dateStyles });
    while (rows.length < parsed.row) rows.push([]);
    rows[parsed.row - 1] = parsed.cells;
  }
  return rows;
}

/** Reads an XLSX file into a plain workbook structure. Dates are returned as UTC `Date` values. */
export async function readXlsx(bytes: Uint8Array): Promise<XlsxWorkbookData> {
  const files = await readZip(bytes);
  const sheets = parseWorkbook(decode(requiredFile(files, "xl/workbook.xml")));
  const relationships = parseRels(decode(requiredFile(files, "xl/_rels/workbook.xml.rels")));
  const shared = files.has("xl/sharedStrings.xml")
    ? parseSharedStrings(decode(requiredFile(files, "xl/sharedStrings.xml")))
    : [];
  const dateStyles = files.has("xl/styles.xml") ? parseStyles(decode(requiredFile(files, "xl/styles.xml"))) : new Set<number>();

  const data: XlsxSheetData[] = sheets.map((sheet) => {
    const target = relationships.get(sheet.relationshipId);
    if (!target) {
      failXlsx("XLSX_INVALID_XML", "Worksheet relationship is missing.", { sheet: sheet.name, id: sheet.relationshipId });
    }
    const xml = decode(requiredFile(files, resolveTarget(target)));
    return { name: sheet.name, rows: parseSheet(xml, shared, dateStyles) };
  });

  return { sheets: data };
}
