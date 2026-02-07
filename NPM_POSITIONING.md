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
- `@jdsalasc/solvejs-async`
  - Position: async workflow control (retry, timeout, concurrency limits).
  - Search intents: `promise timeout`, `retry with backoff`, `pmap concurrency`.

## npm Description Copy (English)

Use these as the canonical package `description` strings in `package.json`.

- `@jdsalasc/solvejs`:
  - `Zero-dependency JavaScript/TypeScript utility library for production apps: date parsing, string cleanup, list transforms, validators, numbers, regex, constants, objects, and async control.`
- `@jdsalasc/solvejs-date`:
  - `Zero-dependency JavaScript/TypeScript date utilities for production: strict parsing, UTC-safe formatting, unix timestamp conversion, date math, and calendar helpers.`
- `@jdsalasc/solvejs-string`:
  - `Zero-dependency JavaScript/TypeScript string utilities for production: slugify, case transforms, HTML stripping, masking, and safe truncation.`
- `@jdsalasc/solvejs-list`:
  - `Zero-dependency JavaScript/TypeScript list utilities for production: uniqueBy, groupBy, keyBy, partition, intersection, difference, chunk, and sortBy.`
- `@jdsalasc/solvejs-regex`:
  - `Zero-dependency JavaScript/TypeScript regex utilities: built-in production patterns (UUID v4, IPv4, ISO date) plus safe pattern validation and escaping.`
- `@jdsalasc/solvejs-constants`:
  - `Zero-dependency JavaScript/TypeScript constants for production: time and file-size units, HTTP methods/headers, delimiters, and boolean string parsing.`
- `@jdsalasc/solvejs-numbers`:
  - `Zero-dependency JavaScript/TypeScript number utilities for production: parsing, clamp/round, safe division, percent change, median, and currency formatting.`
- `@jdsalasc/solvejs-validators`:
  - `Zero-dependency JavaScript/TypeScript validators for forms and APIs with structured result codes: phone, postal, username, password, UUID v4, IPv4, and ISO date.`
- `@jdsalasc/solvejs-objects`:
  - `Zero-dependency JavaScript/TypeScript object utilities for production: pick, omit, hasOwn, nested get/set by path, and deepMerge for config/state.`
- `@jdsalasc/solvejs-async`:
  - `Zero-dependency JavaScript/TypeScript async utilities for production: sleep, promise timeout, retry with backoff, and concurrency-limited pMap.`

## Metadata Policy

- Keep 8-14 high-intent keywords per package.
- Include both `javascript` and `typescript` intent terms.
- Mention 3+ concrete utilities in each package description.
- Keep first README code sample concise (<= 15 lines).
- Keep `When to use this package` section in every package README.

## Release Copy Template

`SolveJS vX.Y.Z adds [new utilities] to solve [specific pain points]. All packages remain zero-dependency and ship ESM, CJS, and TypeScript types.`
