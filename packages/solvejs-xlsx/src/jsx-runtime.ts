import { Fragment, createElement, type XlsxElement } from "./element.js";

export { Fragment };

/** JSX automatic-runtime entry point. */
export function jsx(type: XlsxElement["type"], props: Record<string, unknown> = {}, key?: string): XlsxElement {
  return createElement(type, { ...props, key });
}

export const jsxs = jsx;

export function jsxDEV(type: XlsxElement["type"], props: Record<string, unknown> = {}, key?: string): XlsxElement {
  return jsx(type, props, key);
}

// eslint-disable-next-line @typescript-eslint/no-namespace -- TypeScript resolves JSX.Element from this namespace
export namespace JSX {
  export type Element = XlsxElement;
  export interface ElementChildrenAttribute {
    children: unknown;
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- marker required by the JSX runtime
  export interface IntrinsicElements {}
}
