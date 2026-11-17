/* eslint-disable complexity, max-lines-per-function -- the PDF studio keeps each document recipe together */
import {
  Bookmark,
  Divider,
  Heading,
  Paragraph,
  Pdf,
  PdfColors,
  PdfPage,
  Row,
  Spacer,
  Subtitle,
  Table,
  Text,
  View,
  fillPdfForm,
  readPdfForm,
  renderPdf
} from "@jdsalasc/solvejs-pdf";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function stat(value, label) {
  return View({
    padding: 12,
    radius: 8,
    background: PdfColors.SoftGray,
    children: [
      Text({ value, bold: true, fontSize: 20, color: PdfColors.DarkBlue }),
      Text({ value: label, preset: "caption" })
    ]
  });
}

function reportDoc(preset) {
  return Pdf({
    title: "SolveJS field notes",
    author: "SolveJS",
    subject: "Reports with headers, tables and page numbers",
    page: "a4",
    margin: { top: 92, bottom: 74, left: 54, right: 54 },
    header: ({ page, total }) =>
      View({
        paddingBottom: 6,
        children: [
          Row({
            children: [
              Text({ value: "SOLVEJS / FIELD NOTES", preset: "eyebrow" }),
              Text({ value: `VOL. 01 · ${page} / ${total}`, fontSize: 8, color: PdfColors.Gray, align: "right" })
            ]
          }),
          Divider({ color: PdfColors.LightGray, marginTop: 6 })
        ]
      }),
    ...(preset === "none" ? {} : { pageNumbers: { preset } }),
    children: [
      PdfPage({
        children: [
          Bookmark({ title: "Summary" }),
          Text({ preset: "eyebrow", children: "REPORT · 2026" }),
          Text({ preset: "display", children: "Documents that feel like product." }),
          Subtitle({ children: "A PDF should carry the same care as the screen it came from." }),
          Spacer({ height: 14 }),
          Row({ gap: 10, children: [stat("22", "packages"), stat("0", "runtime deps"), stat("2", "document engines")] }),
          Heading({ level: 2, children: "Why this matters" }),
          Paragraph({
            children:
              "Shipping a report is the last mile of the product. When headers, tables and page furniture are first-class, the document stops looking generated."
          }),
          Table({
            columns: [
              { key: "area", header: "Area", width: 180 },
              { key: "before", header: "Before", width: 130 },
              { key: "after", header: "With SolveJS", width: 160 }
            ],
            rows: [
              ["Typography", "Manual font juggling", "Presets and explicit overrides"],
              ["Page numbers", "Post-processing", "Built-in presets"],
              ["Metadata", "Often missing", "Title, author, subject"],
              ["Output", "Bytes and hope", "Native PDF objects"]
            ],
            header: true,
            zebra: true,
            cellPadding: 8,
            fontSize: 9,
            headerBackground: PdfColors.DarkBlue,
            headerColor: PdfColors.White,
            zebraColor: PdfColors.SoftGray
          }),
          Spacer({ height: 10 }),
          Text({ value: "Generated from the same package build that ships on npm.", preset: "caption" })
        ]
      }),
      PdfPage({
        children: [
          Bookmark({ title: "Appendix", level: 2 }),
          Heading({ level: 2, children: "Appendix" }),
          Paragraph({
            children:
              "Every heading above is a real PDF text object. The outline entry is a native bookmark, and the page numbers are drawn by the same layout engine that positions the body."
          }),
          Divider({ marginTop: 18, marginBottom: 18 }),
          Text({ preset: "signature", children: "Ada Lovelace" }),
          Text({ value: "Editorial signature · times italic", preset: "caption" })
        ]
      })
    ]
  });
}

