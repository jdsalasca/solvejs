export type ValidationResultCode =
  | "VALID"
  | "EMPTY"
  | "INVALID_FORMAT"
  | "TOO_SHORT"
  | "TOO_LONG"
  | "INVALID_CHARACTERS"
  | "UNSUPPORTED_LOCALE"
  | "UNSUPPORTED_COUNTRY";

export type ValidationResult = {
  ok: boolean;
  code: ValidationResultCode;
  message: string;
};

export type SupportedCountry = "ANY" | "US" | "CO" | "MX" | "ES";
export type DirectionLocale = "en" | "es";

const ADDRESS_DIRECTIONS: Record<DirectionLocale, ReadonlySet<string>> = {
  en: new Set([
    "N",
    "S",
    "E",
    "W",
    "NE",
    "NW",
    "SE",
    "SW",
    "NORTH",
    "SOUTH",
    "EAST",
    "WEST",
    "NORTHEAST",
    "NORTHWEST",
    "SOUTHEAST",
    "SOUTHWEST"
  ]),
  es: new Set([
    "N",
    "S",
    "E",
    "O",
    "NE",
    "NO",
    "SE",
    "SO",
    "NORTE",
    "SUR",
    "ESTE",
    "OESTE",
    "NORESTE",
    "NOROESTE",
    "SURESTE",
    "SUROESTE"
  ])
};

const COUNTRY_RULES: Record<Exclude<SupportedCountry, "ANY">, { minDigits: number; maxDigits: number }> = {
  US: { minDigits: 10, maxDigits: 11 },
  CO: { minDigits: 10, maxDigits: 12 },
  MX: { minDigits: 10, maxDigits: 13 },
  ES: { minDigits: 9, maxDigits: 11 }
};

function ok(message = "Validation passed."): ValidationResult {
  return { ok: true, code: "VALID", message };
}

function fail(code: Exclude<ValidationResultCode, "VALID">, message: string): ValidationResult {
  return { ok: false, code, message };
}

/**
 * Validates cellphone numbers using regional presets.
 *
 * @param value - Input phone string.
 * @param options - Validation options.
 * @param options.allowInternational - Allows a leading `+`.
 * @param options.country - Country preset used for length constraints.
 * @param options.minDigits - Override minimum digits.
 * @param options.maxDigits - Override maximum digits.
 * @returns Structured validation result.
 */
export function validateCellphoneNumber(
  value: string,
  options: {
    allowInternational?: boolean;
    country?: SupportedCountry;
    minDigits?: number;
    maxDigits?: number;
  } = {}
): ValidationResult {
  const allowInternational = options.allowInternational ?? true;
  const country = options.country ?? "ANY";

  if (!["ANY", "US", "CO", "MX", "ES"].includes(country)) {
    return fail("UNSUPPORTED_COUNTRY", `Unsupported country preset: ${country}.`);
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return fail("EMPTY", "Phone number cannot be empty.");
  }

  const compact = normalized.replace(/[\s().-]/g, "");
  const pattern = allowInternational ? /^\+?\d+$/ : /^\d+$/;

  if (!pattern.test(compact)) {
    return fail("INVALID_FORMAT", "Phone number contains invalid characters.");
  }

  const digits = compact.startsWith("+") ? compact.slice(1) : compact;
  const preset = country === "ANY" ? { minDigits: 7, maxDigits: 15 } : COUNTRY_RULES[country];
  const minDigits = options.minDigits ?? preset.minDigits;
  const maxDigits = options.maxDigits ?? preset.maxDigits;

  if (digits.length < minDigits) {
    return fail("TOO_SHORT", `Phone number must have at least ${minDigits} digits.`);
  }
  if (digits.length > maxDigits) {
    return fail("TOO_LONG", `Phone number must have at most ${maxDigits} digits.`);
  }

  return ok("Valid cellphone number.");
}

/**
 * Boolean wrapper for `validateCellphoneNumber`.
 *
 * @param value - Input phone string.
 * @param options - Validation options.
 * @returns `true` when the value is valid.
 */
export function isCellphoneNumber(
  value: string,
  options: {
    allowInternational?: boolean;
    country?: SupportedCountry;
    minDigits?: number;
    maxDigits?: number;
  } = {}
): boolean {
  return validateCellphoneNumber(value, options).ok;
}

/**
 * Validates address direction using localized dictionaries.
 *
 * @param value - Direction text.
 * @param options - Validation options.
 * @param options.locale - Locale dictionary (`en`, `es`).
 * @returns Structured validation result.
 */
export function validateAddressDirection(
  value: string,
  options: { locale?: DirectionLocale } = {}
): ValidationResult {
  const locale = options.locale ?? "en";
  if (!ADDRESS_DIRECTIONS[locale]) {
    return fail("UNSUPPORTED_LOCALE", `Unsupported direction locale: ${locale}.`);
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return fail("EMPTY", "Direction cannot be empty.");
  }

  return ADDRESS_DIRECTIONS[locale].has(normalized)
    ? ok("Valid address direction.")
    : fail("INVALID_FORMAT", "Direction does not match locale dictionary.");
}

