# @jdsalasc/solvejs-validators

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-validators)](https://www.npmjs.com/package/@jdsalasc/solvejs-validators)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-validators)](https://www.npmjs.com/package/@jdsalasc/solvejs-validators)


> **Live documentation:** [run this package's examples in your browser](https://jdsalasca.github.io/solvejs/live/#pkg-validators).

Zero-dependency validators for forms and API payloads: email, phone with 12 country presets plus ANY, postal codes, UUID v4, IPv4, ISO dates, domains, usernames, passwords, addresses, credit cards and IBAN. Every validator returns a stable code, a human message, and EN/ES/PT translations.

## Utilities

- Structured validators returning `{ ok, code, message }`
- `validateCellphoneNumber`, `validateEmail`, `validateHttpUrl`, `validateDomain`
- `validateName`, `validateUsername`, `validateAddressLine`, `validatePostalCode` (country-aware)
- `validateStrongPassword`, `validateCreditCardNumber`, `validateIban`
- `validateUuidV4`, `validateIpv4`, `validateIsoDateString`
- `validateAddressDirection` for EN and ES street-type prefixes
- `translateValidationResult` for EN/ES/PT UI messages
- Boolean wrappers (`isX`) for quick checks

## When to use this package

Use it when you need reusable validation rules with explicit error codes and UI-ready messages instead of plain true/false outputs.

## Country and locale coverage

Coverage is a whitelist, never a guess. An unsupported country returns `{ ok: false, code: "UNSUPPORTED_COUNTRY" }` rather than falling back to a loose rule that would accept anything.

| Validator | Supported values |
| --- | --- |
| `validateCellphoneNumber` | `ANY` plus `US`, `CO`, `MX`, `ES`, `AR`, `CL`, `PE`, `BR`, `CA`, `UY`, `GB`, `DE` |
| `validatePostalCode` | `US`, `CO`, `MX`, `ES`, `AR`, `CL`, `PE`, `BR`, `CA`, `UY`, `GB`, `DE` |
| `validateAddressDirection` | `en`, `es` |
| `translateValidationResult` | `en`, `es`, `pt` |

`ANY` means "no country preset": a phone number needs 7 to 15 digits and any leading `+`. Postal codes have no `ANY`, because a postal format without a country is not a check.

```ts
validateCellphoneNumber("+447911123456", { country: "ANY" }); // ok
validatePostalCode("K1A 0B1", { country: "CA" });             // ok
validatePostalCode("12345", { country: "FR" });               // UNSUPPORTED_COUNTRY
```

### IBAN validation

`validateIban` removes spaces, accepts lowercase, checks the country-specific length **and BBAN structure** for the built-in table (`GB`, `DE`, `FR`, `ES`, `NL`, `IT`, `PT`, `IE`, `BE`, `AT`, `CH`, `PL`, `SE`, `NO`, `DK`, `FI` and more), then verifies the MOD-97 checksum. Unknown countries are accepted only when the 15-34 character structure and checksum are valid.

```ts
validateIban("GB82 WEST 1234 5698 7654 32"); // ok
validateIban("GB82 WEST 1234 5698 7654 31"); // CHECKSUM_FAILED
validateIban("DE06ABCDEFGHIJKLMNOPQR");      // INVALID_FORMAT, German BBAN must be numeric
validateIban("GB82");                         // TOO_SHORT
validateIban("1BAN1234");                     // INVALID_FORMAT
```

### Non-string input returns `INVALID_TYPE`

The TypeScript signature asks for a `string`, but a JavaScript caller can pass anything. Every
`validate*` helper answers with the same result shape instead of throwing, so a form or API boundary
does not need a `try/catch`:

```ts
validateEmail(undefined); // { ok: false, code: "INVALID_TYPE", message: "Expected a string." }
isEmail(42);              // false
translateValidationResult(undefined); // { ok: false, code: "INVALID_RESULT", ... }
```

`translateValidationResult` also tolerates an unknown code and falls back to a generic message, so a
custom validator cannot take down the UI layer with a code this package has never seen.

## Limitations and Constraints

### Deprecated aliases keep working until the next major

Two exported names contain the author's original misspelling. They shipped in a release, so code in
the wild calls them. They are kept, and every call site now sees a strikethrough in an editor
because the declarations carry `@deprecated`:

| Deprecated | Use instead |
| --- | --- |
| `isAddresDirection` | `isAddressDirection` |
| `isAddresDirrection` | `isAddressDirection` |

Both delegate to `isAddressDirection`, so they behave identically. The policy is: a deprecated alias
is never removed in a minor or patch release, and is removed only in a major, together with the
changelog entry that announces it. `isValidName` is a legacy name rather than a misspelling and is
retained for the same reason.

### The messages are ASCII, so "inválido" is spelled "invalido"

`translateValidationResult` returns messages without accents, so the same string renders in any
terminal, log pipeline or font. Spell the accented form in your own label when the UI needs it.

### Country rules use fixed digit counts

`validateCellphoneNumber` checks length, not a numbering plan. A US number must be 10 or 11 digits,
a GB number 10 to 12, and so on. The consequence is that a number is accepted whenever its digit
count fits the preset, which is not the same as belonging to that country:

```ts
validateCellphoneNumber("4155552671", { country: "GB" });        // ok, 10 digits fits GB too
validateCellphoneNumber("+447911123456", { country: "US" });     // TOO_LONG, 12 digits is past the US cap
```

Real numbering-plan validation needs a carrier database, which this package deliberately does not
bundle.

### Validators are format-focused

Nothing here verifies an external authority. `validateEmail` checks shape only, never
deliverability. `validateCreditCardNumber` checks that the value is 12 to 19 digits and that it
passes the Luhn checksum; it does not detect the card network, so a Luhn-valid number is accepted
whatever issuer it resembles, and it cannot tell a closed account from an open one.

```ts
validateCreditCardNumber("4242424242424242"); // ok, passes Luhn
validateCreditCardNumber("4242424242424241"); // CHECKSUM_FAILED
validateCreditCardNumber("1234567890123456"); // CHECKSUM_FAILED, not "unknown network"
```

### A direction prefix is not an address

`validateAddressDirection` only tells you whether the first token is a recognised street type such
as `Calle`, `N`, or `SW`. It does not parse a full address, and it does not accept a direction
inside a longer word.

## Install

```bash
npm i @jdsalasc/solvejs-validators
```

## Quick example

```ts
import { validateCellphoneNumber, validateIban, validateUuidV4, translateValidationResult } from "@jdsalasc/solvejs-validators";

validateCellphoneNumber("+573001234567", { country: "CO" });
validateDomain("api.solvejs.dev");
validateUuidV4("550e8400-e29b-41d4-a716-446655440000");
validateIban("GB82 WEST 1234 5698 7654 32"); // { ok: true, code: "VALID", ... }
translateValidationResult(validateCellphoneNumber("abc"), { locale: "es", fieldLabel: "Telefono" });
// Postal code examples by country:
// validatePostalCode("110111", { country: "CO" });
// validatePostalCode("28013", { country: "ES" });
// validatePostalCode("K1A 0B1", { country: "CA" });
// validatePostalCode("11000", { country: "UY" });
```
