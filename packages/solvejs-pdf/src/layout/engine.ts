import { failPdf } from "../errors.js";
import { PDF_LIMITS, normalizeColor, nonNegative, positive, resolvePageSize, type PdfAlign, type PdfFontFamily } from "../shared.js";
import { layoutText, resolveFontKey } from "../pdf/fonts.js";
import { decodeImageSource, parseJpeg, type PdfImage } from "../pdf/images.js";
import type { PdfMetadata, PdfOutlineItem, PdfPageModel } from "../pdf/model.js";
import {
  bookmarkBlock,
  breakBlock,
  boxBlock,
  dividerBlock,
  imageBlock,
  rowBlock,
  spacerBlock,
  tableBlock,
  textBlock,
  type BookmarkBlock,
  type Block,
  type TableCellLayout,
  type TableRowLayout
} from "./blocks.js";
import { resolveStyle, resolveWidth, type ResolvedStyle } from "./style.js";
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

function layoutTextNode(node: PdfElement, available: number, defaults: Partial<PdfStyle> = {}): Block[] {
  const style = resolveStyle({ ...defaults, ...styleProps(node.props) });
  const width = resolveWidth(style.width, available);
  const font = resolveFontKey(style.fontFamily, style.bold, style.italic);
  const contentWidth = innerWidth(style, width);
  const text = transformText(textOf(node), style.textTransform);
  if (text.length > PDF_LIMITS.maxTextLength) {
    failPdf("PDF_LIMIT_EXCEEDED", "Text exceeds the configured length limit.", { length: text.length });
  }
  const lines = layoutText(text, font, style.fontSize, contentWidth);
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
    return [withWidth(rowBlock([], style), width)];
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
  return [withWidth(rowBlock(items, style), width)];
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
  const style = resolveStyle(styleProps(props));
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
  let image = context.imageCache.get(src);
  if (!image) {
    image = parseJpeg(decodeImageSource(src));
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

function layoutDivider(node: PdfElement, available: number): Block[] {
  const color = normalizeColor(node.props.color as string | undefined) ?? "#E2E8F0";
  const width = node.props.width === undefined ? 1 : positive(node.props.width, "width");
  return [
    withWidth(dividerBlock(color, width, nonNegative(node.props.marginTop ?? 0, "marginTop"), nonNegative(node.props.marginBottom ?? 0, "marginBottom")), available)
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

function headingDefaults(level: unknown): Partial<PdfStyle> {
  if (level === 2) return { fontSize: 22, bold: true, marginBottom: 8, lineHeight: 1.25 };
  if (level === 3) return { fontSize: 18, bold: true, marginBottom: 6, lineHeight: 1.3 };
  return { fontSize: 28, bold: true, marginBottom: 10, lineHeight: 1.2 };
}

function layoutHeading(node: PdfElement, available: number): Block[] {
  return layoutTextNode(node, available, headingDefaults(node.props.level));
}

function layoutParagraph(node: PdfElement, available: number): Block[] {
  return layoutTextNode(node, available, { lineHeight: 1.55, marginBottom: 8 });
}

function layoutPage(node: PdfElement, available: number, context: LayoutContext): Block[] {
  return [breakBlock(), ...layoutNodes(childrenOf(node), available, context)];
}

type NodeHandler = (node: PdfElement, available: number, context: LayoutContext) => Block[];

const NODE_HANDLERS: Record<string, NodeHandler> = {
  view: layoutView,
  row: layoutRow,
  text: (node, available) => layoutTextNode(node, available),
  heading: layoutHeading,
  paragraph: layoutParagraph,
  table: (node, available, context) => layoutTable(node, available, context),
  image: layoutImage,
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

function newPage(layout: PageLayout): PdfPageModel {
  const page: PdfPageModel = { width: layout.width, height: layout.height, ops: [], links: [] };
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
};

function nextPage(state: PageState): void {
  if (state.pages.length >= PDF_LIMITS.maxPages) {
    failPdf("PDF_LIMIT_EXCEEDED", "Document has too many pages.", { pages: state.pages.length });
  }
  state.current = newPage(state.layout);
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

// eslint-disable-next-line complexity -- page breaks and bookmark markers share one loop
function paginate(blocks: Block[], layout: PageLayout, outline: PdfOutlineItem[]): PdfPageModel[] {
  const pages = [newPage(layout)];
  const state: PageState = { pages, current: pages[0], y: layout.contentTop, layout, queue: [...blocks] };
  while (state.queue.length > 0) {
    const block = state.queue.shift();
    if (!block) break;
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

function decorate(
  pages: PdfPageModel[],
  props: RootProps,
  layout: PageLayout,
  context: LayoutContext
): void {
  const header = props.header as PdfPageDecorator | undefined;
  const footer = props.footer as PdfPageDecorator | undefined;
  pages.forEach((page, index) => {
    const total = pages.length;
    const target = targetOf(page);
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

/** Lays out a declarative PDF component tree into pages. */
// eslint-disable-next-line complexity -- pagination and decorator convergence state machine
function buildDocument(element: PdfElement): {
  document: { pages: PdfPageModel[]; metadata: PdfMetadata; outline?: PdfOutlineItem[] };
  layout: PageLayout;
} {
  const root = resolveElement(element);
  if (root.type !== "pdf") failPdf("PDF_INVALID_INPUT", "Expected a Pdf root element.");
  const context: LayoutContext = { imageCache: new Map(), blocks: 0, cells: 0, imageBytes: 0, depth: 0 };
  let layout = pageLayoutOf(root.props, context);
  if (layout.contentBottom <= layout.contentTop) failPdf("PDF_INVALID_INPUT", "Margins and header/footer leave no body height.");
  const blocks = layoutNodes(childrenOf(root), layout.contentWidth, context);
  let outline: PdfOutlineItem[] = [];
  let pages = paginate(blocks, layout, outline);
  let measured = measureDecoratorHeights(root.props, context, layout.contentWidth, pages.length);
  for (let pass = 0; pass < 4; pass += 1) {
    if (measured.header <= layout.headerReserved && measured.footer <= layout.footerReserved) break;
    layout = pageLayoutOf(root.props, context, measured);
    if (layout.contentBottom <= layout.contentTop) {
      failPdf("PDF_INVALID_INPUT", "Margins and header/footer leave no body height.");
    }
    outline = [];
    pages = paginate(blocks, layout, outline);
    measured = measureDecoratorHeights(root.props, context, layout.contentWidth, pages.length);
  }
  if (measured.header > layout.headerReserved || measured.footer > layout.footerReserved) {
    failPdf("PDF_LIMIT_EXCEEDED", "Header and footer heights did not stabilize.", { pages: pages.length });
  }
  decorate(pages, root.props, layout, context);
  return {
    document: {
      pages,
      metadata: metadataOf(root.props),
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
