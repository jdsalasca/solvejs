# @jdsalasc/solvejs-validators

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-validators)](https://www.npmjs.com/package/@jdsalasc/solvejs-validators)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-validators)](https://www.npmjs.com/package/@jdsalasc/solvejs-validators)


Zero-dependency validators for JavaScript and TypeScript forms and API payloads.

## Utilities

- Structured validators returning `{ ok, code, message }`
- `validateCellphoneNumber`, `validateEmail`, `validateHttpUrl`
- `validateName`, `validateUsername`, `validateAddressLine`, `validatePostalCode` (country-aware)
- `validateStrongPassword`, `validateCreditCardNumber`
- `validateUuidV4`, `validateIpv4`, `validateIsoDateString`
- Boolean wrappers (`isX`) for quick checks

## When to use this package

Use it when you need reusable validation rules with explicit error codes instead of plain true/false outputs.

## Limitations and Constraints

- Country coverage is explicit and incremental; unsupported countries return structured errors.
- Validators are format-focused and do not verify external authority databases.

## Install

```bash
npm i @jdsalasc/solvejs-validators
```

## Quick example

```ts
import { validateCellphoneNumber, validateUuidV4 } from "@jdsalasc/solvejs-validators";

validateCellphoneNumber("+573001234567", { country: "CO" });
validateUuidV4("550e8400-e29b-41d4-a716-446655440000");
// Postal code examples by country:
// validatePostalCode("110111", { country: "CO" });
// validatePostalCode("28013", { country: "ES" });
// validatePostalCode("K1A 0B1", { country: "CA" });
// validatePostalCode("11000", { country: "UY" });
```
