# @jdsalasc/solvejs-pdf

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-pdf)](https://www.npmjs.com/package/@jdsalasc/solvejs-pdf)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-pdf)](https://www.npmjs.com/package/@jdsalasc/solvejs-pdf)

Zero-dependency PDF generation and preview, built from scratch in TypeScript. Write a document as components, render it in the browser or on the server, and show it with a ready-made viewer that has an iframe, open/download actions and a completely replaceable UI.

No PDF library, no React dependency, no CSS framework. See the [Report Studio example](../../examples/report-studio) for an invoice that drives both a PDF and an XLSX workbook from one dataset.

Try the [Live Lab](https://solvejs-documentation.eridu.top/live/) to edit an invoice and preview a bookmarked PDF in the browser.

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
| `Pdf` | `page` (`"a4"`, `"letter"`, `"a3"`, `"a5"` or `{ width, height }`), `margin`, `background`, `title`, `author`, `subject`, `keywords`, `creator`, `producer`, `header`, `footer`, `pageNumbers` |
| `PdfPage` | Forces a new page; its children flow on that page |
| `View` | Vertical container: `padding`, `background`, `border`, `radius`, `width`, `height`, `gap`, plus style props |
| `Row` | Horizontal container; children without a width share the remaining space |
| `Text` | `value` or primitive children, `href`, `preset`, plus style props; supports `bold`, `italic`, `fontFamily`, `textTransform`, `underline`, `strike` |
| `Subtitle` | Preset italic, muted subtitle text; accepts all text props |
| `Heading` | `level` (`1`, `2`, `3`), plus text props |
| `Paragraph` | Body text with a comfortable line height |
| `Table` | `columns`, `rows`, `header`, `zebra`, `cellPadding`, `headerBackground`, `headerColor`, `zebraColor`, `fontSize` |
| `Image` | `src` (JPEG bytes, data URL or base64), `width`, `height`, `background` |
| `Link` | `href` (`http`, `https`, `mailto`, `tel`) wrapping any children |
| `Divider` | `color`, `width`, `marginTop`, `marginBottom` |
| `Spacer` | `height`, `marginTop`, `marginBottom` |
| `Bookmark` | `title`, `level` (1-6); writes a navigable PDF outline entry |

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
| `lineHeight` | multiplier (0-4) |
| `textTransform` | `"none"`, `"uppercase"`, `"lowercase"`, `"capitalize"` |
| `underline`, `strike` | boolean text decorations |

## Typography and footers

Use the standard PDF families (`helvetica`, `times`, `courier`) with real bold and italic faces. `times` + `italic` gives an editorial, calligraphic look without embedding a font file.

```tsx
import { Bookmark, Pdf, PdfPage, Text, PdfColors } from "@jdsalasc/solvejs-pdf";

const elegant = Pdf({
  title: "Certificate",
  footer: ({ page, total }) => Text({
    value: `SolveJS · ${page} / ${total}`,
    fontFamily: "times",
    italic: true,
    fontSize: 8,
    color: PdfColors.Gray,
    align: "center"
  }),
  children: PdfPage({
    children: [
      Bookmark({ title: "Award" }),
      Text({
        value: "Certificate of completion",
        fontFamily: "times",
        bold: true,
        italic: true,
        fontSize: 30,
        textTransform: "capitalize",
        underline: true,
        color: PdfColors.DarkBlue
      }),
      Text({
        value: "Awarded to Ada Lovelace",
        fontFamily: "times",
        italic: true,
        fontSize: 16,
        marginTop: 18
      })
    ]
  })
});
```

`underline` and `strike` draw thin rules that follow the measured line width, so centered and right-aligned text stay aligned. Footers are ordinary decorators: they receive `{ page, total }`, support the same typography and are measured before pagination so they never overlap body text.

Custom TTF/OTF embedding is not part of this release. The standard fonts keep the package zero-dependency and browser-first; choose `times` italic for a classical feel or `courier` for a typewriter look.

### Presets and page numbers

`PDF_TEXT_PRESETS` contains `display`, `title`, `subtitle`, `body`, `caption`, `eyebrow` and `signature`. Use a preset by name, or spread it in JSON-style configuration:

```ts
import { PDF_TEXT_PRESETS, Pdf, PdfPage, Subtitle, Text } from "@jdsalasc/solvejs-pdf";

const title = Text({ preset: "display", children: "Annual report" });
const caption = Text({ ...PDF_TEXT_PRESETS.caption, children: "Generated 16 Nov 2026" });
const deck = Pdf({
  pageNumbers: { preset: "classic" },
  children: PdfPage({
    children: [
      title,
      Subtitle({ children: "Revenue, retention and product velocity" }),
      Text({ preset: "eyebrow", children: "Confidential" }),
      caption
    ]
  })
});
```

`pageNumbers` is opt-in and ignored when a custom `footer` exists. Presets:

| Preset | Look |
|---|---|
| `minimal` | Number only, right aligned |
| `classic` | `1 / 4`, centered, italic, thin rule below |
| `editorial` | `— 1 / 4`, right aligned, italic |

You can override any field: `format` (`"number"` or `"page-of-total"`), `align` (`"left"`, `"center"`, `"right"`), `fontSize`, `color`, `italic`, `bold`, `prefix`, `separator` and `rule`.

```ts
Pdf({
  pageNumbers: { format: "number", align: "left", italic: true, fontSize: 9, prefix: "p. " }
});
```
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
- `header` and `footer` can be a node or a function `({ page, total }) => node` and are drawn on every page. The layout measures every page, reserves the tallest header/footer across the document and repaginates to a fixed point; if it cannot stabilize, it fails with `PDF_LIMIT_EXCEEDED`.
- `Row` children must be components; primitives are rejected instead of being silently dropped.
- `width` percentages are resolved against the containing row or view exactly once.

## Bookmarks

Place a `Bookmark` where a section starts. The PDF outline is nested by `level`, so readers such as Preview, Acrobat, Chrome and Firefox show a navigable table of contents.

```tsx
import { Bookmark, Heading, Pdf, PdfPage, Text } from "@jdsalasc/solvejs-pdf";

const report = Pdf({
  title: "Annual report",
  children: PdfPage({
    children: [
      Bookmark({ title: "Executive summary", level: 1 }),
      Heading({ level: 1, children: "Executive summary" }),
      Text({ children: "..." }),
      Bookmark({ title: "Revenue", level: 2 }),
      Heading({ level: 2, children: "Revenue" }),
      Text({ children: "..." }),
      Bookmark({ title: "Appendix", level: 1 }),
      Heading({ level: 1, children: "Appendix" })
    ]
  })
});
```

Bookmarks are zero-height layout markers: they do not add spacing, and their destination is the page and vertical position where they appear. `buildPdfDocument` also returns `outline` with the resolved `{ title, level, page, y }` entries.

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
    return () => viewer.destroy();
  }, []);
  return <div ref={host} />;
}
```

`createPdfViewer` returns a host with `ready` and `destroy` attached, so unmounting revokes the blob URL instead of leaking it.

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
| `createPdfViewer(options)` | Creates a detached viewer host with `ready` and `destroy` for React refs. |
| `mountPdfViewer(options, target?)` | Mounts a viewer and returns `{ element, ready, destroy }`. |
| `definePdfViewer(tag?)` | Registers `<solvejs-pdf-viewer>`. |
| `PdfError` | Stable codes: `PDF_INVALID_INPUT`, `PDF_LIMIT_EXCEEDED`, `PDF_UNSUPPORTED`. |
| `PDF_LIMITS` | Pages, blocks, text, image bytes (per image and aggregate), table rows, table cells and bookmark limits. |

`PDF_LIMITS` is intentionally conservative for untrusted input: 500 pages, 20,000 layout nodes, 200,000 characters per text block, 20 MB per image, 64 MB of image bytes per document, 20,000 table rows, 200,000 table cells and 1,000 bookmarks.

## What is supported

- PDF 1.7 with classic xref, UTF-16 metadata and clickable links.
- Standard Type 1 fonts with WinAnsi encoding (accented Spanish characters, curly quotes, dashes and the euro sign).
- Text wrapping, alignment, line height, colors, backgrounds, borders, rounded corners, padding and margins.
- Bold/italic standard faces, text transforms (`uppercase`, `lowercase`, `capitalize`) and underline/strike decorations.
- Nested `View` and `Row` layouts with numeric or percentage widths.
- Automatic pagination, forced pages, split text/views, split tables with repeated headers, repeated headers/footers with page numbers.
- Nested PDF bookmarks/outlines with page destinations.
- JPEG images embedded with `DCTDecode`: 8-bit grayscale or RGB, baseline and extended sequential frames, with validated segment lengths, marker order, scan data and EOI.
- Optional Flate compression through the platform `CompressionStream`.

## Real-world recipes

### API route: return a generated invoice

```ts
import { Pdf, PdfPage, Text, Table, PdfColors, renderPdf } from "@jdsalasc/solvejs-pdf";

