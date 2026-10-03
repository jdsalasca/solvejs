# SolveJS Trust + Breadth Cycle — Design

Date: 2026-10-02
Status: approved
Author: brainstorming (superpowers)

## Problem

SolveJS ships 12 packages and ~127 exported functions to npm, and almost nobody uses them.
The code quality is fine. The adoption is not. Diagnosis from repository evidence:

| Package | Function exports | Tests | Tests per export |
|---|---|---|---|
| solvejs-numbers | 16 | 3 | 0.19 |
| solvejs-validators | 31 | 4 | 0.13 |
| solvejs-string | 9 | 2 | 0.22 |
| solvejs-regex | 6 | 2 | 0.33 |
| solvejs-date | 18 | 6 | 0.33 |
| solvejs-list | 12 | 4 | 0.33 |
| solvejs-constants | 9 | 3 | 0.33 |
| solvejs-schema | 3 | 3 | 1.00 |
| solvejs-objects | 7 | 5 | 0.71 |
| solvejs-env | 10 | 10 | 1.00 |
| solvejs-async | 6 | 9 | 1.50 |
| **Total** | **127** | **52** | **0.41** |

Two independent causes:

1. **Trust deficit.** A professional developer evaluating a library on npm checks its test
   surface first. `solvejs-string` showing 2 tests is an immediate reject. Meanwhile the
   repository invests heavily in process artifacts (305-line `docs/ideas.md`, growth
   calendars, marketing plans, telemetry specs, agent playbooks). The process is mature;
   the shipped product does not yet earn confidence.

2. **Unsearchable package names.** Nobody searches npm for `solvejs-string`. They search
   `slugify`, `isEmail`, `retry`, `formatCurrency`. The 12 domain-split package names are
   invisible to the search that actually happens.

Cause 1 gates cause 2. Adding more utilities on top of a 0.41 test-to-export ratio only
produces more invisible surface.

## Approach decision

Options considered:

- **Trust only** — raise coverage, add badges. Highest ratio of adoption effect per unit of
  work, but the search surface stays at 12 unsearchable names.
- **Breadth only** — add 4-6 packages for more keywords. Multiplies the trust deficit.
- **Consolidate to 3-4 packages** — matches how people search, and costs almost nothing
  because there are no users to break. Rejected: it destroys the "install only what you
  need" promise that is a real differentiator, and it is a large breaking diff.
- **Trust + breadth in parallel, sequenced inside each cycle** — selected.

## Core rule

**No package ships below the trust bar.** Every cycle has two legs and both must be green:

- **Leg A (Trust).** Take the weakest package by test-to-export ratio. Raise it to at least
  1 test per exported function, including boundary vectors: timezone and DST boundaries,
  unicode, numeric limits, null/undefined/empty input. If a new test uncovers a bug, the fix
  ships in the same cycle.
- **Leg B (Breadth).** Ship exactly one new utility into an existing package, or one new
  package when the domain is genuinely distinct. A new package must have at least 6
  utilities, a name a developer would plausibly search, and must ship tests, README,
  changelog entry, and benchmark in the same cycle.

The rule is what makes "parallel" safe. Breadth never accumulates on an untrusted base.

## Root fixes

Three changes, each done once, replacing a recurring manual cost.

### 1. Workspace topo-sort runner

`package.json` currently hardcodes the 12 packages in two ~570-character script strings
(`build:core`, `test:core`). The ordering is load-bearing because the meta package
`solvejs` depends on all others, and `npm run --workspaces` executes workspaces in
**alphabetical** order, which builds `solvejs` before its dependencies and fails.

`npm run --workspaces` was verified to run alphabetically, not topologically. The hand-written
list is therefore not laziness, it is a workaround for a real ordering constraint.

New `scripts/run-workspaces.mjs` reads every workspace `package.json`, builds the internal
dependency graph, topologically sorts it, and runs the requested script in that order. The
hardcoded strings are replaced by invocations of this script. Adding a package becomes a
zero-touch operation: create the directory, add the workspace, done.

### 2. Trust-bar gate

`scripts/check-test-baseline.mjs` fails when any package's test count is below its exported
function count. The `test:baseline` CI step already invokes it, so no new CI wiring is needed.

