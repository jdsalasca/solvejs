import test from "node:test";
import assert from "node:assert/strict";
import {
  Cell,
  Colors,
  Column,
  Fragment,
  Row,
  Sheet,
  Xlsx,
  createElement,
  readXlsx,
  renderXlsx,
  XlsxError
} from "../dist/esm/index.js";
import { jsx, jsxs } from "../dist/esm/jsx-runtime.js";
import { readZip } from "../dist/esm/zip/read.js";

const decoder = new TextDecoder();

function text(files, name) {
  return decoder.decode(files.get(name));
}

test("renders a styled workbook through the JSX runtime", async () => {
  const element = jsx(Xlsx, {
    name: "Report",
    creator: "SolveJS",
    children: jsx(Sheet, {
      name: "Invoices",
      freeze: { rows: 1 },
      autoFilter: true,
      tabColor: Colors.Blue,
      children: [
        jsx(Column, { width: 18 }),
        jsx(Column, { width: 24 }),
        jsxs(Row, {
          height: 22,
          children: [
            jsx(Cell, { value: "ID", bold: true, fill: Colors.DarkBlue, fontColor: Colors.White, align: "center" }),
            jsx(Cell, { value: "Customer", bold: true, fill: "1F4E78", fontColor: "FFFFFF", align: "center" }),
            jsx(Cell, { value: "Total", bold: true, align: "right" })
          ]
        }),
        jsxs(Row, {
          children: [
            jsx(Cell, { content: 1 }),
            jsx(Cell, { content: "Ada & Co" }),
            jsx(Cell, { content: 1999, numberFormat: "#,##0.00", align: "right", border: "thin" })
          ]
        }),
        jsx(Row, { children: jsx(Cell, { value: "Merged", colSpan: 3 }) })
      ]
    })
  });

  const bytes = renderXlsx(element);
  const workbook = await readXlsx(bytes);
  assert.deepEqual(workbook.sheets[0].rows[0], ["ID", "Customer", "Total"]);
  assert.deepEqual(workbook.sheets[0].rows[1], [1, "Ada & Co", 1999]);
  assert.deepEqual(workbook.sheets[0].rows[2], ["Merged"]);

  const files = await readZip(bytes);
  const sheetXml = text(files, "xl/worksheets/sheet1.xml");
  assert.match(sheetXml, /<col min="1" max="1" width="18" customWidth="1"\/>/);
  assert.match(sheetXml, /<row r="1" ht="22" customHeight="1">/);
  assert.match(sheetXml, /<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"\/>/);
  assert.match(sheetXml, /<autoFilter ref="A1:C3"\/>/);
  assert.match(sheetXml, /<mergeCell ref="A3:C3"\/>/);
  assert.match(sheetXml, /<tabColor rgb="FF0070C0"\/>/);

  const stylesXml = text(files, "xl/styles.xml");
  assert.match(stylesXml, /<b\/>/);
  assert.match(stylesXml, /rgb="FF1F4E78"/);
  assert.match(stylesXml, /horizontal="right"/);
  assert.match(stylesXml, /formatCode="#,##0\.00"/);
  assert.match(stylesXml, /<left style="thin">/);

  const coreXml = text(files, "docProps/core.xml");
  assert.match(coreXml, /<dc:title>Report<\/dc:title>/);
  assert.match(coreXml, /<dc:creator>SolveJS<\/dc:creator>/);
});

test("supports direct cells with row and column placement", async () => {
  const element = jsx(Xlsx, {
    children: jsx(Sheet, {
      name: "Grid",
      children: [
        jsx(Cell, { row: 1, column: 1, value: "A" }),
        jsx(Cell, { row: 1, column_number: 3, value: "C" }),
        jsx(Cell, { row: 2, column: 2, value: "B" })
      ]
    })
  });

  const workbook = await readXlsx(renderXlsx(element));
  assert.deepEqual(workbook.sheets[0].rows[0], ["A", null, "C"]);
  assert.deepEqual(workbook.sheets[0].rows[1], [null, "B"]);
});

test("exposes the same components without JSX", async () => {
  const element = createElement(
    Xlsx,
    { name: "Builder" },
    createElement(
      Sheet,
      { name: "Sheet1" },
      createElement(Row, {}, createElement(Cell, { value: "ok" }), createElement(Cell, { value: 42 }))
    )
  );

  const workbook = await readXlsx(renderXlsx(element));
  assert.deepEqual(workbook.sheets[0].rows[0], ["ok", 42]);
});

test("accepts named colors and #RRGGBB in the same style", async () => {
  const bytes = renderXlsx(
    jsx(Xlsx, {
      children: jsx(Sheet, {
        name: "Colors",
        children: jsx(Row, {
          children: [
            jsx(Cell, { value: "red", fill: Colors.Red }),
            jsx(Cell, { value: "green", fill: "#00FF00" })
          ]
        })
      })
    })
  );

  const styles = text(await readZip(bytes), "xl/styles.xml");
  assert.match(styles, /rgb="FFFF0000"/);
  assert.match(styles, /rgb="FF00FF00"/);
});

test("rejects an invalid component tree with stable codes", () => {
  assert.throws(
    () => renderXlsx(jsx(Xlsx, { children: [] })),
    (error) => error instanceof XlsxError && error.code === "XLSX_INVALID_INPUT"
  );
  assert.throws(
    () =>
      renderXlsx(
        jsx(Xlsx, {
          children: jsx(Sheet, { name: "Grid", children: jsx(Cell, { value: "no row" }) })
        })
      ),
    (error) => error instanceof XlsxError && error.code === "XLSX_INVALID_INPUT"
  );
  assert.throws(
    () =>
      renderXlsx(
        jsx(Xlsx, {
          children: jsx(Sheet, {
            name: "Grid",
            children: jsx(Row, { children: jsx(Cell, { value: "bad span", colSpan: 0 }) })
          })
        })
      ),
    (error) => error instanceof XlsxError && error.code === "XLSX_INVALID_INPUT"
  );
});

test("styles blank cells and maps middle alignment to center", async () => {
  const bytes = renderXlsx(
    jsx(Xlsx, {
      children: jsx(Sheet, {
        name: "Blanks",
        children: [
          jsx(Row, { height: 20.5, children: jsx(Cell, { value: "top" }) }),
          jsx(Row, {
            children: jsx(Cell, {
              column: 2,
              value: null,
              fill: Colors.Yellow,
              verticalAlign: "middle",
              wrapText: true
            })
          })
        ]
      })
    })
  );

  const files = await readZip(bytes);
  const sheetXml = text(files, "xl/worksheets/sheet1.xml");
  assert.match(sheetXml, /<row r="1" ht="20\.5" customHeight="1">/);
  assert.match(sheetXml, /<c r="B2" s="1"\/>/);

  const stylesXml = text(files, "xl/styles.xml");
  assert.match(stylesXml, /vertical="center"/);
  assert.doesNotMatch(stylesXml, /vertical="middle"/);
  assert.match(stylesXml, /wrapText="1"/);
  assert.match(stylesXml, /rgb="FFFFFF00"/);
});

test("emits autoFilter before mergeCells", async () => {
  const bytes = renderXlsx(
    jsx(Xlsx, {
      children: jsx(Sheet, {
        name: "Order",
        autoFilter: true,
        children: [
          jsx(Row, { children: [jsx(Cell, { value: "A" }), jsx(Cell, { value: "B" })] }),
          jsx(Row, { children: jsx(Cell, { value: "merged", colSpan: 2 }) })
        ]
      })
    })
  );

  const sheetXml = text(await readZip(bytes), "xl/worksheets/sheet1.xml");
  assert.ok(sheetXml.indexOf("<autoFilter") < sheetXml.indexOf("<mergeCells"));
});

test("expands fragments recursively", async () => {
  const bytes = renderXlsx(
    jsx(Xlsx, {
      children: jsx(Fragment, {
        children: jsx(Sheet, {
          name: "Inner",
          children: jsx(Fragment, {
            children: [
              jsx(Column, { width: 10.5 }),
              jsx(Row, {
                children: jsx(Fragment, {
                  children: [jsx(Cell, { value: "one" }), jsx(Cell, { value: "two" })]
                })
              })
            ]
          })
        })
      })
    })
  );

  const workbook = await readXlsx(bytes);
  assert.deepEqual(workbook.sheets[0].rows[0], ["one", "two"]);
  assert.match(text(await readZip(bytes), "xl/worksheets/sheet1.xml"), /width="10\.5"/);
});

test("rejects overlapping cells before rendering", () => {
  const fails = (children) =>
    assert.throws(
      () => renderXlsx(jsx(Xlsx, { children: jsx(Sheet, { name: "Grid", children }) })),
      (error) => error instanceof XlsxError && error.code === "XLSX_INVALID_INPUT"
    );

  fails(
    jsx(Row, {
      children: [jsx(Cell, { value: "wide", colSpan: 2 }), jsx(Cell, { column: 2, value: "overlap" })]
    })
  );
  fails(jsx(Row, { children: [jsx(Cell, { value: "a" }), jsx(Cell, { column: 1, value: "b" })] }));
  fails([jsx(Cell, { row: 1, column: 1, value: "a" }), jsx(Cell, { row: 1, column: 1, value: "b" })]);
  fails([
    jsx(Row, { children: jsx(Cell, { value: "tall", rowSpan: 2 }) }),
    jsx(Row, { children: jsx(Cell, { value: "clash" }) })
  ]);
});

test("rejects misplaced children, duplicate rows and huge coordinates", () => {
  const fails = (children) =>
    assert.throws(
      () => renderXlsx(jsx(Xlsx, { children })),
      (error) => error instanceof XlsxError && error.code === "XLSX_INVALID_INPUT"
    );

  fails("not an element");
  fails(
    jsx(Sheet, {
      name: "Grid",
      children: jsx(Row, { children: jsx(Column, { width: 10 }) })
    })
  );
  fails(
    jsx(Sheet, {
      name: "Grid",
      children: [
        jsx(Row, { row: 1, children: jsx(Cell, { value: "a" }) }),
        jsx(Row, { row: 1, children: jsx(Cell, { value: "b" }) })
      ]
    })
  );
  fails(jsx(Sheet, { name: "Grid", children: jsx(Cell, { row: 100001, value: "x" }) }));
});

test("rejects invalid alignment and border values", () => {
  const fails = (props) =>
    assert.throws(
      () =>
        renderXlsx(
          jsx(Xlsx, {
            children: jsx(Sheet, {
              name: "Grid",
              children: jsx(Row, { children: jsx(Cell, { value: "x", ...props }) })
            })
          })
        ),
      (error) => error instanceof XlsxError && error.code === "XLSX_INVALID_INPUT"
    );

  fails({ align: "middle" });
  fails({ verticalAlign: "sideways" });
  fails({ border: "wavy" });
  fails({ underline: "wavy" });
  fails({ fill: "not-a-color" });
});
