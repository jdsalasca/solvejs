# @jdsalasc/solvejs-money

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-money)](https://www.npmjs.com/package/@jdsalasc/solvejs-money)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-money)](https://www.npmjs.com/package/@jdsalasc/solvejs-money)

Zero-dependency money utilities that keep every amount in integer minor units, so arithmetic, percentages and splits are exact.

## Utilities

- `fromDecimal`
- `toDecimal`
- `addMoney`
- `subtractMoney`
- `sumMoney`
- `multiplyMoney`
- `percentageOf`
- `applyPercentage`
- `allocateAmount`
- `formatMoney`
- `MoneyError`

## When to use this package

Use it for anything that adds up and has to reconcile: invoices, order totals, split payments,
percentage discounts, tax. Money in a float loses cents silently, and the loss shows up as a
dispute rather than a bug report.

## Install

```bash
npm i @jdsalasc/solvejs-money
```

## Why integer minor units

```ts
0.1 + 0.2 === 0.30000000000000004;   // the float problem

fromDecimal("0.1") + fromDecimal("0.2");  // 30, exactly
```

Every function here takes and returns an integer count of minor units: cents for USD, yen for JPY,
nothing at all for a zero-decimal currency.

## Quick example

```ts
import { fromDecimal, toDecimal, multiplyMoney, applyPercentage, allocateAmount, formatMoney } from "@jdsalasc/solvejs-money";

const unit = fromDecimal("19.99");            // 1999
const subtotal = multiplyMoney(unit, 3);      // 5997
const discounted = applyPercentage(subtotal, -10); // 5397, a 10% discount
const taxed = applyPercentage(discounted, 21);     // 6530

toDecimal(taxed);                             // "65.30"
formatMoney(taxed);                           // "$65.30"

allocateAmount(taxed, [1, 1, 1]);            // [2180, 2175, 2175], sums back exactly
```

Compare with the float path: `((19.99 * 3) * 0.9 * 1.21).toFixed(2)` is `"65.31"`, one cent off.

## Allocation never loses a unit

`allocateAmount` uses the largest-remainder method, so the parts always sum back to the total. The
leftover units go to the largest fractional shares first, earliest part winning a tie, which makes
the result deterministic:

```ts
allocateAmount(1000, [1, 1, 1]); // [334, 333, 333]
allocateAmount(100, [3, 1]);     // [75, 25]
```

## Rounding is explicit

Any fractional result is settled by a mode you choose. The default is `half-away-from-zero`, which is
what invoices and tax tables expect.

| Mode | `52.5` becomes | `-52.5` becomes |
|---|---:|---:|
| `half-away-from-zero` (default) | 53 | -53 |
| `half-up` | 53 | -52 |
| `floor` | 52 | -53 |
| `ceil` | 53 | -52 |
| `down` | 52 | -52 |

`floor` and `ceil` follow the maths definitions, so they are asymmetric on negatives. Use `down` when
you want truncation toward zero.

## Limitations and Constraints

### Input precision is refused, not rounded

`fromDecimal` converts exactly or throws. `"2.675"` for a two-digit currency is an error, not `268`:

```ts
fromDecimal("2.675");                        // throws
fromDecimal("1.5000");                       // 150, trailing zeros are not precision
fromDecimal("0.006", { fractionDigits: 3 }); // 6
```

Silently rounding an input amount is how an invoice dispute starts. Round deliberately, at a step you
choose, with `multiplyMoney` and its `rounding` option.

### Minor units are safe integers only

`Number.MAX_SAFE_INTEGER` is the ceiling, which is about 90 trillion USD. Beyond that, use a bigint
pipeline or a database decimal type.

### formatMoney asks Intl for the fraction digits

A currency's own digits decide the rendering, so JPY shows no fraction and BHD shows three. It passes
the amount through `Number`, so it is a display helper only. Never parse the output back into an
amount.

### A malformed locale or currency throws

`formatMoney(1234, { locale: "not a locale" })` throws a `RangeError` from `Intl`. That is a
configuration mistake, and guessing a locale would hide it. `MoneyError` covers the amount arguments,
`RangeError` covers the locale and currency.

### Weights must be non-negative whole numbers

`allocateAmount` refuses negative, fractional and all-zero weights, because there is no sensible way
to split an amount among them. Pass a percentage as an integer like `20` for twenty percent.