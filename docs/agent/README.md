# Agent Execution Pack

This folder contains implementation assets for autonomous agents.

## Documents

- `docs/agent/user-stories.md`: detailed executable stories with acceptance criteria.
- `docs/agent/process-flows.md`: end-to-end process maps in Mermaid.
- `docs/agent/system-design.md`: architecture and delivery diagrams.
- `docs/agent/execution-checklists.md`: operational checklists for quality and release.
- `docs/agent/implementation-blueprint.md`: 12-week delivery blueprint, waves, risks.
- `docs/agent/non-functional-requirements.md`: reliability, performance, security, SLOs.
- `docs/agent/telemetry-spec.md`: metrics catalog and review ritual.
- `docs/agent/gemini-codex-execution-prompts.md`: prompt templates and anti-patterns.

## How to Use

1. Pick one `P0` story from `docs/agent/user-stories.md`.
2. Create or link the matching GitHub issue.
3. Follow the process flow in `docs/agent/process-flows.md`.
4. Validate against checklists in `docs/agent/execution-checklists.md`.
5. Update `docs/community/issue-backlog.md` with status.
6. Run `npm run agent:blueprint:check`.

## Rule

No implementation starts without a clear story ID and acceptance criteria.
