# SolveJS Performance and Size Report

Generated on 2026-11-16.

## Benchmark Snapshot

- date.formatDate: 27.67ms for 100.000 iterations
- string.toKebabCase: 58.05ms for 100.000 iterations
- list.unique: 11.02ms for 100.000 iterations
- numbers.percent: 3.87ms for 100.000 iterations
- validators.isCellphoneNumber: 14.57ms for 100.000 iterations
- url.buildUrl: 193.13ms for 100.000 iterations
- url.stringifyQuery: 63.33ms for 100.000 iterations
- url.parseQuery: 50.94ms for 100.000 iterations
- cache.stableKey: 210.97ms for 100.000 iterations
- json.stableStringify: 142.82ms for 100.000 iterations
- json.safeJsonParse: 28.18ms for 100.000 iterations
- json.deepClone: 49.45ms for 100.000 iterations
- json.deepEqual: 45.47ms for 100.000 iterations
- pagination.offsetToCursor: 1.39ms for 100.000 iterations
- semver.parseVersion: 54.55ms for 100.000 iterations
- semver.satisfies: 159.81ms for 100.000 iterations
- semver.compareVersions: 46.87ms for 100.000 iterations
- errors.createError: 694.81ms for 100.000 iterations
- errors.normalizeError: 1154.51ms for 100.000 iterations
- errors.serializeError: 1511.76ms for 100.000 iterations
- money.fromDecimal: 16.72ms for 100.000 iterations
- money.addMoney: 30.07ms for 100.000 iterations
- money.percentageOf: 18.03ms for 100.000 iterations
- http.calculateBackoffDelay: 23.42ms for 100.000 iterations
- http.parseContentType: 57.39ms for 100.000 iterations
- http.negotiateContentType: 61.21ms for 100.000 iterations
- cache.createLruCache.get (10000): 0.21ms for 1 iterations
- cache.createTtlCache.get (10000): 0.10ms for 1 iterations
- cache.createLruCache.get (100000): 0.02ms for 1 iterations
- cache.createTtlCache.get (100000): 0.00ms for 1 iterations
- list.uniqueBy (10000): 1.36ms for 1 iterations
- list.groupBy (10000): 1.18ms for 1 iterations
- list.sortBy (10000): 0.73ms for 1 iterations
- list.uniqueBy (100000): 8.75ms for 1 iterations
- list.groupBy (100000): 11.71ms for 1 iterations
- list.sortBy (100000): 6.05ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 34.75ms for 1 iterations
- list.groupBy high-cardinality (100000): 20.36ms for 1 iterations
- list.sortBy high-cardinality (100000): 11.72ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 268.30ms for 1 iterations
- list.groupBy high-cardinality (250000): 164.37ms for 1 iterations
- list.sortBy high-cardinality (250000): 86.79ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 55.95% | 56.77% | 32.79% |
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
| @jdsalasc/solvejs-regex | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-schema | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-semver | 100.00% | 99.51% | 100.00% |
| @jdsalasc/solvejs-string | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-url | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-validators | 100.00% | 100.00% | 100.00% |

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.10.0 | 2.72 KB | 8.74 KB | 7 |
| @jdsalasc/solvejs-async | 1.10.0 | 9.26 KB | 55.03 KB | 7 |
| @jdsalasc/solvejs-cache | 0.2.0 | 9.10 KB | 54.25 KB | 7 |
| @jdsalasc/solvejs-constants | 1.10.0 | 3.40 KB | 12.28 KB | 7 |
| @jdsalasc/solvejs-date | 1.10.0 | 7.57 KB | 45.89 KB | 7 |
| @jdsalasc/solvejs-env | 1.10.0 | 6.57 KB | 45.59 KB | 7 |
| @jdsalasc/solvejs-errors | 0.2.0 | 8.32 KB | 40.97 KB | 7 |
| @jdsalasc/solvejs-http | 0.2.0 | 9.83 KB | 51.38 KB | 7 |
| @jdsalasc/solvejs-json | 0.2.0 | 9.41 KB | 52.22 KB | 7 |
| @jdsalasc/solvejs-list | 1.10.0 | 4.79 KB | 26.60 KB | 7 |
| @jdsalasc/solvejs-money | 0.2.0 | 10.34 KB | 57.12 KB | 7 |
| @jdsalasc/solvejs-numbers | 1.10.0 | 7.23 KB | 46.40 KB | 7 |
| @jdsalasc/solvejs-objects | 1.10.0 | 5.13 KB | 24.69 KB | 7 |
| @jdsalasc/solvejs-pagination | 0.2.0 | 6.98 KB | 40.68 KB | 7 |
| @jdsalasc/solvejs-regex | 1.10.0 | 3.32 KB | 12.82 KB | 7 |
| @jdsalasc/solvejs-schema | 1.10.0 | 9.21 KB | 58.33 KB | 7 |
| @jdsalasc/solvejs-semver | 0.2.0 | 11.99 KB | 75.41 KB | 7 |
| @jdsalasc/solvejs-string | 1.10.0 | 4.04 KB | 18.78 KB | 7 |
| @jdsalasc/solvejs-url | 0.2.0 | 7.51 KB | 37.42 KB | 7 |
| @jdsalasc/solvejs-validators | 1.10.0 | 13.63 KB | 98.33 KB | 7 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
