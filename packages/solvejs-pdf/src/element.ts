import type { PdfColor } from "./shared.js";
import type {
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
export type { PdfCell, PdfElement, PdfNode, PdfPageDecorator, PdfStyle, PdfTableColumn };

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
  children?: PdfNode | PdfNode[];
};

export type PageProps = { children?: PdfNode | PdfNode[] };
export type ViewProps = PdfStyle & { children?: PdfNode | PdfNode[] };
export type RowProps = PdfStyle & { children?: PdfNode | PdfNode[] };
export type TextProps = PdfStyle & {
  value?: string | number | boolean | Date | null;
  href?: string;
  children?: PdfNode | PdfNode[];
};
export type HeadingProps = TextProps & { level?: 1 | 2 | 3 };
export type ParagraphProps = TextProps;
export type DividerProps = { color?: PdfColor; width?: number; marginTop?: number; marginBottom?: number };
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
  return create("text", props, props.children);
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

/** Table with wrapping cells, zebra rows and page splitting. */
export function Table(props: TableProps): PdfElement {
  return create("table", props);
}

/** JPEG image from bytes, a data URL or base64. */
export function Image(props: ImageProps): PdfElement {
  return create("image", props);
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

