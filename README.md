# SolveJS

**Zero-dependency TypeScript utilities for the problems every JavaScript app hits: dates, validation, money, caching, HTTP, JSON, URLs, pagination, semver, errors, environment config, and more.**

SolveJS is a monorepo of 21 focused packages. Install the whole ecosystem with one import, or install only the module you need. No runtime dependencies, no peer dependencies, no native builds.

[![CI](https://github.com/jdsalasca/solvejs/actions/workflows/ci.yml/badge.svg)](https://github.com/jdsalasca/solvejs/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs)](https://www.npmjs.com/package/@jdsalasc/solvejs)
[![npm downloads](https://img.shields.io/npm/dm/@jdsalasc/solvejs)](https://www.npmjs.com/package/@jdsalasc/solvejs)
[![license](https://img.shields.io/npm/l/@jdsalasc/solvejs)](LICENSE)
[![dependencies](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

## Why SolveJS

- **Zero runtime dependencies.** Nothing extra to audit, patch, or ship to the browser.
- **One job per package.** Small, predictable APIs with stable error codes.
- **ESM + CJS + TypeScript declarations.** Import it from Node.js, a bundler, or a test runner.
- **Built for production boundaries.** Structured validation, safe JSON, typed errors, retries with backoff.
- **Measured, not claimed.** Every package has tests; CI enforces a per-package test floor derived from its export count, a quality lint baseline, and publishable tarballs.

## Find the package for your problem

| I need to… | Package | Install |
|---|---|---|
| Parse, format, and do UTC-safe date math, business days, DST boundaries | `@jdsalasc/solvejs-date` | `npm i @jdsalasc/solvejs-date` |
| Validate emails, phones, postal codes, UUIDs, IPv4, ISO dates, passwords, addresses | `@jdsalasc/solvejs-validators` | `npm i @jdsalasc/solvejs-validators` |
| Do exact money math for invoices, payments, taxes, and splits | `@jdsalasc/solvejs-money` | `npm i @jdsalasc/solvejs-money` |
| Cache API responses with TTL, LRU, async memoization, or stale-while-revalidate | `@jdsalasc/solvejs-cache` | `npm i @jdsalasc/solvejs-cache` |
| Retry HTTP calls with exponential backoff and jitter, or negotiate content types | `@jdsalasc/solvejs-http` | `npm i @jdsalasc/solvejs-http` |
| Normalize errors into typed codes, HTTP statuses, and safe JSON responses | `@jdsalasc/solvejs-errors` | `npm i @jdsalasc/solvejs-errors` |
| Parse environment variables at startup and fail fast with clear messages | `@jdsalasc/solvejs-env` | `npm i @jdsalasc/solvejs-env` |
| Validate API payloads and forms without a schema dependency | `@jdsalasc/solvejs-schema` | `npm i @jdsalasc/solvejs-schema` |
| Parse, stringify, clone, compare, and merge JSON safely | `@jdsalasc/solvejs-json` | `npm i @jdsalasc/solvejs-json` |
| Build URLs, join paths, and serialize query strings deterministically | `@jdsalasc/solvejs-url` | `npm i @jdsalasc/solvejs-url` |
| Paginate API responses with pages, offsets, cursors, and envelopes | `@jdsalasc/solvejs-pagination` | `npm i @jdsalasc/solvejs-pagination` |
| Parse and compare semantic versions, ranges, and prereleases | `@jdsalasc/solvejs-semver` | `npm i @jdsalasc/solvejs-semver` |
| Sleep, timeout, retry, debounce, throttle, queue, or rate-limit async work | `@jdsalasc/solvejs-async` | `npm i @jdsalasc/solvejs-async` |
| Group, count, dedupe, sort, chunk, or partition arrays | `@jdsalasc/solvejs-list` | `npm i @jdsalasc/solvejs-list` |
| Pick, omit, get/set dotted paths, map values, or deep-merge objects | `@jdsalasc/solvejs-objects` | `npm i @jdsalasc/solvejs-objects` |
| Slugify, truncate, mask, strip HTML, or change string case | `@jdsalasc/solvejs-string` | `npm i @jdsalasc/solvejs-string` |
| Use common regex patterns for email, phone, URL, UUID, IPv4, and ISO dates | `@jdsalasc/solvejs-regex` | `npm i @jdsalasc/solvejs-regex` |
| Parse numbers, compute percentages, format currency, or round safely | `@jdsalasc/solvejs-numbers` | `npm i @jdsalasc/solvejs-numbers` |
| Use time, file-size, HTTP method, status, and content-type constants | `@jdsalasc/solvejs-constants` | `npm i @jdsalasc/solvejs-constants` |
| Export or read XLSX with JSX components, formulas, images, styles and CSV | `@jdsalasc/solvejs-xlsx` | `npm i @jdsalasc/solvejs-xlsx` |
| Generate PDFs with JSX components and preview them with a built-in viewer | `@jdsalasc/solvejs-pdf` | `npm i @jdsalasc/solvejs-pdf` |
| Import any of the above from one entry point | `@jdsalasc/solvejs` | `npm i @jdsalasc/solvejs` |

## Install

```bash
# The whole ecosystem, one import surface
npm i @jdsalasc/solvejs

# Or only the modules you need
npm i @jdsalasc/solvejs-date @jdsalasc/solvejs-validators @jdsalasc/solvejs-money
```

## Quick start

```ts
import {
  allocateAmount,
  buildUrl,
  fromDecimal,
  parseDateStrict,
  retry,
  translateValidationResult,
  validateEmail
} from "@jdsalasc/solvejs";

parseDateStrict("2026-11-16", "YYYY-MM-DD");
// Date 2026-11-16T00:00:00.000Z

validateEmail("dev@example.com");
// { ok: true, code: "VALID", message: "Email is valid." }

translateValidationResult(validateEmail(""), { fieldLabel: "Email" });
// { ok: false, code: "EMPTY", message: "Email is required." }

fromDecimal("19.99");
// 1999 (integer minor units)

allocateAmount(1000, [1, 1, 1]);
// [334, 333, 333] — sums back to 1000 exactly

buildUrl("https://api.example.com", { path: "users", query: { page: 2 } });
// "https://api.example.com/users?page=2"

await retry(() => fetch("https://api.example.com/health"), { retries: 2, delayMs: 150 });
```

## Who it is for

- **API and backend teams** that need consistent validation, error shapes, and retries without adding a framework.
- **Frontend and form teams** that want stable validation codes and EN/ES/PT messages they can render directly.
- **Fintech and commerce teams** that cannot afford floating-point money bugs.
- **Library authors** who want small, typed building blocks with zero runtime dependencies.

## Quality you can verify

- **Tests:** every package has a suite on Node's built-in test runner. `npm run quality` runs build, tests, the test floor, meta wiring, CJS output, publish contents, the release matrix, README snippets, docs links, and the lint baseline.
- **Coverage and size:** measured per package in [`docs/guides/performance-and-size.md`](docs/guides/performance-and-size.md).
- **Package health:** current status, known limitations, and next improvements in [`docs/guides/package-health-report.md`](docs/guides/package-health-report.md).
- **Publish safety:** every tarball is packed in dry-run mode before release, and the release matrix is derived from the workspaces.

## Documentation and recipes

- Cookbook and searchable guides: <https://jdsalasca.github.io/solvejs/>
- Date and timezone recipes: [`docs/problems/date-format.md`](docs/problems/date-format.md)
- Form and API validation recipes: [`docs/problems/form-validators.md`](docs/problems/form-validators.md)
- Async, retry, and rate limiting: [`docs/problems/async-control.md`](docs/problems/async-control.md)
- Invoice and fintech workflow: [`docs/problems/invoice-fintech.md`](docs/problems/invoice-fintech.md)
- Framework examples: [Next.js](examples/nextjs-route-handler), [Express](examples/express-middleware), [environment bootstrap](examples/env-bootstrap)
- Comparisons: [SolveJS vs lodash](docs/guides/solvejs-vs-lodash.html), [SolveJS vs date-fns and validator](docs/guides/solvejs-vs-datefns-validator.html)

## Works with

Node.js 18+, modern browsers, and edge runtimes for the environment-agnostic packages. Every package ships ESM, CommonJS, and TypeScript declarations. `@jdsalasc/solvejs-xlsx` currently requires Node.js 20.12+ for the platform deflate-raw streams. Packages that read `process.env` document their Node.js requirement in their README.

## Contributing

Contributions are welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md), run `npm install && npm run quality`, and open a focused PR. Security reports: [`SECURITY.md`](SECURITY.md). Community roadmap and monthly vote: [GitHub Issues](https://github.com/jdsalasca/solvejs/issues).

## License

MIT
