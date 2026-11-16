import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { readXlsx, writeXlsx } from "../dist/esm/index.js";

const CANDIDATES = [
  process.env.SOFFICE,
  "soffice",
  "C:/Program Files/LibreOffice/program/soffice.exe",
  "/usr/bin/soffice"
].filter(Boolean);

function findSoffice() {
  for (const candidate of CANDIDATES) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore", timeout: 30_000 });
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

const soffice = findSoffice();
if (!soffice) {
  console.log("LibreOffice not found; compatibility check skipped.");
  process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), "solvejs-xlsx-"));
const profile = pathToFileURL(join(dir, "profile")).href;
const run = (args) =>
  execFileSync(soffice, ["--headless", `-env:UserInstallation=${profile}`, ...args], {
    stdio: "inherit",
    timeout: 120_000
  });

try {
  const xlsxPath = join(dir, "sample.xlsx");
  writeFileSync(
    xlsxPath,
    writeXlsx({
      sheets: [
        {
          name: "Invoices",
          columns: [{ header: "ID" }, { header: "Customer", width: 24 }, { header: "Total" }, { header: "Date" }],
          rows: [
            [1, "Ada & Co", 1999, new Date(Date.UTC(2026, 10, 16))],
            [2, "=SUM(A1:A2)", true, null]
          ]
        }
      ]
    })
  );

  run(["--convert-to", "csv", "--outdir", dir, xlsxPath]);
  const csv = readFileSync(join(dir, "sample.csv"), "utf8");
  if (!csv.includes("Ada & Co") || !csv.includes("1999") || !csv.includes("2026")) {
    throw new Error(`LibreOffice did not preserve the expected values:\n${csv}`);
  }
  console.log("LibreOffice opened the generated workbook and preserved its values.");

  const csvPath = join(dir, "reverse.csv");
  writeFileSync(csvPath, "id,customer,total\n1,Ada,1999\n2,Grace,2500\n");
  run(["--convert-to", "xlsx", "--outdir", dir, csvPath]);

  const reversePath = join(dir, "reverse.xlsx");
  if (!existsSync(reversePath)) throw new Error("LibreOffice did not produce reverse.xlsx");
  const reverse = await readXlsx(readFileSync(reversePath));
  const rows = reverse.sheets[0].rows;
  if (rows[1]?.[0] !== 1 || rows[1]?.[1] !== "Ada" || rows[2]?.[2] !== 2500) {
    throw new Error(`Reader did not parse the LibreOffice workbook: ${JSON.stringify(rows)}`);
  }
  console.log("Read a LibreOffice-generated XLSX (deflated ZIP) successfully.");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
