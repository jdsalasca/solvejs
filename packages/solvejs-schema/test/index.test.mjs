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
