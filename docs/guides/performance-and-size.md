# SolveJS Performance and Size Report

Generated on 2026-11-17.

## Benchmark Snapshot

- date.formatDate: 45.74ms for 100.000 iterations
- string.toKebabCase: 156.36ms for 100.000 iterations
- list.unique: 16.00ms for 100.000 iterations
- numbers.percent: 3.02ms for 100.000 iterations
- validators.isCellphoneNumber: 14.09ms for 100.000 iterations
- url.buildUrl: 223.28ms for 100.000 iterations
- url.stringifyQuery: 74.75ms for 100.000 iterations
- url.parseQuery: 120.24ms for 100.000 iterations
- cache.stableKey: 307.86ms for 100.000 iterations
- json.stableStringify: 342.04ms for 100.000 iterations
- json.safeJsonParse: 41.11ms for 100.000 iterations
- json.deepClone: 70.73ms for 100.000 iterations
- json.deepEqual: 87.55ms for 100.000 iterations
- pagination.offsetToCursor: 5.66ms for 100.000 iterations
- semver.parseVersion: 111.25ms for 100.000 iterations
- semver.satisfies: 290.49ms for 100.000 iterations
- semver.compareVersions: 107.34ms for 100.000 iterations
- errors.createError: 1013.71ms for 100.000 iterations
- errors.normalizeError: 1663.08ms for 100.000 iterations
- errors.serializeError: 1671.71ms for 100.000 iterations
- money.fromDecimal: 17.75ms for 100.000 iterations
- money.addMoney: 27.42ms for 100.000 iterations
- money.percentageOf: 42.32ms for 100.000 iterations
- http.calculateBackoffDelay: 26.57ms for 100.000 iterations
- http.parseContentType: 96.53ms for 100.000 iterations
- http.negotiateContentType: 53.36ms for 100.000 iterations
- cache.createLruCache.get (10000): 0.20ms for 1 iterations
- cache.createTtlCache.get (10000): 0.06ms for 1 iterations
- cache.createLruCache.get (100000): 0.01ms for 1 iterations
- cache.createTtlCache.get (100000): 0.00ms for 1 iterations
- list.uniqueBy (10000): 1.06ms for 1 iterations
- list.groupBy (10000): 1.06ms for 1 iterations
- list.sortBy (10000): 0.54ms for 1 iterations
- list.uniqueBy (100000): 8.09ms for 1 iterations
- list.groupBy (100000): 10.50ms for 1 iterations
- list.sortBy (100000): 3.13ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 20.80ms for 1 iterations
- list.groupBy high-cardinality (100000): 17.80ms for 1 iterations
- list.sortBy high-cardinality (100000): 14.40ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 63.78ms for 1 iterations
- list.groupBy high-cardinality (250000): 41.37ms for 1 iterations
- list.sortBy high-cardinality (250000): 35.32ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 44.52% | 51.01% | 38.39% |
| @jdsalasc/solvejs-async | 100.00% | 99.05% | 100.00% |
| @jdsalasc/solvejs-cache | 100.00% | 100.00% | 100.00% |
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
| @jdsalasc/solvejs-objects | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-pagination | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-pdf | 87.77% | 75.50% | 91.75% |
| @jdsalasc/solvejs-regex | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-schema | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-semver | 100.00% | 99.51% | 100.00% |
| @jdsalasc/solvejs-string | 100.00% | 98.08% | 100.00% |
| @jdsalasc/solvejs-url | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-validators | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-xlsx | 91.54% | 80.23% | 95.82% |

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.13.0 | 4.53 KB | 20.52 KB | 8 |
| @jdsalasc/solvejs-async | 1.10.1 | 10.16 KB | 61.75 KB | 8 |
| @jdsalasc/solvejs-cache | 0.2.2 | 11.20 KB | 67.20 KB | 8 |
| @jdsalasc/solvejs-constants | 1.10.1 | 3.54 KB | 14.56 KB | 8 |
| @jdsalasc/solvejs-date | 1.11.0 | 12.40 KB | 82.39 KB | 8 |
| @jdsalasc/solvejs-env | 1.10.1 | 7.25 KB | 51.35 KB | 8 |
| @jdsalasc/solvejs-errors | 0.2.2 | 11.08 KB | 55.61 KB | 8 |
| @jdsalasc/solvejs-http | 0.3.0 | 16.20 KB | 93.17 KB | 8 |
| @jdsalasc/solvejs-id | 0.1.0 | 7.50 KB | 39.93 KB | 14 |
| @jdsalasc/solvejs-json | 0.3.0 | 12.46 KB | 73.24 KB | 8 |
| @jdsalasc/solvejs-list | 1.10.1 | 4.94 KB | 30.47 KB | 8 |
| @jdsalasc/solvejs-money | 0.2.2 | 11.73 KB | 67.77 KB | 8 |
| @jdsalasc/solvejs-numbers | 1.10.1 | 7.69 KB | 53.44 KB | 8 |
| @jdsalasc/solvejs-objects | 1.10.1 | 5.28 KB | 27.25 KB | 8 |
| @jdsalasc/solvejs-pagination | 0.2.2 | 7.75 KB | 47.67 KB | 8 |
| @jdsalasc/solvejs-pdf | 0.1.14 | 190.63 KB | 1142.03 KB | 152 |
| @jdsalasc/solvejs-regex | 1.10.1 | 3.45 KB | 15.03 KB | 8 |
| @jdsalasc/solvejs-schema | 1.10.1 | 10.19 KB | 63.94 KB | 8 |
| @jdsalasc/solvejs-semver | 0.2.2 | 12.58 KB | 81.23 KB | 8 |
| @jdsalasc/solvejs-string | 1.11.0 | 5.43 KB | 32.27 KB | 8 |
| @jdsalasc/solvejs-url | 0.2.2 | 8.18 KB | 43.07 KB | 8 |
| @jdsalasc/solvejs-validators | 1.10.1 | 17.14 KB | 108.86 KB | 8 |
| @jdsalasc/solvejs-xlsx | 0.3.3 | 159.45 KB | 816.40 KB | 128 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
