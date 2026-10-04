# Changelog

## Unreleased

- Fixed the release workflow, which carried a hardcoded publish matrix of 11 packages while the workspace had 20. Nine packages were therefore not publishable: `solvejs-schema` had been published once at v1.0.0 and could never be updated, and the eight newer packages could not be released at all even though the meta package depends on them, so a tag would have shipped a `@jdsalasc/solvejs` that fails to install. The matrix is now derived from the workspaces by `scripts/release-matrix.mjs`, and the meta package publishes in a separate job that waits for every leaf, because matrix jobs run in parallel and would otherwise let the meta reach npm before its dependencies. `npm run check:release` fails if a package is ever listed by hand again or if the publish list stops matching the workspaces. Migration impact: none, release tooling only. Tagging a release now publishes all twenty packages instead of eleven.

- Added a `check:pack` gate, run by `npm run quality`, that packs every package in dry-run mode and fails when a declared entry point or the README would not be published, or when source or test files would ship. The `files` field decides the tarball, and a mistake there is invisible until the package is on the registry. Migration impact: none, tooling only.

- Added a `check:cjs` gate, run by `npm run quality`, that loads the `require()` entry point of every package and fails when one does not resolve, exports nothing, or left a `.js` file behind in `dist/cjs`. The CommonJS build is produced by renaming every output file and rewriting the require specifiers, and since every test suite exercises `dist/esm` only, a broken CommonJS build was previously unverified until a user hit it. Migration impact: none, tooling only.

- Added a `check:meta` gate, run by `npm run quality`, that verifies every leaf workspace is declared in the meta package and re-exported from its entry point, and that no two packages export the same name. Because the meta package re-exports with `export *`, an ambiguous name is silently dropped from the namespace: every individual package keeps working while a user importing from `@jdsalasc/solvejs` gets a build error. The gate also catches a leaf that was added to the workspace but never wired into the meta.

- Added `npm run quality`, which runs the full gate sequence that `AGENTS.md` lists: build, tests, the test baseline, the meta check, the documentation link check and lint. Migration impact: none, tooling only.

- Added an integration test for `@jdsalasc/solvejs` that exercises one value and one error class from each of the 19 leaf packages through the meta entry point. No leaf test can catch a re-export that is declared but does not resolve in the built output, which is what this covers. Migration impact: none, tests only.

- Fixed `@jdsalasc/solvejs-semver`: a wildcard operand is now treated as the interval it names, so `<2.x` keeps everything below `2.0.0`, `<=2.x` also keeps `2.99.99`, and `>1.2` moves past the whole `1.2.z` block. Previously every operator other than equality against a wildcard returned `false`, and `=1.2` threw `SEMVER_INVALID_RANGE` because `=` was not recognised as an operator. Migration impact: none for ranges written with an explicit version. A range that relied on `<2.x` returning `false` was already wrong and will now match the versions it was meant to match.

- Fixed `@jdsalasc/solvejs-schema`: `s.array().min()` and `s.array().max()` now reject a count that is not a non-negative integer, and `s.number().min()` and `s.number().max()` now reject a non-finite bound. A negative item count previously reached `toJsonSchema()` and produced invalid JSON Schema, and `NaN` or `Infinity` produced a bound that could never be satisfied. A negative numeric bound stays legal because it is meaningful. Migration impact: a schema built with an invalid count or a non-finite bound now throws at build time instead of producing a schema that silently never matched.

- Added new package `@jdsalasc/solvejs-http` with `getStatusText`, `isIdempotentMethod`, `isRetryableStatus`, `isRetryableError`, `calculateBackoffDelay`, `normalizeHeaderName`, `parseContentType`, `negotiateContentType` and a `HttpError`. Backoff accepts an injectable deterministic mode, and content negotiation honours quality values plus both wildcard forms with the server's order breaking a tie. Migration impact: none, new package.

