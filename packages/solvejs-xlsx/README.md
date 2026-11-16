# @jdsalasc/solvejs-xlsx

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-xlsx)](https://www.npmjs.com/package/@jdsalasc/solvejs-xlsx)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-xlsx)](https://www.npmjs.com/package/@jdsalasc/solvejs-xlsx)

Zero-dependency XLSX reader and writer built from scratch in TypeScript: ZIP, CRC-32, XML, OOXML, shared strings, dates, styles, merged cells and a declarative component API. No SheetJS, no ExcelJS, no unzip library, no React.

## When to use this package

- Export a table, report, or invoice with real formatting: colors, bold headers, borders, alignment, number formats, column widths, row heights, frozen headers and merged title rows.
- Read uploaded XLSX files without adding a heavy spreadsheet engine to your server.
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
| `Sheet` | `name`, `columns` (`number[]` or `{ width }[]`), `freeze` (`{ rows, columns }`), `autoFilter` (`true` or an `A1:D20` ref), `tabColor` |
| `Column` | `width` in Excel character units; fractional values are allowed |
| `Row` | `row` (explicit worksheet row) and `height` in points; fractional values are allowed |
| `Cell` | `value` or `content`, `row`, `column` (alias `column_number`), `colSpan`, `rowSpan`, plus every style prop below |

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
```

Dates are returned as UTC `Date` objects. The reader supports shared strings, inline strings, numbers, booleans, formula results, error cells, the 1900 and 1904 date systems, and workbook parts resolved through their OOXML relationships.

## API

| Export | What it does |
|---|---|
| `writeXlsx(input)` | Data-first writer with stored ZIP entries. |
| `writeXlsxCompressed(input)` | Data-first writer with DEFLATE-compressed entries. |
| `writeWorkbook(model)` / `writeWorkbookCompressed(model)` | Writer for the internal `WorkbookModel`, useful for custom builders. |
| `renderXlsx(element)` | Renders the declarative component tree with stored entries. |
| `renderXlsxCompressed(element)` | Renders the declarative component tree with DEFLATE. |
| `readXlsx(bytes)` | Reads an XLSX file into `{ sheets: [{ name, rows }] }`. |
| `Colors`, `XlsxCellStyle`, `XlsxBorder`, ... | Styling types and palette. |
| `XlsxError` | Stable codes: `XLSX_INVALID_INPUT`, `XLSX_INVALID_ZIP`, `XLSX_INVALID_XML`, `XLSX_UNSUPPORTED`, `XLSX_LIMIT_EXCEEDED`. |
| `XLSX_LIMITS` | Entries, bytes, rows, columns, cells and sheets limits. |

## What is supported

- Multiple sheets, column widths, row heights, frozen panes, auto-filter, tab color.
- Strings (UTF-8), numbers, booleans and dates.
- Bold, italic, underline, strike, font name/size/color, solid fills, borders per side, horizontal/vertical alignment and wrap.
- Number formats, including custom formats.
- Merged cells on write (`colSpan`/`rowSpan`), validated against overlaps and worksheet bounds. Styled blank cells keep their fill, border and alignment.
- Shared strings and inline strings on read.
- DEFLATE-compressed ZIP entries through the standard streams.
- Workbook title and creator in `docProps/core.xml`.
- XML 1.0 escaping and control-character sanitization.
- Deterministic output: no timestamps in ZIP headers.

## What is not supported

- Writing formulas, charts, images, comments, conditional formatting, pivot tables, or macros.
- Reading charts, images, merged-cell ranges, rich styles beyond date detection, or the 1904 system's output metadata (dates themselves are converted).
- Encrypted workbooks.
- ZIP64 archives (more than 65535 entries or 4 GiB).
- Reading arbitrary untrusted files without your own size limits. The package enforces limits, but a spreadsheet parser is still an input boundary.

## Security notes

- ZIP entries are checked for path traversal, duplicate names, CRC, sizes and local/central header consistency.
- Decompression is streamed and cancelled when it exceeds the per-entry or total budget; declared sizes are pre-checked.
- ZIP64 is rejected explicitly rather than truncated.
- The XML parser rejects DTDs, unknown entities, duplicate attributes, multiple roots and over-deep nesting.
- The reader resolves workbook, styles, shared strings and worksheets through OOXML relationships and rejects external targets; it requires `[Content_Types].xml`.
- Strings are written as inline strings (`t="inlineStr"`), so a value such as `=SUM(A1:A2)` is data, not a formula.
- The writer never emits macros or external links.

## Dates

The writer uses the 1900 date system. The reader honors `workbookPr@date1904`. In the 1900 system, serial 1 is 1900-01-01, serial 59 is 1900-02-28, serial 60 is Excel's fictional 1900-02-29 (mapped to 1900-02-28 because JavaScript cannot represent it), and serial 61 is 1900-03-01.

## Performance

Measured with `npm run benchmark --workspace packages/solvejs-xlsx` on Node 24 / Windows, 10,000 rows × 8 columns (numbers, strings, dates and booleans):

| Operation | Time | Output |
|---|---:|---:|
| `writeXlsx` (stored) | ~78 ms | 3.43 MB |
| `writeXlsxCompressed` | ~125 ms | 415 KB |
| `readXlsx` (compressed) | ~181 ms | 10,000 rows |

Times are machine-dependent; the script is included so you can measure your own hardware. Compression reduces the archive by roughly 8× on repetitive tabular data.

## Compatibility

The package is tested with the Node built-in test runner and against **LibreOffice**:

```bash
npm run build --workspace packages/solvejs-xlsx
npm run check:libreoffice --workspace packages/solvejs-xlsx
```

The compatibility check converts a generated workbook to CSV and reads a LibreOffice-generated XLSX (deflated ZIP) back. A styled invoice can also be converted to PDF/PNG for visual review.

## Limitations

- The writer does not emit formulas; formula results are read as strings.
- The reader does not expose merged-cell ranges or rich style metadata.
- Column widths are character units, not pixels.
- The stored writer is larger than a compressed workbook; use the compressed variants for large exports.
- The `Xlsx.name` prop is workbook metadata, not a browser download filename.

## License

MIT
