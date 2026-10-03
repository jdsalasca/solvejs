import test from "node:test";
import assert from "node:assert/strict";
import {
  HttpError,
  calculateBackoffDelay,
  getStatusText,
  isIdempotentMethod,
  isRetryableError,
  isRetryableStatus,
  negotiateContentType,
  normalizeHeaderName,
  parseContentType
} from "../dist/esm/index.js";

test("getStatusText", () => {
  assert.equal(getStatusText(200), "OK");
  assert.equal(getStatusText(404), "Not Found");
  assert.equal(getStatusText(422), "Unprocessable Entity");
  assert.equal(getStatusText(429), "Too Many Requests");
  assert.equal(getStatusText(503), "Service Unavailable");

  assert.equal(getStatusText(599), "", "an unknown code has no standard text");
  assert.equal(getStatusText(99), "");
  assert.equal(getStatusText(600), "");
  assert.equal(getStatusText(0), "");
  assert.equal(getStatusText(200.5), "", "a fractional status is not a status");
  assert.equal(getStatusText("200"), "");
  assert.equal(getStatusText(null), "");
  assert.equal(getStatusText(NaN), "");
});

test("isIdempotentMethod", () => {
  for (const method of ["GET", "HEAD", "OPTIONS", "TRACE", "PUT", "DELETE"]) {
    assert.equal(isIdempotentMethod(method), true, `${method} is idempotent`);
    assert.equal(isIdempotentMethod(method.toLowerCase()), true, "case does not matter");
  }
  for (const method of ["POST", "PATCH", "CONNECT"]) {
    assert.equal(isIdempotentMethod(method), false, `${method} is not idempotent`);
  }

  assert.equal(isIdempotentMethod(""), false);
  assert.equal(isIdempotentMethod("  get  "), false, "surrounding whitespace is not trimmed");
  assert.equal(isIdempotentMethod(null), false);
  assert.equal(isIdempoyantGuard(), false, "an unknown method is never idempotent");
});

function isIdempoyantGuard() {
  return isIdempotentMethod("FLY");
}

test("isRetryableStatus", () => {
  for (const status of [408, 425, 429, 500, 502, 503, 504]) {
    assert.equal(isRetryableStatus(status), true, `${status} is worth retrying`);
  }
  for (const status of [200, 201, 204, 301, 400, 401, 403, 404, 409, 422]) {
    assert.equal(isRetryableStatus(status), false, `${status} must not be retried`);
  }

  assert.equal(isRetryableStatus(599), false, "an unknown status is not retried");
  assert.equal(isRetryableStatus(0), false);
  assert.equal(isRetryableStatus("503"), false);
  assert.equal(isRetryableStatus(null), false);
});

test("isRetryableError classifies a thrown value", () => {
  assert.equal(isRetryableError({ name: "AbortError" }), true, "an aborted request may be retried");
  assert.equal(isRetryableError({ code: "ECONNRESET" }), true);
  assert.equal(isRetryableError({ code: "ETIMEDOUT" }), true);
  assert.equal(isRetryableError({ code: "ECONNREFUSED" }), true);
  assert.equal(isRetryableError({ code: "EAI_AGAIN" }), true);
  assert.equal(isRetryableError(new TypeError("fetch failed")), true, "a fetch TypeError is a transport failure");

  assert.equal(isRetryableError({ code: "ENOTFOUND" }), false, "a bad hostname will not fix itself");
  assert.equal(isRetryableError({ code: "ECONNRESET", status: 400 }), false, "an explicit client status wins");
  assert.equal(isRetryableError({ status: 503 }), true);
  assert.equal(isRetryableError({ status: 400 }), false);
  assert.equal(isRetryableError(new Error("plain")), false);
  assert.equal(isRetryableError(null), false);
  assert.equal(isRetryableError("timeout"), false, "a bare string is not classified");
});

test("calculateBackoffDelay grows exponentially and honours a ceiling", () => {
  const options = { baseMs: 100, factor: 2, maxMs: 1000, jitter: false };

  assert.equal(calculateBackoffDelay(0, options), 100);
  assert.equal(calculateBackoffDelay(1, options), 200);
  assert.equal(calculateBackoffDelay(2, options), 400);
  assert.equal(calculateBackoffDelay(3, options), 800);
  assert.equal(calculateBackoffDelay(4, options), 1000, "the ceiling caps the growth");
  assert.equal(calculateBackoffDelay(10, options), 1000);

  assert.equal(calculateBackoffDelay(0, { ...options, jitter: false, factor: 3 }), 100);
  assert.equal(calculateBackoffDelay(1, { ...options, jitter: false, factor: 3 }), 300);
});

