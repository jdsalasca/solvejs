/** Stable error codes for the ID package. */
export type IdErrorCode = "ID_INVALID_INPUT" | "ID_UNSUPPORTED";

/** Error thrown by every ID operation that rejects its input. */
export class IdError extends Error {
  readonly code: IdErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: IdErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "IdError";
    this.code = code;
    this.details = details;
  }
}

/** Throws an `IdError` with a stable code. */
export function failId(code: IdErrorCode, message: string, details: Record<string, unknown> = {}): never {
  throw new IdError(code, message, details);
}
