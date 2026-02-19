# Product Ideas and Execution Backlog

This file contains high-impact, implementation-ready ideas for SolveJS.

## Prioritization Model

Score each item by:

- Reach: how many developers face the problem.
- Pain: severity in production.
- Build effort: implementation and maintenance cost.
- Adoption leverage: does it help npm/GitHub discoverability.

Execution order: maximize `Reach + Pain + Adoption leverage` while minimizing maintenance risk.

## P0: Immediate Impact (0-4 weeks)

1. Validation Error Translator Pack
- Problem: teams need localized, UI-friendly validation errors.
- Build:
  - Add translator helpers for common locales (EN/ES/PT) in `solvejs-validators`.
  - Keep machine error codes stable, translate only human messages.
  - Add React and Express examples.
- Why impact: fast adoption in forms-heavy apps.

2. Date/Timezone Safety Recipes
- Problem: date bugs are among top production incidents.
- Build:
  - Add docs cookbook for UTC boundaries, DST edge cases, billing cutoffs.
  - Add tests for DST transitions and leap-year boundaries.
- Why impact: trust and reliability increase.

3. Migration Kits from lodash/date-fns snippets
- Problem: developers hesitate to switch without direct mapping.
- Build:
  - Add migration table and side-by-side code recipes.
  - Add quick codemod suggestions in docs.
- Why impact: direct conversion funnel from existing ecosystem tools.

4. API Contract Validation Recipes
- Problem: backend teams need reusable request validation patterns.
- Build:
  - Add framework recipes for Next.js route handlers, Express middleware, Nest pipes.
  - Include structured error mapping example.
- Why impact: high practical utility for backend teams.

5. Docs Search and Intent Pages
- Problem: utility libraries fail when users cannot find right function quickly.
- Build:
  - Add intent index: "I need to..." to map pain point -> function.
  - Improve SEO pages for top intents.
- Why impact: better discoverability and activation.

## P1: Growth and Differentiation (1-2 months)

1. SolveJS Compatibility Matrix
- Scope: Node versions, bundlers, frameworks.
- Deliverable: auto-generated compatibility table in docs.

2. Production Incident Cookbook
- Scope: practical fixes (bad input parsing, pagination math, dedupe, retries).
- Deliverable: incident-to-utility recipes with tests.

3. Utility Playground (Static)
- Scope: simple interactive docs widgets for core utilities.
- Deliverable: browser playground under `docs/` with no backend.

4. Typed Schema Helpers (No Runtime Dependency)
- Scope: light helper patterns for typing validated shapes.
- Deliverable: TS-first utilities and examples.

5. Community Challenge Series
- Scope: monthly coding prompts solved with SolveJS utilities.
- Deliverable: issue template + leaderboard markdown.

## P2: Strategic Bets (2-4 months)

1. SolveJS AI Prompt Pack for Code Assistants
- Scope: curated prompts for Copilot/Gemini/Codex to suggest SolveJS idioms.
- Deliverable: `docs/ai-prompts/` with package-specific prompt recipes.

2. Performance Observatory
- Scope: historical benchmark trend snapshots by package.
- Deliverable: generated markdown + charts committed weekly.

3. Reliability Score per Package
- Scope: combine test coverage baseline, API stability, and bug history.
- Deliverable: health badge per package in docs.

4. Regional Validator Expansion Program
- Scope: country-level patterns and examples with contributor guides.
- Deliverable: locale onboarding kit and contributor checklist.

## UX Ideas for Docs and Community

- Add "Top 10 production mistakes" page linking to exact utilities.
- Add visual decision flow: date/string/list/object/regex/validator/async/env.
- Add "copy snippet" buttons in static docs pages.
- Add practical persona paths:
  - Backend API engineer path.
  - Frontend forms engineer path.
  - Data processing path.

## Messaging and Positioning Ideas

- Tagline experiments:
  - "Utilities for real incidents, not toy examples."
  - "Zero dependencies. Maximum production signal."
  - "Small utilities. Big incident prevention."
- Social content format:
  - 1 pain point,
  - 1 minimal snippet,
  - 1 measurable result.

## Agent-Ready Task Templates

Use this structure in issues/PRs:

1. Problem statement
2. User persona affected
3. Proposed API or docs change
4. Test cases list
5. Risk and compatibility notes
6. Rollback plan
7. Adoption metric to track

## Suggested Next 10 Implementation Tickets

1. Add DST edge-case tests in `packages/solvejs-date/test/index.test.mjs`.
2. Add EN/ES/PT validation translator helpers in `packages/solvejs-validators`.
3. Add migration guide: lodash -> SolveJS in `docs/guides/`.
4. Add migration guide: date-fns -> SolveJS date in `docs/guides/`.
5. Add Next.js API validation recipe in `examples/nextjs-route-handler/README.md`.
6. Add Express structured error middleware recipe in `examples/express-middleware/README.md`.
7. Add docs page "I need to..." intent navigation in `docs/index.html`.
8. Add package compatibility table generator in `scripts/` and docs output.
9. Add benchmark trend report generator in `scripts/` and docs output.
10. Add monthly community challenge template in `docs/community/`.

## Non-Negotiables

- Keep runtime dependencies at zero unless explicit maintainer approval.
- Keep API behavior deterministic and documented.
- Ship tests + docs with every behavior change.
- Optimize for maintainability, not just velocity.
