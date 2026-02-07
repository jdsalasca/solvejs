# @jdsalasc/solvejs-validators

Zero-dependency validators for JavaScript and TypeScript forms and API payloads.

## Utilities

- Structured validators returning `{ ok, code, message }`
- `validateCellphoneNumber`, `validateEmail`, `validateHttpUrl`
- `validateName`, `validateUsername`, `validateAddressLine`, `validatePostalCode`
- `validateStrongPassword`, `validateCreditCardNumber`
- `validateUuidV4`, `validateIpv4`, `validateIsoDateString`
- Boolean wrappers (`isX`) for quick checks

## When to use this package

Use it when you need reusable validation rules with explicit error codes instead of plain true/false outputs.

## Install

```bash
npm i @jdsalasc/solvejs-validators
```

## Quick example

```ts
import { validateCellphoneNumber, validateUuidV4 } from "@jdsalasc/solvejs-validators";

validateCellphoneNumber("+573001234567", { country: "CO" });
validateUuidV4("550e8400-e29b-41d4-a716-446655440000");
```
