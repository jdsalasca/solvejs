# SolveJS Package Health Report

Updated on 2026-10-03 (revalidated after the v1.9.0 trust-and-breadth cycle).

This report lists each package, its practical utilities, current status, known issues, weak points, and next improvements.

## Test Trust

16 packages, 273 test blocks. The minimum for each package is derived
from its exported function count by `npm run test:baseline`.

| Package | Function exports | Test blocks | Line coverage |
|---|---|---|---|
| `@jdsalasc/solvejs` | 0 (re-exports) | 1 | 48.83% |
| `@jdsalasc/solvejs-async` | 10 | 21 | 100.00% |
| `@jdsalasc/solvejs-cache` | 5 | 28 | 100.00% |
| `@jdsalasc/solvejs-constants` | 1 | 9 | 100.00% |
| `@jdsalasc/solvejs-date` | 18 | 23 | 100.00% |
| `@jdsalasc/solvejs-env` | 10 | 24 | 100.00% |
| `@jdsalasc/solvejs-json` | 9 | 20 | 100.00% |
| `@jdsalasc/solvejs-list` | 12 | 13 | 100.00% |
| `@jdsalasc/solvejs-numbers` | 16 | 16 | 100.00% |
| `@jdsalasc/solvejs-objects` | 7 | 9 | 100.00% |
| `@jdsalasc/solvejs-pagination` | 8 | 15 | 100.00% |
| `@jdsalasc/solvejs-regex` | 5 | 15 | 100.00% |
| `@jdsalasc/solvejs-schema` | 1 | 15 | 100.00% |
| `@jdsalasc/solvejs-string` | 9 | 10 | 100.00% |
| `@jdsalasc/solvejs-url` | 8 | 17 | 100.00% |
| `@jdsalasc/solvejs-validators` | 31 | 37 | 100.00% |

## Package Status

One row per package, refreshed by hand as behaviour changes.

