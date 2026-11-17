export type ValidationResultCode =
  | "VALID"
  | "EMPTY"
  | "INVALID_TYPE"
  | "INVALID_RESULT"
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

export type ValidationMessageLocale = "en" | "es" | "pt";

export type TranslateValidationOptions = {
  locale?: ValidationMessageLocale;
  fieldLabel?: string;
  messages?: Partial<Record<ValidationResultCode, string>>;
};

export type SupportedCountry = "ANY" | "US" | "CO" | "MX" | "ES" | "AR" | "CL" | "PE" | "BR" | "CA" | "UY" | "GB" | "DE";
export type DirectionLocale = "en" | "es";
export type PostalCountry = "US" | "CO" | "MX" | "ES" | "AR" | "CL" | "PE" | "BR" | "CA" | "UY" | "GB" | "DE";

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
  UY: { minDigits: 8, maxDigits: 11 },
  GB: { minDigits: 10, maxDigits: 12 },
  DE: { minDigits: 10, maxDigits: 14 }
};

const PHONE_COUNTRIES = new Set<SupportedCountry>([
  "ANY",
  "US",
  "CO",
  "MX",
  "ES",
  "AR",
  "CL",
  "PE",
  "BR",
  "CA",
  "UY",
  "GB",
  "DE"
]);

const POSTAL_PATTERNS: Record<PostalCountry, RegExp> = {
  // eslint-disable-next-line security/detect-unsafe-regex -- anchored, fixed-width alternatives
  US: /^\d{5}(?:-\d{4})?$/,
  CO: /^\d{6}$/,
  MX: /^\d{5}$/,
  ES: /^(?:0[1-9]|[1-4]\d|5[0-2])\d{3}$/,
  AR: /^[A-Z]?\d{4}[A-Z]{0,3}$/i,
  CL: /^\d{7}$/,
  PE: /^\d{5}$/,
  BR: /^\d{5}-?\d{3}$/,
  CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
  UY: /^\d{5}$/,
  GB: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
  DE: /^\d{5}$/
};

const VALIDATION_MESSAGES: Record<ValidationMessageLocale, Record<ValidationResultCode, string>> = {
  en: {
    VALID: "{field} is valid.",
    EMPTY: "{field} is required.",
    INVALID_TYPE: "{field} must be a string.",
    INVALID_RESULT: "Invalid validation result.",
    INVALID_FORMAT: "{field} has an invalid format.",
    TOO_SHORT: "{field} is too short.",
    TOO_LONG: "{field} is too long.",
    INVALID_CHARACTERS: "{field} contains unsupported characters.",
    UNSUPPORTED_LOCALE: "{field} uses an unsupported locale.",
    UNSUPPORTED_COUNTRY: "{field} uses an unsupported country.",
    CHECKSUM_FAILED: "{field} failed the checksum validation."
  },
  es: {
    VALID: "{field} es valido.",
    EMPTY: "{field} es obligatorio.",
    INVALID_TYPE: "{field} debe ser texto.",
    INVALID_RESULT: "Resultado de validacion invalido.",
    INVALID_FORMAT: "{field} tiene un formato invalido.",
    TOO_SHORT: "{field} es demasiado corto.",
    TOO_LONG: "{field} es demasiado largo.",
    INVALID_CHARACTERS: "{field} contiene caracteres no permitidos.",
    UNSUPPORTED_LOCALE: "{field} usa un idioma no soportado.",
    UNSUPPORTED_COUNTRY: "{field} usa un pais no soportado.",
    CHECKSUM_FAILED: "{field} no paso la validacion de checksum."
  },
  pt: {
    VALID: "{field} e valido.",
    EMPTY: "{field} e obrigatorio.",
    INVALID_TYPE: "{field} deve ser texto.",
    INVALID_RESULT: "Resultado de validacao invalido.",
    INVALID_FORMAT: "{field} tem um formato invalido.",
    TOO_SHORT: "{field} e muito curto.",
    TOO_LONG: "{field} e muito longo.",
    INVALID_CHARACTERS: "{field} contem caracteres nao permitidos.",
    UNSUPPORTED_LOCALE: "{field} usa um idioma nao suportado.",
    UNSUPPORTED_COUNTRY: "{field} usa um pais nao suportado.",
    CHECKSUM_FAILED: "{field} falhou na validacao de checksum."
  }
};

function ok(message = "Validation passed."): ValidationResult {
  return { ok: true, code: "VALID", message };
}

function fail(code: Exclude<ValidationResultCode, "VALID">, message: string): ValidationResult {
  return { ok: false, code, message };
}

