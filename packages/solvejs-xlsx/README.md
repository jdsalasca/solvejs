# @jdsalasc/solvejs-xlsx

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-xlsx)](https://www.npmjs.com/package/@jdsalasc/solvejs-xlsx)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-xlsx)](https://www.npmjs.com/package/@jdsalasc/solvejs-xlsx)

Zero-dependency modern XLSX reader and writer built from scratch in TypeScript: ZIP, CRC-32, XML, OOXML, shared strings, dates, formulas, hyperlinks, PNG/JPEG images, styles, merged cells, CSV and a declarative component API. No SheetJS, no ExcelJS, no unzip library, no React.

## When to use this package

- Export a report or invoice with real formatting: colors, bold headers, borders, alignment, number formats, column/row styles, widths, heights, frozen headers, filters, formulas, links, images and merged title rows.
- Read uploaded XLSX files without adding a heavy spreadsheet engine to your server, including merged ranges, styles, links, formulas and embedded images.
- Convert CSV/TSV to typed rows and JSON objects and back without date or leading-zero surprises.
- Build workbooks declaratively with `<Xlsx><Sheet><Row><Cell /></Sheet></Xlsx>` and a custom JSX runtime, or with plain factory functions.
- Keep the runtime small: every parser is in the package; DEFLATE uses the platform `CompressionStream`/`DecompressionStream`.

## Install

```bash
npm i @jdsalasc/solvejs-xlsx
```

Node.js **20.12+** is required for the deflate-raw stream support used by compressed XLSX files.

## Data-first API

```ts
import { writeXlsx } from "@jdsalasc/solvejs-xlsx";

const bytes = writeXlsx({
  sheets: [
    {
      name: "Invoices",
      columns: [{ header: "ID", width: 8 }, { header: "Customer", width: 24 }, { header: "Total", width: 12 }],
      rows: [
        [1, "Ada & Co", 1999],
        [2, "Grace Hopper", 2500]
      ]
    }
  ]
});
```

Rich cells combine a cached value with a formula or a hyperlink:

```ts
import { Colors, writeXlsx } from "@jdsalasc/solvejs-xlsx";

const bytes = writeXlsx({
  sheets: [
    {
      name: "Report",
      freeze: { rows: 1 },
      autoFilter: true,
      tabColor: Colors.Blue,
      columns: [
        { header: "Item", width: 28, style: { bold: true } },
        { header: "Total", width: 16, style: { numberFormat: "#,##0.00" } }
      ],
      rows: [
        ["Design", 2400],
        ["Development", 4800],
        [{ value: 7200, formula: "SUM(B2:B3)" }],
        [{ value: "Docs", href: "https://example.com/docs" }]
      ],
      images: [{ data: logoBytes, anchor: "D2", width: 72, height: 72, alt: "Logo" }]
    }
  ]
});
```

`writeXlsx` does not evaluate formulas. It writes the formula and the `value` as Excel's cached result so the file opens with a useful number before Excel recalculates. Formula-looking strings stay inline text and are never treated as formulas.

### CSV and TSV

```ts
import { jsonToRows, readCsv, sheetToJson, writeCsv } from "@jdsalasc/solvejs-xlsx";

const rows = readCsv("name,amount\nAda,0010\nGrace,20\n");
// [["name","amount"],["Ada","0010"],["Grace","20"]]

const objects = sheetToJson(rows);
// [{ name: "Ada", amount: "0010" }, { name: "Grace", amount: "20" }]

const csv = writeCsv(jsonToRows(objects), { protectFormulas: true });
```

CSV parsing preserves leading zeros, blank lines and quoted newlines; it does not guess dates or turn integer-looking strings into exponential numbers. `writeCsv` prefixes formula-looking strings with an apostrophe by default to prevent CSV formula injection; set `protectFormulas: false` when you control the output.

### Formulas, links and images

- Formula: `{ value, formula }`, or `<Cell value={3} formula="SUM(A1:A2)" />`.
- Hyperlink: `{ value, href }`, or `<Cell value="Docs" href="https://..." />`.
- Image: `{ data, anchor: "B2", width, height, alt }` on a sheet, or `<Sheet images={[...]}>`.
- Supported images: PNG and JPEG, embedded as DrawingML media with one-cell anchors.

## Declarative components (JSX)

Configure TypeScript once:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@jdsalasc/solvejs-xlsx"
  }
}
```

`react-jsxdev` also works: TypeScript resolves the development runtime from `@jdsalasc/solvejs-xlsx/jsx-dev-runtime`. Both modes export the same component types, including fragments.

If the project already uses React, keep the global `jsxImportSource` and opt this package in per file:

```tsx
/** @jsxImportSource @jdsalasc/solvejs-xlsx */
```

Then write the workbook as components. No React dependency is involved:

```tsx
import { Cell, Colors, Column, Row, Sheet, Xlsx, renderXlsx } from "@jdsalasc/solvejs-xlsx";

