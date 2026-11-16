# @jdsalasc/solvejs-pdf

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-pdf)](https://www.npmjs.com/package/@jdsalasc/solvejs-pdf)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-pdf)](https://www.npmjs.com/package/@jdsalasc/solvejs-pdf)

Zero-dependency PDF generation and preview, built from scratch in TypeScript. Write a document as components, render it in the browser or on the server, and show it with a ready-made viewer that has an iframe, open/download actions and a completely replaceable UI.

No PDF library, no React dependency, no CSS framework.

## When to use this package

- Generate invoices, reports, certificates, receipts and summaries with real layout: headings, paragraphs, rows, tables, page breaks, repeated headers and footers.
- Preview the generated PDF in the browser with a polished viewer, without writing toolbar or blob-URL plumbing.
- Keep the runtime small: every byte of the PDF is produced by this package; compression uses the platform `CompressionStream`.
- Use the same document from vanilla JS, React + Vite, or a Next.js client component.

## Install

```bash
npm i @jdsalasc/solvejs-pdf
```

## Quick start

```tsx
import {
  Pdf,
  PdfPage,
  View,
  Heading,
  Text,
  Table,
  PdfColors,
  renderPdf
} from "@jdsalasc/solvejs-pdf";

const bytes = renderPdf(
  <Pdf title="Invoice 1042" author="ACME Studio">
    <PdfPage>
      <View background={PdfColors.DarkBlue} padding={24} radius={14}>
        <Heading level={1} color={PdfColors.White}>Invoice #1042</Heading>
        <Text color={PdfColors.LightBlue}>Due within 15 days</Text>
      </View>
      <Table
        columns={[
          { key: "item", header: "Item", width: 280 },
          { key: "qty", header: "Qty", width: 60, align: "center" },
          { key: "total", header: "Total", width: 100, align: "right" }
        ]}
        rows={[
          { item: "Design", qty: 1, total: "2,400.00" },
          { item: "Development", qty: 2, total: "4,800.00" }
        ]}
      />
    </PdfPage>
  </Pdf>
);
```

`renderPdf` returns a `Uint8Array`; write it to a file in Node, send it from an API route, or create a `Blob` in the browser.

## JSX setup

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@jdsalasc/solvejs-pdf"
  }
}
```

`react-jsxdev` works too. In a project that already uses React, keep the global setting and opt this package in per file:

```tsx
/** @jsxImportSource @jdsalasc/solvejs-pdf */
```

Without JSX, every component is a factory:

```ts
import { Pdf, PdfPage, Text, renderPdf } from "@jdsalasc/solvejs-pdf";

const bytes = renderPdf(
  Pdf({
    title: "Hello",
    children: PdfPage({ children: Text({ value: "Hello PDF", fontSize: 24, bold: true }) })
  })
);
```

## Components

| Component | Main props |
|---|---|
| `Pdf` | `page` (`"a4"`, `"letter"`, `"a3"`, `"a5"` or `{ width, height }`), `margin`, `background`, `title`, `author`, `subject`, `keywords`, `creator`, `producer`, `header`, `footer` |
| `PdfPage` | Forces a new page; its children flow on that page |
| `View` | Vertical container: `padding`, `background`, `border`, `radius`, `width`, `height`, `gap`, plus style props |
| `Row` | Horizontal container; children without a width share the remaining space |
| `Text` | `value` or primitive children, `href`, plus style props |
| `Heading` | `level` (`1`, `2`, `3`), plus text props |
| `Paragraph` | Body text with a comfortable line height |
| `Table` | `columns`, `rows`, `header`, `zebra`, `cellPadding`, `headerBackground`, `headerColor`, `zebraColor`, `fontSize` |
| `Image` | `src` (JPEG bytes, data URL or base64), `width`, `height`, `background` |
| `Link` | `href` (`http`, `https`, `mailto`, `tel`) wrapping any children |
| `Divider` | `color`, `width`, `marginTop`, `marginBottom` |
| `Spacer` | `height`, `marginTop`, `marginBottom` |

Cells accept primitives or objects with per-cell overrides:

```tsx
const table = (
  <Table
    columns={[
      { key: "label", header: "Label" },
      { key: "amount", header: "Amount", align: "right" }
    ]}
    rows={[
      {
        label: "Total",
        amount: {
          value: "5,640.00",
          bold: true,
          color: PdfColors.DarkBlue,
          background: PdfColors.Yellow,
          align: "right"
        }
      }
    ]}
  />
);
```

## Styling

| Prop | Type |
|---|---|
| `color`, `background`, `borderColor` | `PdfColors.*` or `#RRGGBB` |
| `fontFamily` | `"helvetica"`, `"times"`, `"courier"` |
| `fontSize` | number in points (1–400) |
| `bold`, `italic` | boolean |
| `align` | `"left"`, `"center"`, `"right"` |
| `lineHeight` | multiplier (0–4) |
| `padding`, `paddingX`, `paddingY` | points |
| `margin`, `marginTop`, `marginBottom` | points |
| `border` | border width in points |
| `radius` | corner radius in points |
| `width` | points or a percentage string such as `"40%"` |
| `height` | points |
| `gap` | space between children in points |

