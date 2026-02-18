# SolveJS

SolveJS is a zero-dependency utility ecosystem for JavaScript and TypeScript apps.

[![CI](https://github.com/jdsalasca/solvejs/actions/workflows/ci.yml/badge.svg)](https://github.com/jdsalasca/solvejs/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/jdsalasca/solvejs)](https://github.com/jdsalasca/solvejs/releases)
[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs)](https://www.npmjs.com/package/@jdsalasc/solvejs)
[![Community](https://img.shields.io/badge/community-monthly%20vote-blue)](https://github.com/jdsalasca/solvejs/issues)

## Promise

Zero-dependency JS/TS utilities for real production pain points. Install one package or only the modules you need.

## Why Teams Adopt SolveJS

- Predictable APIs with no runtime dependencies.
- ESM + CJS + TypeScript declarations across all packages.
- Structured validator responses for better UX/API error mapping.
- Problem-first cookbook docs with searchable recipes and integration guides.

## Install

```bash
npm i @jdsalasc/solvejs
```

Install only specific modules:

```bash
npm i @jdsalasc/solvejs-date @jdsalasc/solvejs-validators @jdsalasc/solvejs-objects
```

## Packages

- `@jdsalasc/solvejs-date`: `formatDate`, `parseDateStrict`, `parseUnixTimestamp`, `diffInDays`.
- `@jdsalasc/solvejs-string`: `slugify`, `stripHtml`, `toTitleCase`, `truncate`.
- `@jdsalasc/solvejs-list`: `uniqueBy`, `groupBy`, `partition`, `sortBy`.
- `@jdsalasc/solvejs-regex`: `REGEX_PATTERNS`, `validateByName`, `escapeRegex`.
- `@jdsalasc/solvejs-constants`: `TIME`, `FILE_SIZE_BYTES`, `HTTP_METHODS`, `parseBooleanString`.
- `@jdsalasc/solvejs-numbers`: `toNumber`, `safeDivide`, `percentChange`, `calculateTaxAmount`, `applyDiscount`, `grossMargin`, `toCurrency`.
- `@jdsalasc/solvejs-validators`: `validateCellphoneNumber`, `validateUsername`, `validateUuidV4`.
- `@jdsalasc/solvejs-objects`: `pick`, `omit`, `get`, `set`, `deepMerge`.
- `@jdsalasc/solvejs-async`: `sleep`, `timeout`, `retry`, `pMap`, `createTaskQueue`, `createRateLimiter`.
- `@jdsalasc/solvejs-env`: `getEnvString`, `getEnvNumber`, `getEnvBoolean`, `getEnvEnum`, `getEnvArray`, `getEnvJson`, `validateRequiredEnv`.

## Quick Example

```ts
import { parseDateStrict, slugify, uniqueBy, toNumber, validateUuidV4, deepMerge, retry } from "@jdsalasc/solvejs";

parseDateStrict("2026-02-07", "YYYY-MM-DD");
slugify("Build Better JS Apps");
uniqueBy([{ id: "a" }, { id: "a" }, { id: "b" }], (x) => x.id);
toNumber("1,200");
validateUuidV4("550e8400-e29b-41d4-a716-446655440000");
deepMerge({ app: { env: "dev" } }, { app: { version: 2 } });
await retry(() => fetch("https://example.com/health"), { retries: 2, delayMs: 150 });
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
- Security policy: `SECURITY.md`
- Community roadmap: `TODO.md`
- Marketing and growth plan: `MARKETING_PLAN.md`
- npm positioning guide: `NPM_POSITIONING.md`
- Positioning execution checklist: `POSITIONING_CHECKLIST.md`
- Community pain-point analysis: `COMMUNITY_PAIN_POINTS.md`
- Monthly vote automation: `.github/workflows/community-vote.yml`
- Monthly "You asked, we shipped" automation: `.github/workflows/community-shipped.yml`
- PR template enforcement: `.github/workflows/pr-template-check.yml`
- Community metrics automation: `.github/workflows/community-metrics.yml`
- Community issue seeding automation: `.github/workflows/seed-community-issues.yml`
- Docs cookbook: `https://jdsalasca.github.io/solvejs/?utm_source=github&utm_medium=readme&utm_campaign=community_growth`
- Package inventory: `docs/guides/package-inventory.md`
- Performance and size report: `docs/guides/performance-and-size.md`
- Community metrics report: `docs/guides/community-metrics.md`
- Community issue backlog: `docs/community/issue-backlog.md`
- Framework examples: `examples/`

## License

MIT
