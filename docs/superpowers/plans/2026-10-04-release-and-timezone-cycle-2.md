# Cycle 2: Hardening the Release Path and Timezone Boundaries

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the two release-blocking gaps that let nine packages ship or fail silently, and pin the timezone and calendar boundaries that the date package claims to be immune to.

**Architecture:** The release workflow stops naming packages and derives the publish list from the workspace glob, which removes an entire class of silent drift. The date package gains regression tests at the exact DST transition instants and at month-end and leap-year boundaries, proving the UTC anchoring the package already documents rather than assuming it.

**Tech Stack:** TypeScript 5.9 compiled to ESM + CJS with declarations, Node 24 built-in test runner, npm workspaces, GitHub Actions. Zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-02-trust-and-breadth-design.md`

## Global Constraints

- Runtime dependencies stay at zero in every published package.
- Every package keeps `main`, `module`, `types` and an `exports` map with `types`/`import`/`require`.
- A behavior change ships with the test that found it plus a `CHANGELOG.md` entry carrying a migration impact.
- The full gate sequence is `npm run quality`, which runs build, tests, test baseline, meta wiring, CommonJS output, publish contents, release matrix, docs links and lint.
- No new package list may be written by hand anywhere, including inside a workflow.

## Review Focus

Five conditions a user hits that no current test exercises.

1. A DST transition instant — `2024-03-10T12:00:00Z` for US spring-forward, `2024-10-06` for fall-back, `2024-03-31` and `2024-10-27` for Europe. The package claims UTC anchoring; nothing proves it at the boundary itself. Pinned in Task 3.
2. `addBusinessDays` from a month-end. `2024-01-31` is a Wednesday and `2024-02-01` is the next business day, but `2024-03-31` is a Sunday and the answer must skip to Monday. Pinned in Task 3.
3. `diffInDays` argument order. The contract is `left - right`, which matches `date-fns` and is the opposite of what most callers assume. It is documented and tested, and Task 3 pins it at a DST boundary too.
4. A package added to the workspace but absent from the release matrix. That is exactly how nine packages became unpublishable. Pinned in Task 1.
5. The meta package reaching npm before its dependencies. Matrix jobs run in parallel, so ordering is not automatic. Pinned in Task 2.

---

### Task 1: Derive the publish list from the workspaces

`release.yml` listed 11 packages in a hardcoded matrix while the workspace held 20. Nine were therefore not publishable: `solvejs-schema` had shipped once at v1.0.0 and could never be updated, and the eight newer packages could not be released at all even though the meta package depends on them. A tag would have published a `@jdsalasc/solvejs` that fails to install.

**Files:**
- Create: `scripts/release-matrix.mjs`
- Create: `test/release-matrix.test.mjs`
- Modify: `package.json` (`scripts.check:release`, `scripts.quality`)

**Interfaces:**
- Produces: `node scripts/release-matrix.mjs` writes a JSON array of workspace-relative paths to stdout, sorted, forward-slashed, excluding the meta package and any private workspace. Exits non-zero when a workspace is unscoped or has no version.

- [ ] **Step 1: Write the failing test**

```js
test("the publish list covers every publishable workspace", () => {
  const expected = workspaces.filter((e) => e.manifest.name !== "@jdsalasc/solvejs").map((e) => e.path).sort();
  assert.deepEqual([...matrix].sort(), expected);
  assert.ok(matrix.length >= 19);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/release-matrix.test.mjs`
Expected: FAIL, the module does not exist yet.

- [ ] **Step 3: Implement `scripts/release-matrix.mjs`**

Read root `package.json`, expand the `packages/*` glob, keep directories holding a `package.json`, drop the meta package and anything with `private: true`, map each path to forward slashes, sort, then validate that every remaining entry has a scoped name and a non-empty version. Throw before writing anything if either fails.

- [ ] **Step 4: Run it to see it pass**

Run: `node --test test/release-matrix.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/release-matrix.mjs test/release-matrix.test.mjs package.json
git commit -m "fix(release): derive the publish matrix so no package can be dropped again"
```

### Task 2: Publish the meta package only after its dependencies

The leaves publish in parallel, so the meta package can reach npm before a dependency exists and break `npm install` for everyone.

**Files:**
- Modify: `.github/workflows/release.yml`
- Modify: `.github/workflows/ci.yml`
- Modify: `AGENTS.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: the JSON array from Task 1.

- [ ] **Step 1: Add the failing assertion**

```js
test("the release workflow derives its matrix instead of hardcoding one", () => {
  assert.match(workflow, /node scripts\/release-matrix\.mjs/);
  assert.equal(/^\s*-\s*packages\/solvejs-[a-z]+\s*$/m.test(workflow), false);
  assert.match(workflow, /needs:\s*publish-leaves/);
});
```

- [ ] **Step 2: Confirm it fails against the current workflow**

Run: `node --test test/release-matrix.test.mjs`
Expected: FAIL on the hardcoded matrix assertion.

- [ ] **Step 3: Restructure the workflow into `plan`, `publish-leaves` and `publish-meta`**

`plan` emits the matrix as a job output. `publish-leaves` consumes it with `fromJSON`. `publish-meta` declares `needs: publish-leaves`, publishes `packages/solvejs`, then creates the GitHub Release and appends the community traceability links. Wire `check:release` into `ci.yml` so the drift cannot return.

- [ ] **Step 4: Confirm it passes**

Run: `node --test test/release-matrix.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/release.yml .github/workflows/ci.yml AGENTS.md CHANGELOG.md test/release-matrix.test.mjs
git commit -m "fix(release): publish the meta package after its dependencies"
```

### Task 3: Pin the DST and calendar boundaries in the date package

The package documents that it is UTC-anchored, but the only cross-timezone test uses `2024-03-08`, which is not a transition date, and it never exercises `endOfDay`, `diffInDays` or `addBusinessDays`. The repo's own `TODO.md` lists this as P0.

**Files:**
- Modify: `packages/solvejs-date/test/index.test.mjs`
- Modify: `packages/solvejs-date/README.md` if a limitation surfaces

**Interfaces:**
- Consumes: nothing. Uses the package's existing exports.

- [ ] **Step 1: Write the failing test**

Assert that under `TZ` of `UTC`, `America/New_York`, `Australia/Sydney` and `Europe/Madrid`, the four transition instants `2024-03-10`, `2024-10-06`, `2024-03-31` and `2024-10-27` at `T12:00:00Z` all produce the same `startOfDay` ISO string, the same `addDays(b, 1)` result, the same `diffInDays(b, addDays(b, 1))` of `-1` under the documented `left - right` contract, and the same `isWeekend`. Restore `process.env.TZ` in a `finally` block, as the existing test at line 257 does.

- [ ] **Step 2: Run it to see the result**

Run: `npm test --workspace packages/solvejs-date`
Expected: the assertions hold, because the package is genuinely UTC-anchored. A failure means a real anchoring bug and must be fixed rather than the expectation relaxed.

- [ ] **Step 3: Add the month-end and leap-year vectors**

`addBusinessDays(new Date("2024-01-31T12:00:00Z"), 1)` is `2024-02-01`; `addBusinessDays(new Date("2024-03-31T12:00:00Z"), 1)` is `2024-04-01` because March 31 is a Sunday; `addBusinessDays(new Date("2024-03-11T12:00:00Z"), -1)` is `2024-03-08`; `isLeapYear(1900)` is false, `isLeapYear(2000)` is true, `isLeapYear(2024)` is true; `daysInMonth(2024, 2)` is 29.

- [ ] **Step 4: Run the package suite**

Run: `npm test --workspace packages/solvejs-date`
Expected: PASS.

- [ ] **Step 5: Run the full gate sequence**

Run: `npm run quality`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/solvejs-date
git commit -m "test(date): pin DST transition and month-end boundaries"
```

## Round Log

- Cycle 1: trust bar across every package, coverage and size reports, and the seven breadth packages. Complete.
- Cycle 2 Task 1: publish matrix derived from the workspaces. Complete, `c0e3aa6`.
- Cycle 2 Task 2: meta published after its leaves. Complete, `c0e3aa6`.
- Cycle 2 Task 3: DST and calendar boundaries. Complete. These are characterisation tests, not bug
  fixes: every assertion passed on the first run because the package was already correctly
  UTC-anchored. That is the useful outcome, because the claim was previously unproven, but it is not
  a defect found. The real defect this cycle was the release matrix in Task 1.

## Findings worth keeping

- The DST anchoring holds at the exact transition instants for both hemispheres, which was the open
  P0 in `TODO.md`. That item is now closed.
- `diffInDays` is `left - right`, matching `date-fns`. Two wrong labels in the first draft of the
  new test claimed US fall-back happens on 2024-10-06 and Australia ends DST the same day; both were
  corrected against the real 2024 calendar before the test was committed.
- `isLeapYear` and `daysInMonth` take numbers, not a `Date`. Worth remembering when reading the API.

## Blockers

- Publishing to npm needs `secrets.NPM_TOKEN`. Until it exists the release workflow skips
  publishing by design, so the twenty packages stay unpublished. That is a maintainer action.
- `solvejs-schema` is on npm at v1.0.0 while the repo declares 1.9.0. The version gap closes on the
  next tagged release, which is a maintainer action too.