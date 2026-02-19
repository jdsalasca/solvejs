# SolveJS Performance and Size Report

Generated on 2026-02-19.

## Benchmark Snapshot

- date.formatDate: 19.69ms for 100.000 iterations
- string.toKebabCase: 38.07ms for 100.000 iterations
- list.unique: 6.60ms for 100.000 iterations
- numbers.percent: 1.50ms for 100.000 iterations
- validators.isCellphoneNumber: 6.85ms for 100.000 iterations
- list.uniqueBy (10000): 0.73ms for 1 iterations
- list.groupBy (10000): 0.61ms for 1 iterations
- list.sortBy (10000): 0.29ms for 1 iterations
- list.uniqueBy (100000): 6.29ms for 1 iterations
- list.groupBy (100000): 9.29ms for 1 iterations
- list.sortBy (100000): 1.35ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 18.44ms for 1 iterations
- list.groupBy high-cardinality (100000): 13.90ms for 1 iterations
- list.sortBy high-cardinality (100000): 6.79ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 43.86ms for 1 iterations
- list.groupBy high-cardinality (250000): 36.99ms for 1 iterations
- list.sortBy high-cardinality (250000): 20.06ms for 1 iterations

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.5.2 | 2.36 KB | 6.46 KB | 7 |
| @jdsalasc/solvejs-async | 1.5.2 | 8.01 KB | 48.74 KB | 7 |
| @jdsalasc/solvejs-constants | 1.5.2 | 2.77 KB | 9.36 KB | 7 |
| @jdsalasc/solvejs-date | 1.5.2 | 5.17 KB | 33.70 KB | 7 |
| @jdsalasc/solvejs-env | 1.5.2 | 5.14 KB | 39.09 KB | 7 |
| @jdsalasc/solvejs-list | 1.5.2 | 3.94 KB | 20.46 KB | 7 |
| @jdsalasc/solvejs-numbers | 1.5.2 | 6.02 KB | 40.84 KB | 7 |
| @jdsalasc/solvejs-objects | 1.5.2 | 3.67 KB | 18.55 KB | 7 |
| @jdsalasc/solvejs-regex | 1.5.2 | 2.90 KB | 10.56 KB | 7 |
| @jdsalasc/solvejs-string | 1.5.2 | 3.38 KB | 16.47 KB | 7 |
| @jdsalasc/solvejs-validators | 1.5.2 | 9.03 KB | 70.55 KB | 7 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Regenerate with `npm run report:perf`.
