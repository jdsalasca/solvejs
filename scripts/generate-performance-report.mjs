import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function run(command, cwd) {
  // shell:true is required on Windows: without it execSync fails with
  // `spawnSync cmd.exe ENOENT` when the cwd differs from the process cwd.
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], cwd, shell: true });
}

function formatBytes(bytes) {
  const kb = bytes / 1024;
  return `${kb.toFixed(2)} KB`;
}

function runBenchmarks() {
  // Benchmarks import from each package's dist/, which a previous `clean` removes.
  run("npm run build");
  const raw = run("node benchmarks/index.mjs");
  return raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.trim());
}

// Node's built-in coverage reporter needs no dependency. Each package is run on
// its own so a percentage is attributable to a single package.
function runCoverage() {
  const rootPackage = JSON.parse(readFileSync("package.json", "utf8"));
  const dirs = readdirSync("packages").filter((name) =>
    existsSync(join("packages", name, "package.json"))
  );

  return dirs.map((name) => {
    const pkg = JSON.parse(readFileSync(join("packages", name, "package.json"), "utf8"));
    const isWorkspace = rootPackage.workspaces.some(
      (pattern) => pattern === `packages/${name}` || pattern === "packages/*"
    );
    if (!isWorkspace) return null;

    const dir = join("packages", name);
    let raw = "";
    try {
      raw = run("node --test --experimental-test-coverage test/*.test.mjs", dir);
    } catch {
      return { name: pkg.name, line: null, branch: null, function: null };
    }

    const allFiles = raw.split("\n").find((line) => line.includes("all files")) ?? "";
    const columns = allFiles.split("|").slice(1).map((cell) => cell.trim());
    const percent = (cell) => (cell && cell !== "%" ? Number.parseFloat(cell) : null);

    return {
      name: pkg.name,
      line: percent(columns[0]),
      branch: percent(columns[1]),
      function: percent(columns[2])
    };
  }).filter(Boolean);
}

function formatPercent(value) {
  return value === null ? "n/a" : `${value.toFixed(2)}%`;
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

function toMarkdown(date, benchmarks, packs, coverage) {
  const packRows = packs
    .map(
      (row) =>
        `| ${row.name} | ${row.version} | ${formatBytes(row.size)} | ${formatBytes(row.unpackedSize)} | ${row.entryCount} |`
    )
    .join("\n");
  const benchmarkRows = benchmarks.map((line) => `- ${line}`).join("\n");
  const coverageRows = coverage
    .map(
      (row) =>
        `| ${row.name} | ${formatPercent(row.line)} | ${formatPercent(row.branch)} | ${formatPercent(row.function)} |`
    )
    .join("\n");

  return `# SolveJS Performance and Size Report

Generated on ${date}.

## Benchmark Snapshot

${benchmarkRows}

## Test Coverage (\`node --test --experimental-test-coverage\`)

| Package | Lines | Branches | Functions |
|---|---:|---:|---:|
${coverageRows}

## Package Size Snapshot (\`npm pack --workspaces --dry-run\`)

| Package | Version | Tarball Size | Unpacked Size | Files |
|---|---:|---:|---:|---:|
${packRows}

## Notes

- Benchmarks are smoke-level local runs; use production profiling for critical workloads.
- Coverage is measured by the Node built-in runner; \`n/a\` means the package has no tests yet.
- Regenerate with \`npm run report:perf\`.
`;
}

function toHtml(date, benchmarks, packs, coverage) {
  const packRows = packs
    .map(
      (row) =>
        `<tr><td><code>${row.name}</code></td><td>${row.version}</td><td>${formatBytes(row.size)}</td><td>${formatBytes(
          row.unpackedSize
        )}</td><td>${row.entryCount}</td></tr>`
    )
    .join("\n");
  const benchmarkItems = benchmarks.map((line) => `<li>${line}</li>`).join("\n");
  const coverageRows = coverage
    .map(
      (row) =>
        `<tr><td><code>${row.name}</code></td><td>${formatPercent(row.line)}</td><td>${formatPercent(
          row.branch
        )}</td><td>${formatPercent(row.function)}</td></tr>`
    )
    .join("\n");

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
        <h2>Test Coverage</h2>
        <div style="overflow:auto">
          <table style="width:100%; border-collapse: collapse;">
            <thead>
              <tr><th align="left">Package</th><th align="left">Lines</th><th align="left">Branches</th><th align="left">Functions</th></tr>
            </thead>
            <tbody>${coverageRows}</tbody>
          </table>
        </div>
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
  const coverage = runCoverage();
  const benchmarks = runBenchmarks();
  const packs = runPackDryRun();
  const md = toMarkdown(date, benchmarks, packs, coverage);
  const html = toHtml(date, benchmarks, packs, coverage);
  writeFileSync(join("docs", "guides", "performance-and-size.md"), md, "utf8");
  writeFileSync(join("docs", "guides", "performance-and-size.html"), html, "utf8");
  console.log("Updated docs/guides/performance-and-size.md and docs/guides/performance-and-size.html");
}

runAll();
