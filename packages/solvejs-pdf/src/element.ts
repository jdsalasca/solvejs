import type { PdfColor, PdfFontFamily, PdfPageNumberOptions, PdfWatermarkInput } from "./shared.js";
import type { PdfIconName } from "./layout/icons.js";
import type { PdfChartDatum } from "./layout/charts.js";
import type {
  BookmarkProps,
  Fragment as FragmentType,
  PdfCell,
  PdfComponent,
  PdfElement,
  PdfNode,
  PdfPageDecorator,
  PdfStyle,
  PdfTableColumn
} from "./layout/types.js";
import type { PdfPageSize } from "./shared.js";

export { Fragment } from "./layout/types.js";
export type { PdfCell, PdfElement, PdfNode, PdfPageDecorator, PdfStyle, PdfTableColumn, BookmarkProps };

/** Margins around the printable area. */
export type PdfMargin = number | { top?: number; right?: number; bottom?: number; left?: number };

export type PdfProps = {
  page?: PdfPageSize;
  margin?: PdfMargin;
  background?: PdfColor;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  header?: PdfPageDecorator;
  footer?: PdfPageDecorator;
  /** Built-in page-number footer, used when no custom footer is provided. */
  pageNumbers?: PdfPageNumberOptions;
  /** Document-wide line-height multiplier for text that does not set its own. */
  lineHeight?: number;
  /** Watermark drawn behind every page; a PdfPage can override it. */
  watermark?: PdfWatermarkInput;
  children?: PdfNode | PdfNode[];
};

export type PageProps = {
  children?: PdfNode | PdfNode[];
  /** Page-level line-height override for the text on this page. */
  lineHeight?: number;
  /** Page-level watermark override; `false` disables the document watermark. */
  watermark?: PdfWatermarkInput;
};
export type ViewProps = PdfStyle & { children?: PdfNode | PdfNode[] };
export type RowProps = PdfStyle & {
  children?: PdfNode | PdfNode[];
  /** Vertical alignment of row items with different heights. */
  valign?: "top" | "middle" | "bottom";
};
export type TextProps = PdfStyle & {
  value?: string | number | boolean | Date | null;
  href?: string;
  /** Named typographic preset; explicit props override it. */
  preset?: PdfTextPreset;
  /** Clamp the paragraph to this many lines and end the last one with an ellipsis. */
  maxLines?: number;
  children?: PdfNode | PdfNode[];
};
export type HeadingProps = TextProps & { level?: 1 | 2 | 3 };
export type ParagraphProps = TextProps;
export type SubtitleProps = TextProps;

export type PdfTextPreset =
  | "hero"
  | "display"
  | "title"
  | "section"
  | "subtitle"
  | "lead"
  | "body"
  | "quote"
  | "caption"
  | "eyebrow"
  | "signature"
  | "receipt"
  | "receiptTitle";

/** Named typography tokens that can be spread into props or selected with `preset`. */
export const PDF_TEXT_PRESETS: Record<PdfTextPreset, PdfStyle> = {
  hero: { fontSize: 40, bold: true, lineHeight: 1.05, marginBottom: 6 },
  display: { fontSize: 30, bold: true, lineHeight: 1.08, marginBottom: 8 },
  title: { fontSize: 22, bold: true, lineHeight: 1.2, marginBottom: 8 },
  section: { fontSize: 17, bold: true, lineHeight: 1.25, marginTop: 8, marginBottom: 4 },
  subtitle: { fontSize: 14, italic: true, color: "#64748B", lineHeight: 1.35, marginBottom: 6 },
  lead: { fontSize: 13, color: "#334155", lineHeight: 1.55, marginBottom: 10 },
  body: { fontSize: 11, lineHeight: 1.55, marginBottom: 8 },
  quote: { fontFamily: "times", italic: true, fontSize: 12.5, color: "#475569", lineHeight: 1.5, paddingX: 14, marginBottom: 10 },
  caption: { fontSize: 8, color: "#64748B", lineHeight: 1.4 },
  eyebrow: { fontSize: 8, bold: true, color: "#2563EB", textTransform: "uppercase", lineHeight: 1.2 },
  signature: { fontFamily: "times", italic: true, fontSize: 18, color: "#1E3A8A" },
  receipt: { fontFamily: "courier", fontSize: 8, lineHeight: 1.35, marginBottom: 2 },
  receiptTitle: { fontFamily: "courier", bold: true, fontSize: 13, textTransform: "uppercase", lineHeight: 1.2 }
};
export type DividerProps = { color?: PdfColor; width?: number; marginTop?: number; marginBottom?: number; dash?: readonly number[] };
export type SpacerProps = { height?: number; marginTop?: number; marginBottom?: number };
export type TableProps = PdfStyle & {
  columns: PdfTableColumn[];
  rows: Array<Record<string, PdfCell> | PdfCell[]>;
  header?: boolean;
  zebra?: boolean;
  cellPadding?: number;
  headerBackground?: PdfColor;
  headerColor?: PdfColor;
  zebraColor?: PdfColor;
  fontSize?: number;
};
export type ImageProps = {
  src: Uint8Array | string;
  width?: number;
  height?: number;
  alt?: string;
  background?: PdfColor;
  marginTop?: number;
  marginBottom?: number;
};

