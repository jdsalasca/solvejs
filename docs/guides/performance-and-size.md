# SolveJS Performance and Size Report

Generated on 2026-11-16.

## Benchmark Snapshot

- date.formatDate: 39.09ms for 100.000 iterations
- string.toKebabCase: 95.76ms for 100.000 iterations
- list.unique: 21.86ms for 100.000 iterations
- numbers.percent: 5.70ms for 100.000 iterations
- validators.isCellphoneNumber: 15.02ms for 100.000 iterations
- url.buildUrl: 284.48ms for 100.000 iterations
- url.stringifyQuery: 83.24ms for 100.000 iterations
- url.parseQuery: 197.22ms for 100.000 iterations
- cache.stableKey: 325.33ms for 100.000 iterations
- json.stableStringify: 267.56ms for 100.000 iterations
- json.safeJsonParse: 48.98ms for 100.000 iterations
- json.deepClone: 59.19ms for 100.000 iterations
- json.deepEqual: 149.28ms for 100.000 iterations
- pagination.offsetToCursor: 0.97ms for 100.000 iterations
- semver.parseVersion: 109.57ms for 100.000 iterations
- semver.satisfies: 258.43ms for 100.000 iterations
- semver.compareVersions: 73.36ms for 100.000 iterations
- errors.createError: 1248.71ms for 100.000 iterations
- errors.normalizeError: 2078.52ms for 100.000 iterations
- errors.serializeError: 1816.27ms for 100.000 iterations
- money.fromDecimal: 25.46ms for 100.000 iterations
- money.addMoney: 32.34ms for 100.000 iterations
- money.percentageOf: 44.14ms for 100.000 iterations
- http.calculateBackoffDelay: 27.25ms for 100.000 iterations
- http.parseContentType: 111.17ms for 100.000 iterations
- http.negotiateContentType: 64.83ms for 100.000 iterations
- cache.createLruCache.get (10000): 0.12ms for 1 iterations
- cache.createTtlCache.get (10000): 0.05ms for 1 iterations
- cache.createLruCache.get (100000): 0.03ms for 1 iterations
- cache.createTtlCache.get (100000): 0.01ms for 1 iterations
- list.uniqueBy (10000): 1.96ms for 1 iterations
- list.groupBy (10000): 1.78ms for 1 iterations
- list.sortBy (10000): 0.72ms for 1 iterations
- list.uniqueBy (100000): 12.43ms for 1 iterations
- list.groupBy (100000): 13.16ms for 1 iterations
- list.sortBy (100000): 4.12ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 36.55ms for 1 iterations
- list.groupBy high-cardinality (100000): 24.15ms for 1 iterations
- list.sortBy high-cardinality (100000): 15.32ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 100.40ms for 1 iterations
- list.groupBy high-cardinality (250000): 79.30ms for 1 iterations
- list.sortBy high-cardinality (250000): 34.61ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 53.35% | 52.14% | 44.51% |
| @jdsalasc/solvejs-async | 100.00% | 99.05% | 100.00% |
| @jdsalasc/solvejs-cache | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-constants | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-date | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-env | 100.00% | 99.16% | 100.00% |
| @jdsalasc/solvejs-errors | 100.00% | 91.26% | 95.83% |
| @jdsalasc/solvejs-http | 97.68% | 97.60% | 100.00% |
| @jdsalasc/solvejs-json | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-list | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-money | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-numbers | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-objects | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-pagination | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-pdf | 86.17% | 78.40% | 89.47% |
| @jdsalasc/solvejs-regex | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-schema | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-semver | 100.00% | 99.51% | 100.00% |
| @jdsalasc/solvejs-string | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-url | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-validators | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-xlsx | 91.91% | 79.96% | 95.61% |

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.12.3 | 3.89 KB | 14.67 KB | 7 |
| @jdsalasc/solvejs-async | 1.10.0 | 9.56 KB | 56.80 KB | 7 |
| @jdsalasc/solvejs-cache | 0.2.1 | 10.37 KB | 60.58 KB | 7 |
| @jdsalasc/solvejs-constants | 1.10.0 | 3.41 KB | 12.35 KB | 7 |
| @jdsalasc/solvejs-date | 1.10.1 | 8.61 KB | 50.30 KB | 7 |
| @jdsalasc/solvejs-env | 1.10.0 | 6.58 KB | 45.68 KB | 7 |
| @jdsalasc/solvejs-errors | 0.2.1 | 10.10 KB | 48.72 KB | 7 |
| @jdsalasc/solvejs-http | 0.2.1 | 10.84 KB | 56.17 KB | 7 |
| @jdsalasc/solvejs-json | 0.2.0 | 9.81 KB | 54.65 KB | 7 |
| @jdsalasc/solvejs-list | 1.10.0 | 4.79 KB | 26.68 KB | 7 |
| @jdsalasc/solvejs-money | 0.2.1 | 11.03 KB | 60.95 KB | 7 |
| @jdsalasc/solvejs-numbers | 1.10.0 | 7.25 KB | 46.78 KB | 7 |
| @jdsalasc/solvejs-objects | 1.10.0 | 5.14 KB | 24.76 KB | 7 |
| @jdsalasc/solvejs-pagination | 0.2.1 | 7.07 KB | 41.46 KB | 7 |
| @jdsalasc/solvejs-pdf | 0.1.3 | 86.31 KB | 534.18 KB | 87 |
| @jdsalasc/solvejs-regex | 1.10.0 | 3.33 KB | 12.89 KB | 7 |
| @jdsalasc/solvejs-schema | 1.10.0 | 9.24 KB | 58.50 KB | 7 |
| @jdsalasc/solvejs-semver | 0.2.1 | 12.09 KB | 76.02 KB | 7 |
| @jdsalasc/solvejs-string | 1.10.1 | 4.09 KB | 18.87 KB | 7 |
| @jdsalasc/solvejs-url | 0.2.1 | 7.69 KB | 38.66 KB | 7 |
| @jdsalasc/solvejs-validators | 1.10.0 | 13.64 KB | 98.40 KB | 7 |
| @jdsalasc/solvejs-xlsx | 0.2.3 | 130.47 KB | 678.90 KB | 102 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