function requireString(value: unknown): ValidationResult | null {
  if (typeof value === "string") return null;
  return fail("INVALID_TYPE", "Expected a string.");
}

function checkStringLength(
  normalized: string,
  field: string,
  minLength: number,
  maxLength: number
): ValidationResult | null {
  if (!normalized) return fail("EMPTY", `${field} cannot be empty.`);
  if (normalized.length < minLength) {
    return fail("TOO_SHORT", `${field} must have at least ${minLength} characters.`);
  }
  if (normalized.length > maxLength) {
    return fail("TOO_LONG", `${field} must have at most ${maxLength} characters.`);
  }
  return null;
}

function isValidationResult(value: unknown): value is ValidationResult {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as { ok?: unknown; code?: unknown; message?: unknown };
  return typeof candidate.ok === "boolean" && typeof candidate.code === "string" && typeof candidate.message === "string";
}

/**
 * Translates a structured validation result into a UI-ready message.
 *
 * @param result - Validation result returned by any `validateX` helper.
 * @param options - Translation options.
 * @param options.locale - Built-in locale (`en`, `es`, or `pt`).
 * @param options.fieldLabel - Human field label used in the message.
 * @param options.messages - Optional code-specific message overrides.
 * @returns A validation result with the translated message.
 */
export function translateValidationResult(
  result: ValidationResult,
  options: TranslateValidationOptions = {}
): ValidationResult {
  if (!isValidationResult(result)) {
    return fail("INVALID_RESULT", "Invalid validation result.");
  }

  const locale = options.locale ?? "en";
  const fieldLabel = options.fieldLabel ?? "Value";
  const template =
    options.messages?.[result.code] ??
    VALIDATION_MESSAGES[locale][result.code] ??
    "{field} is invalid.";

  return {
    ...result,
    message: template.replace("{field}", fieldLabel)
  };
}

function checkPhoneCountry(country: SupportedCountry): ValidationResult | null {
  return PHONE_COUNTRIES.has(country)
    ? null
    : fail("UNSUPPORTED_COUNTRY", `Unsupported country preset: ${country}.`);
}

function normalizePhone(value: string, allowInternational: boolean): string | ValidationResult {
  const normalized = value.trim();
  if (normalized.length === 0) return fail("EMPTY", "Phone number cannot be empty.");

  const compact = normalized.replace(/[\s().-]/g, "");
  const pattern = allowInternational ? /^\+?\d+$/ : /^\d+$/;
  if (!pattern.test(compact)) return fail("INVALID_FORMAT", "Phone number contains invalid characters.");

  return compact.startsWith("+") ? compact.slice(1) : compact;
}

function resolvePhoneBounds(
  country: SupportedCountry,
  options: { minDigits?: number; maxDigits?: number }
): { minDigits: number; maxDigits: number } {
  const preset = country === "ANY" ? { minDigits: 7, maxDigits: 15 } : COUNTRY_RULES[country];
  return {
    minDigits: options.minDigits ?? preset.minDigits,
    maxDigits: options.maxDigits ?? preset.maxDigits
  };
}

