import { Fragment, createElement, type PdfElement } from "./element.js";

export { Fragment };

/** JSX automatic-runtime entry point. */
export function jsx(type: PdfElement["type"], props: Record<string, unknown> = {}, key?: string): PdfElement {
  return createElement(type, { ...props, key });
}

export const jsxs = jsx;

export function jsxDEV(type: PdfElement["type"], props: Record<string, unknown> = {}, key?: string): PdfElement {
  return jsx(type, props, key);
}

// eslint-disable-next-line @typescript-eslint/no-namespace -- TypeScript resolves JSX.Element from this namespace
export namespace JSX {
  export type Element = PdfElement;
  export interface ElementChildrenAttribute {
    children: unknown;
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- marker required by the JSX runtime
  export interface IntrinsicElements {}
}
