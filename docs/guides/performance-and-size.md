# SolveJS Performance and Size Report

Generated on 2026-11-16.

## Benchmark Snapshot

- date.formatDate: 19.43ms for 100.000 iterations
- string.toKebabCase: 41.15ms for 100.000 iterations
- list.unique: 6.79ms for 100.000 iterations
- numbers.percent: 1.79ms for 100.000 iterations
- validators.isCellphoneNumber: 8.05ms for 100.000 iterations
- url.buildUrl: 116.28ms for 100.000 iterations
- url.stringifyQuery: 38.14ms for 100.000 iterations
- url.parseQuery: 36.57ms for 100.000 iterations
- cache.stableKey: 142.10ms for 100.000 iterations
- json.stableStringify: 99.71ms for 100.000 iterations
- json.safeJsonParse: 22.02ms for 100.000 iterations
- json.deepClone: 31.49ms for 100.000 iterations
- json.deepEqual: 33.42ms for 100.000 iterations
- pagination.offsetToCursor: 2.22ms for 100.000 iterations
- semver.parseVersion: 46.25ms for 100.000 iterations
- semver.satisfies: 114.12ms for 100.000 iterations
- semver.compareVersions: 36.84ms for 100.000 iterations
- errors.createError: 554.48ms for 100.000 iterations
- errors.normalizeError: 903.79ms for 100.000 iterations
- errors.serializeError: 1044.63ms for 100.000 iterations
- money.fromDecimal: 10.49ms for 100.000 iterations
- money.addMoney: 16.63ms for 100.000 iterations
- money.percentageOf: 13.03ms for 100.000 iterations
- http.calculateBackoffDelay: 16.28ms for 100.000 iterations
- http.parseContentType: 28.06ms for 100.000 iterations
- http.negotiateContentType: 35.29ms for 100.000 iterations
- cache.createLruCache.get (10000): 0.10ms for 1 iterations
- cache.createTtlCache.get (10000): 0.03ms for 1 iterations
- cache.createLruCache.get (100000): 0.01ms for 1 iterations
- cache.createTtlCache.get (100000): 0.00ms for 1 iterations
- list.uniqueBy (10000): 0.95ms for 1 iterations
- list.groupBy (10000): 0.73ms for 1 iterations
- list.sortBy (10000): 0.40ms for 1 iterations
- list.uniqueBy (100000): 5.36ms for 1 iterations
- list.groupBy (100000): 8.26ms for 1 iterations
- list.sortBy (100000): 1.95ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 13.10ms for 1 iterations
- list.groupBy high-cardinality (100000): 12.10ms for 1 iterations
- list.sortBy high-cardinality (100000): 7.45ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 37.21ms for 1 iterations
- list.groupBy high-cardinality (250000): 23.50ms for 1 iterations
- list.sortBy high-cardinality (250000): 22.18ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 48.44% | 52.67% | 34.64% |
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
| @jdsalasc/solvejs-pdf | 86.78% | 78.36% | 87.69% |
| @jdsalasc/solvejs-regex | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-schema | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-semver | 100.00% | 99.51% | 100.00% |
| @jdsalasc/solvejs-string | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-url | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-validators | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-xlsx | 92.23% | 80.19% | 95.57% |

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.12.0 | 3.88 KB | 14.76 KB | 7 |
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
| @jdsalasc/solvejs-pdf | 0.1.0 | 78.91 KB | 491.00 KB | 87 |
| @jdsalasc/solvejs-regex | 1.10.0 | 3.33 KB | 12.89 KB | 7 |
| @jdsalasc/solvejs-schema | 1.10.0 | 9.24 KB | 58.50 KB | 7 |
| @jdsalasc/solvejs-semver | 0.2.0 | 12.03 KB | 75.60 KB | 7 |
| @jdsalasc/solvejs-string | 1.10.0 | 4.04 KB | 18.85 KB | 7 |
| @jdsalasc/solvejs-url | 0.2.0 | 7.56 KB | 37.97 KB | 7 |
| @jdsalasc/solvejs-validators | 1.10.0 | 13.64 KB | 98.40 KB | 7 |
| @jdsalasc/solvejs-xlsx | 0.2.0 | 114.51 KB | 593.83 KB | 102 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
