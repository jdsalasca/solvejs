/* eslint-disable complexity, max-lines-per-function, max-params -- rotated stamp geometry */
import { failPdf } from "../errors.js";
import { normalizeColor, positive } from "../shared.js";
import { measureText } from "../pdf/fonts.js";
import type { Block } from "./blocks.js";

export type StampBlock = Block & { kind: "stamp"; width: number; height: number };

function rotate(x: number, y: number, cx: number, cy: number, angle: number): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: cx + (x - cx) * cos - (y - cy) * sin, y: cy + (x - cx) * sin + (y - cy) * cos };
}

export function stampBlock(
  text: string,
  options: {
    color?: string;
    angle?: number;
    fontSize?: number;
    borderWidth?: number;
    padding?: number;
    opacity?: number;
  }
): StampBlock {
  if (text.trim().length === 0) failPdf("PDF_INVALID_INPUT", "Stamp text must be non-empty.");
  const fontSize = options.fontSize === undefined ? 12 : positive(options.fontSize, "fontSize");
  const padding = options.padding === undefined ? 8 : positive(options.padding, "padding");
  const borderWidth = options.borderWidth === undefined ? 1.5 : positive(options.borderWidth, "borderWidth");
  const angle = options.angle === undefined ? -12 : options.angle;
  const opacity = options.opacity === undefined ? 0.85 : options.opacity;
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    failPdf("PDF_INVALID_INPUT", "Stamp opacity must be between 0 and 1.", { opacity });
  }
  const font = "helvetica-bold" as const;
  const textWidth = measureText(text.toUpperCase(), font, fontSize);
  const width = textWidth + padding * 2;
  const height = fontSize + padding * 2;
  const color = normalizeColor(options.color) ?? "#B91C1C";
  return {
    kind: "stamp",
    width,
    height,
    marginTop: 0,
    marginBottom: 0,
    draw(target, x, y) {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const corners = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height }
      ].map((point) => rotate(point.x, point.y, cx, cy, angle));
      target.page.ops.push({
        kind: "polygon",
        points: corners,
        stroke: color,
        lineWidth: borderWidth,
        lineJoin: "miter",
        closed: true,
        opacity
      });
      target.page.ops.push({
        kind: "text",
        x: cx - textWidth / 2,
        y: cy + fontSize * 0.35,
        text: text.toUpperCase(),
        font,
        size: fontSize,
        color,
        rotate: angle,
        opacity
      });
    }
  };
}
