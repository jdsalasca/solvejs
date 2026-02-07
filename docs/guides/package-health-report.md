# SolveJS Package Health Report

Updated on 2026-02-07 (revalidated after v1.4.0 release fixes).

This report lists each package, its practical utilities, current status, known issues, weak points, and next improvements.

| Package | Practical utilities | Current status | Known issues | Weak points | Next improvements |
|---|---|---|---|---|---|
| `@jdsalasc/solvejs` | Single import surface for all SolveJS domains. | `1.4.1` in repo and npm, tests passing locally. | None critical identified. | No tree-shake guidance in README. | Add import-size examples and package-by-package migration guide. |
| `@jdsalasc/solvejs-date` | `parseDateStrict`, `parseIsoDate`, `parseUnixTimestamp`, `formatDate`, `addDays`, `diffInDays`. | `1.4.1` stable with tests. | None critical identified. | DST/timezone coverage improved, but still not exhaustive for all locales. | Expand timezone-offset matrix by region examples. |
| `@jdsalasc/solvejs-string` | `slugify`, `stripHtml`, `truncate`, `mask`, casing helpers. | `1.4.1` stable with tests. | None critical identified. | Unicode/locale edge coverage improved, still room for language-specific casing nuances. | Add locale-specific caveats section in docs. |
| `@jdsalasc/solvejs-list` | `uniqueBy`, `groupBy`, `partition`, `intersection`, `difference`, `sortBy`. | `1.4.1` stable with tests. | None critical identified. | Baseline benchmark guidance added; more real-world data profiles still needed. | Add dataset-shape benchmark scenarios (high-cardinality keys). |
| `@jdsalasc/solvejs-regex` | `REGEX_PATTERNS`, `validateByName`, `validateWithPattern`, `escapeRegex`. | `1.4.1` stable with tests. | None critical identified. | Pattern coverage could be broader for global use cases. | Add additional patterns and false-positive examples. |
| `@jdsalasc/solvejs-constants` | `TIME`, `FILE_SIZE_BYTES`, `HTTP_METHODS`, `COMMON_HTTP_HEADERS`, `parseBooleanString`. | `1.4.1` stable with tests. | None critical identified. | Naming overlap (`HTTP_HEADERS` in docs vs `COMMON_HTTP_HEADERS` in code) can confuse users. | Align docs wording exactly with exported names in every README page. |
| `@jdsalasc/solvejs-numbers` | `toNumber`, `safeDivide`, `percentChange`, `toCurrency`, `roundTo`, `clamp`. | `1.4.1` stable with tests. | None critical identified. | Precision caveats now documented; add worked financial examples next. | Add tax/discount/invoice reference examples. |
| `@jdsalasc/solvejs-validators` | Structured validators (`validate*` + `is*`) for phone, postal, username, URL, UUID, IPv4, ISO date. | `1.4.1` stable with tests and locale matrix docs. | Contains legacy typo aliases (`isAddresDirection`, `isAddresDirrection`) kept for compatibility. | Country coverage expanded (CA/UY), still partial globally. | Continue expansion with prioritized country sets. |
| `@jdsalasc/solvejs-objects` | `pick`, `omit`, `hasOwn`, `get`, `set`, `deepMerge`. | `1.4.1` available in npm and locally tested. | None critical identified. | Nested path and mutation tests improved; symbol-key path support remains limited. | Evaluate safe support for bracket/symbol path notation. |
| `@jdsalasc/solvejs-async` | `sleep`, `timeout`, `retry`, `pMap`, `debouncePromise`, `throttlePromise`. | Integrated in monorepo flow and meta package. | Not published yet in this iteration. | Queue/rate-limit orchestration helpers are still missing. | Add queue and token-bucket style helpers. |

## Cross-Package Gaps

- Test density is still low in several packages (1-2 tests for broad APIs).
- Lint command is currently placeholder text in all workspaces.
- README examples are useful but still light on "limitations and edge cases" per utility.
- No published bundle-size snapshot per package for adoption comparisons.

## Priority Order

1. Expand edge-case tests to remaining low-coverage packages (`list`, `numbers`, `validators`).
2. Add linting baseline and enforce in CI.
3. Add limitations/constraints section in each package README.
4. Publish bundle-size and perf snapshots for adoption decision support.
