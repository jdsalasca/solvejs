import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

function run(command) {
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function formatBytes(bytes) {
  const kb = bytes / 1024;
  return `${kb.toFixed(2)} KB`;
}

function runBenchmarks() {
  const raw = run("node benchmarks/index.mjs");
  return raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.trim());
}

function runPackDryRun() {
  const raw = run("npm pack --workspaces --json --dry-run");
  const parsed = JSON.parse(raw);
  return parsed.map((entry) => ({
    name: entry.name,
    version: entry.version,
    size: entry.size,
    unpackedSize: entry.unpackedSize,
    entryCount: entry.entryCount
  }));
}

function toMarkdown(date, benchmarks, packs) {
  const packRows = packs
    .map(
      (row) =>
        `| ${row.name} | ${row.version} | ${formatBytes(row.size)} | ${formatBytes(row.unpackedSize)} | ${row.entryCount} |`
    )
    .join("\n");
  const benchmarkRows = benchmarks.map((line) => `- ${line}`).join("\n");

  return `# SolveJS Performance and Size Report

Generated on ${date}.

## Benchmark Snapshot

${benchmarkRows}

## Package Size Snapshot (\`npm pack --workspaces --dry-run\`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
${packRows}

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Regenerate with \`npm run report:perf\`.
`;
}

function toHtml(date, benchmarks, packs) {
  const packRows = packs
    .map(
      (row) =>
        `<tr><td><code>${row.name}</code></td><td>${row.version}</td><td>${formatBytes(row.size)}</td><td>${formatBytes(
          row.unpackedSize
        )}</td><td>${row.entryCount}</td></tr>`
    )
    .join("\n");
  const benchmarkItems = benchmarks.map((line) => `<li>${line}</li>`).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="SolveJS benchmark and package size snapshot." />
  <title>Performance and Size Report | SolveJS</title>
  <link rel="stylesheet" href="../styles.css" />
</head>
<body data-root="..">
  <main class="page">
    <section class="hero">
      <h1>Performance and Size Report</h1>
      <p>Generated on ${date}. Local benchmark and package-size snapshot.</p>
    </section>
    <section class="layout">
      <aside class="panel">
        <h2>Cookbook Navigation</h2>
        <nav data-cookbook-nav aria-label="Cookbook pages"></nav>
      </aside>
      <section class="panel">
        <h2>Benchmark Snapshot</h2>
        <ul class="topic-list">${benchmarkItems}</ul>
        <h2>Package Size Snapshot</h2>
        <div style="overflow:auto">
          <table style="width:100%; border-collapse: collapse;">
            <thead>
              <tr><th align="left">Package</th><th align="left">Version</th><th align="left">Tarball Size</th><th align="left">Unpacked Size</th><th align="left">Files</th></tr>
            </thead>
            <tbody>${packRows}</tbody>
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
}

function runAll() {
  const date = new Date().toISOString().slice(0, 10);
  const benchmarks = runBenchmarks();
  const packs = runPackDryRun();
  const md = toMarkdown(date, benchmarks, packs);
  const html = toHtml(date, benchmarks, packs);
  writeFileSync(join("docs", "guides", "performance-and-size.md"), md, "utf8");
  writeFileSync(join("docs", "guides", "performance-and-size.html"), html, "utf8");
  console.log("Updated docs/guides/performance-and-size.md and docs/guides/performance-and-size.html");
}

runAll();
