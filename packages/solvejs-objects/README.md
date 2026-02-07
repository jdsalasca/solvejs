# @jdsalasc/solvejs-objects

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-objects)](https://www.npmjs.com/package/@jdsalasc/solvejs-objects)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-objects)](https://www.npmjs.com/package/@jdsalasc/solvejs-objects)


Zero-dependency object utilities for JavaScript and TypeScript.

## Utilities

- `pick`, `omit`, `hasOwn`
- `get`, `set`
- `deepMerge`

## When to use this package

Use it when you need consistent object shaping and nested path operations without pulling a larger utility library.

## Limitations and Constraints

- Path helpers currently support dot-separated string paths only.
- `deepMerge` merges plain objects and replaces arrays by design.

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
