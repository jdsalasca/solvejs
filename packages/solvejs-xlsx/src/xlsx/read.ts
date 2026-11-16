import { failXlsx } from "../errors.js";
import {
  XLSX_LIMITS,
  type ReadXlsxOptions,
  type XlsxCellValue,
  type XlsxDataValidation,
  type XlsxPageSetup,
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
  includeStyles: boolean;
  budget: { remaining: number };
};
type ParsedCell = { row: number; column: number; value: XlsxCellValue; formula?: string; styleIndex?: number };
type SharedFormula = { row: number; column: number; formula: string };
type LinkRef = { reference: string; relationshipId: string };
type SheetColumns = Array<{ width?: number; styleIndex?: number }>;

type ParsedSheet = {
  rows: XlsxCellValue[][];
  merges: string[];
  columns: SheetColumns;
  rowHeights: Record<number, number>;
  rowStyles: Record<number, XlsxReadStyle>;
  freeze?: { rows: number; columns: number };
  autoFilter?: string;
  pageSetup?: XlsxPageSetup;
  dataValidations?: XlsxDataValidation[];
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

function parseWorkbook(xml: string): { sheets: WorkbookSheet[]; date1904: boolean; definedNames?: Record<string, string> } {
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
  return { sheets, date1904, ...parseDefinedNames(workbook) };
}

// eslint-disable-next-line complexity -- explicit OOXML validation branches
function parseDefinedNames(workbook: XmlNode): { definedNames?: Record<string, string> } {
  const container = firstChild(workbook, "definedNames");
  if (!container) return {};
  const definedNames = Object.create(null) as Record<string, string>;
  let count = 0;
  for (const node of childrenNamed(container, "definedName")) {
    const name = node.attributes.name;
    const reference = textContent(node);
    if (!name) continue;
    if (node.attributes.localSheetId !== undefined) continue;
    if (name.length > 255 || hasControlCharacters(name)) {
      failXlsx("XLSX_INVALID_XML", "Defined name is not a valid identifier.", { name });
    }
    if (reference.length === 0 || reference.length > 8192 || hasControlCharacters(reference)) {
      failXlsx("XLSX_INVALID_XML", "Defined name reference is not valid formula text.", { name });
    }
    if (definedNames[name] !== undefined && definedNames[name] !== reference) {
      failXlsx("XLSX_INVALID_XML", "Workbook defines the same name twice.", { name });
    }
    count += 1;
    if (count > XLSX_LIMITS.maxDefinedNames) {
      failXlsx("XLSX_LIMIT_EXCEEDED", "Workbook has too many defined names.", { count });
    }
    definedNames[name] = reference;
  }
  return count > 0 ? { definedNames } : {};
}

// eslint-disable-next-line complexity -- optional OOXML attributes are validated individually
function parsePageSetup(worksheet: XmlNode): XlsxPageSetup | undefined {
  const node = firstChild(worksheet, "pageSetup");
  if (!node) return undefined;
  const setup: XlsxPageSetup = {};
  const orientation = node.attributes.orientation;
  if (orientation === "portrait" || orientation === "landscape") setup.orientation = orientation;
  const paper = Number(node.attributes.paperSize);
  if (node.attributes.paperSize !== undefined && Number.isInteger(paper) && paper >= 1 && paper <= 118) {
    setup.paperSize = paper;
  }
  for (const key of ["fitToWidth", "fitToHeight"] as const) {
    const raw = node.attributes[key];
    const value = Number(raw);
    if (raw !== undefined && Number.isInteger(value) && value >= 0 && value <= 32_767) setup[key] = value;
  }
  return Object.keys(setup).length > 0 ? setup : undefined;
}

const READ_VALIDATION_TYPES = new Set([
  "list",
  "whole",
  "decimal",
  "date",
  "time",
  "textLength",
  "custom"
]);
const READ_VALIDATION_OPERATORS = new Set([
  "between",
  "notBetween",
  "equal",
  "notEqual",
  "greaterThan",
  "lessThan",
  "greaterThanOrEqual",
  "lessThanOrEqual"
]);
const READ_VALIDATION_ERROR_STYLES = new Set(["stop", "warning", "information"]);

function textChild(node: XmlNode, name: string): string | undefined {
  const child = firstChild(node, name);
  return child ? textContent(child) : undefined;
}

// eslint-disable-next-line max-lines-per-function, complexity -- optional attributes and inline lists
function parseDataValidation(node: XmlNode): XlsxDataValidation | undefined {
  const range = node.attributes.sqref;
  const type = node.attributes.type;
  if (!range || !type || !READ_VALIDATION_TYPES.has(type)) return undefined;

  const validation: XlsxDataValidation = { range, type: type as XlsxDataValidation["type"] };
  const operator = node.attributes.operator;
  if (operator && READ_VALIDATION_OPERATORS.has(operator)) {
    validation.operator = operator as XlsxDataValidation["operator"];
  }
  const errorStyle = node.attributes.errorStyle;
  if (errorStyle && READ_VALIDATION_ERROR_STYLES.has(errorStyle)) {
    validation.errorStyle = errorStyle as XlsxDataValidation["errorStyle"];
  }
  for (const key of ["allowBlank", "showDropDown", "showInputMessage", "showErrorMessage"] as const) {
    const value = node.attributes[key];
    if (value === "1" || value === "true") {
      if (key === "showDropDown") validation.hideDropDown = true;
      else if (key === "allowBlank" || key === "showInputMessage" || key === "showErrorMessage") {
        validation[key] = true;
      }
    }
  }
  for (const key of ["errorTitle", "error", "promptTitle", "prompt"] as const) {
    const value = node.attributes[key];
    if (value) validation[key] = value;
  }

  const formula1 = textChild(node, "formula1");
  const formula2 = textChild(node, "formula2");
  if (formula2) validation.formula2 = formula2;
  if (formula1) {
    if (type === "list" && formula1.startsWith('"') && formula1.endsWith('"')) {
      validation.values = formula1
        .slice(1, -1)
        .replace(/""/g, '"')
        .split(",");
    } else {
      validation.formula1 = formula1;
    }
  }
  return validation;
}

function parseDataValidations(worksheet: XmlNode): XlsxDataValidation[] | undefined {
  const container = firstChild(worksheet, "dataValidations");
  if (!container) return undefined;
  const validations: XlsxDataValidation[] = [];
  for (const node of childrenNamed(container, "dataValidation")) {
    const validation = parseDataValidation(node);
    if (!validation) continue;
    validations.push(validation);
    if (validations.length > XLSX_LIMITS.maxDataValidations) {
      failXlsx("XLSX_LIMIT_EXCEEDED", "Sheet has too many data validations.", {
        count: validations.length
      });
    }
  }
  return validations.length > 0 ? validations : undefined;
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

// eslint-disable-next-line complexity -- OOXML cell type dispatch
function cellValue(type: string, node: XmlNode, context: CellContext, styleIndex: number | undefined): XlsxCellValue {
  const text = rawText(node);
  if (type === "inlineStr") return inlineText(node);
  if (type === "s") return sharedValue(text, context.shared);
  if (type === "b") {
    if (text !== "0" && text !== "1") failXlsx("XLSX_INVALID_XML", "Boolean cell is not 0 or 1.", { text });
    return text === "1";
  }
  if (type === "str" || type === "e") return text;
  if (type === "d") return dateValue(text);
  if (type !== "n") failXlsx("XLSX_UNSUPPORTED", "Unknown cell type.", { type });
  return numericValue(text, styleIndex, context);
}

function formulaOf(
  node: XmlNode,
  row: number,
  column: number,
  sharedFormulas: ReadonlyMap<string, SharedFormula>
): string | undefined {
  const formula = firstChild(node, "f");
  if (!formula) return undefined;
  const text = textContent(formula);
  if (text.length > 0) return text;
  const id = formula.attributes.si;
  const base = id ? sharedFormulas.get(id) : undefined;
  return base ? shiftFormula(base.formula, row - base.row, column - base.column) : undefined;
}

function columnNumber(letters: string): number {
  let value = 0;
  for (const character of letters) value = value * 26 + character.charCodeAt(0) - 64;
  return value;
}

function lettersOf(column: number): string {
  let value = column;
  let letters = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters;
}

type ShiftMatch = [columnAbsolute: string, letters: string, rowAbsolute: string, digits: string, offset: number];

function shiftSegment(segment: string, rowDelta: number, columnDelta: number): string {
  return segment.replace(/(\$?)([A-Z]{1,3})(\$?)(\d+)/g, (match, ...args: ShiftMatch) => {
    const [columnAbsolute, letters, rowAbsolute, digits, offset] = args;
    if (segment[offset + match.length] === "(" || segment[offset + match.length] === "!") return match;
    const column = columnNumber(letters) + (columnAbsolute ? 0 : columnDelta);
    const row = Number(digits) + (rowAbsolute ? 0 : rowDelta);
    if (column < 1 || row < 1) return "#REF!";
    return `${columnAbsolute}${lettersOf(column)}${rowAbsolute}${row}`;
  });
}

function quotedEnd(value: string, start: number, quote: string): number {
  let index = start + 1;
  while (index < value.length) {
    if (value[index] !== quote) {
      index += 1;
      continue;
    }
    if (value[index + 1] === quote) {
      index += 2;
      continue;
    }
    return index;
  }
  return -1;
}

function shiftFormula(formula: string, rowDelta: number, columnDelta: number): string {
  let output = "";
  let index = 0;
  while (index < formula.length) {
    const character = formula[index];
    if (character === '"' || character === "'") {
      const end = quotedEnd(formula, index, character);
      if (end === -1) {
        output += formula.slice(index);
        break;
      }
      output += formula.slice(index, end + 1);
      index = end + 1;
      continue;
    }
    let next = formula.length;
    for (const quote of ['"', "'"]) {
      const found = formula.indexOf(quote, index);
      if (found !== -1 && found < next) next = found;
    }
    output += shiftSegment(formula.slice(index, next), rowDelta, columnDelta);
    index = next;
  }
  return output;
}

function sharedFormulaOf(cell: XmlNode): { id: string; formula: SharedFormula } | undefined {
  const reference = cell.attributes.r;
  const formula = firstChild(cell, "f");
  const id = formula?.attributes.si;
  const text = formula ? textContent(formula) : "";
  if (!reference || !id || formula?.attributes.t !== "shared" || text.length === 0) return undefined;
  const position = parseCellRef(reference);
  return { id, formula: { row: position.row, column: position.column, formula: text } };
}

function parseSharedFormulas(sheetData: XmlNode): Map<string, SharedFormula> {
  const shared = new Map<string, SharedFormula>();
  for (const row of childrenNamed(sheetData, "row")) {
    for (const cell of childrenNamed(row, "c")) {
      const info = sharedFormulaOf(cell);
      if (info) shared.set(info.id, info.formula);
    }
  }
  return shared;
}

function styleIndexOf(node: XmlNode, reference: string): number | undefined {
  if (node.attributes.s === undefined) return undefined;
  const styleIndex = Number(node.attributes.s);
  if (!Number.isInteger(styleIndex) || styleIndex < 0) {
    failXlsx("XLSX_INVALID_XML", "Cell style index is invalid.", { reference, style: node.attributes.s });
  }
  return styleIndex;
}

function parseCell(
  node: XmlNode,
  context: CellContext,
  rowNumber: number,
  sharedFormulas: ReadonlyMap<string, SharedFormula>
): ParsedCell | null {
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
    formula: context.includeFormulas ? formulaOf(node, row, column, sharedFormulas) : undefined,
    styleIndex
  };
}

function applyCell(cell: ParsedCell, sheet: ParsedSheet, context: CellContext): void {
  const row = sheet.rows[cell.row - 1];
  context.budget.remaining -= Math.max(0, cell.column - row.length - 1) + 1;
  if (context.budget.remaining < 0) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Workbook materialises too many cells.", { row: cell.row, column: cell.column });
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

function rowStyleOf(node: XmlNode, context: CellContext): XlsxReadStyle | undefined {
  if (!context.includeStyles || node.attributes.s === undefined) return undefined;
  const styleIndex = Number(node.attributes.s);
  return Number.isInteger(styleIndex) ? context.styles.cellStyles[styleIndex] : undefined;
}

function spendRowBudget(context: CellContext, sheet: ParsedSheet, rowNumber: number): void {
  context.budget.remaining -= Math.max(0, rowNumber - sheet.rows.length - 1) + 1;
  if (context.budget.remaining < 0) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Workbook materialises too many rows.", { row: rowNumber });
  }
}

function parseRow(
  node: XmlNode,
  context: CellContext,
  sheet: ParsedSheet,
  sharedFormulas: ReadonlyMap<string, SharedFormula>
): void {
  const rowNumber = rowNumberOf(node);
  const height = rowHeightOf(node);
  const style = rowStyleOf(node, context);
  if (height !== undefined) sheet.rowHeights[rowNumber] = height;
  if (style) sheet.rowStyles[rowNumber] = style;
  spendRowBudget(context, sheet, rowNumber);
  while (sheet.rows.length < rowNumber) sheet.rows.push([]);
  const seen = new Set<number>();

  for (const child of childrenNamed(node, "c")) {
    const parsed = parseCell(child, context, rowNumber, sharedFormulas);
    if (!parsed) continue;
    if (seen.has(parsed.column)) {
      failXlsx("XLSX_INVALID_XML", "Duplicate cell in a row.", { row: rowNumber, column: parsed.column });
    }
    seen.add(parsed.column);
    applyCell(parsed, sheet, context);
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
    rowStyles: Object.create(null),
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
  sheet.pageSetup = parsePageSetup(worksheet);
  sheet.dataValidations = parseDataValidations(worksheet);
  parseHyperlinks(worksheet, sheet);
  parseDrawingRef(worksheet, sheet);
  const sheetData = firstChild(worksheet, "sheetData");
  if (!sheetData) return sheet;
  const sharedFormulas = parseSharedFormulas(sheetData);
  const seenRows = new Set<number>();
  for (const row of childrenNamed(sheetData, "row")) {
    const rowNumber = rowNumberOf(row);
    if (seenRows.has(rowNumber)) failXlsx("XLSX_INVALID_XML", "Duplicate row in a worksheet.", { row: rowNumber });
    seenRows.add(rowNumber);
    parseRow(row, context, sheet, sharedFormulas);
  }
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

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    if ((character.codePointAt(0) ?? 0) < 0x20) return true;
  }
  return false;
}

function safeExternalHref(target: string): string | undefined {
  if (target.length === 0 || target.length > 2083 || hasControlCharacters(target)) return undefined;
  return /^(https?:\/\/|mailto:|tel:)/i.test(target) ? target : undefined;
}

function resolveLinks(
  sheet: ParsedSheet,
  relationships: ReadonlyMap<string, Relationship> | undefined
): Record<string, string> | undefined {
  const links = Object.assign(Object.create(null) as Record<string, string>, sheet.internalLinks);
  if (relationships) {
    for (const link of sheet.linkRefs) {
      const relationship = relationships.get(link.relationshipId);
      if (!relationship || relationship.targetMode !== "External") continue;
      if (!relationship.type.endsWith("/hyperlink")) continue;
      const href = safeExternalHref(relationship.target);
      if (href) links[link.reference] = href;
    }
  }
  return Object.keys(links).length > 0 ? links : undefined;
}

type ImageAnchor = {
  row: number;
  column: number;
  width?: number;
  height?: number;
  relationshipId: string;
  to?: string;
  fromOffset?: { column: number; row: number };
  toOffset?: { column: number; row: number };
};
type ReadImage = NonNullable<XlsxSheetData["images"]>[number];
type AnchorPosition = { row: number; column: number; columnOffset: number; rowOffset: number };

// eslint-disable-next-line complexity -- marker and offset validation are explicit
function anchorPosition(anchor: XmlNode, childName: "from" | "to"): AnchorPosition | undefined {
  const child = firstChild(anchor, childName);
  if (!child) return undefined;
  const colNode = firstChild(child, "col");
  const rowNode = firstChild(child, "row");
  const column = colNode ? Number(textContent(colNode)) : Number.NaN;
  const row = rowNode ? Number(textContent(rowNode)) : Number.NaN;
  if (!Number.isInteger(column) || !Number.isInteger(row) || column < 0 || row < 0) return undefined;
  const colOff = firstChild(child, "colOff");
  const rowOff = firstChild(child, "rowOff");
  const columnOffset = colOff ? Number(textContent(colOff)) : 0;
  const rowOffset = rowOff ? Number(textContent(rowOff)) : 0;
  return { row, column, columnOffset: Number.isFinite(columnOffset) ? columnOffset : 0, rowOffset: Number.isFinite(rowOffset) ? rowOffset : 0 };
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
  const position = anchorPosition(anchor, "from");
  const relationshipId = anchorRelationship(anchor);
  if (!position || !relationshipId) return undefined;
  const to = anchorPosition(anchor, "to");
  return {
    ...position,
    relationshipId,
    ...anchorSize(anchor),
    ...(to ? { to: cellReferenceFor(to.row + 1, to.column + 1), toOffset: { column: to.columnOffset, row: to.rowOffset } } : {}),
    fromOffset: { column: position.columnOffset, row: position.rowOffset }
  };
}

// eslint-disable-next-line complexity -- media lookup and anchor fallbacks
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
    ...(anchor.to ? { to: anchor.to } : {}),
    ...(anchor.fromOffset ? { fromOffset: anchor.fromOffset } : {}),
    ...(anchor.toOffset ? { toOffset: anchor.toOffset } : {}),
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
  workbook: ReturnType<typeof parseWorkbook>;
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

// eslint-disable-next-line complexity -- optional metadata is merged conditionally
function baseMetadata(
  parsed: ParsedSheet,
  styles: ParsedStyles,
  includeStyles: boolean
): Omit<XlsxSheetData, "name" | "rows" | "links" | "formulas" | "styles" | "images"> {
  return {
    ...(parsed.merges.length > 0 ? { merges: parsed.merges } : {}),
    ...columnMetadata(parsed, styles, includeStyles),
    ...(Object.keys(parsed.rowHeights).length > 0 ? { rowHeights: parsed.rowHeights } : {}),
    ...(includeStyles && Object.keys(parsed.rowStyles).length > 0 ? { rowStyles: parsed.rowStyles } : {}),
    ...(parsed.freeze ? { freeze: parsed.freeze } : {}),
    ...(parsed.autoFilter ? { autoFilter: parsed.autoFilter } : {}),
    ...(parsed.pageSetup ? { pageSetup: parsed.pageSetup } : {}),
    ...(parsed.dataValidations ? { dataValidations: parsed.dataValidations } : {})
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
    includeFormulas: options.includeFormulas !== false,
    includeStyles: options.includeStyles === true,
    budget: { remaining: XLSX_LIMITS.maxWorkbookCells }
  };
  const selected = selectSheets(parts.workbook.sheets, options.sheets);
  const sheets = selected.map((sheet) =>
    sheetDataOf({ sheet, parts, files, context, includeStyles: options.includeStyles === true })
  );
  return {
    sheets,
    date1904: parts.workbook.date1904,
    ...(parts.workbook.definedNames ? { definedNames: parts.workbook.definedNames } : {}),
    ...(parts.properties ? { properties: parts.properties } : {})
  };
}
