import { failXlsx } from "../errors.js";
import { XLSX_LIMITS, cellReference, type XlsxImageInput } from "../shared.js";
import type { ImageModel } from "./model.js";

/** An image decoded from bytes, a data URL or base64. */
export type MediaImage = {
  data: Uint8Array;
  format: "png" | "jpeg";
  width: number;
  height: number;
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function decodeBase64(value: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const cleaned = value.replace(/\s+/g, "").replace(/=+$/, "");
  const output = new Uint8Array(Math.floor((cleaned.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let index = 0;
  for (const character of cleaned) {
    const digit = alphabet.indexOf(character);
    if (digit === -1) failXlsx("XLSX_INVALID_INPUT", "Image base64 contains an invalid character.");
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

function dataUrlBytes(source: string): Uint8Array {
  const comma = source.indexOf(",");
  if (comma === -1) failXlsx("XLSX_INVALID_INPUT", "Image data URL is malformed.");
  const header = source.slice(5, comma);
  if (!header.includes("image/png") && !header.includes("image/jpeg") && !header.includes("image/jpg")) {
    failXlsx("XLSX_UNSUPPORTED", "Only PNG and JPEG data URLs are supported.");
  }
  return decodeBase64(source.slice(comma + 1));
}

function sourceBytes(source: Uint8Array | string): Uint8Array {
  if (source instanceof Uint8Array) return source;
  if (typeof source !== "string") failXlsx("XLSX_INVALID_INPUT", "Expected image bytes, a data URL or base64.");
  return source.startsWith("data:") ? dataUrlBytes(source) : decodeBase64(source);
}

function isPng(data: Uint8Array): boolean {
  return PNG_SIGNATURE.every((byte, index) => data[index] === byte);
}

function pngSize(data: Uint8Array): { width: number; height: number } {
  if (data.length < 24) failXlsx("XLSX_INVALID_INPUT", "PNG header is truncated.");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

// eslint-disable-next-line complexity -- JPEG marker state machine; splitting hides segment validation
function jpegSize(data: Uint8Array): { width: number; height: number } {
  let offset = 2;
  while (offset + 8 < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = data[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > data.length) break;
    const length = (data[offset] << 8) | data[offset + 1];
    if (length < 2 || offset + length > data.length) failXlsx("XLSX_INVALID_INPUT", "JPEG segment is invalid.");
    if (!JPEG_SOF.has(marker)) {
      offset += length;
      continue;
    }
    if (length < 8) failXlsx("XLSX_INVALID_INPUT", "JPEG frame header is too short.");
    return {
      height: (data[offset + 3] << 8) | data[offset + 4],
      width: (data[offset + 5] << 8) | data[offset + 6]
    };
  }
  return failXlsx("XLSX_INVALID_INPUT", "JPEG frame header was not found.");
}

function assertFormat(expected: "png" | "jpeg" | undefined, actual: "png" | "jpeg"): void {
  if (expected && expected !== actual) failXlsx("XLSX_INVALID_INPUT", `Expected a ${expected.toUpperCase()} image.`);
}

function mediaOf(data: Uint8Array): MediaImage {
  if (isPng(data)) {
    const size = pngSize(data);
    if (size.width <= 0 || size.height <= 0) failXlsx("XLSX_INVALID_INPUT", "PNG dimensions are invalid.");
    return { data, format: "png", ...size };
  }
  if (data[0] === 0xff && data[1] === 0xd8) {
    const size = jpegSize(data);
    if (size.width <= 0 || size.height <= 0) failXlsx("XLSX_INVALID_INPUT", "JPEG dimensions are invalid.");
    return { data, format: "jpeg", ...size };
  }
  return failXlsx("XLSX_UNSUPPORTED", "Only PNG and JPEG images are supported.");
}

/** Decodes an image and reads its intrinsic pixel dimensions. */
export function readMedia(source: Uint8Array | string, expected?: "png" | "jpeg"): MediaImage {
  const data = sourceBytes(source);
  if (data.length > XLSX_LIMITS.maxEntryBytes) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Image exceeds the configured byte limit.", { bytes: data.length });
  }
  const media = mediaOf(data);
  assertFormat(expected, media.format);
  return media;
}

/** Converts CSS pixels to English Metric Units used by DrawingML. */
export function pixelsToEmu(pixels: number): number {
  return Math.round(pixels * 9525);
}

function anchorOf(value: string | undefined): { row: number; column: number } {
  const match = /^([A-Z]{1,3})([1-9]\d*)$/.exec(value ?? "A1");
  if (!match) failXlsx("XLSX_INVALID_INPUT", "Expected an image anchor in A1 notation.", { anchor: value });
  let column = 0;
  for (const character of match[1]) column = column * 26 + character.charCodeAt(0) - 64;
  const row = Number(match[2]);
  if (column > XLSX_LIMITS.maxColumns || row > XLSX_LIMITS.maxRows) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "Image anchor exceeds the worksheet limits.", { anchor: value });
  }
  return { row, column };
}

function assertImageInput(input: XlsxImageInput | undefined): asserts input is XlsxImageInput {
  if (!input || typeof input !== "object" || input.data === undefined) {
    failXlsx("XLSX_INVALID_INPUT", "Expected an image with data.");
  }
}

function imageSize(input: XlsxImageInput, media: MediaImage): { width: number; height: number } {
  const width = input.width ?? media.width;
  const height = input.height ?? media.height;
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    failXlsx("XLSX_INVALID_INPUT", "Expected positive image dimensions.", { width, height });
  }
  return { width, height };
}

/** Builds the internal image model from a public image input. */
export function imageModel(input: XlsxImageInput): ImageModel {
  assertImageInput(input);
  const media = readMedia(input.data, input.format);
  const anchor = anchorOf(input.anchor);
  return {
    data: media.data,
    format: media.format,
    anchorRow: anchor.row - 1,
    anchorColumn: anchor.column - 1,
    ...imageSize(input, media),
    alt: input.alt
  };
}

/** Converts English Metric Units to CSS pixels. */
export function emuToPixels(emu: number): number {
  return emu / 9525;
}

/** Converts a string to a UTF-8 byte array, exported for callers that build media entries. */
export function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

/** Returns an image anchor in A1 notation, or A1 for an invalid model. */
export function anchorReference(image: ImageModel): string {
  return cellReference(image.anchorRow + 1, image.anchorColumn + 1);
}
