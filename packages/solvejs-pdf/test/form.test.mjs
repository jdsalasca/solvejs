import test from "node:test";
import assert from "node:assert/strict";
import { Pdf, PdfPage, Text, fillPdfForm, readPdfForm, readPdfFormValues, renderPdf } from "../dist/esm/index.js";
import { buildFormPdf, buildObjectStreamPdf, buildXfaPdf } from "./fixtures/form-fixture.mjs";

test("reads AcroForm fields, inherited names, options and page positions", async () => {
  const info = await readPdfForm(buildFormPdf());
  assert.equal(info.hasAcroForm, true);
  assert.equal(info.hasXfa, false);
  assert.equal(info.encrypted, false);
  assert.deepEqual(
    info.fields.map((field) => [field.name, field.type, field.value]),
    [
      ["name", "text", "Ada Lovelace"],
      ["email", "text", null],
      ["subscribe", "checkbox", true],
      ["plan", "radio", "pro"],
      ["country", "choice", "Colombia"],
      ["notes", "text", "Hello"],
      ["address.city", "text", "Bogota"]
    ]
  );
  const name = info.fields[0];
  assert.equal(name.page, 1);
  assert.deepEqual(name.rect, { x: 72, y: 690, width: 228, height: 22 });
  assert.equal(info.fields[5].multiline, true);
  assert.deepEqual(info.fields[3].options, ["basic", "pro"]);
  assert.deepEqual(info.fields[4].options, ["United States", "Colombia", "Mexico"]);
});

test("fills text, checkbox, radio, choice and nested fields", async () => {
  const original = buildFormPdf();
  const filled = await fillPdfForm(original, {
    name: "Grace Hopper",
    email: "grace@example.com",
    subscribe: false,
    plan: "basic",
    country: "Mexico",
    notes: "Line one\nLine two",
    "address.city": "Medellin"
  });
  assert.ok(filled.byteLength > original.byteLength);
  assert.equal(original.byteLength, buildFormPdf().byteLength, "fill does not mutate the input");
  const values = await readPdfFormValues(filled);
  assert.equal(values.name, "Grace Hopper");
  assert.equal(values.email, "grace@example.com");
  assert.equal(values.subscribe, false);
  assert.equal(values.plan, "basic");
  assert.equal(values.country, "Mexico");
  assert.equal(values.notes, "Line one\nLine two");
  assert.equal(values["address.city"], "Medellin");
  const text = new TextDecoder("windows-1252").decode(filled);
  assert.match(text, /\/NeedAppearances true/);
  assert.match(text, /%%EOF\n$/);
});

test("reads and fills forms inside object streams with an xref stream", async () => {
  const input = buildObjectStreamPdf();
  const info = await readPdfForm(input);
  assert.equal(info.hasAcroForm, true);
  assert.deepEqual(info.fields.map((field) => [field.name, field.value]), [["name", "Ada"]]);
  const filled = await fillPdfForm(input, { name: "Grace Hopper" });
  const values = await readPdfFormValues(filled);
  assert.equal(values.name, "Grace Hopper");
  const text = new TextDecoder("windows-1252").decode(filled);
  assert.match(text, /\/Type \/XRef/);
  assert.match(text, /\/Prev \d+/);
});

test("detects XFA forms and PDFs without AcroForm", async () => {
  const xfa = await readPdfForm(buildXfaPdf());
  assert.equal(xfa.hasAcroForm, true);
  assert.equal(xfa.hasXfa, true);
  assert.deepEqual(xfa.fields, []);

  const plain = renderPdf(Pdf({ children: PdfPage({ children: Text({ children: "No fields" }) }) }));
  const info = await readPdfForm(plain);
  assert.equal(info.hasAcroForm, false);
  await assert.rejects(() => fillPdfForm(plain, { name: "x" }), /no AcroForm/);
});
