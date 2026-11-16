import { failXlsx } from "./errors.js";
import {
  XLSX_LIMITS,
  cellReference,
  isCellObject,
  type XlsxCell,
  type XlsxDataValidation,
  type XlsxImageInput,
  type XlsxPageSetup
} from "./shared.js";
import type { XlsxCellStyle, XlsxColor } from "./style.js";
import type { CellModel, ColumnModel, FreezeModel, RowModel, SheetModel, WorkbookModel } from "./xlsx/model.js";
import { writeWorkbook, writeWorkbookCompressed } from "./xlsx/write.js";
import { imageModel } from "./xlsx/media.js";

const MAX_COLUMN_WIDTH = 255;
const MAX_ROW_HEIGHT = 409;

/** Any value accepted as a child of a declarative workbook. */
export type XlsxNode = XlsxElement | string | number | boolean | Date | null | undefined;

/** A declarative workbook node. `type` is a tag, a fragment or a function component. */
export type XlsxElement = {
  type: string | Component | typeof Fragment;
  props: Record<string, unknown>;
};

/** A function component that returns a declarative node. */
export type Component = (props: never) => XlsxElement;

/** Fragment marker for JSX children. */
export const Fragment = Symbol.for("solvejs.xlsx.fragment");

const MAX_RESOLVE_DEPTH = 100;
const STYLE_KEYS = [
  "bold",
  "italic",
  "underline",
  "strike",
  "fontName",
  "fontSize",
  "fontColor",
  "fill",
  "align",
  "verticalAlign",
  "wrapText",
  "numberFormat",
  "border",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft"
] as const;

type Children = XlsxNode | XlsxNode[];
type Budget = { remaining: number };

export type XlsxProps = { name?: string; creator?: string; children?: Children };
export type SheetProps = {
  name: string;
  columns?: Array<number | ColumnProps>;
  freeze?: FreezeModel;
  autoFilter?: boolean | string;
  tabColor?: XlsxColor;
  pageSetup?: XlsxPageSetup;
  dataValidations?: readonly XlsxDataValidation[];
  images?: readonly XlsxImageInput[];
  children?: Children;
};
export type RowProps = { row?: number; height?: number; style?: XlsxCellStyle; children?: Children };
export type ColumnProps = { width?: number; style?: XlsxCellStyle };
export type CellProps = XlsxCellStyle & {
  value?: XlsxCell;
  content?: XlsxCell;
  formula?: string;
  href?: string;
  row?: number;
  column?: number;
  column_number?: number;
  colSpan?: number;
  rowSpan?: number;
  children?: Children;
};

/** Creates a declarative node. Used by the JSX runtime and by non-JSX callers. */
export function createElement(
  type: XlsxElement["type"],
  props: Record<string, unknown> = {},
  ...children: XlsxNode[]
): XlsxElement {
  return { type, props: { ...props, children: children.length > 0 ? children : props.children } };
}

export function Xlsx(props: XlsxProps): XlsxElement {
  return createElement("xlsx", props);
}

export function Sheet(props: SheetProps): XlsxElement {
  return createElement("sheet", props);
}

export function Row(props: RowProps): XlsxElement {
  return createElement("row", props);
}

export function Cell(props: CellProps): XlsxElement {
  return createElement("cell", props);
}

export function Column(props: ColumnProps): XlsxElement {
  return createElement("column", props);
}

function isElement(value: unknown): value is XlsxElement {
  return typeof value === "object" && value !== null && "type" in value && "props" in value;
}

function flatten(value: Children | undefined): XlsxNode[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.flatMap((child) => flatten(child));
  if (isElement(value) && value.type === Fragment) {
    return flatten(value.props.children as Children | undefined);
  }
  return [value];
}

function childrenOf(element: XlsxElement): XlsxNode[] {
  return flatten(element.props.children as Children | undefined);
}

function resolve(element: XlsxElement, depth = 0): XlsxElement {
  if (depth > MAX_RESOLVE_DEPTH) failXlsx("XLSX_INVALID_INPUT", "Component tree is too deep.");
  if (typeof element.type !== "function") return element;
  const component = element.type as (props: Record<string, unknown>) => XlsxElement;
  return resolve(component(element.props), depth + 1);
}

function resolvedChildren(element: XlsxElement): XlsxElement[] {
  return childrenOf(element)
    .filter(isElement)
    .map((child) => resolve(child));
}

