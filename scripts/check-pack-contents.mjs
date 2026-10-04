// Verifies what each package would actually publish with `npm pack`.
//
// The `files` field and a missing .npmignore decide the tarball, and a mistake there is invisible
// until the package is on the registry: a missing README, a missing type declaration for a
// TypeScript user, or a source map shipped without its sources. This check packs every package in
// dry-run mode and asserts the required entries are present and that nothing unintended is.
//
// It is slower than the other gates because npm pack shells out per package.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = JSON.parse(readFileSync("package.json", "utf8"));
const packages = (root.workspaces ?? []).flatMap((pattern) => {
  const dir = pattern.replace(/\/\*$/, "");
  return existsSync(dir)
    ? readdirSync(dir)
        .map((name) => join(dir, name))
        .filter((path) => existsSync(join(path, "package.json")))
    : [];
});

// A published package must carry the entry points its manifest promises, plus a README so the
// npm page is not blank. Source files are not required because the build is the artifact.
// npm ships as npm.cmd on Windows and as npm elsewhere, and resolving it by path is
// installation-specific. npm_execpath points at npm-cli.js when this runs under npm, so use it
// directly; the arguments below are fixed strings, so there is nothing to inject.
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error("Run this through npm so npm_execpath is set, or invoke it as `npm run check:pack`.");
  process.exit(1);
}

const problems = [];
let checked = 0;

for (const path of packages) {
  const manifest = JSON.parse(readFileSync(join(path, "package.json"), "utf8"));
  let report;
  try {
    report = JSON.parse(
      execFileSync(process.execPath, [npmCli, "pack", "--dry-run", "--json"], {
        cwd: path,
        encoding: "utf8"
      })
    );
  } catch (error) {
    problems.push(`${manifest.name}: npm pack failed with ${error.message}`);
    continue;
  }

  const packed = report[0];
  const entries = new Set((packed.files ?? []).map((f) => f.path.replace(/\\/g, "/")));
  const required = ["package.json", "README.md"];

  const entry = manifest.exports?.["."] ?? {};
  for (const field of ["types", "import", "require"]) {
    const value = entry[field];
    if (!value) {
      problems.push(`${manifest.name}: exports["."].${field} is not declared`);
      continue;
    }
    if (!entries.has(value.replace(/^\.\//, ""))) {
      problems.push(`${manifest.name}: exports["."].${field} points at ${value}, which is not in the tarball`);
    }
  }

  for (const requiredFile of required) {
    if (!entries.has(requiredFile)) {
      problems.push(`${manifest.name}: ${requiredFile} would not be published`);
    }
  }

  // Anything under src/ or a test file is source that should not ship.
  for (const file of entries) {
    if (file.startsWith("src/") || file.includes("/test/") || file.startsWith("test/")) {
      problems.push(`${manifest.name}: ${file} should not be published`);
    }
  }

  checked += 1;
  console.log(`${manifest.name}: ${entries.size} files, ${(packed.size / 1024).toFixed(1)} kB packed`);
}

console.log(`\nChecked the publish contents of ${checked} of ${packages.length} packages.`);
if (problems.length > 0) {
  console.error(`${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exitCode = 1;
}