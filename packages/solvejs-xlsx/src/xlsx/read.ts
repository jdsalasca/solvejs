import { failXlsx } from "../errors.js";
import {
  XLSX_LIMITS,
  type ReadXlsxOptions,
  type XlsxCellValue,
  type XlsxReadStyle,
  type XlsxSheetData,
  type XlsxWorkbookData,
  dateFromExcelSerial
} from "../shared.js";
import { childrenNamed, firstChild, parseXml, textContent, type XmlNode } from "../xml/parse.js";
import { readZip } from "../zip/read.js";
import { parseStyles, type ParsedStyles } from "./read-styles.js";
import { emuToPixels, readMedia } from "./media.js";

type WorkbookSheet = { name: string; relationshipId: string };
type Relationship = { target: string; type: string; targetMode?: string };
type CellContext = {
  shared: readonly string[];
  styles: ParsedStyles;
  date1904: boolean;
  includeFormulas: boolean;
};
type ParsedCell = { row: number; column: number; value: XlsxCellValue; formula?: string; styleIndex?: number };
type LinkRef = { reference: string; relationshipId: string };
type SheetColumns = Array<{ width?: number; styleIndex?: number }>;

type ParsedSheet = {
  rows: XlsxCellValue[][];
  merges: string[];
  columns: SheetColumns;
  rowHeights: Record<number, number>;
  freeze?: { rows: number; columns: number };
  autoFilter?: string;
  formulas: Record<string, string>;
  styles: Record<string, XlsxReadStyle>;
  linkRefs: LinkRef[];
  internalLinks: Record<string, string>;
  drawingId?: string;
};

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

function parseCore(xml: string): { title?: string; creator?: string } {
  const root = parseXml(xml);
  const core = firstChild(root, "coreProperties") ?? root;
  const properties: { title?: string; creator?: string } = {};
  const title = firstChild(core, "title");
  const creator = firstChild(core, "creator");
  if (title) properties.title = textContent(title);
  if (creator) properties.creator = textContent(creator);
  return properties;
}

function relationshipOf(node: XmlNode): { id: string; relationship: Relationship } {
  const id = node.attributes.Id;
  const target = node.attributes.Target;
  const type = node.attributes.Type;
  const mode = node.attributes.TargetMode;
  if (!id || !target || !type) {
    failXlsx("XLSX_INVALID_XML", "Relationship is missing Id, Target or Type.");
  }
  return { id, relationship: { target, type, targetMode: mode } };
}

