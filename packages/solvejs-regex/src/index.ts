export const REGEX_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phoneE164: /^\+[1-9]\d{1,14}$/,
  urlHttp: /^https?:\/\/.+/i,
  hexColor: /^#(?:[0-9a-fA-F]{3}){1,2}$/,
  username: /^[a-zA-Z0-9_]{3,30}$/
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