const bytes = renderXlsx(
  <Xlsx name="Invoices" creator="SolveJS">
    <Sheet name="Invoices" freeze={{ rows: 1 }} autoFilter tabColor={Colors.DarkBlue}>
      <Column width={12} />
      <Column width={30} />
      <Column width={16} />
      <Column width={16} />

      <Row height={30}>
        <Cell value="Invoice #1042" bold fontSize={18} fontColor={Colors.White} fill={Colors.DarkBlue} colSpan={4} />
      </Row>

      <Row>
        <Cell value="Customer" bold fill={Colors.LightBlue} border="thin" />
        <Cell value="Ada Lovelace" border="thin" />
        <Cell value="Date" bold fill={Colors.LightBlue} border="thin" />
        <Cell value={new Date("2026-11-16")} border="thin" align="right" />
      </Row>

      <Row>
        <Cell value="Total" bold align="right" />
        <Cell value={720000} bold align="right" numberFormat="#,##0.00" fill={Colors.Yellow} border="double" />
      </Row>
    </Sheet>
  </Xlsx>
);
```

### Components

| Component | Props |
|---|---|
| `Xlsx` | `name` (workbook title), `creator`, children `Sheet` elements |
| `Sheet` | `name`, `columns` (`number[]` or `{ width, style }[]`), `freeze` (`{ rows, columns }`), `autoFilter` (`true` or an `A1:D20` ref), `tabColor`, `images` |
| `Column` | `width` in Excel character units and optional `style` |
| `Row` | `row` (explicit worksheet row), `height` in points, and `style` |
| `Cell` | `value` or `content`, `formula`, `href`, `row`, `column` (alias `column_number`), `colSpan`, `rowSpan`, plus every style prop below |

Fragments are expanded recursively, so `<>...</>` works around sheets, rows or cells. Cells and merged ranges cannot overlap, and two rows cannot target the same worksheet row; both fail with `XLSX_INVALID_INPUT` instead of silently overwriting data.

A `Cell` can also receive a primitive child: `<Cell>{42}</Cell>`.

Cells placed directly in a `Sheet` need a `row`; `column` is optional:

```tsx
<Sheet name="Grid">
  <Cell row={1} column={1} value="A" />
  <Cell row={1} column={3} value="C" />
  <Cell row={2} column={2} value="B" />
</Sheet>
```

### Styling

| Prop | Type |
|---|---|
| `bold`, `italic`, `strike` | `boolean` |
| `underline` | `boolean`, `"single"`, `"double"` |
| `fontName`, `fontSize` | `string`, `number` (1-409) |
| `fontColor` | `Colors.*` or `#RRGGBB` / `AARRGGBB` |
| `fill` | background color, same forms |
| `align` | `"left"`, `"center"`, `"right"`, `"justify"` |
| `verticalAlign` | `"top"`, `"middle"`, `"bottom"` |
| `wrapText` | `boolean` |
| `numberFormat` | Excel format string, e.g. `"#,##0.00"`, `"yyyy-mm-dd"`, `"0%"` |
| `border` | `"thin"`, `"medium"`, `"thick"`, `"dashed"`, `"dotted"`, `"double"`, or `{ style, color }` |
| `borderTop`, `borderRight`, `borderBottom`, `borderLeft` | per-side override |
| `colSpan`, `rowSpan` | merged-cell spans |

`Colors` includes `Black`, `White`, `Red`, `DarkRed`, `Orange`, `Yellow`, `Green`, `DarkGreen`, `Blue`, `DarkBlue`, `LightBlue`, `Purple`, `Gray`, `LightGray`, `DarkGray`, `Teal`, `Pink` and `Brown`. Any `#RRGGBB` or `#AARRGGBB` is accepted and normalized to ARGB.

### Without JSX

The same components are factory functions:

```ts
import { Cell, Row, Sheet, Xlsx, createElement, renderXlsx } from "@jdsalasc/solvejs-xlsx";

const element = createElement(
  Xlsx,
  { name: "Report" },
  createElement(
    Sheet,
    { name: "Sheet1" },
    createElement(Row, {}, createElement(Cell, { value: "ok" }), createElement(Cell, { value: 42 }))
  )
);
const bytes = renderXlsx(element);
```

