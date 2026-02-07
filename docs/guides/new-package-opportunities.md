# New Package Opportunities

Updated on 2026-02-07.

## 1) `@jdsalasc/solvejs-env` (High priority)

- Problem: teams repeatedly reimplement env parsing/validation for booleans, numbers, enums, and required keys.
- Potential utilities:
  - `getEnvString`, `getEnvNumber`, `getEnvBoolean`
  - `getEnvEnum`
  - `validateRequiredEnv`
- Value: safer startup checks for backend apps with zero dependencies.

## 2) `@jdsalasc/solvejs-cache` (Medium priority)

- Problem: repeated TTL/map cache boilerplate for API clients and expensive transforms.
- Potential utilities:
  - `createTtlCache`
  - `memoizeAsync`
  - `invalidateByPrefix`
- Value: predictable caching patterns without external cache helpers.

## 3) `@jdsalasc/solvejs-json` (Medium priority)

- Problem: unsafe JSON parsing and normalization in API boundaries.
- Potential utilities:
  - `safeJsonParse`
  - `safeJsonStringify`
  - `pickJsonKeys`
- Value: fewer runtime crashes and clearer error handling on payload transforms.

## Recommendation

Build `solvejs-env` first. It has high practical demand, small API surface, and clear adoption value for Node/edge deployments.
