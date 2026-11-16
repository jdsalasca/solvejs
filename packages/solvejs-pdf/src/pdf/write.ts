import { failPdf } from "../errors.js";
import { PDF_LIMITS, colorComponents, num } from "../shared.js";
import { baseFontName, encodeWinAnsi, type PdfFontKey } from "./fonts.js";
import type { PdfImage } from "./images.js";
import type { PdfDocumentModel, PdfLink, PdfOp, PdfPageModel } from "./model.js";

const HEADER = "%PDF-1.7\n";

class ByteBuilder {
  private readonly chunks: Uint8Array[] = [];
  private size = 0;

  get length(): number {
    return this.size;
  }

  pushAscii(value: string): void {
    this.pushBytes(new TextEncoder().encode(value));
  }

  pushLatin1(value: string): void {
    const bytes = new Uint8Array(value.length);
    for (let index = 0; index < value.length; index += 1) bytes[index] = value.charCodeAt(index) & 0xff;
    this.pushBytes(bytes);
  }

  pushBytes(bytes: Uint8Array): void {
    this.chunks.push(bytes);
    this.size += bytes.length;
  }

  toBytes(): Uint8Array {
    const output = new Uint8Array(this.size);
    let offset = 0;
    for (const chunk of this.chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    return output;
  }
}

function textBytes(text: string): Uint8Array {
  const output = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) output[index] = text.charCodeAt(index) & 0xff;
  return output;
}

function escapeLiteral(value: string): string {
  let result = "";
  for (const byte of encodeWinAnsi(value.replace(/\r?\n/g, " "))) {
    if (byte === 0x5c) result += "\\\\";
    else if (byte === 0x28) result += "\\(";
    else if (byte === 0x29) result += "\\)";
    else if (byte < 32 || byte > 126) result += `\\${byte.toString(8).padStart(3, "0")}`;
    else result += String.fromCharCode(byte);
  }
  return result;
}

function rgb(value: string): string {
  return colorComponents(value).map(num).join(" ");
}

function utf16Hex(value: string): string {
  let hex = "FEFF";
  for (let index = 0; index < value.length; index += 1) {
    hex += value.charCodeAt(index).toString(16).padStart(4, "0").toUpperCase();
  }
  return `<${hex}>`;
}

type RoundedRect = { x: number; y: number; width: number; height: number; radius: number };

function roundedRectPath(rect: RoundedRect): string {
  const { x, y, width, height } = rect;
  const r = Math.min(rect.radius, width / 2, height / 2);
  const k = 0.5522847498 * r;
  return [
    `${num(x + r)} ${num(y)} m`,
    `${num(x + width - r)} ${num(y)} l`,
    `${num(x + width - r + k)} ${num(y)} ${num(x + width)} ${num(y + r - k)} ${num(x + width)} ${num(y + r)} c`,
    `${num(x + width)} ${num(y + height - r)} l`,
    `${num(x + width)} ${num(y + height - r + k)} ${num(x + width - r + k)} ${num(y + height)} ${num(x + width - r)} ${num(y + height)} c`,
    `${num(x + r)} ${num(y + height)} l`,
    `${num(x + r - k)} ${num(y + height)} ${num(x)} ${num(y + height - r + k)} ${num(x)} ${num(y + height - r)} c`,
    `${num(x)} ${num(y + r)} l`,
    `${num(x)} ${num(y + r - k)} ${num(x + r - k)} ${num(y)} ${num(x + r)} ${num(y)} c`,
    "h"
  ].join("\n");
}

function rectPaint(op: Extract<PdfOp, { kind: "rect" }>): string[] {
  const parts: string[] = [];
  if (op.fill) parts.push(`${rgb(op.fill)} rg`);
  if (op.stroke) parts.push(`${rgb(op.stroke)} RG`, `${num(op.lineWidth ?? 1)} w`);
  return parts;
}

function rectOperator(op: Extract<PdfOp, { kind: "rect" }>): string {
  if (op.fill && op.stroke) return "B";
  return op.fill ? "f" : "S";
}

function rectCommands(op: Extract<PdfOp, { kind: "rect" }>, pageHeight: number): string {
  const bottom = pageHeight - op.y - op.height;
  const radius = Math.max(0, op.radius ?? 0);
  const path =
    radius > 0
      ? roundedRectPath({ x: op.x, y: bottom, width: op.width, height: op.height, radius })
      : `${num(op.x)} ${num(bottom)} ${num(op.width)} ${num(op.height)} re`;
  return `${[...rectPaint(op), path, rectOperator(op)].join("\n")}\n`;
}

