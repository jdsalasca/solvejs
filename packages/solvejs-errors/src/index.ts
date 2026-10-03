/** The closed set of application error codes this package understands. */
export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_FAILED"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "TIMEOUT"
  | "INTERNAL";

/** Default HTTP status for each error code. */
const STATUS_BY_CODE: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_FAILED: 422,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
  TIMEOUT: 504,
  INTERNAL: 500
};

const CODES = Object.keys(STATUS_BY_CODE) as ErrorCode[];

/** Options for {@link createError} and {@link normalizeError}. */
export type AppErrorOptions = {
  /** HTTP status. Defaults to the status mapped from `code`. */
  status?: number;
  /** Machine-readable context. Never sent to a client unless serialised. */
  details?: Record<string, unknown>;
  /** The underlying error, kept for logging. */
  cause?: unknown;
};

/** Options for {@link normalizeError}. */
export type NormalizeOptions = AppErrorOptions & {
  /** Override the inferred code, for example to map a driver error onto `SERVICE_UNAVAILABLE`. */
  code?: ErrorCode;
};

/** Options for {@link serializeError}. */
export type SerializeOptions = {
  /** Include the cause chain in the payload. Off by default, since a cause is for logs. */
  includeCause?: boolean;
  /** Replace matches of this pattern in the message. Use it to redact secrets. */
  mask?: RegExp;
  /** Text substituted for a masked match. Defaults to `[redacted]`. */
  replacement?: string;
};

/** A JSON-safe error payload. */
export type SerializedError = {
  error: {
    code: ErrorCode;
    message: string;
    status: number;
    details?: Record<string, unknown>;
    cause?: { code?: string; message: string };
  };
};

/** An HTTP-shaped error response. */
export type ErrorResponse = {
  status: number;
  headers: Record<string, string>;
  body: SerializedError;
};

/** A successful or failed outcome, without throwing. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

function isKnownCode(code: unknown): code is ErrorCode {
  return typeof code === "string" && CODES.includes(code as ErrorCode);
}

function assertStatus(status: unknown): void {
  if (status === undefined) return;
  if (typeof status !== "number" || !Number.isInteger(status) || status < 100 || status > 599) {
    throw new TypeError(`Expected status to be an integer between 100 and 599, received ${JSON.stringify(status)}.`);
  }
}

/**
 * An application error with a stable machine-readable code.
 *
 * The code is the part callers should branch on. The message is for humans and may change, so never
 * match on it.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown>;
  /** The underlying error. Declared here because `Error.cause` only exists from ES2022. */
  readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = options.status ?? STATUS_BY_CODE[code] ?? 500;
    this.details = options.details ?? {};
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
    // Keeps instanceof working when the class is downlevelled.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  override toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }
}

/**
 * Maps an error code to its default HTTP status.
 *
 * An unknown code maps to `500`, never to a success status, so a typo cannot leak a 200.
 *
 * @param code - Error code.
 * @returns HTTP status between 400 and 599.
 *
 * @example
 * getStatusForCode("NOT_FOUND"); // 404
 */
export function getStatusForCode(code: string): number {
  return isKnownCode(code) ? STATUS_BY_CODE[code] : 500;
}

/**
 * Builds an {@link AppError}.
 *
 * @param code - One of the documented error codes.
 * @param message - Human-readable message. Not for branching on.
 * @param options - Extra status, details and cause.
 * @returns The error.
 * @throws {TypeError} If the code is unknown or the status is not an HTTP status.
 *
 * @example
 * throw createError("NOT_FOUND", `No user with id ${id}.`, { details: { id } });
 */
export function createError(code: string, message?: string, options: AppErrorOptions = {}): AppError {
  if (!isKnownCode(code)) {
    throw new TypeError(
      `Expected code to be one of: ${CODES.join(", ")}. Received ${JSON.stringify(code)}.`
    );
  }
  assertStatus(options?.status);

  // The message defaults to the code, which is at least stable and never leaks internals.
  return new AppError(code, message ?? code, options);
}

/**
 * Checks whether a value is an {@link AppError}.
 *
 * @param value - Candidate value.
 * @returns `true` for an AppError.
 */
export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/**
 * Reads the code from any error value.
 *
 * @param value - Candidate error.
 * @returns The code, or `INTERNAL` when the value is not an AppError.
 */
export function getErrorCode(value: unknown): ErrorCode {
  return isAppError(value) ? value.code : "INTERNAL";
}

/**
 * Normalises any thrown value into an {@link AppError}.
 *
 * An AppError passes through untouched, so wrapping twice is safe. Anything else becomes `INTERNAL`
 * with the original value kept as the cause.
 *
 * @param value - The thrown value.
 * @param options - Optional code override and extra fields.
 * @returns An AppError.
 *
 * @example
 * catch (error) { throw normalizeError(error, { code: "SERVICE_UNAVAILABLE" }); }
 */
