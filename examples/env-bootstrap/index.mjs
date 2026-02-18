import {
  getEnvArray,
  getEnvBoolean,
  getEnvEnum,
  getEnvJson,
  getEnvNumber,
  getEnvString,
  validateRequiredEnv
} from "../../packages/solvejs/dist/esm/index.js";
import { fileURLToPath } from "node:url";

export function loadConfig(env) {
  const missing = validateRequiredEnv(["DB_URL", "JWT_SECRET"], env);
  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }

  return {
    nodeEnv: getEnvEnum("NODE_ENV", ["development", "test", "production"], env, { defaultValue: "development" }),
    port: getEnvNumber("PORT", env, { defaultValue: 3000, integer: true, min: 1, max: 65535 }),
    dbUrl: getEnvString("DB_URL", env),
    jwtSecret: getEnvString("JWT_SECRET", env),
    enableCache: getEnvBoolean("ENABLE_CACHE", env, { defaultValue: false }),
    corsOrigins: getEnvArray("CORS_ORIGINS", env, { defaultValue: ["http://localhost:3000"] }),
    featureFlags: getEnvJson("FEATURE_FLAGS", env, { defaultValue: { newCheckout: false } })
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const demoEnv = {
    NODE_ENV: "production",
    PORT: "8080",
    DB_URL: "postgres://localhost:5432/app",
    JWT_SECRET: "secret",
    ENABLE_CACHE: "true",
    CORS_ORIGINS: "http://localhost:3000,https://app.example.com",
    FEATURE_FLAGS: "{\"newCheckout\":true,\"maxRetries\":3}"
  };
  console.log(JSON.stringify(loadConfig(demoEnv), null, 2));
}
