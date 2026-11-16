import { failPdf } from "../errors.js";
import type { PdfFontKey, MeasuredLine } from "../pdf/fonts.js";
import type { PdfImage } from "../pdf/images.js";
import type { PdfPageModel } from "../pdf/model.js";
import type { PdfAlign } from "../shared.js";
import type { ResolvedStyle } from "./style.js";

/** Drawing surface for one page, including link annotations. */
export type DrawTarget = {
  page: PdfPageModel;
  addLink: (link: { x: number; y: number; width: number; height: number; href: string }) => void;
};

/** A measured layout block. Blocks draw themselves in top-left coordinates. */
export type Block = {
  kind?: string;
  height: number;
  width?: number;
  marginTop: number;
  marginBottom: number;
  draw: (target: DrawTarget, x: number, y: number, width: number) => void;
  split?: (maxHeight: number) => [Block, Block] | null;
};

type BoxRect = { x: number; y: number; width: number; height: number };

function drawBox(target: DrawTarget, rect: BoxRect, style: ResolvedStyle): void {
  if (!style.background && style.borderWidth <= 0) return;
  target.page.ops.push({
    kind: "rect",
    ...rect,
    fill: style.background,
    stroke: style.borderWidth > 0 ? style.borderColor : undefined,
    lineWidth: style.borderWidth,
    radius: style.radius
  });
}

export type TextBlock = Block & {
  kind: "text";
  lines: MeasuredLine[];
  font: PdfFontKey;
  size: number;
  color: string;
  align: PdfAlign;
  lineHeight: number;
  style: ResolvedStyle;
  href?: string;
};

function lineX(block: TextBlock, line: MeasuredLine, x: number, width: number): number {
  const contentWidth = width - block.style.paddingLeft - block.style.paddingRight;
  if (block.align === "center") return x + block.style.paddingLeft + (contentWidth - line.width) / 2;
  if (block.align === "right") return x + block.style.paddingLeft + contentWidth - line.width;
  return x + block.style.paddingLeft;
}

type TextDraw = { block: TextBlock; target: DrawTarget; x: number; y: number; width: number };

function drawTextBlock(context: TextDraw): void {
  const { block, target, x, y, width } = context;
  drawBox(target, { x, y, width, height: block.height }, block.style);
  block.lines.forEach((line, index) => {
    target.page.ops.push({
      kind: "text",
      x: lineX(block, line, x, width),
      y: y + block.style.paddingTop + index * block.lineHeight + block.size * 0.8,
      text: line.text,
      font: block.font,
      size: block.size,
      color: block.style.color
    });
  });
  if (block.href) target.addLink({ x, y, width, height: block.height, href: block.href });
}

export type TextBlockInput = {
  lines: MeasuredLine[];
  font: PdfFontKey;
  size: number;
  style: ResolvedStyle;
  href?: string;
};

/** Creates a text block from measured lines. */
export function textBlock(input: TextBlockInput): TextBlock {
  const { lines, font, size, style, href } = input;
  const lineHeight = size * style.lineHeight;
  const height = style.paddingTop + style.paddingBottom + lines.length * lineHeight;
  const block: TextBlock = {
    kind: "text",
    height,
    marginTop: style.marginTop,
    marginBottom: style.marginBottom,
    lines,
    font,
    size,
    color: style.color,
    align: style.align,
    lineHeight,
    style,
    href,
    draw: (target, x, y, width) => drawTextBlock({ block, target, x, y, width })
  };
  if (lines.length > 1) {
    block.split = (maxHeight) => splitTextBlock(block, maxHeight);
  }
  return block;
}

function splitTextBlock(block: TextBlock, maxHeight: number): [Block, Block] | null {
  const available = maxHeight - block.style.paddingTop - block.style.paddingBottom;
  const count = Math.floor(available / block.lineHeight);
  if (count < 1 || count >= block.lines.length) return null;
  const head = textBlock({
    lines: block.lines.slice(0, count),
    font: block.font,
    size: block.size,
    style: block.style,
    href: block.href
  });
  const tail = textBlock({
    lines: block.lines.slice(count),
    font: block.font,
    size: block.size,
    style: block.style,
    href: block.href
  });
  head.marginBottom = 0;
  tail.marginTop = 0;
  head.width = block.width;
  tail.width = block.width;
  return [head, tail];
}

export type BoxBlock = Block & {
  kind: "box";
  children: Block[];
  style: ResolvedStyle;
};