- Added new package `@jdsalasc/solvejs-money` with `fromDecimal`, `toDecimal`, `addMoney`, `subtractMoney`, `sumMoney`, `multiplyMoney`, `percentageOf`, `applyPercentage`, `allocateAmount`, `formatMoney` and a `MoneyError`. Amounts are integer minor units throughout, `allocateAmount` uses the largest-remainder method so a split always sums back exactly, and any fractional result is settled by an explicit rounding mode. `fromDecimal` refuses input precision beyond the currency's own digits rather than rounding it silently. Migration impact: none, new package.

- Added new package `@jdsalasc/solvejs-errors` with `AppError`, `createError`, `isAppError`, `getErrorCode`, `getStatusForCode`, `normalizeError`, `asError`, `serializeError`, `errorToResponse`, `toResult` and `aggregateErrors`. Codes are a closed set that maps to an HTTP status, an unknown code maps to `500` rather than to a success status, and serialisation omits stacks and causes unless asked. This enforces in code the error contract `AGENTS.md` requires in prose. Migration impact: none, new package.

- Added new package `@jdsalasc/solvejs-semver` with `parseVersion`, `isValidVersion`, `compareVersions`, `satisfies`, `isValidRange`, `maxSatisfying`, `incrementVersion`, `formatVersion`, `diffVersions`, and a `SemverError`. Caret, tilde, wildcard, comparator, AND and OR ranges are supported, and the specification's prerelease-tuple rule is implemented, so `1.0.0-beta` satisfies `^1.0.0-alpha` while `1.0.1-beta` does not. A patch bump on a prerelease promotes it to the release, matching `node-semver`. Migration impact: none, new package.

- Added new package `@jdsalasc/solvejs-pagination` with `pageToOffset`, `offsetToPage`, `pageCount`, `clampPage`, `offsetToCursor`, `cursorToOffset`, `paginate`, `withPagination`, and a `PaginationError`. `paginate` clamps an out-of-range page by default and `withPagination` wraps an already-sliced page rather than slicing it, both documented in the package README. Migration impact: none, new package.

- Added new package `@jdsalasc/solvejs-json` with `safeJsonParse`, `safeJsonStringify`, `stableStringify`, `deepClone`, `deepEqual`, `jsonMerge`, `pickJsonKeys`, `omitJsonKeys`, `getOrDefault`, and a `JsonError`. `stableStringify` sorts keys at every depth so its output is safe to hash or compare, and `safeJsonStringify` deliberately mirrors `JSON.stringify`, including dropping functions and reporting a value with no JSON representation as `undefined` rather than as an error. Migration impact: none, new package.

- Added new package `@jdsalasc/solvejs-cache` with `stableKey`, `createTtlCache`, `createLruCache`, `memoizeAsync`, `createStaleWhileRevalidate`, and a `CacheError` carrying stable codes. Every time-dependent function accepts an injectable `now`, so expiry is testable without real timers, and `memoizeAsync` shares one in-flight promise per key and does not cache a rejection. Migration impact: none, new package.

- Fixed `getUrlParam` in `@jdsalasc/solvejs-url`, which read a value out of text that appeared after a `#` fragment: `getUrlParam("/x#frag?a=1", "a")` returned `"1"` and now returns `null`. The fragment is now discarded before the query is located. Migration impact: none, unless a caller relied on the previous incorrect result.

- Documented that `deepMerge` in `@jdsalasc/solvejs-objects` drops prototype-polluting keys only at levels where it merges two objects; a nested plain object with no counterpart on the target is assigned whole, so an own `__proto__` property inside it is carried as inert data. No prototype pollution is possible either way, because an own `__proto__` property is data rather than a prototype assignment. Behavior is unchanged. Migration impact: none.

