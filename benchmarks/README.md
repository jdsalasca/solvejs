# SolveJS Benchmarks

Run quick local benchmarks:

```bash
npm run benchmark
```

This benchmark is a lightweight smoke benchmark for hot utility paths and should not replace full profiling.

Includes list-scale checks at `10k` and `100k` rows for:

- `uniqueBy`
- `groupBy`
- `sortBy`

Generate benchmark and package-size docs snapshot:

```bash
npm run report:perf
```
