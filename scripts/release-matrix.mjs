// Builds the list of packages to publish, derived from the workspaces on disk.
//
// The release workflow used to carry a hardcoded matrix, which is how nine packages ended up
// absent from it: solvejs-schema was published once and then could never be updated again, and the
// eight newer packages were never publishable at all. A matrix nobody regenerates rots silently.
//
// The meta package is excluded here and published by a separate job that runs after the leaves,
// because it depends on every one of them.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const META = "@jdsalasc/solvejs";

const root = JSON.parse(readFileSync("package.json", "utf8"));

const workspaces = (root.workspaces ?? []).flatMap((pattern) => {
  const dir = pattern.replace(/\/\*$/, "");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => join(dir, name))
    .filter((path) => existsSync(join(path, "package.json")))
    .map((path) => ({ path, manifest: JSON.parse(readFileSync(join(path, "package.json"), "utf8")) }));
});

const leaves = workspaces
  .filter((entry) => entry.manifest.name !== META && entry.manifest.private !== true)
  // Forward slashes everywhere, so the list the workflow sees on Linux is the one verified here.
  .map((entry) => entry.path.replace(/\\/g, "/"));

// Sorted so a re-run produces the same order and the workflow diff stays readable.
leaves.sort();

// Fail here rather than halfway through a release matrix job: npm would reject these anyway, and
// a partial publish is worse than a clean refusal.
for (const entry of workspaces) {
  const { name, version, private: isPrivate } = entry.manifest;
  if (isPrivate === true || name === META) continue;
  if (!name?.startsWith("@")) {
    throw new Error(`${entry.path}: name ${JSON.stringify(name)} is not scoped, refusing to publish it.`);
  }
  if (typeof version !== "string" || version.length === 0) {
    throw new Error(`${entry.path}: no version declared, npm publish would fail.`);
  }
}

process.stdout.write(JSON.stringify(leaves));