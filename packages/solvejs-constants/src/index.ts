export const TIME = {
  SECOND_MS: 1_000,
  MINUTE_MS: 60_000,
  HOUR_MS: 3_600_000,
  DAY_MS: 86_400_000
} as const;

export const COMMON_DELIMITERS = {
  COMMA: ",",
  DOT: ".",
  DASH: "-",
  UNDERSCORE: "_",
  SLASH: "/"
} as const;

export const BOOLEAN_STRINGS = {
  TRUE_VALUES: ["true", "1", "yes", "on"] as const,
  FALSE_VALUES: ["false", "0", "no", "off"] as const
} as const;

/**
 * Parses common boolean-like text into a boolean value.
 *
 * @param value - Boolean-like input text.
 * @returns Parsed boolean value.
 * @throws {TypeError} If the input value is not recognized.
 */
export function parseBooleanString(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  if ((BOOLEAN_STRINGS.TRUE_VALUES as readonly string[]).includes(normalized)) {
    return true;
  }

  if ((BOOLEAN_STRINGS.FALSE_VALUES as readonly string[]).includes(normalized)) {
    return false;
  }

  throw new TypeError(`Unsupported boolean string value: ${value}`);
}
