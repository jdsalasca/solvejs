# @jdsalasc/solvejs-regex

Zero-dependency regex utilities and production-ready patterns for JavaScript and TypeScript.

## Utilities

- Built-in patterns: `email`, `phoneE164`, `urlHttp`, `hexColor`, `username`, `uuidV4`, `ipv4`, `isoDate`
- `validateByName`
- `validateWithPattern`
- `escapeRegex`

## When to use this package

Use it when you need common regex checks and safer dynamic regex generation without rewriting pattern boilerplate.

## Install

```bash
npm i @jdsalasc/solvejs-regex
```

## Quick example

```ts
import { REGEX_PATTERNS, validateWithPattern, escapeRegex } from "@jdsalasc/solvejs-regex";

validateWithPattern("550e8400-e29b-41d4-a716-446655440000", REGEX_PATTERNS.uuidV4);
new RegExp(`^${escapeRegex("user.name")}$`);
```
