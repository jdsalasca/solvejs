# Execution Checklists

Use these checklists before opening any PR.

## Implementation Checklist

- [ ] Story ID selected from `docs/agent/user-stories.md`.
- [ ] Scope limited to one primary objective.
- [ ] No runtime dependencies added.
- [ ] API behavior documented.
- [ ] Tests updated for changed behavior.
- [ ] Docs/examples updated.

## Local Validation Checklist

- [ ] `npm run build`
- [ ] `npm test`
- [ ] `npm run test:baseline`
- [ ] `npm run docs:check-links`
- [ ] Example tests when applicable.

## PR Checklist

- [ ] PR title follows repo convention.
- [ ] PR body includes problem and outcome.
- [ ] PR body includes rollback plan.
- [ ] PR body includes commands run locally.
- [ ] Changelog updated when behavior changed.

## Release Checklist

- [ ] Worktree clean.
- [ ] Changelog accurate.
- [ ] Backward compatibility reviewed.
- [ ] Migration notes included when needed.
- [ ] Release notes include user-facing impact.

## Post-Merge Checklist

- [ ] Issue closed with implementation notes.
- [ ] `docs/community/issue-backlog.md` status updated.
- [ ] Community summary candidate captured.
- [ ] Follow-up issue created if partial scope delivered.
