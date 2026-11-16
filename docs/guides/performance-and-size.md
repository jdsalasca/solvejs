# SolveJS Performance and Size Report

Generated on 2026-11-16.

## Benchmark Snapshot

- date.formatDate: 35.31ms for 100.000 iterations
- string.toKebabCase: 93.77ms for 100.000 iterations
- list.unique: 46.26ms for 100.000 iterations
- numbers.percent: 2.33ms for 100.000 iterations
- validators.isCellphoneNumber: 64.10ms for 100.000 iterations
- url.buildUrl: 314.23ms for 100.000 iterations
- url.stringifyQuery: 80.21ms for 100.000 iterations
- url.parseQuery: 65.56ms for 100.000 iterations
- cache.stableKey: 329.48ms for 100.000 iterations
- json.stableStringify: 222.65ms for 100.000 iterations
- json.safeJsonParse: 32.94ms for 100.000 iterations
- json.deepClone: 55.27ms for 100.000 iterations
- json.deepEqual: 76.67ms for 100.000 iterations
- pagination.offsetToCursor: 5.24ms for 100.000 iterations
- semver.parseVersion: 109.66ms for 100.000 iterations
- semver.satisfies: 246.74ms for 100.000 iterations
- semver.compareVersions: 66.03ms for 100.000 iterations
- errors.createError: 1102.02ms for 100.000 iterations
- errors.normalizeError: 3418.98ms for 100.000 iterations
- errors.serializeError: 3640.65ms for 100.000 iterations
- money.fromDecimal: 24.21ms for 100.000 iterations
- money.addMoney: 38.10ms for 100.000 iterations
- money.percentageOf: 20.61ms for 100.000 iterations
- http.calculateBackoffDelay: 33.63ms for 100.000 iterations
- http.parseContentType: 97.93ms for 100.000 iterations
- http.negotiateContentType: 58.92ms for 100.000 iterations
- cache.createLruCache.get (10000): 0.24ms for 1 iterations
- cache.createTtlCache.get (10000): 0.06ms for 1 iterations
- cache.createLruCache.get (100000): 0.01ms for 1 iterations
- cache.createTtlCache.get (100000): 0.00ms for 1 iterations
- list.uniqueBy (10000): 3.19ms for 1 iterations
- list.groupBy (10000): 1.83ms for 1 iterations
- list.sortBy (10000): 0.96ms for 1 iterations
- list.uniqueBy (100000): 12.55ms for 1 iterations
- list.groupBy (100000): 11.43ms for 1 iterations
- list.sortBy (100000): 7.37ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 55.44ms for 1 iterations
- list.groupBy high-cardinality (100000): 65.44ms for 1 iterations
- list.sortBy high-cardinality (100000): 33.23ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 282.37ms for 1 iterations
- list.groupBy high-cardinality (250000): 114.33ms for 1 iterations
- list.sortBy high-cardinality (250000): 66.04ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 46.84% | 50.66% | 34.70% |
| @jdsalasc/solvejs-async | 100.00% | 99.05% | 100.00% |
| @jdsalasc/solvejs-cache | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-constants | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-date | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-env | 100.00% | 99.16% | 100.00% |
| @jdsalasc/solvejs-errors | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-http | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-json | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-list | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-money | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-numbers | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-objects | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-pagination | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-pdf | 86.08% | 78.25% | 89.47% |
| @jdsalasc/solvejs-regex | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-schema | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-semver | 100.00% | 99.51% | 100.00% |
| @jdsalasc/solvejs-string | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-url | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-validators | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-xlsx | 91.90% | 79.79% | 95.61% |

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.12.2 | 3.88 KB | 14.67 KB | 7 |
| @jdsalasc/solvejs-async | 1.10.0 | 9.56 KB | 56.80 KB | 7 |
| @jdsalasc/solvejs-cache | 0.2.0 | 10.31 KB | 59.87 KB | 7 |
| @jdsalasc/solvejs-constants | 1.10.0 | 3.41 KB | 12.35 KB | 7 |
| @jdsalasc/solvejs-date | 1.10.0 | 7.58 KB | 45.97 KB | 7 |
| @jdsalasc/solvejs-env | 1.10.0 | 6.58 KB | 45.68 KB | 7 |
| @jdsalasc/solvejs-errors | 0.2.0 | 8.35 KB | 41.62 KB | 7 |
| @jdsalasc/solvejs-http | 0.2.0 | 10.39 KB | 53.14 KB | 7 |
| @jdsalasc/solvejs-json | 0.2.0 | 9.81 KB | 54.65 KB | 7 |
| @jdsalasc/solvejs-list | 1.10.0 | 4.79 KB | 26.68 KB | 7 |
| @jdsalasc/solvejs-money | 0.2.0 | 10.80 KB | 59.81 KB | 7 |
| @jdsalasc/solvejs-numbers | 1.10.0 | 7.25 KB | 46.78 KB | 7 |
| @jdsalasc/solvejs-objects | 1.10.0 | 5.14 KB | 24.76 KB | 7 |
| @jdsalasc/solvejs-pagination | 0.2.0 | 7.02 KB | 40.85 KB | 7 |
| @jdsalasc/solvejs-pdf | 0.1.2 | 86.29 KB | 534.01 KB | 87 |
| @jdsalasc/solvejs-regex | 1.10.0 | 3.33 KB | 12.89 KB | 7 |
| @jdsalasc/solvejs-schema | 1.10.0 | 9.24 KB | 58.50 KB | 7 |
| @jdsalasc/solvejs-semver | 0.2.0 | 12.03 KB | 75.60 KB | 7 |
| @jdsalasc/solvejs-string | 1.10.0 | 4.04 KB | 18.85 KB | 7 |
| @jdsalasc/solvejs-url | 0.2.0 | 7.56 KB | 37.97 KB | 7 |
| @jdsalasc/solvejs-validators | 1.10.0 | 13.64 KB | 98.40 KB | 7 |
| @jdsalasc/solvejs-xlsx | 0.2.2 | 130.47 KB | 678.79 KB | 102 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
