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
  if (segment.length < 8 + components * 3) {
    failPdf("PDF_INVALID_INPUT", "JPEG frame header is truncated.");
  }
  if (width <= 0 || height <= 0) {
    failPdf("PDF_INVALID_INPUT", "JPEG dimensions must be positive.", { width, height });
  }
  return { data, width, height, colorSpace: colorSpaceOf(components) };
}

/* eslint-disable complexity, max-lines-per-function, max-depth -- JPEG segment/scan state machine */
/** Reads the dimensions and color space of a baseline or extended sequential JPEG. */
export function parseJpeg(data: Uint8Array): PdfImage {
  if (data.length > PDF_LIMITS.maxImageBytes) {
    failPdf("PDF_LIMIT_EXCEEDED", "Image exceeds the configured byte limit.", { bytes: data.length });
  }
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) {
    failPdf("PDF_INVALID_INPUT", "Expected a JPEG image beginning with FFD8.");
  }

  let offset = 2;
  let frame: PdfImage | undefined;
  while (offset < data.length) {
    if (data[offset] !== 0xff) failPdf("PDF_INVALID_INPUT", "Expected a JPEG marker.");
    while (data[offset] === 0xff) offset += 1;
    if (offset >= data.length) failPdf("PDF_INVALID_INPUT", "JPEG ended inside a marker.");
    const marker = data[offset];
    offset += 1;
    if (marker === 0xd9) {
      if (!frame) failPdf("PDF_INVALID_INPUT", "JPEG ended before its frame header.");
      failPdf("PDF_INVALID_INPUT", "JPEG ended before its scan data.");
    }
    if (marker === 0x00 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      failPdf("PDF_INVALID_INPUT", "Unexpected JPEG marker outside scan data.", { marker });
    }
    if (offset + 2 > data.length) failPdf("PDF_INVALID_INPUT", "JPEG segment is truncated.");
    const length = readUint16(data, offset);
    if (length < 2 || offset + length > data.length) {
      failPdf("PDF_INVALID_INPUT", "JPEG segment length is invalid.");
    }
    if (marker === 0xda) {
      if (!frame) failPdf("PDF_INVALID_INPUT", "JPEG scan appears before its frame header.");
      let scan = offset + length;
      let ended = false;
      while (scan + 1 < data.length) {
        if (data[scan] !== 0xff) {
          scan += 1;
          continue;
        }
        const next = data[scan + 1];
        if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) {
          scan += 2;
          continue;
        }
        if (next === 0xff) {
          scan += 1;
          continue;
        }
        if (next === 0xd9) {
          ended = true;
          break;
        }
        failPdf("PDF_UNSUPPORTED", "JPEG contains multiple scans or unsupported markers.", { marker: next });
      }
      if (!ended) failPdf("PDF_INVALID_INPUT", "JPEG scan data is incomplete.");
      return frame;
    }
    if (SOF_MARKERS.has(marker)) {
      if (marker !== 0xc0 && marker !== 0xc1) {
        failPdf("PDF_UNSUPPORTED", "Only baseline and extended sequential JPEG images are supported.", { marker });
      }
      if (frame) failPdf("PDF_INVALID_INPUT", "JPEG has more than one frame header.");
      frame = frameOf(data, { marker, length, next: offset + length });
    }
    offset += length;
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