function parseRels(xml: string, allowExternal = false): Map<string, Relationship> {
  const root = parseXml(xml);
  const rels = firstChild(root, "Relationships") ?? root;
  const map = new Map<string, Relationship>();

  for (const relation of childrenNamed(rels, "Relationship")) {
    const { id, relationship } = relationshipOf(relation);
    if (relationship.targetMode === "External" && !allowExternal) {
      failXlsx("XLSX_UNSUPPORTED", "External relationships are not supported here.", { id });
    }
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

function numericValue(text: string, styleIndex: number | undefined, context: CellContext): XlsxCellValue {
  if (text.length === 0) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) failXlsx("XLSX_INVALID_XML", "Numeric cell is not finite.", { text });
  const style = styleIndex ?? 0;
  return context.styles.dateStyles.has(style) ? dateFromExcelSerial(value, context.date1904) : value;
}

function cellValue(type: string, node: XmlNode, context: CellContext, styleIndex: number | undefined): XlsxCellValue {
  const text = rawText(node);
  if (type === "inlineStr") return inlineText(node);
  if (type === "s") return sharedValue(text, context.shared);
  if (type === "b") return text === "1";
  if (type === "str" || type === "e") return text;
  if (type === "d") return dateValue(text);
  return numericValue(text, styleIndex, context);
}

function formulaOf(node: XmlNode): string | undefined {
  const formula = firstChild(node, "f");
  if (!formula) return undefined;
  const text = textContent(formula);
  return text.length > 0 ? text : undefined;
}

function styleIndexOf(node: XmlNode, reference: string): number | undefined {
  if (node.attributes.s === undefined) return undefined;
  const styleIndex = Number(node.attributes.s);
  if (!Number.isInteger(styleIndex) || styleIndex < 0) {
    failXlsx("XLSX_INVALID_XML", "Cell style index is invalid.", { reference, style: node.attributes.s });
  }
  return styleIndex;
}

function parseCell(node: XmlNode, context: CellContext, rowNumber: number): ParsedCell | null {
  const reference = node.attributes.r;
  if (!reference) return null;
  const { row, column } = parseCellRef(reference);
  if (row !== rowNumber) {
    failXlsx("XLSX_INVALID_XML", "Cell reference disagrees with its row.", { reference, row: rowNumber });
  }
  const styleIndex = styleIndexOf(node, reference);
  return {
    row,
    column,
    value: cellValue(node.attributes.t ?? "n", node, context, styleIndex),
    formula: context.includeFormulas ? formulaOf(node) : undefined,
    styleIndex
  };
}

function applyCell(cell: ParsedCell, sheet: ParsedSheet, context: CellContext, budget: { remaining: number }): void {
  const row = sheet.rows[cell.row - 1];
  budget.remaining -= Math.max(0, cell.column - row.length - 1) + 1;
  if (budget.remaining < 0) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Sheet materialises too many cells.", { row: cell.row, column: cell.column });
  }
  while (row.length < cell.column) row.push(null);
  row[cell.column - 1] = cell.value;
  if (cell.formula) sheet.formulas[cellReferenceFor(cell.row, cell.column)] = cell.formula;
  if (cell.styleIndex !== undefined && cell.styleIndex > 0 && context.styles.cellStyles[cell.styleIndex]) {
    sheet.styles[cellReferenceFor(cell.row, cell.column)] = context.styles.cellStyles[cell.styleIndex];
  }
}

function cellReferenceFor(row: number, column: number): string {
  let letters = "";
  let value = column;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return `${letters}${row}`;
}

function rowNumberOf(node: XmlNode): number {
  const rowNumber = Number(node.attributes.r);
  if (!Number.isInteger(rowNumber) || rowNumber <= 0 || rowNumber > XLSX_LIMITS.maxRows) {
    failXlsx("XLSX_INVALID_XML", "Row number is invalid.", { row: node.attributes.r });
  }
  return rowNumber;
}

function rowHeightOf(node: XmlNode): number | undefined {
  const height = Number(node.attributes.ht);
  return node.attributes.ht !== undefined && Number.isFinite(height) && height > 0 ? height : undefined;
}

function parseRow(node: XmlNode, context: CellContext, sheet: ParsedSheet, budget: { remaining: number }): void {
  const rowNumber = rowNumberOf(node);
  const height = rowHeightOf(node);
  if (height !== undefined) sheet.rowHeights[rowNumber] = height;
  while (sheet.rows.length < rowNumber) sheet.rows.push([]);

  for (const child of childrenNamed(node, "c")) {
    const parsed = parseCell(child, context, rowNumber);
    if (parsed) applyCell(parsed, sheet, context, budget);
  }
}

function parseMerges(worksheet: XmlNode, sheet: ParsedSheet): void {
  const merges = firstChild(worksheet, "mergeCells");
  if (!merges) return;
  sheet.merges = childrenNamed(merges, "mergeCell")
    .map((node) => node.attributes.ref)
    .filter((ref): ref is string => typeof ref === "string" && ref.length > 0);
}

type ColumnRange = { min: number; max: number; width?: number; styleIndex?: number };

function columnWidthOf(node: XmlNode): number | undefined {
  const width = Number(node.attributes.width);
  return Number.isFinite(width) && width > 0 ? width : undefined;
}

function columnStyleOf(node: XmlNode): number | undefined {
  const styleIndex = Number(node.attributes.style);
  return Number.isInteger(styleIndex) ? styleIndex : undefined;
}

function columnRangeOf(node: XmlNode): ColumnRange | undefined {
  const min = Number(node.attributes.min);
  const max = Number(node.attributes.max);
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min) return undefined;
  if (max > XLSX_LIMITS.maxColumns) failXlsx("XLSX_LIMIT_EXCEEDED", "Column range exceeds the configured limits.");
  return { min, max, width: columnWidthOf(node), styleIndex: columnStyleOf(node) };
}