function checkPhoneLength(digits: string, minDigits: number, maxDigits: number): ValidationResult | null {
  if (digits.length < minDigits) {
    return fail("TOO_SHORT", `Phone number must have at least ${minDigits} digits.`);
  }
  if (digits.length > maxDigits) {
    return fail("TOO_LONG", `Phone number must have at most ${maxDigits} digits.`);
  }
  return null;
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
  const typeError = requireString(value);
  if (typeError) return typeError;

  const allowInternational = options.allowInternational ?? true;
  const country = options.country ?? "ANY";

  const countryError = checkPhoneCountry(country);
  if (countryError) return countryError;

  const digits = normalizePhone(value, allowInternational);
  if (typeof digits !== "string") return digits;

  const { minDigits, maxDigits } = resolvePhoneBounds(country, options);
  const lengthError = checkPhoneLength(digits, minDigits, maxDigits);
  if (lengthError) return lengthError;

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
  const typeError = requireString(value);
  if (typeError) return typeError;

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
 * @deprecated Use {@link isAddressDirection}. This alias is kept only so existing code keeps
 * working, and is removed in the next major release.
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
 * @deprecated Use {@link isAddressDirection}. This alias is kept only so existing code keeps
 * working, and is removed in the next major release.
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
  const typeError = requireString(value);
  if (typeError) return typeError;

  const minLength = options.minLength ?? 2;
  const maxLength = options.maxLength ?? 80;
  const normalized = value.trim();

  const lengthError = checkStringLength(normalized, "Name", minLength, maxLength);
  if (lengthError) return lengthError;
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
  const typeError = requireString(value);
  if (typeError) return typeError;

  const minLength = options.minLength ?? 3;
  const maxLength = options.maxLength ?? 30;
  const normalized = value.trim();

  const lengthError = checkStringLength(normalized, "Username", minLength, maxLength);
  if (lengthError) return lengthError;
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
  const typeError = requireString(value);
  if (typeError) return typeError;

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
  const typeError = requireString(value);
  if (typeError) return typeError;

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
 * Validates a domain name without protocol or path.
 *
 * @param value - Domain candidate.
 * @returns Structured validation result.
 */
export function validateDomain(value: string): ValidationResult {
  const typeError = requireString(value);
  if (typeError) return typeError;

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fail("EMPTY", "Domain cannot be empty.");
  }
  if (normalized.length > 253) {
    return fail("TOO_LONG", "Domain must have at most 253 characters.");
  }
  const labels = normalized.split(".");
  if (labels.length < 2) {
    return fail("INVALID_FORMAT", "Domain must include a top-level domain.");
  }
  const valid = labels.every(
    // eslint-disable-next-line security/detect-unsafe-regex -- bounded label length, no nested wildcard
    (label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)
  );
  return valid ? ok("Valid domain.") : fail("INVALID_FORMAT", "Domain does not match expected format.");
}

/**
 * Boolean wrapper for `validateDomain`.
 *
 * @param value - Domain candidate.
 * @returns `true` when the domain is valid.
 */
