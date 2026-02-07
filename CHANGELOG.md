# Changelog

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
