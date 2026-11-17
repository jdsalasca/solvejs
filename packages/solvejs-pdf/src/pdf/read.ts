/* eslint-disable complexity, max-lines-per-function, max-depth -- PDF object scanner */
import { failPdf } from "../errors.js";

const MAX_FORM_BYTES = 64 * 1024 * 1024;
const MAX_OBJECTS = 200_000;
const MAX_DECOMPRESSED_BYTES = 64 * 1024 * 1024;

export type PdfNameValue = { kind: "name"; value: string };
export type PdfStringValue = { kind: "string"; bytes: Uint8Array };
export type PdfRefValue = { kind: "ref"; num: number; gen: number };
export type PdfDictValue = Map<string, PdfValue>;
export type PdfArrayValue = PdfValue[];
export type PdfStreamValue = {
  kind: "stream";
  dict: PdfDictValue;
  dataStart: number;
  dataEnd: number;
  data?: Uint8Array;
};
export type PdfValue =
  | number
  | boolean
  | null
  | PdfNameValue
  | PdfStringValue
  | PdfRefValue
  | PdfDictValue
  | PdfArrayValue
  | PdfStreamValue;

export type PdfObject = {
  num: number;
  gen: number;
  value: PdfValue;
  offset: number;
};

export type ParsedPdf = {
  objects: Map<number, PdfObject>;
  trailers: PdfDictValue[];
  root: PdfObject | undefined;
  startXref: number | undefined;
  encrypted: boolean;
};

const WHITESPACE = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const DELIMITERS = new Set([0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b, 0x7d, 0x2f, 0x25]);

export function isDict(value: PdfValue | undefined): value is PdfDictValue {
  return value instanceof Map;
}

export function isArray(value: PdfValue | undefined): value is PdfArrayValue {
  return Array.isArray(value);
}

export function isStream(value: PdfValue | undefined): value is PdfStreamValue {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Map) && "kind" in value && value.kind === "stream";
}

export function isRef(value: PdfValue | undefined): value is PdfRefValue {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Map) && "kind" in value && value.kind === "ref";
}

export function isName(value: PdfValue | undefined): value is PdfNameValue {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Map) && "kind" in value && value.kind === "name";
}

export function isString(value: PdfValue | undefined): value is PdfStringValue {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Map) && "kind" in value && value.kind === "string";
}

function binaryString(bytes: Uint8Array): string {
  let out = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    out += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return out;
}

class Lexer {
  pos: number;

  constructor(private readonly source: string, start = 0) {
    this.pos = start;
  }

  skip(): void {
    const { source } = this;
    while (this.pos < source.length) {
      const code = source.charCodeAt(this.pos);
      if (WHITESPACE.has(code)) {
        this.pos += 1;
      } else if (code === 0x25) {
        while (this.pos < source.length && source[this.pos] !== "\n" && source[this.pos] !== "\r") this.pos += 1;
      } else {
        break;
      }
    }
  }