function lineCommands(op: Extract<PdfOp, { kind: "line" }>, pageHeight: number): string {
  const dash = op.dash && op.dash.length > 0 ? `[${op.dash.map(num).join(" ")}] 0 d\n` : "";
  return `${rgb(op.color)} RG\n${num(op.width)} w\n${dash}${num(op.x1)} ${num(pageHeight - op.y1)} m\n${num(op.x2)} ${num(
    pageHeight - op.y2
  )} l\nS\n`;
}

function textCommands(op: Extract<PdfOp, { kind: "text" }>, pageHeight: number, fontName: string): string {
  return `BT\n/${fontName} ${num(op.size)} Tf\n${rgb(op.color)} rg\n1 0 0 1 ${num(op.x)} ${num(
    pageHeight - op.y
  )} Tm\n(${escapeLiteral(op.text)}) Tj\nET\n`;
}

function contentFor(page: PdfPageModel, fontNames: Map<PdfFontKey, string>, imageNames: Map<PdfImage, string>): Uint8Array {
  const builder = new ByteBuilder();
  for (const op of page.ops) {
    if (op.kind === "text") builder.pushAscii(textCommands(op, page.height, fontNames.get(op.font) ?? "F1"));
    else if (op.kind === "rect") builder.pushAscii(rectCommands(op, page.height));
    else if (op.kind === "line") builder.pushAscii(lineCommands(op, page.height));
    else {
      builder.pushAscii(
        `q\n${num(op.width)} 0 0 ${num(op.height)} ${num(op.x)} ${num(page.height - op.y - op.height)} cm\n/${
          imageNames.get(op.image) ?? "Im1"
        } Do\nQ\n`
      );
    }
  }
  return builder.toBytes();
}

type ResourceIds = {
  fontIds: Map<PdfFontKey, number>;
  imageIds: Map<PdfImage, number>;
  pageIds: Array<{ page: number; content: number; annotations: number[] }>;
  nextId: number;
};

function collectResources(model: PdfDocumentModel): ResourceIds {
  const fonts = new Set<PdfFontKey>();
  const images = new Set<PdfImage>();
  for (const page of model.pages) {
    for (const op of page.ops) {
      if (op.kind === "text") fonts.add(op.font);
      if (op.kind === "image") images.add(op.image);
    }
  }

  let nextId = 4;
  const fontIds = new Map<PdfFontKey, number>();
  for (const font of fonts) fontIds.set(font, nextId++);
  const imageIds = new Map<PdfImage, number>();
  for (const image of images) imageIds.set(image, nextId++);

  const pageIds = model.pages.map((page) => {
    const pageId = nextId++;
    const contentId = nextId++;
    const annotations = page.links.map(() => nextId++);
    return { page: pageId, content: contentId, annotations };
  });
  return { fontIds, imageIds, pageIds, nextId };
}

function fontObject(font: PdfFontKey): Uint8Array {
  return textBytes(`<< /Type /Font /Subtype /Type1 /BaseFont /${baseFontName(font)} /Encoding /WinAnsiEncoding >>`);
}

function imageObject(image: PdfImage): Uint8Array {
  const builder = new ByteBuilder();
  builder.pushAscii(
    `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /${
      image.colorSpace
    } /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`
  );
  builder.pushBytes(image.data);
  builder.pushAscii("\nendstream");
  return builder.toBytes();
}

function streamObject(data: Uint8Array, compressed: boolean): Uint8Array {
  const builder = new ByteBuilder();
  builder.pushAscii(`<< /Length ${data.length}${compressed ? " /Filter /FlateDecode" : ""} >>\nstream\n`);
  builder.pushBytes(data);
  builder.pushAscii("\nendstream");
  return builder.toBytes();
}

function escapeUri(value: string): string {
  const escape = /%[0-9A-Fa-f]{2}/;
  const encoded = value
    .split(/(%[0-9A-Fa-f]{2})/)
    .map((part) => {
      if (escape.test(part) && part.length === 3) return part;
      try {
        return encodeURI(part);
      } catch {
        failPdf("PDF_INVALID_INPUT", "Link target contains malformed Unicode.", { href: value });
      }
    })
    .join("");
  return encoded.replace(/[\\()]/g, "\\$&");
}

