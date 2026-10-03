export type JsonSchema = Record<string, unknown>;

export type SchemaIssueCode =
  | "invalid_type"
  | "required"
  | "too_small"
  | "too_big"
  | "invalid_string"
  | "invalid_number"
  | "invalid_boolean"
  | "invalid_literal"
  | "invalid_union"
  | "custom";

export type SchemaIssue = {
  path: string;
  code: SchemaIssueCode;
  message: string;
};

export type SchemaResult<T> =
  | { success: true; data: T }
  | { success: false; error: SchemaError };

export interface Schema<T> {
  parse(input: unknown): T;
  safeParse(input: unknown): SchemaResult<T>;
  optional(): Schema<T | undefined>;
  toJsonSchema(): JsonSchema;
}

export type Infer<TSchema> = TSchema extends Schema<infer TValue> ? TValue : never;

/**
 * Error thrown by `parse` when schema validation fails.
 *
 * The `issues` array is intentionally structured so humans, logs, APIs, and
 * AI agents can inspect the exact failing path and reason.
 */
export class SchemaError extends TypeError {
  readonly issues: readonly SchemaIssue[];

  constructor(issues: readonly SchemaIssue[]) {
    super(issues[0]?.message ?? "Schema validation failed.");
    this.name = "SchemaError";
    this.issues = issues;
  }
}

function makeIssue(path: string, code: SchemaIssueCode, message: string): SchemaError {
  return new SchemaError([{ path, code, message }]);
}

function childPath(path: string, key: string | number): string {
  return path ? `${path}.${key}` : String(key);
}

abstract class BaseSchema<T> implements Schema<T> {
  abstract parseAt(input: unknown, path: string): T;
  abstract toJsonSchema(): JsonSchema;

  parse(input: unknown): T {
    return this.parseAt(input, "");
  }

  safeParse(input: unknown): SchemaResult<T> {
    try {
      return { success: true, data: this.parse(input) };
    } catch (error) {
      if (error instanceof SchemaError) {
        return { success: false, error };
      }
      return {
        success: false,
        error: new SchemaError([{ path: "", code: "custom", message: "Unknown schema parsing error." }])
      };
    }
  }

  optional(): Schema<T | undefined> {
    return new OptionalSchema(this);
  }
}

class OptionalSchema<T> extends BaseSchema<T | undefined> {
  constructor(private readonly inner: BaseSchema<T>) {
    super();
  }

  parseAt(input: unknown, path: string): T | undefined {
    if (input === undefined) {
      return undefined;
    }
    return this.inner.parseAt(input, path);
  }

  toJsonSchema(): JsonSchema {
    return this.inner.toJsonSchema();
  }
}

class StringSchema extends BaseSchema<string> {
  private minLength?: number;
  private maxLength?: number;
  private pattern?: RegExp;
  private format?: string;

  constructor(private readonly options: { coerce?: boolean; trim?: boolean } = {}) {
    super();
  }

  /** Requires the string to contain at least `length` characters. */
  min(length: number): this {
    if (!Number.isInteger(length) || length < 0) {
      throw new TypeError("Expected min length to be a non-negative integer.");
    }
    this.minLength = length;
    return this;
  }

  /** Requires the string to contain at most `length` characters. */
  max(length: number): this {
    if (!Number.isInteger(length) || length < 0) {
      throw new TypeError("Expected max length to be a non-negative integer.");
    }
    this.maxLength = length;
    return this;
  }

  /** Requires the string to match a regular expression. */
  regex(pattern: RegExp): this {
    this.pattern = pattern;
    return this;
  }

  /** Requires a practical email shape. */
  email(): this {
    this.format = "email";
    this.pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this;
  }