function invoiceDoc() {
  return Pdf({
    title: "Invoice 1042",
    author: "Acme Studio",
    page: "a4",
    margin: { top: 96, bottom: 84, left: 54, right: 54 },
    header: ({ page, total }) =>
      View({
        paddingBottom: 10,
        children: [
          Row({
            children: [
              View({
                children: [
                  Text({ value: "ACME STUDIO", bold: true, fontSize: 15, color: PdfColors.DarkBlue }),
                  Text({ value: "Design that ships.", fontSize: 9, color: PdfColors.Gray })
                ]
              }),
              View({
                children: [
                  Text({ value: "INVOICE", fontFamily: "times", italic: true, fontSize: 24, align: "right", color: PdfColors.DarkBlue }),
                  Text({ value: `#1042 · ${page} / ${total}`, fontSize: 9, align: "right", color: PdfColors.Gray })
                ]
              })
            ]
          }),
          Divider({ color: PdfColors.LightGray, marginTop: 8 })
        ]
      }),
    footer: ({ page, total }) =>
      View({
        paddingTop: 6,
        children: [
          Divider({ color: PdfColors.LightGray }),
          Row({
            children: [
              Text({ value: "hello@acme.studio · acme.studio", fontSize: 8, color: PdfColors.Gray }),
              Text({
                value: `Page ${page} of ${total}`,
                align: "right",
                fontFamily: "times",
                italic: true,
                fontSize: 8,
                color: PdfColors.Gray
              })
            ]
          })
        ]
      }),
    children: PdfPage({
      children: [
        Row({
          gap: 18,
          children: [
            View({
              children: [
                Text({ preset: "eyebrow", children: "BILLED TO" }),
                Text({ value: "Ada Lovelace", bold: true, fontSize: 13 }),
                Text({ value: "Analytical Engines Ltd.", fontSize: 9, color: PdfColors.Gray }),
                Text({ value: "ada@example.com", fontSize: 9, color: PdfColors.Gray })
              ]
            }),
            View({
              children: [
                Text({ preset: "eyebrow", children: "DETAILS" }),
                Text({ value: "Issued 16 Nov 2026", fontSize: 9 }),
                Text({ value: "Due 1 Dec 2026", fontSize: 9 }),
                Text({ value: "USD", fontSize: 9, color: PdfColors.Gray })
              ]
            })
          ]
        }),
        Spacer({ height: 18 }),
        Table({
          columns: [
            { key: "item", header: "Item", width: 230 },
            { key: "qty", header: "Qty", width: 60, align: "center" },
            { key: "unit", header: "Unit", width: 90, align: "right" },
            { key: "total", header: "Total", width: 100, align: "right" }
          ],
          rows: [
            ["Design system", 1, "2,400.00", "2,400.00"],
            ["Implementation", 2, "1,200.00", "2,400.00"],
            ["Documentation", 1, "840.00", "840.00"]
          ],
          header: true,
          zebra: true,
          cellPadding: 8,
          fontSize: 9,
          headerBackground: PdfColors.DarkBlue,
          headerColor: PdfColors.White,
          zebraColor: PdfColors.SoftGray
        }),
        Spacer({ height: 12 }),
        View({
          paddingTop: 10,
          children: [
            Row({ children: [Text({ value: "Subtotal", fontSize: 9 }), Text({ value: "$5,640.00", fontSize: 9, align: "right" })] }),
            Row({ children: [Text({ value: "Tax (8%)", fontSize: 9 }), Text({ value: "$451.20", fontSize: 9, align: "right" })] }),
            Divider({ color: PdfColors.LightGray, marginTop: 6, marginBottom: 6 }),
            Row({
              children: [
                Text({ value: "TOTAL DUE", bold: true, fontSize: 10 }),
                Text({ value: "$6,091.20", bold: true, fontSize: 14, align: "right", color: PdfColors.DarkBlue })
              ]
            })
          ]
        }),
        Spacer({ height: 18 }),
        Text({ value: "Payment details", bold: true, fontSize: 9 }),
        Text({ value: "Bank transfer · IBAN GB29 NWBK 6016 1331 9268 19", fontSize: 8, color: PdfColors.Gray })
      ]
    })
  });
}

