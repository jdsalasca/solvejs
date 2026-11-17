import test from "node:test";
import assert from "node:assert/strict";
import {
  BarChart,
  Formula,
  Icon,
  LineChart,
  Pdf,
  PdfPage,
  PieChart,
  Row,
  Text,
  buildPdfDocument,
  renderPdf
} from "../dist/esm/index.js";

const latin1 = (bytes) => new TextDecoder("windows-1252").decode(bytes);
const textOps = (page) => page.ops.filter((op) => op.kind === "text");

test("justifies wrapped text with word spacing", () => {
  const model = buildPdfDocument(
    Pdf({
      children: PdfPage({
        children: Text({
          align: "justify",
          value:
            "A report should feel designed from the first headline to the last footnote, even when the copy is long enough to wrap across several lines."
        })
      })
    })
  );
  const texts = textOps(model.pages[0]);
  assert.ok(texts.length > 1);
  assert.ok(texts.some((op) => op.wordSpacing > 0), "at least one non-final line is justified");
});

test("supports document and page line-height overrides", () => {
  const value =
    "A sentence long enough to wrap over more than one line so the distance between baselines can be measured in the model.";
  const global = buildPdfDocument(Pdf({ lineHeight: 2, children: PdfPage({ children: Text({ value }) }) }));
  const globalTexts = textOps(global.pages[0]);
  assert.equal(globalTexts[1].y - globalTexts[0].y, 22);

  const page = buildPdfDocument(
    Pdf({ lineHeight: 1.2, children: PdfPage({ lineHeight: 2, children: Text({ value }) }) })
  );
  const pageTexts = textOps(page.pages[0]);
  assert.equal(pageTexts[1].y - pageTexts[0].y, 22);
});

test("draws text watermarks behind page content and varies them per page", () => {
  const model = buildPdfDocument(
    Pdf({
      watermark: { text: "DRAFT", opacity: 0.2 },
      children: [
        PdfPage({ children: Text({ value: "One" }) }),
        PdfPage({ watermark: { text: "CONFIDENTIAL" }, children: Text({ value: "Two" }) }),
        PdfPage({ watermark: false, children: Text({ value: "Three" }) })
      ]
    })
  );
  assert.equal(model.pages[0].ops[0].text, "DRAFT");
  assert.equal(model.pages[0].ops[0].opacity, 0.2);
  assert.equal(model.pages[1].ops[0].text, "CONFIDENTIAL");
  assert.ok(!textOps(model.pages[2]).some((op) => op.text === "DRAFT" || op.text === "CONFIDENTIAL"));

  const bytes = renderPdf(
    Pdf({ watermark: { text: "CONFIDENTIAL", opacity: 0.15 }, children: PdfPage({ children: Text({ value: "Body" }) }) })
  );
  const text = latin1(bytes);
  assert.match(text, /\/ExtGState/);
  assert.match(text, /\/ca 0.15/);
});

test("renders symbols with the Symbol font and a LaTeX-style formula", () => {
  const symbol = buildPdfDocument(
    Pdf({ children: PdfPage({ children: Text({ fontFamily: "symbol", value: "α + β = γ" }) }) })
  );
  const op = textOps(symbol.pages[0])[0];
  assert.equal(op.font, "symbol");
  assert.match(latin1(renderPdf(Pdf({ children: PdfPage({ children: Text({ fontFamily: "symbol", value: "α" }) }) }))), /BaseFont \/Symbol/);

  const formula = buildPdfDocument(
    Pdf({
      children: PdfPage({
        children: Formula({ tex: "\\frac{a}{b} + x^2 + \\sqrt{y} + \\alpha", fontSize: 18 })
      })
    })
  );
  const texts = textOps(formula.pages[0]).map((item) => item.text);
  assert.ok(texts.includes("a"));
  assert.ok(texts.includes("b"));
  assert.ok(texts.includes("α"));
  assert.ok(formula.pages[0].ops.some((item) => item.kind === "line"), "fraction rule is drawn");
  assert.ok(formula.pages[0].ops.some((item) => item.kind === "polygon"), "root radical is drawn");
});

test("draws vector icons and charts", () => {
  const icons = buildPdfDocument(
    Pdf({
      children: PdfPage({
        children: Row({ valign: "middle", children: [Icon({ name: "check", size: 24 }), Text({ value: "Verified", fontSize: 14 })] })
      })
    })
  );
  assert.ok(icons.pages[0].ops.some((op) => op.kind === "polygon"));

  const charts = buildPdfDocument(
    Pdf({
      children: PdfPage({
        children: [
          BarChart({ data: [{ label: "Q1", value: 12 }, { label: "Q2", value: 20 }], height: 160, width: 220 }),
          LineChart({ data: [{ label: "Jan", value: 4 }, { label: "Feb", value: 9 }], height: 160, width: 220 }),
          PieChart({ data: [{ label: "A", value: 3 }, { label: "B", value: 7 }], height: 180, width: 220 })
        ]
      })
    })
  );
  const ops = charts.pages[0].ops;
  assert.ok(ops.filter((op) => op.kind === "rect").length > 4);
  assert.ok(ops.filter((op) => op.kind === "line").length > 4);
  assert.ok(ops.filter((op) => op.kind === "polygon").length > 1);
});
