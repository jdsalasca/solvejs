import { failXlsx } from "../errors.js";
import {
  assertBorderStyle,
  assertHorizontalAlign,
  assertVerticalAlign,
  normalizeBorder,
  normalizeColor,
  ooxmlVerticalAlign,
  underlineValue,
  type XlsxBorder,
  type XlsxCellStyle
} from "../style.js";
import { escapeXmlAttribute } from "../xml/escape.js";

type FontRecord = {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  size: number;
  name: string;
  underline?: "single" | "double";
  color?: string;
};

type FillRecord = { kind: "none" | "gray125" } | { kind: "solid"; color: string };
type BorderSide = { style: string; color?: string };
type BorderRecord = { top?: BorderSide; right?: BorderSide; bottom?: BorderSide; left?: BorderSide };
type XfRecord = {
  fontId: number;
  fillId: number;
  borderId: number;
  numFmtId: number;
  horizontal?: string;
  vertical?: string;
  wrapText?: boolean;
};

type DxfRecord = {
  bold?: boolean;
  italic?: boolean;
  fontColor?: string;
  fill?: string;
};

const DEFAULT_FONT: FontRecord = { bold: false, italic: false, strike: false, size: 11, name: "Calibri" };
const DEFAULT_XF: XfRecord = { fontId: 0, fillId: 0, borderId: 0, numFmtId: 0 };

function hasFont(style: XlsxCellStyle): boolean {
  return Boolean(
    style.bold ||
      style.italic ||
      style.underline ||
      style.strike ||
      style.fontName ||
      style.fontSize !== undefined ||
      style.fontColor
  );
}

function fontRecord(style: XlsxCellStyle): FontRecord {
  const size = style.fontSize ?? 11;
  if (!Number.isFinite(size) || size <= 0 || size > 409) {
    failXlsx("XLSX_INVALID_INPUT", "Expected fontSize between 0 and 409.", { fontSize: style.fontSize });
  }
  const name = style.fontName ?? "Calibri";
  if (name.length === 0 || name.length > 255) {
    failXlsx("XLSX_INVALID_INPUT", "Expected a font name with 1 to 255 characters.", { fontName: name });
  }
  return {
    bold: style.bold === true,
    italic: style.italic === true,
    strike: style.strike === true,
    size,
    name,
    underline: underlineValue(style.underline),
    color: normalizeColor(style.fontColor)
  };
}

function sideOf(value: XlsxBorder | undefined): BorderSide | undefined {
  if (!value) return undefined;
  assertBorderStyle(value.style);
  return { style: value.style, color: normalizeColor(value.color) };
}

function borderRecord(style: XlsxCellStyle): BorderRecord {
  const all = normalizeBorder(style.border);
  return {
    top: sideOf(normalizeBorder(style.borderTop) ?? all),
    right: sideOf(normalizeBorder(style.borderRight) ?? all),
    bottom: sideOf(normalizeBorder(style.borderBottom) ?? all),
    left: sideOf(normalizeBorder(style.borderLeft) ?? all)
  };
}

function hasBorder(border: BorderRecord): boolean {
  return Boolean(border.top || border.right || border.bottom || border.left);
}

function fontXml(font: FontRecord): string {
  const parts: string[] = [];
  if (font.bold) parts.push("<b/>");
  if (font.italic) parts.push("<i/>");
  if (font.underline === "single") parts.push("<u/>");
  if (font.underline === "double") parts.push('<u val="double"/>');
  if (font.strike) parts.push("<strike/>");
  parts.push(`<sz val="${font.size}"/>`);
  if (font.color) parts.push(`<color rgb="${font.color}"/>`);
  parts.push(`<name val="${escapeXmlAttribute(font.name)}"/>`);
  return `<font>${parts.join("")}</font>`;
}

function fillXml(fill: FillRecord): string {
  if (fill.kind === "solid") {
    return `<fill><patternFill patternType="solid"><fgColor rgb="${fill.color}"/><bgColor indexed="64"/></patternFill></fill>`;
  }
  if (fill.kind === "none") return '<fill><patternFill patternType="none"/></fill>';
  return '<fill><patternFill patternType="gray125"/></fill>';
}

function sideXml(tag: string, side: BorderSide | undefined): string {
  if (!side) return `<${tag}/>`;
  const color = side.color ? `<color rgb="${side.color}"/>` : "";
  return `<${tag} style="${side.style}">${color}</${tag}>`;
}

function borderXml(border: BorderRecord): string {
  return `<border>${sideXml("left", border.left)}${sideXml("right", border.right)}${sideXml("top", border.top)}${sideXml(
    "bottom",
    border.bottom
  )}<diagonal/></border>`;
}

function alignmentXml(xf: XfRecord): string {
  if (!xf.horizontal && !xf.vertical && !xf.wrapText) return "";
  const horizontal = xf.horizontal ? ` horizontal="${xf.horizontal}"` : "";
  const vertical = xf.vertical ? ` vertical="${xf.vertical}"` : "";
  const wrap = xf.wrapText ? ' wrapText="1"' : "";
  return `<alignment${horizontal}${vertical}${wrap}/>`;
}

function xfXml(xf: XfRecord): string {
  const alignment = alignmentXml(xf);
  const apply = alignment ? ' applyAlignment="1"' : "";
  return `<xf numFmtId="${xf.numFmtId}" fontId="${xf.fontId}" fillId="${xf.fillId}" borderId="${xf.borderId}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"${apply}>${alignment}</xf>`;
}