function parseColumns(worksheet: XmlNode, sheet: ParsedSheet): void {
  const cols = firstChild(worksheet, "cols");
  if (!cols) return;
  for (const col of childrenNamed(cols, "col")) {
    const range = columnRangeOf(col);
    if (!range) continue;
    for (let index = range.min; index <= range.max; index += 1) {
      sheet.columns[index - 1] = { width: range.width, styleIndex: range.styleIndex };
    }
  }
}

function frozenPane(worksheet: XmlNode): XmlNode | undefined {
  const views = firstChild(worksheet, "sheetViews");
  const sheetView = views ? firstChild(views, "sheetView") : undefined;
  const pane = sheetView ? firstChild(sheetView, "pane") : undefined;
  return pane?.attributes.state === "frozen" ? pane : undefined;
}

function freezeOf(pane: XmlNode): { rows: number; columns: number } | undefined {
  const rows = Number(pane.attributes.ySplit ?? "0");
  const columns = Number(pane.attributes.xSplit ?? "0");
  if (!Number.isInteger(rows) || !Number.isInteger(columns) || (rows <= 0 && columns <= 0)) return undefined;
  return { rows: Math.max(0, rows), columns: Math.max(0, columns) };
}

function parseFreeze(worksheet: XmlNode, sheet: ParsedSheet): void {
  const pane = frozenPane(worksheet);
  const freeze = pane ? freezeOf(pane) : undefined;
  if (freeze) sheet.freeze = freeze;
}

function parseAutoFilter(worksheet: XmlNode, sheet: ParsedSheet): void {
  const filter = firstChild(worksheet, "autoFilter");
  if (filter?.attributes.ref) sheet.autoFilter = filter.attributes.ref;
}

function parseHyperlinks(worksheet: XmlNode, sheet: ParsedSheet): void {
  const hyperlinks = firstChild(worksheet, "hyperlinks");
  if (!hyperlinks) return;
  for (const link of childrenNamed(hyperlinks, "hyperlink")) {
    const reference = link.attributes.ref;
    const relationshipId = link.attributes["r:id"];
    const location = link.attributes.location;
    if (!reference) continue;
    if (relationshipId) sheet.linkRefs.push({ reference, relationshipId });
    if (location) sheet.internalLinks[reference] = location.startsWith("#") ? location : `#${location}`;
  }
}

function parseDrawingRef(worksheet: XmlNode, sheet: ParsedSheet): void {
  const drawing = firstChild(worksheet, "drawing");
  const relationshipId = drawing?.attributes["r:id"];
  if (relationshipId) sheet.drawingId = relationshipId;
}

function emptySheet(): ParsedSheet {
  return {
    rows: [],
    merges: [],
    columns: [],
    rowHeights: {},
    formulas: Object.create(null),
    styles: Object.create(null),
    linkRefs: [],
    internalLinks: Object.create(null)
  };
}

function parseSheet(xml: string, context: CellContext): ParsedSheet {
  const root = parseXml(xml);
  const worksheet = firstChild(root, "worksheet") ?? root;
  const sheet = emptySheet();
  parseColumns(worksheet, sheet);
  parseMerges(worksheet, sheet);
  parseFreeze(worksheet, sheet);
  parseAutoFilter(worksheet, sheet);
  parseHyperlinks(worksheet, sheet);
  parseDrawingRef(worksheet, sheet);
  const sheetData = firstChild(worksheet, "sheetData");
  if (!sheetData) return sheet;
  const budget = { remaining: XLSX_LIMITS.maxCells };
  for (const row of childrenNamed(sheetData, "row")) parseRow(row, context, sheet, budget);
  return sheet;
}

function worksheetRelationships(
  files: ReadonlyMap<string, Uint8Array>,
  worksheetPath: string
): Map<string, Relationship> | undefined {
  const relsPath = joinPath(dirName(worksheetPath), `_rels/${baseName(worksheetPath)}.rels`);
  const bytes = files.get(relsPath);
  return bytes ? parseRels(decode(bytes), true) : undefined;
}

