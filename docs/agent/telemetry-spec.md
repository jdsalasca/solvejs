# Telemetry Specification

Telemetry aligns story execution with measurable product impact.

## Metrics Catalog

| Metric | Type | Owner | Source | Cadence |
| --- | --- | --- | --- | --- |
| Docs-to-install conversion | Product | Docs/Growth | Docs analytics + npm trend | Weekly |
| Time-to-first-success | Product | Docs | onboarding survey + issue tags | Biweekly |
| Issue-to-release cycle time | Delivery | Maintainers | GitHub issues + releases | Weekly |
| Defect escape rate | Quality | Core maintainers | bug labels after release | Monthly |
| Snippet breakage incidents | Reliability | DevEx | CI logs + issue tags | Weekly |

## Event Taxonomy

- `story_started`
  - fields: `story_id`, `priority`, `owner_lane`, `started_at`
- `story_completed`
  - fields: `story_id`, `duration_days`, `pr_number`, `release_tag`
- `quality_gate_failed`
  - fields: `gate_name`, `file_path`, `branch`, `failed_at`
- `adoption_signal`
  - fields: `package_name`, `period`, `downloads`, `delta_percent`

## Story Evidence Requirements

Every story PR should include:

1. story ID and priority.
2. executed validation command list.
3. metric expected to move post-merge.
4. rollback strategy summary.

## Dashboard Views

- Delivery view: active stories, blocked stories, lead time trend.
- Quality view: flaky checks, failed-gate frequency, defect escapes.
- Adoption view: downloads trend, docs entry-page CTR, migration guide usage.

## Weekly Review Ritual

1. Inspect metric deltas and outliers.
2. Identify top 3 blockers by cycle-time impact.
3. Convert blockers into actionable backlog items.
4. Publish weekly summary issue with clear owners.

## Data Quality Rules

- Never compare partial periods to full periods without flagging.
- All trend tables must include `generated_at` timestamp.
- Metric scripts must be idempotent and deterministic for same inputs.
