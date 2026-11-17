/* eslint-disable max-params -- chart drawing keeps coordinates explicit */
import { failPdf } from "../errors.js";
import { normalizeColor, nonNegative, positive } from "../shared.js";
import { measureText } from "../pdf/fonts.js";
import type { Block, DrawTarget } from "./blocks.js";
import type { ResolvedStyle } from "./style.js";

export type PdfChartDatum = { label: string; value: number; color?: string };

export type PdfChartOptions = {
  title?: string;
  width?: number;
  height?: number;
  colors?: readonly string[];
  showValues?: boolean;
  valueFormat?: (value: number) => string;
  fontSize?: number;
  padding?: number;
};

export type PdfChartKind = "bar" | "line" | "pie";

const DEFAULT_COLORS = ["#2563EB", "#22D3EE", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444", "#64748B"];

function formatValue(value: number, options: PdfChartOptions): string {
  if (options.valueFormat) return options.valueFormat(value);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function chartData(data: readonly PdfChartDatum[]): PdfChartDatum[] {
  if (!Array.isArray(data) || data.length === 0) failPdf("PDF_INVALID_INPUT", "Charts require at least one data point.");
  if (data.length > 200) failPdf("PDF_LIMIT_EXCEEDED", "Charts support at most 200 data points.", { points: data.length });
  return data.map((datum, index) => {
    if (typeof datum.label !== "string" || datum.label.trim().length === 0) {
      failPdf("PDF_INVALID_INPUT", "Chart labels must be non-empty strings.", { index });
    }
    if (!Number.isFinite(datum.value) || datum.value < 0) {
      failPdf("PDF_INVALID_INPUT", "Chart values must be non-negative finite numbers.", { index, value: datum.value });
    }
    return { ...datum, color: datum.color ? normalizeColor(datum.color) : undefined };
  });
}

function drawText(target: DrawTarget, x: number, y: number, text: string, size: number, color: string, align: "left" | "center" | "right" = "left"): void {
  const width = measureText(text, "helvetica", size);
  const anchor = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
  target.page.ops.push({ kind: "text", x: anchor, y, text, font: "helvetica", size, color });
}

function drawFrame(target: DrawTarget, block: ChartBlock, x: number, y: number, width: number): { left: number; top: number; right: number; bottom: number } {
  const style = block.style;
  if (style.background || style.borderWidth > 0) {
    target.page.ops.push({
      kind: "rect",
      x,
      y,
      width,
      height: block.height,
      fill: style.background,
      stroke: style.borderWidth > 0 ? style.borderColor : undefined,
      lineWidth: style.borderWidth
    });
  }
  const left = x + block.padding;
  const top = y + block.padding + (block.title ? block.fontSize * 2.2 : 0);
  return { left, top, right: x + width - block.padding, bottom: y + block.height - block.padding };
}

type ChartBlock = Block & {
  kind: "chart";
  chart: PdfChartKind;
  data: PdfChartDatum[];
  style: ResolvedStyle;
  options: Required<Pick<PdfChartOptions, "showValues" | "fontSize" | "padding" | "height">> & PdfChartOptions;
  title?: string;
  fontSize: number;
  padding: number;
};

function chartGrid(target: DrawTarget, area: { left: number; top: number; right: number; bottom: number }, max: number, fontSize: number): void {
  const lines = 4;
  for (let index = 0; index <= lines; index += 1) {
    const y = area.top + ((area.bottom - area.top) * index) / lines;
    target.page.ops.push({ kind: "line", x1: area.left, y1: y, x2: area.right, y2: y, color: "#E2E8F0", width: 0.5 });
    const value = (max * (lines - index)) / lines;
    drawText(target, area.left - 6, y + fontSize * 0.3, Number.isInteger(value) ? String(value) : value.toFixed(1), fontSize * 0.8, "#64748B", "right");
  }
}

function drawBarChart(target: DrawTarget, block: ChartBlock, x: number, y: number, width: number): void {
  const area = drawFrame(target, block, x, y, width);
  area.left += 30;
  const max = Math.max(...block.data.map((datum) => datum.value), 1);
  chartGrid(target, area, max, block.fontSize);
  const slot = (area.right - area.left) / block.data.length;
  const barWidth = Math.max(6, slot * 0.56);
  const baseline = area.bottom;
  block.data.forEach((datum, index) => {
    const center = area.left + slot * (index + 0.5);
    const height = ((area.bottom - area.top) * datum.value) / max;
    const color = datum.color ?? block.options.colors?.[index % block.options.colors.length] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    target.page.ops.push({ kind: "rect", x: center - barWidth / 2, y: baseline - height, width: barWidth, height, fill: color });
    if (block.options.showValues) {
      drawText(target, center, baseline - height - 4, formatValue(datum.value, block.options), block.fontSize * 0.8, "#334155", "center");
    }
    drawText(target, center, baseline + block.fontSize * 1.1, datum.label, block.fontSize * 0.8, "#64748B", "center");
  });
}

function drawLineChart(target: DrawTarget, block: ChartBlock, x: number, y: number, width: number): void {
  const area = drawFrame(target, block, x, y, width);
  area.left += 30;
  const max = Math.max(...block.data.map((datum) => datum.value), 1);
  chartGrid(target, area, max, block.fontSize);
  const slot = (area.right - area.left) / Math.max(1, block.data.length - 1);
  const points = block.data.map((datum, index) => ({
    x: area.left + slot * index,
    y: area.bottom - ((area.bottom - area.top) * datum.value) / max,
    datum
  }));
  const color = block.options.colors?.[0] ?? DEFAULT_COLORS[0];
  for (let index = 0; index + 1 < points.length; index += 1) {
    target.page.ops.push({
      kind: "line",
      x1: points[index].x,
      y1: points[index].y,
      x2: points[index + 1].x,
      y2: points[index + 1].y,
      color,
      width: 2
    });
  }
  points.forEach((point) => {
    target.page.ops.push({ kind: "rect", x: point.x - 3, y: point.y - 3, width: 6, height: 6, fill: color, radius: 3 });
    if (block.options.showValues) {
      drawText(target, point.x, point.y - 7, formatValue(point.datum.value, block.options), block.fontSize * 0.8, "#334155", "center");
    }
    drawText(target, point.x, area.bottom + block.fontSize * 1.1, point.datum.label, block.fontSize * 0.8, "#64748B", "center");
  });
}

function drawPieChart(target: DrawTarget, block: ChartBlock, x: number, y: number, width: number): void {
  const area = drawFrame(target, block, x, y, width);
  const total = block.data.reduce((sum, datum) => sum + datum.value, 0) || 1;
  const radius = Math.min((area.bottom - area.top) / 2, (area.right - area.left) * 0.28);
  const cx = area.left + radius;
  const cy = area.top + (area.bottom - area.top) / 2;
  let angle = -Math.PI / 2;
  block.data.forEach((datum, index) => {
    const slice = (datum.value / total) * Math.PI * 2;
    const steps = Math.max(2, Math.ceil((slice / (Math.PI * 2)) * 48));
    const points: Array<{ x: number; y: number }> = [{ x: cx, y: cy }];
    for (let step = 0; step <= steps; step += 1) {
      const current = angle + (slice * step) / steps;
      points.push({ x: cx + Math.cos(current) * radius, y: cy + Math.sin(current) * radius });
    }
    const color = datum.color ?? block.options.colors?.[index % block.options.colors.length] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    target.page.ops.push({ kind: "polygon", points, fill: color, closed: true });
    angle += slice;
  });
  const legendX = cx + radius + block.padding * 2;
  block.data.forEach((datum, index) => {
    const legendY = area.top + index * (block.fontSize * 1.8);
    const color = datum.color ?? block.options.colors?.[index % block.options.colors.length] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    target.page.ops.push({ kind: "rect", x: legendX, y: legendY, width: 8, height: 8, fill: color });
    drawText(target, legendX + 12, legendY + 7, `${datum.label} ${formatValue(datum.value, block.options)}`, block.fontSize * 0.85, "#334155");
  });
}

export function chartBlock(
  kind: PdfChartKind,
  data: readonly PdfChartDatum[],
  options: PdfChartOptions,
  style: ResolvedStyle
): ChartBlock {
  const normalized = chartData(data);
  const height = options.height === undefined ? 220 : positive(options.height, "height");
  const padding = options.padding === undefined ? 14 : nonNegative(options.padding, "padding");
  const fontSize = options.fontSize === undefined ? 9 : positive(options.fontSize, "fontSize");
  const titleHeight = options.title ? fontSize * 2.2 : 0;
  const block: ChartBlock = {
    kind: "chart",
    chart: kind,
    data: normalized,
    style,
    options: {
      ...options,
      showValues: options.showValues !== false,
      fontSize,
      padding,
      height
    },
    title: options.title,
    fontSize,
    padding,
    height: height + padding * 2 + titleHeight,
    marginTop: style.marginTop,
    marginBottom: style.marginBottom,
    draw(target, x, y, width) {
      if (block.title) drawText(target, x + padding, y + padding + fontSize, block.title, fontSize * 1.1, "#0F172A");
      if (kind === "bar") drawBarChart(target, block, x, y, width);
      else if (kind === "line") drawLineChart(target, block, x, y, width);
      else drawPieChart(target, block, x, y, width);
    }
  };
  return block;
}
