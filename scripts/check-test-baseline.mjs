import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const configPath = join("scripts", "test-baseline.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const defaultMinimum = Number(config.defaultMinimum || 0);
const overrides = config.packageMinimums || {};

function countTests(testDir) {
  if (!existsSync(testDir)) return 0;
  let count = 0;
  for (const file of readdirSync(testDir)) {
    if (!file.endsWith(".mjs")) continue;
    const content = readFileSync(join(testDir, file), "utf8");
    count += (content.match(/test\(/g) || []).length;
  }
  return count;
}

// Counts exported functions, which is what the trust bar is measured against. A
// constant or a type needs no behavioural test, so only functions count.
function countFunctionExports(sourcePath) {
  if (!existsSync(sourcePath)) return 0;
  const source = readFileSync(sourcePath, "utf8");
  return (source.match(/export\s+(?:async\s+)?function\s+\w+/g) || []).length;
}

const packageDirs = readdirSync("packages").filter((name) => existsSync(join("packages", name, "package.json")));
const failures = [];
const rows = [];

for (const dir of packageDirs) {
  const pkgJson = JSON.parse(readFileSync(join("packages", dir, "package.json"), "utf8"));
  const pkgName = pkgJson.name;
  const actual = countTests(join("packages", dir, "test"));
  const exported = countFunctionExports(join("packages", dir, "src", "index.ts"));
  // A package with no src/index.ts re-exports other packages, so its own export
  // count says nothing useful; fall back to the configured minimum.
  const configured = overrides[pkgName];
  const minimum = Number(configured ?? (exported > 0 ? exported : defaultMinimum));

  rows.push({ pkgName, actual, minimum });

  if (actual < minimum) {
    failures.push({ pkgName, actual, minimum, exported });
  }
}

if (failures.length > 0) {
  console.error("Test baseline check failed:");
  for (const failure of failures) {
    console.error(`- ${failure.pkgName}: ${failure.actual} tests for ${failure.exported} exported functions, minimum required ${failure.minimum}`);
  }
  process.exitCode = 1;
} else {
  const totalTests = rows.reduce((sum, row) => sum + row.actual, 0);
  console.log(`Test baseline check passed: ${rows.length} packages, ${totalTests} test blocks.`);
  for (const row of rows) {
    console.log(`- ${row.pkgName}: ${row.actual}/${row.minimum}`);
  }
}
