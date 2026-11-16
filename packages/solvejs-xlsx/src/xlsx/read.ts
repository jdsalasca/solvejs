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
type Relationship = { target: string; type: string };
type CellContext = { shared: readonly string[]; dateStyles: ReadonlySet<number>; date1904: boolean };
type ParsedCell = { row: number; column: number; value: XlsxCellValue };

const BUILTIN_DATE_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function requiredFile(files: ReadonlyMap<string, Uint8Array>, name: string): Uint8Array {
  const data = files.get(name);
  if (!data) failXlsx("XLSX_INVALID_ZIP", `XLSX is missing the required part ${name}.`, { name });
  return data;
}

function resolveTarget(target: string, baseDir: string): string {
  const path = target.startsWith("/") ? target.slice(1) : baseDir ? `${baseDir}/${target}` : target;
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

function dirName(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

function baseName(path: string): string {
  return path.split("/").pop() ?? path;
}

function joinPath(base: string, name: string): string {
  return base ? `${base}/${name}` : name;
}

function findRelationship(relationships: ReadonlyMap<string, Relationship>, suffix: string): Relationship | undefined {
  return [...relationships.values()].find((relationship) => relationship.type.endsWith(`/${suffix}`));
}

function parseWorkbook(xml: string): { sheets: WorkbookSheet[]; date1904: boolean } {
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
  const workbookPr = firstChild(workbook, "workbookPr");
  const date1904 = workbookPr?.attributes.date1904 === "1" || workbookPr?.attributes.date1904 === "true";
  return { sheets, date1904 };
}

function relationshipOf(node: XmlNode): { id: string; relationship: Relationship } {
  const id = node.attributes.Id;
  const target = node.attributes.Target;
  const type = node.attributes.Type;
  const mode = node.attributes.TargetMode ?? "Internal";
  if (!id || !target || !type) {
    failXlsx("XLSX_INVALID_XML", "Relationship is missing Id, Target or Type.");
  }
  if (mode === "External") failXlsx("XLSX_UNSUPPORTED", "External relationships are not supported.", { id });
  return { id, relationship: { target, type } };
}

function parseRels(xml: string): Map<string, Relationship> {
  const root = parseXml(xml);
  const rels = firstChild(root, "Relationships") ?? root;
  const map = new Map<string, Relationship>();

  for (const relation of childrenNamed(rels, "Relationship")) {
    const { id, relationship } = relationshipOf(relation);
    if (map.has(id)) failXlsx("XLSX_INVALID_XML", "Relationship Id is duplicated.", { id });
    map.set(id, relationship);
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
  if (!code) return false;
  const cleaned = code.replace(/"[^"]*"/g, "").replace(/\\./g, "").replace(/\[[^\]]*\]/g, "");
  return /[ymdhs]/i.test(cleaned);
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

function numericValue(text: string, node: XmlNode, context: CellContext): XlsxCellValue {
  if (text.length === 0) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) failXlsx("XLSX_INVALID_XML", "Numeric cell is not finite.", { text });
  const style = Number(node.attributes.s ?? "0");
  return context.dateStyles.has(style) ? dateFromExcelSerial(value, context.date1904) : value;
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

function parseCell(node: XmlNode, context: CellContext, rowNumber: number): ParsedCell | null {
  const reference = node.attributes.r;
  if (!reference) return null;
  const { row, column } = parseCellRef(reference);
  if (row !== rowNumber) {
    failXlsx("XLSX_INVALID_XML", "Cell reference disagrees with its row.", { reference, row: rowNumber });
  }
  return { row, column, value: cellValue(node.attributes.t ?? "n", node, context) };
}

function parseRow(node: XmlNode, context: CellContext): { row: number; cells: XlsxCellValue[] } {
  const rowNumber = Number(node.attributes.r);
  if (!Number.isInteger(rowNumber) || rowNumber <= 0 || rowNumber > XLSX_LIMITS.maxRows) {
    failXlsx("XLSX_INVALID_XML", "Row number is invalid.", { row: node.attributes.r });
  }

  const cells: XlsxCellValue[] = [];
  for (const child of childrenNamed(node, "c")) {
    const parsed = parseCell(child, context, rowNumber);
    if (!parsed) continue;
    while (cells.length < parsed.column) cells.push(null);
    cells[parsed.column - 1] = parsed.value;
  }
  return { row: rowNumber, cells };
}

function parseSheet(
  xml: string,
  shared: readonly string[],
  dateStyles: ReadonlySet<number>,
  date1904: boolean
): XlsxCellValue[][] {
  const root = parseXml(xml);
  const worksheet = firstChild(root, "worksheet") ?? root;
  const sheetData = firstChild(worksheet, "sheetData");
  if (!sheetData) return [];

  const rows: XlsxCellValue[][] = [];
  const budget = { remaining: XLSX_LIMITS.maxCells };

  for (const rowNode of childrenNamed(sheetData, "row")) {
    const parsed = parseRow(rowNode, { shared, dateStyles, date1904 });
    budget.remaining -= Math.max(0, parsed.row - rows.length - 1) + parsed.cells.length;
    if (budget.remaining < 0) {
      failXlsx("XLSX_LIMIT_EXCEEDED", "Sheet materialises too many cells.", { row: parsed.row });
    }
    while (rows.length < parsed.row) rows.push([]);
    rows[parsed.row - 1] = parsed.cells;
  }
  return rows;
}

/** Reads an XLSX file into a plain workbook structure. Dates are returned as UTC `Date` values. */
export async function readXlsx(bytes: Uint8Array): Promise<XlsxWorkbookData> {
  const files = await readZip(bytes);
  requiredFile(files, "[Content_Types].xml");

  const rootRels = parseRels(decode(requiredFile(files, "_rels/.rels")));
  const office = findRelationship(rootRels, "officeDocument");
  if (!office) failXlsx("XLSX_INVALID_XML", "Package is missing its officeDocument relationship.");

  const workbookPath = resolveTarget(office.target, "");
  const workbook = parseWorkbook(decode(requiredFile(files, workbookPath)));
  const workbookDir = dirName(workbookPath);
  const relsPath = workbookDir
    ? `${workbookDir}/_rels/${baseName(workbookPath)}.rels`
    : `_rels/${baseName(workbookPath)}.rels`;
  const rels = parseRels(decode(requiredFile(files, relsPath)));

  const sharedRel = findRelationship(rels, "sharedStrings");
  const stylesRel = findRelationship(rels, "styles");
  const sharedPath = sharedRel
    ? resolveTarget(sharedRel.target, workbookDir)
    : joinPath(workbookDir, "sharedStrings.xml");
  const stylesPath = stylesRel ? resolveTarget(stylesRel.target, workbookDir) : joinPath(workbookDir, "styles.xml");
  const shared = files.has(sharedPath) ? parseSharedStrings(decode(requiredFile(files, sharedPath))) : [];
  const dateStyles = files.has(stylesPath) ? parseStyles(decode(requiredFile(files, stylesPath))) : new Set<number>();

  const data: XlsxSheetData[] = workbook.sheets.map((sheet) => {
    const relationship = rels.get(sheet.relationshipId);
    if (!relationship) {
      failXlsx("XLSX_INVALID_XML", "Worksheet relationship is missing.", { sheet: sheet.name, id: sheet.relationshipId });
    }
    if (!relationship.type.endsWith("/worksheet")) {
      failXlsx("XLSX_INVALID_XML", "Sheet relationship does not point to a worksheet.", { sheet: sheet.name });
    }
    const xml = decode(requiredFile(files, resolveTarget(relationship.target, workbookDir)));
    return { name: sheet.name, rows: parseSheet(xml, shared, dateStyles, workbook.date1904) };
  });

  return { sheets: data };
}
