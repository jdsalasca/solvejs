import { failPdf } from "../errors.js";
import { PDF_LIMITS, PDF_PAGE_NUMBER_PRESETS, normalizeColor, nonNegative, positive, resolvePageSize, type PdfAlign, type PdfFontFamily, type PdfPageNumberOptions, type PdfWatermark, type PdfWatermarkInput } from "../shared.js";
import { layoutText, measureText, resolveFontKey, encodeForFont, type MeasuredLine } from "../pdf/fonts.js";
import { decodeImageSource, parseImage, type PdfImage } from "../pdf/images.js";
import type { PdfMetadata, PdfOp, PdfOutlineItem, PdfPageModel } from "../pdf/model.js";
import {
  bookmarkBlock,
  boxBlock,
  dividerBlock,
  imageBlock,
  pageStartBlock,
  rowBlock,
  spacerBlock,
  tableBlock,
  textBlock,
  type BookmarkBlock,
  type Block,
  type PageStartBlock,
  type TableCellLayout,
  type TableRowLayout
} from "./blocks.js";
import { resolveStyle, resolveWidth, type ResolvedStyle } from "./style.js";
import { iconBlock, iconNames, type PdfIconName } from "./icons.js";
import { chartBlock, type PdfChartDatum } from "./charts.js";
import { mathBlock } from "./math.js";
import { barcodeBlock } from "./barcode.js";
import { stampBlock } from "./stamp.js";
import { PDF_TEXT_PRESETS } from "../element.js";
import {
  Fragment,
  type PdfCell,
  type PdfElement,
  type PdfNode,
  type PdfPageDecorator,
  type PdfStyle,
  type PdfTableColumn
} from "./types.js";

type Edges = { top: number; right: number; bottom: number; left: number };
type LayoutContext = {
  imageCache: Map<string | Uint8Array, PdfImage>;
  blocks: number;
  cells: number;
  imageBytes: number;
  depth: number;
  /** Document/page-level style defaults, currently lineHeight. */
  defaults: Partial<PdfStyle>;
};
type LinkRect = { x: number; y: number; width: number; height: number; href: string };
type DrawTarget = { page: PdfPageModel; addLink: (link: LinkRect) => void };
type RootProps = Record<string, unknown>;

const MAX_LAYOUT_DEPTH = 256;

const STYLE_KEYS = [
  "color",
  "background",
  "fontSize",
  "fontFamily",
  "bold",
  "italic",
  "align",
  "lineHeight",
  "textTransform",
  "underline",
  "strike",
  "padding",
  "paddingX",
  "paddingY",
  "margin",
  "marginTop",
  "marginBottom",
  "border",
  "borderColor",
  "radius",
  "width",
  "height",
  "gap"
] as const;

const DECORATOR_GAP = 8;
const DEFAULT_MARGIN = 40;

function isElement(value: unknown): value is PdfElement {
  return typeof value === "object" && value !== null && "type" in value && "props" in value;
}

function resolveElement(element: PdfElement, depth = 0): PdfElement {
  if (depth > 100) failPdf("PDF_INVALID_INPUT", "Component tree is too deep.");
  if (typeof element.type !== "function") return element;
  const component = element.type as unknown as (props: Record<string, unknown>) => PdfElement;
  const result = component(element.props);
  if (!isElement(result)) failPdf("PDF_INVALID_INPUT", "A component must return an element.");
  return resolveElement(result, depth + 1);
}

// eslint-disable-next-line complexity -- iterative traversal with budget checks
function flatten(value: PdfNode | PdfNode[] | undefined): PdfNode[] {
  const output: PdfNode[] = [];
  const stack: unknown[] = [value];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined || node === null) continue;
    if (Array.isArray(node)) {
      for (let index = node.length - 1; index >= 0; index -= 1) stack.push(node[index]);
      continue;
    }
    if (isElement(node) && node.type === Fragment) {
      stack.push(node.props.children);
      continue;
    }
    output.push(node as PdfNode);
    if (output.length + stack.length > PDF_LIMITS.maxBlocks * 2) {
      failPdf("PDF_LIMIT_EXCEEDED", "Component tree has too many nodes.");
    }
  }
  return output;
}

function childrenOf(element: PdfElement): PdfNode[] {
  return flatten(element.props.children as PdfNode | PdfNode[] | undefined);
}

function primitiveText(value: string | number | boolean | Date): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const iso = value.toISOString();
    return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso.slice(0, 19).replace("T", " ");
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function valueText(value: unknown): string {
  if (typeof value === "object" && value !== null && !(value instanceof Date)) {
    failPdf("PDF_INVALID_INPUT", "Text value must be a string, number, boolean or Date.");
  }
  return primitiveText(value as string | number | boolean | Date);
}

function transformText(text: string, transform: "none" | "uppercase" | "lowercase" | "capitalize"): string {
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  if (transform === "capitalize") {
    return text.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
  }
  return text;
}

function childText(child: PdfNode): string {
  if (isElement(child)) failPdf("PDF_INVALID_INPUT", "Text children must be primitive values.");
  if (child === null || child === undefined || child === false) return "";
  return primitiveText(child as string | number | boolean | Date);
}

function textOf(element: PdfElement): string {
  const value = element.props.value;
  if (value !== undefined && value !== null) return valueText(value);
  return childrenOf(element).map(childText).join("");
}

function styleProps(props: Record<string, unknown>): PdfStyle {
  const style: Record<string, unknown> = {};
  for (const key of STYLE_KEYS) {
    if (props[key] !== undefined) style[key] = props[key];
  }
  return style as PdfStyle;
}

function objectMargin(value: Record<string, unknown>): Edges {
  return {
    top: nonNegative(value.top ?? 0, "margin.top"),
    right: nonNegative(value.right ?? 0, "margin.right"),
    bottom: nonNegative(value.bottom ?? 0, "margin.bottom"),
    left: nonNegative(value.left ?? 0, "margin.left")
  };
}

