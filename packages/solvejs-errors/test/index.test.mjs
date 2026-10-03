import test from "node:test";
import assert from "node:assert/strict";
import {
  AppError,
  aggregateErrors,
  asError,
  createError,
  errorToResponse,
  getErrorCode,
  getStatusForCode,
  isAppError,
  normalizeError,
  serializeError,
  toResult
} from "../dist/esm/index.js";

test("createError builds an AppError with a code and status", () => {
  const error = createError("VALIDATION_FAILED", "The request body is invalid.", {
    status: 422,
    details: { field: "email" },
    cause: new Error("root cause")
  });

  assert.ok(error instanceof AppError);
  assert.ok(error instanceof Error);
  assert.equal(error.name, "AppError");
  assert.equal(error.code, "VALIDATION_FAILED");
  assert.equal(error.status, 422);
  assert.equal(error.message, "The request body is invalid.");
  assert.deepEqual(error.details, { field: "email" });
  assert.ok(error.cause instanceof Error);
  assert.ok(error instanceof TypeError === false);
});

test("createError infers the status from the code", () => {
  assert.equal(createError("VALIDATION_FAILED").status, 422);
  assert.equal(createError("NOT_FOUND").status, 404);
  assert.equal(createError("UNAUTHORIZED").status, 401);
  assert.equal(createError("FORBIDDEN").status, 403);
  assert.equal(createError("CONFLICT").status, 409);
  assert.equal(createError("RATE_LIMITED").status, 429);
  assert.equal(createError("INTERNAL").status, 500);
  assert.equal(createError("BAD_REQUEST").status, 400);

  assert.equal(
    createError("VALIDATION_FAILED", undefined, { status: 418 }).status,
    418,
    "an explicit status wins"
  );
});

test("createError validates the code and the status", () => {
  assert.throws(() => createError("NOT_A_CODE"), /AppError|code/i);
  assert.throws(() => createError(""), /AppError|code/i);
  assert.throws(() => createError(null), /AppError|code/i);
  assert.throws(() => createError("INTERNAL", "x", { status: 99 }), /AppError|status/);
  assert.throws(() => createError("INTERNAL", "x", { status: 600 }), /AppError|status/);
  assert.throws(() => createError("INTERNAL", "x", { status: 1.5 }), /AppError|status/);
  assert.equal(createError("INTERNAL", "x", { status: 200 }).status, 200, "2xx is a legal status");
});

test("isAppError and getErrorCode", () => {
  const error = createError("NOT_FOUND", "No such user.");

  assert.equal(isAppError(error), true);
  assert.equal(isAppError(new Error("plain")), false);
  assert.equal(isAppError(null), false);
  assert.equal(isAppError("NOT_FOUND"), false);

  assert.equal(getErrorCode(error), "NOT_FOUND");
  assert.equal(getErrorCode(new Error("plain")), "INTERNAL", "an unknown error reads as INTERNAL");
  assert.equal(getErrorCode(null), "INTERNAL");
});

test("getStatusForCode", () => {
  assert.equal(getStatusForCode("NOT_FOUND"), 404);
  assert.equal(getStatusForCode("VALIDATION_FAILED"), 422);
  assert.equal(getStatusForCode("RATE_LIMITED"), 429);
  assert.equal(getStatusForCode("INTERNAL"), 500);
  assert.equal(getStatusForCode("NOT_A_CODE"), 500, "an unknown code maps to 500, never to 200");
});

