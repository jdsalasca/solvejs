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
9. Added fintech-ready invoice recipe and runnable example:
   - `docs/problems/invoice-fintech.*`
   - `examples/invoice-workflow/*`
10. Added regional timezone/DST matrix examples in date docs:
   - `docs/problems/date-format.*`
   - `packages/solvejs-date/README.md`
11. Added high-cardinality benchmark scenario for list transforms:
   - `benchmarks/index.mjs` (`100k` and `250k`)
   - `docs/guides/performance-and-size.*`

## Next highest-value items

1. `P2` Add endpoint-tier token-cost cookbook examples for token-bucket limiter.