test("calculateBackoffDelay jitter stays inside the expected band", () => {
  const options = { baseMs: 100, factor: 2, maxMs: 10_000 };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    for (let run = 0; run < 40; run += 1) {
      const delay = calculateBackoffDelay(attempt, options);
      const expected = Math.min(10_000, 100 * 2 ** attempt);
      assert.equal(delay >= expected / 2, true, `${delay} must be at least half of ${expected}`);
      assert.equal(delay <= expected, true, `${delay} must not exceed ${expected}`);
      assert.equal(Number.isInteger(delay), true);
    }
  }

  assert.equal(typeof calculateBackoffDelay(0, { ...options, jitter: false }), "number");
});

test("calculateBackoffDelay validates its inputs", () => {
  const base = { baseMs: 100, factor: 2, maxMs: 1000 };

  assert.throws(() => calculateBackoffDelay(-1, base), /HttpError|attempt/);
  assert.throws(() => calculateBackoffDelay(1.5, base), /HttpError|attempt/);
  assert.throws(() => calculateBackoffDelay(0, { ...base, baseMs: -1 }), /HttpError|baseMs/);
  assert.throws(() => calculateBackoffDelay(0, { ...base, factor: 0.5 }), /HttpError|factor/);
  assert.throws(() => calculateBackoffDelay(0, { ...base, factor: 1 }), /HttpError|factor/, "a factor of 1 never backs off");
  assert.throws(() => calculateBackoffDelay(0, { ...base, maxMs: 10 }), /HttpError|maxMs/, "the ceiling must exceed the base");
  assert.throws(() => calculateBackoffDelay(0, { ...base, jitter: "yes" }), /HttpError|jitter/);
  assert.throws(() => calculateBackoffDelay(0, undefined), /HttpError|options/);
});

test("normalizeHeaderName", () => {
  assert.equal(normalizeHeaderName("content-type"), "content-type");
  assert.equal(normalizeHeaderName("Content-Type"), "content-type");
  assert.equal(normalizeHeaderName("CONTENT-TYPE"), "content-type");
  assert.equal(normalizeHeaderName("  Content-Type  "), "content-type");
  assert.equal(normalizeHeaderName("x-Request-Id"), "x-request-id");
  assert.equal(normalizeHeaderName(""), "", "an empty name stays empty");
  assert.equal(normalizeHeaderName(null), "");
});

test("parseContentType", () => {
  assert.deepEqual(parseContentType("application/json; charset=utf-8"), {
    type: "application/json",
    subtype: "json",
    charset: "utf-8",
    parameters: { charset: "utf-8" }
  });
  assert.deepEqual(parseContentType("APPLICATION/JSON"), {
    type: "application/json",
    subtype: "json",
    parameters: {}
  });
  assert.equal("charset" in parseContentType("text/html"), false, "charset is absent, not undefined, when absent");
  assert.deepEqual(parseContentType("text/html"), {
    type: "text/html",
    subtype: "html",
    parameters: {}
  });
  assert.deepEqual(
    parseContentType('multipart/form-data; boundary="abc"'),
    {
      type: "multipart/form-data",
      subtype: "form-data",
      parameters: { boundary: "abc" }
    },
    "a quoted parameter value is unquoted"
  );

  assert.equal(parseContentType(""), null);
  assert.equal(parseContentType("nonsense"), null, "a media type needs a slash");
  assert.equal(parseContentType("application/"), null);
  assert.equal(parseContentType(null), null);
});

