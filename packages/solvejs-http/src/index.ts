/** Stable HTTP error codes. */
export type HttpErrorCode =
  | "HTTP_INVALID_STATUS"
  | "HTTP_INVALID_ATTEMPT"
  | "HTTP_INVALID_OPTION"
  | "HTTP_INVALID_ACCEPT"
  | "HTTP_INVALID_LIST"
  | "HTTP_REQUEST_FAILED"
  | "HTTP_TIMEOUT"
  | "HTTP_INVALID_RESPONSE";

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

function isFetchConnectionFailure(value: unknown, message: unknown): boolean {
  return value instanceof TypeError && typeof message === "string" && /fetch failed/i.test(message);
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
  return isFetchConnectionFailure(value, candidate.message);
}

function assertFiniteOptions(values: Record<string, number>): void {
  for (const [name, value] of Object.entries(values)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      fail("HTTP_INVALID_OPTION", `Expected ${name} to be a finite number.`, { [name]: value });
    }
  }
}

function assertBackoffBounds(baseMs: number, factor: number, maxMs: number): void {
  if (baseMs <= 0) {
    fail("HTTP_INVALID_OPTION", "Expected baseMs to be greater than zero.", { baseMs });
  }
  if (factor <= 1) {
    fail("HTTP_INVALID_OPTION", "Expected factor to be greater than 1.", { factor });
  }
  if (maxMs < baseMs) {
    fail("HTTP_INVALID_OPTION", "Expected maxMs to be greater than or equal to baseMs.", { baseMs, maxMs });
  }
}

function validateBackoff(options: BackoffOptions): {
  baseMs: number;
  factor: number;
  maxMs: number;
  jitter: boolean;
} {
  if (options === null || typeof options !== "object") {
    fail("HTTP_INVALID_OPTION", "Expected backoff options.", { received: options });
  }

  const { baseMs, factor, maxMs, jitter = true } = options;
  assertFiniteOptions({ baseMs, factor, maxMs });
  assertBackoffBounds(baseMs, factor, maxMs);
  if (typeof jitter !== "boolean") {
    fail("HTTP_INVALID_OPTION", "Expected jitter to be a boolean.", { jitter });
  }

  return { baseMs, factor, maxMs, jitter };
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

  const { baseMs, factor, maxMs, jitter } = validateBackoff(options);
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

function parseContentParameters(rawParameters: readonly string[]): Record<string, string> {
  const parameters: Record<string, string> = {};
  for (const parameter of rawParameters) {
    const separator = parameter.indexOf("=");
    if (separator === -1) continue;
    const key = parameter.slice(0, separator).trim().toLowerCase();
    const value = parameter.slice(separator + 1).trim().replace(/^"(.*)"$/, "$1");
    if (key) parameters[key] = value;
  }
  return parameters;
}

function splitHeaderParts(header: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quoted = false;
  let escaped = false;
  for (const character of header) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === "\\" && quoted) {
      current += character;
      escaped = true;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      current += character;
      continue;
    }
    if (character === ";" && !quoted) {
      parts.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  parts.push(current);
  return parts;
}

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

  const [rawType, ...rawParameters] = splitHeaderParts(header);
  const [type, subtype, ...extra] = rawType.trim().toLowerCase().split("/");
  if (!type || !subtype || extra.length > 0) return null;

  const parameters = parseContentParameters(rawParameters);

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

type AcceptRange = { media: string; quality: number };
type ScoredCandidate = { media: string; quality: number; index: number };

function parseAcceptRange(part: string): AcceptRange {
  const [value, ...parameters] = part.split(";");
  const quality = parameters.map((parameter) => parameter.trim()).find((parameter) => parameter.startsWith("q="));
  const parsedQuality = quality ? Number.parseFloat(quality.slice(2)) : 1;
  return { media: value.trim().toLowerCase(), quality: Number.isFinite(parsedQuality) ? parsedQuality : 0 };
}

function parseAcceptRanges(raw: string): AcceptRange[] {
  return raw.split(",").map(parseAcceptRange);
}

function matchesRange(range: AcceptRange, media: string): boolean {
  if (range.media === "*/*") return true;
  if (range.media === media) return true;
  return range.media.endsWith("/*") && media.startsWith(range.media.slice(0, -1));
}

function scoreMedia(candidate: string, index: number, ranges: readonly AcceptRange[]): ScoredCandidate | undefined {
  const media = candidate.toLowerCase();
  for (const range of ranges) {
    if (range.quality <= 0) continue;
    if (!matchesRange(range, media)) continue;
    // A higher quality wins; an exact match beats a wildcard; the server order breaks a tie.
    const exactness = range.media === media ? 1 : 0;
    return { media: candidate, quality: range.quality * 10 + exactness, index };
  }
  return undefined;
}

function bestCandidate(available: readonly string[], ranges: readonly AcceptRange[]): ScoredCandidate | undefined {
  let best: ScoredCandidate | undefined;
  for (const [index, candidate] of available.entries()) {
    const scored = scoreMedia(candidate, index, ranges);
    if (scored && (!best || scored.quality > best.quality)) best = scored;
  }
  return best;
}

function assertAcceptOptions(options: AcceptOptions | null | undefined): void {
  if (options === null || options === undefined) return;
  if (typeof options.accept === "string" || options.accept === undefined) return;
  fail("HTTP_INVALID_ACCEPT", "Expected accept to be a string.", { received: typeof options.accept });
}

function resolveAccept(available: readonly string[], options: AcceptOptions | null | undefined) {
  if (!Array.isArray(available)) {
    fail("HTTP_INVALID_LIST", "Expected available to be an array of media types.", { received: typeof available });
  }
  if (available.length === 0) return { available, raw: "" };
  assertAcceptOptions(options);
  return { available, raw: (options?.accept ?? "").trim() };
}

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
  const resolved = resolveAccept(available, options);
  if (resolved.raw === "") return resolved.available[0] ?? null;

  const ranges = parseAcceptRanges(resolved.raw);
  return bestCandidate(resolved.available, ranges)?.media ?? null;
}

