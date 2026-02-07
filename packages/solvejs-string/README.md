# @jdsalasc/solvejs-string

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-string)](https://www.npmjs.com/package/@jdsalasc/solvejs-string)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-string)](https://www.npmjs.com/package/@jdsalasc/solvejs-string)


Zero-dependency string utilities for JavaScript and TypeScript.

## Utilities

- `toKebabCase`, `toCamelCase`, `toTitleCase`
- `slugify`
- `stripHtml`
- `mask`
- `truncate`

## When to use this package

Use it when you need clean, reusable string formatting for UI labels, slugs, payload normalization, and safe preview text.

## Install

```bash
npm i @jdsalasc/solvejs-string
```

## Quick example

```ts
import { slugify, stripHtml, truncate } from "@jdsalasc/solvejs-string";

const plain = stripHtml("<p>Hello <b>world</b></p>");
const slug = slugify(plain); // "hello-world"
truncate(plain, 5); // "Hello..."
```
