# SolveJS Performance and Size Report

Generated on 2026-10-03.

## Benchmark Snapshot

- date.formatDate: 45.27ms for 100.000 iterations
- string.toKebabCase: 117.55ms for 100.000 iterations
- list.unique: 21.96ms for 100.000 iterations
- numbers.percent: 5.91ms for 100.000 iterations
- validators.isCellphoneNumber: 16.65ms for 100.000 iterations
- url.buildUrl: 380.30ms for 100.000 iterations
- url.stringifyQuery: 244.08ms for 100.000 iterations
- url.parseQuery: 122.79ms for 100.000 iterations
- list.uniqueBy (10000): 3.03ms for 1 iterations
- list.groupBy (10000): 1.83ms for 1 iterations
- list.sortBy (10000): 1.14ms for 1 iterations
- list.uniqueBy (100000): 37.08ms for 1 iterations
- list.groupBy (100000): 11.43ms for 1 iterations
- list.sortBy (100000): 4.26ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 59.28ms for 1 iterations
- list.groupBy high-cardinality (100000): 62.87ms for 1 iterations
- list.sortBy high-cardinality (100000): 22.70ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 220.05ms for 1 iterations
- list.groupBy high-cardinality (250000): 250.99ms for 1 iterations
- list.sortBy high-cardinality (250000): 84.92ms for 1 iterations

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.9.0 | 2.48 KB | 6.97 KB | 7 |
| @jdsalasc/solvejs-async | 1.9.0 | 8.57 KB | 51.96 KB | 7 |
| @jdsalasc/solvejs-constants | 1.9.0 | 3.33 KB | 12.06 KB | 7 |
| @jdsalasc/solvejs-date | 1.9.0 | 5.92 KB | 43.46 KB | 7 |
| @jdsalasc/solvejs-env | 1.9.0 | 5.61 KB | 42.77 KB | 7 |
| @jdsalasc/solvejs-list | 1.9.0 | 4.44 KB | 25.58 KB | 7 |
| @jdsalasc/solvejs-numbers | 1.9.0 | 6.67 KB | 45.00 KB | 7 |
| @jdsalasc/solvejs-objects | 1.9.0 | 4.19 KB | 22.38 KB | 7 |
| @jdsalasc/solvejs-regex | 1.9.0 | 3.09 KB | 11.87 KB | 7 |
| @jdsalasc/solvejs-schema | 1.9.0 | 7.50 KB | 51.61 KB | 7 |
| @jdsalasc/solvejs-string | 1.9.0 | 3.52 KB | 17.51 KB | 7 |
| @jdsalasc/solvejs-url | 0.1.0 | 6.68 KB | 34.85 KB | 7 |
| @jdsalasc/solvejs-validators | 1.9.0 | 10.71 KB | 82.55 KB | 7 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Regenerate with `npm run report:perf`.
