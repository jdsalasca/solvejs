import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const mdPath = "docs/guides/package-health-report.md";
// Normalise line endings: a Windows checkout writes CRLF, which would break every
// exact string comparison below.
const md = readFileSync(mdPath, "utf8").replace(/\r\n/g, "\n");

// Measured, never hand-maintained. The same two counters the CI gate uses, so the
// report and the gate can never disagree.
function measureTrust() {
  const config = JSON.parse(readFileSync(join("scripts", "test-baseline.json"), "utf8"));
  const overrides = config.packageMinimums ?? {};

  return readdirSync("packages")
    .filter((dir) => existsSync(join("packages", dir, "package.json")))
    .map((dir) => {
      const pkg = JSON.parse(readFileSync(join("packages", dir, "package.json"), "utf8"));
      const sourcePath = join("packages", dir, "src", "index.ts");
      const source = existsSync(sourcePath) ? readFileSync(sourcePath, "utf8") : "";
      const exported = (source.match(/export\s+(?:async\s+)?function\s+\w+/g) ?? []).length;

      let tests = 0;
      const testDir = join("packages", dir, "test");
      if (existsSync(testDir)) {
        for (const file of readdirSync(testDir).filter((name) => name.endsWith(".mjs"))) {
          tests += (readFileSync(join(testDir, file), "utf8").match(/test\(/g) ?? []).length;
        }
      }

      const minimum = Number(overrides[pkg.name] ?? (exported > 0 ? exported : config.defaultMinimum ?? 1));
      return { name: pkg.name, exported, tests, minimum };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Coverage is measured by report:perf and published in performance-and-size.md.
// Read it back rather than recomputing, so the two reports cannot disagree.
function readCoverage() {
  const perfPath = "docs/guides/performance-and-size.md";
  if (!existsSync(perfPath)) return new Map();

  const map = new Map();
  let inCoverage = false;

  for (const line of readFileSync(perfPath, "utf8").replace(/\r\n/g, "\n").split("\n")) {
    if (line.startsWith("## Test Coverage")) {
      inCoverage = true;
      continue;
    }
    if (inCoverage && line.startsWith("## ")) break;
    if (!inCoverage || !line.trim().startsWith("|")) continue;

    const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
    if (cells[0]?.startsWith("@jdsalasc/")) map.set(cells[0], cells[1]);
  }

  return map;
}

const trust0 = measureTrust();
const coverage = readCoverage();
const trustTable = [
  "| Package | Function exports | Test blocks | Line coverage |",
  "|---|---|---|---|",
  ...trust0.map((row) => {
    const exported = row.exported === 0 ? "0 (re-exports)" : String(row.exported);
    return `| \`${row.name}\` | ${exported} | ${row.tests} | ${coverage.get(row.name) ?? "n/a"} |`;
  })
];

// Replace everything between `## Test Trust` and the next heading with freshly
// measured content. Removing the whole section body rather than just the table
// lines is what makes repeated runs idempotent.
const HEADING = "## Test Trust";
const mdLines = md.split("\n");
const headingIndex = mdLines.indexOf(HEADING);
if (headingIndex === -1) {
  console.error(`Missing "${HEADING}" in ${mdPath}; nothing to update.`);
  process.exit(1);
}

let sectionEnd = mdLines.length;
for (let i = headingIndex + 1; i < mdLines.length; i += 1) {
  if (mdLines[i].startsWith("## ")) {
    sectionEnd = i;
    break;
  }
}

const totalTests = trust0.reduce((sum, row) => sum + row.tests, 0);
const rebuiltMd = [
  ...mdLines.slice(0, headingIndex + 1),
  "",
  `${trust0.length} packages, ${totalTests} test blocks. The minimum for each package is derived`,
  "from its exported function count by `npm run test:baseline`.",
  "",
  ...trustTable,
  "",
  ...mdLines.slice(sectionEnd)
];

writeFileSync(mdPath, `${rebuiltMd.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`, "utf8");

// Split the markdown into tables by looking for consecutive `|` lines, then read
// each table's own header row. No per-table guessing: a table is whatever the
// document says it is.
function parseTables(markdown) {
  const tables = [];
  let current = [];

  for (const line of markdown.split("\n")) {
    if (line.trim().startsWith("|")) {
      const cells = line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) continue;
      current.push(cells);
    } else if (current.length > 0) {
      tables.push({ head: current[0], rows: current.slice(1) });
      current = [];
    }
  }
  if (current.length > 0) tables.push({ head: current[0], rows: current.slice(1) });

  return tables;
}

const [trust, detail] = parseTables(rebuiltMd.join("\n"));

function row(cells) {
  return `              <tr>${cells.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`;
}

function escape(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

const trustRows = trust.rows.map((cells) => row(cells)).join("\n");
const detailRows = detail.rows.map((cells) => row(cells)).join("\n");

const head = (labels) =>
  `              <tr>${labels.map((label) => `<th align="left">${escape(label)}</th>`).join("")}</tr>`;

const date = new Date().toISOString().slice(0, 10);
const totalBlocks = trust.rows.reduce((sum, cells) => sum + Number(cells[2] ?? 0), 0);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="SolveJS package health report with measured test trust and coverage." />
  <title>Package Health Report | SolveJS</title>
  <link rel="stylesheet" href="../styles.css" />
</head>
<body data-root="..">
  <main class="page">
    <section class="hero">
      <h1>Package Health Report</h1>
      <p>Updated on ${date}. Measured test trust, coverage, and prioritized improvements.</p>
    </section>
    <section class="layout">
      <aside class="panel">
        <h2>Cookbook Navigation</h2>
        <nav data-cookbook-nav aria-label="Cookbook pages"></nav>
      </aside>
      <section class="panel">
        <h2>Test Trust</h2>
        <p>${totalBlocks} test blocks across ${trust.rows.length} packages. The minimum for each package is derived from its exported function count by <code>npm run test:baseline</code>.</p>
        <div style="overflow:auto">
          <table style="width:100%; border-collapse: collapse;">
            <thead>
${head(trust.head)}
            </thead>
            <tbody>
${trustRows}
            </tbody>
          </table>
        </div>
        <h2>Package Status</h2>
        <div style="overflow:auto">
          <table style="width:100%; border-collapse: collapse;">
            <thead>
${head(detail.head)}
            </thead>
            <tbody>
${detailRows}
            </tbody>
          </table>
        </div>
      </section>
    </section>

    <section class="panel">
      <h2>Priority Order</h2>
      <ol class="topic-list">
        <li>Raise <code>solvejs-schema</code>, <code>solvejs-env</code>, and <code>solvejs-async</code> coverage above 95%.</li>
        <li>Add the queued breadth packages: cache, json, pagination, semver, errors, money, http.</li>
        <li>Add a limitations section to any package README that lacks one.</li>
        <li>Decide whether coverage becomes a gating threshold.</li>
      </ol>
    </section>

    <p class="back-link"><a class="inline-link" href="../index.html">Back to docs home</a></p>
  </main>
  <script src="../app.js"></script>
</body>
</html>
`;

writeFileSync("docs/guides/package-health-report.html", html, "utf8");
console.log(
  `Updated docs/guides/package-health-report.html (${trust.rows.length} trust rows, ${detail.rows.length} detail rows, ${totalBlocks} test blocks).`
);