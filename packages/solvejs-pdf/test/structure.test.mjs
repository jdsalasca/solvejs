import test from "node:test";
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { Pdf, Text, renderPdf, renderPdfCompressed } from "../dist/esm/index.js";

const latin1 = (bytes) => Buffer.from(bytes).toString("latin1");

test("writes valid xref offsets and object boundaries", () => {
  const bytes = renderPdf(Pdf({ children: Text({ value: "Structure" }) }));
  const text = latin1(bytes);
  const startxref = Number(/startxref\n(\d+)/.exec(text)?.[1]);
  assert.ok(Number.isInteger(startxref));
  assert.equal(text.slice(startxref, startxref + 4), "xref");
  const lines = text.slice(startxref).split("\n");
  const count = Number(lines[1].split(" ")[1]);
  assert.ok(count >= 5);
  for (let id = 1; id < count; id += 1) {
    const offset = Number(lines[2 + id].slice(0, 10));
    assert.ok(text.slice(offset).startsWith(`${id} 0 obj`));
  }
});

test("compressed streams inflate and contain drawing operators", async () => {
  const bytes = await renderPdfCompressed(Pdf({ children: Text({ value: "Compressed structure" }) }));
  const text = latin1(bytes);
  const match = /<< \/Length (\d+) \/Filter \/FlateDecode >>\nstream\n/.exec(text);
  assert.ok(match);
  const start = match.index + match[0].length;
  const length = Number(match[1]);
  const inflated = inflateSync(Buffer.from(bytes.slice(start, start + length))).toString("latin1");
  assert.match(inflated, /BT/);
  assert.match(inflated, /ET/);
});
