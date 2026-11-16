# @jdsalasc/solvejs-xlsx

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-xlsx)](https://www.npmjs.com/package/@jdsalasc/solvejs-xlsx)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-xlsx)](https://www.npmjs.com/package/@jdsalasc/solvejs-xlsx)

Zero-dependency XLSX reader and writer built from scratch in TypeScript: ZIP, CRC-32, XML, OOXML, shared strings, dates and basic styles. No SheetJS, no ExcelJS, no unzip library.

## When to use this package

- Export a table, report, or invoice to a file users can open in Excel, LibreOffice, or Google Sheets.
- Read uploaded XLSX files without adding a heavy spreadsheet engine to your server.
- Generate deterministic fixtures in tests without a native Office installation.
- Keep the bundle small: the runtime has no dependencies; DEFLATE uses the platform `CompressionStream`/`DecompressionStream`.

## Install

```bash
npm i @jdsalasc/solvejs-xlsx
```

## Quick start: write

```ts
import { writeXlsx, writeXlsxCompressed } from "@jdsalasc/solvejs-xlsx";

const bytes = writeXlsx({
  sheets: [
    {
      name: "Invoices",
      columns: [
        { header: "ID", width: 8 },
        { header: "Customer", width: 24 },
        { header: "Total", width: 12 },
        { header: "Date", width: 12 }
      ],
      rows: [
        [1, "Ada & Co", 1999, new Date("2026-11-16")],
        [2, "Grace Hopper", 2500, new Date("2026-11-17")]
      ]
    }
  ]
});

// bytes is a Uint8Array. In the browser:
const url = URL.createObjectURL(
  new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  })
);

// Smaller file, async, requires CompressionStream:
const compressed = await writeXlsxCompressed({ sheets: [{ name: "Rows", rows: [[1, "a"]] }] });
```

## Quick start: read

```ts
import { readXlsx } from "@jdsalasc/solvejs-xlsx";

const workbook = await readXlsx(bytes);
// {
//   sheets: [
//     {
//       name: "Invoices",
//       rows: [
//         ["ID", "Customer", "Total", "Date"],
//         [1, "Ada & Co", 1999, Date 2026-11-16T00:00:00.000Z]
//       ]
//     }
//   ]
// }
```

Dates are returned as UTC `Date` objects. Strings, numbers, booleans, shared strings, inline strings, formula results and error cells are supported.

## API

| Export | What it does |
|---|---|
| `writeXlsx(input)` | Writes a workbook with stored (uncompressed) ZIP entries. Fast and synchronous. |
| `writeXlsxCompressed(input)` | Writes a workbook with DEFLATE-compressed entries. Smaller, asynchronous, uses `CompressionStream`. |
| `readXlsx(bytes)` | Reads an XLSX file into `{ sheets: [{ name, rows }] }`. Asynchronous because compressed entries need `DecompressionStream`. |
| `XlsxError` | Error with a stable `code`: `XLSX_INVALID_INPUT`, `XLSX_INVALID_ZIP`, `XLSX_INVALID_XML`, `XLSX_UNSUPPORTED`, `XLSX_LIMIT_EXCEEDED`. |
| `XLSX_LIMITS` | Documented read limits: entries, bytes, rows, columns, sheets. |

## What is supported

- Multiple sheets.
- Column widths and an optional bold header row (with a frozen first row).
- Strings (UTF-8), numbers, booleans and dates.
- Dates in the 1900 date system, written with built-in number format `14`.
- Reading shared strings (`xl/sharedStrings.xml`) and inline strings.
- Reading DEFLATE-compressed ZIP entries through the standard `DecompressionStream`.
- Formula results and error cells as strings. The writer does not emit formulas.
- XML 1.0 escaping and control-character sanitisation.
- Deterministic output: no timestamps in the ZIP headers.

## What is not supported

- Writing formulas, charts, images, merged cells, comments, conditional formatting, or macros.
- Reading charts, images, merged cells, styles beyond date detection, or the 1904 date system.
- Encrypted workbooks.
- ZIP64 archives (more than 65535 entries or 4 GiB).
- Reading arbitrary untrusted files without your own size limits. The package enforces limits, but a spreadsheet parser is still an input boundary.

## Security notes

- No DTDs: the XML parser rejects `<!DOCTYPE` and never expands external entities.
- ZIP entries are checked for path traversal on write, and for CRC/size on read.
- Read limits cap entries, bytes, rows, columns and sheets.
- Strings are written as inline strings (`t="inlineStr"`), so a value such as `=SUM(A1:A2)` is data, not a formula. This is the default protection against CSV/XLSX formula injection.
- The writer never emits macros or external links.

## Compatibility

The package is tested with the Node built-in test runner and against **LibreOffice**: a generated workbook is converted to CSV, and a LibreOffice-generated XLSX (deflated ZIP) is read back. The compatibility script lives at `scripts/check-libreoffice.mjs`.

## Limitations

- The writer uses the 1900 date system; dates before 1900-03-01 are outside the intended range.
- The reader detects dates through built-in date formats `14-22` and `45-47`, plus custom formats containing date/time tokens. A custom format that only uses `m` for something else may be misdetected.
- Column widths are character units, not pixels.
- The stored writer is larger than a compressed workbook; use `writeXlsxCompressed` for exports of thousands of rows.

## License

MIT
