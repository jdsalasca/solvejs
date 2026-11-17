import { failXlsx } from "../errors.js";
import { XLSX_LIMITS } from "../shared.js";
import { crc32 } from "./crc32.js";

type CentralEntry = {
  name: string;
  flags: number;
  method: number;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
};

type DecompressionCtor = new (format: string) => TransformStream<Uint8Array, Uint8Array>;

const EOCD_SIZE = 22;
const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const UTF8_FLAG = 0x0800;
const DATA_DESCRIPTOR_FLAG = 0x0008;
const ZIP64_MARKER = 0xffffffff;

function u16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function u32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function assertRange(view: DataView, offset: number, length: number, label: string): void {
  if (offset < 0 || length < 0 || offset + length > view.byteLength) {
    failXlsx("XLSX_INVALID_ZIP", `ZIP ${label} points outside the file.`, { offset, length });
  }
}

function findEocd(view: DataView): number {
  if (view.byteLength < EOCD_SIZE) failXlsx("XLSX_INVALID_ZIP", "File is too small to be a ZIP archive.");
  const last = view.byteLength - EOCD_SIZE;
  const first = Math.max(0, last - 0xffff);
  for (let offset = last; offset >= first; offset -= 1) {
    if (u32(view, offset) === 0x06054b50) {
      const commentLength = u16(view, offset + 20);
      if (offset + EOCD_SIZE + commentLength === view.byteLength) return offset;
    }
  }
  return failXlsx("XLSX_INVALID_ZIP", "ZIP end-of-central-directory record not found.");
}

function assertSupportedZip(view: DataView, eocd: number): { count: number; centralOffset: number; centralSize: number } {
  if (u16(view, eocd + 4) !== 0 || u16(view, eocd + 6) !== 0) {
    failXlsx("XLSX_UNSUPPORTED", "Multi-disk ZIP archives are not supported.");
  }
  const count = u16(view, eocd + 8);
  if (count !== u16(view, eocd + 10)) {
    failXlsx("XLSX_INVALID_ZIP", "ZIP entry counts disagree.");
  }
  if (count === 0xffff) failXlsx("XLSX_UNSUPPORTED", "ZIP64 archives are not supported.");
  const centralSize = u32(view, eocd + 12);
  const centralOffset = u32(view, eocd + 16);
  if (centralSize === ZIP64_MARKER || centralOffset === ZIP64_MARKER) {
    failXlsx("XLSX_UNSUPPORTED", "ZIP64 archives are not supported.");
  }
  if (centralOffset + centralSize > eocd) {
    failXlsx("XLSX_INVALID_ZIP", "ZIP central directory overlaps the end record.");
  }
  return { count, centralOffset, centralSize };
}

function assertSafeName(name: string): void {
  if (name.startsWith("/") || name.includes("\\") || name.split("/").includes("..")) {
    failXlsx("XLSX_INVALID_ZIP", "ZIP entry name escapes the archive root.", { name });
  }
}

function decodeName(view: DataView, offset: number, length: number, flags: number): string {
  assertRange(view, offset, length, "entry name");
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, length);
  if ((flags & UTF8_FLAG) === 0 && bytes.some((byte) => byte > 127)) {
    failXlsx("XLSX_UNSUPPORTED", "Non-UTF-8 ZIP entry names are not supported.");
  }
  const name = new TextDecoder().decode(bytes);
  assertSafeName(name);
  return name;
}

function readCentralEntries(view: DataView, eocd: number): CentralEntry[] {
  const { count, centralOffset, centralSize } = assertSupportedZip(view, eocd);
  if (count > XLSX_LIMITS.maxEntries) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "ZIP has too many entries.", { count });
  }
  assertRange(view, centralOffset, centralSize, "central directory");

  const entries: CentralEntry[] = [];
  let offset = centralOffset;
  for (let index = 0; index < count; index += 1) {
    assertRange(view, offset, CENTRAL_HEADER_SIZE, "central entry");
    if (u32(view, offset) !== 0x02014b50) {
      failXlsx("XLSX_INVALID_ZIP", "ZIP central directory entry is malformed.", { index });
    }
    const nameLength = u16(view, offset + 28);
    const extraLength = u16(view, offset + 30);
    const commentLength = u16(view, offset + 32);
    const flags = u16(view, offset + 8);
    entries.push({
      flags,
      method: u16(view, offset + 10),
      crc: u32(view, offset + 16),
      compressedSize: u32(view, offset + 20),
      uncompressedSize: u32(view, offset + 24),
      localOffset: u32(view, offset + 42),
      name: decodeName(view, offset + CENTRAL_HEADER_SIZE, nameLength, flags)
    });
    offset += CENTRAL_HEADER_SIZE + nameLength + extraLength + commentLength;
    if (offset > centralOffset + centralSize) {
      failXlsx("XLSX_INVALID_ZIP", "ZIP central directory entry extends past its size.", { index });
    }
  }
  return entries;
}

