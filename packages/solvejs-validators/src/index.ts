const ADDRESS_DIRECTIONS = new Set([
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
]);

/**
 * Checks whether a string is a valid international or local cellphone number.
 *
 * @param value - Input phone string.
 * @param options - Validation options.
 * @param options.allowInternational - Allows a leading `+`.
 * @param options.minDigits - Minimum number of digits.
 * @param options.maxDigits - Maximum number of digits.
 * @returns `true` when the input matches configured constraints.
 */
export function isCellphoneNumber(
  value: string,
  options: { allowInternational?: boolean; minDigits?: number; maxDigits?: number } = {}
): boolean {
  const allowInternational = options.allowInternational ?? true;
  const minDigits = options.minDigits ?? 7;
  const maxDigits = options.maxDigits ?? 15;

  const normalized = value.trim().replace(/[\s().-]/g, "");
  const pattern = allowInternational ? /^\+?\d+$/ : /^\d+$/;

  if (!pattern.test(normalized)) {
    return false;
  }

  const digits = normalized.startsWith("+") ? normalized.slice(1) : normalized;
  return digits.length >= minDigits && digits.length <= maxDigits;
}

/**
 * Validates common cardinal and intercardinal address directions.
 *
 * @param value - Direction text.
 * @returns `true` when the input matches known direction tokens.
 */
export function isAddressDirection(value: string): boolean {
  return ADDRESS_DIRECTIONS.has(value.trim().toUpperCase());
}

/**
 * Validates names using practical rules for most user forms.
 *
 * @param value - Name string.
 * @param options - Validation options.
 * @param options.minLength - Minimum total length.
 * @param options.maxLength - Maximum total length.
 * @returns `true` when the name is considered valid.
 */
export function isValidName(
  value: string,
  options: { minLength?: number; maxLength?: number } = {}
): boolean {
  const minLength = options.minLength ?? 2;
  const maxLength = options.maxLength ?? 80;
  const normalized = value.trim();

  if (normalized.length < minLength || normalized.length > maxLength) {
    return false;
  }

  return /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(normalized);
}

/**
 * Validates an email using practical constraints for application forms.
 *
 * @param value - Email string.
 * @returns `true` when email shape is valid.
 */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Validates an HTTP(S) URL.
 *
 * @param value - URL string.
 * @returns `true` when URL is valid and protocol is HTTP or HTTPS.
 */
export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates US-style postal codes (`12345` or `12345-6789`).
 *
 * @param value - Postal code string.
 * @returns `true` when value matches supported postal formats.
 */
export function isPostalCode(value: string): boolean {
  return /^\d{5}(?:-\d{4})?$/.test(value.trim());
}

/**
 * Validates password strength with common security requirements.
 *
 * @param value - Password candidate.
 * @param options - Validation options.
 * @param options.minLength - Minimum required length.
 * @returns `true` when password meets complexity requirements.
 */
export function isStrongPassword(value: string, options: { minLength?: number } = {}): boolean {
  const minLength = options.minLength ?? 8;
  if (value.length < minLength) {
    return false;
  }

  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);

  return hasUpper && hasLower && hasDigit && hasSymbol;
}