function resolveMargin(value: unknown): Edges {
  if (value === undefined) return { top: DEFAULT_MARGIN, right: DEFAULT_MARGIN, bottom: DEFAULT_MARGIN, left: DEFAULT_MARGIN };
  if (typeof value === "number") {
    const margin = nonNegative(value, "margin");
    return { top: margin, right: margin, bottom: margin, left: margin };
  }
  if (typeof value !== "object" || value === null) {
    failPdf("PDF_INVALID_INPUT", "Expected margin to be a number or an object.");
  }
  return objectMargin(value as Record<string, unknown>);
}

function withWidth(block: Block, width: number): Block {
  block.width = width;
  return block;
}

function innerWidth(style: ResolvedStyle, width: number): number {
  const inner = width - style.paddingLeft - style.paddingRight - style.borderWidth * 2;
  if (inner <= 0) failPdf("PDF_INVALID_INPUT", "Padding and borders leave no content width.", { width });
  return inner;
}

type DecoratorInput = {
  decorator: PdfPageDecorator | undefined;
  context: LayoutContext;
  width: number;
  page: number;
  total: number;
};

function decoratorBlocks(input: DecoratorInput): Block[] {
  if (input.decorator === undefined || input.decorator === null) return [];
  const node =
    typeof input.decorator === "function"
      ? input.decorator({ page: input.page, total: input.total })
      : input.decorator;
  return layoutNodes([node], input.width, input.context);
}

function stackHeight(blocks: readonly Block[]): number {
  if (blocks.length === 0) return 0;
  return (
    blocks.reduce((total, block) => total + block.marginTop + block.height + block.marginBottom, 0) +
    (blocks.length - 1) * DECORATOR_GAP
  );
}

type StackDraw = { blocks: readonly Block[]; target: DrawTarget; x: number; y: number; width: number };

function drawStack(input: StackDraw): void {
  let cursor = input.y;
  input.blocks.forEach((block, index) => {
    cursor += block.marginTop;
    block.draw(input.target, input.x, cursor, block.width ?? input.width);
    cursor += block.height + block.marginBottom;
    if (index < input.blocks.length - 1) cursor += DECORATOR_GAP;
  });
}

function clampLines(
  lines: MeasuredLine[],
  options: { maxLines: number; font: ReturnType<typeof resolveFontKey>; size: number; maxWidth: number }
): MeasuredLine[] {
  const { maxLines } = options;
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  const last = kept[maxLines - 1];
  let text = last.text;
  while (text.length > 0 && measureText(`${text}...`, options.font, options.size) > options.maxWidth) {
    text = text.slice(0, -1);
  }
  const clipped = `${text}...`;
  kept[maxLines - 1] = {
    text: clipped,
    bytes: encodeForFont(clipped, options.font),
    width: measureText(clipped, options.font, options.size)
  };
  return kept;
}

function layoutTextNode(
  node: PdfElement,
  available: number,
  context: LayoutContext,
  defaults: Partial<PdfStyle> = {}
): Block[] {
  const style = resolveStyle({ ...context.defaults, ...defaults, ...styleProps(node.props) });
  const width = resolveWidth(style.width, available);
  const font = resolveFontKey(style.fontFamily, style.bold, style.italic);
  const contentWidth = innerWidth(style, width);
  const text = transformText(textOf(node), style.textTransform);
  if (text.length > PDF_LIMITS.maxTextLength) {
    failPdf("PDF_LIMIT_EXCEEDED", "Text exceeds the configured length limit.", { length: text.length });
  }
  let lines = layoutText(text, font, style.fontSize, contentWidth);
  if (node.props.maxLines !== undefined) {
    const maxLines = positive(node.props.maxLines, "maxLines");
    if (!Number.isInteger(maxLines) || maxLines > 500) {
      failPdf("PDF_INVALID_INPUT", "maxLines must be an integer from 1 to 500.", { maxLines });
    }
    lines = clampLines(lines, { maxLines, font, size: style.fontSize, maxWidth: contentWidth });
  }
  const href = typeof node.props.href === "string" ? node.props.href : undefined;
  return [withWidth(textBlock({ lines, font, size: style.fontSize, style, href }), width)];
}

function enterContainer(context: LayoutContext): void {
  context.depth += 1;
  if (context.depth > MAX_LAYOUT_DEPTH) failPdf("PDF_LIMIT_EXCEEDED", "Component tree is too deep.");
}

function layoutView(node: PdfElement, available: number, context: LayoutContext): Block[] {
  const style = resolveStyle(styleProps(node.props));
  const width = resolveWidth(style.width, available);
  enterContainer(context);
  const children = layoutNodes(childrenOf(node), innerWidth(style, width), context);
  context.depth -= 1;
  return [withWidth(boxBlock(children, style, style.height), width)];
}

// eslint-disable-next-line max-lines-per-function -- column sizing, gap math and child validation stay together
function layoutRow(node: PdfElement, available: number, context: LayoutContext): Block[] {
  const style = resolveStyle(styleProps(node.props));
  const valign =
    node.props.valign === "middle" || node.props.valign === "bottom" ? (node.props.valign as "middle" | "bottom") : "top";
  const width = resolveWidth(style.width, available);
  const contentWidth = innerWidth(style, width);
  enterContainer(context);
  const children = childrenOf(node).map((child, index) => {
    if (!isElement(child)) {
      failPdf("PDF_INVALID_INPUT", "Row children must be components.", { child: index + 1 });
    }
    return resolveElement(child);
  });
  context.blocks += children.length;
  if (context.blocks > PDF_LIMITS.maxBlocks) {
    failPdf("PDF_LIMIT_EXCEEDED", "Component tree has too many nodes.", { blocks: context.blocks });
  }
  if (children.length === 0) {
    context.depth -= 1;
    return [withWidth(rowBlock([], style, valign), width)];
  }

  const styles = children.map((child) => resolveStyle(styleProps(child.props)));
  const gaps = Math.max(0, children.length - 1) * style.gap;
  const explicit = styles.reduce((total, item) => total + (item.width ? resolveWidth(item.width, contentWidth) : 0), 0);
  const flexible = styles.filter((item) => item.width === undefined).length;
  const remaining = contentWidth - gaps - explicit;
  if (remaining < -0.01) failPdf("PDF_INVALID_INPUT", "Row children exceed the available width.", { width: contentWidth });

  const items = children.map((child, index) => {
    const childStyle = styles[index];
    const childWidth = childStyle.width
      ? resolveWidth(childStyle.width, contentWidth)
      : flexible > 0
        ? Math.max(0, remaining / flexible)
        : contentWidth;
    const layoutWidth = childStyle.width ? contentWidth : childWidth;
    const blocks = layoutElement(child, layoutWidth, context);
    if (blocks.length > 1) {
      failPdf("PDF_INVALID_INPUT", "Row children must produce a single layout block.", { child: String(index + 1) });
    }
    const block = blocks[0] ?? spacerBlock(0);
    return { block, width: childWidth };
  });
  context.depth -= 1;
  return [withWidth(rowBlock(items, style, valign), width)];
}

