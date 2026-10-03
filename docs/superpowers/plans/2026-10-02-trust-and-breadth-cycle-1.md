# Trust and Breadth Cycle 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the 72-test trust deficit across 7 packages, fix two broken automation scripts, ship the `solvejs-url` package, and land a CI-enforced floor that makes the deficit impossible to recreate.

**Architecture:** Two infra scripts are repaired first so that later tasks are verifiable. Then trust legs raise each package to at least one `test()` block per exported function. `solvejs-url` is added at or above the floor from birth. Only once every package passes does the computed floor replace the hand-maintained one in `scripts/test-baseline.json`, which makes the rule self-enforcing through the `test:baseline` CI step that already exists.

**Tech Stack:** TypeScript 5.9 compiled to ESM + CJS with declarations, Node 24 built-in test runner (`node:test`, `node:assert/strict`), npm workspaces. Zero runtime dependencies in every package.

**Spec:** `docs/superpowers/specs/2026-10-02-trust-and-breadth-design.md`

## Global Constraints

- Runtime dependencies stay at zero. Only `typescript` exists as a devDependency.
- Every package keeps `main`, `module`, `types`, and an `exports` map with `types`/`import`/`require`.
- Every exported function carries JSDoc with `@param`, `@returns`, and `@throws` where it throws.
- Error messages are human-readable and match an existing `toThrow(/regex/)` assertion in that package's tests.
- Zero behavior changes to existing exported functions unless a new test proves the current behavior wrong. Such a fix ships in the same commit as the test that found it, with a `CHANGELOG.md` entry.
- Version bumps are the last step of a task that changes published output, never the first.
- The four gates must be green before any commit: `npm run build`, `npm test`, `npm run test:baseline`, `npm run docs:check-links`.

## Deviation from spec

The spec proposed a new `scripts/check-trust-bar.mjs` and a new coverage/size script. Both already exist in partial form and are reused instead:

- `scripts/check-test-baseline.mjs` already counts `test(` occurrences per package and is already invoked by `.github/workflows/ci.yml`. Extending it to compute the floor from export counts needs no CI wiring at all.
- `scripts/generate-package-inventory.mjs` already contains a `parseExports` function using the exact regexes needed to count function exports.
- `scripts/generate-performance-report.mjs` already reports gzipped tarball size from `npm pack --dry-run`. It is broken, not missing; Task 2 repairs it.

Spec intent is preserved: the rule becomes self-enforcing with fewer moving parts.

## Review Focus

Five input classes the spec implies but no current test exercises. Each is pinned by a test in the task that owns the code.

1. `roundTo(-1.005, 2)` — negative halfway values. `Math.round` rounds toward positive infinity, so this returns `-1` where a developer expects `-1.01`. Pinned in Task 3.
2. `toNumber("1,234", { allowThousandsSeparator: false })` — already tested. The uncovered sibling is `toNumber("1.5e3")` and `toNumber("Infinity")`, which the final regex rejects and must keep rejecting. Pinned in Task 3.
3. `truncate("abcdef", 0)` with the default ellipsis — a limit smaller than the suffix length must not produce a negative slice that returns the whole string. Pinned in Task 6.
4. `slugify` with combining marks and emoji — stripping non-ASCII by regex alone leaves the base letter behind, producing orphaned combining characters in the slug. Pinned in Task 6.
5. `parseQuery` with a repeated key and a `+`-encoded space — `?a=1&a=2` and `?q=hello+world` must not silently drop data or produce a literal `+` in the value. Pinned in Task 5.

---

### Task 1: Topological workspace runner

Replaces the two hardcoded ~570-character package lists in root `package.json`. Without this, every new package requires hand-editing two strings in the wrong order.

