# @jdsalasc/solvejs-errors

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-errors)](https://www.npmjs.com/package/@jdsalasc/solvejs-errors)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-errors)](https://www.npmjs.com/package/@jdsalasc/solvejs-errors)

Zero-dependency application errors with stable machine-readable codes, HTTP status mapping, cause chaining, and safe-to-log serialisation.

## Utilities

- `AppError`
- `createError`
- `isAppError`
- `getErrorCode`
- `getStatusForCode`
- `normalizeError`
- `asError`
- `serializeError`
- `errorToResponse`
- `toResult`
- `aggregateErrors`

## When to use this package

Use it at a service or API boundary, where a thrown value has to become a response a client can
branch on and a log line you can grep. The point is the **code**: a stable identifier you can map in
a frontend, while the message stays free to change.

## Install

```bash
npm i @jdsalasc/solvejs-errors
```

## Quick example

```ts
import { createError, normalizeError, errorToResponse, toResult } from "@jdsalasc/solvejs-errors";

try {
  const user = await db.findUser(id);
  if (!user) throw createError("NOT_FOUND", `No user with id ${id}.`, { details: { id } });
  return user;
} catch (error) {
  const { status, body } = errorToResponse(error);
  return Response.json(body, { status });
}
```

## Codes and statuses

| Code | Status |
|---|---|
| `BAD_REQUEST` | 400 |
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `VALIDATION_FAILED` | 422 |
| `RATE_LIMITED` | 429 |
| `INTERNAL` | 500 |
| `SERVICE_UNAVAILABLE` | 503 |
| `TIMEOUT` | 504 |

An unknown code maps to `500`, never to a success status, so a typo cannot leak a 200.

## Branch on the code, never the message

```ts
if (getErrorCode(error) === "NOT_FOUND") return null;
```

The message is for humans and may be reworded in any release. The code is the contract.

## normalizeError at the boundary

`normalizeError` turns anything into an `AppError` and keeps the original as the cause, so a driver
or framework error never reaches a client:

```ts
catch (error) {
  throw normalizeError(error, { code: "SERVICE_UNAVAILABLE" });
}
```

An `AppError` passes through untouched, so wrapping twice is safe.

## toResult when you would rather not throw

```ts
const result = toResult(() => JSON.parse(text));
if (!result.ok) return result.error;
```

Works with async functions too, returning a promise of the same union.

## Serialisation is safe by default

`serializeError` never includes a stack or a cause, because both can carry paths, hostnames or
credentials:

```ts
serializeError(createError("NOT_FOUND", "No such user."));
// { error: { code: "NOT_FOUND", message: "No such user.", status: 404 } }
```

Opt into more when you control the destination:

```ts
serializeError(error, { includeCause: true, mask: /password is \w+/ });
```

## Limitations and Constraints

### Details are machine context, not a client payload

`details` holds whatever you put there and is serialised as-is. Keep identifiers in it, not secrets,
because it is included in the payload when non-empty.

### A mask only replaces the pattern you give it

`{ mask: /password/i }` turns "db password is hunter2" into "db [redacted] is hunter2". The secret
survives unless your pattern covers it. Prefer masking a whole credential pattern.

### aggregateErrors keeps the first code

The combined error takes its code and status from the first entry, so the response reflects the first
failure. Every code and message is still available in `details.errors`. The default message counts
the failures rather than concatenating them, which keeps a message short.

### toResult returns a union, it does not narrow for you

TypeScript cannot narrow a union held in a plain value without a type guard, so check `result.ok`
before reading `result.value`.

### createError throws on an unknown code

That is deliberate: a typo in a code should fail at the throw site, not at the client. Use
`normalizeError` with an explicit `code` only from a fixed set too.
### Creating an error is not free, so do not do it in a hot path

Measured on this repository's benchmark, 100,000 iterations:

| Operation | Total | Per call |
| --- | --- | --- |
| `money.fromDecimal` | 31ms | 0.3us |
| `pagination.offsetToCursor` | 2ms | 0.02us |
| `errors.createError` | 1895ms | 19us |
| `errors.normalizeError` | 2991ms | 30us |

The gap is V8 capturing a stack trace on every `new Error()`, which no amount of tuning in this
package removes. In a request path that is fine; inside a loop over a million rows it is not. Throw
the code and build the `AppError` once at the boundary:

```ts
// In a loop, return or record a code instead of allocating an error per row.
const failures = rows.filter((row) => !isValid(row)).map((row) => row.code);

// At the boundary, turn them into one error.
throw aggregateErrors(failures.map((code) => createError(code)), "Validation failed.");
```

`toResult` does not avoid the cost either, because it still constructs an `AppError` on failure. It
buys you the absence of a `try`/`catch`, not speed.
