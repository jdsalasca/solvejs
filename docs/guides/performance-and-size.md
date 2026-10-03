# SolveJS Performance and Size Report

Generated on 2026-10-03.

## Benchmark Snapshot

- date.formatDate: 41.28ms for 100.000 iterations
- string.toKebabCase: 88.88ms for 100.000 iterations
- list.unique: 19.34ms for 100.000 iterations
- numbers.percent: 4.14ms for 100.000 iterations
- validators.isCellphoneNumber: 20.53ms for 100.000 iterations
- url.buildUrl: 386.98ms for 100.000 iterations
- url.stringifyQuery: 101.54ms for 100.000 iterations
- url.parseQuery: 100.51ms for 100.000 iterations
- cache.stableKey: 339.10ms for 100.000 iterations
- cache.createLruCache.get (10000): 0.18ms for 1 iterations
- cache.createTtlCache.get (10000): 0.05ms for 1 iterations
- cache.createLruCache.get (100000): 0.02ms for 1 iterations
- cache.createTtlCache.get (100000): 0.00ms for 1 iterations
- list.uniqueBy (10000): 2.16ms for 1 iterations
- list.groupBy (10000): 1.78ms for 1 iterations
- list.sortBy (10000): 0.85ms for 1 iterations
- list.uniqueBy (100000): 18.31ms for 1 iterations
- list.groupBy (100000): 17.75ms for 1 iterations
- list.sortBy (100000): 4.53ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 97.03ms for 1 iterations
- list.groupBy high-cardinality (100000): 47.97ms for 1 iterations
- list.sortBy high-cardinality (100000): 19.76ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 166.74ms for 1 iterations
- list.groupBy high-cardinality (250000): 112.44ms for 1 iterations
- list.sortBy high-cardinality (250000): 57.75ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 50.16% | 57.43% | 17.14% |
| @jdsalasc/solvejs-async | 100.00% | 96.94% | 97.50% |
| @jdsalasc/solvejs-cache | 100.00% | 95.97% | 97.67% |
| @jdsalasc/solvejs-constants | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-date | 100.00% | 99.00% | 100.00% |
| @jdsalasc/solvejs-env | 100.00% | 97.52% | 100.00% |
| @jdsalasc/solvejs-list | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-numbers | 100.00% | 98.67% | 100.00% |
| @jdsalasc/solvejs-objects | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-regex | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-schema | 100.00% | 94.29% | 100.00% |
| @jdsalasc/solvejs-string | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-url | 100.00% | 98.41% | 100.00% |
| @jdsalasc/solvejs-validators | 100.00% | 99.35% | 100.00% |

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.9.0 | 2.49 KB | 7.18 KB | 7 |
| @jdsalasc/solvejs-async | 1.9.0 | 9.06 KB | 53.17 KB | 7 |
| @jdsalasc/solvejs-cache | 0.1.0 | 9.61 KB | 55.78 KB | 7 |
| @jdsalasc/solvejs-constants | 1.9.0 | 3.33 KB | 12.06 KB | 7 |
| @jdsalasc/solvejs-date | 1.9.0 | 6.77 KB | 45.08 KB | 7 |
| @jdsalasc/solvejs-env | 1.9.0 | 6.10 KB | 43.97 KB | 7 |
| @jdsalasc/solvejs-list | 1.9.0 | 4.70 KB | 26.32 KB | 7 |
| @jdsalasc/solvejs-numbers | 1.9.0 | 6.67 KB | 45.00 KB | 7 |
| @jdsalasc/solvejs-objects | 1.9.0 | 5.03 KB | 24.44 KB | 7 |
| @jdsalasc/solvejs-regex | 1.9.0 | 3.09 KB | 11.87 KB | 7 |
| @jdsalasc/solvejs-schema | 1.9.0 | 8.08 KB | 53.03 KB | 7 |
| @jdsalasc/solvejs-string | 1.9.0 | 3.93 KB | 18.52 KB | 7 |
| @jdsalasc/solvejs-url | 0.1.0 | 6.89 KB | 35.64 KB | 7 |
| @jdsalasc/solvejs-validators | 1.9.0 | 10.71 KB | 82.55 KB | 7 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
