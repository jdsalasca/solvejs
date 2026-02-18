# @jdsalasc/solvejs-env

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-env)](https://www.npmjs.com/package/@jdsalasc/solvejs-env)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-env)](https://www.npmjs.com/package/@jdsalasc/solvejs-env)

Zero-dependency environment variable parsing and validation utilities for JavaScript and TypeScript.

## Utilities

- `getEnvString`
- `getEnvNumber`
- `getEnvBoolean`
- `getEnvEnum`
- `validateRequiredEnv`

## When to use this package

Use it when you need safe startup checks for API/backend apps with typed environment parsing and clear failure messages.

## Install

```bash
npm i @jdsalasc/solvejs-env
```

## Quick example

```ts
import { getEnvBoolean, getEnvEnum, getEnvNumber, getEnvString, validateRequiredEnv } from "@jdsalasc/solvejs-env";

const missing = validateRequiredEnv(["DB_URL", "JWT_SECRET"]);
if (missing.length > 0) {
  throw new Error(`Missing env keys: ${missing.join(", ")}`);
}

const nodeEnv = getEnvEnum("NODE_ENV", ["development", "test", "production"], process.env, { defaultValue: "development" });
const port = getEnvNumber("PORT", process.env, { defaultValue: 3000, integer: true, min: 1, max: 65535 });
const dbUrl = getEnvString("DB_URL");
const enableCache = getEnvBoolean("ENABLE_CACHE", process.env, { defaultValue: false });
```
