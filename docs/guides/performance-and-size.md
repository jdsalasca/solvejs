# SolveJS Performance and Size Report

Generated on 2026-11-17.

## Benchmark Snapshot

- date.formatDate: 22.06ms for 100.000 iterations
- string.toKebabCase: 44.57ms for 100.000 iterations
- list.unique: 7.19ms for 100.000 iterations
- numbers.percent: 1.75ms for 100.000 iterations
- validators.isCellphoneNumber: 7.29ms for 100.000 iterations
- url.buildUrl: 123.12ms for 100.000 iterations
- url.stringifyQuery: 38.85ms for 100.000 iterations
- url.parseQuery: 75.39ms for 100.000 iterations
- cache.stableKey: 155.64ms for 100.000 iterations
- json.stableStringify: 109.17ms for 100.000 iterations
- json.safeJsonParse: 23.21ms for 100.000 iterations
- json.deepClone: 33.08ms for 100.000 iterations
- json.deepEqual: 34.71ms for 100.000 iterations
- pagination.offsetToCursor: 1.28ms for 100.000 iterations
- semver.parseVersion: 52.52ms for 100.000 iterations
- semver.satisfies: 122.00ms for 100.000 iterations
- semver.compareVersions: 40.05ms for 100.000 iterations
- errors.createError: 628.28ms for 100.000 iterations
- errors.normalizeError: 1032.29ms for 100.000 iterations
- errors.serializeError: 1454.44ms for 100.000 iterations
- money.fromDecimal: 12.88ms for 100.000 iterations
- money.addMoney: 26.54ms for 100.000 iterations
- money.percentageOf: 47.02ms for 100.000 iterations
- http.calculateBackoffDelay: 16.65ms for 100.000 iterations
- http.parseContentType: 66.89ms for 100.000 iterations
- http.negotiateContentType: 57.08ms for 100.000 iterations
- cache.createLruCache.get (10000): 0.10ms for 1 iterations
- cache.createTtlCache.get (10000): 0.06ms for 1 iterations
- cache.createLruCache.get (100000): 0.02ms for 1 iterations
- cache.createTtlCache.get (100000): 0.00ms for 1 iterations
- list.uniqueBy (10000): 1.06ms for 1 iterations
- list.groupBy (10000): 0.94ms for 1 iterations
- list.sortBy (10000): 0.63ms for 1 iterations
- list.uniqueBy (100000): 8.56ms for 1 iterations
- list.groupBy (100000): 9.61ms for 1 iterations
- list.sortBy (100000): 2.32ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 25.42ms for 1 iterations
- list.groupBy high-cardinality (100000): 25.65ms for 1 iterations
- list.sortBy high-cardinality (100000): 11.35ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 85.16ms for 1 iterations
- list.groupBy high-cardinality (250000): 36.12ms for 1 iterations
- list.sortBy high-cardinality (250000): 26.22ms for 1 iterations

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
| @jdsalasc/solvejs-pdf | 87.77% | 75.50% | 91.75% |
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
| @jdsalasc/solvejs | 1.15.0 | 4.53 KB | 20.52 KB | 8 |
| @jdsalasc/solvejs-async | 1.11.0 | 11.00 KB | 66.04 KB | 8 |
| @jdsalasc/solvejs-cache | 0.3.0 | 12.71 KB | 77.39 KB | 8 |
| @jdsalasc/solvejs-constants | 1.10.1 | 3.54 KB | 14.56 KB | 8 |
| @jdsalasc/solvejs-date | 1.11.0 | 12.40 KB | 82.46 KB | 8 |
| @jdsalasc/solvejs-env | 1.10.1 | 7.25 KB | 51.35 KB | 8 |
| @jdsalasc/solvejs-errors | 0.2.2 | 11.08 KB | 55.61 KB | 8 |
| @jdsalasc/solvejs-http | 0.3.0 | 16.21 KB | 93.24 KB | 8 |
| @jdsalasc/solvejs-id | 0.1.0 | 7.50 KB | 39.93 KB | 14 |
| @jdsalasc/solvejs-json | 0.3.0 | 12.47 KB | 73.31 KB | 8 |
| @jdsalasc/solvejs-list | 1.11.0 | 5.40 KB | 36.87 KB | 8 |
| @jdsalasc/solvejs-money | 0.3.0 | 12.41 KB | 72.20 KB | 8 |
| @jdsalasc/solvejs-numbers | 1.11.0 | 9.08 KB | 60.35 KB | 8 |
| @jdsalasc/solvejs-objects | 1.11.0 | 6.61 KB | 38.14 KB | 8 |
| @jdsalasc/solvejs-pagination | 0.2.2 | 7.75 KB | 47.67 KB | 8 |
| @jdsalasc/solvejs-pdf | 0.1.14 | 190.63 KB | 1142.03 KB | 152 |
| @jdsalasc/solvejs-regex | 1.10.1 | 3.45 KB | 15.03 KB | 8 |
| @jdsalasc/solvejs-schema | 1.10.1 | 10.19 KB | 63.94 KB | 8 |
| @jdsalasc/solvejs-semver | 0.3.0 | 13.24 KB | 86.05 KB | 8 |
| @jdsalasc/solvejs-string | 1.11.0 | 5.44 KB | 32.34 KB | 8 |
| @jdsalasc/solvejs-url | 0.2.2 | 8.18 KB | 43.07 KB | 8 |
| @jdsalasc/solvejs-validators | 1.11.0 | 19.89 KB | 128.30 KB | 8 |
| @jdsalasc/solvejs-xlsx | 0.3.3 | 159.45 KB | 816.40 KB | 128 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
