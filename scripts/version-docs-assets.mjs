/* eslint-disable security/detect-unsafe-regex -- fixed query-string rewrite patterns */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? "docs";
const version = process.argv[3] ?? Date.now().toString(36);

const files = [];
function walk(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      if (name !== "vendor") walk(path);
    } else if (name.endsWith(".html")) {
      files.push(path);
    }
  }
}
walk(root);

let changed = 0;
for (const file of files) {
  const before = readFileSync(file, "utf8");
  const after = before
    .replace(/(href="[^"]*styles\.css)(\?[^"]*)?"/g, `$1?v=${version}"`)
    .replace(/(href="[^"]*live\.css)(\?[^"]*)?"/g, `$1?v=${version}"`)
    .replace(/(src="[^"]*app\.js)(\?[^"]*)?"/g, `$1?v=${version}"`);
  if (after !== before) {
    writeFileSync(file, after);
    changed += 1;
  }
}
console.log(`Versioned ${changed} HTML files with ${version}`);
