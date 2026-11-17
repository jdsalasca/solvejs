/* eslint-disable complexity, max-lines-per-function, max-params -- AcroForm field walker and PDF revision writer */
import { failPdf } from "./errors.js";
import {
  isArray,
  isDict,
  isName,
  isRef,
  isStream,
  isString,
  parsePdf,
  resolvedDict,
  type PdfDictValue,
  type PdfNameValue,
  type PdfObject,
  type PdfStringValue,
  type PdfValue
} from "./pdf/read.js";

/** The kinds of AcroForm fields this package can read and fill. */
export type PdfFormFieldType = "text" | "checkbox" | "radio" | "choice" | "signature" | "button";

/** A value accepted by `fillPdfForm`. */
export type PdfFormValue = string | boolean | number | readonly string[] | null;

/** One interactive field found in an AcroForm PDF. */
export type PdfFormField = {
  name: string;
  type: PdfFormFieldType;
  value: string | boolean | string[] | null;
  defaultValue: string | boolean | string[] | null;
  options: string[];
  readOnly: boolean;
  required: boolean;
  multiline: boolean;
  /** 1-based page number when the widget exposes a page. */
  page?: number;
  rect?: { x: number; y: number; width: number; height: number };
  flags: number;
};

/** Everything `readPdfForm` can tell about an Adobe AcroForm document. */
export type PdfFormInfo = {
  hasAcroForm: boolean;
  hasXfa: boolean;
  encrypted: boolean;
  fields: PdfFormField[];
};

type Entry = { raw: PdfValue; num: number; gen: number; dict: PdfDictValue };

type FieldRecord = {
  name: string;
  type: PdfFormFieldType;
  field: Entry;
  widgets: Entry[];
  options: string[];
  flags: number;
  page?: number;
  rect?: PdfFormField["rect"];
};

const READ_ONLY = 1 << 0;
const REQUIRED = 1 << 1;
const MULTILINE = 1 << 12;
const RADIO = 1 << 15;
const PUSHBUTTON = 1 << 16;

function nameOf(value: PdfValue | undefined): string | undefined {
  return isName(value) ? value.value : undefined;
}

function numberOf(value: PdfValue | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function arrayOf(value: PdfValue | undefined): PdfValue[] {
  return isArray(value) ? value : [];
}

function entryOf(parsed: { objects: Map<number, PdfObject> }, value: PdfValue | undefined): Entry | undefined {
  if (isRef(value)) {
    const object = parsed.objects.get(value.num);
    if (!object) return undefined;
    const dict = isDict(object.value) ? object.value : isStream(object.value) ? object.value.dict : undefined;
    return dict ? { raw: value, num: object.num, gen: object.gen, dict } : undefined;
  }
  if (isDict(value)) {
    return { raw: value, num: 0, gen: 0, dict: value };
  }
  return undefined;
}

function bytesToText(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let text = "";
    for (let index = 2; index + 1 < bytes.length; index += 2) text += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
    return text;
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    let text = "";
    for (let index = 2; index + 1 < bytes.length; index += 2) text += String.fromCharCode(bytes[index] | (bytes[index + 1] << 8));
    return text;
  }
  return new TextDecoder("windows-1252").decode(bytes);
}

function textOf(value: PdfValue | undefined): string | undefined {
  if (isString(value)) return bytesToText(value.bytes);
  if (isName(value)) return value.value;
  return undefined;
}

function optionsOf(value: PdfValue | undefined): string[] {
  const options: string[] = [];
  for (const item of arrayOf(value)) {
    if (isString(item)) options.push(bytesToText(item.bytes));
    else if (isName(item)) options.push(item.value);
    else if (isArray(item)) {
      const display = item.map((entry) => textOf(entry)).filter((entry): entry is string => entry !== undefined);
      if (display.length > 0) options.push(display[display.length - 1]);
    }
  }
  return options;
}

function rectOf(value: PdfValue | undefined): PdfFormField["rect"] {
  const values = arrayOf(value).map((entry) => numberOf(entry));
  if (values.length < 4 || values.some((entry) => entry === undefined)) return undefined;
  const [x1, y1, x2, y2] = values as number[];
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
}

function isWidget(dict: PdfDictValue): boolean {
  return nameOf(dict.get("Subtype")) === "Widget" || dict.has("Rect");
}