- `npm run report:health` now measures the test trust table itself instead of copying hand-written numbers, and rewrites both `package-health-report.md` and `.html` from that single measurement. Line coverage is read back from `npm run report:perf` output so the two reports cannot disagree. Repeated runs are idempotent, and CRLF checkouts are handled. The markdown now has explicit `## Test Trust` and `## Package Status` sections.

- Documented that in `@jdsalasc/solvejs-async` a `debouncePromise` call superseded by a newer call rejects immediately with `Error: Debounced by a newer call.` and that validation is synchronous for `sleep`/`debouncePromise`/`createRateLimiter`/`createTokenBucketLimiter` but arrives as a rejected promise for `retry`/`pMap`. Behavior is unchanged. Migration impact: none.
- Removed an unreachable branch in `createTokenBucketLimiter`: `scheduleDrain` is only ever called after the drain loop has broken on an unaffordable queue head, so its `missingTokens === 0` early return could not execute. No behavior change. Migration impact: none.

- Documented two `@jdsalasc/solvejs-env` inconsistencies: `getEnvEnum` takes `allowedValues` as its second positional argument while every other getter takes the env source there, and a present-but-blank value falls back to `defaultValue` in every getter except `getEnvString`, which raises `cannot be empty`. Behavior is unchanged. Migration impact: none.

- Documented that in `@jdsalasc/solvejs-schema` an absent optional field is set to `undefined` on the parsed result rather than omitted, so `"key" in result` is `true` and `Object.keys` lists it even though `JSON.stringify` hides it. Behavior is unchanged. Migration impact: none.

- Added measured test coverage to `npm run report:perf`, using the Node built-in coverage runner so no dependency is needed, and published a per-package size and coverage table in the root README.
- Added `npm run report:health`, which generates `docs/guides/package-health-report.html` from the markdown source so the two cannot drift. Wired into CI. The health report now carries a measured test-trust table instead of hand-maintained claims.
- Rewrote `docs/guides/package-health-report.md` against the v1.9.0 state: 157 test blocks across 13 packages, every package at or above its export-derived floor, and the three lowest-coverage packages named as the next targets. Migration impact: none, documentation only.

- `npm run test:baseline` now derives each package's minimum test count from its number of exported
  functions instead of hand-maintained values, so the floor rises automatically when a function is
  added. The gate enforces density (`tests >= exports`); it does not prove every individual export
  has a test. It also prints the per-package breakdown on success. Migration impact: none, repository
  tooling only.
- Added new package `@jdsalasc/solvejs-url` with `buildUrl`, `joinUrl`, `stringifyQuery`, `parseQuery`, `withQuery`, `omitQuery`, `getUrlParam`, `replacePathParam`, and a `UrlError` carrying stable codes `URL_NOT_ABSOLUTE`, `URL_INVALID_BASE`, and `URL_PATH_PARAM_MISSING`. Query keys are serialised in alphabetical order so output is deterministic and safe to use as a cache key. Migration impact: none, new package.
- Integrated `solvejs-url` into the meta package `@jdsalasc/solvejs`.
- Documented the `roundTo` asymmetry on exact halfway values: `roundTo(1.005, 2)` returns `1.01` while `roundTo(-1.005, 2)` returns `-1`, because the `Number.EPSILON` correction only applies to positive values. Behavior is unchanged; see the Precision note in `packages/solvejs-numbers/README.md`. Migration impact: none.
- Removed stale build output (`index.js`, `index.d.ts`, `index.js.map`) that was committed inside `packages/*/src/` for six packages. Migration impact: none, repository hygiene only.
- Documented the `toKebabCase`/`toCamelCase`/`slugify` acronym behaviour: a run of capitals is not split, so `toCamelCase("parseHTTPResponse")` returns `"parseHttpresponse"` and `toKebabCase("HTTPServer")` returns `"httpserver"`. Also documented that `truncate` degrades to a truncated suffix when the limit is at or below the suffix length. Behavior is unchanged. Migration impact: none.
- Documented the `solvejs-date` input anchoring rule: the helpers read the UTC calendar of the `Date` passed in, so `new Date(2024, 3, 8)` (local midnight) reports the previous day in eastern timezones. Use `fromUtcParts`, `parseIsoDate`, or a `T12:00:00.000Z` anchor.
- Documented the two `parseIsoDate` leniency traps inherited from `new Date(value)`: an impossible calendar day rolls forward (`"2026-02-30"` becomes 2 March) and a slash date is read as US month/day/year in local time (`"07/02/2026"` is 2 July). `parseDateStrict` rejects both. Behavior is unchanged. Migration impact: none.
- Documented that `intersection` and `difference` preserve duplicates from the left operand, which differs from lodash. Compose with `unique` to match `_.intersection` and `_.difference`. Behavior is unchanged. Migration impact: none.
- Documented that `set` in `@jdsalasc/solvejs-objects` mutates the target in place and returns the same reference, unlike lodash's immutable `_.set`, plus the fact that `get`/`set` always split paths on dots so a literal dotted key is unreachable by path. Behavior is unchanged. Migration impact: none.
- Documented that `safeParse` in `@jdsalasc/solvejs-schema` is fail-fast and returns one issue for the first failing field rather than every field like zod, and that a successful parse drops unknown keys. Behavior is unchanged. Migration impact: none.
- Documented that `parseBooleanString` in `@jdsalasc/solvejs-constants` throws on an unrecognised value instead of returning a fallback, so a typo in configuration fails at startup. Behavior is unchanged. Migration impact: none.

