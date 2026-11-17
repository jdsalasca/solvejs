# @jdsalasc/solvejs-json

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-json)](https://www.npmjs.com/package/@jdsalasc/solvejs-json)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-json)](https://www.npmjs.com/package/@jdsalasc/solvejs-json)

> **Live documentation:** [run this package's examples in your browser](https://jdsalasca.github.io/solvejs/live/#pkg-json).

Zero-dependency JSON utilities for API boundaries: safe parse and stringify, deterministic stringification, deep clone, structural equality, JSON Pointer, JSON Merge Patch, and prototype-safe merge. Never let a malformed payload take down a request handler.

## Utilities

- `safeJsonParse`
- `safeJsonStringify`
- `stableStringify`
- `deepClone`
- `deepEqual`
- `getJsonPointer`
- `applyMergePatch`
- `jsonMerge`
- `pickJsonKeys`
- `omitJsonKeys`
- `getOrDefault`
- `JsonError`

## When to use this package

Use it at any boundary where untrusted text becomes an object: request bodies, cache keys, webhook
payloads, config files. `safeJsonParse` returns a result instead of throwing, and `stableStringify`
gives you a string you can hash or compare, which plain `JSON.stringify` cannot promise.

## Install

```bash
npm i @jdsalasc/solvejs-json
```

## Quick example

```ts
import { applyMergePatch, getJsonPointer, safeJsonParse, safeJsonStringify, stableStringify, deepEqual, jsonMerge } from "@jdsalasc/solvejs-json";

const parsed = safeJsonParse(request.body);
if (!parsed.ok) return response.status(400).json({ error: parsed.error.code });

stableStringify({ b: 1, a: 2 }); // '{"a":2,"b":1}', always in this order
deepEqual({ a: 1 }, { a: 1 });   // true, key order irrelevant
jsonMerge({ a: { b: 1 } }, { a: { c: 2 } }); // { a: { b: 1, c: 2 } }
getJsonPointer({ user: { name: "Ada" } }, "/user/name"); // "Ada"
applyMergePatch({ a: 1, b: 2 }, { a: null, c: 3 });      // { b: 2, c: 3 }

safeJsonStringify(circular, { fallback: "{}" }); // "{}", no throw
```

## JSON Pointer and Merge Patch

`getJsonPointer` reads RFC 6901 paths, including `~0` and `~1` escaping and array indexes. `applyMergePatch` applies RFC 7386 patches: objects merge, `null` deletes, and arrays or primitives replace. Both are prototype-safe and neither mutates its input.

```ts
getJsonPointer({ "a/b": { "m~n": 2 } }, "/a~1b/m~0n"); // 2
getJsonPointer({ items: ["a"] }, "/items/0");          // "a"
getJsonPointer({ items: ["a"] }, "/items/first");      // throws JSON_INVALID_POINTER

applyMergePatch(
  { name: "Ada", tags: ["math"], address: { city: "London", zip: "N1" } },
  { tags: ["code"], address: { zip: null } }
);
// { name: "Ada", tags: ["code"], address: { city: "London" } }
```

Use JSON Merge Patch for `PATCH` endpoints where the client sends only the fields that changed. It is not a JSON Patch (`op`/`path`/`value`) implementation; use an explicit patch library when you need operations, move or copy.

## safeJsonParse

```ts
safeJsonParse('{"a":1}');           // { ok: true, value: { a: 1 } }
safeJsonParse("{oops}");            // { ok: false, error: JsonError } with code JSON_INVALID
safeJsonParse("{oops}", { fallback: {} }); // {}
```

## Stable stringification

`stableStringify` sorts object keys at every depth, so two structurally equal values always produce
the same text. That is what makes it safe to hash, compare, or use as a cache key.

```ts
stableStringify({ b: 1, a: 2 }) === stableStringify({ a: 2, b: 1 }); // true
```

Array order is preserved, because it carries meaning.

## Errors

| Code | Meaning |
|---|---|
| `JSON_INVALID` | `safeJsonParse` received text that is not valid JSON. |
| `JSON_CIRCULAR` | The value contains a cycle and cannot be serialised. |
| `JSON_UNSERIALISABLE` | Reading the value threw, for example a property getter that raised. |

## Limitations and Constraints

### safeJsonStringify mirrors JSON.stringify, including its omissions

A value with no JSON representation comes back as `undefined` rather than as an error, and a function
or `undefined` property inside an object is silently dropped:

```ts
safeJsonStringify(undefined);         // { ok: true, value: undefined }
safeJsonStringify({ fn: () => 1 });   // { ok: true, value: "{}" }
safeJsonStringify({ a: 1, b: undefined }); // { ok: true, value: '{"a":1}' }
```

So `stableStringify({ a: 1 })` and `stableStringify({ a: 1, b: undefined })` are the same string. If
that distinction matters to you, add a type guard before serialising.

### The fallback option changes the return type

Supplying `fallback` makes the function return the value directly rather than a result object:

```ts
safeJsonParse(text);                    // SafeParseResult<T>
safeJsonParse(text, { fallback: {} });  // the value or {}, never a result object
```

Use the result-object form when you need the error code, and the fallback form when a default is all
you want.

### deepClone drops prototype-polluting keys

`deepClone` skips `__proto__`, `constructor` and `prototype`, so a clone never carries a pollution
payload. A repeated reference stays one shared object in the clone rather than being duplicated.

### deepEqual returns false rather than throwing

If reading a property throws, for example on a lazily evaluated object, `deepEqual` answers `false`
instead of propagating. Two references to the same object always compare `true`, because the identity
check short-circuits before any property is read.

### deepEqual treats NaN as equal and 0 as equal to -0

This differs from `Object.is`, on purpose, because structural comparison usually wants the numeric
reading. Use `Object.is` when you need the distinction.