  private readName(): PdfNameValue {
    this.pos += 1;
    let raw = "";
    while (this.pos < this.source.length) {
      const code = this.source.charCodeAt(this.pos);
      if (WHITESPACE.has(code) || DELIMITERS.has(code)) break;
      raw += this.source[this.pos];
      this.pos += 1;
    }
    return { kind: "name", value: raw.replace(/#([0-9a-fA-F]{2})/g, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16))) };
  }

  private readLiteralString(): PdfStringValue {
    this.pos += 1;
    const bytes: number[] = [];
    let depth = 1;
    while (this.pos < this.source.length) {
      const char = this.source[this.pos];
      if (char === "\\") {
        this.pos += 1;
        const escaped = this.source[this.pos];
        if (escaped === "n") bytes.push(0x0a);
        else if (escaped === "r") bytes.push(0x0d);
        else if (escaped === "t") bytes.push(0x09);
        else if (escaped === "b") bytes.push(0x08);
        else if (escaped === "f") bytes.push(0x0c);
        else if (escaped === "\r") {
          this.pos += 1;
          if (this.source[this.pos] === "\n") this.pos += 1;
          continue;
        } else if (escaped === "\n") {
          this.pos += 1;
          continue;
        } else if (escaped >= "0" && escaped <= "7") {
          let octal = "";
          for (let count = 0; count < 3 && this.source[this.pos] >= "0" && this.source[this.pos] <= "7"; count += 1) {
            octal += this.source[this.pos];
            this.pos += 1;
          }
          bytes.push(Number.parseInt(octal, 8) & 0xff);
          continue;
        } else {
          bytes.push(escaped.charCodeAt(0));
        }
        this.pos += 1;
        continue;
      }
      if (char === "(") depth += 1;
      if (char === ")") {
        depth -= 1;
        if (depth === 0) {
          this.pos += 1;
          break;
        }
      }
      bytes.push(char.charCodeAt(0) & 0xff);
      this.pos += 1;
    }
    return { kind: "string", bytes: Uint8Array.from(bytes) };
  }

  private readHexString(): PdfStringValue {
    this.pos += 1;
    let hex = "";
    while (this.pos < this.source.length && this.source[this.pos] !== ">") {
      const char = this.source[this.pos];
      if (/[0-9a-fA-F]/.test(char)) hex += char;
      this.pos += 1;
    }
    this.pos += 1;
    if (hex.length % 2 === 1) hex += "0";
    const bytes = new Uint8Array(hex.length / 2);
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
    return { kind: "string", bytes };
  }

  private readNumber(): number {
    const start = this.pos;
    if (this.source[this.pos] === "+" || this.source[this.pos] === "-") this.pos += 1;
    while (this.pos < this.source.length) {
      const char = this.source[this.pos];
      if (char === "." || (char >= "0" && char <= "9")) this.pos += 1;
      else break;
    }
    return Number(this.source.slice(start, this.pos));
  }

  private readWord(): string {
    const start = this.pos;
    while (this.pos < this.source.length) {
      const code = this.source.charCodeAt(this.pos);
      if (WHITESPACE.has(code) || DELIMITERS.has(code)) break;
      this.pos += 1;
    }
    return this.source.slice(start, this.pos);
  }

  parse(): PdfValue {
    this.skip();
    const char = this.source[this.pos];
    if (char === "<" && this.source[this.pos + 1] === "<") return this.readDict();
    if (char === "<") return this.readHexString();
    if (char === "(") return this.readLiteralString();
    if (char === "[") return this.readArray();
    if (char === "/") return this.readName();
    if (char === "+" || char === "-" || (char >= "0" && char <= "9") || char === ".") {
      this.skip();
      const number = this.readNumber();
      if (!Number.isInteger(number)) return number;
      const saved = this.pos;
      this.skip();
      if (this.source[this.pos] >= "0" && this.source[this.pos] <= "9") {
        const gen = this.readNumber();
        this.skip();
        if (this.source[this.pos] === "R") {
          this.pos += 1;
          return { kind: "ref", num: number, gen };
        }
      }
      this.pos = saved;
      return number;
    }
    const word = this.readWord();
    if (word === "true") return true;
    if (word === "false") return false;
    if (word === "null") return null;
    return { kind: "name", value: word };
  }

  private readArray(): PdfArrayValue {
    this.pos += 1;
    const items: PdfValue[] = [];
    while (this.pos < this.source.length) {
      this.skip();
      if (this.source[this.pos] === "]") {
        this.pos += 1;
        break;
      }
      items.push(this.parse());
    }
    return items;
  }

  private readDict(): PdfDictValue {
    this.pos += 2;
    const dict: PdfDictValue = new Map();
    while (this.pos < this.source.length) {
      this.skip();
      if (this.source[this.pos] === ">" && this.source[this.pos + 1] === ">") {
        this.pos += 2;
        break;
      }
      if (this.source[this.pos] !== "/") {
        this.pos += 1;
        continue;
      }
      const key = this.readName().value;
      dict.set(key, this.parse());
    }
    return dict;
  }
}

function findObject(source: string, from: number): { num: number; gen: number; body: number } | undefined {
  const pattern = /(\d{1,10})\s+(\d{1,5})\s+obj\b/g;
  pattern.lastIndex = from;
  const match = pattern.exec(source);
  if (!match) return undefined;
  return { num: Number(match[1]), gen: Number(match[2]), body: pattern.lastIndex };
}

function streamLength(dict: PdfDictValue, objects: Map<number, PdfObject>): number | undefined {
  const length = dict.get("Length");
  if (typeof length === "number") return length;
  if (isRef(length)) {
    const target = objects.get(length.num)?.value;
    if (typeof target === "number") return target;
  }
  return undefined;
}

function scanObjects(source: string): Map<number, PdfObject> {
  const objects = new Map<number, PdfObject>();
  let position = 0;
  while (position < source.length) {
    const header = findObject(source, position);
    if (!header) break;
    const lexer = new Lexer(source, header.body);
    let value = lexer.parse();
    let end = lexer.pos;
    if (isDict(value)) {
      lexer.skip();
      if (source.startsWith("stream", lexer.pos)) {
        let dataStart = lexer.pos + 6;
        if (source[dataStart] === "\r") dataStart += 1;
        if (source[dataStart] === "\n") dataStart += 1;
        const length = streamLength(value, objects);
        const dataEnd = length !== undefined ? Math.min(source.length, dataStart + length) : source.indexOf("endstream", dataStart);
        const endstream = source.indexOf("endstream", Math.max(dataEnd, dataStart));
        value = { kind: "stream", dict: value, dataStart, dataEnd, data: undefined };
        end = endstream >= 0 ? endstream + 9 : source.length;
      }
    }
    const object: PdfObject = { num: header.num, gen: header.gen, value, offset: position };
    const existing = objects.get(header.num);
    if (!existing || existing.offset <= object.offset) objects.set(header.num, object);
    if (objects.size > MAX_OBJECTS) failPdf("PDF_LIMIT_EXCEEDED", "PDF has too many objects.", { objects: objects.size });
    position = end;
  }
  return objects;
}

function collectTrailers(source: string, objects: Map<number, PdfObject>): PdfDictValue[] {
  const trailers: PdfDictValue[] = [];
  const pattern = /trailer\s*<</g;
  let match = pattern.exec(source);
  while (match) {
    const lexer = new Lexer(source, match.index + "trailer".length);
    lexer.skip();
    const value = lexer.parse();
    if (isDict(value)) trailers.push(value);
    match = pattern.exec(source);
  }
  for (const object of objects.values()) {
    const dict = isDict(object.value) ? object.value : isStream(object.value) ? object.value.dict : undefined;
    const type = dict?.get("Type");
    if (dict && isName(type) && type.value === "XRef") {
      trailers.push(dict);
    }
  }
  return trailers;
}

function resolvedDict(value: PdfValue | undefined, objects: Map<number, PdfObject>): PdfDictValue | undefined {
  if (isDict(value)) return value;
  if (isRef(value)) {
    const target = objects.get(value.num)?.value;
    if (isDict(target)) return target;
    if (isStream(target)) return target.dict;
  }
  return undefined;
}

function findRoot(objects: Map<number, PdfObject>, trailers: PdfDictValue[]): PdfObject | undefined {
  for (let index = trailers.length - 1; index >= 0; index -= 1) {
    const root = trailers[index].get("Root");
    if (isRef(root)) {
      const object = objects.get(root.num);
      if (object) return object;
    }
  }
  let best: PdfObject | undefined;
  for (const object of objects.values()) {
    const type = isDict(object.value) ? object.value.get("Type") : undefined;
    if (isDict(object.value) && isName(type) && type.value === "Catalog") {
      if (!best || object.offset >= best.offset) best = object;
    }
  }
  return best;
}

function startXrefOf(source: string): number | undefined {
  const index = source.lastIndexOf("startxref");
  if (index < 0) return undefined;
  const match = /startxref\s+(\d+)/.exec(source.slice(index));
  return match ? Number(match[1]) : undefined;
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_DECOMPRESSED_BYTES) {
      await reader.cancel();
      failPdf("PDF_LIMIT_EXCEEDED", "PDF stream expands beyond the limit.", { bytes: total });
    }
    chunks.push(value);
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function asciiHex(bytes: Uint8Array): Uint8Array {
  const text = binaryString(bytes).replace(/[^0-9a-fA-F]/g, "");
  const padded = text.length % 2 === 1 ? `${text}0` : text;
  const out = new Uint8Array(padded.length / 2);
  for (let index = 0; index < out.length; index += 1) out[index] = Number.parseInt(padded.slice(index * 2, index * 2 + 2), 16);
  return out;
}

async function decodeStreamData(stream: PdfStreamValue): Promise<Uint8Array> {
  if (stream.data) return stream.data;
  const source = stream.dict;
  if (!stream.dataEnd || stream.dataEnd <= stream.dataStart) {
    failPdf("PDF_INVALID_INPUT", "PDF stream has no data.");
  }
  let data: Uint8Array = new Uint8Array(0);
  const bytes = STREAM_BYTES.get(stream);
  if (!bytes) failPdf("PDF_INVALID_INPUT", "PDF stream bytes are unavailable.");
  const filter = source.get("Filter");
  const filters = isArray(filter) ? filter : filter ? [filter] : [];
  for (const entry of filters) {
    const name = isName(entry) ? entry.value : undefined;
    if (name === "FlateDecode") data = await inflate(bytes);
    else if (name === "ASCIIHexDecode") data = asciiHex(bytes);
    else failPdf("PDF_UNSUPPORTED", "Unsupported PDF stream filter.", { filter: name });
  }
  stream.data = data;
  return data;
}

export type ParsedPdfWithSource = ParsedPdf & { source: string };

const STREAM_BYTES = new WeakMap<PdfStreamValue, Uint8Array>();

function attachStreamBytes(parsed: ParsedPdf, source: string): void {
  for (const object of parsed.objects.values()) {
    if (!isStream(object.value)) continue;
    const bytes = Uint8Array.from(source.slice(object.value.dataStart, object.value.dataEnd), (char) => char.charCodeAt(0) & 0xff);
    STREAM_BYTES.set(object.value, bytes);
  }
}

async function parseObjectStreams(parsed: ParsedPdf): Promise<void> {
  for (const object of [...parsed.objects.values()]) {
    if (!isStream(object.value)) continue;
    const type = object.value.dict.get("Type");
    if (!isName(type) || type.value !== "ObjStm") continue;
    const data = await decodeStreamData(object.value);
    const text = binaryString(data);
    const count = Number(object.value.dict.get("N"));
    const first = Number(object.value.dict.get("First"));
    if (!Number.isInteger(count) || !Number.isInteger(first)) continue;
    if (count > MAX_OBJECTS) failPdf("PDF_LIMIT_EXCEEDED", "PDF object stream declares too many objects.", { count });
    const lexer = new Lexer(text, 0);
    const entries: Array<{ num: number; offset: number }> = [];
    for (let index = 0; index < count; index += 1) {
      lexer.skip();
      const num = lexer.parse();
      lexer.skip();
      const offset = lexer.parse();
      if (typeof num === "number" && typeof offset === "number") entries.push({ num, offset });
    }
    for (const entry of entries) {
      const contained = new Lexer(text, first + entry.offset);
      const value = contained.parse();
      const existing = parsed.objects.get(entry.num);
      const offset = object.offset + 0.5;
      if (!existing || existing.offset <= offset) {
        parsed.objects.set(entry.num, { num: entry.num, gen: 0, value, offset });
      }
    }
  }
}

export async function parsePdf(bytes: Uint8Array): Promise<ParsedPdfWithSource> {
  if (bytes.byteLength < 5) failPdf("PDF_INVALID_INPUT", "Expected a PDF document.");
  if (bytes.byteLength > MAX_FORM_BYTES) failPdf("PDF_LIMIT_EXCEEDED", "PDF is larger than the form reader limit.", { bytes: bytes.byteLength });
  const source = binaryString(bytes);
  const header = source.indexOf("%PDF-");
  if (header < 0) failPdf("PDF_INVALID_INPUT", "Expected a PDF header.");
  const objects = scanObjects(source);
  const firstTrailers = collectTrailers(source, objects);
  const encrypted = firstTrailers.some((trailer) => trailer.has("Encrypt"));
  const parsed: ParsedPdfWithSource = {
    objects,
    trailers: firstTrailers,
    root: undefined,
    startXref: startXrefOf(source),
    encrypted,
    source
  };
  attachStreamBytes(parsed, source);
  if (!encrypted) {
    await parseObjectStreams(parsed);
    parsed.trailers = collectTrailers(source, objects);
    parsed.root = findRoot(objects, parsed.trailers);
  }
  return parsed;
}

export { binaryString, decodeStreamData, resolvedDict };