  parseAt(input: unknown, path: string): string {
    let value = input;
    if (this.options.coerce && (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint")) {
      value = String(value);
    }
    if (typeof value !== "string") {
      throw makeIssue(path, "invalid_type", "Expected string.");
    }
    const parsed = this.options.trim ? value.trim() : value;
    if (this.minLength !== undefined && parsed.length < this.minLength) {
      throw makeIssue(path, "too_small", `String must contain at least ${this.minLength} characters.`);
    }
    if (this.maxLength !== undefined && parsed.length > this.maxLength) {
      throw makeIssue(path, "too_big", `String must contain at most ${this.maxLength} characters.`);
    }
    if (this.pattern && !this.pattern.test(parsed)) {
      throw makeIssue(path, "invalid_string", "String does not match expected format.");
    }
    return parsed;
  }

  toJsonSchema(): JsonSchema {
    const schema: JsonSchema = { type: "string" };
    if (this.minLength !== undefined) schema.minLength = this.minLength;
    if (this.maxLength !== undefined) schema.maxLength = this.maxLength;
    if (this.pattern) schema.pattern = this.pattern.source;
    if (this.format) schema.format = this.format;
    return schema;
  }
}

class NumberSchema extends BaseSchema<number> {
  private minValue?: number;
  private maxValue?: number;
  private intOnly = false;

  constructor(private readonly options: { coerce?: boolean } = {}) {
    super();
  }

  /** Requires the number to be greater than or equal to `value`. */
  min(value: number): this {
    this.minValue = value;
    return this;
  }

  /** Requires the number to be less than or equal to `value`. */
  max(value: number): this {
    this.maxValue = value;
    return this;
  }

  /** Requires the number to be an integer. */
  int(): this {
    this.intOnly = true;
    return this;
  }

  parseAt(input: unknown, path: string): number {
    let value = input;
    if (this.options.coerce && typeof value === "string") {
      const normalized = value.trim();
      value = normalized ? Number(normalized) : Number.NaN;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw makeIssue(path, "invalid_type", "Expected finite number.");
    }
    if (this.intOnly && !Number.isInteger(value)) {
      throw makeIssue(path, "invalid_number", "Expected integer.");
    }
    if (this.minValue !== undefined && value < this.minValue) {
      throw makeIssue(path, "too_small", `Number must be greater than or equal to ${this.minValue}.`);
    }
    if (this.maxValue !== undefined && value > this.maxValue) {
      throw makeIssue(path, "too_big", `Number must be less than or equal to ${this.maxValue}.`);
    }
    return value;
  }

  toJsonSchema(): JsonSchema {
    const schema: JsonSchema = { type: this.intOnly ? "integer" : "number" };
    if (this.minValue !== undefined) schema.minimum = this.minValue;
    if (this.maxValue !== undefined) schema.maximum = this.maxValue;
    return schema;
  }
}

class BooleanSchema extends BaseSchema<boolean> {
  constructor(private readonly options: { coerce?: boolean } = {}) {
    super();
  }

  parseAt(input: unknown, path: string): boolean {
    let value = input;
    if (this.options.coerce && typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(normalized)) value = true;
      if (["false", "0", "no", "off"].includes(normalized)) value = false;
    }
    if (typeof value !== "boolean") {
      throw makeIssue(path, "invalid_boolean", "Expected boolean.");
    }
    return value;
  }

  toJsonSchema(): JsonSchema {
    return { type: "boolean" };
  }
}

class LiteralSchema<T extends string | number | boolean | null> extends BaseSchema<T> {
  constructor(private readonly expected: T) {
    super();
  }

  parseAt(input: unknown, path: string): T {
    if (input !== this.expected) {
      throw makeIssue(path, "invalid_literal", `Expected literal ${String(this.expected)}.`);
    }
    return this.expected;
  }

  toJsonSchema(): JsonSchema {
    return { const: this.expected };
  }
}

class ArraySchema<T> extends BaseSchema<T[]> {
  private minItems?: number;
  private maxItems?: number;

  constructor(private readonly itemSchema: BaseSchema<T>) {
    super();
  }

  /** Requires at least `length` array items. */
  min(length: number): this {
    this.minItems = length;
    return this;
  }

  /** Requires at most `length` array items. */
  max(length: number): this {
    this.maxItems = length;
    return this;
  }

  parseAt(input: unknown, path: string): T[] {
    if (!Array.isArray(input)) {
      throw makeIssue(path, "invalid_type", "Expected array.");
    }
    if (this.minItems !== undefined && input.length < this.minItems) {
      throw makeIssue(path, "too_small", `Array must contain at least ${this.minItems} items.`);
    }
    if (this.maxItems !== undefined && input.length > this.maxItems) {
      throw makeIssue(path, "too_big", `Array must contain at most ${this.maxItems} items.`);
    }
    return input.map((item, index) => this.itemSchema.parseAt(item, childPath(path, index)));
  }

