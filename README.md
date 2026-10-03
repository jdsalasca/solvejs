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

- `@jdsalasc/solvejs-date`: `formatDate`, `parseDateStrict`, `addBusinessDays`, `nextBusinessDay`, `diffInDays`.
- `@jdsalasc/solvejs-string`: `slugify`, `normalizeWhitespace`, `stripHtml`, `toTitleCase`, `truncate`.
- `@jdsalasc/solvejs-list`: `uniqueBy`, `groupBy`, `countBy`, `pluck`, `partition`, `sortBy`.
- `@jdsalasc/solvejs-regex`: `REGEX_PATTERNS`, `validateByName`, `escapeRegex`, `literalRegex`.
- `@jdsalasc/solvejs-constants`: `TIME`, `FILE_SIZE_BYTES`, `HTTP_METHODS`, `HTTP_STATUS`, `CONTENT_TYPES`.
- `@jdsalasc/solvejs-numbers`: `toNumber`, `safeDivide`, `percentChange`, `toPercent`, `toCurrency`.
- `@jdsalasc/solvejs-validators`: `validateCellphoneNumber`, `validateDomain`, `translateValidationResult`, `validateUuidV4`.
- `@jdsalasc/solvejs-objects`: `pick`, `omit`, `mapValues`, `get`, `set`, `deepMerge`.
- `@jdsalasc/solvejs-async`: `sleep`, `timeout`, `timeoutFallback`, `retry`, `pMap`, `createTaskQueue`, `createRateLimiter`.
- `@jdsalasc/solvejs-env`: `getEnvString`, `getEnvNumber`, `getEnvObject`, `getEnvUrl`, `getEnvDsn`, `validateRequiredEnv`.
- `@jdsalasc/solvejs-schema`: `s.object`, `s.string`, `s.number`, `safeParse`, `toJsonSchema`.
- `@jdsalasc/solvejs-url`: `buildUrl`, `withQuery`, `parseQuery`, `stringifyQuery`, `omitQuery`, `replacePathParam`, `getUrlParam`, `joinUrl`.
- `@jdsalasc/solvejs-cache`: `stableKey`, `createTtlCache`, `createLruCache`, `memoizeAsync`, `createStaleWhileRevalidate`.
- `@jdsalasc/solvejs-json`: `safeJsonParse`, `safeJsonStringify`, `stableStringify`, `deepClone`, `deepEqual`, `jsonMerge`.
- `@jdsalasc/solvejs-pagination`: `pageToOffset`, `offsetToPage`, `pageCount`, `clampPage`, `paginate`, `withPagination`.

## Quick Example

```ts
import { parseDateStrict, slugify, countBy, toNumber, validateUuidV4, deepMerge, retry, s, buildUrl, memoizeAsync } from "@jdsalasc/solvejs";

parseDateStrict("2026-02-07", "YYYY-MM-DD");
slugify("Build Better JS Apps");
countBy([{ team: "api" }, { team: "web" }, { team: "api" }], (x) => x.team);
toNumber("1,200");
validateUuidV4("550e8400-e29b-41d4-a716-446655440000");
deepMerge({ app: { env: "dev" } }, { app: { version: 2 } });
await retry(() => fetch("https://example.com/health"), { retries: 2, delayMs: 150 });
s.object({ id: s.string(), age: s.number({ coerce: true }).int() }).safeParse({ id: "u1", age: "42" });
buildUrl("https://api.example.com", { path: "users", query: { page: 2 } });
const loadUser = memoizeAsync(async (id) => fetch(`https://api.example.com/users/${id}`).then((r) => r.json()));
```

## Package Size and Test Coverage

Measured, not estimated. Regenerate both with `npm run report:perf`; never edit them by hand.

| Package | Version | Gzipped tarball | Unpacked | Lines covered |
|---|---:|---:|---:|---:|
| `@jdsalasc/solvejs` | 1.9.0 | 2.48 KB | 6.97 KB | 52.88% |
| `@jdsalasc/solvejs-async` | 1.9.0 | 8.57 KB | 51.96 KB | 93.65% |
| `@jdsalasc/solvejs-constants` | 1.9.0 | 3.33 KB | 12.06 KB | 100.00% |
| `@jdsalasc/solvejs-date` | 1.9.0 | 6.77 KB | 45.08 KB | 95.05% |
| `@jdsalasc/solvejs-env` | 1.9.0 | 5.61 KB | 42.77 KB | 90.70% |
| `@jdsalasc/solvejs-list` | 1.9.0 | 4.70 KB | 26.32 KB | 98.93% |
| `@jdsalasc/solvejs-numbers` | 1.9.0 | 6.67 KB | 45.00 KB | 100.00% |
| `@jdsalasc/solvejs-objects` | 1.9.0 | 4.69 KB | 23.54 KB | 98.76% |
| `@jdsalasc/solvejs-regex` | 1.9.0 | 3.09 KB | 11.87 KB | 100.00% |
| `@jdsalasc/solvejs-schema` | 1.9.0 | 7.86 KB | 52.45 KB | 86.94% |
| `@jdsalasc/solvejs-string` | 1.9.0 | 3.93 KB | 18.52 KB | 100.00% |
| `@jdsalasc/solvejs-url` | 0.1.0 | 6.68 KB | 34.85 KB | 99.00% |
| `@jdsalasc/solvejs-validators` | 1.9.0 | 10.71 KB | 82.55 KB | 98.37% |

Coverage comes from the Node built-in test runner, so it adds no dependency. Full per-package
line, branch and function figures live in `docs/guides/performance-and-size.md`.

Every package must keep at least one test block per exported function. `npm run test:baseline`
derives that floor from the export count, so CI fails if a function is added without a test.

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
