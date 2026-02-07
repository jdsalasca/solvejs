/**
 * Removes combining marks to normalize accented text.
 *
 * @param value - Raw input string.
 * @returns Normalized string without combining marks.
 */
function normalize(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Converts arbitrary text into kebab-case.
 *
 * @param value - Input text.
 * @returns Kebab-cased output.
 */
export function toKebabCase(value: string): string {
  return normalize(value)
    .replace(/([a-z\d])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z\d]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/**
 * Converts arbitrary text into camelCase.
 *
 * @param value - Input text.
 * @returns camelCase output.
 */
export function toCamelCase(value: string): string {
  const tokens = toKebabCase(value).split("-").filter(Boolean);
  return tokens
    .map((token, index) => (index === 0 ? token : token[0].toUpperCase() + token.slice(1)))
    .join("");
}

/**
 * Uppercases the first character in a string.
 *
 * @param value - Input text.
 * @returns String with first character uppercased.
 */
export function capitalize(value: string): string {
  if (value.length === 0) {
    return value;
  }
  return value[0].toUpperCase() + value.slice(1);
}

/**
 * Truncates text to a fixed size using a suffix.
 *
 * @param value - Input text.
 * @param maxLength - Maximum final string length.
 * @param suffix - Suffix appended to truncated text.
 * @returns Truncated string.
 * @throws {TypeError} If `maxLength` is not a non-negative integer.
 */
export function truncate(value: string, maxLength: number, suffix = "..."): string {
  if (!Number.isInteger(maxLength) || maxLength < 0) {
    throw new TypeError("Expected maxLength to be a non-negative integer.");
  }
  if (value.length <= maxLength) {
    return value;
  }
  if (maxLength <= suffix.length) {
    return suffix.slice(0, maxLength);
  }
  return `${value.slice(0, maxLength - suffix.length)}${suffix}`;
}
