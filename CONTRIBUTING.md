# Contributing to SolveJS

Thanks for contributing.

## Development Setup

1. Use Node.js `>=18`.
2. Run `npm install`.
3. Run `npm run build` and `npm test`.

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

## Commit Style

Use concise conventional-style messages, for example:

- `feat: add strict date parsing`
- `fix: handle invalid regex options`
- `docs: add validator recipes`
