# SolveJS npm Positioning Guide

Use this file to keep npm package messaging, discoverability terms, and README intent aligned.

## Brand Promise

`SolveJS: zero-dependency utilities that solve real JavaScript and TypeScript production problems.`

## Short Tagline

`Install one package, or only what you need.`

## Package Positioning

- `@jdsalasc/solvejs`
  - Position: all-in-one utility library across date, string, list, regex, constants, numbers, validators, and objects.
  - Search intents: `javascript utility library`, `typescript utility library`.
- `@jdsalasc/solvejs-date`
  - Position: strict parsing + UTC-safe date utilities.
  - Search intents: `javascript date formatting`, `strict date parsing`, `unix timestamp parser`.
- `@jdsalasc/solvejs-string`
  - Position: string normalization and presentation utilities.
  - Search intents: `slugify javascript`, `strip html tags`, `truncate string`.
- `@jdsalasc/solvejs-list`
  - Position: predictable list transformations.
  - Search intents: `group array by key`, `unique by key`, `partition array`.
- `@jdsalasc/solvejs-regex`
  - Position: common regex patterns + safe regex helpers.
  - Search intents: `uuid regex`, `ipv4 regex`, `escape regex`.
- `@jdsalasc/solvejs-constants`
  - Position: app and protocol constants.
  - Search intents: `http methods constants`, `file size constants`, `time constants`.
- `@jdsalasc/solvejs-numbers`
  - Position: safer number parsing and business math.
  - Search intents: `parse number string`, `percent change`, `safe divide`.
- `@jdsalasc/solvejs-validators`
  - Position: structured validators with actionable result codes.
  - Search intents: `phone validator`, `username validator`, `uuid v4 validator`.
- `@jdsalasc/solvejs-objects`
  - Position: object shaping and nested path helpers.
  - Search intents: `pick object keys`, `deep merge objects`, `set nested value`.

## npm Description Copy (English)

Use these as the canonical package `description` strings in `package.json`.

- `@jdsalasc/solvejs`:
  - `Practical zero-dependency JS/TS utility suite for dates, strings, lists, regex, constants, numbers, validators, and objects.`
- `@jdsalasc/solvejs-date`:
  - `Production-ready JS/TS date utilities: strict parsing, UTC-safe formatting, unix timestamp parsing, and date math.`
- `@jdsalasc/solvejs-string`:
  - `Production-ready JS/TS string utilities: slugify, casing, sanitize/strip HTML, masking, and truncation.`
- `@jdsalasc/solvejs-list`:
  - `Production-ready JS/TS list utilities: uniqueBy, groupBy, keyBy, partition, intersection, difference, and sorting.`
- `@jdsalasc/solvejs-regex`:
  - `Production-ready JS/TS regex utilities with built-in patterns (uuidV4, ipv4, isoDate) and safe escaping helpers.`
- `@jdsalasc/solvejs-constants`:
  - `Production-ready JS/TS constants for time, file sizes, HTTP methods/headers, and boolean parsing.`
- `@jdsalasc/solvejs-numbers`:
  - `Production-ready JS/TS number utilities: toNumber parsing, safeDivide, percentChange, clamp, roundTo, and currency formatting.`
- `@jdsalasc/solvejs-validators`:
  - `Production-ready JS/TS validators with structured result codes for forms/APIs: phone, username, postal, UUID, IPv4, and ISO date.`
- `@jdsalasc/solvejs-objects`:
  - `Production-ready JS/TS object utilities: pick, omit, hasOwn, get/set nested paths, and deepMerge.`

## Metadata Policy

- Keep 8-14 high-intent keywords per package.
- Include both `javascript` and `typescript` intent terms.
- Mention 3+ concrete utilities in each package description.
- Keep first README code sample concise (<= 15 lines).
- Keep `When to use this package` section in every package README.

## Release Copy Template

`SolveJS vX.Y.Z adds [new utilities] to solve [specific pain points]. All packages remain zero-dependency and ship ESM, CJS, and TypeScript types.`