function letterDoc(preset) {
  return Pdf({
    title: "A letter from SolveJS",
    author: "SolveJS",
    page: "a4",
    margin: { top: 72, bottom: 72, left: 64, right: 64 },
    ...(preset === "none" ? {} : { pageNumbers: { preset } }),
    children: PdfPage({
      children: [
        Text({ preset: "eyebrow", children: "A LETTER FROM SOLVEJS" }),
        Text({ preset: "title", children: "Make the last mile feel designed." }),
        Subtitle({ children: "Typography, spacing and page furniture are part of the product." }),
        Paragraph({
          children:
            "The screen gets a design system, a component library and a review. Then the user exports a PDF that looks like it came from a different company. That gap is what this package closes."
        }),
        Paragraph({
          children:
            "Use display and title presets for the top of the page, body for the argument, caption for provenance and signature for the human moment at the end. Override any token when the brand asks for it."
        }),
        Divider({ marginTop: 18, marginBottom: 18 }),
        Text({ preset: "signature", children: "Ada Lovelace" }),
        Text({ value: "Co-founder, SolveJS", preset: "caption" })
      ]
    })
  });
}

const DOCS = {
  report: { title: "Editorial report", description: "Display type, a native header, a zebra table, bookmarks and page-number presets.", build: reportDoc, pages: true },
  invoice: { title: "Invoice with custom furniture", description: "A branded header, a custom footer with contact details and its own page numbers.", build: invoiceDoc, pages: false },
  letter: { title: "Editorial letter", description: "Title, subtitle, body and signature with the built-in page-number footer.", build: letterDoc, pages: true }
};

function snippet(kind, preset) {
  if (kind === "invoice") {
    return `Pdf({
  header: ({ page, total }) => View({ children: [
    Row({ children: [
      Text({ value: "ACME STUDIO", bold: true }),
      Text({ value: \`#1042 · \${page} / \${total}\`, align: "right" })
    ]}),
    Divider()
  ]}),
  footer: ({ page, total }) => View({ children: [
    Divider(),
    Text({ value: \`Page \${page} of \${total}\`, align: "right" })
  ]}),
  children: PdfPage({ children: [
    Table({ columns, rows, header: true, zebra: true })
  ]})
})`;
  }
  return `Pdf({
  header: ({ page, total }) => View({ children: [
    Text({ value: "SOLVEJS / FIELD NOTES", preset: "eyebrow" }),
    Divider()
  ]}),${preset === "none" ? "" : `\n  pageNumbers: { preset: "${preset}" },`}
  children: [
    PdfPage({ children: [
      Text({ preset: "display", children: "Documents that feel like product." }),
      Subtitle({ children: "Editorial typography" }),
      Table({ columns, rows, header: true, zebra: true })
    ]}),
    PdfPage({ children: Heading({ level: 2, children: "Appendix" }) })
  ]
})`;
}