function cellOptions(value: PdfCell): { value: PdfCell; align?: PdfAlign; color?: string; bold?: boolean; background?: string } {
  if (
    typeof value === "object" &&
    value !== null &&
    !(value instanceof Date) &&
    !(value instanceof Uint8Array) &&
    "value" in value
  ) {
    return value as { value: PdfCell; align?: PdfAlign; color?: string; bold?: boolean; background?: string };
  }
  return { value };
}

function cellText(value: PdfCell): string {
  const raw = cellOptions(value).value;
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "object" && !(raw instanceof Date)) return "";
  return primitiveText(raw as string | number | boolean | Date);
}

type TableOptions = {
  columns: PdfTableColumn[];
  widths: number[];
  style: ResolvedStyle;
  fontSize: number;
  fontFamily: PdfFontFamily;
  cellPadding: number;
  lineHeight: number;
  headerColor: string;
};

function cellLayout(value: PdfCell, column: PdfTableColumn, options: TableOptions, isHeader: boolean): TableCellLayout {
  const parsed = cellOptions(value);
  const font = resolveFontKey(options.fontFamily, isHeader || parsed.bold === true, false);
  const width = options.widths[options.columns.indexOf(column)] - options.cellPadding * 2;
  const text = cellText(value);
  if (text.length > PDF_LIMITS.maxTextLength) {
    failPdf("PDF_LIMIT_EXCEEDED", "Table cell text exceeds the configured length limit.", { length: text.length });
  }
  const lines = layoutText(text, font, options.fontSize, Math.max(1, width));
  return {
    lines,
    align: parsed.align ?? column.align ?? options.style.align,
    color: isHeader ? options.headerColor : normalizeColor(parsed.color) ?? options.style.color,
    font,
    background: normalizeColor(parsed.background)
  };
}

function tableRow(values: PdfCell[], options: TableOptions, isHeader: boolean): TableRowLayout {
  const cells = options.columns.map((column, index) => cellLayout(values[index] ?? null, column, options, isHeader));
  const lineHeight = options.fontSize * options.lineHeight;
  const height = Math.max(...cells.map((cell) => cell.lines.length * lineHeight + options.cellPadding * 2));
  return { cells, height };
}

function columnWidths(columns: PdfTableColumn[], available: number): number[] {
  if (!Array.isArray(columns) || columns.length === 0) {
    failPdf("PDF_INVALID_INPUT", "Expected a table with at least one column.");
  }
  const explicit = columns.map((column) => (column.width === undefined ? 0 : positive(column.width, "column.width")));
  const fixed = explicit.reduce((total, width) => total + width, 0);
  const flexible = columns.filter((column) => column.width === undefined).length;
  if (fixed > available + 0.01) {
    failPdf("PDF_INVALID_INPUT", "Table columns exceed the available width.", { width: available });
  }
  const share = flexible > 0 ? (available - fixed) / flexible : 0;
  return explicit.map((width) => (width > 0 ? width : share));
}

function tableRows(
  rows: Array<Record<string, PdfCell> | PdfCell[]>,
  columns: PdfTableColumn[],
  options: TableOptions
): TableRowLayout[] {
  return rows.map((row) => {
    const values = columns.map((column, index) =>
      Array.isArray(row) ? row[index] : (row as Record<string, PdfCell>)[column.key]
    );
    return tableRow(values, options, false);
  });
}

function tableOptionsOf(
  props: Record<string, unknown>,
  style: ResolvedStyle,
  columns: PdfTableColumn[],
  widths: number[]
): TableOptions {
  return {
    columns,
    widths,
    style,
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    cellPadding: nonNegative(props.cellPadding ?? 6, "cellPadding"),
    lineHeight: style.lineHeight,
    headerColor: normalizeColor(props.headerColor as string | undefined) ?? "#FFFFFF"
  };
}

function tableHeaderOf(
  props: Record<string, unknown>,
  columns: PdfTableColumn[],
  options: TableOptions
): TableRowLayout | undefined {
  if (props.header === false) return undefined;
  if (!columns.some((column) => column.header !== undefined)) return undefined;
  return tableRow(
    columns.map((column) => column.header ?? ""),
    options,
    true
  );
}

function tableRowsOf(
  props: Record<string, unknown>,
  columns: PdfTableColumn[],
  options: TableOptions
): TableRowLayout[] {
  const rows = props.rows as Array<Record<string, PdfCell> | PdfCell[]>;
  if (!Array.isArray(rows)) failPdf("PDF_INVALID_INPUT", "Expected table rows to be an array.");
  if (rows.length > PDF_LIMITS.maxTableRows) failPdf("PDF_LIMIT_EXCEEDED", "Table has too many rows.");
  return tableRows(rows, columns, options);
}

