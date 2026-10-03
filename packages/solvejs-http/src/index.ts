/** Stable HTTP error codes. */
export type HttpErrorCode =
  | "HTTP_INVALID_STATUS"
  | "HTTP_INVALID_ATTEMPT"
  | "HTTP_INVALID_OPTION"
  | "HTTP_INVALID_ACCEPT"
  | "HTTP_INVALID_LIST";

/**
 * Error thrown by the HTTP utilities.
 *
 * Carries a stable machine-readable `code` and a `details` context object.
 */
export class HttpError extends Error {
  readonly code: HttpErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: HttpErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "HttpError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

function fail(code: HttpErrorCode, message: string, details: Record<string, unknown> = {}): never {
  throw new HttpError(code, message, details);
}

function isStatus(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599;
}

/** The reason phrases from the IANA registry, for the codes an application actually meets. */
const STATUS_TEXT: Record<number, string> = {
  100: "Continue",
  101: "Switching Protocols",
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
  206: "Partial Content",
  301: "Moved Permanently",
  302: "Found",
  304: "Not Modified",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  412: "Precondition Failed",
  413: "Payload Too Large",
  415: "Unsupported Media Type",
  422: "Unprocessable Entity",
  425: "Too Early",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  451: "Unavailable For Legal Reasons",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  507: "Insufficient Storage",
  511: "Network Authentication Required"
};

const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE", "PUT", "DELETE"]);

/** Statuses worth retrying: the request may succeed unchanged a moment later. */
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

/** Transport-level failures that a retry can plausibly fix. */
const RETRYABLE_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EAI_AGAIN", "EPIPE"]);

/** Options for {@link calculateBackoffDelay}. */
export type BackoffOptions = {
  /** Delay for the first retry, in milliseconds. */
  baseMs: number;
  /** Growth per attempt. Must be greater than 1. */
  factor: number;
  /** Upper bound for the delay. Must be greater than `baseMs`. */
  maxMs: number;
  /** Randomise the delay into the half-to-full band. Defaults to `true`. */
  jitter?: boolean;
};

/**
 * Returns the standard reason phrase for a status code.
 *
 * @param status - HTTP status code.
 * @returns The reason phrase, or an empty string for a code the registry does not define.
 *
 * @example
 * getStatusText(404); // "Not Found"
 */
export function getStatusText(status: number): string {
  return isStatus(status) ? (STATUS_TEXT[status] ?? "") : "";
}

/**
 * Reports whether an HTTP method is idempotent.
 *
 * Input is not trimmed, so a padded method is reported as unknown rather than guessed.
 *
 * @param method - HTTP method, any case.
 * @returns `true` for GET, HEAD, OPTIONS, TRACE, PUT and DELETE.
 *
 * @example
 * isIdempotentMethod("put"); // true
 */
export function isIdempotentMethod(method: string): boolean {
  return typeof method === "string" && IDEMPOTENT_METHODS.has(method.toUpperCase());
}

/**
 * Reports whether a status code is worth retrying.
 *
 * @param status - HTTP status code.
 * @returns `true` for 408, 425, 429, 5xx and the gateway statuses.
 */
export function isRetryableStatus(status: number): boolean {
  return isStatus(status) && RETRYABLE_STATUSES.has(status);
}

/**
 * Classifies a thrown value as a transport failure worth retrying.
 *
 * An explicit `status` on the value wins over its error code, so an error that carries both is judged
 * by the status. A bare `TypeError` from `fetch` counts as retryable, because that is how Node reports
 * a connection failure.
 *
 * @param value - The thrown value.
 * @returns `true` when a retry could plausibly succeed.
 *
 * @example
 * if (isRetryableError(error) && attempt < 3) retry();
 */
export function isRetryableError(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;

  const candidate = value as { name?: unknown; code?: unknown; status?: unknown; message?: unknown };

  if (isStatus(candidate.status)) return isRetryableStatus(candidate.status);
  if (candidate.name === "AbortError") return true;
  if (typeof candidate.code === "string" && RETRYABLE_CODES.has(candidate.code)) return true;

  // Node's fetch reports a connection failure as a plain TypeError.
  if (value instanceof TypeError && typeof candidate.message === "string" && /fetch failed/i.test(candidate.message)) {
    return true;
  }

  return false;
}

/**
 * Calculates an exponential backoff delay, optionally jittered.
 *
 * With `jitter` on, the delay lands uniformly in the half-to-full band of the nominal value, which
 * spreads a thundering herd without ever exceeding the nominal delay.
 *
 * @param attempt - Zero-based attempt index.
 * @param options - Backoff options.
 * @param options.baseMs - Delay for the first retry.
 * @param options.factor - Growth per attempt, greater than 1.
 * @param options.maxMs - Upper bound, greater than `baseMs`.
 * @param options.jitter - Randomise the delay. Defaults to `true`.
 * @returns The delay in whole milliseconds.
 * @throws {HttpError} `HTTP_INVALID_ATTEMPT` or `HTTP_INVALID_OPTION`.
 *
 * @example
 * await sleep(calculateBackoffDelay(attempt, { baseMs: 100, factor: 2, maxMs: 30_000 }));
 */
export function calculateBackoffDelay(attempt: number, options: BackoffOptions): number {
  if (!Number.isInteger(attempt) || attempt < 0) {
    fail("HTTP_INVALID_ATTEMPT", "Expected attempt to be a non-negative integer.", { received: attempt });
  }
  if (options === null || typeof options !== "object") {
    fail("HTTP_INVALID_OPTION", "Expected backoff options.", { received: options });
  }

  const { baseMs, factor, maxMs, jitter = true } = options;

  for (const [name, value] of Object.entries({ baseMs, factor, maxMs })) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      fail("HTTP_INVALID_OPTION", `Expected ${name} to be a finite number.`, { [name]: value });
    }
  }
  if (baseMs <= 0) {
    fail("HTTP_INVALID_OPTION", "Expected baseMs to be greater than zero.", { baseMs });
  }
  if (factor <= 1) {
    fail("HTTP_INVALID_OPTION", "Expected factor to be greater than 1.", { factor });
  }
  if (maxMs < baseMs) {
    fail("HTTP_INVALID_OPTION", "Expected maxMs to be greater than or equal to baseMs.", { baseMs, maxMs });
  }
  if (typeof jitter !== "boolean") {
    fail("HTTP_INVALID_OPTION", "Expected jitter to be a boolean.", { jitter });
  }

  const nominal = Math.min(maxMs, baseMs * factor ** attempt);
  const delay = jitter ? nominal / 2 + Math.random() * (nominal / 2) : nominal;

  return Math.min(maxMs, Math.round(delay));
}

