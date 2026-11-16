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
- Measured 10,000 rows × 8 columns on Node 24 / Windows: stored write ~88 ms (3.43 MB), compressed write ~140 ms (415 KB), compressed read ~243 ms.

Next in this line: PDF writer/reader, formula writing as an explicit opt-in, and richer style metadata on read.

## Round 6: PDF generator and viewer — vertical slice done

Built `@jdsalasc/solvejs-pdf@0.1.0` from scratch, browser-first and with no runtime dependencies:

- PDF 1.7 serializer with classic xref, metadata in UTF-16, standard Type1 fonts (Helvetica, Times, Courier and their bold/italic variants), WinAnsi text encoding, text measurement, wrapping, links, rounded rectangles, lines and JPEG images (`DCTDecode`).
- Declarative components: `Pdf`, `PdfPage`, `View`, `Row`, `Text`, `Heading`, `Paragraph`, `Table`, `Image`, `Link`, `Divider`, `Spacer`, plus fragments, custom function components and JSX runtimes for `react-jsx`/`react-jsxdev`.
- Layout: A4/Letter/A3/A5/custom sizes, margins, nested vertical/horizontal containers, percentage widths, automatic page breaks, split text blocks and views, tables that split by rows and repeat their header, repeated header/footer decorators with page numbers.
- Browser viewer: `<solvejs-pdf-viewer>` custom element plus `createPdfViewer`/`mountPdfViewer`, iframe or compact preview, download/open actions, light/dark/auto themes, and a full `render` override for custom UI.
- 27 tests covering the serializer, pagination, nested percentage widths, table splitting (including tables nested in padded views), JPEG parsing and data URLs, WinAnsi accents, links, JSX components, viewer DOM behavior and error paths; TSX fixtures compile for both JSX runtimes; the styled invoice and the viewer were reviewed as PNG/screenshots.
- Benchmark on Node 24 / Windows: one-page invoice ~0.85 ms / 4.4 KB; 10-page report ~14.6 ms / 72 KB, or ~40 ms / 7.4 KB compressed.

Limitations for this slice: no PDF reading, no custom font embedding, no PNG images, no charts or forms. Next: PNG support, custom TTF embedding and an optional page-thumbnail renderer.

## Round 7: Modern XLSX parity — done

Reviewed the archived SheetJS repository, its README and open issues. The recurring complaints cluster around security (prototype pollution/ReDoS), CSV fidelity, dates and number formats, large workbooks, column styles, formulas with cached values, hyperlinks, images and external-link preservation. This round closes the XLSX/CSV subset instead of cloning legacy binary formats.

Delivered in `@jdsalasc/solvejs-xlsx@0.2.0`:

1. Security: null-prototype XML attributes and JSON records block prototype pollution; CSV formula-injection protection; strict hyperlink schemes; image/type limits; adversarial tests.
2. CSV/TSV: quoted fields, embedded newlines, CRLF/BOM, explicit blank-line handling, leading-zero preservation, `sheetToJson`/`jsonToRows`.
3. Rich cells: formula writing with cached values, hyperlinks (external and internal `#Sheet!A1`), read-side formulas and links.
4. Read metadata: merged ranges, column widths/styles, row heights, frozen panes, auto-filter, formulas, links, images and cell styles; `sheets`, `includeStyles` and `includeFormulas` options.
5. Write parity: column/row styles, data-first `freeze`, `autoFilter`, `tabColor`, formulas, links and PNG/JPEG images with DrawingML one-cell anchors.
6. Formatting: `formatCellValue`, `formatExcelNumber` and `formatExcelDate` for the common Excel number/date patterns.
7. 57 tests, LibreOffice formula/image round-trips, PNG visual review and metadata checks.

Explicit non-goals: XLS/XLSB/ODS/DBF, charts, pivot tables, comments, data validation, conditional formatting, macros, encryption, formula evaluation and external workbook links. Formula values are cached results; the package does not calculate them.

## Round 8: Codex Terra audits — done

Ran two read-only Codex CLI audits with `gpt-6.1-terra` (medium) and implemented the P1/P2 findings.

XLSX (`0.2.1`):

- CSV protection now applies to cell objects and leading whitespace; malformed quote placement and single empty quoted fields are handled.
- Imported hyperlinks require the hyperlink relationship type and a safe `http(s)`/`mailto`/`tel` scheme.
- Workbook-wide cell/row budgets, image pixel/encoded-size limits and safe ZIP entry names bound untrusted input.
- Merge rectangles are checked for intersections; shared formulas are translated for relative references.
- Duplicate cells, invalid booleans and unknown cell types are rejected.
- Row styles and two-cell image anchors are exposed; formatter fixes cover `0.00##`, negative scientific values, AM/PM and quoted literals.
- 62 tests.

