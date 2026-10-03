# SolveJS Performance and Size Report

Generated on 2026-10-03.

## Benchmark Snapshot

- date.formatDate: 40.76ms for 100.000 iterations
- string.toKebabCase: 77.56ms for 100.000 iterations
- list.unique: 14.96ms for 100.000 iterations
- numbers.percent: 3.91ms for 100.000 iterations
- validators.isCellphoneNumber: 11.95ms for 100.000 iterations
- list.uniqueBy (10000): 1.48ms for 1 iterations
- list.groupBy (10000): 1.27ms for 1 iterations
- list.sortBy (10000): 0.75ms for 1 iterations
- list.uniqueBy (100000): 30.74ms for 1 iterations
- list.groupBy (100000): 6.59ms for 1 iterations
- list.sortBy (100000): 2.35ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 27.47ms for 1 iterations
- list.groupBy high-cardinality (100000): 29.47ms for 1 iterations
- list.sortBy high-cardinality (100000): 13.80ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 133.61ms for 1 iterations
- list.groupBy high-cardinality (250000): 115.50ms for 1 iterations
- list.sortBy high-cardinality (250000): 44.26ms for 1 iterations

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.9.0 | 2.45 KB | 6.76 KB | 7 |
| @jdsalasc/solvejs-async | 1.9.0 | 8.57 KB | 51.96 KB | 7 |
| @jdsalasc/solvejs-constants | 1.9.0 | 3.33 KB | 12.06 KB | 7 |
| @jdsalasc/solvejs-date | 1.9.0 | 5.92 KB | 43.46 KB | 7 |
| @jdsalasc/solvejs-env | 1.9.0 | 5.61 KB | 42.77 KB | 7 |
| @jdsalasc/solvejs-list | 1.9.0 | 4.44 KB | 25.58 KB | 7 |
| @jdsalasc/solvejs-numbers | 1.9.0 | 6.44 KB | 44.51 KB | 7 |
| @jdsalasc/solvejs-objects | 1.9.0 | 4.19 KB | 22.38 KB | 7 |
| @jdsalasc/solvejs-regex | 1.9.0 | 3.09 KB | 11.87 KB | 7 |
| @jdsalasc/solvejs-schema | 1.9.0 | 7.50 KB | 51.61 KB | 7 |
| @jdsalasc/solvejs-string | 1.9.0 | 3.52 KB | 17.51 KB | 7 |
| @jdsalasc/solvejs-validators | 1.9.0 | 10.71 KB | 82.55 KB | 7 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Regenerate with `npm run report:perf`.