function dxfXml(dxf: DxfRecord): string {
  const fontParts: string[] = [];
  if (dxf.bold) fontParts.push("<b/>");
  if (dxf.italic) fontParts.push("<i/>");
  if (dxf.fontColor) fontParts.push(`<color rgb="${dxf.fontColor}"/>`);
  const font = fontParts.length > 0 ? `<font>${fontParts.join("")}</font>` : "";
  const fill = dxf.fill
    ? `<fill><patternFill patternType="solid"><bgColor rgb="${dxf.fill}"/></patternFill></fill>`
    : "";
  return `<dxf>${font}${fill}</dxf>`;
}

/** Collects and deduplicates every font, fill, border, number format and cell format used by a workbook. */
export class StyleRegistry {
  private readonly fonts: FontRecord[] = [DEFAULT_FONT];
  private readonly fills: FillRecord[] = [{ kind: "none" }, { kind: "gray125" }];
  private readonly borders: BorderRecord[] = [{}];
  private readonly numFmts = new Map<number, string>();
  private readonly xfs: XfRecord[] = [DEFAULT_XF];
  private readonly dxfs: DxfRecord[] = [];
  private readonly fontMap = new Map<string, number>([[JSON.stringify(DEFAULT_FONT), 0]]);
  private readonly fillMap = new Map<string, number>();
  private readonly borderMap = new Map<string, number>([["{}", 0]]);
  private readonly numFmtMap = new Map<string, number>();
  private readonly xfMap = new Map<string, number>([["0|0|0|0|||false", 0]]);
  private readonly dxfMap = new Map<string, number>();

  private fontId(style: XlsxCellStyle): number {
    if (!hasFont(style)) return 0;
    const record = fontRecord(style);
    const key = JSON.stringify(record);
    const existing = this.fontMap.get(key);
    if (existing !== undefined) return existing;
    const id = this.fonts.length;
    this.fonts.push(record);
    this.fontMap.set(key, id);
    return id;
  }

  private fillId(style: XlsxCellStyle): number {
    const color = normalizeColor(style.fill);
    if (!color) return 0;
    const existing = this.fillMap.get(color);
    if (existing !== undefined) return existing;
    const id = this.fills.length;
    this.fills.push({ kind: "solid", color });
    this.fillMap.set(color, id);
    return id;
  }

  private borderId(style: XlsxCellStyle): number {
    const record = borderRecord(style);
    if (!hasBorder(record)) return 0;
    const key = JSON.stringify(record);
    const existing = this.borderMap.get(key);
    if (existing !== undefined) return existing;
    const id = this.borders.length;
    this.borders.push(record);
    this.borderMap.set(key, id);
    return id;
  }

  private numFmtId(style: XlsxCellStyle, isDate: boolean): number {
    if (style.numberFormat) {
      if (style.numberFormat.length === 0 || style.numberFormat.length > 255) {
        failXlsx("XLSX_INVALID_INPUT", "Expected a number format with 1 to 255 characters.");
      }
      const existing = this.numFmtMap.get(style.numberFormat);
      if (existing !== undefined) return existing;
      const id = 164 + this.numFmts.size;
      this.numFmts.set(id, style.numberFormat);
      this.numFmtMap.set(style.numberFormat, id);
      return id;
    }
    return isDate ? 14 : 0;
  }

  /** Registers a style and returns its `cellXfs` index. */
  register(style: XlsxCellStyle, isDate: boolean): number {
    assertHorizontalAlign(style.align);
    assertVerticalAlign(style.verticalAlign);
    const fontId = this.fontId(style);
    const fillId = this.fillId(style);
    const borderId = this.borderId(style);
    const numFmtId = this.numFmtId(style, isDate);
    const key = `${fontId}|${fillId}|${borderId}|${numFmtId}|${style.align ?? ""}|${style.verticalAlign ?? ""}|${
      style.wrapText === true
    }`;
    const existing = this.xfMap.get(key);
    if (existing !== undefined) return existing;
    const id = this.xfs.length;
    this.xfs.push({
      fontId,
      fillId,
      borderId,
      numFmtId,
      horizontal: style.align,
      vertical: ooxmlVerticalAlign(style.verticalAlign),
      wrapText: style.wrapText === true
    });
    this.xfMap.set(key, id);
    return id;
  }

  /** Registers a differential style for conditional formatting and returns its `dxfs` index. */
  registerDxf(style: XlsxCellStyle): number {
    const record: DxfRecord = {
      bold: style.bold === true || undefined,
      italic: style.italic === true || undefined,
      fontColor: normalizeColor(style.fontColor),
      fill: normalizeColor(style.fill)
    };
    if (!record.bold && !record.italic && !record.fontColor && !record.fill) {
      record.bold = true;
    }
    const key = JSON.stringify(record);
    const existing = this.dxfMap.get(key);
    if (existing !== undefined) return existing;
    const id = this.dxfs.length;
    this.dxfs.push(record);
    this.dxfMap.set(key, id);
    return id;
  }

  /** Generates `xl/styles.xml` from the registered set. */
  toXml(): string {
    const numFmts =
      this.numFmts.size === 0
        ? ""
        : `<numFmts count="${this.numFmts.size}">${[...this.numFmts.entries()]
            .map(([id, code]) => `<numFmt numFmtId="${id}" formatCode="${escapeXmlAttribute(code)}"/>`)
            .join("")}</numFmts>`;
    const xfs = this.xfs.map(xfXml).join("");
    const dxfs = this.dxfs.length === 0 ? "" : `<dxfs count="${this.dxfs.length}">${this.dxfs.map(dxfXml).join("")}</dxfs>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${numFmts}<fonts count="${
      this.fonts.length
    }">${this.fonts.map(fontXml).join("")}</fonts><fills count="${this.fills.length}">${this.fills
      .map(fillXml)
      .join("")}</fills><borders count="${this.borders.length}">${this.borders
      .map(borderXml)
      .join("")}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${
      this.xfs.length
    }">${xfs}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>${dxfs}</styleSheet>`;
  }
}