/**
 * Lowercases and trims a header name.
 *
 * @param name - Header name.
 * @returns The lowercase name, or an empty string for a non-string input.
 *
 * @example
 * normalizeHeaderName("Content-Type"); // "content-type"
 */
export function normalizeHeaderName(name: string): string {
  return typeof name === "string" ? name.trim().toLowerCase() : "";
}

/** A parsed media type. */
export type ParsedContentType = {
  type: string;
  subtype: string;
  charset?: string;
  parameters: Record<string, string>;
};

/**
 * Parses a `Content-Type` header.
 *
 * @param header - Header value.
 * @returns The parsed media type, or `null` when the value is not a media type.
 *
 * @example
 * parseContentType("application/json; charset=utf-8");
 * // { type: "application/json", subtype: "json", charset: "utf-8", parameters: { charset: "utf-8" } }
 */
export function parseContentType(header: string): ParsedContentType | null {
  if (typeof header !== "string" || header.trim() === "") return null;

  const [rawType, ...rawParameters] = header.split(";");
  const [type, subtype, ...extra] = rawType.trim().toLowerCase().split("/");
  if (!type || !subtype || extra.length > 0) return null;

  const parameters: Record<string, string> = {};
  for (const parameter of rawParameters) {
    const separator = parameter.indexOf("=");
    if (separator === -1) continue;
    const key = parameter.slice(0, separator).trim().toLowerCase();
    const value = parameter.slice(separator + 1).trim().replace(/^"(.*)"$/, "$1");
    if (key) parameters[key] = value;
  }

  return {
    type: `${type}/${subtype}`,
    subtype,
    ...(parameters.charset ? { charset: parameters.charset.toLowerCase() } : {}),
    parameters
  };
}

/** A request's `Accept` header. */
export type AcceptOptions = {
  /** Raw `Accept` header value. */
  accept?: string;
};

/**
 * Picks the media type the client prefers from the ones the server can produce.
 *
 * Honours quality values, a subtype wildcard such as `application/` plus `*`, and the fully
 * permissive wildcard. Ties keep the server's order, which is how a server expresses its own
 * preference. A missing or empty `Accept` means anything goes.
 *
 * @param available - Media types the server can return, in preference order.
 * @param options - Request options.
 * @param options.accept - Raw `Accept` header.
 * @returns The chosen media type, or `null` when nothing matches.
 * @throws {HttpError} `HTTP_INVALID_LIST` or `HTTP_INVALID_ACCEPT`.
 *
 * @example
 * negotiateContentType(["application/json"], { accept: "text/html,application/json;q=0.9" });
 * // "application/json"
 */
export function negotiateContentType(
  available: readonly string[],
  options: AcceptOptions | null = {}
): string | null {
  if (!Array.isArray(available)) {
    fail("HTTP_INVALID_LIST", "Expected available to be an array of media types.", { received: typeof available });
  }
  if (available.length === 0) return null;
  if (options !== null && options !== undefined && typeof options.accept !== "string" && options.accept !== undefined) {
    fail("HTTP_INVALID_ACCEPT", "Expected accept to be a string.", { received: typeof options.accept });
  }

  const raw = (options?.accept ?? "").trim();
  if (raw === "") return available[0] ?? null;

  const ranges = raw.split(",").map((part) => {
    const [value, ...parameters] = part.split(";");
    const quality = parameters
      .map((parameter) => parameter.trim())
      .find((parameter) => parameter.startsWith("q="));
    const parsedQuality = quality ? Number.parseFloat(quality.slice(2)) : 1;
    return { media: value.trim().toLowerCase(), quality: Number.isFinite(parsedQuality) ? parsedQuality : 0 };
  });

  let best: { media: string; quality: number; index: number } | undefined;

  available.forEach((candidate, index) => {
    const media = candidate.toLowerCase();

    for (const range of ranges) {
      if (range.quality <= 0) continue;

      const matches =
        range.media === "*/*" ||
        range.media === media ||
        (range.media.endsWith("/*") && media.startsWith(`${range.media.slice(0, -1)}`));
      if (!matches) continue;

      // A higher quality wins; an exact match beats a wildcard; the server order breaks a tie.
      const exactness = range.media === media ? 1 : 0;
      const score = range.quality * 10 + exactness;
      if (!best || score > best.quality) best = { media: candidate, quality: score, index };
      break;
    }
  });

  return best?.media ?? null;
}