function layoutTable(node: PdfElement, available: number, context: LayoutContext): Block[] {
  const props = node.props;
  const style = resolveStyle({ ...context.defaults, ...styleProps(props) });
  const width = resolveWidth(style.width, available);
  const columns = props.columns as PdfTableColumn[];
  const widths = columnWidths(columns, width);
  const rowCount = Array.isArray(props.rows) ? (props.rows as unknown[]).length : 0;
  context.cells += rowCount * columns.length + columns.length;
  if (context.cells > PDF_LIMITS.maxTableCells) {
    failPdf("PDF_LIMIT_EXCEEDED", "Document has too many table cells.", { cells: context.cells });
  }
  const options = tableOptionsOf(props, style, columns, widths);
  const block = tableBlock({
    columnWidths: widths,
    header: tableHeaderOf(props, columns, options),
    rows: tableRowsOf(props, columns, options),
    style,
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    cellPadding: options.cellPadding,
    lineHeight: style.lineHeight,
    borderWidth: style.borderWidth,
    borderColor: style.borderColor,
    headerBackground: normalizeColor(props.headerBackground as string | undefined) ?? "#0F172A",
    headerColor: options.headerColor,
    zebra: props.zebra !== false,
    zebraColor: normalizeColor(props.zebraColor as string | undefined) ?? "#F8FAFC"
  });
  block.width = width;
  return [block];
}

function layoutImage(node: PdfElement, available: number, context: LayoutContext): Block[] {
  const src = node.props.src;
  if (src === undefined) failPdf("PDF_INVALID_INPUT", "Image requires a src prop.");
  if (typeof src !== "string" && !(src instanceof Uint8Array)) {
    failPdf("PDF_INVALID_INPUT", "Image src must be bytes, a data URL or base64.");
  }
  let image: PdfImage | undefined = context.imageCache.get(src);
  if (!image) {
    image = parseImage(decodeImageSource(src));
    context.imageBytes += image.data.length;
    if (context.imageBytes > PDF_LIMITS.maxTotalImageBytes) {
      failPdf("PDF_LIMIT_EXCEEDED", "Document images exceed the aggregate byte limit.", {
        bytes: context.imageBytes
      });
    }
    context.imageCache.set(src, image);
  }
  const style = resolveStyle({
    background: node.props.background as string | undefined,
    marginTop: node.props.marginTop as number | undefined,
    marginBottom: node.props.marginBottom as number | undefined
  });
  const width = node.props.width === undefined ? available : positive(node.props.width, "width");
  const height = node.props.height === undefined ? (width * image.height) / image.width : positive(node.props.height, "height");
  return [withWidth(imageBlock(image, width, height, style), width)];
}

// eslint-disable-next-line complexity -- icon prop validation and defaults
function layoutIcon(node: PdfElement, available: number): Block[] {
  const name = node.props.name;
  if (typeof name !== "string" || !iconNames().includes(name as PdfIconName)) {
    failPdf("PDF_INVALID_INPUT", "Icon requires a supported name.", { name });
  }
  const size = node.props.size === undefined ? 16 : positive(node.props.size, "size");
  if (size > 256) failPdf("PDF_INVALID_INPUT", "Icon size cannot exceed 256.", { size });
  const strokeWidth = node.props.strokeWidth === undefined ? 2 : positive(node.props.strokeWidth, "strokeWidth");
  const color = normalizeColor(node.props.color as string | undefined) ?? "#2563EB";
  const marginTop = nonNegative(node.props.marginTop ?? 0, "marginTop");
  const marginBottom = nonNegative(node.props.marginBottom ?? 0, "marginBottom");
  return [withWidth(iconBlock(name as PdfIconName, size, color, strokeWidth, marginTop, marginBottom), available)];
}

function layoutChart(node: PdfElement, available: number, context: LayoutContext, kind: "bar" | "line" | "pie"): Block[] {
  const style = resolveStyle({ ...context.defaults, ...styleProps(node.props) });
  const width = resolveWidth(style.width, available);
  const colors = Array.isArray(node.props.colors)
    ? (node.props.colors as string[]).map((color) => normalizeColor(color) ?? color)
    : undefined;
  const block = chartBlock(kind, node.props.data as PdfChartDatum[], {
    title: typeof node.props.title === "string" ? node.props.title : undefined,
    width,
    height: style.height,
    colors,
    showValues: node.props.showValues as boolean | undefined,
    valueFormat: node.props.valueFormat as ((value: number) => string) | undefined,
    fontSize: Math.min(style.fontSize, 12),
    padding: style.paddingTop || 14
  }, style);
  return [withWidth(block, width)];
}

function layoutFormula(node: PdfElement, available: number, context: LayoutContext): Block[] {
  const style = resolveStyle({ ...context.defaults, ...styleProps(node.props) });
  const tex = node.props.tex;
  if (typeof tex !== "string") failPdf("PDF_INVALID_INPUT", "Formula requires a tex string.");
  return [mathBlock(tex, style, available)];
}

function layoutBarcode(node: PdfElement): Block[] {
  const value = node.props.value;
  if (typeof value !== "string") failPdf("PDF_INVALID_INPUT", "Barcode requires a string value.");
  return [
    barcodeBlock(value, {
      width: node.props.width === undefined ? undefined : positive(node.props.width, "width"),
      height: node.props.height === undefined ? undefined : positive(node.props.height, "height"),
      color: normalizeColor(node.props.color as string | undefined),
      showText: node.props.showText as boolean | undefined
    })
  ];
}

