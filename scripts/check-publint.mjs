import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
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

const windows = process.platform === "win32";
const command = windows ? process.env.ComSpec ?? "cmd.exe" : "npx";
const failures = [];

for (const path of packages) {
  const args = windows ? ["/d", "/s", "/c", `npx publint ${path}`] : ["publint", path];
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    failures.push({ path, output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim() });
  }
}

if (failures.length > 0) {
  console.error(`${failures.length} package(s) failed publint:`);
  for (const failure of failures) {
    console.error(`\n${failure.path}\n${failure.output}`);
  }
  process.exit(1);
}

console.log(`publint passed for ${packages.length} packages.`);