function pageIndexes(parsed: Awaited<ReturnType<typeof parsePdf>>, root: PdfDictValue | undefined): Map<number, number> {
  const indexes = new Map<number, number>();
  if (!root) return indexes;
  let page = 0;
  const visited = new Set<number>();
  const visit = (value: PdfValue | undefined, depth: number): void => {
    if (depth > 64) return;
    const entry = entryOf(parsed, value);
    if (!entry) return;
    if (entry.num > 0) {
      if (visited.has(entry.num)) return;
      visited.add(entry.num);
    }
    const type = nameOf(entry.dict.get("Type"));
    if (type === "Page") {
      indexes.set(entry.num, page);
      page += 1;
      return;
    }
    for (const kid of arrayOf(entry.dict.get("Kids"))) visit(kid, depth + 1);
  };
  visit(root.get("Pages"), 0);
  return indexes;
}

function annotationPages(
  parsed: Awaited<ReturnType<typeof parsePdf>>,
  indexes: Map<number, number>
): Map<number, number> {
  const result = new Map<number, number>();
  for (const [pageNum, pageIndex] of indexes) {
    const pageObject = parsed.objects.get(pageNum);
    const pageDict = pageObject && isDict(pageObject.value) ? pageObject.value : undefined;
    if (!pageDict) continue;
    for (const annotation of arrayOf(pageDict.get("Annots"))) {
      if (isRef(annotation)) result.set(annotation.num, pageIndex);
    }
  }
  return result;
}

function appearanceStates(parsed: Awaited<ReturnType<typeof parsePdf>>, widget: PdfDictValue): string[] {
  const ap = resolvedDict(widget.get("AP"), parsed.objects);
  const normal = ap ? resolvedDict(ap.get("N"), parsed.objects) : undefined;
  if (!normal) return [];
  return [...normal.keys()].filter((key) => key !== "Off");
}

type Inherited = { name: string; ft?: string; flags: number };

function walkFields(
  parsed: Awaited<ReturnType<typeof parsePdf>>,
  value: PdfValue,
  inherited: Inherited,
  records: FieldRecord[],
  indexes: Map<number, number>,
  annotationMap: Map<number, number>,
  depth = 0,
  visited = new Set<number>()
): void {
  if (depth > 64) failPdf("PDF_LIMIT_EXCEEDED", "AcroForm field tree is too deep.", { depth });
  const entry = entryOf(parsed, value);
  if (!entry) return;
  if (entry.num > 0) {
    if (visited.has(entry.num)) failPdf("PDF_LIMIT_EXCEEDED", "AcroForm field tree contains a cycle.", { field: entry.num });
    visited.add(entry.num);
    if (visited.size > 10_000) failPdf("PDF_LIMIT_EXCEEDED", "AcroForm has too many fields.");
  }
  const dict = entry.dict;
  const partial = textOf(dict.get("T"));
  const name = partial ? (inherited.name ? `${inherited.name}.${partial}` : partial) : inherited.name;
  const ft = nameOf(dict.get("FT")) ?? inherited.ft;
  const flags = numberOf(dict.get("Ff")) ?? inherited.flags;
  const kids = arrayOf(dict.get("Kids"))
    .map((kid) => entryOf(parsed, kid))
    .filter((kid): kid is Entry => kid !== undefined);
  const nested = kids.filter((kid) => kid.dict.has("T") || (!isWidget(kid.dict) && kid.dict.has("Kids")));
  const widgets = kids.filter((kid) => isWidget(kid.dict));

  if (ft !== undefined && nested.length === 0) {
    if (!name) return;
    const ownWidgets = widgets.length > 0 ? widgets : [entry];
    const first = ownWidgets[0];
    const pageNumber = pageOf(dict, first, indexes, annotationMap);
    const rect = rectOf((widgets.length > 0 ? first.dict : dict).get("Rect"));
    records.push({
      name,
      type: typeOf(ft, flags),
      field: entry,
      widgets: ownWidgets,
      options: optionsFor(parsed, ft, dict, ownWidgets),
      flags,
      page: pageNumber,
      rect
    });
    return;
  }

  for (const kid of kids) {
    walkFields(parsed, kid.raw, { name, ft, flags }, records, indexes, annotationMap, depth + 1, visited);
  }
}

function pageOf(
  dict: PdfDictValue,
  widget: Entry,
  indexes: Map<number, number>,
  annotationMap: Map<number, number>
): number | undefined {
  const page = dict.get("P");
  if (isRef(page)) {
    const index = indexes.get(page.num);
    if (index !== undefined) return index + 1;
  }
  const annotationIndex = annotationMap.get(widget.num);
  return annotationIndex === undefined ? undefined : annotationIndex + 1;
}

