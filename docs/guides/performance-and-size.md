# SolveJS Performance and Size Report

Generated on 2026-11-16.

## Benchmark Snapshot

- date.formatDate: 20.09ms for 100.000 iterations
- string.toKebabCase: 43.76ms for 100.000 iterations
- list.unique: 7.84ms for 100.000 iterations
- numbers.percent: 1.85ms for 100.000 iterations
- validators.isCellphoneNumber: 8.20ms for 100.000 iterations
- url.buildUrl: 165.94ms for 100.000 iterations
- url.stringifyQuery: 38.79ms for 100.000 iterations
- url.parseQuery: 33.74ms for 100.000 iterations
- cache.stableKey: 135.59ms for 100.000 iterations
- json.stableStringify: 90.73ms for 100.000 iterations
- json.safeJsonParse: 20.35ms for 100.000 iterations
- json.deepClone: 30.25ms for 100.000 iterations
- json.deepEqual: 31.66ms for 100.000 iterations
- pagination.offsetToCursor: 0.98ms for 100.000 iterations
- semver.parseVersion: 47.51ms for 100.000 iterations
- semver.satisfies: 114.16ms for 100.000 iterations
- semver.compareVersions: 57.82ms for 100.000 iterations
- errors.createError: 687.04ms for 100.000 iterations
- errors.normalizeError: 873.69ms for 100.000 iterations
- errors.serializeError: 1140.43ms for 100.000 iterations
- money.fromDecimal: 14.31ms for 100.000 iterations
- money.addMoney: 19.29ms for 100.000 iterations
- money.percentageOf: 14.50ms for 100.000 iterations
- http.calculateBackoffDelay: 21.39ms for 100.000 iterations
- http.parseContentType: 38.34ms for 100.000 iterations
- http.negotiateContentType: 47.99ms for 100.000 iterations
- cache.createLruCache.get (10000): 0.11ms for 1 iterations
- cache.createTtlCache.get (10000): 0.03ms for 1 iterations
- cache.createLruCache.get (100000): 0.01ms for 1 iterations
- cache.createTtlCache.get (100000): 0.00ms for 1 iterations
- list.uniqueBy (10000): 0.80ms for 1 iterations
- list.groupBy (10000): 0.65ms for 1 iterations
- list.sortBy (10000): 0.31ms for 1 iterations
- list.uniqueBy (100000): 9.15ms for 1 iterations
- list.groupBy (100000): 4.53ms for 1 iterations
- list.sortBy (100000): 2.10ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 13.94ms for 1 iterations
- list.groupBy high-cardinality (100000): 13.10ms for 1 iterations
- list.sortBy high-cardinality (100000): 8.84ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 47.92ms for 1 iterations
- list.groupBy high-cardinality (250000): 33.16ms for 1 iterations
- list.sortBy high-cardinality (250000): 22.71ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 57.49% | 55.36% | 43.99% |
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
| @jdsalasc/solvejs-xlsx | 90.95% | 80.12% | 96.65% |

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.10.0 | 2.82 KB | 9.21 KB | 7 |
| @jdsalasc/solvejs-async | 1.10.0 | 9.56 KB | 56.80 KB | 7 |
| @jdsalasc/solvejs-cache | 0.2.0 | 10.31 KB | 59.87 KB | 7 |
| @jdsalasc/solvejs-constants | 1.10.0 | 3.41 KB | 12.35 KB | 7 |
| @jdsalasc/solvejs-date | 1.10.0 | 7.58 KB | 45.97 KB | 7 |
| @jdsalasc/solvejs-env | 1.10.0 | 6.58 KB | 45.68 KB | 7 |
| @jdsalasc/solvejs-errors | 0.2.0 | 8.35 KB | 41.62 KB | 7 |
| @jdsalasc/solvejs-http | 0.2.0 | 10.39 KB | 53.14 KB | 7 |
| @jdsalasc/solvejs-json | 0.2.0 | 9.81 KB | 54.65 KB | 7 |
| @jdsalasc/solvejs-list | 1.10.0 | 4.79 KB | 26.68 KB | 7 |
| @jdsalasc/solvejs-money | 0.2.0 | 10.80 KB | 59.81 KB | 7 |
| @jdsalasc/solvejs-numbers | 1.10.0 | 7.25 KB | 46.78 KB | 7 |
| @jdsalasc/solvejs-objects | 1.10.0 | 5.14 KB | 24.76 KB | 7 |
| @jdsalasc/solvejs-pagination | 0.2.0 | 7.02 KB | 40.85 KB | 7 |
| @jdsalasc/solvejs-regex | 1.10.0 | 3.33 KB | 12.89 KB | 7 |
| @jdsalasc/solvejs-schema | 1.10.0 | 9.24 KB | 58.50 KB | 7 |
| @jdsalasc/solvejs-semver | 0.2.0 | 12.03 KB | 75.60 KB | 7 |
| @jdsalasc/solvejs-string | 1.10.0 | 4.04 KB | 18.85 KB | 7 |
| @jdsalasc/solvejs-url | 0.2.0 | 7.56 KB | 37.97 KB | 7 |
| @jdsalasc/solvejs-validators | 1.10.0 | 13.64 KB | 98.40 KB | 7 |
| @jdsalasc/solvejs-xlsx | 0.1.0 | 68.00 KB | 373.69 KB | 82 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
