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
