import test from "node:test";
import assert from "node:assert/strict";
import { jsonToRows, readCsv, sheetToJson, writeCsv, XlsxError } from "../dist/esm/index.js";

test("parses quoted fields, embedded newlines and CRLF", () => {
  const rows = readCsv('name,note,amount\r\n"Ada, A.","line 1\nline 2",0010\r\nGrace,"say ""hi""",20\r\n');
  assert.deepEqual(rows, [
    ["name", "note", "amount"],
    ["Ada, A.", "line 1\nline 2", "0010"],
    ["Grace", 'say "hi"', "20"]
  ]);
});

test("preserves blank rows and strips a UTF-8 BOM", () => {
  const text = "\uFEFFa,b\r\n\r\nc,d\r\n";
  assert.deepEqual(readCsv(text), [["a", "b"], [""], ["c", "d"]]);
  assert.deepEqual(readCsv(text, { skipEmptyLines: true }), [["a", "b"], ["c", "d"]]);
});

test("writes CSV and TSV with quoting and formula protection", () => {
  const rows = [
    ["name", "note"],
    ["Ada, A.", 'say "hi"'],
    ["=SUM(A1:A2)", "0010"],
    ["line\nbreak", null]
  ];
  const csv = writeCsv(rows);
  assert.match(csv, /"Ada, A\."/);
  assert.match(csv, /"say ""hi"""/);
  assert.match(csv, /'=SUM\(A1:A2\)/);
  assert.match(csv, /"line\nbreak"/);
  assert.equal(
    writeCsv([["a", "b"]], { delimiter: "\t", protectFormulas: false }),
    "a\tb\r\n"
  );
  assert.deepEqual(readCsv(writeCsv(rows), { skipEmptyLines: false }), [
    ["name", "note"],
    ["Ada, A.", 'say "hi"'],
    ["'=SUM(A1:A2)", "0010"],
    ["line\nbreak", ""]
  ]);
});

test("converts rows to objects without prototype pollution", () => {
  const rows = [
    ["name", "__proto__", "constructor"],
    ["Ada", "polluted", "also"]
  ];
  const [record] = sheetToJson(rows);
  assert.equal(record.name, "Ada");
  assert.equal(record.__proto__, "polluted");
  assert.equal({}.polluted, undefined);
  assert.equal(Object.getPrototypeOf(record), null);
  assert.deepEqual(sheetToJson(rows, { blankrows: true, defval: "" }).length, 1);
});

test("converts objects to rows in first-seen key order", () => {
  const rows = jsonToRows([
    { name: "Ada", age: 36 },
    { name: "Grace", team: "Navy" }
  ]);
  assert.deepEqual(rows, [
    ["name", "age", "team"],
    ["Ada", 36, null],
    ["Grace", null, "Navy"]
  ]);
  assert.deepEqual(jsonToRows([{ a: 1 }], { skipHeader: true }), [[1]]);
});

test("rejects malformed CSV with stable codes", () => {
  for (const run of [
    () => readCsv('"unterminated'),
    () => readCsv("a,b", { delimiter: "" }),
    () => writeCsv([["a"]], { delimiter: "\n" })
  ]) {
    assert.throws(run, (error) => error instanceof XlsxError && error.code === "XLSX_INVALID_INPUT");
  }
});
