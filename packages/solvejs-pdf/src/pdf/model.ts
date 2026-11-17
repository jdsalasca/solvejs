import type { PdfWatermarkInput } from "../shared.js";
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
  /** Extra points between words, used by justified text. */
  wordSpacing?: number;
  /** Rotation in degrees around the anchor point. */
  rotate?: number;
  /** 0 to 1; emitted through a PDF ExtGState. */
  opacity?: number;
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

/** One navigable bookmark, resolved to a page and a top-left y position. */
export type PdfOutlineItem = {
  title: string;
  level: number;
  page: number;
  y: number;
};

/** An image placed in a rectangle, optionally rotated about its center. */
export type PdfImageOp = {
  kind: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  image: PdfImage;
  rotate?: number;
  opacity?: number;
};

export type PdfPoint = { x: number; y: number };

/** Filled and/or stroked polygon, used for icons, pie slices and simple charts. */
export type PdfPolygonOp = {
  kind: "polygon";
  points: PdfPoint[];
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  lineJoin?: "miter" | "round" | "bevel";
  /** Close the path. Defaults to true; set false for open strokes like checks. */
  closed?: boolean;
  opacity?: number;
};

export type PdfOp = PdfTextOp | PdfRectOp | PdfLineOp | PdfImageOp | PdfPolygonOp;

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
  /** Watermark metadata; the layout engine draws it behind the body. */
  watermark?: PdfWatermarkInput;
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
  outline?: PdfOutlineItem[];
};
