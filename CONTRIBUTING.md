# Contributing to SolveJS

Thanks for contributing.

## Development Setup

1. Use Node.js `>=18`.
2. Run `npm install`.
3. Run `npm run build` and `npm test`.

## First Contribution in 15 Minutes

1. Pick an issue labeled `good first issue` or `help wanted`.
2. Create a branch from `develop`:
   `git checkout -b feature/<short-name> develop`
3. Implement the change with tests and docs updates.
4. Run:
   `npm run lint && npm run build && npm test`
5. Open a PR using `.github/PULL_REQUEST_TEMPLATE.md`.

## Branch Strategy

- `main`: production releases.
- `develop`: integration branch.
- `feature/*`: feature branches.
- `release/*`: release branches.

## Pull Request Checklist

- Keep runtime dependencies at zero for core packages.
- Add or update tests for all behavior changes.
- Preserve API compatibility unless the release is major.
- Update README and docs for user-facing changes.
- Add benchmark and package-size notes when behavior affects performance/adoption.

## Commit Style

Use concise conventional-style messages, for example:

- `feat: add strict date parsing`
- `fix: handle invalid regex options`
- `docs: add validator recipes`

## Maintainer Notes

- Keep a rolling queue of `good first issue` and `help wanted` tickets.
- Publish a monthly "You asked, we shipped" summary linked from releases.
