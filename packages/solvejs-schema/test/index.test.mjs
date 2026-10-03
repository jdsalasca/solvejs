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

test("string constraints cover max, regex, and argument validation", () => {
  assert.equal(s.string().max(3).parse("abc"), "abc");
  assert.equal(s.string().max(3).safeParse("abcd").error.issues[0].code, "too_big");
  assert.equal(s.string().max(3).safeParse("abcd").error.issues[0].message.includes("at most 3"), true);

  assert.equal(s.string().min(2).parse("ab"), "ab");
  assert.throws(() => s.string().min(-1), /non-negative integer/);
  assert.throws(() => s.string().min(1.5), /non-negative integer/);
  assert.throws(() => s.string().max(-1), /non-negative integer/);
  assert.throws(() => s.string().max(2.5), /non-negative integer/);

  const slug = s.string().regex(/^[a-z-]+$/);
  assert.equal(slug.parse("my-slug"), "my-slug");
  assert.equal(slug.safeParse("Not A Slug").error.issues[0].code, "invalid_string");
  assert.equal(slug.safeParse("Not A Slug").error.issues[0].message.includes("expected format"), true);
});

test("string and number coercion accept primitives", () => {
  assert.equal(s.string({ coerce: true }).parse(42), "42");
  assert.equal(s.string({ coerce: true }).parse(true), "true");
  assert.equal(s.string({ coerce: true }).parse(42n), "42", "bigint coerces too");
  assert.equal(s.string({ coerce: true, trim: true }).parse("  x  "), "x");
  assert.equal(s.string({ coerce: true }).safeParse(null).error.issues[0].code, "invalid_type", "null is not coerced");
  assert.equal(s.string({ coerce: true }).safeParse({}).error.issues[0].code, "invalid_type", "an object is not coerced");

  assert.equal(s.number({ coerce: true }).parse("42"), 42);
  assert.equal(s.number({ coerce: true }).parse(" 42 "), 42, "a numeric string is trimmed");
  assert.equal(s.number({ coerce: true }).safeParse("").error.issues[0].code, "invalid_type", "an empty string is not a number");
  assert.equal(s.number({ coerce: true }).safeParse("abc").error.issues[0].code, "invalid_type");
  assert.equal(s.number({ coerce: true }).safeParse(Infinity).error.issues[0].code, "invalid_type");
  assert.equal(s.number({ coerce: true }).safeParse({}).error.issues[0].code, "invalid_type");
});

test("number constraints cover int, min, and max", () => {
  assert.equal(s.number().int().parse(4), 4);
  assert.equal(s.number().int().safeParse(1.5).error.issues[0].code, "invalid_number");
  assert.equal(s.number().int().safeParse(1.5).error.issues[0].message, "Expected integer.");

  assert.equal(s.number().min(18).parse(18), 18, "the bound is inclusive");
  assert.equal(s.number().min(18).safeParse(17).error.issues[0].code, "too_small");
  assert.equal(s.number().min(18).safeParse(17).error.issues[0].message.includes("18"), true);

  assert.equal(s.number().max(5).parse(5), 5);
  assert.equal(s.number().max(5).safeParse(6).error.issues[0].code, "too_big");
  assert.equal(s.number().max(5).safeParse(6).error.issues[0].message.includes("5"), true);
  assert.equal(s.number().min(1).max(3).safeParse(9).error.issues[0].code, "too_big", "max is checked after min");
});

test("boolean validation and coercion", () => {
  assert.equal(s.boolean().parse(true), true);
  assert.equal(s.boolean({ coerce: true }).parse(true), true);
  assert.equal(s.boolean({ coerce: true }).parse("true"), true);
  assert.equal(s.boolean({ coerce: true }).parse("yes"), true);
  assert.equal(s.boolean({ coerce: true }).parse("false"), false);
  assert.equal(s.boolean({ coerce: true }).safeParse("maybe").error.issues[0].code, "invalid_boolean");
  assert.equal(s.boolean().safeParse("true").error.issues[0].code, "invalid_boolean", "coercion is opt-in");
  assert.equal(s.boolean().safeParse(1).error.issues[0].code, "invalid_boolean");
  assert.equal(s.boolean().safeParse(null).error.issues[0].code, "invalid_boolean");
});

