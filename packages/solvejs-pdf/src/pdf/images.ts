import { failPdf } from "../errors.js";
import { PDF_LIMITS } from "../shared.js";
import { inflateZlib } from "./inflate.js";

/** An image ready to be embedded as a PDF image XObject. */
export type PdfImage = {
  data: Uint8Array;
  width: number;
  height: number;
  colorSpace: "DeviceGray" | "DeviceRGB" | "DeviceCMYK";
  /** JPEG bytes use DCTDecode; PNG pixels are stored uncompressed. */
  filter?: "DCTDecode" | "None";
  /** Optional 8-bit alpha channel used as a PDF SMask. */
  alpha?: Uint8Array;
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
  return { data, width, height, colorSpace: colorSpaceOf(components), filter: "DCTDecode" };
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

function readUint32(data: Uint8Array, offset: number): number {
  return data[offset] * 0x1000000 + (data[offset + 1] << 16) + (data[offset + 2] << 8) + data[offset + 3];
}

function paeth(left: number, up: number, upperLeft: number): number {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  return leftDistance <= upDistance && leftDistance <= upperLeftDistance ? left : upDistance <= upperLeftDistance ? up : upperLeft;
}

function unfilter(raw: Uint8Array, width: number, height: number, bytesPerPixel: number): Uint8Array {
  const stride = width * bytesPerPixel;
  const output = new Uint8Array(stride * height);
  const prior = new Uint8Array(stride);
  let offset = 0;
  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const filter = raw[offset];
    offset += 1;
    const row = raw.slice(offset, offset + stride);
    offset += stride;
    for (let index = 0; index < stride; index += 1) {
      const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0;
      const up = prior[index] ?? 0;
      const upperLeft = index >= bytesPerPixel ? prior[index - bytesPerPixel] ?? 0 : 0;
      if (filter === 0) continue;
      if (filter === 1) row[index] = (row[index] + left) & 0xff;
      else if (filter === 2) row[index] = (row[index] + up) & 0xff;
      else if (filter === 3) row[index] = (row[index] + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) row[index] = (row[index] + paeth(left, up, upperLeft)) & 0xff;
      else failPdf("PDF_INVALID_INPUT", "PNG uses an unsupported row filter.", { filter });
    }
    output.set(row, rowIndex * stride);
    prior.set(row);
  }
  return output;
}