test("negotiateContentType picks the first acceptable type", () => {
  const offer = { accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8" };

  assert.equal(negotiateContentType(["application/json"], offer), "application/json");
  assert.equal(negotiateContentType(["text/html", "application/json"], offer), "text/html", "client order wins on a tie");
  assert.equal(
    negotiateContentType(["image/png"], offer),
    "image/png",
    "the permissive wildcard at q=0.8 accepts anything the client has not excluded"
  );
  assert.equal(negotiateContentType([], offer), null);
  assert.equal(negotiateContentType(["application/json"], { accept: "" }), "application/json", "an empty header means anything goes");
  assert.equal(negotiateContentType(["application/json"], {}), "application/json", "a missing header means anything goes");
  assert.equal(negotiateContentType(["application/json"], null), "application/json");

  assert.equal(negotiateContentType(["application/json"], { accept: "application/*" }), "application/json", "a subtype wildcard matches");
  assert.equal(negotiateContentType(["application/json"], { accept: "text/*" }), null, "a non-matching wildcard does not");
  assert.equal(negotiateContentType(["application/json"], { accept: "application/json;q=0" }), null, "q=0 rejects the type");
  assert.equal(
    negotiateContentType(["application/json", "text/html"], { accept: "text/html;q=0.1,application/json;q=0.9" }),
    "application/json",
    "the highest q wins regardless of client order"
  );
  assert.equal(negotiateContentType(["application/json"], { accept: "garbage" }), null, "an unparsable header matches nothing");
});

test("negotiateContentType validates its arguments", () => {
  assert.throws(() => negotiateContentType("application/json", {}), /HttpError|available|must be an array/);
  assert.throws(() => negotiateContentType(["application/json"], { accept: 42 }), /HttpError|accept/);
});

test("HttpError carries a stable code and context", () => {
  const error = new HttpError("HTTP_INVALID_STATUS", "Expected a valid HTTP status.", { received: 0 });

  assert.ok(error instanceof HttpError);
  assert.ok(error instanceof Error);
  assert.equal(error.name, "HttpError");
  assert.equal(error.code, "HTTP_INVALID_STATUS");
  assert.equal(error.message, "Expected a valid HTTP status.");
  assert.deepEqual(error.details, { received: 0 });
});
test("calculateBackoffDelay refuses non-numeric options", () => {
  const base = { baseMs: 100, factor: 2, maxMs: 1000 };

  assert.throws(() => calculateBackoffDelay(0, { ...base, baseMs: "100" }), /HttpError|baseMs/);
  assert.throws(() => calculateBackoffDelay(0, { ...base, factor: "2" }), /HttpError|factor/);
  assert.throws(() => calculateBackoffDelay(0, { ...base, maxMs: NaN }), /HttpError|maxMs/);
  assert.throws(() => calculateBackoffDelay(0, { ...base, maxMs: Infinity }), /HttpError|maxMs/);
  assert.throws(() => calculateBackoffDelay(0, { ...base, baseMs: Infinity }), /HttpError|baseMs/);

  assert.equal(typeof calculateBackoffDelay(0, base), "number", "a valid configuration is unaffected");
});

test("negotiateContentType prefers an exact match over a higher-quality wildcard", () => {
  // The client accepts anything at q=0.5 but names JSON at q=0.4, so an exact match
  // for the offered JSON beats a wildcard over the same candidate set.
  assert.equal(
    negotiateContentType(["application/json"], { accept: "application/json;q=0.4,*/*;q=0.5" }),
    "application/json",
    "the candidate is the same either way"
  );
  assert.equal(
    negotiateContentType(["text/html", "application/json"], { accept: "*/*;q=0.9,text/html;q=0.5" }),
    "text/html",
    "the higher quality range wins for the server's first candidate"
  );
  assert.equal(
    negotiateContentType(["application/xml", "text/html"], { accept: "text/html" }),
    "text/html",
    "an unmatched candidate is never chosen"
  );
});

test("negotiateContentType handles suffixes and structured wildcards", () => {
  assert.equal(negotiateContentType(["application/vnd.api+json"], { accept: "application/json" }), null,
    "a structured suffix is not treated as a subtype wildcard");
  assert.equal(
    negotiateContentType(["application/vnd.api+json"], { accept: "application/vnd.api+json" }),
    "application/vnd.api+json"
  );
  assert.equal(negotiateContentType(["text/html"], { accept: "TEXT/HTML" }), "text/html", "the header is case-insensitive");
  assert.equal(negotiateContentType(["application/json"], { accept: "text/html;q=bogus" }), null,
    "an unparsable q is treated as zero");
});

test("getStatusText covers the codes an application actually meets", () => {
  for (const [status, text] of Object.entries({
    200: "OK",
    204: "No Content",
    301: "Moved Permanently",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout"
  })) {
    assert.equal(getStatusText(Number(status)), text, `status ${status}`);
  }
});

test("normalizeHeaderName and parseContentType handle non-string input", () => {
  assert.equal(normalizeHeaderName(undefined), "");
  assert.equal(normalizeHeaderName(42), "");
  assert.equal(normalizeHeaderName({}), "");

  assert.equal(parseContentType(undefined), null);
  assert.equal(parseContentType(42), null);
  assert.equal(parseContentType({}), null);
  assert.deepEqual(parseContentType("application/json;"), {
    type: "application/json",
    subtype: "json",
    parameters: {}
  }, "a trailing semicolon is tolerated");
  assert.deepEqual(parseContentType("application/json; charset"), {
    type: "application/json",
    subtype: "json",
    parameters: {}
  }, "a parameter with no value is skipped");
});