import { performance } from "node:perf_hooks";
import { formatDate } from "../packages/solvejs-date/dist/esm/index.js";
import { toKebabCase } from "../packages/solvejs-string/dist/esm/index.js";
import { unique } from "../packages/solvejs-list/dist/esm/index.js";
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
