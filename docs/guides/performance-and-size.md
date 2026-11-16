# SolveJS Performance and Size Report

Generated on 2026-11-16.

## Benchmark Snapshot

- date.formatDate: 22.48ms for 100.000 iterations
- string.toKebabCase: 46.17ms for 100.000 iterations
- list.unique: 10.20ms for 100.000 iterations
- numbers.percent: 2.38ms for 100.000 iterations
- validators.isCellphoneNumber: 13.50ms for 100.000 iterations
- url.buildUrl: 188.18ms for 100.000 iterations
- url.stringifyQuery: 46.11ms for 100.000 iterations
- url.parseQuery: 82.41ms for 100.000 iterations
- cache.stableKey: 168.23ms for 100.000 iterations
- json.stableStringify: 119.55ms for 100.000 iterations
- json.safeJsonParse: 23.71ms for 100.000 iterations
- json.deepClone: 38.92ms for 100.000 iterations
- json.deepEqual: 39.42ms for 100.000 iterations
- pagination.offsetToCursor: 1.27ms for 100.000 iterations
- semver.parseVersion: 63.19ms for 100.000 iterations
- semver.satisfies: 145.90ms for 100.000 iterations
- semver.compareVersions: 42.57ms for 100.000 iterations
- errors.createError: 675.83ms for 100.000 iterations
- errors.normalizeError: 1108.42ms for 100.000 iterations
- errors.serializeError: 1726.43ms for 100.000 iterations
- money.fromDecimal: 15.48ms for 100.000 iterations
- money.addMoney: 23.30ms for 100.000 iterations
- money.percentageOf: 39.02ms for 100.000 iterations
- http.calculateBackoffDelay: 21.49ms for 100.000 iterations
- http.parseContentType: 86.90ms for 100.000 iterations
- http.negotiateContentType: 57.17ms for 100.000 iterations
- cache.createLruCache.get (10000): 0.22ms for 1 iterations
- cache.createTtlCache.get (10000): 0.10ms for 1 iterations
- cache.createLruCache.get (100000): 0.01ms for 1 iterations
- cache.createTtlCache.get (100000): 0.00ms for 1 iterations
- list.uniqueBy (10000): 1.29ms for 1 iterations
- list.groupBy (10000): 1.21ms for 1 iterations
- list.sortBy (10000): 0.57ms for 1 iterations
- list.uniqueBy (100000): 13.00ms for 1 iterations
- list.groupBy (100000): 9.41ms for 1 iterations
- list.sortBy (100000): 2.52ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 34.93ms for 1 iterations
- list.groupBy high-cardinality (100000): 29.14ms for 1 iterations
- list.sortBy high-cardinality (100000): 12.19ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 115.25ms for 1 iterations
- list.groupBy high-cardinality (250000): 67.58ms for 1 iterations
- list.sortBy high-cardinality (250000): 37.38ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 53.11% | 51.75% | 44.76% |
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
| @jdsalasc/solvejs-pdf | 86.34% | 78.82% | 89.61% |
| @jdsalasc/solvejs-regex | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-schema | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-semver | 100.00% | 99.51% | 100.00% |
| @jdsalasc/solvejs-string | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-url | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-validators | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-xlsx | 91.56% | 80.35% | 95.70% |

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.12.4 | 3.93 KB | 14.89 KB | 7 |
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
| @jdsalasc/solvejs-pagination | 0.2.1 | 7.06 KB | 41.46 KB | 7 |
| @jdsalasc/solvejs-pdf | 0.1.4 | 94.60 KB | 561.10 KB | 87 |
| @jdsalasc/solvejs-regex | 1.10.0 | 3.33 KB | 12.89 KB | 7 |
| @jdsalasc/solvejs-schema | 1.10.0 | 9.24 KB | 58.50 KB | 7 |
| @jdsalasc/solvejs-semver | 0.2.1 | 12.09 KB | 76.02 KB | 7 |
| @jdsalasc/solvejs-string | 1.10.1 | 4.08 KB | 18.87 KB | 7 |
| @jdsalasc/solvejs-url | 0.2.1 | 7.70 KB | 38.66 KB | 7 |
| @jdsalasc/solvejs-validators | 1.10.0 | 13.64 KB | 98.40 KB | 7 |
| @jdsalasc/solvejs-xlsx | 0.2.4 | 139.34 KB | 723.61 KB | 102 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
