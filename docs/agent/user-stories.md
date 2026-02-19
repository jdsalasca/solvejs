# Executable User Stories

Each story is implementation-ready and mapped to measurable impact.

Status labels:

- `ready`: can be implemented now.
- `blocked`: needs clarification.
- `done`: shipped and verified.

## Story Format

- ID
- Priority
- Problem
- Persona
- Outcome
- Scope
- Acceptance Criteria
- Test Plan
- Telemetry
- Risks
- Dependencies

## P0 Stories

### SJ-P0-001 Validation Translator Core (`ready`)
- Problem: validation errors are technically correct but not UX-ready in multilingual apps.
- Persona: frontend engineer building forms for global users.
- Outcome: stable error code + locale message translation helpers.
- Scope:
  - Add translator helper in `packages/solvejs-validators`.
  - Include EN, ES, PT dictionaries.
  - Expose extension API for custom dictionaries.
- Acceptance Criteria:
  - Same error code always maps to deterministic localized message.
  - Missing locale falls back to EN.
  - Unknown error code returns safe default message.
- Test Plan:
  - dictionary lookup tests,
  - fallback tests,
  - unknown code behavior tests,
  - integration example snapshot tests.
- Telemetry: reduced "cannot map validation message" issue frequency.
- Risks: breaking existing consumers if return shape changes.
- Dependencies: none.

### SJ-P0-002 Date DST Reliability Suite (`ready`)
- Problem: DST boundaries cause production date calculation bugs.
- Persona: backend engineer handling billing windows.
- Outcome: regression-safe date helpers around DST and month boundaries.
- Scope:
  - Add DST transition tests.
  - Add leap-year and month-end test matrix.
  - Add docs recipe for safe date boundaries.
- Acceptance Criteria:
  - DST transition cases are deterministic.
  - Leap-year behavior documented and tested.
- Test Plan:
  - boundary matrix tests,
  - invalid input tests,
  - deterministic output checks.
- Telemetry: drop in date-related bug reports.
- Risks: false assumptions in timezone behavior.
- Dependencies: none.

### SJ-P0-003 Docs Intent Navigator (`ready`)
- Problem: users do not know which package/function solves their pain quickly.
- Persona: developer evaluating library in first 3 minutes.
- Outcome: "I need to..." path that maps pain -> utility -> snippet.
- Scope:
  - Add intent index section to docs landing page.
  - Link each intent to exact problem guide.
- Acceptance Criteria:
  - Top 15 intents have direct links.
  - Links are verified by docs link checker.
- Test Plan:
  - link checker,
  - manual smoke test for navigation.
- Telemetry: improved docs CTR and time-to-first-success.
- Risks: stale intent links.
- Dependencies: docs pages must exist.

### SJ-P0-004 Snippet Integrity Gate (`ready`)
- Problem: snippets break silently over time.
- Persona: new adopter copying first snippet.
- Outcome: CI gate that validates critical snippets remain runnable.
- Scope:
  - Create snippet validation script under `scripts/`.
  - Add CI workflow for docs snippet checks.
- Acceptance Criteria:
  - Failing snippet breaks CI.
  - Report includes snippet file and line context.
- Test Plan:
  - intentional failing fixture,
  - passing fixture,
  - CI workflow dry run.
- Telemetry: fewer snippet-related community issues.
- Risks: fragile parser if snippet extraction is naive.
- Dependencies: docs format conventions.

### SJ-P0-005 Migration Cookbook Pair (`ready`)
- Problem: migration from lodash/date-fns lacks direct mapping.
- Persona: tech lead evaluating adoption cost.
- Outcome: migration guides with old vs new snippets.
- Scope:
  - Add lodash -> SolveJS map.
  - Add date-fns -> SolveJS map.
- Acceptance Criteria:
  - At least 12 mapped examples across both guides.
  - Include edge-case notes and caveats.
- Test Plan:
  - docs link check,
  - snippet smoke verification.
- Telemetry: migration-related issues and mentions.
- Risks: inaccurate one-to-one equivalence assumptions.
- Dependencies: current API coverage.

## P1 Stories

### SJ-P1-001 Compatibility Matrix Generator (`ready`)
- Problem: uncertainty about compatibility slows adoption.
- Persona: platform engineer.
- Outcome: generated compatibility matrix for Node/framework/bundler.
- Scope:
  - script in `scripts/`.
  - generated output in `docs/guides/`.
- Acceptance Criteria:
  - matrix includes supported Node LTS versions.
  - matrix generation is idempotent.
- Test Plan:
  - script output snapshot test,
  - docs link check.
- Telemetry: reduced compatibility questions in issues.
- Risks: stale data.
- Dependencies: release policy version updates.

### SJ-P1-002 API Error Dictionary (`ready`)
- Problem: teams need machine-readable error catalog.
- Persona: frontend and backend integrators.
- Outcome: stable JSON dictionary and human docs.
- Scope:
  - create `docs/references/error-codes.json`.
  - create markdown reference page.
- Acceptance Criteria:
  - each code has message template and context fields.
  - dictionary versioning strategy documented.
- Test Plan:
  - schema validation tests,
  - docs link tests.
- Telemetry: lower support load for error mapping.
- Risks: drift between code and docs.
- Dependencies: validator package behavior.

### SJ-P1-003 Community Challenge Engine (`ready`)
- Problem: community engagement needs recurring structured prompts.
- Persona: contributor community lead.
- Outcome: monthly challenge format with backlog-linked tasks.
- Scope:
  - template in docs/community.
  - automation script for challenge generation.
- Acceptance Criteria:
  - one challenge template per month.
  - challenge references open issues by priority.
- Test Plan:
  - generation script smoke test.
- Telemetry: issue participation rate.
- Risks: low participation if challenge complexity too high.
- Dependencies: active issue backlog.

## P2 Stories

### SJ-P2-001 AI Prompt Pack (`ready`)
- Problem: AI agents generate inconsistent patterns without guidance.
- Persona: maintainers using Gemini/Codex/Copilot.
- Outcome: package-specific prompt templates and constraints.
- Scope:
  - prompt pack by domain (date, validators, async, env).
  - anti-pattern list and expected output examples.
- Acceptance Criteria:
  - each prompt template references concrete file paths.
  - includes validation command checklist.
- Test Plan:
  - manual prompt trial with one story.
- Telemetry: reduced PR rework cycles.
- Risks: prompts becoming outdated.
- Dependencies: AGENTS.md governance.

### SJ-P2-002 Reliability Scoring Framework (`ready`)
- Problem: package health is hard to compare objectively.
- Persona: maintainers and adopters.
- Outcome: reliability score per package using measurable signals.
- Scope:
  - define scoring inputs.
  - generate score report in docs.
- Acceptance Criteria:
  - score formula documented and reproducible.
  - each package has score + rationale.
- Test Plan:
  - deterministic score generation test.
- Telemetry: improved maintenance focus by weak packages.
- Risks: overfitting to incomplete metrics.
- Dependencies: metrics scripts.

## Backlog Expansion Prompts for Agents

Use these prompts when creating new stories:

1. "Which top 3 incidents from recent issues can be solved by one utility enhancement?"
2. "What docs gap causes first-time users to drop during onboarding?"
3. "What contract guarantees are missing for integrations?"
4. "What changes reduce support cost while preserving zero dependencies?"
