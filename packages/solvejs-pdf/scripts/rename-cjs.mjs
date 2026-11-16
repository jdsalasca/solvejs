import { readdirSync, renameSync, statSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const target = resolve(process.cwd(), "dist", "cjs");

function rewriteRequires(path) {
  for (const entry of readdirSync(path)) {
    const fullPath = join(path, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      rewriteRequires(fullPath);
      continue;
    }
    if (fullPath.endsWith(".js")) {
      const content = readFileSync(fullPath, "utf8").replace(/require\(("|')([^"']+?)\.js\1\)/g, "require($1$2.cjs$1)");
      writeFileSync(fullPath, content, "utf8");
      renameSync(fullPath, fullPath.replace(/\.js$/, ".cjs"));
    }
  }
}

if (existsSync(target)) {
  rewriteRequires(target);
}
