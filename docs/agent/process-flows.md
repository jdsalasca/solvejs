# Process Flows

All flows are implementation-oriented and optimized for autonomous agents.

## 1) Idea to Release Flow

```mermaid
flowchart TD
    A[Capture Idea in docs/ideas.md] --> B[Convert to Story ID in docs/agent/user-stories.md]
    B --> C[Create or sync GitHub Issue]
    C --> D[Implement minimal vertical slice]
    D --> E[Add tests and docs in same PR]
    E --> F[Run quality gates]
    F --> G{All checks pass?}
    G -- No --> H[Fix failures and rerun]
    H --> F
    G -- Yes --> I[Review and merge]
    I --> J[Update changelog and docs backlog status]
    J --> K[Release notes and community summary]
```

## 2) PR Execution Flow

```mermaid
flowchart TD
    A[Pick one issue] --> B[Create branch feat/fix]
    B --> C[Implement smallest useful increment]
    C --> D[Write tests first for bugfixes]
    D --> E[Update docs and examples]
    E --> F[Run local commands]
    F --> G[npm run build]
    G --> H[npm test]
    H --> I[npm run test:baseline]
    I --> J[npm run docs:check-links]
    J --> K{Pass?}
    K -- No --> L[Fix and rerun]
    L --> G
    K -- Yes --> M[Open PR with evidence]
```

## 3) Incident Response Flow

```mermaid
flowchart TD
    A[Incident report received] --> B[Classify severity]
    B --> C[Reproduce with failing test]
    C --> D[Patch minimal scope]
    D --> E[Add regression test]
    E --> F[Review for API compatibility]
    F --> G[Merge hotfix]
    G --> H[Publish release notes]
    H --> I[Backfill docs recipe]
```

## 4) Community Feedback Loop

```mermaid
flowchart LR
    A[GitHub Issues] --> B[Tag by theme]
    B --> C[Map to backlog priority P0/P1/P2]
    C --> D[Seed implementation issues]
    D --> E[Ship in small batches]
    E --> F[Publish You asked, we shipped]
    F --> G[Collect new feedback]
    G --> A
```

## 5) Quality Gate Decision Tree

```mermaid
flowchart TD
    A[Change detected] --> B{Behavior changed?}
    B -- Yes --> C[Require tests + changelog + docs]
    B -- No --> D[Docs-only or refactor-only checks]
    C --> E{Utility is date/number/regex?}
    E -- Yes --> F[Add boundary vectors]
    E -- No --> G[Standard coverage]
    F --> H[Run full quality gate]
    G --> H
    D --> I[Run docs checks]
    H --> J[Ready for PR]
    I --> J
```

## 6) Agent Multi-PR Program Flow

```mermaid
flowchart TD
    A[Quarter objective] --> B[Split into epics]
    B --> C[Split epics into stories]
    C --> D[One story per PR]
    D --> E[Parallel execution by multiple agents]
    E --> F[Daily sync on blockers]
    F --> G[Weekly release train]
    G --> H[Metrics review and reprioritize]
```