function typeOf(ft: string, flags: number): PdfFormFieldType {
  if (ft === "Tx") return "text";
  if (ft === "Ch") return "choice";
  if (ft === "Sig") return "signature";
  if (ft === "Btn") {
    if ((flags & PUSHBUTTON) !== 0) return "button";
    if ((flags & RADIO) !== 0) return "radio";
    return "checkbox";
  }
  return "text";
}

function optionsFor(
  parsed: Awaited<ReturnType<typeof parsePdf>>,
  ft: string,
  dict: PdfDictValue,
  widgets: Entry[]
): string[] {
  if (ft === "Ch") return optionsOf(dict.get("Opt"));
  if (ft === "Btn") {
    const states = new Set<string>();
    for (const widget of widgets) {
      for (const state of appearanceStates(parsed, widget.dict)) states.add(state);
    }
    return [...states];
  }
  return [];
}

function valueOf(record: FieldRecord): string | boolean | string[] | null {
  const raw = record.field.dict.get("V");
  if (record.type === "checkbox") {
    const state = textOf(raw) ?? textOf(record.widgets[0]?.dict.get("AS"));
    return state !== undefined && state !== "Off";
  }
  if (record.type === "radio") return textOf(raw) ?? textOf(record.widgets[0]?.dict.get("AS")) ?? null;
  if (record.type === "choice") {
    if (isArray(raw)) return raw.map((entry) => textOf(entry) ?? "").filter((entry) => entry !== "");
    return textOf(raw) ?? null;
  }
  if (record.type === "signature") return raw === undefined ? null : "[signed]";
  if (record.type === "button") return null;
  return textOf(raw) ?? null;
}

function defaultValueOf(record: FieldRecord): string | boolean | string[] | null {
  const raw = record.field.dict.get("DV");
  if (record.type === "checkbox") return textOf(raw) !== undefined && textOf(raw) !== "Off";
  if (record.type === "radio") return textOf(raw) ?? null;
  if (record.type === "choice") {
    if (isArray(raw)) return raw.map((entry) => textOf(entry) ?? "");
    return textOf(raw) ?? null;
  }
  return textOf(raw) ?? null;
}

function recordToField(record: FieldRecord): PdfFormField {
  const value = valueOf(record);
  return {
    name: record.name,
    type: record.type,
    value,
    defaultValue: defaultValueOf(record),
    options: record.options,
    readOnly: (record.flags & READ_ONLY) !== 0,
    required: (record.flags & REQUIRED) !== 0,
    multiline: (record.flags & MULTILINE) !== 0,
    page: record.page,
    rect: record.rect,
    flags: record.flags
  };
}

async function inspect(bytes: Uint8Array): Promise<{
  parsed: Awaited<ReturnType<typeof parsePdf>>;
  acroForm?: Entry;
  records: FieldRecord[];
}> {
  const parsed = await parsePdf(bytes);
  const root = parsed.root && isDict(parsed.root.value) ? parsed.root.value : undefined;
  const acroRaw = root?.get("AcroForm");
  const acroForm = entryOf(parsed, acroRaw);
  if (!acroForm) return { parsed, records: [] };
  const indexes = pageIndexes(parsed, root);
  const annotationMap = annotationPages(parsed, indexes);
  const records: FieldRecord[] = [];
  for (const field of arrayOf(acroForm.dict.get("Fields"))) {
    walkFields(parsed, field, { name: "", flags: 0 }, records, indexes, annotationMap);
  }
  return { parsed, acroForm, records };
}

/** Reads every field in an AcroForm PDF, including values and widget positions. */
export async function readPdfForm(bytes: Uint8Array): Promise<PdfFormInfo> {
  const { parsed, acroForm, records } = await inspect(bytes);
  return {
    hasAcroForm: acroForm !== undefined,
    hasXfa: acroForm?.dict.has("XFA") ?? false,
    encrypted: parsed.encrypted,
    fields: records.map(recordToField)
  };
}

function encodeText(value: string): PdfStringValue {
  const ascii = [...value].every((char) => char.charCodeAt(0) >= 0x20 && char.charCodeAt(0) <= 0x7e);
  if (ascii) return { kind: "string", bytes: Uint8Array.from(value, (char) => char.charCodeAt(0)) };
  const bytes = new Uint8Array(2 + value.length * 2);
  bytes[0] = 0xfe;
  bytes[1] = 0xff;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    bytes[2 + index * 2] = code >> 8;
    bytes[3 + index * 2] = code & 0xff;
  }
  return { kind: "string", bytes };
}