**Files:**
- Create: `scripts/run-workspaces.mjs`
- Modify: `package.json` (`scripts.build:core`, `scripts.test:core`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: CLI `node scripts/run-workspaces.mjs <scriptName>` which runs `npm run <scriptName> --workspace <pkgDir>` once per workspace in topological order and exits non-zero if any invocation fails.

- [ ] **Step 1: Write the failing check**

Create a temporary probe that proves the current ordering is wrong, run it, and keep it as the task's verification:

```bash
node -e "const p=require('./package.json');const d=p.workspaces.includes('packages/*');console.log('workspaces glob:',d)"
```

Expected: `workspaces glob: true`

- [ ] **Step 2: Implement `scripts/run-workspaces.mjs`**

Read root `package.json`, expand the `packages/*` glob by reading `packages/` and keeping directories containing a `package.json`. For each, read `dependencies` and keep only names that match another workspace. Depth-first post-order traversal from each unvisited workspace emits a workspace only after all of its in-repo dependencies, which puts `solvejs` (which depends on all eleven others) last.

Use `spawnSync` with `stdio: "inherit"` and pass `["run", scriptName, "--workspace", dir]` as arguments. Set the npm binary to `npm.cmd` when `process.platform === "win32"`, otherwise `npm`. On non-zero exit, print the failing workspace name and set `process.exitCode` to that code, then stop.

Reject a missing script argument with a usage message and exit code 1.

- [ ] **Step 3: Verify the ordering is topological**

Run: `node scripts/run-workspaces.mjs build`
Expected: exit code 0, and the log shows `@jdsalasc/solvejs` building after all `@jdsalasc/solvejs-*` packages, with no `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 4: Replace the hardcoded scripts in `package.json`**

Set `"build:core": "node scripts/run-workspaces.mjs build"` and `"test:core": "node scripts/run-workspaces.mjs test"`. Delete `build` and `test` duplication so `build` becomes `"npm run build:core"` and `test` becomes `"npm run test:core"` — the topological runner now places the meta package itself.

- [ ] **Step 5: Run the gates**

Run: `npm run build && npm test && npm run test:baseline && npm run docs:check-links`
Expected: all four pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/run-workspaces.mjs package.json package-lock.json
git commit -m "refactor: run workspaces in topological order"
```

---

### Task 2: Repair the performance and size report generator

`npm run report:perf` currently fails with `ERR_MODULE_NOT_FOUND` because `benchmarks/index.mjs` imports from `dist/`, which a bare `npm run clean` left empty. The published size table is therefore frozen at v1.5.2 from 2026-02-19.

**Files:**
- Modify: `scripts/generate-performance-report.mjs`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: a working `npm run report:perf` that regenerates `docs/guides/performance-and-size.md` from a freshly built tree.

- [ ] **Step 1: Reproduce the failure**

Run: `npm run clean && npm run report:perf`
Expected: fails with `ERR_MODULE_NOT_FOUND` for `packages/solvejs-date/dist/esm/index.js`.

- [ ] **Step 2: Add the missing build step**

At the top of `generate-performance-report.mjs`, call `run("npm run build")` before `runBenchmarks()`. `run` already exists and uses `execSync` with piped stdio, so the build output does not pollute the report.

- [ ] **Step 3: Verify the generator now succeeds**

Run: `npm run report:perf`
Expected: exit code 0, and `docs/guides/performance-and-size.md` shows today's date and package versions of 1.9.0 instead of 1.5.2.

- [ ] **Step 4: Run the gates**

Run: `npm run build && npm test && npm run test:baseline && npm run docs:check-links`
Expected: all four pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-performance-report.mjs docs/guides/performance-and-size.md
git commit -m "fix: build before generating the performance report"
```

---

### Task 3: Trust leg — solvejs-numbers

Raises the package from 3 tests to 16, one per exported function. Current tests pack many assertions into three unnamed blocks, so a failure does not identify the broken function.

**Files:**
- Modify: `packages/solvejs-numbers/test/index.test.mjs`

**Interfaces:**
- Consumes: the 16 existing exports `clamp`, `roundTo`, `sum`, `average`, `median`, `percent`, `randomInt`, `safeDivide`, `percentChange`, `calculateTaxAmount`, `applyDiscount`, `grossMargin`, `isBetween`, `toCurrency`, `toPercent`, `toNumber`, all imported from `../dist/esm/index.js`.
- Produces: no API change. 16 `test()` blocks named after the function each covers.

- [ ] **Step 1: Replace the three packed blocks with 16 named blocks**

Each block is named exactly after its function. Keep every assertion currently present, distributed to the matching block, and add these boundary vectors:

| Test name | Additional assertions to add |
|---|---|
| `clamp` | `clamp(5, 0, 10)` returns 5 at both bounds; throws `/min/` when `min > max`; throws `/finite/` on `NaN` |
| `roundTo` | `roundTo(2.5)` is 3; `roundTo(-1.005, 2)` is pinned to its actual current return value, whatever that is, with a comment naming the `Math.round`-toward-positive-infinity behavior; throws `/between/` on `decimals` of 13 |
| `sum` | `sum([])` is 0; throws `/values\[0\]/` naming the offending index |
| `average` | `average([2, 4, 6, 8])` is 5; throws `/at least one/` on `[]` |
| `median` | `median([3, 1, 2])` is 2 unsorted-input; throws `/at least one/` on `[]` |
| `percent` | `percent(0, 100)` is 0; `percent(1, 3, 4)` is 33.3333; throws `/zero/` when total is 0 |
| `randomInt` | 200 draws all land in `[min, max]`; `randomInt(5, 5)` is 5 |
| `safeDivide` | `safeDivide(10, 2)` is 5; `safeDivide(10, 0)` is 0 as the default fallback; throws `/finite/` on a non-finite fallback |
| `percentChange` | `percentChange(80, 100)` is -20; `percentChange(100, 80)` is 25; throws `/zero/` when previous is 0 |
| `calculateTaxAmount` | `calculateTaxAmount(100, 0)` is 0; throws `/greater than or equal to 0/` on a negative rate |
| `applyDiscount` | `applyDiscount(100, 100)` is 0; `applyDiscount(100, 0)` is 100; throws `/between 0 and 100/` at 101 |
| `grossMargin` | `grossMargin(100, 100)` is 0; `grossMargin(100, 150)` is -50 |
| `isBetween` | `isBetween(1, 1, 10, false)` is false; `isBetween(5, 1, 10, false)` is true; throws `/less than or equal/` when `min > max` |
| `toCurrency` | `toCurrency(1234.5)` is `"$1,234.50"` for the default `USD`/`en-US`; `toCurrency(0)` is `"$0.00"`; throws `/finite/` on `NaN` |
| `toPercent` | `toPercent(0)` is `"0%"`; `toPercent(-0.5)` starts with `-`; `toPercent(1, { input: "ratio" })` is `"100%"` |
| `toNumber` | `toNumber("")` and `toNumber("   ")` are null; `toNumber("1.5e3")` is null; `toNumber("Infinity")` is null; `toNumber("+42")` is 42; `toNumber(".5")` is 0.5; `toNumber("1,234")` is 1234 |

- [ ] **Step 2: Run the tests**

Run: `npm test --workspace packages/solvejs-numbers`
Expected: 16 passing tests, 0 failing.

- [ ] **Step 3: If any new assertion fails, decide fix-or-pin**

Run: `npm test --workspace packages/solvejs-numbers 2>&1 | grep -A 5 "not ok"`
A failing assertion means current behavior is wrong for a documented boundary. Fix the function, keep the assertion, and add a `CHANGELOG.md` line naming the function and the old and new behavior. If the current behavior is intentional, change the expected value in the test to the actual value and add a comment explaining why.

- [ ] **Step 4: Run the gates**

Run: `npm run build && npm test && npm run test:baseline && npm run docs:check-links`
Expected: all four pass.

- [ ] **Step 5: Commit**

```bash
git add packages/solvejs-numbers/test/index.test.mjs CHANGELOG.md
git commit -m "test(numbers): cover every export with boundary vectors"
```

---

### Task 4: Trust leg — solvejs-validators

The largest single deficit in the repository: 31 exports against 4 tests.

**Files:**
- Modify: `packages/solvejs-validators/test/index.test.mjs`

**Interfaces:**
- Consumes: the 31 existing exports `translateValidationResult`, `validateCellphoneNumber`, `isCellphoneNumber`, `validateAddressDirection`, `isAddressDirection`, `isAddresDirection`, `isAddresDirrection`, `validateName`, `isValidName`, `validateUsername`, `isUsername`, `validateEmail`, `isEmail`, `validateHttpUrl`, `isHttpUrl`, `validateDomain`, `isDomain`, `validatePostalCode`, `isPostalCode`, `validateAddressLine`, `isAddressLine`, `validateStrongPassword`, `isStrongPassword`, `validateCreditCardNumber`, `isCreditCardNumber`, `validateUuidV4`, `isUuidV4`, `validateIpv4`, `isIpv4`, `validateIsoDateString`, `isIsoDateString`.
- Produces: no API change. 31 `test()` blocks, one per export.

- [ ] **Step 1: Write one `test()` block per export**

For each of the 9 `validate*` functions, the block asserts `.ok` is `true` for a known-good input and `.ok` is `false` with a non-empty `.message` and a stable `.code` for a known-bad input, plus empty-string input. For each of the 15 `is*` wrappers, the block asserts the boolean equals `validate*.ok` on the same inputs, so a wrapper can never drift from its validator. `translateValidationResult` gets its own block asserting EN, ES and PT output for one code. `isAddresDirection` and `isAddresDirrection` each get a block asserting they still behave identically to `isAddressDirection`, since they are typo aliases kept for compatibility.

Empty-string and whitespace-only input must fail every validator. That is the single most valuable vector in this package because it is what browser form submissions actually deliver.

- [ ] **Step 2: Run the tests**

Run: `npm test --workspace packages/solvejs-validators`
Expected: 31 passing tests, 0 failing.

- [ ] **Step 3: Run the gates**

Run: `npm run build && npm test && npm run test:baseline && npm run docs:check-links`
Expected: all four pass.

- [ ] **Step 4: Commit**

```bash
git add packages/solvejs-validators/test/index.test.mjs CHANGELOG.md
git commit -m "test(validators): cover every export with boundary vectors"
```

---

### Task 5: New package — solvejs-url

The first breadth item, shipped at or above the trust bar from birth: 8 utilities, at least 8 tests. Nothing else in the repository builds or mutates URLs; `solvejs-env` only parses and validates them, and `solvejs-validators` only answers whether one is well-formed.

**Files:**
- Create: `packages/solvejs-url/package.json`
- Create: `packages/solvejs-url/tsconfig.esm.json`
- Create: `packages/solvejs-url/tsconfig.cjs.json`
- Create: `packages/solvejs-url/scripts/rename-cjs.mjs`
- Create: `packages/solvejs-url/src/index.ts`
- Create: `packages/solvejs-url/test/index.test.mjs`
- Create: `packages/solvejs-url/README.md`
- Modify: `package.json` (add `@jdsalasc/solvejs-url` to the meta package dependencies)
- Modify: `packages/solvejs/src/index.ts` (re-export the new symbols)
- Modify: `CHANGELOG.md`

**Interfaces:**

Consumes: nothing from other tasks.

Produces, from `@jdsalasc/solvejs-url`:

```ts
export type QueryValue = string | number | boolean | null | undefined;
export type QueryInput = Record<string, QueryValue | QueryValue[]>;

export class UrlError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;
}

