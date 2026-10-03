// Prints every V8 coverage range overlapping a source line, covered or not.
// Usage: node scripts/range-detail.mjs <pkgDir> <line>
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const [pkg, lineArg] = process.argv.slice(2);
const want = Number(lineArg);
const out = join(process.cwd(), ".coverage-tmp", `detail-${pkg}`);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const tests = readdirSync(join(pkg, "test"))
  .filter((name) => name.endsWith(".test.mjs"))
  .map((name) => join("test", name));

execFileSync(process.execPath, ["--test", ...tests], {
  cwd: pkg,
  env: { ...process.env, NODE_V8_COVERAGE: out },
  stdio: "ignore"
});

const target = join(pkg, "dist", "esm", "index.js").replaceAll("\\", "/");
const source = readFileSync(join(pkg, "dist", "esm", "index.js"), "utf8");
const start = source.split("\n").slice(0, want - 1).reduce((n, l) => n + l.length + 1, 0);
const end = start + source.split("\n")[want - 1].length;

console.log(`${pkg} line ${want}: ${JSON.stringify(source.split("\n")[want - 1])}`);
console.log(`  offsets ${start}..${end}`);

let scripts = 0;
for (const file of readdirSync(out)) {
  if (!file.endsWith(".json")) continue;
  const report = JSON.parse(readFileSync(join(out, file), "utf8"));
  for (const script of report.result ?? []) {
    if (!script.url.endsWith(target)) continue;
    scripts++;
    for (const fn of script.functions) {
      for (const range of fn.ranges) {
        const overlaps = range.startOffset < end && range.endOffset > start;
        if (!overlaps) continue;
        const kind = range.count > 0 ? "COVERED" : "UNCOVERED";
        const text = source.slice(range.startOffset, range.endOffset).replace(/\n/g, "\\n").slice(0, 70);
        console.log(`  ${kind} count=${range.count} ${range.startOffset}..${range.endOffset} | ${text}`);
      }
    }
  }
}
console.log(`  scripts matched: ${scripts}`);