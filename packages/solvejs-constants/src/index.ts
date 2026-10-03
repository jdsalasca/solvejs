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

export const FILE_SIZE_BYTES = {
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024
} as const;

export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE"
} as const;

export const COMMON_HTTP_HEADERS = {
  CONTENT_TYPE: "content-type",
  AUTHORIZATION: "authorization",
  ACCEPT: "accept",
  USER_AGENT: "user-agent"
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

export const CONTENT_TYPES = {
  JSON: "application/json",
  FORM_URLENCODED: "application/x-www-form-urlencoded",
  MULTIPART_FORM_DATA: "multipart/form-data",
  TEXT: "text/plain",
  HTML: "text/html"
} as const;

/**
 * Parses common boolean-like text into a boolean value.
 *
 * @param value - Boolean-like input text.
 * @returns Parsed boolean value.
 * @throws {TypeError} If the input value is not recognized.
 */
export function parseBooleanString(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  if ((BOOLEAN_STRINGS.TRUE_VALUES as readonly string[]).includes(normalized)) {
    return true;
  }

  if ((BOOLEAN_STRINGS.FALSE_VALUES as readonly string[]).includes(normalized)) {
    return false;
  }

  throw new TypeError(`Unsupported boolean string value: ${value}`);
}
