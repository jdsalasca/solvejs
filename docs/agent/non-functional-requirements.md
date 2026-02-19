# Non-Functional Requirements

These requirements apply to all stories unless explicitly overridden.

## Reliability

- Utilities must be deterministic for the same input.
- Date and numeric helpers must include boundary vectors.
- Error outputs must preserve stable machine-readable codes.

## Performance

- No avoidable quadratic behavior in common list/object helpers.
- Performance-sensitive changes should include benchmark updates in `benchmarks/`.
- New APIs should document expected complexity class when non-obvious.

## Security

- Avoid regex patterns that enable catastrophic backtracking.
- Never expose environment secrets in logs, examples, or errors.
- Input validation must fail with explicit error codes and neutral messages.

## Compatibility

- Support active Node LTS versions declared by project policy.
- Preserve ESM + CJS + TS declaration outputs for packages.
- Avoid breaking API changes in non-major releases.

## Operability

- CI checks must produce actionable failures.
- Generated docs artifacts should be reproducible and idempotent.
- Scripts must return non-zero exit codes when validation fails.

## Maintainability

- Prefer small functions and explicit contracts.
- Add tests for bugfix regressions before patching behavior.
- Keep each PR focused on one primary intent.

## Accessibility and UX (Docs)

- Problem-first headings and copy-paste examples are mandatory.
- New docs pages should include expected output blocks.
- High-risk recipes should include anti-pattern notes.

## SLO Targets

- Test pass rate on `main`: 99%+ rolling 30 days.
- Docs link check pass rate on `main`: 99%+ rolling 30 days.
- P0 story cycle time target: <= 10 calendar days.
- Incident fix lead time target: <= 72 hours after reproduction.
