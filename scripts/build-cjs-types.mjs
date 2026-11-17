import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

// TypeScript emits declarations once, for the ESM build. A CommonJS consumer
// resolves `require.types` to a `.d.cts` file, so mirror the declaration tree and
// rewrite relative `.js` specifiers to `.cjs` so TypeScript follows them.
const root = process.cwd();
const esm = join(root, "dist", "esm");
const cjs = join(root, "dist", "cjs");

function copyDeclarations(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      copyDeclarations(path);
      continue;
    }
    if (!name.endsWith(".d.ts")) continue;
    const target = join(cjs, relative(esm, path).replace(/\.d\.ts$/, ".d.cts"));
    mkdirSync(dirname(target), { recursive: true });
    const source = readFileSync(path, "utf8").replace(
      /(from\s+|import\()(["'])(\.[^"']+)\.js\2/g,
      "$1$2$3.cjs$2"
    );
    writeFileSync(target, source, "utf8");
  }
}

copyDeclarations(esm);
console.log(`Copied CJS declarations to ${relative(root, cjs)}`);