test("normalizeError turns anything into an AppError", () => {
  const already = createError("NOT_FOUND");
  assert.equal(normalizeError(already), already, "an AppError passes through untouched");

  const fromPlain = normalizeError(new TypeError("boom"));
  assert.ok(isAppError(fromPlain));
  assert.equal(fromPlain.code, "INTERNAL");
  assert.equal(fromPlain.status, 500);
  assert.ok(fromPlain.cause instanceof TypeError, "the original error becomes the cause");
  assert.equal(fromPlain.message, "boom", "the original message is preserved");

  const fromString = normalizeError("something failed");
  assert.ok(isAppError(fromString));
  assert.equal(fromString.message, "something failed");

  const fromNothing = normalizeError(undefined);
  assert.ok(isAppError(fromNothing));
  assert.equal(fromNothing.code, "INTERNAL");
  assert.equal(fromNothing.message.length > 0, true, "a fallback message is supplied");

  const nested = normalizeError(new Error("outer", { cause: new Error("inner") }));
  assert.equal(nested.message, "outer");
  assert.ok(nested.cause instanceof Error);
});

test("normalizeError can remap a code while keeping the original as the cause", () => {
  const remapped = normalizeError(new Error("db down"), { code: "SERVICE_UNAVAILABLE" });

  assert.equal(remapped.code, "SERVICE_UNAVAILABLE");
  assert.equal(remapped.status, 503);
  assert.ok(remapped.cause instanceof Error);
  assert.equal(remapped.cause.message, "db down");
});

test("asError is a typed alias for normalizeError", () => {
  const error = asError(new Error("x"));
  assert.ok(error instanceof AppError);
  assert.equal(asError(error), error);
});

test("serializeError produces a safe payload", () => {
  const payload = serializeError(createError("VALIDATION_FAILED", "Bad input.", { details: { field: "email" } }));

  assert.deepEqual(payload, {
    error: {
      code: "VALIDATION_FAILED",
      message: "Bad input.",
      status: 422,
      details: { field: "email" }
    }
  });
  assert.equal("stack" in payload.error, false, "a stack never reaches a client");
  assert.equal("cause" in payload.error, false, "a cause never reaches a client");
});

test("serializeError omits empty details and includes the cause chain when asked", () => {
  const plain = serializeError(new Error("boom"));
  assert.deepEqual(plain, { error: { code: "INTERNAL", message: "boom", status: 500 } });
  assert.equal("details" in plain.error, false);

  const chained = serializeError(createError("INTERNAL", "outer", { cause: new Error("inner") }), {
    includeCause: true
  });
  assert.equal(chained.error.cause?.message, "inner");
  assert.equal("stack" in (chained.error.cause ?? {}), false);
});

test("serializeError masks secrets when asked", () => {
  // A mask replaces the pattern you give it. Cover the whole secret to remove it.
  const secret = new Error("db password is hunter2");

  const partial = serializeError(secret, { mask: /password/i, replacement: "[redacted]" });
  assert.equal(partial.error.message, "db [redacted] is hunter2", "the pattern is replaced, the rest is kept");

  const full = serializeError(secret, { mask: /password is hunter2/, replacement: "[redacted]" });
  assert.equal(full.error.message, "db [redacted]");
  assert.equal(full.error.message.includes("hunter2"), false, "the secret is gone when the mask covers it");

  const defaultReplacement = serializeError(secret, { mask: /password is hunter2/ });
  assert.equal(defaultReplacement.error.message, "db [redacted]", "the replacement defaults to [redacted]");

  const causeMasked = serializeError(createError("INTERNAL", "outer", { cause: secret }), {
    mask: /hunter2/,
    includeCause: true
  });
  assert.equal(causeMasked.error.message.includes("hunter2"), false);
  assert.equal(causeMasked.error.cause?.message.includes("hunter2"), false, "the cause is masked too");
});

test("errorToResponse builds an HTTP body and status", () => {
  const response = errorToResponse(createError("NOT_FOUND", "No such user."));

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: { code: "NOT_FOUND", message: "No such user.", status: 404 } });
  assert.equal(response.headers["content-type"], "application/json");

  const plain = errorToResponse(new Error("boom"));
  assert.equal(plain.status, 500);
  assert.equal(plain.body.error.code, "INTERNAL");
});

