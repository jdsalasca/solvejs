import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function parseExports(source) {
  const fn = [...source.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)].map((m) => m[1]);
  const ct = [...source.matchAll(/export const\s+(\w+)/g)].map((m) => m[1]);
  const tp = [...source.matchAll(/export type\s+(\w+)/g)].map((m) => m[1]);
  return { fn, ct, tp };
}

function countTests(testDir) {
  if (!existsSync(testDir)) return 0;
  let count = 0;
  for (const file of readdirSync(testDir)) {
    if (!file.endsWith(".mjs")) continue;
    const content = readFileSync(join(testDir, file), "utf8");
    count += (content.match(/test\(/g) || []).length;
  }
  return count;
}

const packages = readdirSync("packages").filter((name) => {
  if (!name.startsWith("solvejs")) return false;
  return existsSync(join("packages", name, "package.json"));
});
const date = new Date().toISOString().slice(0, 10);
const rows = [];

let out = "# SolveJS Package Inventory\n\n";
out += `Generated on ${date}.\n\n`;
out += "| Package | Version | Functions | Consts | Types | Tests |\n";
out += "|---|---:|---:|---:|---:|---:|\n";

for (const dir of packages) {
  const packageJson = JSON.parse(readFileSync(join("packages", dir, "package.json"), "utf8"));
  const sourcePath = join("packages", dir, "src", "index.ts");
  const source = existsSync(sourcePath) ? readFileSync(sourcePath, "utf8") : "";
  const exports = parseExports(source);
  const tests = countTests(join("packages", dir, "test"));

  const row = {
    name: packageJson.name,
    version: packageJson.version,
    functions: exports.fn.length,
    consts: exports.ct.length,
    types: exports.tp.length,
    tests
  };
  rows.push(row);

  out += `| ${row.name} | ${row.version} | ${row.functions} | ${row.consts} | ${row.types} | ${row.tests} |\n`;
}

out += "\n## Notes\n\n";
out += "- Baseline: every package should keep at least 3 test cases.\n";
out += "- Keep each package README aligned with actual exports.\n";
out += "- Raise test count when adding new APIs or edge-case behavior.\n";
out += "- Run `npm run inventory` after significant package changes.\n";

writeFileSync(join("docs", "guides", "package-inventory.md"), out, "utf8");

const htmlRows = rows
  .map(
    (row) =>
      `<tr><td><code>${row.name}</code></td><td>${row.version}</td><td>${row.functions}</td><td>${row.consts}</td><td>${row.types}</td><td>${row.tests}</td></tr>`
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="SolveJS package inventory with export/test counts." />
  <title>Package Inventory | SolveJS</title>
  <link rel="stylesheet" href="../styles.css" />
</head>
<body data-root="..">
  <main class="page">
    <section class="hero">
      <h1>Package Inventory</h1>
      <p>Generated on ${date}. Snapshot of API surface and test coverage by package.</p>
    </section>
    <section class="layout">
      <aside class="panel">
        <h2>Cookbook Navigation</h2>
        <nav data-cookbook-nav aria-label="Cookbook pages"></nav>
      </aside>
      <section class="panel">
        <h2>Inventory Table</h2>
        <div style="overflow:auto">
          <table style="width:100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th align="left">Package</th>
                <th align="left">Version</th>
                <th align="left">Functions</th>
                <th align="left">Consts</th>
                <th align="left">Types</th>
                <th align="left">Tests</th>
              </tr>
            </thead>
            <tbody>
              ${htmlRows}
            </tbody>
          </table>
        </div>
      </section>
    </section>
    <p class="back-link"><a class="inline-link" href="../index.html">Back to docs home</a></p>
  </main>
  <script src="../app.js"></script>
</body>
</html>
`;

writeFileSync(join("docs", "guides", "package-inventory.html"), html, "utf8");
console.log("Updated docs/guides/package-inventory.md and docs/guides/package-inventory.html");
