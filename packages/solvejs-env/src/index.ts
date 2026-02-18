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

function readEnvRaw(name: string, env: EnvSource): string | undefined {
  return env[name];
}

function defaultEnvSource(): EnvSource {
  const globalLike = globalThis as { process?: { env?: EnvSource } };
  return globalLike.process?.env ?? {};
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
  const trim = options.trim ?? true;
  const allowEmpty = options.allowEmpty ?? false;
  const raw = readEnvRaw(name, env);

  if (raw === undefined || raw === null) {
    if (options.defaultValue !== undefined) {
      return options.defaultValue;
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }

  const value = trim ? raw.trim() : raw;
  if (!allowEmpty && value.length === 0) {
    throw new Error(`Environment variable ${name} cannot be empty.`);
  }

  return value;
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
  const raw = readEnvRaw(name, env);
  if (raw === undefined || raw === null || raw.trim() === "") {
    if (options.defaultValue !== undefined) {
      return options.defaultValue;
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }

  const value = Number(raw.trim());
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
  const raw = readEnvRaw(name, env);
  if (raw === undefined || raw === null || raw.trim() === "") {
    if (options.defaultValue !== undefined) {
      return options.defaultValue;
    }
    throw new Error(`Missing required environment variable: ${name}`);
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
  const raw = readEnvRaw(name, env);
  if (raw === undefined || raw === null || raw.trim() === "") {
    if (options.defaultValue !== undefined) {
      return options.defaultValue;
    }
    throw new Error(`Missing required environment variable: ${name}`);
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
  const raw = readEnvRaw(name, env);
  if (raw === undefined || raw === null || raw.trim() === "") {
    if (options.defaultValue !== undefined) {
      return options.defaultValue;
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }

  const separator = options.separator ?? ",";
  const trimItems = options.trimItems ?? true;
  const allowEmptyItems = options.allowEmptyItems ?? false;

  const parts = raw.split(separator).map((part) => (trimItems ? part.trim() : part));
  const filtered = allowEmptyItems ? parts : parts.filter((part) => part.length > 0);

  if (!allowEmptyItems && filtered.length === 0) {
    throw new Error(`Environment variable ${name} must contain at least one non-empty item.`);
  }

  return filtered;
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
  const raw = readEnvRaw(name, env);
  if (raw === undefined || raw === null || raw.trim() === "") {
    if (options.defaultValue !== undefined) {
      return options.defaultValue;
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`Environment variable ${name} must contain valid JSON.`);
  }
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