function isIgnored(value: XlsxNode): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function isInvisible(value: XlsxNode): boolean {
  return isIgnored(value) || value === false;
}

function isPrimitive(value: XlsxNode): value is string | number | boolean | Date {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value instanceof Date;
}

function firstPrimitive(children: readonly XlsxNode[]): XlsxCell | undefined {
  for (const child of children) {
    if (!isPrimitive(child) || isIgnored(child)) continue;
    return child;
  }
  return undefined;
}

function spend(budget: Budget, amount: number, sheet: string): void {
  budget.remaining -= amount;
  if (budget.remaining < 0) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Sheet materialises too many cells.", { sheet });
  }
}

function integerProp(value: unknown, label: string, max: number): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) <= 0 || (value as number) > max) {
    failXlsx("XLSX_INVALID_INPUT", `Expected ${label} to be a positive integer up to ${max}.`, { [label]: value });
  }
  return value as number;
}

function dimensionProp(value: unknown, label: string, max: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > max) {
    failXlsx("XLSX_INVALID_INPUT", `Expected ${label} to be a number between 0 and ${max}.`, { [label]: value });
  }
  return value;
}

function assertAllowed(node: XlsxElement, allowed: readonly string[], parent: string): void {
  if (typeof node.type !== "string" || !allowed.includes(node.type)) {
    const received =
      typeof node.type === "string" ? node.type : typeof node.type === "function" ? node.type.name || "component" : "fragment";
    failXlsx("XLSX_INVALID_INPUT", `Unexpected child inside ${parent}; expected ${allowed.join(" or ")}.`, {
      parent,
      received
    });
  }
}

function assertNoText(element: XlsxElement, parent: string): void {
  for (const child of childrenOf(element)) {
    if (isElement(child) || isInvisible(child)) continue;
    failXlsx("XLSX_INVALID_INPUT", `Unexpected value inside ${parent}; expected child elements only.`, { parent });
  }
}

function pickStyle(props: Record<string, unknown>): XlsxCellStyle | undefined {
  const style: Record<string, unknown> = {};
  for (const key of STYLE_KEYS) {
    if (props[key] !== undefined) style[key] = props[key];
  }
  return Object.keys(style).length > 0 ? (style as XlsxCellStyle) : undefined;
}

function stringProp(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function rawCellValue(node: XlsxElement, children: readonly XlsxNode[]): XlsxCell {
  return (node.props.value ?? node.props.content ?? firstPrimitive(children)) as XlsxCell;
}

function cellFormula(node: XlsxElement, object: { formula?: string } | undefined): string | undefined {
  return stringProp(node.props.formula) ?? object?.formula;
}

function cellHref(node: XlsxElement, object: { href?: string } | undefined): string | undefined {
  return stringProp(node.props.href) ?? object?.href;
}

function cellParts(node: XlsxElement, children: readonly XlsxNode[]): Pick<CellModel, "value" | "formula" | "href"> {
  const raw = rawCellValue(node, children);
  const object = isCellObject(raw) ? raw : undefined;
  return {
    value: (object ? (object.value ?? null) : (raw ?? null)) as CellModel["value"],
    formula: cellFormula(node, object),
    href: cellHref(node, object)
  };
}

function buildCell(node: XlsxElement, sheet: string): { cell: CellModel; column?: number } {
  const cell = resolve(node);
  if (cell.type !== "cell") failXlsx("XLSX_INVALID_INPUT", "Expected a Cell element.", { sheet });
  const children = childrenOf(cell);
  for (const child of children) {
    if (isElement(child)) failXlsx("XLSX_INVALID_INPUT", "Cell children must be primitive values.", { sheet });
  }
  const column = integerProp(cell.props.column ?? cell.props.column_number, "column", XLSX_LIMITS.maxColumns);
  return {
    cell: {
      ...cellParts(cell, children),
      style: pickStyle(cell.props),
      colSpan: integerProp(cell.props.colSpan, "colSpan", XLSX_LIMITS.maxColumns),
      rowSpan: integerProp(cell.props.rowSpan, "rowSpan", XLSX_LIMITS.maxRows)
    },
    column
  };
}

type RowCursor = { cells: Array<CellModel | null>; reserved: Set<number>; column: number };

function assertSpanFree(cursor: RowCursor, column: number, end: number, sheet: string): void {
  if (cursor.cells[column - 1] || cursor.reserved.has(column)) {
    failXlsx("XLSX_INVALID_INPUT", "Two cells target the same position or a merged range.", { sheet, column });
  }
  for (let index = column + 1; index <= end; index += 1) {
    if (cursor.cells[index - 1] || cursor.reserved.has(index)) {
      failXlsx("XLSX_INVALID_INPUT", "Merged ranges cannot overlap another cell.", { sheet, column: index });
    }
  }
}

function placeCell(cursor: RowCursor, cell: CellModel, column: number, sheet: string): void {
  const end = column + (cell.colSpan ?? 1) - 1;
  if (end > XLSX_LIMITS.maxColumns) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Cell extends past the last worksheet column.", {
      sheet,
      column,
      colSpan: cell.colSpan
    });
  }
  assertSpanFree(cursor, column, end, sheet);
  while (cursor.cells.length < column - 1) cursor.cells.push(null);
  cursor.cells[column - 1] = cell;
  for (let index = column; index <= end; index += 1) cursor.reserved.add(index);
  cursor.column = Math.max(cursor.column, end + 1);
}