## Read

```ts
import { readXlsx } from "@jdsalasc/solvejs-xlsx";

const workbook = await readXlsx(bytes);
// { sheets: [{ name: "Invoices", rows: [["ID", "Customer"], [1, "Ada"]] }] }

const detailed = await readXlsx(bytes, {
  sheets: ["Invoices"],
  includeStyles: true,
  includeFormulas: true
});
```

Each sheet keeps `rows` as primitive values and adds optional metadata when present:

| Field | Contents |
|---|---|
| `merges` | Merged ranges such as `"A1:C1"` |
| `columns` | Widths and column styles |
| `rowHeights` | Custom row heights keyed by row number |
| `freeze` | Frozen rows and columns |
| `autoFilter` | Auto-filter reference |
| `links` | `A1` to external URL |
| `formulas` | `A1` to formula text (without `=`) |
| `styles` | `A1` to font, fill, border, alignment and number format |
| `images` | Anchor, size, format and bytes for PNG/JPEG media |

Dates are returned as UTC `Date` objects. The reader supports shared strings, inline strings, numbers, booleans, formula results, error cells, the 1900 and 1904 date systems, custom number formats, hyperlinks, images and workbook parts resolved through their OOXML relationships. Use `sheets` to parse only the worksheets you need from a large file.

## Formatting

```ts
import { formatCellValue, formatExcelDate, formatExcelNumber } from "@jdsalasc/solvejs-xlsx";

formatExcelNumber(1234.5, "#,##0.00"); // "1,234.50"
formatExcelNumber(-1234.5, "#,##0.00;(#,##0.00)"); // "(1,234.50)"
formatExcelDate(new Date("2026-11-16T00:00:00Z"), "yyyy-mm-dd"); // "2026-11-16"
formatCellValue(0.256, "0.0%"); // "25.6%"
```

The formatter covers common number, currency, percentage, scientific, date and time patterns. It does not implement every Excel format token or locale-specific separators.

## API

| Export | What it does |
|---|---|
| `writeXlsx(input)` | Data-first writer with stored ZIP entries. |
| `writeXlsxCompressed(input)` | Data-first writer with DEFLATE-compressed entries. |
| `writeWorkbook(model)` / `writeWorkbookCompressed(model)` | Writer for the internal `WorkbookModel`, useful for custom builders. |
| `renderXlsx(element)` | Renders the declarative component tree with stored entries. |
| `renderXlsxCompressed(element)` | Renders the declarative component tree with DEFLATE. |
| `readXlsx(bytes, options?)` | Reads an XLSX file; `options.sheets`, `includeStyles`, `includeFormulas`. |
| `readCsv(text, options?)` / `writeCsv(rows, options?)` | Zero-dependency CSV/TSV parser and writer. |
| `sheetToJson(rows, options?)` / `jsonToRows(objects, options?)` | Header-aware object mapping with a null prototype. |
| `formatCellValue`, `formatExcelNumber`, `formatExcelDate` | Common Excel number and date formatting. |
| `isCellObject(value)` | Detects `{ value, formula, href }` cells. |
| `Colors`, `XlsxCellStyle`, `XlsxBorder`, ... | Styling types and palette. |
| `XlsxError` | Stable codes: `XLSX_INVALID_INPUT`, `XLSX_INVALID_ZIP`, `XLSX_INVALID_XML`, `XLSX_UNSUPPORTED`, `XLSX_LIMIT_EXCEEDED`. |
| `XLSX_LIMITS` | Entries, bytes, rows, columns, cells and sheets limits. |

## What is supported

- Multiple sheets, column widths/styles, row heights/styles, frozen panes, auto-filter, tab color.
- Strings (UTF-8), numbers, booleans and dates.
- Bold, italic, underline, strike, font name/size/color, solid fills, borders per side, horizontal/vertical alignment and wrap.
- Number formats, including custom formats.
- Merged cells on write (`colSpan`/`rowSpan`), validated against overlaps and worksheet bounds; merged ranges read back.
- Styled blank cells, column default styles and row default styles.
- Formulas with cached values, including shared formulas with relative references; hyperlinks with worksheet relationships.
- PNG and JPEG images embedded through DrawingML and read back with anchor, size and bytes, including two-cell anchor markers.
- CSV/TSV import/export and JSON row mapping with leading-zero and formula-injection safety.
- Shared strings and inline strings on read; formulas, links, styles, widths, heights, freeze and row styles metadata.
- DEFLATE-compressed ZIP entries through the standard streams.
- Workbook title and creator in `docProps/core.xml`.
- XML 1.0 escaping, control-character sanitization and a null-prototype XML attribute map.
- Deterministic output: no timestamps in ZIP headers.

