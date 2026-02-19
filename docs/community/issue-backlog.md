# Community Issue Backlog

This is the persistent execution backlog for contributors and agents.

Priority legend:

- `P0`: immediate impact (adoption, correctness, trust)
- `P1`: medium-term growth and differentiation
- `P2`: strategic bets

## P0 Issues

1. `validators: add EN/ES/PT error translator helpers`
2. `validators: document stable error code dictionary`
3. `date: add DST transition regression tests`
4. `date: add leap-year and month-end boundary tests`
5. `docs: add "I need to..." intent navigation page`
6. `docs: add copy-paste snippet verification notes`
7. `examples: add Next.js API validation end-to-end recipe`
8. `examples: add Express validation middleware recipe with structured errors`
9. `guides: add migration cookbook lodash -> SolveJS objects/list`
10. `guides: add migration cookbook date-fns -> SolveJS date`
11. `async: add retry-with-jitter production recipe`
12. `async: add timeout fallback and queue overload recipes`
13. `tests: strengthen @jdsalasc/solvejs-list groupBy edge coverage`
14. `tests: strengthen @jdsalasc/solvejs-numbers decimal precision edge coverage`
15. `ci: add docs snippet integrity check workflow`

## P1 Issues

1. `docs: add package chooser (problem -> package) page`
2. `docs: add troubleshooting matrix for validator/date/regex errors`
3. `scripts: generate compatibility matrix (Node + framework + bundler)`
4. `guides: publish compatibility matrix report`
5. `scripts: generate benchmark trend report over time`
6. `guides: publish performance observatory page`
7. `community: add monthly challenge template and scoreboard`
8. `community: add monthly "you asked, we shipped" digest template v2`
9. `templates: add backend starter template using SolveJS`
10. `templates: add frontend forms starter template using SolveJS`
11. `docs: add enterprise readiness page (support, cadence, compatibility)`
12. `ci: add changelog consistency check per package`
13. `tests: add contract tests for error-code stability`
14. `readme: add quick decision matrix by use-case`
15. `growth: add social snippets for top 10 production incidents`

## P2 Issues

1. `ai: create prompt pack for Gemini/Codex/Copilot with SolveJS patterns`
2. `community: automate quarterly roadmap synthesis from issue themes`
3. `validators: launch regional expansion onboarding kit for contributors`
4. `docs: add before/after refactor gallery for common code smells`
5. `benchmarks: add stress scenarios for high-cardinality datasets`
6. `governance: add package reliability score and publishing criteria`
7. `ops: add release-readiness checklist generator`
8. `analytics: track docs-to-install conversion events`
9. `platform: publish API error catalog as JSON + docs reference`
10. `ux: add interactive utility playground for top helpers`

## Deep Execution Stories (Detailed and Agent-Ready)

1. `story:SJ-P0-001 implement validation translator core with EN/ES/PT fallback behavior`
2. `story:SJ-P0-001 add custom locale extension API and docs examples`
3. `story:SJ-P0-002 create DST transition matrix for spring/fall boundary cases`
4. `story:SJ-P0-002 add month-end billing cutoff scenarios for parse/format helpers`
5. `story:SJ-P0-003 add intent navigator panel on docs homepage with top 15 intents`
6. `story:SJ-P0-003 add persona routes (frontend forms, backend api, data processing)`
7. `story:SJ-P0-004 implement docs snippet extraction and runtime validation script`
8. `story:SJ-P0-004 wire snippet validation into CI workflow with clear failure output`
9. `story:SJ-P0-005 add lodash migration map with caveats and anti-pattern notes`
10. `story:SJ-P0-005 add date-fns migration map with timezone caveats`
11. `story:SJ-P1-001 create compatibility matrix generator with Node LTS policy`
12. `story:SJ-P1-001 publish generated compatibility matrix page in docs/guides`
13. `story:SJ-P1-002 publish machine-readable error catalog JSON`
14. `story:SJ-P1-002 add human-readable error dictionary reference page`
15. `story:SJ-P1-003 create monthly challenge scaffold linked to open P0/P1 issues`
16. `story:SJ-P1-003 add challenge scoreboard template and participation metrics`
17. `story:SJ-P2-001 create AI prompt pack by package domain with guardrails`
18. `story:SJ-P2-001 add anti-pattern prompt examples and expected output format`
19. `story:SJ-P2-002 define reliability score formula and weighting strategy`
20. `story:SJ-P2-002 generate package reliability report from existing scripts`

Use `.github/workflows/seed-community-issues.yml` to create these issues automatically.