function annotationObject(link: PdfLink, pageHeight: number): Uint8Array {
  const bottom = pageHeight - link.y - link.height;
  return textBytes(
    `<< /Type /Annot /Subtype /Link /Rect [${num(link.x)} ${num(bottom)} ${num(link.x + link.width)} ${num(
      pageHeight - link.y
    )}] /Border [0 0 0] /A << /S /URI /URI (${escapeUri(link.href)}) >> >>`
  );
}

function infoObject(metadata: PdfDocumentModel["metadata"]): Uint8Array {
  const entries: string[] = [];
  if (metadata.title) entries.push(`/Title ${utf16Hex(metadata.title)}`);
  if (metadata.author) entries.push(`/Author ${utf16Hex(metadata.author)}`);
  if (metadata.subject) entries.push(`/Subject ${utf16Hex(metadata.subject)}`);
  if (metadata.keywords) entries.push(`/Keywords ${utf16Hex(metadata.keywords)}`);
  if (metadata.creator) entries.push(`/Creator ${utf16Hex(metadata.creator)}`);
  entries.push(`/Producer ${utf16Hex(metadata.producer ?? "SolveJS PDF")}`);
  return textBytes(`<< ${entries.join(" ")} >>`);
}

function resourceDictionary(
  fontIds: Map<PdfFontKey, number>,
  imageIds: Map<PdfImage, number>,
  fontNames: Map<PdfFontKey, string>,
  imageNames: Map<PdfImage, string>
): string {
  const fonts = [...fontIds.keys()].map((font) => `/${fontNames.get(font)} ${fontIds.get(font)} 0 R`).join(" ");
  const images = [...imageIds.keys()].map((image) => `/${imageNames.get(image)} ${imageIds.get(image)} 0 R`).join(" ");
  const xObjects = images ? ` /XObject << ${images} >>` : "";
  return `<< /Font << ${fonts} >>${xObjects} >>`;
}

