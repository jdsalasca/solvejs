export type ValidationResultCode =
  | "VALID"
  | "EMPTY"
  | "INVALID_FORMAT"
  | "TOO_SHORT"
  | "TOO_LONG"
  | "INVALID_CHARACTERS"
  | "UNSUPPORTED_LOCALE"
  | "UNSUPPORTED_COUNTRY"
  | "CHECKSUM_FAILED";

export type ValidationResult = {
  ok: boolean;
  code: ValidationResultCode;
  message: string;
};

export type SupportedCountry = "ANY" | "US" | "CO" | "MX" | "ES" | "AR" | "CL" | "PE" | "BR" | "CA" | "UY";
export type DirectionLocale = "en" | "es";
export type PostalCountry = "US" | "CO" | "MX" | "ES" | "AR" | "CL" | "PE" | "BR" | "CA" | "UY";

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
  ES: { minDigits: 9, maxDigits: 11 },
  AR: { minDigits: 10, maxDigits: 13 },
  CL: { minDigits: 9, maxDigits: 11 },
  PE: { minDigits: 9, maxDigits: 11 },
  BR: { minDigits: 10, maxDigits: 13 },
  CA: { minDigits: 10, maxDigits: 11 },
  UY: { minDigits: 8, maxDigits: 11 }
};

