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
  const last = view.byteLength - EOCD_SIZE;
  const first = Math.max(0, last - 0xffff);
  for (let offset = last; offset >= first; offset -= 1) {
    if (u32(view, offset) === 0x06054b50) return offset;
  }
  return failXlsx("XLSX_INVALID_ZIP", "ZIP end-of-central-directory record not found.");
}

function decodeName(view: DataView, offset: number, length: number): string {
  assertRange(view, offset, length, "entry name");
  return new TextDecoder().decode(new Uint8Array(view.buffer, view.byteOffset + offset, length));
}

function readCentralEntries(view: DataView, eocd: number): CentralEntry[] {
  const count = u16(view, eocd + 10);
  const centralOffset = u32(view, eocd + 16);
  if (count > XLSX_LIMITS.maxEntries) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "ZIP has too many entries.", { count });
  }
  assertRange(view, centralOffset, count * CENTRAL_HEADER_SIZE, "central directory");

  const entries: CentralEntry[] = [];
  let offset = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (u32(view, offset) !== 0x02014b50) {
      failXlsx("XLSX_INVALID_ZIP", "ZIP central directory entry is malformed.", { index });
    }
    const nameLength = u16(view, offset + 28);
    const extraLength = u16(view, offset + 30);
    const commentLength = u16(view, offset + 32);
    entries.push({
      flags: u16(view, offset + 8),
      method: u16(view, offset + 10),
      crc: u32(view, offset + 16),
      compressedSize: u32(view, offset + 20),
      uncompressedSize: u32(view, offset + 24),
      localOffset: u32(view, offset + 42),
      name: decodeName(view, offset + CENTRAL_HEADER_SIZE, nameLength)
    });
    offset += CENTRAL_HEADER_SIZE + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const Ctor = (globalThis as { DecompressionStream?: DecompressionCtor }).DecompressionStream;
  if (!Ctor) {
    failXlsx("XLSX_UNSUPPORTED", "This runtime does not provide DecompressionStream.");
  }
  // TS 5.9 models typed arrays over ArrayBufferLike; the runtime accepts any Uint8Array here.
  const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(new Ctor("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function readLocalData(view: DataView, entry: CentralEntry): Uint8Array {
  if ((entry.flags & 1) !== 0) {
    failXlsx("XLSX_UNSUPPORTED", "Encrypted ZIP entries are not supported.", { name: entry.name });
  }
  assertRange(view, entry.localOffset, LOCAL_HEADER_SIZE, "local header");
  if (u32(view, entry.localOffset) !== 0x04034b50) {
    failXlsx("XLSX_INVALID_ZIP", "ZIP local header is malformed.", { name: entry.name });
  }
  const nameLength = u16(view, entry.localOffset + 26);
  const extraLength = u16(view, entry.localOffset + 28);
  const dataOffset = entry.localOffset + LOCAL_HEADER_SIZE + nameLength + extraLength;
  assertRange(view, dataOffset, entry.compressedSize, "entry data");
  return new Uint8Array(view.buffer, view.byteOffset + dataOffset, entry.compressedSize);
}

async function readEntry(view: DataView, entry: CentralEntry): Promise<Uint8Array> {
  const compressed = readLocalData(view, entry);
  let data: Uint8Array;
  if (entry.method === 0) data = compressed;
  else if (entry.method === 8) data = await inflateRaw(compressed);
  else failXlsx("XLSX_UNSUPPORTED", "Only stored and deflated ZIP entries are supported.", { method: entry.method });

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
  const files = new Map<string, Uint8Array>();
  let total = 0;

  for (const entry of entries) {
    if (files.has(entry.name)) {
      failXlsx("XLSX_INVALID_ZIP", "ZIP entries must have unique names.", { name: entry.name });
    }
    if (entry.uncompressedSize > XLSX_LIMITS.maxEntryBytes) {
      failXlsx("XLSX_LIMIT_EXCEEDED", "ZIP entry is too large.", { name: entry.name });
    }
    const data = await readEntry(view, entry);
    total += data.length;
    if (total > XLSX_LIMITS.maxTotalBytes) {
      failXlsx("XLSX_LIMIT_EXCEEDED", "ZIP expands beyond the configured total limit.");
    }
    files.set(entry.name, data);
  }

  return files;
}
