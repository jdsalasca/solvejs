# SolveJS Package Health Report

Updated on 2026-02-07.

This report lists each package, its practical utilities, current status, known issues, weak points, and next improvements.

| Package | Practical utilities | Current status | Known issues | Weak points | Next improvements |
|---|---|---|---|---|---|
| `@jdsalasc/solvejs` | Single import surface for all SolveJS domains. | `1.4.0` in repo, tests passing locally. | Depends on `solvejs-objects@1.4.0` availability in npm. | No tree-shake guidance in README. | Add import-size examples and package-by-package migration guide. |
| `@jdsalasc/solvejs-date` | `parseDateStrict`, `parseIsoDate`, `parseUnixTimestamp`, `formatDate`, `addDays`, `diffInDays`. | `1.4.0` stable with tests. | None critical identified. | Limited tests around DST and timezone edge cases. | Add DST boundary tests and timezone example recipes. |
| `@jdsalasc/solvejs-string` | `slugify`, `stripHtml`, `truncate`, `mask`, casing helpers. | `1.4.0` stable with tests. | None critical identified. | Limited Unicode and locale-specific casing tests. | Add Unicode normalization test matrix and locale notes. |
| `@jdsalasc/solvejs-list` | `uniqueBy`, `groupBy`, `partition`, `intersection`, `difference`, `sortBy`. | `1.4.0` stable with tests. | None critical identified. | Performance profile not documented for large arrays. | Add benchmark section for `10k`/`100k` list operations. |
| `@jdsalasc/solvejs-regex` | `REGEX_PATTERNS`, `validateByName`, `validateWithPattern`, `escapeRegex`. | `1.4.0` stable with tests. | None critical identified. | Pattern coverage could be broader for global use cases. | Add additional patterns and false-positive examples. |
| `@jdsalasc/solvejs-constants` | `TIME`, `FILE_SIZE_BYTES`, `HTTP_METHODS`, `COMMON_HTTP_HEADERS`, `parseBooleanString`. | `1.4.0` stable with tests. | None critical identified. | Naming overlap (`HTTP_HEADERS` in docs vs `COMMON_HTTP_HEADERS` in code) can confuse users. | Align docs wording exactly with exported names in every README page. |
| `@jdsalasc/solvejs-numbers` | `toNumber`, `safeDivide`, `percentChange`, `toCurrency`, `roundTo`, `clamp`. | `1.4.0` stable with tests. | None critical identified. | No explicit precision guidance for financial calculations. | Add precision caveats and examples with controlled rounding. |
| `@jdsalasc/solvejs-validators` | Structured validators (`validate*` + `is*`) for phone, postal, username, URL, UUID, IPv4, ISO date. | `1.4.0` stable with tests and locale matrix docs. | Contains legacy typo aliases (`isAddresDirection`, `isAddresDirrection`) kept for compatibility. | Country coverage still limited to current matrix. | Add deprecation note for typo aliases and expand country packs. |
| `@jdsalasc/solvejs-objects` | `pick`, `omit`, `hasOwn`, `get`, `set`, `deepMerge`. | `1.4.0` code complete and tested locally. | npm registry visibility is inconsistent; package lookup returned `Not found` during audit. | Single test file; nested path edge-cases can be expanded. | Resolve npm publication/visibility and add deep nested path test suite. |

## Cross-Package Gaps

- Release workflow needed hardening for retries and partial publishes.
- Some package READMEs can be more explicit about edge cases and constraints.
- Lint command is currently placeholder text in all workspaces.

## Priority Order

1. Resolve npm visibility/publication state for `@jdsalasc/solvejs-objects`.
2. Increase edge-case tests in `date`, `string`, and `objects`.
3. Improve practical README/API examples focused on production constraints.
4. Add linting baseline and enforce in CI.