export function buildUrl(
  base: string,
  options?: { path?: string; query?: QueryInput; hash?: string }
): string;

export function joinUrl(...segments: string[]): string;

export function stringifyQuery(query: QueryInput): string;

export function parseQuery(search: string): Record<string, string | string[]>;

export function withQuery(url: string, query: QueryInput): string;

export function omitQuery(url: string, names: string[]): string;

export function getUrlParam(url: string, name: string): string | null;

export function replacePathParam(path: string, name: string, value: string): string;
```

Behavior pinned by the spec, which the tests must assert:

- `stringifyQuery` sorts keys alphabetically so the same input always produces the same string. Determinism is what makes a query string usable as a cache key.
- `parseQuery` decodes `+` as a space, keeps a repeated key as an array in first-seen order, returns `{}` for an empty or `?`-only input, and never throws on malformed percent-encoding.
- `withQuery` merges into an existing query, replacing keys that are given and preserving the rest, and returns the input unchanged when `query` is empty.
- `omitQuery` removes the named keys and keeps the rest.
- `replacePathParam` encodes the value with `encodeURIComponent` and throws `UrlError` with code `URL_PATH_PARAM_MISSING` when `:name` is absent.
- `buildUrl` and `withQuery` throw `UrlError` with code `URL_NOT_ABSOLUTE` when the input has no scheme, and `URL_INVALID_BASE` when the host is empty.
- `UrlError.code` values are exactly `URL_NOT_ABSOLUTE`, `URL_INVALID_BASE`, and `URL_PATH_PARAM_MISSING`.

- [ ] **Step 1: Scaffold the package by copying an existing one**

Run: `Copy-Item -Recurse packages/solvejs-constants packages/solvejs-url` then delete `dist` from the copy. This preserves the exact `tsconfig.esm.json`, `tsconfig.cjs.json`, and `rename-cjs.mjs` shape that already builds correctly.

In the new `package.json`, set `"name": "@jdsalasc/solvejs-url"`, `"version": "0.1.0"`, keep `"type": "module"`, `"sideEffects": false`, the same four export fields, and `"engines": { "node": ">=18" }`. Replace `dependencies` with `{}`. Set `keywords` to `["url", "query string", "url parser", "url builder", "typescript", "javascript", "zero dependency", "solvejs"]` and a description naming URL building, query-string manipulation, and path parameters.

- [ ] **Step 2: Write the failing tests**

Create `packages/solvejs-url/test/index.test.mjs` importing all 8 functions and `UrlError` from `../dist/esm/index.js`, with one `test()` block per exported function named after it. The `parseQuery` block must include `parseQuery("?q=hello+world")` deep-equal `{ q: "hello world" }` and `parseQuery("?a=1&a=2")` deep-equal `{ a: ["1", "2"] }`. The `stringifyQuery` block must assert `stringifyQuery({ b: 2, a: 1 }) === "a=1&b=2"` to pin alphabetical determinism.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test --workspace packages/solvejs-url`
Expected: fails with a module-not-found error, since `src/index.ts` does not exist yet.

