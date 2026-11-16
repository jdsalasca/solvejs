import { failPdf } from "./errors.js";

/** Limits that keep layout and serialization bounded. */
export const PDF_LIMITS = {
  maxPages: 500,
  maxBlocks: 20_000,
  maxTextLength: 200_000,
  maxImageBytes: 20 * 1024 * 1024,
  maxTotalImageBytes: 64 * 1024 * 1024,
  maxTableRows: 20_000,
  maxTableCells: 200_000,
  maxOutlineItems: 1_000
} as const;

/** Named PdfColors accepted anywhere a color is expected. */
export const PdfColors = {
  Black: "#000000",
  White: "#FFFFFF",
  Slate: "#0F172A",
  Gray: "#64748B",
  LightGray: "#E2E8F0",
  SoftGray: "#F1F5F9",
  Red: "#DC2626",
  DarkRed: "#991B1B",
  Rose: "#FB7185",
  Orange: "#F97316",
  Amber: "#F59E0B",
  Yellow: "#FACC15",
  Green: "#16A34A",
  DarkGreen: "#166534",
  Emerald: "#10B981",
  Teal: "#0D9488",
  Blue: "#2563EB",
  DarkBlue: "#1E3A8A",
  Sky: "#0EA5E9",
  LightBlue: "#DBEAFE",
  Indigo: "#4F46E5",
  Purple: "#7C3AED",
  Pink: "#EC4899",
  Brown: "#92400E"
} as const;

/** A named palette entry or a `#RRGGBB` hexadecimal color. */
export type PdfColor = keyof typeof PdfColors | (string & {});

export type PdfAlign = "left" | "center" | "right";
export type PdfFontFamily = "helvetica" | "times" | "courier";

/** Page size presets in PDF points (1/72 inch). */
export const PAGE_SIZES = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
  a3: { width: 841.89, height: 1190.55 },
  a5: { width: 419.53, height: 595.28 }
} as const;

export type PdfPageSizeName = keyof typeof PAGE_SIZES;
export type PdfPageSize = PdfPageSizeName | { width: number; height: number };

/** Converts millimeters to PDF points. */
export function mm(value: number): number {
  return (value * 72) / 25.4;
}

/** Converts centimeters to PDF points. */
export function cm(value: number): number {
  return (value * 72) / 2.54;
}

/** Converts inches to PDF points. */
export function inches(value: number): number {
  return value * 72;
}

/** Returns a value unchanged; present so documents read as points explicitly. */
export function pt(value: number): number {
  return value;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Normalizes a named or hexadecimal color to `#RRGGBB`. */
export function normalizeColor(value: PdfColor | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    failPdf("PDF_INVALID_INPUT", "Expected a color string.", { color: value });
  }
  const named = (PdfColors as Record<string, string>)[value];
  if (named) return named;
  if (!HEX_COLOR.test(value)) {
    failPdf("PDF_INVALID_INPUT", `Expected a named color or #RRGGBB, received ${JSON.stringify(value)}.`, {
      color: value
    });
  }
  return value.toUpperCase();
}

/** Converts `#RRGGBB` into normalized RGB components for a PDF operator. */
export function colorComponents(value: string): [number, number, number] {
  if (!HEX_COLOR.test(value)) {
    failPdf("PDF_INVALID_INPUT", `Expected #RRGGBB, received ${JSON.stringify(value)}.`, { color: value });
  }
  return [
    Number.parseInt(value.slice(1, 3), 16) / 255,
    Number.parseInt(value.slice(3, 5), 16) / 255,
    Number.parseInt(value.slice(5, 7), 16) / 255
  ];
}

/** Resolves a page preset or a custom size, validating finite positive dimensions. */
export function resolvePageSize(size: PdfPageSize | undefined): { width: number; height: number } {
  if (size === undefined) return PAGE_SIZES.a4;
  if (typeof size === "string") {
    const preset = PAGE_SIZES[size];
    if (!preset) failPdf("PDF_INVALID_INPUT", `Unknown page size: ${size}.`, { size });
    return preset;
  }
  if (typeof size !== "object" || size === null) {
    failPdf("PDF_INVALID_INPUT", "Expected a page preset or an object with width and height.");
  }
  return { width: positive(size.width, "width"), height: positive(size.height, "height") };
}

/** Validates a non-negative finite number used for spacing or sizes. */
export function nonNegative(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    failPdf("PDF_INVALID_INPUT", `Expected ${label} to be a non-negative finite number.`, { [label]: value });
  }
  return value;
}

/** Validates a positive finite number used for sizes. */
export function positive(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    failPdf("PDF_INVALID_INPUT", `Expected ${label} to be a positive finite number.`, { [label]: value });
  }
  return value;
}

/** Formats a number for PDF output without locale-specific separators. */
export function num(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, "");
}

