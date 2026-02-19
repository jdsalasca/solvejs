import { performance } from "node:perf_hooks";
import { formatDate } from "../packages/solvejs-date/dist/esm/index.js";
import { toKebabCase } from "../packages/solvejs-string/dist/esm/index.js";
import { groupBy, sortBy, unique, uniqueBy } from "../packages/solvejs-list/dist/esm/index.js";
import { percent } from "../packages/solvejs-numbers/dist/esm/index.js";
import { isCellphoneNumber } from "../packages/solvejs-validators/dist/esm/index.js";

function run(label, iterations, fn) {
  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    fn(i);
  }
  const totalMs = performance.now() - start;
  console.log(`${label}: ${totalMs.toFixed(2)}ms for ${iterations.toLocaleString()} iterations`);
}

const iterations = 100000;

run("date.formatDate", iterations, () => formatDate(new Date("2026-02-07T00:00:00.000Z")));
run("string.toKebabCase", iterations, () => toKebabCase("Solve JS Utilities Fast"));
run("list.unique", iterations, () => unique([1, 1, 2, 2, 3, 4, 4, 5]));
run("numbers.percent", iterations, () => percent(25, 200, 2));
run("validators.isCellphoneNumber", iterations, () => isCellphoneNumber("+573001112233"));

function runListScaleBenchmarks(size) {
  const rows = Array.from({ length: size }, (_, index) => ({
    id: `id-${index % Math.max(10, Math.floor(size / 10))}`,
    team: `team-${index % 5}`,
    score: size - index
  }));

  run(`list.uniqueBy (${size})`, 1, () => uniqueBy(rows, (row) => row.id));
  run(`list.groupBy (${size})`, 1, () => groupBy(rows, (row) => row.team));
  run(`list.sortBy (${size})`, 1, () => sortBy(rows, (row) => row.score, "desc"));
}

runListScaleBenchmarks(10000);
runListScaleBenchmarks(100000);

function runListHighCardinalityBenchmarks(size) {
  const rows = Array.from({ length: size }, (_, index) => ({
    id: `txn-${index}`,
    merchantId: `merchant-${index % Math.max(1000, Math.floor(size / 20))}`,
    amount: (index * 17) % 100000
  }));

  run(`list.uniqueBy high-cardinality (${size})`, 1, () => uniqueBy(rows, (row) => row.id));
  run(`list.groupBy high-cardinality (${size})`, 1, () => groupBy(rows, (row) => row.merchantId));
  run(`list.sortBy high-cardinality (${size})`, 1, () => sortBy(rows, (row) => row.amount, "desc"));
}

runListHighCardinalityBenchmarks(100000);
runListHighCardinalityBenchmarks(250000);