- [ ] **Step 4: Implement `src/index.ts`**

Write the 8 exported functions and the `UrlError` class to the signatures above. Use the built-in `URL` and `URLSearchParams` classes for all parsing and serialization rather than hand-rolling percent-encoding; sort the keys of `QueryInput` before handing them to `URLSearchParams` so output is deterministic. Give every export JSDoc with `@param`, `@returns`, and `@throws {UrlError}` where it throws. Set `UrlError.prototype.name` to `"UrlError"` and pass `code` and `details` to the `Error` constructor so both survive subclassing under ES2020.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test --workspace packages/solvejs-url`
Expected: 8 or more passing tests, 0 failing.

- [ ] **Step 6: Write the package README**

Model it on `packages/solvejs-constants/README.md`. Include the install command, a "When to use this package" section, one problem-first snippet per function with its real output, an anti-pattern note warning that `stringifyQuery` sorts keys so it must not be used to preserve query insertion order, and a limitations note that `parseQuery` collapses duplicates into arrays so a key expected to be unique needs a guard.

- [ ] **Step 7: Wire the package into the meta package**

Add `"@jdsalasc/solvejs-url": "0.1.0"` to `packages/solvejs/package.json` dependencies and re-export the new symbols from `packages/solvejs/src/index.ts`, following the existing re-export pattern in that file.

- [ ] **Step 8: Run the gates**

Run: `npm run build && npm test && npm run test:baseline && npm run docs:check-links`
Expected: all four pass. `build:core` must place `solvejs-url` before `solvejs` without any `package.json` edit, which is the proof that Task 1 works.

- [ ] **Step 9: Add the changelog entry**

Add a `0.1.0` entry under the current version heading describing the 8 utilities and stating `Migration impact: none`.

- [ ] **Step 10: Commit**

```bash
git add packages/solvejs-url packages/solvejs/src/index.ts packages/solvejs/package.json package-lock.json CHANGELOG.md
git commit -m "feat(url): add solvejs-url with url building and query utilities"
```

---

### Task 6: Trust leg — solvejs-string and solvejs-regex

`string` has 9 exports against 2 tests, `regex` has 5 function exports against 2 tests. Review Focus items 3 and 4 are pinned here.

**Files:**
- Modify: `packages/solvejs-string/test/index.test.mjs`
- Modify: `packages/solvejs-regex/test/index.test.mjs`

**Interfaces:**
- Consumes: `string` exports `toKebabCase`, `toCamelCase`, `capitalize`, `normalizeWhitespace`, `truncate`, `slugify`, `stripHtml`, `toTitleCase`, `mask`; `regex` function exports `testPattern`, `validateWithPattern`, `validateByName`, `escapeRegex`, `literalRegex`.
- Produces: no API change. 9 `test()` blocks for `string`, 5 for `regex`.

- [ ] **Step 1: Write one `test()` block per export in `solvejs-string`**

Assert empty-string and whitespace-only input for every function. Pin the two Review Focus vectors:

- `truncate("abcdef", 0)` must not return `"abcdef"` and must not return an empty string; assert the exact current return value with a comment naming the interaction between a small limit and the default ellipsis.
- `slugify` must produce a slug with no combining marks left behind: assert `slugify("Café Ünïcode")` has no character in the Unicode combining-diacritical range, and that `slugify("👋 Hello")` starts with `hello`.

If `slugify` leaves a combining mark behind, fix it with Unicode normalization `NFKD` plus a combining-mark strip before the existing character filter, keep the assertion, and add a `CHANGELOG.md` line.

- [ ] **Step 2: Write one `test()` block per export in `solvejs-regex`**

`escapeRegex` must round-trip through `literalRegex` and must escape every regex metacharacter including `-` inside a character class and `/`. `validateByName` must reject an unknown pattern name rather than returning `true`. `testPattern` must return `false` for a non-string input rather than throwing.

- [ ] **Step 3: Run the tests**

Run: `npm test --workspace packages/solvejs-string && npm test --workspace packages/solvejs-regex`
Expected: 9 and 5 passing tests, 0 failing.

- [ ] **Step 4: Run the gates**

Run: `npm run build && npm test && npm run test:baseline && npm run docs:check-links`
Expected: all four pass.

- [ ] **Step 5: Commit**

```bash
git add packages/solvejs-string packages/solvejs-regex CHANGELOG.md
git commit -m "test(string,regex): cover every export with unicode boundaries"
```

---

### Task 7: Trust leg — solvejs-date and solvejs-list

`date` has 18 exports against 6 tests and carries the heaviest timezone risk in the repository. `AGENTS.md` already mandates boundary test vectors for date utilities.

**Files:**
- Modify: `packages/solvejs-date/test/index.test.mjs`
- Modify: `packages/solvejs-list/test/index.test.mjs`

**Interfaces:**
- Consumes: `date` exports `isValidDate`, `parseIsoDate`, `parseUnixTimestamp`, `parseDateStrict`, `addDays`, `isWeekend`, `isBusinessDay`, `addBusinessDays`, `nextBusinessDay`, `previousBusinessDay`, `startOfDay`, `fromUtcParts`, `endOfDay`, `diffInDays`, `isLeapYear`, `daysInMonth`, `toIsoDate`, `formatDate`; `list` exports `unique`, `uniqueBy`, `compact`, `chunk`, `groupBy`, `countBy`, `pluck`, `partition`, `keyBy`, `intersection`, `difference`, `sortBy`.
- Produces: no API change. 18 `test()` blocks for `date`, 12 for `list`.

- [ ] **Step 1: Write one `test()` block per export in `solvejs-date`**

Every date test must set `process.env.TZ` explicitly for determinism and restore it after, using a `t.after` hook per test, because the host timezone otherwise decides the result. Cover these vectors:

- Leap-year boundary: `isLeapYear(2000)` true, `isLeapYear(1900)` false, `isLeapYear(2024)` true. `daysInMonth(2, 2024)` is 29, `daysInMonth(2, 2023)` is 28.
- Month end: `addDays("2024-01-31", 1)` is `2024-02-01`, not a skipped date.
- Year end: `addDays("2024-12-31", 1)` is `2025-01-01`.
- DST spring-forward: run the `addDays` and `diffInDays` cases under `TZ=America/New_York` on `2024-03-10` and assert the calendar-day result, asserting the day count and not a 24-hour duration.
- DST fall-back: the same two cases on `2024-11-03`.
- Business days across a weekend: `nextBusinessDay("2024-03-08")` (a Friday) is `2024-03-11` (Monday). `addBusinessDays("2024-03-08", 1)` is the same. `isBusinessDay("2024-03-09")` is false, `isWeekend("2024-03-09")` is true.
- `parseDateStrict` must reject `2024-02-30` and must accept `2024-02-29`.
- `fromUtcParts(2024, 1, 1)` must round-trip through `toIsoDate` unchanged.

- [ ] **Step 2: Write one `test()` block per export in `solvejs-list`**

Cover empty-array input for every function, and `chunk([1,2,3], 2)` returning `[[1,2],[3]]`. `chunk` must throw a `RangeError` on a size of 0 rather than looping forever. `sortBy` must return a new array and must not mutate the input, asserted by comparing the input before and after. `uniqueBy` and `groupBy` must both work on 100,000 elements without a stack overflow.

- [ ] **Step 3: Run the tests**

Run: `npm test --workspace packages/solvejs-date && npm test --workspace packages/solvejs-list`
Expected: 18 and 12 passing tests, 0 failing.

- [ ] **Step 4: Run the gates**

Run: `npm run build && npm test && npm run test:baseline && npm run docs:check-links`
Expected: all four pass.

- [ ] **Step 5: Commit**

```bash
git add packages/solvejs-date packages/solvejs-list CHANGELOG.md
git commit -m "test(date,list): cover every export with tz and boundary vectors"
```

---

### Task 8: Trust leg — solvejs-constants, solvejs-schema, solvejs-objects

Closes the remaining three packages so the computed floor can be enforced. `constants` and `schema` each have a single function export and already exceed the floor; this task adds the missing coverage vectors and brings `objects` from 5 tests to its 7 exports.

**Files:**
- Modify: `packages/solvejs-constants/test/index.test.mjs`
- Modify: `packages/solvejs-schema/test/index.test.mjs`
- Modify: `packages/solvejs-objects/test/index.test.mjs`

**Interfaces:**
- Consumes: `constants` function export `parseBooleanString` plus the exported constant objects `TIME`, `FILE_SIZE_BYTES`, `HTTP_METHODS`, `HTTP_STATUS`, `CONTENT_TYPES`; `schema` function export `toJsonSchema`; `objects` exports `hasOwn`, `pick`, `omit`, `mapValues`, `get`, `set`, `deepMerge`.
- Produces: no API change.

- [ ] **Step 1: Add blocks for the three packages**

`parseBooleanString`: `true`/`1`/`yes`/`on` case-insensitive are true, `false`/`0`/`no`/`off` are false, an unknown string returns the documented fallback rather than throwing, and empty input uses the fallback.

`toJsonSchema`: assert the emitted object for one string field, one coerced number field, one optional field, and one refined field, and assert that a union produces `anyOf`.

`objects`: one `test()` block per export. `get` must return `undefined` for a missing deep path and for a path that walks through a primitive. `set` must create intermediate objects, must not mutate the input, and must reject prototype-polluting paths — `set({}, "__proto__.polluted", true)` must leave `({}).polluted` undefined. `deepMerge` must not mutate either input and must let the second argument win on a scalar conflict.

- [ ] **Step 2: Run the tests**

Run: `npm test --workspace packages/solvejs-constants && npm test --workspace packages/solvejs-schema && npm test --workspace packages/solvejs-objects`
Expected: all passing, with `objects` at 7.

- [ ] **Step 3: Run the gates**

Run: `npm run build && npm test && npm run test:baseline && npm run docs:check-links`
Expected: all four pass.

- [ ] **Step 4: Commit**

```bash
git add packages/solvejs-constants packages/solvejs-schema packages/solvejs-objects CHANGELOG.md
git commit -m "test(constants,schema,objects): cover every export"
```

---

### Task 9: Enforce the trust bar

The lock. Every package now passes, so the hand-maintained floors in `scripts/test-baseline.json` can be replaced by a floor computed from export counts. After this, adding an exported function without a test fails CI with no human involvement.

**Files:**
- Modify: `scripts/check-test-baseline.mjs`
- Modify: `scripts/test-baseline.json`

**Interfaces:**
- Consumes: the `parseExports` regexes from `scripts/generate-package-inventory.mjs` — `/export\s+(?:async\s+)?function\s+(\w+)/g` for function exports.
- Produces: `npm run test:baseline` exits 1 when any package's `test()` count is below its function-export count.

- [ ] **Step 1: Write the failing case**

Temporarily add an exported function with no test to `packages/solvejs-constants/src/index.ts`, for example `export function temporaryProbe(): number { return 1; }`.
Run: `npm run test:baseline`
Expected: currently PASSES, proving the gap exists.

- [ ] **Step 2: Compute the floor from exports in `check-test-baseline.mjs`**

Replace the `overrides` lookup with a computed floor: read each package's `src/index.ts`, count matches of `/export\s+(?:async\s+)?function\s+\w+/g`, and use that count as the minimum. Keep `scripts/test-baseline.json` only for the `@jdsalasc/solvejs` meta package override, whose floor is 1 because it re-exports rather than implements. Delete every other `packageMinimums` entry. Handle a package with no `src/index.ts` by falling back to the configured minimum.

- [ ] **Step 3: Verify the gate now fails**

Run: `npm run test:baseline`
Expected: FAILS, naming `@jdsalasc/solvejs-constants` and reporting the test count against the higher required count.

- [ ] **Step 4: Remove the probe and verify the gate passes**

Delete the `temporaryProbe` function.
Run: `npm run test:baseline`
Expected: PASSES.

- [ ] **Step 5: Prove the gate is self-enforcing**

Run the probe add/remove cycle from Steps 1 and 4 once more end to end.
Expected: fails while the untested export exists, passes once it is gone.

- [ ] **Step 6: Run all gates**

Run: `npm run build && npm test && npm run test:baseline && npm run docs:check-links`
Expected: all four pass.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-test-baseline.mjs scripts/test-baseline.json
git commit -m "ci: derive the test floor from export counts"
```

