# @jdsalasc/solvejs-objects

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-objects)](https://www.npmjs.com/package/@jdsalasc/solvejs-objects)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-objects)](https://www.npmjs.com/package/@jdsalasc/solvejs-objects)


Zero-dependency object utilities for JavaScript and TypeScript.

## Utilities

- `pick`, `omit`, `hasOwn`, `mapValues`
- `get`, `set`
- `deepMerge`

## When to use this package

Use it when you need consistent object shaping and nested path operations without pulling a larger utility library.

## Limitations and Constraints

- Path helpers currently support dot-separated string paths only.
- `deepMerge` merges plain objects and replaces arrays by design.

### set mutates in place, unlike lodash

`set` writes into the object you pass and returns that same reference. lodash's `_.set` returns a
new object and leaves the input alone, so this is the one call site where a direct swap from lodash
changes behaviour:

```ts
const target = { a: { b: 1 } };
set(target, "a.c", 9);

target;              // { a: { b: 1, c: 9 } }   mutated
target === set(target, "a.c", 9); // true, same reference
```

Clone first if you need the input preserved:

```ts
set(structuredClone(target), "a.c", 9);
```

Anti-pattern: `const next = set(current, path, value)` reads like an immutable update, but `current`
has already changed. Assign the result only when you want the mutation.

### Paths are always split on dots

`set` and `get` treat every dot as a separator, so a literal key that contains a dot is unreachable
by path:

```ts
get({ "a.b": 1 }, "a.b");         // undefined
set({ "a.b": 1 }, "a.b", 2);      // { "a.b": 1, a: { b: 2 } }
```

Read and write such a key with `pick`/`omit` instead. Prototype-polluting segments (`__proto__`,
`constructor`, `prototype`) are rejected with `Path contains an unsafe segment.`

### deepMerge guards keys only where it merges

`deepMerge` drops unsafe keys at every level where it actually merges two objects. A nested plain
object with no counterpart on the target is assigned as a whole, so an own `__proto__` property
inside it is carried over as ordinary data:

```ts
const payload = JSON.parse('{"outer": {"__proto__": {"deep": true}}}');

deepMerge({}, payload);                          // { outer: { __proto__: { deep: true } } }
({}).deep;                                       // undefined, no pollution

deepMerge({ outer: { keep: 1 } }, payload);      // { outer: { keep: 1 } }, unsafe key skipped
```

Neither form pollutes the prototype chain, because an own `__proto__` property is data rather than
an assignment to the prototype. If you need the key gone from the output as well, strip it yourself
or run the result through a schema that rejects unknown keys.

## Install

```bash
npm i @jdsalasc/solvejs-objects
```

## Quick example

```ts
import { pick, set, deepMerge, mapValues } from "@jdsalasc/solvejs-objects";

const user = pick({ id: "u1", name: "Ada", role: "admin" }, ["id", "name"]);
const labels = mapValues({ open: 2, closed: 1 }, (count) => `${count} tickets`);
const state = { filters: {} };
set(state, "filters.status", "active");
deepMerge({ app: { flags: { a: true } } }, { app: { flags: { b: true } } });
```
