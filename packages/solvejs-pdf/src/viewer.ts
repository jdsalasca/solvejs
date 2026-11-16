import { PdfError } from "./errors.js";
import type { PdfElement } from "./layout/types.js";
import { renderPdf, renderPdfCompressed } from "./render.js";

export type PdfViewerTheme = "light" | "dark" | "auto";
export type PdfViewerLabels = { download?: string; open?: string; error?: string; loading?: string };

/** Everything a custom viewer renderer needs. */
export type PdfViewerContext = {
  data: Uint8Array;
  fileName: string;
  blobUrl: string;
  frame: HTMLIFrameElement | null;
  host: HTMLElement;
  toolbar: HTMLElement;
  download: () => void;
  open: () => void;
};

export type PdfViewerOptions = {
  document?: PdfElement;
  data?: Uint8Array;
  fileName?: string;
  iframe?: boolean;
  download?: boolean;
  open?: boolean;
  height?: number | string;
  theme?: PdfViewerTheme;
  className?: string;
  labels?: PdfViewerLabels;
  render?: (context: PdfViewerContext) => HTMLElement | string;
  onReady?: (context: PdfViewerContext) => void;
  onError?: (error: unknown) => void;
};

export type PdfViewerHandle = {
  element: HTMLElement;
  ready: Promise<PdfViewerContext>;
  destroy: () => void;
};

/** A viewer host with cleanup and readiness attached for React refs. */
export type PdfViewerHost = HTMLElement & {
  ready: Promise<PdfViewerContext>;
  destroy: () => void;
};

const DEFAULT_HEIGHT = 720;

const STYLES = `
:host { display: block; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
.viewer {
  --bg: #ffffff; --surface: #f8fafc; --border: #e2e8f0; --text: #0f172a;
  --muted: #64748b; --accent: #2563eb; --accent-soft: #dbeafe; --shadow: 0 18px 45px rgba(15, 23, 42, .12);
  border: 1px solid var(--border); border-radius: 16px; overflow: hidden; background: var(--bg);
  color: var(--text); box-shadow: var(--shadow);
}
.viewer[data-theme="dark"] {
  --bg: #0b1220; --surface: #111a2c; --border: #233149; --text: #e2e8f0;
  --muted: #94a3b8; --accent: #60a5fa; --accent-soft: #1e3a8a; --shadow: 0 18px 45px rgba(0, 0, 0, .45);
}
@media (prefers-color-scheme: dark) {
  .viewer[data-theme="auto"] {
    --bg: #0b1220; --surface: #111a2c; --border: #233149; --text: #e2e8f0;
    --muted: #94a3b8; --accent: #60a5fa; --accent-soft: #1e3a8a; --shadow: 0 18px 45px rgba(0, 0, 0, .45);
  }
}
.toolbar { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--surface); border-bottom: 1px solid var(--border); }
.badge { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: var(--accent); color: #fff; font-size: 10px; font-weight: 800; letter-spacing: .04em; }
.title { min-width: 0; flex: 1; }
.name { font-size: 13px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta { font-size: 11px; color: var(--muted); }
.actions { display: flex; align-items: center; gap: 6px; }
.button { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border); background: var(--bg); color: var(--text); border-radius: 9px; padding: 7px 10px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: none; }
.button:hover { border-color: var(--accent); color: var(--accent); }
.button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.button.primary:hover { filter: brightness(1.08); color: #fff; }
.frame { display: block; width: 100%; border: 0; background: #525659; }
.empty { display: grid; place-items: center; gap: 12px; padding: 56px 24px; text-align: center; background: var(--surface); }
.icon { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 18px; background: var(--accent-soft); color: var(--accent); font-weight: 800; }
.empty h3 { margin: 0; font-size: 16px; }
.empty p { margin: 0; max-width: 360px; color: var(--muted); font-size: 12px; line-height: 1.5; }
.error { padding: 28px; color: #b91c1c; background: #fef2f2; font-size: 13px; }
`;

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function icon(path: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
  shape.setAttribute("d", path);
  svg.append(shape);
  return svg;
}

const DOWNLOAD_ICON = "M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2";
const OPEN_ICON = "M14 3h7v7m0-7L10 14M5 5h5v2H7v10h10v-3h2v5H5V5Z";

function createFrame(blobUrl: string, fileName: string, height: number | string): HTMLIFrameElement {
  const frame = node("iframe", "frame");
  frame.src = blobUrl;
  frame.title = fileName;
  frame.setAttribute("referrerpolicy", "no-referrer");
  frame.style.height = typeof height === "number" ? `${height}px` : height;
  return frame;
}

type ToolbarInput = {
  fileName: string;
  labels: Required<PdfViewerLabels>;
  options: PdfViewerOptions;
  download: () => void;
  open: () => void;
};

