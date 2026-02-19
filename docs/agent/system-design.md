# System Design for Agent Execution

This document defines architecture and delivery surfaces agents must respect.

## Repository Delivery Architecture

```mermaid
flowchart TD
    A[Monorepo root] --> B[packages/*]
    A --> C[docs/*]
    A --> D[examples/*]
    A --> E[scripts/*]
    B --> B1[solvejs-date]
    B --> B2[solvejs-validators]
    B --> B3[solvejs-async]
    B --> B4[solvejs-objects]
    B --> B5[other utility packages]
    D --> D1[nextjs-route-handler]
    D --> D2[express-middleware]
    D --> D3[env-bootstrap]
    D --> D4[invoice-workflow]
```

## Build and Verification Pipeline

```mermaid
flowchart LR
    A[Code change] --> B[npm run build]
    B --> C[npm test]
    C --> D[npm run test:baseline]
    D --> E[npm run docs:check-links]
    E --> F{All pass}
    F -- yes --> G[Open/merge PR]
    F -- no --> H[Fix and rerun]
```

## Contracts and Boundaries

- Package contract:
  - stable exports,
  - deterministic return behavior,
  - zero runtime dependencies.
- Docs contract:
  - snippets align with real APIs,
  - links must pass checker,
  - migration guides updated when API usage changes.
- Example contract:
  - examples are runnable,
  - represent real production patterns.

## Data and Artifact Flows

```mermaid
flowchart TD
    A[scripts/generate-*] --> B[docs/guides/*.md]
    B --> C[docs/guides/*.html]
    C --> D[GitHub Pages content]
    E[community issues] --> F[docs/community/issue-backlog.md]
    F --> G[workflow seed-community-issues]
    G --> E
```

## Decision Records

When agents choose a non-obvious tradeoff, record an ADR-style note in PR body:

- Context.
- Decision.
- Alternatives rejected.
- Consequences.

## Non-Functional Targets

- Correctness: no silent behavior drift.
- Simplicity: APIs should be easy to memorize.
- Maintainability: avoid speculative abstractions.
- Reliability: regression tests for every bug fix.

## Guardrails for Autonomous Changes

- Never modify multiple package public APIs in one PR.
- Never mix refactor + feature + behavior changes together.
- Never skip docs updates for externally visible changes.
- Never bypass tests to force merge velocity.
