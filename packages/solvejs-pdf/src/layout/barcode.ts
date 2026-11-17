/* eslint-disable complexity, max-lines-per-function -- Code 39 encoder and renderer */
import { failPdf } from "../errors.js";
import { normalizeColor, positive } from "../shared.js";
import { measureText } from "../pdf/fonts.js";
import type { Block } from "./blocks.js";

const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw",
  "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn",
  A: "wnnnnwnnw", B: "nnwnnwnnw", C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn",
  G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn", K: "wnnnnnnww", L: "nnwnnnnww",
  M: "wnwnnnnwn", N: "nnnnwnnww", O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn",
  S: "nnwnnnwwn", T: "nnnnwnwwn", U: "wwnnnnnnw", V: "nwwnnnnnw", W: "wwwnnnnnn", X: "nwnnwnnnw",
  Y: "wwnnwnnnn", Z: "nwwnwnnnn", "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn",
  $: "nwnwnwnnn", "/": "nwnwnnnwn", "+": "nwnnnwnwn", "%": "nnnwnwnwn", "*": "nwnnwnwnn"
};

export type BarcodeBlock = Block & { kind: "barcode"; width: number; height: number };

export function barcodeBlock(
  value: string,
  options: { width?: number; height?: number; color?: string; showText?: boolean }
): BarcodeBlock {
  const text = value.toUpperCase();
  if (text.length === 0 || text.length > 80) failPdf("PDF_INVALID_INPUT", "Barcode value must have 1 to 80 characters.");
  for (const character of text) {
    if (!CODE39[character]) failPdf("PDF_INVALID_INPUT", "Barcode value contains an unsupported character.", { character });
  }
  const encoded = `*${text}*`;
  let units = 0;
  for (const character of encoded) {
    for (const element of CODE39[character]) units += element === "w" ? 2.4 : 1;
    units += 1;
  }
  const narrow = options.width === undefined ? 1.1 : Math.max(0.4, options.width / units);
  const wide = narrow * 2.4;
  const barHeight = options.height === undefined ? 34 : positive(options.height, "height");
  const showText = options.showText !== false;
  const font = "courier" as const;
  const textSize = 7;
  const width = narrow * units;
  const height = barHeight + (showText ? textSize + 4 : 0);
  const color = normalizeColor(options.color) ?? "#111827";
  return {
    kind: "barcode",
    width,
    height,
    marginTop: 0,
    marginBottom: 0,
    draw(target, x, y) {
      let cursor = x;
      for (const character of encoded) {
        const pattern = CODE39[character];
        pattern.split("").forEach((element, index) => {
          const elementWidth = element === "w" ? wide : narrow;
          if (index % 2 === 0) {
            target.page.ops.push({ kind: "rect", x: cursor, y, width: elementWidth, height: barHeight, fill: color });
          }
          cursor += elementWidth;
        });
        cursor += narrow;
      }
      if (showText) {
        const textWidth = measureText(text, font, textSize);
        target.page.ops.push({
          kind: "text",
          x: x + (width - textWidth) / 2,
          y: y + barHeight + textSize,
          text,
          font,
          size: textSize,
          color
        });
      }
    }
  };
}
