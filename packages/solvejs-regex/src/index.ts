export const REGEX_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phoneE164: /^\+[1-9]\d{1,14}$/,
  urlHttp: /^https?:\/\/.+/i,
  hexColor: /^#(?:[0-9a-fA-F]{3}){1,2}$/,
  username: /^[a-zA-Z0-9_]{3,30}$/,
  uuidV4: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  ipv4: /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/,
  isoDate: /^\d{4}-\d{2}-\d{2}$/
} as const;

export type PatternName = keyof typeof REGEX_PATTERNS;

/**
 * Tests a string against a regular expression safely.
 *
 * @param input - Input text.
 * @param pattern - Regular expression pattern.
 * @returns `true` when the pattern matches the input.
 * @throws {TypeError} If `pattern` is not a RegExp instance.
 */
export function testPattern(input: string, pattern: RegExp): boolean {
  if (!(pattern instanceof RegExp)) {
    throw new TypeError("Expected pattern to be a RegExp instance.");
  }
  pattern.lastIndex = 0;
  return pattern.test(input);
}

/**
 * Validates text using a custom regex pattern.
 *
 * @param input - Input text.
 * @param pattern - Regular expression pattern.
 * @param options - Validation options.
 * @returns `true` when the pattern matches.
 * @throws {TypeError} If `pattern` is not a RegExp instance.
 */
export function validateWithPattern(input: string, pattern: RegExp, options?: { trim?: boolean }): boolean {
  const normalized = options?.trim ? input.trim() : input;
  return testPattern(normalized, pattern);
}

/**
 * Validates text using one of the built-in common patterns.
 *
 * @param input - Input text.
 * @param patternName - Built-in pattern name.
 * @returns `true` when the selected pattern matches.
 */
export function validateByName(input: string, patternName: PatternName): boolean {
  return testPattern(input, REGEX_PATTERNS[patternName]);
}

/**
 * Escapes user-provided text to be safely used inside a regex pattern.
 *
 * @param value - Raw string value.
 * @returns Escaped regex-safe string.
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
