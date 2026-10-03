import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const scriptName = process.argv[2];

if (!scriptName) {
  console.error("Usage: node scripts/run-workspaces.mjs <scriptName>");
  process.exit(1);
}

const rootPackage = JSON.parse(readFileSync("package.json", "utf8"));
const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";

function readManifest(dir) {
  const path = join("packages", dir, "package.json");
  if (!existsSync(path)) return null;
  return { dir, ...JSON.parse(readFileSync(path, "utf8")) };
}

const manifests = readdirSync("packages")
  .map(readManifest)
  .filter(Boolean)
  .filter((manifest) => rootPackage.workspaces.includes(`packages/${manifest.dir}`) || rootPackage.workspaces.includes("packages/*"));

const byName = new Map(manifests.map((manifest) => [manifest.name, manifest]));

function internalDependencies(manifest) {
  return Object.keys(manifest.dependencies ?? {}).filter((name) => byName.has(name));
}

const ordered = [];
const visited = new Set();
let visiting = new Set();

function visit(manifest) {
  if (visited.has(manifest.name)) return;
  if (visiting.has(manifest.name)) {
    console.error(`Dependency cycle detected at ${manifest.name}`);
    process.exit(1);
  }
  visiting.add(manifest.name);
  for (const dependency of internalDependencies(manifest)) {
    visit(byName.get(dependency));
  }
  visiting.delete(manifest.name);
  visited.add(manifest.name);
  ordered.push(manifest);
}

for (const manifest of manifests) visit(manifest);

for (const manifest of ordered) {
  console.log(`\n> ${manifest.name}@${manifest.version} ${scriptName}`);
  const result = spawnSync(npmBin, ["run", scriptName, "--workspace", `packages/${manifest.dir}`], {
    stdio: "inherit",
    shell: true
  });
  if (result.status !== 0) {
    console.error(`\nFailed running "${scriptName}" in ${manifest.name} (${manifest.dir}).`);
    process.exit(result.status ?? 1);
  }
}