This makes the core rule self-enforcing rather than dependent on maintainer discipline, which
is the only way a "continuous improvement" loop stays honest over many cycles.

What this enforces is **density**, `tests >= exports`. It does not prove that every individual
export has a test: a package with 9 tests and 1 export passes, and adding an untested second
export also passes. What it does catch is the regression it exists for, exports growing past the
test count. Verified by appending 15 exports to `solvejs-constants` and watching the gate fail at
`9 tests for 17 exported functions`.

### 3. Honest coverage and size numbers

Coverage via the Node built-in test runner (`node --test --experimental-test-coverage`), no
added dependency. Package install size via `node:zlib` gzip of `dist`, no added dependency.
Both feed a generated report and README badges.

Badges must state measured values. A badge that cannot be regenerated by a script is a
liability, not a signal.

## Breadth order

Selected by reach x pain x searchability:

1. `solvejs-url` — building and manipulating URLs is near-universal; the `env` package parses
   URLs but nothing builds them. Very small API surface, immediately searchable.
2. `solvejs-cache` — TTL cache and async memoization boilerplate. Already flagged in
   `docs/guides/new-package-opportunities.md`.
3. `solvejs-json` — safe parse/stringify at API boundaries, stable stringify for cache keys.
   Already flagged in the same document.
4. `solvejs-pagination` — offset/page conversion and clamping. Small, very high call
   frequency in APIs.
5. `solvejs-semver` — comparison and range satisfaction. Well-defined, searchable.
6. `solvejs-errors` — structured application errors. Enforces the error contract that
   `AGENTS.md` already mandates in prose but nothing enforces in code.
7. `solvejs-money` — integer-cent arithmetic and lossless allocation. Highest reach per pain
   in fintech, but the highest correctness risk because of rounding. Deliberately last.
8. `solvejs-http` — status text, retryability, header helpers.

## Trust order

Ascending test-to-export ratio:

1. `solvejs-numbers` (0.19, 16 exports)
2. `solvejs-validators` (0.13, 31 exports — worst in absolute test count)
3. `solvejs-string` (0.22, 9 exports)
4. `solvejs-regex` (0.33, 6 exports)
5. `solvejs-date` (0.33, 18 exports — DST and leap-year vectors)
6. `solvejs-list` (0.33, 12 exports)
7. `solvejs-constants` (0.33, 9 exports)
8. `solvejs-schema` (1.00, 3 exports)
9. `solvejs-objects` (0.71, 7 exports)

`solvejs-env`, `solvejs-async` and the meta package already meet the bar and need no trust
leg, only continued regression coverage.

## Cycle 1 scope

The first cycle, executed in order:

1. `scripts/run-workspaces.mjs` replacing both hardcoded root script strings.
2. `scripts/check-trust-bar.mjs` plus CI wiring.
3. Coverage and size reporting script.
4. Trust leg on `solvejs-numbers`, raised to at least 16 tests.
5. New package `solvejs-url` with 6-8 utilities, full tests, README, benchmark, changelog.

## Explicit non-goals

- The growth, marketing and community-automation apparatus is left untouched. Removing it is
  the maintainer's decision, not this loop's.
- No package consolidation. The per-package install promise stays.
- No runtime dependencies in any package.
- No cron parsing and no money arithmetic until the earlier breadth items are green. Money
  is deferred specifically because rounding correctness demands more care than it is worth
  while the trust base is still being built.
- No API renames of existing exports.

## Success criteria

- Every package meets or exceeds 1 test per exported function, enforced by CI.
- The hardcoded package lists are gone from `package.json`.
- Coverage and install-size figures are script-generated and published in the README.
- Each breadth item ships as a published-ready package with tests, docs, benchmarks and a
  changelog entry before the next one starts.
- All four quality gates stay green at every commit: `npm run build`, `npm test`,
  `npm run test:baseline`, `npm run docs:check-links`.

## Execution model

Continuous. After the spec and plan are approved, cycles run back to back without waiting for
confirmation, until the maintainer explicitly says stop. Each cycle is one atomic commit with
the executed command list attached.
