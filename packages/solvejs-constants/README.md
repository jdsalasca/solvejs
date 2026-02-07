# @jdsalasc/solvejs-constants

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-constants)](https://www.npmjs.com/package/@jdsalasc/solvejs-constants)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-constants)](https://www.npmjs.com/package/@jdsalasc/solvejs-constants)


Zero-dependency constants and parsing helpers for JavaScript and TypeScript.

## Utilities

- `TIME`
- `FILE_SIZE_BYTES`
- `HTTP_METHODS`
- `COMMON_HTTP_HEADERS`
- `parseBooleanString`

## When to use this package

Use it when you want shared constant values and predictable string-to-boolean parsing across services and frontend apps.

## Limitations and Constraints

- Constants are generic defaults and may not match every org-specific protocol convention.
- `parseBooleanString` targets common true/false string forms, not localization dictionaries.

## Install

```bash
npm i @jdsalasc/solvejs-constants
```

## Quick example

```ts
import { TIME, FILE_SIZE_BYTES, parseBooleanString } from "@jdsalasc/solvejs-constants";

const ttl = 15 * TIME.MINUTE;
const maxUpload = 10 * FILE_SIZE_BYTES.MB;
parseBooleanString("true"); // true
```