function createToolbar(input: ToolbarInput): { toolbar: HTMLElement; frame: HTMLIFrameElement | null } {
  const { fileName, labels, options, download, open } = input;
  const toolbar = node("div", "toolbar");
  const badge = node("div", "badge", "PDF");
  const title = node("div", "title");
  title.append(node("div", "name", fileName), node("div", "meta", "PDF document"));
  const actions = node("div", "actions");
  const frame = options.iframe === false ? null : createFrame("about:blank", fileName, options.height ?? DEFAULT_HEIGHT);

  if (options.open !== false) {
    const openButton = node("button", "button");
    openButton.type = "button";
    openButton.title = labels.open;
    openButton.append(icon(OPEN_ICON), node("span", undefined, labels.open));
    openButton.addEventListener("click", open);
    actions.append(openButton);
  }
  if (options.download !== false) {
    const downloadButton = node("button", "button primary");
    downloadButton.type = "button";
    downloadButton.title = labels.download;
    downloadButton.append(icon(DOWNLOAD_ICON), node("span", undefined, labels.download));
    downloadButton.addEventListener("click", download);
    actions.append(downloadButton);
  }
  toolbar.append(badge, title, actions);
  return { toolbar, frame };
}

type EmptyStateInput = {
  fileName: string;
  labels: Required<PdfViewerLabels>;
  options: PdfViewerOptions;
  download: () => void;
  open: () => void;
};

function emptyState(input: EmptyStateInput): HTMLElement {
  const { fileName, labels, options, download, open } = input;
  const empty = node("div", "empty");
  empty.append(node("div", "icon", "PDF"), node("h3", undefined, fileName));
  empty.append(node("p", undefined, "This viewer is using the compact preview. Open or download the document to see every page."));
  const actions = node("div", "actions");
  if (options.open !== false) {
    const openButton = node("button", "button");
    openButton.type = "button";
    openButton.append(icon(OPEN_ICON), node("span", undefined, labels.open));
    openButton.addEventListener("click", open);
    actions.append(openButton);
  }
  if (options.download !== false) {
    const downloadButton = node("button", "button primary");
    downloadButton.type = "button";
    downloadButton.append(icon(DOWNLOAD_ICON), node("span", undefined, labels.download));
    downloadButton.addEventListener("click", download);
    actions.append(downloadButton);
  }
  if (actions.children.length > 0) empty.append(actions);
  return empty;
}

function errorState(message: string, labels: Required<PdfViewerLabels>): HTMLElement {
  const error = node("div", "error", `${labels.error}: ${message}`);
  error.setAttribute("role", "alert");
  return error;
}

async function bytesOf(options: PdfViewerOptions): Promise<Uint8Array> {
  if (options.data) return options.data;
  if (!options.document) {
    throw new PdfError("PDF_INVALID_INPUT", "PdfViewer requires a document or data option.");
  }
  try {
    return await renderPdfCompressed(options.document);
  } catch {
    return renderPdf(options.document);
  }
}

function fileNameOf(options: PdfViewerOptions): string {
  const name = options.fileName ?? "document.pdf";
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
}

type ViewerShell = { root: ShadowRoot | HTMLElement; viewer: HTMLElement };

function mountShell(host: HTMLElement, options: PdfViewerOptions, labels: Required<PdfViewerLabels>): ViewerShell {
  const root = host.shadowRoot ?? host;
  root.innerHTML = `<style>${STYLES}</style>`;
  const viewer = node("div", "viewer");
  viewer.dataset.theme = options.theme ?? "light";
  if (options.className) viewer.classList.add(options.className);
  root.append(viewer);
  const loading = node("div", "empty");
  loading.setAttribute("role", "status");
  loading.setAttribute("aria-live", "polite");
  loading.append(node("div", "icon", "PDF"), node("p", undefined, labels.loading));
  viewer.append(loading);
  return { root, viewer };
}

function downloader(blobUrl: string, fileName: string): () => void {
  return () => {
    const anchor = node("a");
    anchor.href = blobUrl;
    anchor.download = fileName;
    anchor.click();
  };
}

function opener(blobUrl: string): () => void {
  return () => {
    const anchor = node("a");
    anchor.href = blobUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
  };
}

type DrawViewerInput = {
  viewer: HTMLElement;
  host: HTMLElement;
  data: Uint8Array;
  fileName: string;
  labels: Required<PdfViewerLabels>;
  options: PdfViewerOptions;
  blobUrl: string;
};

function drawViewer(input: DrawViewerInput): PdfViewerContext {
  const { viewer, host, data, fileName, labels, options, blobUrl } = input;
  const download = downloader(blobUrl, fileName);
  const open = opener(blobUrl);
  const { toolbar, frame } = createToolbar({ fileName, labels, options, download, open });
  viewer.replaceChildren(toolbar);
  const body = frame ?? emptyState({ fileName, labels, options, download, open });
  if (frame) frame.src = blobUrl;
  viewer.append(body);

  const context: PdfViewerContext = { data, fileName, blobUrl, frame, host, toolbar, download, open };
  if (options.render) {
    const custom = options.render(context);
    viewer.replaceChildren();
    if (typeof custom === "string") viewer.innerHTML = custom;
    else viewer.append(custom);
  }
  return context;
}

function label(value: string | undefined, fallback: string): string {
  return value ?? fallback;
}

