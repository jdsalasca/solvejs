import { performance } from "node:perf_hooks";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import {
  Pdf,
  PdfPage,
  View,
  Heading,
  Text,
  Table,
  PdfColors,
  renderPdf,
  renderPdfCompressed
} from "../dist/esm/index.js";

const items = Array.from({ length: 12 }, (_, index) => ({
  item: `Service ${index + 1}`,
  detail: "Implementation, review and documentation",
  qty: index + 1,
  total: (120 * (index + 1)).toFixed(2)
}));

const invoice = Pdf({
  title: "Benchmark invoice",
  footer: ({ page, total }) =>
    Text({ value: `Page ${page} of ${total}`, fontSize: 8, color: PdfColors.Gray, align: "center" }),
  children: PdfPage({
    children: [
      View({
        background: PdfColors.DarkBlue,
        padding: 24,
        radius: 12,
        children: Heading({ level: 1, color: PdfColors.White, children: "Invoice" })
      }),
      Table({
        columns: [
          { key: "item", header: "Item", width: 240 },
          { key: "qty", header: "Qty", width: 50, align: "center" },
          { key: "total", header: "Total", width: 90, align: "right" }
        ],
        rows: items
      })
    ]
  })
});

const report = Pdf({
  title: "Benchmark report",
  children: Array.from({ length: 120 }, (_, index) =>
    Text({
      value: `Section ${index + 1}. ${"A repetitive paragraph that exercises wrapping, pagination and serialization. ".repeat(4)}`
    })
  )
});

function measure(label, run) {
  const start = performance.now();
  const value = run();
  return { label, ms: performance.now() - start, value };
}

const invoiceRuns = Array.from({ length: 20 }, () => measure("invoice", () => renderPdf(invoice)));
const reportRun = measure("report", () => renderPdf(report));
const compressedRun = await (async () => {
  const start = performance.now();
  const value = await renderPdfCompressed(report);
  return { ms: performance.now() - start, value };
})();

const average = invoiceRuns.reduce((total, run) => total + run.ms, 0) / invoiceRuns.length;
const output = {
  invoice: { averageMs: Number(average.toFixed(2)), bytes: invoiceRuns[0].value.length, pages: 1 },
  report: { ms: Number(reportRun.ms.toFixed(2)), bytes: reportRun.value.length },
  reportCompressed: { ms: Number(compressedRun.ms.toFixed(2)), bytes: compressedRun.value.length }
};

const file = join(process.env.TEMP, "solvejs-pdf-benchmark.pdf");
writeFileSync(file, reportRun.value);
console.log(JSON.stringify({ ...output, file }, null, 2));
