/* eslint-disable complexity, max-depth, max-lines-per-function -- gallery builders are declarative demos */
import { Colors, formatCellValue, jsonToSheet, readXlsx, writeXlsx } from "@jdsalasc/solvejs-xlsx";

const money = '"$"#,##0';
const percent = "0.00%";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const head = (value) => ({ value, style: { bold: true, fill: Colors.DarkBlue, fontColor: Colors.White, align: "center", border: "thin" } });
const title = (value, span) => ({ value, colSpan: span, style: { bold: true, fontSize: 16, fill: Colors.DarkBlue, fontColor: Colors.White, align: "center" } });
const moneyCell = (value) => ({ value, style: { numberFormat: money, align: "right" } });

function revenueWorkbook() {
  return writeXlsx({
    title: "FY26 revenue report",
    creator: "SolveJS",
    sheets: [
      {
        name: "Revenue",
        columns: [{ width: 24 }, { width: 14 }, { width: 14 }, { width: 16 }],
        freeze: { rows: 2, columns: 1 },
        autoFilter: "A2:D5",
        tabColor: Colors.Blue,
        pageSetup: { orientation: "landscape", fitToWidth: 1 },
        emptyCells: "zero",
        dataValidations: [
          { range: "A3:A5", type: "list", values: ["North", "South", "West"], promptTitle: "Region", prompt: "Pick a region." },
          { range: "B3:C5", type: "decimal", operator: "greaterThanOrEqual", formula1: "0", errorTitle: "Revenue", error: "Revenue cannot be negative." }
        ],
        rows: [
          [{ value: "FY26 revenue by region", colSpan: 4, style: { bold: true, fontSize: 16, fill: Colors.DarkBlue, fontColor: Colors.White, align: "center" } }],
          [head("Region"), head("Q1"), head("Q2"), head("Total")],
          {
            cells: [
              { value: "North", style: { bold: true, border: "thin" } },
              moneyCell(120000),
              moneyCell(138000),
              { value: 258000, formula: "SUM(B3:C3)", style: { numberFormat: money, align: "right", bold: true } }
            ],
            style: { fill: Colors.LightBlue },
            height: 22
          },
          {
            cells: [
              { value: "South", style: { border: "thin" } },
              moneyCell(98000),
              moneyCell(112000),
              { value: 210000, formula: "SUM(B4:C4)", style: { numberFormat: money, align: "right" } }
            ],
            height: 22
          },
          {
            cells: [
              { value: "West", style: { border: "thin" } },
              moneyCell(76000),
              moneyCell(undefined),
              { value: 76000, formula: "SUM(B5:C5)", style: { numberFormat: money, align: "right", italic: true } }
            ],
            height: 22
          },
          {
            cells: [
              { value: "Total", style: { bold: true, fill: Colors.LightGray, border: "thin" } },
              { value: 294000, formula: "SUM(B3:B5)", style: { bold: true, fill: Colors.LightGray, numberFormat: money, align: "right" } },
              { value: 250000, formula: "SUM(C3:C5)", style: { bold: true, fill: Colors.LightGray, numberFormat: money, align: "right" } },
              { value: 544000, formula: "SUM(D3:D5)", style: { bold: true, fill: Colors.LightGray, numberFormat: money, align: "right" } }
            ],
            height: 24
          }
        ]
      }
    ]
  });
}