function labelsOf(options: PdfViewerOptions): Required<PdfViewerLabels> {
  return {
    download: label(options.labels?.download, "Download"),
    open: label(options.labels?.open, "Open"),
    error: label(options.labels?.error, "Could not render the PDF"),
    loading: label(options.labels?.loading, "Preparing PDF…")
  };
}

/** Starts a viewer on a host element and resolves when the PDF is ready. */
function startViewer(options: PdfViewerOptions, host: HTMLElement): PdfViewerHandle {
  if (typeof document === "undefined") {
    throw new PdfError("PDF_UNSUPPORTED", "PdfViewer requires a browser DOM.");
  }
  const labels = labelsOf(options);
  const fileName = fileNameOf(options);
  const { viewer } = mountShell(host, options, labels);
  let blobUrl = "";
  let destroyed = false;

  const destroy = (): void => {
    destroyed = true;
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    host.remove();
  };

  const ready = bytesOf(options).then((data) => {
    if (destroyed) throw new PdfError("PDF_UNSUPPORTED", "Viewer was destroyed before rendering.");
    blobUrl = URL.createObjectURL(new Blob([data as unknown as BlobPart], { type: "application/pdf" }));
    try {
      const context = drawViewer({ viewer, host, data, fileName, labels, options, blobUrl });
      options.onReady?.(context);
      return context;
    } catch (error) {
      URL.revokeObjectURL(blobUrl);
      blobUrl = "";
      throw error;
    }
  });

  ready.catch((error: unknown) => {
    if (destroyed) return;
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      blobUrl = "";
    }
    viewer.replaceChildren(errorState(error instanceof Error ? error.message : String(error), labels));
    options.onError?.(error);
  });

  host.dataset.pdfViewer = "true";
  return { element: host, ready, destroy };
}

/** Creates a viewer host without appending it to the page. */
export function createPdfViewer(options: PdfViewerOptions): PdfViewerHost {
  if (typeof document === "undefined") {
    throw new PdfError("PDF_UNSUPPORTED", "PdfViewer requires a browser DOM.");
  }
  const host = node("div", "solvejs-pdf-viewer");
  if (host.attachShadow) host.attachShadow({ mode: "open" });
  const handle = startViewer(options, host);
  return Object.assign(host, { ready: handle.ready, destroy: handle.destroy }) as PdfViewerHost;
}

/** Mounts a viewer immediately and returns its handle. */
export function mountPdfViewer(options: PdfViewerOptions, target?: HTMLElement): PdfViewerHandle {
  if (typeof document === "undefined") {
    throw new PdfError("PDF_UNSUPPORTED", "PdfViewer requires a browser DOM.");
  }
  const host = node("div", "solvejs-pdf-viewer");
  if (host.attachShadow) host.attachShadow({ mode: "open" });
  (target ?? document.body).append(host);
  return startViewer(options, host);
}

type ViewerElement = HTMLElement & {
  fileName?: string;
  iframe?: boolean;
  download?: boolean;
  open?: boolean;
  height?: number | string;
  theme?: PdfViewerTheme;
  render?: PdfViewerOptions["render"];
};

function firstDefined<T>(...values: Array<T | null | undefined>): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function flag(value: boolean | undefined, attribute: string | null): boolean {
  if (value !== undefined) return value;
  return attribute !== "false";
}

function optionsFromElement(
  element: ViewerElement,
  documentNode: PdfElement | undefined,
  data: Uint8Array | undefined
): PdfViewerOptions {
  return {
    document: documentNode,
    data,
    fileName: firstDefined(element.fileName, element.getAttribute("filename")),
    iframe: flag(element.iframe, element.getAttribute("iframe")),
    download: flag(element.download, element.getAttribute("download")),
    open: flag(element.open, element.getAttribute("open")),
    height: firstDefined(element.height, element.getAttribute("height")),
    theme: firstDefined(element.theme, element.getAttribute("theme") as PdfViewerTheme | null) ?? "light",
    render: element.render
  };
}

/** Registers `<solvejs-pdf-viewer>` for vanilla, React, Vue and Next.js client components. */
export function definePdfViewer(tag = "solvejs-pdf-viewer"): void {
  if (typeof HTMLElement === "undefined" || typeof customElements === "undefined" || customElements === null) return;
  if (customElements.get(tag)) return;

  class SolvejsPdfViewerElement extends HTMLElement {
    #document?: PdfElement;
    #data?: Uint8Array;
    #handle?: PdfViewerHandle;

    set document(value: PdfElement | undefined) {
      this.#document = value;
      this.renderViewer();
    }

    get document(): PdfElement | undefined {
      return this.#document;
    }

    set data(value: Uint8Array | undefined) {
      this.#data = value;
      this.renderViewer();
    }

    get data(): Uint8Array | undefined {
      return this.#data;
    }

    connectedCallback(): void {
      this.renderViewer();
    }

    disconnectedCallback(): void {
      this.#handle?.destroy();
      this.#handle = undefined;
    }

    private renderViewer(): void {
      if (!this.isConnected) return;
      this.#handle?.destroy();
      this.#handle = mountPdfViewer(optionsFromElement(this as ViewerElement, this.#document, this.#data), this);
    }
  }

  customElements.define(tag, SolvejsPdfViewerElement);
}

