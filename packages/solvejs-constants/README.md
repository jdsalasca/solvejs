# @jdsalasc/solvejs-constants

Zero-dependency constants and parsing helpers for JavaScript and TypeScript.

## Utilities

- `TIME`
- `FILE_SIZE_BYTES`
- `HTTP_METHODS`
- `HTTP_HEADERS`
- `parseBooleanString`

## When to use this package

Use it when you want shared constant values and predictable string-to-boolean parsing across services and frontend apps.

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
