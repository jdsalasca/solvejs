export type EnvSource = Record<string, string | undefined>;

type StringOptions = {
  defaultValue?: string;
  trim?: boolean;
  allowEmpty?: boolean;
};

type NumberOptions = {
  defaultValue?: number;
  min?: number;
  max?: number;
  integer?: boolean;
};

type BooleanOptions = {
  defaultValue?: boolean;
};

type EnumOptions<T extends string> = {
  defaultValue?: T;
  caseInsensitive?: boolean;
};

type ArrayOptions = {
  defaultValue?: string[];
  separator?: string;
  trimItems?: boolean;
  allowEmptyItems?: boolean;
};

type JsonOptions<T> = {
  defaultValue?: T;
};

type UrlOptions = {
  defaultValue?: string;
  allowedProtocols?: string[];
  requireHostname?: boolean;
};

type DsnOptions = {
  defaultValue?: string;
  allowedProtocols?: string[];
  requireAuth?: boolean;
};

type ObjectOptions<T extends Record<string, unknown>> = {
  defaultValue?: T;
  validate?: (value: unknown) => value is T;
};

function readEnvRaw(name: string, env: EnvSource): string | undefined {
  return env[name];
}

function defaultEnvSource(): EnvSource {
  const globalLike = globalThis as { process?: { env?: EnvSource } };
  return globalLike.process?.env ?? {};
}

function normalizeProtocol(protocol: string): string {
  return protocol.endsWith(":") ? protocol.toLowerCase() : `${protocol.toLowerCase()}:`;
}

function readPresent(name: string, env: EnvSource): string | undefined {
  const raw = readEnvRaw(name, env);
  return raw === undefined || raw === null || raw.trim() === "" ? undefined : raw;
}

function missing(name: string): never {
  throw new Error(`Missing required environment variable: ${name}`);
}

function defaultValueOrThrow<T>(name: string, value: T | undefined): T {
  if (value !== undefined) return value;
  missing(name);
}

function resolveStringValue(raw: string, name: string, options: StringOptions): string {
  const trim = options.trim ?? true;
  const allowEmpty = options.allowEmpty ?? false;
  const value = trim ? raw.trim() : raw;
  if (!allowEmpty && value.length === 0) {
    throw new Error(`Environment variable ${name} cannot be empty.`);
  }
  return value;
}

function resolveArrayValue(raw: string, name: string, options: ArrayOptions): string[] {
  const { separator = ",", trimItems = true, allowEmptyItems = false } = options;
  const filtered = parseListItems(raw, separator, trimItems, allowEmptyItems);
  if (!allowEmptyItems && filtered.length === 0) {
    throw new Error(`Environment variable ${name} must contain at least one non-empty item.`);
  }
  return filtered;
}

function assertNumberBounds(name: string, value: number, options: NumberOptions): void {
  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${name} must be a valid number.`);
  }
  if (options.integer && !Number.isInteger(value)) {
    throw new Error(`Environment variable ${name} must be an integer.`);
  }
  if (options.min !== undefined && value < options.min) {
    throw new Error(`Environment variable ${name} must be greater than or equal to ${options.min}.`);
  }
  if (options.max !== undefined && value > options.max) {
    throw new Error(`Environment variable ${name} must be less than or equal to ${options.max}.`);
  }
}

function parseListItems(raw: string, separator: string, trimItems: boolean, allowEmptyItems: boolean): string[] {
  const parts = raw.split(separator).map((part) => (trimItems ? part.trim() : part));
  return allowEmptyItems ? parts : parts.filter((part) => part.length > 0);
}

function resolveUrlCandidate(name: string, env: EnvSource, defaultValue: string | undefined): string {
  const raw = readEnvRaw(name, env);
  const candidate = raw && raw.trim() ? raw.trim() : defaultValue;
  if (!candidate) missing(name);
  return candidate;
}

function assertAllowedProtocols(name: string, protocol: string, allowedProtocols: string[] | undefined): void {
  if (!allowedProtocols || allowedProtocols.length === 0) return;
  if (!allowedProtocols.includes(protocol.toLowerCase())) {
    throw new Error(`Environment variable ${name} must use one of: ${allowedProtocols.join(", ")}.`);
  }
}

/**
 * Reads a required string environment variable with optional defaults.
 *
 * @param name - Environment variable name.
 * @param env - Source object, defaults to `process.env`.
 * @param options - Parsing options.
 * @returns Parsed string value.
 */
export function getEnvString(name: string, env: EnvSource = defaultEnvSource(), options: StringOptions = {}): string {
  const raw = readEnvRaw(name, env);
  if (raw === undefined || raw === null) return defaultValueOrThrow(name, options.defaultValue);
  return resolveStringValue(raw, name, options);
}

/**
 * Reads and validates a numeric environment variable.
 *
 * @param name - Environment variable name.
 * @param env - Source object, defaults to `process.env`.
 * @param options - Numeric validation options.
 * @returns Parsed number.
 */
export function getEnvNumber(name: string, env: EnvSource = defaultEnvSource(), options: NumberOptions = {}): number {
  const raw = readPresent(name, env);
  if (raw === undefined) {
    if (options.defaultValue !== undefined) {
      assertNumberBounds(name, options.defaultValue, options);
      return options.defaultValue;
    }
    missing(name);
  }

  const value = Number(raw.trim());
  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${name} must be a valid number.`);
  }
  assertNumberBounds(name, value, options);

  return value;
}

/**
 * Reads and validates a boolean environment variable.
 *
 * @param name - Environment variable name.
 * @param env - Source object, defaults to `process.env`.
 * @param options - Boolean parsing options.
 * @returns Parsed boolean value.
 */
