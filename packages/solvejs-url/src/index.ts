/** A value that can appear in a query string. `null` and `undefined` are dropped. */
export type QueryValue = string | number | boolean | null | undefined;

/** A query object. An array value repeats the key once per entry. */
export type QueryInput = Record<string, QueryValue | QueryValue[]>;

/** Options for {@link replacePathParam}. */
export type ReplacePathParamOptions = {
  required?: boolean;
};

const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Error thrown by the URL utilities.
 *
 * Carries a stable machine-readable `code` and a `details` context object so
 * callers can map failures without matching on message text.
 */
export class UrlError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "UrlError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, UrlError.prototype);
  }
}

function assertAbsoluteUrl(value: string, field: string): URL {
  if (typeof value !== "string" || !ABSOLUTE_URL.test(value)) {
    throw new UrlError("URL_NOT_ABSOLUTE", `Expected ${field} to be an absolute URL with a scheme.`, {
      field,
      received: value
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new UrlError("URL_INVALID_BASE", `Expected ${field} to be a parseable URL.`, { field, received: value });
  }

  if (!parsed.host) {
    throw new UrlError("URL_INVALID_BASE", `Expected ${field} to include a host.`, { field, received: value });
  }

  return parsed;
}

/**
 * Serialises a query object into a query string with alphabetically sorted keys.
 *
 * Sorting makes the output deterministic, which is what makes it safe to use as
 * a cache key or to compare two URLs for equality.
 *
 * @param query - Values to serialise.
 * @returns Query string without a leading `?`, or an empty string.
 */
export function stringifyQuery(query: QueryInput): string {
  const params = new URLSearchParams();

  for (const key of Object.keys(query).sort()) {
    const value = query[key];
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry === null || entry === undefined) continue;
        params.append(key, String(entry));
      }
      continue;
    }

    params.append(key, String(value));
  }

  return params.toString();
}

/**
 * Parses a query string into a plain object.
 *
 * Repeated keys collapse into an array in first-seen order, `+` decodes to a
 * space, and malformed percent-encoding is left as-is instead of throwing.
 *
 * @param search - Query string, with or without a leading `?`.
 * @returns Decoded key/value pairs.
 */
export function parseQuery(search: string): Record<string, string | string[]> {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const result: Record<string, string | string[]> = {};

  for (const [key, value] of params) {
    const existing = result[key];
    if (existing === undefined) {
      result[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      result[key] = [existing, value];
    }
  }

  return result;
}

/**
 * Joins URL segments with exactly one slash between them.
 *
 * @param segments - Base URL followed by path segments.
 * @returns Joined URL with a single trailing slash when the base is alone.
 */
export function joinUrl(...segments: string[]): string {
  const [base, ...rest] = segments;
  if (base === undefined) return "";
  if (rest.length === 0) return `${base.replace(/\/+$/, "")}/`;

  const tail = rest
    .filter((segment) => segment !== "")
    .join("/")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+/, "");

  return `${base.replace(/\/+$/, "")}/${tail}`;
}

/**
 * Builds a URL from a base plus optional path, query, and fragment.
 *
 * @param base - Absolute base URL.
 * @param options - URL components to append.
 * @param options.path - Path appended to the base.
 * @param options.query - Query values.
 * @param options.hash - Fragment, appended without a leading `#`.
 * @returns The built URL.
 * @throws {UrlError} `URL_NOT_ABSOLUTE` if the base has no scheme, `URL_INVALID_BASE` if it has no host.
 */
export function buildUrl(
  base: string,
  options: { path?: string; query?: QueryInput; hash?: string } = {}
): string {
  const parsed = assertAbsoluteUrl(base, "base");
  parsed.hash = "";

  if (options.path !== undefined && options.path !== "") {
    parsed.pathname = joinUrl(parsed.pathname, options.path);
  }

  const query = stringifyQuery(options.query ?? {});
  parsed.search = query === "" ? "" : `?${query}`;

  if (options.hash) {
    parsed.hash = options.hash.startsWith("#") ? options.hash : `#${options.hash}`;
  }

  return parsed.toString();
}

/**
 * Merges query values into an existing URL, replacing keys that are supplied.
 *
 * @param url - Absolute URL, optionally already carrying a query and fragment.
 * @param query - Query values to merge in.
 * @returns The URL with the merged query.
 * @throws {UrlError} `URL_NOT_ABSOLUTE` if the URL has no scheme, `URL_INVALID_BASE` if it has no host.
 */
export function withQuery(url: string, query: QueryInput): string {
  const parsed = assertAbsoluteUrl(url, "url");
  const merged: QueryInput = { ...parseQuery(parsed.search), ...query };
  const serialized = stringifyQuery(merged);

  parsed.search = serialized === "" ? "" : `?${serialized}`;
  return parsed.toString();
}

/**
 * Removes named query keys from a URL.
 *
 * @param url - Absolute URL.
 * @param names - Keys to remove.
 * @returns The URL without those keys.
 * @throws {UrlError} `URL_NOT_ABSOLUTE` if the URL has no scheme, `URL_INVALID_BASE` if it has no host.
 */
export function omitQuery(url: string, names: string[]): string {
  const parsed = assertAbsoluteUrl(url, "url");
  const remove = new Set(names);

  for (const key of Object.keys(parseQuery(parsed.search))) {
    if (remove.has(key)) parsed.searchParams.delete(key);
  }

  parsed.search = parsed.searchParams.toString() === "" ? "" : `?${parsed.searchParams.toString()}`;
  return parsed.toString();
}

/**
 * Reads a single query value from a URL.
 *
 * @param url - Absolute or relative URL.
 * @param name - Query key.
 * @returns The decoded value, or `null` when the key is absent.
 */
export function getUrlParam(url: string, name: string): string | null {
  const search = url.includes("?") ? url.slice(url.indexOf("?") + 1).split("#")[0] : "";
  const value = new URLSearchParams(search).get(name);
  return value === null ? null : value;
}

/**
 * Replaces a `:name` placeholder in a path template.
 *
 * @param path - Path template such as `/users/:id`.
 * @param name - Placeholder name without the leading colon.
 * @param value - Replacement value, percent-encoded before insertion.
 * @param options - Replacement options.
 * @param options.required - Throw `URL_PATH_PARAM_MISSING` instead of returning the path unchanged.
 * @returns The path with the placeholder replaced.
 * @throws {UrlError} `URL_PATH_PARAM_MISSING` when the placeholder is absent and `required` is set.
 */
export function replacePathParam(
  path: string,
  name: string,
  value: string,
  options: ReplacePathParamOptions = {}
): string {
  const token = `:${name}`;
  if (!path.includes(token)) {
    if (options.required) {
      throw new UrlError("URL_PATH_PARAM_MISSING", `Path does not contain the parameter ${token}.`, {
        name,
        received: path
      });
    }
    return path;
  }

  return path.replace(token, encodeURIComponent(value));
}