function checkLocalIdentity(view: DataView, entry: CentralEntry): { flags: number; dataOffset: number } {
  assertRange(view, entry.localOffset, LOCAL_HEADER_SIZE, "local header");
  if (u32(view, entry.localOffset) !== 0x04034b50) {
    failXlsx("XLSX_INVALID_ZIP", "ZIP local header is malformed.", { name: entry.name });
  }
  const flags = u16(view, entry.localOffset + 6);
  const method = u16(view, entry.localOffset + 8);
  if (flags !== entry.flags || method !== entry.method) {
    failXlsx("XLSX_INVALID_ZIP", "ZIP local and central headers disagree.", { name: entry.name });
  }
  const nameLength = u16(view, entry.localOffset + 26);
  const extraLength = u16(view, entry.localOffset + 28);
  const nameOffset = entry.localOffset + LOCAL_HEADER_SIZE;
  const localName = decodeName(view, nameOffset, nameLength, flags);
  if (localName !== entry.name) {
    failXlsx("XLSX_INVALID_ZIP", "ZIP local and central names disagree.", { name: entry.name });
  }
  const dataOffset = nameOffset + nameLength + extraLength;
  assertRange(view, dataOffset, entry.compressedSize, "entry data");
  return { flags, dataOffset };
}

function checkLocalSizes(view: DataView, entry: CentralEntry, flags: number): void {
  if ((flags & DATA_DESCRIPTOR_FLAG) !== 0) return;
  const crc = u32(view, entry.localOffset + 14);
  const compressed = u32(view, entry.localOffset + 18);
  const uncompressed = u32(view, entry.localOffset + 22);
  if (crc !== entry.crc || compressed !== entry.compressedSize || uncompressed !== entry.uncompressedSize) {
    failXlsx("XLSX_INVALID_ZIP", "ZIP local and central sizes disagree.", { name: entry.name });
  }
}

function checkLocalHeader(view: DataView, entry: CentralEntry): number {
  const { flags, dataOffset } = checkLocalIdentity(view, entry);
  checkLocalSizes(view, entry, flags);
  return dataOffset;
}

function concatChunks(chunks: readonly Uint8Array[], total: number): Uint8Array {
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

async function inflateRaw(data: Uint8Array, expected: number): Promise<Uint8Array> {
  const Ctor = (globalThis as { DecompressionStream?: DecompressionCtor }).DecompressionStream;
  if (!Ctor) failXlsx("XLSX_UNSUPPORTED", "This runtime does not provide DecompressionStream.");

  // TS 5.9 models typed arrays over ArrayBufferLike; the runtime accepts any Uint8Array here.
  const reader = new Blob([data as unknown as BlobPart])
    .stream()
    .pipeThrough(new Ctor("deflate-raw"))
    .getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > expected || total > XLSX_LIMITS.maxEntryBytes) {
      await reader.cancel();
      failXlsx("XLSX_LIMIT_EXCEEDED", "ZIP entry expands beyond its declared size.", { total, expected });
    }
    chunks.push(value);
  }

  return concatChunks(chunks, total);
}

async function readEntry(view: DataView, entry: CentralEntry): Promise<Uint8Array> {
  const dataOffset = checkLocalHeader(view, entry);
  const compressed = new Uint8Array(view.buffer, view.byteOffset + dataOffset, entry.compressedSize);
  let data: Uint8Array;

  if (entry.method === 0) {
    data = compressed;
  } else if (entry.method === 8) {
    data = await inflateRaw(compressed, entry.uncompressedSize);
  } else {
    failXlsx("XLSX_UNSUPPORTED", "Only stored and deflated ZIP entries are supported.", { method: entry.method });
  }

  if (data.length !== entry.uncompressedSize || crc32(data) !== entry.crc) {
    failXlsx("XLSX_INVALID_ZIP", "ZIP entry failed its size or CRC check.", { name: entry.name });
  }
  return data;
}

/** Reads a ZIP container into a map of entry names to bytes. */
export async function readZip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEocd(view);
  const entries = readCentralEntries(view, eocd);
  const declared = entries.reduce((total, entry) => total + entry.uncompressedSize, 0);
  if (declared > XLSX_LIMITS.maxTotalBytes) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "ZIP declares more data than the configured total limit.");
  }

  const files = new Map<string, Uint8Array>();
  const names = new Set<string>();

  for (const entry of entries) {
    if (names.has(entry.name)) {
      failXlsx("XLSX_INVALID_ZIP", "ZIP entries must have unique names.", { name: entry.name });
    }
    names.add(entry.name);
    if (entry.uncompressedSize > XLSX_LIMITS.maxEntryBytes) {
      failXlsx("XLSX_LIMIT_EXCEEDED", "ZIP entry is too large.", { name: entry.name });
    }
  }

  // Each entry is capped at its declared size and the declared total is bounded above,
  // so entries can inflate concurrently without weakening the decompression budget.
  const read = await Promise.all(entries.map(async (entry) => [entry.name, await readEntry(view, entry)] as const));
  for (const [name, data] of read) files.set(name, data);
  return files;
}