---

### Task 10: Publish the measured numbers

Badges only count if a script regenerates them. This wires coverage and size into the repository so the README can state measured values.

**Files:**
- Modify: `scripts/generate-performance-report.mjs`
- Modify: `README.md`
- Modify: `docs/guides/performance-and-size.md`

**Interfaces:**
- Consumes: `node --test --experimental-test-coverage`, which is built into Node 24 and adds no dependency; the `scripts/run-workspaces.mjs` CLI from Task 1 to get package order; and the existing `npm pack --dry-run` size table.
- Produces: a `## Coverage` section in `docs/guides/performance-and-size.md` with a measured percentage per package, and a size table in `README.md`.

- [ ] **Step 1: Add coverage collection to the report generator**

Run `node --test --experimental-test-coverage` once per package by spawning the Task 1 CLI as `node scripts/run-workspaces.mjs test`, capturing each package's stdout, and parsing the `All files` line of the printed table for the line-coverage percentage. Write those rows into a `## Coverage` section of the report. If the percentage cannot be parsed for a package, write `n/a` rather than guessing.

- [ ] **Step 2: Verify coverage numbers appear**

Run: `npm run report:perf`
Expected: exit code 0 and a `## Coverage` section in `docs/guides/performance-and-size.md` with one row per package.

- [ ] **Step 3: Add the size table and coverage badge to the README**

