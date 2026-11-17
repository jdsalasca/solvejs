import test from "node:test";
import assert from "node:assert/strict";
import { Colors, jsonToSheet, jsonToXlsx, readXlsx, writeXlsx } from "../dist/esm/index.js";
import { readZip } from "../dist/esm/zip/read.js";

const decoder = new TextDecoder();

test("writes conditional formats, filters, hidden rows and metadata", async () => {
  const bytes = writeXlsx({
    title: "Q4 report",
    creator: "SolveJS",
    subject: "Revenue",
    keywords: "revenue,q4",
    description: "Quarterly report",
    category: "Finance",
    company: "Acme",
    created: "2026-11-16T00:00:00Z",
    modified: "2026-11-17T00:00:00Z",
    sheets: [
      {
        name: "Data",
        autoFilter: "A1:C3",
        filterColumns: [{ column: 0, values: ["North"] }],
        conditionalFormatting: [
          { range: "B2:B3", type: "cellIs", operator: "greaterThan", formula: "10", style: { fill: Colors.Yellow } },
          { range: "C2:C3", type: "colorScale", colors: [Colors.Red, Colors.Yellow, Colors.Green] },
          { range: "C2:C3", type: "dataBar", color: Colors.Blue }
        ],
        columns: [{ header: "Region" }, { header: "Q1", hidden: true }, { header: "Q2" }],
        rows: [
          ["North", 12, 14],
          { cells: ["South", 8, 9], hidden: true }
        ]
      }
    ]
  });
  const files = await readZip(bytes);
  const sheet = decoder.decode(files.get("xl/worksheets/sheet1.xml"));
  const styles = decoder.decode(files.get("xl/styles.xml"));
  assert.match(sheet, /<autoFilter ref="A1:C3"><filterColumn colId="0"><filters><filter val="North"\/><\/filters><\/filterColumn><\/autoFilter>/);
  assert.match(sheet, /<cfRule type="cellIs" dxfId="0" priority="1" operator="greaterThan">/);
  assert.match(sheet, /<colorScale>/);
  assert.match(sheet, /<dataBar>/);
  assert.match(sheet, /<col min="2" max="2" width="[^"]+" customWidth="1" hidden="1"\/>/);
  assert.match(sheet, /<row r="3" hidden="1">/);
  assert.match(styles, /<dxfs count="1"><dxf>/);

  const workbook = await readXlsx(bytes);
  assert.equal(workbook.properties?.subject, "Revenue");
  assert.equal(workbook.properties?.keywords, "revenue,q4");
  assert.equal(workbook.properties?.description, "Quarterly report");
  assert.equal(workbook.properties?.category, "Finance");
  assert.equal(workbook.properties?.company, "Acme");
  assert.match(workbook.properties?.created ?? "", /2026-11-16/);
});

test("converts nested JSON objects to a readable XLSX", async () => {
  const bytes = jsonToXlsx(
    [
      { name: "Ada", address: { city: "London", zip: "N1" }, tags: ["math", "code"], active: true },
      { name: "Grace", address: { city: "New York", zip: "10001" }, tags: ["navy"], active: false }
    ],
    { sheetName: "People", title: "People", creator: "SolveJS", flatten: true }
  );
  const workbook = await readXlsx(bytes);
  const sheet = workbook.sheets[0];
  assert.equal(sheet.name, "People");
  assert.deepEqual(sheet.rows[0], ["name", "address.city", "address.zip", "tags", "active"]);
  assert.deepEqual(sheet.rows[1], ["Ada", "London", "N1", "math, code", true]);
  assert.equal(workbook.properties?.title, "People");
});

test("jsonToSheet exposes columns and rows for custom workbooks", () => {
  const result = jsonToSheet([{ id: 1, name: "A" }, { id: 2, name: "B" }], {
    columns: [{ key: "name", header: "Name", width: 20 }, "id"]
  });
  assert.deepEqual(result.columns, ["name", "id"]);
  assert.deepEqual(result.rows, [["A", 1], ["B", 2]]);
  assert.equal(result.columnDefinitions[0].header, "Name");
});