/* eslint-disable complexity, max-lines-per-function -- PNG chunk and color-type matrix */
/** Reads an 8-bit PNG and converts it to raw PDF image pixels plus an optional alpha channel. */
export function parsePng(data: Uint8Array): PdfImage {
  if (data.length > PDF_LIMITS.maxImageBytes) {
    failPdf("PDF_LIMIT_EXCEEDED", "Image exceeds the configured byte limit.", { bytes: data.length });
  }
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (data.length < 33 || signature.some((value, index) => data[index] !== value)) {
    failPdf("PDF_INVALID_INPUT", "Expected a PNG image with the standard signature.");
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let palette: Uint8Array | undefined;
  let transparency: Uint8Array | undefined;
  const idat: Uint8Array[] = [];
  while (offset + 12 <= data.length) {
    const length = readUint32(data, offset);
    const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > data.length) failPdf("PDF_INVALID_INPUT", "PNG chunk is truncated.", { type });
    const chunk = data.subarray(start, end);
    if (type === "IHDR") {
      width = readUint32(chunk, 0);
      height = readUint32(chunk, 4);
      const bitDepth = chunk[8];
      colorType = chunk[9];
      if (bitDepth !== 8) failPdf("PDF_UNSUPPORTED", "Only 8-bit PNG images are supported.", { bitDepth });
      if (![0, 2, 3, 4, 6].includes(colorType)) failPdf("PDF_UNSUPPORTED", "Unsupported PNG color type.", { colorType });
      if (chunk[10] !== 0 || chunk[11] !== 0 || chunk[12] !== 0) {
        failPdf("PDF_UNSUPPORTED", "Only non-interlaced PNG images with standard compression are supported.");
      }
    } else if (type === "PLTE") {
      palette = chunk;
    } else if (type === "tRNS") {
      transparency = chunk;
    } else if (type === "IDAT") {
      idat.push(chunk);
    } else if (type === "IEND") {
      break;
    }
    offset = end + 4;
  }
  if (width <= 0 || height <= 0 || idat.length === 0) failPdf("PDF_INVALID_INPUT", "PNG is missing IHDR or IDAT data.");
  const bytesPerPixel = colorType === 6 ? 4 : colorType === 4 ? 2 : colorType === 2 ? 3 : 1;
  const expected = height * (1 + width * bytesPerPixel);
  if (expected > PDF_LIMITS.maxImageBytes) {
    failPdf("PDF_LIMIT_EXCEEDED", "PNG pixel data exceeds the configured image limit.", { bytes: expected });
  }
  const compressed = new Uint8Array(idat.reduce((total, chunk) => total + chunk.length, 0));
  let cursor = 0;
  for (const chunk of idat) {
    compressed.set(chunk, cursor);
    cursor += chunk.length;
  }
  const pixels = unfilter(inflateZlib(compressed, expected), width, height, bytesPerPixel);
  if (colorType === 2) return { data: pixels, width, height, colorSpace: "DeviceRGB", filter: "None" };
  if (colorType === 0) {
    let alpha: Uint8Array | undefined;
    if (transparency && transparency.length >= 2) {
      const key = (transparency[0] << 8) | transparency[1];
      alpha = Uint8Array.from(pixels, (value) => (value === key ? 0 : 255));
    }
    return { data: pixels, width, height, colorSpace: "DeviceGray", filter: "None", ...(alpha ? { alpha } : {}) };
  }
  if (colorType === 3) {
    if (!palette) failPdf("PDF_INVALID_INPUT", "PNG palette image is missing PLTE.");
    const rgb = new Uint8Array(width * height * 3);
    const alpha = transparency ? new Uint8Array(width * height).fill(255) : undefined;
    for (let index = 0; index < width * height; index += 1) {
      const paletteIndex = pixels[index];
      rgb[index * 3] = palette[paletteIndex * 3] ?? 0;
      rgb[index * 3 + 1] = palette[paletteIndex * 3 + 1] ?? 0;
      rgb[index * 3 + 2] = palette[paletteIndex * 3 + 2] ?? 0;
      if (alpha && transparency) alpha[index] = transparency[paletteIndex] ?? 255;
    }
    return { data: rgb, width, height, colorSpace: "DeviceRGB", filter: "None", ...(alpha ? { alpha } : {}) };
  }
  const channels = colorType === 6 ? 4 : 2;
  const rgb = colorType === 6 ? new Uint8Array(width * height * 3) : new Uint8Array(width * height);
  const alpha = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const source = index * channels;
    if (colorType === 6) {
      rgb[index * 3] = pixels[source];
      rgb[index * 3 + 1] = pixels[source + 1];
      rgb[index * 3 + 2] = pixels[source + 2];
      alpha[index] = pixels[source + 3];
    } else {
      rgb[index] = pixels[source];
      alpha[index] = pixels[source + 1];
    }
  }
  return {
    data: rgb,
    width,
    height,
    colorSpace: colorType === 6 ? "DeviceRGB" : "DeviceGray",
    filter: "None",
    alpha
  };
}
/* eslint-enable complexity, max-lines-per-function */

/** Detects JPEG or PNG bytes and returns the PDF image model. */
export function parseImage(data: Uint8Array): PdfImage {
  if (data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return parsePng(data);
  }
  return parseJpeg(data);
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
  if (!/image\/(jpeg|jpg|png)/i.test(header)) {
    failPdf("PDF_UNSUPPORTED", "Only PNG and JPEG data URLs are supported.");
  }
  return decodeBase64(source.slice(comma + 1));
}

/** Accepts bytes, a PNG/JPEG data URL, or a base64 PNG/JPEG string. */
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
