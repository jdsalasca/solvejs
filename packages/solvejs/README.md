# @jdsalasc/solvejs

Zero-dependency JavaScript and TypeScript utility suite for real production pain points.

Includes date, string, list, regex, constants, numbers, validators, and object utilities.

## When to use this package

Use it when your project needs multiple utility domains and you prefer one import surface over many package-level imports.

## Install

```bash
npm i @jdsalasc/solvejs
```

## Quick example

```ts
import { parseDateStrict, slugify, uniqueBy, toNumber, deepMerge } from "@jdsalasc/solvejs";

parseDateStrict("2026-02-07", "YYYY-MM-DD");
slugify("Build Better JS Apps");
uniqueBy([{ id: "a" }, { id: "a" }], (x) => x.id);
toNumber("1,200");
deepMerge({ app: { env: "dev" } }, { app: { version: 2 } });
```

Docs cookbook and guides: `https://jdsalasca.github.io/solvejs/`
