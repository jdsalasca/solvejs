import { performance } from "node:perf_hooks";
import { readXlsx, writeXlsx, writeXlsxCompressed } from "../dist/esm/index.js";

const ROWS = 10_000;
const COLUMNS = 8;
const rows = Array.from({ length: ROWS }, (_, index) => [
  index,
  `Customer ${index}`,
  index * 100,
  new Date(Date.UTC(2026, 0, 1 + (index % 365))),
  index % 2 === 0,
  `Region ${index % 5}`,
  index * 0.25,
  `Note ${index}`
]);
const input = {
  sheets: [
    {
      name: "Rows",
      columns: Array.from({ length: COLUMNS }, (_, index) => ({ width: index === 1 ? 24 : 12 })),
      rows
    }
  ]
};

const timed = (label, fn) => {
  const start = performance.now();
  const result = fn();
  const ms = performance.now() - start;
  return { label, ms, result };
};

const stored = timed("writeXlsx (stored)", () => writeXlsx(input));
const compressed = await (async () => {
  const start = performance.now();
  const result = await writeXlsxCompressed(input);
  return { label: "writeXlsxCompressed", ms: performance.now() - start, result };
})();
const read = await (async () => {
  const start = performance.now();
  const result = await readXlsx(compressed.result);
  return { label: "readXlsx", ms: performance.now() - start, result };
})();

if (read.result.sheets[0].rows.length !== ROWS) {
  throw new Error("Benchmark read did not return every row.");
}

console.log(
  JSON.stringify(
    {
      rows: ROWS,
      columns: COLUMNS,
      stored: { ms: stored.ms.toFixed(1), bytes: stored.result.length },
      compressed: { ms: compressed.ms.toFixed(1), bytes: compressed.result.length },
      read: { ms: read.ms.toFixed(1), rows: read.result.sheets[0].rows.length }
    },
    null,
    2
  )
);
