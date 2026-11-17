# @jdsalasc/solvejs-regex

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-regex)](https://www.npmjs.com/package/@jdsalasc/solvejs-regex)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-regex)](https://www.npmjs.com/package/@jdsalasc/solvejs-regex)


> **Live documentation:** [run this package's examples in your browser](https://jdsalasca.github.io/solvejs/live/#pkg-regex).

Zero-dependency common regex patterns and safe helpers: email, E.164 phone, HTTP URL, hex color, username, UUID v4, IPv4, and ISO date, plus `escapeRegex` and `literalRegex`. Copy the pattern or validate by name without rebuilding it.

## Utilities

- Built-in patterns: `email`, `phoneE164`, `urlHttp`, `hexColor`, `username`, `uuidV4`, `ipv4`, `isoDate`
- `validateByName`
- `validateWithPattern`
- `escapeRegex`
- `literalRegex`
- named patterns: email, E.164 phone, HTTP URL, hex color, username, UUID v4/v7, IPv4, ISO date/date-time, semver, slug and IBAN

## When to use this package

Use it when you need common regex checks and safer dynamic regex generation without rewriting pattern boilerplate.

## Limitations and Constraints

- Built-in patterns are pragmatic defaults, not full RFC validators.
- Always validate business-critical formats with domain-specific checks.

## Install

```bash
npm i @jdsalasc/solvejs-regex
```

## Quick example

```ts
import { REGEX_PATTERNS, validateWithPattern, escapeRegex, literalRegex } from "@jdsalasc/solvejs-regex";

validateWithPattern("550e8400-e29b-41d4-a716-446655440000", REGEX_PATTERNS.uuidV4);
validateWithPattern("018f4b7c-7a3d-7c2e-9f10-2b6d8a1f3c40", REGEX_PATTERNS.uuidV7);
validateWithPattern("solve-js", REGEX_PATTERNS.slug);
new RegExp(`^${escapeRegex("user.name")}$`);
literalRegex("price $10.00").test("price $10.00");
```
