import type { PdfImage } from "./images.js";
import type { PdfFontKey } from "./fonts.js";

/** Text drawn at a top-left baseline position. */
export type PdfTextOp = {
  kind: "text";
  x: number;
  y: number;
  text: string;
  font: PdfFontKey;
  size: number;
  color: string;
};

/** Filled and/or stroked rectangle, optionally rounded. */
export type PdfRectOp = {
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  radius?: number;
};

/** Straight line with an optional dash pattern. */
export type PdfLineOp = {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  dash?: readonly number[];
};

/** JPEG image placed in a rectangle. */
export type PdfImageOp = {
  kind: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  image: PdfImage;
};

export type PdfOp = PdfTextOp | PdfRectOp | PdfLineOp | PdfImageOp;

/** Clickable region that opens a URI. */
export type PdfLink = {
  x: number;
  y: number;
  width: number;
  height: number;
  href: string;
};

/** One page with top-left coordinates. The serializer converts to PDF space. */
export type PdfPageModel = {
  width: number;
  height: number;
  ops: PdfOp[];
  links: PdfLink[];
};

/** Document metadata written to the Info dictionary. */
export type PdfMetadata = {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
};

/** Fully laid out document, ready for serialization. */
export type PdfDocumentModel = {
  pages: PdfPageModel[];
  metadata: PdfMetadata;
};