function resolveLinks(
  sheet: ParsedSheet,
  relationships: ReadonlyMap<string, Relationship> | undefined
): Record<string, string> | undefined {
  const links = Object.assign(Object.create(null) as Record<string, string>, sheet.internalLinks);
  if (relationships) {
    for (const link of sheet.linkRefs) {
      const relationship = relationships.get(link.relationshipId);
      if (relationship?.targetMode === "External") links[link.reference] = relationship.target;
    }
  }
  return Object.keys(links).length > 0 ? links : undefined;
}

type ImageAnchor = { row: number; column: number; width?: number; height?: number; relationshipId: string };
type ReadImage = NonNullable<XlsxSheetData["images"]>[number];
type AnchorPosition = { row: number; column: number };

function anchorPosition(anchor: XmlNode): AnchorPosition | undefined {
  const from = firstChild(anchor, "from");
  if (!from) return undefined;
  const colNode = firstChild(from, "col");
  const rowNode = firstChild(from, "row");
  const column = colNode ? Number(textContent(colNode)) : Number.NaN;
  const row = rowNode ? Number(textContent(rowNode)) : Number.NaN;
  if (!Number.isInteger(column) || !Number.isInteger(row) || column < 0 || row < 0) return undefined;
  return { row, column };
}

function anchorRelationship(anchor: XmlNode): string | undefined {
  const blip = firstChild(firstChild(firstChild(anchor, "pic") ?? anchor, "blipFill") ?? anchor, "blip");
  return blip?.attributes["r:embed"];
}

function anchorDimension(raw: string | undefined): number | undefined {
  const value = Number(raw ?? "");
  return Number.isFinite(value) && value > 0 ? emuToPixels(value) : undefined;
}

function anchorSize(anchor: XmlNode): { width?: number; height?: number } {
  const ext = firstChild(anchor, "ext");
  return {
    width: anchorDimension(ext?.attributes.cx),
    height: anchorDimension(ext?.attributes.cy)
  };
}

function imageAnchorOf(anchor: XmlNode): ImageAnchor | undefined {
  const position = anchorPosition(anchor);
  const relationshipId = anchorRelationship(anchor);
  if (!position || !relationshipId) return undefined;
  return { ...position, relationshipId, ...anchorSize(anchor) };
}

function imageFromAnchor(
  anchor: ImageAnchor,
  drawingRels: ReadonlyMap<string, Relationship>,
  drawingPath: string,
  files: ReadonlyMap<string, Uint8Array>
): ReadImage | undefined {
  const relationship = drawingRels.get(anchor.relationshipId);
  if (!relationship || relationship.targetMode === "External") return undefined;
  const mediaBytes = files.get(resolveTarget(relationship.target, dirName(drawingPath)));
  if (!mediaBytes) return undefined;
  const media = readMedia(mediaBytes);
  return {
    anchor: cellReferenceFor(anchor.row + 1, anchor.column + 1),
    width: anchor.width ?? media.width,
    height: anchor.height ?? media.height,
    format: media.format,
    data: media.data
  };
}

type DrawingContext = { drawingPath: string; drawingRels: Map<string, Relationship>; anchors: XmlNode[] };

function drawingContextOf(
  sheet: ParsedSheet,
  relationships: ReadonlyMap<string, Relationship> | undefined,
  files: ReadonlyMap<string, Uint8Array>,
  worksheetPath: string
): DrawingContext | undefined {
  if (!sheet.drawingId || !relationships) return undefined;
  const drawingRelationship = relationships.get(sheet.drawingId);
  if (!drawingRelationship || drawingRelationship.targetMode === "External") return undefined;
  const drawingPath = resolveTarget(drawingRelationship.target, dirName(worksheetPath));
  const drawingBytes = files.get(drawingPath);
  if (!drawingBytes) return undefined;
  const relsPath = joinPath(dirName(drawingPath), `_rels/${baseName(drawingPath)}.rels`);
  const relsBytes = files.get(relsPath);
  const drawingRels = relsBytes ? parseRels(decode(relsBytes), true) : new Map<string, Relationship>();
  const drawingRoot = parseXml(decode(drawingBytes));
  const drawing = firstChild(drawingRoot, "wsDr") ?? drawingRoot;
  return {
    drawingPath,
    drawingRels,
    anchors: [...childrenNamed(drawing, "oneCellAnchor"), ...childrenNamed(drawing, "twoCellAnchor")]
  };
}

