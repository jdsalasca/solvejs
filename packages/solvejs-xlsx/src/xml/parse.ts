import { failXlsx } from "../errors.js";
import { XLSX_LIMITS } from "../shared.js";
import { unescapeXml } from "./escape.js";

/** A minimal XML node. Names keep their namespace prefix; use {@link localName} to compare. */
export type XmlNode = {
  name: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  content: Array<string | XmlNode>;
  text: string;
};

const MAX_DEPTH = 256;
const MAX_NODES = 1_000_000;

function createNode(name: string): XmlNode {
  return { name, attributes: {}, children: [], content: [], text: "" };
}

function failXml(message: string, details: Record<string, unknown> = {}): never {
  failXlsx("XLSX_INVALID_XML", message, details);
}

export function localName(name: string): string {
  const index = name.indexOf(":");
  return index === -1 ? name : name.slice(index + 1);
}

function isWhitespace(character: string): boolean {
  return character === " " || character === "\n" || character === "\r" || character === "\t";
}

function skipSpace(source: string, index: number): number {
  let cursor = index;
  while (cursor < source.length && isWhitespace(source[cursor])) cursor += 1;
  return cursor;
}

function readName(source: string, index: number): { name: string; index: number } {
  const start = index;
  let cursor = index;
  while (cursor < source.length) {
    const character = source[cursor];
    if (isWhitespace(character) || character === ">" || character === "/" || character === "=") break;
    cursor += 1;
  }
  if (cursor === start) failXml("Expected an XML name.", { index });
  return { name: source.slice(start, cursor), index: cursor };
}

function readQuoted(source: string, index: number): { value: string; index: number } {
  const quote = source[index];
  if (quote !== '"' && quote !== "'") failXml("Expected a quoted XML attribute.", { index });
  const end = source.indexOf(quote, index + 1);
  if (end === -1) failXml("Unterminated XML attribute.", { index });
  return { value: unescapeXml(source.slice(index + 1, end)), index: end + 1 };
}

function parseStartTag(source: string, index: number): { node: XmlNode; selfClosing: boolean; index: number } {
  const named = readName(source, index);
  const node = createNode(named.name);
  let cursor = named.index;

  while (cursor < source.length) {
    cursor = skipSpace(source, cursor);
    if (source.startsWith("/>", cursor)) return { node, selfClosing: true, index: cursor + 2 };
    if (source[cursor] === ">") return { node, selfClosing: false, index: cursor + 1 };

    const attribute = readName(source, cursor);
    cursor = skipSpace(source, attribute.index);
    if (source[cursor] !== "=") failXml("Expected '=' after an XML attribute name.", { index: cursor });
    cursor = skipSpace(source, cursor + 1);
    const value = readQuoted(source, cursor);
    if (Object.prototype.hasOwnProperty.call(node.attributes, attribute.name)) {
      failXml("XML attributes must be unique.", { attribute: attribute.name });
    }
    node.attributes[attribute.name] = value.value;
    cursor = value.index;
  }

  return failXml("Unterminated XML start tag.", { index });
}

function handleStartTag(source: string, index: number, stack: XmlNode[], counter: { nodes: number }): number {
  const parsed = parseStartTag(source, index + 1);
  if (stack.length >= MAX_DEPTH) failXml("XML nesting is too deep.", { depth: stack.length });
  counter.nodes += 1;
  if (counter.nodes > MAX_NODES) failXlsx("XLSX_LIMIT_EXCEEDED", "XML has too many nodes.");
  const parent = stack[stack.length - 1];
  parent.children.push(parsed.node);
  parent.content.push(parsed.node);
  if (!parsed.selfClosing) stack.push(parsed.node);
  return parsed.index;
}

function handleEndTag(source: string, index: number, stack: XmlNode[]): number {
  const named = readName(source, index + 2);
  const cursor = skipSpace(source, named.index);
  if (source[cursor] !== ">") failXml("Expected '>' to close an XML tag.", { index: cursor });
  if (stack.length <= 1 || stack[stack.length - 1].name !== named.name) {
    failXml("XML close tag does not match the open tag.", { expected: stack[stack.length - 1]?.name, received: named.name });
  }
  stack.pop();
  return cursor + 1;
}

function skipPast(source: string, index: number, marker: string): number {
  const end = source.indexOf(marker, index);
  if (end === -1) failXml(`Unterminated XML section, expected ${marker}.`, { index });
  return end + marker.length;
}

function handleCdata(source: string, index: number, current: XmlNode): number {
  const end = source.indexOf("]]>", index + 9);
  if (end === -1) failXml("Unterminated CDATA section.", { index });
  const text = source.slice(index + 9, end);
  current.text += text;
  current.content.push(text);
  return end + 3;
}

function handleText(source: string, index: number, current: XmlNode): number {
  const next = source.indexOf("<", index);
  const end = next === -1 ? source.length : next;
  const text = unescapeXml(source.slice(index, end));
  current.text += text;
  if (text.length > 0) current.content.push(text);
  return end;
}

function stepXml(source: string, index: number, stack: XmlNode[], counter: { nodes: number }): number {
  if (source.startsWith("<?", index)) return skipPast(source, index, "?>");
  if (source.startsWith("<!--", index)) return skipPast(source, index, "-->");
  if (source.startsWith("<![CDATA[", index)) return handleCdata(source, index, stack[stack.length - 1]);
  if (source.startsWith("</", index)) return handleEndTag(source, index, stack);
  if (source[index] === "<") return handleStartTag(source, index, stack, counter);
  return handleText(source, index, stack[stack.length - 1]);
}

/** Parses a small, safe subset of XML: elements, attributes, text, CDATA and comments. No DTD. */
export function parseXml(source: string): XmlNode {
  if (source.length > XLSX_LIMITS.maxXmlLength) {
    failXlsx("XLSX_LIMIT_EXCEEDED", "XML document is too large.", { length: source.length });
  }
  if (/<!DOCTYPE/i.test(source)) failXml("DTD declarations are not allowed.");

  const root = createNode("#document");
  const stack = [root];
  const counter = { nodes: 1 };
  let index = 0;

  while (index < source.length) {
    index = stepXml(source, index, stack, counter);
  }

  if (stack.length !== 1) failXml("XML has unclosed elements.", { open: stack.length - 1 });
  if (root.children.length !== 1) failXml("XML must have exactly one root element.", { roots: root.children.length });
  return root;
}

/** Returns the direct children whose local name matches. */
export function childrenNamed(node: XmlNode, name: string): XmlNode[] {
  return node.children.filter((child) => localName(child.name) === name);
}

/** Returns the first direct child whose local name matches. */
export function firstChild(node: XmlNode, name: string): XmlNode | undefined {
  return node.children.find((child) => localName(child.name) === name);
}

/** Returns the concatenated text of a node and its descendants, preserving order. */
export function textContent(node: XmlNode): string {
  return node.content
    .map((part) => (typeof part === "string" ? part : textContent(part)))
    .join("");
}
