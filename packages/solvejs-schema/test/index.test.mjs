import test from "node:test";
import assert from "node:assert/strict";
import { SchemaError, s, toJsonSchema } from "../dist/esm/index.js";

test("schema parses typed objects and trims/coerces values", () => {
  const User = s.object({
    id: s.string({ trim: true }).min(2),
    email: s.string({ trim: true }).email(),
    age: s.number({ coerce: true }).int().min(18),
    tags: s.array(s.string()).min(1),
    marketing: s.boolean({ coerce: true }).optional()
  });

  const parsed = User.parse({
    id: " u1 ",
    email: " ada@example.com ",
    age: "42",
    tags: ["admin"],
    marketing: "yes"
  });

  assert.deepEqual(parsed, {
    id: "u1",
    email: "ada@example.com",
    age: 42,
    tags: ["admin"],
    marketing: true
  });
});

test("safeParse returns structured issues", () => {
  const Payload = s.object({
    email: s.string().email(),
    age: s.number().min(18)
  });

  const result = Payload.safeParse({ email: "bad", age: 12 });
  assert.equal(result.success, false);
  assert.equal(result.error instanceof SchemaError, true);
  assert.equal(result.error.issues[0].path, "email");
  assert.equal(result.error.issues[0].code, "invalid_string");
});

test("union, literal, refine, and JSON Schema output", () => {
  const Status = s.union([s.literal("draft"), s.literal("published")]);
  assert.equal(Status.parse("draft"), "draft");
  assert.throws(() => Status.parse("archived"), SchemaError);

  const Even = s.refine(s.number().int(), (value) => value % 2 === 0, "Expected even number.");
  assert.equal(Even.parse(4), 4);
  assert.equal(Even.safeParse(3).success, false);

  assert.deepEqual(toJsonSchema(s.object({ email: s.string().email(), age: s.number().int().optional() })), {
    type: "object",
    properties: {
      email: { type: "string", pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", format: "email" },
      age: { type: "integer" }
    },
    required: ["email"],
    additionalProperties: false
  });
});

test("toJsonSchema emits a valid shape for every builder", () => {
  assert.deepEqual(toJsonSchema(s.string()), { type: "string" });
  assert.deepEqual(toJsonSchema(s.boolean()), { type: "boolean" });
  assert.deepEqual(toJsonSchema(s.number()), { type: "number" });
  assert.deepEqual(toJsonSchema(s.number().int()), { type: "integer" });
  assert.deepEqual(toJsonSchema(s.literal("fixed")), { const: "fixed" });
  assert.deepEqual(toJsonSchema(s.array(s.string())), { type: "array", items: { type: "string" } });
  assert.deepEqual(toJsonSchema(s.union([s.string(), s.number()])), {
    anyOf: [{ type: "string" }, { type: "number" }]
  });

  // An optional key stays out of `required`, which is how a JSON Schema consumer
  // learns it may be absent.
  const withOptional = toJsonSchema(s.object({ id: s.string(), nick: s.string().optional() }));
  assert.deepEqual(withOptional.required, ["id"], "only the mandatory key is required");
  assert.deepEqual(withOptional.properties.nick, { type: "string" }, "the optional property is still declared");
  assert.equal(withOptional.additionalProperties, false);

  assert.deepEqual(toJsonSchema(s.object({})), {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false
  });

  // refine is a runtime-only constraint, so it carries no JSON Schema keyword.
  assert.deepEqual(toJsonSchema(s.refine(s.string(), (value) => value.length > 2)), { type: "string" });

  for (const schema of [s.string(), s.number(), s.boolean(), s.array(s.string())]) {
    assert.equal(typeof toJsonSchema(schema).type, "string", "every typed schema reports a type");
  }
  assert.equal(
    toJsonSchema(s.literal(1)).type,
    undefined,
    "a literal declares only `const`, which is what JSON Schema expects"
  );
});

test("safeParse reports the first failing field", () => {
  const Payload = s.object({
    id: s.string().min(2),
    age: s.number().min(18)
  });

  // The parser is fail-fast: it returns a single issue for the first field that
  // fails, unlike zod which collects every issue. Pin the behaviour so a change
  // to it is a deliberate decision.
  const bothFail = Payload.safeParse({ id: "u", age: 12 });
  assert.equal(bothFail.success, false);
  assert.equal(bothFail.error.issues.length, 1, "only the first failing field is reported");
  assert.equal(bothFail.error.issues[0].path, "id");
  assert.equal(bothFail.error.issues[0].code, "too_small");

  assert.equal(Payload.safeParse({ age: 20 }).error.issues[0].path, "id", "a missing key reports invalid_type");
  assert.equal(Payload.safeParse({ id: "u1" }).error.issues[0].path, "age");
  assert.equal(Payload.safeParse({}).error.issues[0].path, "id", "the first declared key is checked first");

  assert.deepEqual(Payload.safeParse({ id: "u1", age: 20 }), { success: true, data: { id: "u1", age: 20 } });
  assert.deepEqual(
    Payload.safeParse({ id: "u1", age: 20, extra: 1 }),
    { success: true, data: { id: "u1", age: 20 } },
    "an unknown key is dropped rather than passed through"
  );
});

test("safeParse drops unknown keys from a successful result", () => {
  const Payload = s.object({
    id: s.string().min(2),
    age: s.number().min(18)
  });

  assert.equal(Payload.safeParse({ id: "u1", age: 21 }).success, true);
  assert.deepEqual(
    Payload.safeParse({ id: "u1", age: 21, extra: 1 }),
    { success: true, data: { id: "u1", age: 21 } },
    "an unknown key is dropped rather than passed through"
  );
});
