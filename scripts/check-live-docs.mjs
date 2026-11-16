import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Guards the Live Lab against broken import-map entries and missing vendor builds.
const html = readFileSync("docs/live/index.html", "utf8");
const importMap = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)?.[1] ?? "{}");
const entries = Object.entries(importMap.imports ?? {});
if (entries.length === 0) throw new Error("Live Lab import map is empty.");

for (const [specifier, target] of entries) {
  const file = resolve("docs/live", target);
  if (!existsSync(file)) throw new Error(`Missing vendor file for ${specifier}: ${file}`);
}

const source = ["docs/live/live.js", "docs/live/packages.js"]
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
const imports = [...source.matchAll(/from\s+"(@jdsalasc\/[^"]+)"/g)].map((match) => match[1]);
for (const specifier of imports) {
  if (!(specifier in importMap.imports)) {
    throw new Error(`Live Lab imports ${specifier} but the import map does not define it.`);
  }
}

console.log(`Live Lab check passed: ${entries.length} import map entries, ${imports.length} module imports.`);
