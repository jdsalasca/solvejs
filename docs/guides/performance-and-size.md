# SolveJS Performance and Size Report

Generated on 2026-10-03.

## Benchmark Snapshot

- date.formatDate: 36.50ms for 100.000 iterations
- string.toKebabCase: 108.66ms for 100.000 iterations
- list.unique: 26.97ms for 100.000 iterations
- numbers.percent: 4.96ms for 100.000 iterations
- validators.isCellphoneNumber: 18.80ms for 100.000 iterations
- url.buildUrl: 359.39ms for 100.000 iterations
- url.stringifyQuery: 100.14ms for 100.000 iterations
- url.parseQuery: 86.70ms for 100.000 iterations
- list.uniqueBy (10000): 12.55ms for 1 iterations
- list.groupBy (10000): 1.42ms for 1 iterations
- list.sortBy (10000): 0.56ms for 1 iterations
- list.uniqueBy (100000): 111.21ms for 1 iterations
- list.groupBy (100000): 12.23ms for 1 iterations
- list.sortBy (100000): 6.33ms for 1 iterations
- list.uniqueBy high-cardinality (100000): 81.75ms for 1 iterations
- list.groupBy high-cardinality (100000): 91.41ms for 1 iterations
- list.sortBy high-cardinality (100000): 26.23ms for 1 iterations
- list.uniqueBy high-cardinality (250000): 270.16ms for 1 iterations
- list.groupBy high-cardinality (250000): 176.83ms for 1 iterations
- list.sortBy high-cardinality (250000): 64.73ms for 1 iterations

## Test Coverage (`node --test --experimental-test-coverage`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
| @jdsalasc/solvejs | 52.88% | 57.00% | 18.09% |
| @jdsalasc/solvejs-async | 93.65% | 80.49% | 97.50% |
| @jdsalasc/solvejs-constants | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-date | 95.05% | 89.66% | 100.00% |
| @jdsalasc/solvejs-env | 90.70% | 85.00% | 94.12% |
| @jdsalasc/solvejs-list | 98.93% | 97.30% | 100.00% |
| @jdsalasc/solvejs-numbers | 100.00% | 98.67% | 100.00% |
| @jdsalasc/solvejs-objects | 98.76% | 97.87% | 100.00% |
| @jdsalasc/solvejs-regex | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-schema | 86.94% | 76.52% | 92.45% |
| @jdsalasc/solvejs-string | 100.00% | 100.00% | 100.00% |
| @jdsalasc/solvejs-url | 99.00% | 93.33% | 100.00% |
| @jdsalasc/solvejs-validators | 98.37% | 95.30% | 100.00% |

## Package Size Snapshot (`npm pack --workspaces --dry-run`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
| @jdsalasc/solvejs | 1.9.0 | 2.48 KB | 6.97 KB | 7 |
| @jdsalasc/solvejs-async | 1.9.0 | 8.57 KB | 51.96 KB | 7 |
| @jdsalasc/solvejs-constants | 1.9.0 | 3.33 KB | 12.06 KB | 7 |
| @jdsalasc/solvejs-date | 1.9.0 | 6.77 KB | 45.08 KB | 7 |
| @jdsalasc/solvejs-env | 1.9.0 | 5.61 KB | 42.77 KB | 7 |
| @jdsalasc/solvejs-list | 1.9.0 | 4.70 KB | 26.32 KB | 7 |
| @jdsalasc/solvejs-numbers | 1.9.0 | 6.67 KB | 45.00 KB | 7 |
| @jdsalasc/solvejs-objects | 1.9.0 | 4.69 KB | 23.54 KB | 7 |
| @jdsalasc/solvejs-regex | 1.9.0 | 3.09 KB | 11.87 KB | 7 |
| @jdsalasc/solvejs-schema | 1.9.0 | 7.86 KB | 52.45 KB | 7 |
| @jdsalasc/solvejs-string | 1.9.0 | 3.93 KB | 18.52 KB | 7 |
| @jdsalasc/solvejs-url | 0.1.0 | 6.68 KB | 34.85 KB | 7 |
| @jdsalasc/solvejs-validators | 1.9.0 | 10.71 KB | 82.55 KB | 7 |

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; `n/a` means the package has no tests yet.
- Regenerate with `npm run report:perf`.
