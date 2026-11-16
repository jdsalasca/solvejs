/* eslint-disable max-lines-per-function -- the demo keeps its PDF layout readable in one place */
import {
  Bookmark,
  Divider,
  Link,
  Pdf,
  PdfColors,
  PdfPage,
  Row,
  Spacer,
  Table,
  Text,
  View
} from "@jdsalasc/solvejs-pdf";
import { Colors as XlsxColors, writeXlsx } from "@jdsalasc/solvejs-xlsx";
import { definePdfViewer } from "@jdsalasc/solvejs-pdf/viewer";

const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const state = {
  number: "1042",
  customer: "Ada Lovelace",
  company: "Analytical Engines Ltd.",
  tax: 8,
  items: [
    { description: "Brand identity system", qty: 1, unit: 2400 },
    { description: "Landing page design", qty: 2, unit: 900 },
    { description: "Implementation", qty: 12, unit: 120 }
  ]
};

const fields = {
  number: document.querySelector("#invoice-number"),
  customer: document.querySelector("#customer"),
  company: document.querySelector("#company"),
  tax: document.querySelector("#tax")
};
const itemsHost = document.querySelector("#items");
const status = document.querySelector("#status");
const viewer = document.createElement("solvejs-pdf-viewer");
viewer.setAttribute("filename", "solvejs-invoice.pdf");
viewer.setAttribute("height", "620");
viewer.setAttribute("theme", "light");
document.querySelector("#viewer").append(viewer);
definePdfViewer();

function input(value, type = "text") {
  const element = document.createElement("input");
  element.type = type;
  element.value = String(value);
  return element;
}

function renderItems() {
  itemsHost.replaceChildren();
  state.items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "item-row";
    const description = input(item.description);
    const qty = input(item.qty, "number");
    const unit = input(item.unit, "number");
    const remove = document.createElement("button");
    remove.className = "remove";
    remove.type = "button";
    remove.title = "Remove item";
    remove.textContent = "×";
    description.addEventListener("input", () => {
      item.description = description.value;
      refresh();
    });
    qty.addEventListener("input", () => {
      item.qty = Number(qty.value) || 0;
      refresh();
    });
    unit.addEventListener("input", () => {
      item.unit = Number(unit.value) || 0;
      refresh();
    });
    remove.addEventListener("click", () => {
      state.items.splice(index, 1);
      renderItems();
      refresh();
    });
    row.append(description, qty, unit, remove);
    itemsHost.append(row);
  });
}

function totals() {
  const subtotal = state.items.reduce((sum, item) => sum + item.qty * item.unit, 0);
  const tax = (subtotal * state.tax) / 100;
  return { subtotal, tax, total: subtotal + tax };
}

function pdfDocument() {
  const { subtotal, tax, total } = totals();
  return Pdf({
    title: `Invoice ${state.number} — ${state.company}`,
    author: state.company,
    footer: ({ page, total: pages }) =>
      Row({
        children: [
          Text({ value: `${state.company} · hello@acme.studio`, fontSize: 8, color: PdfColors.Gray }),
          Text({ value: `Page ${page} of ${pages}`, fontSize: 8, color: PdfColors.Gray, align: "right" })
        ]
      }),
    children: PdfPage({
      children: [
        Bookmark({ title: "Invoice", level: 1 }),
        View({
          background: PdfColors.DarkBlue,
          padding: 26,
          radius: 14,
          children: Row({
            children: [
              View({
                children: [
                  Text({ value: "ACME STUDIO", color: PdfColors.White, bold: true, fontSize: 16 }),
                  Text({ value: "Design that ships.", color: PdfColors.LightBlue, fontSize: 10 })
                ]
              }),
              View({
                width: 190,
                children: [
                  Text({ value: "INVOICE", color: PdfColors.White, bold: true, fontSize: 26, align: "right" }),
                  Text({ value: `#${state.number} · 16 Nov 2026`, color: PdfColors.LightBlue, fontSize: 9, align: "right" })
                ]
              })
            ]
          })
        }),
        Spacer({ height: 20 }),
        Row({
          gap: 20,
          children: [
            View({
              width: "52%",
              children: [
                Text({ value: "BILLED TO", fontSize: 8, bold: true, color: PdfColors.Gray }),
                Text({ value: state.customer, fontSize: 14, bold: true, marginTop: 4 }),
                Text({ value: state.company, fontSize: 10, color: PdfColors.Gray })
              ]
            }),
            View({
              width: "42%",
              background: PdfColors.SoftGray,
              padding: 14,
              radius: 10,
              children: [
                Text({ value: "TOTAL DUE", fontSize: 8, bold: true, color: PdfColors.Gray }),
                Text({ value: `$${money.format(total)}`, fontSize: 22, bold: true, color: PdfColors.DarkBlue }),
                Text({ value: "Due within 15 days", fontSize: 9, color: PdfColors.Gray })
              ]
            })
          ]
        }),
        Spacer({ height: 22 }),
        Bookmark({ title: "Line items", level: 2 }),
        Table({
          columns: [
            { key: "description", header: "Description", width: 260 },
            { key: "qty", header: "Qty", width: 46, align: "center" },
            { key: "unit", header: "Unit", width: 82, align: "right" },
            { key: "amount", header: "Amount", width: 92, align: "right" }
          ],
          rows: state.items.map((item) => ({
            description: item.description,
            qty: item.qty,
            unit: money.format(item.unit),
            amount: money.format(item.qty * item.unit)
          })),
          headerBackground: PdfColors.Slate,
          headerColor: PdfColors.White,
          borderColor: PdfColors.LightGray,
          cellPadding: 8
        }),
        Spacer({ height: 14 }),
        Row({
          children: [
            View({ width: "62%" }),
            View({
              width: "36%",
              padding: 12,
              background: PdfColors.LightBlue,
              radius: 10,
              children: [
                Row({ children: [Text({ value: "Subtotal", fontSize: 10 }), Text({ value: `$${money.format(subtotal)}`, fontSize: 10, align: "right" })] }),
                Row({ children: [Text({ value: `Tax (${state.tax}%)`, fontSize: 10 }), Text({ value: `$${money.format(tax)}`, fontSize: 10, align: "right" })] }),
                Spacer({ height: 5 }),
                Divider({ color: PdfColors.Blue, width: 0.6 }),
                Row({ children: [Text({ value: "Total", bold: true, fontSize: 12 }), Text({ value: `$${money.format(total)}`, bold: true, fontSize: 12, align: "right", color: PdfColors.DarkBlue })] })
              ]
            })
          ]
        }),
        Spacer({ height: 22 }),
        Bookmark({ title: "Payment details", level: 2 }),
        View({
          background: PdfColors.SoftGray,
          padding: 14,
          radius: 10,
          children: [
            Text({ value: "Payment details", bold: true, fontSize: 10 }),
            Text({ value: "Bank transfer · IBAN GB29 NWBK 6016 1331 9268 19", fontSize: 9, color: PdfColors.Gray, marginTop: 4 }),
            Link({ href: "https://example.com/pay", children: Text({ value: "Pay online", color: PdfColors.Blue, bold: true, fontSize: 9, marginTop: 6 }) })
          ]
        })
      ]
    })
  });
}