/** Creates a vertical container with padding, background and optional border. */
export function boxBlock(children: Block[], style: ResolvedStyle, explicitHeight?: number): BoxBlock {
  const content =
    children.reduce((total, child) => total + child.marginTop + child.height + child.marginBottom, 0) +
    Math.max(0, children.length - 1) * style.gap;
  const naturalHeight = style.paddingTop + style.paddingBottom + style.borderWidth * 2 + content;
  if (explicitHeight !== undefined && explicitHeight < naturalHeight) {
    failPdf("PDF_INVALID_INPUT", "Explicit height is smaller than the box content.", {
      height: explicitHeight,
      required: naturalHeight
    });
  }
  const height = explicitHeight ?? naturalHeight;
  const block: BoxBlock = {
    kind: "box",
    height,
    marginTop: style.marginTop,
    marginBottom: style.marginBottom,
    children,
    style,
    draw(target, x, y, width) {
      drawBox(target, { x, y, width, height }, style);
      let cursor = y + style.paddingTop + style.borderWidth;
      const contentX = x + style.paddingLeft + style.borderWidth;
      const contentWidth = width - style.paddingLeft - style.paddingRight - style.borderWidth * 2;
      children.forEach((child, index) => {
        cursor += child.marginTop;
        child.draw(target, contentX, cursor, child.width ?? contentWidth);
        cursor += child.height + child.marginBottom;
        if (index < children.length - 1) cursor += style.gap;
      });
    }
  };
  if (children.length > 0) {
    block.split = (maxHeight) => splitBoxBlock(block, maxHeight);
  }
  return block;
}

function splitBoxBlock(block: BoxBlock, maxHeight: number): [Block, Block] | null {
  const style = block.style;
  const available = maxHeight - style.paddingTop - style.paddingBottom - style.borderWidth * 2;
  let used = 0;
  let count = 0;
  for (const child of block.children) {
    const next = used + (count > 0 ? style.gap : 0) + child.marginTop + child.height + child.marginBottom;
    if (next > available) break;
    used = next;
    count += 1;
  }
  if (count >= block.children.length) return null;
  if (count === 0) {
    const first = block.children[0];
    const parts = first.split?.(available - first.marginTop);
    if (!parts) return null;
    const head = boxBlock([parts[0]], style);
    const tail = boxBlock([parts[1], ...block.children.slice(1)], style);
    head.marginBottom = 0;
    tail.marginTop = 0;
    head.width = block.width;
    tail.width = block.width;
    return [head, tail];
  }
  const head = boxBlock(block.children.slice(0, count), style);
  const tail = boxBlock(block.children.slice(count), style);
  head.marginBottom = 0;
  tail.marginTop = 0;
  head.width = block.width;
  tail.width = block.width;
  return [head, tail];
}

export type RowItem = { block: Block; width: number };

export type RowBlock = Block & {
  kind: "row";
  items: RowItem[];
  style: ResolvedStyle;
};

/** Creates a horizontal container. */
export function rowBlock(items: RowItem[], style: ResolvedStyle): RowBlock {
  const contentHeight = items.reduce((max, item) => Math.max(max, item.block.marginTop + item.block.height), 0);
  const height = style.paddingTop + style.paddingBottom + style.borderWidth * 2 + contentHeight;
  return {
    kind: "row",
    height,
    marginTop: style.marginTop,
    marginBottom: style.marginBottom,
    items,
    style,
    draw(target, x, y, width) {
      drawBox(target, { x, y, width, height }, style);
      let cursor = x + style.paddingLeft + style.borderWidth;
      const top = y + style.paddingTop + style.borderWidth;
      items.forEach((item, index) => {
        item.block.draw(target, cursor, top + item.block.marginTop, item.width);
        cursor += item.width;
        if (index < items.length - 1) cursor += style.gap;
      });
    }
  };
}

export type TableCellLayout = {
  lines: MeasuredLine[];
  align: PdfAlign;
  color: string;
  font: PdfFontKey;
  background?: string;
};

export type TableRowLayout = { cells: TableCellLayout[]; height: number };

export type TableBlock = Block & {
  kind: "table";
  columnWidths: number[];
  header?: TableRowLayout;
  rows: TableRowLayout[];
  style: ResolvedStyle;
  fontSize: number;
  fontFamily: ResolvedStyle["fontFamily"];
  cellPadding: number;
  lineHeight: number;
  borderWidth: number;
  borderColor: string;
  headerBackground: string;
  headerColor: string;
  zebra: boolean;
  zebraColor: string;
};

function tableHeight(header: TableRowLayout | undefined, rows: readonly TableRowLayout[]): number {
  return (header?.height ?? 0) + rows.reduce((total, row) => total + row.height, 0);
}

type CellDraw = {
  target: DrawTarget;
  block: TableBlock;
  cell: TableCellLayout;
  x: number;
  y: number;
  columnWidth: number;
};

function drawCellText(context: CellDraw): void {
  const { target, block, cell, x, y, columnWidth } = context;
  const contentWidth = columnWidth - block.cellPadding * 2;
  cell.lines.forEach((line, index) => {
    let textX = x + block.cellPadding;
    if (cell.align === "center") textX += (contentWidth - line.width) / 2;
    if (cell.align === "right") textX += contentWidth - line.width;
    target.page.ops.push({
      kind: "text",
      x: textX,
      y: y + block.cellPadding + index * block.fontSize * block.lineHeight + block.fontSize * 0.8,
      text: line.text,
      font: cell.font,
      size: block.fontSize,
      color: cell.color
    });
  });
}

