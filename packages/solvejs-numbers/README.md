# @jdsalasc/solvejs-numbers

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-numbers)](https://www.npmjs.com/package/@jdsalasc/solvejs-numbers)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-numbers)](https://www.npmjs.com/package/@jdsalasc/solvejs-numbers)


Zero-dependency number utilities for JavaScript and TypeScript.

## Utilities

- `clamp`, `roundTo`, `sum`, `average`, `median`
- `percent`, `percentChange`
- `calculateTaxAmount`, `applyDiscount`, `grossMargin`
- `safeDivide`, `isBetween`
- `toCurrency`, `toPercent`, `toNumber`, `randomInt`

## When to use this package

Use it when you need safer business math and stricter number parsing for forms, analytics, and pricing logic.

## Limitations and Constraints

- Results use IEEE-754 floating-point arithmetic.
- Money workflows should enforce explicit rounding boundaries per domain rules.

## Install

```bash
npm i @jdsalasc/solvejs-numbers
```

## Quick example

```ts
import { toNumber, toPercent, safeDivide, percentChange, calculateTaxAmount, applyDiscount, grossMargin } from "@jdsalasc/solvejs-numbers";

const revenue = toNumber("12,500");
const invalid = toNumber("1,2,3"); // null
const ratio = safeDivide(50, 0, 0);
const growth = percentChange(120, 100); // 20
const growthLabel = toPercent(growth); // "20%"
const tax = calculateTaxAmount(199.99, 19); // 38
const discounted = applyDiscount(199.99, 15); // 169.99
const margin = grossMargin(1000, 700); // 30
```

## Precision note

JavaScript numbers are floating-point. For money-sensitive flows, apply explicit rounding steps (for example `roundTo(value, 2)`) at domain boundaries (tax, subtotal, invoice total).

`roundTo` nudges the value by `Number.EPSILON` before rounding to correct the classic
floating-point representation error. That nudge only helps positive values, so exact
halfway cases are asymmetric:

```ts
roundTo(1.005, 2);  // 1.01  positive halves round up
roundTo(-1.005, 2); // -1     negative halves round toward zero
```

If your domain needs symmetric halves-away-from-zero rounding on negative values, round the
absolute value and reapply the sign instead of relying on `roundTo`.

