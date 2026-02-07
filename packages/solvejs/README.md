# @jdsalasc/solvejs

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs)](https://www.npmjs.com/package/@jdsalasc/solvejs)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs)](https://www.npmjs.com/package/@jdsalasc/solvejs)


Zero-dependency JavaScript and TypeScript utility suite for real production pain points.

Includes date, string, list, regex, constants, numbers, validators, object, and async utilities.

## When to use this package

Use it when your project needs multiple utility domains and you prefer one import surface over many package-level imports.

## Limitations and Constraints

- Utilities prioritize predictable defaults over framework-specific abstractions.
- Date and number helpers do not replace domain-specific finance/timezone libraries for regulated calculations.
- Import package-level modules directly when you need strict control over bundle boundaries.

## Install

```bash
npm i @jdsalasc/solvejs
```

## Quick example

```ts
import { parseDateStrict, slugify, uniqueBy, toNumber, deepMerge, retry } from "@jdsalasc/solvejs";

parseDateStrict("2026-02-07", "YYYY-MM-DD");
slugify("Build Better JS Apps");
uniqueBy([{ id: "a" }, { id: "a" }], (x) => x.id);
toNumber("1,200");
deepMerge({ app: { env: "dev" } }, { app: { version: 2 } });
await retry(() => fetch("https://example.com/health"), { retries: 2, delayMs: 150 });
```

Docs cookbook and guides: `https://jdsalasca.github.io/solvejs/`
