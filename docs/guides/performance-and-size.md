# SolveJS Performance and Size Report

Generated on 2026-10-03.

## Benchmark Snapshot

- date.formatDate: 50.01ms for 100.000 iterations
- string.toKebabCase: 118.51ms for 100.000 iterations
- list.unique: 13.18ms for 100.000 iterations
- numbers.percent: 3.49ms for 100.000 iterations
- validators.isCellphoneNumber: 12.34ms for 100.000 iterations
- url.buildUrl: 292.25ms for 100.000 iterations
- url.stringifyQuery: 84.74ms for 100.000 iterations
- url.parseQuery: 113.59ms for 100.000 iterations
- list.uniqueBy (10000): 1.33ms for 1 iterations
- list.groupBy (10000): 1.21ms for 1 iterations
- list.sortBy (10000): 0.90ms for 1 iterations
- list.uniqueBy (100000): 33.03ms for 1 iterations
- list.groupBy (100000): 7.84ms for 1 iterations
- list.sortBy (100000): 2.50ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 45.35ms for 1 iterations
- list.groupBy high-cardinality (100000): 51.36ms for 1 iterations
- list.sortBy high-cardinality (100000): 15.23ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 158.85ms for 1 iterations
- list.groupBy high-cardinality (250000): 167.29ms for 1 iterations
- list.sortBy high-cardinality (250000): 54.43ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 52.90% | 57.00% | 18.09% |
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
| @jdsalasc/solvejs-url | 99.00% | 93.33% | 100.00% |
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
| @jdsalasc/solvejs-url | 0.1.0 | 6.68 KB | 34.85 KB | 7 |
| @jdsalasc/solvejs-validators | 1.9.0 | 10.71 KB | 82.55 KB | 7 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