function inventoryWorkbook() {
  return writeXlsx({
    title: "Inventory snapshot",
    creator: "SolveJS",
    definedNames: { StockLevel: "Inventory!$C$3:$C$6" },
    sheets: [
      {
        name: "Inventory",
        columns: [{ width: 14 }, { width: 26 }, { width: 12 }, { width: 12 }, { width: 16 }],
        freeze: { rows: 2, columns: 1 },
        autoFilter: "A2:E6",
        tabColor: Colors.Teal,
        pageSetup: { orientation: "landscape", fitToWidth: 1 },
        dataValidations: [{ range: "E3:E6", type: "list", values: ["OK", "Low", "Reorder"] }],
        rows: [
          [title("Inventory snapshot · 16 Nov 2026", 5)],
          [head("SKU"), head("Item"), head("Stock"), head("Reorder at"), head("Status")],
          {
            cells: [
              { value: "SKU-104", style: { bold: true, border: "thin" } },
              { value: "Standing desk", style: { border: "thin" } },
              { value: 12, style: { numberFormat: "#,##0", align: "right", border: "thin" } },
              { value: 8, style: { numberFormat: "#,##0", align: "right", border: "thin" } },
              { value: "OK", style: { bold: true, fontColor: Colors.DarkGreen, border: "thin" } }
            ],
            height: 22
          },
          {
            cells: [
              { value: "SKU-221", style: { bold: true, border: "thin" } },
              { value: "Monitor arm", style: { border: "thin" } },
              { value: 4, style: { numberFormat: "#,##0", align: "right", border: "thin" } },
              { value: 8, style: { numberFormat: "#,##0", align: "right", border: "thin" } },
              { value: "Low", style: { bold: true, fontColor: Colors.DarkRed, border: "thin" } }
            ],
            style: { fill: "#FEE2E2" },
            height: 22
          },
          {
            cells: [
              { value: "SKU-330", style: { bold: true, border: "thin" } },
              { value: "USB-C dock", style: { border: "thin" } },
              { value: 0, style: { numberFormat: "#,##0", align: "right", border: "thin" } },
              { value: 6, style: { numberFormat: "#,##0", align: "right", border: "thin" } },
              { value: "Reorder", style: { bold: true, fontColor: Colors.DarkRed, border: "thin" } }
            ],
            style: { fill: "#FEE2E2" },
            height: 22
          },
          {
            cells: [
              { value: "SKU-412", style: { bold: true, border: "thin" } },
              { value: "Laptop sleeve", style: { border: "thin" } },
              { value: 31, style: { numberFormat: "#,##0", align: "right", border: "thin" } },
              { value: 10, style: { numberFormat: "#,##0", align: "right", border: "thin" } },
              { value: "OK", style: { bold: true, fontColor: Colors.DarkGreen, border: "thin" } }
            ],
            height: 22
          },
          [{ value: "StockLevel is a defined name pointing at C3:C6. Print setup is landscape and fit to one page wide.", colSpan: 5, style: { italic: true, fontColor: Colors.Gray, fontSize: 9 } }]
        ]
      }
    ]
  });
}

function budgetWorkbook() {
  return writeXlsx({
    title: "FY27 budget",
    creator: "SolveJS",
    definedNames: { TaxRate: "Assumptions!$B$2", Q1Total: "Budget!$B$7", Q2Total: "Budget!$C$7" },
    sheets: [
      {
        name: "Budget",
        columns: [{ width: 24 }, { width: 16 }, { width: 16 }, { width: 16 }],
        freeze: { rows: 2, columns: 1 },
        autoFilter: "A2:D6",
        tabColor: Colors.Purple,
        pageSetup: { orientation: "landscape", fitToWidth: 1 },
        dataValidations: [{ range: "A3:A6", type: "list", values: ["Product", "Engineering", "Marketing", "Operations"] }],
        rows: [
          [title("FY27 budget", 4)],
          [head("Category"), head("Q1"), head("Q2"), head("Total")],
          {
            cells: [
              { value: "Product", style: { bold: true, border: "thin" } },
              moneyCell(48000),
              moneyCell(52000),
              { value: 100000, formula: "SUM(B3:C3)", style: { numberFormat: money, align: "right", bold: true } }
            ],
            height: 22
          },
          {
            cells: [
              { value: "Engineering", style: { border: "thin" } },
              moneyCell(96000),
              moneyCell(104000),
              { value: 200000, formula: "SUM(B4:C4)", style: { numberFormat: money, align: "right" } }
            ],
            height: 22
          },
          {
            cells: [
              { value: "Marketing", style: { border: "thin" } },
              moneyCell(32000),
              moneyCell(28000),
              { value: 60000, formula: "SUM(B5:C5)", style: { numberFormat: money, align: "right" } }
            ],
            height: 22
          },
          {
            cells: [
              { value: "Operations", style: { border: "thin" } },
              moneyCell(24000),
              moneyCell(24000),
              { value: 48000, formula: "SUM(B6:C6)", style: { numberFormat: money, align: "right" } }
            ],
            height: 22
          },
          {
            cells: [
              { value: "Total", style: { bold: true, fill: Colors.LightGray } },
              { value: 200000, formula: "SUM(B3:B6)", style: { bold: true, fill: Colors.LightGray, numberFormat: money, align: "right" } },
              { value: 208000, formula: "SUM(C3:C6)", style: { bold: true, fill: Colors.LightGray, numberFormat: money, align: "right" } },
              { value: 408000, formula: "SUM(D3:D6)", style: { bold: true, fill: Colors.LightGray, numberFormat: money, align: "right" } }
            ],
            height: 24
          },
          [{ value: "TaxRate lives on Assumptions!B2 and is available as a defined name for formulas.", colSpan: 4, style: { italic: true, fontColor: Colors.Gray, fontSize: 9 } }]
        ]
      },
      {
        name: "Assumptions",
        columns: [{ width: 24 }, { width: 18 }],
        emptyCells: "blank",
        rows: [
          [{ value: "Assumptions", colSpan: 2, style: { bold: true, fontSize: 16, fill: Colors.DarkBlue, fontColor: Colors.White, align: "center" } }],
          [{ value: "Tax rate", style: { bold: true } }, { value: 0.19, style: { numberFormat: percent, align: "right" } }],
          [{ value: "Currency", style: { bold: true } }, { value: "USD" }],
          [{ value: "The empty cell below stays blank because this sheet uses emptyCells: blank.", colSpan: 2, style: { italic: true, fontColor: Colors.Gray, fontSize: 9 } }],
          [{ value: null }, { value: null }]
        ]
      }
    ]
  });
}