export function isDomain(value: string): boolean {
  return validateDomain(value).ok;
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
  const typeError = requireString(value);
  if (typeError) return typeError;

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
  const typeError = requireString(value);
  if (typeError) return typeError;

  const minLength = options.minLength ?? 5;
  const maxLength = options.maxLength ?? 120;
  const normalized = value.trim();

  const lengthError = checkStringLength(normalized, "Address line", minLength, maxLength);
  if (lengthError) return lengthError;
  if (!/^[A-Za-z0-9À-ÖØ-öø-ÿ#.,'/ -]+$/.test(normalized)) {
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

function hasPasswordClasses(value: string): boolean {
  return /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
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
  const typeError = requireString(value);
  if (typeError) return typeError;

  const minLength = options.minLength ?? 8;

  if (!value) {
    return fail("EMPTY", "Password cannot be empty.");
  }
  if (value.length < minLength) {
    return fail("TOO_SHORT", `Password must have at least ${minLength} characters.`);
  }
  if (!hasPasswordClasses(value)) {
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
  const typeError = requireString(value);
  if (typeError) return typeError;

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

const IBAN_FORMATS: Record<string, { length: number; bban: RegExp }> = {
  AD: { length: 24, bban: /^\d{8}[A-Z0-9]{12}$/ },
  AE: { length: 23, bban: /^\d{19}$/ },
  AT: { length: 20, bban: /^\d{16}$/ },
  BE: { length: 16, bban: /^\d{12}$/ },
  BG: { length: 22, bban: /^[A-Z]{4}\d{6}[A-Z0-9]{8}$/ },
  BR: { length: 29, bban: /^\d{23}[A-Z][A-Z0-9]$/ },
  CH: { length: 21, bban: /^\d{5}[A-Z0-9]{12}$/ },
  CY: { length: 28, bban: /^\d{8}[A-Z0-9]{16}$/ },
  CZ: { length: 24, bban: /^\d{20}$/ },
  DE: { length: 22, bban: /^\d{18}$/ },
  DK: { length: 18, bban: /^\d{14}$/ },
  EE: { length: 20, bban: /^\d{16}$/ },
  ES: { length: 24, bban: /^\d{20}$/ },
  FI: { length: 18, bban: /^\d{14}$/ },
  FR: { length: 27, bban: /^\d{10}[A-Z0-9]{11}\d{2}$/ },
  GB: { length: 22, bban: /^[A-Z]{4}\d{14}$/ },
  GI: { length: 23, bban: /^[A-Z]{4}[A-Z0-9]{15}$/ },
  GR: { length: 27, bban: /^\d{7}[A-Z0-9]{16}$/ },
  HR: { length: 21, bban: /^\d{17}$/ },
  HU: { length: 28, bban: /^\d{24}$/ },
  IE: { length: 22, bban: /^[A-Z]{4}\d{14}$/ },
  IL: { length: 23, bban: /^\d{19}$/ },
  IS: { length: 26, bban: /^\d{22}$/ },
  IT: { length: 27, bban: /^[A-Z]\d{10}[A-Z0-9]{12}$/ },
  LI: { length: 21, bban: /^\d{5}[A-Z0-9]{12}$/ },
  LT: { length: 20, bban: /^\d{16}$/ },
  LU: { length: 20, bban: /^\d{3}[A-Z0-9]{13}$/ },
  LV: { length: 21, bban: /^[A-Z]{4}[A-Z0-9]{13}$/ },
  MC: { length: 27, bban: /^\d{10}[A-Z0-9]{11}\d{2}$/ },
  MT: { length: 31, bban: /^[A-Z]{4}\d{5}[A-Z0-9]{18}$/ },
  NL: { length: 18, bban: /^[A-Z]{4}\d{10}$/ },
  NO: { length: 15, bban: /^\d{11}$/ },
  PL: { length: 28, bban: /^\d{24}$/ },
  PT: { length: 25, bban: /^\d{21}$/ },
  RO: { length: 24, bban: /^[A-Z]{4}[A-Z0-9]{16}$/ },
  SA: { length: 24, bban: /^\d{2}[A-Z0-9]{18}$/ },
  SE: { length: 24, bban: /^\d{20}$/ },
  SI: { length: 19, bban: /^\d{15}$/ },
  SK: { length: 24, bban: /^\d{20}$/ },
  SM: { length: 27, bban: /^[A-Z]\d{10}[A-Z0-9]{12}$/ },
  TR: { length: 26, bban: /^\d{6}[A-Z0-9]{16}$/ },
  UA: { length: 29, bban: /^\d{6}[A-Z0-9]{19}$/ }
};

function ibanChecksum(normalized: string): boolean {
  const rearranged = `${normalized.slice(4)}${normalized.slice(0, 4)}`;
  let remainder = 0;
  for (const character of rearranged) {
    const digits = character >= "A" ? String(character.charCodeAt(0) - 55) : character;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

/* eslint-disable complexity -- structured IBAN checks */
/**
 * Validates an International Bank Account Number (IBAN).
 *
 * Spaces are ignored and lowercase input is accepted. The country-specific length is checked for
 * the countries in the built-in table, then the MOD-97 checksum is verified. Unknown countries are
 * accepted only when the structural length and checksum are valid.
 *
 * @param value - IBAN candidate.
 * @returns Structured validation result.
 */
export function validateIban(value: string): ValidationResult {
  const typeError = requireString(value);
  if (typeError) return typeError;

  const normalized = value.replace(/\s+/g, "").toUpperCase();
  if (!normalized) return fail("EMPTY", "IBAN cannot be empty.");
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(normalized)) {
    return fail("INVALID_FORMAT", "IBAN must start with a country code, two check digits and alphanumeric characters.");
  }
  if (normalized.length < 15) return fail("TOO_SHORT", "IBAN must contain at least 15 characters.");
  if (normalized.length > 34) return fail("TOO_LONG", "IBAN cannot contain more than 34 characters.");

  const format = IBAN_FORMATS[normalized.slice(0, 2)];
  if (format !== undefined && normalized.length !== format.length) {
    return fail("INVALID_FORMAT", `IBAN length must be ${format.length} characters for this country.`);
  }
  if (format !== undefined && !format.bban.test(normalized.slice(4))) {
    return fail("INVALID_FORMAT", "IBAN bank account structure does not match the country format.");
  }
  if (!ibanChecksum(normalized)) {
    return fail("CHECKSUM_FAILED", "IBAN checksum is invalid.");
  }
  return ok("Valid IBAN.");
}

/**
 * Boolean wrapper for `validateIban`.
 *
 * @param value - IBAN candidate.
 * @returns `true` when the IBAN is valid.
 */
export function isIban(value: string): boolean {
  return validateIban(value).ok;
}
/* eslint-enable complexity */

/**
 * Validates UUID v4 strings.
 *
 * @param value - UUID candidate.
 * @returns Structured validation result.
 */
export function validateUuidV4(value: string): ValidationResult {
  const typeError = requireString(value);
  if (typeError) return typeError;

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
  const typeError = requireString(value);
  if (typeError) return typeError;

  const normalized = value.trim();
  if (!normalized) {
    return fail("EMPTY", "IPv4 address cannot be empty.");
  }
  // eslint-disable-next-line security/detect-unsafe-regex -- four bounded octet groups, anchored
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
  const typeError = requireString(value);
  if (typeError) return typeError;

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