function parseDrawingImages(
  sheet: ParsedSheet,
  relationships: ReadonlyMap<string, Relationship> | undefined,
  files: ReadonlyMap<string, Uint8Array>,
  worksheetPath: string
): ReadImage[] | undefined {
  const context = drawingContextOf(sheet, relationships, files, worksheetPath);
  if (!context) return undefined;
  const images = context.anchors
    .map(imageAnchorOf)
    .filter((anchor): anchor is ImageAnchor => anchor !== undefined)
    .map((anchor) => imageFromAnchor(anchor, context.drawingRels, context.drawingPath, files))
    .filter((image): image is ReadImage => image !== undefined);
  return images.length > 0 ? images : undefined;
}

function columnsOf(sheet: ParsedSheet, styles: ParsedStyles, includeStyles: boolean): XlsxSheetData["columns"] {
  if (sheet.columns.length === 0) return undefined;
  return sheet.columns.map((column) => ({
    width: column.width,
    style:
      includeStyles && column.styleIndex !== undefined ? styles.cellStyles[column.styleIndex] : undefined
  }));
}

function selectSheets(sheets: readonly WorkbookSheet[], requested: readonly string[] | undefined): WorkbookSheet[] {
  if (!requested) return [...sheets];
  if (requested.length === 0) failXlsx("XLSX_INVALID_INPUT", "No sheets were requested.");
  const known = new Set(sheets.map((sheet) => sheet.name));
  for (const name of requested) {
    if (!known.has(name)) failXlsx("XLSX_INVALID_INPUT", `Sheet not found: ${name}.`, { sheet: name });
  }
  const selected = new Set(requested);
  return sheets.filter((sheet) => selected.has(sheet.name));
}

type PackageParts = {
  workbook: { sheets: WorkbookSheet[]; date1904: boolean };
  workbookDir: string;
  rels: Map<string, Relationship>;
  shared: string[];
  styles: ParsedStyles;
  properties?: { title?: string; creator?: string };
};

function packageProperties(
  files: ReadonlyMap<string, Uint8Array>,
  rootRels: ReadonlyMap<string, Relationship>
): { title?: string; creator?: string } | undefined {
  const coreRel = findRelationship(rootRels, "core-properties");
  const corePath = coreRel ? resolveTarget(coreRel.target, "") : undefined;
  if (!corePath || !files.has(corePath)) return undefined;
  return parseCore(decode(requiredFile(files, corePath)));
}

function readPackage(files: ReadonlyMap<string, Uint8Array>): PackageParts {
  requiredFile(files, "[Content_Types].xml");
  const rootRels = parseRels(decode(requiredFile(files, "_rels/.rels")));
  const office = findRelationship(rootRels, "officeDocument");
  if (!office) failXlsx("XLSX_INVALID_XML", "Package is missing its officeDocument relationship.");
  const properties = packageProperties(files, rootRels);

  const workbookPath = resolveTarget(office.target, "");
  const workbook = parseWorkbook(decode(requiredFile(files, workbookPath)));
  const workbookDir = dirName(workbookPath);
  const relsPath = joinPath(workbookDir, `_rels/${baseName(workbookPath)}.rels`);
  const rels = parseRels(decode(requiredFile(files, relsPath)));
  const sharedRel = findRelationship(rels, "sharedStrings");
  const stylesRel = findRelationship(rels, "styles");
  const sharedPath = sharedRel ? resolveTarget(sharedRel.target, workbookDir) : joinPath(workbookDir, "sharedStrings.xml");
  const stylesPath = stylesRel ? resolveTarget(stylesRel.target, workbookDir) : joinPath(workbookDir, "styles.xml");
  return {
    workbook,
    workbookDir,
    rels,
    shared: files.has(sharedPath) ? parseSharedStrings(decode(requiredFile(files, sharedPath))) : [],
    styles: files.has(stylesPath)
      ? parseStyles(decode(requiredFile(files, stylesPath)))
      : { dateStyles: new Set<number>(), cellStyles: [] },
    properties
  };
}