/** Options for {@link fetchJson}. */
export type FetchJsonOptions = {
  /** HTTP method. Defaults to `GET`, or `POST` when a body is present. */
  method?: string;
  /** Request headers. */
  headers?: Record<string, string>;
  /** JSON body, or a raw `BodyInit` value such as `FormData`, `Blob`, `URLSearchParams` or text. */
  body?: unknown;
  /** Abort the request after this many milliseconds. Defaults to 30000; `0` disables it. */
  timeoutMs?: number;
  /** Caller abort signal. */
  signal?: AbortSignal;
  /** Fetch credentials mode. */
  credentials?: RequestCredentials;
};

/** A parsed JSON response with the transport metadata callers usually log. */
export type FetchJsonResult<T> = {
  data: T;
  status: number;
  headers: Headers;
  url: string;
};

const BODY_TAGS = new Set([
  "[object Blob]",
  "[object FormData]",
  "[object URLSearchParams]",
  "[object ArrayBuffer]",
  "[object ReadableStream]"
]);

function isRawBody(value: unknown): boolean {
  if (typeof value === "string") return true;
  if (value === null || typeof value !== "object") return false;
  return BODY_TAGS.has(Object.prototype.toString.call(value)) || ArrayBuffer.isView(value as ArrayBufferView);
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const target = name.toLowerCase();
  return Object.keys(headers).some((header) => header.toLowerCase() === target);
}

function requestBody(body: unknown, headers: Record<string, string>): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (isRawBody(body)) return body as BodyInit;
  const text = JSON.stringify(body);
  if (text === undefined) {
    fail("HTTP_INVALID_OPTION", "Expected the request body to be JSON-serialisable.", { received: typeof body });
  }
  if (!hasHeader(headers, "content-type")) headers["Content-Type"] = "application/json";
  return text;
}

function timeoutOf(value: number | undefined): number {
  const timeoutMs = value ?? 30_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    fail("HTTP_INVALID_OPTION", "Expected timeoutMs to be a non-negative finite number.", { timeoutMs });
  }
  return timeoutMs;
}

async function errorBody(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 8_192);
  } catch {
    return "";
  }
}

/**
 * Performs a `fetch` request and parses the response as JSON.
 *
 * JSON bodies are serialised and given a `Content-Type: application/json` header. Non-2xx
 * responses throw `HttpError` with the status and a bounded response body in `details`.
 * A timeout aborts the request with `HTTP_TIMEOUT`; malformed JSON is `HTTP_INVALID_RESPONSE`.
 *
 * @param input - Absolute URL or `URL` object.
 * @param options - Request options.
 * @returns Parsed data plus status, headers and final URL.
 * @throws {HttpError} `HTTP_REQUEST_FAILED`, `HTTP_TIMEOUT`, `HTTP_INVALID_RESPONSE` or `HTTP_INVALID_OPTION`.
 *
 * @example
 * const { data } = await fetchJson<{ id: string }>("https://api.example.com/users/1");
 *
 * @example
 * await fetchJson("https://api.example.com/users", {
 *   method: "POST",
 *   body: { name: "Ada" },
 *   timeoutMs: 5000
 * });
 */
