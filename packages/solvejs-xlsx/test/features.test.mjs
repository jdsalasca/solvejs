import test from "node:test";
import assert from "node:assert/strict";
import {
  Cell,
  Colors,
  Row,
  Sheet,
  Xlsx,
  readXlsx,
  renderXlsx,
  writeXlsx,
  XlsxError
} from "../dist/esm/index.js";
import { parseXml } from "../dist/esm/xml/parse.js";
import { readFileSync } from "node:fs";
import { readZip } from "../dist/esm/zip/read.js";

const png = readFileSync(new URL("./fixtures/tiny.png", import.meta.url));
const jpeg = readFileSync(new URL("./fixtures/tiny.jpg", import.meta.url));

test("writes and reads workbook properties", async () => {
  const bytes = writeXlsx({ title: "Report", creator: "SolveJS", sheets: [{ name: "One", rows: [["ok"]] }] });
  const workbook = await readXlsx(bytes);
  assert.deepEqual(workbook.properties, { title: "Report", creator: "SolveJS" });
  assert.equal(workbook.date1904, false);
});

test("writes formulas with cached values and reads them back", async () => {
  const bytes = writeXlsx({
    sheets: [
      {
        name: "Calc",
        rows: [
          [1],
          [2],
          [{ formula: "SUM(A1:A2)", value: 3 }],
          [{ formula: 'CONCAT("a","b")', value: "ab" }],
          [{ formula: "TRUE()", value: true }]
        ]
      }
    ]
  });
  const workbook = await readXlsx(bytes);
  assert.deepEqual(workbook.sheets[0].rows, [[1], [2], [3], ["ab"], [true]]);
  assert.deepEqual({ ...workbook.sheets[0].formulas }, {
    A3: "SUM(A1:A2)",
    A4: 'CONCAT("a","b")',
    A5: "TRUE()"
  });
});

test("writes and reads hyperlinks", async () => {
  const bytes = writeXlsx({
    sheets: [
      {
        name: "Links",
        rows: [[{ value: "Docs", href: "https://example.com/docs" }, { value: "Mail", href: "mailto:hi@example.com" }]]
      }
    ]
  });
  const workbook = await readXlsx(bytes);
  assert.deepEqual({ ...workbook.sheets[0].links }, {
    A1: "https://example.com/docs",
    B1: "mailto:hi@example.com"
  });
});

test("writes internal hyperlink locations without external relationships", async () => {
  const bytes = writeXlsx({
    sheets: [{ name: "Links", rows: [[{ value: "Go", href: "#Other!A1" }]] }]
  });
  const sheet = (await readXlsx(bytes)).sheets[0];
  assert.equal(sheet.links?.A1, "#Other!A1");
  const files = await readZip(bytes);
  assert.equal(files.has("xl/worksheets/_rels/sheet1.xml.rels"), false);
});

test("writes and reads merged ranges, freeze, filter, widths and row heights", async () => {
  const bytes = renderXlsx(
    Xlsx({
      children: Sheet({
        name: "Layout",
        columns: [{ width: 24 }, { width: 12 }],
        freeze: { rows: 1, columns: 2 },
        autoFilter: true,
        tabColor: Colors.Blue,
        children: [
          Row({ height: 30, children: Cell({ value: "Title", colSpan: 2 }) }),
          Row({ children: [Cell({ value: "A" }), Cell({ value: 1 })] })
        ]
      })
    })
  );
  const sheet = (await readXlsx(bytes)).sheets[0];
  assert.deepEqual(sheet.merges, ["A1:B1"]);
  assert.deepEqual(sheet.freeze, { rows: 1, columns: 2 });
  assert.equal(sheet.autoFilter, "A1:B2");
  assert.equal(sheet.columns?.[0].width, 24);
  assert.equal(sheet.rowHeights?.[1], 30);
});

test("reads cell styles and column styles when requested", async () => {
  const bytes = renderXlsx(
    Xlsx({
      children: Sheet({
        name: "Styled",
        columns: [{ width: 20, style: { bold: true } }],
        children: [
          Row({
            children: Cell({
              value: "Total",
              bold: true,
              fill: Colors.Yellow,
              fontColor: Colors.DarkBlue,
              align: "right",
              border: "thin",
              numberFormat: "#,##0.00"
            })
          })
        ]
      })
    })
  );
  const sheet = (await readXlsx(bytes, { includeStyles: true })).sheets[0];
  const style = sheet.styles?.A1;
  assert.ok(style);
  assert.equal(style.bold, true);
  assert.equal(style.fill, "FFFFFF00");
  assert.equal(style.fontColor, "FF1F4E78");
  assert.equal(style.align, "right");
  assert.equal(style.borderTop?.style, "thin");
  assert.equal(style.numberFormat, "#,##0.00");
  assert.equal(sheet.columns?.[0].style?.bold, true);
});

