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

The documentation is live at <https://solvejs-documentation.eridu.top> (and mirrored by GitHub Pages at
<https://jdsalasca.github.io/solvejs/>). The custom domain is served by the `atopnuc` Cloudflare tunnel:

- nginx container `solvejs-docs`, bound to `127.0.0.1:5180`
- files at `/home/atopnuc/sitios/solvejs-docs/site`
- ingress entry in `/home/atopnuc/.cloudflared/config.yml`
- DNS CNAME created with `cloudflared tunnel route dns`

Deploy a new docs build with:

```powershell
npm run docs:deploy:server
```

The script builds `docs/vendor`, zips `docs`, copies it to the server, replaces the served folder and
checks the public `/live/` URL.

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
