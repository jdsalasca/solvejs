import { failPdf } from "../errors.js";
import { normalizeColor, nonNegative, positive, type PdfAlign, type PdfColor, type PdfFontFamily } from "../shared.js";
import type { PdfStyle } from "./types.js";

export type ResolvedStyle = {
  color: string;
  background?: string;
  fontSize: number;
  fontFamily: PdfFontFamily;
  bold: boolean;
  italic: boolean;
  align: PdfAlign;
  lineHeight: number;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  underline: boolean;
  strike: boolean;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  marginTop: number;
  marginBottom: number;
  borderWidth: number;
  borderColor: string;
  radius: number;
  width?: number | `${number}%`;
  height?: number;
  gap: number;
};

const ALIGNS = new Set<PdfAlign>(["left", "center", "right"]);
const FAMILIES = new Set<PdfFontFamily>(["helvetica", "times", "courier"]);
const TRANSFORMS = new Set(["none", "uppercase", "lowercase", "capitalize"]);

function oneOf<T>(value: T, allowed: Set<T>, label: string): T {
  if (!allowed.has(value)) failPdf("PDF_INVALID_INPUT", `Unsupported ${label}: ${String(value)}.`, { [label]: value });
  return value;
}

function paddingOf(props: PdfStyle): { top: number; right: number; bottom: number; left: number } {
  const all = props.padding === undefined ? 0 : nonNegative(props.padding, "padding");
  const x = props.paddingX === undefined ? all : nonNegative(props.paddingX, "paddingX");
  const y = props.paddingY === undefined ? all : nonNegative(props.paddingY, "paddingY");
  return { top: y, right: x, bottom: y, left: x };
}

function widthOf(value: PdfStyle["width"]): number | `${number}%` | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") return positive(value, "width");
  if (typeof value !== "string" || !value.endsWith("%")) {
    failPdf("PDF_INVALID_INPUT", "Expected width to be a number or a percentage string.", { width: value });
  }
  const percentage = Number(value.slice(0, -1));
  if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
    failPdf("PDF_INVALID_INPUT", "Expected a width percentage between 0 and 100.", { width: value });
  }
  return value as `${number}%`;
}

function lineHeightOf(value: number | undefined): number {
  const lineHeight = value ?? 1.35;
  if (!Number.isFinite(lineHeight) || lineHeight <= 0 || lineHeight > 4) {
    failPdf("PDF_INVALID_INPUT", "Expected lineHeight between 0 and 4.", { lineHeight });
  }
  return lineHeight;
}

function fontSizeOf(value: number | undefined): number {
  const fontSize = value === undefined ? 11 : positive(value, "fontSize");
  if (fontSize > 400) failPdf("PDF_INVALID_INPUT", "fontSize cannot exceed 400.", { fontSize });
  return fontSize;
}

function fontOf(props: PdfStyle): Pick<
  ResolvedStyle,
  "fontSize" | "fontFamily" | "bold" | "italic" | "lineHeight" | "textTransform" | "underline" | "strike"
> {
  const textTransform = props.textTransform ?? "none";
  if (!TRANSFORMS.has(textTransform)) {
    failPdf("PDF_INVALID_INPUT", "Unsupported textTransform.", { textTransform });
  }
  return {
    fontSize: fontSizeOf(props.fontSize),
    fontFamily: oneOf(props.fontFamily ?? "helvetica", FAMILIES, "fontFamily"),
    bold: props.bold === true,
    italic: props.italic === true,
    lineHeight: lineHeightOf(props.lineHeight),
    textTransform: textTransform as ResolvedStyle["textTransform"],
    underline: props.underline === true,
    strike: props.strike === true
  };
}

function textOf(props: PdfStyle): Pick<ResolvedStyle, "color" | "background" | "align"> {
  return {
    color: normalizeColor(props.color) ?? "#111827",
    background: normalizeColor(props.background),
    align: oneOf(props.align ?? "left", ALIGNS, "align")
  };
}

function spacingOf(props: PdfStyle): Pick<ResolvedStyle, "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft" | "marginTop" | "marginBottom" | "gap"> {
  const padding = paddingOf(props);
  return {
    paddingTop: padding.top,
    paddingRight: padding.right,
    paddingBottom: padding.bottom,
    paddingLeft: padding.left,
    marginTop: nonNegative(props.marginTop ?? 0, "marginTop"),
    marginBottom: nonNegative(props.marginBottom ?? props.margin ?? 0, "marginBottom"),
    gap: nonNegative(props.gap ?? 8, "gap")
  };
}

function boxOf(props: PdfStyle): Pick<ResolvedStyle, "borderWidth" | "borderColor" | "radius" | "width" | "height"> {
  return {
    borderWidth: nonNegative(props.border ?? 0, "border"),
    borderColor: normalizeColor(props.borderColor) ?? "#E2E8F0",
    radius: nonNegative(props.radius ?? 0, "radius"),
    width: widthOf(props.width),
    height: props.height === undefined ? undefined : positive(props.height, "height")
  };
}

/** Normalizes and validates every style prop, applying document defaults. */
export function resolveStyle(props: PdfStyle): ResolvedStyle {
  return { ...fontOf(props), ...textOf(props), ...spacingOf(props), ...boxOf(props) };
}

/** Resolves a numeric or percentage width against the available content width. */
export function resolveWidth(width: number | `${number}%` | undefined, available: number): number {
  if (width === undefined) return available;
  if (typeof width === "number") return Math.min(width, available);
  return (available * Number(width.slice(0, -1))) / 100;
}

/** Returns a color string or its default. */
export function colorOf(value: PdfColor | undefined, fallback: string): string {
  return normalizeColor(value) ?? fallback;
}
