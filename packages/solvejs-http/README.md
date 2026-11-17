# @jdsalasc/solvejs-http

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-http)](https://www.npmjs.com/package/@jdsalasc/solvejs-http)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-http)](https://www.npmjs.com/package/@jdsalasc/solvejs-http)

> **Live documentation:** [run this package's examples in your browser](https://jdsalasca.github.io/solvejs/live/#pkg-http).

Zero-dependency HTTP helpers for resilient clients: a typed JSON `fetch` wrapper with timeout and abort support, status text, retryable status and error classification, exponential backoff with jitter, header normalization, and content-type negotiation. Works with `fetch`, Axios, or any client that exposes a status code.

## Utilities

- `fetchJson`
- `getStatusText`
- `isIdempotentMethod`
- `isRetryableStatus`
- `isRetryableError`
- `calculateBackoffDelay`
- `normalizeHeaderName`
- `parseContentType`
- `negotiateContentType`
- `HttpError`

## When to use this package

Use it in the client and server plumbing every API needs and nobody enjoys writing twice: deciding
whether a failed request is worth retrying, spacing retries out, and picking a response content type
that the caller will accept.

## Install

```bash
npm i @jdsalasc/solvejs-http
```

## Quick example

```ts
import { calculateBackoffDelay, fetchJson, isRetryableStatus, isRetryableError, negotiateContentType } from "@jdsalasc/solvejs-http";

const { data, status } = await fetchJson<{ id: string }>("https://api.example.com/users/1");
await fetchJson("https://api.example.com/users", {
  body: { name: "Ada" },
  timeoutMs: 5_000
});

isRetryableStatus(503);                       // true
isRetryableStatus(400);                       // false
isRetryableError({ code: "ECONNRESET" });     // true

calculateBackoffDelay(0, { baseMs: 100, factor: 2, maxMs: 30_000 });  // 50 to 100ms, jittered

negotiateContentType(["application/json"], { accept: "text/html,application/json;q=0.9" });
// "application/json"
```

## JSON requests with `fetchJson`

`fetchJson` wraps the platform `fetch`: it serialises object bodies as JSON, sets `Accept` and `Content-Type`, applies a timeout, forwards an external `AbortSignal`, and returns `{ data, status, headers, url }`. A body without an explicit method uses `POST`; otherwise the default is `GET`.

```ts
const { data } = await fetchJson<{ id: string; name: string }>(
  "https://api.example.com/users",
  {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { name: "Ada" },
    timeoutMs: 8_000
  }
);
```

Non-2xx responses throw `HttpError` with `code: "HTTP_REQUEST_FAILED"` and `details.status` plus a bounded response body. A timeout is `HTTP_TIMEOUT`, malformed JSON is `HTTP_INVALID_RESPONSE`, and transport failures are `HTTP_REQUEST_FAILED`. Empty `204` responses return `data: undefined`. Use `@jdsalasc/solvejs-async` `retry` with `isRetryableStatus` or `isRetryableError` when you want retries; `fetchJson` deliberately performs one request.

## Retryable statuses

`408`, `425`, `429`, `500`, `502`, `503` and `504`. Anything else, including an unknown code, is not
retried, so a surprise status never turns into a retry loop.

## Retryable errors

A thrown value is retryable when it carries a retryable `status`, the name `AbortError`, a transport
error code (`ECONNRESET`, `ETIMEDOUT`, `ECONNREFUSED`, `EAI_AGAIN`, `EPIPE`), or is Node's
`TypeError: fetch failed`. `ENOTFOUND` is deliberately **not** retryable: a wrong hostname will not
fix itself.

An explicit `status` on the value always wins over its error code.

## Backoff

Exponential growth from `baseMs` by `factor`, capped at `maxMs`. With jitter on, the delay lands
uniformly in the half-to-full band, which spreads a thundering herd without ever exceeding the
nominal delay:

```ts
calculateBackoffDelay(0, { baseMs: 100, factor: 2, maxMs: 10_000, jitter: false }); // 100
calculateBackoffDelay(2, { baseMs: 100, factor: 2, maxMs: 10_000, jitter: false }); // 400
calculateBackoffDelay(9, { baseMs: 100, factor: 2, maxMs: 10_000, jitter: false }); // 10000
```

## Content negotiation

Quality values, a subtype wildcard and the fully permissive wildcard are all honoured. An exact match
beats a wildcard at the same quality, and a tie keeps the **server's** order, which is how a server
expresses its own preference:

```ts
negotiateContentType(["text/html", "application/json"], { accept: "text/html,application/json;q=0.9" });
// "text/html", the client listed it first and the q values do not overturn a tie

negotiateContentType(["text/html", "application/json"], { accept: "text/html;q=0.1,application/json;q=0.9" });
// "application/json", the higher quality wins
```

## Limitations and Constraints

### A permissive wildcard means anything is acceptable

With `Accept: */*;q=0.8`, `negotiateContentType(["image/png"], ...)` returns `"image/png"`. That is
correct HTTP, and it is why you should order `available` by your own preference.

### q=0 rejects a type outright

`Accept: application/json;q=0` will not yield `application/json`, which is how a client says "not this
one". An unparsable `q` is treated as zero rather than as one.

### A structured suffix is not a wildcard

`application/vnd.api+json` matches only itself. It is not treated as matching `application/json`, so
list the vendor type explicitly if that is what you serve.

### Methods are not trimmed

`isIdempotentMethod(" get ")` is `false`. A padded method is treated as unknown rather than guessed,
so a formatting bug in a caller shows up instead of being papered over.

### Only codes in the registry have a reason phrase

`getStatusText(599)` is `""`, not a guess. The table covers the codes an application meets; an unusual
code is better rendered by your own table than by a wrong phrase.

### Jitter uses Math.random

`calculateBackoffDelay` is not deterministic when jitter is on, which is the point. Pass
`jitter: false` in a test that needs a fixed delay.

## Review notes

- Quoted `Content-Type` parameters may contain semicolons without splitting the header.