PDF (`0.1.1`):

- Pagination retries a split on a fresh page and preserves block widths.
- Node/text/page/image/depth budgets are enforced during layout; encoded image size is checked before decoding.
- Viewer hosts expose `ready`/`destroy`, revoke blob URLs on renderer/callback failure, respect disabled compact actions and expose status/alert semantics.
- JPEG parsing requires 8-bit grayscale/RGB with scan and EOI markers; truncated and CMYK files fail.
- Header/footer reservation is re-measured and repaginated; page backgrounds no longer create an empty first page; row children cannot silently lose blocks.
- URI targets are percent-encoded independently of WinAnsi.
- 35 tests, including xref/stream structure checks.

## Round 9: Third Terra audit, print setup and Report Studio - done

Ran a third read-only Codex CLI audit with `gpt-6.1-terra` (medium) on both packages and implemented the remaining P1/P2 findings.

XLSX (`0.2.2`):

- Merge validation now caps the inspected area and the number of merged ranges; intersection detection is a sweep instead of a quadratic pair check.
- Shared formulas are translated with a quote-aware tokenizer, including quoted sheet names and `#REF!` at worksheet boundaries.
- Duplicate worksheet rows, malformed page setup and invalid defined names fail with stable codes.
- `pageSetup` writes orientation, paper size and fit-to-page values, including the `fitToPage` flag. Global `definedNames` write and read back; sheet-scoped imported names are skipped.
- Formatter fixes cover zero padding (`00000`), thousands scaling (`0,`), elapsed `[h]`/`[m]`/`[s]` tokens and bounded decimal placeholders.
- CSV formula protection now respects the original value type, so numeric `-5` is not quoted while the string `"-5"` is protected.
- Two-cell image anchors preserve both marker offsets.
- 66 tests.

PDF (`0.1.2`):

- Layout traversal is iterative and budgeted; row children, table cells and aggregate image bytes count against document budgets. Table cell text has its own limit.
- JPEG parsing walks segment lengths and marker order, validates the scan and EOI, preserves embedded JPEG bytes, and rejects progressive/arithmetic frames, multiple scans and truncated segments.
- Header/footer heights are measured on every page and repaginated to a verified fixed point; non-convergence fails instead of overlapping the body.
- Row primitives are rejected; table cell text is bounded; link URI encoding preserves existing `%XX` escapes and rejects malformed Unicode.
- Viewer numeric `height` attributes (`height="640"`) now become `640px` instead of being dropped as invalid CSS.
- 40 tests, including middle-page decorators, row primitives, oversized table text, progressive JPEGs, extra scans and pre-encoded link targets.

Report Studio (`examples/report-studio`):

- Framework-free app served by a zero-dependency Node server: one editable invoice dataset generates a paginated PDF preview and a matching XLSX download.
- Exercises formulas with cached values, print setup, frozen headers, auto-filter, defined names, hyperlinks, viewer lifecycle and money formatting.
- Screenshot checked in the repo and the app is linked from the root README.

Competitor study:

- XLSX gaps ranked: data validation, conditional formatting, comments, streaming and template editing. Page setup and defined names were implemented this round.
- PDF gaps ranked: PNG with transparency, page templates/watermarks, outlines/bookmarks and custom TTF fonts. Reading/editing existing PDFs stays out of scope.
- Both package READMEs now include a capability matrix with the honest gaps and use-case guidance.

## Round 10: Ecosystem review and correctness sweep - done

Reviewed every leaf package manually after the third audit. Fixed the concrete defects found instead of adding features:

- Date: proleptic Gregorian years 0-99, four-digit formatting, O(1) business-day arithmetic and safe-integer validation.
- Money: exponent-notation factors (`1e-7`) keep their precision.
- Semver: `^0` now spans all `0.x` releases.
- Pagination: `clampPage`/`withPagination` reject `NaN` and fractional pages.
- URL: `__proto__` remains an own query key without touching the prototype.
- Errors: circular, bigint and Error details are serialized safely; masks apply to every match.
- HTTP: quoted `Content-Type` parameters may contain semicolons.
- String: all Unicode combining marks are removed during slug normalization.
- Cache: the LRU cache honors a per-entry TTL.
- PDF: a JPEG frame without scan data is rejected.
- XLSX: zero fit-to-page values are explicit and `XlsxPageSetup` is part of the public API.
- Tooling: `npm run test:uncovered` now covers every package by default, and Report Studio has a smoke test in `npm run quality`.

Versions: date/string `1.10.1`, money/semver/pagination/url/errors/http/cache `0.2.1`, pdf `0.1.3`, xlsx `0.2.3`, meta `1.12.3`.

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
