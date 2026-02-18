import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const configPath = join("scripts", "test-baseline.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const defaultMinimum = Number(config.defaultMinimum || 3);
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

const packageDirs = readdirSync("packages").filter((name) => existsSync(join("packages", name, "package.json")));
const failures = [];

for (const dir of packageDirs) {
  const pkgJson = JSON.parse(readFileSync(join("packages", dir, "package.json"), "utf8"));
  const pkgName = pkgJson.name;
  const actual = countTests(join("packages", dir, "test"));
  const minimum = Number(overrides[pkgName] ?? defaultMinimum);
  if (actual < minimum) {
    failures.push({ pkgName, actual, minimum });
  }
}

if (failures.length > 0) {
  console.error("Test baseline check failed:");
  for (const failure of failures) {
    console.error(`- ${failure.pkgName}: ${failure.actual} tests, minimum required ${failure.minimum}`);
  }
  process.exitCode = 1;
} else {
  console.log("Test baseline check passed.");
}
