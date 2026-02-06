export const REGEX_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phoneE164: /^\+[1-9]\d{1,14}$/,
  urlHttp: /^https?:\/\/.+/i,
  hexColor: /^#(?:[0-9a-fA-F]{3}){1,2}$/,
  username: /^[a-zA-Z0-9_]{3,30}$/
} as const;

export type PatternName = keyof typeof REGEX_PATTERNS;

export function testPattern(input: string, pattern: RegExp): boolean {
  if (!(pattern instanceof RegExp)) {
    throw new TypeError("Expected pattern to be a RegExp instance.");
  }
  return pattern.test(input);
}

export function validateWithPattern(input: string, pattern: RegExp, options?: { trim?: boolean }): boolean {
  const normalized = options?.trim ? input.trim() : input;
  return testPattern(normalized, pattern);
}

export function validateByName(input: string, patternName: PatternName): boolean {
  return testPattern(input, REGEX_PATTERNS[patternName]);
}