export async function fetchJson<T = unknown>(
  input: string | URL,
  options: FetchJsonOptions = {}
): Promise<FetchJsonResult<T>> {
  const prepared = prepareRequest(options);
  const { response, context } = await sendRequest(input, prepared, timeoutOf(options.timeoutMs), options.signal);
  try {
    return await parseJsonResponse<T>(response, String(input), context);
  } finally {
    context.cleanup();
  }
}

type RequestContext = {
  timeoutMs: number;
  external: AbortSignal | undefined;
  timedOut: () => boolean;
  cleanup: () => void;
};

type ActiveResponse = { response: Response; context: RequestContext };

type PreparedRequest = {
  method: string;
  headers: Record<string, string>;
  body: BodyInit | undefined;
  credentials?: RequestCredentials;
};

function prepareRequest(options: FetchJsonOptions): PreparedRequest {
  const headers = { ...(options.headers ?? {}) };
  const body = requestBody(options.body, headers);
  if (!hasHeader(headers, "accept")) headers.Accept = "application/json";
  return {
    method: options.method ?? (body === undefined ? "GET" : "POST"),
    headers,
    body,
    ...(options.credentials === undefined ? {} : { credentials: options.credentials })
  };
}

// eslint-disable-next-line max-lines-per-function -- timer, abort listener and fetch lifecycle
async function sendRequest(
  input: string | URL,
  prepared: PreparedRequest,
  timeoutMs: number,
  external: AbortSignal | undefined
): Promise<ActiveResponse> {
  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const forwardAbort = () => controller.abort(external?.reason);
  const cleanup = () => {
    if (timer !== undefined) clearTimeout(timer);
    external?.removeEventListener("abort", forwardAbort);
  };
  const context: RequestContext = { timeoutMs, external, timedOut: () => timedOut, cleanup };

  if (external) {
    if (external.aborted) forwardAbort();
    else external.addEventListener("abort", forwardAbort, { once: true });
  }
  if (timeoutMs > 0) {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  }

  try {
    const response = await fetch(input, {
      method: prepared.method,
      headers: prepared.headers,
      body: prepared.body,
      signal: controller.signal,
      ...(prepared.credentials === undefined ? {} : { credentials: prepared.credentials })
    });
    return { response, context };
  } catch (error) {
    cleanup();
    if (timedOut) return fail("HTTP_TIMEOUT", `Request timed out after ${timeoutMs} ms.`, { timeoutMs, url: String(input) });
    return fail("HTTP_REQUEST_FAILED", "Request failed before a response was received.", {
      url: String(input),
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

function failBodyRead(error: unknown, url: string, status: number, context: RequestContext): never {
  if (context.timedOut()) {
    return fail("HTTP_TIMEOUT", `Response body timed out after ${context.timeoutMs} ms.`, {
      timeoutMs: context.timeoutMs,
      url,
      status
    });
  }
  if (context.external?.aborted) {
    return fail("HTTP_REQUEST_FAILED", "Request was aborted while reading the response.", {
      url,
      status,
      aborted: true,
      cause: error instanceof Error ? error.message : String(error)
    });
  }
  return fail("HTTP_REQUEST_FAILED", "Response body could not be read.", {
    url,
    status,
    cause: error instanceof Error ? error.message : String(error)
  });
}

async function readBody(response: Response, url: string, context: RequestContext): Promise<string> {
  try {
    return await response.text();
  } catch (error) {
    return failBodyRead(error, url, response.status, context);
  }
}

// eslint-disable-next-line complexity -- status, timeout and abort mapping
async function parseJsonResponse<T>(
  response: Response,
  input: string,
  context: RequestContext
): Promise<FetchJsonResult<T>> {
  const url = response.url || input;
  if (!response.ok) {
    const details = { status: response.status, url, body: await errorBody(response) };
    if (context.timedOut()) {
      fail("HTTP_TIMEOUT", `Response body timed out after ${context.timeoutMs} ms.`, {
        timeoutMs: context.timeoutMs,
        url,
        status: response.status
      });
    }
    if (context.external?.aborted) {
      fail("HTTP_REQUEST_FAILED", "Request was aborted while reading the response.", {
        url,
        status: response.status,
        aborted: true
      });
    }
    fail("HTTP_REQUEST_FAILED", `Request failed with ${response.status} ${response.statusText}.`.trim(), details);
  }
  const text = await readBody(response, url, context);
  if (text.trim().length === 0) {
    return { data: undefined as T, status: response.status, headers: response.headers, url };
  }
  try {
    return { data: JSON.parse(text) as T, status: response.status, headers: response.headers, url };
  } catch (error) {
    fail("HTTP_INVALID_RESPONSE", "Expected the response body to be valid JSON.", {
      status: response.status,
      url,
      body: text.slice(0, 8_192),
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}