## 1.9.0 - 2026-05-28

- Added new package `@jdsalasc/solvejs-schema` for zero-dependency schema validation, `safeParse`, optional fields, refinements, unions, literals, and JSON Schema output.
- Added web-app utility helpers across all existing packages: `timeoutFallback`, `HTTP_STATUS`, `CONTENT_TYPES`, `nextBusinessDay`, `previousBusinessDay`, `getEnvObject`, `pluck`, `toPercent`, `mapValues`, `literalRegex`, `normalizeWhitespace`, and domain validation.
- Integrated schema exports into the meta package `@jdsalasc/solvejs`.
- Expanded README examples and function-level comments so both developers and AI assistants can discover and use the new utilities correctly.

## 1.8.0 - 2026-05-28

- Added validator UX translations with `translateValidationResult` for EN/ES/PT field-aware messages.
- Added business-day date helpers: `addBusinessDays`, `isBusinessDay`, and `isWeekend`.
- Added `countBy` for list aggregation and analytics-style transformations.
- Hardened `toNumber` so malformed thousands separators such as `1,2,3` return `null` instead of parsing as `123`.
- Improved npm package descriptions for clearer adoption positioning across all published packages.
- Added a market audit for bugs, useful functions, and high-demand utility opportunities.

## 1.7.2 - 2026-05-28

- Hardened object path helpers against unsafe prototype segments such as `__proto__`, `constructor`, and `prototype`.
- Fixed list grouping/keying helpers so special object keys do not mutate prototypes or break accumulator behavior.
- Tightened `fromUtcParts` to reject invalid calendar parts instead of silently overflowing dates.
- Added regression coverage for prototype-pollution hardening and invalid UTC date construction.

## 1.5.2 - 2026-02-07

- Added `Limitations and Constraints` sections across all package READMEs for clearer adoption expectations.
- Expanded validator country coverage with `GB` and `DE` for phone/postal checks, including test and matrix updates.
- Kept lint baseline and full workspace test suite passing after documentation and validator coverage updates.

## 1.5.1 - 2026-02-07

- Added TypeScript-based lint baseline (`tsc --noEmit`) across all workspace packages.
- Enforced lint in CI workflow before build/test.

## 1.5.0 - 2026-02-07

- Improved quality coverage across packages:
  - Added DST/timezone edge tests in `solvejs-date`.
  - Added Unicode/locale edge tests in `solvejs-string`.
  - Added nested-path and mutation-safety tests in `solvejs-objects` plus robust path segment trimming in `get`/`set`.
