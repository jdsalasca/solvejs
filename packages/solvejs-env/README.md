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
- `getEnvObject`
- `getEnvUrl`
- `getEnvDsn`
- `validateRequiredEnv`

## When to use this package

Use it when you need safe startup checks for API/backend apps with typed environment parsing and clear failure messages.

## Limitations and Constraints

### getEnvEnum takes allowedValues as its second argument

Every other getter is `(name, env, options)`. `getEnvEnum` is `(name, allowedValues, env, options)`,
so passing the env source second silently reads it as the list of allowed values:

```ts
getEnvString("NODE_ENV", env, {});              // correct
getEnvEnum("NODE_ENV", ["dev", "prod"], env);   // correct
getEnvEnum("NODE_ENV", env, { allowedValues }); // wrong: env is treated as allowedValues
```

### A blank value uses the default, except in getEnvString

When a variable is present but empty or whitespace only, most getters fall back to `defaultValue`.
`getEnvString` raises `cannot be empty` instead, even though an absent variable does use the default:

```ts
getEnvString("A", {}, { defaultValue: "d" });          // "d"
getEnvString("A", { A: "   " }, { defaultValue: "d" }); // throws "cannot be empty"
getEnvNumber("A", { A: "   " }, { defaultValue: 9 });  // 9
```

In CI and Docker a variable is often exported but empty, so `getEnvString` will crash at startup
where `getEnvNumber` quietly defaults. Pass `allowEmpty: true`, or coerce with `getEnvString` on a
trimmed source you control.

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
  getEnvObject,
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
const serviceConfig = getEnvObject("SERVICE_CONFIG", process.env, { defaultValue: { retries: 3 } });
const apiBaseUrl = getEnvUrl("API_BASE_URL", process.env, { defaultValue: "https://api.example.com", allowedProtocols: ["https"] });
const databaseDsn = getEnvDsn("DATABASE_DSN", process.env, { requireAuth: true });
```
