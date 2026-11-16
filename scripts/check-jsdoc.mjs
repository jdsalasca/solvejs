// Every exported function must carry its JSDoc block immediately above it. A refactor that inserts
// a helper between the doc and the function silently detaches the doc: the comment stays in the
// file, but editors stop showing it on hover. That is invisible until a user complains, so it is a
// gate instead of a review note.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const missing = [];
let checked = 0;

for (const dir of readdirSync("packages")) {
  const sourcePath = join("packages", dir, "src", "index.ts");
  if (!existsSync(sourcePath)) continue;

  const lines = readFileSync(sourcePath, "utf8").split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^export (?:async )?function (\w+)/);
    if (!match) continue;
    checked += 1;

    let cursor = index - 1;
    while (cursor >= 0 && lines[cursor].trim() === "") cursor -= 1;
    if (cursor < 0 || !lines[cursor].trim().endsWith("*/")) {
      missing.push(`${dir}:${match[1]}`);
      continue;
    }

    let start = cursor;
    while (start >= 0 && !lines[start].trim().startsWith("/**")) start -= 1;
    if (start < 0) missing.push(`${dir}:${match[1]}`);
  }
}

if (missing.length > 0) {
  console.error(`Missing attached JSDoc:\n${missing.map((entry) => `  ${entry}`).join("\n")}`);
  process.exit(1);
}

console.log(`JSDoc attached to every exported function (${checked} checked).`);
