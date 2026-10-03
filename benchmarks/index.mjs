import { performance } from "node:perf_hooks";
import { formatDate } from "../packages/solvejs-date/dist/esm/index.js";
import { toKebabCase } from "../packages/solvejs-string/dist/esm/index.js";
import { groupBy, sortBy, unique, uniqueBy } from "../packages/solvejs-list/dist/esm/index.js";
import { percent } from "../packages/solvejs-numbers/dist/esm/index.js";
import { isCellphoneNumber } from "../packages/solvejs-validators/dist/esm/index.js";
import { buildUrl, stringifyQuery, parseQuery } from "../packages/solvejs-url/dist/esm/index.js";
import { createLruCache, createTtlCache, memoizeAsync, stableKey } from "../packages/solvejs-cache/dist/esm/index.js";
import { deepClone, deepEqual, safeJsonParse, stableStringify } from "../packages/solvejs-json/dist/esm/index.js";
import { offsetToCursor, paginate } from "../packages/solvejs-pagination/dist/esm/index.js";
import { compareVersions, parseVersion, satisfies } from "../packages/solvejs-semver/dist/esm/index.js";
import { createError, normalizeError, serializeError } from "../packages/solvejs-errors/dist/esm/index.js";
import { addMoney, allocateAmount, fromDecimal, percentageOf } from "../packages/solvejs-money/dist/esm/index.js";
import { calculateBackoffDelay, negotiateContentType, parseContentType } from "../packages/solvejs-http/dist/esm/index.js";

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
run("url.buildUrl", iterations, () => buildUrl("https://api.example.com", { path: "users", query: { page: 2 } }));
run("url.stringifyQuery", iterations, () => stringifyQuery({ page: 2, q: "shoes", tag: ["a", "b"] }));
run("url.parseQuery", iterations, () => parseQuery("?page=2&q=shoes&tag=a&tag=b"));
run("cache.stableKey", iterations, () => stableKey({ userId: 42, scopes: ["a", "b"], nested: { z: 1, y: 2 } }));
run("json.stableStringify", iterations, () => stableStringify({ b: 1, a: 2, nested: { z: 1, y: 2 } }));
run("json.safeJsonParse", iterations, () => safeJsonParse('{"a":1,"b":[1,2],"c":{"d":true}}'));
run("json.deepClone", iterations, () => deepClone({ a: 1, nested: { b: [1, 2, 3] } }));
run("json.deepEqual", iterations, () => deepEqual({ a: 1, nested: { b: [1, 2, 3] } }, { a: 1, nested: { b: [1, 2, 3] } }));
run("pagination.offsetToCursor", iterations, () => offsetToCursor(4821));
run("semver.parseVersion", iterations, () => parseVersion("1.2.3-rc.1+build.5"));
run("semver.satisfies", iterations, () => satisfies("1.4.2", "^1.2.0"));
run("semver.compareVersions", iterations, () => compareVersions("1.2.3-rc.1", "1.2.3"));
run("errors.createError", iterations, () => createError("NOT_FOUND", "No such user.", { details: { id: 7 } }));
run("errors.normalizeError", iterations, () => normalizeError(new Error("boom")));
run("errors.serializeError", iterations, () => serializeError(new Error("boom"), { mask: /boom/ }));
run("money.fromDecimal", iterations, () => fromDecimal("1234.56", { currency: "USD" }));
run("money.addMoney", iterations, () => addMoney(fromDecimal("10.00", { currency: "USD" }), fromDecimal("0.10", { currency: "USD" })));
run("money.percentageOf", iterations, () => percentageOf(fromDecimal("199.99", { currency: "USD" }), 15));
run("http.calculateBackoffDelay", iterations, () => calculateBackoffDelay(3, { baseMs: 100, factor: 2, maxMs: 30_000 }));
run("http.parseContentType", iterations, () => parseContentType("application/json; charset=utf-8"));
run("http.negotiateContentType", iterations, () =>
  negotiateContentType(["application/json", "text/html"], { accept: "text/html;q=0.5,application/json;q=0.9" }));

function runCacheBenchmarks(size) {
  const lru = createLruCache({ maxSize: size });
  const ttl = createTtlCache({ ttlMs: 60_000, now: () => 0 });
  for (let i = 0; i < size; i += 1) {
    lru.set(`key-${i}`, i);
    ttl.set(`key-${i}`, i);
  }

  run(`cache.createLruCache.get (${size})`, 1, () => lru.get(`key-${size - 1}`));
  run(`cache.createTtlCache.get (${size})`, 1, () => ttl.get(`key-${size - 1}`));
}

runCacheBenchmarks(10000);
runCacheBenchmarks(100000);

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
