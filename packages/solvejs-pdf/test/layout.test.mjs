import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PdfColors,
  Heading,
  Image,
  Pdf,
  PdfPage,
  Row,
  Spacer,
  Table,
  Text,
  View,
  buildPdfDocument,
  renderPdf
} from "../dist/esm/index.js";

test("wraps text and paginates long flowed content", () => {
  const long = "A very long sentence that must wrap across the available width. ".repeat(80);
  const document = buildPdfDocument(
    Pdf({
      children: [
        Heading({ children: "Report" }),
        Text({ value: long }),
        Text({ value: long, marginTop: 12 })
      ]
    })
  );

  assert.ok(document.pages.length >= 2);
  const textOps = document.pages.flatMap((page) => page.ops.filter((op) => op.kind === "text"));
  assert.ok(textOps.length > 4);
  assert.ok(textOps.every((op) => op.x >= 40));
});

test("row children keep their widths and gap", () => {
  const document = buildPdfDocument(
    Pdf({
      children: Row({
        gap: 10,
        children: [
          View({ width: 100, height: 20, background: PdfColors.Red }),
          View({ width: 200, height: 20, background: PdfColors.Blue })
        ]
      })
    })
  );

  const rects = document.pages[0].ops.filter((op) => op.kind === "rect");
  assert.equal(rects.length, 2);
  assert.equal(rects[0].x, 40);
  assert.equal(rects[0].width, 100);
  assert.equal(rects[1].x, 150);
  assert.equal(rects[1].width, 200);
});

test("resolves percentage widths once inside nested rows", () => {
  const document = buildPdfDocument(
    Pdf({
      children: Row({
        children: [
          View({ width: "60%" }),
          View({
            width: "36%",
            padding: 14,
            background: PdfColors.LightBlue,
            children: Row({
              children: [
                Text({ value: "Subtotal", fontSize: 10 }),
                Text({ value: "$5,640.00", fontSize: 10, align: "right" })
              ]
            })
          })
        ]
      })
    })
  );

  const texts = document.pages[0].ops.filter((op) => op.kind === "text");
  assert.deepEqual(
    texts.map((op) => op.text),
    ["Subtotal", "$5,640.00"]
  );
  assert.ok(texts[1].x > texts[0].x + 60);
});

test("tables split by rows and repeat their header", () => {
  const rows = Array.from({ length: 40 }, (_, index) => ({
    item: `Item ${index}`,
    total: (index * 10).toFixed(2)
  }));
  const document = buildPdfDocument(
    Pdf({
      page: { width: 400, height: 320 },
      margin: 20,
      children: Table({
        columns: [
          { key: "item", header: "Item", width: 220 },
          { key: "total", header: "Total", width: 120, align: "right" }
        ],
        rows
      })
    })
  );

  assert.ok(document.pages.length > 1);
  const headerPages = document.pages.filter((page) =>
    page.ops.some((op) => op.kind === "text" && op.text === "Item")
  );
  assert.equal(headerPages.length, document.pages.length);
  const bodyTexts = document.pages.flatMap((page) =>
    page.ops.filter((op) => op.kind === "text").map((op) => op.text)
  );
  assert.ok(bodyTexts.includes("Item 0"));
  assert.ok(bodyTexts.includes("Item 39"));
});

test("retries a split on a fresh page instead of failing", () => {
  const long = "A long paragraph that must move to a fresh page and split there. ".repeat(30);
  const document = buildPdfDocument(
    Pdf({
      page: { width: 320, height: 300 },
      margin: 20,
      children: [
        Spacer({ height: 220 }),
        View({ width: 180, padding: 18, background: PdfColors.SoftGray, children: Text({ value: long }) })
      ]
    })
  );
  assert.ok(document.pages.length >= 2);
  const textOps = document.pages.flatMap((page) => page.ops.filter((op) => op.kind === "text"));
  assert.ok(textOps.length > 2);
  assert.ok(textOps.every((op) => op.x >= 38 && op.x <= 218));
});

test("does not create an empty page before a PdfPage with a page background", () => {
  const document = buildPdfDocument(
    Pdf({
      background: PdfColors.White,
      children: PdfPage({ children: Text({ value: "Body" }) })
    })
  );
  assert.equal(document.pages.length, 1);
});

test("splits a table nested inside a padded view", () => {
  const rows = Array.from({ length: 30 }, (_, index) => ({
    item: `Nested ${index}`,
    total: (index * 10).toFixed(2)
  }));
  const document = buildPdfDocument(
    Pdf({
      page: { width: 400, height: 320 },
      margin: 20,
      children: View({
        padding: 10,
        background: PdfColors.SoftGray,
        children: Table({
          columns: [
            { key: "item", header: "Item", width: 220 },
            { key: "total", header: "Total", width: 120, align: "right" }
          ],
          rows
        })
      })
    })
  );

  assert.ok(document.pages.length > 1);
  const headerPages = document.pages.filter((page) =>
    page.ops.some((op) => op.kind === "text" && op.text === "Item")
  );
  assert.equal(headerPages.length, document.pages.length);
});

