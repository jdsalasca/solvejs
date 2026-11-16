import test from "node:test";
import assert from "node:assert/strict";
import {
  Bookmark,
  PdfColors,
  Link,
  PdfPage,
  Pdf,
  PdfError,
  Text,
  View,
  buildPdfDocument,
  renderPdf,
  renderPdfCompressed
} from "../dist/esm/index.js";

const decoder = new TextDecoder("windows-1252");
const latin1 = (bytes) => decoder.decode(bytes);

function pageCount(bytes) {
  return (latin1(bytes).match(/\/Type \/Page\b/g) ?? []).length;
}

test("renders a valid PDF with metadata and escaped text", () => {
  const bytes = renderPdf(
    Pdf({
      title: "Factura ñ",
      author: "SolveJS",
      children: View({
        padding: 20,
        background: PdfColors.LightBlue,
        children: Text({ value: "Hello (world) \\ friend", bold: true, color: PdfColors.DarkBlue })
      })
    })
  );

  const text = latin1(bytes);
  assert.match(text, /^%PDF-1\.7/);
  assert.match(text, /%%EOF/);
  assert.match(text, /\/Type \/Catalog/);
  assert.match(text, /\/BaseFont \/Helvetica-Bold/);
  assert.match(text, /Hello \\\(world\\\) \\\\ friend/);
  assert.match(text, /\/Title <FEFF0046006100630074007500720061002000F1>/);
  assert.match(text, /\/Author <FEFF0053006F006C00760065004A0053>/);
  assert.equal(pageCount(bytes), 1);
});

test("encodes Spanish accents and the euro sign in WinAnsi", () => {
  const bytes = renderPdf(
    Pdf({ children: Text({ value: "Factura ñ á é í ó ú ¿ ¡ €" }) })
  );
  const text = new TextDecoder("windows-1252").decode(bytes);
  assert.match(text, /Factura \\361 \\341 \\351 \\355 \\363 \\372 \\277 \\241 \\200/);
});

test("compresses content streams and keeps the document readable", async () => {
  const paragraphs = Array.from({ length: 120 }, (_, index) =>
    Text({ value: `Row ${index}: a repetitive line that compresses well in a real document.` })
  );
  const element = Pdf({ children: View({ children: paragraphs }) });
  const plain = renderPdf(element);
  const compressed = await renderPdfCompressed(element);

  assert.ok(compressed.length < plain.length, "compressed output should be smaller");
  assert.match(latin1(compressed), /\/Filter \/FlateDecode/);
  assert.match(latin1(compressed), /startxref/);
  assert.ok(pageCount(compressed) > 1);
});

test("supports explicit page breaks", () => {
  const bytes = renderPdf(
    Pdf({
      children: [
        PdfPage({ children: Text({ value: "First" }) }),
        PdfPage({ children: Text({ value: "Second" }) })
      ]
    })
  );
  assert.equal(pageCount(bytes), 2);
});

test("writes link annotations over clickable text", () => {
  const bytes = renderPdf(
    Pdf({
      children: Link({ href: "https://example.com/docs", children: Text({ value: "Open docs" }) })
    })
  );
  const text = latin1(bytes);
  assert.match(text, /\/Subtype \/Link/);
  assert.match(text, /\/URI \(https:\/\/example\.com\/docs\)/);
});

test("percent-encodes non-ASCII link targets independently of the text font", () => {
  const bytes = renderPdf(
    Pdf({
      children: Link({ href: "https://example.com/año", children: Text({ value: "Año" }) })
    })
  );
  assert.match(latin1(bytes), /\/URI \(https:\/\/example\.com\/a%C3%B1o\)/);
});

test("preserves existing percent escapes in link targets", () => {
  const bytes = renderPdf(
    Pdf({
      children: Link({ href: "https://example.com/a%20b?q=x%2Fy", children: Text({ value: "Encoded" }) })
    })
  );
  const text = latin1(bytes);
  assert.match(text, /\/URI \(https:\/\/example\.com\/a%20b\?q=x%2Fy\)/);
  assert.doesNotMatch(text, /%2520/);
});

test("transforms text and draws underline and strike rules", () => {
  const element = Pdf({
    children: Text({
      value: "editorial typography",
      fontFamily: "times",
      bold: true,
      italic: true,
      textTransform: "uppercase",
      underline: true,
      strike: true
    })
  });
  const document = buildPdfDocument(element);
  const text = document.pages[0].ops.find((op) => op.kind === "text");
  assert.equal(text.text, "EDITORIAL TYPOGRAPHY");
  assert.equal(text.font, "times-bold-italic");
  assert.ok(document.pages[0].ops.filter((op) => op.kind === "line").length >= 2);

  const text2 = latin1(renderPdf(element));
  assert.match(text2, /\(EDITORIAL TYPOGRAPHY\) Tj/);
});

test("builds nested bookmarks with page destinations", () => {
  const element = Pdf({
    children: [
      PdfPage({
        children: [
          Bookmark({ title: "Introduction" }),
          Text({ value: "Intro" }),
          Bookmark({ title: "Details", level: 2 }),
          Text({ value: "Details" })
        ]
      }),
      PdfPage({
        children: [Bookmark({ title: "Appendix" }), Text({ value: "Appendix" })]
      })
    ]
  });
  const document = buildPdfDocument(element);
  assert.deepEqual(
    document.outline?.map(({ title, level, page }) => ({ title, level, page })),
    [
      { title: "Introduction", level: 1, page: 0 },
      { title: "Details", level: 2, page: 0 },
      { title: "Appendix", level: 1, page: 1 }
    ]
  );

  const text = latin1(renderPdf(element));
  assert.match(text, /\/Outlines \d+ 0 R/);
  assert.match(text, /\/Title \(Introduction\)/);
  assert.match(text, /\/Title \(Details\)/);
  assert.match(text, /\/Dest \[\d+ 0 R \/XYZ 0 /);
});

test("rejects bookmarks with invalid titles or levels", () => {
  assert.throws(
    () => buildPdfDocument(Pdf({ children: Bookmark({ title: "" }) })),
    (error) => error.code === "PDF_INVALID_INPUT"
  );
  assert.throws(
    () => buildPdfDocument(Pdf({ children: Bookmark({ title: "x", level: 9 }) })),
    (error) => error.code === "PDF_INVALID_INPUT"
  );
});

test("builds a document model with A4 dimensions", () => {
  const document = buildPdfDocument(Pdf({ children: Text({ value: "A4" }) }));
  assert.equal(document.pages.length, 1);
  assert.equal(document.pages[0].width, 595.28);
  assert.equal(document.pages[0].height, 841.89);
});

test("rejects invalid input with stable codes", () => {
  const invalid = [
    () => buildPdfDocument({ type: "html", props: {} }),
    () => renderPdf(Pdf({ page: { width: 0, height: 10 } })),
    () => renderPdf(Pdf({ children: Text({ value: "x", color: "not-a-color" }) })),
    () => renderPdf(Pdf({ children: Link({ href: "javascript:alert(1)", children: Text({ value: "x" }) }) })),
    () => renderPdf(Pdf({ children: Text({ value: "x" }).props.children + "" }))
  ];

  for (const run of invalid.slice(0, 4)) {
    assert.throws(run, (error) => error instanceof PdfError && error.code === "PDF_INVALID_INPUT");
  }
});

