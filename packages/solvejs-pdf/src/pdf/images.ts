import { failPdf } from "../errors.js";
import { PDF_LIMITS } from "../shared.js";

/** A JPEG image ready to be embedded as a PDF image XObject. */
export type PdfImage = {
  data: Uint8Array;
  width: number;
  height: number;
  colorSpace: "DeviceGray" | "DeviceRGB" | "DeviceCMYK";
};

const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
]);

function readUint16(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1];
}

function colorSpaceOf(components: number): PdfImage["colorSpace"] {
  if (components === 1) return "DeviceGray";
  if (components === 3) return "DeviceRGB";
  if (components === 4) return "DeviceCMYK";
  return failPdf("PDF_UNSUPPORTED", "JPEG images must have 1, 3 or 4 color components.", { components });
}

type Segment = { marker: number; length: number; next: number };

function standaloneMarker(marker: number): boolean {
  return marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7);
}

function readSegment(data: Uint8Array, offset: number): Segment {
  if (data[offset] !== 0xff) return { marker: -1, length: 0, next: offset + 1 };
  const marker = data[offset + 1] ?? 0;
  if (standaloneMarker(marker)) return { marker, length: 0, next: offset + 2 };
  if (offset + 2 >= data.length) return { marker, length: 0, next: data.length };
  const length = readUint16(data, offset + 2);
  if (length < 2 || offset + 2 + length > data.length) {
    failPdf("PDF_INVALID_INPUT", "JPEG segment length is invalid.");
  }
  return { marker, length, next: offset + 2 + length };
}

function frameOf(data: Uint8Array, segment: Segment): PdfImage {
  if (segment.length < 8) failPdf("PDF_INVALID_INPUT", "JPEG frame header is too short.");
  const offset = segment.next - segment.length;
  if (data[offset + 2] !== 8) failPdf("PDF_UNSUPPORTED", "Only 8-bit JPEG images are supported.");
  const height = readUint16(data, offset + 3);
  const width = readUint16(data, offset + 5);
  const components = data[offset + 7];
  if (components !== 1 && components !== 3) {
    failPdf("PDF_UNSUPPORTED", "Only grayscale and RGB JPEG images are supported.", { components });
  }
  if (width <= 0 || height <= 0) {
    failPdf("PDF_INVALID_INPUT", "JPEG dimensions must be positive.", { width, height });
  }
  return { data, width, height, colorSpace: colorSpaceOf(components) };
}

function hasMarker(data: Uint8Array, marker: number): boolean {
  for (let index = 0; index + 1 < data.length; index += 1) {
    if (data[index] === 0xff && data[index + 1] === marker) return true;
  }
  return false;
}

/** Reads the dimensions and color space of a baseline or progressive JPEG. */
// eslint-disable-next-line complexity -- JPEG segment state machine with explicit validation
export function parseJpeg(data: Uint8Array): PdfImage {
  if (data.length > PDF_LIMITS.maxImageBytes) {
    failPdf("PDF_LIMIT_EXCEEDED", "Image exceeds the configured byte limit.", { bytes: data.length });
  }
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) {
    failPdf("PDF_INVALID_INPUT", "Expected a JPEG image beginning with FFD8.");
  }
  if (!hasMarker(data, 0xda) || !hasMarker(data, 0xd9)) {
    failPdf("PDF_INVALID_INPUT", "JPEG scan data is incomplete.");
  }

  let offset = 2;
  while (offset + 3 < data.length) {
    const segment = readSegment(data, offset);
    if (segment.marker === -1) {
      offset = segment.next;
      continue;
    }
    if (SOF_MARKERS.has(segment.marker)) return frameOf(data, segment);
    offset = segment.next;
  }

  return failPdf("PDF_INVALID_INPUT", "JPEG frame header was not found.");
}

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function decodeBase64(value: string): Uint8Array {
  const cleaned = value.replace(/\s+/g, "").replace(/=+$/, "");
  const output = new Uint8Array(Math.floor((cleaned.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let index = 0;

  for (const character of cleaned) {
    const digit = BASE64_ALPHABET.indexOf(character);
    if (digit === -1) failPdf("PDF_INVALID_INPUT", "Image base64 contains an invalid character.");
    buffer = (buffer << 6) | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output[index] = (buffer >> bits) & 0xff;
      index += 1;
    }
  }
  return output.subarray(0, index);
}

function decodeDataUrl(source: string): Uint8Array {
  const comma = source.indexOf(",");
  if (comma === -1) failPdf("PDF_INVALID_INPUT", "Image data URL is malformed.");
  const header = source.slice(5, comma);
  if (!header.includes("image/jpeg") && !header.includes("image/jpg")) {
    failPdf("PDF_UNSUPPORTED", "Only JPEG data URLs are supported.");
  }
  return decodeBase64(source.slice(comma + 1));
}

/** Accepts bytes, a data URL, or a base64 JPEG string. */
export function decodeImageSource(source: Uint8Array | string): Uint8Array {
  if (source instanceof Uint8Array) return source;
  if (typeof source !== "string") {
    failPdf("PDF_INVALID_INPUT", "Expected image bytes, a data URL or a base64 string.");
  }
  if (source.length > PDF_LIMITS.maxImageBytes * 2) {
    failPdf("PDF_LIMIT_EXCEEDED", "Encoded image exceeds the configured limit.", { length: source.length });
  }
  return source.startsWith("data:") ? decodeDataUrl(source) : decodeBase64(source);
}
