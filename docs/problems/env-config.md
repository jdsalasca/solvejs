# Parse and validate environment variables safely

Use `@jdsalasc/solvejs-env` to fail fast at startup with typed env parsing.

```ts
import { getEnvBoolean, getEnvEnum, getEnvNumber, getEnvString, validateRequiredEnv } from "@jdsalasc/solvejs-env";

const missing = validateRequiredEnv(["DB_URL", "JWT_SECRET"], process.env);
if (missing.length > 0) {
  throw new Error(`Missing env vars: ${missing.join(", ")}`);
}

const nodeEnv = getEnvEnum("NODE_ENV", ["development", "test", "production"], process.env, {
  defaultValue: "development"
});
const port = getEnvNumber("PORT", process.env, { defaultValue: 3000, integer: true, min: 1, max: 65535 });
const dbUrl = getEnvString("DB_URL", process.env, { trim: true });
const cacheEnabled = getEnvBoolean("ENABLE_CACHE", process.env, { defaultValue: false });
```

Why this works:

- Explicit parsing and validation avoids hidden startup misconfigurations.
- Error messages point directly to invalid or missing env variables.
- Keeps runtime dependencies at zero for backend/bootstrap flows.
