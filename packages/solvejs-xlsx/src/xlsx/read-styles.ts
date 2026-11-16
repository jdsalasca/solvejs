import type { XlsxBorder, XlsxBorderStyle, XlsxCellStyle } from "../style.js";
import type { XlsxReadStyle } from "../shared.js";
import { childrenNamed, firstChild, parseXml, type XmlNode } from "../xml/parse.js";

const BUILTIN_DATE_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);
const SUPPORTED_BORDERS = new Set<XlsxBorderStyle>(["thin", "medium", "thick", "dashed", "dotted", "double"]);

const BUILTIN_FORMATS: Record<number, string> = {
  0: "General",
  1: "0",
  2: "0.00",
  3: "#,##0",
  4: "#,##0.00",
  9: "0%",
  10: "0.00%",
  11: "0.00E+00",
  12: "# ?/?",
  13: "# ??/??",
  14: "mm-dd-yy",
  15: "d-mmm-yy",
  16: "d-mmm",
  17: "mmm-yy",
  18: "h:mm AM/PM",
  19: "h:mm:ss AM/PM",
  20: "h:mm",
  21: "h:mm:ss",
  22: "m/d/yy h:mm",
  37: "#,##0 ;(#,##0)",
  38: "#,##0 ;[Red](#,##0)",
  39: "#,##0.00;(#,##0.00)",
  40: "#,##0.00;[Red](#,##0.00)",
  45: "mm:ss",
  46: "[h]:mm:ss",
  47: "mmss.0",
  48: "##0.0E+0",
  49: "@"
};

export type ParsedStyles = {
  dateStyles: ReadonlySet<number>;
  cellStyles: XlsxReadStyle[];
};

function colorOf(node: XmlNode | undefined): string | undefined {
  const rgb = node?.attributes.rgb;
  if (!rgb) return undefined;
  const hex = rgb.toUpperCase();
  if (/^[0-9A-F]{8}$/.test(hex)) return hex;
  if (/^[0-9A-F]{6}$/.test(hex)) return `FF${hex}`;
  return undefined;
}

const FONT_FLAGS = [
  ["bold", "b"],
  ["italic", "i"],
  ["strike", "strike"]
] as const;

function fontFlags(node: XmlNode): Partial<XlsxCellStyle> {
  const style: Partial<XlsxCellStyle> = {};
  for (const [key, child] of FONT_FLAGS) {
    if (firstChild(node, child)) (style as Record<string, unknown>)[key] = true;
  }
  return style;
}

function underlineOf(node: XmlNode): XlsxCellStyle["underline"] {
  const underline = firstChild(node, "u");
  if (!underline) return undefined;
  return underline.attributes.val === "double" ? "double" : "single";
}

function fontSizeOf(node: XmlNode): number | undefined {
  const size = Number(firstChild(node, "sz")?.attributes.val);
  return Number.isFinite(size) && size > 0 ? size : undefined;
}

function fontAttributes(node: XmlNode): Partial<XlsxCellStyle> {
  const style: Partial<XlsxCellStyle> = {};
  const underline = underlineOf(node);
  const size = fontSizeOf(node);
  const name = firstChild(node, "name")?.attributes.val;
  const color = colorOf(firstChild(node, "color"));
  if (underline) style.underline = underline;
  if (size) style.fontSize = size;
  if (name) style.fontName = name;
  if (color) style.fontColor = color;
  return style;
}

function parseFont(node: XmlNode): Partial<XlsxCellStyle> {
  return { ...fontFlags(node), ...fontAttributes(node) };
}

function parseFill(node: XmlNode): string | undefined {
  const pattern = firstChild(node, "patternFill");
  if (!pattern || pattern.attributes.patternType !== "solid") return undefined;
  return colorOf(firstChild(pattern, "fgColor")) ?? colorOf(firstChild(pattern, "bgColor"));
}

function parseBorderSide(node: XmlNode | undefined): XlsxBorder | undefined {
  const style = node?.attributes.style;
  if (!style || !SUPPORTED_BORDERS.has(style as XlsxBorderStyle)) return undefined;
  const color = colorOf(firstChild(node as XmlNode, "color"));
  return color ? { style: style as XlsxBorderStyle, color } : { style: style as XlsxBorderStyle };
}

