# SolveJS Performance and Size Report

Generated on 2026-11-17.

## Benchmark Snapshot

- date.formatDate: 20.57ms for 100.000 iterations
- string.toKebabCase: 39.19ms for 100.000 iterations
- list.unique: 6.64ms for 100.000 iterations
- numbers.percent: 2.34ms for 100.000 iterations
- validators.isCellphoneNumber: 7.13ms for 100.000 iterations
- url.buildUrl: 110.74ms for 100.000 iterations
- url.stringifyQuery: 35.98ms for 100.000 iterations
- url.parseQuery: 70.39ms for 100.000 iterations
- cache.stableKey: 137.11ms for 100.000 iterations
- json.stableStringify: 96.33ms for 100.000 iterations
- json.safeJsonParse: 21.99ms for 100.000 iterations
- json.deepClone: 31.50ms for 100.000 iterations
- json.deepEqual: 32.52ms for 100.000 iterations
- pagination.offsetToCursor: 0.91ms for 100.000 iterations
- semver.parseVersion: 45.20ms for 100.000 iterations
- semver.satisfies: 113.00ms for 100.000 iterations
- semver.compareVersions: 36.93ms for 100.000 iterations
- errors.createError: 494.94ms for 100.000 iterations
- errors.normalizeError: 855.54ms for 100.000 iterations
- errors.serializeError: 1010.04ms for 100.000 iterations
- money.fromDecimal: 16.65ms for 100.000 iterations
- money.addMoney: 26.92ms for 100.000 iterations
- money.percentageOf: 44.12ms for 100.000 iterations
- http.calculateBackoffDelay: 25.89ms for 100.000 iterations
- http.parseContentType: 88.70ms for 100.000 iterations
- http.negotiateContentType: 60.48ms for 100.000 iterations
- cache.createLruCache.get (10000): 0.09ms for 1 iterations
- cache.createTtlCache.get (10000): 0.03ms for 1 iterations
- cache.createLruCache.get (100000): 0.01ms for 1 iterations
- cache.createTtlCache.get (100000): 0.00ms for 1 iterations
- list.uniqueBy (10000): 1.06ms for 1 iterations
- list.groupBy (10000): 1.02ms for 1 iterations
- list.sortBy (10000): 0.45ms for 1 iterations
- list.uniqueBy (100000): 7.26ms for 1 iterations
- list.groupBy (100000): 8.34ms for 1 iterations
- list.sortBy (100000): 2.15ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 24.22ms for 1 iterations
- list.groupBy high-cardinality (100000): 20.18ms for 1 iterations
- list.sortBy high-cardinality (100000): 7.09ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 76.49ms for 1 iterations
- list.groupBy high-cardinality (250000): 42.17ms for 1 iterations
- list.sortBy high-cardinality (250000): 21.00ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 44.63% | 50.79% | 37.91% |
| @jdsalasc/solvejs-async | 100.00% | 99.12% | 100.00% |
| @jdsalasc/solvejs-cache | 100.00% | 98.72% | 98.28% |
| @jdsalasc/solvejs-constants | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-date | 97.57% | 93.51% | 100.00% |
| @jdsalasc/solvejs-env | 100.00% | 99.17% | 100.00% |
| @jdsalasc/solvejs-errors | 100.00% | 91.26% | 95.83% |
| @jdsalasc/solvejs-http | 94.87% | 89.01% | 100.00% |
| @jdsalasc/solvejs-id | 94.27% | 85.48% | 95.65% |
| @jdsalasc/solvejs-json | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-list | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-money | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-numbers | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-objects | 99.13% | 95.71% | 100.00% |
| @jdsalasc/solvejs-pagination | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-pdf | 87.77% | 75.46% | 91.75% |
| @jdsalasc/solvejs-regex | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-schema | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-semver | 100.00% | 99.53% | 100.00% |
| @jdsalasc/solvejs-string | 100.00% | 98.08% | 100.00% |
| @jdsalasc/solvejs-url | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-validators | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-xlsx | 91.54% | 80.23% | 95.82% |

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.15.1 | 4.54 KB | 20.52 KB | 8 |
| @jdsalasc/solvejs-async | 1.11.0 | 11.01 KB | 66.11 KB | 8 |
| @jdsalasc/solvejs-cache | 0.3.1 | 12.71 KB | 77.39 KB | 8 |
| @jdsalasc/solvejs-constants | 1.10.1 | 3.54 KB | 14.56 KB | 8 |
| @jdsalasc/solvejs-date | 1.11.0 | 12.40 KB | 82.46 KB | 8 |
| @jdsalasc/solvejs-env | 1.10.1 | 7.25 KB | 51.35 KB | 8 |
| @jdsalasc/solvejs-errors | 0.2.2 | 11.08 KB | 55.61 KB | 8 |
| @jdsalasc/solvejs-http | 0.3.0 | 16.21 KB | 93.24 KB | 8 |
| @jdsalasc/solvejs-id | 0.1.0 | 7.50 KB | 39.93 KB | 14 |
| @jdsalasc/solvejs-json | 0.3.0 | 12.47 KB | 73.31 KB | 8 |
| @jdsalasc/solvejs-list | 1.11.1 | 5.40 KB | 36.87 KB | 8 |
| @jdsalasc/solvejs-money | 0.3.0 | 12.42 KB | 72.27 KB | 8 |
| @jdsalasc/solvejs-numbers | 1.11.1 | 9.08 KB | 60.35 KB | 8 |
| @jdsalasc/solvejs-objects | 1.11.0 | 6.61 KB | 38.14 KB | 8 |
| @jdsalasc/solvejs-pagination | 0.2.2 | 7.75 KB | 47.67 KB | 8 |
| @jdsalasc/solvejs-pdf | 0.1.14 | 190.63 KB | 1142.03 KB | 152 |
| @jdsalasc/solvejs-regex | 1.10.1 | 3.45 KB | 15.03 KB | 8 |
| @jdsalasc/solvejs-schema | 1.10.1 | 10.19 KB | 63.94 KB | 8 |
| @jdsalasc/solvejs-semver | 0.3.1 | 13.24 KB | 86.05 KB | 8 |
| @jdsalasc/solvejs-string | 1.11.0 | 5.44 KB | 32.34 KB | 8 |
| @jdsalasc/solvejs-url | 0.2.2 | 8.18 KB | 43.07 KB | 8 |
| @jdsalasc/solvejs-validators | 1.11.0 | 19.89 KB | 128.30 KB | 8 |
| @jdsalasc/solvejs-xlsx | 0.3.3 | 159.45 KB | 816.40 KB | 128 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