  toJsonSchema(): JsonSchema {
    const schema: JsonSchema = { type: "array", items: this.itemSchema.toJsonSchema() };
    if (this.minItems !== undefined) schema.minItems = this.minItems;
    if (this.maxItems !== undefined) schema.maxItems = this.maxItems;
    return schema;
  }
}

type Shape = Record<string, BaseSchema<unknown>>;
type InferShape<TShape extends Shape> = { [K in keyof TShape]: Infer<TShape[K]> };

class ObjectSchema<TShape extends Shape> extends BaseSchema<InferShape<TShape>> {
  constructor(private readonly shape: TShape) {
    super();
  }

  parseAt(input: unknown, path: string): InferShape<TShape> {
    if (input == null || typeof input !== "object" || Array.isArray(input)) {
      throw makeIssue(path, "invalid_type", "Expected object.");
    }
    const source = input as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(this.shape)) {
      output[key] = this.shape[key].parseAt(source[key], childPath(path, key));
    }
    return output as InferShape<TShape>;
  }

  toJsonSchema(): JsonSchema {
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    for (const key of Object.keys(this.shape)) {
      properties[key] = this.shape[key].toJsonSchema();
      if (!(this.shape[key] instanceof OptionalSchema)) {
        required.push(key);
      }
    }
    return { type: "object", properties, required, additionalProperties: false };
  }
}

class UnionSchema<TSchemas extends readonly BaseSchema<unknown>[]> extends BaseSchema<Infer<TSchemas[number]>> {
  constructor(private readonly schemas: TSchemas) {
    super();
  }

  parseAt(input: unknown, path: string): Infer<TSchemas[number]> {
    const issues: SchemaIssue[] = [];
    for (const schema of this.schemas) {
      try {
        return schema.parseAt(input, path) as Infer<TSchemas[number]>;
      } catch (error) {
        if (error instanceof SchemaError) {
          issues.push(...error.issues);
        }
      }
    }
    throw new SchemaError(issues.length ? issues : [{ path, code: "invalid_union", message: "Value did not match any union option." }]);
  }

  toJsonSchema(): JsonSchema {
    return { anyOf: this.schemas.map((schema) => schema.toJsonSchema()) };
  }
}

class RefinementSchema<T> extends BaseSchema<T> {
  constructor(
    private readonly inner: BaseSchema<T>,
    private readonly check: (value: T) => boolean,
    private readonly message: string
  ) {
    super();
  }

  parseAt(input: unknown, path: string): T {
    const parsed = this.inner.parseAt(input, path);
    if (!this.check(parsed)) {
      throw makeIssue(path, "custom", this.message);
    }
    return parsed;
  }

  toJsonSchema(): JsonSchema {
    return this.inner.toJsonSchema();
  }
}

/**
 * Schema factory for validating external input in web apps, APIs, forms, and AI tool payloads.
 */
export const s = {
  string: (options?: { coerce?: boolean; trim?: boolean }) => new StringSchema(options),
  number: (options?: { coerce?: boolean }) => new NumberSchema(options),
  boolean: (options?: { coerce?: boolean }) => new BooleanSchema(options),
  literal: <T extends string | number | boolean | null>(value: T) => new LiteralSchema(value),
  array: <T>(schema: BaseSchema<T>) => new ArraySchema(schema),
  object: <TShape extends Shape>(shape: TShape) => new ObjectSchema(shape),
  union: <TSchemas extends readonly BaseSchema<unknown>[]>(schemas: TSchemas) => new UnionSchema(schemas),
  refine: <T>(schema: BaseSchema<T>, check: (value: T) => boolean, message: string): Schema<T> =>
    new RefinementSchema(schema, check, message)
};

/**
 * Converts any SolveJS schema into a JSON Schema-like object for documentation or AI tool contracts.
 *
 * @param schema - Schema instance.
 * @returns JSON Schema representation.
 */
export function toJsonSchema<T>(schema: Schema<T>): JsonSchema {
  return schema.toJsonSchema();
}
