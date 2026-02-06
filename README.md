# SolveJS

SolveJS is a lightweight utility ecosystem for JavaScript and TypeScript focused on practical fixes for everyday development problems.

## Vision

Become the most discoverable and trusted utility toolkit for solving common JavaScript and TypeScript issues quickly, with stable APIs and zero runtime dependencies in the core modules.

## Mission

- Deliver practical utilities that solve real production problems in minutes.
- Keep core modules dependency-free, predictable, and easy to audit.
- Offer clear documentation with copy-paste examples for fast adoption.
- Support both TypeScript and JavaScript users with first-class typings.

## Why SolveJS

- Zero dependencies in core packages.
- TypeScript-first, compiled for JS and TS consumers.
- ESM + CJS output for broad ecosystem compatibility.
- Small, focused modules you can install independently.

## Packages

- `@jdsalasc/solvejs-date`
- `@jdsalasc/solvejs-string`
- `@jdsalasc/solvejs-list`
- `@jdsalasc/solvejs-regex`
- `@jdsalasc/solvejs-constants`
- `@jdsalasc/solvejs` (meta package)

## Install

```bash
npm i @jdsalasc/solvejs
```

Or install only what you need:

```bash
npm i @jdsalasc/solvejs-date @jdsalasc/solvejs-string
```

## Quick Example

```ts
import { formatDate, toKebabCase, unique } from "@jdsalasc/solvejs";

formatDate(new Date("2026-02-06T12:00:00.000Z"), "YYYY-MM-DD"); // 2026-02-06
toKebabCase("Solve JS Utilities"); // solve-js-utilities
unique([1, 1, 2, 3]); // [1, 2, 3]
```

## Development

```bash
npm install
npm run build
npm test
```

## GitFlow

- `main`: production-ready releases.
- `develop`: integration branch.
- `feature/*`: isolated development branches.
- `release/*`: release preparation branches.

## Release Strategy

- Semantic versioning.
- Git tags per release.
- GitHub Releases for changelog visibility.
- Public npm publication per package.

## License

MIT
