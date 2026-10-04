# SolveJS Performance and Size Report

Generated on 2026-10-04.

## Benchmark Snapshot

- date.formatDate: 42.34ms for 100.000 iterations
- string.toKebabCase: 77.95ms for 100.000 iterations
- list.unique: 16.91ms for 100.000 iterations
- numbers.percent: 3.91ms for 100.000 iterations
- validators.isCellphoneNumber: 11.89ms for 100.000 iterations
- url.buildUrl: 256.14ms for 100.000 iterations
- url.stringifyQuery: 63.65ms for 100.000 iterations
- url.parseQuery: 55.05ms for 100.000 iterations
- cache.stableKey: 250.40ms for 100.000 iterations
- json.stableStringify: 237.08ms for 100.000 iterations
- json.safeJsonParse: 37.43ms for 100.000 iterations
- json.deepClone: 55.84ms for 100.000 iterations
- json.deepEqual: 88.63ms for 100.000 iterations
- pagination.offsetToCursor: 1.72ms for 100.000 iterations
- semver.parseVersion: 87.09ms for 100.000 iterations
- semver.satisfies: 238.37ms for 100.000 iterations
- semver.compareVersions: 90.87ms for 100.000 iterations
- errors.createError: 1196.83ms for 100.000 iterations
- errors.normalizeError: 2267.07ms for 100.000 iterations
- errors.serializeError: 3661.68ms for 100.000 iterations
- money.fromDecimal: 39.22ms for 100.000 iterations
- money.addMoney: 37.27ms for 100.000 iterations
- money.percentageOf: 24.31ms for 100.000 iterations
- http.calculateBackoffDelay: 50.92ms for 100.000 iterations
- http.parseContentType: 87.02ms for 100.000 iterations
- http.negotiateContentType: 85.50ms for 100.000 iterations
- cache.createLruCache.get (10000): 0.11ms for 1 iterations
- cache.createTtlCache.get (10000): 0.11ms for 1 iterations
- cache.createLruCache.get (100000): 0.02ms for 1 iterations
- cache.createTtlCache.get (100000): 0.01ms for 1 iterations
- list.uniqueBy (10000): 1.68ms for 1 iterations
- list.groupBy (10000): 12.69ms for 1 iterations
- list.sortBy (10000): 0.70ms for 1 iterations
- list.uniqueBy (100000): 25.56ms for 1 iterations
- list.groupBy (100000): 28.33ms for 1 iterations
- list.sortBy (100000): 17.67ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 66.23ms for 1 iterations
- list.groupBy high-cardinality (100000): 50.91ms for 1 iterations
- list.sortBy high-cardinality (100000): 28.19ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 215.18ms for 1 iterations
- list.groupBy high-cardinality (250000): 148.83ms for 1 iterations
- list.sortBy high-cardinality (250000): 60.82ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 56.85% | 52.85% | 32.62% |
| @jdsalasc/solvejs-async | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-cache | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-constants | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-date | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-env | 100.00% | 99.18% | 100.00% |
| @jdsalasc/solvejs-errors | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-http | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-json | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-list | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-money | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-numbers | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-objects | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-pagination | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-regex | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-schema | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-semver | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-string | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-url | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-validators | 100.00% | 100.00% | 100.00% |

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.9.0 | 2.62 KB | 8.48 KB | 7 |
| @jdsalasc/solvejs-async | 1.9.0 | 9.11 KB | 53.21 KB | 7 |
| @jdsalasc/solvejs-cache | 0.1.0 | 9.66 KB | 56.02 KB | 7 |
| @jdsalasc/solvejs-constants | 1.9.0 | 3.33 KB | 12.06 KB | 7 |
| @jdsalasc/solvejs-date | 1.9.0 | 7.35 KB | 46.19 KB | 7 |
| @jdsalasc/solvejs-env | 1.9.0 | 6.10 KB | 43.97 KB | 7 |
| @jdsalasc/solvejs-errors | 0.1.0 | 8.07 KB | 40.66 KB | 7 |
| @jdsalasc/solvejs-http | 0.1.0 | 9.66 KB | 48.11 KB | 7 |
| @jdsalasc/solvejs-json | 0.1.0 | 8.87 KB | 48.82 KB | 7 |
| @jdsalasc/solvejs-list | 1.9.0 | 4.70 KB | 26.32 KB | 7 |
| @jdsalasc/solvejs-money | 0.1.0 | 10.24 KB | 56.22 KB | 7 |
| @jdsalasc/solvejs-numbers | 1.9.0 | 6.94 KB | 45.38 KB | 7 |
| @jdsalasc/solvejs-objects | 1.9.0 | 5.03 KB | 24.44 KB | 7 |
| @jdsalasc/solvejs-pagination | 0.1.0 | 6.82 KB | 39.91 KB | 7 |
| @jdsalasc/solvejs-regex | 1.9.0 | 3.09 KB | 11.87 KB | 7 |
| @jdsalasc/solvejs-schema | 1.9.0 | 8.60 KB | 55.32 KB | 7 |
| @jdsalasc/solvejs-semver | 0.1.0 | 11.33 KB | 72.10 KB | 7 |
| @jdsalasc/solvejs-string | 1.9.0 | 3.93 KB | 18.52 KB | 7 |
| @jdsalasc/solvejs-url | 0.1.0 | 7.38 KB | 37.35 KB | 7 |
| @jdsalasc/solvejs-validators | 1.9.0 | 10.71 KB | 82.55 KB | 7 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
