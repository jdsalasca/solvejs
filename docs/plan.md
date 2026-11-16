# SolveJS Release Plan: 1.8.0 → 1.9.0

Updated on 2026-11-16.

## Current State (evidence)

- 20 workspaces. 12 leaves and the meta package declare `1.9.0`; 8 new packages declare `0.1.0`.
- npm carries `1.8.0` for the 12 older leaves, `1.0.0` for `solvejs-schema`, and nothing for the 8 new packages.
- `CHANGELOG.md` already has a `1.9.0` section, but no `v1.9.0` tag exists and no `1.9.0` version is on npm. The release never happened.
- `npm run quality` passes: build, tests, baseline, meta wiring, CJS output, pack contents, release matrix, README snippets, docs links and lint.
- `release.yml` derives its matrix from the workspaces, but the repository has no `NPM_TOKEN` secret, so a tag alone publishes nothing. Local publish needs a valid npm session; the current npm token returns `401`.
- The `teachers` external audit reports 49 errors and 4 warnings across 12 packages. Three are real defects; the rest are complexity and length thresholds stricter than this codebase's style.

## Round 1: Close the release (P0)

Goal: make `1.9.0` installable from npm with all 20 packages.

1. Fix the three real audit defects:
   - remove the unused `VALID_DIRECTIONS_ES` fixture;
   - replace the precision-losing numeric literal with `Number(...)` in the `toNumber` test;
   - drop the unnecessary `\/` escape in the address-line character class.
2. Regenerate `docs/guides/package-inventory.md` and `.html`; seven packages are missing from the committed table.
3. Merge `## Unreleased` into the `1.9.0` section and date it 2026-11-16. The version was never published, so its history belongs in one entry.
4. Run `npm run quality` and commit on `develop`.
5. Authenticate npm, publish the 19 leaves first, then the meta package, then create and push the `v1.9.0` tag.

Verification:

- `npm view @jdsalasc/solvejs version` returns `1.9.0`.
- Every leaf resolves at its declared version.
- `npm pack --dry-run` contains no source or test files.
- A clean `npm i @jdsalasc/solvejs@1.9.0` succeeds.

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

## Round 4: Structural quality (P2, non-blocking)

The `teachers` audit still reports complexity above 8 and functions above 40 lines. Chasing every
threshold would fragment parsers and state machines that are clearer as one function today. Adopt a
repo-owned ESLint baseline instead of a one-off external run, with thresholds this codebase can
hold: `complexity: 12`, `max-lines-per-function: 60`, `max-depth: 4`, plus the correctness rules
(`no-unused-vars`, `no-loss-of-precision`, `no-useless-escape`).

Refactor only the outliers first: `solvejs-semver` (`satisfies`, `comparePrerelease`),
`solvejs-json` (`deepEqual`), `solvejs-async` (`retry`, `createTokenBucketLimiter`) and
`solvejs-cache` (`createLruCache`).

Verification: the new lint script is wired into `npm run quality`, and the refactors keep the
behavioral suite green.

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
