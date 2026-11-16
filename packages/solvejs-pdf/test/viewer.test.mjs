import test from "node:test";
import assert from "node:assert/strict";
import { Pdf, PdfError, Text } from "../dist/esm/index.js";
import { createPdfViewer, mountPdfViewer } from "../dist/esm/viewer.js";

class FakeElement {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.style = {};
    this.dataset = {};
    this.attributes = {};
    this.textContent = "";
    this.innerHTML = "";
    this.className = "";
    this.parent = null;
    this.removed = false;
    this.classList = {
      add: (name) => {
        this.className = this.className ? `${this.className} ${name}` : name;
      }
    };
  }

  append(...nodes) {
    for (const child of nodes) {
      child.parent = this;
      this.children.push(child);
    }
  }

  replaceChildren(...nodes) {
    this.children = nodes;
  }

  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this);
    this.removed = true;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  addEventListener() {}

  attachShadow() {
    this.shadowRoot = new FakeElement("#shadow");
    this.shadowRoot.parent = this;
    return this.shadowRoot;
  }

  click() {
    this.clicked = true;
  }
}

function installDom() {
  const body = new FakeElement("body");
  const fakeDocument = {
    body,
    createElement: (tag) => new FakeElement(tag),
    createElementNS: (_namespace, tag) => new FakeElement(tag)
  };
  const original = {
    document: globalThis.document,
    window: globalThis.window,
    createObjectURL: URL.createObjectURL,
    revokeObjectURL: URL.revokeObjectURL
  };
  const revoked = [];
  globalThis.document = fakeDocument;
  globalThis.window = { open: () => null };
  URL.createObjectURL = () => "blob:solvejs-pdf";
  URL.revokeObjectURL = (url) => revoked.push(url);
  return {
    body,
    revoked,
    restore() {
      globalThis.document = original.document;
      globalThis.window = original.window;
      URL.createObjectURL = original.createObjectURL;
      URL.revokeObjectURL = original.revokeObjectURL;
    }
  };
}

test("mounts a viewer with iframe, toolbar and download", async () => {
  const dom = installDom();
  try {
    const handle = mountPdfViewer({
      document: Pdf({ title: "Viewer", children: Text({ value: "Hello" }) }),
      fileName: "invoice",
      height: 480
    });
    const context = await handle.ready;

    assert.equal(context.fileName, "invoice.pdf");
    assert.equal(context.blobUrl, "blob:solvejs-pdf");
    assert.ok(context.frame);
    assert.equal(context.frame.style.height, "480px");
    assert.equal(context.toolbar.children.length, 3);
    assert.equal(handle.element.parent, dom.body);

    handle.destroy();
    assert.ok(handle.element.removed);
    assert.deepEqual(dom.revoked, ["blob:solvejs-pdf"]);
  } finally {
    dom.restore();
  }
});

test("supports the compact preview without an iframe", async () => {
  const dom = installDom();
  try {
    const context = await mountPdfViewer({
      document: Pdf({ children: Text({ value: "Hello" }) }),
      iframe: false,
      open: false,
      download: false
    }).ready;
    assert.equal(context.frame, null);
    assert.equal(context.toolbar.children[2].children.length, 0);
  } finally {
    dom.restore();
  }
});

test("lets a custom renderer replace the whole UI", async () => {
  const dom = installDom();
  try {
    let customContext;
    const handle = mountPdfViewer({
      document: Pdf({ children: Text({ value: "Hello" }) }),
      render: (context) => {
        customContext = context;
        return "custom-ui";
      }
    });
    await handle.ready;
    const viewer = handle.element.shadowRoot.children.find((child) => child.className === "viewer");
    assert.equal(viewer.innerHTML, "custom-ui");
    assert.ok(customContext.frame);
  } finally {
    dom.restore();
  }
});

test("creates a detached host for React refs", async () => {
  const dom = installDom();
  try {
    const ready = new Promise((resolve) => {
      const host = createPdfViewer({
        document: Pdf({ children: Text({ value: "Hello" }) }),
        onReady: (context) => resolve({ host, context })
      });
    });
    const { host, context } = await ready;
    assert.ok(host.shadowRoot);
    assert.equal(host.parent, null);
    assert.ok(context.frame);
    assert.equal(typeof host.destroy, "function");
    host.destroy();
    assert.deepEqual(dom.revoked, ["blob:solvejs-pdf"]);
  } finally {
    dom.restore();
  }
});

test("revokes the blob URL when a custom renderer throws", async () => {
  const dom = installDom();
  try {
    const handle = mountPdfViewer({
      document: Pdf({ children: Text({ value: "Hello" }) }),
      render: () => {
        throw new Error("renderer failed");
      }
    });
    await assert.rejects(handle.ready, /renderer failed/);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(dom.revoked, ["blob:solvejs-pdf"]);
  } finally {
    dom.restore();
  }
});

test("reports render errors through onError", async () => {
  const dom = installDom();
  try {
    let captured;
    const handle = mountPdfViewer({
      document: Pdf({ children: Text({ value: "x", color: "nope" }) }),
      onError: (error) => {
        captured = error;
      }
    });
    await assert.rejects(handle.ready, (error) => error instanceof PdfError);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.ok(captured instanceof PdfError);
  } finally {
    dom.restore();
  }
});
