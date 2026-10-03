import test from "node:test";
import assert from "node:assert/strict";
import {
  BOOLEAN_STRINGS,
  COMMON_DELIMITERS,
  COMMON_HTTP_HEADERS,
  CONTENT_TYPES,
  FILE_SIZE_BYTES,
  HTTP_METHODS,
  HTTP_STATUS,
  TIME,
  parseBooleanString
} from "../dist/esm/index.js";

test("parseBooleanString", () => {
  for (const value of ["true", "TRUE", "True", "tRuE"]) {
    assert.equal(parseBooleanString(value), true, `${value} should be true`);
  }
  for (const value of ["1", "yes", "YES", "on", "ON"]) {
    assert.equal(parseBooleanString(value), true, `${value} should be true`);
  }
  for (const value of ["false", "FALSE", "False", "0", "no", "NO", "off", "OFF"]) {
    assert.equal(parseBooleanString(value), false, `${value} should be false`);
  }

  // parseBooleanString throws rather than guessing, so a typo in configuration
  // surfaces at startup instead of silently becoming false.
  for (const value of ["", "   ", "maybe", "null", "undefined", "2", "-1", "y", "n", "t", "f"]) {
    assert.throws(
      () => parseBooleanString(value),
      /Unsupported boolean string value/,
      `${JSON.stringify(value)} must be rejected`
    );
  }
});

test("TIME", () => {
  assert.deepEqual(Object.keys(TIME), ["SECOND_MS", "MINUTE_MS", "HOUR_MS", "DAY_MS"]);
  assert.equal(TIME.SECOND_MS, 1000);
  assert.equal(TIME.MINUTE_MS, 60_000);
  assert.equal(TIME.HOUR_MS, 3_600_000);
  assert.equal(TIME.DAY_MS, 86_400_000);
  assert.equal(TIME.MINUTE_MS / TIME.SECOND_MS, 60);
  assert.equal(TIME.HOUR_MS / TIME.MINUTE_MS, 60);
  assert.equal(TIME.DAY_MS / TIME.HOUR_MS, 24, "the units compose without drift");
  assert.equal(15 * TIME.MINUTE_MS, 900_000);
});

test("FILE_SIZE_BYTES", () => {
  assert.deepEqual(Object.keys(FILE_SIZE_BYTES), ["KB", "MB", "GB"]);
  assert.equal(FILE_SIZE_BYTES.KB, 1024);
  assert.equal(FILE_SIZE_BYTES.MB, 1024 ** 2);
  assert.equal(FILE_SIZE_BYTES.GB, 1024 ** 3);
  assert.equal(FILE_SIZE_BYTES.MB / FILE_SIZE_BYTES.KB, 1024);
  assert.equal(10 * FILE_SIZE_BYTES.MB, 10_485_760);
});

test("HTTP_METHODS", () => {
  assert.deepEqual(Object.keys(HTTP_METHODS), ["GET", "POST", "PUT", "PATCH", "DELETE"]);
  for (const [key, value] of Object.entries(HTTP_METHODS)) {
    assert.equal(key, value, `${key} should map to itself`);
  }
});

test("COMMON_HTTP_HEADERS", () => {
  assert.equal(COMMON_HTTP_HEADERS.CONTENT_TYPE, "content-type");
  assert.equal(COMMON_HTTP_HEADERS.AUTHORIZATION, "authorization");
  assert.equal(
    COMMON_HTTP_HEADERS.CONTENT_TYPE,
    COMMON_HTTP_HEADERS.CONTENT_TYPE.toLowerCase(),
    "header names are lowercase, which is the wire form"
  );
});

test("HTTP_STATUS", () => {
  assert.equal(HTTP_STATUS.OK, 200);
  assert.equal(HTTP_STATUS.CREATED, 201);
  assert.equal(HTTP_STATUS.NO_CONTENT, 204);
  assert.equal(HTTP_STATUS.BAD_REQUEST, 400);
  assert.equal(HTTP_STATUS.UNAUTHORIZED, 401);
  assert.equal(HTTP_STATUS.FORBIDDEN, 403);
  assert.equal(HTTP_STATUS.NOT_FOUND, 404);
  assert.equal(HTTP_STATUS.UNPROCESSABLE_ENTITY, 422);
  assert.equal(HTTP_STATUS.TOO_MANY_REQUESTS, 429);
  assert.equal(HTTP_STATUS.INTERNAL_SERVER_ERROR, 500);
  assert.equal(HTTP_STATUS.SERVICE_UNAVAILABLE, 503);

  for (const [key, value] of Object.entries(HTTP_STATUS)) {
    assert.equal(Number.isInteger(value), true, `${key} must be an integer status`);
    assert.equal(value >= 100 && value <= 599, true, `${key} must be a valid status code`);
  }
});

test("CONTENT_TYPES", () => {
  assert.deepEqual(Object.keys(CONTENT_TYPES), [
    "JSON",
    "FORM_URLENCODED",
    "MULTIPART_FORM_DATA",
    "TEXT",
    "HTML"
  ]);
  assert.equal(CONTENT_TYPES.JSON, "application/json");
  assert.equal(CONTENT_TYPES.HTML, "text/html");
  assert.equal(CONTENT_TYPES.TEXT, "text/plain");
  assert.equal(CONTENT_TYPES.FORM_URLENCODED, "application/x-www-form-urlencoded");
  assert.equal(CONTENT_TYPES.MULTIPART_FORM_DATA, "multipart/form-data");
  for (const value of Object.values(CONTENT_TYPES)) {
    assert.match(value, /^[a-z]+\/[a-z\-+.]+$/, `${value} must look like a media type`);
  }
});

test("BOOLEAN_STRINGS", () => {
  assert.deepEqual(BOOLEAN_STRINGS.TRUE_VALUES, ["true", "1", "yes", "on"]);
  assert.deepEqual(BOOLEAN_STRINGS.FALSE_VALUES, ["false", "0", "no", "off"]);
  for (const value of BOOLEAN_STRINGS.TRUE_VALUES) {
    assert.equal(parseBooleanString(value), true, `${value} is listed as true`);
  }
  for (const value of BOOLEAN_STRINGS.FALSE_VALUES) {
    assert.equal(parseBooleanString(value), false, `${value} is listed as false`);
  }
});

test("COMMON_DELIMITERS", () => {
  assert.deepEqual(Object.keys(COMMON_DELIMITERS), ["COMMA", "DOT", "DASH", "UNDERSCORE", "SLASH"]);
  assert.equal(COMMON_DELIMITERS.COMMA, ",");
  assert.equal(COMMON_DELIMITERS.DOT, ".");
  assert.equal(COMMON_DELIMITERS.DASH, "-");
  assert.equal(COMMON_DELIMITERS.UNDERSCORE, "_");
  assert.equal(COMMON_DELIMITERS.SLASH, "/");
  assert.equal(new Set(Object.values(COMMON_DELIMITERS)).size, 5, "every delimiter is distinct");
});
