# SolveJS Docs

Static documentation for GitHub Pages with a searchable cookbook UX.

## Files

- `index.html`: cookbook landing page with recipe search.
- `live/`: interactive Live Lab using the real package builds.
- `styles.css`: shared visual system for docs pages.
- `app.js`: client-side search + cookbook navigation renderer.
- `robots.txt`: crawl policy for search engines.
- `sitemap.xml`: indexed URLs for docs pages.
- `problems/`: problem-first recipe pages in HTML and Markdown.

The Live Lab imports `docs/vendor/*`, which is generated from `packages/*/dist/esm` by
`scripts/prepare-docs-vendor.mjs`. The Pages workflow runs the build and the copy step before
uploading `docs`, so the live page always reflects the current workspace code.

## Custom domain

The GitHub Pages deployment currently lives at <https://jdsalasca.github.io/solvejs/>. To serve it at
`solvejs-documentation.eridu.top`:

1. In Cloudflare DNS, create `CNAME solvejs-documentation` → `jdsalasca.github.io`, proxy **DNS only**.
2. In GitHub, open **Settings → Pages → Custom domain**, enter `solvejs-documentation.eridu.top` and save.
3. Wait for the certificate, then enable **Enforce HTTPS**.

Do not add a `CNAME` file or set the custom domain before the DNS record resolves; GitHub Pages will
otherwise redirect the working `github.io` site to a host that does not exist.

## Recipe Pages

- `date-format`
- `form-validators`
- `array-and-numbers`
- `string-format`
- `regex-patterns`
- `object-utils`
- `async-control`
- `env-config`

## Integration Guides

- `guides/nextjs-integration`
- `guides/express-integration`
- `guides/nest-integration`
- `guides/validator-locale-matrix`
- `guides/package-inventory`
- `guides/performance-and-size`
- `guides/community-metrics`
- `guides/value-backlog`
- `guides/solvejs-vs-lodash`
- `guides/solvejs-vs-datefns-validator`

## Community and Growth Assets

- `growth/content-calendar-4-weeks.md`
- `growth/social-snippets-10x.md`
- `growth/templates/*`
- `community/issue-backlog.md`

## Agent Execution Assets

- `agent/README.md`
- `agent/user-stories.md`
- `agent/process-flows.md`
- `agent/system-design.md`
- `agent/execution-checklists.md`
- `agent/implementation-blueprint.md`
- `agent/non-functional-requirements.md`
- `agent/telemetry-spec.md`
- `agent/gemini-codex-execution-prompts.md`