export async function GET() {
  const bytes = renderPdf(
    Pdf({
      title: "Invoice 1042",
      author: "ACME Studio",
      footer: ({ page, total }) => Text({ value: `Page ${page} of ${total}`, align: "center", fontSize: 9 }),
      children: PdfPage({
        children: [
          Text({ value: "INVOICE 1042", fontSize: 26, bold: true, color: PdfColors.DarkBlue }),
          Text({ value: "Due within 15 days", color: PdfColors.Gray, marginBottom: 18 }),
          Table({
            columns: [
              { key: "item", header: "Item", width: 280 },
              { key: "qty", header: "Qty", width: 60, align: "center" },
              { key: "total", header: "Total", width: 100, align: "right" }
            ],
            rows: [
              { item: "Design", qty: 1, total: "2,400.00" },
              { item: "Development", qty: 2, total: "4,800.00" }
            ]
          })
        ]
      })
    })
  );

  return new Response(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="invoice-1042.pdf"'
    }
  });
}
```

The same builder works in a browser event handler: create a `Blob` from the returned bytes and hand it to the viewer or a download link.

### Long report: let the engine paginate

```ts
import { Pdf, PdfPage, Heading, Paragraph, Text, PdfColors } from "@jdsalasc/solvejs-pdf";

const report = Pdf({
  title: "Annual report",
  footer: ({ page, total }) => Text({ value: `${page} / ${total}`, align: "right", fontSize: 8 }),
  children: PdfPage({
    children: [
      Heading({ level: 1, children: "Annual report" }),
      ...sections.map((section) => [
        Heading({ level: 2, children: section.title }),
        Paragraph({ children: section.body })
      ])
    ]
  })
});
```

Do not calculate page breaks yourself. Wrapped paragraphs and tables split automatically, and the footer receives the final page count after pagination.

### Preview without a framework

```html
<solvejs-pdf-viewer filename="report.pdf" height="640" theme="light"></solvejs-pdf-viewer>
<script type="module">
  import { definePdfViewer } from "@jdsalasc/solvejs-pdf/viewer";
  import { Pdf, PdfPage, Text } from "@jdsalasc/solvejs-pdf";

  definePdfViewer();
  const viewer = document.querySelector("solvejs-pdf-viewer");
  viewer.document = Pdf({ children: PdfPage({ children: Text({ value: "Hello" }) }) });
