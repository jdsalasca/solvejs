# @jdsalasc/solvejs-schema

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-schema)](https://www.npmjs.com/package/@jdsalasc/solvejs-schema)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-schema)](https://www.npmjs.com/package/@jdsalasc/solvejs-schema)

Zero-dependency TypeScript schema validation for web apps, APIs, forms, config files, and AI tool inputs.

## Utilities

- `s.string`, `s.number`, `s.boolean`
- `s.literal`, `s.array`, `s.object`, `s.union`
- `s.refine` for custom business rules
- `parse`, `safeParse`, `optional`
- `toJsonSchema` for docs and contracts

## When to use this package

Use it when data crosses a boundary: request bodies, search params, form payloads, env-derived config, webhooks, local storage, or AI tool arguments.

## Limitations and Constraints

- It is intentionally small and dependency-free; advanced schema ecosystems may offer more formats and transformations.
- JSON Schema output is practical and documentation-friendly, not a full standards conformance suite.

### safeParse is fail-fast

A failed parse returns **one** issue for the first field that fails, not one per field. zod collects
every issue, so code written against zod will need adjusting:

```ts
const User = s.object({ id: s.string().min(2), age: s.number().min(18) });
const result = User.safeParse({ id: "u", age: 12 });

result.error.issues.length; // 1, for `id`
result.error.issues[0];     // { path: "id", code: "too_small", message: "..." }
```

If your form highlights every invalid field at once, validate each field separately with its own
schema, or loop until `safeParse` succeeds.

### Unknown keys are dropped

A successful parse returns only the declared keys, so extra input never reaches your code:

```ts
User.safeParse({ id: "u1", age: 21, role: "admin" });
// { success: true, data: { id: "u1", age: 21 } }   `role` is removed
```

### An absent optional key is present with value undefined

An optional field that is missing from the input is set to `undefined` rather than omitted from the
result object. `JSON.stringify` hides this, but `Object.keys` and `in` do not:

```ts
const User = s.object({ id: s.string(), nick: s.string().optional() });
const user = User.parse({ id: "u1" });

"nick" in user;              // true
Object.keys(user);           // ["id", "nick"]
JSON.stringify(user);        // '{"id":"u1"}'
```

Compare with `Object.hasOwn` or destructure with a default when you need to tell absent from empty.

## Install

```bash
npm i @jdsalasc/solvejs-schema
```

## Quick example

```ts
import { s, toJsonSchema } from "@jdsalasc/solvejs-schema";

const Signup = s.object({
  email: s.string({ trim: true }).email(),
  age: s.number({ coerce: true }).int().min(18),
  plan: s.union([s.literal("free"), s.literal("pro")]),
  referral: s.string({ trim: true }).optional()
});

const result = Signup.safeParse({
  email: " ada@example.com ",
  age: "42",
  plan: "pro"
});

if (result.success) {
  result.data.email; // "ada@example.com"
}

toJsonSchema(Signup);
```
