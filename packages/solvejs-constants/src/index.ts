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