const POSTAL_PATTERNS: Record<PostalCountry, RegExp> = {
  US: /^\d{5}(?:-\d{4})?$/,
  CO: /^\d{6}$/,
  MX: /^\d{5}$/,
  ES: /^(?:0[1-9]|[1-4]\d|5[0-2])\d{3}$/,
  AR: /^[A-Z]?\d{4}[A-Z]{0,3}$/i,
  CL: /^\d{7}$/,
  PE: /^\d{5}$/,
  BR: /^\d{5}-?\d{3}$/,
  CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
  UY: /^\d{5}$/
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

  if (!["ANY", "US", "CO", "MX", "ES", "AR", "CL", "PE", "BR", "CA", "UY"].includes(country)) {
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
 * Backward-compatible alias for users who typed the previous function with one missing `d`.
 *
 * @param value - Direction text.
 * @param options - Validation options.
 * @returns `true` when the direction is valid.
 */
export function isAddresDirection(value: string, options: { locale?: DirectionLocale } = {}): boolean {
  return isAddressDirection(value, options);
}

/**
 * Backward-compatible alias for users who typed the previous function with two spelling mistakes.
 *
 * @param value - Direction text.
 * @param options - Validation options.
 * @returns `true` when the direction is valid.
 */
export function isAddresDirrection(value: string, options: { locale?: DirectionLocale } = {}): boolean {
  return isAddressDirection(value, options);
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
 * Validates usernames used in sign-up forms.
 *
 * @param value - Username candidate.
 * @param options - Validation options.
 * @param options.minLength - Minimum length.
 * @param options.maxLength - Maximum length.
 * @returns Structured validation result.
 */
export function validateUsername(
  value: string,
  options: { minLength?: number; maxLength?: number } = {}
): ValidationResult {
  const minLength = options.minLength ?? 3;
  const maxLength = options.maxLength ?? 30;
  const normalized = value.trim();

  if (!normalized) {
    return fail("EMPTY", "Username cannot be empty.");
  }
  if (normalized.length < minLength) {
    return fail("TOO_SHORT", `Username must have at least ${minLength} characters.`);
  }
  if (normalized.length > maxLength) {
    return fail("TOO_LONG", `Username must have at most ${maxLength} characters.`);
  }
  if (!/^[a-zA-Z0-9_]+$/.test(normalized)) {
    return fail("INVALID_CHARACTERS", "Username can only contain letters, numbers, and underscores.");
  }

  return ok("Valid username.");
}

/**
 * Boolean wrapper for `validateUsername`.
 *
 * @param value - Username candidate.
 * @param options - Validation options.
 * @returns `true` when the username is valid.
 */
export function isUsername(value: string, options: { minLength?: number; maxLength?: number } = {}): boolean {
  return validateUsername(value, options).ok;
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
 * Validates postal codes using country-specific patterns.
 *
 * @param value - Postal code string.
 * @param options - Validation options.
 * @param options.country - Country code used for pattern selection.
 * @returns Structured validation result.
 */
export function validatePostalCode(
  value: string,
  options: { country?: PostalCountry } = {}
): ValidationResult {
  const normalized = value.trim();
  const country = options.country ?? "US";

  if (!normalized) {
    return fail("EMPTY", "Postal code cannot be empty.");
  }
  const pattern = POSTAL_PATTERNS[country];
  if (!pattern) {
    return fail("UNSUPPORTED_COUNTRY", `Unsupported postal code country: ${country}.`);
  }

  return pattern.test(normalized)
    ? ok(`Valid postal code for ${country}.`)
    : fail("INVALID_FORMAT", `Postal code does not match ${country} format.`);
}

/**
 * Boolean wrapper for `validatePostalCode`.
 *
 * @param value - Postal code string.
 * @param options - Validation options.
 * @returns `true` when the value is valid.
 */
export function isPostalCode(value: string, options: { country?: PostalCountry } = {}): boolean {
  return validatePostalCode(value, options).ok;
}

/**
 * Validates address line input for common delivery/billing forms.
 *
 * @param value - Address line string.
 * @param options - Validation options.
 * @param options.minLength - Minimum length.
 * @param options.maxLength - Maximum length.
 * @returns Structured validation result.
 */
export function validateAddressLine(
  value: string,
  options: { minLength?: number; maxLength?: number } = {}
): ValidationResult {
  const minLength = options.minLength ?? 5;
  const maxLength = options.maxLength ?? 120;
  const normalized = value.trim();

  if (!normalized) {
    return fail("EMPTY", "Address line cannot be empty.");
  }
  if (normalized.length < minLength) {
    return fail("TOO_SHORT", `Address line must have at least ${minLength} characters.`);
  }
  if (normalized.length > maxLength) {
    return fail("TOO_LONG", `Address line must have at most ${maxLength} characters.`);
  }
  if (!/^[A-Za-z0-9À-ÖØ-öø-ÿ#.,'\/ -]+$/.test(normalized)) {
    return fail("INVALID_CHARACTERS", "Address line contains unsupported characters.");
  }

  return ok("Valid address line.");
}

/**
 * Boolean wrapper for `validateAddressLine`.
 *
 * @param value - Address line string.
 * @param options - Validation options.
 * @returns `true` when the address line is valid.
 */
export function isAddressLine(value: string, options: { minLength?: number; maxLength?: number } = {}): boolean {
  return validateAddressLine(value, options).ok;
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

function luhnCheck(value: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function isValidIsoDateParts(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

/**
 * Validates card numbers using basic shape checks plus Luhn checksum.
 *
 * @param value - Card number candidate.
 * @returns Structured validation result.
 */
export function validateCreditCardNumber(value: string): ValidationResult {
  const normalized = value.replace(/[\s-]/g, "");
  if (!normalized) {
    return fail("EMPTY", "Card number cannot be empty.");
  }
  if (!/^\d{12,19}$/.test(normalized)) {
    return fail("INVALID_FORMAT", "Card number must contain only digits and valid length.");
  }
  if (!luhnCheck(normalized)) {
    return fail("CHECKSUM_FAILED", "Card number checksum is invalid.");
  }
  return ok("Valid card number.");
}

/**
 * Boolean wrapper for `validateCreditCardNumber`.
 *
 * @param value - Card number candidate.
 * @returns `true` when the card number is valid.
 */
export function isCreditCardNumber(value: string): boolean {
  return validateCreditCardNumber(value).ok;
}

/**
 * Validates UUID v4 strings.
 *
 * @param value - UUID candidate.
 * @returns Structured validation result.
 */
export function validateUuidV4(value: string): ValidationResult {
  const normalized = value.trim();
  if (!normalized) {
    return fail("EMPTY", "UUID cannot be empty.");
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)
    ? ok("Valid UUID v4.")
    : fail("INVALID_FORMAT", "UUID does not match v4 format.");
}

/**
 * Boolean wrapper for `validateUuidV4`.
 *
 * @param value - UUID candidate.
 * @returns `true` when UUID is valid.
 */
export function isUuidV4(value: string): boolean {
  return validateUuidV4(value).ok;
}

/**
 * Validates IPv4 addresses.
 *
 * @param value - IPv4 candidate.
 * @returns Structured validation result.
 */
export function validateIpv4(value: string): ValidationResult {
  const normalized = value.trim();
  if (!normalized) {
    return fail("EMPTY", "IPv4 address cannot be empty.");
  }
  return /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(normalized)
    ? ok("Valid IPv4 address.")
    : fail("INVALID_FORMAT", "IPv4 address does not match expected format.");
}

/**
 * Boolean wrapper for `validateIpv4`.
 *
 * @param value - IPv4 candidate.
 * @returns `true` when IPv4 is valid.
 */
export function isIpv4(value: string): boolean {
  return validateIpv4(value).ok;
}

/**
 * Validates strict ISO date strings (`YYYY-MM-DD`) including calendar correctness.
 *
 * @param value - Date string candidate.
 * @returns Structured validation result.
 */
export function validateIsoDateString(value: string): ValidationResult {
  const normalized = value.trim();
  if (!normalized) {
    return fail("EMPTY", "Date string cannot be empty.");
  }
  return isValidIsoDateParts(normalized)
    ? ok("Valid ISO date.")
    : fail("INVALID_FORMAT", "Date string must be a valid ISO date in YYYY-MM-DD format.");
}

/**
 * Boolean wrapper for `validateIsoDateString`.
 *
 * @param value - Date string candidate.
 * @returns `true` when date string is valid.
 */
export function isIsoDateString(value: string): boolean {
  return validateIsoDateString(value).ok;
}
