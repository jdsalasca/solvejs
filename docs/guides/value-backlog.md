# SolveJS Value Backlog

Updated on 2026-02-18.

## Executed in this cycle

1. Added `@jdsalasc/solvejs-env` package with typed startup parsing:
   - `getEnvString`, `getEnvNumber`, `getEnvBoolean`, `getEnvEnum`, `validateRequiredEnv`
2. Added async orchestration utilities:
   - `createTaskQueue`, `createRateLimiter`
3. Added business-math helpers in numbers:
   - `calculateTaxAmount`, `applyDiscount`, `grossMargin`
4. Raised test depth in critical packages and enforced baseline in CI.
5. Added env cookbook page and runnable env bootstrap example.
6. Expanded env parsing with:
   - `getEnvArray`, `getEnvJson`
7. Added URL/DSN startup validators:
   - `getEnvUrl`, `getEnvDsn`
8. Added token-bucket limiter for burst smoothing:
   - `createTokenBucketLimiter`

## Next highest-value items

1. `P1` Add fintech-ready invoice recipe combining numbers + env + validators.
2. `P1` Add regional timezone matrix examples in date docs (DST edge cases).
3. `P1` Add high-cardinality benchmark scenario for list transforms.
