import test from "node:test";
import assert from "node:assert/strict";
import { escapeXmlAttribute, escapeXmlText, unescapeXml } from "../dist/esm/xml/escape.js";
import { firstChild, parseXml, textContent } from "../dist/esm/xml/parse.js";

test("escapes and unescapes XML text and attributes", () => {
  assert.equal(escapeXmlText("a & <b>"), "a &amp; &lt;b&gt;");
  assert.equal(escapeXmlAttribute("\"a\" & <b>"), "&quot;a&quot; &amp; &lt;b&gt;");
  assert.equal(unescapeXml("a &amp; &lt;b&gt; &#65; &#x42;"), "a & <b> A B");
});

test("parses elements, attributes, text and CDATA", () => {
  const root = parseXml('<?xml version="1.0"?><root a="1"><child>hi</child><![CDATA[x<y]]></root>');
  const node = firstChild(root, "root");
  assert.ok(node);
  assert.equal(node.attributes.a, "1");
  assert.equal(textContent(firstChild(node, "child")), "hi");
  assert.equal(node.text, "x<y");
});

test("rejects DTD declarations and malformed documents", () => {
  assert.throws(() => parseXml("<!DOCTYPE root><root/>"), /DTD/);
  assert.throws(() => parseXml("<root>"), /unclosed/);
  assert.throws(() => parseXml("<root></other>"), /does not match/);
});