- Expanded validator country coverage with `CA` and `UY` for phone/postal validation plus matrix/docs updates.
- Upgraded async package with `debouncePromise` and `throttlePromise` including tests and README updates.
- Added list-scale benchmark guidance (`10k`/`100k`) and benchmark script coverage for `uniqueBy`, `groupBy`, and `sortBy`.
- Added precision guidance for financial number workflows in docs/README.
- Added new package `@jdsalasc/solvejs-async` with `sleep`, `timeout`, `retry`, and `pMap`, integrated into monorepo build/test and meta exports.
- Added async cookbook recipe page (`docs/problems/async-control.md` and `.html`) and docs navigation entries.
- Added new package opportunities guide (`docs/guides/new-package-opportunities.md`) with prioritized next-package options.

## 1.4.1 - 2026-02-07

- Restored remote `develop` branch from `main` to re-enable GitFlow-style branch targets.
- Refined npm package descriptions in all published packages to emphasize practical utility-level value in English.
- Revalidated package health report with updated deficiencies and priorities after npm visibility recovery.
- Fixed `.github/workflows/release.yml` by removing broken publish command, adding per-workspace matrix publish, npm token validation, and idempotent version-exists checks.
- Added package health report docs (`docs/guides/package-health-report.md` and `.html`) with package status, issues, weak points, and prioritized actions.
- Updated docs navigation to include the new package health report.
- Regenerated package inventory docs for current `1.4.0` package versions.
- Updated roadmap (`TODO.md`) with `v1.5.0` candidate priorities.
- Expanded `NPM_POSITIONING.md` with canonical npm description copy for each package.

## 1.4.0 - 2026-02-07

- Added new package `@jdsalasc/solvejs-objects` with `pick`, `omit`, `hasOwn`, `get`, `set`, and `deepMerge`.
- Expanded validator locale support for phone/postal checks (US, CO, MX, ES, AR, CL, PE, BR).
- Added validator locale matrix including address-direction locales (`en`, `es`).
- Added framework integration guides (Next.js, Express, NestJS).
- Added docs cookbook search/navigation improvements with related-recipe suggestions.
- Added package inventory generator (`npm run inventory`) with Markdown and HTML outputs.
- Improved npm package pages with clearer practical descriptions and trust badges.
- Added monthly community vote automation workflow and issue template.
- Added adoption comparison guides (`SolveJS vs Lodash`, `SolveJS vs date-fns + validator`).
- Improved regression coverage with new edge-case tests in string/list/regex packages.

## 1.3.2 - 2026-02-07

- Improved npm package descriptions and keywords with clearer utility-level phrasing in English.
- Standardized package READMEs with `Utilities`, `When to use this package`, and concise quick examples.
- Updated roadmap and positioning docs (`TODO.md`, `POSITIONING_CHECKLIST.md`, `NPM_POSITIONING.md`) for community-facing execution.
- Added docs cookbook navigation, client-side recipe search, and a new object-utilities recipe page.
- Added quick-search and related-recipe sections across each docs problem page with no-JS cookbook fallback links.
- Added framework integration guides (Next.js, Express, NestJS) and a validator locale matrix page.
- Expanded validator locale support for phone/postal checks (US, CO, MX, ES, AR, CL, PE, BR).
- Added edge-case tests for string/list/regex packages to improve regression coverage.
- Added automated package inventory generator (`npm run inventory`) producing Markdown + HTML docs snapshots.
- Improved meta/readme adoption copy with clearer "why adopt" and docs entry points.
- Added npm and Node compatibility badges across all package READMEs for stronger npm page trust signals.
- Expanded validator locale matrix docs to include address-direction locale coverage (`en`, `es`).
- Added monthly community vote automation workflow and reusable issue template.
- Added adoption-focused comparison guides (`SolveJS vs Lodash`, `SolveJS vs date-fns + validator`).