/**
 * Boolean wrapper for `validateAddressDirection`.
 *
 * @param value - Direction text.
 * @param options - Validation options.
 * @returns `true` when the value is valid.
 */
export function isAddressDirection(value: string, options: { locale?: DirectionLocale } = {}): boolean {
  return validateAddressDirection(value, options).ok;
}

/**
 * Validates person names with practical production constraints.
 *
 * @param value - Name string.
 * @param options - Validation options.
 * @param options.minLength - Minimum total length.
 * @param options.maxLength - Maximum total length.
 * @returns Structured validation result.
 */
export function validateName(
  value: string,
  options: { minLength?: number; maxLength?: number } = {}
): ValidationResult {
  const minLength = options.minLength ?? 2;
  const maxLength = options.maxLength ?? 80;
  const normalized = value.trim();

  if (!normalized) {
    return fail("EMPTY", "Name cannot be empty.");
  }
  if (normalized.length < minLength) {
    return fail("TOO_SHORT", `Name must have at least ${minLength} characters.`);
  }
  if (normalized.length > maxLength) {
    return fail("TOO_LONG", `Name must have at most ${maxLength} characters.`);
  }
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(normalized)) {
    return fail("INVALID_CHARACTERS", "Name contains unsupported characters.");
  }

  return ok("Valid name.");
}

/**
 * Boolean wrapper for `validateName`.
 *
 * @param value - Name string.
 * @param options - Validation options.
 * @returns `true` when the value is valid.
 */
export function isValidName(value: string, options: { minLength?: number; maxLength?: number } = {}): boolean {
  return validateName(value, options).ok;
}

/**
 * Validates an email shape.
 *
 * @param value - Email string.
 * @returns Structured validation result.
 */
export function validateEmail(value: string): ValidationResult {
  const normalized = value.trim();
  if (!normalized) {
    return fail("EMPTY", "Email cannot be empty.");
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ? ok("Valid email.")
    : fail("INVALID_FORMAT", "Email does not match expected format.");
}

/**
 * Boolean wrapper for `validateEmail`.
 *
 * @param value - Email string.
 * @returns `true` when the value is valid.
 */
export function isEmail(value: string): boolean {
  return validateEmail(value).ok;
}

/**
 * Validates an HTTP(S) URL.
 *
 * @param value - URL string.
 * @returns Structured validation result.
 */
export function validateHttpUrl(value: string): ValidationResult {
  const normalized = value.trim();
  if (!normalized) {
    return fail("EMPTY", "URL cannot be empty.");
  }
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return fail("INVALID_FORMAT", "Only HTTP and HTTPS URLs are supported.");
    }
    return ok("Valid URL.");
  } catch {
    return fail("INVALID_FORMAT", "URL does not match expected format.");
  }
}

/**
 * Boolean wrapper for `validateHttpUrl`.
 *
 * @param value - URL string.
 * @returns `true` when the value is valid.
 */
export function isHttpUrl(value: string): boolean {
  return validateHttpUrl(value).ok;
}

/**
 * Validates US-style postal codes (`12345` or `12345-6789`).
 *
 * @param value - Postal code string.
 * @returns Structured validation result.
 */
export function validatePostalCode(value: string): ValidationResult {
  const normalized = value.trim();
  if (!normalized) {
    return fail("EMPTY", "Postal code cannot be empty.");
  }
  return /^\d{5}(?:-\d{4})?$/.test(normalized)
    ? ok("Valid postal code.")
    : fail("INVALID_FORMAT", "Postal code does not match supported formats.");
}

/**
 * Boolean wrapper for `validatePostalCode`.
 *
 * @param value - Postal code string.
 * @returns `true` when the value is valid.
 */
export function isPostalCode(value: string): boolean {
  return validatePostalCode(value).ok;
}

/**
 * Validates password strength using default security checks.
 *
 * @param value - Password candidate.
 * @param options - Validation options.
 * @param options.minLength - Minimum required length.
 * @returns Structured validation result.
 */
export function validateStrongPassword(value: string, options: { minLength?: number } = {}): ValidationResult {
  const minLength = options.minLength ?? 8;

  if (!value) {
    return fail("EMPTY", "Password cannot be empty.");
  }
  if (value.length < minLength) {
    return fail("TOO_SHORT", `Password must have at least ${minLength} characters.`);
  }
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return fail("INVALID_FORMAT", "Password must include upper, lower, digit, and symbol characters.");
  }

  return ok("Strong password.");
}

/**
 * Boolean wrapper for `validateStrongPassword`.
 *
 * @param value - Password candidate.
 * @param options - Validation options.
 * @returns `true` when the value is valid.
 */
export function isStrongPassword(value: string, options: { minLength?: number } = {}): boolean {
  return validateStrongPassword(value, options).ok;
}
