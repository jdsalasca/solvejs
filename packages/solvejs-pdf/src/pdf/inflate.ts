import { failPdf } from "../errors.js";

/* eslint-disable complexity, max-params, max-depth -- DEFLATE block state machine */

const MAX_OUTPUT = 64 * 1024 * 1024;

type Huffman = Map<number, number>[];

function buildHuffman(lengths: readonly number[]): Huffman {
  let maxBits = 0;
  const counts: number[] = [];
  for (const length of lengths) {
    if (length > 15) failPdf("PDF_INVALID_INPUT", "PNG Huffman code is too long.");
    if (length > 0) {
      counts[length] = (counts[length] ?? 0) + 1;
      if (length > maxBits) maxBits = length;
    }
  }
  const next: number[] = [];
  let code = 0;
  for (let bits = 1; bits <= 15; bits += 1) {
    code = (code + (counts[bits - 1] ?? 0)) << 1;
    next[bits] = code;
  }
  const table: Huffman = [];
  for (let bits = 0; bits <= 15; bits += 1) table[bits] = new Map();
  lengths.forEach((length, symbol) => {
    if (length === 0) return;
    table[length].set(next[length], symbol);
    next[length] += 1;
  });
  return table;
}

class BitReader {
  position = 0;
  bit = 0;

  constructor(private readonly data: Uint8Array) {}

  read(count: number): number {
    let value = 0;
    for (let index = 0; index < count; index += 1) {
      if (this.position >= this.data.length) failPdf("PDF_INVALID_INPUT", "PNG compressed data ended unexpectedly.");
      value |= ((this.data[this.position] >> this.bit) & 1) << index;
      this.bit += 1;
      if (this.bit === 8) {
        this.bit = 0;
        this.position += 1;
      }
    }
    return value;
  }

  align(): void {
    if (this.bit !== 0) {
      this.bit = 0;
      this.position += 1;
    }
  }

  byte(): number {
    if (this.position >= this.data.length) failPdf("PDF_INVALID_INPUT", "PNG compressed data ended unexpectedly.");
    return this.data[this.position++];
  }

  symbol(table: Huffman): number {
    let code = 0;
    for (let bits = 1; bits <= 15; bits += 1) {
      code = (code << 1) | this.read(1);
      const symbol = table[bits]?.get(code);
      if (symbol !== undefined) return symbol;
    }
    return failPdf("PDF_INVALID_INPUT", "Invalid PNG Huffman code.");
  }
}

const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

function fixedTables(): { lit: Huffman; dist: Huffman } {
  const lit = new Array<number>(288);
  for (let index = 0; index < 144; index += 1) lit[index] = 8;
  for (let index = 144; index < 256; index += 1) lit[index] = 9;
  for (let index = 256; index < 280; index += 1) lit[index] = 7;
  for (let index = 280; index < 288; index += 1) lit[index] = 8;
  return { lit: buildHuffman(lit), dist: buildHuffman(new Array<number>(30).fill(5)) };
}

function dynamicTables(reader: BitReader): { lit: Huffman; dist: Huffman } {
  const literalCount = reader.read(5) + 257;
  const distanceCount = reader.read(5) + 1;
  const codeLengthCount = reader.read(4) + 4;
  const codeLengths = new Array<number>(19).fill(0);
  for (let index = 0; index < codeLengthCount; index += 1) codeLengths[CODE_LENGTH_ORDER[index]] = reader.read(3);
  const codeTable = buildHuffman(codeLengths);
  const lengths: number[] = [];
  while (lengths.length < literalCount + distanceCount) {
    const symbol = reader.symbol(codeTable);
    if (symbol < 16) lengths.push(symbol);
    else if (symbol === 16) {
      const previous = lengths[lengths.length - 1];
      if (previous === undefined) failPdf("PDF_INVALID_INPUT", "PNG repeat code has no previous length.");
      const repeat = 3 + reader.read(2);
      for (let index = 0; index < repeat; index += 1) lengths.push(previous);
    } else if (symbol === 17) {
      const repeat = 3 + reader.read(3);
      for (let index = 0; index < repeat; index += 1) lengths.push(0);
    } else {
      const repeat = 11 + reader.read(7);
      for (let index = 0; index < repeat; index += 1) lengths.push(0);
    }
  }
  return {
    lit: buildHuffman(lengths.slice(0, literalCount)),
    dist: buildHuffman(lengths.slice(literalCount))
  };
}

function inflateBlock(reader: BitReader, lit: Huffman, dist: Huffman, output: Uint8Array, written: { count: number }): void {
  while (true) {
    const symbol = reader.symbol(lit);
    if (symbol === 256) return;
    if (symbol < 256) {
      if (written.count >= output.length) failPdf("PDF_LIMIT_EXCEEDED", "PNG image expands beyond the limit.");
      output[written.count++] = symbol;
      continue;
    }
    const lengthIndex = symbol - 257;
    const length = LENGTH_BASE[lengthIndex] + reader.read(LENGTH_EXTRA[lengthIndex]);
    const distanceSymbol = reader.symbol(dist);
    const distance = DIST_BASE[distanceSymbol] + reader.read(DIST_EXTRA[distanceSymbol]);
    if (distance > written.count) failPdf("PDF_INVALID_INPUT", "PNG distance points before the output start.");
    for (let index = 0; index < length; index += 1) {
      if (written.count >= output.length) failPdf("PDF_LIMIT_EXCEEDED", "PNG image expands beyond the limit.");
      output[written.count] = output[written.count - distance];
      written.count += 1;
    }
  }
}

/** Inflates a zlib-wrapped DEFLATE stream synchronously. */
export function inflateZlib(data: Uint8Array, expectedSize?: number): Uint8Array {
  if (data.length < 6) failPdf("PDF_INVALID_INPUT", "PNG compressed data is too short.");
  const header = (data[0] << 8) | data[1];
  if ((data[0] & 0x0f) !== 8 || header % 31 !== 0) {
    failPdf("PDF_INVALID_INPUT", "Expected a zlib stream in the PNG image.");
  }
  const reader = new BitReader(data);
  reader.position = 2;
  const capacity = expectedSize === undefined ? Math.max(1024, data.length * 8) : Math.min(MAX_OUTPUT, Math.max(1, expectedSize));
  const output = new Uint8Array(capacity);
  const written = { count: 0 };
  let final = 0;
  while (final === 0) {
    final = reader.read(1);
    const type = reader.read(2);
    if (type === 0) {
      reader.align();
      const length = reader.byte() | (reader.byte() << 8);
      const inverse = reader.byte() | (reader.byte() << 8);
      if ((length ^ 0xffff) !== inverse) failPdf("PDF_INVALID_INPUT", "PNG stored block length is invalid.");
      for (let index = 0; index < length; index += 1) {
        if (written.count >= output.length) failPdf("PDF_LIMIT_EXCEEDED", "PNG image expands beyond the limit.");
        output[written.count++] = reader.byte();
      }
      continue;
    }
    if (type === 3) failPdf("PDF_INVALID_INPUT", "PNG uses a reserved DEFLATE block type.");
    const tables = type === 1 ? fixedTables() : dynamicTables(reader);
    inflateBlock(reader, tables.lit, tables.dist, output, written);
    if (written.count > MAX_OUTPUT) failPdf("PDF_LIMIT_EXCEEDED", "PNG image expands beyond the limit.");
  }
  return output.slice(0, written.count);
}