`PdfColors` includes `Black`, `White`, `Slate`, `Gray`, `LightGray`, `SoftGray`, `Red`, `DarkRed`, `Rose`, `Orange`, `Amber`, `Yellow`, `Green`, `DarkGreen`, `Emerald`, `Teal`, `Blue`, `DarkBlue`, `Sky`, `LightBlue`, `Indigo`, `Purple`, `Pink` and `Brown`.

Units are PDF points (1/72 inch). Use `mm()`, `cm()`, `inches()` or `pt()` when you prefer other units.

## Layout behavior

- Text wraps to the available width; explicit `\n` starts a new line.
- Content flows down the page and starts a new page automatically.
- `PdfPage` forces a break.
- A `View` that is too tall splits at child boundaries; a `Text` splits between lines.
- A `Table` splits between rows and repeats its header on every page.
- `header` and `footer` can be a node or a function `({ page, total }) => node` and are drawn on every page.
- `width` percentages are resolved against the containing row or view exactly once.

## Viewer

The viewer lives in a separate subpath so server bundles do not import DOM code:

```ts
import { mountPdfViewer } from "@jdsalasc/solvejs-pdf/viewer";
import { Pdf, PdfPage, Text } from "@jdsalasc/solvejs-pdf";

const handle = mountPdfViewer({
  document: Pdf({ title: "Report", children: PdfPage({ children: Text({ value: "Hello" }) }) }),
  fileName: "report",
  height: 640,
  theme: "light",
  labels: { download: "Descargar", open: "Abrir" }
});

// handle.ready resolves with { data, blobUrl, frame, download, open, ... }
// handle.destroy() revokes the blob URL and removes the viewer.
```

Options:

| Option | Default | Description |
|---|---|---|
| `document` | — | A `Pdf` component tree to render |
| `data` | — | Ready-made PDF bytes (skips rendering) |
| `fileName` | `"document.pdf"` | Download name; `.pdf` is appended when missing |
| `iframe` | `true` | Show the browser PDF viewer; `false` shows a compact preview card |
| `download` | `true` | Show the download button |
| `open` | `true` | Show the open-in-new-tab button |
| `height` | `720` | iframe height in CSS pixels or any CSS length |
| `theme` | `"light"` | `"light"`, `"dark"` or `"auto"` |
| `labels` | English | Download/open/error/loading labels |
| `render` | — | Replace the whole UI; receives the viewer context |
| `onReady` | — | Called with the context after the PDF is ready |
| `onError` | — | Called when generation fails |

### Custom UI

```ts
import { mountPdfViewer } from "@jdsalasc/solvejs-pdf/viewer";

mountPdfViewer({
  document,
  fileName: "report.pdf",
  render: (context) => {
    const shell = document.createElement("div");
    const button = document.createElement("button");
    button.textContent = "Download";
    button.addEventListener("click", context.download);
    context.frame.style.height = "560px";
    shell.append(button, context.frame);
    return shell;
  }
});
```

Returning a string sets `innerHTML` on the viewer; only do that with trusted markup.

### Custom element

