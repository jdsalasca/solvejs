# SolveJS Performance and Size Report

Generated on 2026-02-18.

## Benchmark Snapshot

- date.formatDate: 24.04ms for 100.000 iterations
- string.toKebabCase: 49.44ms for 100.000 iterations
- list.unique: 7.13ms for 100.000 iterations
- numbers.percent: 1.73ms for 100.000 iterations
- validators.isCellphoneNumber: 9.22ms for 100.000 iterations
- list.uniqueBy (10000): 0.75ms for 1 iterations
- list.groupBy (10000): 0.60ms for 1 iterations
- list.sortBy (10000): 0.29ms for 1 iterations
- list.uniqueBy (100000): 8.37ms for 1 iterations
- list.groupBy (100000): 9.12ms for 1 iterations
- list.sortBy (100000): 1.81ms for 1 iterations

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.5.2 | 2.28 KB | 6.00 KB | 7 |
| @jdsalasc/solvejs-async | 1.5.2 | 5.23 KB | 29.22 KB | 7 |
| @jdsalasc/solvejs-constants | 1.5.2 | 2.77 KB | 9.36 KB | 7 |
| @jdsalasc/solvejs-date | 1.5.2 | 5.04 KB | 33.26 KB | 7 |
| @jdsalasc/solvejs-list | 1.5.2 | 3.94 KB | 20.46 KB | 7 |
| @jdsalasc/solvejs-numbers | 1.5.2 | 5.22 KB | 32.62 KB | 7 |
| @jdsalasc/solvejs-objects | 1.5.2 | 3.61 KB | 18.06 KB | 7 |
| @jdsalasc/solvejs-regex | 1.5.2 | 2.90 KB | 10.56 KB | 7 |
| @jdsalasc/solvejs-string | 1.5.2 | 3.38 KB | 16.47 KB | 7 |
| @jdsalasc/solvejs-validators | 1.5.2 | 8.88 KB | 69.14 KB | 7 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Regenerate with `npm run report:perf`.