test("toResult turns a throw into a discriminated union", () => {
  const ok = toResult(() => 42);
  assert.deepEqual(ok, { ok: true, value: 42 });

  const failed = toResult(() => {
    throw createError("NOT_FOUND", "nope");
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.error.code, "NOT_FOUND");
  assert.equal(failed.error.status, 404);

  const sync = toResult(() => {
    throw new Error("sync boom");
  });
  assert.equal(sync.ok, false);
  assert.equal(sync.error.code, "INTERNAL");
});

test("toResult awaits an async function and narrows nothing on its own", async () => {
  const ok = await toResult(async () => "value");
  assert.deepEqual(ok, { ok: true, value: "value" });

  const failed = await toResult(async () => {
    throw createError("CONFLICT", "already exists");
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.error.message, "already exists");
});

test("aggregateErrors keeps every failure", () => {
  const one = createError("VALIDATION_FAILED", "first");
  const two = createError("NOT_FOUND", "second");

  const combined = aggregateErrors([one, two]);

  assert.ok(combined instanceof AppError);
  assert.equal(combined.code, "VALIDATION_FAILED", "the first error decides the code");
  assert.equal(combined.status, 422);
  assert.equal(combined.message, "2 errors occurred.", "the default message counts rather than concatenating");
  assert.equal(combined.details.errors.length, 2);
  assert.deepEqual(combined.details.errors[0], { code: "VALIDATION_FAILED", message: "first" });
  assert.deepEqual(combined.details.errors[1], { code: "NOT_FOUND", message: "second" });

  const custom = aggregateErrors([one, two], "Validation failed.");
  assert.equal(custom.message, "Validation failed.");

  const single = aggregateErrors([one]);
  assert.equal(single.message, "1 error occurred.", "the default message is singular for one error");

  const empty = aggregateErrors([]);
  assert.equal(empty.code, "INTERNAL");
  assert.equal(empty.message, "0 errors occurred.");
  assert.equal(empty.details.errors.length, 0);

  const normalised = aggregateErrors([new Error("plain")]);
  assert.deepEqual(normalised.details.errors[0], { code: "INTERNAL", message: "plain" }, "plain errors are normalised first");
});

test("AppError keeps a prototype chain that survives instanceof after a transpile", () => {
  const error = createError("INTERNAL");
  assert.ok(error instanceof AppError);
  assert.ok(error instanceof Error);
  assert.equal(Object.prototype.toString.call(error), "[object Error]");
  assert.equal(String(error).includes("INTERNAL"), true, "the string form carries the code");
});

test("every documented code maps to a status", () => {
  const codes = [
    "BAD_REQUEST",
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "CONFLICT",
    "VALIDATION_FAILED",
    "RATE_LIMITED",
    "SERVICE_UNAVAILABLE",
    "TIMEOUT",
    "INTERNAL"
  ];

  for (const code of codes) {
    const status = getStatusForCode(code);
    assert.equal(status >= 400 && status <= 599, true, `${code} must map to an error status, got ${status}`);
    assert.equal(createError(code).status, status, `${code} must default to its mapped status`);
  }
});
test("serializeError handles a cause that is not an Error", () => {
  const withStringCause = serializeError(createError("INTERNAL", "outer", { cause: "just a string" }), {
    includeCause: true
  });
  assert.equal(withStringCause.error.cause.message, "just a string", "a non-Error cause is stringified");
  assert.equal("code" in withStringCause.error.cause, false, "and carries no code");

  const withObjectCause = serializeError(createError("INTERNAL", "outer", { cause: { hint: 1 } }), {
    includeCause: true
  });
  assert.equal(withObjectCause.error.cause.message, "[object Object]");

  const withAppErrorCause = serializeError(
    createError("INTERNAL", "outer", { cause: createError("TIMEOUT", "inner") }),
    { includeCause: true }
  );
  assert.equal(withAppErrorCause.error.cause.code, "TIMEOUT", "an AppError cause reports its code");
  assert.equal(withAppErrorCause.error.cause.message, "inner");

  assert.equal("cause" in serializeError(createError("NOT_FOUND")).error, false, "no cause means no cause key");
  assert.equal(
    "cause" in serializeError(createError("NOT_FOUND", "x", { cause: new Error("y") })).error,
    false,
    "a cause stays hidden unless includeCause is set"
  );
});

test("serializeError masks a non-Error cause and honours a custom replacement", () => {
  const masked = serializeError(createError("INTERNAL", "outer", { cause: "token=secret" }), {
    includeCause: true,
    mask: /secret/
  });
  assert.equal(masked.error.cause.message, "token=[redacted]");

  const custom = serializeError(createError("INTERNAL", "outer", { cause: "token=secret" }), {
    includeCause: true,
    mask: /secret/,
    replacement: "***"
  });
  assert.equal(custom.error.cause.message, "token=***", "replacement overrides the default text");
});

test("normalizeError can override the code of an existing AppError", () => {
  const original = createError("INTERNAL", "boom", { status: 503, details: { a: 1 } });
  const remapped = normalizeError(original, { code: "SERVICE_UNAVAILABLE" });

  assert.notEqual(remapped, original, "an override produces a new error, it does not mutate");
  assert.equal(remapped.code, "SERVICE_UNAVAILABLE");
  assert.equal(remapped.message, "boom", "the message is carried over");
  assert.equal(remapped.status, 503, "the original status is kept when none is given");
  assert.deepEqual(remapped.details, { a: 1 }, "the original details are kept when none are given");
  assert.equal(remapped.cause, undefined, "an AppError is never re-wrapped as its own cause");

  const reresolved = normalizeError(original, { status: 418 });
  assert.equal(reresolved, original, "without a code override the very same instance comes back");
  assert.equal(reresolved.status, 503, "so a status override alone is not applied, pass a code to rebuild");
});

test("normalizeError derives a message from every kind of thrown value", () => {
  assert.equal(normalizeError(new Error("from error")).message, "from error");
  assert.equal(normalizeError("from string").message, "from string");
  assert.equal(normalizeError(42).message, "An unexpected error occurred.", "a number has no message");
  assert.equal(normalizeError(null).message, "An unexpected error occurred.", "null has no message");
  assert.equal(normalizeError(undefined).message, "An unexpected error occurred.");

  assert.equal(normalizeError(42).code, "INTERNAL");
  assert.equal(normalizeError(42).status, 500);
});

test("normalizeError honours an explicit status, details and cause", () => {
  const custom = normalizeError(new Error("x"), { status: 418, details: { hint: "teapot" } });

  assert.equal(custom.status, 418);
  assert.deepEqual(custom.details, { hint: "teapot" });
  assert.ok(custom.cause instanceof Error, "a plain Error is kept as the cause");

  const withExplicitCause = normalizeError("plain string", { cause: new Error("explicit") });
  assert.ok(withExplicitCause.cause instanceof Error);
  assert.equal(withExplicitCause.cause.message, "explicit", "a string has no cause of its own");

  const overridden = normalizeError(new Error("outer"), { cause: new Error("chosen") });
  assert.equal(overridden.cause.message, "chosen", "an explicit cause wins over the thrown value");
});

test("getStatusForCode refuses anything that is not one of the codes", () => {
  assert.equal(getStatusForCode(""), 500);
  assert.equal(getStatusForCode(null), 500);
  assert.equal(getStatusForCode(undefined), 500);
  assert.equal(getStatusForCode(404), 500, "a number is not a code");
  assert.equal(getStatusForCode("not_found"), 500, "the shape is not the value");
  assert.equal(getStatusForCode("NOT_FOUND"), 404, "the known path still works");
});

test("an AppError built with an unknown code still lands on a 500", () => {
  // createError refuses this, but a JavaScript caller can construct one directly, and a bad code
  // must never be able to produce a 2xx status.
  const rogue = new AppError("TOTALLY_MADE_UP", "msg");
  assert.equal(rogue.status, 500);
  assert.equal(getStatusForCode(rogue.code), 500, "and the lookup agrees");
});

test("errorToResponse forwards serialisation options", () => {
  const withCause = errorToResponse(createError("INTERNAL", "outer", { cause: new Error("inner") }), {
    includeCause: true
  });
  assert.equal(withCause.status, 500);
  assert.equal(withCause.headers["content-type"], "application/json");
  assert.equal(withCause.body.error.cause.message, "inner");

  const masked = errorToResponse(new Error("token=secret"), { mask: /secret/ });
  assert.equal(masked.body.error.message.includes("secret"), false);
  assert.equal("cause" in masked.body.error, false, "the cause of a plain Error never leaks");

  const notFound = errorToResponse(createError("NOT_FOUND"));
  assert.equal(notFound.status, 404);
});

test("toResult passes a thrown AppError through untouched", () => {
  const failed = toResult(() => {
    throw createError("CONFLICT", "exists", { details: { id: 1 } });
  });

  assert.equal(failed.ok, false);
  assert.equal(failed.error.code, "CONFLICT");
  assert.equal(failed.error.details.id, 1, "details survive the trip");
  assert.equal(failed.error.cause, undefined, "an AppError thrown as-is keeps no cause");

  const succeeded = toResult(() => 7);
  assert.deepEqual(succeeded, { ok: true, value: 7 });
});

test("asError is normalizeError under a friendlier name", () => {
  const error = asError(new Error("x"), { code: "TIMEOUT", status: 504 });
  assert.equal(error.code, "TIMEOUT");
  assert.equal(error.status, 504);

  const plain = asError("string");
  assert.equal(plain.code, "INTERNAL");
  assert.equal(plain.message, "string");
  assert.ok(asError(createError("FORBIDDEN")) instanceof AppError, "asError always yields an AppError");
});

test("createError refuses a status that is not a number", () => {
  assert.throws(() => createError("INTERNAL", "x", { status: "200" }), /status/);
  assert.throws(() => createError("INTERNAL", "x", { status: null }), /status/);
  assert.throws(() => createError("INTERNAL", "x", { status: true }), /status/);
  assert.throws(() => createError("INTERNAL", "x", { status: NaN }), /status/);
});

test("createError rejects an unknown code with the full list of valid ones", () => {
  assert.throws(() => createError("nope"), /BAD_REQUEST/);
  try {
    createError("nope");
  } catch (error) {
    assert.ok(error instanceof TypeError, "an unknown code is a programming error, not a runtime one");
    assert.match(error.message, /NOT_FOUND/, "the message lists the codes you can use");
  }
});

test("getErrorCode falls back to INTERNAL for anything that is not an AppError", () => {
  assert.equal(getErrorCode(createError("RATE_LIMITED")), "RATE_LIMITED");
  assert.equal(getErrorCode(new Error("x")), "INTERNAL");
  assert.equal(getErrorCode({ code: "NOT_FOUND" }), "INTERNAL", "a lookalike object is not an AppError");
  assert.equal(getErrorCode(undefined), "INTERNAL");
});

test("an AppError toString is stable and never throws on an odd message", () => {
  assert.equal(createError("NOT_FOUND", "No such user.").toString(), "AppError [NOT_FOUND]: No such user.");
  assert.equal(createError("NOT_FOUND").toString(), "AppError [NOT_FOUND]: NOT_FOUND",
    "a default message is the code itself");
  assert.ok(createError("INTERNAL", "x") instanceof Error, "it is still a real Error");
  assert.equal(createError("INTERNAL", "x").name, "AppError");
});

test("instanceof survives a subclass, because the prototype is repaired on purpose", () => {
  class Conflict extends AppError {
    constructor(message) {
      super("CONFLICT", message);
      this.name = "Conflict";
    }
  }
  const error = new Conflict("already exists");

  assert.ok(error instanceof Conflict);
  assert.ok(error instanceof AppError, "the subclass is still an AppError");
  assert.ok(isAppError(error));
  assert.equal(getErrorCode(error), "CONFLICT");
  assert.equal(error.toString(), "Conflict [CONFLICT]: already exists");
});
