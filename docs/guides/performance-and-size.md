# SolveJS Performance and Size Report

Generated on 2026-11-17.

## Benchmark Snapshot

- date.formatDate: 20.08ms for 100.000 iterations
- string.toKebabCase: 41.54ms for 100.000 iterations
- list.unique: 6.99ms for 100.000 iterations
- numbers.percent: 1.77ms for 100.000 iterations
- validators.isCellphoneNumber: 7.37ms for 100.000 iterations
- url.buildUrl: 116.89ms for 100.000 iterations
- url.stringifyQuery: 35.24ms for 100.000 iterations
- url.parseQuery: 68.42ms for 100.000 iterations
- cache.stableKey: 141.44ms for 100.000 iterations
- json.stableStringify: 100.40ms for 100.000 iterations
- json.safeJsonParse: 22.28ms for 100.000 iterations
- json.deepClone: 30.24ms for 100.000 iterations
- json.deepEqual: 32.43ms for 100.000 iterations
- pagination.offsetToCursor: 1.75ms for 100.000 iterations
- semver.parseVersion: 45.26ms for 100.000 iterations
- semver.satisfies: 115.77ms for 100.000 iterations
- semver.compareVersions: 38.37ms for 100.000 iterations
- errors.createError: 687.96ms for 100.000 iterations
- errors.normalizeError: 921.83ms for 100.000 iterations
- errors.serializeError: 1081.92ms for 100.000 iterations
- money.fromDecimal: 11.15ms for 100.000 iterations
- money.addMoney: 16.80ms for 100.000 iterations
- money.percentageOf: 26.77ms for 100.000 iterations
- http.calculateBackoffDelay: 17.47ms for 100.000 iterations
- http.parseContentType: 60.00ms for 100.000 iterations
- http.negotiateContentType: 34.51ms for 100.000 iterations
- cache.createLruCache.get (10000): 0.08ms for 1 iterations
- cache.createTtlCache.get (10000): 0.02ms for 1 iterations
- cache.createLruCache.get (100000): 0.01ms for 1 iterations
- cache.createTtlCache.get (100000): 0.00ms for 1 iterations
- list.uniqueBy (10000): 0.71ms for 1 iterations
- list.groupBy (10000): 0.67ms for 1 iterations
- list.sortBy (10000): 0.40ms for 1 iterations
- list.uniqueBy (100000): 4.66ms for 1 iterations
- list.groupBy (100000): 7.33ms for 1 iterations
- list.sortBy (100000): 2.43ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 12.91ms for 1 iterations
- list.groupBy high-cardinality (100000): 11.55ms for 1 iterations
- list.sortBy high-cardinality (100000): 7.91ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 32.45ms for 1 iterations
- list.groupBy high-cardinality (250000): 23.55ms for 1 iterations
- list.sortBy high-cardinality (250000): 21.59ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 46.82% | 50.94% | 40.64% |
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
| @jdsalasc/solvejs-pdf | 88.65% | 75.89% | 91.96% |
| @jdsalasc/solvejs-regex | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-schema | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-semver | 100.00% | 99.51% | 100.00% |
| @jdsalasc/solvejs-string | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-url | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-validators | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-xlsx | 91.57% | 80.07% | 95.78% |

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.12.11 | 4.38 KB | 19.68 KB | 8 |
| @jdsalasc/solvejs-async | 1.10.0 | 10.10 KB | 61.55 KB | 8 |
| @jdsalasc/solvejs-cache | 0.2.1 | 11.14 KB | 66.99 KB | 8 |
| @jdsalasc/solvejs-constants | 1.10.0 | 3.47 KB | 14.35 KB | 8 |
| @jdsalasc/solvejs-date | 1.10.1 | 8.97 KB | 55.52 KB | 8 |
| @jdsalasc/solvejs-env | 1.10.0 | 7.03 KB | 50.35 KB | 8 |
| @jdsalasc/solvejs-errors | 0.2.1 | 11.00 KB | 55.40 KB | 8 |
| @jdsalasc/solvejs-http | 0.2.1 | 11.34 KB | 61.43 KB | 8 |
| @jdsalasc/solvejs-json | 0.2.0 | 10.37 KB | 59.66 KB | 8 |
| @jdsalasc/solvejs-list | 1.10.0 | 4.87 KB | 30.27 KB | 8 |
| @jdsalasc/solvejs-money | 0.2.1 | 11.65 KB | 67.57 KB | 8 |
| @jdsalasc/solvejs-numbers | 1.10.0 | 7.63 KB | 53.23 KB | 8 |
| @jdsalasc/solvejs-objects | 1.10.0 | 5.22 KB | 27.04 KB | 8 |
| @jdsalasc/solvejs-pagination | 0.2.1 | 7.69 KB | 47.46 KB | 8 |
| @jdsalasc/solvejs-pdf | 0.1.11 | 174.29 KB | 1035.41 KB | 146 |
| @jdsalasc/solvejs-regex | 1.10.0 | 3.38 KB | 14.83 KB | 8 |
| @jdsalasc/solvejs-schema | 1.10.0 | 10.12 KB | 63.74 KB | 8 |
| @jdsalasc/solvejs-semver | 0.2.1 | 12.51 KB | 81.02 KB | 8 |
| @jdsalasc/solvejs-string | 1.10.1 | 4.15 KB | 21.05 KB | 8 |
| @jdsalasc/solvejs-url | 0.2.1 | 8.11 KB | 42.87 KB | 8 |
| @jdsalasc/solvejs-validators | 1.10.0 | 17.06 KB | 108.64 KB | 8 |
| @jdsalasc/solvejs-xlsx | 0.3.0 | 157.95 KB | 808.59 KB | 128 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