function layoutStamp(node: PdfElement): Block[] {
  const text = node.props.text;
  if (typeof text !== "string") failPdf("PDF_INVALID_INPUT", "Stamp requires a text string.");
  return [
    stampBlock(text, {
      color: normalizeColor(node.props.color as string | undefined),
      background: normalizeColor(node.props.background as string | undefined),
      borderColor: normalizeColor(node.props.borderColor as string | undefined),
      fontFamily: node.props.fontFamily as PdfFontFamily | undefined,
      bold: node.props.bold as boolean | undefined,
      italic: node.props.italic as boolean | undefined,
      uppercase: node.props.uppercase as boolean | undefined,
      angle: node.props.angle as number | undefined,
      fontSize: node.props.fontSize === undefined ? undefined : positive(node.props.fontSize, "fontSize"),
      borderWidth: node.props.borderWidth === undefined ? undefined : positive(node.props.borderWidth, "borderWidth"),
      padding: node.props.padding === undefined ? undefined : positive(node.props.padding, "padding"),
      opacity: node.props.opacity as number | undefined
    })
  ];
}

function layoutDivider(node: PdfElement, available: number): Block[] {
  const color = normalizeColor(node.props.color as string | undefined) ?? "#E2E8F0";
  const width = node.props.width === undefined ? 1 : positive(node.props.width, "width");
  const dash = Array.isArray(node.props.dash)
    ? (node.props.dash as number[]).map((value) => nonNegative(value, "dash"))
    : undefined;
  return [
    withWidth(
      dividerBlock(
        color,
        width,
        nonNegative(node.props.marginTop ?? 0, "marginTop"),
        nonNegative(node.props.marginBottom ?? 0, "marginBottom"),
        dash
      ),
      available
    )
  ];
}

function layoutSpacer(node: PdfElement, available: number): Block[] {
  return [
    withWidth(
      spacerBlock(
        node.props.height === undefined ? 12 : nonNegative(node.props.height, "height"),
        nonNegative(node.props.marginTop ?? 0, "marginTop"),
        nonNegative(node.props.marginBottom ?? 0, "marginBottom")
      ),
      available
    )
  ];
}

// eslint-disable-next-line complexity -- title/level validation
function layoutBookmark(node: PdfElement): Block[] {
  const title = node.props.title;
  if (typeof title !== "string" || title.trim().length === 0) {
    failPdf("PDF_INVALID_INPUT", "Bookmark requires a non-empty title.");
  }
  if (title.length > 300) {
    failPdf("PDF_LIMIT_EXCEEDED", "Bookmark title exceeds the configured limit.", { length: title.length });
  }
  const level = node.props.level ?? 1;
  if (typeof level !== "number" || !Number.isInteger(level) || level < 1 || level > 6) {
    failPdf("PDF_INVALID_INPUT", "Bookmark level must be an integer from 1 to 6.", { level });
  }
  return [bookmarkBlock(title.trim(), level)];
}

function linkBlock(block: Block, href: string): Block {
  const wrapped: Block = {
    height: block.height,
    width: block.width,
    marginTop: block.marginTop,
    marginBottom: block.marginBottom,
    draw(target, x, y, width) {
      block.draw(target, x, y, width);
      target.addLink({ x, y, width: block.width ?? width, height: block.height, href });
    }
  };
  if (block.split) {
    wrapped.split = (maxHeight) => {
      const parts = block.split?.(maxHeight);
      return parts ? [linkBlock(parts[0], href), linkBlock(parts[1], href)] : null;
    };
  }
  return wrapped;
}

function layoutLink(node: PdfElement, available: number, context: LayoutContext): Block[] {
  const href = node.props.href;
  if (typeof href !== "string" || href.length === 0) failPdf("PDF_INVALID_INPUT", "Link requires a non-empty href.");
  if (!/^https?:\/\/|^mailto:|^tel:/i.test(href)) {
    failPdf("PDF_INVALID_INPUT", "Link targets must be http(s), mailto or tel URLs.", { href });
  }
  return layoutNodes(childrenOf(node), available, context).map((block) => linkBlock(block, href));
}

function presetStyle(preset: unknown): Partial<PdfStyle> {
  if (preset === undefined) return {};
  if (typeof preset !== "string" || !(preset in PDF_TEXT_PRESETS)) {
    failPdf("PDF_INVALID_INPUT", "Unknown text preset.", { preset });
  }
  return PDF_TEXT_PRESETS[preset as keyof typeof PDF_TEXT_PRESETS];
}

function headingDefaults(level: unknown): Partial<PdfStyle> {
  if (level === 2) return { fontSize: 22, bold: true, marginBottom: 8, lineHeight: 1.25 };
  if (level === 3) return { fontSize: 18, bold: true, marginBottom: 6, lineHeight: 1.3 };
  return { fontSize: 28, bold: true, marginBottom: 10, lineHeight: 1.2 };
}

function layoutHeading(node: PdfElement, available: number, context: LayoutContext): Block[] {
  const defaults = { ...headingDefaults(node.props.level), ...presetStyle(node.props.preset) };
  if (context.defaults.lineHeight !== undefined) defaults.lineHeight = context.defaults.lineHeight;
  return layoutTextNode(node, available, context, defaults);
}

function layoutParagraph(node: PdfElement, available: number, context: LayoutContext): Block[] {
  return layoutTextNode(node, available, context, {
    lineHeight: context.defaults.lineHeight ?? 1.55,
    marginBottom: 8,
    ...presetStyle(node.props.preset)
  });
}

function layoutPage(node: PdfElement, available: number, context: LayoutContext): Block[] {
  const previous = context.defaults;
  if (node.props.lineHeight !== undefined) {
    const lineHeight = resolveStyle({ lineHeight: node.props.lineHeight as number }).lineHeight;
    context.defaults = { ...previous, lineHeight };
  }
  const children = layoutNodes(childrenOf(node), available, context);
  context.defaults = previous;
  return [pageStartBlock(node.props.watermark as PdfWatermarkInput | undefined), ...children];
}

type NodeHandler = (node: PdfElement, available: number, context: LayoutContext) => Block[];