export function renderPdfDemo(container) {
  const state = { doc: "report", preset: "classic" };
  let bytes = new Uint8Array();
  let url = "";

  const toolbar = el("div", "demo-toolbar");
  const pills = el("div", "demo-pills");
  const controls = el("div", "demo-controls");
  const presetLabel = el("label", "demo-control");
  presetLabel.append(el("span", undefined, "Page numbers"));
  const presetSelect = el("select");
  for (const [value, label] of [["minimal", "Minimal"], ["classic", "Classic"], ["editorial", "Editorial"], ["none", "None"]]) {
    const option = el("option", undefined, label);
    option.value = value;
    presetSelect.append(option);
  }
  presetSelect.value = state.preset;
  presetSelect.name = "pdf-page-numbers";
  presetSelect.id = "pdf-page-numbers";
  presetSelect.autocomplete = "off";
  presetLabel.append(presetSelect);
  const download = el("button", "live-button", "Download PDF");
  download.type = "button";
  controls.append(presetLabel, download);
  toolbar.append(pills, controls);

  const split = el("div", "demo-split");
  const canvas = el("div", "demo-canvas");
  const frame = el("iframe", "doc-frame");
  frame.title = "PDF preview";
  canvas.append(frame);
  const side = el("div", "demo-side");
  const title = el("h3", undefined, "");
  const description = el("p", "live-caption", "");
  const features = el("ul", "demo-feature-list");
  const code = el("pre", "demo-code");
  side.append(title, description, features, el("p", "demo-label", "API"), code);
  split.append(canvas, side);
  container.append(toolbar, split);

  for (const [id, doc] of Object.entries(DOCS)) {
    const button = el("button", "demo-pill", doc.title);
    button.type = "button";
    button.dataset.doc = id;
    button.addEventListener("click", () => {
      state.doc = id;
      update();
    });
    pills.append(button);
  }

  function featureList(doc) {
    const items =
      doc === "invoice"
        ? ["Custom header per page", "Footer with contact details", "Table with zebra rows", "Page numbers inside the footer"]
        : doc === "letter"
          ? ["Display and title presets", "Subtitle + paragraph rhythm", "Signature preset", "Built-in page-number footer"]
          : ["Native PDF header", "Display / title / body presets", "Bookmarks for each section", "Page-number presets"];
    features.replaceChildren(...items.map((item) => el("li", undefined, item)));
  }

  function update() {
    const doc = DOCS[state.doc];
    const documentModel = doc.build(state.preset);
    bytes = renderPdf(documentModel);
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    frame.src = url;
    title.textContent = doc.title;
    description.textContent = doc.description;
    featureList(state.doc);
    code.textContent = snippet(state.doc, state.preset);
    presetSelect.disabled = !doc.pages;
    presetSelect.parentElement.classList.toggle("is-disabled", !doc.pages);
    for (const pill of pills.children) pill.classList.toggle("is-active", pill.dataset.doc === state.doc);
  }

  presetSelect.addEventListener("change", () => {
    state.preset = presetSelect.value;
    update();
  });
  download.addEventListener("click", () => {
    const anchor = el("a");
    anchor.href = url;
    anchor.download = `solvejs-${state.doc}.pdf`;
    anchor.click();
  });
  update();

  return () => {
    if (url) URL.revokeObjectURL(url);
  };
}

function fieldLabel(field) {
  const label = el("span", "form-field-label");
  label.append(el("strong", undefined, field.name));
  const meta = [field.type, field.page ? `page ${field.page}` : "", field.required ? "required" : ""].filter(Boolean).join(" · ");
  label.append(el("em", undefined, meta));
  return label;
}

