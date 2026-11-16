import { failXlsx } from "../errors.js";

const TEXT_ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };
const ATTRIBUTE_ENTITIES: Record<string, string> = {
  ...TEXT_ENTITIES,
  '"': "&quot;",
  "'": "&apos;"
};

/** Escapes text for an XML text node. */
export function escapeXmlText(value: string): string {
  return value.replace(/[&<>]/g, (character) => TEXT_ENTITIES[character] ?? character);
}

/** Escapes text for an XML attribute value. */
export function escapeXmlAttribute(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ATTRIBUTE_ENTITIES[character] ?? character);
}

function codePoint(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 0x10ffff) {
    failXlsx("XLSX_INVALID_XML", "XML character reference is out of range.", { codePoint: value });
  }
  try {
    return String.fromCodePoint(value);
  } catch {
    return failXlsx("XLSX_INVALID_XML", "XML character reference is invalid.", { codePoint: value });
  }
}

function decodeEntity(entity: string): string {
  if (entity === "amp") return "&";
  if (entity === "lt") return "<";
  if (entity === "gt") return ">";
  if (entity === "quot") return '"';
  if (entity === "apos") return "'";
  if (entity.startsWith("#x")) return codePoint(Number.parseInt(entity.slice(2), 16));
  if (entity.startsWith("#")) return codePoint(Number.parseInt(entity.slice(1), 10));
  return failXlsx("XLSX_INVALID_XML", `Unknown XML entity: &${entity};`, { entity });
}

function assertNoBareAmpersand(value: string): void {
  if (/&(?!#x[0-9a-fA-F]+;|#[0-9]+;|[A-Za-z][A-Za-z0-9]*;)/.test(value)) {
    failXlsx("XLSX_INVALID_XML", "XML contains a bare ampersand.");
  }
}

/** Decodes predefined and numeric XML entities. Unknown or bare ampersands are rejected. */
export function unescapeXml(value: string): string {
  if (!value.includes("&")) return value;
  assertNoBareAmpersand(value);
  return value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[A-Za-z][A-Za-z0-9]*);/g, (_match, entity: string) =>
    decodeEntity(entity)
  );
}
