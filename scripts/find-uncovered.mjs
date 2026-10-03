// Lists the exact source lines of uncovered branches from raw V8 coverage.
// Usage: node scripts/find-uncovered.mjs <pkgDir> [outDir]
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const pkg = process.argv[2];
const out = join(process.cwd(), ".coverage-tmp", pkg);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// The test files are listed explicitly rather than globbed, so this needs no shell and works
// the same on every platform.
const tests = readdirSync(join(pkg, "test"))
  .filter((name) => name.endsWith(".test.mjs"))
  .map((name) => join("test", name));

execFileSync(process.execPath, ["--test", ...tests], {
  cwd: pkg,
  env: { ...process.env, NODE_V8_COVERAGE: out },
  stdio: "ignore"
});

const target = join(pkg, "dist", "esm", "index.js");
const source = readFileSync(target, "utf8");
const lineStarts = [0];
for (let i = 0; i < source.length; i++) if (source[i] === "\n") lineStarts.push(i + 1);
const lineOf = (offset) => {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
};

const hits = [];
for (const file of readdirSync(out)) {
  if (!file.endsWith(".json")) continue;
  const report = JSON.parse(readFileSync(join(out, file), "utf8"));
  for (const script of report.result ?? []) {
    if (!script.url.endsWith(target.replaceAll("\\", "/"))) continue;
    for (const fn of script.functions) {
      for (const range of fn.ranges) {
        if (range.count > 0) continue;
        const line = lineOf(range.startOffset);
        hits.push({ line, col: range.startOffset - lineStarts[line - 1] + 1, count: range.count });
      }
    }
  }
}

// Ranges nest, so keep the outermost uncovered ones only.
const seen = new Set();
const lines = hits
  .filter((h) => (seen.has(h.line) ? false : (seen.add(h.line), true)))
  .sort((a, b) => a.line - b.line);

console.log(`${pkg}: ${lines.length} uncovered range(s)`);
for (const { line } of lines) {
  const text = source.split("\n")[line - 1];
  console.log(`  ${String(line).padStart(4)} | ${text.trim().slice(0, 110)}`);
}