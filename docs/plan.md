# SolveJS Release Plan: 1.8.0 → 1.9.0

Updated on 2026-11-16.

## Current State (evidence)

Release 1.9.0 shipped on 2026-11-16.

- `@jdsalasc/solvejs@1.9.0` and all 19 leaves resolve from npm. The 11 older leaves and the meta package are at `1.9.0`; the 8 new packages are at `0.1.0`.
- A clean `npm i @jdsalasc/solvejs@1.9.0` installs 20 packages and the exported functions run.
- `npm run quality` passed: build, tests, baseline, meta wiring, CJS output, pack contents, release matrix, README snippets, docs links and lint.
- Publishing went through npm staged publishing and one batch approval, because the account uses a security key and the 2FA-bypass token is restricted to staging.
- The `teachers` external audit reported 49 errors and 4 warnings across 12 packages. Three were real defects and are fixed; the rest are complexity and length thresholds stricter than this codebase's style.

## Round 1: Close the release (P0) — DONE

Goal: make `1.9.0` installable from npm with all 20 packages.

1. Fixed the three real audit defects:
   - removed the unused `VALID_DIRECTIONS_ES` fixture;
   - replaced the precision-losing numeric literal with `Number(...)` in the `toNumber` test;
   - dropped the unnecessary `\/` escape in the address-line character class.
2. Regenerated `docs/guides/package-inventory.md` and `.html`; seven packages were missing from the committed table.
3. Merged `## Unreleased` into the `1.9.0` section and dated it 2026-11-16. The version had never been published, so its history belongs in one entry.
4. Ran `npm run quality` and committed on `develop`.
5. Staged the 20 packages, approved `pagination` plus an 18-package batch, and created the `v1.9.0` tag.

Verification (all passed):

- `npm view @jdsalasc/solvejs version` returns `1.9.0`.
- Every leaf resolves at its declared version.
- `npm pack --dry-run` contains no source or test files.
- A clean `npm i @jdsalasc/solvejs@1.9.0` succeeds and imports work.

## Round 2: Input robustness (P1)

The adversarial probe calls every export with `undefined`, `null`, symbols and `BigInt` and counts
6154 calls, 4632 throws and 3584 throws without a structured code. Most are documented validation
errors on values the TypeScript types already reject; the validators are the exception, because a
JavaScript consumer can reach them with no type check.

1. Make every `validate*` return a structured `INVALID_TYPE` result instead of throwing on a
   non-string value. `translateValidationResult` must tolerate an invalid result shape.
2. Raise line coverage in `async` (93.65%), `env` (90.70%) and `schema` (86.94%) above 95%.
3. Add one regression test per fixed crash.

Verification: the probe reports no unstructured `TypeError` for the `solvejs-validators` exports;
`npm run test:baseline` and `npm run quality` stay green.

## Round 3: Adoption (P1)

1. Add a "Limitations" section to every package README that lacks one, starting with the eight new
   packages.
2. Publish per-package size figures on the npm pages, not only in the root README.
3. Add migration recipes for the two functions teams replace most often (`lodash` pick/omit and
   `date-fns` formatting).

Verification: `npm run check:snippets` and `npm run docs:check-links` pass; every README has the
section.

## Round 4: Structural quality — DONE

Adopted the external audit's portable baseline as a repo-owned ESLint config (`eslint.config.mjs`),
wired into `npm run quality` as `lint:quality` with `--max-warnings 0`: complexity 8,
max-lines-per-function 40, max-depth 3, max-params 4, the correctness rules, and the security
plugin. Tests are exempt from the size thresholds, as in the portable baseline.

The first run reported 77 problems (58 errors, 19 warnings) across 12 packages and the scripts.
All were resolved:

- extracted validation, parsing, serialization, comparison, cache-entry and bucket-state helpers
  from the functions the rule flagged; behavior is unchanged and every package suite stayed green;
- deleted untracked compiled artifacts that had reappeared inside six `src` directories;
- documented the verified false positives from `security/detect-unsafe-regex`,
  `detect-non-literal-regexp` and `detect-non-literal-require` with per-line disables and a reason;
- split the report generators so no function exceeds the line limit.

Verification: `npm run lint:quality` exits 0 with no warnings; the external `teachers` audit exits 0
with `sin hallazgos`; `npm run quality` stays green.

## Risks and Rollback

- Publishing eight `0.1.0` packages for the first time is irreversible: npm does not allow
  republishing a version. The safety net is `npm deprecate`, not deletion.
- The meta package must publish after every leaf; publishing it first leaves a broken install.
- Rollback for the code: revert the release commit and tag. Rollback for npm: deprecate the
  affected version and publish a patch.
- The `1.9.0` changelog merge must preserve every existing bullet; losing one hides a behavior
  change from users.

## Out of Scope

- New runtime dependencies.
- New packages.
- Breaking API changes.
- Rewriting parsers only to satisfy an external linter.