## 1.3.1 - 2026-02-07

- Added new package `@jdsalasc/solvejs-objects` with `pick`, `omit`, `hasOwn`, `get`, `set`, and `deepMerge`.
- Integrated object helpers into meta package `@jdsalasc/solvejs`.
- Updated roadmap status for object utilities package.

## 1.3.0 - 2026-02-07

- Added community-driven utilities focused on high-frequency production pain points.
- Added `parseUnixTimestamp` and `toIsoDate` in `@jdsalasc/solvejs-date`.
- Added `uniqueBy` and `difference` in `@jdsalasc/solvejs-list`.
- Added `toNumber` for robust form/string numeric parsing in `@jdsalasc/solvejs-numbers`.
- Added `validateUuidV4`, `validateIpv4`, and `validateIsoDateString` (+ `isX` wrappers) in `@jdsalasc/solvejs-validators`.
- Improved npm descriptions and keywords for stronger high-intent discoverability.
- Added `POSITIONING_CHECKLIST.md` and `COMMUNITY_PAIN_POINTS.md` to guide growth and roadmap decisions.

## 1.2.0 - 2026-02-07

- Added more production-ready utilities across all core packages.
- Added structured and region-aware validation improvements, including username, address line, and credit card checks.
- Added backward-compatible validator aliases for common misspellings.
- Expanded date toolkit with `endOfDay`, `diffInDays`, `isLeapYear`, and `daysInMonth`.
- Expanded string toolkit with `slugify`, `stripHtml`, `toTitleCase`, and `mask`.
- Expanded list toolkit with `partition`, `keyBy`, `intersection`, and `sortBy`.
- Expanded regex toolkit with `uuidV4`, `ipv4`, `isoDate`, and `escapeRegex`.
- Expanded constants toolkit with file size and HTTP constants.
- Upgraded npm package descriptions and keywords for stronger discoverability.
- Updated community roadmap with pain-point-driven product direction.

## 1.1.0 - 2026-02-07

- Added structured validation API (`ValidationResult`) in `@jdsalasc/solvejs-validators`.
- Added country-aware cellphone validation presets and locale-aware address directions.
- Added strict date parsing (`parseDateStrict`) and UTC constructor (`fromUtcParts`).
- Added business number helpers: `safeDivide`, `percentChange`, `isBetween`, `toCurrency`.
- Added benchmark starter (`npm run benchmark`).
- Added governance files (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`) and issue templates.
- Added implementation TODO tracker in `TODO.md`.

## 1.0.3 - 2026-02-07

- Published hotfix release for `@jdsalasc/solvejs-numbers` and `@jdsalasc/solvejs-validators`.
- Updated meta package `@jdsalasc/solvejs` to depend on the hotfix versions.

## 1.0.2 - 2026-02-07

- Added new package `@jdsalasc/solvejs-numbers` for safe and practical numeric helpers.
- Added new package `@jdsalasc/solvejs-validators` for common form validation pain points.
- Improved code quality with API-level JSDoc (`@param`, `@returns`, `@throws`) across core modules.
- Extended meta package `@jdsalasc/solvejs` to export numbers and validators modules.
- Updated package descriptions and keywords for stronger npm discoverability.
- Added problem-specific docs pages under `docs/problems`.

## 1.0.1 - 2026-02-07

- Improved npm package metadata for discoverability (`keywords`, `homepage`, `repository`, `bugs`, `engines`).
- Updated root and package READMEs with problem-first examples and installation guidance.
- Added static docs starter in `docs/` for GitHub Pages.
- Added GitHub Pages deployment workflow.

## 1.0.0 - 2026-02-06

- Initial public release of SolveJS core modules.
- Added date, string, list, regex, constants, and meta package.
- Added CI, release workflow, and GitFlow conventions.
