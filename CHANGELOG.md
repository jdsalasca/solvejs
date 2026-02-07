# Changelog

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
