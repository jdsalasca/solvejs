# Parse and validate environment variables safely

Use `@jdsalasc/solvejs-env` to fail fast at startup with typed env parsing.

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

const missing = validateRequiredEnv(["DATABASE_DSN", "JWT_SECRET"], process.env);
if (missing.length > 0) {
  throw new Error(`Missing env vars: ${missing.join(", ")}`);
}

const nodeEnv = getEnvEnum("NODE_ENV", ["development", "test", "production"], process.env, {
  defaultValue: "development"
});
const port = getEnvNumber("PORT", process.env, { defaultValue: 3000, integer: true, min: 1, max: 65535 });
const databaseDsn = getEnvDsn("DATABASE_DSN", process.env, { requireAuth: true });
const cacheEnabled = getEnvBoolean("ENABLE_CACHE", process.env, { defaultValue: false });
const corsOrigins = getEnvArray("CORS_ORIGINS", process.env, { defaultValue: ["http://localhost:3000"] });
const featureFlags = getEnvJson("FEATURE_FLAGS", process.env, { defaultValue: { newCheckout: false } });
const apiBaseUrl = getEnvUrl("API_BASE_URL", process.env, { defaultValue: "https://api.example.com", allowedProtocols: ["https"] });
```

Why this works:

- Explicit parsing and validation avoids hidden startup misconfigurations.
- Error messages point directly to invalid or missing env variables.
- Keeps runtime dependencies at zero for backend/bootstrap flows.