function jsonWorkbook() {
  const { rows, columnDefinitions } = jsonToSheet(
    [
      { name: "Ada", region: "North", q1: 1200, q2: 1380, active: true },
      { name: "Grace", region: "South", q1: 980, q2: 1120, active: true },
      { name: "Linus", region: "North", q1: 760, q2: 940, active: false },
      { name: "Margaret", region: "West", q1: 1520, q2: 1680, active: true }
    ],
    {
      columns: [
        { key: "name", header: "Name", width: 22 },
        { key: "region", header: "Region", width: 14 },
        { key: "q1", header: "Q1", width: 12 },
        { key: "q2", header: "Q2", width: 12 },
        { key: "active", header: "Active", width: 10 }
      ]
    }
  );
  return writeXlsx({
    title: "JSON import",
    creator: "SolveJS",
    subject: "People and revenue",
    keywords: "json,xlsx",
    description: "Generated from an array of objects",
    category: "Demo",
    company: "Acme",
    sheets: [
      {
        name: "People",
        columns: columnDefinitions,
        rows,
        freeze: { rows: 1 },
        autoFilter: true,
        filterColumns: [{ column: 1, values: ["North", "South"] }],
        conditionalFormatting: [
          { range: "C2:D5", type: "colorScale", colors: [Colors.Red, Colors.Yellow, Colors.Green] },
          { range: "D2:D5", type: "dataBar", color: Colors.Blue },
          { range: "C2:C5", type: "cellIs", operator: "greaterThan", formula: "1000", style: { bold: true, fill: "#DCFCE7", fontColor: "#166534" } }
        ],
        pageSetup: { orientation: "landscape", fitToWidth: 1 }
      }
    ]
  });
}

const WORKBOOKS = {
  revenue: { title: "Revenue report", description: "Merged title, colored header, row styles, formulas with cached values, validation and an empty cell rendered as zero.", build: revenueWorkbook },
  inventory: { title: "Inventory", description: "Borders, row fills, number formats, a defined name, freeze panes, print setup and conditional-looking low-stock rows.", build: inventoryWorkbook },
  budget: { title: "Budget · 2 sheets", description: "Two sheets, defined names, currency and percent formats, and a blank-cell sheet next to a zero-filled one.", build: budgetWorkbook },
  json: {
    title: "JSON import",
    description: "jsonToSheet turns an array of objects into columns and cells, then conditional formatting, filters, frozen headers and metadata finish the workbook.",
    build: jsonWorkbook,
    badges: ["JSON → sheet", "3 conditional rules", "filter: North/South", "metadata"],
    code: `const { rows, columnDefinitions } = jsonToSheet(objects, { columns });
writeXlsx({
  title: "JSON import",
  sheets: [{ name: "People", columns: columnDefinitions, rows,
    autoFilter: true, filterColumns: [{ column: 1, values: ["North", "South"] }],
    conditionalFormatting: [
      { range: "C2:D5", type: "colorScale", colors: [Colors.Red, Colors.Yellow, Colors.Green] },
      { range: "D2:D5", type: "dataBar", color: Colors.Blue }
    ] }]
})`
  }
};

