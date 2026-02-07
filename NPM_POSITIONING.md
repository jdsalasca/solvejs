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

## Metadata Policy

- Keep 8-14 high-intent keywords per package.
- Include both `javascript` and `typescript` intent terms.
- Mention 3+ concrete utilities in each package description.
- Keep first README code sample concise (<= 15 lines).
- Keep `When to use this package` section in every package README.

## Release Copy Template

`SolveJS vX.Y.Z adds [new utilities] to solve [specific pain points]. All packages remain zero-dependency and ship ESM, CJS, and TypeScript types.`
