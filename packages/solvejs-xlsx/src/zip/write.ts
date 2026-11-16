import { failXlsx } from "../errors.js";
import { crc32 } from "./crc32.js";

/** A file stored in the ZIP container. Paths use forward slashes. */
export type ZipEntry = {
  name: string;
  data: Uint8Array;
};

type PreparedEntry = {
  name: string;
  nameBytes: Uint8Array;
  data: Uint8Array;
  compressed: Uint8Array;
  method: 0 | 8;
  crc: number;
  offset: number;
};

type CompressionCtor = new (format: string) => TransformStream<Uint8Array, Uint8Array>;

const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const EOCD_SIZE = 22;
const UTF8_FLAG = 0x0800;
const DOS_DATE_1980 = 0x0021;

class ByteWriter {
  readonly bytes: Uint8Array;
  readonly view: DataView;
  offset = 0;

  constructor(size: number) {
    this.bytes = new Uint8Array(size);
    this.view = new DataView(this.bytes.buffer);
  }

  u16(value: number): void {
    this.view.setUint16(this.offset, value, true);
    this.offset += 2;
  }

  u32(value: number): void {
    this.view.setUint32(this.offset, value >>> 0, true);
    this.offset += 4;
  }

  raw(data: Uint8Array): void {
    this.bytes.set(data, this.offset);
    this.offset += data.length;
  }
}

function assertEntryName(name: string): void {
  if (name.length === 0 || name.startsWith("/") || name.startsWith("\\") || name.split("/").includes("..")) {
    failXlsx("XLSX_INVALID_INPUT", "Expected a safe relative ZIP entry name.", { name });
  }
}

function prepareBase(entries: readonly ZipEntry[]): Array<Omit<PreparedEntry, "compressed" | "method">> {
  const encoder = new TextEncoder();
  const names = new Set<string>();

  return entries.map((entry) => {
    assertEntryName(entry.name);
    if (names.has(entry.name)) {
      failXlsx("XLSX_INVALID_INPUT", "ZIP entry names must be unique.", { name: entry.name });
    }
    names.add(entry.name);
    return {
      ...entry,
      nameBytes: encoder.encode(entry.name),
      crc: crc32(entry.data),
      offset: 0
    };
  });
}

function prepareStored(entries: readonly ZipEntry[]): PreparedEntry[] {
  return prepareBase(entries).map((entry) => ({ ...entry, compressed: entry.data, method: 0 }));
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const Ctor = (globalThis as { CompressionStream?: CompressionCtor }).CompressionStream;
  if (!Ctor) {
    failXlsx("XLSX_UNSUPPORTED", "This runtime does not provide CompressionStream.");
  }
  // TS 5.9 models typed arrays over ArrayBufferLike; the runtime accepts any Uint8Array here.
  const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(new Ctor("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function prepareDeflated(entries: readonly ZipEntry[]): Promise<PreparedEntry[]> {
  return Promise.all(
    prepareBase(entries).map(async (entry) => ({ ...entry, compressed: await deflateRaw(entry.data), method: 8 as const }))
  );
}

function totalSize(entries: readonly PreparedEntry[]): number {
  return entries.reduce(
    (size, entry) =>
      size +
      LOCAL_HEADER_SIZE +
      CENTRAL_HEADER_SIZE +
      entry.compressed.length +
      entry.nameBytes.length * 2,
    EOCD_SIZE
  );
}

function writeLocalHeader(writer: ByteWriter, entry: PreparedEntry): void {
  writer.u32(0x04034b50);
  writer.u16(20);
  writer.u16(UTF8_FLAG);
  writer.u16(entry.method);
  writer.u16(0);
  writer.u16(DOS_DATE_1980);
  writer.u32(entry.crc);
  writer.u32(entry.compressed.length);
  writer.u32(entry.data.length);
  writer.u16(entry.nameBytes.length);
  writer.u16(0);
  writer.raw(entry.nameBytes);
}

function writeCentralHeader(writer: ByteWriter, entry: PreparedEntry): void {
  writer.u32(0x02014b50);
  writer.u16(20);
  writer.u16(20);
  writer.u16(UTF8_FLAG);
  writer.u16(entry.method);
  writer.u16(0);
  writer.u16(DOS_DATE_1980);
  writer.u32(entry.crc);
  writer.u32(entry.compressed.length);
  writer.u32(entry.data.length);
  writer.u16(entry.nameBytes.length);
  writer.u16(0);
  writer.u16(0);
  writer.u16(0);
  writer.u16(0);
  writer.u32(0);
  writer.u32(entry.offset);
  writer.raw(entry.nameBytes);
}

function writeEocd(writer: ByteWriter, count: number, centralSize: number, centralOffset: number): void {
  writer.u32(0x06054b50);
  writer.u16(0);
  writer.u16(0);
  writer.u16(count);
  writer.u16(count);
  writer.u32(centralSize);
  writer.u32(centralOffset);
  writer.u16(0);
}

function assertBounds(entries: readonly PreparedEntry[]): void {
  for (const entry of entries) {
    if (entry.nameBytes.length > 0xffff) {
      failXlsx("XLSX_LIMIT_EXCEEDED", "ZIP entry name is too long.", { name: entry.name });
    }
    if (entry.data.length > 0xffffffff || entry.compressed.length > 0xffffffff) {
      failXlsx("XLSX_LIMIT_EXCEEDED", "ZIP entry is too large; ZIP64 is not supported.", { name: entry.name });
    }
  }
}

function assemble(entries: PreparedEntry[]): Uint8Array {
  if (entries.length > 0xffff) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "ZIP supports at most 65535 entries.");
  }
  assertBounds(entries);

  const size = totalSize(entries);
  if (size > 0xffffffff) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "ZIP archive is too large; ZIP64 is not supported.");
  }

  const writer = new ByteWriter(size);
  for (const entry of entries) {
    entry.offset = writer.offset;
    writeLocalHeader(writer, entry);
    writer.raw(entry.compressed);
  }

  const centralOffset = writer.offset;
  for (const entry of entries) writeCentralHeader(writer, entry);
  writeEocd(writer, entries.length, writer.offset - centralOffset, centralOffset);

  return writer.bytes;
}

/** Writes a ZIP container with stored (uncompressed) entries. */
export function writeZip(entries: readonly ZipEntry[]): Uint8Array {
  if (entries.length === 0) failXlsx("XLSX_INVALID_INPUT", "Expected at least one ZIP entry.");
  return assemble(prepareStored(entries));
}

/** Writes a ZIP container with DEFLATE-compressed entries. Requires a runtime with CompressionStream. */
export async function writeZipDeflated(entries: readonly ZipEntry[]): Promise<Uint8Array> {
  if (entries.length === 0) failXlsx("XLSX_INVALID_INPUT", "Expected at least one ZIP entry.");
  return assemble(await prepareDeflated(entries));
}
