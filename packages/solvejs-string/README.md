# @jdsalasc/solvejs-string

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-string)](https://www.npmjs.com/package/@jdsalasc/solvejs-string)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-string)](https://www.npmjs.com/package/@jdsalasc/solvejs-string)


> **Live documentation:** [run this package's examples in your browser](https://jdsalasca.github.io/solvejs/live/#pkg-string).

Zero-dependency string utilities for APIs and UI: slugify, normalize whitespace, strip HTML, title/kebab/camel/snake case, truncate, initials, middle truncation, plural labels and mask. Typed, deterministic, and ready for user-generated content.

## Utilities

- `toKebabCase`, `toCamelCase`, `toTitleCase`
- `normalizeWhitespace`
- `slugify`
- `stripHtml`
- `mask`
- `truncate`, `truncateMiddle`
- `initials`
- `pluralize`
- `capitalize`

## When to use this package

Use it when you need clean, reusable string formatting for UI labels, slugs, payload normalization, and safe preview text.

## Limitations and Constraints

- Casing/slugging aims for practical normalization, not full linguistic transliteration.
- HTML stripping uses regex and is intended for lightweight cleanup, not HTML sanitization security guarantees.

### Acronyms are not split

`toKebabCase` and `toCamelCase` split on a lowercase-to-uppercase boundary, which requires a
lowercase or digit character before the uppercase one. A run of capitals therefore stays glued:

```ts
toKebabCase("SolveJS");          // "solve-js"     e -> J is a real boundary
toKebabCase("HTTPServer");       // "httpserver"   no lowercase precedes H
toCamelCase("parseHTTPResponse") // "parseHttpresponse"
```

If you need acronym-aware splitting, insert a boundary yourself before calling, or use a
dictionary of known initialisms.

### Small truncation limits

`truncate` never returns a negative slice, so a limit at or below the suffix length degrades to a
truncated suffix instead of the whole value:

```ts
truncate("abcdef", 0);       // ""
truncate("abcdef", 1);       // "."
truncate("abcdef", 3);       // "..."
truncate("abcdef", 5);       // "ab..."
```

Pick a limit comfortably larger than the suffix length when the truncated text needs to stay
readable.

## Install

```bash
npm i @jdsalasc/solvejs-string
```

## Quick example

```ts
import {
  initials,
  normalizeWhitespace,
  pluralize,
  slugify,
  stripHtml,
  truncate,
  truncateMiddle
} from "@jdsalasc/solvejs-string";

const plain = normalizeWhitespace(stripHtml("<p>Hello   <b>world</b></p>"));
const slug = slugify(plain); // "hello-world"
truncate(plain, 5); // "Hello..."
initials("Ada Lovelace"); // "AL"
truncateMiddle("ada@analytical-engines.example", 18); // "ada@anal...example"
pluralize(2, "invoice"); // "invoices"
```

## UI labels and safe previews

`initials` skips emoji and punctuation, takes the first letter or digit of each word and caps the result at `max` (default 2). `truncateMiddle` keeps both ends of emails, file paths and URLs readable, while `truncate` keeps the prefix. `pluralize` returns the singular only for exactly `1`, so `0` and negative counts use the plural label.

## Review notes

- Slug normalization removes every Unicode combining mark, not only the basic Latin range.
