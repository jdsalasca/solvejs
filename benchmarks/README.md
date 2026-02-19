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

Includes high-cardinality list scenarios at `100k` and `250k` rows with near-unique IDs and large grouping-key sets.

Generate benchmark and package-size docs snapshot:

```bash
npm run report:perf
```
