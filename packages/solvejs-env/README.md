# @jdsalasc/solvejs-env

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-env)](https://www.npmjs.com/package/@jdsalasc/solvejs-env)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-env)](https://www.npmjs.com/package/@jdsalasc/solvejs-env)

Zero-dependency environment variable parsing and validation utilities for JavaScript and TypeScript.

## Utilities

- `getEnvString`
- `getEnvNumber`
- `getEnvBoolean`
- `getEnvEnum`
- `getEnvArray`
- `getEnvJson`
- `getEnvUrl`
- `getEnvDsn`
- `validateRequiredEnv`

## When to use this package

Use it when you need safe startup checks for API/backend apps with typed environment parsing and clear failure messages.

## Install

```bash
npm i @jdsalasc/solvejs-env
```

## Quick example

```ts
import {
  getEnvArray,
  getEnvBoolean,
  getEnvDsn,
  getEnvEnum,
  getEnvJson,
  getEnvNumber,
  getEnvString,
  getEnvUrl,
  validateRequiredEnv
} from "@jdsalasc/solvejs-env";

const missing = validateRequiredEnv(["DATABASE_DSN", "JWT_SECRET"]);
if (missing.length > 0) {
  throw new Error(`Missing env keys: ${missing.join(", ")}`);
}

const nodeEnv = getEnvEnum("NODE_ENV", ["development", "test", "production"], process.env, { defaultValue: "development" });
const port = getEnvNumber("PORT", process.env, { defaultValue: 3000, integer: true, min: 1, max: 65535 });
const jwtSecret = getEnvString("JWT_SECRET");
const enableCache = getEnvBoolean("ENABLE_CACHE", process.env, { defaultValue: false });
const corsOrigins = getEnvArray("CORS_ORIGINS", process.env, { defaultValue: ["http://localhost:3000"] });
const featureFlags = getEnvJson("FEATURE_FLAGS", process.env, { defaultValue: { newCheckout: false } });
const apiBaseUrl = getEnvUrl("API_BASE_URL", process.env, { defaultValue: "https://api.example.com", allowedProtocols: ["https"] });
const databaseDsn = getEnvDsn("DATABASE_DSN", process.env, { requireAuth: true });
```
