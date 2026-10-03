# @jdsalasc/solvejs-http

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-http)](https://www.npmjs.com/package/@jdsalasc/solvejs-http)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-http)](https://www.npmjs.com/package/@jdsalasc/solvejs-http)

Zero-dependency HTTP utilities for status classification, retryability, backoff, headers and content negotiation.

## Utilities

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
import { isRetryableStatus, isRetryableError, calculateBackoffDelay, negotiateContentType } from "@jdsalasc/solvejs-http";

isRetryableStatus(503);                       // true
isRetryableStatus(400);                       // false
isRetryableError({ code: "ECONNRESET" });     // true

calculateBackoffDelay(0, { baseMs: 100, factor: 2, maxMs: 30_000 });  // 50 to 100ms, jittered

negotiateContentType(["application/json"], { accept: "text/html,application/json;q=0.9" });
// "application/json"
```

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