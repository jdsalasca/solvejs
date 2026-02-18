# Growth Automation

This folder contains reusable content assets and generation scripts for weekly distribution.

## Files

- `social-snippets-10x.md`: source snippets (problem, code, CTA).
- `content-calendar-4-weeks.md`: publishing plan with KPI targets.
- `templates/`: platform templates (`x`, `linkedin`, `dev`).
- `out/`: generated weekly drafts.

## Generate Weekly Drafts

From repo root:

```bash
npm run growth:posts -- --week 1 --count 3
```

Optional start index:

```bash
npm run growth:posts -- --week 2 --count 3 --start 4
```
