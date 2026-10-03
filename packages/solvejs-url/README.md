# @jdsalasc/solvejs-url

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-url)](https://www.npmjs.com/package/@jdsalasc/solvejs-url)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-url)](https://www.npmjs.com/package/@jdsalasc/solvejs-url)

Zero-dependency URL utilities for building URLs, merging and parsing query strings, and replacing path parameters.

## Utilities

- `buildUrl`
- `joinUrl`
- `stringifyQuery`
- `parseQuery`
- `withQuery`
- `omitQuery`
- `getUrlParam`
- `replacePathParam`
- `UrlError`

## When to use this package

Use it when you assemble URLs from configuration, add or strip query parameters in an API client, build a
cache key from request parameters, or fill `:name` placeholders in a route template. `solvejs-validators`
tells you whether a URL is well formed and `solvejs-env` reads one from configuration; this package is
what builds and rewrites them.

## Install

```bash
npm i @jdsalasc/solvejs-url
```

## Quick example

```ts
import { buildUrl, parseQuery, withQuery, omitQuery, replacePathParam } from "@jdsalasc/solvejs-url";

buildUrl("https://api.example.com", { path: "users", query: { page: 2 }, hash: "top" });
// "https://api.example.com/users?page=2#top"

parseQuery("?q=hello+world&tag=a&tag=b");
// { q: "hello world", tag: ["a", "b"] }

withQuery("https://example.com/search?page=1", { page: 2, q: "shoes" });
// "https://example.com/search?page=2&q=shoes"

omitQuery("https://example.com/cb?token=secret&page=2", ["token"]);
// "https://example.com/cb?page=2"

replacePathParam("/users/:id/posts/:postId", "postId", "7");
// "/users/:id/posts/7"
```

## Deterministic query strings

`stringifyQuery` sorts keys alphabetically, and `withQuery` therefore also sorts. Two equal query
objects always produce the same string, which is what makes a URL safe to use as a cache key or to
compare for equality.

```ts
import { stringifyQuery } from "@jdsalasc/solvejs-url";

stringifyQuery({ b: 2, a: 1 }) === stringifyQuery({ a: 1, b: 2 }); // true
```

Anti-pattern: do not use `withQuery` when you need the caller's insertion order preserved. Sorting is
the point, so it cannot be turned off. Build the string yourself if order matters.

## Encoding notes

- Output uses `application/x-www-form-urlencoded`, so a space becomes `+` and not `%20`. This is the
  correct form for a query string and round-trips through `parseQuery`.
- `stringifyQuery` returns a string without a leading `?`. `buildUrl` and `withQuery` add it for you.
- `getUrlParam` returns the **first** value when a key repeats, matching `URLSearchParams.get`. Use
  `parseQuery` when you need every occurrence as an array.
- `getUrlParam` reads a relative or absolute URL and ignores anything after a `#`, so
  `getUrlParam("/x#frag?a=1", "a")` is `null` rather than `"1"`.
- An array value repeats the key: `stringifyQuery({ tag: ["a", "b"] })` is `"tag=a&tag=b"`.

## Errors

Failures throw a `UrlError` with a stable `code` and a `details` object, so you can branch on the code
instead of matching message text.

| Code | Thrown by | Meaning |
|---|---|---|
| `URL_NOT_ABSOLUTE` | `buildUrl`, `withQuery`, `omitQuery` | The input has no scheme, for example `/relative`. |
| `URL_INVALID_BASE` | `buildUrl`, `withQuery`, `omitQuery` | The input has a scheme but no host, for example `https://`. |
| `URL_PATH_PARAM_MISSING` | `replacePathParam` | The path has no `:name` placeholder and `required` was set. |

```ts
import { buildUrl, UrlError } from "@jdsalasc/solvejs-url";

try {
  buildUrl("/relative/path");
} catch (error) {
  if (error instanceof UrlError && error.code === "URL_NOT_ABSOLUTE") {
    console.log(error.details.received); // "/relative/path"
  }
}
```

## Limitations and Constraints

- `buildUrl`, `withQuery`, and `omitQuery` require an absolute URL with a scheme and a host. Relative
  URLs are rejected rather than guessed, because guessing a base is where wrong-request bugs start.
- `parseQuery` does not validate semantics. It returns strings, so a key expected to be a number needs
  your own conversion.
- `replacePathParam` replaces the first occurrence of `:name` and only when the token is a full
  segment boundary-free match, so a template like `/a:id` will replace inside `id`-prefixed text too.
  Keep placeholders as their own path segment.
- A `:name` token inside an existing query value is not replaced; the function only sees the path.