export function normalizeError(value: unknown, options: NormalizeOptions = {}): AppError {
  if (isAppError(value) && options.code === undefined) return value;

  const message =
    value instanceof Error ? value.message : typeof value === "string" ? value : "An unexpected error occurred.";

  // An AppError with no code override returned above, so this line only ever sees a non-AppError.
  const code = options.code ?? "INTERNAL";
  const cause = value instanceof Error && !(value instanceof AppError) ? value : options.cause;

  return new AppError(code, message, {
    status: options.status ?? (isAppError(value) ? value.status : undefined),
    details: options.details ?? (isAppError(value) ? value.details : undefined),
    cause: options.cause ?? cause
  });
}

/**
 * Alias of {@link normalizeError}, for call sites that read better as `asError`.
 *
 * @param value - The thrown value.
 * @param options - Optional code override and extra fields.
 * @returns An AppError.
 */
export function asError(value: unknown, options: NormalizeOptions = {}): AppError {
  return normalizeError(value, options);
}

/**
 * Turns an error into a JSON-safe payload.
 *
 * A stack or a cause never reaches the payload unless `includeCause` is set, because both can carry
 * paths, hostnames or secrets.
 *
 * @param value - The thrown value.
 * @param options - Serialisation options.
 * @param options.includeCause - Include the cause message.
 * @param options.mask - Pattern whose matches are replaced in the message.
 * @param options.replacement - Replacement text, defaults to `[redacted]`.
 * @returns The payload.
 *
 * @example
 * JSON.stringify(serializeError(error));
 */
export function serializeError(value: unknown, options: SerializeOptions = {}): SerializedError {
  const error = normalizeError(value);
  const replacement = options.replacement ?? "[redacted]";

  const applyMask = (text: string) => (options.mask ? text.replace(options.mask, replacement) : text);

  const payload: SerializedError["error"] = {
    code: error.code,
    message: applyMask(error.message),
    status: error.status
  };

  if (Object.keys(error.details).length > 0) {
    payload.details = error.details;
  }

  if (options.includeCause && error.cause !== undefined) {
    const cause = error.cause;
    payload.cause = {
      message: applyMask(cause instanceof Error ? cause.message : String(cause)),
      ...(isAppError(cause) ? { code: cause.code } : {})
    };
  }

  return { error: payload };
}

/**
 * Builds an HTTP status, headers and body for an error.
 *
 * @param value - The thrown value.
 * @param options - Serialisation options, forwarded to {@link serializeError}.
 * @returns The response shape.
 *
 * @example
 * const { status, body } = errorToResponse(error);
 * response.status(status).json(body);
 */
export function errorToResponse(value: unknown, options: SerializeOptions = {}): ErrorResponse {
  const error = normalizeError(value);

  return {
    status: error.status,
    headers: { "content-type": "application/json" },
    body: serializeError(error, options)
  };
}

/**
 * Runs a function and returns a discriminated union instead of throwing.
 *
 * Works with both sync and async functions, so a caller can use one shape everywhere.
 *
 * @param operation - Function to run.
 * @returns `{ ok: true, value }` or `{ ok: false, error }`.
 *
 * @example
 * const result = toResult(() => JSON.parse(text));
 * if (!result.ok) return result.error;
 */
export function toResult<T>(operation: () => T | Promise<T>): Result<T> | Promise<Result<Awaited<T>>> {
  try {
    const value = operation();
    if (value instanceof Promise) {
      return value.then(
        (resolved) => ({ ok: true, value: resolved }) as Result<Awaited<T>>,
        (error: unknown) => ({ ok: false, error: normalizeError(error) })
      );
    }
    return { ok: true, value: value as T };
  } catch (error) {
    return { ok: false, error: normalizeError(error) };
  }
}

/**
 * Combines several errors into one, keeping each of them in the details.
 *
 * Useful when a request fails several independent checks and the caller wants one response.
 *
 * @param errors - Errors to combine.
 * @param message - Message for the combined error. Defaults to a count.
 * @returns An AppError whose `details.errors` holds each code and message.
 *
 * @example
 * throw aggregateErrors([badEmail, badPhone], "Validation failed.");
 */
export function aggregateErrors(errors: readonly unknown[], message?: string): AppError {
  const normalized = errors.map((error) => normalizeError(error));

  return new AppError(
    normalized[0]?.code ?? "INTERNAL",
    message ?? `${normalized.length} error${normalized.length === 1 ? "" : "s"} occurred.`,
    {
      details: {
        errors: normalized.map((error) => ({ code: error.code, message: error.message }))
      }
    }
  );
}