</script>
```

Set attributes before the element connects. The custom element renders on connect and whenever you assign `document` or `data`; other option attributes are initialization-time values.

## How it compares

This is the gap list from the November 2026 audit. pdf-lib is the broadest low-level editor, PDFKit is the mature streaming generator, jsPDF is the long-standing client-side writer, and react-pdf is a React renderer.

| Capability | SolveJS PDF | pdf-lib | PDFKit | jsPDF | react-pdf |
|---|---|---|---|---|---|
| Runtime dependencies | **0** | Several | Several | Several | React + renderer |
| Browser-first, no Node built-ins | **Yes** | Yes | Partial | Yes | Yes |
| Declarative components | **Yes** | No | No | No | Yes (React) |
| Tables, wrapping, pagination | Built in | Manual | Manual | Manual | Built in |
| Repeated header/footer with page numbers | Built in | Manual | Manual | Manual | Built in |
| JPEG images | Yes | Yes | Yes | Yes | Yes |
| PNG with transparency | Not yet | Yes | Yes | Yes | Yes |
| Custom TTF/Unicode fonts | Not yet | Yes | Yes | Yes | Yes |
| Read/edit existing PDFs | No | Yes | No | No | No |
| Forms, outlines, encryption | Bookmarks | Yes | Outlines | No | Outlines |
| Zero-dependency viewer with download/open | **Yes** | No | No | No | No |
| Bundle size for a small invoice | Small | Medium | Medium | Medium | Large |

Pick pdf-lib to edit or merge existing documents, PDFKit for streaming Node pipelines, jsPDF for a familiar client-side canvas-style API, and react-pdf when the document should be React all the way down. Pick SolveJS when you want a small zero-dependency generator with a component vocabulary, predictable pagination and a viewer included.

## Not supported (yet)

- Reading or parsing existing PDFs.
- Custom TTF/OTF font embedding and Unicode outside WinAnsi.
- PNG, WebP, GIF or SVG images.
- CMYK or 12-bit JPEG images, and progressive/arithmetic JPEG frames; these are rejected instead of producing incorrect colors or broken scans.
- Charts, forms, annotations other than links, encryption or digital signatures.

## Limits and fidelity

- Standard Type 1 fonts only; unsupported Unicode characters become `?` and repeated whitespace is collapsed during wrapping. Supply text your chosen font can represent.
- Custom TTF/OTF embedding is not supported yet; use `helvetica`, `times` or `courier` with bold/italic for typographic contrast.
- Tables cannot split a single row taller than the page; keep individual rows within the printable height.
- Table cells are limited to 200,000 characters each, and a document to 200,000 table cells.
- Bookmarks are limited to 1,000 entries and 300 characters per title; nesting is capped at level 6.
- Images are JPEG only and use `DCTDecode`. Each `Image` renders one image; there are no floating or inline image flows.
- `Row` children must be components that produce one layout block; wrap multiple blocks in a `View`. Primitives and multi-block children fail with `PDF_INVALID_INPUT`.
- Header/footer heights are measured across every page; page-specific decorators that grow without bound fail instead of overlapping the body.
- Page backgrounds are drawn as a full-page rectangle; there is no transparency group or blend mode.

## Security notes

- Link targets must use `http`, `https`, `mailto` or `tel`; `javascript:` is rejected. Non-ASCII URI characters are percent-encoded independently of the text font, existing `%XX` escapes are preserved, and malformed Unicode fails instead of writing truncated bytes.
- The viewer creates blob URLs and revokes them on `destroy()`; custom renderers that throw also trigger revocation.
- `render` returning a string is treated as trusted HTML; prefer returning a DOM node.
- A PDF generator is an input boundary: cap pages, rows, text, block count and image sizes for untrusted documents with `PDF_LIMITS`.
- The layout engine enforces page, block, text, table-cell and aggregate image-byte budgets before serialization. JPEG parsing walks segment lengths and marker order instead of searching for marker bytes.
- Link annotations are only produced for validated schemes; the package does not fetch or embed remote resources.

## Performance

Measured with `npm run benchmark --workspace packages/solvejs-pdf` on Node 24 / Windows:

| Document | Time | Size |
|---|---:|---:|
| One-page invoice with a styled table (A4) | ~0.85 ms | 4.4 KB |
| 10-page report generated from 120 wrapped paragraphs | ~14.6 ms | 72 KB |
| Same 10-page report with Flate compression | ~40 ms | 7.4 KB |

Times are machine-dependent. The serializer and layout engine are synchronous and allocation-light; compression is optional and uses the platform `CompressionStream`.

## License

MIT