Copy the generated size table into `README.md` under a `## Package Size` heading, and add a coverage line stating the measured all-files percentage across the workspace. Both must carry a note that they are generated by `npm run report:perf` and must not be edited by hand.

- [ ] **Step 4: Update the stale health report**

In `docs/guides/package-health-report.md`, remove the `Cross-Package Gaps` bullets about low test density and the placeholder lint command, both of which are now false, and refresh the `Updated on` date.

- [ ] **Step 5: Run the gates**

Run: `npm run build && npm test && npm run test:baseline && npm run docs:check-links`
Expected: all four pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-performance-report.mjs README.md docs/guides/performance-and-size.md docs/guides/package-health-report.md
git commit -m "docs: publish measured coverage and package size"
```

---

## Deferred to Cycle 2

Breadth items 2 through 8 from the spec, in this order: `solvejs-cache`, `solvejs-json`, `solvejs-pagination`, `solvejs-semver`, `solvejs-errors`, `solvejs-money`, `solvejs-http`. Each follows the shape of Task 5 and must reach one test per function before the next begins. `solvejs-money` stays last because integer-cent allocation is the highest correctness risk in the backlog.

Two spec follow-ups that are not yet scheduled and need a maintainer decision: publishing README coverage badges per individual package rather than once at the workspace level, and adding a `test:coverage` npm script alias.
