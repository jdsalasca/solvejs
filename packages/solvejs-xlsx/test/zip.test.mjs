import test from "node:test";
import assert from "node:assert/strict";
import { writeZip, writeZipDeflated } from "../dist/esm/zip/write.js";
import { readZip } from "../dist/esm/zip/read.js";
import { crc32 } from "../dist/esm/zip/crc32.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

test("crc32 matches the standard check vector", () => {
  assert.equal(crc32(encoder.encode("123456789")), 0xcbf43926);
});

test("writeZip stores entries and readZip returns them", async () => {
  const bytes = writeZip([
    { name: "a.txt", data: encoder.encode("hello") },
    { name: "dir/b.txt", data: encoder.encode("world") }
  ]);
  const files = await readZip(bytes);
  assert.equal(files.size, 2);
  assert.equal(decoder.decode(files.get("a.txt")), "hello");
  assert.equal(decoder.decode(files.get("dir/b.txt")), "world");
});

test("writeZipDeflated compresses and round-trips", async () => {
  const data = encoder.encode("solvejs-xlsx ".repeat(2000));
  const bytes = await writeZipDeflated([{ name: "large.txt", data }]);
  assert.ok(bytes.length < data.length, "the compressed archive should be smaller than the input");
  const files = await readZip(bytes);
  assert.equal(decoder.decode(files.get("large.txt")), decoder.decode(data));
});

test("writeZip rejects unsafe entry names", () => {
  assert.throws(() => writeZip([{ name: "../evil.txt", data: encoder.encode("x") }]), /safe relative/);
  assert.throws(() => writeZip([{ name: "/absolute.txt", data: encoder.encode("x") }]), /safe relative/);
});

test("writeZip rejects duplicate names", () => {
  assert.throws(
    () =>
      writeZip([
        { name: "a.txt", data: encoder.encode("one") },
        { name: "a.txt", data: encoder.encode("two") }
      ]),
    /unique/
  );
});
