# SolveJS

SolveJS is a zero-runtime-dependency utility ecosystem for JavaScript and TypeScript apps.

[![CI](https://github.com/jdsalasca/solvejs/actions/workflows/ci.yml/badge.svg)](https://github.com/jdsalasca/solvejs/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/jdsalasca/solvejs)](https://github.com/jdsalasca/solvejs/releases)
[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs)](https://www.npmjs.com/package/@jdsalasc/solvejs)

## Why SolveJS

- Solves everyday JavaScript/TypeScript pain points not covered well by defaults.
- Works in Node and modern frontend stacks.
- Ships ESM + CJS + TypeScript declarations.
- Keeps APIs predictable and production-friendly.

## Install

```bash
npm i @jdsalasc/solvejs
```

Install only what you need:

```bash
npm i @jdsalasc/solvejs-date @jdsalasc/solvejs-validators
```

## Tools Included

- `@jdsalasc/solvejs-date`: strict parsing, UTC-safe date helpers.
- `@jdsalasc/solvejs-string`: casing, slugging, masking, HTML stripping.
- `@jdsalasc/solvejs-list`: grouping, partitioning, sorting, deduplication.
- `@jdsalasc/solvejs-regex`: common regex patterns and regex helpers.
- `@jdsalasc/solvejs-constants`: high-signal constants for app logic.
- `@jdsalasc/solvejs-numbers`: safe arithmetic and business-math helpers.
- `@jdsalasc/solvejs-validators`: structured validators with result codes.

## Quick Example

```ts
import {
  parseDateStrict,
  slugify,
  sortBy,
  validateCellphoneNumber,
  percentChange
} from "@jdsalasc/solvejs";

parseDateStrict("2026-02-07", "YYYY-MM-DD");
slugify("Build Better JS Apps");
sortBy([{ n: 2 }, { n: 1 }], (x) => x.n);
validateCellphoneNumber("+573001112233", { country: "CO" });
percentChange(120, 100);
```

## Validation Result Shape

```ts
type ValidationResult = {
  ok: boolean;
  code: string;
  message: string;
};
```

## Development

```bash
npm install
npm run build
npm test
npm run benchmark
```

## Community

- Contribution guide: `CONTRIBUTING.md`
- Code of conduct: `CODE_OF_CONDUCT.md`
- Community roadmap: `TODO.md`
- Marketing and growth plan: `MARKETING_PLAN.md`
- npm positioning guide: `NPM_POSITIONING.md`

## License

MIT
