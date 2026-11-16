import test from "node:test";
import assert from "node:assert/strict";
import { readXlsx, writeXlsx, writeXlsxCompressed, XlsxError } from "../dist/esm/index.js";
import { writeZip } from "../dist/esm/zip/write.js";

const encoder = new TextEncoder();
const date = new Date(Date.UTC(2026, 10, 16));
const serial = (date.getTime() - Date.UTC(1899, 11, 30)) / 86_400_000;

function entry(name, xml) {
  return { name, data: encoder.encode(xml) };
}

function sharedStringsFixture() {
  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>';
  const rootRels =
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  const workbook =
    '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>';
  const workbookRels =
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>';
  const sharedStrings =
    '<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1"><si><t>Hello</t></si></sst>';
  const styles =
    '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs></styleSheet>';
  const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" s="1"><v>${serial}</v></c><c r="C1" t="b"><v>1</v></c><c r="D1"><v>42</v></c><c r="E1" t="str"><v>formula result</v></c></row></sheetData></worksheet>`;

  return writeZip([
    entry("[Content_Types].xml", contentTypes),
    entry("_rels/.rels", rootRels),
    entry("xl/workbook.xml", workbook),
    entry("xl/_rels/workbook.xml.rels", workbookRels),
    entry("xl/sharedStrings.xml", sharedStrings),
    entry("xl/styles.xml", styles),
    entry("xl/worksheets/sheet1.xml", sheet)
  ]);
}

test("writes and reads strings, numbers, booleans and dates", async () => {
  const bytes = writeXlsx({
    sheets: [
      {
        name: "Invoices",
        columns: [
          { header: "ID", width: 8 },
          { header: "Customer", width: 24 },
          { header: "Total", width: 12 },
          { header: "Date", width: 12 }
        ],
        rows: [
          [1, "Ada & Co", 1999, date],
          [2, "=SUM(A1:A2)", true, null],
          [3, "  padded  ", 0, date]
        ]
      }
    ]
  });

  assert.ok(bytes instanceof Uint8Array);
  const workbook = await readXlsx(bytes);
  assert.equal(workbook.sheets.length, 1);
  assert.equal(workbook.sheets[0].name, "Invoices");
  assert.deepEqual(workbook.sheets[0].rows[0], ["ID", "Customer", "Total", "Date"]);
  assert.deepEqual(workbook.sheets[0].rows[1].slice(0, 3), [1, "Ada & Co", 1999]);
  assert.ok(workbook.sheets[0].rows[1][3] instanceof Date);
  assert.equal(workbook.sheets[0].rows[1][3].getTime(), date.getTime());
  assert.deepEqual(workbook.sheets[0].rows[2], [2, "=SUM(A1:A2)", true]);
  assert.deepEqual(workbook.sheets[0].rows[3].slice(0, 3), [3, "  padded  ", 0]);
});

test("writes multiple sheets and keeps their names", async () => {
  const bytes = writeXlsx({
    sheets: [
      { name: "First", rows: [["a"]] },
      { name: "Second", rows: [[2]] }
    ]
  });
  const workbook = await readXlsx(bytes);
  assert.deepEqual(workbook.sheets.map((sheet) => sheet.name), ["First", "Second"]);
  assert.deepEqual(workbook.sheets[0].rows, [["a"]]);
  assert.deepEqual(workbook.sheets[1].rows, [[2]]);
});

test("reads shared strings, date styles, booleans and formula strings", async () => {
  const workbook = await readXlsx(sharedStringsFixture());
  assert.equal(workbook.sheets[0].name, "Data");
  assert.equal(workbook.sheets[0].rows[0][0], "Hello");
  assert.ok(workbook.sheets[0].rows[0][1] instanceof Date);
  assert.equal(workbook.sheets[0].rows[0][1].getTime(), date.getTime());
  assert.equal(workbook.sheets[0].rows[0][2], true);
  assert.equal(workbook.sheets[0].rows[0][3], 42);
  assert.equal(workbook.sheets[0].rows[0][4], "formula result");
});

test("writes a compressed workbook that reads back identically", async () => {
  const rows = Array.from({ length: 500 }, (_, index) => [index + 1, `Customer ${index + 1}`, index * 100]);
  const input = { sheets: [{ name: "Rows", columns: [{ header: "ID" }, { header: "Customer" }, { header: "Total" }], rows }] };
  const stored = writeXlsx(input);
  const compressed = await writeXlsxCompressed(input);

  assert.ok(compressed.length < stored.length, "DEFLATE should reduce the archive size");
  const workbook = await readXlsx(compressed);
  assert.equal(workbook.sheets[0].rows.length, 501);
  assert.deepEqual(workbook.sheets[0].rows[1], [1, "Customer 1", 0]);
  assert.deepEqual(workbook.sheets[0].rows[500], [500, "Customer 500", 49_900]);
});

test("rejects invalid workbooks with stable codes", () => {
  const invalid = [
    { sheets: [] },
    { sheets: [{ name: "A", rows: [] }, { name: "a", rows: [] }] },
    { sheets: [{ name: "bad/name", rows: [] }] },
    { sheets: [{ name: "A", rows: [[Number.NaN]] }] }
  ];

  for (const input of invalid) {
    assert.throws(
      () => writeXlsx(input),
      (error) => error instanceof XlsxError && error.code === "XLSX_INVALID_INPUT"
    );
  }
});

test("rejects malformed ZIP input", async () => {
  await assert.rejects(
    readXlsx(new Uint8Array([1, 2, 3])),
    (error) => error instanceof XlsxError && error.code === "XLSX_INVALID_ZIP"
  );
});
