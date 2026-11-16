import { failXlsx } from "./errors.js";

/** Named ARGB colors for the most common spreadsheet palettes. */
export const Colors = {
  Black: "FF000000",
  White: "FFFFFFFF",
  Red: "FFFF0000",
  DarkRed: "FFC00000",
  Orange: "FFFFA500",
  Yellow: "FFFFFF00",
  Green: "FF00B050",
  DarkGreen: "FF006100",
  Blue: "FF0070C0",
  DarkBlue: "FF1F4E78",
  LightBlue: "FFDDEBF7",
  Purple: "FF7030A0",
  Gray: "FF808080",
  LightGray: "FFD9D9D9",
  DarkGray: "FF404040",
  Teal: "FF00B0F0",
  Pink: "FFFFC0CB",
  Brown: "FFA52A2A"
} as const;

export type XlsxColor = keyof typeof Colors | (string & {});
export type XlsxBorderStyle = "thin" | "medium" | "thick" | "dashed" | "dotted" | "double";
export type XlsxBorder = { style: XlsxBorderStyle; color?: XlsxColor };
export type XlsxHorizontalAlign = "left" | "center" | "right" | "justify";
export type XlsxVerticalAlign = "top" | "middle" | "bottom";

/** Cell formatting. Every property is optional; the default is an unstyled cell. */
export type XlsxCellStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean | "single" | "double";
  strike?: boolean;
  fontName?: string;
  fontSize?: number;
  fontColor?: XlsxColor;
  fill?: XlsxColor;
  align?: XlsxHorizontalAlign;
  verticalAlign?: XlsxVerticalAlign;
  wrapText?: boolean;
  numberFormat?: string;
  border?: XlsxBorderStyle | XlsxBorder;
  borderTop?: XlsxBorderStyle | XlsxBorder;
  borderRight?: XlsxBorderStyle | XlsxBorder;
  borderBottom?: XlsxBorderStyle | XlsxBorder;
  borderLeft?: XlsxBorderStyle | XlsxBorder;
};

const BORDER_STYLES = new Set<XlsxBorderStyle>([
  "thin",
  "medium",
  "thick",
  "dashed",
  "dotted",
  "double"
]);
const HORIZONTAL_ALIGNS = new Set<XlsxHorizontalAlign>(["left", "center", "right", "justify"]);
const VERTICAL_ALIGNS = new Set<XlsxVerticalAlign>(["top", "middle", "bottom"]);

/** Normalises a named or hexadecimal color to Excel's 8-digit ARGB form. */
export function normalizeColor(value: XlsxColor | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    failXlsx("XLSX_INVALID_INPUT", "Expected a color string.", { color: value });
  }
  const named = (Colors as Record<string, string>)[value];
  if (named) return named;

  const hex = value.replace(/^#/, "").toUpperCase();
  if (/^[0-9A-F]{6}$/.test(hex)) return `FF${hex}`;
  if (/^[0-9A-F]{8}$/.test(hex)) return hex;
  return failXlsx("XLSX_INVALID_INPUT", `Expected a named or hexadecimal color, received ${JSON.stringify(value)}.`, {
    color: value
  });
}

/** Normalises a border shorthand to an object. */
export function normalizeBorder(value: XlsxBorderStyle | XlsxBorder | undefined): XlsxBorder | undefined {
  if (value === undefined) return undefined;
  return typeof value === "string" ? { style: value } : value;
}

export function assertBorderStyle(style: string): asserts style is XlsxBorderStyle {
  if (!BORDER_STYLES.has(style as XlsxBorderStyle)) {
    failXlsx("XLSX_INVALID_INPUT", `Unsupported border style: ${style}.`, { style });
  }
}

export function assertHorizontalAlign(value: string | undefined): asserts value is XlsxHorizontalAlign | undefined {
  if (value !== undefined && !HORIZONTAL_ALIGNS.has(value as XlsxHorizontalAlign)) {
    failXlsx("XLSX_INVALID_INPUT", `Unsupported horizontal alignment: ${value}.`, { align: value });
  }
}

export function assertVerticalAlign(value: string | undefined): asserts value is XlsxVerticalAlign | undefined {
  if (value !== undefined && !VERTICAL_ALIGNS.has(value as XlsxVerticalAlign)) {
    failXlsx("XLSX_INVALID_INPUT", `Unsupported vertical alignment: ${value}.`, { verticalAlign: value });
  }
}

export function ooxmlVerticalAlign(value: XlsxVerticalAlign | undefined): "top" | "center" | "bottom" | undefined {
  return value === "middle" ? "center" : value;
}

export function underlineValue(value: XlsxCellStyle["underline"]): "single" | "double" | undefined {
  if (value === true) return "single";
  if (value === false || value === undefined) return undefined;
  if (value !== "single" && value !== "double") {
    failXlsx("XLSX_INVALID_INPUT", `Unsupported underline value: ${String(value)}.`, { underline: value });
  }
  return value;
}
