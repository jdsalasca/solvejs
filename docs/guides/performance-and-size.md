# SolveJS Performance and Size Report

Generated on 2026-11-17.

## Benchmark Snapshot

- date.formatDate: 20.97ms for 100.000 iterations
- string.toKebabCase: 42.25ms for 100.000 iterations
- list.unique: 6.92ms for 100.000 iterations
- numbers.percent: 1.89ms for 100.000 iterations
- validators.isCellphoneNumber: 8.24ms for 100.000 iterations
- url.buildUrl: 116.62ms for 100.000 iterations
- url.stringifyQuery: 38.66ms for 100.000 iterations
- url.parseQuery: 70.34ms for 100.000 iterations
- cache.stableKey: 148.45ms for 100.000 iterations
- json.stableStringify: 105.07ms for 100.000 iterations
- json.safeJsonParse: 23.17ms for 100.000 iterations
- json.deepClone: 34.46ms for 100.000 iterations
- json.deepEqual: 33.80ms for 100.000 iterations
- pagination.offsetToCursor: 1.02ms for 100.000 iterations
- semver.parseVersion: 47.09ms for 100.000 iterations
- semver.satisfies: 123.28ms for 100.000 iterations
- semver.compareVersions: 38.91ms for 100.000 iterations
- errors.createError: 556.40ms for 100.000 iterations
- errors.normalizeError: 902.18ms for 100.000 iterations
- errors.serializeError: 1120.75ms for 100.000 iterations
- money.fromDecimal: 10.87ms for 100.000 iterations
- money.addMoney: 17.37ms for 100.000 iterations
- money.percentageOf: 28.49ms for 100.000 iterations
- http.calculateBackoffDelay: 17.87ms for 100.000 iterations
- http.parseContentType: 65.13ms for 100.000 iterations
- http.negotiateContentType: 37.10ms for 100.000 iterations
- cache.createLruCache.get (10000): 0.08ms for 1 iterations
- cache.createTtlCache.get (10000): 0.02ms for 1 iterations
- cache.createLruCache.get (100000): 0.01ms for 1 iterations
- cache.createTtlCache.get (100000): 0.00ms for 1 iterations
- list.uniqueBy (10000): 1.19ms for 1 iterations
- list.groupBy (10000): 1.03ms for 1 iterations
- list.sortBy (10000): 0.33ms for 1 iterations
- list.uniqueBy (100000): 5.63ms for 1 iterations
- list.groupBy (100000): 7.52ms for 1 iterations
- list.sortBy (100000): 2.07ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 12.68ms for 1 iterations
- list.groupBy high-cardinality (100000): 12.68ms for 1 iterations
- list.sortBy high-cardinality (100000): 7.56ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 35.89ms for 1 iterations
- list.groupBy high-cardinality (250000): 23.82ms for 1 iterations
- list.sortBy high-cardinality (250000): 21.97ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 44.60% | 51.01% | 38.21% |
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
| @jdsalasc/solvejs-objects | 99.13% | 95.71% | 100.00% |
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
| @jdsalasc/solvejs | 1.14.0 | 4.53 KB | 20.52 KB | 8 |
| @jdsalasc/solvejs-async | 1.10.1 | 10.16 KB | 61.75 KB | 8 |
| @jdsalasc/solvejs-cache | 0.2.2 | 11.20 KB | 67.20 KB | 8 |
| @jdsalasc/solvejs-constants | 1.10.1 | 3.54 KB | 14.56 KB | 8 |
| @jdsalasc/solvejs-date | 1.11.0 | 12.40 KB | 82.46 KB | 8 |
| @jdsalasc/solvejs-env | 1.10.1 | 7.25 KB | 51.35 KB | 8 |
| @jdsalasc/solvejs-errors | 0.2.2 | 11.08 KB | 55.61 KB | 8 |
| @jdsalasc/solvejs-http | 0.3.0 | 16.21 KB | 93.24 KB | 8 |
| @jdsalasc/solvejs-id | 0.1.0 | 7.50 KB | 39.93 KB | 14 |
| @jdsalasc/solvejs-json | 0.3.0 | 12.47 KB | 73.31 KB | 8 |
| @jdsalasc/solvejs-list | 1.10.1 | 4.94 KB | 30.47 KB | 8 |
| @jdsalasc/solvejs-money | 0.2.2 | 11.73 KB | 67.77 KB | 8 |
| @jdsalasc/solvejs-numbers | 1.10.1 | 7.69 KB | 53.44 KB | 8 |
| @jdsalasc/solvejs-objects | 1.11.0 | 6.60 KB | 38.07 KB | 8 |
| @jdsalasc/solvejs-pagination | 0.2.2 | 7.75 KB | 47.67 KB | 8 |
| @jdsalasc/solvejs-pdf | 0.1.14 | 190.63 KB | 1142.03 KB | 152 |
| @jdsalasc/solvejs-regex | 1.10.1 | 3.45 KB | 15.03 KB | 8 |
| @jdsalasc/solvejs-schema | 1.10.1 | 10.19 KB | 63.94 KB | 8 |
| @jdsalasc/solvejs-semver | 0.2.2 | 12.58 KB | 81.23 KB | 8 |
| @jdsalasc/solvejs-string | 1.11.0 | 5.44 KB | 32.34 KB | 8 |
| @jdsalasc/solvejs-url | 0.2.2 | 8.18 KB | 43.07 KB | 8 |
| @jdsalasc/solvejs-validators | 1.11.0 | 19.88 KB | 128.23 KB | 8 |
| @jdsalasc/solvejs-xlsx | 0.3.3 | 159.45 KB | 816.40 KB | 128 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
