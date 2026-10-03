import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Scaffolds a package that matches the shape every published SolveJS package
// already uses: dual ESM/CJS with declarations, zero runtime dependencies, and the
// same tsconfig/rename-cjs plumbing.
const TEMPLATE = "packages/solvejs-url";

const [name, description, keywordsArg, version = "0.1.0"] = process.argv.slice(2);

if (!name || !description || !keywordsArg) {
  console.error("Usage: node scripts/new-package.mjs <suffix> <description> <keyword,keyword,...> [version]");
  process.exit(1);
}

const dir = join("packages", `solvejs-${name}`);
if (existsSync(dir)) {
  console.error(`${dir} already exists.`);
  process.exit(1);
}

mkdirSync(join(dir, "scripts"), { recursive: true });
mkdirSync(join(dir, "src"), { recursive: true });
mkdirSync(join(dir, "test"), { recursive: true });

for (const file of ["tsconfig.esm.json", "tsconfig.cjs.json"]) {
  copyFileSync(join(TEMPLATE, file), join(dir, file));
}
copyFileSync(join(TEMPLATE, "scripts", "rename-cjs.mjs"), join(dir, "scripts", "rename-cjs.mjs"));

const manifest = {
  name: `@jdsalasc/solvejs-${name}`,
  version,
  description,
  license: "MIT",
  type: "module",
  sideEffects: false,
  main: "./dist/cjs/index.cjs",
  module: "./dist/esm/index.js",
  types: "./dist/esm/index.d.ts",
  exports: {
    ".": {
      types: "./dist/esm/index.d.ts",
      import: "./dist/esm/index.js",
      require: "./dist/cjs/index.cjs"
    }
  },
  files: ["dist", "README.md"],
  scripts: {
    build: "npm run clean && npm run build:esm && npm run build:cjs",
    "build:esm": "tsc -p tsconfig.esm.json",
    "build:cjs": "tsc -p tsconfig.cjs.json && node ./scripts/rename-cjs.mjs",
    clean: "node -e \"require('node:fs').rmSync('dist',{recursive:true,force:true})\"",
    test: "npm run build && node --test test/*.test.mjs",
    lint: "tsc -p tsconfig.esm.json --noEmit"
  },
  publishConfig: { access: "public" },
  author: "jdsalasc",
  homepage: "https://github.com/jdsalasca/solvejs#readme",
  repository: { type: "git", url: "git+https://github.com/jdsalasca/solvejs.git" },
  bugs: { url: "https://github.com/jdsalasca/solvejs/issues" },
  engines: { node: ">=18" },
  dependencies: {},
  keywords: [...keywordsArg.split(",").map((keyword) => keyword.trim()), "typescript", "javascript", "zero dependency", "solvejs"]
};

writeFileSync(join(dir, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Created ${dir} at ${version}. Next: write src/index.ts, test/index.test.mjs and README.md.`);