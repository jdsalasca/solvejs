import { readFileSync, writeFileSync } from "node:fs";

const md = readFileSync("docs/guides/package-health-report.md", "utf8");

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

const [trust, detail] = parseTables(md);

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