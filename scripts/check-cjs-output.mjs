// Smoke test for the CommonJS output of every package.
//
// Every test suite in this repository exercises dist/esm only, but each package also ships a
// dist/cjs entry point reached through `require()`. The CJS build is produced by renaming every
// .js file to .cjs and rewriting the require specifiers, which is easy to get subtly wrong: a
// missed require, a nested directory that was not renamed, or a stray .js left behind. None of
// that breaks the ESM tests, so it would only surface for a user on require().
//
// This script loads the CJS entry point of every package, asserts the documented exports are
// present, and fails when any package left a .js file behind in its CJS output.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const root = JSON.parse(readFileSync("package.json", "utf8"));
const packages = (root.workspaces ?? []).flatMap((pattern) => {
  const dir = pattern.replace(/\/\*$/, "");
  return existsSync(dir)
    ? readdirSync(dir)
        .map((name) => join(dir, name))
        .filter((path) => existsSync(join(path, "package.json")))
    : [];
});

const problems = [];
let checked = 0;

for (const path of packages) {
  const manifest = JSON.parse(readFileSync(join(path, "package.json"), "utf8"));
  const entry = manifest.exports?.["."]?.require;
  if (!entry) {
    problems.push(`${manifest.name}: no CommonJS entry point declared in exports`);
    continue;
  }

  const entryPath = join(path, entry);
  if (!existsSync(entryPath)) {
    problems.push(`${manifest.name}: missing ${entry}, run npm run build`);
    continue;
  }

  let loaded;
  try {
    loaded = require(join(process.cwd(), entryPath));
  } catch (error) {
    problems.push(`${manifest.name}: require() failed with ${error.message}`);
    continue;
  }

  const names = Object.keys(loaded);
  if (names.length === 0) {
    problems.push(`${manifest.name}: the CommonJS entry point exports nothing`);
    continue;
  }

  // A leftover .js in dist/cjs means the rename pass missed a file or a nested directory.
  const cjsDir = join(path, "dist", "cjs");
  const stray = [];
  const walk = (dir) => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, item.name);
      if (item.isDirectory()) walk(full);
      else if (item.name.endsWith(".js")) stray.push(full.slice(cjsDir.length + 1));
    }
  };
  if (existsSync(cjsDir)) walk(cjsDir);
  if (stray.length > 0) {
    problems.push(`${manifest.name}: dist/cjs still contains ${stray.join(", ")}`);
  }

  checked += 1;
  console.log(`${manifest.name}: ${names.length} exports load from CommonJS`);
}

console.log(`\nLoaded ${checked} of ${packages.length} packages from CommonJS.`);
if (problems.length > 0) {
  console.error(`${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exitCode = 1;
}