function buildRow(node: XlsxElement, sheet: string, budget: Budget): { row: RowModel; directRow?: number } {
  const row = resolve(node);
  if (row.type !== "row") failXlsx("XLSX_INVALID_INPUT", "Expected a Row element.", { sheet });
  const cursor: RowCursor = { cells: [], reserved: new Set(), column: 1 };

  for (const child of childrenOf(row)) {
    if (isElement(child)) {
      const cell = resolve(child);
      assertAllowed(cell, ["cell"], "Row");
      const built = buildCell(cell, sheet);
      placeCell(cursor, built.cell, built.column ?? cursor.column, sheet);
      continue;
    }
    if (isIgnored(child)) continue;
    if (!isPrimitive(child)) {
      failXlsx("XLSX_INVALID_INPUT", "Unexpected child inside Row; expected Cell elements or primitive values.", { sheet });
    }
    placeCell(cursor, { value: child }, cursor.column, sheet);
  }

  spend(budget, cursor.cells.length + 1, sheet);
  return {
    row: {
      cells: cursor.cells,
      height: dimensionProp(row.props.height, "height", MAX_ROW_HEIGHT),
      style: row.props.style as XlsxCellStyle | undefined
    },
    directRow: integerProp(row.props.row, "row", XLSX_LIMITS.maxRows)
  };
}

function buildColumns(sheet: XlsxElement, children: readonly XlsxElement[]): ColumnModel[] {
  const columns: ColumnModel[] = [];
  const declared = Array.isArray(sheet.props.columns) ? (sheet.props.columns as Array<number | ColumnProps>) : [];
  for (const column of declared) {
    const width = typeof column === "number" ? column : column.width;
    const style = typeof column === "number" ? undefined : column.style;
    columns.push({ width: dimensionProp(width, "width", MAX_COLUMN_WIDTH), style });
  }
  for (const node of children) {
    if (node.type !== "column") continue;
    columns.push({
      width: dimensionProp(node.props.width, "width", MAX_COLUMN_WIDTH),
      style: node.props.style as XlsxCellStyle | undefined
    });
  }
  return columns;
}

function directCells(children: readonly XlsxElement[], sheet: string): Map<number, XlsxElement[]> {
  const groups = new Map<number, XlsxElement[]>();
  for (const node of children) {
    if (node.type !== "cell") continue;
    const row = integerProp(node.props.row, "row", XLSX_LIMITS.maxRows);
    if (!row) failXlsx("XLSX_INVALID_INPUT", "A Cell placed directly in a Sheet needs a row number.", { sheet });
    const group = groups.get(row) ?? [];
    group.push(node);
    groups.set(row, group);
  }
  return groups;
}

function buildDirectRow(nodes: readonly XlsxElement[], sheet: string, budget: Budget): RowModel {
  const cursor: RowCursor = { cells: [], reserved: new Set(), column: 1 };
  for (const node of nodes) {
    const built = buildCell(node, sheet);
    placeCell(cursor, built.cell, built.column ?? cursor.column, sheet);
  }
  spend(budget, cursor.cells.length + 1, sheet);
  return { cells: cursor.cells };
}

