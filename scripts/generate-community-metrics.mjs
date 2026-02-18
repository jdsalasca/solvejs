import { writeFileSync } from "node:fs";
import { join } from "node:path";

const PACKAGES = [
  "@jdsalasc/solvejs",
  "@jdsalasc/solvejs-date",
  "@jdsalasc/solvejs-string",
  "@jdsalasc/solvejs-list",
  "@jdsalasc/solvejs-regex",
  "@jdsalasc/solvejs-constants",
  "@jdsalasc/solvejs-numbers",
  "@jdsalasc/solvejs-validators",
  "@jdsalasc/solvejs-objects"
];

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "solvejs-community-metrics-script"
    }
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${url} (${response.status})`);
  }
  return response.json();
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

async function run() {
  const date = new Date().toISOString().slice(0, 10);
  const repo = await fetchJson("https://api.github.com/repos/jdsalasca/solvejs");

  const downloadRows = [];
  let totalDownloads = 0;
  for (const pkg of PACKAGES) {
    const data = await fetchJson(`https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(pkg)}`);
    const downloads = Number(data.downloads || 0);
    totalDownloads += downloads;
    downloadRows.push({ pkg, downloads });
  }

  const mdRows = downloadRows
    .map((row) => `| ${row.pkg} | ${formatNumber(row.downloads)} |`)
    .join("\n");

  const markdown = `# SolveJS Community Metrics

Generated on ${date}.

## GitHub Snapshot

- Stars: **${formatNumber(repo.stargazers_count)}**
- Forks: **${formatNumber(repo.forks_count)}**
- Open issues: **${formatNumber(repo.open_issues_count)}**
- Watchers: **${formatNumber(repo.subscribers_count || repo.watchers_count)}**

## npm Last-Month Downloads

Total across tracked packages: **${formatNumber(totalDownloads)}**

| Package | Downloads (last month) |
|---|---:|
${mdRows}

## Notes

- Source: GitHub public REST API + npm downloads API.
- Regenerate with \`npm run metrics:community\`.
`;

  const htmlRows = downloadRows
    .map((row) => `<tr><td><code>${row.pkg}</code></td><td>${formatNumber(row.downloads)}</td></tr>`)
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="SolveJS community metrics snapshot from GitHub and npm public APIs." />
  <title>Community Metrics | SolveJS</title>
  <link rel="stylesheet" href="../styles.css" />
</head>
<body data-root="..">
  <main class="page">
    <section class="hero">
      <h1>Community Metrics</h1>
      <p>Generated on ${date}. Public snapshot of GitHub and npm activity.</p>
    </section>
    <section class="layout">
      <aside class="panel">
        <h2>Cookbook Navigation</h2>
        <nav data-cookbook-nav aria-label="Cookbook pages"></nav>
      </aside>
      <section class="panel">
        <h2>GitHub Snapshot</h2>
        <ul class="topic-list">
          <li>Stars: <strong>${formatNumber(repo.stargazers_count)}</strong></li>
          <li>Forks: <strong>${formatNumber(repo.forks_count)}</strong></li>
          <li>Open issues: <strong>${formatNumber(repo.open_issues_count)}</strong></li>
          <li>Watchers: <strong>${formatNumber(repo.subscribers_count || repo.watchers_count)}</strong></li>
        </ul>
        <h2>npm Last-Month Downloads</h2>
        <p>Total: <strong>${formatNumber(totalDownloads)}</strong></p>
        <div style="overflow:auto">
          <table style="width:100%; border-collapse: collapse;">
            <thead><tr><th align="left">Package</th><th align="left">Downloads</th></tr></thead>
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

  writeFileSync(join("docs", "guides", "community-metrics.md"), markdown, "utf8");
  writeFileSync(join("docs", "guides", "community-metrics.html"), html, "utf8");
  console.log("Updated docs/guides/community-metrics.md and docs/guides/community-metrics.html");
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
