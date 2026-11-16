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

function decodeEntity(entity: string): string {
  if (entity === "amp") return "&";
  if (entity === "lt") return "<";
  if (entity === "gt") return ">";
  if (entity === "quot") return '"';
  if (entity === "apos") return "'";
  if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
  if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
  return `&${entity};`;
}

/** Decodes the predefined and numeric XML entities. Unknown entities are left untouched. */
export function unescapeXml(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g, (_match, entity: string) =>
    decodeEntity(entity)
  );
}