## What is not supported

- Formula evaluation. The writer stores formula text and a cached result; the package never calculates expressions.
- Charts, pivot tables, comments, data validation, conditional formatting, macros or VBA.
- External workbook links, shapes, 3D images or SVG/WebP/GIF images. Images are limited to PNG and JPEG.
- XLS, XLSB, ODS and DBF containers. This package is XLSX-first.
- Encrypted workbooks.
- ZIP64 archives (more than 65535 entries or 4 GiB).
- Reading arbitrary untrusted files without your own size limits. The package enforces limits, but a spreadsheet parser is still an input boundary.

## Security notes

- ZIP entries are checked for path traversal, duplicate names, CRC, sizes and local/central header consistency.
- Workbook-wide cell and row budgets, per-entry/total byte budgets and image pixel/encoded-size limits bound untrusted reads.
- Decompression is streamed and cancelled when it exceeds the per-entry or total budget; declared sizes are pre-checked.
- ZIP64 is rejected explicitly rather than truncated.
- The XML parser rejects DTDs, unknown entities, duplicate attributes, multiple roots and over-deep nesting. XML attributes use a null prototype, so a malicious `__proto__` name cannot pollute `Object.prototype`.
- The reader resolves workbook, styles, shared strings and worksheets through OOXML relationships and rejects external targets except worksheet hyperlinks. Imported hyperlinks must use the hyperlink relationship type and a safe `http(s)`, `mailto` or `tel` scheme; `javascript:`/`data:` targets are dropped.
- Strings are written as inline strings (`t="inlineStr"`), so a value such as `=SUM(A1:A2)` is data, not a formula.
- Hyperlinks must be `http(s)`, `mailto`, `tel` or internal `#` targets; `javascript:` and `data:` are rejected.
- CSV export prefixes formula-looking strings with an apostrophe by default, including cell objects and values with leading whitespace; `sheetToJson` creates null-prototype records.
- The writer never emits macros or external links.

## Dates

The writer uses the 1900 date system. The reader honors `workbookPr@date1904`. In the 1900 system, serial 1 is 1900-01-01, serial 59 is 1900-02-28, serial 60 is Excel's fictional 1900-02-29 (mapped to 1900-02-28 because JavaScript cannot represent it), and serial 61 is 1900-03-01. Use `formatExcelDate`/`formatCellValue` for display, or keep the UTC `Date` and format it with your UI library.

## Performance

Measured with `npm run benchmark --workspace packages/solvejs-xlsx` on Node 24 / Windows, 10,000 rows × 8 columns (numbers, strings, dates and booleans):

| Operation | Time | Output |
|---|---:|---:|
| `writeXlsx` (stored) | ~88 ms | 3.43 MB |
| `writeXlsxCompressed` | ~140 ms | 415 KB |
| `readXlsx` (compressed) | ~243 ms | 10,000 rows |

Times are machine-dependent; the script is included so you can measure your own hardware. Compression reduces the archive by roughly 8× on repetitive tabular data.

## Compatibility

The package is tested with the Node built-in test runner and against **LibreOffice**:

```bash
npm run build --workspace packages/solvejs-xlsx
npm run check:libreoffice --workspace packages/solvejs-xlsx
```

The compatibility check converts a generated workbook to CSV and reads a LibreOffice-generated XLSX (deflated ZIP) back. A styled invoice can also be converted to PDF/PNG for visual review.

## Limitations

- Formulas are stored and read but never evaluated; the cached `value` is what readers see.
- Images are limited to PNG and JPEG; the writer uses one-cell anchors and the reader also accepts two-cell anchors. There are no charts, shapes or floating drawings.
- The reader returns row arrays; use `sheetToJson` for header-based objects.
- Column widths are character units, not pixels.
- The stored writer is larger than a compressed workbook; use the compressed variants for large exports.
- The `Xlsx.name` prop is workbook metadata, not a browser download filename.
- XLS/XLSB/ODS/DBF, charts, pivot tables, comments, data validation, conditional formatting, encryption and macros are out of scope.

## License

MIT