```ts
import { definePdfViewer } from "@jdsalasc/solvejs-pdf/viewer";
import { Pdf, PdfPage, Text } from "@jdsalasc/solvejs-pdf";

definePdfViewer();
const element = document.querySelector("solvejs-pdf-viewer") as HTMLElement & { document: unknown };
element.document = Pdf({ children: PdfPage({ children: Text({ value: "Hello" }) }) });
```

```html
<solvejs-pdf-viewer filename="report.pdf" height="640" theme="dark"></solvejs-pdf-viewer>
```

### React + Vite

```tsx
import { useEffect, useRef } from "react";
import { Pdf, PdfPage, Text } from "@jdsalasc/solvejs-pdf";
import { createPdfViewer } from "@jdsalasc/solvejs-pdf/viewer";

export function InvoiceViewer() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewer = createPdfViewer({
      document: Pdf({ children: PdfPage({ children: Text({ value: "Hello" }) }) }),
      fileName: "invoice.pdf"
    });
    host.current?.append(viewer);
    return () => viewer.remove();
  }, []);
  return <div ref={host} />;
}
```

### Next.js

The viewer needs the browser, so load it on the client only:

```tsx
"use client";
import dynamic from "next/dynamic";

export const InvoiceViewer = dynamic(
  () => import("./invoice-viewer").then((module) => module.InvoiceViewer),
  { ssr: false }
);
```

## API

| Export | What it does |
|---|---|
| `renderPdf(element)` | Returns uncompressed PDF bytes synchronously. |
| `renderPdfCompressed(element)` | Returns Flate-compressed PDF bytes as a promise. |
| `buildPdfDocument(element)` | Returns the laid-out `{ pages, metadata }` model. |
| `createPdfViewer(options)` | Creates a detached viewer host for React refs. |
| `mountPdfViewer(options, target?)` | Mounts a viewer and returns `{ element, ready, destroy }`. |
| `definePdfViewer(tag?)` | Registers `<solvejs-pdf-viewer>`. |
| `PdfError` | Stable codes: `PDF_INVALID_INPUT`, `PDF_LIMIT_EXCEEDED`, `PDF_UNSUPPORTED`. |
| `PDF_LIMITS` | Pages, blocks, text, image and table-row limits. |

## What is supported

- PDF 1.7 with classic xref, UTF-16 metadata and clickable links.
- Standard Type 1 fonts with WinAnsi encoding (accented Spanish characters, curly quotes, dashes and the euro sign).
- Text wrapping, alignment, line height, colors, backgrounds, borders, rounded corners, padding and margins.
- Nested `View` and `Row` layouts with numeric or percentage widths.
- Automatic pagination, forced pages, split text/views, split tables with repeated headers, repeated headers/footers with page numbers.
- JPEG images embedded with `DCTDecode`.
- Optional Flate compression through the platform `CompressionStream`.

## Not supported (yet)

- Reading or parsing existing PDFs.
- Custom TTF/OTF font embedding and Unicode outside WinAnsi.
- PNG, WebP, GIF or SVG images.
- Charts, forms, annotations other than links, outlines, encryption or digital signatures.
- Right-to-left text shaping and complex scripts.

## Security notes

- Link targets must use `http`, `https`, `mailto` or `tel`; `javascript:` is rejected.
- The viewer creates blob URLs and revokes them on `destroy()`.
- `render` returning a string is treated as trusted HTML; prefer returning a DOM node.
- A PDF generator is an input boundary: cap pages, rows and image sizes for untrusted documents with `PDF_LIMITS`.

## Performance

Measured with `npm run benchmark --workspace packages/solvejs-pdf` on Node 24 / Windows:

| Document | Time | Size |
|---|---:|---:|
| One-page invoice with a styled table (A4) | ~0.85 ms | 4.4 KB |
| 10-page report generated from 120 wrapped paragraphs | ~14.6 ms | 72 KB |
| Same 10-page report with Flate compression | ~52 ms | 7.4 KB |

Times are machine-dependent. The serializer and layout engine are synchronous and allocation-light; compression is optional and uses the platform `CompressionStream`.

## License

MIT