function fieldControl(field) {
  let control;
  if (field.type === "checkbox") {
    const wrap = el("label", "form-check");
    control = el("input");
    control.type = "checkbox";
    control.checked = field.value === true;
    wrap.append(control, el("span", undefined, "Checked"));
    control.dataset.field = field.name;
    control.dataset.kind = "checkbox";
    control.name = field.name;
    control.id = `acro-${field.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
    return wrap;
  }
  if (field.type === "radio" || field.type === "choice") {
    control = el("select");
    const multi = Array.isArray(field.value);
    if (multi) control.multiple = true;
    const options = field.options.length > 0 ? field.options : Array.isArray(field.value) ? field.value : [field.value].filter(Boolean);
    for (const option of options) {
      const item = el("option", undefined, String(option));
      item.value = String(option);
      if (Array.isArray(field.value) ? field.value.includes(option) : field.value === option) item.selected = true;
      control.append(item);
    }
    control.dataset.field = field.name;
    control.dataset.kind = multi ? "multi" : "value";
    control.name = field.name;
    control.id = `acro-${field.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
    control.autocomplete = "off";
    return control;
  }
  if (field.type === "text" && field.multiline) {
    control = el("textarea");
    control.rows = 3;
    control.value = typeof field.value === "string" ? field.value : "";
  } else if (field.type === "signature" || field.type === "button") {
    control = el("input");
    control.disabled = true;
    control.placeholder = field.type === "signature" ? "Signature field" : "Push button";
  } else {
    control = el("input");
    control.type = "text";
    control.value = typeof field.value === "string" ? field.value : field.value == null ? "" : String(field.value);
  }
  control.dataset.field = field.name;
  control.dataset.kind = "value";
  control.name = field.name;
  control.id = `acro-${field.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  control.autocomplete = "off";
  return control;
}

function collectValues(root) {
  const values = {};
  for (const control of root.querySelectorAll("[data-field]")) {
    const name = control.dataset.field;
    if (control.disabled) continue;
    if (control.dataset.kind === "checkbox") values[name] = control.checked;
    else if (control.dataset.kind === "multi") values[name] = [...control.selectedOptions].map((option) => option.value);
    else values[name] = control.value;
  }
  return values;
}

export function renderFormLab(elements) {
  const { status, fields, meta, viewer, upload, sample, json, filled } = elements;
  let bytes = new Uint8Array();
  let info = null;
  let url = "";

  function setStatus(text, tone = "") {
    status.textContent = text;
    status.dataset.tone = tone;
  }

  function renderFields() {
    fields.replaceChildren();
    if (!info || info.fields.length === 0) {
      fields.append(el("p", "form-empty", info?.hasXfa ? "This is an XFA form. Its field data may live inside an XML payload, which is reported but not rendered here." : "No AcroForm fields were found in this PDF."));
      return;
    }
    for (const field of info.fields) {
      const row = el("div", "form-field");
      row.append(fieldLabel(field), fieldControl(field));
      fields.append(row);
    }
  }

  function renderMeta() {
    if (!info) {
      meta.textContent = "Loading…";
      return;
    }
    meta.textContent = JSON.stringify(
      {
        hasAcroForm: info.hasAcroForm,
        hasXfa: info.hasXfa,
        encrypted: info.encrypted,
        fields: info.fields.map((field) => ({
          name: field.name,
          type: field.type,
          value: field.value,
          options: field.options,
          page: field.page,
          rect: field.rect
        }))
      },
      null,
      2
    );
  }

  function updateViewer() {
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    viewer.src = url;
  }

  async function load(data, sourceName) {
    bytes = data;
    setStatus("Reading fields…");
    updateViewer();
    try {
      info = await readPdfForm(bytes);
      if (info.encrypted) setStatus("Encrypted PDF · fields unavailable", "warn");
      else if (info.hasXfa && info.fields.length === 0) setStatus("XFA form · no AcroForm fields", "warn");
      else if (info.fields.length === 0) setStatus("No AcroForm fields", "warn");
      else setStatus(`${info.fields.length} fields · ${sourceName}`, "ok");
      renderFields();
      renderMeta();
      const usable = !info.encrypted && info.fields.length > 0;
      filled.disabled = !usable;
      json.disabled = info.encrypted;
    } catch (error) {
      info = null;
      setStatus(error instanceof Error ? error.message : "Could not read the PDF", "warn");
      fields.replaceChildren(el("p", "form-empty", "The PDF could not be parsed."));
      meta.textContent = error instanceof Error ? error.message : String(error);
      filled.disabled = true;
      json.disabled = true;
    }
  }

  async function loadSample() {
    const response = await fetch("./sample-form.pdf");
    if (!response.ok) throw new Error("Could not load the sample form.");
    await load(new Uint8Array(await response.arrayBuffer()), "sample-form.pdf");
  }

  upload.addEventListener("change", async () => {
    const file = upload.files?.[0];
    if (!file) return;
    await load(new Uint8Array(await file.arrayBuffer()), file.name);
    upload.value = "";
  });
  sample.addEventListener("click", () => {
    loadSample().catch((error) => setStatus(error.message, "warn"));
  });
  json.addEventListener("click", () => {
    if (!info) return;
    const payload = JSON.stringify({ source: "AcroForm", fields: info.fields, values: collectValues(fields) }, null, 2);
    const link = el("a");
    link.href = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    link.download = "acroform-values.json";
    link.click();
    URL.revokeObjectURL(link.href);
  });
  filled.addEventListener("click", async () => {
    if (!info || info.encrypted) return;
    setStatus("Writing values…");
    try {
      const output = await fillPdfForm(bytes, collectValues(fields));
      const link = el("a");
      link.href = URL.createObjectURL(new Blob([output], { type: "application/pdf" }));
      link.download = "acroform-filled.pdf";
      link.click();
      URL.revokeObjectURL(link.href);
      setStatus("Filled PDF ready", "ok");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not fill the PDF", "warn");
    }
  });

  loadSample().catch((error) => setStatus(error.message, "warn"));
  return () => {
    if (url) URL.revokeObjectURL(url);
  };
}

