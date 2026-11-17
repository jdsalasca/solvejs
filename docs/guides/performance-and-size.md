# SolveJS Performance and Size Report

Generated on 2026-11-17.

## Benchmark Snapshot

- date.formatDate: 21.78ms for 100.000 iterations
- string.toKebabCase: 45.28ms for 100.000 iterations
- list.unique: 6.84ms for 100.000 iterations
- numbers.percent: 1.71ms for 100.000 iterations
- validators.isCellphoneNumber: 7.50ms for 100.000 iterations
- url.buildUrl: 117.87ms for 100.000 iterations
- url.stringifyQuery: 37.87ms for 100.000 iterations
- url.parseQuery: 72.89ms for 100.000 iterations
- cache.stableKey: 146.41ms for 100.000 iterations
- json.stableStringify: 102.96ms for 100.000 iterations
- json.safeJsonParse: 22.89ms for 100.000 iterations
- json.deepClone: 33.45ms for 100.000 iterations
- json.deepEqual: 35.04ms for 100.000 iterations
- pagination.offsetToCursor: 1.09ms for 100.000 iterations
- semver.parseVersion: 47.96ms for 100.000 iterations
- semver.satisfies: 120.67ms for 100.000 iterations
- semver.compareVersions: 38.58ms for 100.000 iterations
- errors.createError: 529.19ms for 100.000 iterations
- errors.normalizeError: 877.16ms for 100.000 iterations
- errors.serializeError: 1154.93ms for 100.000 iterations
- money.fromDecimal: 15.47ms for 100.000 iterations
- money.addMoney: 20.78ms for 100.000 iterations
- money.percentageOf: 37.32ms for 100.000 iterations
- http.calculateBackoffDelay: 18.95ms for 100.000 iterations
- http.parseContentType: 90.44ms for 100.000 iterations
- http.negotiateContentType: 43.51ms for 100.000 iterations
- cache.createLruCache.get (10000): 0.21ms for 1 iterations
- cache.createTtlCache.get (10000): 0.09ms for 1 iterations
- cache.createLruCache.get (100000): 0.01ms for 1 iterations
- cache.createTtlCache.get (100000): 0.00ms for 1 iterations
- list.uniqueBy (10000): 1.40ms for 1 iterations
- list.groupBy (10000): 1.10ms for 1 iterations
- list.sortBy (10000): 0.76ms for 1 iterations
- list.uniqueBy (100000): 8.47ms for 1 iterations
- list.groupBy (100000): 9.99ms for 1 iterations
- list.sortBy (100000): 2.21ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 16.78ms for 1 iterations
- list.groupBy high-cardinality (100000): 18.54ms for 1 iterations
- list.sortBy high-cardinality (100000): 7.43ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 87.84ms for 1 iterations
- list.groupBy high-cardinality (250000): 55.46ms for 1 iterations
- list.sortBy high-cardinality (250000): 29.85ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 44.69% | 50.79% | 37.70% |
| @jdsalasc/solvejs-async | 100.00% | 99.12% | 100.00% |
| @jdsalasc/solvejs-cache | 100.00% | 98.72% | 98.28% |
| @jdsalasc/solvejs-constants | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-date | 97.57% | 93.51% | 100.00% |
| @jdsalasc/solvejs-env | 100.00% | 99.17% | 100.00% |
| @jdsalasc/solvejs-errors | 100.00% | 91.43% | 96.00% |
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
| @jdsalasc/solvejs | 1.16.0 | 4.53 KB | 20.52 KB | 8 |
| @jdsalasc/solvejs-async | 1.11.0 | 11.01 KB | 66.11 KB | 8 |
| @jdsalasc/solvejs-cache | 0.3.1 | 12.71 KB | 77.46 KB | 8 |
| @jdsalasc/solvejs-constants | 1.11.0 | 3.80 KB | 16.31 KB | 8 |
| @jdsalasc/solvejs-date | 1.11.0 | 12.40 KB | 82.46 KB | 8 |
| @jdsalasc/solvejs-env | 1.10.1 | 7.25 KB | 51.35 KB | 8 |
| @jdsalasc/solvejs-errors | 0.3.0 | 11.26 KB | 57.21 KB | 8 |
| @jdsalasc/solvejs-http | 0.3.0 | 16.21 KB | 93.24 KB | 8 |
| @jdsalasc/solvejs-id | 0.1.0 | 7.50 KB | 39.93 KB | 14 |
| @jdsalasc/solvejs-json | 0.3.0 | 12.47 KB | 73.31 KB | 8 |
| @jdsalasc/solvejs-list | 1.11.1 | 5.40 KB | 36.94 KB | 8 |
| @jdsalasc/solvejs-money | 0.3.0 | 12.42 KB | 72.27 KB | 8 |
| @jdsalasc/solvejs-numbers | 1.11.1 | 9.09 KB | 60.42 KB | 8 |
| @jdsalasc/solvejs-objects | 1.11.0 | 6.61 KB | 38.14 KB | 8 |
| @jdsalasc/solvejs-pagination | 0.3.0 | 8.71 KB | 53.10 KB | 8 |
| @jdsalasc/solvejs-pdf | 0.1.14 | 190.63 KB | 1142.03 KB | 152 |
| @jdsalasc/solvejs-regex | 1.11.0 | 3.79 KB | 17.18 KB | 8 |
| @jdsalasc/solvejs-schema | 1.11.0 | 10.55 KB | 67.99 KB | 8 |
| @jdsalasc/solvejs-semver | 0.3.1 | 13.25 KB | 86.12 KB | 8 |
| @jdsalasc/solvejs-string | 1.11.0 | 5.44 KB | 32.34 KB | 8 |
| @jdsalasc/solvejs-url | 0.3.0 | 8.75 KB | 46.44 KB | 8 |
| @jdsalasc/solvejs-validators | 1.11.0 | 19.89 KB | 128.30 KB | 8 |
| @jdsalasc/solvejs-xlsx | 0.3.3 | 159.45 KB | 816.40 KB | 128 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
