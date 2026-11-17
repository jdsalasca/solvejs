/**
 * Removes combining marks to normalize accented text.
 *
 * @param value - Raw input string.
 * @returns Normalized string without combining marks.
 */
function normalize(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "");
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
 * Collapses repeated whitespace and trims the final string.
 *
 * @param value - Input text.
 * @returns Text with single spaces between words.
 */
export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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

/**
 * Converts text to a URL-safe slug.
 *
 * @param value - Input text.
 * @returns Slugified lowercase string.
 */
export function slugify(value: string): string {
  return toKebabCase(value);
}

/**
 * Removes HTML tags from a string.
 *
 * @param value - Input HTML-like string.
 * @returns Plain text without tags.
 */
export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

/**
 * Converts a phrase to Title Case.
 *
 * @param value - Input phrase.
 * @returns Title cased phrase.
 */
export function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => capitalize(word))
    .join(" ");
}

/**
 * Masks a string keeping a number of trailing characters visible.
 *
 * @param value - Input text.
 * @param visibleEnd - Number of trailing characters to keep.
 * @param maskChar - Masking character.
 * @returns Masked string.
 * @throws {TypeError} If `visibleEnd` is not a non-negative integer.
 */
export function mask(value: string, visibleEnd = 4, maskChar = "*"): string {
  if (!Number.isInteger(visibleEnd) || visibleEnd < 0) {
    throw new TypeError("Expected visibleEnd to be a non-negative integer.");
  }
  if (visibleEnd === 0) {
    return maskChar.repeat(value.length);
  }
  if (visibleEnd >= value.length) {
    return value;
  }
  return `${maskChar.repeat(value.length - visibleEnd)}${value.slice(-visibleEnd)}`;
}

/**
 * Builds initials from the words in a name.
 *
 * @param value - Input name or phrase.
 * @param max - Maximum number of initials to return. Defaults to 2.
 * @returns Uppercase initials, or an empty string when no letters are present.
 * @throws {TypeError} If `max` is not a positive integer.
 */
export function initials(value: string, max = 2): string {
  if (!Number.isInteger(max) || max < 1) {
    throw new TypeError("Expected max to be a positive integer.");
  }
  const letters: string[] = [];
  for (const word of normalizeWhitespace(value).split(" ")) {
    const letter = Array.from(word).find((character) => /\p{L}|\p{N}/u.test(character));
    if (letter) letters.push(letter.toUpperCase());
    if (letters.length === max) break;
  }
  return letters.join("");
}

/**
 * Truncates the middle of a string, keeping both ends readable.
 *
 * Useful for emails, URLs, file paths and IDs where the prefix and suffix both matter.
 *
 * @param value - Input text.
 * @param maxLength - Maximum final string length.
 * @param suffix - Marker inserted in the middle. Defaults to `"..."`.
 * @returns Truncated string.
 * @throws {TypeError} If `maxLength` is not a non-negative integer.
 */
export function truncateMiddle(value: string, maxLength: number, suffix = "..."): string {
  if (!Number.isInteger(maxLength) || maxLength < 0) {
    throw new TypeError("Expected maxLength to be a non-negative integer.");
  }
  if (value.length <= maxLength) {
    return value;
  }
  if (maxLength <= suffix.length) {
    return suffix.slice(0, maxLength);
  }
  const keep = maxLength - suffix.length;
  const start = Math.ceil(keep / 2);
  const end = keep - start;
  return `${value.slice(0, start)}${suffix}${end === 0 ? "" : value.slice(-end)}`;
}

/**
 * Picks the singular or plural label for a count.
 *
 * @param count - Numeric count.
 * @param singular - Label used when the count is exactly 1.
 * @param plural - Label used otherwise. Defaults to `singular + "s"`.
 * @returns The matching label.
 * @throws {TypeError} If `count` is not a finite number.
 */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  if (!Number.isFinite(count)) {
    throw new TypeError("Expected count to be a finite number.");
  }
  return count === 1 ? singular : plural;
}
