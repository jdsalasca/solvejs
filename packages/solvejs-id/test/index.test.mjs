import test from "node:test";
import assert from "node:assert/strict";
import {
  IdError,
  isPrefixedId,
  isUlid,
  isUuid,
  nanoid,
  parseIdTimestamp,
  prefixedId,
  randomToken,
  ulid,
  ulidTimestamp,
  uuidTimestamp,
  uuidv4,
  uuidv7
} from "../dist/esm/index.js";

const zeros = (size) => new Uint8Array(size);
const fixed = { now: () => Date.UTC(2026, 10, 17, 12, 0, 0), random: zeros };

test("generates canonical UUID v4 and v7 values", () => {
  const four = uuidv4({ random: zeros });
  assert.equal(four, "00000000-0000-4000-8000-000000000000");
  assert.equal(isUuid(four), true);
  assert.equal(isUuid(four, 4), true);

  const seven = uuidv7(fixed);
  assert.equal(isUuid(seven, 7), true);
  assert.equal(uuidTimestamp(seven).toISOString(), "2026-11-17T12:00:00.000Z");
});

test("generates canonical ULIDs and extracts their timestamp", () => {
  const value = ulid(fixed);
  assert.equal(value.length, 26);
  assert.equal(isUlid(value), true);
  assert.equal(ulidTimestamp(value).toISOString(), "2026-11-17T12:00:00.000Z");
  assert.equal(parseIdTimestamp(value).toISOString(), "2026-11-17T12:00:00.000Z");
});

test("generates NanoIDs, prefixed IDs and tokens", () => {
  const id = nanoid(12, { random: zeros });
  assert.equal(id, "000000000000");
  assert.equal(prefixedId("usr", 8, { random: zeros }), "usr_00000000");
  assert.equal(isPrefixedId("usr_00000000"), true);
  assert.equal(isPrefixedId("usr_00000000", "usr"), true);
  assert.equal(isPrefixedId("ord_00000000", "usr"), false);
  assert.equal(randomToken(3, { random: zeros }), "AAAA");
});

test("rejects invalid sizes, prefixes and random sources", () => {
  assert.throws(() => nanoid(0), IdError);
  assert.throws(() => nanoid(129), IdError);
  assert.throws(() => prefixedId("User", 8), IdError);
  assert.throws(() => uuidv4({ random: () => new Uint8Array(2) }), IdError);
  assert.throws(() => uuidv7({ now: () => -1, random: zeros }), IdError);
});

test("recognizes and rejects malformed identifiers", () => {
  assert.equal(isUuid("not-a-uuid"), false);
  assert.equal(isUuid("00000000-0000-4000-8000-000000000000", 7), false);
  assert.equal(isUlid("not-a-ulid"), false);
  assert.equal(parseIdTimestamp("not-an-id"), undefined);
});

test("sets the v4 version and variant bits", () => {
  const value = uuidv4({ random: (size) => new Uint8Array(size).fill(0xff) });
  assert.equal(value[14], "4");
  assert.match(value[19], /[89ab]/);
});

test("sets the v7 version and variant bits", () => {
  const value = uuidv7(fixed);
  assert.equal(value[14], "7");
  assert.match(value[19], /[89ab]/);
});

test("uses URL-safe NanoID characters", () => {
  const value = nanoid(64, { random: (size) => new Uint8Array(size).map((_, index) => index * 4) });
  assert.match(value, /^[A-Za-z0-9_-]{64}$/);
});

test("uses a 26-character Crockford alphabet for ULIDs", () => {
  const value = ulid({ random: (size) => new Uint8Array(size).fill(255) });
  assert.match(value, /^[0-9A-HJKMNP-TV-Z]{26}$/);
});

test("produces URL-safe tokens with the requested entropy", () => {
  const token = randomToken(24, { random: (size) => new Uint8Array(size).fill(255) });
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.equal(token.length, 32);
});

test("prefixed IDs carry the requested prefix and size", () => {
  const value = prefixedId("ord", 10, { random: zeros });
  assert.equal(value, "ord_0000000000");
  assert.equal(isPrefixedId(value, "ord"), true);
});

test("timestamps reject the wrong UUID version", () => {
  assert.equal(uuidTimestamp("00000000-0000-4000-8000-000000000000"), undefined);
});
