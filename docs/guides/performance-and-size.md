# SolveJS Performance and Size Report

Generated on 2026-11-16.

## Benchmark Snapshot

- date.formatDate: 24.75ms for 100.000 iterations
- string.toKebabCase: 61.27ms for 100.000 iterations
- list.unique: 10.91ms for 100.000 iterations
- numbers.percent: 2.47ms for 100.000 iterations
- validators.isCellphoneNumber: 11.51ms for 100.000 iterations
- url.buildUrl: 199.29ms for 100.000 iterations
- url.stringifyQuery: 59.68ms for 100.000 iterations
- url.parseQuery: 51.32ms for 100.000 iterations
- cache.stableKey: 238.18ms for 100.000 iterations
- json.stableStringify: 161.67ms for 100.000 iterations
- json.safeJsonParse: 29.71ms for 100.000 iterations
- json.deepClone: 46.52ms for 100.000 iterations
- json.deepEqual: 61.41ms for 100.000 iterations
- pagination.offsetToCursor: 1.16ms for 100.000 iterations
- semver.parseVersion: 71.03ms for 100.000 iterations
- semver.satisfies: 228.78ms for 100.000 iterations
- semver.compareVersions: 54.62ms for 100.000 iterations
- errors.createError: 1153.90ms for 100.000 iterations
- errors.normalizeError: 2420.83ms for 100.000 iterations
- errors.serializeError: 1915.19ms for 100.000 iterations
- money.fromDecimal: 18.27ms for 100.000 iterations
- money.addMoney: 31.35ms for 100.000 iterations
- money.percentageOf: 19.78ms for 100.000 iterations
- http.calculateBackoffDelay: 28.82ms for 100.000 iterations
- http.parseContentType: 47.38ms for 100.000 iterations
- http.negotiateContentType: 65.00ms for 100.000 iterations
- cache.createLruCache.get (10000): 0.19ms for 1 iterations
- cache.createTtlCache.get (10000): 0.04ms for 1 iterations
- cache.createLruCache.get (100000): 0.35ms for 1 iterations
- cache.createTtlCache.get (100000): 0.02ms for 1 iterations
- list.uniqueBy (10000): 1.34ms for 1 iterations
- list.groupBy (10000): 1.38ms for 1 iterations
- list.sortBy (10000): 0.75ms for 1 iterations
- list.uniqueBy (100000): 9.87ms for 1 iterations
- list.groupBy (100000): 11.74ms for 1 iterations
- list.sortBy (100000): 2.38ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 42.17ms for 1 iterations
- list.groupBy high-cardinality (100000): 30.18ms for 1 iterations
- list.sortBy high-cardinality (100000): 11.94ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 130.86ms for 1 iterations
- list.groupBy high-cardinality (250000): 82.83ms for 1 iterations
- list.sortBy high-cardinality (250000): 35.07ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 56.06% | 57.35% | 32.55% |
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
| @jdsalasc/solvejs | 1.9.0 | 2.62 KB | 8.48 KB | 7 |
| @jdsalasc/solvejs-async | 1.9.0 | 9.16 KB | 54.72 KB | 7 |
| @jdsalasc/solvejs-cache | 0.1.0 | 8.99 KB | 53.96 KB | 7 |
| @jdsalasc/solvejs-constants | 1.9.0 | 3.33 KB | 12.06 KB | 7 |
| @jdsalasc/solvejs-date | 1.9.0 | 7.49 KB | 45.60 KB | 7 |
| @jdsalasc/solvejs-env | 1.9.0 | 6.48 KB | 45.34 KB | 7 |
| @jdsalasc/solvejs-errors | 0.1.0 | 8.18 KB | 40.69 KB | 7 |
| @jdsalasc/solvejs-http | 0.1.0 | 9.66 KB | 51.09 KB | 7 |
| @jdsalasc/solvejs-json | 0.1.0 | 9.31 KB | 51.99 KB | 7 |
| @jdsalasc/solvejs-list | 1.9.0 | 4.70 KB | 26.32 KB | 7 |
| @jdsalasc/solvejs-money | 0.1.0 | 10.24 KB | 56.87 KB | 7 |
| @jdsalasc/solvejs-numbers | 1.9.0 | 7.14 KB | 46.12 KB | 7 |
| @jdsalasc/solvejs-objects | 1.9.0 | 5.03 KB | 24.44 KB | 7 |
| @jdsalasc/solvejs-pagination | 0.1.0 | 6.89 KB | 40.48 KB | 7 |
| @jdsalasc/solvejs-regex | 1.9.0 | 3.23 KB | 12.56 KB | 7 |
| @jdsalasc/solvejs-schema | 1.9.0 | 9.09 KB | 58.00 KB | 7 |
| @jdsalasc/solvejs-semver | 0.1.0 | 11.90 KB | 75.17 KB | 7 |
| @jdsalasc/solvejs-string | 1.9.0 | 3.93 KB | 18.52 KB | 7 |
| @jdsalasc/solvejs-url | 0.1.0 | 7.39 KB | 37.15 KB | 7 |
| @jdsalasc/solvejs-validators | 1.9.0 | 12.76 KB | 90.37 KB | 7 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