function workbookBytes() {
  const { subtotal, tax, total } = totals();
  const firstItemRow = 7;
  const lastItemRow = firstItemRow + state.items.length - 1;
  const subtotalRow = lastItemRow + 2;
  const taxRow = subtotalRow + 1;
  const totalRow = taxRow + 1;
  const items = state.items.map((item, index) => {
    const row = firstItemRow + index;
    return [item.description, item.qty, item.unit, { value: item.qty * item.unit, formula: `B${row}*C${row}` }];
  });
  const rows = [
    ["Invoice", state.number],
    ["Customer", state.customer],
    ["Company", state.company],
    ["Date", "2026-11-16"],
    [],
    ["Description", "Qty", "Unit", "Amount"],
    ...items,
    [],
    ["", "", "Subtotal", { value: subtotal, formula: state.items.length > 0 ? `SUM(D${firstItemRow}:D${lastItemRow})` : "0" }],
    ["", "", `Tax ${state.tax}%`, { value: tax, formula: `D${subtotalRow}*${state.tax}/100` }],
    ["", "", "Total", { value: total, formula: `D${subtotalRow}+D${taxRow}` }],
    ["Pay online", "", "", { value: "Open", href: "https://example.com/pay" }]
  ];
  return writeXlsx({
    title: `Invoice ${state.number}`,
    creator: state.company,
    definedNames: {
      InvoiceNumber: "Invoice!$B$1",
      InvoiceTotal: `Invoice!$D$${totalRow}`
    },
    sheets: [
      {
        name: "Invoice",
        freeze: { rows: 6 },
        autoFilter: `A6:D${lastItemRow}`,
        tabColor: XlsxColors.DarkBlue,
        pageSetup: { orientation: "portrait", paperSize: 9, fitToWidth: 1, fitToHeight: 1 },
        dataValidations: [
          {
            range: `B7:B${Math.max(lastItemRow, 7)}`,
            type: "whole",
            operator: "between",
            formula1: "1",
            formula2: "999",
            showErrorMessage: true,
            errorTitle: "Quantity",
            error: "Enter a whole number between 1 and 999."
          }
        ],
        columns: [
          { width: 34 },
          { width: 8, style: { align: "center" } },
          { width: 14, style: { numberFormat: "#,##0.00" } },
          { width: 14, style: { numberFormat: "#,##0.00" } }
        ],
        rows
      }
    ]
  });
}

function refresh() {
  try {
    viewer.document = pdfDocument();
    status.textContent = "PDF and XLSX ready";
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : String(error);
  }
}

fields.number.addEventListener("input", () => {
  state.number = fields.number.value;
  refresh();
});
fields.customer.addEventListener("input", () => {
  state.customer = fields.customer.value;
  refresh();
});
fields.company.addEventListener("input", () => {
  state.company = fields.company.value;
  refresh();
});
fields.tax.addEventListener("input", () => {
  state.tax = Number(fields.tax.value) || 0;
  refresh();
});
document.querySelector("#add-item").addEventListener("click", () => {
  state.items.push({ description: "New service", qty: 1, unit: 100 });
  renderItems();
  refresh();
});
document.querySelector("#download-xlsx").addEventListener("click", () => {
  const blob = new Blob([workbookBytes()], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `invoice-${state.number}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
  status.textContent = "XLSX downloaded";
});

renderItems();
refresh();