function buildRows(sheet: XlsxElement, children: readonly XlsxElement[], budget: Budget): RowModel[] {
  const sheetName = String(sheet.props.name);
  const rows: RowModel[] = [];
  const assigned = new Set<number>();

  const assign = (rowNumber: number, row: RowModel): void => {
    if (rowNumber > XLSX_LIMITS.maxRows) {
      failXlsx("XLSX_LIMIT_EXCEEDED", "Row number exceeds the worksheet limits.", { sheet: sheetName, row: rowNumber });
    }
    if (assigned.has(rowNumber)) {
      failXlsx("XLSX_INVALID_INPUT", "Two rows target the same row number.", { sheet: sheetName, row: rowNumber });
    }
    while (rows.length < rowNumber) {
      rows.push({ cells: [] });
      spend(budget, 1, sheetName);
    }
    rows[rowNumber - 1] = row;
    assigned.add(rowNumber);
  };

  const direct = directCells(children, sheetName);
  for (const rowNumber of [...direct.keys()].sort((a, b) => a - b)) {
    assign(rowNumber, buildDirectRow(direct.get(rowNumber) ?? [], sheetName, budget));
  }
  for (const node of children) {
    if (node.type !== "row") continue;
    const built = buildRow(node, sheetName, budget);
    assign(built.directRow ?? rows.length + 1, built.row);
  }
  return rows;
}

function autoFilterRef(sheet: XlsxElement, rows: readonly RowModel[]): string | undefined {
  if (sheet.props.autoFilter === false || sheet.props.autoFilter === undefined) return undefined;
  if (typeof sheet.props.autoFilter === "string") return sheet.props.autoFilter;
  if (rows.length === 0) return undefined;
  const columns = rows.reduce((max, row) => Math.max(max, row.cells.length), 0);
  return columns > 0 ? `A1:${cellReference(rows.length, columns)}` : undefined;
}

function buildSheet(node: XlsxElement): SheetModel {
  const sheet = resolve(node);
  if (sheet.type !== "sheet") failXlsx("XLSX_INVALID_INPUT", "Expected a Sheet element.");
  const name = sheet.props.name;
  if (typeof name !== "string" || name.length === 0) {
    failXlsx("XLSX_INVALID_INPUT", "Expected every Sheet to have a name.");
  }
  assertNoText(sheet, "Sheet");
  const children = resolvedChildren(sheet);
  for (const child of children) assertAllowed(child, ["column", "row", "cell"], "Sheet");

  const rows = buildRows(sheet, children, { remaining: XLSX_LIMITS.maxCells });
  return {
    name,
    columns: buildColumns(sheet, children),
    rows,
    freeze: sheet.props.freeze as FreezeModel | undefined,
    autoFilter: autoFilterRef(sheet, rows),
    tabColor: sheet.props.tabColor as XlsxColor | undefined,
    pageSetup: sheet.props.pageSetup as XlsxPageSetup | undefined,
    dataValidations: sheet.props.dataValidations as XlsxDataValidation[] | undefined,
    images: Array.isArray(sheet.props.images)
      ? (sheet.props.images as XlsxImageInput[]).map(imageModel)
      : undefined
  };
}

function buildWorkbook(element: XlsxElement): WorkbookModel {
  const root = resolve(element);
  if (root.type !== "xlsx") failXlsx("XLSX_INVALID_INPUT", "Expected an Xlsx root element.");
  assertNoText(root, "Xlsx");
  const children = resolvedChildren(root);
  for (const child of children) assertAllowed(child, ["sheet"], "Xlsx");
  const sheets = children.map(buildSheet);
  if (sheets.length === 0) failXlsx("XLSX_INVALID_INPUT", "Expected at least one Sheet.");
  const title = typeof root.props.name === "string" ? root.props.name : undefined;
  const creator = typeof root.props.creator === "string" ? root.props.creator : undefined;
  return { sheets, title, creator };
}

/** Renders a declarative workbook into XLSX bytes with stored ZIP entries. */
export function renderXlsx(element: XlsxElement): Uint8Array {
  return writeWorkbook(buildWorkbook(element));
}

/** Renders a declarative workbook into XLSX bytes with DEFLATE-compressed entries. */
export async function renderXlsxCompressed(element: XlsxElement): Promise<Uint8Array> {
  return writeWorkbookCompressed(buildWorkbook(element));
}
