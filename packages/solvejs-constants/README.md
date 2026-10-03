# @jdsalasc/solvejs-constants

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-constants)](https://www.npmjs.com/package/@jdsalasc/solvejs-constants)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-constants)](https://www.npmjs.com/package/@jdsalasc/solvejs-constants)


Zero-dependency constants and parsing helpers for JavaScript and TypeScript.

## Utilities

- `TIME`
- `FILE_SIZE_BYTES`
- `HTTP_METHODS`
- `COMMON_HTTP_HEADERS`
- `HTTP_STATUS`
- `CONTENT_TYPES`
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
import { TIME, FILE_SIZE_BYTES, HTTP_STATUS, CONTENT_TYPES, parseBooleanString } from "@jdsalasc/solvejs-constants";

const ttl = 15 * TIME.MINUTE_MS;
const maxUpload = 10 * FILE_SIZE_BYTES.MB;
const response = { status: HTTP_STATUS.OK, type: CONTENT_TYPES.JSON };
parseBooleanString("true"); // true
```