| Package | Practical utilities | Current status | Known issues | Weak points | Next improvements |
|---|---|---|---|---|---|
| `@jdsalasc/solvejs` | Single import surface for all SolveJS domains. | 1.9.0 in repo, 157 test blocks, tests passing locally. | None critical identified. | Re-export aggregate coverage reads low for the reason above. | Publish per-package coverage badges rather than one workspace figure. |
| `@jdsalasc/solvejs-date` | `parseDateStrict`, `parseIsoDate`, `parseUnixTimestamp`, `formatDate`, `addDays`, `diffInDays`, business-day helpers. | 1.9.0, 19 test blocks. | `parseIsoDate` is lenient and inherits `new Date()` rollover and M/D/Y parsing; documented. | Day math reads the UTC calendar of the input `Date`, so local-midnight inputs shift a day in eastern timezones. | Consider an explicit local-calendar option in a future major. |
| `@jdsalasc/solvejs-string` | `slugify`, `stripHtml`, `truncate`, `mask`, casing helpers. | 1.9.0, 100% line coverage. | None critical identified. | Acronym runs are not split by the casing helpers; documented. | Locale-specific casing caveats once a second locale is requested. |
| `@jdsalasc/solvejs-list` | `unique`, `uniqueBy`, `chunk`, `groupBy`, `countBy`, `pluck`, `partition`, `sortBy`. | 1.9.0, 98.93% line coverage. | None critical identified. | `intersection` and `difference` keep left-hand duplicates, unlike lodash; documented. | Keep the lodash comparison page in sync with that note. |
| `@jdsalasc/solvejs-regex` | `REGEX_PATTERNS`, `validateByName`, `validateWithPattern`, `escapeRegex`, `literalRegex`. | 1.9.0, 100% line coverage. | None critical identified. | Pattern catalogue is deliberately small. | Add patterns only together with a false-positive example. |
| `@jdsalasc/solvejs-constants` | `TIME`, `FILE_SIZE_BYTES`, `HTTP_METHODS`, `HTTP_STATUS`, `CONTENT_TYPES`, `parseBooleanString`. | 1.9.0, 100% line coverage. | `parseBooleanString` throws on an unrecognised value; documented. | None blocking. | Nothing queued. |
| `@jdsalasc/solvejs-numbers` | `toNumber`, `safeDivide`, `percentChange`, `toCurrency`, `roundTo`, `clamp`, tax and discount helpers. | 1.9.0, 100% line coverage. | None critical identified. | `roundTo` is asymmetric on exact negative halfway values; documented. | Add worked financial examples. |
| `@jdsalasc/solvejs-validators` | Structured validators (`validate*` + `is*`) for phone, postal, username, URL, UUID, IPv4, ISO date, plus EN/ES/PT translation. | 1.9.0, 32 test blocks, 98.37% line coverage. | Two misspelled aliases kept for backward compatibility, covered by drift tests. | Country coverage is broad but still not global. | Continue expansion with prioritised country sets. |
| `@jdsalasc/solvejs-objects` | `pick`, `omit`, `hasOwn`, `get`, `set`, `mapValues`, `deepMerge`. | 1.9.0, 98.76% line coverage. | `set` mutates in place and returns the same reference, unlike `_.set`; documented. | Paths are dot-only, so a literal dotted key is unreachable by path. | Consider a bracket-notation option in a future major. |
| `@jdsalasc/solvejs-async` | `sleep`, `timeout`, `timeoutFallback`, `retry`, `pMap`, `debouncePromise`, `throttlePromise`, `createTaskQueue`, `createRateLimiter`, `createTokenBucketLimiter`. | 1.9.0, 10 test blocks, 93.65% line coverage. | None critical identified. | Lowest coverage of the leaf packages, mostly in the limiter error branches. | Next trust target: raise above 95%. |
| `@jdsalasc/solvejs-env` | `getEnvString`, `getEnvNumber`, `getEnvBoolean`, `getEnvObject`, `getEnvUrl`, `getEnvDsn`, `validateRequiredEnv`. | 1.9.0, 10 test blocks, 90.70% line coverage. | None critical identified. | Second-lowest coverage, in the optional-URL and DSN branches. | Next trust target: raise above 95%. |
| `@jdsalasc/solvejs-schema` | `s` builders for string, number, boolean, literal, array, object, union and refine; `safeParse`, `toJsonSchema`, `SchemaError`. | 1.9.0, 86.94% line coverage, the lowest of the leaf packages. | `safeParse` is fail-fast and returns one issue; documented. | Array bounds and coercion branches are under-tested. | Next trust target: raise above 95%. |
| `@jdsalasc/solvejs-url` | `buildUrl`, `joinUrl`, `stringifyQuery`, `parseQuery`, `withQuery`, `omitQuery`, `getUrlParam`, `replacePathParam`, `UrlError`. | 0.1.0, 17 test blocks, 100.00% line coverage, not yet published to npm. | None critical identified. | New, so no battle-testing yet. | Publish 0.1.0 once the meta package reaches a release. |
| `@jdsalasc/solvejs-cache` | `stableKey`, `createTtlCache`, `createLruCache`, `memoizeAsync`, `createStaleWhileRevalidate`, `CacheError`. | 0.1.0, 28 test blocks, 100.00% line coverage, not yet published to npm. | None critical identified. | New, so no battle-testing yet. | Publish 0.1.0 once the meta package reaches a release. |
| `@jdsalasc/solvejs-json` | `safeJsonParse`, `safeJsonStringify`, `stableStringify`, `deepClone`, `deepEqual`, `jsonMerge`, `pickJsonKeys`, `omitJsonKeys`, `getOrDefault`, `JsonError`. | 0.1.0, 20 test blocks, 100.00% line coverage, not yet published to npm. | None critical identified. | New, so no battle-testing yet. | Publish 0.1.0 once the meta package reaches a release. |
| `@jdsalasc/solvejs-pagination` | `pageToOffset`, `offsetToPage`, `pageCount`, `clampPage`, `offsetToCursor`, `cursorToOffset`, `paginate`, `withPagination`, `PaginationError`. | 0.1.0, 15 test blocks, 100.00% line coverage, not yet published to npm. | None critical identified. | New, so no battle-testing yet. | Publish 0.1.0 once the meta package reaches a release. |

## Cross-Package Gaps

- README examples are still light on "limitations and edge cases" per utility for the newest packages.
- Coverage is measured and published but not gated; a threshold is a maintainer decision.
- Bundle-size figures live in the root README but not on the individual npm package pages.

## Priority Order

1. Raise `solvejs-schema`, `solvejs-env`, and `solvejs-async` coverage above 95%.
2. Add the breadth packages queued in `docs/superpowers/plans`: cache, json, pagination, semver, errors, money, http.
3. Add a limitations section to any package README that lacks one.
4. Decide whether coverage becomes a gating threshold.