const NODE_HANDLERS: Record<string, NodeHandler> = {
  view: layoutView,
  row: layoutRow,
  text: (node, available, context) => layoutTextNode(node, available, context),
  heading: layoutHeading,
  paragraph: layoutParagraph,
  table: (node, available, context) => layoutTable(node, available, context),
  image: layoutImage,
  icon: layoutIcon,
  "bar-chart": (node, available, context) => layoutChart(node, available, context, "bar"),
  "line-chart": (node, available, context) => layoutChart(node, available, context, "line"),
  "pie-chart": (node, available, context) => layoutChart(node, available, context, "pie"),
  formula: layoutFormula,
  barcode: layoutBarcode,
  stamp: layoutStamp,
  divider: (node, available) => layoutDivider(node, available),
  spacer: (node, available) => layoutSpacer(node, available),
  bookmark: (node) => layoutBookmark(node),
  link: layoutLink,
  page: layoutPage
};

function layoutNode(node: PdfNode, available: number, context: LayoutContext): Block[] {
  if (!isElement(node)) {
    if (typeof node === "string" && node.trim() === "") return [];
    failPdf("PDF_INVALID_INPUT", "Expected a component element.");
  }
  const element = resolveElement(node);
  const handler = NODE_HANDLERS[String(element.type)];
  if (!handler) failPdf("PDF_INVALID_INPUT", `Unknown PDF component: ${String(element.type)}.`);
  return handler(element, available, context);
}

function layoutElement(element: PdfElement, available: number, context: LayoutContext): Block[] {
  return layoutNode(element, available, context);
}

function layoutNodes(nodes: readonly PdfNode[], available: number, context: LayoutContext): Block[] {
  context.blocks += nodes.length;
  if (context.blocks > PDF_LIMITS.maxBlocks) {
    failPdf("PDF_LIMIT_EXCEEDED", "Component tree has too many nodes.", { blocks: context.blocks });
  }
  return nodes.flatMap((node) => layoutNode(node, available, context));
}

type PageLayout = {
  width: number;
  height: number;
  margin: Edges;
  contentWidth: number;
  contentTop: number;
  contentBottom: number;
  headerReserved: number;
  footerReserved: number;
  background?: string;
};

function newPage(layout: PageLayout, watermark?: PdfWatermarkInput): PdfPageModel {
  const page: PdfPageModel = { width: layout.width, height: layout.height, ops: [], links: [] };
  if (watermark !== undefined) page.watermark = watermark;
  if (layout.background) {
    page.ops.push({ kind: "rect", x: 0, y: 0, width: layout.width, height: layout.height, fill: layout.background });
  }
  return page;
}

function targetOf(page: PdfPageModel): DrawTarget {
  return {
    page,
    addLink(link) {
      page.links.push(link);
    }
  };
}

type PageState = {
  pages: PdfPageModel[];
  current: PdfPageModel;
  y: number;
  layout: PageLayout;
  queue: Block[];
  watermark?: PdfWatermarkInput;
  rootWatermark?: PdfWatermarkInput;
};

function nextPage(state: PageState): void {
  if (state.pages.length >= PDF_LIMITS.maxPages) {
    failPdf("PDF_LIMIT_EXCEEDED", "Document has too many pages.", { pages: state.pages.length });
  }
  state.current = newPage(state.layout, state.watermark);
  state.pages.push(state.current);
  state.y = state.layout.contentTop;
}

function placeBlock(block: Block, state: PageState): void {
  let placed = false;
  let fresh = false;
  while (!placed) {
    const available = state.layout.contentBottom - state.y;
    if (block.height <= available) {
      block.draw(targetOf(state.current), state.layout.margin.left, state.y, block.width ?? state.layout.contentWidth);
      state.y += block.height + block.marginBottom;
      placed = true;
      continue;
    }
    const split = block.split?.(available);
    if (split) {
      const [head, tail] = split;
      head.draw(targetOf(state.current), state.layout.margin.left, state.y, head.width ?? state.layout.contentWidth);
      state.y += head.height + head.marginBottom;
      state.queue.unshift(tail);
      nextPage(state);
      placed = true;
      continue;
    }
    if (fresh) {
      failPdf("PDF_LIMIT_EXCEEDED", "A block cannot fit or split on a fresh page.", { height: block.height });
    }
    nextPage(state);
    fresh = true;
  }
}

function pageHasContent(page: PdfPageModel, layout: PageLayout): boolean {
  return page.ops.length > (layout.background ? 1 : 0);
}

// eslint-disable-next-line complexity, max-lines-per-function -- page breaks and bookmark markers share one loop
function paginate(
  blocks: Block[],
  layout: PageLayout,
  outline: PdfOutlineItem[],
  watermark?: PdfWatermarkInput
): PdfPageModel[] {
  const pages = [newPage(layout, watermark)];
  const state: PageState = { pages, current: pages[0], y: layout.contentTop, layout, queue: [...blocks], watermark, rootWatermark: watermark };
  while (state.queue.length > 0) {
    const block = state.queue.shift();
    if (!block) break;
    if (block.kind === "page-start") {
      const start = block as PageStartBlock;
      state.watermark = start.watermark === undefined ? state.rootWatermark : start.watermark;
      if (pageHasContent(state.current, layout) || state.y > layout.contentTop) nextPage(state);
      else {
        state.current.watermark = state.watermark;
        state.y = layout.contentTop;
      }
      continue;
    }
    if (block.kind === "break") {
      if (pageHasContent(state.current, layout) || state.y > layout.contentTop) nextPage(state);
      else state.y = layout.contentTop;
      continue;
    }
    if (block.kind === "bookmark") {
      const bookmark = block as BookmarkBlock;
      outline.push({
        title: bookmark.title,
        level: bookmark.level,
        page: state.pages.length - 1,
        y: state.y
      });
      if (outline.length > PDF_LIMITS.maxOutlineItems) {
        failPdf("PDF_LIMIT_EXCEEDED", "Document has too many bookmarks.", { bookmarks: outline.length });
      }
      continue;
    }
    if (block.height <= 0) continue;
    state.y += block.marginTop;
    placeBlock(block, state);
  }
  return pages;
}

