# SolveJS Community Roadmap (v1.4.0)

## Core Pain Points We Solve

- [x] Date formatting, strict parsing, UTC-safe date math.
- [x] String casing, slugging, masking, and HTML stripping.
- [x] Array/list grouping, partitioning, sorting, and intersections.
- [x] Regex shortcuts for common production patterns.
- [x] Numeric helpers for business logic and safe calculations.
- [x] Form validators with structured error codes for UI/UX flows.
- [x] Object utilities for nested path operations and deep merging.

## Developer Experience

- [x] ESM + CJS + TypeScript types for all packages.
- [x] Zero runtime dependencies in core packages.
- [x] API-level JSDoc comments with `@param`, `@returns`, `@throws`.
- [x] Problem-first docs and examples.
- [x] Benchmarks for hot utility paths.

## Community Operations

- [x] Contributing guide.
- [x] Code of Conduct.
- [x] Issue templates for bug reports and feature requests.
- [x] Add docs website search and cookbook navigation.
- [x] Publish "When to use this package" section across npm package pages (README sync check).
- [x] Add locale packs for validators (phone + postal coverage for US, CO, MX, ES, AR, CL, PE, BR).
- [x] Add object utilities package (`solvejs-objects`) based on community demand.
- [x] Publish and announce `v1.2.0` across npm and GitHub release notes.

## Next Iteration (Community-Driven)

- [x] Add framework integration guides: Next.js, Express, NestJS.
- [x] Add validator locale expansion matrix (`phone`, `postalCode`, `addressDirection`) by country/locale.
- [x] Add recipe-style docs pages with copy/paste snippets for top intents.
- [x] Add monthly community vote issue for next utility priorities.
- [x] Add comparison docs pages to support adoption decisions (`SolveJS vs ...`).

## Next Iteration (v1.5.0 Candidate)

- [x] Resolve npm registry visibility/release consistency for `@jdsalasc/solvejs-objects`.
- [x] Harden release workflow with idempotent publish checks and explicit npm token validation.
- [x] Publish package health report (status, issues, weaknesses, improvements) for contributors.
- [ ] Add deep edge-case tests for date timezone boundaries and object nested-path updates.
- [ ] Expand validators locale/country coverage and document deprecation strategy for typo aliases.
- [x] Add lint baseline and CI enforcement across all workspaces.
- [x] Start new async utilities package (`solvejs-async`) for retry/timeout/concurrency workflows.
