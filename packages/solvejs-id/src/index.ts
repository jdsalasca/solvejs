import { failId } from "./errors.js";

export { IdError, type IdErrorCode } from "./errors.js";

/** Injectable clock and random source, useful for deterministic tests. */
export type IdSource = {
  now?: () => number;
  random?: (size: number) => Uint8Array;
};

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const NANOID_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-";
const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

function secureRandom(size: number): Uint8Array {
  const webCrypto = globalThis.crypto;
  if (!webCrypto || typeof webCrypto.getRandomValues !== "function") {
    failId("ID_UNSUPPORTED", "This runtime does not provide crypto.getRandomValues.");
  }
  const bytes = new Uint8Array(size);
  webCrypto.getRandomValues(bytes);
  return bytes;
}

function sourceOf(options: IdSource | undefined): Required<IdSource> {
  return { now: options?.now ?? Date.now, random: options?.random ?? secureRandom };
}

function randomBytes(size: number, options?: IdSource): Uint8Array {
  if (!Number.isInteger(size) || size < 1 || size > 1024) {
    failId("ID_INVALID_INPUT", "Random byte size must be an integer from 1 to 1024.", { size });
  }
  const bytes = sourceOf(options).random(size);
  if (!(bytes instanceof Uint8Array) || bytes.length < size) {
    failId("ID_INVALID_INPUT", "Random source returned fewer bytes than requested.", { size, received: bytes?.length });
  }
  return bytes.slice(0, size);
}

function hex(bytes: Uint8Array): string {
  let result = "";
  for (const byte of bytes) result += byte.toString(16).padStart(2, "0");
  return result;
}

function uuidFromBytes(bytes: Uint8Array): string {
  const value = hex(bytes);
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function timestampBytes(milliseconds: number): Uint8Array {
  if (!Number.isInteger(milliseconds) || milliseconds < 0 || milliseconds > 0xffffffffffff) {
    failId("ID_INVALID_INPUT", "Timestamp must fit in 48 bits.", { milliseconds });
  }
  const bytes = new Uint8Array(6);
  let value = milliseconds;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = value & 0xff;
    value = Math.floor(value / 256);
  }
  return bytes;
}

function base32(bytes: Uint8Array): string {
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += CROCKFORD[(buffer >>> bits) & 31];
    }
  }
  if (bits > 0) output += CROCKFORD[(buffer << (5 - bits)) & 31];
  return output;
}

function base32Value(character: string): number {
  return CROCKFORD.indexOf(character);
}

function base64url(bytes: Uint8Array): string {
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    output += BASE64URL[first >> 2];
    output += BASE64URL[((first & 3) << 4) | ((second ?? 0) >> 4)];
    if (second === undefined) break;
    output += BASE64URL[((second & 15) << 2) | ((third ?? 0) >> 6)];
    if (third === undefined) break;
    output += BASE64URL[third & 63];
  }
  return output;
}

/** Generates a random RFC 4122 version 4 UUID. */
export function uuidv4(options?: IdSource): string {
  const bytes = randomBytes(16, options);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return uuidFromBytes(bytes);
}

/** Generates an RFC 9562 version 7 UUID with a 48-bit millisecond timestamp. */
export function uuidv7(options?: IdSource): string {
  const source = sourceOf(options);
  const bytes = new Uint8Array(16);
  bytes.set(timestampBytes(source.now()), 0);
  bytes.set(randomBytes(10, options), 6);
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return uuidFromBytes(bytes);
}

/** Generates a 26-character Crockford Base32 ULID. */
export function ulid(options?: IdSource): string {
  const source = sourceOf(options);
  const bytes = new Uint8Array(16);
  bytes.set(timestampBytes(source.now()), 0);
  bytes.set(randomBytes(10, options), 6);
  return base32(bytes);
}

/** Generates a URL-safe NanoID. The alphabet is 64 characters, so no modulo bias. */
export function nanoid(size = 21, options?: IdSource): string {
  if (!Number.isInteger(size) || size < 1 || size > 128) {
    failId("ID_INVALID_INPUT", "NanoID size must be an integer from 1 to 128.", { size });
  }
  const bytes = randomBytes(size, options);
  let output = "";
  for (const byte of bytes) output += NANOID_ALPHABET[byte & 63];
  return output;
}

/** Generates a Stripe-style prefixed ID such as `usr_...`. */
export function prefixedId(prefix: string, size = 16, options?: IdSource): string {
  if (!/^[a-z][a-z0-9]{0,15}$/.test(prefix)) {
    failId("ID_INVALID_INPUT", "Prefix must start with a lowercase letter and use lowercase letters or digits.", { prefix });
  }
  return `${prefix}_${nanoid(size, options)}`;
}

/** Generates a URL-safe random token from cryptographic bytes. */
export function randomToken(bytes = 32, options?: IdSource): string {
  return base64url(randomBytes(bytes, options));
}

/** Returns true for a canonical UUID, optionally restricted to version 4 or 7. */
export function isUuid(value: unknown, version?: 4 | 7): value is string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) return false;
  return version === undefined || value[14].toLowerCase() === String(version);
}

/** Returns true for a canonical uppercase ULID. */
export function isUlid(value: unknown): value is string {
  return typeof value === "string" && ULID_PATTERN.test(value);
}

/** Returns true for a prefixed ID, optionally checking the prefix. */
export function isPrefixedId(value: unknown, prefix?: string): value is string {
  if (typeof value !== "string") return false;
  const match = /^([a-z][a-z0-9]{0,15})_[A-Za-z0-9_-]+$/.exec(value);
  if (!match) return false;
  return prefix === undefined || match[1] === prefix;
}

/** Extracts the timestamp from a UUID v7. */
export function uuidTimestamp(value: unknown): Date | undefined {
  if (!isUuid(value, 7)) return undefined;
  const milliseconds = Number.parseInt(value.replace(/-/g, "").slice(0, 12), 16);
  return new Date(milliseconds);
}

/** Extracts the timestamp from a ULID. */
export function ulidTimestamp(value: unknown): Date | undefined {
  if (!isUlid(value)) return undefined;
  let milliseconds = 0;
  for (const character of value.slice(0, 10)) {
    const digit = base32Value(character);
    if (digit < 0) return undefined;
    milliseconds = milliseconds * 32 + digit;
  }
  return new Date(Math.floor(milliseconds / 4));
}

/** Extracts a timestamp from a UUID v7 or ULID. */
export function parseIdTimestamp(value: unknown): Date | undefined {
  return uuidTimestamp(value) ?? ulidTimestamp(value);
}
