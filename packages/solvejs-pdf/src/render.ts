import { buildPdfDocument } from "./layout/engine.js";
import type { PdfElement } from "./layout/types.js";
import { writePdfModel, writePdfModelCompressed } from "./pdf/write.js";

/** Renders a declarative PDF into uncompressed bytes. */
export function renderPdf(element: PdfElement): Uint8Array {
  return writePdfModel(buildPdfDocument(element));
}

/** Renders a declarative PDF into Flate-compressed bytes. */
export async function renderPdfCompressed(element: PdfElement): Promise<Uint8Array> {
  return writePdfModelCompressed(buildPdfDocument(element));
}
