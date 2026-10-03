# SolveJS Performance and Size Report

Generated on 2026-10-03.

## Benchmark Snapshot

- date.formatDate: 48.38ms for 100.000 iterations
- string.toKebabCase: 105.90ms for 100.000 iterations
- list.unique: 17.28ms for 100.000 iterations
- numbers.percent: 4.57ms for 100.000 iterations
- validators.isCellphoneNumber: 17.10ms for 100.000 iterations
- url.buildUrl: 377.09ms for 100.000 iterations
- url.stringifyQuery: 102.55ms for 100.000 iterations
- url.parseQuery: 93.89ms for 100.000 iterations
- cache.stableKey: 367.15ms for 100.000 iterations
- json.stableStringify: 265.64ms for 100.000 iterations
- json.safeJsonParse: 60.47ms for 100.000 iterations
- json.deepClone: 79.53ms for 100.000 iterations
- json.deepEqual: 94.43ms for 100.000 iterations
- cache.createLruCache.get (10000): 0.33ms for 1 iterations
- cache.createTtlCache.get (10000): 0.14ms for 1 iterations
- cache.createLruCache.get (100000): 0.02ms for 1 iterations
- cache.createTtlCache.get (100000): 0.01ms for 1 iterations
- list.uniqueBy (10000): 2.05ms for 1 iterations
- list.groupBy (10000): 1.96ms for 1 iterations
- list.sortBy (10000): 0.99ms for 1 iterations
- list.uniqueBy (100000): 11.22ms for 1 iterations
- list.groupBy (100000): 18.56ms for 1 iterations
- list.sortBy (100000): 4.38ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 34.04ms for 1 iterations
- list.groupBy high-cardinality (100000): 35.28ms for 1 iterations
- list.sortBy high-cardinality (100000): 19.96ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 89.91ms for 1 iterations
- list.groupBy high-cardinality (250000): 66.55ms for 1 iterations
- list.sortBy high-cardinality (250000): 48.88ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 47.06% | 58.65% | 14.17% |
| @jdsalasc/solvejs-async | 100.00% | 96.94% | 97.50% |
| @jdsalasc/solvejs-cache | 100.00% | 95.97% | 97.67% |
| @jdsalasc/solvejs-constants | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-date | 100.00% | 99.00% | 100.00% |
| @jdsalasc/solvejs-env | 100.00% | 97.52% | 100.00% |
| @jdsalasc/solvejs-json | 100.00% | 94.81% | 100.00% |
| @jdsalasc/solvejs-list | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-numbers | 100.00% | 98.67% | 100.00% |
| @jdsalasc/solvejs-objects | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-pagination | 100.00% | 97.92% | 100.00% |
| @jdsalasc/solvejs-regex | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-schema | 100.00% | 94.29% | 100.00% |
| @jdsalasc/solvejs-semver | 100.00% | 95.56% | 100.00% |
| @jdsalasc/solvejs-string | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-url | 100.00% | 98.41% | 100.00% |
| @jdsalasc/solvejs-validators | 100.00% | 99.35% | 100.00% |

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.9.0 | 2.55 KB | 7.84 KB | 7 |
| @jdsalasc/solvejs-async | 1.9.0 | 9.06 KB | 53.17 KB | 7 |
| @jdsalasc/solvejs-cache | 0.1.0 | 9.61 KB | 55.78 KB | 7 |
| @jdsalasc/solvejs-constants | 1.9.0 | 3.33 KB | 12.06 KB | 7 |
| @jdsalasc/solvejs-date | 1.9.0 | 6.77 KB | 45.08 KB | 7 |
| @jdsalasc/solvejs-env | 1.9.0 | 6.10 KB | 43.97 KB | 7 |
| @jdsalasc/solvejs-json | 0.1.0 | 8.90 KB | 48.70 KB | 7 |
| @jdsalasc/solvejs-list | 1.9.0 | 4.70 KB | 26.32 KB | 7 |
| @jdsalasc/solvejs-numbers | 1.9.0 | 6.67 KB | 45.00 KB | 7 |
| @jdsalasc/solvejs-objects | 1.9.0 | 5.03 KB | 24.44 KB | 7 |
| @jdsalasc/solvejs-pagination | 0.1.0 | 6.82 KB | 39.70 KB | 7 |
| @jdsalasc/solvejs-regex | 1.9.0 | 3.09 KB | 11.87 KB | 7 |
| @jdsalasc/solvejs-schema | 1.9.0 | 8.08 KB | 53.03 KB | 7 |
| @jdsalasc/solvejs-semver | 0.1.0 | 10.80 KB | 67.78 KB | 7 |
| @jdsalasc/solvejs-string | 1.9.0 | 3.93 KB | 18.52 KB | 7 |
| @jdsalasc/solvejs-url | 0.1.0 | 6.89 KB | 35.64 KB | 7 |
| @jdsalasc/solvejs-validators | 1.9.0 | 10.71 KB | 82.55 KB | 7 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
