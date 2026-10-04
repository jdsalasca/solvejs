import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// The release workflow used to carry a hardcoded matrix of 11 packages while the workspace had 20.
// Nine packages were therefore never publishable: solvejs-schema was stuck on npm at v1.0.0 with no
// way to update it, and the eight newer packages could not be released at all even though the meta
// package depends on them. This test exists so that class of drift cannot come back silently.

const matrix = JSON.parse(execFileSync(process.execPath, ["scripts/release-matrix.mjs"], { encoding: "utf8" }));

const root = JSON.parse(readFileSync("package.json", "utf8"));
const workspaces = (root.workspaces ?? []).flatMap((pattern) => {
  const dir = pattern.replace(/\/\*$/, "");
  return existsSync(dir)
    ? readdirSync(dir)
        .map((name) => join(dir, name))
        .filter((path) => existsSync(join(path, "package.json")))
        .map((path) => ({ path: path.replace(/\\/g, "/"), manifest: JSON.parse(readFileSync(join(path, "package.json"), "utf8")) }))
    : [];
});

test("the publish list covers every publishable workspace", () => {
  const expected = workspaces
    .filter((entry) => entry.manifest.name !== "@jdsalasc/solvejs" && entry.manifest.private !== true)
    .map((entry) => entry.path)
    .sort();

  assert.deepEqual([...matrix].sort(), expected, "the matrix must be derived from the workspaces, not typed by hand");
  assert.ok(matrix.length >= 19, `expected every leaf to be publishable, got ${matrix.length}`);
});

test("the publish list uses forward slashes so it is identical on Linux and Windows", () => {
  for (const entry of matrix) {
    assert.equal(entry.includes("\\"), false, `${entry} must not contain a backslash`);
    assert.match(entry, /^packages\/solvejs-[a-z-]+$/);
  }
});

test("the publish list excludes the meta package, which publishes after the leaves", () => {
  assert.equal(matrix.includes("packages/solvejs"), false, "the meta package is published by its own job");
  assert.equal(matrix.includes("packages/solvejs/"), false);
});

test("the release workflow derives its matrix instead of hardcoding one", () => {
  const workflow = readFileSync(join(".github", "workflows", "release.yml"), "utf8");

  assert.match(workflow, /node scripts\/release-matrix\.mjs/, "the matrix must come from the script");
  assert.equal(
    /^\s*-\s*packages\/solvejs-[a-z]+\s*$/m.test(workflow),
    false,
    "no package may be listed literally in the workflow again"
  );
  assert.match(workflow, /needs:\s*publish-leaves/, "the meta publish must wait for every leaf");
});