function nameValue(value: string): PdfNameValue {
  return { kind: "name", value };
}

function onState(record: FieldRecord): string {
  return record.options[0] ?? "Yes";
}

function applyValue(parsed: Awaited<ReturnType<typeof parsePdf>>, record: FieldRecord, value: PdfFormValue): void {
  const field = record.field.dict;
  if (record.type === "text") {
    field.set("V", encodeText(value === null || value === undefined ? "" : String(value)));
    return;
  }
  if (record.type === "choice") {
    if (Array.isArray(value)) field.set("V", value.map((entry) => encodeText(String(entry))));
    else field.set("V", encodeText(value === null || value === undefined ? "" : String(value)));
    return;
  }
  if (record.type === "checkbox") {
    const state = value === true || value === "true" || value === "Yes" || value === "On" || value === 1 ? onState(record) : "Off";
    field.set("V", nameValue(state));
    for (const widget of record.widgets) widget.dict.set("AS", nameValue(state));
    return;
  }
  if (record.type === "radio") {
    const selected = typeof value === "string" ? value : value === true ? onState(record) : "Off";
    field.set("V", nameValue(selected));
    for (const widget of record.widgets) {
      const states = appearanceStates(parsed, widget.dict);
      widget.dict.set("AS", nameValue(states.includes(selected) ? selected : "Off"));
    }
  }
}

function escapeName(value: string): string {
  let result = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 0x21 || code > 0x7e || /[#%()/<>[\]{}]/.test(char)) result += `#${code.toString(16).padStart(2, "0")}`;
    else result += char;
  }
  return result;
}

function escapeLiteral(bytes: Uint8Array): string {
  let result = "";
  for (const byte of bytes) {
    if (byte === 0x5c) result += "\\\\";
    else if (byte === 0x28) result += "\\(";
    else if (byte === 0x29) result += "\\)";
    else if (byte < 0x20 || byte > 0x7e) result += `\\${byte.toString(8).padStart(3, "0")}`;
    else result += String.fromCharCode(byte);
  }
  return result;
}

function serialize(value: PdfValue): string {
  if (value === null) return "null";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
  if (typeof value === "boolean") return value ? "true" : "false";
  if (isName(value)) return `/${escapeName(value.value)}`;
  if (isString(value)) {
    const ascii = [...value.bytes].every((byte) => byte >= 0x20 && byte <= 0x7e);
    if (ascii) return `(${escapeLiteral(value.bytes)})`;
    return `<${[...value.bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")}>`;
  }
  if (isRef(value)) return `${value.num} ${value.gen} R`;
  if (isArray(value)) return `[${value.map((entry) => serialize(entry)).join(" ")}]`;
  if (isDict(value)) {
    const entries = [...value.entries()].map(([key, entry]) => `/${escapeName(key)} ${serialize(entry)}`);
    return `<< ${entries.join(" ")} >>`;
  }
  return "null";
}