function columnMetadata(
  parsed: ParsedSheet,
  styles: ParsedStyles,
  includeStyles: boolean
): Pick<XlsxSheetData, "columns"> {
  return parsed.columns.length > 0 ? { columns: columnsOf(parsed, styles, includeStyles) } : {};
}

function baseMetadata(
  parsed: ParsedSheet,
  styles: ParsedStyles,
  includeStyles: boolean
): Omit<XlsxSheetData, "name" | "rows" | "links" | "formulas" | "styles" | "images"> {
  return {
    ...(parsed.merges.length > 0 ? { merges: parsed.merges } : {}),
    ...columnMetadata(parsed, styles, includeStyles),
    ...(Object.keys(parsed.rowHeights).length > 0 ? { rowHeights: parsed.rowHeights } : {}),
    ...(parsed.freeze ? { freeze: parsed.freeze } : {}),
    ...(parsed.autoFilter ? { autoFilter: parsed.autoFilter } : {})
  };
}

function extraMetadata(
  parsed: ParsedSheet,
  links: Record<string, string> | undefined,
  images: ReadImage[] | undefined,
  includeStyles: boolean
): Pick<XlsxSheetData, "links" | "formulas" | "styles" | "images"> {
  return {
    ...(links ? { links } : {}),
    ...(Object.keys(parsed.formulas).length > 0 ? { formulas: parsed.formulas } : {}),
    ...(includeStyles && Object.keys(parsed.styles).length > 0 ? { styles: parsed.styles } : {}),
    ...(images ? { images } : {})
  };
}

type SheetDataInput = {
  sheet: WorkbookSheet;
  parts: PackageParts;
  files: ReadonlyMap<string, Uint8Array>;
  context: CellContext;
  includeStyles: boolean;
};

function sheetDataOf(input: SheetDataInput): XlsxSheetData {
  const { sheet, parts, files, context, includeStyles } = input;
  const relationship = parts.rels.get(sheet.relationshipId);
  if (!relationship) {
    failXlsx("XLSX_INVALID_XML", "Worksheet relationship is missing.", { sheet: sheet.name, id: sheet.relationshipId });
  }
  if (!relationship.type.endsWith("/worksheet")) {
    failXlsx("XLSX_INVALID_XML", "Sheet relationship does not point to a worksheet.", { sheet: sheet.name });
  }
  const worksheetPath = resolveTarget(relationship.target, parts.workbookDir);
  const parsed = parseSheet(decode(requiredFile(files, worksheetPath)), context);
  const worksheetRels = worksheetRelationships(files, worksheetPath);
  return {
    name: sheet.name,
    rows: parsed.rows,
    ...baseMetadata(parsed, parts.styles, includeStyles),
    ...extraMetadata(parsed, resolveLinks(parsed, worksheetRels), parseDrawingImages(parsed, worksheetRels, files, worksheetPath), includeStyles)
  };
}

/** Reads an XLSX file into a plain workbook structure. Dates are returned as UTC `Date` values. */
export async function readXlsx(bytes: Uint8Array, options: ReadXlsxOptions = {}): Promise<XlsxWorkbookData> {
  const files = await readZip(bytes);
  const parts = readPackage(files);
  const context: CellContext = {
    shared: parts.shared,
    styles: parts.styles,
    date1904: parts.workbook.date1904,
    includeFormulas: options.includeFormulas !== false
  };
  const selected = selectSheets(parts.workbook.sheets, options.sheets);
  const sheets = selected.map((sheet) =>
    sheetDataOf({ sheet, parts, files, context, includeStyles: options.includeStyles === true })
  );
  return {
    sheets,
    date1904: parts.workbook.date1904,
    ...(parts.properties ? { properties: parts.properties } : {})
  };
}
