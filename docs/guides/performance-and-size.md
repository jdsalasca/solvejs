# SolveJS Performance and Size Report

Generated on 2026-02-18.

## Benchmark Snapshot

- date.formatDate: 24.97ms for 100.000 iterations
- string.toKebabCase: 46.86ms for 100.000 iterations
- list.unique: 7.74ms for 100.000 iterations
- numbers.percent: 2.27ms for 100.000 iterations
- validators.isCellphoneNumber: 7.54ms for 100.000 iterations

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.4.0 | 2.07 KB | 5.81 KB | 7 |
| @jdsalasc/solvejs-constants | 1.4.0 | 2.70 KB | 9.47 KB | 7 |
| @jdsalasc/solvejs-date | 1.4.0 | 10.14 KB | 72.05 KB | 7 |
| @jdsalasc/solvejs-list | 1.4.0 | 3.89 KB | 21.37 KB | 7 |
| @jdsalasc/solvejs-numbers | 1.4.0 | 5.16 KB | 33.15 KB | 7 |
| @jdsalasc/solvejs-objects | 1.4.0 | 3.79 KB | 19.94 KB | 7 |
| @jdsalasc/solvejs-regex | 1.4.0 | 2.85 KB | 10.80 KB | 7 |
| @jdsalasc/solvejs-string | 1.4.0 | 3.31 KB | 16.62 KB | 7 |
| @jdsalasc/solvejs-validators | 1.4.0 | 12.43 KB | 108.28 KB | 7 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Regenerate with `npm run report:perf`.