test("array bounds and element validation", () => {
  assert.deepEqual(s.array(s.number()).parse([1, 2]), [1, 2]);
  assert.deepEqual(s.array(s.number()).parse([]), [], "an empty array is valid without a minimum");

  assert.deepEqual(s.array(s.string()).min(1).parse(["a"]), ["a"]);
  assert.equal(s.array(s.string()).min(2).safeParse(["a"]).error.issues[0].code, "too_small");
  assert.equal(s.array(s.string()).min(2).safeParse(["a"]).error.issues[0].message.includes("at least 2"), true);

  assert.deepEqual(s.array(s.string()).max(2).parse(["a", "b"]), ["a", "b"]);
  assert.equal(s.array(s.string()).max(1).safeParse(["a", "b"]).error.issues[0].code, "too_big");
  assert.equal(s.array(s.string()).max(1).safeParse(["a", "b"]).error.issues[0].message.includes("at most 1"), true);

  assert.equal(s.array(s.string()).safeParse("nope").error.issues[0].code, "invalid_type");
  assert.equal(s.array(s.string()).safeParse("nope").error.issues[0].message, "Expected array.");
  assert.equal(s.array(s.string()).safeParse({}).error.issues[0].code, "invalid_type");
  assert.equal(s.array(s.string()).safeParse(null).error.issues[0].code, "invalid_type");

  const nested = s.array(s.number()).safeParse([1, "two", 3]);
  assert.equal(nested.success, false);
  assert.equal(nested.error.issues[0].path, "1", "the failing index is reported as the path");
});

test("object rejects non-objects", () => {
  const Payload = s.object({ id: s.string() });
  for (const input of [null, undefined, "text", 42, true, [], [{ id: "x" }]]) {
    assert.equal(
      Payload.safeParse(input).error.issues[0].code,
      "invalid_type",
      `${JSON.stringify(input)} must not be accepted as an object`
    );
  }
  assert.equal(Payload.safeParse(null).error.issues[0].message, "Expected object.");
});

test("a non-schema error inside a refinement is wrapped", () => {
  const Exploding = s.refine(s.string(), () => {
    throw new TypeError("refinement exploded");
  }, "never reached");
  const result = Exploding.safeParse("x");

  assert.equal(result.success, false);
  assert.equal(result.error instanceof SchemaError, true, "the failure is still a SchemaError");
  assert.equal(result.error.issues[0].code, "custom");
  assert.equal(result.error.issues[0].message, "Unknown schema parsing error.");
  assert.equal(result.error.issues[0].path, "", "an unexpected error has no field path");
});

test("optional accepts undefined directly", () => {
  const Maybe = s.string().optional();
  assert.equal(Maybe.parse(undefined), undefined);
  assert.equal(Maybe.parse("x"), "x");
  assert.equal(s.number().optional().parse(undefined), undefined);

const Payload = s.object({ id: s.string().optional() });
  assert.deepEqual(Payload.parse({}), { id: undefined });
  assert.deepEqual(Payload.parse({ id: "x" }), { id: "x" });

  // An absent optional key is present with the value undefined rather than
  // omitted. JSON.stringify hides it, but Object.keys and `in` do not.
  const empty = Payload.parse({});
  assert.equal("id" in empty, true, "the key exists");
  assert.equal(empty.id, undefined);
  assert.deepEqual(Object.keys(empty), ["id"], "Object.keys still lists it");
  assert.equal(JSON.stringify(empty), "{}", "JSON output omits it, which is why the difference is easy to miss");
});

test("later field errors are reachable once the earlier one passes", () => {
  // safeParse is fail-fast, so a two-field payload only reaches the second field
  // when the first one succeeds. Pin that so the second field is never dead code.
  const Payload = s.object({
    email: s.string().email(),
    age: s.number().min(18)
  });

  assert.equal(Payload.safeParse({ email: "bad", age: 12 }).error.issues[0].path, "email");
  assert.equal(
    Payload.safeParse({ email: "ada@example.com", age: 12 }).error.issues[0].path,
    "age",
    "with the first field valid the second one is now reached"
  );
  assert.equal(Payload.safeParse({ email: "ada@example.com", age: 12 }).error.issues[0].code, "too_small");
});