type RowDraw = {
  target: DrawTarget;
  block: TableBlock;
  row: TableRowLayout;
  x: number;
  y: number;
  background: string | undefined;
  topLine: boolean;
};

function drawRowBorders(context: RowDraw, width: number, bottom: number): void {
  if (context.block.borderWidth <= 0) return;
  const { target, block, x, y } = context;
  if (context.topLine) {
    target.page.ops.push({ kind: "line", x1: x, y1: y, x2: x + width, y2: y, color: block.borderColor, width: block.borderWidth });
  }
  target.page.ops.push({ kind: "line", x1: x, y1: bottom, x2: x + width, y2: bottom, color: block.borderColor, width: block.borderWidth });
  let lineX = x;
  for (let index = 0; index <= block.columnWidths.length; index += 1) {
    target.page.ops.push({ kind: "line", x1: lineX, y1: y, x2: lineX, y2: bottom, color: block.borderColor, width: block.borderWidth });
    lineX += block.columnWidths[index] ?? 0;
  }
}

function drawTableRow(context: RowDraw): void {
  const { target, block, row, x, y, background } = context;
  const width = block.columnWidths.reduce((total, value) => total + value, 0);
  if (background) target.page.ops.push({ kind: "rect", x, y, width, height: row.height, fill: background });

  let cursor = x;
  row.cells.forEach((cell, index) => {
    const columnWidth = block.columnWidths[index];
    if (cell.background) {
      target.page.ops.push({ kind: "rect", x: cursor, y, width: columnWidth, height: row.height, fill: cell.background });
    }
    drawCellText({ target, block, cell, x: cursor, y, columnWidth });
    cursor += columnWidth;
  });
  drawRowBorders(context, width, y + row.height);
}

function drawWholeTable(block: TableBlock, target: DrawTarget, x: number, y: number): void {
  let cursor = y;
  if (block.header) {
    drawTableRow({ target, block, row: block.header, x, y: cursor, background: block.headerBackground, topLine: true });
    cursor += block.header.height;
  }
  block.rows.forEach((row, index) => {
    drawTableRow({
      target,
      block,
      row,
      x,
      y: cursor,
      background: block.zebra && index % 2 === 1 ? block.zebraColor : undefined,
      topLine: !block.header && index === 0
    });
    cursor += row.height;
  });
}

function splitTable(block: TableBlock, maxHeight: number): [Block, Block] | null {
  const headerHeight = block.header?.height ?? 0;
  let used = headerHeight;
  let count = 0;
  for (const row of block.rows) {
    if (used + row.height > maxHeight) break;
    used += row.height;
    count += 1;
  }
  if (count === 0 || count >= block.rows.length) return null;
  const head = tableBlock({ ...block, rows: block.rows.slice(0, count) });
  const tail = tableBlock({ ...block, rows: block.rows.slice(count) });
  head.marginBottom = 0;
  tail.marginTop = 0;
  head.width = block.width;
  tail.width = block.width;
  return [head, tail];
}

/** Creates a table that can split between rows across pages. */
export function tableBlock(block: Omit<TableBlock, keyof Block | "kind">): TableBlock {
  const result: TableBlock = {
    ...block,
    kind: "table",
    height: tableHeight(block.header, block.rows),
    marginTop: block.style.marginTop,
    marginBottom: block.style.marginBottom,
    draw: () => undefined
  };
  result.draw = (target, x, y) => drawWholeTable(result, target, x, y);
  result.split = (maxHeight) => splitTable(result, maxHeight);
  return result;
}

export type ImageBlock = Block & {
  kind: "image";
  image: PdfImage;
  width: number;
  height: number;
  style: ResolvedStyle;
};

export function imageBlock(image: PdfImage, width: number, height: number, style: ResolvedStyle): ImageBlock {
  return {
    kind: "image",
    image,
    width,
    height,
    style,
    marginTop: style.marginTop,
    marginBottom: style.marginBottom,
    draw(target, x, y) {
      if (style.background) target.page.ops.push({ kind: "rect", x, y, width, height, fill: style.background });
      target.page.ops.push({ kind: "image", x, y, width, height, image });
    }
  };
}

export type SimpleBlock = Block & { kind: "spacer" | "divider" | "break" };

export function spacerBlock(height: number, marginTop = 0, marginBottom = 0): SimpleBlock {
  return { kind: "spacer", height, marginTop, marginBottom, draw: () => undefined };
}

export function dividerBlock(color: string, width: number, marginTop: number, marginBottom: number): SimpleBlock {
  return {
    kind: "divider",
    height: width,
    marginTop,
    marginBottom,
    draw(target, x, y, available) {
      target.page.ops.push({ kind: "line", x1: x, y1: y, x2: x + available, y2: y, color, width });
    }
  };
}

export function breakBlock(): SimpleBlock {
  return { kind: "break", height: 0, marginTop: 0, marginBottom: 0, draw: () => undefined };
}
