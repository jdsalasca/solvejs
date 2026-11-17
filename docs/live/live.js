/* eslint-disable max-lines-per-function -- interactive documentation */
import { addDays, formatDate, parseDateStrict } from "@jdsalasc/solvejs-date";
import { fromDecimal, formatMoney, percentageOf } from "@jdsalasc/solvejs-money";
import { buildUrl, parseQuery } from "@jdsalasc/solvejs-url";
import { stableStringify } from "@jdsalasc/solvejs-json";
import {
  validateCellphoneNumber,
  validateEmail,
  validateUsername,
  validateUuidV4
} from "@jdsalasc/solvejs-validators";
import { Colors, writeXlsx } from "@jdsalasc/solvejs-xlsx";
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
  View,
  renderPdf
} from "@jdsalasc/solvejs-pdf";
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

const $ = (selector) => document.querySelector(selector);
const fields = {
  number: $("#live-number"),
  customer: $("#live-customer"),
  company: $("#live-company"),
  tax: $("#live-tax")
};
const itemsHost = $("#live-items");
const status = $("#live-status");
const viewer = document.createElement("solvejs-pdf-viewer");
viewer.setAttribute("filename", "solvejs-live-invoice.pdf");
viewer.setAttribute("height", "560");
viewer.setAttribute("theme", "light");
$("#live-viewer").append(viewer);
definePdfViewer();

function totals() {
  const subtotal = state.items.reduce((sum, item) => sum + item.qty * item.unit, 0);
  const tax = (subtotal * state.tax) / 100;
  return { subtotal, tax, total: subtotal + tax };
}

function input(value, type = "text", name = "item") {
  const element = document.createElement("input");
  element.type = type;
  element.name = name;
  element.autocomplete = "off";
  element.value = String(value);
  return element;
}

