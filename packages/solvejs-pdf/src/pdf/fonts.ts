import { failPdf } from "../errors.js";
import { PDF_FONT_BASE_NAMES, PDF_FONT_WIDTHS, WIN_ANSI_BYTES, type PdfFontKey } from "./font-data.js";
import type { PdfFontFamily } from "../shared.js";

export type { PdfFontKey };

const FAMILIES = new Set<PdfFontFamily>(["helvetica", "times", "courier"]);
const SUFFIXES = {
  "false|false": "",
  "true|false": "-bold",
  "false|true": "-italic",
  "true|true": "-bold-italic"
} as const;

/** Maps a public family plus weight and slant to one of the embedded standard fonts. */
export function resolveFontKey(family: PdfFontFamily = "helvetica", bold = false, italic = false): PdfFontKey {
  if (!FAMILIES.has(family)) {
    failPdf("PDF_INVALID_INPUT", `Unsupported font family: ${String(family)}.`, { fontFamily: family });
  }
  return `${family}${SUFFIXES[`${bold}|${italic}`]}` as PdfFontKey;
}

/** Returns the PDF BaseFont name for a resolved font key. */
export function baseFontName(key: PdfFontKey): string {
  return PDF_FONT_BASE_NAMES[key];
}

/** Encodes text as WinAnsi bytes; unrepresentable characters become `?`. */
export function encodeWinAnsi(text: string): number[] {
  const bytes: number[] = [];
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 63;
    const byte = WIN_ANSI_BYTES[codePoint];
    bytes.push(byte ?? (codePoint >= 32 && codePoint <= 126 ? codePoint : 63));
  }
  return bytes;
}

/** Measures a single line of text in points. */
export function measureText(text: string, font: PdfFontKey, size: number): number {
  const widths = PDF_FONT_WIDTHS[font];
  let total = 0;
  for (const byte of encodeWinAnsi(text)) total += widths[byte] ?? 0;
  return (total * size) / 1000;
}

/** Measures an already encoded set of WinAnsi bytes. */
export function measureBytes(bytes: readonly number[], font: PdfFontKey, size: number): number {
  const widths = PDF_FONT_WIDTHS[font];
  let total = 0;
  for (const byte of bytes) total += widths[byte] ?? 0;
  return (total * size) / 1000;
}

function splitLongWord(word: string, font: PdfFontKey, size: number, maxWidth: number): string[] {
  const parts: string[] = [];
  let current = "";
  for (const character of word) {
    const next = current + character;
    if (current.length > 0 && measureText(next, font, size) > maxWidth) {
      parts.push(current);
      current = character;
      continue;
    }
    current = next;
  }
  if (current.length > 0) parts.push(current);
  return parts;
}

type WordInput = {
  lines: string[];
  current: string;
  word: string;
  font: PdfFontKey;
  size: number;
  maxWidth: number;
};

function appendWord(input: WordInput): string {
  const { lines, current, word, font, size, maxWidth } = input;
  const candidate = current.length === 0 ? word : `${current} ${word}`;
  if (measureText(candidate, font, size) <= maxWidth) return candidate;
  if (current.length > 0) lines.push(current);
  if (measureText(word, font, size) <= maxWidth) return word;
  const parts = splitLongWord(word, font, size, maxWidth);
  lines.push(...parts.slice(0, -1));
  return parts[parts.length - 1] ?? "";
}

function wrapParagraph(paragraph: string, font: PdfFontKey, size: number, maxWidth: number): string[] {
  const words = paragraph.trim().split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";
  for (const word of words) current = appendWord({ lines, current, word, font, size, maxWidth });
  if (current.length > 0) lines.push(current);
  return lines;
}

/** Wraps text to a width, preserving explicit newlines and breaking long words. */
export function wrapText(text: string, font: PdfFontKey, size: number, maxWidth: number): string[] {
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) {
    failPdf("PDF_INVALID_INPUT", "Expected a positive text width.", { maxWidth });
  }
  const normalized = text.replace(/\r\n?/g, "\n");
  const lines: string[] = [];
  for (const paragraph of normalized.split("\n")) {
    lines.push(...wrapParagraph(paragraph, font, size, maxWidth));
  }
  return lines;
}

/** A line ready for serialization: original text, WinAnsi bytes and width. */
export type MeasuredLine = { text: string; bytes: number[]; width: number };

/** Wraps text and returns measured lines, so layout and serialization agree. */
export function layoutText(
  text: string,
  font: PdfFontKey,
  size: number,
  maxWidth: number
): MeasuredLine[] {
  return wrapText(text, font, size, maxWidth).map((line) => {
    const bytes = encodeWinAnsi(line);
    return { text: line, bytes, width: measureBytes(bytes, font, size) };
  });
}
