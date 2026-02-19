# AGENTS.md

This document is the execution contract for autonomous agents working in this repository.

## Mission

Ship zero-dependency JS/TS utilities that solve real production pain points with predictable APIs, excellent docs, and strong community trust.

## Product North Star

- Primary user: JavaScript/TypeScript developers in app and API teams.
- Promise: install only what you need, no runtime dependencies, stable behavior.
- Success metrics:
  - npm downloads and retention by package.
  - Time-to-first-success from docs/examples.
  - Community issue-to-release cycle time.
  - Defect escape rate in utility behavior.

## Repository Shape

- Monorepo with npm workspaces.
- Packages in `packages/*`.
- Docs in `docs/`.
- Examples in `examples/`.
- Automation scripts in `scripts/`.

## Required Agent Context (Read First)

Before implementing, agents must read:

- `AGENTS.md`
- `docs/ideas.md`
- `docs/community/issue-backlog.md`
- `docs/agent/README.md`
- `docs/agent/user-stories.md`
- `docs/agent/process-flows.md`
- `docs/agent/system-design.md`
- `docs/agent/execution-checklists.md`

## Mandatory Engineering Rules

- Keep runtime dependencies at zero unless explicitly approved by maintainer.
- Maintain ESM + CJS + TypeScript declarations for every package.
- Preserve backward compatibility for minor/patch releases.
- Any behavior change requires:
  - tests,
  - docs update,
  - changelog update.
- Prefer deterministic functions (pure when possible).
- Avoid locale/timezone ambiguity; make assumptions explicit in API docs.
- Do not merge PRs with failing CI under any circumstance.
- Do not introduce package-specific API style drift; keep naming and return contracts consistent.
- Each PR must include exactly one primary intent (feature, fix, or docs) to keep review quality high.

## Quality Gates Before Any Push

Run locally:

```bash
npm run build
npm test
npm run test:baseline
npm run docs:check-links
```

If you change growth or reporting artifacts, also run:

```bash
npm run metrics:community
npm run report:perf
```

If you change examples, run the corresponding checks:

```bash
npm run example:next:test
npm run example:express:test
npm run example:env:test
npm run example:invoice:test
```

## Definition of Done (DoD)

A task is done only if:

1. Code compiles and tests pass.
2. Edge cases are covered for the changed behavior.
3. Relevant README/package docs are updated.
4. `CHANGELOG.md` has a clear entry.
5. Example usage exists when API surface changes.
6. No unrelated refactors were bundled.
7. Changelog entry includes migration impact (`none` if not required).
8. A rollback step is documented in PR description.

## API Design Standards

- Use explicit names over short clever names.
- Validate inputs and return stable error shapes.
- Keep function signatures minimal and composable.
- Prefer options objects for extensibility.
- Never throw ambiguous errors.
- Never return mixed success/error types for the same function.

### Error Contract

- Use human-readable message + machine-readable code.
- Include context keys when useful (e.g., `field`, `expected`, `received`).
- Keep error codes stable across versions.
- Keep message tone neutral and actionable for API and UI surfaces.

## Testing Standards

For each new utility, cover:

- happy path,
- invalid input,
- boundary values,
- locale/timezone cases where applicable,
- idempotence/determinism when expected.

Performance-sensitive utilities should include or update benchmark scenarios in `benchmarks/`.

Minimum expectations:

- New utility: at least 6 tests.
- New edge-case fix: at least 1 regression test.
- Date/number/regex utilities: include boundary test vectors.

## Documentation Standards

- Problem-first language: “when you face X, use Y”.
- Add copy/paste snippets with real inputs/outputs.
- Include at least one API/backend example and one frontend/form example if relevant.
- Keep docs aligned with published package names and versions.
- Include expected output blocks for every new snippet.
- Add one anti-pattern note when common misuse is likely.

## Community Impact Standards

Every new feature PR should include:

- one "why this matters" note for developers,
- one adoption snippet for social/community channels,
- one issue seed for follow-up improvements.

Use:

- `docs/community/issue-backlog.md`
- `docs/growth/`

## Agent Workflow (Gemini/Codex/Other)

1. Read `README.md`, `TODO.md`, and the target package `README.md`.
2. Pick one scoped task from `docs/ideas.md` (P0 first).
3. Implement minimal vertical slice.
4. Add tests and docs in the same commit.
5. Run quality gates.
6. Open PR with:
  - scope,
  - user pain solved,
  - risk notes,
  - rollback plan.
7. Link one metric to validate impact post-merge (downloads, docs clicks, issue reduction).

## Branch and PR Conventions

- Branch: `feat/<package>-<short-topic>` or `fix/<package>-<short-topic>`.
- Commit style: Conventional Commits.
- PR title: `[package] concise impact statement`.
- PR body must include test evidence commands executed locally.

## Review and Merge Policy

- Require at least one maintainer approval.
- Reject PRs with hidden scope creep.
- Rebase on latest `main` before merge when conflicts exist.
- Squash-merge by default to keep history understandable.

## Release Policy for Agents

- Any package behavior change requires version bump alignment in package changelog notes.
- Validate package exports before release (`npm run build` and package README API sync).
- Never publish from a dirty worktree.
- Prepare release notes with:
  - user-facing improvements,
  - breaking-change statement (`none` if none),
  - migration instructions.

## Security and Reliability

- Never leak environment values in logs or examples.
- Sanitize regex and parser-heavy inputs to avoid DoS patterns.
- Keep async utilities cancellation/timeouts explicit.
- Prefer safe defaults over permissive behavior.

## Out of Scope Without Explicit Approval

- Breaking API changes.
- Runtime dependency additions.
- Repository-wide formatting churn.
- Reorganization of package names.
- Massive docs rewrites unrelated to active task.

## High-Value First

Prioritize work that improves one of:

- adoption conversion (docs/examples),
- correctness and trust (tests/edge cases),
- integration ease (framework recipes),
- migration from common alternatives.

## Execution Anti-Patterns (Do Not Do)

- Do not add abstractions before second real use-case.
- Do not rename exported APIs to “clean up style” without explicit demand.
- Do not batch multiple packages in one risky change unless required.
- Do not ship functionality without docs and runnable examples.