function ascii(text: string): Uint8Array {
  return Uint8Array.from(text, (char) => char.charCodeAt(0) & 0xff);
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

/** Writes the given field values into a new PDF revision and returns the bytes. */
export async function fillPdfForm(bytes: Uint8Array, values: Record<string, PdfFormValue>): Promise<Uint8Array> {
  const { parsed, acroForm, records } = await inspect(bytes);
  if (parsed.encrypted) failPdf("PDF_UNSUPPORTED", "Encrypted PDFs are not supported.");
  if (!acroForm) failPdf("PDF_INVALID_INPUT", "The PDF has no AcroForm fields.");
  if (!parsed.root) failPdf("PDF_INVALID_INPUT", "The PDF has no catalog.");
  const updates = new Map<number, Entry>();
  const byName = new Map(records.map((record) => [record.name, record]));
  for (const [name, value] of Object.entries(values)) {
    const record = byName.get(name);
    if (!record) continue;
    if (record.field.num === 0) failPdf("PDF_UNSUPPORTED", "The form field is not an indirect object.", { field: name });
    applyValue(parsed, record, value);
    updates.set(record.field.num, record.field);
    for (const widget of record.widgets) updates.set(widget.num, widget);
  }
  acroForm.dict.set("NeedAppearances", true);
  if (acroForm.num === 0 && parsed.root && isDict(parsed.root.value)) {
    updates.set(parsed.root.num, { raw: parsed.root.value, num: parsed.root.num, gen: parsed.root.gen, dict: parsed.root.value });
  } else {
    updates.set(acroForm.num, acroForm);
  }
  return appendRevision(bytes, parsed, [...updates.values()]);
}

function appendRevision(
  bytes: Uint8Array,
  parsed: Awaited<ReturnType<typeof parsePdf>>,
  updates: Entry[]
): Uint8Array {
  if (parsed.startXref === undefined) failPdf("PDF_INVALID_INPUT", "The PDF has no startxref.");
  const xrefStream = parsed.trailers.some((trailer) => {
    const type = trailer.get("Type");
    return isName(type) && type.value === "XRef";
  });
  const chunks: Uint8Array[] = [bytes, ascii("\n")];
  let offset = bytes.length + 1;
  const written: Array<{ num: number; gen: number; offset: number }> = [];
  for (const update of [...updates].sort((left, right) => left.num - right.num)) {
    if (update.num === 0) continue;
    written.push({ num: update.num, gen: update.gen, offset });
    const body = `${update.num} ${update.gen} obj\n${serialize(update.dict)}\nendobj\n`;
    chunks.push(ascii(body));
    offset += body.length;
  }
  let max = 0;
  for (const object of parsed.objects.keys()) max = Math.max(max, object);
  for (const entry of written) max = Math.max(max, entry.num);
  const lastTrailer = parsed.trailers[parsed.trailers.length - 1];
  const trailerParts = [`/Root ${parsed.root?.num ?? 0} ${parsed.root?.gen ?? 0} R`, `/Prev ${parsed.startXref}`];
  const info = lastTrailer?.get("Info");
  if (info) trailerParts.push(`/Info ${serialize(info)}`);
  const id = lastTrailer?.get("ID");
  if (id) trailerParts.push(`/ID ${serialize(id)}`);

  if (xrefStream) {
    const xrefNum = max + 1;
    const xrefOffset = offset;
    const entries = [
      { num: 0, type: 0, offset: 0, gen: 65535 },
      ...written.map((entry) => ({ num: entry.num, type: 1, offset: entry.offset, gen: entry.gen })),
      { num: xrefNum, type: 1, offset: xrefOffset, gen: 0 }
    ].sort((left, right) => left.num - right.num);
    const data = new Uint8Array(entries.length * 7);
    entries.forEach((entry, index) => {
      const base = index * 7;
      data[base] = entry.type;
      data[base + 1] = (entry.offset >>> 24) & 0xff;
      data[base + 2] = (entry.offset >>> 16) & 0xff;
      data[base + 3] = (entry.offset >>> 8) & 0xff;
      data[base + 4] = entry.offset & 0xff;
      data[base + 5] = (entry.gen >>> 8) & 0xff;
      data[base + 6] = entry.gen & 0xff;
    });
    const index = entries.map((entry) => `${entry.num} 1`).join(" ");
    const dict = `<< /Type /XRef /Size ${xrefNum + 1} /W [1 4 2] /Index [${index}] ${trailerParts.join(" ")} /Length ${data.length} >>`;
    const head = `${xrefNum} 0 obj\n${dict}\nstream\n`;
    chunks.push(ascii(head), data, ascii("\nendstream\nendobj\n"));
    chunks.push(ascii(`startxref\n${xrefOffset}\n%%EOF\n`));
    return concat(chunks);
  }

  const xrefStart = offset;
  const table: string[] = ["xref", "0 1", "0000000000 65535 f "];
  const sorted = [...written].sort((left, right) => left.num - right.num);
  let index = 0;
  while (index < sorted.length) {
    const start = sorted[index].num;
    let end = start;
    while (index + 1 < sorted.length && sorted[index + 1].num === end + 1) {
      index += 1;
      end += 1;
    }
    table.push(`${start} ${end - start + 1}`);
    for (let num = start; num <= end; num += 1) {
      const entry = sorted.find((candidate) => candidate.num === num);
      table.push(`${String(entry?.offset ?? 0).padStart(10, "0")} ${String(entry?.gen ?? 0).padStart(5, "0")} n `);
    }
    index += 1;
  }
  const trailer = `trailer\n<< /Size ${max + 1} ${trailerParts.join(" ")} >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  chunks.push(ascii(table.join("\n") + "\n" + trailer));
  return concat(chunks);
}

/** Convenience helper: read a form and return its values keyed by field name. */
export async function readPdfFormValues(bytes: Uint8Array): Promise<Record<string, PdfFormValue>> {
  const info = await readPdfForm(bytes);
  const values: Record<string, PdfFormValue> = {};
  for (const field of info.fields) values[field.name] = field.value;
  return values;
}
