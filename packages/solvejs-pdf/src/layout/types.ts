import type { PdfAlign, PdfColor, PdfFontFamily } from "../shared.js";

/** Fragment marker shared by the JSX runtime and the factory API. */
export const Fragment = Symbol.for("solvejs.pdf.fragment");

/** A function component that returns a declarative node. */
export type PdfComponent = (props: never) => PdfElement;

/** A declarative PDF node. `type` is a tag, a fragment or a function component. */
export type PdfElement = {
  type: string | PdfComponent | typeof Fragment;
  props: Record<string, unknown>;
};

/** Any value accepted as a child of a PDF component. */
export type PdfNode = PdfElement | string | number | boolean | Date | null | undefined;

/** Common layout and typography props. */
export type PdfStyle = {
  color?: PdfColor;
  background?: PdfColor;
  fontSize?: number;
  fontFamily?: PdfFontFamily;
  bold?: boolean;
  italic?: boolean;
  align?: PdfAlign;
  lineHeight?: number;
  /** Transform text before measuring: uppercase, lowercase or title case. */
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  /** Draw a thin rule under each line. */
  underline?: boolean;
  /** Draw a thin rule through each line. */
  strike?: boolean;
  padding?: number;
  paddingX?: number;
  paddingY?: number;
  margin?: number;
  marginTop?: number;
  marginBottom?: number;
  border?: number;
  borderColor?: PdfColor;
  radius?: number;
  width?: number | `${number}%`;
  height?: number;
  gap?: number;
};

export type PdfTableColumn = {
  key: string;
  header?: string;
  width?: number;
  align?: PdfAlign;
};

/** A navigable bookmark entry in the PDF outline. */
export type BookmarkProps = {
  title: string;
  /** Nesting level from 1 to 6. Defaults to 1. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
};

export type PdfCellValue = string | number | boolean | Date | null | undefined;

export type PdfCell =
  | PdfCellValue
  | {
      value?: PdfCellValue;
      align?: PdfAlign;
      color?: PdfColor;
      bold?: boolean;
      background?: PdfColor;
    };

/** Static header/footer content, or a function that receives the page numbers. */
export type PdfPageDecorator = PdfNode | ((context: { page: number; total: number }) => PdfNode);
