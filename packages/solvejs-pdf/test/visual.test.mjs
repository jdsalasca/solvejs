import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BarChart,
  Formula,
  Icon,
  LineChart,
  Pdf,
  PdfPage,
  PieChart,
  Receipt,
  Row,
  Stamp,
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
        PdfPage({ children: Text({ value: "Three" }) }),
        PdfPage({ watermark: false, children: Text({ value: "Four" }) })
      ]
    })
  );
  assert.equal(model.pages[0].ops[0].text, "DRAFT");
  assert.equal(model.pages[0].ops[0].opacity, 0.2);
  assert.equal(model.pages[1].ops[0].text, "CONFIDENTIAL");
  assert.equal(model.pages[2].ops[0].text, "DRAFT");
  assert.ok(!textOps(model.pages[3]).some((op) => op.text === "DRAFT" || op.text === "CONFIDENTIAL"));

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

test("builds a receipt with barcode and stamp", () => {
  const model = buildPdfDocument(
    Pdf({
      children: PdfPage({
        children: Receipt({
          title: "ACME RECEIPT",
          subtitle: "123 Main Street",
          meta: [
            { label: "DATE", value: "16 NOV 2026" },
            { label: "CASHIER", value: "ADA" }
          ],
          items: [
            { description: "Design system", qty: 1, unit: "2,400.00", total: "2,400.00" },
            { description: "Implementation", qty: 2, unit: "1,200.00", total: "2,400.00" }
          ],
          totals: [
            { label: "SUBTOTAL", value: "4,800.00" },
            { label: "TOTAL", value: "5,184.00", bold: true }
          ],
          barcode: "ACME-1042",
          stamp: "PAID",
          footer: "THANK YOU"
        })
      })
    })
  );
  const texts = textOps(model.pages[0]).map((op) => op.text);
  assert.ok(texts.includes("ACME RECEIPT"));
  assert.ok(texts.includes("PAID"));
  assert.ok(texts.includes("ACME-1042"));
  assert.ok(model.pages[0].ops.filter((op) => op.kind === "rect").length > 10, "barcode bars");
  assert.ok(model.pages[0].ops.filter((op) => op.kind === "polygon").length >= 1, "stamp border");
  assert.ok(model.pages[0].ops.filter((op) => op.kind === "line").length > 2, "dashed receipt rules");
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

test("draws PNG image watermarks, alone or combined with text", () => {
  const png = readFileSync(new URL("./fixtures/tiny-rgb.png", import.meta.url));
  const model = buildPdfDocument(
    Pdf({
      watermark: { image: png, imageWidth: 200, opacity: 0.2 },
      children: PdfPage({ children: Text({ value: "Body" }) })
    })
  );
  const image = model.pages[0].ops.find((op) => op.kind === "image");
  assert.ok(image);
  assert.equal(image.width, 200);
  assert.equal(image.height, 200);
  assert.equal(image.opacity, 0.2);
  assert.equal(image.x, (model.pages[0].width - 200) / 2);

  const both = buildPdfDocument(
    Pdf({
      watermark: { image: png, text: "DRAFT", angle: 15 },
      children: PdfPage({ children: Text({ value: "Body" }) })
    })
  );
  const ops = both.pages[0].ops;
  assert.ok(ops.some((op) => op.kind === "image" && op.rotate === 15));
  assert.ok(ops.some((op) => op.kind === "text" && op.text === "DRAFT" && op.rotate === 15));
});

test("customizes stamp colors, font and casing", () => {
  const model = buildPdfDocument(
    Pdf({
      children: PdfPage({
        children: Stamp({
          text: "Approved",
          color: "#9A3412",
          background: "#FFF7ED",
          borderColor: "#EA580C",
          fontFamily: "times",
          bold: false,
          italic: true,
          uppercase: false,
          borderWidth: 2
        })
      })
    })
  );
  const ops = model.pages[0].ops;
  const polygon = ops.find((op) => op.kind === "polygon");
  const label = ops.find((op) => op.kind === "text");
  assert.equal(polygon.fill, "#FFF7ED");
  assert.equal(polygon.stroke, "#EA580C");
  assert.equal(polygon.lineWidth, 2);
  assert.equal(label.text, "Approved");
  assert.equal(label.font, "times-italic");
  assert.equal(label.color, "#9A3412");
});

