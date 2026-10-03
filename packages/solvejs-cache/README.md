# @jdsalasc/solvejs-cache

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-cache)](https://www.npmjs.com/package/@jdsalasc/solvejs-cache)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-cache)](https://www.npmjs.com/package/@jdsalasc/solvejs-cache)

Zero-dependency cache utilities for TTL maps, async memoization, LRU eviction, and stale-while-revalidate reads.

## Utilities

- `stableKey`
- `createTtlCache`
- `createLruCache`
- `memoizeAsync`
- `createStaleWhileRevalidate`
- `CacheError`

## When to use this package

Use it when a hot path recomputes the same thing, when an API client should not call the same endpoint
twice in a row, or when a read should keep serving the last good value while a refresh runs. Every
cache takes an injectable clock, so expiry is testable without waiting on real time.

## Install

```bash
npm i @jdsalasc/solvejs-cache
```

## Quick example

```ts
import { createTtlCache, createLruCache, memoizeAsync, createStaleWhileRevalidate } from "@jdsalasc/solvejs-cache";

const flags = createTtlCache<boolean>({ ttlMs: 60_000 });
flags.set("new-checkout", true);
flags.get("new-checkout"); // true, undefined after 60s

const recent = createLruCache<string>({ maxSize: 500 });
recent.set("user:1", "ada");
recent.get("user:1"); // "ada", and the entry is now the most recently used

const loadUser = memoizeAsync(async (id: string) => fetchUser(id));
await loadUser("u1"); // one request
await loadUser("u1"); // served from memory

const readConfig = createStaleWhileRevalidate(fetchConfig, { freshMs: 30_000, staleMs: 300_000 });
await readConfig(); // loads
await readConfig(); // fresh, no reload
```

## Injectable clocks

Every time-dependent function accepts `now`, which is what makes expiry deterministic in tests:

```ts
let now = 1000;
const cache = createTtlCache<string>({ ttlMs: 100, now: () => now });

cache.set("a", "value");
now += 100;
cache.get("a"); // undefined, no timers and no waiting
```

## stableKey

`stableKey` sorts object keys at every depth, so two structurally equal values always produce the
same string regardless of insertion order. That is what makes it safe as a cache key.

```ts
stableKey({ a: 1, b: 2 }) === stableKey({ b: 2, a: 1 }); // true
```

Array order is preserved, because it carries meaning. Functions, symbols and circular references
throw `CacheError` rather than producing a key that silently collides.

## Errors

Failures throw a `CacheError` with a stable `code` and a `details` object.

| Code | Meaning |
|---|---|
| `CACHE_INVALID_OPTION` | A duration or size option is missing, non-finite, or not positive. |
| `CACHE_INVALID_KEY` | A cache key is not a non-empty string. |
| `CACHE_LOADER_FAILED` | Reserved for loader failures surfaced by the stale-while-revalidate wrapper. |

## Limitations and Constraints

### A fractional ttl is valid, a fractional maxSize is not

Durations are milliseconds, so `ttlMs: 1.5` is accepted. `maxSize` counts entries, so it must be a
whole number and `maxSize: 1.5` throws.

### A cached undefined is a hit, not a miss

`has` reports `true` for an entry holding `undefined`, but `get` still returns `undefined`. Use
`has` when you need to tell the two apart.

### memoizeAsync does not cache a rejection

A call that rejects is removed from the cache, so a transient failure is retried rather than pinned
for the whole ttl. Concurrent calls for the same key share one in-flight promise.

### stableKey drops undefined properties, like JSON.stringify

`stableKey({ a: 1, b: undefined })` equals `stableKey({ a: 1 })`. If your loader distinguishes those
two inputs, give `memoizeAsync` an explicit `key` function.

### Entries expire lazily

Nothing runs in the background. An expired entry is removed when it is read, or when `keys` or `size`
is called, so a cache left untouched keeps its expired entries in memory. Call `clear` on shutdown if
that matters.