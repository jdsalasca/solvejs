# Gemini and Codex Execution Prompts

Use these prompts to keep autonomous implementation aligned with repository standards.

## Prompt 1: Story Kickoff

```text
You are implementing story {{STORY_ID}} in solvejs.
Read AGENTS.md and docs/agent/* required files first.
Return:
1) scope boundaries,
2) file-level plan,
3) tests to add,
4) docs/changelog updates required,
5) exact validation commands.
Constraints: zero runtime dependencies, one-story-per-PR, no API drift.
```

## Prompt 2: Minimal Vertical Slice

```text
Implement the smallest shippable slice for {{STORY_ID}}.
Include code + tests + docs in the same change set.
Avoid speculative abstractions.
If assumptions are needed, write them explicitly in PR notes.
```

## Prompt 3: Contract Safety Pass

```text
Review changes for compatibility and stable error contracts.
List any public API changes and their migration impact.
If no migration impact, output: "migration impact: none".
```

## Prompt 4: Docs and Example Integrity

```text
Update docs with problem-first wording and runnable snippets.
For each new snippet include expected output.
Validate internal links and mention anti-patterns when likely.
```

## Prompt 5: Pre-PR Quality Gate

```text
Run:
npm run build
npm test
npm run test:baseline
npm run docs:check-links
If examples changed, run relevant example tests.
Return concise pass/fail summary and failing file references.
```

## Prompt 6: Post-Merge Impact Review

```text
For merged story {{STORY_ID}}, define:
1) metric to monitor for 2 weeks,
2) expected impact range,
3) follow-up issue seeds if impact is below expectation.
```

## Anti-Patterns to Avoid

- Changing multiple unrelated stories in one PR.
- Modifying exports without tests and migration notes.
- Adding dependencies to solve convenience-only concerns.
- Shipping docs that were not validated by link or snippet checks.