export type IconProps = {
  name: PdfIconName;
  /** Square size in points. Defaults to 16. */
  size?: number;
  color?: PdfColor;
  strokeWidth?: number;
  marginTop?: number;
  marginBottom?: number;
};

export type ChartProps = PdfStyle & {
  data: readonly PdfChartDatum[];
  title?: string;
  colors?: readonly PdfColor[];
  showValues?: boolean;
  valueFormat?: (value: number) => string;
};

export type FormulaProps = PdfStyle & {
  /** A supported LaTeX subset: fractions, roots, superscripts, subscripts and Greek/math symbols. */
  tex: string;
};

export type BarcodeProps = {
  value: string;
  width?: number;
  height?: number;
  color?: PdfColor;
  showText?: boolean;
};

export type StampProps = {
  text: string;
  color?: PdfColor;
  background?: PdfColor;
  borderColor?: PdfColor;
  fontFamily?: PdfFontFamily;
  bold?: boolean;
  italic?: boolean;
  /** Defaults to true. Set false to keep the original casing. */
  uppercase?: boolean;
  angle?: number;
  fontSize?: number;
  borderWidth?: number;
  padding?: number;
  opacity?: number;
};
export type LinkProps = { href: string; children?: PdfNode | PdfNode[] };

type ElementType = PdfElement["type"];

function create(type: ElementType, props: Record<string, unknown>, children?: PdfNode | PdfNode[]): PdfElement {
  return { type, props: { ...props, children } };
}

/** Document root. */
export function Pdf(props: PdfProps): PdfElement {
  return create("pdf", props, props.children);
}

/** Forces a new page; its children flow on that page. */
export function PdfPage(props: PageProps): PdfElement {
  return create("page", props, props.children);
}

/** Vertical container with padding, background, border and spacing. */
export function View(props: ViewProps): PdfElement {
  return create("view", props, props.children);
}

/** Horizontal container; children without a width share the remaining space. */
export function Row(props: RowProps): PdfElement {
  return create("row", props, props.children);
}

/** Wrapping text. */
export function Text(props: TextProps): PdfElement {
  const preset = props.preset ? PDF_TEXT_PRESETS[props.preset] : undefined;
  return create("text", preset ? { ...preset, ...props } : props, props.children);
}

/** Preset title: bold and larger than body text. */
export function Title(props: TextProps): PdfElement {
  return create("text", { ...PDF_TEXT_PRESETS.title, ...props }, props.children);
}

/** Preset subtitle: italic, muted and slightly smaller than a title. */
export function Subtitle(props: SubtitleProps): PdfElement {
  return create("text", { ...PDF_TEXT_PRESETS.subtitle, ...props }, props.children);
}

/** Preset heading text. */
export function Heading(props: HeadingProps): PdfElement {
  return create("heading", props, props.children);
}

/** Body paragraph with a comfortable line height. */
export function Paragraph(props: ParagraphProps): PdfElement {
  return create("paragraph", props, props.children);
}

/** Horizontal rule. */
export function Divider(props: DividerProps): PdfElement {
  return create("divider", props);
}

/** Vertical blank space. */
export function Spacer(props: SpacerProps): PdfElement {
  return create("spacer", props);
}

/** A navigable bookmark in the PDF outline. Place it where the destination should start. */
export function Bookmark(props: BookmarkProps): PdfElement {
  return create("bookmark", props);
}

/** Table with wrapping cells, zebra rows and page splitting. */
export function Table(props: TableProps): PdfElement {
  return create("table", props);
}

/** JPEG image from bytes, a data URL or base64. */
export function Image(props: ImageProps): PdfElement {
  return create("image", props);
}

/** Built-in vector icon, useful next to text and inside stat cards. */
export function Icon(props: IconProps): PdfElement {
  return create("icon", props);
}

/** Vertical bar chart. */
export function BarChart(props: ChartProps): PdfElement {
  return create("bar-chart", props);
}

/** Line chart with one series. */
export function LineChart(props: ChartProps): PdfElement {
  return create("line-chart", props);
}

/** Pie chart with an inline legend. */
export function PieChart(props: ChartProps): PdfElement {
  return create("pie-chart", props);
}

/** LaTeX-style formula rendered with native PDF text and vector rules. */
export function Formula(props: FormulaProps): PdfElement {
  return create("formula", props);
}

/** Code 39 barcode drawn with vector bars. */
export function Barcode(props: BarcodeProps): PdfElement {
  return create("barcode", props);
}

