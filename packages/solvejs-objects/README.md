# @jdsalasc/solvejs-objects

Zero-dependency object utilities for JavaScript and TypeScript.

## Utilities

- `pick`, `omit`, `hasOwn`
- `get`, `set`
- `deepMerge`

## When to use this package

Use it when you need consistent object shaping and nested path operations without pulling a larger utility library.

## Install

```bash
npm i @jdsalasc/solvejs-objects
```

## Quick example

```ts
import { pick, set, deepMerge } from "@jdsalasc/solvejs-objects";

const user = pick({ id: "u1", name: "Ada", role: "admin" }, ["id", "name"]);
const state = { filters: {} };
set(state, "filters.status", "active");
deepMerge({ app: { flags: { a: true } } }, { app: { flags: { b: true } } });
```