function metadataOf(props: RootProps): PdfMetadata {
  const metadata: PdfMetadata = {};
  for (const key of ["title", "author", "subject", "keywords", "creator", "producer"] as const) {
    const value = props[key];
    if (typeof value === "string" && value.length > 0) metadata[key] = value;
  }
  return metadata;
}

function pageLayoutOf(
  props: RootProps,
  context: LayoutContext,
  reserved?: { header: number; footer: number }
): PageLayout {
  const size = resolvePageSize(props.page as Parameters<typeof resolvePageSize>[0]);
  const margin = resolveMargin(props.margin);
  const contentWidth = size.width - margin.left - margin.right;
  if (contentWidth <= 0) failPdf("PDF_INVALID_INPUT", "Margins leave no printable width.");
  const sampleHeader = stackHeight(
    decoratorBlocks({ decorator: props.header as PdfPageDecorator | undefined, context, width: contentWidth, page: 1, total: 1 })
  );
  const sampleFooter = stackHeight(
    decoratorBlocks({ decorator: props.footer as PdfPageDecorator | undefined, context, width: contentWidth, page: 1, total: 1 })
  );
  const headerHeight = Math.max(sampleHeader, reserved?.header ?? 0);
  const footerHeight = Math.max(sampleFooter, reserved?.footer ?? 0);
  return {
    width: size.width,
    height: size.height,
    margin,
    contentWidth,
    contentTop: margin.top + headerHeight + (headerHeight > 0 ? DECORATOR_GAP : 0),
    contentBottom: size.height - margin.bottom - footerHeight - (footerHeight > 0 ? DECORATOR_GAP : 0),
    headerReserved: headerHeight,
    footerReserved: footerHeight,
    background: normalizeColor(props.background as string | undefined)
  };
}

type DecoratorMeasure = { decorator: PdfPageDecorator | undefined; context: LayoutContext; width: number; page: number; total: number };

function decoratorHeight(input: DecoratorMeasure): number {
  return stackHeight(
    decoratorBlocks({
      decorator: input.decorator,
      context: input.context,
      width: input.width,
      page: input.page,
      total: input.total
    })
  );
}

function measureDecoratorHeights(
  props: RootProps,
  context: LayoutContext,
  width: number,
  total: number
): { header: number; footer: number } {
  const header = props.header as PdfPageDecorator | undefined;
  const footer = props.footer as PdfPageDecorator | undefined;
  const pageCount = Math.max(1, total);
  let headerHeight = 0;
  let footerHeight = 0;
  for (let page = 1; page <= pageCount; page += 1) {
    headerHeight = Math.max(headerHeight, decoratorHeight({ decorator: header, context, width, page, total }));
    footerHeight = Math.max(footerHeight, decoratorHeight({ decorator: footer, context, width, page, total }));
  }
  return { header: headerHeight, footer: footerHeight };
}

function resolveWatermark(
  input: PdfWatermarkInput | undefined,
  page: number,
  total: number
): PdfWatermark | undefined {
  if (!input) return undefined;
  if (typeof input === "function") {
    const result = input({ page, total });
    return result === false ? undefined : result;
  }
  return input;
}

type WatermarkLayer = {
  watermark: PdfWatermark;
  page: PdfPageModel;
  context: LayoutContext;
  angle: number;
  opacity: number;
};

// eslint-disable-next-line complexity -- image cache, sizing and rotation in one place
function watermarkImageOp({ watermark, page, context, angle, opacity }: WatermarkLayer): PdfOp {
  const src = watermark.image;
  if (src === undefined) failPdf("PDF_INVALID_INPUT", "Watermark image is missing.");
  let image: PdfImage | undefined = context.imageCache.get(src);
  if (!image) {
    image = parseImage(decodeImageSource(src));
    context.imageBytes += image.data.length;
    if (context.imageBytes > PDF_LIMITS.maxTotalImageBytes) {
      failPdf("PDF_LIMIT_EXCEEDED", "Document images exceed the aggregate byte limit.", { bytes: context.imageBytes });
    }
    context.imageCache.set(src, image);
  }
  const width = watermark.imageWidth === undefined ? undefined : positive(watermark.imageWidth, "imageWidth");
  const height = watermark.imageHeight === undefined ? undefined : positive(watermark.imageHeight, "imageHeight");
  const natural = image.width / image.height;
  let drawWidth = width ?? (height === undefined ? page.width * 0.4 : height * natural);
  let drawHeight = height ?? drawWidth / natural;
  if (drawWidth > page.width || drawHeight > page.height) {
    const scale = Math.min(page.width / drawWidth, page.height / drawHeight);
    drawWidth *= scale;
    drawHeight *= scale;
  }
  const rotate: number | undefined = angle === 0 ? undefined : angle;
  return {
    kind: "image",
    x: (page.width - drawWidth) / 2,
    y: (page.height - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
    image,
    ...(rotate === undefined ? {} : { rotate }),
    opacity
  };
}

function watermarkTextOp({ watermark, page, angle, opacity }: WatermarkLayer): PdfOp {
  const text = watermark.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    failPdf("PDF_INVALID_INPUT", "Watermark text must be a non-empty string.");
  }
  if (text.length > 500) failPdf("PDF_LIMIT_EXCEEDED", "Watermark text is too long.", { length: text.length });
  const size = watermark.fontSize === undefined ? 64 : positive(watermark.fontSize, "fontSize");
  const font = resolveFontKey(watermark.fontFamily ?? "helvetica", watermark.bold === true, false);
  const width = measureText(text, font, size);
  return {
    kind: "text",
    x: (page.width - width) / 2,
    y: page.height / 2 + size * 0.35,
    text,
    font,
    size,
    color: normalizeColor(watermark.color) ?? "#E2E8F0",
    rotate: angle,
    opacity
  };
}

