import test from "node:test";
import assert from "node:assert/strict";
import {
  PdfColors,
  Fragment,
  Heading,
  Link,
  PdfPage,
  Pdf,
  Row,
  Table,
  Text,
  View,
  buildPdfDocument,
  renderPdf
} from "../dist/esm/index.js";
import { jsx, jsxs } from "../dist/esm/jsx-runtime.js";

function allText(document) {
  return document.pages.flatMap((page) =>
    page.ops.filter((op) => op.kind === "text").map((op) => op.text)
  );
}

test("renders through the JSX runtime", () => {
  const element = jsx(Pdf, {
    title: "JSX",
    children: jsxs(View, {
      padding: 20,
      background: PdfColors.SoftGray,
      children: [
        jsx(Heading, { level: 1, children: "Hello" }),
        jsx(Text, { children: "from JSX" })
      ]
    })
  });

  const document = buildPdfDocument(element);
  assert.deepEqual(allText(document), ["Hello", "from JSX"]);
  assert.equal(allText(document).length, 2);
});

test("expands fragments recursively", () => {
  const element = jsx(Pdf, {
    children: jsx(Fragment, {
      children: [
        jsx(Text, { value: "one" }),
        jsx(Fragment, { children: jsx(Text, { value: "two" }) })
      ]
    })
  });
  assert.deepEqual(allText(buildPdfDocument(element)), ["one", "two"]);
});

test("applies heading defaults and allows overrides", () => {
  const document = buildPdfDocument(
    Pdf({
      children: [
        Heading({ children: "Big" }),
        Heading({ level: 2, children: "Medium" }),
        Heading({ level: 3, fontSize: 12, children: "Small" })
      ]
    })
  );
  const texts = document.pages[0].ops.filter((op) => op.kind === "text");
  assert.equal(texts[0].size, 28);
  assert.equal(texts[0].font, "helvetica-bold");
  assert.equal(texts[1].size, 22);
  assert.equal(texts[2].size, 12);
});

test("draws header and footer on every page with page numbers", () => {
  const document = buildPdfDocument(
    Pdf({
      header: View({ padding: 8, background: PdfColors.DarkBlue, children: Text({ value: "ACME", color: PdfColors.White, bold: true }) }),
      footer: ({ page, total }) => Text({ value: `Page ${page} of ${total}`, align: "center", fontSize: 9 }),
      children: [
        PdfPage({ children: Text({ value: "One" }) }),
        PdfPage({ children: Text({ value: "Two" }) })
      ]
    })
  );

  assert.equal(document.pages.length, 2);
  const texts = allText(document);
  assert.ok(texts.includes("ACME"));
  assert.ok(texts.includes("Page 1 of 2"));
  assert.ok(texts.includes("Page 2 of 2"));
});

test("reserves the tallest header on every page, including middle pages", () => {
  const document = buildPdfDocument(
    Pdf({
      margin: 40,
      header: ({ page }) =>
        View({
          height: page === 2 ? 160 : 20,
          children: Text({ value: `H${page}` })
        }),
      children: [
        PdfPage({ children: Text({ value: "one" }) }),
        PdfPage({ children: Text({ value: "two" }) })
      ]
    })
  );
  const body = document.pages[1].ops.find((op) => op.kind === "text" && op.text === "two");
  assert.ok(body);
  assert.ok(body.y > 200, `expected body below the 160pt header, got ${body.y}`);
});

test("rejects primitives as row children", () => {
  assert.throws(
    () => buildPdfDocument(Pdf({ children: Row({ children: ["oops"] }) })),
    (error) => error.code === "PDF_INVALID_INPUT"
  );
});

test("rejects oversized table cell text", () => {
  assert.throws(
    () =>
      buildPdfDocument(
        Pdf({
          children: Table({
            columns: [{ key: "text", header: "Text" }],
            rows: [["x".repeat(200_001)]]
          })
        })
      ),
    (error) => error.code === "PDF_LIMIT_EXCEEDED"
  );
});

test("keeps table cell styles and link annotations", () => {
  const bytes = renderPdf(
    Pdf({
      children: [
        Table({
          columns: [
            { key: "name", header: "Name", width: 220 },
            { key: "url", header: "URL", width: 220 }
          ],
          rows: [{ name: "Docs", url: { value: "Open", color: PdfColors.Blue } }]
        }),
        Link({ href: "https://example.com", children: Text({ value: "Example" }) })
      ]
    })
  );
  const text = new TextDecoder("windows-1252").decode(bytes);
  assert.match(text, /\/Subtype \/Link/);
  assert.match(text, /\/URI \(https:\/\/example\.com\)/);
  assert.match(text, /\/BaseFont \/Helvetica-Bold/);
});

test("rejects invalid component trees with stable codes", () => {
  const invalid = [
    () => buildPdfDocument(jsx(Pdf, { children: jsx("unknown", {}) })),
    () => buildPdfDocument(Pdf({ children: Text({ children: "x" }) }).props.children),
    () => buildPdfDocument(Pdf({ children: Text({ children: [Text({ value: "nested" })] }) })),
    () => buildPdfDocument(Pdf({ children: Table({ columns: [], rows: [] }) })),
    () => buildPdfDocument(Pdf({ children: Row({ children: [View({ width: 400 }), View({ width: 400 })] }) })),
    () => buildPdfDocument(Pdf({ children: Link({ href: "ftp://example.com", children: Text({ value: "x" }) }) }))
  ];

  for (const run of invalid) {
    assert.throws(run, (error) => error.code === "PDF_INVALID_INPUT");
  }
});

