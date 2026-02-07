# @jdsalasc/solvejs-numbers

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-numbers)](https://www.npmjs.com/package/@jdsalasc/solvejs-numbers)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-numbers)](https://www.npmjs.com/package/@jdsalasc/solvejs-numbers)


Zero-dependency number utilities for JavaScript and TypeScript.

## Utilities

- `clamp`, `roundTo`, `sum`, `average`, `median`
- `percent`, `percentChange`
- `safeDivide`, `isBetween`
- `toCurrency`, `toNumber`, `randomInt`

## When to use this package

Use it when you need safer business math and robust number parsing for forms, analytics, and pricing logic.

## Install

```bash
npm i @jdsalasc/solvejs-numbers
```

## Quick example

```ts
import { toNumber, safeDivide, percentChange } from "@jdsalasc/solvejs-numbers";

const revenue = toNumber("12,500");
const ratio = safeDivide(50, 0, 0);
const growth = percentChange(120, 100); // 20
```

## Precision note

JavaScript numbers are floating-point. For money-sensitive flows, apply explicit rounding steps (for example `roundTo(value, 2)`) at domain boundaries (tax, subtotal, invoice total).