/** Rotated stamp box, useful for PAID / VOID / RECEIVED marks. */
export function Stamp(props: StampProps): PdfElement {
  return create("stamp", props);
}

export type ReceiptMeta = { label: string; value: string | number };
export type ReceiptItem = {
  description: string;
  qty?: string | number;
  unit?: string | number;
  total?: string | number;
};
export type ReceiptTotal = { label: string; value: string | number; bold?: boolean };
export type ReceiptProps = {
  title?: string;
  subtitle?: string;
  meta?: readonly ReceiptMeta[];
  items?: readonly ReceiptItem[];
  totals?: readonly ReceiptTotal[];
  footer?: string;
  barcode?: string;
  stamp?: string;
  width?: number;
  background?: PdfColor;
  accent?: PdfColor;
};

/** Monospace thermal-receipt layout with dashed rules, item table, barcode and stamp. */
// eslint-disable-next-line complexity, max-lines-per-function -- receipt is a composed template
export function Receipt(props: ReceiptProps): PdfElement {
  const width = props.width ?? 300;
  const contentWidth = width - 30;
  const accent = props.accent ?? "#0F172A";
  const meta = props.meta ?? [];
  const items = props.items ?? [];
  const totals = props.totals ?? [];
  const columns = [
    { key: "description", header: "ITEM", width: contentWidth - 130 },
    { key: "qty", header: "QTY", width: 35, align: "center" as const },
    { key: "unit", header: "UNIT", width: 45, align: "right" as const },
    { key: "total", header: "TOTAL", width: 50, align: "right" as const }
  ];
  const gap = (total: number, inner: number) => Math.max(0, (total - inner) / 2);
  return View({
    width,
    padding: 14,
    background: props.background ?? "#FFFDF5",
    border: 1,
    borderColor: "#CBD5E1",
    radius: 2,
    children: [
      Text({ preset: "receiptTitle", align: "center", color: accent, children: props.title ?? "RECEIPT" }),
      ...(props.subtitle
        ? [Text({ value: props.subtitle, align: "center", fontFamily: "courier", fontSize: 7, color: "#64748B", marginBottom: 2 })]
        : []),
      Divider({ color: "#94A3B8", dash: [2, 2], marginTop: 6, marginBottom: 6 }),
      ...meta.map((entry) =>
        Row({
          children: [
            Text({ preset: "receipt", children: entry.label }),
            Text({ preset: "receipt", align: "right", children: String(entry.value) })
          ]
        })
      ),
      Divider({ color: "#94A3B8", dash: [2, 2], marginTop: 6, marginBottom: 6 }),
      Table({
        columns,
        rows: items.map((item) => ({
          description: item.description,
          qty: item.qty ?? "",
          unit: item.unit ?? "",
          total: item.total ?? ""
        })),
        header: true,
        fontSize: 8,
        cellPadding: 3,
        fontFamily: "courier",
        headerBackground: "#E2E8F0",
        headerColor: accent,
        zebra: false
      }),
      Divider({ color: "#94A3B8", dash: [2, 2], marginTop: 6, marginBottom: 6 }),
      ...totals.map((entry) =>
        Row({
          children: [
            Text({ preset: "receipt", bold: entry.bold === true, children: entry.label }),
            Text({ preset: "receipt", bold: entry.bold === true, align: "right", children: String(entry.value) })
          ]
        })
      ),
      ...(props.barcode
        ? [
            Row({
              marginTop: 8,
              gap: 0,
              children: [
                View({ width: Math.max(1, gap(contentWidth, 210)) }),
                Barcode({ value: props.barcode, width: 210, height: 30, showText: false }),
                View({ width: Math.max(1, gap(contentWidth, 210)) })
              ]
            }),
            Text({ value: props.barcode, align: "center", fontFamily: "courier", fontSize: 7, color: "#334155" })
          ]
        : []),
      ...(props.stamp
        ? [
            Divider({ color: "#CBD5E1", dash: [1, 2], marginTop: 8, marginBottom: 8 }),
            Stamp({ text: props.stamp, color: "#B91C1C", angle: -8, fontSize: 12, opacity: 0.75 })
          ]
        : []),
      Divider({ color: "#94A3B8", dash: [2, 2], marginTop: 8, marginBottom: 4 }),
      Text({ value: props.footer ?? "THANK YOU", align: "center", fontFamily: "courier", fontSize: 8, color: accent })
    ]
  });
}

/** Wraps children in a clickable URL annotation. */
export function Link(props: LinkProps): PdfElement {
  return create("link", props, props.children);
}

/** Creates a declarative node for callers that do not use JSX. */
export function createElement(type: ElementType, props: Record<string, unknown> = {}, ...children: PdfNode[]): PdfElement {
  return create(type, props, children.length > 0 ? children : (props.children as PdfNode | PdfNode[] | undefined));
}

export type { PdfComponent, FragmentType };