// eslint-disable-next-line complexity -- watermark defaults and validation
function watermarkOps(watermark: PdfWatermark, page: PdfPageModel, context: LayoutContext): PdfOp[] {
  const opacity = watermark.opacity === undefined ? 0.12 : watermark.opacity;
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    failPdf("PDF_INVALID_INPUT", "Watermark opacity must be between 0 and 1.", { opacity });
  }
  const angle = watermark.angle === undefined ? (watermark.image !== undefined ? 0 : -35) : watermark.angle;
  if (!Number.isFinite(angle) || angle < -180 || angle > 180) {
    failPdf("PDF_INVALID_INPUT", "Watermark angle must be between -180 and 180.", { angle });
  }
  const layer = { watermark, page, context, angle, opacity };
  const ops: PdfOp[] = [];
  if (watermark.image !== undefined) ops.push(watermarkImageOp(layer));
  if (watermark.text !== undefined) ops.push(watermarkTextOp(layer));
  if (ops.length === 0) failPdf("PDF_INVALID_INPUT", "Watermark requires text, a PNG/JPEG image, or both.");
  return ops;
}

function decorate(
  pages: PdfPageModel[],
  props: RootProps,
  layout: PageLayout,
  context: LayoutContext
): void {
  const header = props.header as PdfPageDecorator | undefined;
  const footer = props.footer as PdfPageDecorator | undefined;
  const backgroundOffset = layout.background ? 1 : 0;
  pages.forEach((page, index) => {
    const total = pages.length;
    const target = targetOf(page);
    const watermark = resolveWatermark(page.watermark, index + 1, total);
    if (watermark) page.ops.splice(backgroundOffset, 0, ...watermarkOps(watermark, page, context));
    const headerBlocks = decoratorBlocks({ decorator: header, context, width: layout.contentWidth, page: index + 1, total });
    drawStack({ blocks: headerBlocks, target, x: layout.margin.left, y: layout.margin.top, width: layout.contentWidth });
    const footerBlocks = decoratorBlocks({ decorator: footer, context, width: layout.contentWidth, page: index + 1, total });
    drawStack({
      blocks: footerBlocks,
      target,
      x: layout.margin.left,
      y: layout.height - layout.margin.bottom - stackHeight(footerBlocks),
      width: layout.contentWidth
    });
  });
}

function pageNumberFooter(options: PdfPageNumberOptions): PdfPageDecorator {
  const preset = options.preset ? PDF_PAGE_NUMBER_PRESETS[options.preset] : undefined;
  const merged = { ...(preset ?? {}), ...options };
  const align = merged.align ?? "right";
  const fontSize = merged.fontSize ?? 8;
  const color = merged.color ?? "#64748B";
  const value = (page: number, total: number) =>
    merged.format === "page-of-total"
      ? `${merged.prefix ?? ""}${page}${merged.separator ?? " / "}${total}`
      : `${merged.prefix ?? ""}${page}`;
  return ({ page, total }) => {
    const text: PdfElement = {
      type: "text",
      props: {
        value: value(page, total),
        align,
        fontSize,
        color,
        italic: merged.italic === true,
        bold: merged.bold === true,
        fontFamily: merged.italic ? "times" : "helvetica"
      }
    };
    if (!merged.rule) return text;
    return {
      type: "view",
      props: {
        children: [text, { type: "divider", props: { color, width: 0.5, marginTop: 2 } }]
      }
    };
  };
}

function withPageNumbers(props: RootProps): RootProps {
  if (!props.pageNumbers || props.footer) return props;
  return { ...props, footer: pageNumberFooter(props.pageNumbers as PdfPageNumberOptions) };
}

/** Lays out a declarative PDF component tree into pages. */
// eslint-disable-next-line complexity, max-lines-per-function -- pagination and decorator convergence state machine
function buildDocument(element: PdfElement): {
  document: { pages: PdfPageModel[]; metadata: PdfMetadata; outline?: PdfOutlineItem[] };
  layout: PageLayout;
} {
  const root = resolveElement(element);
  if (root.type !== "pdf") failPdf("PDF_INVALID_INPUT", "Expected a Pdf root element.");
  const props = withPageNumbers(root.props);
  const context: LayoutContext = {
    imageCache: new Map(),
    blocks: 0,
    cells: 0,
    imageBytes: 0,
    depth: 0,
    defaults: props.lineHeight === undefined ? {} : { lineHeight: resolveStyle({ lineHeight: props.lineHeight as number }).lineHeight }
  };
  let layout = pageLayoutOf(props, context);
  if (layout.contentBottom <= layout.contentTop) failPdf("PDF_INVALID_INPUT", "Margins and header/footer leave no body height.");
  const blocks = layoutNodes(childrenOf(root), layout.contentWidth, context);
  let outline: PdfOutlineItem[] = [];
  let pages = paginate(blocks, layout, outline, props.watermark as PdfWatermarkInput | undefined);
  let measured = measureDecoratorHeights(props, context, layout.contentWidth, pages.length);
  for (let pass = 0; pass < 4; pass += 1) {
    if (measured.header <= layout.headerReserved && measured.footer <= layout.footerReserved) break;
    layout = pageLayoutOf(props, context, measured);
    if (layout.contentBottom <= layout.contentTop) {
      failPdf("PDF_INVALID_INPUT", "Margins and header/footer leave no body height.");
    }
    outline = [];
    pages = paginate(blocks, layout, outline, props.watermark as PdfWatermarkInput | undefined);
    measured = measureDecoratorHeights(props, context, layout.contentWidth, pages.length);
  }
  if (measured.header > layout.headerReserved || measured.footer > layout.footerReserved) {
    failPdf("PDF_LIMIT_EXCEEDED", "Header and footer heights did not stabilize.", { pages: pages.length });
  }
  decorate(pages, props, layout, context);
  return {
    document: {
      pages,
      metadata: metadataOf(props),
      ...(outline.length > 0 ? { outline } : {})
    },
    layout
  };
}

/** Builds a serializable document model from a declarative tree. */
export function buildPdfDocument(element: PdfElement): {
  pages: PdfPageModel[];
  metadata: PdfMetadata;
  outline?: PdfOutlineItem[];
} {
  return buildDocument(element).document;
}