test("renders styled table cells", () => {
  const document = buildPdfDocument(
    Pdf({
      children: Table({
        columns: [
          { key: "label", header: "Label", width: 200 },
          { key: "amount", header: "Amount", width: 120, align: "right" }
        ],
        rows: [
          { label: "Subtotal", amount: "100.00" },
          { label: { value: "Total", bold: true, color: PdfColors.DarkBlue }, amount: { value: "100.00", bold: true, background: PdfColors.Yellow } }
        ]
      })
    })
  );

  const texts = document.pages[0].ops.filter((op) => op.kind === "text");
  const total = texts.find((op) => op.text === "Total");
  assert.equal(total.font, "helvetica-bold");
  assert.equal(total.color, PdfColors.DarkBlue);
  const fills = document.pages[0].ops.filter((op) => op.kind === "rect" && op.fill === PdfColors.Yellow);
  assert.ok(fills.length >= 1);
});

test("embeds a JPEG image and preserves its aspect ratio", () => {
  const jpeg = readFileSync(new URL("./fixtures/tiny.jpg", import.meta.url));
  const document = buildPdfDocument(Pdf({ children: Image({ src: jpeg, width: 40 }) }));
  const image = document.pages[0].ops.find((op) => op.kind === "image");
  assert.ok(image);
  assert.equal(image.width, 40);
  assert.equal(image.height, 40);
  const bytes = renderPdf(Pdf({ children: Image({ src: jpeg, width: 40 }) }));
  assert.match(new TextDecoder("windows-1252").decode(bytes), /\/Filter \/DCTDecode/);
});

test("accepts JPEG data URLs and base64 strings", () => {
  const jpeg = readFileSync(new URL("./fixtures/tiny.jpg", import.meta.url));
  const base64 = jpeg.toString("base64");
  const fromDataUrl = buildPdfDocument(
    Pdf({ children: Image({ src: `data:image/jpeg;base64,${base64}`, width: 20 }) })
  );
  const fromBase64 = buildPdfDocument(Pdf({ children: Image({ src: base64, width: 20 }) }));
  assert.equal(fromDataUrl.pages[0].ops.find((op) => op.kind === "image").width, 20);
  assert.equal(fromBase64.pages[0].ops.find((op) => op.kind === "image").width, 20);
});

test("rejects an explicit box height smaller than its content", () => {
  assert.throws(
    () =>
      buildPdfDocument(
        Pdf({ children: View({ height: 10, padding: 4, children: Text({ value: "Too tall" }) }) })
      ),
    (error) => error.code === "PDF_INVALID_INPUT"
  );
});

test("rejects progressive frames and extra scans in JPEG data", () => {
  const jpeg = readFileSync(new URL("./fixtures/tiny.jpg", import.meta.url));
  const progressive = Uint8Array.from(jpeg);
  let sof = -1;
  for (let index = 0; index + 1 < progressive.length; index += 1) {
    if (progressive[index] === 0xff && progressive[index + 1] === 0xc0) {
      sof = index;
      break;
    }
  }
  assert.notEqual(sof, -1);
  progressive[sof + 1] = 0xc2;
  assert.throws(
    () => buildPdfDocument(Pdf({ children: Image({ src: progressive }) })),
    (error) => error.code === "PDF_UNSUPPORTED"
  );

  let eoi = jpeg.length - 2;
  while (eoi > 0 && !(jpeg[eoi] === 0xff && jpeg[eoi + 1] === 0xd9)) eoi -= 1;
  assert.ok(eoi > 0);
  const extraScan = new Uint8Array(jpeg.length + 2);
  extraScan.set(jpeg.subarray(0, eoi), 0);
  extraScan.set([0xff, 0xda], eoi);
  extraScan.set(jpeg.subarray(eoi), eoi + 2);
  assert.throws(
    () => buildPdfDocument(Pdf({ children: Image({ src: extraScan }) })),
    (error) => error.code === "PDF_UNSUPPORTED"
  );
});

test("rejects a frame header without scan data", () => {
  const jpeg = readFileSync(new URL("./fixtures/tiny.jpg", import.meta.url));
  const sofEnd = (() => {
    for (let index = 0; index + 4 < jpeg.length; index += 1) {
      if (jpeg[index] !== 0xff || jpeg[index + 1] !== 0xc0) continue;
      return index + 4 + ((jpeg[index + 2] << 8) | jpeg[index + 3]);
    }
    return -1;
  })();
  assert.notEqual(sofEnd, -1);
  const noScan = new Uint8Array(sofEnd + 2);
  noScan.set(jpeg.subarray(0, sofEnd), 0);
  noScan.set([0xff, 0xd9], sofEnd);
  assert.throws(
    () => buildPdfDocument(Pdf({ children: Image({ src: noScan }) })),
    (error) => error.code === "PDF_INVALID_INPUT"
  );
});

test("rejects truncated JPEG data", () => {
  assert.throws(
    () => renderPdf(Pdf({ children: Image({ src: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]) }) })),
    (error) => error.code === "PDF_INVALID_INPUT"
  );
});

test("rejects non-JPEG image data", () => {
  assert.throws(
    () => renderPdf(Pdf({ children: Image({ src: new Uint8Array([1, 2, 3, 4]) }) })),
    (error) => error.code === "PDF_INVALID_INPUT"
  );
});