function buildPageObject(
  page: PdfPageModel,
  ids: { page: number; content: number; annotations: number[] },
  resources: string
): Uint8Array {
  const annots = ids.annotations.length > 0 ? ` /Annots [${ids.annotations.map((id) => `${id} 0 R`).join(" ")}]` : "";
  return textBytes(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(page.width)} ${num(page.height)}] /Resources ${resources} /Contents ${
      ids.content
    } 0 R${annots} >>`
  );
}

function buildObjects(
  model: PdfDocumentModel,
  contents: Uint8Array[],
  compressed: boolean
): { objects: Map<number, Uint8Array>; size: number } {
  const resources = collectResources(model);
  const fontNames = new Map<PdfFontKey, string>();
  [...resources.fontIds.keys()].forEach((font, index) => fontNames.set(font, `F${index + 1}`));
  const imageNames = new Map<PdfImage, string>();
  [...resources.imageIds.keys()].forEach((image, index) => imageNames.set(image, `Im${index + 1}`));

  const objects = new Map<number, Uint8Array>();
  objects.set(1, textBytes("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.set(2, textBytes(`<< /Type /Pages /Kids [${resources.pageIds.map((entry) => `${entry.page} 0 R`).join(" ")}] /Count ${model.pages.length} >>`));
  objects.set(3, infoObject(model.metadata));

  for (const [font, id] of resources.fontIds) objects.set(id, fontObject(font));
  for (const [image, id] of resources.imageIds) objects.set(id, imageObject(image));

  const resource = resourceDictionary(resources.fontIds, resources.imageIds, fontNames, imageNames);
  model.pages.forEach((page, index) => {
    const ids = resources.pageIds[index];
    objects.set(ids.page, buildPageObject(page, ids, resource));
    objects.set(ids.content, streamObject(contents[index], compressed));
    page.links.forEach((link, linkIndex) => {
      objects.set(ids.annotations[linkIndex], annotationObject(link, page.height));
    });
  });

  return { objects, size: resources.nextId };
}

function writeXref(builder: ByteBuilder, offsets: readonly number[], size: number): void {
  const offset = builder.length;
  builder.pushAscii(`xref\n0 ${size}\n0000000000 65535 f \n`);
  for (let id = 1; id < size; id += 1) {
    builder.pushAscii(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  builder.pushAscii(`trailer\n<< /Size ${size} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${offset}\n%%EOF\n`);
}

function assemble(objects: Map<number, Uint8Array>, size: number): Uint8Array {
  const builder = new ByteBuilder();
  builder.pushLatin1(`${HEADER}%\u00e2\u00e3\u00cf\u00d3\n`);
  const offsets = new Array<number>(size).fill(0);
  for (let id = 1; id < size; id += 1) {
    const object = objects.get(id);
    if (!object) failPdf("PDF_INVALID_INPUT", `PDF object ${id} is missing.`);
    offsets[id] = builder.length;
    builder.pushAscii(`${id} 0 obj\n`);
    builder.pushBytes(object);
    builder.pushAscii("\nendobj\n");
  }
  writeXref(builder, offsets, size);
  return builder.toBytes();
}

function validatePageDimensions(page: PdfPageModel, index: number): void {
  if (!Number.isFinite(page.width) || !Number.isFinite(page.height) || page.width <= 0 || page.height <= 0) {
    failPdf("PDF_INVALID_INPUT", "Page dimensions must be positive finite numbers.", { page: index + 1 });
  }
}

function validateTextOp(op: PdfOp, index: number): void {
  if (op.kind === "text" && op.text.length > PDF_LIMITS.maxTextLength) {
    failPdf("PDF_LIMIT_EXCEEDED", "Text exceeds the configured length limit.", { page: index + 1 });
  }
}

function validateLink(link: PdfLink): void {
  if (!/^https?:\/\/|^mailto:|^tel:/i.test(link.href)) {
    failPdf("PDF_INVALID_INPUT", "Link targets must be http(s), mailto or tel URLs.", { href: link.href });
  }
}

function validatePage(page: PdfPageModel, index: number): void {
  validatePageDimensions(page, index);
  page.ops.forEach((op) => validateTextOp(op, index));
  page.links.forEach(validateLink);
}

/** Validates the document model invariants that serialization relies on. */
export function validatePdfModel(model: PdfDocumentModel): void {
  if (!model || !Array.isArray(model.pages) || model.pages.length === 0) {
    failPdf("PDF_INVALID_INPUT", "Expected a document with at least one page.");
  }
  if (model.pages.length > PDF_LIMITS.maxPages) {
    failPdf("PDF_LIMIT_EXCEEDED", "Document has too many pages.", { pages: model.pages.length });
  }
  model.pages.forEach(validatePage);
}

/** Serializes a laid-out document into an uncompressed PDF. */
export function writePdfModel(model: PdfDocumentModel): Uint8Array {
  validatePdfModel(model);
  const resources = collectResources(model);
  const fontNames = new Map<PdfFontKey, string>();
  [...resources.fontIds.keys()].forEach((font, index) => fontNames.set(font, `F${index + 1}`));
  const imageNames = new Map<PdfImage, string>();
  [...resources.imageIds.keys()].forEach((image, index) => imageNames.set(image, `Im${index + 1}`));
  const contents = model.pages.map((page) => contentFor(page, fontNames, imageNames));
  const { objects, size } = buildObjects(model, contents, false);
  return assemble(objects, size);
}

type CompressionCtor = new (format: string) => TransformStream<Uint8Array, Uint8Array>;

async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const Ctor = (globalThis as { CompressionStream?: CompressionCtor }).CompressionStream;
  if (!Ctor) failPdf("PDF_UNSUPPORTED", "This runtime does not provide CompressionStream.");
  // TS models typed arrays over ArrayBufferLike; the runtime accepts any Uint8Array.
  const stream = new Blob([data as unknown as BlobPart])
    .stream()
    .pipeThrough(new Ctor("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Serializes a laid-out document into a Flate-compressed PDF. */
export async function writePdfModelCompressed(model: PdfDocumentModel): Promise<Uint8Array> {
  validatePdfModel(model);
  const resources = collectResources(model);
  const fontNames = new Map<PdfFontKey, string>();
  [...resources.fontIds.keys()].forEach((font, index) => fontNames.set(font, `F${index + 1}`));
  const imageNames = new Map<PdfImage, string>();
  [...resources.imageIds.keys()].forEach((image, index) => imageNames.set(image, `Im${index + 1}`));
  const contents = model.pages.map((page) => contentFor(page, fontNames, imageNames));
  const compressed = await Promise.all(contents.map(deflate));
  const { objects, size } = buildObjects(model, compressed, true);
  return assemble(objects, size);
}
