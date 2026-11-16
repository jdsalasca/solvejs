import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

// Copies each package's built ESM output into docs/vendor so the static live
// documentation can import the real workspace build from GitHub Pages.
const packagesDir = "packages";
const vendorDir = "docs/vendor";
const entries = [];

rmSync(vendorDir, { recursive: true, force: true });
mkdirSync(vendorDir, { recursive: true });

for (const name of readdirSync(packagesDir)) {
  const dist = join(packagesDir, name, "dist", "esm");
  if (!existsSync(join(dist, "index.js"))) continue;
  const target = join(vendorDir, name);
  cpSync(dist, target, { recursive: true });
  entries.push(name);
}

console.log(`Copied ${entries.length} package builds to ${vendorDir}`);