test("leaves styles out by default but keeps dates typed", async () => {
  const bytes = renderXlsx(
    Xlsx({
      children: Sheet({
        name: "Dates",
        children: Row({ children: Cell({ value: new Date(Date.UTC(2026, 10, 16)), numberFormat: "yyyy-mm-dd" }) })
      })
    })
  );
  const sheet = (await readXlsx(bytes)).sheets[0];
  assert.equal(sheet.styles, undefined);
  assert.ok(sheet.rows[0][0] instanceof Date);
});

test("writes and reads PNG and JPEG images with anchors", async () => {
  const bytes = writeXlsx({
    sheets: [
      {
        name: "Media",
        rows: [["Logo"]],
        images: [
          { data: png, anchor: "B2", width: 80, height: 40, alt: "Logo" },
          { data: jpeg, anchor: "D4" }
        ]
      }
    ]
  });
  const files = await readZip(bytes);
  assert.ok(files.has("xl/media/image1.png"));
  assert.ok(files.has("xl/media/image2.jpeg"));
  assert.ok(files.has("xl/drawings/drawing1.xml"));
  assert.ok(files.has("xl/drawings/_rels/drawing1.xml.rels"));
  assert.match(new TextDecoder().decode(files.get("xl/drawings/drawing1.xml")), /oneCellAnchor/);

  const sheet = (await readXlsx(bytes)).sheets[0];
  assert.ok(sheet.images);
  assert.equal(sheet.images.length, 2);
  assert.deepEqual(
    sheet.images.map((image) => ({ anchor: image.anchor, format: image.format, width: image.width, height: image.height })),
    [
      { anchor: "B2", format: "png", width: 80, height: 40 },
      { anchor: "D4", format: "jpeg", width: 8, height: 8 }
    ]
  );
  assert.deepEqual([...sheet.images[0].data], [...png]);
});

test("rejects unsupported image data", () => {
  assert.throws(
    () => writeXlsx({ sheets: [{ name: "Bad", rows: [], images: [{ data: new Uint8Array([1, 2, 3]) }] }] }),
    (error) => error instanceof XlsxError && error.code === "XLSX_UNSUPPORTED"
  );
});

test("keeps formula-looking strings as data, not formulas", async () => {
  const bytes = writeXlsx({ sheets: [{ name: "Safe", rows: [["=SUM(A1:A2)"]] }] });
  const workbook = await readXlsx(bytes);
  assert.equal(workbook.sheets[0].rows[0][0], "=SUM(A1:A2)");
  assert.equal(workbook.sheets[0].formulas, undefined);
});

test("combines hyperlinks and images without relationship collisions", async () => {
  const bytes = writeXlsx({
    sheets: [
      {
        name: "Mixed",
        rows: [[{ value: "Docs", href: "https://example.com" }]],
        images: [{ data: png, anchor: "C3", width: 20, height: 20 }]
      }
    ]
  });
  const sheet = (await readXlsx(bytes)).sheets[0];
  assert.equal(sheet.links?.A1, "https://example.com");
  assert.equal(sheet.images?.[0].anchor, "C3");
});

test("can skip formula metadata", async () => {
  const bytes = writeXlsx({ sheets: [{ name: "Calc", rows: [[{ formula: "1+1", value: 2 }]] }] });
  const sheet = (await readXlsx(bytes, { includeFormulas: false })).sheets[0];
  assert.equal(sheet.rows[0][0], 2);
  assert.equal(sheet.formulas, undefined);
});

test("rejects formula and hyperlink abuse", () => {
  const invalid = [
    () => writeXlsx({ sheets: [{ name: "Bad", rows: [[{ formula: "" }]] }] }),
    () => writeXlsx({ sheets: [{ name: "Bad", rows: [[{ formula: "A1\u0001" }]] }] }),
    () => writeXlsx({ sheets: [{ name: "Bad", rows: [[{ value: "x", href: "javascript:alert(1)" }]] }] })
  ];
  for (const run of invalid) {
    assert.throws(run, (error) => error instanceof XlsxError && error.code === "XLSX_INVALID_INPUT");
  }
});

test("does not pollute Object.prototype through XML attributes or JSON headers", () => {
  const root = parseXml('<root __proto__="polluted" constructor="also"/>');
  assert.equal({}.polluted, undefined);
  assert.equal(root.children[0].attributes.__proto__, "polluted");
});
