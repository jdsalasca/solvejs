# Implementation Blueprint

This blueprint turns strategy into executable delivery waves with clear ownership.

## Objectives

- Increase docs-to-install conversion.
- Reduce production incident patterns solved outside SolveJS.
- Improve contributor velocity without sacrificing API reliability.

## Wave Plan (12 Weeks)

### Wave 1 (Weeks 1-4): Activation and Trust

- SJ-P0-001 Validation Translator Core.
- SJ-P0-002 Date DST Reliability Suite.
- SJ-P0-003 Docs Intent Navigator.
- SJ-P0-004 Snippet Integrity Gate.
- SJ-P0-005 Migration Cookbook Pair.

Exit criteria:

- Translator API shipped with EN/ES/PT fallback.
- Date DST and leap-year matrix merged.
- Intent navigation for top 15 developer intents live.
- Snippet integrity gate is required in CI.
- Migration guides published and linked from home docs.

### Wave 2 (Weeks 5-8): Adoption and Integration

- SJ-P1-001 Compatibility Matrix Generator.
- SJ-P1-002 API Error Dictionary.
- SJ-P1-003 Community Challenge Engine.

Exit criteria:

- Compatibility matrix generated from script and published.
- Machine-readable error dictionary documented and versioned.
- Monthly challenge workflow produces executable contribution tasks.

### Wave 3 (Weeks 9-12): Scale and Governance

- SJ-P2-001 AI Prompt Pack.
- SJ-P2-002 Reliability Scoring Framework.
- Contract and quality guardrails hardened.

Exit criteria:

- Prompt pack used by at least one merged PR flow.
- Reliability report generated for every package.
- Weekly quality review cadence is operating.

## Epic to Package Mapping

| Epic | Primary package/docs area | Owner lane |
| --- | --- | --- |
| Validation Translator | `packages/solvejs-validators` | Core package agent |
| Date Reliability | `packages/solvejs-date` | Core package agent |
| Docs Intent Navigator | `docs/index.html`, `docs/problems/*` | Docs UX agent |
| Snippet Integrity | `scripts/`, `.github/workflows/` | DevEx/CI agent |
| Migration Cookbook | `docs/guides/*` | Developer education agent |
| Compatibility Matrix | `scripts/`, `docs/guides/` | Platform insight agent |
| Error Dictionary | `docs/references/`, validators docs | API contract agent |
| Challenge Engine | `docs/community/`, workflows | Community agent |
| AI Prompt Pack | `docs/agent/` | Agent enablement agent |
| Reliability Scoring | `scripts/`, `docs/guides/` | Reliability agent |

## Architecture Constraints

- Zero runtime dependencies remain default.
- Every new behavior is covered by tests and docs in the same PR.
- No API shape drift across packages without explicit design review.
- CI gates must fail fast with actionable diagnostics.

## Cross-Team Handoff Protocol

1. Story owner posts implementation note with modified file list.
2. Reviewer validates acceptance criteria and commands run.
3. Docs owner confirms snippets and links.
4. Maintainer records changelog impact.
5. Community owner adds shipped update in backlog digest.

## Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Story scope creep | Slower merge and unclear ownership | One-story-per-PR rule |
| Snippet drift | Broken first-use experience | CI snippet integrity gate |
| Error-code drift | Integration regressions | Contract tests + dictionary sync |
| Timezone assumptions | Incorrect date behavior | Explicit boundary matrix tests |

## Decision Log Hooks

- Major API contract changes require a design note in PR.
- Any rejected alternative must be captured under "Alternatives considered".
- Rollback strategy is mandatory for behavior-changing stories.
