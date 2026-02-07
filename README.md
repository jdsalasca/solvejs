# SolveJS

SolveJS provides lightweight JavaScript and TypeScript utilities for common day-to-day coding problems.

[![CI](https://github.com/jdsalasca/solvejs/actions/workflows/ci.yml/badge.svg)](https://github.com/jdsalasca/solvejs/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/jdsalasca/solvejs)](https://github.com/jdsalasca/solvejs/releases)
[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs)](https://www.npmjs.com/package/@jdsalasc/solvejs)

## Vision

Build the most practical and discoverable utilities ecosystem for solving JavaScript and TypeScript problems fast.

## Mission

- Keep core utilities dependency-free.
- Publish stable APIs with clear naming.
- Optimize docs for problem-first search intent.
- Support both TS and JS with first-class types and runtime compatibility.

## Install

```bash
npm i @jdsalasc/solvejs
```

Or install only what you need:

```bash
npm i @jdsalasc/solvejs-date @jdsalasc/solvejs-regex
```

## Packages

- `@jdsalasc/solvejs` (meta package)
- `@jdsalasc/solvejs-date`
- `@jdsalasc/solvejs-string`
- `@jdsalasc/solvejs-list`
- `@jdsalasc/solvejs-regex`
- `@jdsalasc/solvejs-constants`
- `@jdsalasc/solvejs-numbers`
- `@jdsalasc/solvejs-validators`

## Quick Example

```ts
import { formatDate, toKebabCase, unique, validateByName, clamp, isCellphoneNumber } from "@jdsalasc/solvejs";

formatDate(new Date("2026-02-07T12:00:00.000Z"), "YYYY-MM-DD"); // "2026-02-07"
toKebabCase("Format Date Fast"); // "format-date-fast"
unique([1, 1, 2, 3]); // [1, 2, 3]
validateByName("user@example.com", "email"); // true
clamp(140, 0, 100); // 100
isCellphoneNumber("+573001112233"); // true
```

## Common Problems SolveJS Targets

- How to format dates in JavaScript.
- How to validate email, URL, and usernames in TypeScript.
- How to validate cellphone numbers, names, and address directions.
- How to chunk arrays, deduplicate values, and group lists.
- How to convert strings to camelCase and kebab-case.
- How to compute percentages, averages, and medians safely.

## Compatibility

- Node.js `>=18`
- ESM + CJS exports
- TypeScript declarations included

## Development

```bash
npm install
npm run build
npm test
```

## GitFlow

- `main`: production releases.
- `develop`: integration branch.
- `feature/*`: feature branches.
- `release/*`: release branches.

## License

MIT