function renderItems() {
  itemsHost.replaceChildren();
  state.items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "live-item";
    const description = input(item.description, "text", `item-${index}-description`);
    const qty = input(item.qty, "number", `item-${index}-qty`);
    const unit = input(item.unit, "number", `item-${index}-unit`);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "live-remove";
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

function pdfDocument() {
  const { subtotal, tax, total } = totals();
  return Pdf({
    title: `Invoice ${state.number}`,
    author: state.company,
    footer: ({ page, total: pages }) =>
      Row({
        children: [
          Text({ value: `${state.company} · hello@acme.studio`, fontSize: 8, color: PdfColors.Gray }),
          Text({ value: `Page ${page} of ${pages}`, fontSize: 8, color: PdfColors.Gray, align: "right", fontFamily: "times", italic: true })
        ]
      }),
    children: PdfPage({
      children: [
        Bookmark({ title: "Invoice", level: 1 }),
        View({
          background: PdfColors.DarkBlue,
          padding: 22,
          radius: 12,
          children: Row({
            children: [
              View({
                children: [
                  Text({ value: "ACME STUDIO", color: PdfColors.White, bold: true, fontSize: 15 }),
                  Text({ value: "Design that ships.", color: PdfColors.LightBlue, fontSize: 9 })
                ]
              }),
              View({
                width: 180,
                children: [
                  Text({ value: "INVOICE", color: PdfColors.White, bold: true, fontSize: 24, align: "right", fontFamily: "times", italic: true }),
                  Text({ value: `#${state.number}`, color: PdfColors.LightBlue, fontSize: 9, align: "right" })
                ]
              })
            ]
          })
        }),
        Spacer({ height: 16 }),
        Row({
          gap: 18,
          children: [
            View({
              width: "54%",
              children: [
                Text({ value: "BILLED TO", fontSize: 8, bold: true, color: PdfColors.Gray }),
                Text({ value: state.customer, fontSize: 13, bold: true, marginTop: 4 }),
                Text({ value: state.company, fontSize: 9, color: PdfColors.Gray })
              ]
            }),
            View({
              width: "42%",
              background: PdfColors.SoftGray,
              padding: 12,
              radius: 9,
              children: [
                Text({ value: "TOTAL DUE", fontSize: 8, bold: true, color: PdfColors.Gray }),
                Text({ value: `$${money.format(total)}`, fontSize: 20, bold: true, color: PdfColors.DarkBlue })
              ]
            })
          ]
        }),
        Spacer({ height: 18 }),
        Bookmark({ title: "Line items", level: 2 }),
        Table({
          columns: [
            { key: "description", header: "Description", width: 250 },
            { key: "qty", header: "Qty", width: 44, align: "center" },
            { key: "unit", header: "Unit", width: 78, align: "right" },
            { key: "amount", header: "Amount", width: 88, align: "right" }
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
          cellPadding: 7
        }),
        Spacer({ height: 12 }),
        Row({
          children: [
            View({ width: "62%" }),
            View({
              width: "36%",
              padding: 10,
              background: PdfColors.LightBlue,
              radius: 9,
              children: [
                Row({ children: [Text({ value: "Subtotal", fontSize: 9 }), Text({ value: `$${money.format(subtotal)}`, fontSize: 9, align: "right" })] }),
                Row({ children: [Text({ value: `Tax (${state.tax}%)`, fontSize: 9 }), Text({ value: `$${money.format(tax)}`, fontSize: 9, align: "right" })] }),
                Spacer({ height: 4 }),
                Divider({ color: PdfColors.Blue, width: 0.5 }),
                Row({ children: [Text({ value: "Total", bold: true, fontSize: 11 }), Text({ value: `$${money.format(total)}`, bold: true, fontSize: 11, align: "right", color: PdfColors.DarkBlue })] })
              ]
            })
          ]
        }),
        Spacer({ height: 18 }),
        Bookmark({ title: "Payment details", level: 2 }),
        View({
          background: PdfColors.SoftGray,
          padding: 12,
          radius: 9,
          children: [
            Text({ value: "Payment details", bold: true, fontSize: 9 }),
            Text({ value: "Bank transfer · IBAN GB29 NWBK 6016 1331 9268 19", fontSize: 8, color: PdfColors.Gray, marginTop: 4 }),
            Link({ href: "https://example.com/pay", children: Text({ value: "Pay online", color: PdfColors.Blue, bold: true, fontSize: 8, marginTop: 5 }) })
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
    ["Date", new Date().toISOString().slice(0, 10)],
    [],
    ["Description", "Qty", "Unit", "Amount"],
    ...items,
    [],
    ["", "", "Subtotal", { value: subtotal, formula: state.items.length ? `SUM(D${firstItemRow}:D${lastItemRow})` : "0" }],
    ["", "", `Tax ${state.tax}%`, { value: tax, formula: `D${subtotalRow}*${state.tax}/100` }],
    ["", "", "Total", { value: total, formula: `D${subtotalRow}+D${taxRow}` }],
    ["Pay online", "", "", { value: "Open", href: "https://example.com/pay" }]
  ];
  return writeXlsx({
    title: `Invoice ${state.number}`,
    creator: state.company,
    definedNames: { InvoiceNumber: "Invoice!$B$1", InvoiceTotal: `Invoice!$D$${totalRow}` },
    sheets: [
      {
        name: "Invoice",
        freeze: { rows: 6 },
        autoFilter: `A6:D${Math.max(lastItemRow, 6)}`,
        tabColor: Colors.DarkBlue,
        pageSetup: { orientation: "portrait", paperSize: 9, fitToWidth: 1, fitToHeight: 1 },
        dataValidations: [
          {
            range: `B${firstItemRow}:B${Math.max(lastItemRow, firstItemRow)}`,
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
          { width: 8 },
          { width: 14, style: { numberFormat: "#,##0.00" } },
          { width: 14, style: { numberFormat: "#,##0.00" } }
        ],
        rows
      }
    ]
  });
}

function download(bytes, type, name) {
  const blob = new Blob([bytes], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function refresh() {
  try {
    viewer.document = pdfDocument();
    const { total } = totals();
    $("#live-total").textContent = `$${money.format(total)}`;
    $("#live-rows").textContent = String(state.items.length);
    status.textContent = "PDF and XLSX ready";
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : String(error);
  }
}

for (const [key, element] of Object.entries(fields)) {
  element.addEventListener("input", () => {
    state[key] = key === "tax" ? Number(element.value) || 0 : element.value;
    refresh();
  });
}
$("#live-add").addEventListener("click", () => {
  state.items.push({ description: "New service", qty: 1, unit: 100 });
  renderItems();
  refresh();
});
$("#live-download-xlsx").addEventListener("click", () => {
  download(
    workbookBytes(),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    `invoice-${state.number}.xlsx`
  );
  status.textContent = "XLSX downloaded";
});
$("#live-download-pdf").addEventListener("click", () => {
  download(renderPdf(pdfDocument()), "application/pdf", `invoice-${state.number}.pdf`);
  status.textContent = "PDF downloaded";
});

const validatorInput = $("#live-validate-input");
const validatorOutput = $("#live-validate-output");
const validators = {
  email: validateEmail,
  phone: (value) => validateCellphoneNumber(value, { allowInternational: true }),
  uuid: validateUuidV4,
  username: validateUsername
};
document.querySelectorAll("[data-validate]").forEach((button) => {
  button.addEventListener("click", () => {
    const result = validators[button.dataset.validate](validatorInput.value);
    validatorOutput.textContent = JSON.stringify(result, null, 2);
  });
});

function updateDateAndMoney() {
  try {
    const parsed = parseDateStrict($("#live-date").value, "YYYY-MM-DD");
    const days = Number($("#live-days").value) || 0;
    const amount = fromDecimal($("#live-amount").value || "0");
    const adjusted = parsed ? addDays(parsed, days) : null;
    $("#live-date-output").textContent = JSON.stringify(
      {
        input: parsed ? formatDate(parsed, "YYYY-MM-DD") : null,
        plusDays: adjusted ? formatDate(adjusted, "DD/MM/YYYY") : null,
        money: formatMoney(amount),
        tax8: formatMoney(percentageOf(amount, 8))
      },
      null,
      2
    );
  } catch (error) {
    $("#live-date-output").textContent = error instanceof Error ? error.message : String(error);
  }
}
["#live-date", "#live-days", "#live-amount"].forEach((selector) => {
  $(selector).addEventListener("input", updateDateAndMoney);
});

$("#live-run-query").addEventListener("click", () => {
  const query = parseQuery($("#live-query").value);
  $("#live-query-output").textContent = JSON.stringify(
    {
      parsed: query,
      url: buildUrl("https://api.example.com/search", { query })
    },
    null,
    2
  );
});
$("#live-run-json").addEventListener("click", () => {
  $("#live-query-output").textContent = stableStringify(parseQuery($("#live-query").value)) ?? "undefined";
});

renderItems();
refresh();
updateDateAndMoney();
