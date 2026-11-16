# SolveJS Release Plan: 1.8.0 → 1.9.0

Updated on 2026-11-16.

## Current State (evidence)

Release 1.9.0 shipped on 2026-11-16.

- `@jdsalasc/solvejs@1.9.0` and all 19 leaves resolve from npm. The 11 older leaves and the meta package are at `1.9.0`; the 8 new packages are at `0.1.0`.
- A clean `npm i @jdsalasc/solvejs@1.9.0` installs 20 packages and the exported functions run.
- `npm run quality` passed: build, tests, baseline, meta wiring, CJS output, pack contents, release matrix, README snippets, docs links and lint.
- Publishing went through npm staged publishing and one batch approval, because the account uses a security key and the 2FA-bypass token is restricted to staging.
- The `teachers` external audit reported 49 errors and 4 warnings across 12 packages. Three were real defects and are fixed; the rest are complexity and length thresholds stricter than this codebase's style.

## Round 1: Close the release (P0) — DONE

Goal: make `1.9.0` installable from npm with all 20 packages.

1. Fixed the three real audit defects:
   - removed the unused `VALID_DIRECTIONS_ES` fixture;
   - replaced the precision-losing numeric literal with `Number(...)` in the `toNumber` test;
   - dropped the unnecessary `\/` escape in the address-line character class.
2. Regenerated `docs/guides/package-inventory.md` and `.html`; seven packages were missing from the committed table.
3. Merged `## Unreleased` into the `1.9.0` section and dated it 2026-11-16. The version had never been published, so its history belongs in one entry.
4. Ran `npm run quality` and committed on `develop`.
5. Staged the 20 packages, approved `pagination` plus an 18-package batch, and created the `v1.9.0` tag.

Verification (all passed):

- `npm view @jdsalasc/solvejs version` returns `1.9.0`.
- Every leaf resolves at its declared version.
- `npm pack --dry-run` contains no source or test files.
- A clean `npm i @jdsalasc/solvejs@1.9.0` succeeds and imports work.

## Round 2: Input robustness — DONE (input safety; coverage deferred)

The adversarial probe calls every export with `undefined`, `null`, symbols and `BigInt` and counts
6154 calls, 4632 throws and 3584 throws without a structured code. Most are documented validation
errors on values the TypeScript types already reject; the validators are the exception, because a
JavaScript consumer can reach them with no type check.

1. Done: every `validate*` returns a structured `INVALID_TYPE` result instead of throwing on a
   non-string value, the `is*` wrappers return `false`, and `translateValidationResult` returns
   `INVALID_RESULT` for a malformed result and a generic message for an unknown code.
2. Deferred: raising line coverage in `async`, `env` and `schema` above 95% is a test-only change
   and did not ship in 1.10.0.
3. Done: table-driven regression tests cover every validator and every boolean wrapper.

Verification: 45 validators tests pass; the probe no longer reports unstructured `TypeError` for the
validators; `npm run test:baseline` and `npm run quality` stay green.

## Round 3: Adoption and discoverability — DONE

1. Every package README already had "When to use" and "Limitations"; each gained a benefit-driven
   intro that names the problems and search terms developers use.
2. The root README was rewritten around search intent: a problem-to-package finder covering all 20
   packages, a complete catalog, quick-start output, platform notes, quality evidence, and links to
   the cookbook and comparison guides.
3. Every `package.json` gained long-tail npm keywords such as `esm`, `commonjs`, `nodejs`,
   `tree-shakeable`, plus domain terms such as `business days`, `lru cache`, `retry with backoff` and
   `zod alternative`.
4. Size and coverage figures stay in `docs/guides/performance-and-size.md` and are linked from the
   README, so the root page cannot go stale again.

Verification: `npm run check:snippets` parses 79 TypeScript snippets from 20 READMEs; docs links,
pack contents and the quality gate pass.

## Round 4: Structural quality — DONE

Adopted the external audit's portable baseline as a repo-owned ESLint config (`eslint.config.mjs`),
wired into `npm run quality` as `lint:quality` with `--max-warnings 0`: complexity 8,
max-lines-per-function 40, max-depth 3, max-params 4, the correctness rules, and the security
plugin. Tests are exempt from the size thresholds, as in the portable baseline.

The first run reported 77 problems (58 errors, 19 warnings) across 12 packages and the scripts.
All were resolved:

- extracted validation, parsing, serialization, comparison, cache-entry and bucket-state helpers
  from the functions the rule flagged; behavior is unchanged and every package suite stayed green;
- deleted untracked compiled artifacts that had reappeared inside six `src` directories;
- documented the verified false positives from `security/detect-unsafe-regex`,
  `detect-non-literal-regexp` and `detect-non-literal-require` with per-line disables and a reason;