function splitRef(ref) {
  const match = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!match) return undefined;
  const col = [...match[1]].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
  return { row: Number(match[2]) - 1, col };
}

function parseRange(range) {
  const [start, end] = range.split(":");
  const first = splitRef(start);
  const last = splitRef(end ?? start);
  if (!first || !last) return undefined;
  return { r1: first.row, c1: first.col, r2: last.row, c2: last.col };
}

function cssColor(value) {
  if (!value) return undefined;
  const hex = value.replace(/^#/, "");
  if (hex.length === 8) return `#${hex.slice(2)}`;
  if (hex.length === 6) return `#${hex}`;
  return value;
}

function cellRef(row, col) {
  let name = "";
  let value = col + 1;
  while (value > 0) {
    const rest = (value - 1) % 26;
    name = String.fromCharCode(65 + rest) + name;
    value = Math.floor((value - 1) / 26);
  }
  return `${name}${row + 1}`;
}

function styleOf(sheet, row, col) {
  return sheet.styles?.[cellRef(row, col)] ?? sheet.rowStyles?.[String(row + 1)] ?? sheet.columns?.[col]?.style ?? {};
}

function applyStyle(cell, style) {
  if (!style) return;
  if (style.fill) cell.style.background = cssColor(style.fill);
  if (style.fontColor) cell.style.color = cssColor(style.fontColor);
  if (style.bold) cell.style.fontWeight = "700";
  if (style.italic) cell.style.fontStyle = "italic";
  if (style.underline || style.strike) {
    cell.style.textDecoration = [style.underline ? "underline" : "", style.strike ? "line-through" : ""].filter(Boolean).join(" ");
  }
  if (style.align) cell.style.textAlign = style.align;
  if (style.verticalAlign) cell.style.verticalAlign = style.verticalAlign === "middle" ? "middle" : style.verticalAlign;
  if (style.fontSize) cell.style.fontSize = `${Math.max(10, Math.min(18, style.fontSize))}px`;
  if (style.border || style.borderTop || style.borderRight || style.borderBottom || style.borderLeft) cell.style.border = "1px solid #d7dfeb";
}

function sheetPreview(sheet) {
  const merges = (sheet.merges ?? []).map((range) => ({ range, box: parseRange(range) })).filter((entry) => entry.box);
  const covered = new Set();
  const origins = new Map();
  for (const merge of merges) {
    origins.set(`${merge.box.r1},${merge.box.c1}`, merge.box);
    for (let row = merge.box.r1; row <= merge.box.r2; row += 1) {
      for (let col = merge.box.c1; col <= merge.box.c2; col += 1) {
        if (row !== merge.box.r1 || col !== merge.box.c1) covered.add(`${row},${col}`);
      }
    }
  }
  const columns = Math.max(
    ...sheet.rows.map((row) => row.length),
    ...merges.map((merge) => merge.box.c2 + 1),
    sheet.columns?.length ?? 0,
    1
  );
  const table = el("table", "sheet-table");
  const colgroup = el("colgroup");
  for (let col = 0; col < columns; col += 1) {
    const element = el("col");
    const width = sheet.columns?.[col]?.width;
    if (width) element.style.width = `${Math.max(74, width * 8 + 12)}px`;
    colgroup.append(element);
  }
  table.append(colgroup);
  const body = el("tbody");
  sheet.rows.forEach((row, rowIndex) => {
    const tr = el("tr");
    if (sheet.rowHeights?.[String(rowIndex + 1)]) tr.style.height = `${sheet.rowHeights[String(rowIndex + 1)]}px`;
    for (let col = 0; col < columns; col += 1) {
      if (covered.has(`${rowIndex},${col}`)) continue;
      const merged = origins.get(`${rowIndex},${col}`);
      const td = el("td");
      if (merged) {
        td.rowSpan = merged.r2 - merged.r1 + 1;
        td.colSpan = merged.c2 - merged.c1 + 1;
      }
      const reference = cellRef(rowIndex, col);
      const style = styleOf(sheet, rowIndex, col);
      const value = row?.[col];
      const formula = sheet.formulas?.[reference];
      const text = formatCellValue(value, style.numberFormat ?? style.numberFormatCode);
      applyStyle(td, style);
      if (sheet.links?.[reference] && text) {
        const link = el("a", undefined, text);
        link.href = sheet.links[reference];
        link.target = "_blank";
        link.rel = "noreferrer";
        td.append(link);
      } else {
        td.textContent = text;
      }
      if (formula) {
        td.title = `=${formula}`;
        td.classList.add("has-formula");
      }
      tr.append(td);
    }
    body.append(tr);
  });
  table.append(body);
  return table;
}

function badges(sheet, extra = []) {
  const items = [...extra];
  if (sheet.merges?.length) items.push(`${sheet.merges.length} merges`);
  if (sheet.merges?.length) items.push(`${sheet.merges.length} merges`);
  if (sheet.formulas && Object.keys(sheet.formulas).length) items.push(`${Object.keys(sheet.formulas).length} formulas`);
  if (sheet.dataValidations?.length) items.push(`${sheet.dataValidations.length} validations`);
  if (sheet.freeze) items.push("frozen panes");
  if (sheet.autoFilter) items.push("autoFilter");
  if (sheet.pageSetup) items.push("print setup");
  if (sheet.rowHeights && Object.keys(sheet.rowHeights).length) items.push("custom heights");
  return items;
}

export function renderXlsxDemo(container) {
  const state = { workbook: "revenue", sheet: 0 };
  let bytes = new Uint8Array();
  let parsed = null;

  const toolbar = el("div", "demo-toolbar");
  const pills = el("div", "demo-pills");
  const download = el("button", "live-button", "Download XLSX");
  download.type = "button";
  toolbar.append(pills, download);

  const preview = el("div", "sheet-preview");
  const tabs = el("div", "sheet-tabs");
  const badgesRow = el("div", "sheet-badges");
  const scroll = el("div", "sheet-scroll");
  preview.append(tabs, badgesRow, scroll);

  const details = el("div", "xlsx-details");
  const copy = el("div", "xlsx-copy");
  const title = el("h3", undefined, "");
  const description = el("p", "live-caption", "");
  const formulaNote = el("p", "live-caption", "Hover a cell with a small ƒ to see its formula. Values are the cached results written by the package.");
  copy.append(title, description, formulaNote);
  const code = el("pre", "demo-code");
  details.append(copy, code);
  container.append(toolbar, preview, details);

  for (const [id, workbook] of Object.entries(WORKBOOKS)) {
    const button = el("button", "demo-pill", workbook.title);
    button.type = "button";
    button.dataset.workbook = id;
    button.addEventListener("click", () => {
      state.workbook = id;
      state.sheet = 0;
      update();
    });
    pills.append(button);
  }

  function renderSheetTabs() {
    tabs.replaceChildren();
    parsed.sheets.forEach((sheet, index) => {
      const button = el("button", "sheet-tab", sheet.name);
      button.type = "button";
      button.classList.toggle("is-active", index === state.sheet);
      button.addEventListener("click", () => {
        state.sheet = index;
        renderSheetTabs();
        renderSheet();
      });
      tabs.append(button);
    });
  }

  function renderSheet() {
    const sheet = parsed.sheets[state.sheet];
    scroll.replaceChildren(sheetPreview(sheet));
    badgesRow.replaceChildren(...badges(sheet, WORKBOOKS[state.workbook].badges).map((badge) => el("span", "sheet-badge", badge)));
  }

  async function update() {
    const workbook = WORKBOOKS[state.workbook];
    bytes = workbook.build();
    try {
      parsed = await readXlsx(bytes, { includeStyles: true, includeFormulas: true });
    } catch (error) {
      preview.replaceChildren(el("p", "form-empty", error instanceof Error ? error.message : "Could not read the workbook."));
      return;
    }
    title.textContent = workbook.title;
    description.textContent = workbook.description;
    code.textContent = workbook.code ?? `writeXlsx({
  sheets: [{ name: "${parsed.sheets[0].name}", rows, columns,
    freeze: { rows: 2, columns: 1 }, autoFilter: true,
    dataValidations, pageSetup: { orientation: "landscape" } }]
})`;
    for (const pill of pills.children) pill.classList.toggle("is-active", pill.dataset.workbook === state.workbook);
    renderSheetTabs();
    renderSheet();
  }

  download.addEventListener("click", () => {
    const link = el("a");
    link.href = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    link.download = `solvejs-${state.workbook}.xlsx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });

  update();
  return () => {};
}
