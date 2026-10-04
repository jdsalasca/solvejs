// Meta-package hygiene for @jdsalasc/solvejs. It re-exports every leaf package with `export *`,
// which makes two mistakes possible that no leaf package test can catch:
//
//   1. Wiring drift. A leaf added to the workspace but not declared in the meta package.json, or
//      declared but not re-exported in src, is invisible until a user imports it.
//   2. Ambiguous names. When two packages export the same name, `export *` drops it from the
//      namespace, so a user of the meta package hits a build error while each package works alone.
//
// Both are checked here. Exits non-zero on any finding so it can gate a release.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const problems = [];

// --- Wiring ---------------------------------------------------------------------------------

const root = JSON.parse(readFileSync("package.json", "utf8"));
const workspaces = (root.workspaces ?? []).flatMap((pattern) => {
  const dir = pattern.replace(/\/\*$/, "");
  return existsSync(dir)
    ? readdirSync(dir)
        .map((name) => join(dir, name))
        .filter((path) => existsSync(join(path, "package.json")))
    : [];
});

const leafPaths = workspaces.filter(
  (path) => JSON.parse(readFileSync(join(path, "package.json"), "utf8")).name !== "@jdsalasc/solvejs"
);
const leafNames = leafPaths
  .map((path) => JSON.parse(readFileSync(join(path, "package.json"), "utf8")).name)
  .sort();

const metaPkg = JSON.parse(readFileSync("packages/solvejs/package.json", "utf8"));
const declared = Object.keys(metaPkg.dependencies ?? {}).sort();

const metaSrc = readFileSync("packages/solvejs/src/index.ts", "utf8");
const reexported = [...metaSrc.matchAll(/export\s+\*\s+from\s+"([^"]+)"/g)].map((m) => m[1]).sort();

const compare = (label, list, other) => {
  for (const name of list.filter((n) => !other.includes(n))) {
    problems.push(`${label}: ${name}`);
  }
};

compare("In the workspace but not declared in the meta package.json", leafNames, declared);
compare("Declared in the meta but not a workspace package", declared, leafNames);
compare("Declared in the meta but not re-exported in src", declared, reexported);
compare("Re-exported in src but not declared in the meta", reexported, declared);

// --- Ambiguous names ------------------------------------------------------------------------

const namedExportsOf = (file) => {
  const source = readFileSync(file, "utf8");
  const names = new Set();
  for (const match of source.matchAll(/^export\s+(?:declare\s+)?(?:const|function|class|let|var)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(match[1]);
  }
  for (const match of source.matchAll(/^export\s*\{([^}]+)\}/gm)) {
    for (const part of match[1].split(",")) {
      const raw = part.trim();
      if (!raw) continue;
      const alias = raw.split(/\s+as\s+/);
      names.add((alias[1] ?? alias[0]).trim());
    }
  }
  return names;
};

const owners = new Map();
for (const path of leafPaths) {
  const short = path.replace(/^packages[\\/]/, "").split("solvejs-")[1] ?? path;
  const file = join(path, "dist", "esm", "index.js");
  if (!existsSync(file)) {
    problems.push(`No ESM build for ${short}; run npm run build first`);
    continue;
  }
  for (const symbol of namedExportsOf(file)) {
    if (!owners.has(symbol)) owners.set(symbol, []);
    owners.get(symbol).push(short);
  }
}

for (const [symbol, pkgs] of owners) {
  if (pkgs.length > 1) {
    problems.push(`Ambiguous export ${symbol}, provided by: ${pkgs.join(", ")}`);
  }
}

// --- Report ---------------------------------------------------------------------------------

console.log(`Checked ${leafNames.length} leaf packages and ${owners.size} exported names.`);
if (problems.length === 0) {
  console.log("Meta package wiring and exports are consistent.");
} else {
  console.error(`${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exitCode = 1;
}