- split the report generators so no function exceeds the line limit.

Verification: `npm run lint:quality` exits 0 with no warnings; the external `teachers` audit exits 0
with `sin hallazgos`; `npm run quality` stays green.

## Round 5: XLSX reader and writer — done

Built `@jdsalasc/solvejs-xlsx@0.1.0` from scratch, with no runtime dependencies:

- ZIP container writer (stored and DEFLATE through the platform `CompressionStream`) and reader (stored and DEFLATE through `DecompressionStream`), with CRC-32 verification, streaming budgets, local/central header consistency and explicit ZIP64 rejection.
- Safe XML parser for OOXML: elements, attributes, ordered text/CDATA, comments and namespaces; DTDs, unknown entities, duplicate attributes and multiple roots rejected; depth and node limits.
- XLSX writer: multiple sheets, inline strings (formula-injection safe), numbers, booleans, dates in the 1900 system, rich styles (fonts, fills, borders, alignment, wrap, number formats, merged cells, column widths, row heights, frozen panes, auto-filter, tab color) and workbook title/creator.
- XLSX reader: shared strings, inline strings, numbers, booleans, 1900/1904 dates via built-in and custom date formats, formula results and error cells; OOXML parts resolved through relationships with external-target rejection and a cell-materialisation budget.
- Declarative API: `Xlsx`, `Sheet`, `Column`, `Row`, `Cell`, a custom JSX runtime (`jsxImportSource`) and the same components callable as factories without JSX.
- 34 tests, including JSX rendering, style XML assertions, fragments, styled blank cells, coordinate and merge-overlap rejection, TypeScript compilation of `react-jsx` and `react-jsxdev` fixtures, direct-cell placement, date boundaries, ZIP corruption/ZIP64 rejection, XML strictness, compressed round-trips and a LibreOffice compatibility script that verifies both directions. A styled invoice was converted to PDF/PNG for visual review.
- Measured 10,000 rows × 8 columns on Node 24 / Windows: stored write ~78 ms (3.43 MB), compressed write ~125 ms (415 KB), compressed read ~181 ms.

Next in this line: PDF writer/reader, formula writing as an explicit opt-in, and richer style metadata on read.

## Round 6: PDF generator and viewer — vertical slice done

Built `@jdsalasc/solvejs-pdf@0.1.0` from scratch, browser-first and with no runtime dependencies:

- PDF 1.7 serializer with classic xref, metadata in UTF-16, standard Type1 fonts (Helvetica, Times, Courier and their bold/italic variants), WinAnsi text encoding, text measurement, wrapping, links, rounded rectangles, lines and JPEG images (`DCTDecode`).
- Declarative components: `Pdf`, `PdfPage`, `View`, `Row`, `Text`, `Heading`, `Paragraph`, `Table`, `Image`, `Link`, `Divider`, `Spacer`, plus fragments, custom function components and JSX runtimes for `react-jsx`/`react-jsxdev`.
- Layout: A4/Letter/A3/A5/custom sizes, margins, nested vertical/horizontal containers, percentage widths, automatic page breaks, split text blocks and views, tables that split by rows and repeat their header, repeated header/footer decorators with page numbers.
- Browser viewer: `<solvejs-pdf-viewer>` custom element plus `createPdfViewer`/`mountPdfViewer`, iframe or compact preview, download/open actions, light/dark/auto themes, and a full `render` override for custom UI.
- 27 tests covering the serializer, pagination, nested percentage widths, table splitting (including tables nested in padded views), JPEG parsing and data URLs, WinAnsi accents, links, JSX components, viewer DOM behavior and error paths; TSX fixtures compile for both JSX runtimes; the styled invoice and the viewer were reviewed as PNG/screenshots.
- Benchmark on Node 24 / Windows: one-page invoice ~0.85 ms / 4.4 KB; 10-page report ~14.6 ms / 72 KB, or ~52 ms / 7.4 KB compressed.

Limitations for this slice: no PDF reading, no custom font embedding, no PNG images, no charts or forms. Next: PNG support, custom TTF embedding and an optional page-thumbnail renderer.

## Risks and Rollback

- Publishing eight `0.1.0` packages for the first time is irreversible: npm does not allow
  republishing a version. The safety net is `npm deprecate`, not deletion.
- The meta package must publish after every leaf; publishing it first leaves a broken install.
- Rollback for the code: revert the release commit and tag. Rollback for npm: deprecate the
  affected version and publish a patch.
- The `1.9.0` changelog merge must preserve every existing bullet; losing one hides a behavior
  change from users.

## Out of Scope

- New runtime dependencies.
- New packages.
- Breaking API changes.
- Rewriting parsers only to satisfy an external linter.
