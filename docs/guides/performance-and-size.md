# SolveJS Performance and Size Report

Generated on 2026-10-03.

## Benchmark Snapshot

- date.formatDate: 38.49ms for 100.000 iterations
- string.toKebabCase: 85.50ms for 100.000 iterations
- list.unique: 15.43ms for 100.000 iterations
- numbers.percent: 5.31ms for 100.000 iterations
- validators.isCellphoneNumber: 13.90ms for 100.000 iterations
- url.buildUrl: 332.45ms for 100.000 iterations
- url.stringifyQuery: 85.49ms for 100.000 iterations
- url.parseQuery: 132.60ms for 100.000 iterations
- list.uniqueBy (10000): 1.25ms for 1 iterations
- list.groupBy (10000): 3.58ms for 1 iterations
- list.sortBy (10000): 0.83ms for 1 iterations
- list.uniqueBy (100000): 45.74ms for 1 iterations
- list.groupBy (100000): 17.78ms for 1 iterations
- list.sortBy (100000): 4.72ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 59.65ms for 1 iterations
- list.groupBy high-cardinality (100000): 46.55ms for 1 iterations
- list.sortBy high-cardinality (100000): 14.11ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 197.50ms for 1 iterations
- list.groupBy high-cardinality (250000): 207.02ms for 1 iterations
- list.sortBy high-cardinality (250000): 81.22ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 52.83% | 57.00% | 18.09% |
| @jdsalasc/solvejs-async | 100.00% | 96.94% | 97.50% |
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
| @jdsalasc/solvejs | 1.9.0 | 2.48 KB | 6.97 KB | 7 |
| @jdsalasc/solvejs-async | 1.9.0 | 9.06 KB | 53.17 KB | 7 |
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