export function getEnvBoolean(name: string, env: EnvSource = defaultEnvSource(), options: BooleanOptions = {}): boolean {
  const raw = readPresent(name, env);
  if (raw === undefined) {
    if (options.defaultValue !== undefined) return options.defaultValue;
    missing(name);
  }

  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  throw new Error(`Environment variable ${name} must be a boolean-like value.`);
}

/**
 * Reads and validates an enum-like environment variable.
 *
 * @param name - Environment variable name.
 * @param allowedValues - Allowed literal values.
 * @param env - Source object, defaults to `process.env`.
 * @param options - Enum parsing options.
 * @returns Parsed enum value.
 */
export function getEnvEnum<T extends string>(
  name: string,
  allowedValues: readonly T[],
  env: EnvSource = defaultEnvSource(),
  options: EnumOptions<T> = {}
): T {
  const raw = readPresent(name, env);
  if (raw === undefined) {
    if (options.defaultValue !== undefined) return options.defaultValue;
    missing(name);
  }

  const candidate = raw.trim();
  if (options.caseInsensitive) {
    const match = allowedValues.find((value) => value.toLowerCase() === candidate.toLowerCase());
    if (match) return match;
  } else if (allowedValues.includes(candidate as T)) {
    return candidate as T;
  }

  throw new Error(`Environment variable ${name} must be one of: ${allowedValues.join(", ")}.`);
}

/**
 * Reads and parses a delimited environment variable into a string array.
 *
 * @param name - Environment variable name.
 * @param env - Source object, defaults to `process.env`.
 * @param options - Array parsing options.
 * @returns Parsed array of strings.
 */
export function getEnvArray(name: string, env: EnvSource = defaultEnvSource(), options: ArrayOptions = {}): string[] {
  const raw = readPresent(name, env);
  if (raw === undefined) return defaultValueOrThrow(name, options.defaultValue);
  return resolveArrayValue(raw, name, options);
}

/**
 * Reads and parses a JSON environment variable.
 *
 * @param name - Environment variable name.
 * @param env - Source object, defaults to `process.env`.
 * @param options - JSON parsing options.
 * @returns Parsed JSON value.
 */
export function getEnvJson<T>(name: string, env: EnvSource = defaultEnvSource(), options: JsonOptions<T> = {}): T {
  const raw = readPresent(name, env);
  if (raw === undefined) {
    if (options.defaultValue !== undefined) return options.defaultValue;
    missing(name);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`Environment variable ${name} must contain valid JSON.`);
  }
}

/**
 * Reads a JSON environment variable and ensures the parsed value is an object.
 *
 * @param name - Environment variable name.
 * @param env - Source object, defaults to `process.env`.
 * @param options - Object parsing options.
 * @param options.defaultValue - Fallback object when the variable is missing.
 * @param options.validate - Optional type guard for the parsed object shape.
 * @returns Parsed object value.
 */
export function getEnvObject<T extends Record<string, unknown>>(
  name: string,
  env: EnvSource = defaultEnvSource(),
  options: ObjectOptions<T> = {}
): T {
  const value = getEnvJson<unknown>(name, env, { defaultValue: options.defaultValue });
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Environment variable ${name} must contain a JSON object.`);
  }
  if (options.validate && !options.validate(value)) {
    throw new Error(`Environment variable ${name} does not match the expected object shape.`);
  }
  return value as T;
}

/**
 * Reads and validates a URL environment variable.
 *
 * @param name - Environment variable name.
 * @param env - Source object, defaults to `process.env`.
 * @param options - URL parsing options.
 * @returns Parsed URL instance.
 */
export function getEnvUrl(name: string, env: EnvSource = defaultEnvSource(), options: UrlOptions = {}): URL {
  const candidate = resolveUrlCandidate(name, env, options.defaultValue);

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`Environment variable ${name} must be a valid URL.`);
  }

  const allowedProtocols = options.allowedProtocols?.map(normalizeProtocol);
  assertAllowedProtocols(name, parsed.protocol, allowedProtocols);

  if ((options.requireHostname ?? true) && !parsed.hostname) {
    throw new Error(`Environment variable ${name} must include a hostname.`);
  }

  return parsed;
}

/**
 * Reads and validates a DSN-style environment variable.
 *
 * @param name - Environment variable name.
 * @param env - Source object, defaults to `process.env`.
 * @param options - DSN parsing options.
 * @returns Parsed DSN as URL instance.
 */
export function getEnvDsn(name: string, env: EnvSource = defaultEnvSource(), options: DsnOptions = {}): URL {
  const allowedProtocols = options.allowedProtocols ?? [
    "postgres",
    "postgresql",
    "mysql",
    "mariadb",
    "mongodb",
    "redis",
    "amqp"
  ];
  const parsed = getEnvUrl(name, env, {
    defaultValue: options.defaultValue,
    allowedProtocols,
    requireHostname: true
  });

  if (options.requireAuth && (!parsed.username || !parsed.password)) {
    throw new Error(`Environment variable ${name} must include username and password.`);
  }

  return parsed;
}

/**
 * Returns missing required environment variable names.
 *
 * @param names - Required variable names.
 * @param env - Source object, defaults to `process.env`.
 * @returns Missing variable names.
 */
export function validateRequiredEnv(names: readonly string[], env: EnvSource = defaultEnvSource()): string[] {
  return names.filter((name) => {
    const value = readEnvRaw(name, env);
    return value === undefined || value === null || value.trim() === "";
  });
}