function parseBorder(node: XmlNode): Partial<XlsxCellStyle> {
  const style: Partial<XlsxCellStyle> = {};
  const top = parseBorderSide(firstChild(node, "top"));
  const right = parseBorderSide(firstChild(node, "right"));
  const bottom = parseBorderSide(firstChild(node, "bottom"));
  const left = parseBorderSide(firstChild(node, "left"));
  if (top) style.borderTop = top;
  if (right) style.borderRight = right;
  if (bottom) style.borderBottom = bottom;
  if (left) style.borderLeft = left;
  return style;
}

const HORIZONTAL = new Set(["left", "center", "right", "justify"]);

function horizontalOf(value: string | undefined): XlsxCellStyle["align"] {
  return value && HORIZONTAL.has(value) ? (value as XlsxCellStyle["align"]) : undefined;
}

function verticalOf(value: string | undefined): XlsxCellStyle["verticalAlign"] {
  if (value === "top" || value === "bottom") return value;
  if (value === "center") return "middle";
  return undefined;
}

function parseAlignment(node: XmlNode | undefined): Partial<XlsxCellStyle> {
  if (!node) return {};
  const style: Partial<XlsxCellStyle> = {};
  const horizontal = horizontalOf(node.attributes.horizontal);
  const vertical = verticalOf(node.attributes.vertical);
  if (horizontal) style.align = horizontal;
  if (vertical) style.verticalAlign = vertical;
  if (node.attributes.wrapText === "1" || node.attributes.wrapText === "true") style.wrapText = true;
  return style;
}

function formatCode(id: number, custom: ReadonlyMap<number, string>): string | undefined {
  return custom.get(id) ?? BUILTIN_FORMATS[id];
}

function isDateFormat(id: number, custom: ReadonlyMap<number, string>): boolean {
  if (BUILTIN_DATE_IDS.has(id)) return true;
  const code = formatCode(id, custom);
  if (!code) return false;
  const cleaned = code
    .replace(/"[^"]*"/g, "")
    .replace(/\\./g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/AM\/PM/gi, "");
  return /[ymdhs]/i.test(cleaned);
}

function customFormats(styleSheet: XmlNode): Map<number, string> {
  const custom = new Map<number, string>();
  const numFmts = firstChild(styleSheet, "numFmts");
  if (!numFmts) return custom;
  for (const format of childrenNamed(numFmts, "numFmt")) {
    const id = Number(format.attributes.numFmtId);
    const code = format.attributes.formatCode;
    if (Number.isInteger(id) && code) custom.set(id, code);
  }
  return custom;
}

function childrenOf(styleSheet: XmlNode, name: string): XmlNode[] {
  const parent = firstChild(styleSheet, name);
  return parent ? childrenNamed(parent, name.slice(0, -1)) : [];
}

type CellFormatInput = {
  styleSheet: XmlNode;
  custom: ReadonlyMap<number, string>;
  fontNodes: readonly Partial<XlsxCellStyle>[];
  fillNodes: readonly (string | undefined)[];
  borderNodes: readonly Partial<XlsxCellStyle>[];
};

function cellFormats(input: CellFormatInput): ParsedStyles {
  const { styleSheet, custom, fontNodes, fillNodes, borderNodes } = input;
  const cellStyles: XlsxReadStyle[] = [];
  const dateStyles = new Set<number>();
  const cellXfs = firstChild(styleSheet, "cellXfs");
  if (!cellXfs) return { dateStyles, cellStyles };
  childrenNamed(cellXfs, "xf").forEach((xf, index) => {
    const numFmtId = Number(xf.attributes.numFmtId ?? "0");
    const code = formatCode(numFmtId, custom);
    const fill = fillNodes[Number(xf.attributes.fillId ?? "0")];
    cellStyles.push({
      ...fontNodes[Number(xf.attributes.fontId ?? "0")],
      ...(fill ? { fill } : {}),
      ...borderNodes[Number(xf.attributes.borderId ?? "0")],
      ...parseAlignment(firstChild(xf, "alignment")),
      numberFormatCode: code,
      numberFormat: code
    });
    if (isDateFormat(numFmtId, custom)) dateStyles.add(index);
  });
  return { dateStyles, cellStyles };
}

/** Parses `xl/styles.xml` into per-cell-xf styles and a date-style index set. */
export function parseStyles(xml: string): ParsedStyles {
  const root = parseXml(xml);
  const styleSheet = firstChild(root, "styleSheet") ?? root;
  return cellFormats({
    styleSheet,
    custom: customFormats(styleSheet),
    fontNodes: childrenOf(styleSheet, "fonts").map(parseFont),
    fillNodes: childrenOf(styleSheet, "fills").map(parseFill),
    borderNodes: childrenOf(styleSheet, "borders").map(parseBorder)
  });
}
